/**
 * Commandes d'administration (spec §11). Elles n'existent que côté serveur : le client envoie une ligne de texte
 * sans rien savoir des commandes. Une commande n'est exécutée que si le compte a `role = 'admin'` en base ET
 * si ADMIN_COMMANDS=on ; chaque tentative est journalisée (qui, quoi, quand, résultat).
 */
import { boiteLibre, type Boite, type Carte } from "@dbz/shared";
import { eq } from "drizzle-orm";
import type { Base } from "../db/connexion.js";
import { comptes } from "../db/schema.js";
import type { Donnees } from "../donnees.js";
import type { Monde } from "../regles/monde.js";
import type { Joueur } from "../regles/types.js";
import { mapsDesZones } from "../salles.js";

export const MESSAGE_INCONNUE = "Commande inconnue.";
const PAS_RECHERCHE_PX = 8; // ok-nombre
const RAYON_RECHERCHE_MAX_PX = 160; // ok-nombre
const DECALAGE_BOSS_PX = 70; // ok-nombre

export interface ContexteCommande {
  db: Base;
  d: Donnees;
  commandesActives: boolean;
  compteId: number;
  monde: Monde;
  joueur: Joueur;
  /** Téléporte vers une autre map (la salle s'en charge) ou, si c'est la même, déplace sur place. */
  teleporter(map: string, destination: { spawn: string } | { x: number; y: number }): void;
}

function journaliser(ctx: ContexteCommande, pseudo: string, texte: string, autorise: boolean, resultat: string) {
  ctx.db.$client
    .prepare("INSERT INTO journal_admin (quand, compte_id, pseudo, commande, autorise, resultat) VALUES (?, ?, ?, ?, ?, ?)")
    .run(Date.now(), ctx.compteId, pseudo, texte.slice(0, 200), autorise ? 1 : 0, resultat.slice(0, 200)); // ok-nombre
}

/** Retrouve une map par son identifiant complet, son nom de salle ou la fin de son nom (« foret-nord »). */
export function trouverMap(nom: string, maps: string[] = mapsDesZones()): string | string[] {
  const n = nom.toLowerCase();
  const exact = maps.find((m) => m.toLowerCase() === n || m.replaceAll("/", "-").toLowerCase() === n);
  if (exact) return exact;
  const candidates = maps.filter((m) => m.replaceAll("/", "-").toLowerCase().endsWith(n) || m.toLowerCase().split("/").includes(n));
  return candidates.length === 1 ? candidates[0]! : candidates;
}

/** Position libre la plus proche (spirale de carrés) autour d'un point. */
export function positionLibreProche(carte: Carte, boite: Boite, x: number, y: number): { x: number; y: number } | null {
  for (let r = 0; r <= RAYON_RECHERCHE_MAX_PX; r += PAS_RECHERCHE_PX) {
    for (let dy = -r; dy <= r; dy += PAS_RECHERCHE_PX) {
      for (let dx = -r; dx <= r; dx += PAS_RECHERCHE_PX) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (boiteLibre(carte.grille, boite, x + dx, y + dy)) return { x: x + dx, y: y + dy };
      }
    }
  }
  return null;
}

function nombre(v: string | undefined): number | null {
  if (v === undefined || !/^-?\d+$/.test(v)) return null;
  return Number(v);
}

/** Exécute une ligne saisie par un joueur et renvoie le texte à lui afficher. */
export function executerCommande(ctx: ContexteCommande, texte: string): string {
  const ligne = texte.trim();
  const compte = ctx.db.select().from(comptes).where(eq(comptes.id, ctx.compteId)).get();
  const pseudo = compte?.pseudo ?? "?";
  const autorise = ctx.commandesActives && compte?.role === "admin" && ligne.startsWith("/");
  if (!autorise) {
    // même réponse que pour une commande qui n'existe pas : on ne révèle rien
    journaliser(ctx, pseudo, ligne, false, MESSAGE_INCONNUE);
    return MESSAGE_INCONNUE;
  }
  const [nom = "", ...args] = ligne.slice(1).split(/\s+/);
  const resultat = lancer(ctx, nom.toLowerCase(), args);
  journaliser(ctx, pseudo, ligne, true, resultat);
  return resultat;
}

function lancer(ctx: ContexteCommande, nom: string, args: string[]): string {
  const { monde, joueur: j, d } = ctx;
  switch (nom) {
    case "tp": {
      if (!args[0]) return "Usage : /tp <map> [point d'arrivée]. Ex. : /tp foret-nord";
      const m = trouverMap(args[0]);
      if (Array.isArray(m)) return m.length === 0 ? `Map inconnue. Maps : ${mapsDesZones().join(", ")}` : `Plusieurs maps correspondent : ${m.join(", ")}`;
      const carte = d.carte(m);
      const spawns = carte.objets.filter((o) => o.type === "spawn");
      const voulu = args[1] ? spawns.find((s) => s.nom === args[1]) : (spawns.find((s) => s.nom === "arrivee") ?? spawns[0]);
      if (!voulu) return `Point d'arrivée inconnu. Points de ${m} : ${spawns.map((s) => s.nom).join(", ")}`;
      ctx.teleporter(m, { spawn: voulu.nom });
      return `Téléportation vers ${m} (${voulu.nom}).`;
    }
    case "niveau": {
      const n = nombre(args[0]);
      if (n === null || n < 1) return `Usage : /niveau <1-${d.progression.niveau_max}>`;
      monde.fixerNiveau(j, n);
      return `Niveau ${j.perso.niveau}.`;
    }
    case "xp": {
      const n = nombre(args[0]);
      if (n === null || n < 0) return "Usage : /xp <nombre>";
      monde.crediterXp(j, n);
      return `+${n} XP (niveau ${j.perso.niveau}).`;
    }
    case "soin":
      monde.soigner(j);
      return "PV restaurés.";
    case "invincible":
      j.invincible = !j.invincible;
      return j.invincible ? "Invincibilité activée." : "Invincibilité désactivée.";
    case "ki":
      // pas encore de ki dans le jeu (techniques : jalon 5) : la commande existe déjà pour la suite
      return "Le ki n'existe pas encore (techniques : prochain jalon).";
    case "boss": {
      const id = args[0]?.toLowerCase();
      if (id !== "raditz" && id !== "nappa") return "Usage : /boss <raditz|nappa>";
      for (const map of mapsDesZones()) {
        const carte = d.carte(map);
        const o = carte.objets.find((x) => x.type === "boss" && x.props.boss === id);
        if (!o) continue;
        const p = positionLibreProche(carte, monde.boiteJoueur, o.x + o.largeur / 2, o.y + o.hauteur + DECALAGE_BOSS_PX);
        if (!p) return `Aucune place libre près de ${id}.`;
        ctx.teleporter(map, p);
        return `Téléportation devant ${id} (${map}). Le combat de boss n'est pas encore codé : tu arrives à son emplacement.`;
      }
      return `Boss « ${id} » introuvable sur les maps.`;
    }
    default:
      return MESSAGE_INCONNUE;
  }
}
