# Démarrer DBZ MY GAME

## 1. Préparer le dossier (5 min)

1. Dézippe ce kit où tu veux, par exemple `C:\dev\dbz-my-game`.
2. Copie tout ton dossier `graphics` (celui de `01_DBZ_Online_9.0.3_Graphics/DBZ_Online_9.0.3/graphics`, avec les dossiers DBZ Online ET Buu's Fury) dans `assets/raw/`. Tu dois obtenir `assets/raw/graphics/characters`, `assets/raw/graphics/maps`, etc.
3. Ouvre `docs/reference/prototype-06.html` dans ton navigateur pour vérifier que c'est bien la version que tu as validée.

## 2. Créer le dépôt GitHub (5 min)

1. Sur github.com : New repository → nom `dbz-my-game` → **Private** → Create (sans README).
2. Dans un terminal ouvert dans le dossier du projet :

```
git init
git add .
git commit -m "Kit de démarrage"
git branch -M main
git remote add origin https://github.com/TON-PSEUDO/dbz-my-game.git
git push -u origin main
```

Le dépôt doit rester privé : il contient des graphismes dont tu n'as pas les droits de diffusion.

## 3. Lancer Claude Code

Dans le même terminal :

```
claude
```

Copie tout le contenu de `PROMPT_BETA0.md` et colle-le comme premier message. Claude Code va tout lire, te présenter son plan et attendre ton accord avant de coder.

## 4. Pendant le développement

- À chaque jalon, il te dit quoi tester : lance la commande indiquée, joue, et réponds avec tes remarques (captures d'écran bienvenues).
- Pour les maps, il génère des aperçus. Si une collision est fausse, ouvre le fichier `.tmj` dans Tiled, corrige le calque `collisions` au pinceau, enregistre.
- Si quelque chose bloque ou te semble bizarre, reviens me voir ici avec le message d'erreur ou la capture.
