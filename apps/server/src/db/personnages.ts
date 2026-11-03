import { eq } from "drizzle-orm";
import type { Stats } from "@dbz/shared";
import type { Donnees } from "../donnees.js";
import type { Personnage } from "../regles/types.js";
import type { Base } from "./connexion.js";
import { personnages } from "./schema.js";

const PALETTES = ["orange", "bleu", "vert"];

/** Charge le personnage d'un compte, ou le crée au point d'arrivée de la première zone. */
export function chargerOuCreer(db: Base, d: Donnees, compteId: number, pseudo: string): Personnage {
  let ligne = db.select().from(personnages).where(eq(personnages.compteId, compteId)).get();
  if (!ligne) {
    const depart = d.formules.points.depart_par_stat;
    const arrivee = d.arriveeInitiale();
    db.insert(personnages)
      .values({
        compteId,
        niveau: 1,
        xp: 0,
        vitalite: depart,
        force: depart,
        puissance: depart,
        agilite: depart,
        energie: depart,
        pointsLibres: 0,
        // la création de personnage (3 palettes au choix) arrive au jalon 6 : en attendant, une palette par compte
        palette: PALETTES[compteId % PALETTES.length]!,
        map: arrivee.map,
        spawn: arrivee.spawn,
        x: null,
        y: null,
        majLe: Date.now(),
      })
      .run();
    ligne = db.select().from(personnages).where(eq(personnages.compteId, compteId)).get()!;
  }
  const stats: Stats = { vitalite: ligne.vitalite, force: ligne.force, puissance: ligne.puissance, agilite: ligne.agilite, energie: ligne.energie };
  return {
    compteId,
    pseudo,
    palette: ligne.palette,
    niveau: ligne.niveau,
    xp: ligne.xp,
    stats,
    pointsLibres: ligne.pointsLibres,
    map: ligne.map,
    spawn: ligne.spawn,
    x: ligne.x,
    y: ligne.y,
  };
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
      map: p.map,
      spawn: p.spawn,
      x: position?.x ?? null,
      y: position?.y ?? null,
      majLe: Date.now(),
    })
    .where(eq(personnages.compteId, p.compteId))
    .run();
}
