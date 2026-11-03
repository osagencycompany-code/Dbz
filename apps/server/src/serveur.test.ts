import { Client } from "colyseus.js";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creerApplication, mapsDesZones, nomSalle, type Application } from "./app.js";
import { routesAuth } from "./auth/routes.js";
import { creerJeton, verifierJeton } from "./auth/jeton.js";
import { ouvrirBase } from "./db/connexion.js";
import { invitations } from "./db/schema.js";
import type { Config } from "./config.js";

const config: Config = { port: 0, cheminBase: ":memory:", secret: "secret-de-test", commandesAdmin: false, production: false, essaisParMinute: 1000 };
const db = ouvrirBase(":memory:");
let app: Application;
let base: string;
let port: number;

const post = (chemin: string, corps: unknown, methode = "POST", entetes: Record<string, string> = {}) =>
  fetch(`${base}${chemin}`, {
    method: methode,
    headers: { "content-type": "application/json", ...entetes },
    body: JSON.stringify(corps),
  });
const cle = (c: string) => db.insert(invitations).values({ cle: c, creeLe: 0 }).run();
const compteValide = { email: "a@exemple.fr", pseudo: "Alice", motDePasse: "motdepasse1" };

beforeAll(async () => {
  app = creerApplication(db, config);
  port = await app.ecouter(0);
  base = `http://localhost:${port}/api`;
});
afterAll(async () => {
  await app.arreter();
});

describe("jeton", () => {
  it("accepte un jeton valide, refuse un jeton altéré ou expiré", () => {
    const j = creerJeton(7, "s", 1000);
    expect(verifierJeton(j, "s", 2000)).toBe(7);
    expect(verifierJeton(j, "autre", 2000)).toBeNull();
    expect(verifierJeton(`${j}x`, "s", 2000)).toBeNull();
    expect(verifierJeton(j, "s", 1000 + 8 * 24 * 3600 * 1000)).toBeNull();
    expect(verifierJeton(undefined, "s")).toBeNull();
  });
});

describe("comptes", () => {
  it("refuse l'inscription sans clé valide", async () => {
    const r = await post("/inscription", { ...compteValide, cle: "FAUSSE" });
    expect(r.status).toBe(403);
  });

  it("inscrit avec une clé, qui n'est utilisable qu'une fois", async () => {
    cle("CLE1");
    const r = await post("/inscription", { ...compteValide, cle: "CLE1" });
    expect(r.status).toBe(201);
    const autre = await post("/inscription", { email: "b@exemple.fr", pseudo: "Bob", motDePasse: "motdepasse2", cle: "CLE1" });
    expect(autre.status).toBe(403);
  });

  it("ne consomme pas la clé si le pseudo est déjà pris", async () => {
    cle("CLE2");
    const r = await post("/inscription", { ...compteValide, email: "c@exemple.fr", cle: "CLE2" });
    expect(r.status).toBe(409);
    const ok = await post("/inscription", { email: "c@exemple.fr", pseudo: "Carole", motDePasse: "motdepasse3", cle: "CLE2" });
    expect(ok.status).toBe(201);
  });

  it("valide les saisies", async () => {
    cle("CLE3");
    expect((await post("/inscription", { ...compteValide, pseudo: "x", cle: "CLE3" })).status).toBe(400);
    expect((await post("/inscription", { ...compteValide, motDePasse: "court", cle: "CLE3" })).status).toBe(400);
  });

  it("connecte avec le bon mot de passe seulement", async () => {
    expect((await post("/connexion", { pseudo: "Alice", motDePasse: "faux" })).status).toBe(401);
    expect((await post("/connexion", { pseudo: "Inconnu", motDePasse: "motdepasse1" })).status).toBe(401);
    const r = await post("/connexion", { pseudo: "Alice", motDePasse: "motdepasse1" });
    expect(r.status).toBe(200);
    const { jeton } = (await r.json()) as { jeton: string };
    const moi = await fetch(`${base}/moi`, { headers: { authorization: `Bearer ${jeton}` } });
    expect(((await moi.json()) as { pseudo: string }).pseudo).toBe("Alice");
  });

  it("ne stocke pas le mot de passe en clair", () => {
    const ligne = db.$client.prepare("select mot_de_passe m from comptes where pseudo = 'Alice'").get() as { m: string };
    expect(ligne.m).toMatch(/^\$argon2id\$/);
  });

  it("supprime le compte sur demande, avec le mot de passe", async () => {
    cle("CLE4");
    const ins = await post("/inscription", { email: "d@exemple.fr", pseudo: "Denis", motDePasse: "motdepasse4", cle: "CLE4" });
    const { jeton } = (await ins.json()) as { jeton: string };
    const entetes = { authorization: `Bearer ${jeton}` };
    expect((await post("/compte", { motDePasse: "faux" }, "DELETE", entetes)).status).toBe(403);
    expect((await post("/compte", { motDePasse: "motdepasse4" }, "DELETE", entetes)).status).toBe(204);
    expect((await post("/connexion", { pseudo: "Denis", motDePasse: "motdepasse4" })).status).toBe(401);
  });
});

describe("limiteur", () => {
  it("répond 429 après trop de tentatives", async () => {
    const appTest = express().use("/api", routesAuth(ouvrirBase(":memory:"), "s", 2));
    const http = appTest.listen(0);
    const p = (http.address() as { port: number }).port;
    const essai = () =>
      fetch(`http://localhost:${p}/api/connexion`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pseudo: "x", motDePasse: "y" }),
      });
    expect((await essai()).status).toBe(401);
    expect((await essai()).status).toBe(401);
    expect((await essai()).status).toBe(429);
    http.close();
  });
});

describe("salle de map", () => {
  it("ouvre une salle par map des zones (12 maps)", () => {
    expect(mapsDesZones()).toHaveLength(12);
  });

  it("refuse un joueur sans jeton, accepte un joueur connecté", async () => {
    const client = new Client(`ws://localhost:${port}`);
    await expect(client.joinOrCreate(nomSalle("ile-de-roshi/exterieur"), {})).rejects.toThrow();
    const r = await post("/connexion", { pseudo: "Alice", motDePasse: "motdepasse1" });
    const { jeton } = (await r.json()) as { jeton: string };
    const salle = await client.joinOrCreate(nomSalle("ile-de-roshi/exterieur"), { jeton });
    expect(salle.sessionId).toBeTruthy();
    await salle.leave();
  });
});
