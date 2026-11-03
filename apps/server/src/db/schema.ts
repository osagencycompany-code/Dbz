import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const comptes = sqliteTable("comptes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  pseudo: text("pseudo").notNull().unique(),
  motDePasse: text("mot_de_passe").notNull(),
  /** « joueur » ou « admin » ; ne se change qu'en base (npm run admin:grant). */
  role: text("role").notNull().default("joueur"),
  creeLe: integer("cree_le").notNull(),
});

export const invitations = sqliteTable("invitations", {
  cle: text("cle").primaryKey(),
  creeLe: integer("cree_le").notNull(),
  utiliseePar: integer("utilisee_par").references(() => comptes.id, { onDelete: "set null" }),
  utiliseeLe: integer("utilisee_le"),
});
