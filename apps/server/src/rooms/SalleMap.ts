import { Room, ServerError, type Client } from "@colyseus/core";
import { MapSchema, Schema, type } from "@colyseus/schema";
import { puissanceAffichee, vitesseAvecModes, vitessePxS, xpRequise } from "@dbz/shared";
import { eq } from "drizzle-orm";
import { executerCommande } from "../admin/commandes.js";
import { verifierJeton } from "../auth/jeton.js";
import type { Base } from "../db/connexion.js";
import { chargerOuCreer, sauver } from "../db/personnages.js";
import { comptes } from "../db/schema.js";
import type { Donnees } from "../donnees.js";
import { Monde } from "../regles/monde.js";
import type { Evenement, Joueur as JoueurSim, Monstre as MonstreSim } from "../regles/types.js";
import { nomSalle } from "../salles.js";

export class JoueurEtat extends Schema {
  @type("string") id = "";
  @type("string") pseudo = "";
  @type("string") palette = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") dir = 0;
  @type("number") niveau = 1;
  @type("number") pv = 0;
  @type("number") pvMax = 0;
  @type("boolean") ko = false;
  @type("string") anim = "";
  /** Dernière entrée traitée : sert à la réconciliation de la prédiction côté client. */
  @type("number") seq = 0;
}

export class MonstreEtat extends Schema {
  @type("string") id = "";
  @type("string") fiche = "";
  @type("string") nom = "";
  @type("string") rang = "";
  @type("number") niveau = 1;
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") dir = 0;
  @type("number") pv = 0;
  @type("number") pvMax = 0;
  @type("string") etat = "";
  @type("string") annonce = "";
}

export class SalleEtat extends Schema {
  @type("string") map = "";
  @type({ map: JoueurEtat }) joueurs = new MapSchema<JoueurEtat>();
  @type({ map: MonstreEtat }) monstres = new MapSchema<MonstreEtat>();
}

/** Un compte ne peut être connecté qu'une fois : la connexion la plus récente remplace l'ancienne. */
export type SessionsActives = Map<number, { client: Client; salle: SalleMap }>;

export interface OptionsSalle {
  map: string;
  db: Base;
  secret: string;
  donnees: Donnees;
  sessions: SessionsActives;
  /** ADMIN_COMMANDS=on (la commande exige aussi le rôle admin en base). */
  commandesAdmin?: boolean;
  /** Générateur aléatoire (tests). */
  alea?: () => number;
}

const SAUVEGARDE_S = 30; // ok-nombre
const MS = 1000;

/** Une salle par map : relaie les intentions des clients vers la simulation et l'état vers les clients. */
export class SalleMap extends Room<SalleEtat> {
  private db!: Base;
  private secret = "";
  private d!: Donnees;
  private sessions!: SessionsActives;
  private commandesAdmin = false;
  monde!: Monde;
  private depuisSauvegarde = 0;

