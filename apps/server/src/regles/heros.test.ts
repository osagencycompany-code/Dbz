import { appliquerPct, contributionSuffisante, statsEffectives } from "@dbz/shared";
import { describe, expect, it } from "vitest";
import { Donnees } from "../donnees.js";
import { Monde } from "./monde.js";
import type { Joueur, Personnage } from "./types.js";

const d = new Donnees();
const MAP = "mont-paozu/foret-sud";

function perso(heros: string, extra: Partial<Personnage> = {}): Personnage {
  const s = 60; // assez de points pour que les pourcentages ne disparaissent pas dans les arrondis
  return {
    id: 1,
    compteId: 1,
    pseudo: "Test",
    nom: "Test",
    heros,
    apparence: "normale",
    rarete: 1,
    palette: "orange",
    niveau: 1,
    xp: 0,
    stats: { vitalite: s, force: s, puissance: s, agilite: s, energie: s },
    pointsLibres: 0,
    zenies: 0,
    map: MAP,
    spawn: "entree-sud",
    x: null,
    y: null,
    ...extra,
  };
}

function monde() {
  const evenements: unknown[] = [];
  const m = new Monde(MAP, d.carte(MAP), d, { evenement: (e) => evenements.push(e), changerMap: () => {} }, () => 0.5);
  return m;
}

/** Un joueur du héros donné face à un loup, à portée de coup. */
function duel(heros: string, id = "a") {
  const m = monde();
  const j = m.ajouterJoueur(id, perso(heros));
  const cible = [...m.monstres.values()].find((x) => x.fiche.id === "loup")!;
  cible.x = j.x;
  cible.y = j.y + d.monde.coup.portee_px;
  cible.maison = { x: cible.x, y: cible.y };
  return { m, j, cible };
}

const degatsDuPremierCoup = (heros: string) => {
  const { m, cible } = duel(heros);
  const pv = cible.pv;
  m.attaquer("a");
  return pv - cible.pv;
};

describe("modificateurs des héros (en % après la formule commune)", () => {
  it("fonctions pures", () => {
    expect(appliquerPct(100, 15)).toBeCloseTo(115);
    expect(appliquerPct(100, -10)).toBeCloseTo(90);
    expect(appliquerPct(100, undefined)).toBe(100);
    const s = { vitalite: 10, force: 10, puissance: 10, agilite: 10, energie: 10 };
    expect(statsEffectives(s, undefined)).toEqual(s);
    expect(statsEffectives(s, { force_pct: 15, vitalite_pct: -10 })).toEqual({ vitalite: 9, force: 11.5, puissance: 10, agilite: 10, energie: 10 });
  });

  it("références par héros : Goku neutre, Vegeta (force +15 %) frappe plus, Trunks (dégâts −10 %) frappe moins", () => {
    const goku = degatsDuPremierCoup("goku");
    const vegeta = degatsDuPremierCoup("vegeta");
    const trunks = degatsDuPremierCoup("trunks-futur");
    expect(vegeta).toBeGreaterThan(goku);
    expect(trunks).toBeLessThan(goku);
    expect(trunks).toBeGreaterThanOrEqual(Math.floor(goku * 0.85)); // −10 % de dégâts : un peu moins, jamais un double malus
  });

  it("PV : Trunks +15 % de vitalité, Vegeta −10 %", () => {
    const pv = (h: string) => monde().ajouterJoueur("a", perso(h)).pvMax;
    expect(pv("trunks-futur")).toBeGreaterThan(pv("goku"));
    expect(pv("vegeta")).toBeLessThan(pv("goku"));
  });

  it("Trunks : coups plus longs (récupération +20 %) mais plus de portée à l'épée", () => {
    for (const [heros, attendu] of [["goku", d.combat.combo.recharge_s], ["trunks-futur", d.combat.combo.recharge_s * 1.2]] as const) {
      const { m, j } = duel(heros);
      m.attaquer("a");
      expect(j.animJusqua - m.t).toBeCloseTo(attendu, 6);
    }
    // portée +15 % : une cible juste hors de la portée commune est touchée par Trunks seulement
    for (const [heros, attendu] of [["goku", false], ["trunks-futur", true]] as const) {
      const { m, j, cible } = duel(heros);
      cible.y = j.y + d.monde.coup.portee_px + 6;
      const pv = cible.pv;
      m.attaquer("a");
      expect(cible.pv < pv).toBe(attendu);
    }
  });

  it("Trunks encaisse 10 % de moins ; Vegeta frappe un boss 10 % plus fort (passif)", () => {
    const { m, j, cible } = duel("trunks-futur");
    const { m: m2, j: j2, cible: c2 } = duel("goku");
    j.invulnerableJusqua = -Infinity;
    j2.invulnerableJusqua = -Infinity;
    m.blesserJoueur(j, cible);
    m2.blesserJoueur(j2, c2);
    expect(j.pvMax - j.pv).toBeLessThan(j2.pvMax - j2.pv);

    const coupSurBoss = (heros: string) => {
      const w = duel(heros);
      w.cible.rang = "boss";
      const pv = w.cible.pv;
      w.m.attaquer("a");
      return pv - w.cible.pv;
    };
    const coupSurCommun = (heros: string) => degatsDuPremierCoup(heros);
    expect(coupSurBoss("vegeta") / coupSurCommun("vegeta")).toBeGreaterThan(coupSurBoss("goku") / coupSurCommun("goku"));
  });

  it("Esprit combatif : Goku gagne +10 % de dégâts pendant 60 s après une élite, pas après un monstre commun", () => {
    for (const [rang, actif] of [["commun", false], ["elite", true]] as const) {
      const { m, j, cible } = duel("goku");
      cible.rang = rang;
      cible.pv = 1;
      m.attaquer("a");
      expect(cible.etat).toBe("mort");
      expect(j.espritJusqua > m.t).toBe(actif);
      if (actif) expect(j.espritJusqua - m.t).toBeCloseTo(60, 5);
    }
  });
});

