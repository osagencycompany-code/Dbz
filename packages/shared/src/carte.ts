/**
 * Lecture des maps Tiled (.tmj) et collisions : partagé entre le serveur (autoritaire) et le client (prédiction).
 * Une position est celle des pieds ; la boîte de collision est centrée en x et s'étend vers le haut.
 */

export interface Grille {
  largeur: number; // en cases
  hauteur: number;
  tuile: number; // taille d'une case en pixels
  bloque: Uint8Array;
}

export interface ObjetCarte {
  id: number;
  nom: string;
  type: string;
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
  props: Record<string, string | number | boolean>;
}

export interface Carte {
  grille: Grille;
  objets: ObjetCarte[];
  fond: string;
}

export interface Boite {
  largeur: number;
  hauteur: number;
}

interface TmjCalque {
  name: string;
  type: string;
  data?: number[];
  image?: string;
  objects?: Array<{
    id: number;
    name: string;
    type: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    properties?: Array<{ name: string; value: string | number | boolean }>;
  }>;
}

const EPSILON = 1e-6;
const ITERATIONS_MUR = 8;

export function lireCarte(tmj: unknown): Carte {
  const d = tmj as { width: number; height: number; tilewidth: number; layers: TmjCalque[] };
  const col = d.layers.find((c) => c.name === "collisions");
  const obj = d.layers.find((c) => c.name === "objets");
  const fond = d.layers.find((c) => c.name === "fond");
  if (!col?.data) throw new Error("calque « collisions » manquant");
  return {
    grille: { largeur: d.width, hauteur: d.height, tuile: d.tilewidth, bloque: Uint8Array.from(col.data, (v) => (v ? 1 : 0)) },
    objets: (obj?.objects ?? []).map((o) => ({
      id: o.id,
      nom: o.name,
      type: o.type,
      x: o.x,
      y: o.y,
      largeur: o.width ?? 0,
      hauteur: o.height ?? 0,
      props: Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value])),
    })),
    fond: fond?.image ?? "",
  };
}

export function caseBloquee(g: Grille, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= g.largeur || ty >= g.hauteur) return true;
  return g.bloque[ty * g.largeur + tx] === 1;
}

/** Vrai si la boîte posée aux pieds (x, y) ne touche aucune case bloquée ni le bord de la map. */
export function boiteLibre(g: Grille, boite: Boite, x: number, y: number): boolean {
  const x0 = Math.floor((x - boite.largeur / 2) / g.tuile);
  const x1 = Math.floor((x + boite.largeur / 2 - EPSILON) / g.tuile);
  const y0 = Math.floor((y - boite.hauteur) / g.tuile);
  const y1 = Math.floor((y - EPSILON) / g.tuile);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (caseBloquee(g, tx, ty)) return false;
  return true;
}

/** Déplace avec glissement : chaque axe est essayé séparément, puis ramené au plus près du mur. */
export function deplacer(g: Grille, boite: Boite, x: number, y: number, dx: number, dy: number): { x: number; y: number } {
  let nx = x;
  let ny = y;
  if (dx !== 0) nx = avancerAxe(g, boite, x, y, dx, true);
  if (dy !== 0) ny = avancerAxe(g, boite, nx, y, dy, false);
  return { x: nx, y: ny };
}

function avancerAxe(g: Grille, boite: Boite, x: number, y: number, delta: number, horizontal: boolean): number {
  const depart = horizontal ? x : y;
  const arrivee = depart + delta;
  const libre = (v: number) => (horizontal ? boiteLibre(g, boite, v, y) : boiteLibre(g, boite, x, v));
  if (libre(arrivee)) return arrivee;
  let bon = depart;
  let mauvais = arrivee;
  for (let i = 0; i < ITERATIONS_MUR; i++) {
    const milieu = (bon + mauvais) / 2;
    if (libre(milieu)) bon = milieu;
    else mauvais = milieu;
  }
  return bon;
}

/** Vrai si la boîte posée en (x, y) recoupe le rectangle de l'objet (portails, points de soin…). */
export function boiteDansObjet(o: ObjetCarte, boite: Boite, x: number, y: number): boolean {
  return x + boite.largeur / 2 > o.x && x - boite.largeur / 2 < o.x + o.largeur && y > o.y && y - boite.hauteur < o.y + o.hauteur;
}
