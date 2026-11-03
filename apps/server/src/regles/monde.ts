/**
 * Simulation d'une map (autoritaire) : joueurs, monstres, combat, XP, K.O.
 * Aucune dépendance à Colyseus : la salle ne fait que relayer l'état et les messages.
 * Aucune valeur d'équilibrage ici : tout vient de `Donnees` (data/balance).
 */
import {
  boiteDansObjet,
  boiteLibre,
  coupRate,
  centreZone,
  corpsSolides,
  coupToucheCible,
  deplacer,
  degatsCoup,
  degatsMonstre,
  directionDepuisVecteur,
  esquivePct,
  gagnerXp,
  attaqueMonstre,
  rectBoite,
  zoneCoup,
  numeroCombo,
  pvApresKo,
  pvMax,
  pvMonstre,
  vitessePxS,
  vitesseAvecModes,
  xpApresKo,
  xpGagneeSurMonstre,
  type Carte,
  type ObjetCarte,
  type Rect,
  type Stats,
  appliquerPct,
  contributionSuffisante,
  statsEffectives,
} from "@dbz/shared";
import type { Donnees } from "../donnees.js";
import { penserMonstre } from "../ia/monstres.js";
import type { Entree, Evenement, Joueur, Monstre, Personnage, Zone } from "./types.js";

const POURCENT = 100;
const STATS: Array<keyof Stats> = ["vitalite", "force", "puissance", "agilite", "energie"];
const TENTATIVES_PLACEMENT = 40; // ok-nombre
const TAILLE_MAX_FILE = 10; // ok-nombre

export type Aleatoire = () => number;

export interface Rappels {
  evenement(e: Evenement, pour?: string): void;
  /** Le joueur a franchi un portail : la salle doit le déplacer vers une autre map. */
  changerMap(joueur: Joueur, map: string, spawn: string): void;
}

/** « 4-8 » → [4, 8] ; « 12 » → [12, 12]. */
export function lireNiveaux(valeur: unknown, repli: [number, number]): [number, number] {
  const t = String(valeur ?? "").trim();
  const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(t);
  if (!m) return repli;
  return [Number(m[1]), Number(m[2] ?? m[1])];
}

export class Monde {
  readonly joueurs = new Map<string, Joueur>();
  readonly monstres = new Map<string, Monstre>();
  /** Temps de simulation, en secondes. */
  t = 0;
  private compteurMonstres = 0;

  constructor(
    readonly mapId: string,
    readonly carte: Carte,
    readonly d: Donnees,
    readonly rappels: Rappels,
    readonly alea: Aleatoire = Math.random,
  ) {
    this.peupler();
    this.pnj = carte.objets.filter((o) => o.type === "npc").map((o) => rectBoite(this.boiteMonstre, o.x, o.y));
  }

  /** Corps fixes des PNJ (solides pour les joueurs). */
  private readonly pnj: Rect[];

  /** Tout ce qui arrête un joueur en dehors des murs : PNJ, monstres vivants et mannequin. Les joueurs se traversent. */
  private corpsSolidesPour(j: Joueur) {
    const corps = [...this.pnj];
    for (const m of this.monstres.values()) if (m.etat !== "mort") corps.push(rectBoite(this.boiteMonstre, m.x, m.y));
    return corpsSolides(this.boiteJoueur, { x: j.x, y: j.y }, corps);
  }

  get dt(): number {
    return 1 / this.d.combat.tic_serveur_hz;
  }

  get boiteJoueur() {
    return { largeur: this.d.monde.boites.joueur.largeur_px, hauteur: this.d.monde.boites.joueur.hauteur_px };
  }

  get boiteMonstre() {
    return { largeur: this.d.monde.boites.monstre.largeur_px, hauteur: this.d.monde.boites.monstre.hauteur_px };
  }

  // ------------------------------------------------------------------------------------ monstres

  private peupler() {
    for (const o of this.carte.objets.filter((o) => o.type === "mobzone")) {
      const fiche = this.d.mobs.get(String(o.props.mob));
      if (!fiche) continue;
      const nombre = Number(o.props.count ?? 1);
      const [lo, hi] = lireNiveaux(o.props.level, fiche.niveau as [number, number]);
      for (let i = 0; i < nombre; i++) {
        const niveau = lo + Math.floor(this.alea() * (hi - lo + 1));
        this.creerMonstre(fiche.id, niveau, { x: o.x, y: o.y, largeur: o.largeur, hauteur: o.hauteur });
      }
    }
  }

