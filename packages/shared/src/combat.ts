/** Règles de combat du jalon 4 (coups au corps à corps). Les valeurs viennent de data/balance, passées en paramètre. */
import { rectBoite, rectsSeChevauchent, type Boite, type Rect } from "./carte.js";
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

/**
 * Zone d'un coup : un rectangle collé au bord du joueur, du côté où il regarde.
 * Profondeur = `portee_px` mesurée depuis le bord du corps ; largeur = `largeur_px`, centrée sur le corps.
 * Rien derrière ni sur les côtés au-delà de cette largeur ne peut être touché.
 */
export function zoneCoup(monde: BalanceMonde, boite: Boite, x: number, y: number, d: Direction): Rect {
  const corps = rectBoite(boite, x, y);
  const cx = (corps.x0 + corps.x1) / 2;
  const cy = (corps.y0 + corps.y1) / 2;
  const demi = monde.coup.largeur_px / 2;
  const p = monde.coup.portee_px;
  if (d === 0) return { x0: cx - demi, x1: cx + demi, y0: corps.y1, y1: corps.y1 + p };
  if (d === 1) return { x0: cx - demi, x1: cx + demi, y0: corps.y0 - p, y1: corps.y0 };
  if (d === 2) return { x0: corps.x0 - p, x1: corps.x0, y0: cy - demi, y1: cy + demi };
  return { x0: corps.x1, x1: corps.x1 + p, y0: cy - demi, y1: cy + demi };
}

/** Point central de la zone (pour placer l'effet visuel). */
export function centreZone(r: Rect): { x: number; y: number } {
  return { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 };
}

/** Vrai si le corps d'une cible (boîte posée à ses pieds) touche la zone du coup. */
export function coupToucheCible(zone: Rect, boiteCible: Boite, cx: number, cy: number): boolean {
  return rectsSeChevauchent(zone, rectBoite(boiteCible, cx, cy));
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
