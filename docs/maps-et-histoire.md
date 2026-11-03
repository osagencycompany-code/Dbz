# Maps et histoire

Les 21 planches de maps sont celles de Buu's Fury (`graphics/maps/` dans les fichiers de l'utilisateur). Elles couvrent surtout l'arc Buu et la Terre ; Namek et l'arc Cell n'y figurent pas et seront construits avec les tilesets DBZ Online.

## Correspondance

| Planche | Zone du jeu | Arc | Niveaux | Rôle | Bêta 0 |
| --- | --- | --- | --- | --- | --- |
| Roshi's Island | Île de Roshi, Kame House | Saiyan | 1 à 5 | Tutoriel | Oui, prête |
| Southwest Forest | Mont Paozu (maison de Goku, forêt, cratère) | Saiyan | 4 à 14 | Arrivée de Raditz au cratère | Oui, à traiter |
| West City | West City, Capsule Corp | Hub | 8 et + | Boutiques, Bulma | Oui, à traiter |
| Diablo Desert | Désert du Diable | Saiyan | 14 à 25 | Saibamen, Nappa | Oui, à traiter (planche en grille) |
| Pilaf's Castle | Château de Pilaf | Saiyan (annexe) | 10 à 20 | Donjon secondaire | Non |
| Thieves Den | Repaire des voleurs | Saiyan (annexe) | 12 à 22 | Donjon secondaire | Non |
| Fukurou Forest | Forêt Fukurou (passerelles dans les arbres géants) | Saiyan (annexe) | 18 à 28 | Donjon | Non |
| Check-In Station | Palais d'Enma, départ de la Route du Serpent | Saiyan | 25 à 35 | Mort de Goku, voyage chez Kaio | Non |
| Grand Kai's Planet | Planète du Grand Kaio | Saiyan puis Buu | 28 à 35 | Entraînement Kaio (Kaioken, Genkidama) | Non |
| (à construire) | Namek | Namek | 32 à 55 | Tilesets DBZ Online 9 et 10 (maisons Namek) | Non |
| Kyodai Pyramid, Volcano | Montagnes, laboratoire caché | Androïdes et Cell | 50 à 66 | Zones de transition | Non |
| (à construire) | Ginger Town, arène des Cell Games | Cell | 60 à 75 | Tilesets DBZ Online | Non |
| Papaya Island | Île Papaye, Tenkaichi Budokai | Buu | 70 à 75 | Tournoi | Non |
| Hercule City _ Satan City | Satan City | Buu | 70 à 85 | Hub de fin de jeu | Non |
| East District 439, Nataday Village | Quartier Est 439, village Nataday | Buu | 72 à 85 | Zones de quêtes | Non |
| Babidi's Ship | Vaisseau de Babidi | Buu | 72 à 88 | Donjon par étages | Non |
| Kami's Lookout | Palais de Dieu, Salle de l'Esprit et du Temps | Toute | 20 et + | Entraînement solo | Non |
| Planet of the Kais | Planète des Kaioshin | Buu | 80 à 90 | Épée Z, potentiel libéré | Non |
| Buu's Stomach | Intérieur de Buu | Buu | 85 à 95 | Donjon de groupe | Non |
| HFIL | Enfer | Fin de jeu | 90 et + | Événements, Janemba plus tard | Non |
| Airplane 576 | Avion détourné | Événement | variable | Événement ponctuel | Non |

## État de préparation

- **Roshi's Island** : découpée en 3 maps (`maps/ile-de-roshi/`), collisions automatiques (eau) + maison et palmiers ajoutés à la main, objets placés (départ, porte, escaliers, Roshi, Krilin, Tortue, ponton, zone d'entraînement). Positions approximatives : à vérifier dans Tiled.
- **Mont Paozu** (3 maps), **West City** (3 maps), **Désert du Diable** (2 maps) : générées par `tools/build_maps.py`, collisions et objets placés à l'estime par `tools/remplir_maps.py` d'après les aperçus. Positions à vérifier dans Tiled. Aperçus : `python tools/apercu_maps.py` → `assets/build/maps/`.
- Les autres planches : à traiter avec `tools/extract_map_regions.py` quand elles serviront.

## Planches « en grille »

Diablo Desert, Southwest Forest et Fukurou Forest sont composées d'écrans séparés par des lignes de 1 px couleur de fond (pour Diablo Desert : colonnes 996 et 1479, lignes vers 834, 1157 et 1480 ; écrans d'environ 482 × 322 px). Avant l'extraction :

1. repérer les lignes de séparation (lignes ou colonnes entièrement couleur de fond entre deux écrans) ;
2. les supprimer et recoller les écrans ;
3. vérifier visuellement le raccord (pas de décalage, pas de doublon) en générant un aperçu ;
4. écarter les éléments annexes de la planche (crédits, décor de train de Diablo Desert à traiter comme une map séparée).

## Calques et collisions

L'outil pré-remplit les collisions sur l'eau, le noir et le fond de planche. Bâtiments, arbres, falaises et rochers doivent être ajoutés dans le calque `collisions` (pinceau rouge, cases de 16 px). Pour les éléments que le joueur doit pouvoir longer par derrière (toits, cimes d'arbres), prévoir un calque image `dessus` découpé dans la map et affiché au-dessus des personnages.
