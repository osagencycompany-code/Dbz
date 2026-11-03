"""
Génère les maps de la bêta qui ne sont pas encore dans maps/ (fond + collisions pré-remplies, sans objets).
L'île de Roshi est déjà traitée à la main : ce script ne la touche pas.

  - West City : régions détectées par extract_map_regions (ville, Capsule Corp, maison de Bulma)
  - Mont Paozu : trois écrans de la planche Southwest Forest, découpés par rectangles
  - Désert du Diable : grille de 4 x 4 écrans (séparateurs de 3 px), recollée en deux maps

Usage : python tools/build_maps.py   (ne remplace pas un .tmj existant : supprime-le pour le régénérer)
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import extract_map_regions as e  # noqa: E402

RAW = "assets/raw/graphics/maps"
SEP = {(71, 255, 187), (46, 165, 121), (52, 188, 136)}


def charger(nom):
    return np.array(Image.open(f"{RAW}/{nom}.png").convert("RGB"))


def aligner16(crop):
    h, w = crop.shape[:2]
    return crop[: h // 16 * 16, : w // 16 * 16]


def rogner(crop):
    """Retire les bords constitués de fond de planche / séparateurs."""
    def est_bord(ligne):
        # liseré turquoise des séparateurs, avec tolérance : r faible, g fort, b moyen
        l = ligne.astype(int)
        turquoise = (l[:, 0] < 120) & (l[:, 1] > 150) & (l[:, 2] > 90) & (l[:, 1] > l[:, 2] + 20)
        return turquoise.mean() > 0.5
    while est_bord(crop[0]): crop = crop[1:]
    while est_bord(crop[-1]): crop = crop[:-1]
    while est_bord(crop[:, 0]): crop = crop[:, 1:]
    while est_bord(crop[:, -1]): crop = crop[:, :-1]
    return crop


def ecrire(dossier, nom, crop, bgc=(71, 255, 187)):
    crop = aligner16(crop)
    os.makedirs(dossier, exist_ok=True)
    tmj = os.path.join(dossier, nom + ".tmj")
    if os.path.exists(tmj):
        print(f"{dossier}/{nom} : existe déjà, ignoré")
        return
    Image.fromarray(crop).save(os.path.join(dossier, nom + ".png"))
    cols, rows, data = e.auto_collisions(crop, bgc)
    e.write_tmj(tmj, nom + ".png", cols, rows, data)
    print(f"{dossier}/{nom} : {crop.shape[1]}x{crop.shape[0]} px, {cols}x{rows} cases, {sum(data)} bloquées")


def west_city():
    im = charger("West City")
    bgc, regions = e.find_regions(im)
    for nom, idx in (("ville", 0), ("capsule-corp", 3), ("maison-de-bulma", 7)):
        x, y, w, h = regions[idx]
        ecrire("maps/west-city", nom, im[y:y + h, x:x + w], bgc)


def mont_paozu():
    im = charger("Southwest Forest")
    for nom, (x0, y0, x1, y1) in {
        "maison-de-goku": (196, 0, 840, 402),
        "cratere": (1318, 0, 1802, 482),
        "foret": (928, 2632, 1492, 3196),
    }.items():
        ecrire("maps/mont-paozu", nom, rogner(im[y0:y1, x0:x1]))


def desert():
    im = charger("Diablo Desert")
    xs = [515, 998, 1481, 1964]   # débuts des colonnes d'écrans (largeur 480)
    ys = [513, 836, 1159, 1482]   # débuts des lignes d'écrans (hauteur 320)
    def bande(r0, r1):
        return np.concatenate([np.concatenate([im[ys[r]:ys[r] + 320, x:x + 480] for x in xs], axis=1) for r in range(r0, r1)], axis=0)
    ecrire("maps/desert-du-diable", "nord", bande(0, 2))
    ecrire("maps/desert-du-diable", "sud", bande(2, 4))


if __name__ == "__main__":
    west_city()
    mont_paozu()
    desert()
