/** Génère assets/build/apercu-heros.html : héros jouables (animations, rendu du Super Saiyan 2) et créatures animées de Legacy of Goku 2. */
import type { AnimationsFichier } from "./apercu.js";

export interface EntreeApercuHeros {
  heros: {
    id: string;
    nom: string;
    statut: string;
    disponibilite: string;
    apparences: {
      id: string;
      nom: string;
      formes: { id: string; planche: string; animations: AnimationsFichier; base?: string; effet?: string }[];
    }[];
  }[];
  creatures: {
    id: string;
    nom: string;
    rang: string;
    statut: string;
    planche: string;
    cadre: number;
    animations: { colonnes: number; lignes: Record<string, number>; animations: Record<string, { cols: number[]; fps?: number; loop?: boolean }> };
    enJeu: boolean;
  }[];
  eclairs: { fichier: string; taille: number; nombre: number };
  /** Planches découpées de Legacy of Goku 1 (cases régulières, plusieurs lignes nommées). */
  log1: {
    id: string;
    nom: string;
    planche: string;
    cadre: [number, number];
    lignes: Record<string, number>;
    animations: Record<string, { ligne: string; cols: number[]; fps?: number; loop?: boolean }>;
  }[];
  /** Images de référence pour comparer les échelles (zone découpée d'une planche). */
  portraits: { nom: string; fichier: string; source: string }[];
  echelle: { nom: string; planche: string; x: number; y: number; l: number; h: number }[];
}

