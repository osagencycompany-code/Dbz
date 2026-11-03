"""
Corrections de maps demandées après la revue de la nuit (décision de relecture du 2026-11-03).
Idempotent : on peut le relancer sans dégâts (il ne fait qu'ajouter des collisions, ou fixer des valeurs précises).

  - bloque les buissons vert clair (maison de Goku) et les grands cactus du désert
  - Capsule Corp : bloque les deux zones jaunes du haut (toit du bâtiment)
  - désert sud : Nappa sur le sable dégagé
  - cratère : retire la ligne verticale résiduelle du bord gauche
  - intérieurs (Kame House, maison de Bulma) : collisions des meubles et des murs, refaites à la main
  - la forêt est maintenant en deux maps (foret-sud, foret-nord) : portails de Goku et du cratère redirigés

Usage : python tools/corriger_maps.py
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import remplir_maps as r  # noqa: E402

TILE = 16


def charger(nom):
    chemin = f"maps/{nom}.tmj"
    return chemin, json.load(open(chemin, encoding="utf-8"))


def calque(d, nom):
    return next(c for c in d["layers"] if c["name"] == nom)


def sauver(chemin, d):
    json.dump(d, open(chemin, "w", encoding="utf-8"), ensure_ascii=False)


def bloquer(d, rects):
    r.peindre(calque(d, "collisions")["data"], d["width"], d["height"], rects)


def liberer(d, rects):
    data = calque(d, "collisions")["data"]
    for x, y, w, h in rects:
        for ty in range(max(0, y // TILE), min(d["height"], math.ceil((y + h) / TILE))):
            for tx in range(max(0, x // TILE), min(d["width"], math.ceil((x + w) / TILE))):
                data[ty * d["width"] + tx] = 0


def objet(d, nom):
    return next(o for o in calque(d, "objets")["objects"] if o["name"] == nom)


def fixer_prop(o, nom, valeur):
    for p in o["properties"]:
        if p["name"] == nom:
            p["value"] = valeur
            return
    o["properties"].append(r.propriete(nom, valeur))


def deplacer(o, x, y, w=None, h=None):
    o["x"], o["y"] = x, y
    if w is not None:
        o["width"], o["height"] = w, h


def buissons_vert_clair(nom, d):
    """Cases dont plus de 35 % des pixels sont d'un vert vif (feuillage et buissons clairs)."""
    img = np.array(Image.open(f"maps/{nom}.png").convert("RGB")).astype(int)
    vif = (img[:, :, 1] - img[:, :, 0] >= 60) & (img[:, :, 1] - img[:, :, 2] >= 60)
    data = calque(d, "collisions")["data"]
    n = 0
    for ty in range(d["height"]):
        for tx in range(d["width"]):
            if vif[ty * TILE:(ty + 1) * TILE, tx * TILE:(tx + 1) * TILE].mean() > 0.35 and not data[ty * d["width"] + tx]:
                data[ty * d["width"] + tx] = 1
                n += 1
    return n


def repeindre_interieur(nom):
    """Collisions à zéro, puis zones noires (hors de la pièce) ; les meubles sont ajoutés ensuite."""
    chemin, d = charger(nom)
    img = np.array(Image.open(f"maps/{nom}.png").convert("RGB")).astype(int)
    data = calque(d, "collisions")["data"]
    for ty in range(d["height"]):
        for tx in range(d["width"]):
            cell = img[ty * TILE:(ty + 1) * TILE, tx * TILE:(tx + 1) * TILE].reshape(-1, 3)
            noir = ((cell < 24).all(axis=1)).mean()
            data[ty * d["width"] + tx] = 1 if noir > 0.6 else 0
    return chemin, d


