/** Statistiques des monstres, d'après le gabarit de docs/beta0-spec.md §6 (valeurs dans data/balance/monstres.json). */
import { bonusNiveau } from "./formulas.js";
import type { BalanceFormules, BalanceMonstres } from "./schemas/balance.js";

const POURCENT = 100;

export type RangMonstre = keyof BalanceMonstres["rangs"];

/** PV = coefficient du rang × (dégâts de mêlée d'un joueur équilibré au niveau du monstre). */
export function pvMonstre(f: BalanceFormules, m: BalanceMonstres, rang: RangMonstre, niveau: number): number {
  const degatsJoueur = f.degats_melee.base * bonusNiveau(f, niveau) * m.reference_joueur_equilibre.multiplicateur_specialisation;
  return Math.round(m.rangs[rang].pv_x_degats_joueur * degatsJoueur);
}

/** Attaque = pourcentage des PV d'un joueur équilibré au niveau du monstre. */
export function attaqueMonstre(f: BalanceFormules, m: BalanceMonstres, rang: RangMonstre, niveau: number): number {
  const pvJoueur = f.pv.base * bonusNiveau(f, niveau) * m.reference_joueur_equilibre.multiplicateur_specialisation;
  return (m.rangs[rang].attaque_pct_pv_joueur / POURCENT) * pvJoueur;
}
