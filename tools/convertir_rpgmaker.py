"""Convertit les planches de personnage du projet RPG Maker (assets/raw/rpgmaker-dbz/) vers notre format d'animations.

Format source : 3 colonnes × 4 lignes (bas, gauche, droite, haut), cases de 60 px (48 px pour les « damage » de Goku et Piccolo).
Les colonnes sont : pas gauche, immobile, pas droit.
Format de sortie (comme les héros) : cadre de 32 px, lignes face / profil / dos (la gauche est le profil retourné),
un bloc de 3 colonnes par fichier source. Les fichiers d'armes (swd01, bow01, shd01) sont des surimpressions et sont ignorés.
Les originaux ne sont jamais modifiés. Usage : python -I tools/convertir_rpgmaker.py
"""
import json
import os
import re

import numpy as np
from PIL import Image

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SOURCE = os.path.join(RACINE, 'assets', 'raw', 'rpgmaker-dbz', 'dbz_clean2', 'characters')
SORTIE = os.path.join(RACINE, 'assets', 'pnj')
CADRE = 32

# suffixe du fichier → (nom d'animation, images par seconde, boucle, séquence de colonnes dans le bloc)
SUFFIXES = {
    '': ('marche', 8, True, [1, 0, 1, 2]),
    '_idle': ('repos', 3, True, [0, 1, 2, 1]),
    '_dash': ('course', 12, True, [1, 0, 1, 2]),
    '_attacking': ('attaque', 10, False, [0, 1, 2]),
    '_casting': ('technique', 8, False, [0, 1, 2]),
    '_damage': ('degats', 8, False, [0, 1, 2]),
    '_act01': ('action', 8, False, [0, 1, 2]),
    '_pick': ('ramasser', 6, False, [0, 1, 2]),
}
IGNORES = ('_swd01', '_bow01', '_shd01')

# personnage de sortie → fichiers sources (sans « $ » ni « .png ») ; le premier est la marche
PERSONNAGES = {
    'krilin': ['Krillin01', 'Krillin01_idle', 'Krillin01_dash', 'Krillin01_attacking', 'Krillin01_casting', 'Krillin01_damage', 'Krillin01_act01', 'Krillin01_pick'],
    'krilin-vol': ['KrillinFlying', 'KrillinFlying_idle', 'KrillinFlying_dash', 'KrillinFlying_act01', 'KrillinFlying_pick'],
    'chichi': ['Chichi_Walking'],
    'chichi-inquiete': ['ChichiWorried'],
    'yamcha': ['Yamcha01', 'Yamcha01_idle', 'Yamcha01_dash', 'Yamcha01_attacking', 'Yamcha01_casting', 'Yamcha01_damage', 'Yamcha01_act01', 'Yamcha01_pick'],
    'yamcha-vol': ['YamchaFlying_act01', 'YamchaFlying_act01_idle', 'YamchaFlying_act01_dash', 'YamchaFlying_act01_attacking', 'YamchaFlying_act01_damage', 'YamchaFlying_act01_pick'],
    'tenshinhan': ['Tien01', 'Tien01_idle', 'Tien01_dash', 'Tien01_casting', 'Tien01_damage', 'Tien01_act01'],
    'piccolo': ['Piccolo01', 'Piccolo01_idle', 'Piccolo01_dash', 'Piccolo01_casting', 'Piccolo01_damage'],
    'gohan-enfant': ['Gohan01', 'Gohan01_idle', 'Gohan01_dash', 'Gohan01_pick'],
}


def suffixe(nom):
    base = re.sub(r'^(Krillin01|KrillinFlying|Chichi_Walking|ChichiWorried|Yamcha01|YamchaFlying_act01|Tien01|Piccolo01|Gohan01)', '', nom)
    return base


def charger(nom):
    chemin = os.path.join(SOURCE, '$' + nom + '.png')
    return np.array(Image.open(chemin).convert('RGBA'))


