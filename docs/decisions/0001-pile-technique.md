# 0001 – Pile technique

- **Statut** : acceptée
- **Date** : 2026-11-03

## Décision

Phaser 3 + TypeScript côté client, Node.js + Colyseus côté serveur, monorepo npm.

## Pourquoi

Jeu dans le navigateur sans installation ; Colyseus gère les salles et la synchronisation ; un seul langage partout, formules partagées entre client et serveur.

## Alternatives écartées

Godot (pas de navigateur natif aussi simple), Unity (lourd pour de la 2D pixel).
