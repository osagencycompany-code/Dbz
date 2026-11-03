import { z } from "zod";

/** Identifiant : minuscules, chiffres, tirets (égal au nom du fichier). */
export const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id en minuscules, chiffres et tirets");

export const statut = z.enum(["brouillon", "valide", "obsolete"]);

/** Champs communs à toutes les fiches de data/. */
export const enTete = {
  $schema: z.string().optional(),
  id,
  nom: z.string().min(1),
  statut,
  a_verifier: z.string().optional(),
  notes: z.string().optional(),
};

export const sprite = z
  .strictObject({
    source: z.enum(["dbz-online", "buus-fury", "legacy-of-goku-2", "maison", "a-creer", "a-choisir"]),
    fichier: z.string().nullable(),
    format: z.string(),
    /** Créatures animées de Legacy of Goku 2 : taille d'une case, variante de couleur (0 = base) et correspondance d'animations. */
    cadre: z.number().int().optional(),
    variante: z.number().int().min(0).optional(),
    animations: z.string().optional(),
  })
  .nullable();

export const butin = z.array(
  z.strictObject({
    objet: z.string(),
    chance: z.number().min(0).max(1),
  }),
);

export const intervalleNiveaux = z.tuple([z.number().int().min(1), z.number().int().min(1)]);

export const statNom = z.enum(["vitalite", "force", "puissance", "agilite", "energie"]);
export type StatNom = z.infer<typeof statNom>;
