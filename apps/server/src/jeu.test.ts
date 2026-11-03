import { matchMaker } from "@colyseus/core";
import { Client, type Room } from "colyseus.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creerApplication, nomSalle, type Application } from "./app.js";
import type { Config } from "./config.js";
import { ouvrirBase } from "./db/connexion.js";
import { invitations, personnages } from "./db/schema.js";
import type { SalleMap } from "./rooms/SalleMap.js";

const config: Config = { port: 0, cheminBase: ":memory:", secret: "secret-de-test", commandesAdmin: false, production: false, essaisParMinute: 1000 };
const db = ouvrirBase(":memory:");
let app: Application;
let base: string;
let port: number;

const post = (chemin: string, corps: unknown) =>
  fetch(`${base}${chemin}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corps) });

async function inscrire(pseudo: string, n: number): Promise<string> {
  db.insert(invitations).values({ cle: `CLE-${n}`, creeLe: 0 }).run();
  const r = await post("/inscription", { email: `${pseudo}@exemple.fr`, pseudo, motDePasse: "motdepasse1", cle: `CLE-${n}` });
  return ((await r.json()) as { jeton: string }).jeton;
}

const attendre = async (condition: () => boolean, ms = 8000) => {
  const fin = Date.now() + ms;
  while (!condition()) {
    if (Date.now() > fin) throw new Error("délai dépassé");
    await new Promise((r) => setTimeout(r, 20));
  }
};

const salleServeur = (room: Room) => matchMaker.getLocalRoomById(room.roomId) as unknown as SalleMap;

beforeAll(async () => {
  app = creerApplication(db, config);
  port = await app.ecouter(0);
  base = `http://localhost:${port}/api`;
});
afterAll(async () => {
  await app.arreter();
});