export function genererApercuHeros(donnees: EntreeApercuHeros): string {
  const json = JSON.stringify(donnees).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>DBZ MY GAME – Aperçu des héros et des créatures</title>
<style>
  :root { color-scheme: dark; }
  body { background:#14102a; color:#eee; font:14px/1.4 system-ui,sans-serif; margin:0; padding:16px 24px 60px; }
  h1 { color:#f5c518; margin:0 0 4px; } h2 { color:#f5c518; border-bottom:1px solid #f5c518; padding-bottom:4px; margin-top:36px; }
  p.aide { color:#aab; max-width:900px; }
  canvas { image-rendering:pixelated; background:#3f7a3a; }
  .grille { display:flex; flex-wrap:wrap; gap:12px; }
  .carte { background:#1f1a3d; border:1px solid #3a3470; border-radius:6px; padding:8px; }
  .carte h3 { margin:0 0 4px; font-size:14px; }
  .badge { display:inline-block; padding:0 6px; border-radius:8px; font-size:11px; margin-right:4px; background:#444; }
  .badge.brouillon { background:#8a5a00; } .badge.valide { background:#1d7a3a; }
  .anim { text-align:center; font-size:11px; color:#9ab; }
  label { margin-right:12px; } select { background:#1f1a3d; color:#eee; border:1px solid #3a3470; padding:2px 4px; }
  .trio { display:flex; gap:16px; align-items:flex-end; margin:8px 0 18px; } .trio div { text-align:center; font-size:12px; color:#9ab; }
  .ligne-crea { display:flex; gap:6px; align-items:flex-end; } .ligne-crea div { text-align:center; font-size:10px; color:#9ab; }
</style>
</head>
<body>
<h1>Héros jouables et créatures</h1>
<p class="aide">Le réglage « Vitesse » (×1, ×0,5, ×0,25) ralentit toutes les animations de cette page pour les regarder image par image ; il ne change pas la vitesse du jeu.</p>
<p class="aide">Généré par <code>npm run assets:build</code>. Les correspondances d'animations sont des <b>brouillons</b> proposés d'après la lecture des planches : dis-moi ce qui est faux (mauvaise image, animation trop courte, nom inadapté).</p>

<h2>1. Héros : toutes les animations</h2>
<div>
  <label>Héros <select id="heros"></select></label>
  <label>Apparence <select id="apparence"></select></label>
  <label>Forme <select id="forme"></select></label>
  <label>Direction <select id="direction"></select></label>
  <label>Vitesse <select id="vitesse"><option value="1">×1</option><option value="0.5">×0,5</option><option value="0.25">×0,25</option></select></label>
</div>
<div class="grille" id="animations"></div>

<h2>2. Rendu du Super Saiyan 2 (planche Super Saiyan + éclairs superposés)</h2>
<p class="aide">Pour chaque héros qui a un Super Saiyan 2 : normal, Super Saiyan, Super Saiyan 2 (la même planche que le Super Saiyan avec de petits arcs électriques dessinés à l'échelle du sprite par-dessus, qui crépitent par intermittence sans cacher le personnage). Repos, course et coup de poing.</p>
<div id="ssj2"></div>

<h2>3. Créatures de Legacy of Goku 2</h2>
<p class="aide">Chaque carte montre les quatre directions (face, gauche, droite, dos) en marche, puis en attaque. « Variante 0 » = couleur de base (monstres communs), les autres = couleurs pour les élites. <b>Choix du dinosaure : compare le T-Rex (3 couleurs) et le Triceratops.</b></p>
<div class="grille" id="creatures"></div>

<h2>4. Legacy of Goku 1 : Raditz, Nappa, Vegeta boss et grand singe</h2>
<p class="aide">Découpés de <code>Various.gif</code>, <code>Vegeta.png</code> et <code>Oozaru Gohan  Vegeta.png</code> (aucune mise à l'échelle). Les correspondances d'animations sont des brouillons. Le Saibaman n'existe pas dans ces planches.</p>
<div class="grille" id="log1"></div>

<h2>6. Portraits des héros</h2>
<div id="portraits" class="grille"></div>

<h2>5. Échelle réelle : LoG1 contre Buu's Fury / LoG2</h2>
<p class="aide">Chaque sprite est affiché à ×1, ×2 et ×3 (échelles entières uniquement) sur la même ligne de sol.</p>
<div id="echelle" class="grille"></div>

<script>
const D = ${json};
const ZOOM = 4;
const imgs = {};
const charger = (src) => (imgs[src] ??= new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; }));
const sel = (id) => document.getElementById(id);
const DIRECTIONS = { "face": ["face", false], "trois-quarts": ["trois-quarts", false], "profil droite": ["profil", false], "profil gauche": ["profil", true], "dos": ["dos", false] };
const animateurs = [];
let VIT = 1; // vitesse de l'aperçu seulement, jamais celle du jeu

function dessiner(ctx, img, anims, def, col, direction, x, y, zoom) {
  const F = anims.frame;
  const rangee = def.row ?? DIRECTIONS[direction][0];
  const miroir = def.row ? false : DIRECTIONS[direction][1];
  const ligne = anims.rows[rangee] ?? 0;
  ctx.save();
  if (miroir) { ctx.translate(x + F * zoom, y); ctx.scale(-1, 1); ctx.drawImage(img, col * F, ligne * F, F, F, 0, 0, F * zoom, F * zoom); }
  else ctx.drawImage(img, col * F, ligne * F, F, F, x, y, F * zoom, F * zoom);
  ctx.restore();
}
// ---------- 1. héros
for (const h of D.heros) sel("heros").add(new Option(h.nom + " (" + h.statut + ", " + h.disponibilite + ")", h.id));
for (const d of Object.keys(DIRECTIONS)) sel("direction").add(new Option(d, d));
function remplirApparences() {
  const h = D.heros.find((x) => x.id === sel("heros").value);
  sel("apparence").innerHTML = ""; for (const a of h.apparences) sel("apparence").add(new Option(a.nom, a.id));
  remplirFormes();
}
function remplirFormes() {
  const h = D.heros.find((x) => x.id === sel("heros").value);
  const a = h.apparences.find((x) => x.id === sel("apparence").value);
  sel("forme").innerHTML = ""; for (const f of a.formes) sel("forme").add(new Option(f.id, f.id));
  montrer();
}
async function montrer() {
  animateurs.length = 0;
  const h = D.heros.find((x) => x.id === sel("heros").value);
  const a = h.apparences.find((x) => x.id === sel("apparence").value);
  const f = a.formes.find((x) => x.id === sel("forme").value);
  const zone = sel("animations"); zone.innerHTML = "";
  const img = await charger(f.planche);
  const F = f.animations.frame;
  for (const [nom, def] of Object.entries(f.animations.animations)) {
    const c = document.createElement("canvas"); c.width = F * 2 * ZOOM; c.height = F * 2 * ZOOM;
    const bloc = document.createElement("div"); bloc.className = "anim"; bloc.append(c, document.createElement("br"), nom + " (" + def.cols.length + " images, col. " + def.cols[0] + "–" + def.cols[def.cols.length - 1] + ")");
    zone.append(bloc);
    animateurs.push({ ctx: c.getContext("2d"), img, f, def, debut: performance.now(), z: ZOOM * 2, marge: 0 });
  }
}
sel("vitesse").onchange = () => { VIT = Number(sel("vitesse").value); };
sel("heros").onchange = remplirApparences; sel("apparence").onchange = remplirFormes; sel("forme").onchange = montrer;

// ---------- 2. SSJ2
const eclairsImg = charger(D.eclairs.fichier);
async function ssj2() {
  const zone = sel("ssj2");
  const E = await eclairsImg;
  for (const h of D.heros) {
    for (const a of h.apparences) {
      const f2 = a.formes.find((f) => f.effet);
      if (!f2) continue;
      const fn = a.formes.find((f) => f.id === "normal"), fs = a.formes.find((f) => f.id === f2.base);
      const titre = document.createElement("h3"); titre.textContent = h.nom + " – " + a.nom; zone.append(titre);
      for (const animNom of ["idle", "run", "punch1"]) {
        const trio = document.createElement("div"); trio.className = "trio";
        for (const [forme, etiquette, effet] of [[fn, "normal"], [fs, "Super Saiyan"], [f2, "Super Saiyan 2", true]]) {
          const c = document.createElement("canvas"); c.width = 96 * 3; c.height = 96 * 3;
          const bloc = document.createElement("div"); bloc.append(c, document.createElement("br"), etiquette + " – " + animNom); trio.append(bloc);
          const def = forme.animations.animations[animNom];
          animateurs.push({ ctx: c.getContext("2d"), img: await charger(forme.planche), f: forme, def, debut: performance.now(), effet: effet ? E : null, fixe: "profil droite", z: 3, marge: 32 });
        }
        zone.append(trio);
      }
    }
  }
}

// ---------- 3. créatures
const LIGNES = ["face", "gauche", "droite", "dos"];
async function creatures() {
  const zone = sel("creatures");
  for (const c of D.creatures) {
    const carte = document.createElement("div"); carte.className = "carte";
    const t = document.createElement("h3"); t.textContent = c.nom; carte.append(t);
    const infos = document.createElement("div"); infos.innerHTML = '<span class="badge ' + c.statut + '">' + c.statut + '</span><span class="badge">' + c.rang + '</span>' + (c.enJeu ? '<span class="badge valide">utilisé par une fiche</span>' : ""); carte.append(infos);
    const img = await charger(c.planche);
    const zoom = c.cadre === 64 ? 2 : 3;
    for (const animNom of ["marche", "attaque", "blesse"]) {
      const def = c.animations.animations[animNom]; if (!def) continue;
      const ligne = document.createElement("div"); ligne.className = "ligne-crea";
      for (const dir of LIGNES) {
        const cv = document.createElement("canvas"); cv.width = c.cadre * zoom; cv.height = c.cadre * zoom;
        const bloc = document.createElement("div"); bloc.append(cv, document.createElement("br"), animNom + " · " + dir); ligne.append(bloc);
        animateurs.push({ ctx: cv.getContext("2d"), img, creature: { c, def, ligne: c.animations.lignes[dir], zoom }, debut: performance.now() });
      }
      carte.append(ligne);
    }
    zone.append(carte);
  }
}

function boucle(t) {
  const direction = sel("direction").value;
  for (const a of animateurs) {
    a.ctx.clearRect(0, 0, a.ctx.canvas.width, a.ctx.canvas.height);
    if (a.log1) {
      const { L, H, ligne, def } = a.log1, n = def.cols.length;
      const i = Math.floor(((t - a.debut) * VIT / 1000) * (def.fps ?? 8)) % n;
      a.ctx.drawImage(a.img, def.cols[i] * L, ligne * H, L, H, 0, 0, L * 2, H * 2);
      continue;
    }
    if (a.creature) {
      const { c, def, ligne, zoom } = a.creature, n = def.cols.length;
      const i = Math.floor(((t - a.debut) * VIT / 1000) * (def.fps ?? 8)) % n;
      a.ctx.drawImage(a.img, def.cols[i] * c.cadre, ligne * c.cadre, c.cadre, c.cadre, 0, 0, c.cadre * zoom, c.cadre * zoom);
      continue;
    }
    const { def } = a, n = def.cols.length;
    const i = Math.floor(((t - a.debut) * VIT / 1000) * (def.fps ?? 8)) % n;
    const dir = a.fixe ?? direction, z = a.z, marge = a.marge;
    dessiner(a.ctx, a.img, a.f.animations, def, def.cols[i], dir, marge * z, marge * z, z);
    if (a.effet) {
      // petits arcs : une image différente toutes les 70 ms, certaines vides (intermittence), même case que le sprite
      const E = a.effet, T = D.eclairs.taille, k = Math.floor(t / 70) % D.eclairs.nombre;
      a.ctx.drawImage(E, k * T, 0, T, T, marge * z, marge * z, T * z, T * z);
    }
  }
  requestAnimationFrame(boucle);
}
async function log1() {
  const zone = sel("log1");
  for (const c of D.log1) {
    const carte = document.createElement("div"); carte.className = "carte";
    const t = document.createElement("h3"); t.textContent = c.nom; carte.append(t);
    const img = await charger(c.planche);
    const [L, H] = c.cadre;
    const ligne = document.createElement("div"); ligne.className = "ligne-crea"; ligne.style.flexWrap = "wrap";
    for (const [nom, def] of Object.entries(c.animations)) {
      const cv = document.createElement("canvas"); cv.width = L * 2; cv.height = H * 2;
      const bloc = document.createElement("div"); bloc.append(cv, document.createElement("br"), nom + " (" + def.cols.length + ")"); ligne.append(bloc);
      animateurs.push({ ctx: cv.getContext("2d"), img, log1: { L, H, ligne: c.lignes[def.ligne] ?? 0, def }, debut: performance.now() });
    }
    carte.append(ligne); zone.append(carte);
  }
}
async function echelle() {
  const zone = sel("echelle");
  for (const e of D.echelle) {
    const img = await charger(e.planche);
    const carte = document.createElement("div"); carte.className = "carte";
    const cv = document.createElement("canvas"); const total = e.l * (1 + 2 + 3) + 40; cv.width = total; cv.height = e.h * 3 + 4;
    const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
    let x = 0; for (const z of [1, 2, 3]) { ctx.drawImage(img, e.x, e.y, e.l, e.h, x, cv.height - 2 - e.h * z, e.l * z, e.h * z); x += e.l * z + 12; }
    carte.append(cv, document.createElement("br"), e.nom + " (" + e.l + "×" + e.h + " px)"); zone.append(carte);
  }
}
for (const p of D.portraits) { const c = document.createElement("div"); c.className = "carte"; c.innerHTML = '<img src="' + p.fichier + '" style="image-rendering:pixelated;height:206px"><br>' + p.nom + '<br><small>' + p.source + '</small>'; sel("portraits").append(c); }
remplirApparences(); ssj2(); creatures(); log1(); echelle(); requestAnimationFrame(boucle);
</script>
</body>
</html>
`;
}
