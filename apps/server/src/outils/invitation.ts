/** npm run invite:create [-- <nombre>] : génère des clés d'invitation à usage unique. */
import { randomBytes } from "node:crypto";
import { lireConfig } from "../config.js";
import { ouvrirBase } from "../db/connexion.js";
import { invitations } from "../db/schema.js";

export function genererCle(): string {
  return randomBytes(9).toString("base64url").toUpperCase();
}

const nombre = Math.max(1, Number(process.argv[2] ?? 1) || 1);
const db = ouvrirBase(lireConfig().cheminBase);
for (let i = 0; i < nombre; i++) {
  const cle = genererCle();
  db.insert(invitations).values({ cle, creeLe: Date.now() }).run();
  console.log(cle);
}
