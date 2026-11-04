import { boiteLibre, corpsSolides, deplacer, directionDepuisVecteur, lireCarte, rectBoite, type Carte, type Direction, type Rect } from "@dbz/shared";
import type { Room } from "colyseus.js";
import Phaser from "phaser";
import type { FenetrePersonnage, Profil } from "./fenetre-p.js";
import type { Bienvenue } from "./jeu.js";

export interface DonneesScene {
  room: Room;
  bienvenue: Bienvenue;
  profil: Record<string, unknown>;
  fenetre: FenetrePersonnage;
  allerVers: (salle: string) => void;
  /** Passe à vrai quand on quitte la salle volontairement (portail, téléportation). */
  depart: { enCours: boolean };
}

interface AnimDef {
  cols: number[];
  fps: number;
  loop?: boolean;
}
interface AnimsJson {
  frame: number;
  columns: number;
  rows: Record<string, number>;
  animations: Record<string, AnimDef>;
}
interface SpriteManifest {
  id: string;
  type: string;
  fichier: string;
  largeur: number;
  hauteur: number;
}

interface Entite {
  sprite: Phaser.GameObjects.Sprite;
  nom: Phaser.GameObjects.Text;
  barre: Phaser.GameObjects.Graphics;
  alerte: Phaser.GameObjects.Text;
  x: number;
  y: number;
  t: number;
  enMarche: boolean;
  /** Départage stable de la profondeur entre deux sprites à la même hauteur. */
  tie: number;
}

interface Entree {
  seq: number;
  dx: number;
  dy: number;
  course: boolean;
}

const POLICE = { fontFamily: "monospace", fontSize: "8px", color: "#fff", stroke: "#000", strokeThickness: 2 };
const ANIM_COUP = ["punch1", "punch2", "kick"];
/** Ligne de la planche d'un monstre (dos, face, gauche, droite) selon la direction 0 bas, 1 haut, 2 gauche, 3 droite. */
const LIGNE_MONSTRE = [1, 0, 2, 3];
const ORIGINE_Y = 0.85;
const LISSAGE = 18;
const PROFONDEUR_ETIQUETTES = 100_000; // au-dessus de tout sprite (la map fait moins de 100 000 px de haut)

export class ScenePrincipale extends Phaser.Scene {
  private d!: DonneesScene;
  private carte!: Carte;
  private defAnims!: AnimsJson;
  private manifest: SpriteManifest[] = [];
  private joueurs = new Map<string, Entite>();
  private monstres = new Map<string, Entite>();
  private moi = "";
  private predit = { x: 0, y: 0 };
  private aBouge = false;
  private pending: Entree[] = [];
  private seq = 0;
  private instantaneeServeur = "";
  private accumulateur = 0;
  private dirLocale: Direction = 0;
  private profil: Profil | undefined;
  private vitesse = { marche: 0, course: 0 };
  private touches!: Record<string, Phaser.Input.Keyboard.Key>;
  private hud!: Phaser.GameObjects.Graphics;
  private hudTexte!: Phaser.GameObjects.Text;
  private annonceTexte!: Phaser.GameObjects.Text;
  private collisions?: Phaser.GameObjects.Graphics;
  private journal: unknown[] = [];
  private corps: Rect[] = [];
  private pnj: Rect[] = [];
  private compteurTie = 0;
  private saisie!: HTMLInputElement;
  private messages: { texte: string; jusqua: number }[] = [];
  private messagesTexte!: Phaser.GameObjects.Text;
  private zoneCoupDebug?: Phaser.GameObjects.Graphics;

  constructor() {
    super("jeu");
  }

  init(donnees: DonneesScene) {
    this.d = donnees;
    this.joueurs.clear();
    this.monstres.clear();
    this.pending = [];
    this.seq = 0;
    this.instantaneeServeur = "";
    this.accumulateur = 0;
    this.moi = donnees.bienvenue.id;
  }

  // ---------------------------------------------------------------------------------- chargement

  preload() {
    const map = this.d.bienvenue.map;
    this.cache.json.remove("tmj");
    this.load.json("manifest", "/assets/build/manifest.json");
    this.load.json("anims", "/assets/build/characters/goku.anims.json");
    this.load.json("tmj", `/maps/${map}.tmj`);
  }

