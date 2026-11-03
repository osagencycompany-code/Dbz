import type { Direction, RangMonstre, Stats } from "@dbz/shared";
import type { FicheMonstre } from "../donnees.js";

/** Intention envoyée par le client à chaque tic : une direction, jamais une position. */
export interface Entree {
  seq: number;
  dx: number;
  dy: number;
  course: boolean;
}

/** Ce qui est conservé en base pour un personnage. */
export interface Personnage {
  /** Identifiant du personnage (un compte en a jusqu'à cinq). */
  id: number;
  compteId: number;
  pseudo: string;
  nom: string;
  heros: string;
  apparence: string;
  rarete: number;
  /** TRANSITION : planche du client actuel ; remplacée par héros et apparence avec les écrans. */
  palette: string;
  niveau: number;
  xp: number;
  stats: Stats;
  pointsLibres: number;
  zenies: number;
  map: string;
  spawn: string | null;
  x: number | null;
  y: number | null;
}

export interface Joueur {
  id: string;
  perso: Personnage;
  x: number;
  y: number;
  dir: Direction;
  pv: number;
  pvMax: number;
  ko: boolean;
  koRetourA: number;
  invulnerableJusqua: number;
  derniereBlessureT: number;
  dernierCoupT: number;
  combo: number;
  anim: string;
  animJusqua: number;
  /** Dernière entrée traitée (acquittement pour la réconciliation côté client). */
  seq: number;
  file: Entree[];
  budget: number;
  enTransit: boolean;
  sale: boolean;
  /** Fin du bonus de dégâts temporaire du passif « Esprit combatif » (secondes de simulation). */
  espritJusqua: number;
  /** Commande d'administration /invincible. */
  invincible: boolean;
}

export type EtatMonstre = "errance" | "poursuite" | "annonce" | "charge" | "bond" | "retour" | "mort";

export interface Zone {
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
}

export interface Monstre {
  id: string;
  fiche: FicheMonstre;
  rang: RangMonstre;
  niveau: number;
  x: number;
  y: number;
  dir: Direction;
  pv: number;
  pvMax: number;
  attaque: number;
  vitesse: number;
  etat: EtatMonstre;
  /** Fin de l'état courant (annonce, charge, bond) en secondes de simulation. */
  etatJusqua: number;
  /** Nature de l'attaque annoncée : "contact", "charge", "bond" ou "zone". */
  attaqueAnnoncee: string;
  cibleId: string | null;
  maison: { x: number; y: number };
  zone: Zone;
  destination: { x: number; y: number } | null;
  pauseJusqua: number;
  prochaineAttaque: number;
  prochaineCapacite: number;
  vecteur: { x: number; y: number };
  aFrappe: boolean;
  /** Dégâts réels infligés par chaque joueur (sert à la règle de contribution pour l'XP). */
  contributeurs: Map<string, number>;
  respawnA: number;
  invincible: boolean;
  coups: number;
}

export type Evenement =
  | { type: "degats"; cible: "joueur" | "monstre"; id: string; valeur: number; critique: boolean; x: number; y: number }
  | { type: "rate" | "esquive"; cible: "joueur" | "monstre"; id: string; x: number; y: number }
  | { type: "coup"; joueur: string; numero: number; x: number; y: number; dir: number; zone: { x0: number; y0: number; x1: number; y1: number } }
  | { type: "annonce"; monstre: string; attaque: string }
  | { type: "mort-monstre"; id: string }
  | { type: "ko"; joueur: string }
  | { type: "retour"; joueur: string }
  | { type: "xp"; joueur: string; gain: number }
  | { type: "niveau"; joueur: string; niveau: number };
