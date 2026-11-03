Tu vas construire la bêta 0 complète de DBZ MY GAME, un MMORPG 2D jouable dans le navigateur.

Lis d'abord, en entier :
1. CLAUDE.md, docs/regles-de-coherence.md, docs/etat-du-projet.md (règles obligatoires et état actuel)
2. docs/README.md puis docs/beta0-spec.md, docs/maps-et-histoire.md, docs/direction-artistique.md, docs/lore/canon.md, docs/lore/glossaire.md, docs/decisions/
3. data/ (fiches de la bêta en brouillon), schemas/, tests/golden/formules.json
4. docs/reference/prototype-06.html (référence du ressenti de combat : lis le code, c'est la base à porter)
5. assets/characters/*/*.anims.json, tools/*.py, maps/ile-de-roshi/*.tmj

Les graphismes originaux sont dans assets/raw/graphics/ (dossiers DBZ Online : characters, animations, projectiles, tilesets, items, faces… et dossiers Buu's Fury : playable_characters, enemies_bosses, maps, miscellaneous). Inventorie-les.

Ensuite, SANS ÉCRIRE DE CODE :
- donne ton avis sur le socle (structure, règles, schémas, données) : ce qui manque, ce qui est incohérent, ce que tu améliorerais ;
- présente le plan complet de la bêta 0 en jalons, en commençant par le jalon 0 (monorepo + `npm run check` : validation des schémas, références croisées, existence des fichiers d'assets, tests de référence des formules, aucune logique de jeu) ; pour chaque jalon : livrables, fichiers principaux, tests, temps estimé, ce que je devrai vérifier moi-même ;
- liste les points ambigus ou risqués de la spec et des données, avec ta recommandation ;
- liste ce dont tu as besoin de ma part (le moins possible).

Puis ATTENDS mon accord. Ensuite, enchaîne les jalons un par un : à la fin de chacun, `npm run check` au vert, mise à jour de docs/etat-du-projet.md, commit, résumé en français de ce qu'il faut tester, puis plan détaillé du jalon suivant et attente de mon accord.

Fais tout ce que tu peux faire toi-même (installation, configuration, base de données, scripts, génération d'assets, traitement des maps, tests). Pour les maps, traite toi-même les planches de la bêta avec l'outil fourni et génère des aperçus PNG (map + collisions en rouge + objets) pour que je valide d'un coup d'œil avant d'ouvrir Tiled.
