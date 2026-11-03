/**
 * Sprites « maison » dessinés par code : crabe de l'île de Roshi et mannequin d'entraînement.
 * Format DBZ Online : 32 × 32 par direction, lignes dos / face / gauche / droite.
 * Lumière du haut à gauche, ombre portée en bas à droite (docs/direction-artistique.md).
 */
import type { PNG } from "pngjs";
import { copier, ecrirePixel, lirePixel, nouvelleImage, type Rgba } from "./png.js";

const TAILLE = 32;
const CONTOUR: Rgba = [58, 16, 16, 255];
const NOIR: Rgba = [0, 0, 0, 255];
const BLANC: Rgba = [255, 255, 255, 255];

/** Toile 32 × 32 avec quelques primitives. */
class Toile {
  readonly image = nouvelleImage(TAILLE, TAILLE);

  point(x: number, y: number, c: Rgba) {
    ecrirePixel(this.image, Math.round(x), Math.round(y), c);
  }

  /** Ellipse remplie ; `teinte` choisit la couleur selon la position (ombrage). */
  ellipse(cx: number, cy: number, rx: number, ry: number, teinte: (lum: number) => Rgba) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        if (nx * nx + ny * ny > 1) continue;
        this.point(x, y, teinte(-(nx * 0.55 + ny * 0.75)));
      }
    }
  }

  ligne(x0: number, y0: number, x1: number, y1: number, c: Rgba) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.point(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }

  rect(x: number, y: number, l: number, h: number, c: Rgba) {
    for (let j = 0; j < h; j++) for (let i = 0; i < l; i++) this.point(x + i, y + j, c);
  }

  /** Contour d'un pixel autour de tout ce qui est opaque. */
  contour(c: Rgba) {
    const copie = nouvelleImage(TAILLE, TAILLE);
    copie.data = Buffer.from(this.image.data);
    for (let y = 0; y < TAILLE; y++) {
      for (let x = 0; x < TAILLE; x++) {
        if (lirePixel(copie, x, y)[3] > 0) continue;
        const voisins: [number, number][] = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
        if (voisins.some(([vx, vy]) => vx >= 0 && vy >= 0 && vx < TAILLE && vy < TAILLE && lirePixel(copie, vx, vy)[3] > 0)) this.point(x, y, c);
      }
    }
  }

  /** Ombre portée noire sous le sprite (comme les sprites DBZ Online). */
  ombre(cx: number, cy: number, rx: number, ry: number) {
    for (let y = cy - ry; y <= cy + ry; y++)
      for (let x = cx - rx; x <= cx + rx; x++) {
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1 && lirePixel(this.image, x, y)[3] === 0) this.point(x, y, NOIR);
      }
  }
}

function ton(sombre: Rgba, moyen: Rgba, clair: Rgba) {
  return (lum: number): Rgba => (lum > 0.3 ? clair : lum < -0.3 ? sombre : moyen);
}

const CRABE = ton([150, 38, 30, 255], [214, 72, 48, 255], [255, 128, 90, 255]);

type Direction = "dos" | "face" | "gauche";

