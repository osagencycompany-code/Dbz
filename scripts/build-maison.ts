/** Régénère les sprites « maison » dessinés par code dans assets/maison/ (versionnés, provenance : maison). */
import { crabe, mannequin } from "./assets/dessins.js";
import { ecrirePng } from "./assets/png.js";
import { chemin } from "./lib/fichiers.js";

ecrirePng(chemin("assets/maison/crabe.png"), crabe());
ecrirePng(chemin("assets/maison/mannequin.png"), mannequin());
console.log("assets/maison/crabe.png, assets/maison/mannequin.png");
