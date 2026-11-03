# Legacy of Goku 1 et compléments de Buu's Fury – inventaire

Originaux dans `assets/raw/legacy-of-goku-1/` et `assets/raw/buus-fury-complements/` (jamais modifiés). Références : spritedatabase.net, jeu « Dragon Ball Z: Legacy of Goku » (GBA) et compléments de « Buu's Fury ». Aucun nom ni dialogue inventé par ces jeux n'est repris (`docs/reference/`).

## Format commun à LoG1

Contrairement à Buu's Fury et LoG2, les planches de LoG1 **ne sont pas en cases régulières** : sprites placés librement sur un fond uni (vert pur `0,255,0` pour « Various », bleu pour `Goku.gif`, vert sombre ou magenta ailleurs). Il faut les découper par composants connexes ; c'est le rôle de `tools/decouper_log1.py`, qui écrit des planches à cases régulières (fond transparent, pieds en bas, **aucune mise à l'échelle**) dans `assets/monstres/` et `assets/bosses/`.

**Échelle** : mesurée sur le Vegeta, Raditz et Nappa de LoG1, la taille d'un personnage est de **32 à 34 px de haut**, comme les cases de 32 px de Buu's Fury et de LoG2 (comparaison à ×1, ×2, ×3 dans la section 5 de `assets/build/apercu-heros.html`). Les sprites de LoG1 sont donc à la bonne échelle : **pas de mise à l'échelle**, ce qui respecte la règle d'échelle entière de la direction artistique. Seule différence : ils sont de face plutôt que de profil, donc un peu plus larges (18 px contre 15).

## Inventaire (LoG1)

| Fichier | Taille | Contenu | Utilisation |
| --- | --- | --- | --- |
| `Various.png` | 901×1431 | Décors de Namek (cratère, vaisseaux, intérieur du vaisseau de Freezer, salle de soins), portraits du Commando Ginyu. **Aucun sprite de personnage.** | Décors candidats pour l'arc Namek |
| `Various.gif` | 797×514 | Sprites animés : Gohan enfant, Krilin, Yamcha, Tenshinhan, Chaozu… (première rangée), **Raditz** (23 images), **Nappa** (13 images), **Vegeta** (saga Saiyan), **grand singe** de face, de profil et de dos, soldats et monstres de Freezer, Commando Ginyu, trois formes de Freezer. | Raditz et Nappa découpés (voir ci-dessous) |
| `Vegeta.png` | 513×405 | Vegeta, quatre bandes : face (15 images), côté (17), dos (14), divers (4 : sourire, blessé, à terre). Deux blocs identiques sur la planche (palette ou doublon). | Boss Vegeta, phase 1 |
| `Oozaru Gohan  Vegeta.png` | 332×194 | Grand singe Gohan, **grand singe Vegeta** (armure blanche, combinaison bleue) de profil en 5 images, transformation de Vegeta en quatre images (petit, bras écartés, mi-singe, bras levés). Une 6ᵉ image du singe est une retouche d'un tiers (cadre vert). | Boss Vegeta, phase 3 |
| `Goku.gif` | 300×257 | Goku enfant ou jeune (LoG1) : marche, coups, Kamehameha, rayons de ki, portrait. | Non utilisé (Goku jouable = Buu's Fury) |
| `Gohan.gif` | 193×85 | Gohan enfant (LoG1). | Plus tard (Gohan enfant en PNJ de flash-back) |
| `Bubbles.gif` | 168×120 | Bubbles (singe de Maître Kaio). | PNJ de l'au-delà, plus tard |
| `Captain Ginyu.png`, `Burter.png`, `Jeice.png`, `Recoome.png` | ~210×160 | Membres du Commando Ginyu (marche, coups, rayons). | Arc Namek, plus tard |
| `Frieza first form.png`, `…second form.png`, `…third form.png` | 210×191 à 321×192 | Trois formes de Freezer. | Arc Namek, plus tard |

## Compléments de Buu's Fury

| Fichier | Taille | Remarque |
| --- | --- | --- |
| `Janemba first form.png` | 521×366 | Première forme de Janemba. |
| `Puipui.png` | 449×155 | **Doublon** de `graphics/enemies_bosses/Puipui.png`. |
| `Spopovich.gif` | 808×386 | Spopovich (GIF, pas de fond transparent). |
| `Yamu.png` | 614×327 | **Doublon** de `graphics/enemies_bosses/Yamu.png` (à comparer). |

Non audités : format en cases de 32 px à vérifier avant tout usage.

## Ce qui est utilisé maintenant

| Sprite | Source | Planche dérivée | Fiche (brouillon) |
| --- | --- | --- | --- |
| Raditz | `Various.gif` | `assets/monstres/raditz-log1.png` (23 cases de 40×40) | `data/bosses/raditz.json` |
| Nappa | `Various.gif` | `assets/monstres/nappa-log1.png` (12 cases) | `data/bosses/nappa.json` |
| Vegeta boss, phase 1 | `Vegeta.png` | `assets/bosses/vegeta-phase1.png` | `data/bosses/vegeta-saga-saiyan.json` |
| Vegeta boss, transformation et grand singe | `Oozaru Gohan  Vegeta.png` | `assets/bosses/vegeta-grand-singe.png` (cases de 72×72) | idem, phase 3 |

**Saibamen : absents de ces planches** (aucun sprite vert à tête ronde). Ils gardent leur sprite DBZ Online actuel (une seule image).

## Points d'attention

- `vegeta-saga-saiyan.png`, annoncé comme planche à blocs « Saiyan Saga » et « Great Ape », **n'est pas dans le dossier**. J'ai utilisé à la place `Vegeta.png` et `Oozaru Gohan  Vegeta.png`.
- Le Vegeta de LoG1 (combinaison bleue, gants et bottes blancs) est **très proche du Vegeta jouable** de Buu's Fury. La règle de `docs/lore/canon.md` exige une apparence nettement distincte pour un boss. Il faut soit l'armure et le scouter de la vraie planche, soit une retouche (scouter, armure de couleur différente) dans `assets/build`.
- Les correspondances d'animations sont des brouillons (cases numérotées dans l'ordre de lecture).
