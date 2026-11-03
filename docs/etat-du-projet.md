# État du projet

Mis à jour à la fin de chaque session.

## Où on en est

- Prototypes 01 à 06 validés ; le 06 est la référence du combat.
- Socle en place : règles, direction artistique, lore, décisions 0001 à 0017, schémas, données de la bêta en brouillon.
- **Jalon 0 terminé** : monorepo, schémas zod, formules + tests de référence, `npm run check` au vert.
- **Jalon 1 terminé** : serveur Express + Colyseus, SQLite, comptes avec clé d'invitation, salles de map vides.
- **Jalon 2 terminé** : palettes, crabe et mannequin « maison », page d'aperçu (`npm run assets:build`).
- **Jalon 3 terminé** : 12 maps (la forêt est en deux maps, décision 0018), corrections de relecture appliquées, `npm run check` vérifie que spawns, PNJ et boss sont hors collision et que chaque portail est atteignable.
- **Jalon 4 terminé** (à tester par Souleymen) : simulation serveur à 20 Hz (déplacement validé, anti-triche +10 %, coup de poing en combo, IA : poursuite, meute, charge, bond, morsure de zone annoncée, XP, niveaux, K.O.), client Phaser 480 × 270 avec prédiction, fenêtre P, test Playwright à deux navigateurs. Valeurs réglables dans `data/balance/monde.json` (décision 0019). **Jalon 5 non commencé** (attend ton avis sur le ressenti).
- Fiches validées par Souleymen : Goku (3 palettes), crabe, loup, bandit, Bulma, Chichi, Krilin, Tortue Géniale, Tortue, Saibaman, Raditz, Nappa. Mannequin refait en bois (à revalider).

## Comment jouer

```
npm install
npm run assets:build
npm run jouer          # prend d'autres ports si 2567/5173 sont occupés ; affiche une clé d'invitation, lance serveur + client ; ouvrir http://localhost:5173
npm run test:e2e       # deux navigateurs (Playwright), captures dans assets/build/e2e/
```

Touches : flèches, Maj (courir), Z ou Ctrl (coup de poing, combo de 3), P (fenêtre Personnage), F3 (affiche les collisions et, un instant, la zone touchée par chaque coup), Entrée (ligne de saisie : commandes d'administration uniquement).

Commandes d'administration (décision 0020) : `npm run admin:grant -- <pseudo>` (une fois, hors du jeu en cours), puis relancer `npm run jouer` (qui active `ADMIN_COMMANDS=on` en local). Dans le jeu, Entrée puis par exemple `/tp foret-sud`, `/tp foret-nord`, `/tp cratere`, `/tp maison-de-goku`, `/tp ville`, `/tp desert-du-diable/sud`, `/niveau 10`, `/xp 500`, `/soin`, `/invincible`, `/boss raditz`, `/boss nappa`. Journal : table `journal_admin` de la base.

## Prochaine étape

Modèle de personnage (décisions 0021 à 0024) : **préparation faite, rien codé côté jeu**. À valider par Souleymen avant de coder les effets, le modèle à 5 emplacements (migration 4, personnage existant → Goku emplacement 1) et les écrans :

1. L'audit des planches (`docs/assets-legacy-of-goku-2.md`) et l'aperçu `assets/build/apercu-heros.html` (animations des 4 héros, rendu Super Saiyan 2, créatures LoG2, T-Rex contre Triceratops).
2. Le tableau des héros (`data/characters/*.json`, tout en `brouillon`).
3. Le fichier de la planche « Vegeta saga Saiyan / grand singe » : introuvable dans `assets/raw`, à indiquer.

Les fiches de monstres gardent leurs sprites actuels : le client n'affiche pas encore de monstre animé, le changement viendra après le choix du dinosaure.

## À valider par Souleymen

- Les fiches en `brouillon` de `data/` (héros, transformations, techniques, objets d'évolution, `evolution.json`, `pvp.json`).
- Les lignes « à confirmer » du glossaire (Tenshinhan, Scouter).
- Les libertés 2 à 10 de `docs/lore/canon.md`.

## Questions ouvertes

- Pas encore fait : tout le modèle de personnage côté serveur/client, butin, boss de la saga Saiyan, PNJ interactifs, quêtes (à adapter), techniques des héros, son, carte M, chat.
