import { describe, expect, it } from "vitest";
import { Donnees } from "../donnees.js";
import { Monde } from "./monde.js";
import type { Evenement, Personnage } from "./types.js";

const d = new Donnees();
const MAP = "ile-de-roshi/exterieur";

function perso(): Personnage {
  const s = d.formules.points.depart_par_stat;
  return {
    id: 1,
    compteId: 1,
    nom: "Test",
    heros: "goku",
    apparence: "normale",
    rarete: 1,
    pseudo: "Test",
    palette: "orange",
    niveau: 1,
    xp: 0,
    stats: { vitalite: s, force: s, puissance: s, agilite: s, energie: s },
    pointsLibres: 0,
    zenies: 0,
    map: MAP,
    spawn: "arrivee",
    x: null,
    y: null,
  };
}

function monde() {
  const evenements: Evenement[] = [];
  const m = new Monde(MAP, d.carte(MAP), d, { evenement: (e) => evenements.push(e), changerMap: () => {} }, () => 0.5);
  const mannequin = [...m.monstres.values()].find((x) => x.fiche.id === "mannequin")!;
  mannequin.vitesse = 0; // immobile
  return { m, evenements, mannequin };
}

const touches = (evenements: Evenement[], id: string) => evenements.some((e) => (e.type === "degats" || e.type === "rate") && e.cible === "monstre" && e.id === id);

describe("zone du coup (décision 0020)", () => {
  const portee = d.monde.coup.portee_px;
  const demiJoueur = d.monde.boites.joueur.largeur_px / 2;
  const hauteurJoueur = d.monde.boites.joueur.hauteur_px;
  // cible posée par ses pieds ; le joueur est aux pieds (jx, jy)
  const cas: Array<[string, number, number, number, boolean]> = [
    // [nom, direction du joueur (0 bas, 1 haut, 2 gauche, 3 droite), décalage x, décalage y de la cible, touchée ?]
    ["devant (bas), proche", 0, 0, portee - 2, true],
    ["devant (bas), trop loin", 0, 0, portee + d.monde.boites.monstre.hauteur_px + 4, false],
    ["derrière (le joueur regarde en haut)", 1, 0, portee - 2, false],
    ["devant (droite), proche", 3, demiJoueur + portee - 2, -hauteurJoueur / 2, true],
    ["à gauche quand il regarde à droite", 3, -(portee + demiJoueur), -hauteurJoueur / 2, false],
    ["loin sur le côté quand il regarde en bas", 0, d.monde.coup.largeur_px, portee - 2, false],
  ];
  for (const [nom, dir, ox, oy, attendu] of cas) {
    it(nom, () => {
      const { m, evenements, mannequin } = monde();
      const j = m.ajouterJoueur("a", perso());
      mannequin.invincible = false;
      mannequin.x = j.x + ox;
      mannequin.y = j.y + oy;
      j.dir = dir as 0 | 1 | 2 | 3;
      m.attaquer("a");
      expect(touches(evenements, mannequin.id)).toBe(attendu);
    });
  }
});

describe("corps solides (décision 0020)", () => {
  it("le joueur s'arrête contre le mannequin au lieu de se tenir dessus", () => {
    const { m, mannequin } = monde();
    const j = m.ajouterJoueur("a", perso());
    j.x = mannequin.x; // terrain dégagé autour du mannequin
    j.y = mannequin.y - 30;
    for (let i = 0; i < 200; i++) {
      m.entree("a", { seq: i + 1, dx: 0, dy: 1, course: false });
      m.tic();
    }
    const haut = mannequin.y - d.monde.boites.monstre.hauteur_px;
    expect(j.y).toBeLessThanOrEqual(haut + 1e-3);
    expect(j.y).toBeGreaterThan(haut - 4);
  });

  it("les joueurs se traversent entre eux", () => {
    const { m, mannequin } = monde();
    const a = m.ajouterJoueur("a", perso());
    const b = m.ajouterJoueur("b", perso());
    a.x = mannequin.x;
    a.y = mannequin.y - 60;
    b.x = a.x;
    b.y = a.y + 8;
    const avant = a.y;
    for (let i = 0; i < 4; i++) {
      m.entree("a", { seq: i + 1, dx: 0, dy: 1, course: false });
      m.tic();
    }
    expect(a.y).toBeGreaterThan(avant + 8);
  });
});
