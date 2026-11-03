# Données du jeu

Tout ce qui est chiffré ou décrit une entité du jeu vit ici, en JSON, une entité par fichier, nom de fichier égal à l'`id`.

| Dossier | Contenu | Schéma |
| --- | --- | --- |
| `balance/` | formules, progression, combat, monstres, économie | `schemas/balance.schema.json` |
| `characters/` | personnages jouables et modèles | `personnage` |
| `mobs/` | monstres communs et élites | `monstre` |
| `bosses/` | boss et leurs phases | `boss` |
| `npcs/` | PNJ | `pnj` |
| `dialogues/` | dialogues des PNJ | à créer au jalon Contenu |
| `skills/` | techniques | `technique` |
| `transformations/` | transformations | `transformation` |
| `items/` | objets | `objet` |
| `zones/` | zones et leurs maps | `zone` |
| `quests/` | quêtes | `quete` |
| `_modeles/` | modèles vides à copier (ignorés par le jeu) | |

- `statut` : `brouillon` tant que Souleymen n'a pas validé, puis `valide`.
- `a_verifier` : ce qui reste à confirmer (sprite à identifier, valeur à tester).
- Changer une valeur de `balance/` : incrémenter `version` et écrire une décision (voir `docs/regles-de-coherence.md`).
