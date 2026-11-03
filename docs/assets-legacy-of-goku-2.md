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

## Ce qui manque encore (comparaison avec spritedatabase.net, rien téléchargé)

Comparaison des listes des pages `game/978` (Legacy of Goku 2) et `game/976` (Buu's Fury) avec `assets/raw/`. Les noms de fichiers ne correspondent pas toujours un pour un (certaines planches regroupent plusieurs personnages) : « absent » veut dire « aucun fichier de ce nom », à confirmer en ouvrant les planches proches.

**Legacy of Goku 2** — planches de personnages absentes ou à confirmer : *Maron* (avec Krilin), *Chaozu* (avec Tenshinhan), *Puar* (avec Yamcha), *Maître Roshi et la Tortue* (peut-être dans `Kame House NPC.png`), *Computer Screens*, *Various*. Décors absents : *Canyon*, *Capsule Corp (salle des ordinateurs, couloir, escalier)*, *vaisseau de Freezer*, *maison de Goku (chambre, cuisine, salon)*, *cratère de la capsule spatiale*. Les autres planches (Android 16 et 17, Bulma et sa famille, Freezer, King Cold, Cooler, Future Trunks, Gohan, Krilin, Piccolo, Tenshinhan, Vegeta, Yamcha) sont présentes.

**Buu's Fury** — absents ou à confirmer : *Janemba deuxième forme* (peut-être `Super Janemba.png`), *Fat Buu* (peut-être `Majin Buu.png`), *Gohan en vêtements décontractés* (peut-être la tenue d'école), *Various*. Décors absents : *Behind Kami's Throne*, *Dock Area*, *Hyperbolic Time Chamber*, *Orange Star High School Field* (*Airplane 576* est présent). *Janemba première forme*, *Puipui*, *Spopovich* et *Yamu* sont dans `buus-fury-complements/`. Tout le reste (Broly, Evil Buu, Gohan Kai et Great Saiyaman, Goku et ses formes, Gotenks, Great Saiyaman, Hercule, Olibu, Piccolo, Trunks, Vegeta Super Saiyan, Vegito, Yakon, portraits) est présent.

**Utilité pour la bêta** : aucune de ces planches n'est bloquante. Les plus utiles ensuite : *Maron, Chaozu, Puar* et *maison de Goku* pour les scènes de salle personnelle ; *Hyperbolic Time Chamber* pour l'entraînement ; *Canyon* et *cratère de la capsule spatiale* pour de nouvelles zones.