  override onCreate(options: OptionsSalle) {
    this.db = options.db;
    this.secret = options.secret;
    this.d = options.donnees;
    this.sessions = options.sessions;
    this.commandesAdmin = options.commandesAdmin === true;
    this.setState(new SalleEtat());
    this.state.map = options.map;
    // la map existe même sans joueur : les monstres gardent leur place et leurs PV entre deux visites
    this.autoDispose = false;
    const hz = this.d.combat.tic_serveur_hz;
    this.setPatchRate(MS / hz);
    this.monde = new Monde(
      options.map,
      this.d.carte(options.map),
      this.d,
      {
        evenement: (e, pour) => this.envoyerEvenement(e, pour),
        changerMap: (j, map, spawn) => this.changerMap(j, map, spawn),
      },
      options.alea,
    );
    for (const m of this.monde.monstres.values()) this.state.monstres.set(m.id, new MonstreEtat());
    this.setSimulationInterval(() => this.tic(), MS / hz);

    this.onMessage("entree", (client, e: { seq?: number; dx?: number; dy?: number; course?: boolean }) => this.monde.entree(client.sessionId, e ?? {}));
    // le client annonce qu'il a branché ses écouteurs : on évite de perdre les premiers messages
    this.onMessage("pret", (client) => {
      const j = this.monde.joueurs.get(client.sessionId);
      if (!j) return;
      client.send("bienvenue", { id: j.id, map: this.state.map, tic_hz: this.d.combat.tic_serveur_hz, boite: this.monde.boiteJoueur, boiteMonstre: this.monde.boiteMonstre });
      this.envoyerProfil(client);
    });
    this.onMessage("commande", (client, texte: unknown) => {
      const j = this.monde.joueurs.get(client.sessionId);
      const compteId = (client.userData as { compteId?: number } | undefined)?.compteId;
      if (!j || compteId === undefined || typeof texte !== "string") return;
      const reponse = executerCommande(
        {
          db: this.db,
          d: this.d,
          commandesActives: this.commandesAdmin,
          compteId,
          monde: this.monde,
          joueur: j,
          teleporter: (map, dest) => this.teleporter(j, map, dest),
        },
        texte,
      );
      client.send("message", { texte: reponse });
    });
    this.onMessage("attaquer", (client) => this.monde.attaquer(client.sessionId));
    this.onMessage("depenser", (client, r: Record<string, unknown>) => {
      if (this.monde.depenser(client.sessionId, r ?? {})) this.envoyerProfil(client);
    });
  }

  override async onAuth(_client: Client, options: { jeton?: string }) {
    const id = verifierJeton(options?.jeton, this.secret);
    const compte = id === null ? undefined : this.db.select().from(comptes).where(eq(comptes.id, id)).get();
    if (!compte) throw new ServerError(401, "Non authentifié");
    // le serveur décide de la map : on ne peut pas se téléporter en rejoignant une autre salle
    const perso = chargerOuCreer(this.db, this.d, compte.id, compte.pseudo);
    if (perso.map !== this.state.map) throw new ServerError(403, "Ce personnage n'est pas sur cette map");
    return { compteId: compte.id, pseudo: compte.pseudo };
  }

  override onJoin(client: Client, _options: unknown, auth: { compteId: number; pseudo: string }) {
    const ancienne = this.sessions.get(auth.compteId);
    if (ancienne && ancienne.client !== client) {
      // un changement de map n'est pas une seconde connexion : l'ancienne salle est quittée normalement
      const enTransit = ancienne.salle.monde.joueurs.get(ancienne.client.sessionId)?.enTransit === true;
      ancienne.client.leave(enTransit ? undefined : 4000);
    }
    this.sessions.set(auth.compteId, { client, salle: this });

    const perso = chargerOuCreer(this.db, this.d, auth.compteId, auth.pseudo);
    const j = this.monde.ajouterJoueur(client.sessionId, perso);
    client.userData = { compteId: auth.compteId };
    const e = new JoueurEtat();
    e.id = j.id;
    e.pseudo = perso.pseudo;
    e.palette = perso.palette;
    this.copier(j, e);
    this.state.joueurs.set(j.id, e);
  }

  override onLeave(client: Client) {
    const compteId = (client.userData as { compteId?: number } | undefined)?.compteId;
    const j = this.monde.joueurs.get(client.sessionId);
    if (compteId !== undefined && j && this.sessions.get(compteId)?.client === client) {
      this.sessions.delete(compteId);
      this.sauvegarder(j);
    }
    this.monde.retirerJoueur(client.sessionId);
    this.state.joueurs.delete(client.sessionId);
  }

  override onDispose() {
    for (const j of this.monde.joueurs.values()) this.sauvegarder(j);
  }

  // ----------------------------------------------------------------------------------------------

  private tic() {
    if (this.monde.joueurs.size === 0) return; // map vide : la simulation est en pause
    this.monde.tic();
    for (const j of this.monde.joueurs.values()) {
      const e = this.state.joueurs.get(j.id);
      if (e) this.copier(j, e);
      if (j.sale) {
        j.sale = false;
        const client = this.clients.find((c) => c.sessionId === j.id);
        if (client) this.envoyerProfil(client);
        this.sauvegarder(j);
      }
    }
    for (const m of this.monde.monstres.values()) {
      let e = this.state.monstres.get(m.id);
      if (!e) {
        e = new MonstreEtat();
        this.state.monstres.set(m.id, e);
      }
      this.copierMonstre(m, e);
    }
    this.depuisSauvegarde += this.monde.dt;
    if (this.depuisSauvegarde >= SAUVEGARDE_S) {
      this.depuisSauvegarde = 0;
      for (const j of this.monde.joueurs.values()) this.sauvegarder(j);
    }
  }

