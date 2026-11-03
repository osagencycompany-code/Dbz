# 0017 – Son cliquable, carte sur M, touche alternative du coup de poing

- **Statut** : acceptée
- **Date** : 2026-11-03

## Contexte

Ctrl, touche du coup de poing, est capturé par certains navigateurs (Ctrl+W ferme l'onglet, Ctrl+Tab…) malgré `preventDefault`. Le son doit pouvoir être coupé à tout moment.

## Décision

- **Son** : un bouton cliquable à l'écran (coin supérieur droit), toujours visible, qui coupe ou rétablit le son. Pas de touche dédiée.
- **Carte du monde** : touche **M**, uniquement hors combat et depuis un point de voyage.
- **Coup de poing** : Ctrl **ou Z** (la touche physique, `KeyboardEvent.code = "KeyZ"`). La touche alternative est déclarée dans `data/skills/coup-de-poing.json` (`touche_alternative`).

## Pourquoi

Une alternative évite le conflit navigateur sans enlever Ctrl (référence du prototype 06). Z est sous la main gauche, voisine de X (boule de ki).

## Alternatives écartées

Remplacer Ctrl par une autre touche (casse la référence du prototype) ; une touche de son (inutile : un bouton est plus découvrable).

## Conséquences

`docs/beta0-spec.md` §2 corrigé ; `data/skills/coup-de-poing.json` complété ; `schemas/technique.schema.json` régénéré.
