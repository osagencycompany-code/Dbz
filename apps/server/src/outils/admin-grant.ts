/** npm run admin:grant -- <pseudo> : donne le rôle admin (seul moyen de le faire). */
import { eq } from "drizzle-orm";
import { lireConfig } from "../config.js";
import { ouvrirBase } from "../db/connexion.js";
import { comptes } from "../db/schema.js";

const pseudo = process.argv[2];
if (!pseudo) {
  console.error("Usage : npm run admin:grant -- <pseudo>");
  process.exit(1);
}
const db = ouvrirBase(lireConfig().cheminBase);
const resultat = db.update(comptes).set({ role: "admin" }).where(eq(comptes.pseudo, pseudo)).run();
if (resultat.changes === 0) {
  console.error(`Aucun compte « ${pseudo} ».`);
  process.exit(1);
}
console.log(`« ${pseudo} » est maintenant administrateur (les commandes exigent aussi ADMIN_COMMANDS=on).`);
