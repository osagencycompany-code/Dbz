import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createServer, type Server as ServeurHttp } from "node:http";
import { routesAuth } from "./auth/routes.js";
import { racine, type Config } from "./config.js";
import type { Base } from "./db/connexion.js";
import { SalleMap } from "./rooms/SalleMap.js";

/** Une salle par map, d'après data/zones/*.json (les identifiants sont les chemins sous maps/, sans « .tmj »). */
export function mapsDesZones(): string[] {
  const dossier = join(racine, "data", "zones");
  return readdirSync(dossier)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => (JSON.parse(readFileSync(join(dossier, f), "utf8")) as { maps: string[] }).maps)
    .map((m) => m.replace(/^maps\//, "").replace(/\.tmj$/, ""));
}

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
  for (const map of mapsDesZones()) jeu.define(nomSalle(map), SalleMap, { map, db, secret: config.secret });

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
