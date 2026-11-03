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


def planche_cases(a, magenta, lignes, cadre_l, cadre_h):
    """Comme `planche`, mais pour des cases à fond magenta (le magenta devient transparent) : la case entière est conservée, centrée et posée en bas, pour ne pas décaler les images d'une animation."""
    colonnes = max(len(l) for l in lignes)
    sortie = np.zeros((len(lignes) * cadre_h, colonnes * cadre_l, 4), dtype=np.uint8)
    for j, ligne in enumerate(lignes):
        for i, (x0, y0, x1, y1) in enumerate(ligne):
            sprite = a[y0:y1, x0:x1]
            h, l = sprite.shape[:2]
            alpha = np.any(sprite != np.array(magenta), axis=-1)
            if h > cadre_h or l > cadre_l:
                raise SystemExit(f'sprite {l}×{h} plus grand que la case {cadre_l}×{cadre_h} (ligne {j}, colonne {i})')
            rgba = np.zeros((h, l, 4), dtype=np.uint8)
            rgba[..., :3] = sprite
            rgba[..., 3] = np.where(alpha, 255, 0)
            sortie[j * cadre_h + (cadre_h - h):(j + 1) * cadre_h, i * cadre_l + (cadre_l - l) // 2:i * cadre_l + (cadre_l - l) // 2 + l] = rgba
    return Image.fromarray(sortie, 'RGBA'), colonnes


PEAU = {(232, 176, 88), (248, 200, 144)}
VERT = (48, 208, 96, 255)
VERT_CLAIR = (184, 255, 200, 255)


def ajouter_scouter(image, ligne, nb_colonnes, cadre_l, cadre_h, vers_la_droite=None):
    """Dessine un scouter vert (verre sur l'œil, branche vers l'oreille) sur les images d'une ligne de face ou de côté.
    L'œil est repéré par les pixels de peau les plus hauts de la tête ; rien n'est dessiné si la tête est de dos."""
    a = np.array(image)
    for i in range(nb_colonnes):
        x0, y0 = i * cadre_l, ligne * cadre_h
        cadre = a[y0:y0 + cadre_h, x0:x0 + cadre_l]
        peau = [(x, y) for y in range(min(cadre_h, 20)) for x in range(cadre_l) if cadre[y, x, 3] and tuple(int(v) for v in cadre[y, x, :3]) in PEAU]
        if len(peau) < 3:
            continue
        haut = min(y for _, y in peau)
        rang = [x for x, y in peau if y <= haut + 1]
        xmin, xmax = min(rang), max(rang)
        if vers_la_droite:
            # visage de profil tourné vers la droite : verre au bord avant, branche vers l'arrière
            lentille = [(xmax - 1, haut), (xmax, haut), (xmax - 1, haut + 1), (xmax, haut + 1)]
            branche = [(x, haut) for x in range(xmin - 1, xmax - 1)]
        else:
            lentille = [(xmin, haut), (xmin + 1, haut), (xmin, haut + 1), (xmin + 1, haut + 1)]
            branche = [(xmin - 1, haut), (xmin - 1, haut + 1), (xmin - 1, haut - 1)]
        for k, (x, y) in enumerate(lentille):
            if 0 <= x < cadre_l and 0 <= y < cadre_h:
                cadre[y, x] = VERT_CLAIR if k == 0 else VERT
        for x, y in branche:
            if 0 <= x < cadre_l and 0 <= y < cadre_h and cadre[y, x, 3]:
                cadre[y, x] = VERT
    return Image.fromarray(a, 'RGBA')


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

    # ---- Vegeta boss : « vegeta-saga-saiyan.png » (blocs « Saiyan Saga » et « Great Ape », cases sur fond magenta)
    sg, _ = charger('vegeta-saga-saiyan.png')
    MAGENTA = (248, 0, 248)

    def case(x, y, l, h):
        return (x, y, x + l, y + h)

    def groupe(x0, y, l, nb, pas=None):
        pas = pas or l + 8
        return [case(x0 + i * pas, y, l, 32) for i in range(nb)]

    # Saiyan Saga : face x=760, dos x=968, côté x=1176 ; mêmes lignes dans les trois colonnes
    def lignes_vegeta(x0, cote):
        l = 32 if cote else 16
        idle = [case(x0 + i * 24, 56, 16, 32) for i in range(2)]
        marche = [case(x0 + i * 24, 120, 16, 32) for i in range(4)]
        if cote:
            coups = [case(x0 + i * 40, 184, 32, 32) for i in range(8)]
            coups = [case(x0 + (i if i < 4 else i) * 40 + (8 if i >= 4 else 0), 184, 32, 32) for i in range(8)]
            tir = [case(x0 + i * 40, 248, 32, 32) for i in range(3)]
        else:
            coups = [case(x0 + i * 24 + (8 if i >= 4 else 0), 184, 16, 32) for i in range(8)]
            tir = [case(x0 + i * 24, 248, 16, 32) for i in range(3)]
        colere = [case(x0 + i * 24, 312, 16, 32) for i in range(4)]
        return idle + marche + coups + tir + colere

    face = lignes_vegeta(760, False) + [case(760 + i * 24, 376, 16, 32) for i in range(4)]
    dos = lignes_vegeta(968, False)
    cote = lignes_vegeta(1176, True)
    p = planche_cases(sg, MAGENTA, [face, dos, cote], 32, 32)
    img = ajouter_scouter(p[0], 0, len(face), 32, 32)
    img = ajouter_scouter(img, 2, len(cote), 32, 32, vers_la_droite=True)
    p = (img, p[1])
    anims_saga = {
        'idle': ('face', [0, 1], 3, True), 'marche': ('face', [2, 3, 4, 5], 8, True), 'coup': ('face', list(range(6, 14)), 12, False),
        'tir': ('face', [14, 15, 16], 8, False), 'colere': ('face', [17, 18, 19, 20], 6, True), 'vaincu': ('face', [21, 22, 23, 24], 5, False),
        'marche-dos': ('dos', [2, 3, 4, 5], 8, True), 'coup-dos': ('dos', list(range(6, 14)), 12, False),
        'idle-cote': ('cote', [0, 1], 3, True), 'marche-cote': ('cote', [2, 3, 4, 5], 8, True), 'coup-cote': ('cote', list(range(6, 14)), 12, False),
        'tir-cote': ('cote', [14, 15, 16], 8, False), 'colere-cote': ('cote', [17, 18, 19, 20], 6, True),
    }
    ecrire('assets/bosses', 'vegeta-phase1', p[0], p[1], 32, 32, {'face': 0, 'dos': 1, 'cote': 2}, {
        n: {'ligne': l, 'cols': c, 'fps': f, 'loop': b} for n, (l, c, f, b) in anims_saga.items()
    }, 'assets/raw/legacy-of-goku-1/vegeta-saga-saiyan.png', 'Bloc « Saiyan Saga » (armure de la saga Saiyan), cases de 32×32, avec un scouter vert ajouté par ce script sur les images de face et de côté (pas de scouter de dos).')

    # Great Ape : face x=1512, dos x=1680, côté x=1848 (cases 32×64) ; transformation (4 images) dans le bloc Saiyan Saga
    def ape(x0, ys):
        return [case(x0 + i * 40, y, 32, 64) for y, nb in ys for i in range(nb)]
    transformation = [case(1304 + i * 40, 248, 32, 64) for i in range(4)]
    singe_face = [case(1512 + i * 40, 56, 32, 64) for i in range(2)] + [case(1512 + i * 40, 152, 32, 64) for i in range(4)] + [case(1512 + i * 40, 248, 32, 64) for i in range(3)]
    singe_dos = [case(1680 + i * 40, 56, 32, 64) for i in range(2)] + [case(1680 + i * 40, 152, 32, 64) for i in range(4)] + [case(1680 + i * 40, 248, 32, 64) for i in range(3)]
    singe_cote = [case(1848 + i * 40, 56, 32, 64) for i in range(2)] + [case(1848 + i * 40, 152, 32, 64) for i in range(4)] + [case(1848 + i * 40, 248, 32, 64) for i in range(3)]
    g = planche_cases(sg, MAGENTA, [transformation, singe_face, singe_dos, singe_cote], 32, 64)
    ecrire('assets/bosses', 'vegeta-grand-singe', g[0], g[1], 32, 64, {'transformation': 0, 'face': 1, 'dos': 2, 'cote': 3}, {
        'transformation': {'ligne': 'transformation', 'cols': [0, 1, 2, 3], 'fps': 5, 'loop': False},
        'idle': {'ligne': 'face', 'cols': [0, 1], 'fps': 3, 'loop': True},
        'marche': {'ligne': 'face', 'cols': [2, 3, 4, 5], 'fps': 6, 'loop': True},
        'attaque': {'ligne': 'face', 'cols': [6, 7, 8], 'fps': 6, 'loop': False},
        'idle-dos': {'ligne': 'dos', 'cols': [0, 1], 'fps': 3, 'loop': True},
        'marche-dos': {'ligne': 'dos', 'cols': [2, 3, 4, 5], 'fps': 6, 'loop': True},
        'idle-cote': {'ligne': 'cote', 'cols': [0, 1], 'fps': 3, 'loop': True},
        'marche-cote': {'ligne': 'cote', 'cols': [2, 3, 4, 5], 'fps': 6, 'loop': True},
        'attaque-cote': {'ligne': 'cote', 'cols': [6, 7, 8], 'fps': 6, 'loop': False},
    }, 'assets/raw/legacy-of-goku-1/vegeta-saga-saiyan.png', 'Bloc « Great Ape » (cases 32×64) ; la transformation vient du bloc « Saiyan Saga ».')


if __name__ == '__main__':
    main()
