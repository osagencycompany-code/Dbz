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

### Jalon 2 – Assets (terminé)

- `npm run assets:build` génère `assets/build/` (non versionné) : planches de Goku en 3 palettes (orange, bleu, vert ; normal et Super Saiyan), sprites des monstres/boss/PNJ, `manifest.json` et **`assets/build/apercu.html`**.
- La page d'aperçu montre : l'échelle réelle 480 × 270, toutes les animations de Goku par palette et direction, et chaque sprite de `data/` avec ses 4 directions et son statut. Les cartes bordées d'or sont à valider.
- **Crabe** et **mannequin** dessinés par code (`npm run assets:maison` → `assets/maison/`, versionnés, provenance `maison`). Fiches en brouillon.
- Recoloration : seules les 5 teintes du kimono changent (`assets/palettes.json`) ; de rares pixels orange restent aux bottes.
- `npm run check` vérifie maintenant que les palettes des personnages existent.

### Jalon 3 – Maps (terminé, à vérifier dans Tiled)

- **11 maps** au total : île de Roshi (3, déjà faites), Mont Paozu (maison de Goku, forêt, cratère), West City (ville, Capsule Corp, maison de Bulma), Désert du Diable (sud, nord).
- `tools/build_maps.py` découpe les planches (grille du désert recollée en retirant les séparateurs de 3 px), `tools/remplir_maps.py` place collisions et objets (spawns, portails, PNJ, zones de monstres, points de soin, voyage, boss, rocher), `tools/apercu_maps.py` produit les aperçus.
- `npm run check` vérifie maintenant : calques, types d'objets, portails et spawns cibles, monstres de zone appartenant à la zone, boss dans leur zone, arrivée de chaque zone, point de soin existant, image de fond dans la grille. Il a trouvé un vrai oubli (point de soin « kame-house » absent), corrigé.
- Le serveur ouvre une salle par map des zones (11).

### Jalon 4 – Combat en ligne (PARTIEL : seulement les règles de progression)

Fait : `packages/shared/src/progression.ts` (+ 13 tests) : montée de niveau avec report d'XP et plafond au niveau 25, XP sur monstre (écart de niveau → `multiplicateur_global` → Zenkai, dans cet ordre), coups ratés contre un monstre trop fort, perte d'XP et PV au retour d'un K.O., déclenchement du Zenkai. Aucun chiffre en dur : tout vient de `progression.json`.

**Pas fait** (volontairement) : boucle de simulation du serveur, déplacement validé, IA des monstres, client Phaser, fenêtre P. Raisons : il faut des valeurs nouvelles à décider (taille de la boîte de collision, portées, délais d'IA…) qui doivent passer par `data/` et une décision, et un client pour que tu puisses tester quoi que ce soit. **Le jalon 5 (ressenti du combat) n'est pas commencé**, comme demandé.

## À tester au réveil

Aperçus de maps (fond + grille + collisions rouges + objets) :
```
python tools/apercu_maps.py
```
puis ouvrir les PNG de `assets/build/maps/`. Puis, dans Tiled, ouvrir les `.tmj` de `maps/mont-paozu`, `maps/west-city`, `maps/desert-du-diable` et corriger les collisions (calque `collisions`, pinceau, cases de 16 px) et les positions d'objets. **Attention** : `remplir_maps.py` ne repasse jamais sur une map dont le calque `objets` est rempli, donc tes corrections sont sûres.

Page d'aperçu des assets :
```
npm run assets:build
```
puis ouvrir `assets/build/apercu.html` dans le navigateur. À regarder : le crabe et le mannequin (cartes dorées), les 3 palettes, Bulma (82), le loup (78), le bandit (41), et l'échelle réelle en haut de page.


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
| Sprites 78 (loup), 41 (bandit du désert) et 82 (Bulma) : identifiés visuellement et appliqués aux fiches, qui restent en `brouillon` jusqu'à ta validation sur la page d'aperçu. | Passer en `valide`. |
| Les décisions sont datées du 2026-11-03 (date de la session). | — |
| Maps : le désert est coupé en deux moitiés (nord/sud) ; West City utilise la ville, l'extérieur de Capsule Corp et la maison de Bulma (le hall, le labo, la salle de gravité de la planche ne sont pas utilisés). | Autres découpes. |
| Mont Paozu : chaque map est un seul écran de la planche (la forêt fait 35 × 34 cases, petite pour les niveaux 4 à 12). | Recoller plusieurs écrans de forêt. |
| Nouveau champ `arrivee` dans les fiches de zone et nouveau type d'objet `rock`. | — |
| Aucun dessin de campement ni de rocher : seuls les objets (point de soin, rocher) sont placés. | Les dessiner. |
| Colyseus **0.16** (pas 0.18, sorti depuis : API différente et client `colyseus.js` resté en 0.16). | Migrer en 0.18 plus tard. |
| Jetons de session maison (HMAC), sans bibliothèque. | JWT. |
| Pas de filtre de mots sur les pseudos pour l'instant (seulement 3 à 16 caractères alphanumériques) : le filtre arrive avec le chat. | — |
| Noms de salles Colyseus sans « / » (le matchmaking les met dans l'URL). | — |

## Problèmes rencontrés

- `npm install colyseus` échoue (dépendance git bloquée) : on utilise `@colyseus/core` + `@colyseus/ws-transport`.
- `tsx` ignorait les décorateurs de Colyseus Schema (tsconfig racine) : scripts lancés avec `--tsconfig apps/server/tsconfig.json`.
- Vitest passe en `pool: threads` (Colyseus envoie des messages IPC qui cassent le pool par défaut).
- Une commande `taskkill` trop large a été refusée par le système de permissions ; remplacée par `timeout`.

- Python absent de la machine : sans effet pour l'instant, mais `tools/*.py` (maps, planches) en aura besoin au jalon Maps (jalons 2 et 3 : outils portés en TypeScript, voir plus bas).
- `esbuild` signale un script d'installation bloqué ; `tsx` et Vitest fonctionnent quand même.

## Plan du jalon suivant (reste du jalon 4 — à valider par toi avant de coder)

1. **Valeurs à décider** (dans `data/balance/`, avec une décision) : boîte de collision du joueur et des monstres, portée des coups, rayon d'aggro par défaut, tolérance anti-triche (la spec dit +10 %).
2. **Serveur** : lecture des `.tmj` en grille de collisions ; boucle à 20 Hz dans `SalleMap` ; déplacement validé (vitesse max, murs) ; apparition des monstres depuis les `mobzone` ; IA de base (poursuite, meute, charge, bond) ; coups et dégâts avec `formulas.ts` ; XP, butin, K.O. avec `progression.ts`.
3. **Client** (Vite + Phaser 3.80, 480 × 270 entier) : connexion, chargement de la map et des sprites depuis `assets/build/`, déplacement avec prédiction, interpolation des autres joueurs, HUD minimal, fenêtre P.
4. **Test Playwright** : deux navigateurs, deux comptes, ils se voient et combattent le même monstre (critère d'acceptation n°1).
5. Estimation : environ 2 à 3 sessions de travail. Le jalon 5 (ressenti : gel d'impact, étincelles, contre, Kamehameha…) ne commence qu'après ta validation de ce jalon.

## Rappel : ce qui attend ta décision

- Valider/refuser : crabe, mannequin, sprites 78/41/82 (page d'aperçu).
- Corriger les maps dans Tiled.
- Valeurs `xp_niveaux` des quêtes, touche Z, noms de maps.
