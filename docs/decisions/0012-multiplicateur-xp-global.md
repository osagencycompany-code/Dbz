# 0012 – Multiplicateur global d'XP à 3 pour la bêta

- **Statut** : acceptée
- **Date** : 2026-11-03

## Contexte

Avec 10 à 20 testeurs sur une durée limitée, la courbe d'XP complète (niveaux 1 à 25) est trop longue : il faut pouvoir atteindre le niveau 20 et Nappa en quelques sessions.

## Décision

`data/balance/progression.json` contient `multiplicateur_global`, réglé à **3** pour la bêta (version du fichier : 2). Le serveur multiplie par cette valeur l'XP gagnée sur les **monstres et les boss**, après l'écart de niveau et avant le Zenkai. Il ne s'applique pas à l'XP des quêtes, déjà exprimée en niveaux (décision 0011). Il se règle à chaud, sans toucher aux formules.

## Pourquoi

Un seul réglage pour accélérer ou ralentir toute la bêta, sans modifier `xp_requise` (donc sans toucher aux tests de référence). Ne pas multiplier les quêtes évite qu'une quête à 1,5 niveau en vaille 4,5.

## Alternatives écartées

- Diviser `xp_requise` par 3 : change la formule verrouillée et son test de référence.
- Multiplier aussi les quêtes : fait perdre son sens à `xp_niveaux`.

## Conséquences

`data/balance/progression.json` (clé ajoutée, version 2), schéma `balance-progression`. L'application du multiplicateur par le serveur est faite au jalon 4 (combat en ligne). Les formules de référence ne changent pas.
