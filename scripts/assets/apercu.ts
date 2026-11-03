/** Génère assets/build/apercu.html : page autonome (données intégrées) pour valider les sprites et animations. */

export interface AnimationDef {
  cols: number[];
  fps?: number;
  loop?: boolean;
  row?: string;
  durations_ms?: number[];
}
export interface AnimationsFichier {
  frame: number;
  columns: number;
  rows: Record<string, number>;
  animations: Record<string, AnimationDef>;
}
export interface EntreeApercu {
  joueurs: { personnage: string; forme: string; palette: string; planche: string; animations: AnimationsFichier }[];
  sprites: {
    id: string;
    nom: string;
    type: "monstre" | "boss" | "pnj";
    statut: string;
    source: string;
    fichier: string | null;
    format: string;
    largeur: number;
    hauteur: number;
    note: string;
  }[];
}

export function genererApercu(donnees: EntreeApercu): string {
  const json = JSON.stringify(donnees).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>DBZ MY GAME – Aperçu des assets</title>
<style>
  :root { color-scheme: dark; }
  body { background:#14102a; color:#eee; font:14px/1.4 system-ui,sans-serif; margin:0; padding:16px 24px 60px; }
  h1 { color:#f5c518; margin:0 0 4px; } h2 { color:#f5c518; border-bottom:1px solid #f5c518; padding-bottom:4px; margin-top:36px; }
  p.aide { color:#aab; max-width:900px; }
  canvas, .case { image-rendering:pixelated; background:#3f7a3a; }
  .grille { display:flex; flex-wrap:wrap; gap:12px; }
  .carte { background:#1f1a3d; border:1px solid #3a3470; border-radius:6px; padding:8px; }
  .carte.avalider { border-color:#f5c518; box-shadow:0 0 0 1px #f5c518; }
  .carte h3 { margin:0 0 4px; font-size:14px; } .carte small { color:#9ab; display:block; max-width:220px; }
  .badge { display:inline-block; padding:0 6px; border-radius:8px; font-size:11px; margin-right:4px; background:#444; }
  .badge.brouillon { background:#8a5a00; } .badge.valide { background:#1d7a3a; } .badge.maison { background:#5b3a9a; }
  .rangee { display:flex; gap:4px; } .case { background-color:#3f7a3a; background-repeat:no-repeat; }
  .legende { font-size:11px; color:#9ab; display:flex; gap:4px; } .legende span { text-align:center; }
  label { margin-right:12px; } select { background:#1f1a3d; color:#eee; border:1px solid #3a3470; padding:2px 4px; }
  .anim { text-align:center; font-size:11px; color:#9ab; }
</style>
</head>
<body>
<h1>Aperçu des assets</h1>
<p class="aide">Généré par <code>npm run assets:build</code>. Les cartes bordées d'or sont des sprites dessinés par Claude ou en brouillon : dis-moi lesquels te conviennent. Ordre des lignes d'un sprite de monstre : dos, face, gauche, droite.</p>

<h2>Échelle réelle (écran de jeu 480 × 270)</h2>
<p class="aide">Le joueur et les monstres côte à côte, tels qu'ils apparaîtront (zoom ×2 sur cette page). Contrôle d'échelle de la direction artistique.</p>
<canvas id="echelle" width="480" height="270" style="width:960px;height:540px"></canvas>

<h2>Personnage joueur (Goku, 3 palettes)</h2>
<p class="aide">Choisis une palette et une direction : toutes les animations de la planche jouent en boucle.</p>
<div>
  <label>Palette <select id="palette"></select></label>
  <label>Forme <select id="forme"></select></label>
  <label>Direction <select id="direction"></select></label>
</div>
<div class="grille" id="animations"></div>
<h3>Les trois palettes côte à côte (repos, face)</h3>
<div class="grille" id="palettes"></div>

<h2>Monstres, boss et PNJ</h2>
<div class="grille" id="sprites"></div>

<script>
const DONNEES = ${json};
const ZOOM = 4;
const imgs = {};
function charger(src) { return imgs[src] ??= new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; }); }

// ---------- animations du joueur
const DIRECTIONS = { "face": ["face", false], "trois-quarts": ["trois-quarts", false], "profil droite": ["profil", false], "profil gauche": ["profil", true], "dos": ["dos", false] };
const sel = (id) => document.getElementById(id);
const palettes = [...new Set(DONNEES.joueurs.map((j) => j.palette))];
const formes = [...new Set(DONNEES.joueurs.map((j) => j.forme))];
for (const p of palettes) sel("palette").add(new Option(p, p));
for (const f of formes) sel("forme").add(new Option(f, f));
for (const d of Object.keys(DIRECTIONS)) sel("direction").add(new Option(d, d));
const animateurs = [];

function dessinerFrame(ctx, img, def, anims, col, direction, x, y, zoom) {
  const F = anims.frame;
  const rangeeNom = def.row ?? DIRECTIONS[direction][0];
  const miroir = def.row ? false : DIRECTIONS[direction][1];
  const ligne = anims.rows[rangeeNom] ?? 0;
  ctx.save();
  if (miroir) { ctx.translate(x + F * zoom, y); ctx.scale(-1, 1); ctx.drawImage(img, col * F, ligne * F, F, F, 0, 0, F * zoom, F * zoom); }
  else ctx.drawImage(img, col * F, ligne * F, F, F, x, y, F * zoom, F * zoom);
  ctx.restore();
}

async function montrerAnimations() {
  animateurs.length = 0;
  const entree = DONNEES.joueurs.find((j) => j.palette === sel("palette").value && j.forme === sel("forme").value);
  const zone = sel("animations"); zone.innerHTML = "";
  if (!entree) return;
  const img = await charger(entree.planche);
  const F = entree.animations.frame;
  for (const [nom, def] of Object.entries(entree.animations.animations)) {
    const c = document.createElement("canvas"); c.width = F * ZOOM; c.height = F * ZOOM;
    const bloc = document.createElement("div"); bloc.className = "anim"; bloc.append(c, document.createElement("br"), nom + " (" + def.cols.length + ")");
    zone.append(bloc);
    animateurs.push({ ctx: c.getContext("2d"), img, def, anims: entree.animations, debut: performance.now() });
  }
}
function boucle(t) {
  const direction = sel("direction").value;
  for (const a of animateurs) {
    const { def } = a, n = def.cols.length;
    let i;
    if (def.durations_ms) { const total = def.durations_ms.reduce((s, d) => s + d, 0); let r = (t - a.debut) % total; i = 0; while (r >= def.durations_ms[i]) { r -= def.durations_ms[i]; i++; } }
    else i = Math.floor(((t - a.debut) / 1000) * (def.fps ?? 8)) % n;
    a.ctx.clearRect(0, 0, a.ctx.canvas.width, a.ctx.canvas.height);
    dessinerFrame(a.ctx, a.img, def, a.anims, def.cols[Math.min(i, n - 1)], direction, 0, 0, ZOOM);
  }
  requestAnimationFrame(boucle);
}
for (const id of ["palette", "forme"]) sel(id).onchange = montrerAnimations;
montrerAnimations(); requestAnimationFrame(boucle);

(async () => {
  const zone = sel("palettes");
  for (const j of DONNEES.joueurs.filter((j) => j.forme === sel("forme").value || j.forme === "normal")) {
    const img = await charger(j.planche);
    const c = document.createElement("canvas"); c.width = 32 * ZOOM; c.height = 32 * ZOOM;
    dessinerFrame(c.getContext("2d"), img, { cols: [0] }, j.animations, 0, "face", 0, 0, ZOOM);
    const carte = document.createElement("div"); carte.className = "carte";
    carte.append(c, document.createElement("br"), j.forme + " – " + j.palette);
    zone.append(carte);
  }
})();

// ---------- monstres, boss, PNJ
(async () => {
  const zone = sel("sprites");
  const tailleCase = (s) => (s.format.includes("64x64") ? 64 : 32);
  for (const s of DONNEES.sprites) {
    const carte = document.createElement("div");
    const avalider = s.source === "maison" || s.statut === "brouillon";
    carte.className = "carte" + (s.source === "maison" ? " avalider" : "");
    const titre = document.createElement("h3"); titre.textContent = s.nom;
    const infos = document.createElement("div");
    infos.innerHTML = '<span class="badge ' + s.statut + '">' + s.statut + '</span><span class="badge ' + (s.source === "maison" ? "maison" : "") + '">' + s.source + '</span><span class="badge">' + s.type + ' · ' + s.id + '</span>';
    carte.append(titre, infos);
    if (s.fichier) {
      const T = tailleCase(s), zoom = T === 64 ? 2 : 3, unique = s.format === "image-unique";
      const rangee = document.createElement("div"); rangee.className = "rangee";
      const noms = unique ? ["image"] : ["dos", "face", "gauche", "droite"];
      const legende = document.createElement("div"); legende.className = "legende";
      noms.forEach((nom, i) => {
        const c = document.createElement("div"); c.className = "case";
        c.style.cssText = "width:" + T * zoom + "px;height:" + T * zoom + "px;background-image:url(" + s.fichier + ");background-size:" + s.largeur * zoom + "px " + s.hauteur * zoom + "px;background-position:0 -" + i * T * zoom + "px;";
        rangee.append(c);
        const l = document.createElement("span"); l.style.width = T * zoom + "px"; l.textContent = nom; legende.append(l);
      });
      carte.append(rangee, legende);
    } else carte.append("(pas de sprite)");
    if (s.note) { const n = document.createElement("small"); n.textContent = s.note; carte.append(n); }
    zone.append(carte);
  }
})();

// ---------- échelle réelle 480 x 270
(async () => {
  const c = sel("echelle"), ctx = c.getContext("2d");
  ctx.fillStyle = "#3f7a3a"; ctx.fillRect(0, 0, 480, 270);
  ctx.fillStyle = "#4a8a44"; for (let y = 0; y < 270; y += 16) for (let x = (y / 16) % 2 ? 0 : 16; x < 480; x += 32) ctx.fillRect(x, y, 16, 16);
  const joueur = DONNEES.joueurs.find((j) => j.forme === "normal" && j.palette === "orange") ?? DONNEES.joueurs[0];
  let x = 20;
  if (joueur) { const img = await charger(joueur.planche); dessinerFrame(ctx, img, { cols: [0] }, joueur.animations, 0, "face", x, 120, 1); x += 36; }
  for (const s of DONNEES.sprites) {
    if (!s.fichier) continue;
    const img = await charger("" + s.fichier); if (!img) continue;
    const T = s.format.includes("64x64") ? 64 : 32, ligne = s.format === "image-unique" ? 0 : 1;
    if (x + T > 470) break;
    ctx.drawImage(img, 0, ligne * T, T, T, x, 150 - T, T, T); x += T + 4;
  }
})();
</script>
</body>
</html>
`;
}
