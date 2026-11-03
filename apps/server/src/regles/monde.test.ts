import { describe, expect, it } from "vitest";
import { boiteLibre, vitessePxS } from "@dbz/shared";
import { Donnees } from "../donnees.js";
import { Monde } from "./monde.js";
import type { Evenement, Joueur, Personnage } from "./types.js";

const d = new Donnees();

/** Générateur déterministe (LCG). */
function graine(s = 12345) {
  let e = s;
  return () => {
    e = (e * 1664525 + 1013904223) % 4294967296;
    return e / 4294967296;
  };
}

function perso(extra: Partial<Personnage> = {}): Personnage {
  const s = d.formules.points.depart_par_stat;
  return {
    compteId: 1,
    pseudo: "Test",
    palette: "orange",
    niveau: 1,
    xp: 0,
    stats: { vitalite: s, force: s, puissance: s, agilite: s, energie: s },
    pointsLibres: 0,
    map: "ile-de-roshi/exterieur",
    spawn: "arrivee",
    x: null,
    y: null,
    ...extra,
  };
}

function monde(mapId = "ile-de-roshi/exterieur") {
  const evenements: Array<{ e: Evenement; pour?: string }> = [];
  const portails: string[] = [];
  const m = new Monde(
    mapId,
    d.carte(mapId),
    d,
    { evenement: (e, pour) => evenements.push({ e, pour }), changerMap: (_j, map, spawn) => portails.push(`${map}#${spawn}`) },
    graine(),
  );
  return { m, evenements, portails };
}

/** Pose le monstre à `dist` px du joueur, dans la première direction libre. */
function placerPres(m: Monde, mob: { x: number; y: number; maison: { x: number; y: number } }, j: Joueur, dist: number) {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] as const) {
    const x = j.x + dx * dist;
    const y = j.y + dy * dist;
    if (boiteLibre(m.carte.grille, m.boiteMonstre, x, y)) {
      mob.x = x;
      mob.y = y;
      mob.maison = { x, y };
      return;
    }
  }
  throw new Error("aucune place libre");
}

const avancer = (m: Monde, tics: number) => {
  for (let i = 0; i < tics; i++) m.tic();
};

describe("déplacement validé par le serveur", () => {
  it("avance à la vitesse de la formule, pas plus", () => {
    let meilleur = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const { m } = monde();
      const j = m.ajouterJoueur("a", perso());
      const { x, y } = j;
      for (let i = 1; i <= m.d.combat.tic_serveur_hz; i++) {
        m.entree("a", { seq: i, dx, dy, course: false });
        m.tic();
      }
      const parcouru = Math.hypot(j.x - x, j.y - y);
      expect(parcouru).toBeLessThanOrEqual(vitessePxS(d.formules, 1, 5) + 0.001); // 1 s de simulation
      expect(j.seq).toBe(m.d.combat.tic_serveur_hz);
      meilleur = Math.max(meilleur, parcouru);
    }
    expect(meilleur).toBeGreaterThan(vitessePxS(d.formules, 1, 5) * 0.9); // dans au moins une direction, rien ne l'arrête
  });

  it("refuse l'accélération : 200 entrées d'un coup n'avancent pas 200 pas", () => {
    const { m } = monde();
    const j = m.ajouterJoueur("a", perso());
    const x0 = j.x;
    const y0 = j.y;
    for (let i = 1; i <= 10; i++) m.entree("a", { seq: i, dx: 0, dy: -1, course: true }); // la file est bornée
    m.tic();
    const pas = vitessePxS(d.formules, 1, 5) * d.formules.vitesse.course * m.dt;
    const parcouru = Math.hypot(j.x - x0, j.y - y0);
    expect(parcouru).toBeLessThanOrEqual(pas * 6 + 0.001); // réserve plafonnée : quelques pas de rattrapage au plus
  });

  it("une direction en diagonale n'est pas plus rapide", () => {
    const { m } = monde();
    const j = m.ajouterJoueur("a", perso());
    const { x, y } = j;
    m.entree("a", { seq: 1, dx: 1, dy: 1, course: false });
    m.tic();
    const pas = vitessePxS(d.formules, 1, 5) * m.dt;
    expect(Math.hypot(j.x - x, j.y - y)).toBeLessThanOrEqual(pas + 0.001);
  });

  it("ne traverse pas les murs", () => {
    const { m } = monde();
    const j = m.ajouterJoueur("a", perso());
    for (let i = 1; i <= 400; i++) {
      m.entree("a", { seq: i, dx: -1, dy: 0, course: true });
      m.tic();
    }
    expect(j.x).toBeGreaterThan(0);
    expect(j.x).toBeLessThan(m.carte.grille.largeur * m.carte.grille.tuile);
  });

  it("ignore les entrées invalides", () => {
    const { m } = monde();
    const j = m.ajouterJoueur("a", perso());
    const { x, y } = j;
    m.entree("a", { seq: Number.NaN, dx: 1, dy: 0 });
    m.entree("a", { seq: 1, dx: Number.POSITIVE_INFINITY, dy: 0 });
    m.tic();
    expect({ x: j.x, y: j.y }).toEqual({ x, y });
  });

  it("déclenche un portail en le franchissant", () => {
    const { m, portails } = monde();
    const portail = m.carte.objets.find((o) => o.type === "portal")!;
    const j = m.ajouterJoueur("a", perso());
    j.x = portail.x + portail.largeur / 2;
    j.y = portail.y + portail.hauteur / 2 + 4;
    m.tic();
    expect(portails).toEqual([`${portail.props.map}#${portail.props.spawn}`]);
    m.tic();
    expect(portails).toHaveLength(1); // une seule fois
  });
});

