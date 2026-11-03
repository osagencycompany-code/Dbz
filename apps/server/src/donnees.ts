import { readFileSync, readdirSync, watch, type FSWatcher } from "node:fs";
import { join } from "node:path";
import {
  balanceCombat,
  balanceFormules,
  balanceMonde,
  balanceMonstres,
  balanceProgression,
  lireCarte,
  monstre,
  type BalanceCombat,
  type BalanceFormules,
  type BalanceMonde,
  type BalanceMonstres,
  type BalanceProgression,
  type Carte,
} from "@dbz/shared";
import type { z } from "zod";
import { racine } from "./config.js";

export type FicheMonstre = z.infer<typeof monstre>;

const lire = (chemin: string): unknown => JSON.parse(readFileSync(join(racine, chemin), "utf8"));

/**
 * Toutes les données de jeu lues dans data/ et maps/. En développement, `surveiller()` recharge
 * les valeurs d'équilibrage dès que le fichier change (aucune valeur d'équilibrage n'est dans le code).
 */
export class Donnees {
  formules!: BalanceFormules;
  progression!: BalanceProgression;
  monstres!: BalanceMonstres;
  monde!: BalanceMonde;
  combat!: BalanceCombat;
  mobs = new Map<string, FicheMonstre>();
  private cartes = new Map<string, Carte>();
  private surveillants: FSWatcher[] = [];

  constructor() {
    this.recharger();
  }

  recharger() {
    this.formules = balanceFormules.parse(lire("data/balance/formules.json"));
    this.progression = balanceProgression.parse(lire("data/balance/progression.json"));
    this.monstres = balanceMonstres.parse(lire("data/balance/monstres.json"));
    this.monde = balanceMonde.parse(lire("data/balance/monde.json"));
    this.combat = balanceCombat.parse(lire("data/balance/combat.json"));
    this.mobs.clear();
    for (const f of readdirSync(join(racine, "data", "mobs")).filter((n) => n.endsWith(".json"))) {
      const fiche = monstre.parse(lire(`data/mobs/${f}`));
      this.mobs.set(fiche.id, fiche);
    }
  }

  /** Recharge à chaud les fichiers de data/balance et data/mobs ; les erreurs de saisie sont affichées sans arrêter le serveur. */
  surveiller() {
    for (const dossier of ["data/balance", "data/mobs"]) {
      let attente: NodeJS.Timeout | undefined;
      this.surveillants.push(
        watch(join(racine, dossier), () => {
          clearTimeout(attente);
          attente = setTimeout(() => {
            try {
              this.recharger();
              console.log(`Données rechargées (${dossier})`);
            } catch (e) {
              console.error("Rechargement des données impossible :", e instanceof Error ? e.message : e);
            }
          }, 200);
        }),
      );
    }
  }

  arreter() {
    for (const s of this.surveillants) s.close();
    this.surveillants = [];
  }

  carte(id: string): Carte {
    let c = this.cartes.get(id);
    if (!c) {
      c = lireCarte(lire(`maps/${id}.tmj`));
      this.cartes.set(id, c);
    }
    return c;
  }

  /** Map et point d'arrivée d'un nouveau personnage (fiche de la première zone). */
  arriveeInitiale(): { map: string; spawn: string } {
    const zone = lire("data/zones/ile-de-roshi.json") as { arrivee: { map: string; spawn: string } };
    return { map: zone.arrivee.map.replace(/^maps\//, "").replace(/\.tmj$/, ""), spawn: zone.arrivee.spawn };
  }
}
