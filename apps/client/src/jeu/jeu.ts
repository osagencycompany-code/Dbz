import type { Client, Room } from "colyseus.js";
import Phaser from "phaser";
import { FenetrePersonnage } from "./fenetre-p.js";
import { ScenePrincipale, type DonneesScene } from "./scene.js";

export const LARGEUR = 480;
export const HAUTEUR = 270;

export interface Bienvenue {
  id: string;
  map: string;
  tic_hz: number;
  boite: { largeur: number; hauteur: number };
  boiteMonstre: { largeur: number; hauteur: number };
}

/** Rejoint la salle, attend la configuration du serveur, puis lance (ou relance) la scène de jeu. */
async function rejoindre(client: Client, nomSalle: string, jeton: string): Promise<{ room: Room; bienvenue: Bienvenue; profil: Record<string, unknown> }> {
  const room = await client.joinOrCreate(nomSalle, { jeton });
  const attente = new Promise<{ bienvenue: Bienvenue; profil: Record<string, unknown> }>((resolve) => {
    let bienvenue: Bienvenue | undefined;
    let profil: Record<string, unknown> | undefined;
    const fin = () => bienvenue && profil && resolve({ bienvenue, profil });
    room.onMessage("bienvenue", (m: Bienvenue) => ((bienvenue = m), fin()));
    room.onMessage("profil", (m: Record<string, unknown>) => ((profil = m), fin()));
  });
  room.send("pret");
  return { room, ...(await attente) };
}

export async function demarrerJeu(conteneur: HTMLElement, client: Client, jeton: string, surErreur: (e: unknown) => void) {
  const fenetre = new FenetrePersonnage();
  let jeu: Phaser.Game | undefined;

  const lancer = async (nomSalle: string) => {
    const { room, bienvenue, profil } = await rejoindre(client, nomSalle, jeton);
    const donnees: DonneesScene = {
      room,
      bienvenue,
      profil,
      fenetre,
      allerVers: (salle) => void lancer(salle).catch(surErreur),
    };
    room.onLeave((code) => {
      if (code === 4000) surErreur(new Error("Connexion ouverte ailleurs avec ce compte."));
    });
    if (!jeu) {
      jeu = new Phaser.Game({
        type: Phaser.AUTO,
        parent: conteneur,
        width: LARGEUR,
        height: HAUTEUR,
        pixelArt: true,
        roundPixels: true,
        backgroundColor: "#0b0b12",
        scale: { mode: Phaser.Scale.NONE },
        scene: [],
        input: { keyboard: { target: window } },
      });
      jeu.scene.add("jeu", ScenePrincipale, false);
      ajusterEchelle(jeu);
      window.addEventListener("resize", () => jeu && ajusterEchelle(jeu));
    }
    jeu.scene.stop("jeu");
    jeu.scene.start("jeu", donnees);
  };

  await lancer(import.meta.env.VITE_SALLE_INITIALE ?? (await salleInitiale(client, jeton)));
}

/** Échelle entière : on garde le plus grand multiple de 480 × 270 qui tient dans la fenêtre. */
function ajusterEchelle(jeu: Phaser.Game) {
  const zoom = Math.max(1, Math.floor(Math.min(window.innerWidth / LARGEUR, window.innerHeight / HAUTEUR)));
  const canvas = jeu.canvas;
  canvas.style.width = `${LARGEUR * zoom}px`;
  canvas.style.height = `${HAUTEUR * zoom}px`;
}

/**
 * La salle à rejoindre est celle où le personnage a été enregistré ; on la demande en essayant la salle d'arrivée
 * puis, si le serveur répond « pas sur cette map », celle qu'il indique.
 */
async function salleInitiale(client: Client, jeton: string): Promise<string> {
  const r = await fetch("/api/personnage", { headers: { authorization: `Bearer ${jeton}` } });
  if (r.ok) return ((await r.json()) as { salle: string }).salle;
  void client;
  throw new Error("Impossible de retrouver ton personnage.");
}
