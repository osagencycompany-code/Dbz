# Règles de cohérence

Ces règles s'appliquent à chaque session, sans exception. Elles existent pour qu'une information ne puisse jamais exister en deux versions contradictoires.

## 1. Une information, un seul endroit

| Type d'information | Seul endroit où elle vit | Ailleurs, on fait seulement référence |
| --- | --- | --- |
| Chiffres d'équilibrage (dégâts, coûts, XP, respawn, prix) | `data/balance/*.json` | Docs et code citent la clé, jamais la valeur |
| Formules | `packages/shared/src/formulas.ts`, verrouillées par `tests/golden/formules.json` | |
| Monstres, boss, PNJ, objets, techniques, transformations, zones, quêtes | `data/<type>/<id>.json` | |
| Noms affichés en jeu | `docs/lore/glossaire.md` | Les fiches reprennent exactement ces noms |
| Histoire et libertés prises avec le canon | `docs/lore/canon.md` | |
| Style visuel et sonore | `docs/direction-artistique.md` | |
| Choix structurants et leur raison | `docs/decisions/` | |
| Où en est le projet | `docs/etat-du-projet.md` | |
| Animations d'un personnage | `assets/characters/<id>/<id>.anims.json` | |

Les docs de conception (`docs/beta0-spec.md`) décrivent des intentions ; en cas d'écart avec `data/`, `data/` fait foi et la doc est corrigée.

## 2. Début de session

1. Lire `CLAUDE.md` et `docs/etat-du-projet.md`.
2. Lancer `npm run check` (dès qu'il existe) et signaler tout échec avant de faire quoi que ce soit.
3. Résumer en cinq lignes l'état du projet et ce que la session va faire, puis attendre l'accord.

## 3. Fin de session

1. `npm run check` au vert.
2. Mettre à jour `docs/etat-du-projet.md` : ce qui a été fait, ce qui reste, les questions ouvertes.
3. Un commit en français, un résumé de ce qu'il faut tester.

## 4. Changer une règle de jeu

1. Proposer le changement et sa raison ; attendre l'accord.
2. Écrire une nouvelle décision dans `docs/decisions/` (une décision ne se modifie jamais : on en écrit une nouvelle qui remplace l'ancienne et on marque l'ancienne « remplacée par »).
3. Modifier `data/` et incrémenter le champ `version` du fichier d'équilibrage.
4. Si une formule change, mettre à jour `tests/golden/formules.json` dans le même commit. Un test de référence qui échoue sans décision associée est un bug, pas une mise à jour.

## 5. Contenu et lore

- Avant d'écrire un dialogue, une quête ou un nom : vérifier `docs/lore/glossaire.md` et `docs/lore/canon.md`.
- Aucun élément ne contredit le canon sans figurer dans la liste « Libertés assumées » de `canon.md`, validée par Souleymen.
- Un nom absent du glossaire y est ajouté avant d'être utilisé.
- **Références externes** (`docs/reference/analyse-references.md` = base de travail ; `docs/reference/externes/` = captures, plans et textes originaux, à consulter seulement pour vérifier un détail) : on s'inspire des mécaniques, de la structure et du ton ; on ne recopie jamais un dialogue, une description d'objet ou un nom inventé par ces jeux (Buu's Fury, Legacy of Goku, DBZ Online). Les noms canon de Dragon Ball suivent le glossaire.
- **Interface** : la fenêtre Personnage, l'inventaire et la carte du monde prennent les captures de DBZ Online (`docs/reference/externes/dbz-online-interface/`) comme modèle visuel (fenêtres crème à bordure brune, barre de titre bleue, boutons orange). Seule la mise en page est reprise, pas les textes ni les icônes.

## 6. Assets

- Tout fichier chargé par le jeu est référencé par une fiche de `data/` ou un fichier `.anims.json`, avec sa provenance (`dbz-online`, `buus-fury`, `maison`). C'est ce qui permettra de savoir quoi redessiner avant une sortie publique.
- Un asset respecte `docs/direction-artistique.md` ; sinon il reste en `statut: brouillon` avec la raison dans `a_verifier`.
- Les originaux de `assets/raw/` ne sont jamais modifiés.

## 7. Validation par Souleymen

Toute fiche créée par l'IA commence en `statut: brouillon`. Elle passe en `valide` uniquement après accord explicite de Souleymen. Le ressenti du combat, la direction artistique et le lore sont toujours validés en jeu ou sur capture, jamais sur description.

## 8. Vérifications automatiques (`npm run check`)

- Types TypeScript et tests unitaires.
- Chaque fichier de `data/` valide contre son schéma de `schemas/`, nom de fichier égal à l'`id`.
- Références croisées : donneur de quête, prérequis, objets de butin, monstres de zone, invocations de boss, fichiers de sprites et d'animations existants, images dans les limites de la planche.
- Formules conformes à `tests/golden/formules.json`.
- Aucune valeur numérique d'équilibrage codée en dur dans `apps/` (recherche des nombres suspects dans la logique de combat).
