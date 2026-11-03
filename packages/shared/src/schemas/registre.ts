import type { ZodType } from "zod";
import { balance, balanceCombat, balanceEvolution, balanceFormules, balanceMonde, balanceMonstres, balancePvp, balanceProgression } from "./balance.js";
import { boss, monstre, objet, personnage, pnj, quete, technique, transformation, zone } from "./fiches.js";

/** Nom du fichier `schemas/<nom>.schema.json` → schéma zod (source de vérité). */
export const registreSchemas: Record<string, ZodType> = {
  personnage,
  monstre,
  boss,
  pnj,
  quete,
  technique,
  transformation,
  objet,
  zone,
  balance,
  "balance-formules": balanceFormules,
  "balance-progression": balanceProgression,
  "balance-monde": balanceMonde,
  "balance-monstres": balanceMonstres,
  "balance-combat": balanceCombat,
  "balance-evolution": balanceEvolution,
  "balance-pvp": balancePvp,
};

/** Dossier de data/ → nom du schéma. */
export const schemaParDossier: Record<string, string> = {
  characters: "personnage",
  mobs: "monstre",
  bosses: "boss",
  npcs: "pnj",
  skills: "technique",
  transformations: "transformation",
  items: "objet",
  zones: "zone",
  quests: "quete",
};

/** Fichier de data/balance/ → nom du schéma (par défaut : `balance`). */
export const schemaParFichierBalance: Record<string, string> = {
  "formules.json": "balance-formules",
  "progression.json": "balance-progression",
  "monde.json": "balance-monde",
  "monstres.json": "balance-monstres",
  "combat.json": "balance-combat",
  "evolution.json": "balance-evolution",
  "pvp.json": "balance-pvp",
};
