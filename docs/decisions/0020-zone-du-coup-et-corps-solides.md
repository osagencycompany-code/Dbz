# 0020 – Zone du coup devant le joueur, corps solides, commandes d'administration

- **Statut** : acceptée (remplace la décision 0019 sur la portée du coup ; le reste de la 0019 reste valable)
- **Date** : 2026-11-03

## Contexte

Au premier essai, le coup de poing touchait le mannequin à environ 40 px, presque dans toutes les directions. Cause : la 0019 fixait un point d'impact à 18 px devant le joueur et un **rayon de 22 px** autour de ce point, mesurés du centre ; un cercle de 22 px portait jusqu'à 40 px du joueur et couvrait aussi les côtés.

Comparaison avec le prototype 06 : il utilise exactement la même règle (point à 18 px devant le héros, cercle de 22 px), mais sur une scène où les personnages sont plus grands et plus proches. Souleymen veut un coup plus court et strictement dirigé.

## Décision

1. **Le coup touche un rectangle collé au bord du joueur, du côté où il regarde.** Profondeur `coup.portee_px` = **20 px** mesurés depuis le bord du corps ; largeur `coup.largeur_px` = **28 px**, centrée sur le corps. Rien derrière ni sur les côtés au-delà de cette largeur n'est touché. Une cible est touchée si sa boîte de collision recoupe ce rectangle.
2. Valeurs dans `data/balance/monde.json` (clé `coup`) ; `rayon_px` disparaît.
3. **Corps solides** : les monstres vivants (mannequin compris) et les PNJ arrêtent le joueur, qui glisse le long. Les joueurs se traversent entre eux. Un joueur déjà en contact avec un corps (apparition dessus) peut toujours s'en éloigner. Les monstres morts ne sont pas solides. Même règle côté serveur et côté client (prédiction), via `corpsSolides` dans `packages/shared`.
4. **Commandes d'administration** (spec §11) lancées d'abord : `/tp`, `/niveau`, `/xp`, `/soin`, `/invincible`, `/ki` (sans effet tant que le ki n'existe pas), `/boss` (téléporte à l'emplacement du boss). Serveur uniquement, rôle `admin` en base **et** `ADMIN_COMMANDS=on`, chaque tentative est journalisée dans la table `journal_admin` (qui, quoi, quand, autorisée ou non, résultat). Un joueur ordinaire reçoit « Commande inconnue. ». Le client ne connaît aucune commande : il envoie la ligne tapée (touche Entrée).

## Conséquences

Le coup est plus court : environ 20 px entre le bord du joueur et le bord de la cible, soit 26 à 33 px de pied à pied selon la direction. Si c'est encore trop ou trop peu, c'est un seul chiffre à changer dans `monde.json`, rechargé à chaud.
