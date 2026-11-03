"""
Remplit les calques « collisions » et « objets » des maps générées par build_maps.py, à partir des
rectangles ci-dessous (coordonnées en pixels de l'image de fond, relevées sur les aperçus de apercu_maps.py).
Les positions sont approximatives : à vérifier et corriger dans Tiled.

  - n'agit que sur les maps dont le calque « objets » est vide (ne piétine jamais un travail fait dans Tiled) ;
  - l'île de Roshi n'a besoin que d'ajouts (arrivée, rocher) : traités à part, sans toucher au reste.

Usage : python tools/remplir_maps.py
"""
import json
import math
import os

TILE = 16


def pt(nom, type_, x, y, **props):
    return {"name": nom, "type": type_, "x": x, "y": y, "width": 0, "height": 0, "point": True, "props": props}


def rect(nom, type_, x, y, w, h, **props):
    return {"name": nom, "type": type_, "x": x, "y": y, "width": w, "height": h, "props": props}


def npc(nom, x, y, sprite, dialogue):
    return pt(nom, "npc", x, y, sprite=f"dbz-online/characters/{sprite}", dialogue=dialogue)


def portail(nom, x, y, w, h, carte, spawn):
    return rect(nom, "portal", x, y, w, h, map=carte, spawn=spawn)


def zone_monstres(nom, x, y, w, h, mob, nombre, niveau):
    return rect(nom, "mobzone", x, y, w, h, mob=mob, count=nombre, level=niveau)


