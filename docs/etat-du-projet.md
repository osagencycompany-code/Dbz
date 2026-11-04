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

Les quatre héros (Goku, Vegeta, Gohan adolescent, Trunks du futur) sont **validés** par Souleymen. Projet RPG Maker : inventaire dans `docs/assets-rpgmaker-dbz.md`, PNJ convertis dans `assets/pnj/` (Krilin, Chichi…).

Legacy of Goku 1 : inventaire dans `docs/assets-legacy-of-goku-1.md`. Raditz et Nappa utilisent maintenant des sprites animés de LoG1 (brouillons) ; le boss Vegeta (saga Saiyan, trois phases dont le grand singe) est créé en brouillon, mais le fichier `vegeta-saga-saiyan.png` annoncé n'était pas dans le dossier. Les Saibamen n'existent pas dans LoG1.

Les fiches de monstres communs gardent leurs sprites actuels : le client n'affiche pas encore de monstre animé, le changement viendra après le choix du dinosaure.

## À valider par Souleymen

- Les fiches en `brouillon` de `data/` (héros, transformations, techniques, objets d'évolution, `evolution.json`, `pvp.json`).
- Les lignes « à confirmer » du glossaire (Tenshinhan, Scouter).
- Les libertés 2 à 10 de `docs/lore/canon.md`.

## Questions ouvertes

- Pas encore fait : tout le modèle de personnage côté serveur/client, butin, boss de la saga Saiyan, PNJ interactifs, quêtes (à adapter), techniques des héros, son, carte M, chat.

## Jalon 5 – commit 1 : modèle à cinq emplacements (fait)

- Migration 4 : `personnages` (id, compte, emplacement 1–5, nom, héros, apparence, rareté, niveau, XP, stats, zénies, position), `inventaire` et `equipement` par personnage. Les personnages existants deviennent Son Goku en emplacement 1.
- API : `GET/POST /api/personnages`, `DELETE /api/personnages/:id` (nom à répéter), `GET /api/heros`, `GET /api/personnage?id=`. La salle reçoit `personnageId` et vérifie qu'il appartient au compte.
- Reste du jalon 5 : modificateurs et passifs des héros, règle d'XP (10 % / 5 %), écrans de création et de sélection, effets, combat du prototype 06, chemin des monstres.

### Jalon 5 – commit 2 : modificateurs, passifs, règle d'XP (fait)

- Modificateurs des fiches (`*_pct`, `degats_pct`, `degats_recus_pct`, `duree_coups_pct`) appliqués en % après la formule commune ; passifs : Épée du futur (portée +15 %), Fierté du prince (+10 % contre un boss), Esprit combatif (+10 % pendant 60 s après une élite ou un boss). Le passif de Gohan (ki sous 30 % de PV) attend les attaques de ki.
- XP sans groupe : seul un joueur ayant infligé au moins 10 % des dégâts d'un monstre commun ou élite (5 % pour un boss) reçoit l'XP. Valeurs : `data/balance/partage-xp.json`. Le partage de groupe viendra avec les groupes.
- Choix du personnage : `POST /api/personnages/:id/jouer` (plus de GET).
- **À SUPPRIMER dans ce jalon 5, dès que l'écran de création existe** : la création d'office de Son Goku (`chargerOuCreer` dans `apps/server/src/db/personnages.ts`, route `GET /api/personnage`). Dans la bêta : chaque joueur choisit son héros et son apparence à la création et son personnage parmi ses 5 emplacements à chaque connexion ; un compte sans personnage arrive sur l'écran de création. Un test `it.todo` est prêt dans `emplacements.test.ts`.
- **Effets (décision du 2026-11-03)** : pas d'effets dessinés de zéro. On reprend ceux du prototype 06 : graphics/animations 20 (charge du ki), 1 (aura Super Saiyan), 8 (étincelle), 3 et 2 (traînées de coup), 9 (poussière), 11 et 13 (explosions), 24 (onde de choc), mêmes réglages que le prototype. Super Saiyan 2 : arcs turquoise générés. Aucun extrait d'effets-swl dans le jeu.

### Clignotement contre un mur et script de vue (fait)

- Correctif de réconciliation déjà présent dans `apps/client/src/jeu/scene.ts` (champ `aBouge`, recalage seulement au-delà de 6 px, `enMarche = aBouge` pour le joueur local) : non réécrit.
- Ajout de `scripts/voir.mjs` : `DBZ_MDP=<mot de passe> node scripts/voir.mjs ["/tp rpgmaker/map062"]` ouvre le jeu (960×540), se connecte (pseudo `Souley`, ou `DBZ_PSEUDO`), active F3, tape la commande et enregistre `docs/captures/vue.png`.
- Le mot de passe n'est stocké nulle part : il se passe par `DBZ_MDP`.
- Fichier client seul : `npm run check` non relancé. Capture pas encore prise (mot de passe manquant).
- À vérifier par Souleymen : Ctrl+F5, courir contre un mur sur `/tp rpgmaker/map062`, répondre « ça saute » ou « ça ne saute plus ».
- Le « saut » en courant venait de l'animation, pas de la position : le dos de Goku sautait la colonne 1 de la planche (corrigé dans `dessinerJoueur`, `scene.ts` : colonne 1 du dos remplacée par la 0). Position mesurée stable contre les murs de map062. On ne retouche plus la réconciliation pour ça.
