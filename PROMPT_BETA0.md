Tu vas construire la bêta 0 complète de DBZ MY GAME, un MMORPG 2D jouable dans le navigateur.

Lis d'abord, en entier et dans cet ordre :
1. CLAUDE.md (règles du projet, obligatoires)
2. docs/beta0-spec.md (ce qu'on construit : périmètre, formules, contenu, critères d'acceptation, jalons)
3. docs/maps-et-histoire.md (quelle map pour quelle zone, état de préparation, planches en grille)
4. docs/reference/prototype-06.html (référence du ressenti de combat : lis le code, c'est la base à porter)
5. assets/characters/*/*.anims.json, tools/*.py, maps/ile-de-roshi/*.tmj

Les graphismes originaux sont dans assets/raw/graphics/ (dossiers DBZ Online : characters, animations, projectiles, tilesets, items, faces… et dossiers Buu's Fury : playable_characters, enemies_bosses, maps, miscellaneous). Inventorie-les avant de planifier.

Ensuite, SANS ÉCRIRE DE CODE :
- présente le plan complet de la bêta 0 découpé en jalons (ceux de la section 15 de la spec, ajustés si besoin) avec, pour chacun : ce qui sera livré, les fichiers principaux, les tests, le temps estimé, et ce que je devrai vérifier moi-même ;
- liste les points de la spec qui te paraissent ambigus, incohérents ou risqués, avec ta recommandation pour chacun ;
- liste ce dont tu as besoin de ma part (le moins possible).

Puis ATTENDS mon accord. Ensuite, enchaîne les jalons un par un : à la fin de chacun, tests au vert, commit, résumé en français de ce qu'il faut tester, puis présente le plan détaillé du jalon suivant et attends mon accord avant de le coder.

Fais tout ce que tu peux faire toi-même (installation, configuration, base de données, scripts, génération d'assets, traitement des maps, tests). Pour les maps, traite toi-même toutes les planches de la bêta avec l'outil fourni et génère des aperçus PNG (map + collisions en rouge + objets) pour que je valide d'un coup d'œil avant d'ouvrir Tiled.
