# 0010 – Résolution interne 480 × 270

- **Statut** : acceptée
- **Date** : 2026-11-03

## Contexte

La spécification et la direction artistique prévoyaient 384 × 216 (×5 en 1920 × 1080). Ce cadre montre peu de décor autour du joueur, surtout avec des sprites de 32 px et une interface en 8 px.

## Décision

Résolution interne **480 × 270**, mise à l'échelle par un entier : ×4 en 1920 × 1080, ×2 en 960 × 540, ×8 en 3840 × 2160. Sur un écran qui n'est pas un multiple exact, le jeu choisit le plus grand entier qui tient et affiche des bandes noires.

## Pourquoi

- 480 × 270 est le format 16 : 9 qui divise exactement 1920 × 1080 (×4) et 3840 × 2160 (×8).
- Le champ de vision passe de 24 × 13,5 à 30 × 16,9 cases de 16 px (+ 56 % de surface visible) : on voit arriver les monstres et les annonces de boss.
- Les sprites gardent leur taille ; seule la zone visible grandit.

## Alternatives écartées

- 384 × 216 : trop étroit pour les combats de boss avec plusieurs joueurs.
- 640 × 360 : ×3 en 1080p, les personnages deviendraient petits et le rendu perdrait l'allure Game Boy Advance.

## Conséquences

`docs/beta0-spec.md` §2 et `docs/direction-artistique.md` (section Image) corrigés. `docs/reference/prototype-06.html` n'est pas modifié : il reste la référence du ressenti, pas du cadrage. Aucun fichier de `data/` touché.
