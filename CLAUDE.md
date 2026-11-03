# DBZ MY GAME – Règles du projet

MMORPG 2D en vue de dessus, jouable dans le navigateur, inspiré de DBZ Online et de Buu's Fury.
Le porteur du projet (Souleymen) décide du design ; toi, tu conçois l'architecture et tu codes.

## Façon de travailler (obligatoire)

1. **Plan d'abord.** Avant chaque jalon, présente le plan (fichiers touchés, choix techniques, risques, ce que l'utilisateur devra tester) puis ATTENDS son accord explicite. Ne code jamais un jalon sans accord, même pour une tâche longue.
2. **Fais tout ce que tu peux faire toi-même** : installation des dépendances, scripts, configuration, variables d'environnement, base de données, génération d'assets, tests. Ne laisse à l'utilisateur que ce qui exige vraiment son intervention (vérifier une map dans Tiled, jouer et donner son ressenti, créer un compte chez un hébergeur).
3. **À la fin de chaque jalon** : tous les tests passent, un commit en français, et un court résumé en français : ce qui a été fait, comment le lancer, quoi tester précisément.
4. **Aucune valeur d'équilibrage dans le code** : tout chiffre réglable vit dans `data/*.json` et se recharge à chaud en développement.
5. **Ne dis jamais qu'une étape est « la plus grosse du projet »** sans chiffres à l'appui ; donne une estimation de temps.

## Sources de vérité

- `docs/beta0-spec.md` : ce qu'on construit maintenant (périmètre, règles, formules, contenu, critères d'acceptation).
- `docs/maps-et-histoire.md` : quelle map sert à quelle zone et à quel moment de l'histoire.
- `docs/reference/prototype-06.html` : la référence du ressenti de combat (ouvre-la dans un navigateur, lis son code). Les valeurs de combat, les effets et les animations doivent s'y conformer.
- `assets/characters/*/*.anims.json` : correspondances d'animations déjà validées par l'utilisateur. Ne pas les modifier sans demander.

## Pile technique

- Monorepo npm workspaces : `apps/client`, `apps/server`, `packages/shared`.
- Client : Vite + TypeScript + Phaser 3.80, rendu pixel-perfect, échelle entière.
- Serveur : Node.js 20+, TypeScript, Colyseus (une salle par map), Express pour l'authentification HTTP.
- Base : SQLite via Drizzle ORM pour la bêta (migrable vers PostgreSQL sans réécrire la logique).
- Partagé : formules, types, schémas zod des fichiers de données.
- Tests : Vitest (formules, règles, IA) et Playwright (deux clients se connectent et se voient).

## Règles non négociables

- **Serveur autoritaire** : le client n'envoie que des intentions (déplacement, attaque, technique). Dégâts, XP, butin, positions validées sont calculés par le serveur.
- **Commandes d'administration** : uniquement côté serveur, exécutées seulement si le compte a `role = 'admin'` en base ET si `ADMIN_COMMANDS=on`. Aucune trace de ces commandes dans le code client livré. Chaque commande est journalisée (qui, quoi, quand). Le rôle ne se donne qu'en base, par un script `npm run admin:grant -- <pseudo>`.
- **Données personnelles** : e-mail + pseudo seulement, mots de passe hachés (argon2), suppression de compte possible.
- **Assets** : les originaux restent dans `assets/raw/` (jamais modifiés) ; tout ce que le jeu charge est généré dans `assets/build/` par des scripts.
- **Textes du jeu en français**, fidèles à la VF de l'animé (Kamehameha, Tortue Géniale, Krilin, Kaio, haricot magique).
