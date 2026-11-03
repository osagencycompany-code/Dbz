"""
Génère des aperçus PNG de toutes les maps : fond + grille numérotée (tous les 80 px, coordonnées en pixels)
+ collisions en rouge + objets (étiquettes colorées par type).

Usage : python tools/apercu_maps.py [--sans-grille]    ->  assets/build/maps/<zone>-<map>.png
"""
import glob
import json
import os
import sys

from PIL import Image, ImageDraw

COULEURS = {"spawn": (0, 255, 0), "portal": (255, 0, 255), "npc": (0, 200, 255), "mobzone": (255, 140, 0),
            "travel": (255, 255, 0), "heal": (120, 255, 160), "boss": (255, 60, 60), "rock": (200, 160, 255)}


def apercu(tmj, sortie, grille=True):
    d = json.load(open(tmj, encoding="utf-8"))
    base = os.path.dirname(tmj)
    fond = next(c for c in d["layers"] if c["name"] == "fond")
    im = Image.open(os.path.join(base, fond["image"])).convert("RGBA")
    zoom = 2 if im.width <= 760 else 1
    im = im.resize((im.width * zoom, im.height * zoom), Image.NEAREST)
    calque = Image.new("RGBA", im.size, (0, 0, 0, 0))
    dr = ImageDraw.Draw(calque)
    col = next(c for c in d["layers"] if c["name"] == "collisions")
    t = d["tilewidth"] * zoom
    for i, v in enumerate(col["data"]):
        if v:
            x, y = (i % d["width"]) * t, (i // d["width"]) * t
            dr.rectangle([x, y, x + t - 1, y + t - 1], fill=(255, 0, 0, 105))
    if grille:
        pas = 80 * zoom
        for x in range(0, im.width, pas):
            dr.line([x, 0, x, im.height], fill=(255, 255, 255, 70))
            dr.text((x + 2, 2), str(x // zoom), fill=(255, 255, 255, 255))
        for y in range(0, im.height, pas):
            dr.line([0, y, im.width, y], fill=(255, 255, 255, 70))
            dr.text((2, y + 2), str(y // zoom), fill=(255, 255, 255, 255))
    for c in d["layers"]:
        if c["type"] != "objectgroup":
            continue
        for o in c["objects"]:
            coul = COULEURS.get(o["type"], (255, 255, 255)) + (255,)
            x, y, w, h = o["x"] * zoom, o["y"] * zoom, o.get("width", 0) * zoom, o.get("height", 0) * zoom
            if w and h:
                dr.rectangle([x, y, x + w, y + h], outline=coul, width=2)
            else:
                dr.ellipse([x - 4, y - 4, x + 4, y + 4], fill=coul)
            dr.text((x + 5, y + 5), f'{o["type"]}:{o["name"]}', fill=coul)
    os.makedirs(os.path.dirname(sortie), exist_ok=True)
    Image.alpha_composite(im, calque).convert("RGB").save(sortie)


if __name__ == "__main__":
    grille = "--sans-grille" not in sys.argv
    for tmj in sorted(glob.glob("maps/*/*.tmj")):
        zone = os.path.basename(os.path.dirname(tmj))
        sortie = f"assets/build/maps/{zone}-{os.path.basename(tmj)[:-4]}.png"
        apercu(tmj, sortie, grille)
        print(sortie)
