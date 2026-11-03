# 0014 – Boss partagés, événements de quête personnels

- **Statut** : acceptée
- **Date** : 2026-11-03

## Contexte

Raditz et Nappa sont des boss de zone, mais les quêtes 9 (vagues de Saibamen) et 10 (Krilin tombe face à Nappa, tenir 60 s) sont des scènes scénarisées qui ne peuvent pas dépendre des autres joueurs présents.

## Décision

- Les **boss** (Raditz, Nappa) sont **partagés** : ceux de la salle de la map, combattus ensemble, XP et butin individuels selon la contribution.
- Les **quêtes 9 et 10** se déroulent dans une **salle d'événement personnelle** : une instance créée pour le joueur (ou pour lui seul), détruite à la fin ou à la déconnexion, où les vagues et la scène sont scriptées.
- Les PV d'un boss partagé s'ajustent au nombre de participants (valeur dans `data/balance/monstres.json`, à fixer au jalon 5).

## Pourquoi

Les boss partagés donnent l'aspect MMORPG ; les événements scénarisés restent fiables, reproductibles et sans blocage si un joueur en perturbe le déroulement.

## Alternatives écartées

Tout partagé (scènes cassées par d'autres joueurs) ; tout en instance (plus de combats communs).

## Conséquences

Spécification §7, §8 et §10 complétées. Côté serveur : un type de salle Colyseus supplémentaire (événement) au jalon 5. Pas de changement de `data/`.
