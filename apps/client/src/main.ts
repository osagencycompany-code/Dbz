import { Client, type Room } from "colyseus.js";
import { demarrerJeu } from "./jeu/jeu.js";

const adresseServeur = (import.meta.env.VITE_SERVEUR as string | undefined) ?? `ws://${location.hostname}:2567`;

const racine = document.getElementById("connexion") as HTMLElement;
const formulaire = document.getElementById("formulaire") as HTMLFormElement;
const erreur = document.getElementById("erreur") as HTMLElement;
const valider = document.getElementById("valider") as HTMLButtonElement;
const basculer = document.getElementById("basculer") as HTMLButtonElement;
const conteneurJeu = document.getElementById("jeu") as HTMLElement;

let inscription = false;
function definirMode(i: boolean) {
  inscription = i;
  racine.classList.toggle("mode-inscription", i);
  valider.textContent = i ? "Créer le compte" : "Se connecter";
  basculer.textContent = i ? "J'ai déjà un compte" : "Créer un compte";
  (formulaire.elements.namedItem("email") as HTMLInputElement).required = i;
  (formulaire.elements.namedItem("cle") as HTMLInputElement).required = i;
  erreur.textContent = "";
}
basculer.addEventListener("click", () => definirMode(!inscription));
definirMode(false);

async function appeler(chemin: string, corps: unknown): Promise<{ jeton: string; pseudo: string }> {
  const r = await fetch(`/api${chemin}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corps) });
  const donnees = (await r.json().catch(() => ({}))) as { jeton?: string; pseudo?: string; erreur?: string };
  if (!r.ok || !donnees.jeton) throw new Error(donnees.erreur ?? "Connexion impossible.");
  return { jeton: donnees.jeton, pseudo: donnees.pseudo ?? "" };
}

formulaire.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  erreur.textContent = "";
  const f = new FormData(formulaire);
  const pseudo = String(f.get("pseudo"));
  const motDePasse = String(f.get("motDePasse"));
  valider.disabled = true;
  try {
    const { jeton } = inscription
      ? await appeler("/inscription", { pseudo, motDePasse, email: String(f.get("email")), cle: String(f.get("cle")) })
      : await appeler("/connexion", { pseudo, motDePasse });
    racine.hidden = true;
    conteneurJeu.hidden = false;
    const client = new Client(adresseServeur);
    await demarrerJeu(conteneurJeu, client, jeton, (e: unknown) => {
      racine.hidden = false;
      conteneurJeu.hidden = true;
      erreur.textContent = e instanceof Error ? e.message : String(e);
    });
  } catch (e) {
    erreur.textContent = e instanceof Error ? e.message : String(e);
  } finally {
    valider.disabled = false;
  }
});

export type SalleJeu = Room;
