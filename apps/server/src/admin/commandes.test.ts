import { describe, expect, it } from "vitest";
import { ouvrirBase } from "../db/connexion.js";
import { comptes } from "../db/schema.js";
import { Donnees } from "../donnees.js";
import { Monde } from "../regles/monde.js";
import type { Personnage } from "../regles/types.js";
import { executerCommande, MESSAGE_INCONNUE, trouverMap, type ContexteCommande } from "./commandes.js";

const d = new Donnees();

function installer(role: "joueur" | "admin", commandesActives: boolean) {
  const db = ouvrirBase(":memory:");
  db.insert(comptes).values({ email: "a@b.fr", pseudo: "Souley", motDePasse: "x", role, creeLe: 0 }).run();
  const s = d.formules.points.depart_par_stat;
  const perso: Personnage = {
    compteId: 1,
    pseudo: "Souley",
    palette: "orange",
    niveau: 1,
    xp: 0,
    stats: { vitalite: s, force: s, puissance: s, agilite: s, energie: s },
    pointsLibres: 0,
    map: "ile-de-roshi/exterieur",
    spawn: "arrivee",
    x: null,
    y: null,
  };
  const monde = new Monde("ile-de-roshi/exterieur", d.carte("ile-de-roshi/exterieur"), d, { evenement: () => {}, changerMap: () => {} });
  const joueur = monde.ajouterJoueur("j", perso);
  const teleportations: string[] = [];
  const ctx: ContexteCommande = {
    db,
    d,
    commandesActives,
    compteId: 1,
    monde,
    joueur,
    teleporter: (map, dest) => teleportations.push(`${map}#${"spawn" in dest ? dest.spawn : `${dest.x},${dest.y}`}`),
  };
  const journal = () => db.$client.prepare("SELECT pseudo, commande, autorise FROM journal_admin ORDER BY id").all() as Array<{ pseudo: string; commande: string; autorise: number }>;
  return { ctx, joueur, teleportations, journal };
}

describe("commandes d'administration", () => {
  it("un joueur ordinaire est refusé, même avec ADMIN_COMMANDS=on, et rien ne change", () => {
    const { ctx, joueur, teleportations, journal } = installer("joueur", true);
    const lignes = ["/niveau 20", "/xp 100000", "/tp foret-nord", "/invincible", "/soin", "/boss nappa", "/ki"];
    for (const ligne of lignes) expect(executerCommande(ctx, ligne)).toBe(MESSAGE_INCONNUE);
    expect(joueur.perso.niveau).toBe(1);
    expect(joueur.invincible).toBe(false);
    expect(teleportations).toEqual([]);
    expect(journal()).toHaveLength(lignes.length);
    expect(journal().every((l) => l.autorise === 0)).toBe(true); // tentatives journalisées comme refusées
  });

  it("un administrateur est refusé si ADMIN_COMMANDS n'est pas activé", () => {
    const { ctx, joueur } = installer("admin", false);
    expect(executerCommande(ctx, "/niveau 20")).toBe(MESSAGE_INCONNUE);
    expect(joueur.perso.niveau).toBe(1);
  });

  it("un administrateur actif : /niveau, /xp, /soin, /invincible, journalisés", () => {
    const { ctx, joueur, journal } = installer("admin", true);
    executerCommande(ctx, "/niveau 12");
    expect(joueur.perso.niveau).toBe(12);
    expect(joueur.perso.pointsLibres).toBeGreaterThan(0);
    executerCommande(ctx, "/niveau 999");
    expect(joueur.perso.niveau).toBe(d.progression.niveau_max);
    joueur.pv = 1;
    executerCommande(ctx, "/soin");
    expect(joueur.pv).toBe(joueur.pvMax);
    expect(executerCommande(ctx, "/invincible")).toMatch(/activée/);
    expect(joueur.invincible).toBe(true);
    executerCommande(ctx, "/niveau 1");
    executerCommande(ctx, "/xp 50");
    expect(joueur.perso.xp).toBeGreaterThan(0);
    expect(journal()).toHaveLength(6);
    expect(journal()[0]).toMatchObject({ pseudo: "Souley", commande: "/niveau 12", autorise: 1 });
  });

  it("/tp et /boss envoient vers la bonne map ; les erreurs sont expliquées", () => {
    const { ctx, teleportations } = installer("admin", true);
    executerCommande(ctx, "/tp foret-sud");
    executerCommande(ctx, "/tp mont-paozu/foret-nord depuis-cratere");
    executerCommande(ctx, "/tp desert-du-diable/sud entree-nord");
    expect(teleportations[0]).toMatch(/^mont-paozu\/foret-sud#/);
    expect(teleportations[1]).toBe("mont-paozu/foret-nord#depuis-cratere");
    expect(teleportations[2]).toBe("desert-du-diable/sud#entree-nord");
    executerCommande(ctx, "/boss nappa");
    expect(teleportations[3]).toMatch(/^desert-du-diable\/sud#[\d.]+,[\d.]+$/);
    executerCommande(ctx, "/boss raditz");
    expect(teleportations[4]).toMatch(/^mont-paozu\/cratere#[\d.]+,[\d.]+$/);
    expect(executerCommande(ctx, "/tp nimporte")).toMatch(/Map inconnue/);
    expect(executerCommande(ctx, "/tp foret-sud nulle-part")).toMatch(/Point d'arrivée inconnu/);
    expect(executerCommande(ctx, "/danser")).toBe(MESSAGE_INCONNUE);
    expect(executerCommande(ctx, "bonjour")).toBe(MESSAGE_INCONNUE);
  });

  it("trouve une map par sa fin de nom", () => {
    expect(trouverMap("foret-nord")).toBe("mont-paozu/foret-nord");
    expect(trouverMap("mont-paozu-foret-sud")).toBe("mont-paozu/foret-sud");
    expect(trouverMap("sud")).toContain("desert-du-diable/sud");
  });
});