  private positionLibreDansZone(z: Zone): { x: number; y: number } {
    for (let i = 0; i < TENTATIVES_PLACEMENT; i++) {
      const x = z.x + this.alea() * z.largeur;
      const y = z.y + this.alea() * z.hauteur;
      if (boiteLibre(this.carte.grille, this.boiteMonstre, x, y)) return { x, y };
    }
    return { x: z.x + z.largeur / 2, y: z.y + z.hauteur / 2 };
  }

  private creerMonstre(ficheId: string, niveau: number, zone: Zone): Monstre {
    const fiche = this.d.mobs.get(ficheId)!;
    const rang = fiche.rang;
    const p = this.positionLibreDansZone(zone);
    const pvM = pvMonstre(this.d.formules, this.d.monstres, rang, niveau);
    const comportement = fiche.comportement as Record<string, unknown>;
    const m: Monstre = {
      id: `m${++this.compteurMonstres}`,
      fiche,
      rang,
      niveau,
      x: p.x,
      y: p.y,
      dir: 0,
      pv: pvM,
      pvMax: pvM,
      attaque: attaqueMonstre(this.d.formules, this.d.monstres, rang, niveau),
      vitesse: Number(comportement.vitesse_px_s ?? 0),
      etat: "errance",
      etatJusqua: 0,
      attaqueAnnoncee: "",
      cibleId: null,
      maison: p,
      zone,
      destination: null,
      pauseJusqua: 0,
      prochaineAttaque: 0,
      prochaineCapacite: 0,
      vecteur: { x: 0, y: 0 },
      aFrappe: false,
      contributeurs: new Map(),
      respawnA: 0,
      invincible: comportement.invincible === true,
      coups: 0,
    };
    this.monstres.set(m.id, m);
    return m;
  }

  /** Remet un monstre mort en jeu à une nouvelle place de sa zone. */
  private ressusciter(m: Monstre) {
    const p = this.positionLibreDansZone(m.zone);
    m.x = p.x;
    m.y = p.y;
    m.maison = p;
    m.pv = m.pvMax;
    m.etat = "errance";
    m.cibleId = null;
    m.destination = null;
    m.contributeurs.clear();
    m.prochaineAttaque = this.t;
  }

  // ------------------------------------------------------------------------------------ joueurs

  private positionDeRetour(): { x: number; y: number } {
    const libre = (x: number, y: number) => boiteLibre(this.carte.grille, this.boiteJoueur, x, y);
    const soin = this.carte.objets.find((o) => o.type === "heal");
    if (soin) {
      const x = soin.x + soin.largeur / 2;
      const y = soin.y + soin.hauteur / 2;
      if (libre(x, y)) return { x, y };
    }
    const arrivee = this.carte.objets.find((o) => o.type === "spawn" && o.nom === "arrivee") ?? this.carte.objets.find((o) => o.type === "spawn");
    return arrivee ? { x: arrivee.x, y: arrivee.y } : { x: 0, y: 0 };
  }

  ajouterJoueur(id: string, perso: Personnage): Joueur {
    const pvM = Math.round(pvMax(this.d.formules, perso.niveau, statsEffectives(perso.stats, this.d.heros.get(perso.heros)?.modificateurs).vitalite));
    let pos: { x: number; y: number } | undefined;
    if (perso.spawn) {
      const s: ObjetCarte | undefined = this.carte.objets.find((o) => o.type === "spawn" && o.nom === perso.spawn);
      if (s) pos = { x: s.x, y: s.y };
    } else if (perso.x !== null && perso.y !== null && boiteLibre(this.carte.grille, this.boiteJoueur, perso.x, perso.y)) {
      pos = { x: perso.x, y: perso.y };
    }
    pos ??= this.positionDeRetour();
    const j: Joueur = {
      id,
      perso,
      x: pos.x,
      y: pos.y,
      dir: 0,
      pv: pvM,
      pvMax: pvM,
      ko: false,
      koRetourA: 0,
      invulnerableJusqua: this.t + this.d.monde.joueur.invulnerabilite_retour_s,
      derniereBlessureT: -Infinity,
      dernierCoupT: -Infinity,
      espritJusqua: -Infinity,
      combo: 0,
      anim: "",
      animJusqua: 0,
      seq: 0,
      file: [],
      budget: this.dt + this.d.monde.anti_triche.reserve_max_s,
      enTransit: false,
      sale: false,
      invincible: false,
    };
    perso.spawn = null;
    this.joueurs.set(id, j);
    return j;
  }

  retirerJoueur(id: string) {
    this.joueurs.delete(id);
    for (const m of this.monstres.values()) {
      m.contributeurs.delete(id);
      if (m.cibleId === id) m.cibleId = null;
    }
  }

