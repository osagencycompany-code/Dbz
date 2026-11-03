/**
 * Formules du jeu (docs/beta0-spec.md §3). Aucune valeur d'équilibrage ici :
 * tout vient de data/balance/formules.json et progression.json, passés en paramètre.
 * Verrouillées par tests/golden/formules.json.
 */
import type { BalanceFormules, BalanceProgression } from "./schemas/balance.js";

export type Rang = "commun" | "elite" | "boss";

/** Les cinq stats d'un joueur, objets d'équipement compris. */
export interface Stats {
  vitalite: number;
  force: number;
  puissance: number;
  agilite: number;
  energie: number;
}

const POURCENT = 100;

/** B(L) = facteur^(L-1) */
export function bonusNiveau(f: BalanceFormules, niveau: number): number {
  return f.base_niveau.facteur ** (niveau - 1);
}

/** pts(L) : points de stats cumulés au niveau L. */
export function pointsNiveau(f: BalanceFormules, niveau: number): number {
  return f.points.depart_par_stat * f.stats.length + f.points.par_niveau * (niveau - 1);
}

/** r(stat) = stat / pts(L) */
export function ratio(f: BalanceFormules, niveau: number, stat: number): number {
  return stat / pointsNiveau(f, niveau);
}

/** M(r) = 1 + coef × r^exposant */
export function specialisation(f: BalanceFormules, r: number): number {
  return 1 + f.specialisation.coef * r ** f.specialisation.exposant;
}

function bonusTransfo(bonusPct: number): number {
  return 1 + bonusPct / POURCENT;
}

/** `bonusPct` : bonus de transformation en % (ex. 20 pour +20 %). Idem pour les trois fonctions de dégâts et de PV. */
export function pvMax(f: BalanceFormules, niveau: number, vitalite: number, bonusPct = 0): number {
  return f.pv.base * bonusNiveau(f, niveau) * specialisation(f, ratio(f, niveau, vitalite)) * bonusTransfo(bonusPct);
}

export function degatsMelee(f: BalanceFormules, niveau: number, force: number, bonusPct = 0): number {
  return (
    f.degats_melee.base * bonusNiveau(f, niveau) * specialisation(f, ratio(f, niveau, force)) * bonusTransfo(bonusPct)
  );
}

export function degatsKi(f: BalanceFormules, niveau: number, puissance: number, bonusPct = 0): number {
  return (
    f.degats_ki.base * bonusNiveau(f, niveau) * specialisation(f, ratio(f, niveau, puissance)) * bonusTransfo(bonusPct)
  );
}

export function kiMax(f: BalanceFormules, niveau: number, energie: number): number {
  return f.ki_max.base * specialisation(f, ratio(f, niveau, energie));
}

/** Esquive en pourcentage, plafonnée. */
export function esquivePct(f: BalanceFormules, niveau: number, agilite: number): number {
  return Math.min(f.esquive.max_pct, f.esquive.max_pct * ratio(f, niveau, agilite) ** f.esquive.exposant);
}

/** Vitesse de marche en px/s, sans les modes (course, vol, Super Saiyan). */
export function vitessePxS(f: BalanceFormules, niveau: number, agilite: number): number {
  return f.vitesse.base_px_s * (1 + f.vitesse.bonus * ratio(f, niveau, agilite) ** f.vitesse.exposant);
}

/** Vitesse avec les modes actifs. */
export function vitesseAvecModes(
  f: BalanceFormules,
  vitesseBase: number,
  modes: { course?: boolean; vol?: boolean; superSaiyan?: boolean },
): number {
  let v = vitesseBase;
  if (modes.course) v *= f.vitesse.course;
  if (modes.vol) v *= f.vitesse.vol;
  if (modes.superSaiyan) v *= f.vitesse.super_saiyan;
  return v;
}

/** Niveau de puissance affiché. `transfo` : bonus en % et multiplicateur d'affichage de la transformation. */
export function puissanceAffichee(
  f: BalanceFormules,
  niveau: number,
  stats: Stats,
  transfo?: { bonusPct: number; multiplicateurAffiche: number },
): number {
  const somme = stats.vitalite + stats.force + stats.puissance + stats.agilite + stats.energie;
  const base = f.puissance_affichee.coef * somme * bonusNiveau(f, niveau) ** f.puissance_affichee.exposant_base;
  return transfo ? base * bonusTransfo(transfo.bonusPct) * transfo.multiplicateurAffiche : base;
}

/** XP requise pour passer du niveau L à L+1. */
export function xpRequise(p: BalanceProgression, niveau: number): number {
  return Math.round(p.xp_requise.base * niveau ** p.xp_requise.exposant);
}

/** XP d'un monstre de niveau L, avant multiplicateur global et écart de niveau. */
export function xpMonstre(p: BalanceProgression, niveau: number, rang: Rang = "commun"): number {
  const base = p.xp_monstre.base * niveau ** p.xp_monstre.exposant;
  const mult =
    rang === "boss" ? p.xp_monstre.multiplicateur_boss : rang === "elite" ? p.xp_monstre.multiplicateur_elite : 1;
  return Math.round(base * mult);
}

/** XP d'une quête = xp_niveaux × XP requise au niveau conseillé (décision 0011). */
export function xpQuete(p: BalanceProgression, niveauConseille: number, xpNiveaux: number): number {
  return Math.round(xpNiveaux * xpRequise(p, niveauConseille));
}
