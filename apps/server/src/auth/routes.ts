import argon2 from "argon2";
import { eq } from "drizzle-orm";
import express, { type Request, type Response } from "express";
import { z } from "zod";
import type { Base } from "../db/connexion.js";
import { comptes, invitations } from "../db/schema.js";
import { chargerOuCreer, chargerPersonnage, creerPersonnage, ErreurPersonnage, listerEmplacements, supprimerPersonnage } from "../db/personnages.js";
import type { Donnees } from "../donnees.js";
import { nomSalle } from "../salles.js";
import { creerJeton, verifierJeton } from "./jeton.js";

const pseudo = z.string().regex(/^[A-Za-z0-9_-]{3,16}$/, "3 à 16 caractères : lettres, chiffres, _ et -");
const inscription = z.object({
  email: z.string().email().max(254),
  pseudo,
  motDePasse: z.string().min(8, "8 caractères minimum").max(128),
  cle: z.string().min(1, "clé d'invitation obligatoire"),
});
const connexion = z.object({ pseudo: z.string(), motDePasse: z.string() });

const FENETRE_MS = 60_000;

/** Limiteur simple en mémoire : au plus `essaisMax` tentatives par minute et par adresse. */
function limiteur(essaisMax: number) {
  const essais = new Map<string, { n: number; debut: number }>();
  return (req: Request, res: Response, suite: () => void) => {
    const cle = req.ip ?? "?";
    const maintenant = Date.now();
    const e = essais.get(cle);
    if (!e || maintenant - e.debut > FENETRE_MS) essais.set(cle, { n: 1, debut: maintenant });
    else if (++e.n > essaisMax) {
      res.status(429).json({ erreur: "Trop de tentatives, réessaie dans une minute." });
      return;
    }
    suite();
  };
}

