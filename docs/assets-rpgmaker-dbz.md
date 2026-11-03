# Projet RPG Maker (fan) – inventaire

Originaux dans `assets/raw/rpgmaker-dbz/dbz_clean2/` (241 fichiers, 17 Mo), jamais modifiés. Projet de fan sous RPG Maker MV : 72 cartes, 11 acteurs. Références : `docs/reference/` (on ne reprend ni noms, ni dialogues, ni mécaniques inventés par ce projet).

## Auteurs crédités dans les noms de fichiers

Un seul : **Benjiro**, dans `tilesets/Tile_DBZ_WestCity_by_Benjiro.png`. Les autres noms n'indiquent aucun auteur. Les suffixes comme `(f3)(y16)(s1)` sont des réglages de l'extension d'armes de RPG Maker, pas des crédits. **À faire avant toute publication** : créditer Benjiro et retrouver les auteurs du reste du projet (page de téléchargement, fichiers texte absents du dossier).

## characters/ (69 fichiers)

Format RPG Maker « personnage unique » (préfixe `$`) : 3 colonnes × 4 lignes (bas, gauche, droite, haut), cases de **60 px** (180×240), 48 px pour les `damage` de Goku et Piccolo. Colonnes : pas gauche, immobile, pas droit. Le personnage mesure environ **28 à 30 px de haut** dans sa case : l'échelle est la même que nos sprites de 32 px.

| Personnage | Variantes présentes |
| --- | --- |
| Krilin | marche, repos (`idle`), course (`dash`), attaque, technique (`casting`), dégâts, action, ramasser, épée, vol (5 fichiers) |
| Yamcha | idem, plus vol (6 fichiers) |
| Tenshinhan (Tien) | marche, repos, course, technique, dégâts, action, épée |
| Piccolo | marche, repos, course, technique, dégâts, animation spéciale, ombre |
| Goku | marche, repos, course, technique, dégâts (48 px), action, ramasser, arc, ombre, épée (100 px), vol (5 fichiers) |
| Gohan enfant (avec chapeau) | marche, repos, course, ramasser, version « heureuse » |
| Chichi | marche (`Chichi_Walking`), inquiète (`ChichiWorried`) ; **la ligne « droite » est vide** (on retourne la gauche) |
| Divers | `DragonBalls` (180×240), `E_Shenron(f1)` (535×1748, grand dragon animé) |

Les fichiers d'armes (`swd01`, `bow01`, `shd01`) sont des surimpressions de 100 px : ignorés.

### Convertisseur

`tools/convertir_rpgmaker.py` réduit chaque case de 60 px à **32 px par recadrage** (centré, pieds en bas, sans mise à l'échelle) et assemble un bloc de 3 colonnes par fichier source, avec les lignes face / profil / dos (la gauche est le profil retourné). Il écrit `assets/pnj/<id>/<id>.png` et `.anims.json` au format d'animations des héros : `marche` (colonnes 1,0,1,2), `repos`, `course`, `attaque`, `technique`, `degats`, `action`, `ramasser`. Résultat dans la section 7 de `assets/build/apercu-heros.html` : Krilin, Chichi (deux versions), Yamcha, Tenshinhan, Piccolo, Gohan enfant, et les versions en vol.

Limites : la course fait sautiller le personnage et le recadrage de 32 px le coupe en haut (Tenshinhan surtout) ; les versions « vol » montrent le personnage replié, ce qui paraît étrange de face. **Les fiches de PNJ (`data/npcs/krilin.json`, `chichi.json`) n'ont pas été changées** : le client affiche encore une seule image par PNJ. Elles passeront aux planches animées quand le client saura les dessiner.

Priorité demandée : Krilin et Chichi comme PNJ animés de la bêta (prêts) ; Krilin, Tenshinhan et Yamcha jouables plus tard (marche, course, coups, technique, dégâts, vol présents ; il manque la mort et la transformation).

## pictures/ (78 fichiers) et hud/ (11 fichiers)

- `pictures/` : **bustes de dialogue** 489×474 avec plusieurs expressions par personnage (Goku ×14, Krilin ×9, Piccolo ×9, Yamcha ×7, Gohan ×6, Chichi ×4, Tien ×5, Chaozu ×4, Bulma ×3, Maître Kaio ×3, Tortue Géniale ×3, Kami ×2, Tortue, Beerus, Whis, Zarbon, Freezer ×4, Dragon). Intéressants pour les dialogues.
- `hud/` : visages de 120×120 (Goku, Tenshinhan, Krilin, Yamcha, Piccolo) et 3 visages de combat de 64×64.
- **Gohan adolescent et Trunks du futur : introuvables.** Les Gohan sont l'enfant au chapeau rouge. Les portraits provisoires de ces deux héros restent ceux de la fiche.

Utilisation prévue : bustes pour les dialogues, visages de 120×120 pour les cartes de l'écran de création quand un héros jouable en aura (Krilin, Tenshinhan, Yamcha plus tard). Décision d'usage à valider avant de copier quoi que ce soit dans le jeu.

## Shenron et Dragon Balls (plus tard)

`$E_Shenron(f1).png`, `$DragonBalls.png`, `pictures/Dragon.png` : à utiliser pour la scène du vœu, après la bêta.

## tilesets/ et data/

- Cases de **48 px** (grille de RPG Maker MV) pour les grands décors, ce qui fait 3 de nos cases de 16 px : les objets restent alignés sur notre grille sans mise à l'échelle. Les décors sont à l'échelle des personnages (une porte de dôme fait environ 24×30 px, comme un personnage), donc à l'échelle de nos sprites.
- Le style graphique (couleurs, contours) diffère de Buu's Fury : à comparer à nos maps avant de mélanger.
- Fichiers : `CapsuleCorp.png` (le grand dôme en une image 768×768), `DBZCity.png`, `gokuhouse.png` (448×6048, planche longue), `KamiLookOut` ×2 et `KamiLookOutOutside_B`, `Laboratory.png`, `Tile_DBZ_WestCity_by_Benjiro.png` (320×320, de Benjiro).

### Intérieurs et lieux utiles (non convertis)

| Besoin | Carte(s) (n° du projet) | Taille en cases |
| --- | --- | --- |
| Maison de Goku | 4 (extérieur, 100×100), 38 à 41 (intérieurs, 17×13), 42 (scène) | petites pièces |
| Capsule Corp | 53 (extérieur, 30×33), 54, 55, 57 (intérieurs, 100×100), 56 (scène) | grands |
| Maisons de West City | 46 (ville, 100×100), 58, 59, 60 (intérieurs), 62 (parc) | 100×100 |
| Palais de Dieu | 63 (16×18), 64, 68, 71 (scènes) | petit |
| Île de Maître Roshi | 7 (23×17) | petit |
| Grottes | 43, 45, 48, 49 | – |

À ignorer : cartes de démonstration du logiciel (« Tool Map », « Battle Test », « Demonstration », « ABS Mode », « Chrono Mode », « Plugin Commands », cartes `MAP 01` à `MAP 10`, `Stage 1/2`).
