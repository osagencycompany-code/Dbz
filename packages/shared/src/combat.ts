/** Règles de combat du jalon 4 (coups au corps à corps). Les valeurs viennent de data/balance, passées en paramètre. */
import { degatsMelee } from "./formulas.js";
import type { BalanceCombat, BalanceFormules, BalanceMonde } from "./schemas/balance.js";

/** 0 = vers le bas (face), 1 = vers le haut (dos), 2 = gauche, 3 = droite. */
export type Direction = 0 | 1 | 2 | 3; // ok-nombre

const VECTEURS: Array<[number, number]> = [
  [0, 1],
  [0, -1],
  [-1, 0],
  [1, 0],
];

export function vecteurDirection(d: Direction): { x: number; y: number } {
  const [x, y] = VECTEURS[d]!;
  return { x, y };
}

/** Direction (4 sens) la plus proche d'un vecteur de déplacement ; garde l'ancienne si le vecteur est nul. */
export function directionDepuisVecteur(dx: number, dy: number, ancienne: Direction): Direction {
  if (dx === 0 && dy === 0) return ancienne;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 2 : 3; // ok-nombre
  return dy < 0 ? 1 : 0;
}

/** Point d'impact d'un coup : `portee_px` devant le joueur. */
export function pointImpact(monde: BalanceMonde, x: number, y: number, d: Direction): { x: number; y: number } {
  const v = vecteurDirection(d);
  return { x: x + v.x * monde.coup.portee_px, y: y + v.y * monde.coup.portee_px };
}

/** Vrai si une cible aux pieds (cx, cy) est touchée par un coup dont l'impact est (ix, iy). */
export function coupToucheCible(monde: BalanceMonde, ix: number, iy: number, cx: number, cy: number): boolean {
  return Math.hypot(cx - ix, cy - iy) <= monde.coup.rayon_px;
}

/** Numéro (à partir de 1) du coup dans le combo, selon le temps écoulé depuis le coup précédent. */
export function numeroCombo(c: BalanceCombat, precedent: number, ecoulementS: number): number {
  if (precedent === 0 || ecoulementS > c.combo.fenetre_s) return 1;
  return precedent >= c.combo.coups ? 1 : precedent + 1;
}

/** Dégâts d'un coup du joueur. `alea` et `critique` sont des tirages dans [0, 1[ fournis par le serveur. */
export function degatsCoup(
  f: BalanceFormules,
  c: BalanceCombat,
  joueur: { niveau: number; force: number; bonusPct?: number },
  numero: number,
  tirages: { alea: number; critique: number },
): { degats: number; critique: boolean } {
  let d = degatsMelee(f, joueur.niveau, joueur.force, joueur.bonusPct ?? 0);
  if (numero >= c.combo.coups) d *= c.combo.multiplicateur_dernier;
  d *= f.alea_degats.min + (f.alea_degats.max - f.alea_degats.min) * tirages.alea;
  const critique = tirages.critique < f.critique.chance;
  if (critique) d *= f.critique.multiplicateur;
  return { degats: Math.max(1, Math.round(d)), critique };
}

/** Dégâts d'une attaque de monstre (aléa 0,9 à 1,1 comme pour le joueur). */
export function degatsMonstre(f: BalanceFormules, attaque: number, alea: number): number {
  return Math.max(1, Math.round(attaque * (f.alea_degats.min + (f.alea_degats.max - f.alea_degats.min) * alea)));
}
