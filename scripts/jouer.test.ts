/**
 * Lance réellement `npm run jouer` (donc les scripts `dev` et `dev:client`) et vérifie que le serveur
 * et le client répondent, même quand les ports habituels sont déjà pris. Attrape les scripts cassés
 * (ordre des arguments de tsx, port occupé…) que les tests unitaires ne voient pas.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

function occuper(port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.once("error", reject);
    s.listen(port, () => resolve(s));
  });
}

async function portDisponible(port: number): Promise<boolean> {
  try {
    (await occuper(port)).close();
    return true;
  } catch {
    return false;
  }
}

describe("npm run jouer", () => {
  it("démarre serveur et client, choisit d'autres ports si besoin, et s'arrête proprement", async () => {
    const dossier = mkdtempSync(join(tmpdir(), "dbz-jouer-"));
    // on occupe les ports habituels s'ils sont libres : le script doit en prendre d'autres
    const bloqueurs: Server[] = [];
    for (const p of [2567, 5173]) if (await portDisponible(p)) bloqueurs.push(await occuper(p));

    // l'environnement de vitest ne doit pas fuir dans les processus lancés
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(VITEST|VITE_|NODE_ENV|TEST)/.test(k)));
    const enfant = spawn("npm", ["run", "jouer"], {
      cwd: racine,
      shell: true,
      env: { ...env, DB_PATH: join(dossier, "test.sqlite") },
    });
    let sortie = "";
    enfant.stdout.on("data", (d) => (sortie += String(d)));
    enfant.stderr.on("data", (d) => (sortie += String(d)));
    const arreter = () => {
      if (enfant.pid) spawnSync("taskkill", ["/pid", String(enfant.pid), "/T", "/F"], { stdio: "ignore" });
      if (process.platform !== "win32") enfant.kill("SIGTERM");
    };

    try {
      const fin = Date.now() + 80_000;
      while (!/CLIENT=/.test(sortie) && Date.now() < fin && enfant.exitCode === null) await new Promise((r) => setTimeout(r, 300));
      expect(sortie, sortie).toMatch(/SERVEUR=http:\/\/localhost:\d+/);
      const serveur = /SERVEUR=(\S+)/.exec(sortie)![1]!;
      const client = /CLIENT=(\S+)/.exec(sortie)![1]!;
      expect((await fetch(`${serveur}/api/sante`)).ok).toBe(true);
      const page = await fetch(client);
      expect(page.ok).toBe(true);
      expect(await page.text()).toContain("DBZ MY GAME");
      // l'API est aussi joignable à travers le client (proxy Vite)
      expect((await fetch(`${client}/api/sante`)).ok).toBe(true);
      if (bloqueurs.length > 0) expect(sortie).toMatch(/occupé/);
      expect(sortie).toMatch(/CLE=\S+/); // base neuve : une clé d'invitation est fournie
      const ports = [serveur, client].map((u) => Number(new URL(u).port));
      arreter();
      await new Promise((r) => setTimeout(r, 1500));
      for (const p of ports) expect(await portDisponible(p), `le port ${p} est encore occupé`).toBe(true);
    } finally {
      arreter();
      for (const b of bloqueurs) b.close();
      rmSync(dossier, { recursive: true, force: true });
    }
  }, 120_000);
});
