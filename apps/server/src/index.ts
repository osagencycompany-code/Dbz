import { creerApplication } from "./app.js";
import { lireConfig } from "./config.js";
import { ouvrirBase } from "./db/connexion.js";

const config = lireConfig();
const db = ouvrirBase(config.cheminBase);
const app = creerApplication(db, config);
const port = await app.ecouter();
console.log(`Serveur DBZ prêt sur http://localhost:${port} (commandes admin : ${config.commandesAdmin ? "on" : "off"})`);
