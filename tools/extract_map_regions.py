"""
Découpe une planche de maps (format Spriters Resource : plusieurs sous-maps sur un fond uni)
en maps séparées, puis génère pour chacune un fichier Tiled (.tmj) :
  - calque image « fond »        : l'image de la map
  - calque tuiles « collisions »  : pré-rempli automatiquement (eau, noir, fond de planche), cases de 16 px
  - calque objets « objets »     : vide, à remplir (spawn, portails, zones de monstres, PNJ)

Usage :
  python tools/extract_map_regions.py <planche.png> <dossier_sortie> <nom1> [<nom2> ...]
Les régions sont triées de la plus grande à la plus petite ; donner un nom par région à garder.

Planches « en grille » (écrans séparés par des lignes de 1 px couleur de fond, ex. Diablo Desert :
colonnes 996 et 1479) : il faut d'abord supprimer ces lignes et recoller les écrans, puis vérifier
le résultat visuellement. Voir docs/beta0-spec.md, section Maps.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

TILE = 16
SHEET_BG = [(171, 227, 167), (71, 255, 187), (255, 174, 201)]


def find_regions(im):
    bgc = tuple(int(v) for v in im[2, 2])
    mask = np.ones(im.shape[:2], bool)
    for c in SHEET_BG + [bgc]:
        mask &= ~np.all(im == np.array(c), axis=2)
    lab, _ = ndimage.label(ndimage.binary_closing(mask, iterations=3))
    out = []
    for sl in ndimage.find_objects(lab):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if w >= 160 and h >= 120:
            out.append((sl[1].start, sl[0].start, w, h))
    return bgc, sorted(out, key=lambda r: -r[2] * r[3])


def auto_collisions(rgb, bgc):
    h, w = rgb.shape[:2]
    cols, rows = (w + TILE - 1) // TILE, (h + TILE - 1) // TILE
    data = []
    for ty in range(rows):
        for tx in range(cols):
            cell = rgb[ty * TILE:(ty + 1) * TILE, tx * TILE:(tx + 1) * TILE].reshape(-1, 3).astype(int)
            r, g, b = cell[:, 0], cell[:, 1], cell[:, 2]
            water = ((b > 150) & (b > r + 40) & (b > g - 10)).mean()
            black = ((r < 20) & (g < 20) & (b < 20)).mean()
            sheet = np.all(cell == np.array(bgc), axis=1).mean()
            data.append(1 if (water > 0.6 or black > 0.6 or sheet > 0.6) else 0)
    return cols, rows, data


def write_tmj(path, img_name, cols, rows, data):
    tmj = {
        "type": "map", "version": "1.10", "tiledversion": "1.11.0", "orientation": "orthogonal",
        "renderorder": "right-down", "infinite": False, "width": cols, "height": rows,
        "tilewidth": TILE, "tileheight": TILE, "nextlayerid": 4, "nextobjectid": 1,
        "layers": [
            {"id": 1, "type": "imagelayer", "name": "fond", "image": img_name, "x": 0, "y": 0,
             "offsetx": 0, "offsety": 0, "opacity": 1, "visible": True},
            {"id": 2, "type": "tilelayer", "name": "collisions", "width": cols, "height": rows,
             "x": 0, "y": 0, "opacity": 0.45, "visible": True, "data": data},
            {"id": 3, "type": "objectgroup", "name": "objets", "draworder": "topdown",
             "x": 0, "y": 0, "opacity": 1, "visible": True, "objects": []},
        ],
        "tilesets": [{"firstgid": 1, "name": "collision", "tilewidth": TILE, "tileheight": TILE,
                      "tilecount": 1, "columns": 1, "margin": 0, "spacing": 0,
                      "image": "../tilesets/collision.png", "imagewidth": TILE, "imageheight": TILE}],
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(tmj, f, ensure_ascii=False)


def main():
    src, out_dir, names = sys.argv[1], sys.argv[2], sys.argv[3:]
    os.makedirs(out_dir, exist_ok=True)
    im = np.array(Image.open(src).convert("RGB"))
    bgc, regions = find_regions(im)
    for name, (x, y, w, h) in zip(names, regions):
        crop = im[y:y + h, x:x + w]
        Image.fromarray(crop).save(os.path.join(out_dir, name + ".png"))
        cols, rows, data = auto_collisions(crop, bgc)
        write_tmj(os.path.join(out_dir, name + ".tmj"), name + ".png", cols, rows, data)
        print(f"{name}: {w}x{h} px, {cols}x{rows} cases, {sum(data)} cases bloquées")


if __name__ == "__main__":
    main()
