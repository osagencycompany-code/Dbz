# Effets « Small Effects » et « Aura Effects » (Just Oruma, aperçus DeviantArt) – test d'échelle et inventaire

Originaux dans `assets/raw/effets-swl/` : une feuille d'auras (`6fd91olobtoe1.png`, 828×873, environ 137 000 couleurs) et une feuille de petits effets (`small_effects_sprite_sheet_swl__by_justoruma_dfx5gdp-375w-2x.jpg`, 400×566, JPEG). Ce sont des **aperçus réduits avec filigrane central**, pas le pack : l'original coûte 12 $ et n'est acheté que si le test est concluant. **Rien de ces feuilles n'est copié dans le jeu** ; les extraits nettoyés vivent dans `assets/build/effets-test/` (dossier non versionné), générés par `tools/test_effets_swl.py`.

Auteur crédité : **Just Oruma** (nom sur les feuilles). Licence du pack à lire avant achat et avant tout usage.

## Test d'échelle (`assets/build/test-effets-swl.html`)

Nettoyage : fond uni retiré, halo supprimé par seuil, petites poussières retirées, palette réduite (8 à 12 couleurs par effet) pour retrouver des contours nets. Seuls des extraits hors du filigrane sont utilisés. Les effets sont posés sur Vegeta et Goku (32 px) à ×1, ×2 et ×3, sans mise à l'échelle non entière.

| Effet demandé | Fichier source | Taille d'origine | Verdict |
| --- | --- | --- | --- |
| Étincelle d'impact | Small Effects, éclats jaunes et roses | 8 à 18 px | **Bonne taille** (un poing mesure environ 8 px). |
| Impact bleu | Small Effects, éclat cyan (avec ou sans anneau) | 13 à 29 px | **Bonne taille** ; l'anneau de 28 px est un peu large pour un coup, bon pour une technique. |
| Aura de charge du ki | Aura Effects, petites flammes cyan et blanches | 23 à 25 px de large, 27 à 29 de haut | **Bonne taille** : elle entoure le corps (22×30 px) sans le cacher. |
| Grande aura bleue | Aura Effects, grandes flammes cyan | 41 à 43 px × 48 à 54 | **Trop grande** : presque deux fois la taille du héros. À la réduire, elle perdrait ses contours ; il faudrait choisir une plus petite. |
| Aura dorée (Super Saiyan) | Aura Effects, flammes jaune et blanc | 12 à 16 px × 29 à 40 | **Mal adaptée** : ce sont des langues de flamme étroites, pas une aura enveloppante. Les flammes cyan de 25×29 donneraient la bonne taille en les **recolorant en doré** (changement de teinte, aucune mise à l'échelle). |
| Éclair bleu (Super Saiyan 2) | Small Effects, étoile cyan et traînées | étoile 31×22, traînées 26×11 | **À la bonne taille mais pas des éclairs** : ce sont des étoiles et des traits de lumière. Je n'ai pas trouvé de vrais arcs électriques dans ces deux aperçus ; nos arcs générés restent préférables. |

Qualité : sur la feuille PNG, les contours sont nets après nettoyage ; sur le JPEG, des artefacts de compression restent visibles à ×3 (points parasites sur les bords). L'original à 12 $ ne devrait pas avoir ces défauts.

## Inventaire (lecture des deux aperçus, à préciser avec le pack)

Aura Effects (par colonne de couleur, plusieurs images d'animation par aura) : auras **blanches, dorées, orange et rouges, vertes, bleues et cyan, violettes, roses et magenta**, spirales de ki, anneaux (pleins et pointillés), boules d'énergie (rouges, blanches), explosions orange, tornades de vent, étoiles d'énergie, rayons verticaux cyan, éclats violets, flammes bleues et blanches, ondes en arc, fumées. Les tailles vont de 12 px (étincelles) à 54 px de haut (grandes auras).

Small Effects : **impacts** jaunes, roses et cyan, **boules de ki** à traînée (jaunes et blanches), **étincelles** et étoiles à quatre branches, **anneaux** d'onde de choc, **explosions** jaunes de 14 à 32 px, **traînées** de vitesse blanches et cyan, **rayons** horizontaux, **croissants** de coup, éclats cyan, grosses explosions jaunes.

## Ce qui améliorerait le jalon 5 (proposition, rien ne change sans ton accord)

1. **Étincelle d'impact** sur les coups de poing et de pied : bonne taille, peu coûteuse, grosse amélioration du ressenti.
2. **Aura de charge du ki** (petites flammes cyan et blanches, 25×29) : c'est l'aura que j'ai prévue en solution de remplacement pour Gohan ado et Trunks (qui n'ont pas de charge).
3. **Aura de Super Saiyan** : recolorer en doré l'aura de 25×29, sinon garder le halo simple.
4. **Boules de ki à traînée** pour Boule de ki, Galick Ho, Masenko, Burning Attack (taille 14 à 30 px).
5. **Anneaux d'onde de choc** pour la garde, l'esquive et l'arrivée d'un boss.
6. **À ne pas prendre** : les grandes auras (trop grandes) et les « éclairs » (pas des éclairs).

## Décision à prendre

Acheter l'original ? Le test est **concluant pour les petits effets et les auras moyennes**, pas pour les éclairs ni la dorée. Je recommande d'attendre ta décision après avoir lu la licence. Si tu achètes, je refais le nettoyage sur l'original et complète cet inventaire exact, effet par effet.
