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
import { extraireCreature, extraireEclairs, extrairePersonnage } from "./assets/planches.js";
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
      if (p.palettes_joueur && app === p.apparences[0]) {
        const nomAncien = `characters/${basename(f.animations)}`;
        copyFileSync(chemin(f.animations), sortie(nomAncien));
        for (const nom of p.palettes_joueur as string[]) {
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

// ---- 2. Éclairs du Super Saiyan 2 (animation 22 de DBZ Online)
const TAILLE_ECLAIRS = 64;
const NOMBRE_ECLAIRS = 4;
const eclairs = extraireEclairs(lirePng(chemin("assets/raw/graphics/animations/22.png")), TAILLE_ECLAIRS, NOMBRE_ECLAIRS);
ecrirePng(sortie("effets/eclairs-ssj2.png"), eclairs);

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

// ---- 4. Manifeste et aperçus
const manifeste = { genereLe: new Date().toISOString(), joueurs: joueurs.map(({ animations: _a, ...reste }) => reste), sprites };
writeFileSync(sortie("manifest.json"), `${JSON.stringify(manifeste, null, 2)}\n`);
writeFileSync(sortie("apercu.html"), genererApercu({ joueurs, sprites }));
writeFileSync(sortie("apercu-heros.html"), genererApercuHeros({ heros, creatures, eclairs: { fichier: "effets/eclairs-ssj2.png", taille: TAILLE_ECLAIRS, nombre: NOMBRE_ECLAIRS } }));
console.log(
  `assets/build : ${heros.length} héros, ${joueurs.length} planches de joueur (transition), ${sprites.filter((s) => s.fichier).length} sprites, ${creatures.length} créatures animées. Ouvre assets/build/apercu.html et assets/build/apercu-heros.html`,
);
