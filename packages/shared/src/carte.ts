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
export function deplacer(
  g: Grille,
  boite: Boite,
  x: number,
  y: number,
  dx: number,
  dy: number,
  obstacle?: Obstacle,
): { x: number; y: number } {
  let nx = x;
  let ny = y;
  if (dx !== 0) nx = avancerAxe(g, boite, x, y, dx, true, obstacle);
  if (dy !== 0) ny = avancerAxe(g, boite, nx, y, dy, false, obstacle);
  return { x: nx, y: ny };
}

/** Obstacle mobile (monstre, PNJ) : vrai si la boîte posée en (x, y) le heurte. */
export type Obstacle = (x: number, y: number) => boolean;

/** Rectangle occupé par une boîte posée aux pieds (x, y). */
export function rectBoite(boite: Boite, x: number, y: number): Rect {
  return { x0: x - boite.largeur / 2, x1: x + boite.largeur / 2, y0: y - boite.hauteur, y1: y };
}

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function rectsSeChevauchent(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

/**
 * Construit l'obstacle formé par des corps solides. Un corps déjà en contact au départ ne bloque pas
 * (on peut toujours s'en éloigner, même si on est né dessus).
 */
export function corpsSolides(boite: Boite, depart: { x: number; y: number }, corps: Rect[]): Obstacle {
  const initial = rectBoite(boite, depart.x, depart.y);
  const actifs = corps.filter((c) => !rectsSeChevauchent(initial, c));
  return (x, y) => {
    const r = rectBoite(boite, x, y);
    return actifs.some((c) => rectsSeChevauchent(r, c));
  };
}

const PAS_MAX_PX = 4; // ok-nombre : pas élémentaire, plus petit que n'importe quel corps (pas de traversée)

function avancerAxe(g: Grille, boite: Boite, x: number, y: number, delta: number, horizontal: boolean, obstacle?: Obstacle): number {
  const libre = (v: number) => {
    const px = horizontal ? v : x;
    const py = horizontal ? y : v;
    return boiteLibre(g, boite, px, py) && !obstacle?.(px, py);
  };
  // un grand pas est découpé : on ne saute jamais par-dessus un corps mince
  const morceaux = obstacle ? Math.max(1, Math.ceil(Math.abs(delta) / PAS_MAX_PX)) : 1;
  let courant = horizontal ? x : y;
  for (let i = 0; i < morceaux; i++) {
    const arrivee = courant + delta / morceaux;
    if (libre(arrivee)) {
      courant = arrivee;
      continue;
    }
    let bon = courant;
    let mauvais = arrivee;
    for (let k = 0; k < ITERATIONS_MUR; k++) {
      const milieu = (bon + mauvais) / 2;
      if (libre(milieu)) bon = milieu;
      else mauvais = milieu;
    }
    return bon;
  }
  return courant;
}

/** Vrai si la boîte posée en (x, y) recoupe le rectangle de l'objet (portails, points de soin…). */
export function boiteDansObjet(o: ObjetCarte, boite: Boite, x: number, y: number): boolean {
  return x + boite.largeur / 2 > o.x && x - boite.largeur / 2 < o.x + o.largeur && y > o.y && y - boite.hauteur < o.y + o.hauteur;
}
