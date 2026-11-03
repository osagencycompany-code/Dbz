/**
 * Règles de progression (docs/beta0-spec.md §3 et §4), en fonctions pures.
 * Tous les seuils viennent de data/balance/progression.json, passé en paramètre.
 */
import { xpMonstre, xpRequise, type Rang } from "./formulas.js";
import type { BalanceProgression } from "./schemas/balance.js";

const POURCENT = 100;

export interface EtatProgression {
  niveau: number;
  /** XP accumulée dans le niveau courant (jamais l'XP totale). */
  xp: number;
}

/** Ajoute de l'XP, enchaîne les montées de niveau, et s'arrête au niveau maximum. */
export function gagnerXp(p: BalanceProgression, etat: EtatProgression, gain: number): EtatProgression & { niveauxGagnes: number } {
  let { niveau, xp } = etat;
  let reste = Math.max(0, Math.floor(gain));
  let niveauxGagnes = 0;
  while (niveau < p.niveau_max) {
    const besoin = xpRequise(p, niveau) - xp;
    if (reste < besoin) {
      xp += reste;
      return { niveau, xp, niveauxGagnes };
    }
    reste -= besoin;
    xp = 0;
    niveau += 1;
    niveauxGagnes += 1;
  }
  return { niveau, xp: 0, niveauxGagnes };
}

/** XP réellement gagnée sur un monstre : écart de niveau, multiplicateur global (0012), puis Zenkai. */
export function xpGagneeSurMonstre(
  p: BalanceProgression,
  niveauJoueur: number,
  niveauMonstre: number,
  rang: Rang,
  options: { zenkaiActif?: boolean } = {},
): number {
  let xp = xpMonstre(p, niveauMonstre, rang);
  if (niveauJoueur - niveauMonstre > p.ecart_niveau.xp_reduite_au_dela) xp *= p.ecart_niveau.xp_reduite_pct / POURCENT;
  xp *= p.multiplicateur_global;
  if (options.zenkaiActif) xp *= 1 + p.zenkai.bonus_xp_pct / POURCENT;
  return Math.round(xp);
}

/** Vrai si le coup du joueur rate à cause d'un monstre trop haut niveau. `aleatoire` ∈ [0, 1[ vient du serveur. */
export function coupRate(p: BalanceProgression, niveauJoueur: number, niveauMonstre: number, aleatoire: number): boolean {
  if (niveauMonstre - niveauJoueur <= p.ecart_niveau.coups_rates_au_dela) return false;
  return aleatoire < p.ecart_niveau.coups_rates_pct / POURCENT;
}

/** Après un K.O. : perte d'un pourcentage de l'XP du niveau, sans jamais perdre de niveau. */
export function xpApresKo(p: BalanceProgression, etat: EtatProgression): EtatProgression {
  const perte = Math.round((xpRequise(p, etat.niveau) * p.ko.perte_xp_niveau_pct) / POURCENT);
  return { niveau: etat.niveau, xp: Math.max(0, etat.xp - perte) };
}

/** PV rendus au retour d'un K.O. */
export function pvApresKo(p: BalanceProgression, pvMax: number): number {
  return Math.round((pvMax * p.ko.pv_retour_pct) / POURCENT);
}

/** Le Zenkai se déclenche sur un K.O. contre un ennemi de niveau supérieur ou égal, hors recharge. */
export function zenkaiDeclenche(niveauJoueur: number, niveauEnnemi: number, maintenantS: number, prochainPossibleS: number): boolean {
  return niveauEnnemi >= niveauJoueur && maintenantS >= prochainPossibleS;
}