  create() {
    this.carte = lireCarte(this.cache.json.get("tmj"));
    this.defAnims = this.cache.json.get("anims") as AnimsJson;
    this.manifest = (this.cache.json.get("manifest") as { sprites: SpriteManifest[] }).sprites;
    const dossier = this.d.bienvenue.map.split("/").slice(0, -1).join("/");
    // deuxième vague : fond de la map, planches des joueurs et des sprites
    if (this.textures.exists("fond")) this.textures.remove("fond");
    this.load.image("fond", `/maps/${dossier}/${this.carte.fond}`);
    this.load.image("fond", `/maps/${dossier}/${this.carte.fond}`);
    for (const p of ["orange", "bleu", "vert"]) this.load.spritesheet(`joueur-${p}`, `/assets/build/characters/goku-${p}.png`, { frameWidth: this.defAnims.frame, frameHeight: this.defAnims.frame });
    for (const s of this.manifest) {
      if (s.type === "joueur") continue;
      this.load.spritesheet(`sprite-${s.id}`, `/assets/build/${s.fichier}`, { frameWidth: s.largeur, frameHeight: s.largeur });
    }
    this.load.once("complete", () => this.demarrer());
    this.load.start();
  }

  private demarrer() {
    const { largeur, hauteur, tuile } = this.carte.grille;
    const W = largeur * tuile;
    const H = hauteur * tuile;
    this.add.image(0, 0, "fond").setOrigin(0).setDepth(-1);
    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.setRoundPixels(true);

    for (const o of this.carte.objets.filter((o) => o.type === "npc")) {
      this.poserPnj(o.nom, o.x, o.y);
      this.pnj.push(rectBoite(this.d.bienvenue.boiteMonstre, o.x, o.y));
    }

    this.touches = this.input.keyboard!.addKeys({
      haut: Phaser.Input.Keyboard.KeyCodes.UP,
      bas: Phaser.Input.Keyboard.KeyCodes.DOWN,
      gauche: Phaser.Input.Keyboard.KeyCodes.LEFT,
      droite: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      course: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      coup: Phaser.Input.Keyboard.KeyCodes.CTRL,
      coupAlt: Phaser.Input.Keyboard.KeyCodes.Z,
      p: Phaser.Input.Keyboard.KeyCodes.P,
      echap: Phaser.Input.Keyboard.KeyCodes.ESC,
      debug: Phaser.Input.Keyboard.KeyCodes.F3,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture("UP,DOWN,LEFT,RIGHT,SPACE,F3");
    this.brancherActions();
    // les raccourcis du navigateur (Ctrl+B, Ctrl+F…) ne doivent pas se déclencher en jeu
    const bloquer = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.altKey && e.key.length === 1) e.preventDefault();
    };
    window.addEventListener("keydown", bloquer);
    this.events.once("shutdown", () => window.removeEventListener("keydown", bloquer));

    this.hud = this.add.graphics().setScrollFactor(0).setDepth(300_000);
    this.hudTexte = this.add.text(4, 3, "", POLICE).setScrollFactor(0).setDepth(300_001);
    this.messagesTexte = this.add.text(4, 266, "", { ...POLICE, color: "#ffe9a8" }).setOrigin(0, 1).setScrollFactor(0).setDepth(300_001);
    this.annonceTexte = this.add.text(240, 110, "", { ...POLICE, fontSize: "16px", color: "#ff6b6b" }).setOrigin(0.5).setScrollFactor(0).setDepth(300_001);

    this.d.fenetre.brancher((r) => this.d.room.send("depenser", r));
    this.appliquerProfil(this.d.profil);
    this.d.room.onMessage("profil", (p: Record<string, unknown>) => this.appliquerProfil(p));
    this.d.room.onMessage("evt", (e: Record<string, unknown>) => this.surEvenement(e));
    this.d.room.onMessage("changer_map", (m: { salle: string }) => {
      this.d.depart.enCours = true;
      this.d.room.leave().finally(() => this.d.allerVers(m.salle));
    });
    this.d.room.onMessage("message", (m: { texte: string }) => this.afficherMessage(m.texte));
    this.brancherSaisie();

    const etat = this.d.room.state as any;
    const me = etat.joueurs.get(this.moi);
    this.predit = { x: me?.x ?? 0, y: me?.y ?? 0 };
    this.exposerPourLesTests();
  }

  private poserPnj(id: string, x: number, y: number) {
    const cle = `sprite-${id}`;
    if (!this.textures.exists(cle)) return;
    const s = this.add.sprite(x, y, cle, LIGNE_MONSTRE[0]).setOrigin(0.5, ORIGINE_Y).setDepth(y);
    this.add.text(x, y - 34, id, POLICE).setOrigin(0.5).setDepth(PROFONDEUR_ETIQUETTES + y);
    void s;
  }