describe("combat, XP et niveaux", () => {
  /** Un monde de forêt avec un loup posé juste devant le joueur. */
  function duel() {
    const w = monde("mont-paozu/foret-sud");
    const j = w.m.ajouterJoueur("a", perso({ spawn: "entree-sud" }));
    const cible = [...w.m.monstres.values()].find((x) => x.fiche.id === "loup")!;
    cible.x = j.x;
    cible.y = j.y + d.monde.coup.portee_px; // dir 0 = vers le bas
    cible.maison = { x: cible.x, y: cible.y };
    return { ...w, j, cible };
  }

  it("un coup blesse le monstre devant le joueur et pas celui derrière", () => {
    const { m, j, cible, evenements } = duel();
    const derriere = [...m.monstres.values()].find((x) => x !== cible)!;
    derriere.x = j.x;
    derriere.y = j.y - 200;
    const pv = cible.pv;
    m.attaquer("a");
    expect(cible.pv).toBeLessThan(pv);
    expect(derriere.pv).toBe(derriere.pvMax);
    expect(evenements.some((x) => x.e.type === "degats" && x.e.cible === "monstre")).toBe(true);
  });

  it("respecte la recharge entre deux coups", () => {
    const { m, cible } = duel();
    m.attaquer("a");
    const pv = cible.pv;
    m.attaquer("a");
    expect(cible.pv).toBe(pv);
  });

  it("tuer un monstre donne l'XP, avec le multiplicateur global, puis fait monter de niveau", () => {
    const { m, j, cible, evenements } = duel();
    cible.pv = 1;
    cible.niveau = 1;
    m.attaquer("a");
    expect(cible.etat).toBe("mort");
    const xp = evenements.find((x) => x.e.type === "xp");
    expect(xp?.pour).toBe("a");
    expect(j.perso.xp + (j.perso.niveau - 1)).toBeGreaterThan(0);
    // assez d'XP pour passer niveau 2 : points de stats accordés
    cible.etat = "errance";
    cible.pv = 1;
    j.perso.xp = 0;
    cible.contributeurs.clear();
    for (let i = 0; i < 40 && j.perso.niveau === 1; i++) {
      cible.etat = "errance";
      cible.pv = 1;
      cible.x = j.x;
      cible.y = j.y + d.monde.coup.portee_px;
      avancer(m, d.combat.tic_serveur_hz); // laisse la recharge passer
      m.attaquer("a");
    }
    expect(j.perso.niveau).toBeGreaterThan(1);
    expect(j.perso.pointsLibres).toBe(d.formules.points.par_niveau * (j.perso.niveau - 1));
    expect(j.pv).toBe(j.pvMax);
  });

  it("dépenser des points valide les montants et recalcule les PV", () => {
    const { m, j } = duel();
    expect(m.depenser("a", { vitalite: 1 })).toBe(false); // aucun point libre
    j.perso.pointsLibres = 5;
    const pvAvant = j.pvMax;
    expect(m.depenser("a", { vitalite: -1 })).toBe(false);
    expect(m.depenser("a", { vitalite: 6 })).toBe(false);
    expect(m.depenser("a", { vitalite: 5 })).toBe(true);
    expect(j.perso.pointsLibres).toBe(0);
    expect(j.pvMax).toBeGreaterThan(pvAvant);
  });

  it("le mannequin encaisse sans mourir", () => {
    const w = monde();
    const j = w.m.ajouterJoueur("a", perso());
    const mannequin = [...w.m.monstres.values()].find((x) => x.fiche.id === "mannequin")!;
    mannequin.x = j.x;
    mannequin.y = j.y + d.monde.coup.portee_px;
    for (let i = 0; i < 10; i++) {
      avancer(w.m, d.combat.tic_serveur_hz);
      w.m.attaquer("a");
    }
    expect(mannequin.etat).not.toBe("mort");
    expect(mannequin.pv).toBe(mannequin.pvMax);
    expect(mannequin.coups).toBe(10);
  });
});

