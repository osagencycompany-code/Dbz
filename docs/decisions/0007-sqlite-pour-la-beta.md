# 0007 – SQLite pour la bêta

- **Statut** : acceptée
- **Date** : 2026-11-03

## Décision

Base SQLite via Drizzle ORM pendant la bêta, migration vers PostgreSQL ensuite.

## Pourquoi

Aucune installation de serveur de base de données, sauvegarde par simple copie de fichier, largement suffisant pour 20 testeurs.

## Alternatives écartées

PostgreSQL dès le départ (plus de configuration pour rien à ce stade).
