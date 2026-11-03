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

Touches : flèches, Maj (courir), Z ou Ctrl (coup de poing, combo de 3), P (fenêtre Personnage), F3 (affiche les collisions). Le reste des techniques arrive au jalon 5.

## Prochaine étape

Tester le ressenti du jalon 4 (deux onglets, deux comptes). Pas de jalon 5 avant ton retour.

## À valider par Souleymen

- Les fiches en `brouillon` de `data/` (sprites `a_verifier`, valeurs `xp_niveaux`).
- Les lignes « à confirmer » du glossaire (Tenshinhan, Scouter).
- Les libertés 2 à 7 de `docs/lore/canon.md`.

## Questions ouvertes

- Mannequin en bois à revalider sur l'aperçu.
- Pas encore fait (jalons suivants) : butin, boss, PNJ interactifs, quêtes, techniques, son, carte M, création de personnage, chat.
