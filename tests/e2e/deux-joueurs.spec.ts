/**
 * Critère d'acceptation n°1 (docs/beta0-spec.md §14) : deux navigateurs se connectent avec deux comptes,
 * se voient bouger et combattent le même monstre.
 */
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { Client } from "colyseus.js";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT_SERVEUR = 2599;
const base = process.env.DBZ_E2E_DB!;

function cles(n: number): string[] {
  const sortie = execSync(`npm run -s invite:create -- ${n}`, { cwd: racine, env: { ...process.env, DB_PATH: base } }).toString();
  return sortie.split(/\r?\n/).filter(Boolean);
}

async function api(chemin: string, corps?: unknown, jeton?: string) {
  const r = await fetch(`http://localhost:${PORT_SERVEUR}/api${chemin}`, {
    method: corps ? "POST" : "GET",
    headers: { "content-type": "application/json", ...(jeton ? { authorization: `Bearer ${jeton}` } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  return (await r.json()) as Record<string, any>;
}

const etat = (page: Page) => page.evaluate(() => (window as any).__dbz.etat());

async function seConnecter(page: Page, pseudo: string) {
  page.on("console", (m) => console.log(`[${pseudo}] ${m.type()}: ${m.text()}`));
  page.on("pageerror", (e) => console.log(`[${pseudo}] ERREUR: ${e.message}`));
  page.on("requestfailed", (r) => console.log(`[${pseudo}] requête échouée: ${r.url()}`));
  await page.goto("/");
  await page.fill('input[name="pseudo"]', pseudo);
  await page.fill('input[name="motDePasse"]', "motdepasse1");
  await page.click("#valider");
  await page.waitForFunction(() => !!(window as any).__dbz?.etat().position, undefined, { timeout: 30_000 });
}

test("deux navigateurs se voient, bougent et combattent le même monstre", async ({ browser }) => {
  const [cleA, cleB] = cles(2) as [string, string];
  const a = await api("/inscription", { pseudo: "GokuA", email: "a@exemple.fr", motDePasse: "motdepasse1", cle: cleA });
  const b = await api("/inscription", { pseudo: "GokuB", email: "b@exemple.fr", motDePasse: "motdepasse1", cle: cleB });
  expect(a.jeton).toBeTruthy();
  expect(b.jeton).toBeTruthy();

  // Pose les deux personnages devant un mannequin : un client Node lit les monstres, puis la base enregistre les positions.
  await api("/personnage", undefined, b.jeton);
  const lecteur = await new Client(`ws://localhost:${PORT_SERVEUR}`).joinOrCreate((await api("/personnage", undefined, a.jeton)).salle, { jeton: a.jeton });
  const premierMannequin = () => {
    let trouve: { x: number; y: number } | undefined;
    (lecteur.state as any).monstres?.forEach((m: any) => {
      if (!trouve && m.fiche === "mannequin") trouve = { x: m.x, y: m.y };
    });
    return trouve;
  };
  await expect.poll(() => premierMannequin() !== undefined, { timeout: 10_000 }).toBe(true);
  const mannequin = premierMannequin();
  await lecteur.leave();
  await new Promise((r) => setTimeout(r, 500));
  const bd = new Database(base);
  bd.prepare("UPDATE personnages SET x = ?, y = ?, spawn = NULL").run(mannequin!.x - 6, mannequin!.y - 12);
  bd.close();

  const pageA = await (await browser.newContext()).newPage();
  const pageB = await (await browser.newContext()).newPage();
  const erreurs: string[] = [];
  for (const p of [pageA, pageB]) p.on("pageerror", (e) => erreurs.push(e.message));
  await seConnecter(pageA, "GokuA");
  await seConnecter(pageB, "GokuB");

  // ils se voient
  for (const p of [pageA, pageB]) await expect.poll(async () => (await etat(p)).joueurs.length, { timeout: 15_000 }).toBe(2);
  const vuParB = (await etat(pageB)).joueurs.map((j: any) => j.pseudo).sort();
  expect(vuParB).toEqual(["GokuA", "GokuB"]);

  // ils combattent le même monstre : coup de A (touche Z), puis de B après la recharge
  const chercher = async () => (await etat(pageA)).monstres.find((m: any) => m.fiche === "mannequin" && Math.hypot(m.x - mannequin!.x, m.y - mannequin!.y) < 1);
  await expect.poll(async () => (await chercher()) !== undefined, { timeout: 10_000 }).toBe(true);
  const cible = await chercher();
  const degatsSur = async (p: Page) => (await etat(p)).evenements.filter((e: any) => e.type === "degats" && e.cible === "monstre" && e.id === cible.id).length;
  await pageA.keyboard.press("z");
  await expect.poll(() => degatsSur(pageA), { timeout: 5_000 }).toBeGreaterThan(0);
  await expect.poll(() => degatsSur(pageB), { timeout: 5_000 }).toBeGreaterThan(0); // B voit le coup de A sur le même monstre
  const avantB = await degatsSur(pageB);
  await pageB.waitForTimeout(400);
  await pageB.keyboard.press("z");
  await expect.poll(() => degatsSur(pageA), { timeout: 5_000 }).toBeGreaterThan(avantB); // A voit le coup de B
  await mkdirSync(join(racine, "assets", "build", "e2e"), { recursive: true });
  await pageA.screenshot({ path: join(racine, "assets", "build", "e2e", "combat-A.png") });

  // ils se voient bouger : A marche, B voit sa position changer
  const posA = async (p: Page) => (await etat(p)).joueurs.find((j: any) => j.pseudo === "GokuA");
  const depart = await posA(pageB);
  let bouge = false;
  for (const touche of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) {
    await pageA.keyboard.down(touche);
    await pageA.waitForTimeout(700);
    await pageA.keyboard.up(touche);
    await pageB.waitForTimeout(200);
    const apres = await posA(pageB);
    if (Math.hypot(apres.x - depart.x, apres.y - depart.y) > 8) {
      bouge = true;
      break;
    }
  }
  expect(bouge).toBe(true);
  // la prédiction de A reste proche de la position du serveur une fois à l'arrêt
  await pageA.waitForTimeout(500);
  const ea = await etat(pageA);
  expect(Math.hypot(ea.predit.x - ea.position.x, ea.predit.y - ea.position.y)).toBeLessThan(2);
  await pageB.screenshot({ path: join(racine, "assets", "build", "e2e", "vue-B.png") });

  // la fenêtre Personnage s'ouvre avec P
  await pageA.keyboard.press("p");
  await expect(pageA.locator("#fenetre-p")).toBeVisible();
  await expect(pageA.locator("#contenu-p")).toContainText("Vitalité");

  expect(erreurs).toEqual([]);
});
