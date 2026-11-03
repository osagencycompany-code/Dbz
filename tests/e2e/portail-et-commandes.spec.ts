/**
 * Un portail ne déconnecte pas (aller-retour dans le vrai navigateur), et les commandes d'administration
 * fonctionnent pour un administrateur (ligne de saisie sur Entrée) mais pas pour un joueur ordinaire.
 */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import Database from "better-sqlite3";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT_SERVEUR = 2599;
const base = process.env.DBZ_E2E_DB!;

function cle(): string {
  return execSync("npm run -s invite:create -- 1", { cwd: racine, env: { ...process.env, DB_PATH: base } }).toString().split(/\r?\n/).filter(Boolean)[0]!;
}

async function inscrire(pseudo: string) {
  const r = await fetch(`http://localhost:${PORT_SERVEUR}/api/inscription`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pseudo, email: `${pseudo.toLowerCase()}@exemple.fr`, motDePasse: "motdepasse1", cle: cle() }),
  });
  const corps = (await r.json()) as { jeton: string };
  // crée le personnage
  await fetch(`http://localhost:${PORT_SERVEUR}/api/personnage`, { headers: { authorization: `Bearer ${corps.jeton}` } });
  return corps.jeton;
}

function sql(requete: string, ...valeurs: unknown[]) {
  const bd = new Database(base);
  bd.prepare(requete).run(...valeurs);
  bd.close();
}

const etat = (page: Page) => page.evaluate(() => (window as any).__dbz?.etat());

async function seConnecter(page: Page, pseudo: string) {
  page.on("pageerror", (e) => console.log(`[${pseudo}] ERREUR: ${e.message}`));
  await page.goto("/");
  await page.fill('input[name="pseudo"]', pseudo);
  await page.fill('input[name="motDePasse"]', "motdepasse1");
  await page.click("#valider");
  await page.waitForFunction(() => !!(window as any).__dbz?.etat().position, undefined, { timeout: 30_000 });
}

async function marcherJusqua(page: Page, touche: string, carte: string) {
  await page.keyboard.down(touche);
  try {
    await expect.poll(async () => (await etat(page))?.map, { timeout: 8_000 }).toBe(carte);
  } finally {
    await page.keyboard.up(touche);
  }
}

test("un portail aller-retour (Kame House) ne déconnecte pas", async ({ browser }) => {
  await inscrire("Portail");
  // devant la porte de la Kame House, juste sous le portail
  sql("UPDATE personnages SET x = 400, y = 352, spawn = NULL WHERE compte_id = (SELECT id FROM comptes WHERE pseudo = 'Portail')");
  const page = await (await browser.newContext()).newPage();
  await seConnecter(page, "Portail");
  expect((await etat(page)).map).toBe("ile-de-roshi/exterieur");

  await marcherJusqua(page, "ArrowUp", "ile-de-roshi/kame-house-rdc");
  await page.waitForFunction(() => !!(window as any).__dbz?.etat().position);
  await expect(page.locator("#connexion")).toBeHidden(); // pas de retour à l'écran de connexion
  await expect(page.locator("#erreur")).toHaveText("");

  await marcherJusqua(page, "ArrowDown", "ile-de-roshi/exterieur");
  await page.waitForFunction(() => !!(window as any).__dbz?.etat().position);
  await page.waitForTimeout(1500);
  await expect(page.locator("#connexion")).toBeHidden();
  await expect(page.locator("#erreur")).toHaveText("");
  expect((await etat(page)).map).toBe("ile-de-roshi/exterieur");
});

test("commandes : l'administrateur se téléporte (touche Entrée), le joueur ordinaire est refusé", async ({ browser }) => {
  await inscrire("Admin");
  await inscrire("Simple");
  sql("UPDATE comptes SET role = 'admin' WHERE pseudo = 'Admin'");

  const admin = await (await browser.newContext()).newPage();
  await seConnecter(admin, "Admin");
  await admin.keyboard.press("Enter");
  await expect(admin.locator("#ligne-commande")).toBeVisible();
  await admin.keyboard.type("tp foret-nord");
  await admin.keyboard.press("Enter");
  await expect.poll(async () => (await etat(admin))?.map, { timeout: 15_000 }).toBe("mont-paozu/foret-nord");

  await admin.keyboard.press("Enter");
  await admin.keyboard.type("niveau 8");
  await admin.keyboard.press("Enter");
  await expect.poll(async () => (await etat(admin))?.profil?.niveau, { timeout: 5_000 }).toBe(8);

  const simple = await (await browser.newContext()).newPage();
  await seConnecter(simple, "Simple");
  await simple.keyboard.press("Enter");
  await simple.keyboard.type("tp foret-nord");
  await simple.keyboard.press("Enter");
  await simple.waitForTimeout(1500);
  expect((await etat(simple)).map).toBe("ile-de-roshi/exterieur");
});
