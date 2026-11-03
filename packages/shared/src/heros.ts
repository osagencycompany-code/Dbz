import type { Stats } from "./formulas.js";
import type { ModificateursHeros } from "./schemas/fiches.js";

/** Applique un pourcentage de bonus (positif) ou de malus (négatif) : 100 avec +15 → 115. */
export const appliquerPct = (valeur: number, pct: number | undefined): number => valeur * (1 + (pct ?? 0) / 100);

/** Statistiques effectives d'un héros : ses points répartis, modifiés en % par sa fiche (après la formule commune). */
export function statsEffectives(stats: Stats, mod: ModificateursHeros | undefined): Stats {
  return {
    vitalite: appliquerPct(stats.vitalite, mod?.vitalite_pct),
    force: appliquerPct(stats.force, mod?.force_pct),
    puissance: appliquerPct(stats.puissance, mod?.puissance_pct),
    agilite: appliquerPct(stats.agilite, mod?.agilite_pct),
    energie: appliquerPct(stats.energie, mod?.energie_pct),
  };
}

/** Sans groupe : le joueur reçoit l'XP s'il a infligé au moins `seuilPct` % des dégâts reçus par le monstre. */
export function contributionSuffisante(degatsJoueur: number, degatsTotaux: number, seuilPct: number): boolean {
  if (degatsJoueur <= 0 || degatsTotaux <= 0) return false;
  return (degatsJoueur / degatsTotaux) * 100 >= seuilPct;
}
