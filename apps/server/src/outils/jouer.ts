/**
 * npm run jouer : lance le serveur de jeu et le client (Vite) ensemble.
 *  - choisit des ports libres si 2567 / 5173 sont occupés (et le dit clairement) ;
 *  - fournit une clé d'invitation si aucun compte n'existe ou si toutes les clés sont utilisées ;
 *  - attend que les deux répondent avant d'annoncer l'adresse ;
 *  - Ctrl+C (ou la fin d'un des deux processus) arrête proprement les deux.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { lireConfig, racine } from "../config.js";
import { ouvrirBase } from "../db/connexion.js";
import { invitations } from "../db/schema.js";

const PORT_SERVEUR = 2567;
const PORT_CLIENT = 5173;
const ATTENTE_MAX_MS = 60_000;

/** Premier port libre à partir de `depart` (on essaie d'écouter dessus). */
function portLibre(depart: number): Promise<number> {
  return new Promise((resolve) => {
    const essayer = (port: number) => {
      const s = createServer();
      s.once("error", () => essayer(port + 1));
      s.once("listening", () => s.close(() => resolve(port)));
      s.listen(port);
    };
    essayer(depart);
  });
}

async function attendre(url: string, nom: string): Promise<void> {
  const fin = Date.now() + ATTENTE_MAX_MS;
  while (Date.now() < fin) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* pas encore prêt */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`${nom} ne répond pas sur ${url} après ${ATTENTE_MAX_MS / 1000} s`);
}

function cleInvitation(): string | null {
  const config = lireConfig();
  const db = ouvrirBase(config.cheminBase);
  const n = (sql: string) => (db.$client.prepare(sql).get() as { n: number }).n;
  const comptes = n("select count(*) n from comptes");
  const libres = n("select count(*) n from invitations where utilisee_par is null");
  let cle: string | null = null;
  if (comptes === 0 || libres === 0) {
    cle = randomBytes(9).toString("base64url").toUpperCase();
    db.insert(invitations).values({ cle, creeLe: Date.now() }).run();
  } else console.log(`${libres} clé(s) d'invitation disponible(s). Pour en créer : npm run invite:create`);
  db.$client.close();
  return cle;
}

const enfants: ChildProcess[] = [];
let arret = false;

/** Arrête un processus et ses descendants (npm lance tsx/vite dans des sous-processus). */
function tuer(e: ChildProcess) {
  if (e.pid === undefined || e.exitCode !== null) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(e.pid), "/T", "/F"], { stdio: "ignore" });
  else e.kill("SIGTERM");
}

function arreter(code = 0) {
  if (arret) return;
  arret = true;
  for (const e of enfants) tuer(e);
  process.exit(code);
}

function lancer(script: string, env: NodeJS.ProcessEnv) {
  const e = spawn("npm", ["run", script], { cwd: racine, stdio: ["ignore", "inherit", "inherit"], shell: true, env: { ...process.env, ...env } });
  enfants.push(e);
  e.on("exit", (code) => {
    if (!arret) console.error(`\n« npm run ${script} » s'est arrêté (code ${code}). Arrêt du jeu.`);
    arreter(code ?? 1);
  });
}

process.on("SIGINT", () => arreter());
process.on("SIGTERM", () => arreter());

const cle = cleInvitation();
const portServeur = await portLibre(PORT_SERVEUR);
const portClient = await portLibre(PORT_CLIENT);
if (portServeur !== PORT_SERVEUR) console.log(`Le port ${PORT_SERVEUR} est occupé (un ancien serveur tourne ?) : le serveur utilisera le ${portServeur}.`);
if (portClient !== PORT_CLIENT) console.log(`Le port ${PORT_CLIENT} est occupé (un ancien Vite tourne ?) : le client utilisera le ${portClient}.`);

// en local, les commandes d'administration sont actives (il faut aussi le rôle admin en base : npm run admin:grant -- <pseudo>)
lancer("dev", { PORT: String(portServeur), ADMIN_COMMANDS: "on" });
lancer("dev:client", { CLIENT_PORT: String(portClient), DBZ_API: `http://localhost:${portServeur}`, VITE_SERVEUR: `ws://localhost:${portServeur}` });

try {
  await attendre(`http://localhost:${portServeur}/api/sante`, "Le serveur");
  await attendre(`http://localhost:${portClient}/`, "Le client");
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  arreter(1);
}
console.log(`\nSERVEUR=http://localhost:${portServeur}`);
console.log(`CLIENT=http://localhost:${portClient}`);
if (cle) console.log(`CLE=${cle}`);
console.log(`\n  Ouvre http://localhost:${portClient} dans ton navigateur.${cle ? `\n  Clé d'invitation pour créer ton compte : ${cle}` : ""}\n  Ctrl+C pour tout arrêter.\n`);
