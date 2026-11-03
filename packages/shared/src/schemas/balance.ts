import { z } from "zod";

const version = z
  .number()
  .int()
  .min(1)
  .describe("À incrémenter à chaque changement, avec une décision dans docs/decisions/");

/** Base commune des fichiers d'équilibrage (combat, économie, monstres : typés plus finement au jalon 4). */
export const balance = z.looseObject({
  $schema: z.string().optional(),
  version,
});

export const balanceFormules = z.strictObject({
  $schema: z.string().optional(),
  version,
  stats: z.array(z.string()).length(5),
  points: z.strictObject({ depart_par_stat: z.number(), par_niveau: z.number() }),
  base_niveau: z.strictObject({ facteur: z.number() }),
  specialisation: z.strictObject({ coef: z.number(), exposant: z.number() }),
  pv: z.strictObject({ base: z.number() }),
  degats_melee: z.strictObject({ base: z.number() }),
  degats_ki: z.strictObject({ base: z.number() }),
  ki_max: z.strictObject({ base: z.number() }),
  esquive: z.strictObject({ max_pct: z.number(), max_pvp_pct: z.number(), exposant: z.number() }),
  vitesse: z.strictObject({
    base_px_s: z.number(),
    bonus: z.number(),
    exposant: z.number(),
    course: z.number(),
    vol: z.number(),
    super_saiyan: z.number(),
  }),
  critique: z.strictObject({ chance: z.number(), multiplicateur: z.number() }),
  alea_degats: z.strictObject({ min: z.number(), max: z.number() }),
  puissance_affichee: z.strictObject({ coef: z.number(), exposant_base: z.number() }),
});

export const balanceProgression = z.strictObject({
  $schema: z.string().optional(),
  version,
  multiplicateur_global: z
    .number()
    .positive()
    .describe("Multiplicateur d'XP des monstres et boss (décision 0012). Les quêtes ne sont pas multipliées."),
  xp_requise: z.strictObject({ base: z.number(), exposant: z.number() }),
  xp_monstre: z.strictObject({
    base: z.number(),
    exposant: z.number(),
    multiplicateur_elite: z.number(),
    multiplicateur_boss: z.number(),
  }),
  niveau_max: z.number().int(),
  ecart_niveau: z.strictObject({
    xp_reduite_au_dela: z.number(),
    xp_reduite_pct: z.number(),
    coups_rates_au_dela: z.number(),
    coups_rates_pct: z.number(),
  }),
  ko: z.strictObject({ pv_retour_pct: z.number(), perte_xp_niveau_pct: z.number() }),
  zenkai: z.strictObject({ bonus_xp_pct: z.number(), duree_s: z.number(), recharge_s: z.number() }),
  regeneration: z.strictObject({ pv_pct_s: z.number(), pv_delai_s: z.number(), ki_pct_s: z.number() }),
});

const paire = z.tuple([z.number(), z.number()]);

export const balanceMonstres = z.strictObject({
  $schema: z.string().optional(),
  version,
  reference_joueur_equilibre: z.strictObject({ multiplicateur_specialisation: z.number() }),
  rangs: z.strictObject({
    commun: z.strictObject({ pv_x_degats_joueur: z.number(), attaque_pct_pv_joueur: z.number(), respawn_s: paire }),
    elite: z.strictObject({ pv_x_degats_joueur: z.number(), attaque_pct_pv_joueur: z.number(), respawn_s: paire }),
    boss: z.strictObject({ pv_x_degats_joueur: z.number(), attaque_pct_pv_joueur: z.number(), respawn_s: paire }),
  }),
  annonce_min_s_si_degats_sup_20pct: z.number(),
});

/** Valeurs du monde en jeu : boîtes de collision, portées, aggro, anti-triche, IA (décision 0019). */
export const balanceMonde = z.strictObject({
  $schema: z.string().optional(),
  version,
  boites: z.strictObject({
    joueur: z.strictObject({ largeur_px: z.number(), hauteur_px: z.number() }),
    monstre: z.strictObject({ largeur_px: z.number(), hauteur_px: z.number() }),
  }),
  coup: z.strictObject({ portee_px: z.number(), rayon_px: z.number() }),
  aggro_px: z.strictObject({ commun: z.number(), elite: z.number(), boss: z.number() }),
  anti_triche: z.strictObject({ tolerance_vitesse_pct: z.number(), reserve_max_s: z.number() }),
  ia: z.strictObject({
    attaque_portee_px: z.number(),
    attaque_rayon_px: z.number(),
    attaque_annonce_s: z.number(),
    attaque_recharge_s: z.number(),
    abandon_facteur_aggro: z.number(),
    meute_alerte_px: z.number(),
    charge_annonce_s: z.number(),
    charge_duree_s: z.number(),
    charge_recharge_s: z.number(),
    charge_declenchement_px: z.number(),
    bond_declenchement_px: z.number(),
    bond_duree_s: z.number(),
    zone_rayon_px: z.number(),
    zone_declenchement_px: z.number(),
    zone_recharge_s: z.number(),
    errance_rayon_px: z.number(),
    errance_vitesse_facteur: z.number(),
    errance_pause_s: paire,
    retour_vitesse_facteur: z.number(),
  }),
  joueur: z.strictObject({ retour_ko_delai_s: z.number(), invulnerabilite_retour_s: z.number() }),
});

export const balanceCombat = z.looseObject({
  $schema: z.string().optional(),
  version,
  tic_serveur_hz: z.number().int().positive(),
  combo: z.strictObject({
    coups: z.number().int(),
    multiplicateur_dernier: z.number(),
    fenetre_s: z.number(),
    recharge_s: z.number(),
    ki_rendu_pct: z.number(),
    recul_px: z.array(z.number()),
    gel_impact_images: z.array(z.number()),
  }),
  invulnerabilite_apres_coup_s: z.number(),
});

export type BalanceMonstres = z.infer<typeof balanceMonstres>;
export type BalanceMonde = z.infer<typeof balanceMonde>;
export type BalanceCombat = z.infer<typeof balanceCombat>;
export type BalanceFormules = z.infer<typeof balanceFormules>;
export type BalanceProgression = z.infer<typeof balanceProgression>;
