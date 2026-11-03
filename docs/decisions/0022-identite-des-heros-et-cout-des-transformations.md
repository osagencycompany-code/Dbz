# 0022 – Identité des héros et coût des transformations

- **Statut** : acceptée
- **Date** : 2026-11-03

## Décision

- Chaque héros a des **modificateurs en % (de ±15 à ±20 % au plus)**, appliqués **après** la formule commune, un **passif**, des techniques et des transformations. Un héros sans modificateur est neutre : les cas de `tests/golden/formules.json` restent valables. Des cas de référence par héros s'ajoutent (application pure des modificateurs).
- Les valeurs vivent dans `data/characters/<héros>.json` (statut `brouillon` jusqu'à validation du tableau par Souleymen) ; aucun effet n'est codé avant cette validation.
- **Plus une transformation donne de statistiques, plus elle coûte de ki par seconde** : Super Saiyan +20 % pour 2 %/s, Super Saiyan 2 +35 % pour 3 %/s, Super Saiyan 3 +50 % pour 5 %/s. Valeurs dans `data/transformations/`.
- Le **Super Saiyan 2** réutilise la planche du Super Saiyan avec une surimpression d'éclairs (animation 22 de DBZ Online), faute de planche dédiée.

## Pourquoi

Donner une vraie identité sans casser l'équilibre commun ; empêcher que la transformation la plus forte soit aussi la plus économe.
