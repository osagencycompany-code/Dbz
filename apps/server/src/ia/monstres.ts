/**
 * Intelligence des monstres (poursuite, meute, charge, bond, attaque de zone annoncée).
 * Aucune valeur en dur : portées, durées et recharges viennent de data/balance/monde.json
 * et de la fiche du monstre (data/mobs/*.json).
 */
import { deplacer, directionDepuisVecteur } from "@dbz/shared";
import type { Monde } from "../regles/monde.js";
import type { Joueur, Monstre } from "../regles/types.js";

type Comportement = Record<string, unknown> & { attaque_zone?: { nom?: string; annonce_s?: number } };

const nombre = (v: unknown, repli = 0): number => (typeof v === "number" ? v : repli);

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function aggroPx(w: Monde, m: Monstre): number {
  const c = m.fiche.comportement as Comportement;
  return nombre(c.aggro_px, w.d.monde.aggro_px[m.rang]);
}

function cibleDe(w: Monde, m: Monstre): Joueur | undefined {
  const j = m.cibleId ? w.joueurs.get(m.cibleId) : undefined;
  return j && !j.ko ? j : undefined;
}

function joueurLePlusProche(w: Monde, m: Monstre, rayon: number): Joueur | undefined {
  let meilleur: Joueur | undefined;
  let dMin = rayon;
  for (const j of w.joueurs.values()) {
    if (j.ko) continue;
    const d = distance(m, j);
    if (d <= dMin) {
      dMin = d;
      meilleur = j;
    }
  }
  return meilleur;
}

/** Avance vers un point ; renvoie la distance restante. Les murs arrêtent le monstre (pas de recherche de chemin au jalon 4). */
function avancerVers(w: Monde, m: Monstre, cx: number, cy: number, vitesse: number, dt: number): number {
  const dx = cx - m.x;
  const dy = cy - m.y;
  const d = Math.hypot(dx, dy);
  if (d === 0) return 0;
  const pas = Math.min(d, vitesse * dt);
  const r = deplacer(w.carte.grille, w.boiteMonstre, m.x, m.y, (dx / d) * pas, (dy / d) * pas);
  m.x = r.x;
  m.y = r.y;
  m.dir = directionDepuisVecteur(dx, dy, m.dir);
  return d - pas;
}

function annoncer(w: Monde, m: Monstre, attaque: string, duree: number) {
  m.etat = "annonce";
  m.attaqueAnnoncee = attaque;
  m.etatJusqua = w.t + duree;
  w.rappels.evenement({ type: "annonce", monstre: m.id, attaque });
}

function prendreCible(w: Monde, m: Monstre, j: Joueur) {
  m.cibleId = j.id;
  m.etat = "poursuite";
  const c = m.fiche.comportement as Comportement;
  if (c.type !== "meute") return;
  for (const autre of w.monstres.values()) {
    if (autre === m || autre.fiche.id !== m.fiche.id || autre.etat !== "errance") continue;
    if (distance(autre, m) <= w.d.monde.ia.meute_alerte_px) {
      autre.cibleId = j.id;
      autre.etat = "poursuite";
    }
  }
}

