# Analyse des références

Synthèse des documents de référence fournis par Souleymen : scripts de Legacy of Goku 1 et 2 et de Buu's Fury, guide de Buu's Fury, liste des équipements de Buu's Fury, plans des zones de Buu's Fury, captures de l'interface de DBZ Online. Les originaux sont dans `docs/reference/externes/` : on les consulte pour vérifier un détail, mais c'est ce document qui sert de base de travail.

**Règle** : on s'inspire des mécaniques, de la structure et du ton ; on ne recopie jamais un dialogue, une description d'objet ou un nom inventé par ces jeux (Totenhotep, Vinnie, Dr. Challenger, « Eyes of the Lion »…). Les noms canon de Dragon Ball suivent `docs/lore/glossaire.md`.

## 1. Interface de DBZ Online (référence visuelle prioritaire)

Les captures montrent le modèle que Souleymen veut retrouver :

- **Fenêtre Personnage**, 3 onglets (Principal, Compétences, Évolution). Principal : portrait encadré avec étoiles de rareté, nom, niveau « 1/100 », barre d'XP, 4 caractéristiques avec icône de couleur et bouton « + » (Vitalité, Force, Puissance, Agilité), ligne « Points », 4 emplacements d'équipement.
- **Onglet Évolution** : « Évolution suivante » avec rareté (1 → 2 étoiles), plafond de niveau (1/100 → 1/150), bonus (positifs en vert, négatifs en rouge), objets requis avec compteur (« ?/5 »), bouton « Évoluer ».
- **Inventaire** : 32 cases, compteur « Slot 6/32 », infobulle détaillée : nom, emplacement (« Pieds »), bonus, **bonus d'ensemble** gradués (« Tenue Saiyan (2) +10 Vitalité, (3) +15 Force, (4) +20 Puissance »), description, « Race requise ».
- **Personnages disponibles** : grille de cartes de personnages canon (Goku, Piccolo, Vegeta, Krilin) avec niveau.
- **Carte du monde** : carte illustrée d'un continent avec lieux cliquables.
- Style : fenêtres crème à bordure brune, barre de titre bleue, boutons orange. Plus clair que les fenêtres sombres des prototypes.

### Point à trancher par Souleymen

DBZ Online fait jouer des **personnages canon** que l'on collectionne, fait monter et fait évoluer, comme Buu's Fury où l'on change de personnage aux cercles de sauvegarde. Le cahier des charges prévoit au contraire un **guerrier original** recoloré (décision 0006). Les deux modèles ne sont pas compatibles ; voir la recommandation en section 8.

## 2. Progression et statistiques (Buu's Fury)

- 3 points par niveau sur 3 stats (Puissance, Force, Endurance) ; la Vitesse ne vient que de l'équipement. Un objet rare (« chapeau ») donne 1 point de plus par niveau tant qu'on le porte.
- Validation des points définitive (comme chez nous).
- **Capsules de stats** trouvées dans le monde : +1 ou +3 permanent dans une stat. Récompense d'exploration qui ne casse pas l'équilibre.
- **Portes de niveau colorées** : une porte affiche un niveau et une couleur ; seul le personnage de cette couleur, à ce niveau, peut la briser. Elles bloquent des zones secrètes, des raccourcis et des coffres, et donnent une raison de revenir dans une zone.
- Les techniques montent de niveau (Kamehameha niv. 1 à 3 : plus large, plus fort, change de couleur) en même temps que le personnage.
- Transformation : jauge triangulaire jaune qui se remplit en combattant ; le Super Saiyan dure tant que sa barre d'énergie dédiée n'est pas vide. Notre version (niveau + ki) a été choisie ; garder seulement l'idée d'une **barre dédiée visible**.

## 3. Combat (Buu's Fury)

- Coup chargé en maintenant la touche d'attaque, enseigné par Tortue Géniale (coup tournoyant, coup de pied puissant, frappe à deux mains).
- Garde qui consomme de l'énergie (comme chez nous).
- Téléportation instantanée : on vise une ou plusieurs cibles (plus à haut niveau), on frappe et on revient à sa place ; sert aussi à récupérer un coffre hors d'atteinte.
- Masenko : un curseur se déplace et on relâche pour viser.
- Kamehameha bloqué par le premier ennemi touché ; le nôtre traverse : garder le nôtre.

## 4. Équipement (Buu's Fury et DBZ Online)

À adapter à nos 5 emplacements (tête, torse, gants, bottes, accessoire) et à nos objets.

