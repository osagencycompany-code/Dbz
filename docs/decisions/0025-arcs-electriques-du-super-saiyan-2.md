# 0025 – Petits arcs électriques pour le Super Saiyan 2

- **Statut** : acceptée (remplace la partie « éclairs de l'animation 22 » de la décision 0022 ; le reste de la 0022 reste valable)
- **Date** : 2026-11-03

## Contexte

Les éclairs de l'animation 22 de DBZ Online étaient trop grands : ils cachaient le personnage.

## Décision

Le Super Saiyan 2 utilise la planche du Super Saiyan avec de **petits arcs électriques dessinés à l'échelle du sprite** (segments de 3 à 6 px près du corps, jamais sur le visage), qui apparaissent et disparaissent par intermittence. Ils sont générés par `scripts/assets/planches.ts` (`genererArcs`), pas copiés d'un jeu.
