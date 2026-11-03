# Direction artistique

Objectif : retrouver l'allure d'un jeu Game Boy Advance de 2004 (Buu's Fury) affiché proprement sur un écran moderne, avec l'impact visuel de l'animé.

## Image

- Résolution interne 480 × 270 (décision 0010), mise à l'échelle par un entier (×4 en 1920 × 1080), aucun lissage.
- Vue de dessus en trois-quarts, lumière venant du haut à gauche, ombres portées vers le bas à droite.
- Interdit : flou, anti-crénelage, rotation libre de sprites (sauf effets), mise à l'échelle non entière d'un personnage.

## Échelles

| Élément | Taille | Source prioritaire |
| --- | --- | --- |
| Personnages joueurs et PNJ importants | cases de 32 × 32 (personnage d'environ 24 px de haut) | Buu's Fury |
| Monstres communs | 32 × 32 | DBZ Online en attendant mieux |
| Boss | 32 × 32 affichés à ×1,25 ou planches 64 × 64 | Buu's Fury, sinon DBZ Online |
| Maps | images natives Buu's Fury, collisions en cases de 16 px | Buu's Fury ; tilesets DBZ Online (32 px) pour Namek et Cell |
| Effets (impacts, auras, explosions) | variable | `animations/` et `projectiles/` DBZ Online |

Les sprites DBZ Online (32 px de haut) paraissent plus grands que ceux de Buu's Fury : ils sont acceptés pour les monstres, jamais pour les joueurs.

## Couleurs de l'interface

| Usage | Couleur |
| --- | --- |
| PV | `#4cd964` (rouge `#ff3b30` sous 30 %) |
| Ki | `#ffd23f` |
| XP | `#7fe7ff` |
| Dégâts infligés | blanc ; critique `#ffd23f` en plus gros |
| Dégâts reçus | `#ff6b6b` |
| Esquive, garde | `#9fd8ff` |
| Soin | `#7dff9a` |
| Cadres de fenêtres | fond `#14102a` à 97 %, bordure or `#f5c518` |

Police : « Press Start 2P » pour les titres et chiffres en jeu (8 px), police lisible sans empattement pour les textes longs des fenêtres.

## Mouvement et impact

Référence : `docs/reference/prototype-06.html`.

- Chaque coup qui touche : gel d'impact (4 images, 8 pour le 3ᵉ coup), étincelle, flash blanc de la cible, petit tremblement d'écran.
- Image rémanente bleutée sur les coups et l'esquive.
- Pas de zoom de caméra (il déforme l'interface).
- Transformations et déblocages majeurs : cinématique avec bandes noires, joueur figé et invulnérable.

## Son

Sons courts et percutants, générés ou d'inspiration 16 bits. Chaque action de combat a un son distinct : coup léger, coup lourd, boule de ki, rayon, explosion, dégâts reçus, montée de niveau, transformation. Bouton cliquable pour couper le son, toujours visible à l'écran (décision 0017).

## Contrôle qualité d'un asset

Avant de passer une fiche en `valide` :

1. Échelle conforme au tableau ci-dessus.
2. Fond entièrement transparent, aucun pixel parasite de la couleur de fond d'origine.
3. Les 4 directions présentes (ou la gauche obtenue par retournement du profil).
4. Animations vérifiées sur la page d'aperçu, aucune image d'une autre animation mélangée (exemple : la danse de fusion dans la charge du ki).
5. Capture validée par Souleymen.