  private copier(j: JoueurSim, e: JoueurEtat) {
    e.x = j.x;
    e.y = j.y;
    e.dir = j.dir;
    e.niveau = j.perso.niveau;
    e.pv = Math.round(j.pv);
    e.pvMax = j.pvMax;
    e.ko = j.ko;
    e.anim = j.anim;
    e.seq = j.seq;
  }

  private copierMonstre(m: MonstreSim, e: MonstreEtat) {
    e.id = m.id;
    e.fiche = m.fiche.id;
    e.nom = m.fiche.nom;
    e.rang = m.rang;
    e.niveau = m.niveau;
    e.x = m.x;
    e.y = m.y;
    e.dir = m.dir;
    e.pv = Math.round(m.pv);
    e.pvMax = m.pvMax;
    e.etat = m.etat;
    e.annonce = m.etat === "annonce" ? m.attaqueAnnoncee : "";
  }

  /** Informations privées du joueur (stats, points, XP), envoyées à lui seul. */
  private envoyerProfil(client: Client) {
    const j = this.monde.joueurs.get(client.sessionId);
    if (!j) return;
    const f = this.d.formules;
    const marche = vitessePxS(f, j.perso.niveau, j.perso.stats.agilite);
    client.send("profil", {
      niveau: j.perso.niveau,
      xp: j.perso.xp,
      xpRequise: xpRequise(this.d.progression, j.perso.niveau),
      stats: j.perso.stats,
      pointsLibres: j.perso.pointsLibres,
      vitesse: marche,
      vitesseCourse: vitesseAvecModes(f, marche, { course: true }),
      puissance: Math.round(puissanceAffichee(f, j.perso.niveau, j.perso.stats)),
      pv: j.pv,
      pvMax: j.pvMax,
    });
  }

  private envoyerEvenement(e: Evenement, pour?: string) {
    if (pour) this.clients.find((c) => c.sessionId === pour)?.send("evt", e);
    else this.broadcast("evt", e);
  }

  private sauvegarder(j: JoueurSim) {
    // en transit, la position de départ (spawn ou coordonnées) est déjà fixée dans le personnage
    const enTransit = j.perso.x !== null && j.perso.y !== null ? { x: j.perso.x, y: j.perso.y } : null;
    sauver(this.db, j.perso, j.enTransit ? enTransit : { x: j.x, y: j.y });
  }

  /** Commande /tp : même map → on déplace sur place ; autre map → le client est envoyé vers l'autre salle. */
  private teleporter(j: JoueurSim, map: string, dest: { spawn: string } | { x: number; y: number }) {
    if (map === this.state.map) {
      const p = "spawn" in dest ? this.d.carte(map).objets.find((o) => o.type === "spawn" && o.nom === dest.spawn) : dest;
      if (p) this.monde.placer(j, p.x, p.y);
      return;
    }
    if ("spawn" in dest) return this.changerMap(j, map, dest.spawn);
    j.enTransit = true;
    j.perso.map = map;
    j.perso.spawn = null;
    j.perso.x = dest.x;
    j.perso.y = dest.y;
    sauver(this.db, j.perso, { x: dest.x, y: dest.y });
    this.clients.find((c) => c.sessionId === j.id)?.send("changer_map", { salle: nomSalle(map), map });
  }

  private changerMap(j: JoueurSim, map: string, spawn: string) {
    j.enTransit = true;
    j.perso.map = map;
    j.perso.spawn = spawn;
    j.perso.x = null;
    j.perso.y = null;
    sauver(this.db, j.perso, null);
    this.clients.find((c) => c.sessionId === j.id)?.send("changer_map", { salle: nomSalle(map), map });
  }
}
