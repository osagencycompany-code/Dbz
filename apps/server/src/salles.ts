import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { racine } from "./config.js";

/** Le matchmaking place le nom de salle dans l'URL : pas de « / ». */
export const nomSalle = (map: string) => map.replaceAll("/", "-");

/** Une salle par map, d'après data/zones/*.json (les identifiants sont les chemins sous maps/, sans « .tmj »). */
export function mapsDesZones(): string[] {
  const dossier = join(racine, "data", "zones");
  return readdirSync(dossier)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => (JSON.parse(readFileSync(join(dossier, f), "utf8")) as { maps: string[] }).maps)
    .map((m) => m.replace(/^maps\//, "").replace(/\.tmj$/, ""));
}
