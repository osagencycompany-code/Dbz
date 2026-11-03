import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creerApplication, type Application } from "./app.js";
import { ouvrirBase } from "./db/connexion.js";
import { invitations } from "./db/schema.js";
import type { Config } from "./config.js";

const config: Config = { port: 0, cheminBase: ":memory:", secret: "secret-de-test", commandesAdmin: false, production: false, essaisParMinute: 1000 };
const db = ouvrirBase(":memory:");
let app: Application;
let base: string;
let jeton: string;

const appel = (chemin: string, methode = "GET", corps?: unknown, j = jeton) =>
  fetch(`${base}${chemin}`, {
    method: methode,
    headers: { "content-type": "application/json", authorization: `Bearer ${j}` },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });

beforeAll(async () => {
  app = creerApplication(db, config);
  base = `http://localhost:${await app.ecouter(0)}/api`;
  db.insert(invitations).values({ cle: "CLE", creeLe: 0 }).run();
  const r = await fetch(`${base}/inscription`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "a@exemple.fr", pseudo: "Alice", motDePasse: "motdepasse1", cle: "CLE" }),
  });
  jeton = ((await r.json()) as { jeton: string }).jeton;
});
afterAll(async () => {
  await app.arreter();
});

describe("emplacements de personnages (décision 0021)", () => {
  it("un compte neuf a cinq emplacements libres", async () => {
    const r = await appel("/personnages");
    expect(r.status).toBe(200);
    const { emplacements } = (await r.json()) as { emplacements: unknown[] };
    expect(emplacements).toEqual([null, null, null, null, null]);
  });

  it("propose les quatre héros validés avec leurs apparences", async () => {
    const { heros } = (await (await appel("/heros")).json()) as { heros: { id: string; apparences: { id: string }[] }[] };
    expect(heros.map((h) => h.id).sort()).toEqual(["gohan-ado", "goku", "trunks-futur", "vegeta"]);
    expect(heros.find((h) => h.id === "trunks-futur")!.apparences.map((a) => a.id)).toEqual(["normale", "armure-de-combat"]);
  });

  it("crée un personnage, refuse un emplacement pris, un héros inconnu ou une apparence inconnue", async () => {
    const ok = await appel("/personnages", "POST", { emplacement: 2, nom: "Prince", heros: "vegeta", apparence: "normale" });
    expect(ok.status).toBe(201);
    expect(((await ok.json()) as { heros: string; niveau: number }).heros).toBe("vegeta");
    expect((await appel("/personnages", "POST", { emplacement: 2, nom: "Autre", heros: "goku", apparence: "normale" })).status).toBe(409);
    expect((await appel("/personnages", "POST", { emplacement: 3, nom: "Inconnu", heros: "freezer", apparence: "normale" })).status).toBe(400);
    expect((await appel("/personnages", "POST", { emplacement: 3, nom: "Trunks1", heros: "trunks-futur", apparence: "rouge" })).status).toBe(400);
    expect((await appel("/personnages", "POST", { emplacement: 6, nom: "Trop", heros: "goku", apparence: "normale" })).status).toBe(400);
    expect((await appel("/personnages", "POST", { emplacement: 3, nom: "x", heros: "goku", apparence: "normale" })).status).toBe(400);
  });

  it("permet deux fois le même héros, avec une apparence choisie à la création", async () => {
    expect((await appel("/personnages", "POST", { emplacement: 3, nom: "Trunks1", heros: "trunks-futur", apparence: "armure-de-combat" })).status).toBe(201);
    expect((await appel("/personnages", "POST", { emplacement: 4, nom: "Trunks2", heros: "trunks-futur", apparence: "normale" })).status).toBe(201);
    const { emplacements } = (await (await appel("/personnages")).json()) as { emplacements: ({ nom: string; apparence: string } | null)[] };
    expect(emplacements.map((e) => e?.nom ?? null)).toEqual([null, "Prince", "Trunks1", "Trunks2", null]);
    expect(emplacements[2]!.apparence).toBe("armure-de-combat");
  });

  it("choisit le personnage à jouer et refuse celui d'un autre compte", async () => {
    const { emplacements } = (await (await appel("/personnages")).json()) as { emplacements: ({ id: number; nom: string } | null)[] };
    const prince = emplacements[1]!;
    const r = await appel(`/personnage?id=${prince.id}`);
    expect(r.status).toBe(200);
    expect(((await r.json()) as { nom: string; heros: string }).heros).toBe("vegeta");
    // sans choix : le premier emplacement occupé
    expect(((await (await appel("/personnage")).json()) as { nom: string }).nom).toBe("Prince");
    // un autre compte ne peut pas jouer ce personnage
    db.insert(invitations).values({ cle: "CLE2", creeLe: 0 }).run();
    const autre = await fetch(`${base}/inscription`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "b@exemple.fr", pseudo: "Bob", motDePasse: "motdepasse2", cle: "CLE2" }),
    });
    const jetonBob = ((await autre.json()) as { jeton: string }).jeton;
    expect((await appel(`/personnage?id=${prince.id}`, "GET", undefined, jetonBob)).status).toBe(404);
    expect((await appel(`/personnages/${prince.id}`, "DELETE", { nom: "Prince" }, jetonBob)).status).toBe(404);
  });

  it("supprime un personnage seulement si on répète son nom", async () => {
    const { emplacements } = (await (await appel("/personnages")).json()) as { emplacements: ({ id: number } | null)[] };
    const id = emplacements[3]!.id;
    expect((await appel(`/personnages/${id}`, "DELETE", { nom: "Faux" })).status).toBe(400);
    expect((await appel(`/personnages/${id}`, "DELETE", { nom: "Trunks2" })).status).toBe(204);
    const apres = (await (await appel("/personnages")).json()) as { emplacements: (unknown | null)[] };
    expect(apres.emplacements[3]).toBeNull();
  });
});

