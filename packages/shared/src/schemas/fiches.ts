import { z } from "zod";
import { butin, enTete, id, intervalleNiveaux, sprite, statNom } from "./commun.js";

// ---------- Personnage jouable ou modèle ----------
export const personnage = z.strictObject({
  ...enTete,
  role: z.enum(["modele-joueur", "pnj-combattant"]),
  race: z.enum(["saiyan", "namek", "humain", "changelin", "majin"]),
  formes: z.record(
    z.string(),
    z.strictObject({
      planche: z.string(),
      animations: z.string(),
      portrait: z.string().optional(),
      provenance: z.enum(["dbz-online", "buus-fury", "maison"]),
    }),
  ),
  palettes_joueur: z.array(z.string()).optional(),
});

// ---------- Monstre ----------
export const monstre = z.strictObject({
  ...enTete,
  rang: z.enum(["commun", "elite"]),
  niveau: intervalleNiveaux,
  sprite,
  comportement: z.looseObject({
    type: z.enum(["immobile", "poursuite", "meute", "charge", "bond"]),
  }),
  zones: z.array(z.string()),
  butin: butin.optional(),
});

// ---------- Boss ----------
const attaqueBoss = z.looseObject({ nom: z.string(), type: z.string() });

export const boss = z.strictObject({
  ...enTete,
  niveau: z.number().int(),
  sprite,
  zone: z.string(),
  respawn_s: z.number().int(),
  echelle_sprite: z.number().optional(),
  contribution_min_pct: z.number().optional(),
  butin: butin.optional(),
  phases: z
    .array(
      z.strictObject({
        pv_pct: z.tuple([z.number(), z.number()]),
        attaques: z.array(attaqueBoss).optional(),
        aura: z.string().optional(),
        vitesse_bonus_pct: z.number().optional(),
        invocations: z
          .array(
            z.strictObject({
              monstre: z.string(),
              nombre: z.number().int().min(1),
              recharge_s: z.number().optional(),
            }),
          )
          .optional(),
      }),
    )
    .min(1),
});

// ---------- PNJ ----------
export const pnj = z.strictObject({
  ...enTete,
  sprite: sprite.optional(),
  zone: z.string(),
  dialogues: z.string().optional(),
});

// ---------- Technique ----------
export const technique = z.strictObject({
  ...enTete,
  touche_defaut: z.string(),
  touche_alternative: z.string().optional(),
  cout: z.unknown().optional(),
  multiplicateur: z.unknown().optional(),
  parametres: z.string().optional(),
  apprentissage: z.looseObject({
    type: z.enum(["depart", "quete", "niveau"]),
    quete: z.string().optional(),
    maitre: z.string().optional(),
  }),
  description: z.string(),
});

// ---------- Transformation ----------
export const transformation = z.strictObject({
  ...enTete,
  race: z.string(),
  niveau_requis: z.number().int(),
  quete_requise: z.string().optional(),
  bonus_combat: z.record(z.string(), z.number()),
  vitesse_mult: z.number().optional(),
  multiplicateur_affiche: z.number(),
  ki_requis_pct: z.number().optional(),
  cout_ki_pct_s: z.number().optional(),
  cout_activation_ki_pct: z.number().optional(),
  duree_transformation_s: z.number().optional(),
  forme: z.string().optional(),
  cinematique_deblocage: z.boolean().optional(),
});

// ---------- Objet ----------
export const objet = z.strictObject({
  ...enTete,
  emplacement: z.enum(["tete", "torse", "gants", "bottes", "accessoire", "consommable", "quete"]),
  rarete: z.enum(["commun", "rare", "epique", "legendaire", "relique"]),
  stats: z.partialRecord(statNom, z.number().int()),
  prix: z.number().int().min(0),
  icone: z.string().nullable().optional(),
  empilable: z.boolean().optional(),
});

// ---------- Zone ----------
export const zone = z.strictObject({
  ...enTete,
  niveaux: intervalleNiveaux,
  maps: z.array(z.string()),
  monstres: z.array(z.string()),
  deblocage: z.string().nullable().optional(),
  point_de_soin: z.string().nullable().optional(),
  carte_du_monde: z.boolean().optional(),
  /** Où le joueur arrive quand il voyage vers la zone : id de map (sans « maps/ » ni « .tmj ») et nom du spawn. */
  arrivee: z.strictObject({ map: z.string(), spawn: z.string() }).optional(),
});

// ---------- Quête ----------
const objectifQuete = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("parler"), pnj: id }),
  z.strictObject({ type: z.literal("frapper"), cible: id, nombre: z.number().int().min(1) }),
  z.strictObject({ type: z.literal("utiliser"), technique: id }),
  z
    .strictObject({
      type: z.literal("vaincre"),
      monstre: id.optional(),
      boss: id.optional(),
      nombre: z.number().int().min(1).optional(),
    })
    .refine((o) => (o.monstre === undefined) !== (o.boss === undefined), "monstre OU boss, pas les deux"),
  z
    .strictObject({ type: z.literal("aller"), zone: id.optional(), lieu: z.string().optional() })
    .refine((o) => (o.zone === undefined) !== (o.lieu === undefined), "zone OU lieu, pas les deux"),
  z.strictObject({ type: z.literal("kamehameha-charge-max"), nombre: z.number().int().min(1) }),
  z.strictObject({ type: z.literal("survivre-vagues"), monstre: id, vagues: z.number().int().min(1) }),
  z.strictObject({ type: z.literal("evenement"), script: z.string() }),
  z.strictObject({ type: z.literal("tenir"), duree_s: z.number().positive() }),
]);

/** Bornes de xp_niveaux : décision 0011. */
export const XP_NIVEAUX_MIN = 0.5;
export const XP_NIVEAUX_MAX = 1.5;

export const quete = z.strictObject({
  ...enTete,
  arc: z.enum(["saiyan", "namek", "cell", "buu", "annexe"]),
  niveau_conseille: z.number().int().min(1),
  donneur: id,
  prerequis: id.nullable().optional(),
  objectifs: z.array(objectifQuete).min(1),
  recompenses: z.strictObject({
    xp_niveaux: z.number().min(XP_NIVEAUX_MIN).max(XP_NIVEAUX_MAX).optional(),
    zenies: z.number().int().min(0).optional(),
    objets: z.array(z.strictObject({ objet: id, nombre: z.number().int().min(1) })).optional(),
    technique: id.optional(),
    transformation: id.optional(),
    debloque_zone: id.optional(),
    fin_beta: z.boolean().optional(),
  }),
});

export type Quete = z.infer<typeof quete>;
export type Monstre = z.infer<typeof monstre>;
export type Boss = z.infer<typeof boss>;
export type Objet = z.infer<typeof objet>;