# ---------------------------------------------------------------------------------------------
# Collisions (rectangles x, y, largeur, hauteur) et objets, par map
# ---------------------------------------------------------------------------------------------
CARTES = {
    "mont-paozu/maison-de-goku": {
        "collisions": [
            (0, 0, 640, 96), (372, 64, 152, 88),            # falaise du haut et butte
            (0, 64, 72, 256), (0, 320, 150, 64),            # arbres de gauche
            (520, 72, 120, 288),                            # arbres de droite
            (420, 190, 60, 50), (445, 270, 55, 50), (345, 290, 60, 50),  # gros arbres
            (194, 190, 66, 56),                             # maison de Goku
            (165, 345, 190, 39), (500, 345, 90, 39),        # rebords du bas
        ],
        "objets": [
            pt("arrivee", "spawn", 300, 290),
            pt("depuis-foret", "spawn", 425, 340),
            npc("chichi", 270, 268, 5, "chichi-intro"),
            rect("maison-de-goku", "heal", 205, 246, 48, 24),
            rect("point-de-voyage", "travel", 330, 300, 40, 24, action="carte-du-monde"),
            portail("vers-foret", 355, 366, 140, 18, "mont-paozu/foret-sud", "entree-sud"),
        ],
    },
    # Forêt : deux maps (sud = entrée, nord = vers le cratère). Collisions des arbres : voir tools/foret.py.
    "mont-paozu/foret-sud": {
        "collisions": [],
        "objets": [
            pt("entree-sud", "spawn", 1060, 1630),
            pt("depuis-nord", "spawn", 785, 70),
            portail("vers-maison-de-goku", 983, 1700, 120, 40, "mont-paozu/maison-de-goku", "depuis-foret"),
            portail("vers-nord", 740, 0, 100, 20, "mont-paozu/foret-nord", "depuis-sud"),
            zone_monstres("zone-loups", 800, 1450, 330, 230, "loup", 6, "4-8"),
            zone_monstres("zone-sangliers", 990, 1010, 190, 330, "sanglier", 4, "5-9"),
            zone_monstres("zone-loups-clairiere", 700, 450, 200, 300, "loup", 4, "6-8"),
            zone_monstres("zone-sangliers-clairiere", 900, 560, 250, 340, "sanglier", 4, "7-9"),
            zone_monstres("zone-tigres-ouest", 260, 600, 380, 220, "tigre-bandit", 3, "8-10"),
            zone_monstres("zone-tigres-fond", 30, 700, 190, 330, "tigre-bandit", 3, "9-12"),
        ],
    },
    "mont-paozu/foret-nord": {
        "collisions": [],
        "objets": [
            pt("depuis-sud", "spawn", 419, 1220),
            pt("depuis-cratere", "spawn", 800, 150),
            portail("vers-sud", 380, 1270, 80, 20, "mont-paozu/foret-sud", "depuis-nord"),
            portail("vers-cratere", 760, 40, 100, 40, "mont-paozu/cratere", "entree"),
            zone_monstres("zone-tigres-couloir", 200, 1100, 450, 150, "tigre-bandit", 3, "8-10"),
            zone_monstres("zone-tigres", 480, 300, 400, 300, "tigre-bandit", 4, "9-12"),
            zone_monstres("zone-dinosaure", 30, 860, 260, 150, "dinosaure", 1, "12"),
        ],
    },
    "mont-paozu/cratere": {
        "collisions": [(0, 0, 56, 400), (432, 0, 48, 400), (0, 0, 480, 64), (0, 384, 480, 16)],
        "objets": [
            pt("entree", "spawn", 240, 360),
            portail("sortie", 190, 372, 100, 16, "mont-paozu/foret-nord", "depuis-cratere"),
            rect("raditz", "boss", 220, 150, 40, 40, boss="raditz"),
        ],
    },
    "west-city/ville": {
        "collisions": [
            (0, 0, 880, 16), (0, 0, 16, 400), (865, 375, 15, 345), (370, 690, 510, 30),
            (96, 24, 146, 136), (15, 175, 160, 140), (185, 175, 185, 140), (480, 175, 105, 140),
            (600, 90, 80, 225), (600, 175, 155, 140), (288, 0, 272, 115), (735, 0, 145, 175),
            (0, 400, 70, 320), (195, 400, 195, 210), (60, 640, 330, 80), (130, 560, 60, 50),
            (540, 445, 95, 100), (708, 442, 100, 100), (490, 565, 95, 100), (755, 565, 100, 100),
        ],
        "objets": [
            pt("arrivee", "spawn", 425, 330),
            pt("devant-capsule", "spawn", 425, 175),
            rect("place-centrale", "travel", 410, 352, 32, 26, action="carte-du-monde"),
            portail("entree-capsule-corp", 395, 105, 60, 16, "west-city/capsule-corp", "arche"),
        ],
    },
    "west-city/capsule-corp": {
        "collisions": [
            (0, 0, 16, 330), (465, 0, 15, 330), (0, 0, 80, 64), (400, 0, 80, 64),
            (175, 0, 128, 125), (296, 100, 160, 125), (102, 80, 68, 50),
            (45, 75, 25, 85), (420, 240, 18, 45),
            (0, 330, 480, 150), (184, 290, 8, 40), (290, 290, 8, 40),
        ],
        "objets": [
            pt("arche", "spawn", 240, 285),
            pt("devant-maison", "spawn", 376, 215),
            rect("capsule-corp", "heal", 215, 135, 70, 24),
            portail("sortie-arche", 205, 305, 70, 20, "west-city/ville", "devant-capsule"),
            portail("maison-de-bulma", 361, 176, 32, 22, "west-city/maison-de-bulma", "entree"),
        ],
    },
    "west-city/maison-de-bulma": {
        "collisions": [
            (0, 0, 320, 44), (22, 85, 32, 45), (272, 85, 26, 45), (22, 215, 32, 45), (272, 215, 26, 45),
            (96, 120, 50, 45), (48, 145, 32, 60), (96, 168, 55, 40), (195, 150, 75, 40), (195, 193, 75, 40),
            (48, 83, 45, 45), (96, 28, 22, 35), (200, 28, 22, 35), (128, 5, 64, 55),
        ],
        "objets": [
            pt("entree", "spawn", 160, 280),
            npc("bulma", 160, 95, 82, "bulma-intro"),
            portail("sortie", 142, 296, 38, 22, "west-city/capsule-corp", "devant-maison"),
        ],
    },
    "desert-du-diable/nord": {
        "collisions": [
            (0, 0, 1920, 36), (0, 170, 1255, 80), (1305, 170, 615, 80),
            (612, 372, 262, 105), (1245, 340, 55, 70), (0, 36, 110, 50),
        ],
        "objets": [
            pt("entree-sud", "spawn", 960, 590),
            portail("vers-sud", 0, 612, 1920, 28, "desert-du-diable/sud", "entree-nord"),
            zone_monstres("zone-saibamen", 200, 270, 600, 250, "saibaman", 8, "14-18"),
            zone_monstres("zone-bandits", 950, 270, 800, 250, "bandit-du-desert", 6, "16-20"),
        ],
    },
    "desert-du-diable/sud": {
        "collisions": [
            (652, 125, 92, 70),
            (1115, 440, 70, 60), (1215, 440, 70, 60), (1090, 500, 80, 60), (1235, 500, 80, 60),
            (1080, 560, 100, 80), (1225, 560, 100, 80), (1040, 620, 310, 20),
        ],
        "objets": [
            pt("arrivee", "spawn", 330, 360),
            pt("entree-nord", "spawn", 960, 40),
            portail("vers-nord", 0, 0, 1920, 28, "desert-du-diable/nord", "entree-sud"),
            rect("campement-du-desert", "heal", 250, 330, 80, 50),
            rect("point-de-voyage", "travel", 340, 330, 40, 30, action="carte-du-monde"),
            zone_monstres("zone-saibamen", 150, 60, 700, 250, "saibaman", 8, "18-22"),
            zone_monstres("zone-bandits", 1300, 50, 500, 350, "bandit-du-desert", 6, "20-24"),
            rect("nappa", "boss", 1170, 400, 40, 40, boss="nappa"),
        ],
    },
}