  /** Reçoit une intention de déplacement ; les valeurs invalides sont ignorées. */
  entree(id: string, e: Partial<Entree>) {
    const j = this.joueurs.get(id);
    if (!j || j.ko || !Number.isFinite(e.seq) || !Number.isFinite(e.dx) || !Number.isFinite(e.dy)) return;
    if (j.file.length >= TAILLE_MAX_FILE) return;
    j.file.push({
      seq: Number(e.seq),
      dx: Math.sign(Number(e.dx)),
      dy: Math.sign(Number(e.dy)),
      course: e.course === true,
    });
  }

  vitesseJoueur(j: Joueur, course: boolean): number {
    const base = vitessePxS(this.d.formules, j.perso.niveau, this.statsEff(j).agilite);
    return vitesseAvecModes(this.d.formules, base, { course });
  }

  /** Dépense des points de stats (validation explicite dans la fenêtre P). */
  depenser(id: string, repartition: Partial<Record<keyof Stats, unknown>>): boolean {
    const j = this.joueurs.get(id);
    if (!j) return false;
    const ajouts: Partial<Record<keyof Stats, number>> = {};
    let total = 0;
    for (const s of STATS) {
      const v = Number(repartition[s] ?? 0);
      if (!Number.isInteger(v) || v < 0) return false;
      ajouts[s] = v;
      total += v;
    }
    if (total === 0 || total > j.perso.pointsLibres) return false;
    for (const s of STATS) j.perso.stats[s] += ajouts[s] ?? 0;
    j.perso.pointsLibres -= total;
    this.recalculer(j, false);
    j.sale = true;
    return true;
  }

  /** Fiche du héros du joueur (relue à chaque usage : les modificateurs se rechargent à chaud). */
  private fiche(j: Joueur) {
    return this.d.heros.get(j.perso.heros);
  }

  /** Statistiques utilisées par les formules : points répartis × modificateurs du héros. */
  statsEff(j: Joueur) {
    return statsEffectives(j.perso.stats, this.fiche(j)?.modificateurs);
  }

  /** Bonus de dégâts en % : modificateur du héros + passifs actifs (contre un boss, après une victoire). */
  private degatsPct(j: Joueur, m: Monstre): number {
    const fiche = this.fiche(j);
    let pct = fiche?.modificateurs?.degats_pct ?? 0;
    const passif = fiche?.passif;
    if (passif?.declencheur === "contre-boss" && m.rang === "boss") pct += passif.effets.degats_pct ?? 0;
    if (passif?.declencheur === "apres-victoire-boss-ou-elite" && this.t < j.espritJusqua) pct += passif.effets.degats_pct ?? 0;
    return pct;
  }

  private recalculer(j: Joueur, soignerTout: boolean) {
    const ancien = j.pvMax;
    j.pvMax = Math.round(pvMax(this.d.formules, j.perso.niveau, this.statsEff(j).vitalite));
    j.pv = soignerTout ? j.pvMax : Math.min(j.pvMax, j.pv + Math.max(0, j.pvMax - ancien));
  }

  /** Coup de poing du joueur : combo et zone de touche devant lui. */
  attaquer(id: string) {
    const j = this.joueurs.get(id);
    const c = this.d.combat;
    const fiche = j ? this.fiche(j) : undefined;
    // « duree_coups_pct » : des coups plus longs allongent la récupération entre deux coups
    const recharge = appliquerPct(c.combo.recharge_s, fiche?.modificateurs?.duree_coups_pct);
    if (!j || j.ko || this.t - j.dernierCoupT < recharge) return;
    j.combo = numeroCombo(c, j.combo, this.t - j.dernierCoupT);
    j.dernierCoupT = this.t;
    j.anim = `coup${j.combo}`;
    j.animJusqua = this.t + recharge;
    // le coup n'atteint que ce qui est dans la zone devant le joueur, du côté où il regarde ; l'épée porte plus loin
    const portee = fiche?.passif?.declencheur === "permanent" ? fiche.passif.effets.portee_epee_pct : undefined;
    const monde = portee ? { ...this.d.monde, coup: { ...this.d.monde.coup, portee_px: appliquerPct(this.d.monde.coup.portee_px, portee) } } : this.d.monde;
    const zone = zoneCoup(monde, this.boiteJoueur, j.x, j.y, j.dir);
    const centre = centreZone(zone);
    this.rappels.evenement({ type: "coup", joueur: j.id, numero: j.combo, x: centre.x, y: centre.y, dir: j.dir, zone });
    for (const m of this.monstres.values()) {
      if (m.etat === "mort" || !coupToucheCible(zone, this.boiteMonstre, m.x, m.y)) continue;
      if (coupRate(this.d.progression, j.perso.niveau, m.niveau, this.alea())) {
        this.rappels.evenement({ type: "rate", cible: "monstre", id: m.id, x: m.x, y: m.y });
        continue;
      }
      const r = degatsCoup(this.d.formules, c, { niveau: j.perso.niveau, force: this.statsEff(j).force }, j.combo, {
        alea: this.alea(),
        critique: this.alea(),
      });
      this.frapperMonstre(j, m, Math.max(1, Math.round(appliquerPct(r.degats, this.degatsPct(j, m)))), r.critique);
    }
  }

