# 0019 – Boîtes de collision, portée des coups, aggro, anti-triche, IA (jalon 4)

- **Statut** : acceptée
- **Date** : 2026-11-03

## Contexte

Le jalon 4 (combat en ligne) a besoin de valeurs que ni la spec ni les formules ne fixaient. Souleymen a validé les quatre premières le 2026-11-03 ; les suivantes sont mes propositions, réglables.

## Décision

Toutes ces valeurs vivent dans `data/balance/monde.json` (schéma `balance-monde`) :

| Valeur | Réglage | Origine |
| --- | --- | --- |
| Boîte de collision du joueur (aux pieds) | 12 × 6 px | validée |
| Boîte de collision d'un monstre | 14 × 6 px | validée |
| Coup : point d'impact devant le joueur / rayon | 18 px / 22 px | validée |
| Aggro communs / élites / boss | 150 / 150 / 210 px (une fiche peut imposer la sienne via `comportement.aggro_px`) | validée |
| Tolérance anti-triche | +10 % de vitesse | validée |
| IA : portée d'attaque 20 px, annonce 0,35 s, recharge 1,2 s, abandon à 2 × l'aggro, alerte de meute 220 px, charge annoncée 0,6 s, bond de 0,3 s, morsure de zone rayon 48 px | voir le fichier | proposée |
| K.O. : retour après 3 s, 2 s d'invulnérabilité | voir le fichier | proposée |

Règles de jeu retenues :

- Les monstres sont partagés : **chaque joueur qui a touché un monstre reçoit l'XP complète** à sa mort (l'XP n'est pas divisée).
- La position d'un personnage est celle de ses pieds ; la boîte de collision est centrée sur les pieds, hauteur vers le haut.
- Anti-triche : le client n'envoie qu'une direction, jamais une position ; le serveur déplace lui-même. La tolérance de +10 % limite la cadence des commandes (réserve de temps plafonnée à 0,25 s).
- Le serveur tourne à 20 Hz (`data/balance/combat.json`, `tic_serveur_hz`).

## Pourquoi

Boîte basse et étroite aux pieds : on passe derrière les arbres et les murs comme dans les jeux de la série ; une portée courte force le corps à corps du prototype 06.

## Alternatives écartées

XP répartie selon les dégâts (décourage la coopération en bêta) ; position envoyée par le client avec vérification a posteriori (triche plus facile).

## Conséquences

`schemas/balance-monde.schema.json` généré ; tout réglage se fait dans `data/balance/monde.json` ; le jalon 5 pourra affiner portée et recul sans toucher au code.