export function penserMonstre(w: Monde, m: Monstre, dt: number) {
  const c = m.fiche.comportement as Comportement;
  if (c.type === "immobile") return;
  const ia = w.d.monde.ia;

  switch (m.etat) {
    case "errance": {
      const j = joueurLePlusProche(w, m, aggroPx(w, m));
      if (j) return prendreCible(w, m, j);
      if (c.type === "meute") {
        const frere = [...w.monstres.values()].find(
          (a) => a !== m && a.fiche.id === m.fiche.id && a.etat === "poursuite" && a.cibleId && distance(a, m) <= ia.meute_alerte_px,
        );
        const cible = frere?.cibleId ? w.joueurs.get(frere.cibleId) : undefined;
        if (cible && !cible.ko) return prendreCible(w, m, cible);
      }
      if (w.t < m.pauseJusqua) return;
      if (!m.destination) {
        const a = w.alea() * Math.PI * 2;
        const r = w.alea() * ia.errance_rayon_px;
        m.destination = { x: m.maison.x + Math.cos(a) * r, y: m.maison.y + Math.sin(a) * r };
      }
      const reste = avancerVers(w, m, m.destination.x, m.destination.y, m.vitesse * ia.errance_vitesse_facteur, dt);
      if (reste <= 1) {
        m.destination = null;
        const [lo, hi] = ia.errance_pause_s;
        m.pauseJusqua = w.t + lo + w.alea() * (hi - lo);
      }
      return;
    }

    case "poursuite": {
      const j = cibleDe(w, m);
      if (!j || distance(m, j) > aggroPx(w, m) * ia.abandon_facteur_aggro) {
        m.cibleId = null;
        m.etat = "retour";
        return;
      }
      const d = distance(m, j);
      m.dir = directionDepuisVecteur(j.x - m.x, j.y - m.y, m.dir);
      if (d <= ia.attaque_portee_px && w.t >= m.prochaineAttaque) return annoncer(w, m, "contact", ia.attaque_annonce_s);
      if (c.attaque_zone && d <= ia.zone_declenchement_px && w.t >= m.prochaineCapacite) {
        return annoncer(w, m, "zone", nombre(c.attaque_zone.annonce_s));
      }
      if (c.type === "charge" && d <= ia.charge_declenchement_px && d > ia.attaque_portee_px && w.t >= m.prochaineCapacite) {
        return annoncer(w, m, "charge", ia.charge_annonce_s);
      }
      if (c.type === "bond" && d <= ia.bond_declenchement_px && d > ia.attaque_portee_px && w.t >= m.prochaineCapacite) {
        return annoncer(w, m, "bond", ia.attaque_annonce_s);
      }
      if (d > ia.attaque_portee_px) avancerVers(w, m, j.x, j.y, m.vitesse, dt);
      return;
    }

    case "annonce": {
      const j = cibleDe(w, m);
      if (j) m.dir = directionDepuisVecteur(j.x - m.x, j.y - m.y, m.dir);
      if (w.t < m.etatJusqua) return;
      if (m.attaqueAnnoncee === "zone") {
        for (const p of w.joueurs.values()) if (distance(m, p) <= ia.zone_rayon_px) w.blesserJoueur(p, m);
        m.prochaineCapacite = w.t + ia.zone_recharge_s;
        m.etat = "poursuite";
      } else if (m.attaqueAnnoncee === "contact") {
        if (j && distance(m, j) <= ia.attaque_rayon_px) w.blesserJoueur(j, m);
        m.prochaineAttaque = w.t + ia.attaque_recharge_s;
        m.etat = "poursuite";
      } else if (!j) {
        m.etat = "retour";
      } else {
        const d = distance(m, j) || 1;
        m.vecteur = { x: (j.x - m.x) / d, y: (j.y - m.y) / d };
        m.aFrappe = false;
        const bond = m.attaqueAnnoncee === "bond";
        m.etat = bond ? "bond" : "charge";
        m.etatJusqua = w.t + (bond ? ia.bond_duree_s : ia.charge_duree_s);
      }
      return;
    }

    case "charge":
    case "bond": {
      const bond = m.etat === "bond";
      const vitesse = nombre(bond ? c.bond_px_s : c.charge_px_s);
      const avant = { x: m.x, y: m.y };
      const r = deplacer(w.carte.grille, w.boiteMonstre, m.x, m.y, m.vecteur.x * vitesse * dt, m.vecteur.y * vitesse * dt);
      m.x = r.x;
      m.y = r.y;
      if (!m.aFrappe) {
        for (const p of w.joueurs.values()) {
          if (distance(m, p) <= ia.attaque_rayon_px) {
            w.blesserJoueur(p, m);
            m.aFrappe = true;
            break;
          }
        }
      }
      const bloque = r.x === avant.x && r.y === avant.y;
      if (w.t >= m.etatJusqua || bloque) {
        m.etat = "poursuite";
        m.prochaineCapacite = w.t + (bond ? nombre(c.bond_recharge_s) : ia.charge_recharge_s);
      }
      return;
    }

    case "retour": {
      const reste = avancerVers(w, m, m.maison.x, m.maison.y, m.vitesse * ia.retour_vitesse_facteur, dt);
      if (reste <= 1) {
        m.pv = m.pvMax;
        m.etat = "errance";
        m.destination = null;
        m.contributeurs.clear();
      }
      return;
    }
  }
}
