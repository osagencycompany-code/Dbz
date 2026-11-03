import { Room, ServerError, type Client } from "@colyseus/core";
import { Schema, type } from "@colyseus/schema";
import { eq } from "drizzle-orm";
import { verifierJeton } from "../auth/jeton.js";
import type { Base } from "../db/connexion.js";
import { comptes } from "../db/schema.js";

export class SalleEtat extends Schema {
  @type("string") map = "";
}

export interface OptionsSalle {
  map: string;
  db: Base;
  secret: string;
}

/** Une salle par map. Jalon 1 : salle vide, seulement l'authentification et la présence. */
export class SalleMap extends Room<SalleEtat> {
  private db!: Base;
  private secret = "";

  override onCreate(options: OptionsSalle) {
    this.db = options.db;
    this.secret = options.secret;
    this.setState(new SalleEtat());
    this.state.map = options.map;
  }

  override async onAuth(_client: Client, options: { jeton?: string }) {
    const id = verifierJeton(options?.jeton, this.secret);
    const compte = id === null ? undefined : this.db.select().from(comptes).where(eq(comptes.id, id)).get();
    if (!compte) throw new ServerError(401, "Non authentifié");
    return { compteId: compte.id, pseudo: compte.pseudo };
  }

  override onJoin(client: Client, _options: unknown, auth: { pseudo: string }) {
    client.userData = { pseudo: auth.pseudo };
  }
}