describe("jeu en ligne : deux joueurs sur la même map", () => {
  it("se voient, bougent, combattent le même monstre et se partagent l'XP", async () => {
    const jetonA = await inscrire("Alice", 1);
    const jetonB = await inscrire("Bob", 2);
    const client = new Client(`ws://localhost:${port}`);
    const a = await client.joinOrCreate(nomSalle("ile-de-roshi/exterieur"), { jeton: jetonA });
    const b = await client.joinOrCreate(nomSalle("ile-de-roshi/exterieur"), { jeton: jetonB });
    expect(a.roomId).toBe(b.roomId);

    // chacun voit les deux joueurs
    await attendre(() => (a.state as any).joueurs.size === 2 && (b.state as any).joueurs.size === 2);
    const vuParB = (b.state as any).joueurs.get(a.sessionId);
    expect(vuParB.pseudo).toBe("Alice");
    expect(vuParB.palette).not.toBe((b.state as any).joueurs.get(b.sessionId).palette);

    // Alice marche : Bob voit sa position changer, et le serveur acquitte les entrées
    const x0 = vuParB.x;
    const y0 = vuParB.y;
    let seq = 0;
    const minuteur = setInterval(() => a.send("entree", { seq: ++seq, dx: 0, dy: -1, course: false }), 50);
    await attendre(() => Math.hypot(vuParB.x - x0, vuParB.y - y0) > 5);
    clearInterval(minuteur);
    expect((a.state as any).joueurs.get(a.sessionId).seq).toBeGreaterThan(0);

    // les deux frappent le même mannequin (placé devant chacun côté serveur)
    const serveur = salleServeur(a);
    const mannequin = [...serveur.monde.monstres.values()].find((m) => m.fiche.id === "mannequin")!;
    const ja = serveur.monde.joueurs.get(a.sessionId)!;
    const jb = serveur.monde.joueurs.get(b.sessionId)!;
    for (const j of [ja, jb]) {
      j.x = mannequin.x;
      j.y = mannequin.y - 14;
      j.dir = 0;
    }
    a.send("attaquer");
    await attendre(() => serveur.monde.joueurs.get(a.sessionId)!.dernierCoupT > 0);
    await new Promise((r) => setTimeout(r, 300));
    b.send("attaquer");
    await attendre(() => mannequin.coups >= 2);
    expect(mannequin.coups).toBe(2);

    // un monstre tué par les deux donne l'XP aux deux
    const loup = [...serveur.monde.monstres.values()].find((m) => m.fiche.id === "mannequin")!;
    loup.invincible = false;
    loup.pv = 1;
    loup.contributeurs.add(a.sessionId);
    await new Promise((r) => setTimeout(r, 300));
    b.send("attaquer");
    await attendre(() => loup.etat === "mort");
    await attendre(() => jb.perso.xp > 0 || jb.perso.niveau > 1);
    expect(loup.contributeurs.size).toBe(0);
    expect(ja.perso.xp > 0 || ja.perso.niveau > 1).toBe(true);

    await a.leave();
    await b.leave();
  });

  it("enregistre la position à la déconnexion et la restaure à la reconnexion", async () => {
    const jeton = await inscrire("Carole", 3);
    const client = new Client(`ws://localhost:${port}`);
    const room = await client.joinOrCreate(nomSalle("ile-de-roshi/exterieur"), { jeton });
    const serveur = salleServeur(room);
    const j = serveur.monde.joueurs.get(room.sessionId)!;
    const attendu = { x: j.x + 3, y: j.y };
    j.x = attendu.x;
    j.y = attendu.y;
    await room.leave();
    await attendre(() => (db.select().from(personnages).all().find((p) => p.x === attendu.x) ? true : false));
    const room2 = await client.joinOrCreate(nomSalle("ile-de-roshi/exterieur"), { jeton });
    const j2 = salleServeur(room2).monde.joueurs.get(room2.sessionId)!;
    expect({ x: j2.x, y: j2.y }).toEqual(attendu);
    await room2.leave();
  });

  it("refuse de rejoindre une autre map que celle du personnage (pas de téléportation)", async () => {
    const jeton = await inscrire("Denis", 4);
    const client = new Client(`ws://localhost:${port}`);
    await expect(client.joinOrCreate(nomSalle("desert-du-diable/sud"), { jeton })).rejects.toThrow();
  });

  it("un portail change la map du personnage côté serveur et prévient le client", async () => {
    const jeton = await inscrire("Elise", 5);
    const client = new Client(`ws://localhost:${port}`);
    const room = await client.joinOrCreate(nomSalle("ile-de-roshi/exterieur"), { jeton });
    let message: { salle: string; map: string } | undefined;
    room.onMessage("changer_map", (m) => (message = m));
    const serveur = salleServeur(room);
    const portail = serveur.monde.carte.objets.find((o) => o.type === "portal")!;
    const j = serveur.monde.joueurs.get(room.sessionId)!;
    j.x = portail.x + portail.largeur / 2;
    j.y = portail.y + portail.hauteur / 2 + 4;
    await attendre(() => message !== undefined);
    expect(message!.map).toBe("ile-de-roshi/kame-house-rdc");
    await room.leave();
    const suivante = await client.joinOrCreate(message!.salle, { jeton });
    const js = salleServeur(suivante).monde.joueurs.get(suivante.sessionId)!;
    const arrivee = salleServeur(suivante).monde.carte.objets.find((o) => o.nom === "entree")!;
    expect({ x: js.x, y: js.y }).toEqual({ x: arrivee.x, y: arrivee.y });
    await suivante.leave();
  });

  it("passer un portail aller-retour ne déconnecte pas (même si on rejoint la salle suivante avant de quitter l'ancienne)", async () => {
    const jeton = await inscrire("Fanny", 6);
    const client = new Client(`ws://localhost:${port}`);
    const fermetures: number[] = [];
    let salleActuelle: Room = await client.joinOrCreate(nomSalle("ile-de-roshi/exterieur"), { jeton });
    salleActuelle.onLeave((code) => fermetures.push(code));

    const traverser = async (portailNom: string, mapAttendue: string) => {
      const ancienne = salleActuelle;
      let message: { salle: string; map: string } | undefined;
      ancienne.onMessage("changer_map", (m) => (message = m));
      const serveur = salleServeur(ancienne);
      const portail = serveur.monde.carte.objets.find((o) => o.type === "portal" && o.nom === portailNom)!;
      const j = serveur.monde.joueurs.get(ancienne.sessionId)!;
      j.x = portail.x + portail.largeur / 2;
      j.y = portail.y + portail.hauteur / 2 + 4;
      await attendre(() => message !== undefined);
      expect(message!.map).toBe(mapAttendue);
      // pire cas : la nouvelle salle est rejointe AVANT que l'ancienne soit quittée
      const suivante = await client.joinOrCreate(message!.salle, { jeton });
      suivante.onLeave((code) => fermetures.push(code));
      await new Promise((r) => setTimeout(r, 300));
      // le serveur a peut-être déjà fermé l'ancienne salle : on ne l'attend pas indéfiniment
      await Promise.race([ancienne.leave(), new Promise((r) => setTimeout(r, 500))]);
      salleActuelle = suivante;
    };

    await traverser("porte-kame-house", "ile-de-roshi/kame-house-rdc");
    await traverser("sortie", "ile-de-roshi/exterieur");
    await new Promise((r) => setTimeout(r, 500));
    expect(fermetures).not.toContain(4000);
    expect((salleActuelle.state as any).map).toBe("ile-de-roshi/exterieur");
    expect(salleServeur(salleActuelle).monde.joueurs.has(salleActuelle.sessionId)).toBe(true);
    await salleActuelle.leave();
  });

  it("une vraie seconde connexion du même compte éjecte la première (code 4000)", async () => {
    const jeton = await inscrire("Gaston", 7);
    const client = new Client(`ws://localhost:${port}`);
    const premiere = await client.joinOrCreate(nomSalle("ile-de-roshi/exterieur"), { jeton });
    let code: number | undefined;
    premiere.onLeave((c) => (code = c));
    const seconde = await client.joinOrCreate(nomSalle("ile-de-roshi/exterieur"), { jeton });
    await attendre(() => code !== undefined);
    expect(code).toBe(4000);
    await seconde.leave();
  });

  it("une commande d'un joueur ordinaire reçoit « Commande inconnue. » et ne change rien", async () => {
    const jeton = await inscrire("Hector", 8);
    const client = new Client(`ws://localhost:${port}`);
    const room = await client.joinOrCreate(nomSalle("ile-de-roshi/exterieur"), { jeton });
    let reponse = "";
    room.onMessage("message", (m: { texte: string }) => (reponse = m.texte));
    room.send("commande", "/niveau 20");
    await attendre(() => reponse !== "");
    expect(reponse).toBe("Commande inconnue.");
    expect(salleServeur(room).monde.joueurs.get(room.sessionId)!.perso.niveau).toBe(1);
    await room.leave();
  });
});