describe("XP sans groupe : seuil de contribution (data/balance/partage-xp.json)", () => {
  it("fonction pure", () => {
    expect(contributionSuffisante(10, 100, 10)).toBe(true);
    expect(contributionSuffisante(9, 100, 10)).toBe(false);
    expect(contributionSuffisante(5, 100, 5)).toBe(true);
    expect(contributionSuffisante(0, 0, 10)).toBe(false);
  });

  it("les valeurs viennent des données : 10 % pour un commun, 5 % pour un boss", () => {
    expect(d.partageXp.seuil_contribution_pct).toMatchObject({ commun: 10, boss: 5 });
  });

  function tueurEtPassant(rang: "commun" | "boss", partPassant: number) {
    const { m, j, cible } = duel("goku", "a");
    const b: Joueur = m.ajouterJoueur("b", perso("goku", { id: 2, compteId: 2 }));
    cible.rang = rang;
    cible.pv = 100 - partPassant; // reste à infliger ; le passant a déjà infligé `partPassant`
    cible.contributeurs.set("b", partPassant);
    cible.contributeurs.set("a", 0);
    // le coup final de A inflige au plus les PV restants
    cible.pv = Math.min(cible.pv, 1);
    cible.contributeurs.set("a", 100 - partPassant - 1);
    m.attaquer("a");
    expect(cible.etat).toBe("mort");
    const gagne = (x: Joueur) => x.perso.xp > 0 || x.perso.niveau > 1;
    return { a: gagne(j), b: gagne(b) };
  }

  it("un commun : 9 % de contribution → pas d'XP ; 10 % → XP", () => {
    expect(tueurEtPassant("commun", 9).b).toBe(false);
    expect(tueurEtPassant("commun", 10).b).toBe(true);
    expect(tueurEtPassant("commun", 9).a).toBe(true);
  });

  it("un boss : 4 % → pas d'XP ; 5 % → XP", () => {
    expect(tueurEtPassant("boss", 4).b).toBe(false);
    expect(tueurEtPassant("boss", 5).b).toBe(true);
  });
});
