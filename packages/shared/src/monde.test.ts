import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { boiteDansObjet, boiteLibre, deplacer, lireCarte, type Grille } from "./carte.js";
import { coupToucheCible, degatsCoup, degatsMonstre, directionDepuisVecteur, numeroCombo, pointImpact } from "./combat.js";
import { degatsMelee, bonusNiveau } from "./formulas.js";
import { attaqueMonstre, pvMonstre } from "./monstres.js";
import { balanceCombat, balanceFormules, balanceMonde, balanceMonstres } from "./schemas/balance.js";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const lire = (f: string) => JSON.parse(readFileSync(join(racine, f), "utf8"));
const f = balanceFormules.parse(lire("data/balance/formules.json"));
const monde = balanceMonde.parse(lire("data/balance/monde.json"));
const monstres = balanceMonstres.parse(lire("data/balance/monstres.json"));
const combat = balanceCombat.parse(lire("data/balance/combat.json"));

/** Grille 5 × 5 de cases de 16 px, mur plein sur les bords et un bloc en (3, 2). */
function grille(): Grille {
  const bloque = new Uint8Array(25);
  for (let i = 0; i < 5; i++) {
    bloque[i] = 1;
    bloque[20 + i] = 1;
    bloque[i * 5] = 1;
    bloque[i * 5 + 4] = 1;
  }
  bloque[2 * 5 + 3] = 1;
  return { largeur: 5, hauteur: 5, tuile: 16, bloque };
}

describe("collisions", () => {
  const g = grille();
  const b = monde.boites.joueur;
  it("laisse passer en terrain libre", () => {
    expect(boiteLibre(g, { largeur: b.largeur_px, hauteur: b.hauteur_px }, 40, 40)).toBe(true);
  });
  it("bloque dans un mur et hors de la map", () => {
    expect(boiteLibre(g, { largeur: b.largeur_px, hauteur: b.hauteur_px }, 8, 40)).toBe(false);
    expect(boiteLibre(g, { largeur: b.largeur_px, hauteur: b.hauteur_px }, -5, 40)).toBe(false);
  });
  it("s'arrête contre le mur sans le traverser, même avec un grand pas", () => {
    const boite = { largeur: b.largeur_px, hauteur: b.hauteur_px };
    const r = deplacer(g, boite, 40, 40, 200, 0);
    expect(boiteLibre(g, boite, r.x, r.y)).toBe(true);
    expect(r.x).toBeGreaterThan(40);
    expect(r.x).toBeLessThanOrEqual(48 - boite.largeur / 2 + 0.01); // le bloc (3, 2) commence à x = 48
  });
  it("glisse le long d'un mur", () => {
    const boite = { largeur: b.largeur_px, hauteur: b.hauteur_px };
    const r = deplacer(g, boite, 40, 40, 20, 5);
    expect(r.y).toBeCloseTo(45, 5);
  });
  it("détecte le recouvrement d'un portail", () => {
    const portail = { id: 1, nom: "p", type: "portal", x: 20, y: 20, largeur: 20, hauteur: 10, props: {} };
    const boite = { largeur: b.largeur_px, hauteur: b.hauteur_px };
    expect(boiteDansObjet(portail, boite, 30, 28)).toBe(true);
    expect(boiteDansObjet(portail, boite, 80, 28)).toBe(false);
  });
});

describe("lecture des maps du jeu", () => {
  it("lit une vraie map Tiled", () => {
    const c = lireCarte(lire("maps/ile-de-roshi/exterieur.tmj"));
    expect(c.grille.largeur * c.grille.hauteur).toBe(c.grille.bloque.length);
    expect(c.objets.some((o) => o.type === "spawn" && o.nom === "arrivee")).toBe(true);
  });
  it("les points d'arrivée de toutes les maps sont libres pour la boîte du joueur", () => {
    const boite = { largeur: monde.boites.joueur.largeur_px, hauteur: monde.boites.joueur.hauteur_px };
    for (const m of ["ile-de-roshi/exterieur", "mont-paozu/foret-sud", "desert-du-diable/sud", "west-city/ville"]) {
      const c = lireCarte(lire(`maps/${m}.tmj`));
      for (const o of c.objets.filter((o) => o.type === "spawn")) expect(boiteLibre(c.grille, boite, o.x, o.y), `${m}/${o.nom}`).toBe(true);
    }
  });
});