def corriger():
    # --- Mont Paozu : maison de Goku -------------------------------------------------------
    chemin, d = charger("mont-paozu/maison-de-goku")
    n = buissons_vert_clair("mont-paozu/maison-de-goku", d)
    deplacer(objet(d, "point-de-voyage"), 250, 305, 40, 24)
    fixer_prop(objet(d, "vers-foret"), "map", "mont-paozu/foret-sud")
    fixer_prop(objet(d, "vers-foret"), "spawn", "entree-sud")
    sauver(chemin, d)
    print(f"maison-de-goku : {n} cases de buissons bloquées")

    # --- Cratère --------------------------------------------------------------------------
    im = np.array(Image.open("maps/mont-paozu/cratere.png").convert("RGB"))
    im[:, 0:6] = im[:, 6:12]       # le liseré turquoise occupait les colonnes 3 à 5
    Image.fromarray(im).save("maps/mont-paozu/cratere.png")
    chemin, d = charger("mont-paozu/cratere")
    fixer_prop(objet(d, "sortie"), "map", "mont-paozu/foret-nord")
    fixer_prop(objet(d, "sortie"), "spawn", "depuis-cratere")
    sauver(chemin, d)

    chemin, d = charger("mont-paozu/cratere")
    deplacer(objet(d, "raditz"), 220, 100, 40, 40)
    sauver(chemin, d)

    # --- Capsule Corp : toit jaune ---------------------------------------------------------
    chemin, d = charger("west-city/capsule-corp")
    bloquer(d, [(80, 0, 100, 78), (300, 0, 100, 92)])
    liberer(d, [(352, 176, 48, 50)])                # porte et marches du dôme : le portail de la maison de Bulma doit être atteignable
    deplacer(objet(d, "devant-maison"), 376, 234)
    sauver(chemin, d)

    # --- West City : le perron de Capsule Corp doit mener au portail ---------------------------
    chemin, d = charger("west-city/ville")
    liberer(d, [(384, 112, 80, 16)])
    sauver(chemin, d)

    # --- Désert : grands cactus, Nappa -------------------------------------------------------
    chemin, d = charger("desert-du-diable/nord")
    bloquer(d, [(302, 420, 34, 44), (524, 470, 36, 48)])
    sauver(chemin, d)
    chemin, d = charger("desert-du-diable/sud")
    bloquer(d, [(1286, 105, 36, 46), (382, 420, 34, 46), (1556, 410, 36, 46)])
    deplacer(objet(d, "nappa"), 1160, 370, 40, 40)
    sauver(chemin, d)

    # --- Intérieurs -------------------------------------------------------------------------
    chemin, d = repeindre_interieur("ile-de-roshi/kame-house-rdc")
    bloquer(d, [
        (0, 0, 192, 88), (224, 0, 96, 88),              # mur du haut (l'escalier reste ouvert)
        (0, 0, 24, 196), (0, 196, 72, 124), (241, 0, 79, 320),  # cadre gauche, vide du bas, cadre droit
        (0, 276, 320, 44),                               # sous la porte
        (0, 262, 170, 58), (218, 262, 102, 58),
        (58, 88, 24, 18), (20, 72, 30, 124),             # frigo, cuisine
        (105, 136, 96, 74), (224, 135, 17, 85),          # canapé rouge + table, meuble télé
        (212, 228, 24, 24),                              # plante
    ])
    deplacer(objet(d, "entree"), 192, 250)
    deplacer(objet(d, "sortie"), 176, 258, 36, 14)
    deplacer(objet(d, "bas-escalier"), 200, 104)
    sauver(chemin, d)

    chemin, d = repeindre_interieur("ile-de-roshi/kame-house-etage")
    deplacer(objet(d, "escalier"), 144, 68, 32, 20)
    deplacer(objet(d, "haut-escalier"), 160, 112)
    bloquer(d, [
        (0, 0, 240, 37), (0, 0, 143, 88), (178, 0, 62, 88),
        (0, 0, 38, 240), (203, 0, 37, 240), (0, 212, 240, 28),
        (70, 86, 36, 12), (72, 128, 56, 40),
    ])
    sauver(chemin, d)

    chemin, d = repeindre_interieur("west-city/maison-de-bulma")
    bloquer(d, [
        (0, 0, 320, 63),
        (68, 60, 26, 22), (228, 60, 26, 22),             # plantes
        (24, 80, 48, 48), (272, 80, 24, 48), (24, 217, 24, 47), (272, 217, 24, 47),  # enceintes et chaîne hi-fi
        (97, 120, 47, 40), (48, 143, 32, 64), (97, 168, 47, 39),                     # canapés, table basse
        (200, 152, 64, 38), (200, 200, 64, 40),                                       # grandes tables
        (0, 304, 320, 16),
    ])
    deplacer(objet(d, "entree"), 160, 262)
    deplacer(objet(d, "sortie"), 146, 288, 28, 14)
    sauver(chemin, d)


if __name__ == "__main__":
    corriger()
