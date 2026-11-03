# 0016 – Cinq emplacements d'équipement

- **Statut** : acceptée
- **Date** : 2026-11-03

## Décision

Le personnage a **5 emplacements** : tête, torse, gants, bottes, **accessoire**. L'anneau de ki (+3 Énergie) occupe l'emplacement accessoire.

## Pourquoi

La spécification prévoyait 4 emplacements, mais l'anneau de ki n'entrait dans aucun. Le schéma d'objet (`emplacement`) connaissait déjà `accessoire`.

## Alternatives écartées

Supprimer l'anneau de ki (perd la seule source d'Énergie de la bêta) ; en faire un consommable (n'a pas de sens).

## Conséquences

`docs/beta0-spec.md` §9 corrigé. Aucun changement de `data/`.
