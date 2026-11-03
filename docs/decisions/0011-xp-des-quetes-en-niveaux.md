# 0011 – XP des quêtes exprimée en fraction de niveau

- **Statut** : acceptée
- **Date** : 2026-11-03

## Contexte

Les récompenses d'XP des quêtes étaient des chiffres fixes (60, 250, 3 000…). Comme l'XP requise croît en `100 × L^1,87`, ces chiffres pesaient de moins en moins (la quête 4 donnait environ 14 % d'un niveau, la quête 9 environ 29 %), alors que le cahier des charges prévoit que les quêtes apportent environ 40 % de l'XP de progression.

## Décision

Une quête déclare `recompenses.xp_niveaux`, un nombre **de 0,5 à 1,5** : l'XP gagnée vaut `xp_niveaux × XP requise au niveau conseillé de la quête` (`xpQuete` dans `packages/shared/src/formulas.ts`). Le champ `recompenses.xp` en chiffre fixe est interdit par le schéma. Une quête sans `xp_niveaux` ne donne pas d'XP.

Valeurs de départ (brouillon, à valider par Souleymen) : q01 0,5 · q02 0,7 · q03 0,6 · q04 0,5 · q05 1,0 · q07 1,5 · q09 1,2 · q11 1,5. Les quêtes 6, 8 et 10 (récompense : technique, boutique, transformation) n'ont pas d'XP, comme avant.

## Pourquoi

- La récompense suit automatiquement l'équilibrage de `xp_requise` ; changer la courbe ne casse plus les quêtes.
- Un seul chiffre lisible par le concepteur : « cette quête vaut un tiers de niveau ».
- Bornes 0,5 à 1,5 : une quête n'est jamais négligeable ni ne fait gagner plus d'un niveau et demi.

## Alternatives écartées

- Garder des chiffres fixes et les réécrire à la main : recommence le même problème à chaque rééquilibrage.
- Un pourcentage de l'XP totale du joueur : dépend du joueur, difficile à tester.

## Conséquences

`schemas/quete.schema.json` régénéré ; les 8 quêtes concernées de `data/quests/` migrées ; `tests/golden/formules.json` complété d'une section `xp_quete` (8 cas) ; `xpQuete` testée ; `docs/beta0-spec.md` §8 corrigé. La valeur de `multiplicateur_global` ne s'applique pas aux quêtes (voir 0012).
