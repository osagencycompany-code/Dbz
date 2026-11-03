"""Test d'échelle des effets de « Small Effects » et « Aura Effects » (aperçus réduits de DeviantArt, assets/raw/effets-swl/).

Nettoie des extraits situés hors du filigrane (fond uni retiré, halo supprimé, palette réduite pour retrouver des contours nets)
et les écrit dans assets/build/effets-test/ (dossier non versionné : ce sont des aperçus d'un pack payant, rien n'est copié dans le jeu).
Usage : python -I tools/test_effets_swl.py
"""
import os

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
RAW = os.path.join(RACINE, 'assets', 'raw', 'effets-swl')
SORTIE = os.path.join(RACINE, 'assets', 'build', 'effets-test')
FOND = np.array([44, 42, 51])

AURAS = '6fd91olobtoe1.png'
PETITS = 'small_effects_sprite_sheet_swl__by_justoruma_dfx5gdp-375w-2x.jpg'

# nom : (planche, (x0, y0, x1, y1), seuil de distance au fond, nombre de couleurs) ; tous hors de la zone du filigrane
EXTRAITS = {
    'aura-doree': (AURAS, (8, 296, 64, 348), 45, 10),
    'aura-doree-2': (AURAS, (126, 60, 180, 92), 45, 10),
    'aura-charge-bleue': (AURAS, (8, 436, 195, 500), 45, 12),
    'aura-charge-bleue-2': (AURAS, (8, 160, 130, 200), 45, 12),
    'eclair-etoile': (PETITS, (80, 232, 116, 260), 70, 8),
    'eclair-arcs': (PETITS, (236, 236, 300, 262), 70, 8),
    'etincelle-jaune': (PETITS, (10, 70, 30, 92), 70, 8),
    'etincelle-rose': (PETITS, (76, 122, 150, 142), 70, 8),
    'impact-bleu': (PETITS, (230, 148, 300, 180), 70, 8),
}


