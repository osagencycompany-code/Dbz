"""
Recolle le sentier forestier de la planche Southwest Forest (Buu's Fury) en deux maps reliées par un portail :
  - foret-sud  : clairière d'entrée, grande clairière, branche ouest        (boucle de farm 4-8)
  - foret-nord : couloirs et clairières vers le cratère                    (farm 8-12, dinosaure)
Les tronçons se touchent déjà sans couture dans la planche : on découpe un rectangle englobant,
les zones vides (fond de planche) sont noircies et bloquées, les arbres et buissons sont bloqués automatiquement.

Usage : python tools/foret.py   (remplace foret-sud/foret-nord ; supprime l'ancienne map « foret » d'un seul écran)
"""
import json
import os

import numpy as np
from PIL import Image

import sys
sys.path.insert(0, os.path.dirname(__file__))
import extract_map_regions as e  # noqa: E402

SRC = "assets/raw/graphics/maps/Southwest Forest.png"
VIDE = np.array((71, 255, 187))
NOIR = (14, 24, 14)
TILE = 16

# (x0, y0, x1, y1) des tronçons dans la planche
SUD = [(1058, 3605, 1460, 4007), (1243, 3202, 1485, 3604), (931, 2639, 1493, 3201),
       (528, 2806, 930, 3048), (285, 2814, 527, 3296), (947, 2236, 1189, 2638)]
NORD = [(795, 1993, 1357, 2235), (651, 1750, 973, 1992), (1131, 1590, 1373, 1992),
        (1099, 1187, 1581, 1589), (1323, 944, 1645, 1186)]


def assembler(troncons):
    im = np.array(Image.open(SRC).convert("RGB"))
    x0 = min(t[0] for t in troncons); y0 = min(t[1] for t in troncons)
    x1 = max(t[2] for t in troncons); y1 = max(t[3] for t in troncons)
    # alignement sur la grille de 16 px
    w = (x1 - x0 + TILE - 1) // TILE * TILE
    h = (y1 - y0 + TILE - 1) // TILE * TILE
    toile = np.zeros((h, w, 3), np.uint8)
    toile[:] = VIDE
    for (a, b, c, d) in troncons:
        toile[b - y0:d - y0, a - x0:c - x0] = im[b:d, a:c]
    return toile, (x0, y0)


SEPARATEURS = [(71, 255, 187), (46, 165, 121), (52, 188, 136)]


def nettoyer(toile):
    """Supprime les liserés turquoise des planches : au bord du vide ils deviennent du vide, à l'intérieur on recopie le voisin.
    Renvoie (image propre, masque du vide)."""
    from scipy import ndimage
    sep = np.zeros(toile.shape[:2], bool)
    for c in SEPARATEURS:
        sep |= np.all(toile == np.array(c), axis=2)
    vide = np.all(toile == VIDE, axis=2)
    vide_large = ndimage.binary_dilation(vide, iterations=3)
    vide |= sep & vide_large
    interieur = sep & ~vide
    img = toile.copy()
    for _ in range(4):
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            reste = interieur.copy()
            ys, xs = np.nonzero(reste)
            for y, x in zip(ys, xs):
                yy, xx = y + dy, x + dx
                if 0 <= yy < img.shape[0] and 0 <= xx < img.shape[1] and not interieur[yy, xx] and not vide[yy, xx]:
                    img[y, x] = img[yy, xx]
                    interieur[y, x] = False
    img[vide] = NOIR
    return img, vide


def collisions(toile, vide):
    """Arbres et buissons (vert saturé), vide de planche, eau/noir."""
    h, w = toile.shape[:2]
    cols, rows = w // TILE, h // TILE
    base = [0] * (cols * rows)
    for ty in range(rows):
        for tx in range(cols):
            if vide[ty * TILE:(ty + 1) * TILE, tx * TILE:(tx + 1) * TILE].mean() > 0.2:
                base[ty * cols + tx] = 1
    t = toile.astype(int)
    arbre = ((t[:, :, 1] - t[:, :, 0] >= 60) & (t[:, :, 1] - t[:, :, 2] >= 60))
    data = list(base)
    for ty in range(rows):
        for tx in range(cols):
            if arbre[ty * TILE:(ty + 1) * TILE, tx * TILE:(tx + 1) * TILE].mean() > 0.35:
                data[ty * cols + tx] = 1
    return cols, rows, data


def ecrire(nom, troncons):
    toile, origine = assembler(troncons)
    img, vide = nettoyer(toile)
    cols, rows, data = collisions(img, vide)
    dossier = "maps/mont-paozu"
    Image.fromarray(img).save(f"{dossier}/{nom}.png")
    e.write_tmj(f"{dossier}/{nom}.tmj", f"{nom}.png", cols, rows, data)
    print(f"{nom} : {img.shape[1]}x{img.shape[0]} px (origine planche {origine}), {sum(data)}/{len(data)} cases bloquées")
    json.dump({"origine": origine, "troncons": troncons}, open(f"{dossier}/{nom}.origine.json", "w"))


if __name__ == "__main__":
    ecrire("foret-sud", SUD)
    ecrire("foret-nord", NORD)
