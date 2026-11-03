# Bêta 0 – Spécification

> Les chiffres de ce document sont les valeurs de départ. La référence est `data/` : en cas d'écart, `data/` fait foi.

Objectif : une version en ligne jouable par 10 à 20 testeurs, qui couvre le début de l'arc Saiyan, de Kame House jusqu'au combat contre Nappa, niveaux 1 à 25.

## 1. Périmètre

**Inclus** : comptes, création de personnage, 4 zones (12 maps, détail au jalon Maps), combat complet du prototype 06, stats à points, techniques, Super Saiyan au niveau 20, 11 quêtes, monstres et 2 boss, inventaire et équipement simples (5 emplacements), boutique, zénies, chat de zone, sauvegarde, commandes d'administration, déploiement sur un serveur.

**Exclus (plus tard)** : groupes, clans, échanges, PvP, Dragon Balls, races autres que Saiyan, arcs suivants, mobile.

## 2. Écran et contrôles

- Résolution interne 480 × 270 (décision 0010), mise à l'échelle entière (×4 en 1920 × 1080), caméra qui suit le joueur, bornée à la map.
- Contrôles (identiques au prototype 06, tous reconfigurables plus tard) :

| Action | Touche |
| --- | --- |
| Se déplacer | Flèches |
| Courir | Maj maintenu |
| Coup de poing (combo de 3) | Ctrl ou Z (décision 0017) |
| Boule de ki | X |
| Kamehameha (charger, relâcher) | V |
| Charger le ki | C maintenu |
| Garde (contre si lancée juste avant le coup) | B maintenu |
| Esquive par téléportation | F |
| Haricot magique | H |
| Super Saiyan | G |
| Voler / atterrir | Espace |
| Fenêtre Personnage | P |
| Inventaire | I |
| Carte du monde | M (hors combat, seulement depuis un point de voyage) |
| Son | Bouton cliquable à l'écran, toujours visible |
| Parler / interagir | E |
| Chat | Entrée |

Les touches capturées par le jeu appellent `preventDefault` pour neutraliser les raccourcis du navigateur (Ctrl+B, Ctrl+F…).

## 3. Formules (à coder dans `packages/shared/src/formulas.ts`, avec tests)

```
B(L)      = 1,045^(L-1)
pts(L)    = 25 + 5 × (L-1)              // points gagnés au niveau L, dépensés ou non
r(stat)   = stat / pts(L)
M(r)      = 1 + 2 × r^0,8
PV max    = 120 × B(L) × M(r Vitalité)    × 1,2 si Super Saiyan
Mêlée     = 12  × B(L) × M(r Force)        × 1,2 si Super Saiyan
Ki (dégâts)= 14 × B(L) × M(r Puissance)    × 1,2 si Super Saiyan
Ki max    = 100 × M(r Énergie)
Esquive % = min(30, 30 × r Agilité^0,7)
Vitesse   = 100 × (1 + 0,5 × r Agilité^0,7) px/s ; course ×1,5 ; vol ×1,5 ; SSJ ×1,25
XP requise pour passer du niveau L à L+1 = 100 × L^1,87
XP d'un monstre de niveau L = 9 × L^1,25 (élite ×5, boss ×30)
Niveau de puissance affiché = 50 × (somme des 5 stats) × (1,2 si SSJ) × B(L)^1,5 × (50 si SSJ)
```

- Les 5 stats démarrent à 5. +5 points par niveau, définitifs (validation explicite dans la fenêtre P).
- Dégâts reçus = attaque × aléa 0,9 à 1,1. Critique 12 % (×1,8).
- Écart de niveau : monstre plus de 5 niveaux en dessous → 10 % de l'XP ; plus de 8 niveaux au-dessus → 50 % des coups du joueur ratent.
- Niveau maximum de la bêta : 25.

## 4. Combat

Reprendre exactement le prototype 06 (`docs/reference/prototype-06.html`) : gel d'impact, image rémanente, étincelles, projection au 3ᵉ coup, sons générés, cinématique de déblocage du Super Saiyan (le jeu se fige pour ce joueur seulement, il est invulnérable pendant ce temps).

