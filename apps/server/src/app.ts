import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import { createServer, type Server as ServeurHttp } from "node:http";
import { routesAuth } from "./auth/routes.js";
import type { Config } from "./config.js";
import type { Base } from "./db/connexion.js";
import { SalleMap } from "./rooms/SalleMap.js";

/** Maps ouvertes comme salles (les identifiants viennent des fichiers de maps/). */
export const MAPS_INITIALES = ["ile-de-roshi/exterieur", "ile-de-roshi/kame-house-rdc", "ile-de-roshi/kame-house-etage"];

/** Le matchmaking place le nom de salle dans l'URL : pas de « / ». */
export const nomSalle = (map: string) => map.replaceAll("/", "-");

export interface Application {
  http: ServeurHttp;
  jeu: Server;
  ecouter(port?: number): Promise<number>;
  arreter(): Promise<void>;
}

export function creerApplication(db: Base, config: Config): Application {
  const app = express();
  app.disable("x-powered-by");
  app.get("/api/sante", (_req, res) => res.json({ ok: true }));
  app.use("/api", routesAuth(db, config.secret, config.essaisParMinute));

  const http = createServer(app);
  const jeu = new Server({ transport: new WebSocketTransport({ server: http }) });
  for (const map of MAPS_INITIALES) jeu.define(nomSalle(map), SalleMap, { map, db, secret: config.secret });

  return {
    http,
    jeu,
    async ecouter(port = config.port) {
      await jeu.listen(port);
      const adresse = http.address();
      return typeof adresse === "object" && adresse ? adresse.port : port;
    },
    async arreter() {
      await jeu.gracefullyShutdown(false);
    },
  };
}
