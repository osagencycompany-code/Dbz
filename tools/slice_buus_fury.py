"""
Nettoie une planche de personnage Buu's Fury (Spriters Resource) :
supprime l'en-tête (32 px), le pied de page et les couleurs de fond (damier vert + cadre),
et produit une grille propre de cases 32x32 sur 4 lignes (face, trois-quarts, profil, dos).

Usage : python tools/slice_buus_fury.py "<planche.png>" <sortie.png>
"""
import sys
from PIL import Image

BG = {(52, 188, 136), (71, 255, 187), (42, 150, 108), (35, 127, 90)}

def main():
    im = Image.open(sys.argv[1]).convert("RGBA")
    w = im.width // 32 * 32
    im = im.crop((0, 32, w, 160))
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            if px[x, y][:3] in BG:
                px[x, y] = (0, 0, 0, 0)
    im.save(sys.argv[2])
    print(f"{sys.argv[2]} : {w // 32} colonnes x 4 lignes")

if __name__ == "__main__":
    main()
