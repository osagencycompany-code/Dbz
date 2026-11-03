# État du projet

Mis à jour à la fin de chaque session.

## Où on en est

- Prototypes 01 à 06 validés ; le 06 est la référence du combat.
- Socle en place : règles, direction artistique, lore, décisions 0001 à 0017, schémas, données de la bêta en brouillon.
- **Jalon 0 terminé** : monorepo, schémas zod, formules + tests de référence, `npm run check` au vert.
- **Jalon 1 terminé** : serveur Express + Colyseus, SQLite, comptes avec clé d'invitation, salles de map vides.
- **Jalon 2 terminé** : palettes, crabe et mannequin « maison », page d'aperçu (`npm run assets:build`).
- **Jalon 3 terminé** : 11 maps (collisions et objets à vérifier dans Tiled), contrôles de maps dans `npm run check`.
- **Jalon 4 commencé (partiel)** : règles de progression en logique pure testée. Pas de boucle serveur ni de client. Jalon 5 non commencé.

## Prochaine étape

Reste du jalon 4 : valeurs de collision/portée à décider, simulation serveur, client Phaser, test à deux navigateurs (plan détaillé dans `docs/rapport-de-nuit.md`). Attendre ton accord.

## À valider par Souleymen

- Les fiches en `brouillon` de `data/` (sprites `a_verifier`, valeurs `xp_niveaux`).
- Les lignes « à confirmer » du glossaire (Tenshinhan, Scouter).
- Les libertés 2 à 7 de `docs/lore/canon.md`.

## Questions ouvertes

- Crabe dessiné par code : à valider sur la page d'aperçu (sinon quête 3 en collecte de coquillages).
- Sprites 78, 41, 82 appliqués (loup, bandit, Bulma), à valider sur l'aperçu.
