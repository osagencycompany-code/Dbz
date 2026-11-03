# Legacy of Goku 2 – inventaire et audit des planches

Originaux renommés de `.zip` en `.png` dans `assets/raw/legacy-of-goku-2/` (jamais modifiés). Références externes : voir `docs/reference/` (aucun nom ni dialogue inventé par ces jeux n'est repris).

## Contenu
- `personnages/` : Future Gohan, Future Trunks (normal, armure de combat, chacun en Super Saiyan, adolescent), Gohan ×6, Goku, Goku Super Saiyan, Krillin, Piccolo ×2, Tien Shinhan, Vegeta, Vegeta Super Saiyan, Yamcha.
- `pnj/` : famille de Bulma, PNJ génériques, famille et amis de Goku, Hercule (Mr. Satan), PNJ de Kame House et du Palais de Kami.
- `maps/` : 20 cartes (voir `docs/maps-et-histoire.md`).
- `ennemis/` : 32 planches (loup, sanglier, tigre bandit, tigre à dents de sabre, T-Rex, Triceratops, alligator, serpent, scorpion, formes de Cell, androïdes, Freezer, Cooler…).

## Format
Cadres de 32 px (64 px pour le T-Rex). Héros : ligne 0 = bandeau de titre, lignes 1 à 4 = face, trois-quarts, profil, dos. Créatures : 14 colonnes (22 pour le tigre bandit), 4 lignes (face, gauche, droite, dos), variantes de couleur empilées tous les 5 cadres.

## Audit des héros (brouillon, à valider dans `assets/build/apercu-heros.html`)
| Héros | Course | Coups | Tir | Vol | Dégâts | Charge de ki | Transformation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Vegeta | oui | oui | oui | oui | oui | oui | oui (vers Super Saiyan) |
| Vegeta Super Saiyan | oui | oui | oui | 2 images seulement | oui | oui | retour normal |
| Gohan (tenue d'école) | oui | oui | oui | oui | oui | oui | oui (lignes face) |
| Gohan Super Saiyan | oui | oui | oui | **absent** | oui | **absent** | retour normal |
| Trunks (4 planches) | oui | épée | oui | oui | oui | **absente** | oui (lignes face) |
| Goku | oui (existant) | oui | oui | oui | oui | oui | oui |

Manques : aucune planche de Super Saiyan 2 (surimpression d'éclairs), Gohan Ultime non audité, **planche du Vegeta saga Saiyan / grand singe introuvable** dans `assets/raw` (à indiquer).
