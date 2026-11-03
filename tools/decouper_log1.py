"""Découpe des planches de Legacy of Goku 1 (GIF/PNG à fond uni, sprites irréguliers) en planches à cases régulières.

Les originaux de assets/raw/ ne sont jamais modifiés : ce script écrit des planches dérivées (fond transparent,
sprites posés sur le bas de la case, centrés, sans aucune mise à l'échelle) dans assets/monstres/ et assets/bosses/.
Usage : python -I tools/decouper_log1.py
"""
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
RAW = os.path.join(RACINE, 'assets', 'raw', 'legacy-of-goku-1')


def charger(nom):
    img = Image.open(os.path.join(RAW, nom)).convert('RGB')
    return np.array(img), img.getpixel((0, 0))


def bande(a, bg, x0, y0, x1, y1, dil=1, aire_min=40, scinder=()):
    """Sprites d'une bande de la planche, de gauche à droite. `scinder` : indices de composants à couper en deux."""
    sub = a[y0:y1, x0:x1]
    masque = np.any(sub != np.array(bg), axis=-1)
    lab, _ = ndi.label(ndi.binary_dilation(masque, structure=np.ones((3, 3)), iterations=dil))
    boites = []
    for i, s in enumerate(ndi.find_objects(lab), 1):
        zone = (lab[s] == i) & masque[s]
        if zone.sum() < aire_min:
            continue
        ys, xs = np.where(zone)
        boites.append([x0 + s[1].start + int(xs.min()), y0 + s[0].start + int(ys.min()),
                       x0 + s[1].start + int(xs.max()) + 1, y0 + s[0].start + int(ys.max()) + 1])
    boites.sort(key=lambda b: b[0])
    sortie = []
    for i, b in enumerate(boites):
        if i in scinder:
            milieu = (b[0] + b[2]) // 2
            sortie += [[b[0], b[1], milieu, b[3]], [milieu, b[1], b[2], b[3]]]
        else:
            sortie.append(b)
    return sortie


def bande_coupee(a, bg, y0, y1, coupes):
    """Sprites séparés par des coupes verticales explicites (quand les ombres se touchent) ; boîte resserrée sur chaque sprite."""
    boites = []
    for x0, x1 in zip(coupes[:-1], coupes[1:]):
        masque = np.any(a[y0:y1, x0:x1] != np.array(bg), axis=-1)
        ys, xs = np.where(masque)
        boites.append([x0 + int(xs.min()), y0 + int(ys.min()), x0 + int(xs.max()) + 1, y0 + int(ys.max()) + 1])
    return boites


def planche(a, bg, boites_par_ligne, cadre_l, cadre_h):
    """Assemble les sprites en cases de cadre_l × cadre_h : centrés, pieds en bas, fond transparent."""
    lignes = len(boites_par_ligne)
    colonnes = max(len(l) for l in boites_par_ligne)
    sortie = np.zeros((lignes * cadre_h, colonnes * cadre_l, 4), dtype=np.uint8)
    for j, ligne in enumerate(boites_par_ligne):
        for i, (x0, y0, x1, y1) in enumerate(ligne):
            sprite = a[y0:y1, x0:x1]
            h, l = sprite.shape[:2]
            if h > cadre_h or l > cadre_l:
                raise SystemExit(f'sprite {l}×{h} plus grand que la case {cadre_l}×{cadre_h} (ligne {j}, colonne {i})')
            alpha = np.any(sprite != np.array(bg), axis=-1)
            rgba = np.zeros((h, l, 4), dtype=np.uint8)
            rgba[..., :3] = sprite
            rgba[..., 3] = np.where(alpha, 255, 0)
            ox = i * cadre_l + (cadre_l - l) // 2
            oy = j * cadre_h + (cadre_h - h)
            sortie[oy:oy + h, ox:ox + l] = rgba
    return Image.fromarray(sortie, 'RGBA'), colonnes


def ecrire(dossier, nom, image, colonnes, cadre_l, cadre_h, lignes, animations, source, note):
    os.makedirs(os.path.join(RACINE, dossier), exist_ok=True)
    image.save(os.path.join(RACINE, dossier, nom + '.png'))
    meta = {
        'cadre': [cadre_l, cadre_h], 'colonnes': colonnes, 'lignes': lignes,
        'statut': "brouillon : cases numérotées dans l'ordre de lecture de la planche, correspondance proposée par Claude à valider dans l'aperçu",
        'source': source, 'note': note, 'animations': animations,
    }
    with open(os.path.join(RACINE, dossier, nom + '.anims.json'), 'w', encoding='utf8', newline='\n') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
        f.write('\n')


