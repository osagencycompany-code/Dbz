# 0013 – Raditz n'invoque pas de Saibamen

- **Statut** : acceptée
- **Date** : 2026-11-03

## Contexte

La spécification donnait à Raditz, sous 25 % de PV, l'appel de 2 Saibamen. Dans le canon (`docs/lore/canon.md`, point 6), les Saibamen arrivent avec Nappa et Vegeta, après Raditz.

## Décision

Raditz n'invoque aucun monstre. Sa phase 3 garde l'aura rouge et +30 % de vitesse (`vitesse_bonus_pct`) ; ses attaques sont le combo de 3 coups. Les Saibamen n'apparaissent qu'avec Nappa.

## Pourquoi

Erreur de lore, pas un choix de design : aucune liberté vis-à-vis du canon n'est nécessaire.

## Alternatives écartées

Conserver les Saibamen en les ajoutant à la liste des libertés de `canon.md` : inutile, la phase reste lisible sans eux.

## Conséquences

`data/bosses/raditz.json` (invocations retirées), `docs/beta0-spec.md` §7 corrigé.
