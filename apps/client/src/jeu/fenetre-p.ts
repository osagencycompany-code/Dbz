const NOMS: Record<string, string> = { vitalite: "Vitalité", force: "Force", puissance: "Puissance", agilite: "Agilité", energie: "Énergie" };
const STATS = Object.keys(NOMS);

export interface Profil {
  niveau: number;
  xp: number;
  xpRequise: number;
  stats: Record<string, number>;
  pointsLibres: number;
  puissance: number;
}

/** Fenêtre « Personnage » (touche P) : stats, points à dépenser avec validation explicite. */
export class FenetrePersonnage {
  private racine = document.getElementById("fenetre-p") as HTMLElement;
  private contenu = document.getElementById("contenu-p") as HTMLElement;
  private profil: Profil | undefined;
  private ajouts: Record<string, number> = {};
  private envoyer: (repartition: Record<string, number>) => void = () => undefined;

  constructor() {
    (document.getElementById("fermer-p") as HTMLElement).onclick = () => this.fermer();
  }

  brancher(envoyer: (repartition: Record<string, number>) => void) {
    this.envoyer = envoyer;
    this.fermer();
  }

  get ouverte() {
    return !this.racine.hidden;
  }

  basculer() {
    if (this.ouverte) this.fermer();
    else {
      this.racine.hidden = false;
      this.dessiner();
    }
  }

  fermer() {
    this.racine.hidden = true;
  }

  mettreAJour(p: Profil) {
    this.profil = p;
    this.ajouts = {};
    if (this.ouverte) this.dessiner();
  }

  private restants(): number {
    const depense = Object.values(this.ajouts).reduce((a, b) => a + b, 0);
    return (this.profil?.pointsLibres ?? 0) - depense;
  }

  private dessiner() {
    const p = this.profil;
    if (!p) return;
    const restants = this.restants();
    const lignes = STATS.map((s) => {
      const ajout = this.ajouts[s] ?? 0;
      const valeur = (p.stats[s] ?? 0) + ajout;
      return `<tr><td>${NOMS[s]}</td><td data-stat-valeur="${s}">${valeur}${ajout ? ` <small>(+${ajout})</small>` : ""}</td>
        <td><button type="button" data-moins="${s}" ${ajout ? "" : "disabled"}>−</button><button type="button" data-plus="${s}" ${restants > 0 ? "" : "disabled"}>+</button></td></tr>`;
    }).join("");
    this.contenu.innerHTML = `
      <p>Niveau <b data-niveau>${p.niveau}</b> · XP ${p.xp} / ${p.xpRequise}</p>
      <p>Niveau de puissance : <b>${p.puissance}</b></p>
      <table>${lignes}</table>
      <p>Points à dépenser : <b data-points>${restants}</b></p>
      <button type="button" class="valider" ${Object.values(this.ajouts).some((v) => v > 0) ? "" : "disabled"}>Valider</button>`;
    for (const b of this.contenu.querySelectorAll<HTMLButtonElement>("[data-plus]"))
      b.onclick = () => {
        const s = b.dataset.plus!;
        this.ajouts[s] = (this.ajouts[s] ?? 0) + 1;
        this.dessiner();
      };
    for (const b of this.contenu.querySelectorAll<HTMLButtonElement>("[data-moins]"))
      b.onclick = () => {
        const s = b.dataset.moins!;
        this.ajouts[s] = Math.max(0, (this.ajouts[s] ?? 0) - 1);
        this.dessiner();
      };
    (this.contenu.querySelector(".valider") as HTMLButtonElement).onclick = () => this.envoyer({ ...this.ajouts });
  }
}
