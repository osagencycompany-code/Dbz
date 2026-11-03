/**
 * Génère tout ce que le jeu charge dans assets/build/ (jamais versionné) :
 *  - characters/<forme>-<palette>.png : planches de Goku recolorées (palettes de assets/palettes.json) + animations ;
 *  - sprites/<id>.png : monstres, boss et PNJ listés dans data/ ;
 *  - manifest.json et apercu.html (page d'aperçu à ouvrir dans un navigateur).
 * Les originaux de assets/raw/ ne sont jamais modifiés. Usage : npm run assets:build
 */
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { genererApercu, type EntreeApercu } from "./assets/apercu.js";
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

// ---- 1. Personnages joueurs : une planche par forme et par palette
const joueurs: EntreeApercu["joueurs"] = [];
for (const { data: p } of fiches("characters")) {
  if (p.role !== "modele-joueur") continue;
  for (const [forme, f] of Object.entries<any>(p.formes)) {
    const source = lirePng(chemin(f.planche));
    const nomAnims = `characters/${basename(f.animations)}`;
    mkdirSync(dirname(sortie(nomAnims)), { recursive: true });
    copyFileSync(chemin(f.animations), sortie(nomAnims));
    for (const nom of p.palettes_joueur ?? ["orange"]) {
      if (!(nom in palettes.palettes)) throw new Error(`Palette « ${nom} » absente de assets/palettes.json`);
      const reglage = palettes.palettes[nom];
      const image = reglage ? recolorer(source, palettes.gi, reglage.teinte) : source;
      const fichier = `characters/${p.id}${forme === "normal" ? "" : `-${forme}`}-${nom}.png`;
      ecrirePng(sortie(fichier), image);
      joueurs.push({ personnage: p.id, forme, palette: nom, planche: fichier, animations: lireJson(chemin(f.animations)) as any });
    }
  }
}

// ---- 2. Monstres, boss, PNJ : une planche par fiche
const sprites: EntreeApercu["sprites"] = [];
for (const [dossier, type] of [["mobs", "monstre"], ["bosses", "boss"], ["npcs", "pnj"]] as const) {
  for (const { data: d } of fiches(dossier)) {
    const s = d.sprite as { source: string; fichier: string | null; format: string } | null | undefined;
    if (!s?.fichier) {
      sprites.push({ id: d.id, nom: d.nom, type, statut: d.statut, source: s?.source ?? "aucun", fichier: null, format: s?.format ?? "", largeur: 0, hauteur: 0, note: d.a_verifier ?? "" });
      continue;
    }
    if (!existe(s.fichier)) throw new Error(`${d.id} : ${s.fichier} absent`);
    const sortieRel = `sprites/${d.id}.png`;
    mkdirSync(dirname(sortie(sortieRel)), { recursive: true });
    copyFileSync(chemin(s.fichier), sortie(sortieRel));
    const { largeur, hauteur } = dimensionsPng(chemin(s.fichier));
    sprites.push({ id: d.id, nom: d.nom, type, statut: d.statut, source: s.source, fichier: sortieRel, format: s.format, largeur, hauteur, note: d.a_verifier ?? "" });
  }
}

// ---- 3. Manifeste et aperçu
const manifeste = { genereLe: new Date().toISOString(), joueurs: joueurs.map(({ animations: _a, ...reste }) => reste), sprites };
writeFileSync(sortie("manifest.json"), `${JSON.stringify(manifeste, null, 2)}\n`);
writeFileSync(sortie("apercu.html"), genererApercu({ joueurs, sprites }));
console.log(`assets/build : ${joueurs.length} planches de joueur, ${sprites.filter((s) => s.fichier).length} sprites. Ouvre assets/build/apercu.html`);
