/**
 * Génère tout ce que le jeu charge dans assets/build/ (jamais versionné) :
 *  - characters/<héros>-<apparence>-<forme>.png : planches des héros jouables (extraites des planches brutes
 *    de Buu's Fury et de Legacy of Goku 2, fond rendu transparent) + animations ;
 *  - characters/<forme>-<palette>.png : planches de Goku recolorées (TRANSITION : le choix de palette disparaît
 *    avec le modèle de personnage serveur, décision 0021) ;
 *  - sprites/<id>.png : monstres, boss et PNJ listés dans data/ (les créatures animées de LoG2 sont découpées par variante) ;
 *  - effets/eclairs-ssj2.png : éclairs de superposition du Super Saiyan 2 ;
 *  - manifest.json, apercu.html (assets) et apercu-heros.html (héros, créatures, SSJ2).
 * Les originaux de assets/raw/ ne sont jamais modifiés. Usage : npm run assets:build
 */
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { genererApercu, type EntreeApercu } from "./assets/apercu.js";
import { genererApercuHeros, type EntreeApercuHeros } from "./assets/apercu-heros.js";
import { extraireCreature, extrairePersonnage, genererArcs } from "./assets/planches.js";
import { dimensionsPng, chemin, existe, lireJson, listerFichiers, relatif } from "./lib/fichiers.js";
import { ecrirePng, lirePng, recolorer, type Rgb } from "./assets/png.js";

interface Palettes {
  gi: Rgb[];
  palettes: Record<string, { teinte: number } | null>;
}

const palettes = lireJson(chemin("assets/palettes.json")) as Palettes;
const sortie = (rel: string) => chemin("assets/build", rel);
const fiches = (dossier: string) =>
  listerFichiers(chemin("data", dossier), ".json").map((abs) => ({ rel: relatif(abs), data: lireJson(abs) as Record<string, any> }));

/** TRANSITION : l'ancien client choisit une palette de Goku ; supprimé avec le modèle à cinq emplacements (décision 0021). */
const PALETTES_TRANSITOIRES: Record<string, string[]> = { goku: ["orange", "bleu", "vert"] };

// ---- 1. Héros jouables : une planche par apparence et par forme
const joueurs: EntreeApercu["joueurs"] = [];
const heros: EntreeApercuHeros["heros"] = [];
for (const { data: p } of fiches("characters")) {
  if (p.role !== "heros-jouable") continue;
  const entreeHeros: EntreeApercuHeros["heros"][number] = { id: p.id, nom: p.nom, statut: p.statut, disponibilite: p.disponibilite, apparences: [] };
  for (const app of p.apparences as any[]) {
    const entreeApp: EntreeApercuHeros["heros"][number]["apparences"][number] = { id: app.id, nom: app.nom, formes: [] };
    for (const [forme, f] of Object.entries<any>(app.formes)) {
      const fichier = `characters/${p.id}-${app.id}-${forme}.png`;
      const nomAnims = `characters/${p.id}-${app.id}-${forme}.anims.json`;
      const cheminAnims = f.animations ?? app.formes[f.base]?.animations;
      mkdirSync(dirname(sortie(nomAnims)), { recursive: true });
      copyFileSync(chemin(cheminAnims), sortie(nomAnims));
      const animations = lireJson(chemin(cheminAnims)) as any;
      if (f.base) {
        // forme sans planche propre (SSJ2) : planche de la forme de base + effet en surimpression
        entreeApp.formes.push({ id: forme, planche: `characters/${p.id}-${app.id}-${f.base}.png`, animations, base: f.base, effet: f.effet });
        continue;
      }
      const source = f.extraction ? extrairePersonnage(lirePng(chemin(f.extraction.source))) : lirePng(chemin(f.planche));
      ecrirePng(sortie(fichier), source);
      entreeApp.formes.push({ id: forme, planche: fichier, animations });
      // TRANSITION : l'ancien client charge encore goku-<palette>.png (recoloration) jusqu'au modèle serveur à 5 emplacements
      if (PALETTES_TRANSITOIRES[p.id] && app === p.apparences[0]) {
        const nomAncien = `characters/${basename(f.animations)}`;
        copyFileSync(chemin(f.animations), sortie(nomAncien));
        for (const nom of PALETTES_TRANSITOIRES[p.id] ?? []) {
          const reglage = palettes.palettes[nom];
          if (!(nom in palettes.palettes)) throw new Error(`Palette « ${nom} » absente de assets/palettes.json`);
          const image = reglage ? recolorer(source, palettes.gi, reglage.teinte) : source;
          const ancien = `characters/${p.id}${forme === "normal" ? "" : `-${forme}`}-${nom}.png`;
          ecrirePng(sortie(ancien), image);
          joueurs.push({ personnage: p.id, forme, palette: nom, planche: ancien, animations });
        }
      }
    }
    entreeHeros.apparences.push(entreeApp);
  }
  heros.push(entreeHeros);
}