  private frapperMonstre(j: Joueur, m: Monstre, degats: number, critique: boolean) {
    this.rappels.evenement({ type: "degats", cible: "monstre", id: m.id, valeur: degats, critique, x: m.x, y: m.y });
    m.coups += 1;
    if (m.invincible) return;
    // seuls les dégâts réellement encaissés comptent (pas de surplus sur le coup final)
    m.contributeurs.set(j.id, (m.contributeurs.get(j.id) ?? 0) + Math.min(degats, m.pv));
    m.pv -= degats;
    if (m.pv <= 0) {
      this.tuerMonstre(m);
      return;
    }
    if (m.etat === "errance" || m.etat === "retour") {
      m.cibleId = j.id;
      m.etat = "poursuite";
    }
  }

  private tuerMonstre(m: Monstre) {
    m.pv = 0;
    m.etat = "mort";
    m.cibleId = null;
    const [lo, hi] = this.d.monstres.rangs[m.rang].respawn_s;
    m.respawnA = this.t + lo + this.alea() * (hi - lo);
    this.rappels.evenement({ type: "mort-monstre", id: m.id });
    // sans groupe, seul un joueur ayant infligé assez de dégâts reçoit l'XP (seuil dans data/balance/partage-xp.json)
    const total = [...m.contributeurs.values()].reduce((a, b) => a + b, 0);
    const seuil = this.d.partageXp.seuil_contribution_pct[m.rang];
    for (const [id, degats] of m.contributeurs) {
      const j = this.joueurs.get(id);
      if (!j || !contributionSuffisante(degats, total, seuil)) continue;
      this.crediterXp(j, xpGagneeSurMonstre(this.d.progression, j.perso.niveau, m.niveau, m.rang));
      const passif = this.fiche(j)?.passif;
      if (passif?.declencheur === "apres-victoire-boss-ou-elite" && m.rang !== "commun") j.espritJusqua = this.t + (passif.effets.duree_s ?? 0);
    }
    m.contributeurs.clear();
  }

  /** Ajoute de l'XP à un joueur (montée de niveau, points à répartir, soin complet). */
  crediterXp(j: Joueur, gain: number) {
    const r = gagnerXp(this.d.progression, { niveau: j.perso.niveau, xp: j.perso.xp }, gain);
    j.perso.niveau = r.niveau;
    j.perso.xp = r.xp;
    j.sale = true;
    this.rappels.evenement({ type: "xp", joueur: j.id, gain }, j.id);
    if (r.niveauxGagnes > 0) {
      j.perso.pointsLibres += r.niveauxGagnes * this.d.formules.points.par_niveau;
      this.recalculer(j, true);
      this.rappels.evenement({ type: "niveau", joueur: j.id, niveau: r.niveau });
    }
  }

  /** Commande d'administration : fixe le niveau (les points ne sont accordés qu'en montée). */
  fixerNiveau(j: Joueur, niveau: number) {
    const n = Math.min(this.d.progression.niveau_max, Math.max(1, Math.floor(niveau)));
    if (n > j.perso.niveau) j.perso.pointsLibres += (n - j.perso.niveau) * this.d.formules.points.par_niveau;
    j.perso.niveau = n;
    j.perso.xp = 0;
    this.recalculer(j, true);
    j.sale = true;
    this.rappels.evenement({ type: "niveau", joueur: j.id, niveau: n });
  }

  /** Place un joueur à un endroit précis (téléportation sur la même map). */
  placer(j: Joueur, x: number, y: number) {
    j.x = x;
    j.y = y;
    j.file.length = 0;
  }

  soigner(j: Joueur) {
    j.pv = j.pvMax;
    j.sale = true;
  }

