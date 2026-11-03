# 0015 – Bêta fermée avec clé d'invitation

- **Statut** : acceptée
- **Date** : 2026-11-03

## Décision

L'inscription exige une **clé d'invitation** à usage unique, générée par un script côté serveur (`npm run invite:create`). Sans clé valide, pas de compte. La clé est consommée à l'inscription et liée au compte.

## Pourquoi

La bêta est réservée à 10 à 20 testeurs choisis ; le jeu utilise des graphismes dont les droits ne sont pas acquis (décision 0005) et ne doit pas être ouvert au public.

## Alternatives écartées

Inscription ouverte (trop exposé) ; liste blanche d'e-mails (plus lourde, oblige à connaître l'e-mail à l'avance).

## Conséquences

Table `invitations` et script `invite:create` au jalon qui construit les comptes ; champ de clé dans l'écran d'inscription. Spécification §10 complétée.