// ---- 2. Petits arcs électriques du Super Saiyan 2, générés à l'échelle du sprite (cases de 32 px)
const TAILLE_ECLAIRS = 32;
const NOMBRE_ECLAIRS = 8;
ecrirePng(sortie("effets/eclairs-ssj2.png"), genererArcs(TAILLE_ECLAIRS, NOMBRE_ECLAIRS));

// ---- 3. Monstres, boss, PNJ : une planche par fiche
const sprites: EntreeApercu["sprites"] = [];
const creatures: EntreeApercuHeros["creatures"] = [];
for (const [dossier, type] of [["mobs", "monstre"], ["bosses", "boss"], ["npcs", "pnj"]] as const) {
  for (const { data: d } of fiches(dossier)) {
    const s = d.sprite as { source: string; fichier: string | null; format: string; cadre?: number; variante?: number; animations?: string } | null | undefined;
    if (!s?.fichier) {
      sprites.push({ id: d.id, nom: d.nom, type, statut: d.statut, source: s?.source ?? "aucun", fichier: null, format: s?.format ?? "", largeur: 0, hauteur: 0, note: d.a_verifier ?? "" });
      continue;
    }
    if (!existe(s.fichier)) throw new Error(`${d.id} : ${s.fichier} absent`);
    const sortieRel = `sprites/${d.id}.png`;
    mkdirSync(dirname(sortie(sortieRel)), { recursive: true });
    if (s.format === "log2-4-lignes-anime") {
      // créature animée de Legacy of Goku 2 : on découpe la variante demandée (0 = base, 1 et 2 = autres couleurs)
      const planche = extraireCreature(lirePng(chemin(s.fichier)), s.cadre ?? 32, s.variante ?? 0);
      ecrirePng(sortie(sortieRel), planche);
      copyFileSync(chemin(s.animations!), sortie(`sprites/${d.id}.anims.json`));
      creatures.push({
        id: d.id,
        nom: `${d.nom} (en jeu)`,
        rang: d.rang ?? type,
        statut: d.statut,
        planche: sortieRel,
        cadre: s.cadre ?? 32,
        animations: lireJson(chemin(s.animations!)) as any,
        enJeu: true,
      });
      continue;
    }
    if (s.animations) copyFileSync(chemin(s.animations), sortie(`sprites/${d.id}.anims.json`));
    copyFileSync(chemin(s.fichier), sortie(sortieRel));
    const { largeur, hauteur } = dimensionsPng(chemin(s.fichier));
    sprites.push({ id: d.id, nom: d.nom, type, statut: d.statut, source: s.source, fichier: sortieRel, format: s.format, largeur, hauteur, note: d.a_verifier ?? "" });
  }
}

// Comparaisons pour le choix des créatures (aperçu seulement) : toutes les variantes de couleur
for (const [fichierBrut, anims, cadre, variantes] of [
  ["Wolf", "loup", 32, 3],
  ["Warthog", "sanglier", 32, 1],
  ["Tiger Bandit", "tigre-bandit", 32, 3],
  ["T-Rex", "t-rex", 64, 3],
  ["Triceratops", "triceratops", 32, 1],
] as const) {
  const src = lirePng(chemin(`assets/raw/legacy-of-goku-2/ennemis/${fichierBrut}.png`));
  for (let v = 0; v < variantes; v++) {
    const fichier = `creatures/${fichierBrut.toLowerCase().replace(/ /g, "-")}-v${v}.png`;
    ecrirePng(sortie(fichier), extraireCreature(src, cadre, v));
    creatures.push({
      id: `${anims}-v${v}`,
      nom: `${fichierBrut}, variante ${v}`,
      rang: v === 0 ? "base (monstres communs)" : "autre couleur (élites)",
      statut: "brouillon",
      planche: fichier,
      cadre,
      animations: lireJson(chemin(`assets/monstres/${anims}.anims.json`)) as any,
      enJeu: false,
    });
  }
}