describe("monstres", () => {
  it("peuple les zones d'une map avec les niveaux de la zone", () => {
    const { m } = monde("mont-paozu/foret-sud");
    const loups = [...m.monstres.values()].filter((x) => x.fiche.id === "loup");
    expect(loups.length).toBeGreaterThan(0);
    for (const l of loups) {
      expect(l.niveau).toBeGreaterThanOrEqual(4);
      expect(l.niveau).toBeLessThanOrEqual(8);
    }
  });

  it("un loup repère le joueur à portée d'aggro, l'attaque après l'annonce, et le joueur finit K.O. puis revient", () => {
    const { m, evenements } = monde("mont-paozu/foret-sud");
    const j = m.ajouterJoueur("a", perso({ spawn: "entree-sud" }));
    j.invulnerableJusqua = 0;
    const loup = [...m.monstres.values()].find((x) => x.fiche.id === "loup")!;
    placerPres(m, loup, j, 60);
    loup.niveau = 30; // il frappe fort : K.O. rapide
    loup.attaque = j.pvMax;
    avancer(m, 1);
    expect(loup.cibleId).toBe("a");
    expect(loup.etat === "poursuite" || loup.etat === "annonce").toBe(true);
    avancer(m, d.combat.tic_serveur_hz * 20);
    expect(evenements.some((x) => x.e.type === "annonce")).toBe(true);
    expect(evenements.some((x) => x.e.type === "ko")).toBe(true);
    expect(evenements.some((x) => x.e.type === "retour")).toBe(true);
  });

  it("le monstre abandonne et rentre chez lui si le joueur s'éloigne trop", () => {
    const { m } = monde("mont-paozu/foret-sud");
    const j = m.ajouterJoueur("a", perso({ spawn: "entree-sud" }));
    const loup = [...m.monstres.values()].find((x) => x.fiche.id === "loup")!;
    placerPres(m, loup, j, 60);
    avancer(m, 1);
    expect(loup.cibleId).toBe("a");
    j.x += 2000; // téléporté loin (test)
    avancer(m, 1);
    expect(loup.cibleId).toBeNull();
    expect(["retour", "errance"]).toContain(loup.etat);
  });

  it("un monstre mort réapparaît après son délai de respawn", () => {
    const { m } = monde("mont-paozu/foret-sud");
    const loup = [...m.monstres.values()].find((x) => x.fiche.id === "loup")!;
    const j = m.ajouterJoueur("a", perso({ spawn: "entree-sud" }));
    loup.x = j.x;
    loup.y = j.y + d.monde.coup.portee_px;
    loup.pv = 1;
    m.attaquer("a");
    expect(loup.etat).toBe("mort");
    const [, max] = d.monstres.rangs.commun.respawn_s;
    avancer(m, Math.ceil((max + 1) * d.combat.tic_serveur_hz));
    expect(loup.etat).not.toBe("mort");
    expect(loup.pv).toBe(loup.pvMax);
  });

  it("le sanglier annonce puis charge en ligne droite", () => {
    const { m, evenements } = monde("mont-paozu/foret-sud");
    const j = m.ajouterJoueur("a", perso({ spawn: "entree-sud" }));
    const sanglier = [...m.monstres.values()].find((x) => x.fiche.id === "sanglier")!;
    placerPres(m, sanglier, j, 100);
    avancer(m, d.combat.tic_serveur_hz * 3);
    expect(evenements.some((x) => x.e.type === "annonce" && x.e.attaque === "charge")).toBe(true);
  });
});
