import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const racine = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export interface Config {
  port: number;
  /** Chemin du fichier SQLite, ou « :memory: ». */
  cheminBase: string;
  /** Secret de signature des jetons de session. */
  secret: string;
  /** Commandes d'administration actives (ADMIN_COMMANDS=on). */
  commandesAdmin: boolean;
  production: boolean;
  /** Tentatives d'inscription / connexion autorisées par minute et par adresse. */
  essaisParMinute: number;
}

/** En développement, le secret est créé une fois et conservé dans .dev-secret (ignoré par git). */
function secretDeDev(): string {
  const fichier = join(racine, ".dev-secret");
  if (existsSync(fichier)) return readFileSync(fichier, "utf8").trim();
  const secret = randomBytes(32).toString("hex");
  writeFileSync(fichier, secret);
  return secret;
}

export function lireConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === "production";
  if (production && !env.SESSION_SECRET) throw new Error("SESSION_SECRET est obligatoire en production");
  const cheminBase = env.DB_PATH ?? join(racine, "data-runtime", "dbz.sqlite");
  if (cheminBase !== ":memory:") mkdirSync(dirname(cheminBase), { recursive: true });
  return {
    port: Number(env.PORT ?? 2567),
    cheminBase,
    secret: env.SESSION_SECRET ?? secretDeDev(),
    commandesAdmin: env.ADMIN_COMMANDS === "on",
    production,
    essaisParMinute: Number(env.ESSAIS_PAR_MINUTE ?? 10),
  };
}