  private appliquerProfil(p: Record<string, unknown>) {
    this.profil = p as unknown as Profil;
    this.vitesse = { marche: Number(p.vitesse), course: Number(p.vitesseCourse) };
    this.d.fenetre.mettreAJour(this.profil);
  }

  // ---------------------------------------------------------------------------------- boucle

  override update(_t: number, delta: number) {
    if (!this.hud) return;
    const dt = delta / 1000;
    const hz = this.d.bienvenue.tic_hz;
    this.accumulateur += dt;
    const pas = 1 / hz;
    while (this.accumulateur >= pas) {
      this.accumulateur -= pas;
      this.ticLocal(pas);
    }
    this.recalculerCorps();
    this.reconcilier();
    this.synchroniser(dt);
    this.majMessages();
    this.dessinerHud();
    const moi = this.joueurs.get(this.moi);
    if (moi) this.cameras.main.centerOn(Math.round(moi.x), Math.round(moi.y - 12));
  }

  private brancherActions() {
    const kb = this.input.keyboard!;
    kb.on("keydown-P", () => this.d.fenetre.basculer());
    kb.on("keydown-ESC", () => this.d.fenetre.fermer());
    kb.on("keydown-F3", () => this.basculerCollisions());
    const coup = (ev: KeyboardEvent) => {
      if (!ev.repeat) this.d.room.send("attaquer");
    };
    kb.on("keydown-Z", coup);
    kb.on("keydown-CTRL", coup);
  }

  /** Un pas de prédiction : même règle que le serveur, mêmes valeurs (vitesse envoyée par le serveur). */
  private ticLocal(pas: number) {
    const me = (this.d.room.state as any).joueurs.get(this.moi);
    if (!me || me.ko) return;
    const t = this.touches;
    const dx = (t.droite!.isDown ? 1 : 0) - (t.gauche!.isDown ? 1 : 0);
    const dy = (t.bas!.isDown ? 1 : 0) - (t.haut!.isDown ? 1 : 0);
    const e: Entree = { seq: ++this.seq, dx, dy, course: t.course!.isDown };
    this.d.room.send("entree", e);
    this.pending.push(e);
    const avant = this.predit;
    this.predit = this.appliquer(this.predit, e, pas);
    this.aBouge = Math.hypot(this.predit.x - avant.x, this.predit.y - avant.y) > 0.05;
    this.dirLocale = directionDepuisVecteur(dx, dy, this.dirLocale);
  }

  private appliquer(p: { x: number; y: number }, e: Entree, pas: number): { x: number; y: number } {
    if (e.dx === 0 && e.dy === 0) return p;
    const n = Math.hypot(e.dx, e.dy);
    const v = (e.course ? this.vitesse.course : this.vitesse.marche) * pas;
    const obstacle = corpsSolides(this.d.bienvenue.boite, p, this.corps);
    return deplacer(this.carte.grille, this.d.bienvenue.boite, p.x, p.y, (e.dx / n) * v, (e.dy / n) * v, obstacle);
  }

  /** Corps solides pour le joueur : PNJ et monstres vivants (comme sur le serveur). Les joueurs se traversent. */
  private recalculerCorps() {
    const corps = [...this.pnj];
    (this.d.room.state as any).monstres.forEach((m: any) => {
      if (m.etat !== "mort") corps.push(rectBoite(this.d.bienvenue.boiteMonstre, m.x, m.y));
    });
    this.corps = corps;
  }

  // ---------------------------------------------------------------------------------- saisie (commandes)

