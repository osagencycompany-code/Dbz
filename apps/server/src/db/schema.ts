import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

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

/** Un personnage par compte (créé à la première connexion). */
export const personnages = sqliteTable("personnages", {
  compteId: integer("compte_id")
    .primaryKey()
    .references(() => comptes.id, { onDelete: "cascade" }),
  niveau: integer("niveau").notNull(),
  xp: integer("xp").notNull(),
  vitalite: integer("vitalite").notNull(),
  force: integer("force").notNull(),
  puissance: integer("puissance").notNull(),
  agilite: integer("agilite").notNull(),
  energie: integer("energie").notNull(),
  pointsLibres: integer("points_libres").notNull(),
  palette: text("palette").notNull(),
  map: text("map").notNull(),
  /** Nom du point d'arrivée à rejoindre à la prochaine connexion (portail) ; vide si on reprend la position. */
  spawn: text("spawn"),
  x: real("x"),
  y: real("y"),
  majLe: integer("maj_le").notNull(),
});