def nettoyer(img, boite, seuil, couleurs):
    a = np.array(img.convert('RGB').crop(boite)).astype(int)
    distance = np.abs(a - FOND).max(axis=-1)
    masque = distance > seuil
    masque = ndi.binary_opening(masque, structure=np.ones((2, 2))) | (masque & ndi.binary_dilation(ndi.binary_opening(masque, structure=np.ones((2, 2))), iterations=1))
    # petits morceaux isolés (poussière de compression) supprimés
    lab, n = ndi.label(ndi.binary_dilation(masque, iterations=1))
    for i in range(1, n + 1):
        zone = (lab == i) & masque
        if zone.sum() < 4:
            masque[zone] = False
    sortie = np.zeros(a.shape[:2] + (4,), dtype=np.uint8)
    if masque.any():
        pixels = a[masque].astype(np.uint8)
        # réduction de palette : couleurs franches, plus de dégradés
        reduit = Image.fromarray(pixels.reshape(-1, 1, 3)).quantize(colors=couleurs, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
        sortie[masque, :3] = np.array(reduit).reshape(-1, 3)
        sortie[masque, 3] = 255
    ys, xs = np.where(sortie[..., 3] > 0)
    if not len(xs):
        raise SystemExit('extrait vide : ' + str(boite))
    return Image.fromarray(sortie[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA')


def main():
    os.makedirs(SORTIE, exist_ok=True)
    feuilles = {AURAS: Image.open(os.path.join(RAW, AURAS)), PETITS: Image.open(os.path.join(RAW, PETITS))}
    for nom, (feuille, boite, seuil, couleurs) in EXTRAITS.items():
        im = nettoyer(feuilles[feuille], boite, seuil, couleurs)
        # un fichier par effet isolé (composants séparés), de gauche à droite
        a = np.array(im)
        lab, n = ndi.label(ndi.binary_dilation(a[..., 3] > 0, structure=np.ones((3, 3)), iterations=1))
        morceaux = []
        for i, sl in enumerate(ndi.find_objects(lab), 1):
            m = a[sl].copy()
            m[lab[sl] != i] = 0
            if (m[..., 3] > 0).sum() >= 12:
                morceaux.append((sl[1].start, m))
        for k, (_, m) in enumerate(sorted(morceaux, key=lambda t: t[0])):
            ys, xs = np.where(m[..., 3] > 0)
            m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
            Image.fromarray(m, 'RGBA').save(os.path.join(SORTIE, f'{nom}-{k}.png'))
            print(f'{nom}-{k}', m.shape[1], 'x', m.shape[0])



def page():
    """Page de test : effets posés sur nos héros de 32 px, à ×1, ×2 et ×3 (échelles entières seulement)."""
    html = """<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Test d'échelle des effets SWL</title>
<style>body{background:#14102a;color:#eee;font:14px system-ui;padding:16px 24px}h1,h2{color:#f5c518}canvas{image-rendering:pixelated;background:#3f7a3a;margin:4px}
.l{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}.c{text-align:center;font-size:12px;color:#9ab}</style></head><body>
<h1>Test d'échelle des effets (aperçus SWL nettoyés)</h1>
<p>Chaque effet est posé sur un héros de 32 px à ×1, ×2 et ×3, sans aucune mise à l'échelle non entière. Les fichiers viennent de <code>assets/build/effets-test/</code>.</p>
<div id="zone"></div>
<script>
const HEROS = [["Vegeta", "characters/vegeta-normale-normal.png", "characters/vegeta-normale-super-saiyan.png"], ["Goku", "characters/goku-normale-normal.png", "characters/goku-normale-super-saiyan.png"]];
const EFFETS = {
  or: ["aura-doree-0", "aura-doree-1", "aura-doree-2"],
  charge: ["aura-charge-bleue-2-1", "aura-charge-bleue-2-2", "aura-charge-bleue-2-1"],
  grandeAura: ["aura-charge-bleue-1", "aura-charge-bleue-2", "aura-charge-bleue-3"],
  eclairs: ["eclair-etoile-0", "eclair-arcs-1"],
  impacts: ["etincelle-jaune-0", "impact-bleu-1", "impact-bleu-0"]
};
const cache = {};
const img = (s) => (cache[s] ??= new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = s; }));
const zone = document.getElementById("zone");
const scenes = [];
async function ajouter(titre, hero, planche, effets) {
  const h = document.createElement("h2"); h.textContent = titre; zone.append(h);
  const ligne = document.createElement("div"); ligne.className = "l"; zone.append(ligne);
  const fond = await img(planche);
  for (const z of [1, 2, 3]) {
    const cv = document.createElement("canvas"); cv.width = 96 * z; cv.height = 64 * z;
    const bloc = document.createElement("div"); bloc.className = "c"; bloc.append(cv, document.createElement("br"), "×" + z); ligne.append(bloc);
    scenes.push({ ctx: cv.getContext("2d"), fond, z, effets: await Promise.all(effets.map(async (e) => ({ ...e, im: await img("effets-test/" + e.nom + ".png") }))) });
  }
}
(async () => {
  for (const [nom, normal, ssj] of HEROS) {
    await ajouter(nom + " – Super Saiyan : aura dorée derrière", nom, ssj, [{ nom: "aura-doree-1", derriere: true, dx: 0, dy: 0 }]);
    await ajouter(nom + " – charge du ki : petite aura bleue puis grande aura", nom, normal, [{ nom: "aura-charge-bleue-2-1", derriere: true, dx: 0, dy: 0 }]);
    await ajouter(nom + " – (grande aura bleue, trop grande ?)", nom, normal, [{ nom: "aura-charge-bleue-1", derriere: true, dx: 0, dy: 0 }]);
    await ajouter(nom + " – SSJ2 : éclair bleu (étoile + arcs) par intermittence", nom, ssj, [{ nom: "eclair-etoile-0", dx: -8, dy: -6, clignote: 0 }, { nom: "eclair-arcs-1", dx: 8, dy: 6, clignote: 1 }]);
    await ajouter(nom + " – étincelle d'impact (jaune) et impact bleu", nom, normal, [{ nom: "etincelle-jaune-0", dx: 12, dy: -2 }, { nom: "impact-bleu-1", dx: -12, dy: 4, clignote: 2 }]);
  }
  requestAnimationFrame(boucle);
})();
function boucle(t) {
  for (const s of scenes) {
    const { ctx, z } = s; ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const ox = 32 * z, oy = 16 * z; // case du héros : 32 × 32 px au centre
    const col = Math.floor(t / 150) % 2; // repos : 2 images
    const dessinerEffet = (e) => {
      if (!e.im) return;
      if (e.clignote !== undefined && Math.floor(t / 120 + e.clignote * 3) % 3 === 0) return; // intermittence
      const w = e.im.width, h = e.im.height;
      ctx.drawImage(e.im, ox + (16 + (e.dx ?? 0)) * z - Math.round(w * z / 2), oy + (e.derriere ? 31 : 16 + (e.dy ?? 0)) * z - (e.derriere ? h * z : Math.round(h * z / 2)), w * z, h * z);
    };
    s.effets.filter((e) => e.derriere).forEach(dessinerEffet);
    ctx.drawImage(s.fond, col * 32, 64, 32, 32, ox, oy, 32 * z, 32 * z);
    s.effets.filter((e) => !e.derriere).forEach(dessinerEffet);
  }
  requestAnimationFrame(boucle);
}
</script></body></html>"""
    with open(os.path.join(RACINE, 'assets', 'build', 'test-effets-swl.html'), 'w', encoding='utf8', newline='\n') as f:
        f.write(html)


if __name__ == '__main__':
    main()
    page()