describe("migration 4 : les personnages existants deviennent Son Goku en emplacement 1", () => {
  it("convertit une base de l'ancien modèle sans perdre la progression", () => {
    // base au schéma de la migration 3, avec un personnage de niveau 7 et une palette bleue (fichier temporaire)
    const chemin = `${process.env.TEMP ?? "/tmp"}/dbz-migration-${Date.now()}.sqlite`;
    const ancien = new Database(chemin);
    ancien.exec(`
      CREATE TABLE comptes (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, pseudo TEXT NOT NULL UNIQUE, mot_de_passe TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'joueur', cree_le INTEGER NOT NULL);
      CREATE TABLE invitations (cle TEXT PRIMARY KEY, cree_le INTEGER NOT NULL, utilisee_par INTEGER REFERENCES comptes(id) ON DELETE SET NULL, utilisee_le INTEGER);
      CREATE TABLE personnages (compte_id INTEGER PRIMARY KEY REFERENCES comptes(id) ON DELETE CASCADE, niveau INTEGER NOT NULL, xp INTEGER NOT NULL, vitalite INTEGER NOT NULL, force INTEGER NOT NULL, puissance INTEGER NOT NULL, agilite INTEGER NOT NULL, energie INTEGER NOT NULL, points_libres INTEGER NOT NULL, palette TEXT NOT NULL, map TEXT NOT NULL, spawn TEXT, x REAL, y REAL, maj_le INTEGER NOT NULL);
      CREATE TABLE journal_admin (id INTEGER PRIMARY KEY AUTOINCREMENT, quand INTEGER NOT NULL, compte_id INTEGER, pseudo TEXT NOT NULL, commande TEXT NOT NULL, autorise INTEGER NOT NULL, resultat TEXT NOT NULL);
      INSERT INTO comptes (email, pseudo, mot_de_passe, cree_le) VALUES ('v@exemple.fr', 'Vieux', 'x', 1);
      INSERT INTO personnages VALUES (1, 7, 120, 9, 8, 7, 6, 5, 3, 'bleu', 'ile-de-roshi/exterieur', NULL, 100, 200, 5);
      PRAGMA user_version = 3;
    `);
    ancien.close();
    const migree = ouvrirBase(chemin);
    const ligne = migree.$client.prepare("SELECT * FROM personnages").get() as Record<string, unknown>;
    expect(ligne).toMatchObject({ compte_id: 1, emplacement: 1, nom: "Vieux", heros: "goku", apparence: "normale", niveau: 7, xp: 120, vitalite: 9, points_libres: 3, x: 100, y: 200, zenies: 0, rarete: 1 });
    expect(migree.$client.pragma("user_version", { simple: true })).toBe(4);
    migree.$client.close();
  });
});
