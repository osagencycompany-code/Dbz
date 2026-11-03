/**
 * Vérifie les données du jeu (docs/regles-de-coherence.md §8) :
 *  - chaque fichier de data/ valide contre son schéma zod, nom de fichier = id ;
 *  - schemas/*.json à jour par rapport aux schémas zod ;
 *  - références croisées (quêtes, zones, boss, objets, techniques…) ;
 *  - fichiers d'assets présents, animations dans les limites des planches ;
 *  - maps Tiled cohérentes (calques, types d'objets, portails) ;
 *  - aucun nombre d'équilibrage codé en dur dans la logique.
 * Usage : npm run check:donnees
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { genererJsonSchema } from "./build-schemas.js";
import { chemin, dimensionsPng, existe, lireJson, listerFichiers, racine, relatif } from "./lib/fichiers.js";
import { registreSchemas, schemaParDossier, schemaParFichierBalance } from "../packages/shared/src/schemas/registre.js";

const erreurs: string[] = [];
const avertissements: string[] = [];
const erreur = (fichier: string, message: string) => erreurs.push(`${fichier} : ${message}`);
const avertir = (fichier: string, message: string) => avertissements.push(`${fichier} : ${message}`);

type Fiche = Record<string, any>;
const fiches: Record<string, Map<string, { rel: string; data: Fiche }>> = {};

// ---------------------------------------------------------------- 1. schémas à jour
for (const nom of Object.keys(registreSchemas)) {
  const rel = `schemas/${nom}.schema.json`;
  if (!existe(rel)) {
    erreur(rel, "absent ; lancer `npm run schemas:build`");
    continue;
  }
  if (readFileSync(chemin(rel), "utf8").replace(/\r\n/g, "\n") !== genererJsonSchema(nom)) {
    erreur(rel, "différent du schéma zod ; lancer `npm run schemas:build`");
  }
}

// ---------------------------------------------------------------- 2. fiches de data/
const dossiersData = listerFichiers(chemin("data"), ".json").map((abs) => ({ abs, rel: relatif(abs) }));
for (const { abs, rel } of dossiersData) {
  const parties = rel.split("/"); // data / dossier / fichier
  const dossier = parties[1] ?? "";
  if (dossier === "_modeles" || dossier === "dialogues") continue;
  const fichier = basename(abs);
  const nomSchema = dossier === "balance" ? (schemaParFichierBalance[fichier] ?? "balance") : schemaParDossier[dossier];
  if (!nomSchema) {
    erreur(rel, `aucun schéma associé au dossier data/${dossier}`);
    continue;
  }
  let data: unknown;
  try {
    data = lireJson(abs);
  } catch (e) {
    erreur(rel, `JSON illisible (${(e as Error).message})`);
    continue;
  }
  const schema = registreSchemas[nomSchema];
  const resultat = schema?.safeParse(data);
  if (resultat && !resultat.success) {
    for (const p of resultat.error.issues) erreur(rel, `${p.path.join(".") || "(racine)"} : ${p.message}`);
    continue;
  }
  const d = data as Fiche;
  // $schema doit pointer vers le bon fichier.
  if (typeof d.$schema === "string") {
    const cible = resolve(dirname(abs), d.$schema);
    if (!existsSync(cible)) erreur(rel, `$schema introuvable : ${d.$schema}`);
    else if (basename(cible) !== `${nomSchema}.schema.json`) erreur(rel, `$schema devrait être ${nomSchema}.schema.json`);
  }
  if (dossier === "balance") continue;
  if (d.id !== basename(fichier, ".json")) erreur(rel, `id « ${d.id} » différent du nom de fichier`);
  (fiches[dossier] ??= new Map()).set(d.id, { rel, data: d });
}

const get = (dossier: string) => fiches[dossier] ?? new Map();
const ids = (dossier: string) => new Set(get(dossier).keys());
function verifierRef(rel: string, champ: string, valeur: string | null | undefined, dossier: string) {
  if (valeur == null) return;
  if (!ids(dossier).has(valeur)) erreur(rel, `${champ} « ${valeur} » introuvable dans data/${dossier}`);
}
function verifierFichier(rel: string, champ: string, valeur: string | null | undefined) {
  if (valeur == null) return;
  if (!existe(valeur)) erreur(rel, `${champ} : fichier absent (${valeur})`);
}

// ---------------------------------------------------------------- 3. références croisées
for (const [, { rel, data: q }] of get("quests")) {
  verifierRef(rel, "donneur", q.donneur, "npcs");
  verifierRef(rel, "prerequis", q.prerequis, "quests");
  for (const o of q.objectifs) {
    if (o.pnj) verifierRef(rel, "objectif.pnj", o.pnj, "npcs");
    if (o.technique) verifierRef(rel, "objectif.technique", o.technique, "skills");
    if (o.boss) verifierRef(rel, "objectif.boss", o.boss, "bosses");
    if (o.zone) verifierRef(rel, "objectif.zone", o.zone, "zones");
    if (o.monstre) verifierRef(rel, "objectif.monstre", o.monstre, "mobs");
    if (o.cible) verifierRef(rel, "objectif.cible", o.cible, "mobs");
  }
  const r = q.recompenses;
  for (const obj of r.objets ?? []) verifierRef(rel, "recompense.objet", obj.objet, "items");
  verifierRef(rel, "recompense.technique", r.technique, "skills");
  verifierRef(rel, "recompense.transformation", r.transformation, "transformations");
  verifierRef(rel, "recompense.debloque_zone", r.debloque_zone, "zones");
}

for (const [, { rel, data: z }] of get("zones")) {
  for (const m of z.monstres) verifierRef(rel, "monstre", m, "mobs");
  verifierRef(rel, "deblocage", z.deblocage, "quests");
  for (const m of z.maps) verifierFichier(rel, "map", m);
}
for (const [, { rel, data: m }] of get("mobs")) {
  for (const zn of m.zones) verifierRef(rel, "zone", zn, "zones");
  for (const b of m.butin ?? []) verifierRef(rel, "butin", b.objet, "items");
  verifierFichier(rel, "sprite", m.sprite?.fichier);
}
for (const [, { rel, data: b }] of get("bosses")) {
  verifierRef(rel, "zone", b.zone, "zones");
  for (const l of b.butin ?? []) verifierRef(rel, "butin", l.objet, "items");
  for (const ph of b.phases) for (const inv of ph.invocations ?? []) verifierRef(rel, "invocation", inv.monstre, "mobs");
  verifierFichier(rel, "sprite", b.sprite?.fichier);
}
for (const [, { rel, data: n }] of get("npcs")) {
  verifierRef(rel, "zone", n.zone, "zones");
  verifierFichier(rel, "sprite", n.sprite?.fichier);
  if (n.dialogues && !existe(n.dialogues)) avertir(rel, `dialogues absents (${n.dialogues}) : à créer au jalon Contenu`);
}
for (const [, { rel, data: t }] of get("skills")) {
  if (t.apprentissage?.quete) verifierRef(rel, "apprentissage.quete", t.apprentissage.quete, "quests");
  if (t.apprentissage?.maitre) verifierRef(rel, "apprentissage.maitre", t.apprentissage.maitre, "npcs");
}
for (const [, { rel, data: t }] of get("transformations")) verifierRef(rel, "quete_requise", t.quete_requise, "quests");

// ---------------------------------------------------------------- 4. personnages, planches et animations
interface Anims {
  frame: number;
  columns: number;
  rows: Record<string, number>;
  animations: Record<string, { cols: number[]; row?: string }>;
}
for (const [, { rel, data: p }] of get("characters")) {
  for (const [forme, f] of Object.entries<any>(p.formes)) {
    verifierFichier(rel, `formes.${forme}.planche`, f.planche);
    verifierFichier(rel, `formes.${forme}.animations`, f.animations);
    verifierFichier(rel, `formes.${forme}.portrait`, f.portrait);
    if (!existe(f.planche) || !existe(f.animations)) continue;
    const anims = lireJson(chemin(f.animations)) as Anims;
    const { largeur, hauteur } = dimensionsPng(chemin(f.planche));
    const nbLignes = Math.max(...Object.values(anims.rows)) + 1;
    if (anims.columns * anims.frame > largeur) erreur(f.animations, `${anims.columns} colonnes de ${anims.frame} px dépassent la largeur ${largeur} de la planche`);
    if (nbLignes * anims.frame > hauteur) erreur(f.animations, `${nbLignes} lignes de ${anims.frame} px dépassent la hauteur ${hauteur} de la planche`);
    for (const [nom, a] of Object.entries(anims.animations)) {
      for (const c of a.cols) if (c < 0 || c >= anims.columns) erreur(f.animations, `animation « ${nom} » : colonne ${c} hors de la planche`);
      if (a.row && !(a.row in anims.rows)) erreur(f.animations, `animation « ${nom} » : ligne « ${a.row} » inconnue`);
    }
  }
}

// Palettes de joueur : chaque palette citée doit exister dans assets/palettes.json.
const palettesDefinies = new Set(Object.keys((lireJson(chemin("assets/palettes.json")) as { palettes: Record<string, unknown> }).palettes));
for (const [, { rel, data: p }] of get("characters"))
  for (const nom of p.palettes_joueur ?? []) if (!palettesDefinies.has(nom)) erreur(rel, `palette « ${nom} » absente de assets/palettes.json`);

// ---------------------------------------------------------------- 5. maps Tiled
const TYPES_OBJETS = new Set(["spawn", "portal", "npc", "mobzone", "travel", "heal", "boss", "rock"]);
const cartes = listerFichiers(chemin("maps"), ".tmj");
const spawnsParCarte = new Map<string, Set<string>>();
const lireCarte = (abs: string) => lireJson(abs) as Fiche;
const objetsParCarte = new Map<string, Fiche[]>();
for (const abs of cartes) {
  const id = relatif(abs).replace(/^maps\//, "").replace(/\.tmj$/, "");
  const calques = lireCarte(abs).layers as Fiche[];
  const objets = calques.find((c) => c.name === "objets")?.objects ?? [];
  objetsParCarte.set(id, objets);
  spawnsParCarte.set(id, new Set(objets.filter((o: Fiche) => o.type === "spawn").map((o: Fiche) => o.name)));
}
for (const abs of cartes) {
  const rel = relatif(abs);
  const carte = lireCarte(abs);
  const calques = carte.layers as Fiche[];
  for (const nom of ["fond", "collisions", "objets"]) {
    if (!calques.some((c) => c.name === nom)) erreur(rel, `calque « ${nom} » manquant`);
  }
  const fond = calques.find((c) => c.name === "fond");
  if (fond?.image && !existe(join(dirname(rel), fond.image))) erreur(rel, `image de fond absente (${fond.image})`);
  for (const o of (calques.find((c) => c.name === "objets")?.objects ?? []) as Fiche[]) {
    if (!TYPES_OBJETS.has(o.type)) {
      erreur(rel, `objet « ${o.name} » : type inconnu « ${o.type} »`);
      continue;
    }
    const props = Object.fromEntries(((o.properties ?? []) as Fiche[]).map((p) => [p.name, p.value]));
    if (o.type === "spawn" || o.type === "npc" || o.type === "boss") {
      // le point (ou le centre du rectangle) ne doit pas tomber dans une case bloquée
      const grille = calques.find((c) => c.name === "collisions")?.data as number[] | undefined;
      const px = o.x + (o.width ?? 0) / 2;
      const py = o.y + (o.height ?? 0) / 2;
      const col = Math.floor(px / carte.tilewidth);
      const lig = Math.floor(py / carte.tileheight);
      if (!grille || col < 0 || lig < 0 || col >= carte.width || lig >= carte.height) erreur(rel, `${o.type} « ${o.name} » : hors de la map`);
      else if (grille[lig * carte.width + col]) erreur(rel, `${o.type} « ${o.name} » : placé dans une case bloquée (${Math.round(px)}, ${Math.round(py)})`);
    }
    if (o.type === "portal") {
      const grille = calques.find((c) => c.name === "collisions")?.data as number[] | undefined;
      let libre = false;
      for (let ty = Math.floor(o.y / carte.tileheight); ty <= Math.floor((o.y + o.height - 1) / carte.tileheight); ty++)
        for (let tx = Math.floor(o.x / carte.tilewidth); tx <= Math.floor((o.x + o.width - 1) / carte.tilewidth); tx++)
          if (grille?.[ty * carte.width + tx] === 0) libre = true;
      if (!libre) erreur(rel, `portail « ${o.name} » : entièrement dans des cases bloquées, inatteignable`);
      const cible = String(props.map ?? "");
      if (!spawnsParCarte.has(cible)) erreur(rel, `portail « ${o.name} » : map « ${cible} » introuvable`);
      else if (!spawnsParCarte.get(cible)?.has(String(props.spawn))) erreur(rel, `portail « ${o.name} » : spawn « ${props.spawn} » absent de ${cible}`);
    }
    if (o.type === "mobzone") {
      verifierRef(rel, `mobzone « ${o.name} »`, props.mob, "mobs");
      const zoneId = relatif(abs).split("/")[1];
      if (!get("mobs").get(String(props.mob))?.data.zones.includes(zoneId)) erreur(rel, `mobzone « ${o.name} » : ${props.mob} n'appartient pas à la zone ${zoneId}`);
    }
    if (o.type === "npc") {
      verifierRef(rel, `npc « ${o.name} »`, o.name, "npcs");
      const m = /^dbz-online\/characters\/(\d+)$/.exec(String(props.sprite ?? ""));
      if (m) verifierFichier(rel, `npc « ${o.name} » sprite`, `assets/raw/graphics/characters/${m[1]}.png`);
    }
    if (o.type === "boss") {
      verifierRef(rel, `boss « ${o.name} »`, props.boss, "bosses");
      if (get("bosses").get(String(props.boss))?.data.zone !== relatif(abs).split("/")[1]) erreur(rel, `boss « ${o.name} » : zone différente de celle de la map`);
    }
  }
  // Image de fond : pas plus grande que la grille de cases.
  if (fond?.image && existe(join(dirname(rel), fond.image))) {
    const { largeur, hauteur } = dimensionsPng(chemin(join(dirname(rel), fond.image)));
    if (largeur > carte.width * carte.tilewidth || hauteur > carte.height * carte.tileheight) erreur(rel, `image de fond ${largeur}x${hauteur} plus grande que la grille ${carte.width}x${carte.height}`);
  }
  if (!get("zones").size || ![...get("zones").values()].some((z) => z.data.maps.includes(rel))) avertir(rel, "map absente de toutes les zones");
}

// Zones : arrivée et point de soin doivent exister sur leurs maps.
for (const [, { rel, data: z }] of get("zones")) {
  if (z.carte_du_monde && !z.arrivee) erreur(rel, "zone sur la carte du monde sans `arrivee`");
  if (z.arrivee) {
    if (!z.maps.includes(`maps/${z.arrivee.map}.tmj`)) erreur(rel, `arrivee : map « ${z.arrivee.map} » absente de la zone`);
    else if (!spawnsParCarte.get(z.arrivee.map)?.has(z.arrivee.spawn)) erreur(rel, `arrivee : spawn « ${z.arrivee.spawn} » absent de ${z.arrivee.map}`);
  }
  if (z.point_de_soin) {
    const trouve = z.maps.some((m: string) => (objetsParCarte.get(m.replace(/^maps\//, "").replace(/\.tmj$/, "")) ?? []).some((o) => o.type === "heal" && o.name === z.point_de_soin));
    if (!trouve) erreur(rel, `point_de_soin « ${z.point_de_soin} » : aucun objet heal de ce nom dans les maps de la zone`);
  }
}

// ---------------------------------------------------------------- 6. nombres en dur dans la logique
// Dossiers de logique de jeu (à compléter quand ils existent). Les nombres autorisés sont des constantes neutres.
const DOSSIERS_LOGIQUE = [/^packages\/shared\/src\/(formulas|progression)\.ts$/,/^apps\/[^/]+\/src\/(combat|ia|regles)\//];
const NOMBRES_AUTORISES = new Set(["0", "1", "2", "100", "1000"]);
const sources = [...listerFichiers(chemin("packages"), ".ts"), ...listerFichiers(chemin("apps"), ".ts")]
  .map((abs) => ({ abs, rel: relatif(abs) }))
  .filter(({ rel }) => !rel.includes("node_modules") && !rel.endsWith(".test.ts") && DOSSIERS_LOGIQUE.some((r) => r.test(rel)));
for (const { abs, rel } of sources) {
  readFileSync(abs, "utf8")
    .split("\n")
    .forEach((ligne, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(ligne) || ligne.includes("// ok-nombre")) return;
      const code = ligne.replace(/\/\/.*$/, "").replace(/(["'`]).*?\1/g, '""');
      for (const m of code.matchAll(/(?<![\w.])(\d+(?:\.\d+)?)(?![\w.])/g)) {
        if (!NOMBRES_AUTORISES.has(m[1] ?? "")) erreur(`${rel}:${i + 1}`, `nombre en dur « ${m[1]} » : le placer dans data/ (ou annoter // ok-nombre)`);
      }
    });
}

// ---------------------------------------------------------------- 7. golden
if (!existe("tests/golden/formules.json")) erreur("tests/golden/formules.json", "absent");

// ---------------------------------------------------------------- bilan
const total = dossiersData.length + cartes.length;
if (avertissements.length) {
  console.log(`\n${avertissements.length} avertissement(s) :`);
  for (const a of avertissements) console.log(`  ⚠ ${a}`);
}
if (erreurs.length) {
  console.error(`\n${erreurs.length} erreur(s) :`);
  for (const e of erreurs) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`\n✓ Données cohérentes (${total} fichiers vérifiés, racine ${racine}).`);
