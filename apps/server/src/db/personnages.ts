import { and, asc, eq } from "drizzle-orm";
import type { Stats } from "@dbz/shared";
import type { Donnees } from "../donnees.js";
import type { Personnage } from "../regles/types.js";
import type { Base } from "./connexion.js";
import { personnages } from "./schema.js";

export const EMPLACEMENTS_MAX = 5;
const NOM = /^[A-Za-z0-9_-]{3,16}$/;

type Ligne = typeof personnages.$inferSelect;

/** Résumé d'un emplacement pour l'écran de sélection. */
export interface Emplacement {
  emplacement: number;
  id: number;
  nom: string;
  heros: string;
  apparence: string;
  rarete: number;
  niveau: number;
  map: string;
}

export class ErreurPersonnage extends Error {
  constructor(
    readonly statut: number,
    message: string,
  ) {
    super(message);
  }
}

function enPersonnage(ligne: Ligne, pseudo: string): Personnage {
  const stats: Stats = { vitalite: ligne.vitalite, force: ligne.force, puissance: ligne.puissance, agilite: ligne.agilite, energie: ligne.energie };
  return {
    id: ligne.id,
    compteId: ligne.compteId,
    pseudo,
    nom: ligne.nom,
    heros: ligne.heros,
    apparence: ligne.apparence,
    rarete: ligne.rarete,
    // TRANSITION : le client actuel choisit encore une planche par « palette » ; les héros arrivent avec les écrans
    palette: "orange",
    niveau: ligne.niveau,
    xp: ligne.xp,
    stats,
    pointsLibres: ligne.pointsLibres,
    zenies: ligne.zenies,
    map: ligne.map,
    spawn: ligne.spawn,
    x: ligne.x,
    y: ligne.y,
  };
}

const enEmplacement = (l: Ligne): Emplacement => ({
  emplacement: l.emplacement,
  id: l.id,
  nom: l.nom,
  heros: l.heros,
  apparence: l.apparence,
  rarete: l.rarete,
  niveau: l.niveau,
  map: l.map,
});

export function listerEmplacements(db: Base, compteId: number): (Emplacement | null)[] {
  const lignes = db.select().from(personnages).where(eq(personnages.compteId, compteId)).orderBy(asc(personnages.emplacement)).all();
  return Array.from({ length: EMPLACEMENTS_MAX }, (_, i) => {
    const l = lignes.find((x) => x.emplacement === i + 1);
    return l ? enEmplacement(l) : null;
  });
}

/** Crée un personnage dans un emplacement libre ; vérifie le héros, l'apparence, le nom et l'emplacement. */
export function creerPersonnage(
  db: Base,
  d: Donnees,
  compteId: number,
  saisie: { emplacement: number; nom: string; heros: string; apparence: string },
): Emplacement {
  if (!Number.isInteger(saisie.emplacement) || saisie.emplacement < 1 || saisie.emplacement > EMPLACEMENTS_MAX) {
    throw new ErreurPersonnage(400, `Emplacement de 1 à ${EMPLACEMENTS_MAX}.`);
  }
  if (!NOM.test(saisie.nom)) throw new ErreurPersonnage(400, "Nom : 3 à 16 caractères (lettres, chiffres, _ et -).");
  const fiche = d.heros.get(saisie.heros);
  if (!fiche || fiche.disponibilite !== "beta" || fiche.statut !== "valide") throw new ErreurPersonnage(400, "Héros inconnu ou indisponible.");
  if (!fiche.apparences?.some((a) => a.id === saisie.apparence)) throw new ErreurPersonnage(400, "Apparence inconnue pour ce héros.");
  const depart = d.formules.points.depart_par_stat;
  const arrivee = d.arriveeInitiale();
  const maintenant = Date.now();
  try {
    const l = db
      .insert(personnages)
      .values({
        compteId,
        emplacement: saisie.emplacement,
        nom: saisie.nom,
        heros: saisie.heros,
        apparence: saisie.apparence,
        rarete: fiche.rarete_depart ?? 1,
        niveau: 1,
        xp: 0,
        vitalite: depart,
        force: depart,
        puissance: depart,
        agilite: depart,
        energie: depart,
        pointsLibres: 0,
        zenies: 0,
        map: arrivee.map,
        spawn: arrivee.spawn,
        x: null,
        y: null,
        creeLe: maintenant,
        majLe: maintenant,
      })
      .returning()
      .get();
    return enEmplacement(l);
  } catch (e) {
    if (String(e).includes("UNIQUE")) throw new ErreurPersonnage(409, "Cet emplacement est déjà pris.");
    throw e;
  }
}

/** Supprime un personnage du compte (inventaire et équipement partent avec lui). */
export function supprimerPersonnage(db: Base, compteId: number, personnageId: number): boolean {
  return db.delete(personnages).where(and(eq(personnages.id, personnageId), eq(personnages.compteId, compteId))).run().changes > 0;
}

/** Personnage à jouer : celui demandé, qui doit appartenir au compte. Ne crée jamais rien. */
export function chargerPersonnage(db: Base, compteId: number, pseudo: string, personnageId: number): Personnage {
  const ligne = db
    .select()
    .from(personnages)
    .where(and(eq(personnages.id, personnageId), eq(personnages.compteId, compteId)))
    .get();
  if (!ligne) throw new ErreurPersonnage(404, "Personnage introuvable.");
  return enPersonnage(ligne, pseudo);
}

/**
 * TRANSITION (jalon 5, à supprimer dès que l'écran de création existe) : sans choix, premier emplacement occupé,
 * et création d'office de Son Goku pour un compte sans personnage. Dans la bêta, chaque joueur choisit son héros
 * à la création et son personnage à chaque connexion ; un compte sans personnage arrive sur l'écran de création.
 */
export function chargerOuCreer(db: Base, d: Donnees, compteId: number, pseudo: string, personnageId?: number): Personnage {
  if (personnageId !== undefined) return chargerPersonnage(db, compteId, pseudo, personnageId);
  let ligne = db.select().from(personnages).where(eq(personnages.compteId, compteId)).orderBy(asc(personnages.emplacement)).get();
  if (!ligne) {
    creerPersonnage(db, d, compteId, { emplacement: 1, nom: pseudo, heros: "goku", apparence: "normale" });
    ligne = db.select().from(personnages).where(eq(personnages.compteId, compteId)).get()!;
  }
  return enPersonnage(ligne, pseudo);
}

export function sauver(db: Base, p: Personnage, position: { x: number; y: number } | null) {
  db.update(personnages)
    .set({
      niveau: p.niveau,
      xp: p.xp,
      vitalite: p.stats.vitalite,
      force: p.stats.force,
      puissance: p.stats.puissance,
      agilite: p.stats.agilite,
      energie: p.stats.energie,
      pointsLibres: p.pointsLibres,
      zenies: p.zenies,
      map: p.map,
      spawn: p.spawn,
      x: position?.x ?? null,
      y: position?.y ?? null,
      majLe: Date.now(),
    })
    .where(eq(personnages.id, p.id))
    .run();
}
