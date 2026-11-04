# MEMOIRE

Relire ce fichier avant toute réponse sur le projet.
Ne pas changer un chiffre marqué VERROUILLÉ sans que l'utilisateur l'ait changé lui-même dans l'éditeur.
Ne pas inventer un réglage Intersect. Si ce n'est pas écrit ici, demander ce que l'éditeur affiche, ou lire la doc officielle.
Ne pas rouvrir le moteur Phaser pour la beta.

Dernière mise à jour : 2026-11-04.

## But

Beta privée, pour jouer avec des proches. Pas un jeu commercial, pas de pub.
Le ressenti visé est celui de DBZ Online (Ludo, joué depuis 2009) : on lance, on se connecte, on est sur une map, on se déplace, on lance des techniques.
Première map de l'histoire : l'île et la maison de Kame.

## Décision de moteur

Le dépôt GitHub `osagencycompany-code/Dbz` est l'ancien client navigateur (Phaser, Colyseus, Vite, Tiled `.tmj`). Il est en pause.

Pourquoi on l'a quitté :
- Les maps RPG Maker n'étaient pas réutilisées telles quelles. L'IA redessinait d'après l'image.
- `Tilesets.json` manquait, puis les planches manquaient : les maps sortaient en masque de collision.
- Le personnage clignotait contre les murs. Une partie venait de l'animation (dos de Goku, colonne 1), pas de la position.
- Se reconnecter ou rafraîchir la page était nécessaire pour voir une map. Le login était sensible à la casse.
- Trop lent pour une personne. Les prototypes visuels étaient meilleurs que le jeu branché.

Moteur actuel : Intersect 0.8.0.582-beta, en local, pas dans ce dépôt.

- Dossier : `D:\intersect\intersect-win-x64-full-0.8.0-beta.582+build.875178d5a48a372a15340bc4ca9965a56c389e0b`
- Sous-dossiers : `Server`, `Client and Editor`
- Doc : https://docs.freemmorpgmaker.com
- Releases : https://github.com/AscensionGameDev/Intersect-Engine/releases
- L'archive à utiliser est le zip full win-x64, pas le code source.

## Ce qu'on sait de DBZ Online

Jeu de Ludo. Exe + launcher. Connexion, perso, map, barre de sorts.
Il a eu son propre éditeur de maps (`DBZO V9 - Map Editor`), plus disponible.
Les captures montrent : barre de sorts, stats (Vitalité, Force, Puissance, Agilité), inventaire, radar.
Le dev a dit sur Discord : Frog, IWC, et un moteur personnalisé. Les maps et le ressenti reprennent beaucoup de Buu's Fury et Legacy of Goku.
Les fichiers `.df` du client étaient des graphismes packés. On a extrait des zips de graphismes (notamment `DBZOnline_9.0.3_ALL_GRAPHICS`).
On n'a pas les formules d'XP, de dégâts, ni les taux de drop. Ne pas les inventer.

## Assets déjà rassemblés (sur le PC, pas dans Intersect)

- Sprites Buu's Fury téléchargés depuis Spriters Resource (118 assets). Le script Torresflo et Playwright étaient bloqués. undetected-chromedriver passait Cloudflare, puis les ZIP en HTTP direct renvoyaient 403. Il a fallu télécharger avec la session du navigateur.
- Legacy of Goku 1 et 2 : pages Spriters Resource et SpriteDatabase (jeux 976, 977, 978). Le script SpriteDatabase a trouvé 0 fichier : mauvais sélecteur, pas un problème Cloudflare.
- Maps RPG Maker MV dans `assets/raw/rpgmaker-dbz/dbz_clean2/data` (Map001 à Map072) plus des tilesets.
- Image d'île déjà utilisée : `exterieur.png` (Kame House, sable, herbe, eau, ponton).
- Effets d'aura dans `assets/raw/effets-swl`.
- Un `.tmj` ne s'importe pas dans Intersect. Les collisions Tiled ou RPG Maker ne se transfèrent pas.

## Intersect, état réel

Compte de test : Leysou, niveau 1, admin. Insert ouvre Administration.
Premier compte créé = admin.

Démarrage :
1. `Intersect Server.exe`. Attendre `Server Started`. Ne pas fermer la fenêtre.
2. Client ou éditeur ensuite.
3. Si l'éditeur dit que `sqlite3.dll` est utilisé par un autre processus : fermer le client. Garder le serveur.

Map :
- Nom : Kame House. La liste admin l'affiche `KameHouse`.
- `exterieur.png` est dans `Client and Editor\resources\tilesets\`.
- Intersect découpe en cases de 32 px. L'île a été posée en sélectionnant un grand bloc de tuiles.
- Les cases non peintes sont noires. De l'eau a été peinte autour.
- Sans attribut Blocked, on marche partout, toit compris.
- Des `B` ont été peints sur le tour de l'île et une partie de la maison. Le toit n'est pas forcément entier. Pas revalidé après le dernier essai.
- Sauver la map met à jour le client déjà ouvert. Confirmé : enlever un B puis sauver, le blocage disparaît sans relog.
- Le spawn de classe ne déplace pas un personnage déjà créé. Leysou garde sa position. Pour le déplacer : Insert, puis la map dans MapList.
- Un nouveau personnage utilise le spawn réglé dans Class Editor, Spawn Point, Open Visual Interface.

## Sort — VERROUILLÉ

Ne pas changer ces valeurs. Ne pas les « améliorer » d'un message à l'autre.

1. Projectile Editor (pas le Spell Editor).
   - Nom : `Kamehameha Beam`
   - Speed (ms) : 400
   - Range : 6
   - Quantity : 1
   - Une flèche verte vers le haut dans la grille
   - Speed monte au moins jusqu'à 500 dans le Projectile Editor. L'utilisateur l'a vu.
2. Spell Editor.
   - Nom : `Kamehameha`
   - Type : Combat Spell
   - Types réels vus dans l'éditeur : Combat Spell, Warp to Map, Warp to Target, Dash, Event.
   - Il n'y a pas de type Projectile ni Damage.
   - Target Type : Linear (projectile)
   - Projectile : `Kamehameha Beam`
   - HP Damage : 50
3. Class Editor, classe de Leysou, onglet Spells : ajouter `Kamehameha`.

Pas confirmé que les trois étapes sont finies, ni ce que le sort fait en jeu.

## Ouvert, ne pas trancher seul

- Formules d'XP, points de stats par niveau, rareté, respawn des boss.
- Gardiennage des collisions de toute l'île.
- Deuxième map, intérieur de la maison, PNJ.
- Version mobile plus tard. Pas maintenant.
- Le dépôt GitHub reste l'ancienne base. Intersect vit dans `D:\intersect`.

## Comment utiliser cette mémoire

Ce fichier est sur GitHub : https://github.com/osagencycompany-code/Dbz/blob/main/MEMOIRE.md

Un projet Grok (grok.com/project) garde les fichiers uploadés et les instructions pour les discussions ouvertes dedans.
Cette discussion-ci ne peut pas écrire dans ce projet. L'utilisateur doit :
1. Ouvrir une nouvelle discussion à l'intérieur du projet.
2. Y mettre ce fichier en source, ou dire « lis MEMOIRE.md sur GitHub ».
3. Instruction du projet : « Avant de répondre, suis MEMOIRE.md. Ne change aucun réglage VERROUILLÉ. Ne devine pas Intersect. »

Le zip du jeu peut être ajouté au projet par l'utilisateur. Ne pas y chercher les réglages Intersect : ils ne sont pas dans le zip Phaser.