| Élément | Valeur |
| --- | --- |
| Combo | 3 coups, 3ᵉ coup ×1,9 et projection |
| Ki rendu par coup touché | 3 % du ki max |
| Boule de ki | 4 % du ki max, ×1,1 |
| Kamehameha | 25 à 40 % du ki max selon la charge (0,4 à 2 s), ×2,5 à ×6,5, traverse |
| Charge du ki | +30 % du ki max par seconde, immobile |
| Régénération | +2 % du ki max par seconde au sol ; PV +3 %/s après 5 s sans dégâts |
| Vol | 3 % du ki max par seconde, passe au-dessus du décor, atterrissage impossible sur obstacle ou hors map |
| Garde | dégâts ×0,3 (×0,5 après 3 s), 2 % du ki par coup bloqué, garde brisée à 0 ki (étourdi 0,6 s) |
| Contre | garde lancée moins de 130 ms avant le coup : 0 dégât, attaquant repoussé et étourdi 0,5 s |
| Esquive | 15 % du ki max, 2 s de recharge, téléportation jusqu'à 64 px, invulnérable 0,25 s |
| Haricot magique | soin complet PV et ki, 20 s de recharge |
| Super Saiyan | niveau 20 + quête « Le cri de colère », transformation de 1,9 s, 30 % du ki requis, 2 % du ki max par seconde |
| Zenkai | K.O. contre un ennemi de niveau ≥ au sien : +20 % d'XP pendant 1 h, une fois par heure |
| K.O. | réapparition au dernier point de soin avec 50 % des PV, perte de 3 % de l'XP du niveau (jamais de niveau perdu) |

Côté serveur : cadence de 20 mises à jour par seconde, le client prédit ses propres mouvements et interpole les autres joueurs.

## 5. Zones et maps

Détail et état de préparation : `docs/maps-et-histoire.md`. Pour chaque map :

- un fichier Tiled `.tmj` avec les calques `fond` (image), `collisions` (cases de 16 px), `objets` ;
- types d'objets : `spawn`, `portal` (propriétés `map`, `spawn`), `npc` (`sprite`, `dialogue`), `mobzone` (`mob`, `count`, `level`), `travel` (point de voyage vers la carte du monde), `heal` (point de soin), `boss` (`boss`), `rock` (rocher d'entraînement, décision de design D5). Chaque zone déclare dans sa fiche une `arrivee` (map + spawn) utilisée par le voyage.

| Zone | Map | Niveaux | Contenu |
| --- | --- | --- | --- |
| Île de Roshi | Roshi's Island (extérieur + Kame House, 2 intérieurs) : 3 maps | 1 à 5 | Tutoriel, Maître Roshi, Krilin, Tortue, mannequins, crabes |
| Mont Paozu | Southwest Forest : maison de Goku, forêt, cratère (3 maps) | 4 à 14 | Loups, sangliers, tigres bandits, dinosaures (élites), Chi-Chi, Raditz au cratère |
| West City | West City : ville, extérieur de Capsule Corp, maison de Bulma (3 maps) | hub | Bulma à Capsule Corp, boutique, point de soin, PNJ de quêtes |
| Désert du Diable | Diablo Desert : moitié sud (campement, rochers de Nappa) et moitié nord (plateau) (2 maps) | 14 à 25 | Saibamen par vagues, bandits, Nappa |

Carte du monde : fenêtre avec les 4 lieux, verrouillés tant qu'ils n'ont pas été débloqués par la quête correspondante ; voyage gratuit dans la bêta depuis un objet `travel`.

## 6. Monstres

