import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PNG } from "pngjs";

export type Rgb = readonly [number, number, number];
export type Rgba = readonly [number, number, number, number];

export function lirePng(abs: string): PNG {
  return PNG.sync.read(readFileSync(abs));
}

export function ecrirePng(abs: string, png: PNG): void {
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, PNG.sync.write(png));
}

export function nouvelleImage(largeur: number, hauteur: number): PNG {
  return new PNG({ width: largeur, height: hauteur });
}

export function lirePixel(png: PNG, x: number, y: number): Rgba {
  const i = (y * png.width + x) * 4;
  return [png.data[i] ?? 0, png.data[i + 1] ?? 0, png.data[i + 2] ?? 0, png.data[i + 3] ?? 0];
}

export function ecrirePixel(png: PNG, x: number, y: number, [r, g, b, a]: Rgba): void {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (y * png.width + x) * 4;
  png.data[i] = r;
  png.data[i + 1] = g;
  png.data[i + 2] = b;
  png.data[i + 3] = a;
}

export function rgbVersHsl([r, g, b]: Rgb): [number, number, number] {
  const [R, G, B] = [r / 255, g / 255, b / 255] as const;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h * 60, s, l];
}

export function hslVersRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** Remplace la teinte des couleurs listées, en gardant saturation et luminosité. */
export function recolorer(source: PNG, couleurs: readonly Rgb[], teinte: number): PNG {
  const sortie = nouvelleImage(source.width, source.height);
  sortie.data = Buffer.from(source.data);
  const cibles = new Set(couleurs.map((c) => c.join(",")));
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const [r, g, b, a] = lirePixel(source, x, y);
      if (a === 0 || !cibles.has(`${r},${g},${b}`)) continue;
      const [, s, l] = rgbVersHsl([r, g, b]);
      ecrirePixel(sortie, x, y, [...hslVersRgb(teinte, s, l), a]);
    }
  }
  return sortie;
}

/** Copie un rectangle de `src` dans `dest` ; `miroir` retourne horizontalement. */
export function copier(src: PNG, sx: number, sy: number, l: number, h: number, dest: PNG, dx: number, dy: number, miroir = false): void {
  for (let y = 0; y < h; y++) for (let x = 0; x < l; x++) ecrirePixel(dest, dx + (miroir ? l - 1 - x : x), dy + y, lirePixel(src, sx + x, sy + y));
}
