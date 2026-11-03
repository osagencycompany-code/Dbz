# Rapport de nuit

Mode nuit autorisé : jalons 0 à 3 enchaînés, jalon 4 si le temps le permet, jamais le jalon 5. Pas de `git push`.

## Jalons terminés

### Jalon 0 – Socle (terminé)

- Monorepo npm workspaces (`apps/client`, `apps/server`, `packages/shared`), TypeScript strict, Vitest, `.gitattributes` (LF) et `.editorconfig`.
- Schémas **zod** dans `packages/shared/src/schemas/` = source de vérité ; `npm run schemas:build` régénère `schemas/*.schema.json` (le check échoue s'ils sont périmés).
- `packages/shared/src/formulas.ts` : formules sans aucun chiffre d'équilibrage, verrouillées par `tests/golden/formules.json` (tolérance absolue, 22 tests).
- `npm run check` = types + tests + `scripts/check-donnees.ts` (schémas, nom de fichier = id, références croisées, fichiers d'assets, animations dans les limites des planches, maps Tiled et portails, nombres en dur dans la logique).
- Décisions 0010 à 0017 écrites ; spec et DA corrigées ; données migrées (XP des quêtes en `xp_niveaux`, `multiplicateur_global` = 3, Raditz sans Saibamen, touche Z, campement du désert).

### Jalon 1 – Serveur, comptes, base (terminé)

- Serveur Node : Express (API `/api`) + Colyseus 0.16 (une salle par map, noms `ile-de-roshi-exterieur`, etc., vides pour l'instant, accès réservé aux comptes connectés).
- SQLite via Drizzle (migrations numérotées dans `db/connexion.ts`), tables `comptes` et `invitations`.
- Inscription e-mail + pseudo + mot de passe (argon2id) + **clé d'invitation à usage unique** (non consommée si l'inscription échoue), connexion, `/api/moi`, suppression de compte, limiteur d'essais, jeton de session signé (7 jours).
- Scripts : `npm run start` / `npm run dev`, `npm run invite:create [-- n]`, `npm run admin:grant -- <pseudo>`. Rôle admin uniquement en base ; aucune commande admin encore (jalon 6 de la spec).
- 10 tests serveur (comptes, jeton, limiteur, salle) ; démarrage réel vérifié à la main.

## À tester au réveil

```
npm install
npm run check
```
Puis le serveur :
```
npm run invite:create        # affiche une clé
npm run start                # serveur sur http://localhost:2567
```
Test rapide : `curl http://localhost:2567/api/sante` doit répondre `{"ok":true}`.

Attendu pour `npm run check` : vert, avec 5 avertissements sur les dialogues absents (normal, jalon Contenu).

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

| Colyseus **0.16** (pas 0.18, sorti depuis : API différente et client `colyseus.js` resté en 0.16). | Migrer en 0.18 plus tard. |
| Jetons de session maison (HMAC), sans bibliothèque. | JWT. |
| Pas de filtre de mots sur les pseudos pour l'instant (seulement 3 à 16 caractères alphanumériques) : le filtre arrive avec le chat. | — |
| Noms de salles Colyseus sans « / » (le matchmaking les met dans l'URL). | — |

## Problèmes rencontrés

- `npm install colyseus` échoue (dépendance git bloquée) : on utilise `@colyseus/core` + `@colyseus/ws-transport`.
- `tsx` ignorait les décorateurs de Colyseus Schema (tsconfig racine) : scripts lancés avec `--tsconfig apps/server/tsconfig.json`.
- Vitest passe en `pool: threads` (Colyseus envoie des messages IPC qui cassent le pool par défaut).
- Une commande `taskkill` trop large a été refusée par le système de permissions ; remplacée par `timeout`.

- Python absent de la machine : sans effet pour l'instant, mais `tools/*.py` (maps, planches) en aura besoin au jalon Maps (voir la suite).
- `esbuild` signale un script d'installation bloqué ; `tsx` et Vitest fonctionnent quand même.

## Plan du jalon suivant

Voir `docs/etat-du-projet.md`.
