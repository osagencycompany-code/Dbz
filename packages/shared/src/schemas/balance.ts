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

export type BalanceFormules = z.infer<typeof balanceFormules>;
export type BalanceProgression = z.infer<typeof balanceProgression>;
