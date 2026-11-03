"""Planches de contact numérotées pour auditer les animations d'un personnage.

Usage : python tools/audit_planches.py <planche.png> <dossier-sortie> [colonnes-par-image] [lignes]
Chaque image montre les colonnes d'une plage, avec leur numéro, pour les lignes demandées
(0 = bandeau de titre de la planche, 1 face, 2 trois-quarts, 3 profil, 4 dos ; par défaut 1 et 3). Les originaux ne sont jamais modifiés.
"""
import os
import sys

from PIL import Image, ImageDraw

FRAME = 32
ECHELLE = 2


def main():
    src, sortie = sys.argv[1], sys.argv[2]
    par_image = int(sys.argv[3]) if len(sys.argv) > 3 else 28
    lignes = [int(x) for x in sys.argv[4].split(",")] if len(sys.argv) > 4 else [1, 3]
    img = Image.open(src).convert("RGBA")
    colonnes = img.width // FRAME
    os.makedirs(sortie, exist_ok=True)
    nom = os.path.splitext(os.path.basename(src))[0].replace(" ", "_")
    for debut in range(0, colonnes, par_image):
        fin = min(colonnes, debut + par_image)
        w = (fin - debut) * FRAME * ECHELLE
        h = len(lignes) * FRAME * ECHELLE + 14
        toile = Image.new("RGBA", (w, h), (40, 40, 60, 255))
        d = ImageDraw.Draw(toile)
        for i, c in enumerate(range(debut, fin)):
            x = i * FRAME * ECHELLE
            d.text((x + 2, 1), str(c), fill=(255, 255, 0, 255))
            for j, r in enumerate(lignes):
                case = img.crop((c * FRAME, r * FRAME, (c + 1) * FRAME, (r + 1) * FRAME)).resize((FRAME * ECHELLE,) * 2, Image.NEAREST)
                toile.alpha_composite(case, (x, 14 + j * FRAME * ECHELLE))
        toile.convert("RGB").save(os.path.join(sortie, f"{nom}_{debut:02d}-{fin - 1:02d}.png"))
    print(nom, colonnes, "colonnes")


main()
