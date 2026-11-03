# 0018 – La forêt du Mont Paozu en deux maps reliées

- **Statut** : acceptée
- **Date** : 2026-11-03

## Contexte

La première version de la forêt n'utilisait qu'un seul écran de la planche Southwest Forest (560 × 544 px), trop petit pour la zone de farm des niveaux 4 à 12. Relecture de Souleymen : recoller tout le sentier.

## Décision

Le sentier forestier complet est recollé en deux maps reliées par un portail :

- `mont-paozu/foret-sud` (1216 × 1776 px) : clairière d'entrée, couloir, grande clairière, branche ouest. Loups et sangliers près de l'entrée, tigres dans la branche ouest.
- `mont-paozu/foret-nord` (1008 × 1296 px) : couloirs et clairières jusqu'au cratère. Tigres, et le dinosaure dans la clairière ouest.

Les tronçons de la planche se touchent déjà sans couture ; les zones vides sont noircies et bloquées. Le total du jeu passe de **11 à 12 maps**. Le script `tools/foret.py` produit ces deux maps.

## Pourquoi

Une seule grande map de 1360 × 3060 px aurait gaspillé de la mémoire en zones vides ; deux maps gardent des salles serveur légères et un chargement rapide.

## Alternatives écartées

Une seule map géante ; trois maps (inutile : la coupure naturelle de la planche tombe au milieu du sentier).

## Conséquences

`data/zones/mont-paozu.json` liste les deux maps ; `serveur.test.ts` attend 12 maps ; la spec indique 12 maps.
