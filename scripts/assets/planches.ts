/**
 * Extraction de planches : les planches de Buu's Fury et de Legacy of Goku 2 ont un fond en damier vert, un bandeau
 * de titre et un crédit. On découpe le bloc utile et on rend le fond transparent (les originaux ne sont jamais modifiés).
 */
import type { PNG } from "pngjs";
import { nouvelleImage, copier, lirePixel, ecrirePixel, type Rgb } from "./png.js";

/** Les trois verts de fond des planches (damier clair, damier foncé, case vide / bandeau). */
const FONDS: Rgb[] = [
  [52, 188, 136],
  [71, 255, 187],
  [42, 150, 108],
];

const estFond = ([r, g, b]: readonly number[]) => FONDS.some((f) => f[0] === r && f[1] === g && f[2] === b);

/** Découpe le rectangle (x, y, largeur, hauteur) en rendant le fond transparent. */
export function extraireBloc(src: PNG, x: number, y: number, largeur: number, hauteur: number): PNG {
  if (x + largeur > src.width || y + hauteur > src.height) throw new Error(`bloc ${x},${y} ${largeur}×${hauteur} hors de la planche ${src.width}×${src.height}`);
  const sortie = nouvelleImage(largeur, hauteur);
  copier(src, x, y, largeur, hauteur, sortie, 0, 0);
  for (let j = 0; j < hauteur; j++) for (let i = 0; i < largeur; i++) if (estFond(lirePixel(sortie, i, j))) ecrirePixel(sortie, i, j, [0, 0, 0, 0]);
  return sortie;
}

/** Planche d'un personnage : bandeau de titre de 32 px, puis 4 lignes (face, trois-quarts, profil, dos). */
export function extrairePersonnage(src: PNG, cadre = 32): PNG {
  return extraireBloc(src, 0, cadre, Math.floor(src.width / cadre) * cadre, 4 * cadre);
}

/**
 * Planche d'une créature de Legacy of Goku 2 : bandeau de titre d'un cadre, puis des blocs de 4 lignes
 * (face, côté gauche, côté droit, dos), un par variante de couleur, séparés par une ligne vide.
 */
export function extraireCreature(src: PNG, cadre: number, variante: number): PNG {
  const y = cadre + variante * 5 * cadre;
  return extraireBloc(src, 0, y, Math.floor(src.width / cadre) * cadre, 4 * cadre);
}

/**
 * Éclairs du Super Saiyan 2 : fenêtres de `taille` px prises dans les arcs fins de l'animation 22 de DBZ Online
 * (4 cadres de 112 × 252), choisies là où il y a le plus d'arcs. Rendu : une bande de `nombre` images.
 */
export function extraireEclairs(src: PNG, taille: number, nombre: number): PNG {
  const cadreL = Math.floor(src.width / 4);
  const sortie = nouvelleImage(taille * nombre, taille);
  // on n'utilise que les trois derniers cadres : le premier est la colonne de foudre épaisse
  const candidats: { cadre: number; x: number; y: number; score: number }[] = [];
  for (let cadre = 1; cadre < 4; cadre++) {
    for (let y = 0; y + taille <= src.height; y += 4) {
      for (let x = 0; x + taille <= cadreL; x += 4) {
        let score = 0;
        for (let j = 0; j < taille; j += 2) for (let i = 0; i < taille; i += 2) if (lirePixel(src, cadre * cadreL + x + i, y + j)[3] > 0) score++;
        candidats.push({ cadre, x, y, score });
      }
    }
  }
  candidats.sort((a, b) => b.score - a.score);
  const choisis: typeof candidats = [];
  for (const c of candidats) {
    if (choisis.length >= nombre) break;
    // fenêtres bien distinctes : pas de recouvrement avec une fenêtre déjà prise du même cadre
    if (choisis.some((d) => d.cadre === c.cadre && Math.abs(d.x - c.x) < taille && Math.abs(d.y - c.y) < taille)) continue;
    choisis.push(c);
  }
  choisis.forEach((c, k) => copier(src, c.cadre * cadreL + c.x, c.y, taille, taille, sortie, k * taille, 0));
  return sortie;
}

/**
 * Petits arcs électriques du Super Saiyan 2, dessinés à l'échelle du sprite (cases de 32 px, pixel par pixel) :
 * quelques segments en zigzag de 3 à 6 px qui partent du contour du corps, jamais sur le visage.
 * Certaines images sont vides pour que les arcs apparaissent et disparaissent par intermittence.
 * Pseudo-aléatoire déterministe : la planche générée est toujours la même.
 */
export function genererArcs(taille = 32, nombre = 8): PNG {
  const sortie = nouvelleImage(taille * nombre, taille);
  let graine = 12345;
  const alea = () => ((graine = (graine * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const centre = { x: taille / 2, y: taille * 0.58 };
  const vides = new Set([2, 5]);
  for (let k = 0; k < nombre; k++) {
    if (vides.has(k)) continue;
    const nbArcs = 2 + Math.floor(alea() * 2);
    for (let a = 0; a < nbArcs; a++) {
      // départ sur le contour du corps (ellipse), plutôt sur les côtés et les jambes que sur la tête
      const angle = alea() * Math.PI * 2;
      let x = centre.x + Math.cos(angle) * 6;
      let y = centre.y + Math.sin(angle) * 9;
      if (y < taille * 0.3) y = taille * 0.3;
      const longueur = 3 + Math.floor(alea() * 4);
      const dx = Math.cos(angle) >= 0 ? 1 : -1;
      for (let i = 0; i < longueur; i++) {
        const px = Math.round(x), py = Math.round(y);
        const couleur: [number, number, number, number] = i === 0 ? [255, 255, 255, 255] : [255, 240, 90, 255];
        if (px >= 0 && px < taille && py >= 0 && py < taille) ecrirePixel(sortie, k * taille + px, py, couleur);
        x += dx * (alea() < 0.7 ? 1 : 0);
        y += alea() < 0.5 ? -1 : 1;
        if (alea() < 0.25) y += alea() < 0.5 ? -1 : 1;
      }
    }
  }
  return sortie;
}