  /** Dégâts d'un monstre sur un joueur (esquive passive, invulnérabilité courte après un coup). */
  blesserJoueur(j: Joueur, m: Monstre) {
    if (j.ko || j.invincible || this.t < j.invulnerableJusqua) return;
    const esquive = esquivePct(this.d.formules, j.perso.niveau, this.statsEff(j).agilite);
    if (this.alea() * POURCENT < esquive) {
      this.rappels.evenement({ type: "esquive", cible: "joueur", id: j.id, x: j.x, y: j.y });
      return;
    }
    const brut = degatsMonstre(this.d.formules, m.attaque, this.alea());
    const degats = Math.max(1, Math.round(appliquerPct(brut, this.fiche(j)?.modificateurs?.degats_recus_pct)));
    j.pv = Math.max(0, j.pv - degats);
    j.derniereBlessureT = this.t;
    j.invulnerableJusqua = this.t + this.d.combat.invulnerabilite_apres_coup_s;
    j.anim = "touche";
    j.animJusqua = this.t + this.d.combat.invulnerabilite_apres_coup_s;
    this.rappels.evenement({ type: "degats", cible: "joueur", id: j.id, valeur: degats, critique: false, x: j.x, y: j.y });
    if (j.pv <= 0) this.mettreKo(j);
  }

  private mettreKo(j: Joueur) {
    j.ko = true;
    j.file.length = 0;
    j.koRetourA = this.t + this.d.monde.joueur.retour_ko_delai_s;
    j.anim = "ko";
    const apres = xpApresKo(this.d.progression, { niveau: j.perso.niveau, xp: j.perso.xp });
    j.perso.xp = apres.xp;
    j.sale = true;
    for (const m of this.monstres.values()) if (m.cibleId === j.id) m.cibleId = null;
    this.rappels.evenement({ type: "ko", joueur: j.id });
  }

  private revenirDuKo(j: Joueur) {
    const p = this.positionDeRetour();
    j.x = p.x;
    j.y = p.y;
    j.ko = false;
    j.pv = pvApresKo(this.d.progression, j.pvMax);
    j.anim = "";
    j.invulnerableJusqua = this.t + this.d.monde.joueur.invulnerabilite_retour_s;
    this.rappels.evenement({ type: "retour", joueur: j.id });
  }

  // ------------------------------------------------------------------------------------ tic

  tic() {
    const dt = this.dt;
    this.t += dt;
    for (const j of this.joueurs.values()) this.ticJoueur(j, dt);
    for (const m of this.monstres.values()) {
      if (m.etat === "mort") {
        if (this.t >= m.respawnA) this.ressusciter(m);
        continue;
      }
      penserMonstre(this, m, dt);
    }
  }

  private ticJoueur(j: Joueur, dt: number) {
    const tol = this.d.monde.anti_triche.tolerance_vitesse_pct;
    j.budget = Math.min(j.budget + (dt * (POURCENT + tol)) / POURCENT, dt + this.d.monde.anti_triche.reserve_max_s);
    if (j.ko) {
      if (this.t >= j.koRetourA) this.revenirDuKo(j);
      return;
    }
    while (j.file.length > 0 && j.budget >= dt) {
      const e = j.file.shift()!;
      j.budget -= dt;
      j.seq = e.seq;
      this.deplacerJoueur(j, e, dt);
    }
    if (this.t >= j.animJusqua && j.anim !== "") j.anim = "";
    if (this.t - j.derniereBlessureT >= this.d.progression.regeneration.pv_delai_s && j.pv < j.pvMax) {
      j.pv = Math.min(j.pvMax, j.pv + (j.pvMax * this.d.progression.regeneration.pv_pct_s * dt) / POURCENT);
    }
    if (!j.enTransit) {
      for (const o of this.carte.objets) {
        if (o.type === "portal" && boiteDansObjet(o, this.boiteJoueur, j.x, j.y)) {
          j.enTransit = true;
          this.rappels.changerMap(j, String(o.props.map), String(o.props.spawn));
          break;
        }
      }
    }
  }

  private deplacerJoueur(j: Joueur, e: Entree, dt: number) {
    if (e.dx === 0 && e.dy === 0) return;
    const norme = Math.hypot(e.dx, e.dy);
    const pas = this.vitesseJoueur(j, e.course) * dt;
    const r = deplacer(this.carte.grille, this.boiteJoueur, j.x, j.y, (e.dx / norme) * pas, (e.dy / norme) * pas, this.corpsSolidesPour(j));
    j.x = r.x;
    j.y = r.y;
    j.dir = directionDepuisVecteur(e.dx, e.dy, j.dir);
  }
}