  /** Entrée ouvre une ligne de saisie ; Entrée l'envoie au serveur, Échap l'annule. Le client ne connaît aucune commande. */
  private brancherSaisie() {
    this.saisie = document.getElementById("ligne-commande") as HTMLInputElement;
    const kb = this.input.keyboard!;
    const fermer = () => {
      this.saisie.hidden = true;
      this.saisie.value = "";
      this.saisie.blur();
      kb.enabled = true;
    };
    const ouvrir = () => {
      kb.resetKeys();
      kb.enabled = false;
      this.saisie.hidden = false;
      this.saisie.value = "/";
      this.saisie.focus();
    };
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Enter" && this.saisie.hidden) {
        e.preventDefault();
        ouvrir();
      } else if (e.target === this.saisie) {
        e.stopPropagation();
        if (e.key === "Enter") {
          const texte = this.saisie.value.trim();
          if (texte.length > 1) this.d.room.send("commande", texte);
          fermer();
        } else if (e.key === "Escape") fermer();
      }
    };
    window.addEventListener("keydown", surTouche, true);
    this.events.once("shutdown", () => {
      window.removeEventListener("keydown", surTouche, true);
      fermer();
    });
  }

  private afficherMessage(texte: string) {
    this.messages.push({ texte, jusqua: this.time.now + 8000 });
    if (this.messages.length > 5) this.messages.shift();
  }

  private majMessages() {
    this.messages = this.messages.filter((m) => m.jusqua > this.time.now);
    this.messagesTexte.setText(this.messages.map((m) => m.texte).join("\n"));
  }

  /** Réconciliation : on repart de la position du serveur et on rejoue les entrées pas encore acquittées. */
  private reconcilier() {
    const me = (this.d.room.state as any).joueurs.get(this.moi);
    if (!me) return;
    const cle = `${me.x}|${me.y}|${me.seq}|${me.ko}`;
    if (cle === this.instantaneeServeur) return;
    this.instantaneeServeur = cle;
    this.pending = this.pending.filter((e) => e.seq > me.seq);
    let p = { x: me.x as number, y: me.y as number };
    const pas = 1 / this.d.bienvenue.tic_hz;
    for (const e of this.pending) p = this.appliquer(p, e, pas);
    if (me.ko) this.pending = [];
    // un écart de quelques pixels est le frottement contre un mur : on ne recale pas, sinon le sprite saute
    if (Math.hypot(p.x - this.predit.x, p.y - this.predit.y) > 6) this.predit = p;
  }

  // ---------------------------------------------------------------------------------- affichage

  private synchroniser(dt: number) {
    const etat = this.d.room.state as any;
    const vus = new Set<string>();
    etat.joueurs.forEach((j: any, id: string) => {
      vus.add(id);
      let e = this.joueurs.get(id);
            if (!e) {
        e = this.creerEntite(`joueur-${j.palette}`, j.pseudo);
        e.x = id === this.moi ? this.predit.x : j.x;
        e.y = id === this.moi ? this.predit.y : j.y;
        this.joueurs.set(id, e);
      }
      if (id === this.moi) {
        e.x = this.predit.x;
        e.y = this.predit.y;
        e.enMarche = this.aBouge;
      } else {
        this.deplacerVers(e, { x: j.x as number, y: j.y as number }, dt);
      }
      const dir: Direction = id === this.moi ? this.dirLocale : (j.dir as Direction);
      this.dessinerJoueur(e, j, dir, dt);
    });
    for (const [id, e] of this.joueurs) if (!vus.has(id)) (this.detruire(e), this.joueurs.delete(id));

    const vusM = new Set<string>();
    etat.monstres.forEach((m: any, id: string) => {
      vusM.add(id);
      let e = this.monstres.get(id);
      if (!e) {
        e = this.creerEntite(`sprite-${m.fiche}`, "");
        e.x = m.x;
        e.y = m.y;
        this.monstres.set(id, e);
      }
      this.deplacerVers(e, { x: m.x, y: m.y }, dt);
      this.dessinerMonstre(e, m);
    });
    for (const [id, e] of this.monstres) if (!vusM.has(id)) (this.detruire(e), this.monstres.delete(id));
  }

  private creerEntite(texture: string, nom: string): Entite {
    const sprite = this.add.sprite(0, 0, texture, 0).setOrigin(0.5, ORIGINE_Y);
    const etiquette = this.add.text(0, 0, nom, POLICE).setOrigin(0.5);
    const barre = this.add.graphics();
    const alerte = this.add.text(0, 0, "!", { ...POLICE, fontSize: "14px", color: "#ff3030" }).setOrigin(0.5).setVisible(false);
    return { sprite, nom: etiquette, barre, alerte, x: 0, y: 0, t: 0, enMarche: false, tie: ++this.compteurTie * 0.001 };
  }

  private detruire(e: Entite) {
    e.sprite.destroy();
    e.nom.destroy();
    e.barre.destroy();
    e.alerte.destroy();
  }

  private deplacerVers(e: Entite, cible: { x: number; y: number }, dt: number) {
    const ancienX = e.x;
    const ancienY = e.y;
    const k = 1 - Math.exp(-dt * LISSAGE);
    const loin = Math.hypot(cible.x - e.x, cible.y - e.y) > 64;
    e.x = loin ? cible.x : e.x + (cible.x - e.x) * k;
    e.y = loin ? cible.y : e.y + (cible.y - e.y) * k;
    e.enMarche = Math.hypot(e.x - ancienX, e.y - ancienY) > 0.05;
  }

  private dessinerJoueur(e: Entite, j: any, dir: Direction, dt: number) {
    const rangs = this.defAnims.rows;
    const ligne = dir === 0 ? rangs.face! : dir === 1 ? rangs.dos! : rangs.profil!;
    let nom = e.enMarche ? "run" : "idle";
    if (typeof j.anim === "string" && j.anim.startsWith("coup")) nom = ANIM_COUP[Number(j.anim.slice(4)) - 1] ?? "punch1";
    else if (j.anim === "touche" || j.anim === "ko") nom = "hurt";
    const def = this.defAnims.animations[nom]!;
    e.t += dt;
    const n = def.cols.length;
    const i = def.loop === false || nom === "hurt" || nom.startsWith("punch") || nom === "kick" ? Math.min(n - 1, Math.floor(e.t * def.fps)) : Math.floor(e.t * def.fps) % n;
    if ((e as Entite & { dernier?: string }).dernier !== nom) {
      e.t = 0;
      (e as Entite & { dernier?: string }).dernier = nom;
    }
    let col = def.cols[i]!;
    if (ligne === rangs.dos && col === 1) col = 0;
    e.sprite.setFrame(ligne * this.defAnims.columns + col);
    e.sprite.setFlipX(dir === 2);
    e.sprite.setAlpha(j.ko ? 0.45 : 1);
    this.placer(e, `${j.pseudo} · Niv ${j.niveau}`, j.pv / Math.max(1, j.pvMax), j.id === this.moi ? false : true);
  }

  private dessinerMonstre(e: Entite, m: any) {
    const lignes = (e.sprite.texture.frameTotal - 1) | 0;
    const frame = lignes >= 4 ? LIGNE_MONSTRE[m.dir as number]! : 0;
    e.sprite.setFrame(frame);
    e.sprite.setVisible(m.etat !== "mort");
    e.sprite.setTint(m.etat === "annonce" ? 0xff9a9a : 0xffffff);
    e.alerte.setVisible(m.etat === "annonce");
    const blesse = m.pv < m.pvMax;
    this.placer(e, blesse ? `${m.nom} · Niv ${m.niveau}` : "", m.pv / Math.max(1, m.pvMax), blesse && m.etat !== "mort");
    e.nom.setVisible(blesse && m.etat !== "mort");
  }

  private placer(e: Entite, texte: string, ratioPv: number, barre: boolean) {
    const x = Math.round(e.x);
    const y = Math.round(e.y);
    // les sprites se trient par hauteur des pieds, avec un départage stable (jamais deux profondeurs égales) ;
    // noms, barres de vie et alertes passent toujours au-dessus de tous les sprites
    // (profondeur calculée sur la position non arrondie : l'arrondi créait des égalités qui basculaient d'une image à l'autre)
    const profondeur = e.y + e.tie;
    e.sprite.setPosition(x, y).setDepth(profondeur);
    e.nom.setText(texte).setPosition(x, y - 40).setDepth(PROFONDEUR_ETIQUETTES + profondeur);
    e.alerte.setPosition(x, y - 46).setDepth(PROFONDEUR_ETIQUETTES + profondeur);
    e.barre.clear().setDepth(PROFONDEUR_ETIQUETTES + profondeur);
    if (barre) {
      e.barre.fillStyle(0x000000, 0.8).fillRect(x - 12, y - 33, 24, 4);
      e.barre.fillStyle(0xd03030, 1).fillRect(x - 11, y - 32, Math.max(0, Math.round(22 * ratioPv)), 2);
    }
  }

  private dessinerHud() {
    const me = (this.d.room.state as any).joueurs.get(this.moi);
    this.hud.clear();
    if (!me || !this.profil) return;
    const ratioPv = me.pv / Math.max(1, me.pvMax);
    const ratioXp = this.profil.xp / Math.max(1, this.profil.xpRequise);
    this.hud.fillStyle(0x000000, 0.7).fillRect(2, 14, 84, 14);
    this.hud.fillStyle(0xd03030, 1).fillRect(4, 16, Math.round(80 * ratioPv), 4);
    this.hud.fillStyle(0xe8a033, 1).fillRect(4, 22, Math.round(80 * Math.min(1, ratioXp)), 3);
    this.hudTexte.setText(`${me.pseudo}  Niv ${me.niveau}   PV ${me.pv}/${me.pvMax}`);
    const points = this.profil.pointsLibres;
    this.annonceTexte.setText(me.ko ? "K.O." : "");
    if (points > 0) this.hudTexte.setText(`${me.pseudo}  Niv ${me.niveau}   PV ${me.pv}/${me.pvMax}   [P] ${points} point(s)`);
  }

  private basculerCollisions() {
    if (this.collisions) {
      this.collisions.destroy();
      this.collisions = undefined;
      return;
    }
    const g = this.carte.grille;
    this.collisions = this.add.graphics().setDepth(200_000).setAlpha(0.45);
    this.collisions.fillStyle(0xff0000, 1);
    for (let ty = 0; ty < g.hauteur; ty++) for (let tx = 0; tx < g.largeur; tx++) if (g.bloque[ty * g.largeur + tx]) this.collisions.fillRect(tx * g.tuile, ty * g.tuile, g.tuile, g.tuile);
  }

  // ---------------------------------------------------------------------------------- événements

  private surEvenement(e: Record<string, unknown>) {
    this.journal.push(e);
    const texte = (x: number, y: number, s: string, couleur = "#ffffff", taille = "8px") => {
      const t = this.add.text(x, y - 30, s, { ...POLICE, color: couleur, fontSize: taille }).setOrigin(0.5).setDepth(250_000);
      this.tweens.add({ targets: t, y: t.y - 18, alpha: 0, duration: 800, onComplete: () => t.destroy() });
    };
    switch (e.type) {
      case "degats":
        texte(Number(e.x), Number(e.y), String(e.valeur), e.critique ? "#ffd23f" : e.cible === "joueur" ? "#ff6b6b" : "#ffffff", e.critique ? "12px" : "8px");
        break;
      case "coup":
        this.montrerZoneCoup(e.zone as Rect);
        break;
      case "rate":
        texte(Number(e.x), Number(e.y), "Raté", "#aaaaaa");
        break;
      case "esquive":
        texte(Number(e.x), Number(e.y), "Esquive", "#7fd8ff");
        break;
      case "xp": {
        const moi = this.joueurs.get(this.moi);
        if (moi) texte(moi.x, moi.y - 10, `+${e.gain} XP`, "#e8a033");
        break;
      }
      case "niveau": {
        const moi = this.joueurs.get(this.moi);
        if (moi) texte(moi.x, moi.y - 22, `Niveau ${e.niveau} !`, "#ffd23f", "12px");
        break;
      }
    }
  }

  /** Avec F3 : la zone touchée par un coup (rectangle devant le joueur) s'affiche une fraction de seconde. */
  private montrerZoneCoup(z: Rect) {
    if (!this.collisions) return;
    this.zoneCoupDebug?.destroy();
    const g = this.add.graphics().setDepth(200_001);
    g.fillStyle(0x30a0ff, 0.5).fillRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0);
    this.zoneCoupDebug = g;
    this.time.delayedCall(250, () => g.destroy());
  }

  /** Lecture seule de l'état local, pour les tests Playwright. */
  private exposerPourLesTests() {
    const scene = this;
    (window as unknown as { __dbz: unknown }).__dbz = {
      etat() {
        const etat = scene.d.room.state as any;
        const monstres: unknown[] = [];
        etat.monstres.forEach((m: any, id: string) => monstres.push({ id, fiche: m.fiche, x: m.x, y: m.y, pv: m.pv, pvMax: m.pvMax, etat: m.etat, niveau: m.niveau }));
        const joueurs: unknown[] = [];
        etat.joueurs.forEach((j: any, id: string) => joueurs.push({ id, pseudo: j.pseudo, x: j.x, y: j.y, pv: j.pv, niveau: j.niveau, palette: j.palette, anim: j.anim }));
        const me = etat.joueurs.get(scene.moi);
        return {
          map: scene.d.bienvenue.map,
          moi: scene.moi,
          position: me ? { x: me.x, y: me.y } : null,
          predit: scene.predit,
          pendantes: scene.pending.length,
          joueurs,
          monstres,
          profil: scene.profil,
          evenements: scene.journal,
        };
      },
    };
  }

  /** Utile aux tests : la boîte libre côté client doit rester cohérente avec le serveur. */
  positionLibre(x: number, y: number) {
    return boiteLibre(this.carte.grille, this.d.bienvenue.boite, x, y);
  }
}