describe("coups", () => {
  it("le point d'impact est devant le joueur, à la portée réglée", () => {
    expect(pointImpact(monde, 100, 100, 3)).toEqual({ x: 100 + monde.coup.portee_px, y: 100 });
    expect(pointImpact(monde, 100, 100, 1)).toEqual({ x: 100, y: 100 - monde.coup.portee_px });
  });
  it("touche dans le rayon, pas au-delà", () => {
    expect(coupToucheCible(monde, 100, 100, 100 + monde.coup.rayon_px, 100)).toBe(true);
    expect(coupToucheCible(monde, 100, 100, 100 + monde.coup.rayon_px + 1, 100)).toBe(false);
  });
  it("la direction suit l'axe dominant et garde l'ancienne à l'arrêt", () => {
    expect(directionDepuisVecteur(1, 0.2, 0)).toBe(3);
    expect(directionDepuisVecteur(-0.1, -1, 0)).toBe(1);
    expect(directionDepuisVecteur(0, 0, 2)).toBe(2);
  });
  it("le combo enchaîne dans la fenêtre puis repart de 1", () => {
    expect(numeroCombo(combat, 0, 0)).toBe(1);
    expect(numeroCombo(combat, 1, combat.combo.fenetre_s / 2)).toBe(2);
    expect(numeroCombo(combat, 2, combat.combo.fenetre_s / 2)).toBe(3);
    expect(numeroCombo(combat, 3, combat.combo.fenetre_s / 2)).toBe(1);
    expect(numeroCombo(combat, 2, combat.combo.fenetre_s + 0.01)).toBe(1);
  });
  it("le dernier coup du combo fait plus de dégâts, le critique multiplie", () => {
    const joueur = { niveau: 10, force: 20 };
    const sansCrit = { alea: 0.5, critique: 0.99 };
    const premier = degatsCoup(f, combat, joueur, 1, sansCrit);
    const dernier = degatsCoup(f, combat, joueur, combat.combo.coups, sansCrit);
    expect(premier.degats).toBe(Math.round(degatsMelee(f, 10, 20)));
    expect(dernier.degats).toBeCloseTo(premier.degats * combat.combo.multiplicateur_dernier, -0.5);
    const crit = degatsCoup(f, combat, joueur, 1, { alea: 0.5, critique: 0 });
    expect(crit.critique).toBe(true);
    expect(crit.degats).toBe(Math.round(degatsMelee(f, 10, 20) * f.critique.multiplicateur));
  });
  it("l'aléa reste entre 0,9 et 1,1", () => {
    const base = degatsMelee(f, 5, 10);
    const bas = degatsCoup(f, combat, { niveau: 5, force: 10 }, 1, { alea: 0, critique: 0.99 }).degats;
    const haut = degatsCoup(f, combat, { niveau: 5, force: 10 }, 1, { alea: 0.9999, critique: 0.99 }).degats;
    expect(bas).toBe(Math.round(base * f.alea_degats.min));
    expect(haut).toBe(Math.round(base * f.alea_degats.max));
  });
  it("une attaque de monstre fait au moins 1", () => {
    expect(degatsMonstre(f, 0, 0.5)).toBe(1);
    expect(degatsMonstre(f, 100, 0.5)).toBe(100);
  });
});

describe("gabarit des monstres (spec §6)", () => {
  it("PV commun niveau 5 = 6 × (12 × B × 1,552)", () => {
    expect(pvMonstre(f, monstres, "commun", 5)).toBe(Math.round(6 * 12 * bonusNiveau(f, 5) * 1.552));
  });
  it("attaque commune niveau 5 = 6 % de (120 × B × 1,552)", () => {
    expect(attaqueMonstre(f, monstres, "commun", 5)).toBeCloseTo(0.06 * 120 * bonusNiveau(f, 5) * 1.552, 6);
  });
  it("élite et boss : coefficients ×25 et ×60", () => {
    const base = 12 * bonusNiveau(f, 12) * 1.552;
    expect(pvMonstre(f, monstres, "elite", 12)).toBe(Math.round(25 * base));
    expect(pvMonstre(f, monstres, "boss", 12)).toBe(Math.round(60 * base));
  });
});
