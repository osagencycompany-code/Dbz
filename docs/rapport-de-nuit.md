# Rapport de nuit

Mode nuit autorisé : jalons 0 à 3 enchaînés, jalon 4 si le temps le permet, jamais le jalon 5. Pas de `git push`.

## Jalons terminés

### Jalon 0 – Socle (terminé)

- Monorepo npm workspaces (`apps/client`, `apps/server`, `packages/shared`), TypeScript strict, Vitest, `.gitattributes` (LF) et `.editorconfig`.
- Schémas **zod** dans `packages/shared/src/schemas/` = source de vérité ; `npm run schemas:build` régénère `schemas/*.schema.json` (le check échoue s'ils sont périmés).
- `packages/shared/src/formulas.ts` : formules sans aucun chiffre d'équilibrage, verrouillées par `tests/golden/formules.json` (tolérance absolue, 22 tests).
- `npm run check` = types + tests + `scripts/check-donnees.ts` (schémas, nom de fichier = id, références croisées, fichiers d'assets, animations dans les limites des planches, maps Tiled et portails, nombres en dur dans la logique).
- Décisions 0010 à 0017 écrites ; spec et DA corrigées ; données migrées (XP des quêtes en `xp_niveaux`, `multiplicateur_global` = 3, Raditz sans Saibamen, touche Z, campement du désert).

## À tester au réveil

```
npm install
npm run check
```
Attendu : vert, avec 5 avertissements sur les dialogues absents (normal, jalon Contenu).

## Choix faits en ton absence

| Choix | Alternative |
| --- | --- |
| `multiplicateur_global` ne multiplie que l'XP des monstres et boss, pas celle des quêtes (0012). | Multiplier aussi les quêtes. |
| Valeurs `xp_niveaux` : q01 0,5 · q02 0,7 · q03 0,6 · q04 0,5 · q05 1,0 · q07 1,5 · q09 1,2 · q11 1,5 ; q06, q08, q10 sans XP (comme avant). Une quête de niveau 10 donne ainsi 11 120 XP (contre 3 000). | Les ajuster ; c'est une seule clé par fichier. |
| Touche alternative du coup de poing : **Z** (touche physique). | W, ou autre. |
| Point de soin du désert nommé `campement-du-desert` (objet `heal` à placer au jalon Maps). | Autre identifiant. |
| Tolérance des tests de référence : absolue (0,01 ; ±0,5 pour les entiers arrondis) plutôt que 1 % relatif. | Relative, plus lâche. |
| Les sprites « 78, 41 et 82 » cités dans ta validation ne sont pas identifiables dans `data/` : non touchés. | À préciser. |
| Les décisions sont datées du 2026-11-03 (date de la session). | — |

## Problèmes rencontrés

- Python absent de la machine : sans effet pour l'instant, mais `tools/*.py` (maps, planches) en aura besoin au jalon Maps (voir la suite).
- `esbuild` signale un script d'installation bloqué ; `tsx` et Vitest fonctionnent quand même.

## Plan du jalon suivant

Voir `docs/etat-du-projet.md`.