def main():
    # ---- Raditz et Nappa : planche « Various.gif » (fond vert pur)
    a, bg = charger('Various.gif')
    raditz = bande(a, bg, 0, 38, 660, 80)
    nappa = bande(a, bg, 0, 80, 335, 120, scinder=(5,))
    r = planche(a, bg, [raditz], 40, 40)
    ecrire('assets/monstres', 'raditz-log1', r[0], r[1], 40, 40, {'ligne': 0}, {
        'idle': {'ligne': 'ligne', 'cols': [0, 1], 'fps': 3, 'loop': True},
        'marche': {'ligne': 'ligne', 'cols': [2, 3, 4, 5], 'fps': 8, 'loop': True},
        'dos': {'ligne': 'ligne', 'cols': [6, 7, 8], 'fps': 8, 'loop': True},
        'tir': {'ligne': 'ligne', 'cols': [9, 10, 11, 12], 'fps': 10},
        'tir-2': {'ligne': 'ligne', 'cols': [13, 14], 'fps': 10},
        'blesse': {'ligne': 'ligne', 'cols': [18, 19], 'fps': 8},
        'ko': {'ligne': 'ligne', 'cols': [20, 21, 22], 'fps': 6},
    }, 'assets/raw/legacy-of-goku-1/Various.gif', 'Raditz : 23 cases ; cases 15 à 17 non attribuées.')
    n = planche(a, bg, [nappa], 40, 40)
    ecrire('assets/monstres', 'nappa-log1', n[0], n[1], 40, 40, {'ligne': 0}, {
        'idle': {'ligne': 'ligne', 'cols': [0, 1], 'fps': 3, 'loop': True},
        'marche': {'ligne': 'ligne', 'cols': [2, 3], 'fps': 8, 'loop': True},
        'coup': {'ligne': 'ligne', 'cols': [4, 5, 6], 'fps': 10},
        'tir': {'ligne': 'ligne', 'cols': [8, 9], 'fps': 10},
        'blesse': {'ligne': 'ligne', 'cols': [10], 'fps': 8},
        'ko': {'ligne': 'ligne', 'cols': [11], 'fps': 6},
    }, 'assets/raw/legacy-of-goku-1/Various.gif', 'Nappa : 12 cases (la 6e planche d\'origine est coupée en deux) ; correspondance à vérifier.')

    # ---- Vegeta boss, phase 1 : « Vegeta.png » (quatre bandes : face, côté, dos, divers)
    v, vbg = charger('Vegeta.png')
    bandes = [bande(v, vbg, 0, y0, 513, y1) for y0, y1 in [(5, 46), (46, 86), (86, 126), (126, 168)]]
    p = planche(v, vbg, bandes, 40, 40)
    ecrire('assets/bosses', 'vegeta-phase1', p[0], p[1], 40, 40,
           {'face': 0, 'cote': 1, 'dos': 2, 'divers': 3}, {
        'idle': {'ligne': 'face', 'cols': [0, 1], 'fps': 3, 'loop': True},
        'marche-face': {'ligne': 'face', 'cols': [2, 3, 4, 5], 'fps': 8, 'loop': True},
        'attaque-face': {'ligne': 'face', 'cols': [6, 7, 8], 'fps': 10},
        'blesse': {'ligne': 'face', 'cols': [12, 13, 14], 'fps': 8},
        'marche-cote': {'ligne': 'cote', 'cols': [2, 3, 4, 5], 'fps': 8, 'loop': True},
        'attaque-cote': {'ligne': 'cote', 'cols': [6, 7, 8, 9], 'fps': 10},
        'tir-cote': {'ligne': 'cote', 'cols': [10, 11, 12, 13], 'fps': 10},
        'marche-dos': {'ligne': 'dos', 'cols': [2, 3, 4, 5], 'fps': 8, 'loop': True},
        'ko': {'ligne': 'divers', 'cols': [2, 3], 'fps': 4},
    }, 'assets/raw/legacy-of-goku-1/Vegeta.png',
        'Vegeta de LoG1 (armure blanche et combinaison bleue), à comparer à la version jouable (voir apercu-heros.html). Les lignes face/côté/dos ne sont pas alignées par colonnes avec les animations : à valider.')

    # ---- Grand singe et transformation : « Oozaru Gohan  Vegeta.png » (fond magenta)
    o, obg = charger('Oozaru Gohan  Vegeta.png')
    singe = bande_coupee(o, obg, 0, 65, [160, 196, 229, 262, 295, 332])
    trans = bande_coupee(o, obg, 125, 194, [205, 231, 265, 298, 332])
    g = planche(o, obg, [trans, singe], 72, 72)
    ecrire('assets/bosses', 'vegeta-grand-singe', g[0], g[1], 72, 72, {'transformation': 0, 'singe': 1}, {
        'transformation': {'ligne': 'transformation', 'cols': [0, 1, 2, 3], 'fps': 5, 'loop': False},
        'singe-marche': {'ligne': 'singe', 'cols': [0, 1, 2, 3, 4], 'fps': 6, 'loop': True},
    }, 'assets/raw/legacy-of-goku-1/Oozaru Gohan  Vegeta.png',
        "Ligne 0 : 4 images de transformation ; ligne 1 : singe géant de profil (5 images). La version « en cadre vert » de la planche d'origine est exclue (retouche non officielle). Faces et dos du singe : voir Various.gif.")


if __name__ == '__main__':
    main()