// ---- 3 bis. Planches découpées de Legacy of Goku 1 (par tools/decouper_log1.py) et comparaison d'échelle
const log1: EntreeApercuHeros["log1"] = [];
for (const [dossier, id, nom] of [
  ["assets/monstres", "raditz-log1", "Raditz (LoG1)"],
  ["assets/monstres", "nappa-log1", "Nappa (LoG1)"],
  ["assets/bosses", "vegeta-phase1", "Vegeta boss, phase 1 (LoG1)"],
  ["assets/bosses", "vegeta-grand-singe", "Vegeta boss, transformation et grand singe (LoG1)"],
] as const) {
  if (!existe(`${dossier}/${id}.png`)) continue;
  const meta = lireJson(chemin(`${dossier}/${id}.anims.json`)) as any;
  const sortieRel = `log1/${id}.png`;
  mkdirSync(dirname(sortie(sortieRel)), { recursive: true });
  copyFileSync(chemin(`${dossier}/${id}.png`), sortie(sortieRel));
  log1.push({ id, nom, planche: sortieRel, cadre: meta.cadre, lignes: meta.lignes, animations: meta.animations });
}
const echelle: EntreeApercuHeros["echelle"] = [
  { nom: "Vegeta jouable (Buu's Fury), profil", planche: "characters/vegeta-normale-normal.png", x: 0, y: 64, l: 32, h: 32 },
  { nom: "Trunks du futur (LoG2), profil", planche: "characters/trunks-futur-normale-normal.png", x: 0, y: 64, l: 32, h: 32 },
  { nom: "Vegeta jouable (Buu's Fury), face", planche: "characters/vegeta-normale-normal.png", x: 0, y: 0, l: 32, h: 32 },
  { nom: "Vegeta boss saga Saiyan (LoG1), face, avec scouter", planche: "log1/vegeta-phase1.png", x: 0, y: 0, l: 32, h: 32 },
  { nom: "Vegeta boss saga Saiyan, côté", planche: "log1/vegeta-phase1.png", x: 0, y: 64, l: 32, h: 32 },
  { nom: "Vegeta jouable, trois-quarts", planche: "characters/vegeta-normale-normal.png", x: 0, y: 32, l: 32, h: 32 },
  { nom: "Raditz (LoG1), face", planche: "log1/raditz-log1.png", x: 0, y: 0, l: 40, h: 40 },
  { nom: "Nappa (LoG1), face", planche: "log1/nappa-log1.png", x: 0, y: 0, l: 40, h: 40 },
  { nom: "Grand singe (LoG1), face", planche: "log1/vegeta-grand-singe.png", x: 0, y: 64, l: 32, h: 64 },
];

// Portraits des héros (aperçu seulement)
const portraits: EntreeApercuHeros["portraits"] = [];
for (const h of heros) {
  const fiche = fiches("characters").find((f) => f.data.id === h.id)!.data;
  if (!fiche.portrait || !existe(fiche.portrait)) continue;
  const rel = `portraits/${h.id}.png`;
  mkdirSync(dirname(sortie(rel)), { recursive: true });
  copyFileSync(chemin(fiche.portrait), sortie(rel));
  portraits.push({ nom: h.nom, fichier: rel, source: fiche.portrait });
}

// ---- 4. Manifeste et aperçus
const manifeste = { genereLe: new Date().toISOString(), joueurs: joueurs.map(({ animations: _a, ...reste }) => reste), sprites };
writeFileSync(sortie("manifest.json"), `${JSON.stringify(manifeste, null, 2)}\n`);
writeFileSync(sortie("apercu.html"), genererApercu({ joueurs, sprites }));
writeFileSync(sortie("apercu-heros.html"), genererApercuHeros({ heros, creatures, eclairs: { fichier: "effets/eclairs-ssj2.png", taille: TAILLE_ECLAIRS, nombre: NOMBRE_ECLAIRS }, log1, echelle, portraits }));
console.log(
  `assets/build : ${heros.length} héros, ${joueurs.length} planches de joueur (transition), ${sprites.filter((s) => s.fichier).length} sprites, ${creatures.length} créatures animées. Ouvre assets/build/apercu.html et assets/build/apercu-heros.html`,
);
