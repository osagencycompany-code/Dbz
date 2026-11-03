import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import { createServer, type Server as ServeurHttp } from "node:http";
import { routesAuth } from "./auth/routes.js";
import type { Config } from "./config.js";
import type { Base } from "./db/connexion.js";
import { Donnees } from "./donnees.js";
import { SalleMap, type SessionsActives } from "./rooms/SalleMap.js";
import { mapsDesZones, nomSalle } from "./salles.js";

export { mapsDesZones, nomSalle };

export interface Application {
  http: ServeurHttp;
  jeu: Server;
  donnees: Donnees;
  ecouter(port?: number): Promise<number>;
  arreter(): Promise<void>;
}

export function creerApplication(db: Base, config: Config): Application {
  const app = express();
  app.disable("x-powered-by");
  app.get("/api/sante", (_req, res) => res.json({ ok: true }));
  const donnees = new Donnees();
  app.use("/api", routesAuth(db, config.secret, config.essaisParMinute, donnees));

  if (!config.production) donnees.surveiller();
  const sessions: SessionsActives = new Map();
  const http = createServer(app);
  const jeu = new Server({ transport: new WebSocketTransport({ server: http }) });
  for (const map of mapsDesZones()) jeu.define(nomSalle(map), SalleMap, { map, db, secret: config.secret, donnees, sessions, commandesAdmin: config.commandesAdmin });

  return {
    http,
    jeu,
    donnees,
    async ecouter(port = config.port) {
      await jeu.listen(port);
      const adresse = http.address();
      return typeof adresse === "object" && adresse ? adresse.port : port;
    },
    async arreter() {
      donnees.arreter();
      await jeu.gracefullyShutdown(false);
    },
  };
}
