/**
 * npm run jouer : lance le serveur de jeu et le client (Vite) ensemble, et fournit une clé d'invitation
 * si aucun compte n'existe encore. Ctrl+C arrête les deux.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { lireConfig, racine } from "../config.js";
import { ouvrirBase } from "../db/connexion.js";
import { invitations } from "../db/schema.js";

const config = lireConfig();
const db = ouvrirBase(config.cheminBase);
const comptes = (db.$client.prepare("select count(*) n from comptes").get() as { n: number }).n;
const libres = (db.$client.prepare("select count(*) n from invitations where utilisee_par is null").get() as { n: number }).n;
if (comptes === 0 || libres === 0) {
  const cle = randomBytes(9).toString("base64url").toUpperCase();
  db.insert(invitations).values({ cle, creeLe: Date.now() }).run();
  console.log(`\n  Clé d'invitation pour créer ton compte : ${cle}\n`);
} else {
  console.log(`\n  ${libres} clé(s) d'invitation disponible(s). Pour en créer : npm run invite:create\n`);
}
db.$client.close();

const enfants: ChildProcess[] = [];
const lancer = (script: string) => {
  const e = spawn("npm", ["run", script], { cwd: racine, stdio: "inherit", shell: true });
  enfants.push(e);
  e.on("exit", () => arreter());
};
let arret = false;
function arreter() {
  if (arret) return;
  arret = true;
  for (const e of enfants) e.kill();
  process.exit(0);
}
process.on("SIGINT", arreter);
process.on("SIGTERM", arreter);
lancer("dev");
lancer("dev:client");
console.log("  Jeu : http://localhost:5173 (ouvre cette adresse dans le navigateur)\n");
