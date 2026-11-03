import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const racine = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function chemin(...parties: string[]): string {
  return join(racine, ...parties);
}

export function existe(rel: string): boolean {
  return existsSync(chemin(rel));
}

export function lireJson(abs: string): unknown {
  return JSON.parse(readFileSync(abs, "utf8"));
}

/** Chemin relatif à la racine, avec des « / ». */
export function relatif(abs: string): string {
  return relative(racine, abs).split("\\").join("/");
}

export function listerFichiers(dossierAbs: string, extension: string): string[] {
  if (!existsSync(dossierAbs)) return [];
  const sortie: string[] = [];
  for (const nom of readdirSync(dossierAbs).sort()) {
    const abs = join(dossierAbs, nom);
    if (statSync(abs).isDirectory()) sortie.push(...listerFichiers(abs, extension));
    else if (nom.endsWith(extension)) sortie.push(abs);
  }
  return sortie;
}

/** Dimensions d'un PNG lues dans l'en-tête IHDR (sans dépendance). */
export function dimensionsPng(abs: string): { largeur: number; hauteur: number } {
  const tampon = readFileSync(abs);
  const signature = "89504e470d0a1a0a";
  if (tampon.subarray(0, 8).toString("hex") !== signature) throw new Error("pas un PNG");
  return { largeur: tampon.readUInt32BE(16), hauteur: tampon.readUInt32BE(20) };
}
