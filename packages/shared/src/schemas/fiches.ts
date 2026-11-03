import { z } from "zod";
import { butin, enTete, id, intervalleNiveaux, sprite, statNom } from "./commun.js";

// ---------- Héros jouable (décision 0021) ou personnage combattant ----------
const provenance = z.enum(["dbz-online", "buus-fury", "legacy-of-goku-1", "legacy-of-goku-2", "maison"]);

const forme = z
  .strictObject({
    /** Planche déjà préparée (fond transparent) … */
    planche: z.string().optional(),
    /** … ou planche brute à découper par `npm run assets:build` (bandeau de titre retiré, fond transparent). */
    extraction: z.strictObject({ source: z.string() }).optional(),
    animations: z.string().optional(),
    /** Forme sans planche propre : utilise la planche de la forme `base` avec l'effet de superposition `effet` (Super Saiyan 2). */
    base: z.string().optional(),
    effet: z.string().optional(),
    portrait: z.string().optional(),
    provenance,
    notes: z.string().optional(),
  })
  .refine((f) => f.planche !== undefined || f.extraction !== undefined || f.base !== undefined, "planche, extraction ou base requis")
  .refine((f) => f.base !== undefined || f.animations !== undefined, "animations requises (sauf forme dérivée d'une base)");

/** Modificateurs de héros, en %, appliqués après la formule commune (décision 0022). Absent = 0 = neutre. */
export const modificateursHeros = z.strictObject({
  vitalite_pct: z.number().optional(),
  force_pct: z.number().optional(),
  puissance_pct: z.number().optional(),
  agilite_pct: z.number().optional(),
  energie_pct: z.number().optional(),
  degats_pct: z.number().optional(),
  degats_ki_pct: z.number().optional(),
  degats_recus_pct: z.number().optional(),
  duree_coups_pct: z.number().optional(),
  degats_technique_pct: z.record(z.string(), z.number()).optional(),
});

const passifHeros = z.strictObject({
  id,
  nom: z.string(),
  description: z.string(),
  /** Quand le passif agit (ex. « apres-victoire-boss », « pv-sous-30-pct », « contre-boss »). */
  declencheur: z.string(),
  effets: z.record(z.string(), z.number()),
});

const disponibilite = z.enum(["beta", "apres-beta"]);

export const personnage = z.strictObject({
  ...enTete,
  role: z.enum(["heros-jouable", "modele-joueur", "pnj-combattant"]),
  race: z.enum(["saiyan", "namek", "humain", "changelin", "majin"]),
  /** Formes d'un personnage non jouable (les héros jouables utilisent `apparences`). */
  formes: z.record(z.string(), forme).optional(),
  /** TRANSITION : l'ancien choix de palette disparaît avec le modèle de personnage serveur (décision 0021). */
  palettes_joueur: z.array(z.string()).optional(),
  disponibilite: disponibilite.optional(),
  /** Texte court de la carte de création : « Polyvalent », « Mêlée offensive »… */
  role_combat: z.string().optional(),
  /** Rareté de départ (étoiles). Le niveau maximum de chaque rareté est dans data/balance/evolution.json. */
  rarete_depart: z.number().int().min(1).max(5).optional(),
  modificateurs: modificateursHeros.optional(),
  passif: passifHeros.optional(),
  techniques: z.array(z.strictObject({ id, disponibilite })).optional(),
  transformations: z.array(z.strictObject({ id, disponibilite })).optional(),
  /** Apparences au choix à la création, stats identiques, planches propres, choix définitif (décision 0023). */
  apparences: z
    .array(z.strictObject({ id, nom: z.string(), formes: z.record(z.string(), forme), notes: z.string().optional() }))
    .min(1)
    .optional(),
  portrait: z.string().optional(),
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
  /** Boss du monde partagé (apparaît pour tous, comme Nappa) ; faux = événement de salle personnelle (décision 0014). */
  monde_partage: z.boolean().optional(),
  contribution_min_pct: z.number().optional(),
  butin: butin.optional(),
  phases: z
    .array(
      z.strictObject({
        pv_pct: z.tuple([z.number(), z.number()]),
        /** Sprite propre à la phase (ex. singe géant). */
        sprite: sprite.optional(),
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
    type: z.enum(["depart", "quete", "niveau", "heros"]),
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
  disponibilite: disponibilite.optional(),
  /** Effet de superposition à jouer sur la planche de la forme de base (ex. éclairs du Super Saiyan 2). */
  effet_visuel: z.string().optional(),
  /** Héros qui la possèdent (information ; la fiche du héros fait foi). */
  heros: z.array(id).optional(),
});

// ---------- Objet ----------
export const objet = z.strictObject({
  ...enTete,
  emplacement: z.enum(["tete", "torse", "gants", "bottes", "accessoire", "consommable", "quete", "evolution"]),
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
  /** Propriété de zone pour le PvP (décision 0024) : « aucun » (villes), « duel » (duels sur invitation), « libre » (PvP libre, après la bêta). */
  pvp: z.enum(["aucun", "duel", "libre"]).optional(),
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

export type ModificateursHeros = z.infer<typeof modificateursHeros>;
export type Quete = z.infer<typeof quete>;
export type Monstre = z.infer<typeof monstre>;
export type Boss = z.infer<typeof boss>;
export type Objet = z.infer<typeof objet>;
