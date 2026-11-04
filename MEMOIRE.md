# MEMOIRE

Fichier à relire avant de répondre sur ce projet.
Ne pas changer un chiffre marqué VERROUILLÉ sans que l'utilisateur l'ait changé lui-même dans l'éditeur.
Ne pas inventer un réglage Intersect. Si ce n'est pas écrit ici, le lire dans la doc ou demander ce que l'éditeur affiche.

Dernière mise à jour : 2026-11-04.

## Où on en est

Le moteur custom Phaser + Colyseus de ce dépôt est en pause. La beta se fait dans Intersect, en local, pas dans ce repo.

- Intersect : `0.8.0.582-beta`
- Dossier : `D:\intersect\intersect-win-x64-full-0.8.0-beta.582+build.875178d5a48a372a15340bc4ca9965a56c389e0b`
- `Server` lancé en premier. Fenêtre noire ouverte. Message attendu : Server Started.
- `Client and Editor` : Intersect Client.exe et Intersect Editor.exe
- Si l'éditeur dit que `sqlite3.dll` est utilisé : le client est encore ouvert. Fermer le client, garder le serveur.

Compte de test : Leysou, niveau 1, admin. Touche Insert = menu Administration.

## Map en cours

- Nom : Kame House (la liste admin l'affiche `KameHouse`).
- Image : `exterieur.png`, copiée dans `Client and Editor\resources\tilesets\`.
- Ce n'est pas une planche de tuiles. Intersect la découpe en cases de 32 px. L'île a été posée en bloc.
- Les cases non peintes sont noires. L'eau bleue a été peinte autour.
- Sans attribut Blocked, on marche partout, y compris sur le toit.
- Des `B` (Blocked) ont été peints sur le tour de l'île et une partie de la maison. Le toit n'est pas forcément couvert en entier. Pas encore revalidé après le dernier essai.
- Sauvegarder la map met à jour le client déjà ouvert. Pas besoin de se reloguer pour une case ou un blocage. Confirmé par l'utilisateur.
- Le point d'apparition de classe ne déplace pas un personnage déjà créé. Leysou garde sa position. Un nouveau personnage utilise le spawn de classe. Pour déplacer Leysou : Insert, puis la map dans MapList.
- Un fichier `.tmj` ne s'importe pas dans Intersect. Les collisions Tiled ne se transfèrent pas.

## Sort en cours — VERROUILLÉ

Ne pas changer ces valeurs.

1. Projectile Editor, pas Spell Editor.
   - Nom : `Kamehameha Beam`
   - Speed (ms) : 400
   - Range : 6
   - Quantity : 1
   - Une flèche verte vers le haut dans la grille des spawns
   - Speed peut aller jusqu'à 500 dans le Projectile Editor. Ce n'est pas le Spell Editor.
2. Spell Editor.
   - Nom : `Kamehameha`
   - Type : Combat Spell
   - Il n'existe pas de type Projectile ni Damage.
   - Types réels : Combat Spell, Warp to Map, Warp to Target, Dash, Event.
   - Targeting Info, Target Type : Linear (projectile)
   - Projectile lié : `Kamehameha Beam`
   - HP Damage : 50
3. Class Editor, classe de Leysou, onglet Spells : ajouter `Kamehameha`.

Pas encore confirmé que ces trois étapes sont terminées ni ce que fait le sort en jeu.

## Règles pour l'assistant

- Relire ce fichier avant de proposer un réglage.
- Un chiffre déjà choisi reste choisi.
- Si l'éditeur contredit ce fichier, l'éditeur gagne, puis on met ce fichier à jour.
- Ne pas réouvrir le moteur Phaser pour la beta.
- But : une beta privée pour jouer avec des proches. Pas un jeu commercial.
- Première map de l'histoire : l'île de Kame House.

## À faire ensuite

1. Finir le projectile, le sort et l'ajout à la classe avec les valeurs verrouillées.
2. Tester le sort en jeu et noter exactement ce qui se passe.
3. Finir les Blocked du toit si on peut encore marcher dessus.