Gabarits (Lm = niveau du monstre, valeurs d'un joueur équilibré à ce niveau) :

| Rang | PV | Attaque | XP |
| --- | --- | --- | --- |
| Commun | 6 × (12 × B(Lm) × 1,552) | 6 % de (120 × B(Lm) × 1,552) | 9 × Lm^1,25 |
| Élite | 25 × | 12 % | ×5 |
| Boss | 60 × | 15 % | ×30 |

Respawn : communs 45 à 90 s, élites 4 min, boss 12 min (Raditz) et 15 min (Nappa).

Sprites (DBZ Online, `characters/<n>.png`, 4 directions × 1 image, vérifier visuellement avant de valider) :

| Monstre | Sprite | Zone | Niveau | Comportement |
| --- | --- | --- | --- | --- |
| Mannequin | à générer (souche `resources/5.png` ou carré de paille) | Île | 1 | Immobile, ne meurt pas, compte les coups |
| Crabe | à choisir parmi les sprites existants, sinon reporté | Île | 2 à 4 | Commun |
| Loup | 45 | Mont Paozu | 4 à 8 | Commun, attaque en meute |
| Sanglier | 72 | Mont Paozu | 5 à 9 | Commun, charge en ligne droite |
| Tigre bandit | 40 | Mont Paozu | 8 à 12 | Commun |
| Dinosaure | 65 (64 × 256) | Mont Paozu | 12 | Élite, morsure de zone annoncée |
| Saibaman | 13 | Désert | 14 à 22 | Commun, bond sur la cible (prototype) |
| Bandit du désert | 41 ou 42 | Désert | 16 à 24 | Commun |

## 7. Boss

**Raditz** (niveau 12, sprite DBZ Online `characters/12.png`, au cratère du Mont Paozu) :

1. 100 à 60 % : combo de 3 coups, boule de ki toutes les 3 s.
2. 60 à 25 % : « Double Sunday », deux rayons en V annoncés 0,8 s avant par ses mains qui brillent ; il fonce sur le joueur le plus éloigné.
3. Moins de 25 % : aura rouge, vitesse +30 % (pas de Saibamen : ils arrivent avec Nappa, décision 0013).

**Nappa** (niveau 25, `characters/14.png`, Désert du Diable) :

1. 100 à 50 % : coups lourds lents (annoncés), charge épaule en ligne droite.
2. 50 à 20 % : explosion au sol sous un joueur (cercle rouge 1 s avant), vagues de 3 Saibamen.
3. Moins de 20 % : « Bakuhatsuha », grande explosion autour de lui annoncée 1,5 s avant : il faut s'éloigner ou s'envoler.

Boss partagés dans la salle de la map ; PV ajustés au nombre de participants (décision 0014). Barre de boss en haut de l'écran pour tous les joueurs proches. Tous les joueurs ayant infligé au moins 5 % des dégâts reçoivent l'XP et un tirage de butin individuel.

## 8. Quêtes

| # | Nom | Niveau | Donneur | Objectif | Récompense |
| --- | --- | --- | --- | --- | --- |
| 1 | Bienvenue à Kame House | 1 | Maître Roshi | Parler à Roshi, Krilin, la Tortue | 0,5 niveau d'XP |
| 2 | Les bases du combat | 1 | Krilin | 10 coups sur les mannequins, une garde, une esquive, une boule de ki | 0,7 niveau, 2 haricots |
| 3 | Le tour de l'île | 2 | Tortue | Vaincre 6 crabes (ou ramasser 6 coquillages si pas de sprite) | 0,6 niveau, bandeau |
| 4 | Direction le Mont Paozu | 4 | Maître Roshi | Voyager au Mont Paozu, parler à Chi-Chi devant la maison de Goku | 0,5 niveau, débloque la zone |
| 5 | Les loups du Mont Paozu | 5 | Chi-Chi | Vaincre 12 loups | 1 niveau, 300 zénies |
| 6 | Le Kamehameha | 8 | Maître Roshi | Réussir 3 Kamehameha chargés au maximum sur le rocher d'entraînement de l'île de Roshi | Apprend le Kamehameha |
| 7 | Une étoile tombée du ciel | 10 | Chi-Chi | Enquêter au cratère, cinématique d'arrivée, vaincre Raditz | 1,5 niveau, gants de combat |
| 8 | Capsule Corp | 12 | Chichi | Rejoindre West City, parler à Bulma | Débloque la boutique, 500 zénies |
| 9 | Un an pour se préparer | 14 | Bulma | Désert du Diable, salle d'événement personnelle : survivre à 3 vagues de Saibamen | 1,2 niveau, tenue d'entraînement |
| 10 | Le cri de colère | 20 | Krilin | Pendant le combat, Krilin tombe face à Nappa ; tenir 60 s | Débloque le Super Saiyan (cinématique) |
| 11 | Nappa | 22 | Krilin | Vaincre Nappa | 1,5 niveau, armure de combat, écran de fin de bêta |

Récompenses d'XP : « niveau » = fraction de l'XP requise au niveau conseillé (champ `xp_niveaux`, 0,5 à 1,5, décision 0011) ; l'XP des monstres et boss est multipliée par `multiplicateur_global` (3 pour la bêta, décision 0012).
Quêtes 9 et 10 : salle d'événement personnelle (décision 0014). Le désert comporte un campement avec point de soin.

Le Kamehameha n'est utilisable qu'après la quête 6 ; avant, la touche V affiche « Technique non apprise ».

## 9. Objets et économie

- Inventaire de 40 cases, objets empilables (haricots).
- 5 emplacements d'équipement : tête, torse, gants, bottes, accessoire (décision 0016). Les objets ajoutent des points de stats (comptés dans le numérateur de r).
- Objets de la bêta : bandeau (+2 Vitalité), gants de combat (+3 Force), tenue d'entraînement (+2 Vitalité, +2 Agilité), bottes légères (+3 Agilité), armure de combat (+4 Vitalité, +2 Force), anneau de ki (+3 Énergie) ; icônes à prendre dans `items/`.
- Zénies : monstres (Lm × 3 à Lm × 6), quêtes. Boutique Capsule Corp : haricot magique (200, prix +50 % à chaque achat dans la journée, 5 par jour), bottes légères (800), anneau de ki (1 200).

## 10. En ligne

- Comptes : inscription e-mail + pseudo + mot de passe + **clé d'invitation** (bêta fermée, décision 0015), connexion, un personnage par compte.
- Création : pseudo du personnage (unique, filtré), 3 palettes de tenue générées par recoloration de la planche de Goku (orange, bleu, vert) avec le script de palettes.
- Chaque map est une salle Colyseus ; les joueurs se voient, voient les mêmes monstres et les combattent ensemble.
- Chat de zone avec filtre de mots, limite de 1 message par seconde.
- Sauvegarde : toutes les 30 s et à la déconnexion (niveau, XP, stats, points, inventaire, équipement, quêtes, position, map).
- Anti-triche : vitesse de déplacement vérifiée (+10 % de tolérance), recharges et portées vérifiées côté serveur.

## 11. Commandes d'administration (serveur uniquement)

`/niveau <n>`, `/xp <n>`, `/tp <map> [spawn]`, `/boss <raditz|nappa>`, `/invincible`, `/ki`, `/donner <objet> [qté]`, `/soin`, `/zenkai`. Saisies dans le chat, refusées silencieusement (« Commande inconnue ») si le compte n'est pas administrateur ou si `ADMIN_COMMANDS` n'est pas à `on`.

## 12. Mesures

Table `events` : inscription, fin du tutoriel (quête 2), montée de niveau, K.O. (cause), mort et durée des combats de boss, durée des sessions. Un script `npm run stats` affiche la synthèse.

## 13. Déploiement

Dernier jalon : un serveur loué (VPS Linux), Node + PM2, Caddy pour le HTTPS, un nom de domaine ou un sous-domaine, sauvegarde quotidienne du fichier SQLite. Scripts de déploiement écrits par Claude Code ; l'utilisateur n'a qu'à louer le serveur et coller l'adresse et la clé.

## 14. Critères d'acceptation

- [ ] Deux navigateurs se connectent avec deux comptes, se voient bouger et combattent le même monstre.
- [ ] Les 11 quêtes se terminent dans l'ordre, sans blocage, en partant d'un compte neuf.
- [ ] Le ressenti des coups est identique au prototype 06 (validé par l'utilisateur).
- [ ] Le Super Saiyan se débloque au niveau 20 après la quête 10, avec la cinématique.
- [ ] Raditz et Nappa ont leurs 3 phases, annoncées et lisibles.
- [ ] Déconnexion puis reconnexion : tout est restauré.
- [ ] Un compte non administrateur ne peut exécuter aucune commande, même en modifiant le client.
- [ ] Tous les tests passent ; la bêta tourne en ligne sur une adresse HTTPS.

## 15. Jalons proposés

1. Socle : monorepo, outils, base, comptes, une salle vide, déploiement local en une commande.
2. Assets : découpe des planches, palettes, atlas, page d'aperçu des animations.
3. Maps : traitement des 4 zones avec l'outil `tools/extract_map_regions.py`, collisions, objets, vérification par l'utilisateur dans Tiled.
4. Combat en ligne : déplacement, combat, techniques, monstres, IA, XP, niveaux, fenêtre P.
5. Contenu : PNJ, dialogues, quêtes, boss, objets, boutique, carte du monde.
6. Finitions : HUD, sons, cinématiques, chat, sauvegarde, commandes admin, mesures.
7. Mise en ligne et bêta.