export function routesAuth(db: Base, secret: string, essaisMax: number, donnees?: Donnees) {
  const routeur = express.Router();
  routeur.use(express.json({ limit: "4kb" }));
  const limite = limiteur(essaisMax);

  routeur.post("/inscription", limite, async (req, res) => {
    const saisie = inscription.safeParse(req.body);
    if (!saisie.success) {
      res.status(400).json({ erreur: saisie.error.issues.map((i) => i.message).join(" ; ") });
      return;
    }
    const { email, pseudo: nom, motDePasse, cle } = saisie.data;
    const hash = await argon2.hash(motDePasse);
    try {
      // Tout dans une transaction : la clé n'est consommée que si le compte est créé.
      const compteId = db.$client.transaction(() => {
        const invitation = db.select().from(invitations).where(eq(invitations.cle, cle)).get();
        if (!invitation || invitation.utiliseePar !== null) throw new ErreurMetier(403, "Clé d'invitation invalide ou déjà utilisée.");
        const maintenant = Date.now();
        const compte = db
          .insert(comptes)
          .values({ email: email.toLowerCase(), pseudo: nom, motDePasse: hash, creeLe: maintenant })
          .returning({ id: comptes.id })
          .get();
        db.update(invitations).set({ utiliseePar: compte.id, utiliseeLe: maintenant }).where(eq(invitations.cle, cle)).run();
        return compte.id;
      })();
      res.status(201).json({ jeton: creerJeton(compteId, secret), pseudo: nom });
    } catch (e) {
      if (e instanceof ErreurMetier) res.status(e.statut).json({ erreur: e.message });
      else if (String(e).includes("UNIQUE")) res.status(409).json({ erreur: "Pseudo ou e-mail déjà utilisé." });
      else throw e;
    }
  });

  routeur.post("/connexion", limite, async (req, res) => {
    const saisie = connexion.safeParse(req.body);
    const compte = saisie.success ? db.select().from(comptes).where(eq(comptes.pseudo, saisie.data.pseudo)).get() : undefined;
    // Même message pour pseudo inconnu et mauvais mot de passe.
    if (!saisie.success || !compte || !(await argon2.verify(compte.motDePasse, saisie.data.motDePasse))) {
      res.status(401).json({ erreur: "Pseudo ou mot de passe incorrect." });
      return;
    }
    res.json({ jeton: creerJeton(compte.id, secret), pseudo: compte.pseudo });
  });

  const authentifier = (req: Request) => {
    const id = verifierJeton(req.headers.authorization?.replace(/^Bearer /, ""), secret);
    return id === null ? undefined : db.select().from(comptes).where(eq(comptes.id, id)).get();
  };

  routeur.get("/moi", (req, res) => {
    const compte = authentifier(req);
    if (!compte) res.status(401).json({ erreur: "Non connecté." });
    else res.json({ pseudo: compte.pseudo, email: compte.email });
  });

  /** TRANSITION (voir `chargerOuCreer`) : salle du premier emplacement, Goku créé s'il n'y a aucun personnage. */
  routeur.get("/personnage", (req, res) => {
    const compte = authentifier(req);
    if (!compte || !donnees) {
      res.status(401).json({ erreur: "Non connecté." });
      return;
    }
    const p = chargerOuCreer(db, donnees, compte.id, compte.pseudo);
    res.json({ id: p.id, nom: p.nom, heros: p.heros, apparence: p.apparence, map: p.map, salle: nomSalle(p.map), niveau: p.niveau });
  });

  /** Choisit le personnage à jouer (POST : le choix engage la connexion) ; renvoie la salle à rejoindre. */
  routeur.post("/personnages/:id/jouer", (req, res) => {
    const compte = authentifier(req);
    if (!compte) {
      res.status(401).json({ erreur: "Non connecté." });
      return;
    }
    try {
      const p = chargerPersonnage(db, compte.id, compte.pseudo, Number(req.params.id));
      res.json({ id: p.id, nom: p.nom, heros: p.heros, apparence: p.apparence, map: p.map, salle: nomSalle(p.map), niveau: p.niveau });
    } catch (e) {
      if (e instanceof ErreurPersonnage) res.status(e.statut).json({ erreur: e.message });
      else throw e;
    }
  });

  /** Les cinq emplacements du compte (null = libre). */
  routeur.get("/personnages", (req, res) => {
    const compte = authentifier(req);
    if (!compte) {
      res.status(401).json({ erreur: "Non connecté." });
      return;
    }
    res.json({ emplacements: listerEmplacements(db, compte.id) });
  });

  /** Héros jouables proposés à la création (fiches validées et disponibles dans la bêta). */
  routeur.get("/heros", (req, res) => {
    if (!authentifier(req) || !donnees) {
      res.status(401).json({ erreur: "Non connecté." });
      return;
    }
    const liste = [...donnees.heros.values()]
      .filter((h) => h.disponibilite === "beta" && h.statut === "valide")
      .map((h) => ({
        id: h.id,
        nom: h.nom,
        role_combat: h.role_combat,
        rarete_depart: h.rarete_depart,
        modificateurs: h.modificateurs ?? {},
        passif: h.passif ? { nom: h.passif.nom, description: h.passif.description } : null,
        apparences: (h.apparences ?? []).map((a) => ({ id: a.id, nom: a.nom })),
      }));
    res.json({ heros: liste });
  });

  const creation = z.object({ emplacement: z.number().int(), nom: z.string(), heros: z.string(), apparence: z.string() });
  routeur.post("/personnages", (req, res) => {
    const compte = authentifier(req);
    if (!compte || !donnees) {
      res.status(401).json({ erreur: "Non connecté." });
      return;
    }
    const saisie = creation.safeParse(req.body);
    if (!saisie.success) {
      res.status(400).json({ erreur: "Saisie invalide." });
      return;
    }
    try {
      res.status(201).json(creerPersonnage(db, donnees, compte.id, saisie.data));
    } catch (e) {
      if (e instanceof ErreurPersonnage) res.status(e.statut).json({ erreur: e.message });
      else throw e;
    }
  });

  routeur.delete("/personnages/:id", (req, res) => {
    const compte = authentifier(req);
    if (!compte) {
      res.status(401).json({ erreur: "Non connecté." });
      return;
    }
    const id = Number(req.params.id);
    // la suppression est définitive : le nom du personnage doit être répété
    const nom = z.object({ nom: z.string() }).safeParse(req.body);
    const ligne = Number.isInteger(id) ? listerEmplacements(db, compte.id).find((e) => e?.id === id) : undefined;
    if (!ligne) {
      res.status(404).json({ erreur: "Personnage introuvable." });
      return;
    }
    if (!nom.success || nom.data.nom !== ligne.nom) {
      res.status(400).json({ erreur: "Répète le nom du personnage pour confirmer la suppression." });
      return;
    }
    supprimerPersonnage(db, compte.id, id);
    res.status(204).end();
  });

  /** Suppression de compte (données personnelles) : exige le mot de passe. */
  routeur.delete("/compte", limite, async (req, res) => {
    const compte = authentifier(req);
    if (!compte) {
      res.status(401).json({ erreur: "Non connecté." });
      return;
    }
    const mdp = z.object({ motDePasse: z.string() }).safeParse(req.body);
    if (!mdp.success || !(await argon2.verify(compte.motDePasse, mdp.data.motDePasse))) {
      res.status(403).json({ erreur: "Mot de passe incorrect." });
      return;
    }
    db.delete(comptes).where(eq(comptes.id, compte.id)).run();
    res.status(204).end();
  });

  return routeur;
}

class ErreurMetier extends Error {
  constructor(
    readonly statut: number,
    message: string,
  ) {
    super(message);
  }
}