function dessinerCrabe(direction: Direction): Toile {
  const t = new Toile();
  const cote = direction === "gauche";
  const cx = cote ? 17 : 16;
  const cy = 19;
  // Pattes (derrière le corps) : trois par côté, ou trois visibles de profil.
  const pattes = cote
    ? ([[11, 6], [15, 7], [20, 7]] as const).map(([x, dx]) => [x, cy + 3, x - dx / 3 - 1, cy + 8] as const)
    : [-1, 1].flatMap((s) => [0, 1, 2].map((i) => [cx + s * 6, cy + i * 2 - 1, cx + s * (10 + i), cy + 4 + i * 2] as const));
  for (const [x0, y0, x1, y1] of pattes) t.ligne(x0, y0, x1, y1, CRABE(-1));
  // Pinces
  if (cote) {
    t.ligne(12, 17, 9, 14, CRABE(0));
    t.ellipse(8, 13, 3.5, 3, CRABE);
    t.point(6, 12, [0, 0, 0, 0]);
    t.point(6, 13, [0, 0, 0, 0]);
    t.ellipse(25, 14, 2.5, 2.5, ton([110, 26, 22, 255], [150, 38, 30, 255], [214, 72, 48, 255]));
  } else {
    const y = direction === "dos" ? 14 : 15;
    for (const s of [-1, 1]) {
      t.ligne(cx + s * 6, cy - 2, cx + s * 9, y + 1, CRABE(0));
      t.ellipse(cx + s * 10, y - 1, 3.5, 3.2, CRABE);
      t.point(cx + s * 10, y - 4, [0, 0, 0, 0]);
      t.point(cx + s * 10, y - 3, [0, 0, 0, 0]);
    }
  }
  // Corps
  t.ellipse(cx, cy, cote ? 8 : 9, 5.5, CRABE);
  // Carapace : deux reflets
  if (direction !== "face") {
    t.point(cx - 3, cy - 2, [255, 170, 130, 255]);
    t.point(cx - 2, cy - 3, [255, 170, 130, 255]);
  }
  // Yeux sur tiges
  if (direction === "face") {
    for (const s of [-1, 1]) {
      t.ligne(cx + s * 3, cy - 4, cx + s * 3, cy - 7, CRABE(-1));
      t.rect(cx + s * 3 - 1, cy - 9, 3, 3, BLANC);
      t.point(cx + s * 3, cy - 7, NOIR);
    }
  } else if (cote) {
    t.ligne(cx - 5, cy - 4, cx - 5, cy - 7, CRABE(-1));
    t.rect(cx - 6, cy - 9, 3, 3, BLANC);
    t.point(cx - 6, cy - 7, NOIR);
  }
  t.contour(CONTOUR);
  t.ombre(cx + 1, 27, 11, 2);
  return t;
}

/** Planche 32 × 128 : dos, face, gauche, droite. */
export function planche4Directions(dessins: Record<Direction, Toile>): PNG {
  const planche = nouvelleImage(TAILLE, TAILLE * 4);
  copier(dessins.dos.image, 0, 0, TAILLE, TAILLE, planche, 0, 0);
  copier(dessins.face.image, 0, 0, TAILLE, TAILLE, planche, 0, TAILLE);
  copier(dessins.gauche.image, 0, 0, TAILLE, TAILLE, planche, 0, TAILLE * 2);
  copier(dessins.gauche.image, 0, 0, TAILLE, TAILLE, planche, 0, TAILLE * 3, true);
  return planche;
}

export function crabe(): PNG {
  return planche4Directions({ dos: dessinerCrabe("dos"), face: dessinerCrabe("face"), gauche: dessinerCrabe("gauche") });
}

/** Mannequin d'entraînement en bois : poteau, traverse liée à la corde, tête en paille. Image unique 32 × 32. */
export function mannequin(): PNG {
  const bois = ton([92, 62, 34, 255], [136, 96, 54, 255], [176, 132, 80, 255]);
  const paille = ton([164, 134, 62, 255], [206, 176, 92, 255], [236, 210, 130, 255]);
  const corde: Rgba = [120, 90, 50, 255];
  const t = new Toile();
  t.rect(14, 12, 5, 16, bois(0)); // poteau
  t.rect(14, 12, 2, 16, bois(1));
  t.rect(5, 14, 22, 3, bois(0)); // traverse
  t.rect(5, 14, 22, 1, bois(1));
  t.rect(5, 16, 22, 1, bois(-1));
  for (const x of [4, 27]) for (let i = 0; i < 3; i++) t.ligne(x, 15, x + (x < 10 ? -1 : 1) * (1 + i), 13 + i * 2, paille(1)); // paille aux bouts
  t.ellipse(16, 8, 4.5, 4.5, paille); // tête de paille
  for (const [x, y] of [[11, 4], [21, 4], [10, 9], [22, 9], [16, 2]] as const) t.ligne(16, 8, x, y, paille(1)); // brins qui dépassent
  t.rect(13, 12, 7, 1, corde); // cou lié
  t.rect(14, 15, 5, 1, corde); // nœud sur la traverse
  t.rect(14, 22, 5, 1, corde); // corde sur le poteau
  t.rect(12, 27, 9, 2, [110, 84, 52, 255]); // base de terre
  t.contour(CONTOUR);
  t.ombre(17, 29, 9, 2);
  return t.image;
}