# Île de Roshi : simples ajouts (le reste est déjà placé).
AJOUTS_ILE = {
    "ile-de-roshi/exterieur": [
        pt("arrivee", "spawn", 600, 520),
        rect("rocher-entrainement", "rock", 620, 300, 32, 32),
    ],
    "ile-de-roshi/kame-house-rdc": [
        rect("kame-house", "heal", 130, 230, 60, 40),
    ],
}


def propriete(nom, valeur):
    type_ = "int" if isinstance(valeur, int) and not isinstance(valeur, bool) else "string"
    return {"name": nom, "type": type_, "value": valeur}


def convertir(obj, ident):
    o = {"id": ident, "name": obj["name"], "type": obj["type"], "x": obj["x"], "y": obj["y"],
         "width": obj["width"], "height": obj["height"], "rotation": 0, "visible": True,
         "properties": [propriete(k, v) for k, v in obj["props"].items()]}
    if obj.get("point"):
        o["point"] = True
    return o


def peindre(data, largeur, hauteur, rects):
    for x, y, w, h in rects:
        for ty in range(max(0, y // TILE), min(hauteur, math.ceil((y + h) / TILE))):
            for tx in range(max(0, x // TILE), min(largeur, math.ceil((x + w) / TILE))):
                data[ty * largeur + tx] = 1


def traiter(chemin_map, collisions, objets, ajout_seulement=False):
    tmj = f"maps/{chemin_map}.tmj"
    d = json.load(open(tmj, encoding="utf-8"))
    calque_col = next(c for c in d["layers"] if c["name"] == "collisions")
    calque_obj = next(c for c in d["layers"] if c["name"] == "objets")
    if calque_obj["objects"] and not ajout_seulement:
        print(f"{chemin_map} : déjà rempli, ignoré")
        return
    existants = {o["name"] for o in calque_obj["objects"]}
    ident = d["nextobjectid"]
    for obj in objets:
        if obj["name"] in existants:
            continue
        calque_obj["objects"].append(convertir(obj, ident))
        ident += 1
    d["nextobjectid"] = ident
    if collisions:
        peindre(calque_col["data"], d["width"], d["height"], collisions)
    json.dump(d, open(tmj, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"{chemin_map} : {len(calque_obj['objects'])} objets, {sum(calque_col['data'])} cases bloquées")


if __name__ == "__main__":
    for nom, contenu in CARTES.items():
        traiter(nom, contenu["collisions"], contenu["objets"])
    for nom, objets in AJOUTS_ILE.items():
        traiter(nom, [], objets, ajout_seulement=True)