- Chaque objet a un **niveau requis** et des bonus parfois négatifs (armure lourde : Endurance + mais Vitesse −).
- **Effets spéciaux** plutôt que de simples chiffres : soin en frappant, régénération du ki en frappant, garde moins coûteuse, transformation plus longue, techniques moins chères, plus fort quand la vie est basse, meilleure pêche.
- **Lestés** (bracelets et bottes de 1 tonne à 1 kilotonne) : vitesse − contre XP + ; déjà dans notre cahier.
- **Ensembles** (tenue Saiyan : bonus si 2, 3, 4 pièces), **objets réservés à une race**.
- **Faux objets** pour l'humour (armure en « or des fous », gants contrefaits) : à petite dose.
- **Vêtements sales** trouvés, à faire laver (chez Madame Brief) pour obtenir la version propre, plus forte. Mini-quête répétable.
- **Accessoires** de confort (baguettes, paille qui rendent la nourriture plus efficace).

## 5. Monde et level design (plans de Buu's Fury)

- Chaque zone est un réseau d'écrans reliés, avec un **cercle de sauvegarde** à l'entrée et près du boss, et un **point de voyage** vers la carte du monde.
- Les éléments importants sont signalés sur les plans : boss, Dragon Ball, coffres de collection, portes de niveau par couleur, « exposants » (objets de collection).
- Zones annexes optionnelles riches en secrets (Château de Pilaf, Repaire des voleurs, Forêt Fukurou, Pyramide de Kyodai) : chacune a un thème, un boss et une petite histoire.
- La **carte du monde** se parcourt en volant ; véhicules ennemis (dirigeables, sous-marins) sur la carte, avec combats et coffres.

## 6. Narration et ton (scripts)

- Chapitres courts, chacun avec un objectif clair affiché au **journal** (« Va voir Bulma à West City »).
- Le narrateur enseigne une mécanique au moment où on en a besoin (sauvegarde, course, scouter, porte de niveau), jamais tout au début.
- Ton : humour léger des PNJ secondaires (citadins, gardes, scientifiques) qui contraste avec la gravité des moments canon. Beaucoup de petites quêtes de quartier (enfant perdu, journal à livrer, objet à récupérer) avant les grands combats.
- Les PNJ disent quelque chose de différent à chaque visite, et changent de réplique après une quête.
- Le scouter scanne ennemis et PNJ et remplit une **encyclopédie** consultable.
- Collections : capsules dorées à retrouver (récompense : objet de voyage rapide), « exposants » dans un musée.

## 7. Ce qu'on adopte, ce qu'on adapte, ce qu'on écarte

| Élément | Décision proposée |
| --- | --- |
| Portes de niveau | Adopter, avec la race ou la transformation à la place de la couleur de personnage |
| Capsules de stats cachées | Adopter (+1 point, rares, une fois par compte) |
| Techniques à niveaux (1 à 3) | Adopter |
| Coups chargés appris chez Tortue Géniale | Adopter (quête de maître) |
| Effets spéciaux d'équipement, lestés, ensembles, objets de race | Adopter |
| Vêtements sales à faire laver | Adopter (petite quête, ton léger) |
| Encyclopédie du scouter | Adopter (phase 2) |
| Journal de quêtes et tutoriel au fil de l'eau | Adopter dès la bêta |
| Collections (capsules dorées, exposants) | Adopter plus tard |
| Jauge de rage pour la transformation | Écarter (décision 0004) |
| Kamehameha bloqué par le premier ennemi | Écarter (le nôtre traverse) |
| Textes, noms inventés, objets nommés de ces jeux | Écarter (inspiration seulement) |

## 8. Recommandation sur le modèle de personnage

Les planches de Buu's Fury (24 personnages jouables, toutes animations comprises) et le modèle de DBZ Online vont dans le même sens : **faire jouer et collectionner des personnages canon** (Goku, Gohan, Vegeta, Trunks, Piccolo…), chacun avec son niveau, ses stats et son évolution, et changer de personnage aux points de sauvegarde.

C'est cohérent avec les assets (aucun sprite à dessiner), avec le jeu que Souleymen connaît et avec l'interface qu'il veut. Le prix : la narration « guerrier original » du cahier devient « on joue les héros », et deux joueurs peuvent jouer le même personnage en même temps.

À décider par Souleymen avant de construire la création de personnage et l'interface Personnages disponibles. Si ce modèle est retenu, il remplace la décision 0006.