def lignes_de_cases(a):
    cote = a.shape[1] // 3
    return cote, [[a[r * cote:(r + 1) * cote, c * cote:(c + 1) * cote] for c in range(3)] for r in range(a.shape[0] // cote)]


def convertir(perso, fichiers):
    blocs = []
    boites = []
    for f in fichiers:
        a = charger(f)
        cote, grille = lignes_de_cases(a)
        for ligne in grille:
            for case in ligne:
                ys, xs = np.where(case[..., 3] > 0)
                if len(xs):
                    boites.append((xs.min() / cote, xs.max() / cote, ys.min() / cote, ys.max() / cote))
        blocs.append((f, cote, grille))
    # fenêtre de 32 px : centrée sur la case, pieds en bas ; on prend le bas commun à toutes les cases
    coupes = []
    for f, cote, grille in blocs:
        bas = max(int(np.where(c[..., 3] > 0)[0].max()) + 1 for l in grille for c in l if (c[..., 3] > 0).any())
        haut = min(int(np.where(c[..., 3] > 0)[0].min()) for l in grille for c in l if (c[..., 3] > 0).any())
        gauche = min(int(np.where(c[..., 3] > 0)[1].min()) for l in grille for c in l if (c[..., 3] > 0).any())
        droite = max(int(np.where(c[..., 3] > 0)[1].max()) + 1 for l in grille for c in l if (c[..., 3] > 0).any())
        coupes.append((bas, haut, gauche, droite, cote))
    bas_commun = max(c[0] for c in coupes)
    avert = []
    nb = len(blocs)
    sortie = np.zeros((3 * CADRE, nb * 3 * CADRE, 4), dtype=np.uint8)
    anims = {}
    for k, (f, cote, grille) in enumerate(blocs):
        # lignes : 0 bas (face), 1 gauche, 2 droite, 3 haut (dos)
        face, gauche_l, droite_l, dos = grille[0], grille[1], grille[2], grille[3]
        droite_vide = not any((c[..., 3] > 0).any() for c in droite_l)
        profil = [c[:, ::-1] for c in gauche_l] if droite_vide else droite_l
        for r, ligne in enumerate([face, profil, dos]):
            for c, case in enumerate(ligne):
                bas = coupes[k][0]
                x0 = (cote - CADRE) // 2
                y0 = bas - CADRE
                fenetre = np.zeros((CADRE, CADRE, 4), dtype=np.uint8)
                sy0, sy1 = max(y0, 0), min(y0 + CADRE, cote)
                fenetre[sy0 - y0:sy1 - y0] = case[sy0:sy1, x0:x0 + CADRE]
                if (case[..., 3] > 0).any():
                    ys, xs = np.where(case[..., 3] > 0)
                    if ys.min() < y0 or xs.min() < x0 or xs.max() >= x0 + CADRE:
                        avert.append(f'{f} : sprite plus grand que {CADRE} px, coupé')
                sortie[r * CADRE:(r + 1) * CADRE, (k * 3 + c) * CADRE:(k * 3 + c + 1) * CADRE] = fenetre
        suf = suffixe(f)
        nom_anim, fps, boucle, seq = SUFFIXES.get(suf, (suf.strip('_') or 'marche', 8, False, [0, 1, 2]))
        anims[nom_anim] = {'cols': [k * 3 + i for i in seq], 'fps': fps, 'loop': boucle}
    os.makedirs(os.path.join(SORTIE, perso), exist_ok=True)
    Image.fromarray(sortie, 'RGBA').save(os.path.join(SORTIE, perso, perso + '.png'))
    meta = {
        'frame': CADRE, 'rows': {'face': 0, 'profil': 1, 'dos': 2}, 'gauche': 'profil retourné', 'columns': nb * 3,
        'statut': "brouillon : conversion automatique du projet RPG Maker (marche = colonnes 1,0,1,2 de chaque bloc), à valider dans l'aperçu",
        'source': [f"assets/raw/rpgmaker-dbz/dbz_clean2/characters/${f}.png" for f in fichiers],
        'animations': anims,
    }
    with open(os.path.join(SORTIE, perso, perso + '.anims.json'), 'w', encoding='utf8', newline='\n') as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    return avert


if __name__ == '__main__':
    for perso, fichiers in PERSONNAGES.items():
        manquants = [f for f in fichiers if not os.path.exists(os.path.join(SOURCE, '$' + f + '.png'))]
        if manquants:
            print(perso, 'fichiers absents :', manquants)
            continue
        av = convertir(perso, fichiers)
        print(perso, 'ok', ('; ' + '; '.join(sorted(set(av)))) if av else '')
