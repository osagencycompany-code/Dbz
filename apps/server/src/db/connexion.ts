import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

export type Base = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

/** Migrations dans l'ordre ; on n'en modifie jamais une, on en ajoute une. */
const MIGRATIONS: string[] = [
  `CREATE TABLE comptes (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     email TEXT NOT NULL UNIQUE,
     pseudo TEXT NOT NULL UNIQUE,
     mot_de_passe TEXT NOT NULL,
     role TEXT NOT NULL DEFAULT 'joueur',
     cree_le INTEGER NOT NULL
   );
   CREATE TABLE invitations (
     cle TEXT PRIMARY KEY,
     cree_le INTEGER NOT NULL,
     utilisee_par INTEGER REFERENCES comptes(id) ON DELETE SET NULL,
     utilisee_le INTEGER
   );`,
  `CREATE TABLE personnages (
     compte_id INTEGER PRIMARY KEY REFERENCES comptes(id) ON DELETE CASCADE,
     niveau INTEGER NOT NULL,
     xp INTEGER NOT NULL,
     vitalite INTEGER NOT NULL,
     force INTEGER NOT NULL,
     puissance INTEGER NOT NULL,
     agilite INTEGER NOT NULL,
     energie INTEGER NOT NULL,
     points_libres INTEGER NOT NULL,
     palette TEXT NOT NULL,
     map TEXT NOT NULL,
     spawn TEXT,
     x REAL,
     y REAL,
     maj_le INTEGER NOT NULL
   );`,
];

export function ouvrirBase(chemin: string): Base {
  const sqlite = new Database(chemin);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const fait = (sqlite.pragma("user_version", { simple: true }) as number) ?? 0;
  MIGRATIONS.slice(fait).forEach((sql, i) => {
    sqlite.transaction(() => {
      sqlite.exec(sql);
      sqlite.pragma(`user_version = ${fait + i + 1}`);
    })();
  });
  return drizzle(sqlite, { schema }) as Base;
}

export { schema };
