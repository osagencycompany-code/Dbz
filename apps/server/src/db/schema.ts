import { integer, primaryKey, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

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

/** Jusqu'à cinq personnages par compte (décision 0021) : un héros canon, une apparence, une progression propres. */
export const personnages = sqliteTable(
  "personnages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    compteId: integer("compte_id")
      .notNull()
      .references(() => comptes.id, { onDelete: "cascade" }),
    /** Emplacement de 1 à 5 ; unique par compte. */
    emplacement: integer("emplacement").notNull(),
    nom: text("nom").notNull(),
    /** Identifiant du héros (data/characters) et apparence choisie à la création (définitive). */
    heros: text("heros").notNull(),
    apparence: text("apparence").notNull(),
    /** Rareté en étoiles (décision 0023). */
    rarete: integer("rarete").notNull().default(1),
    niveau: integer("niveau").notNull(),
    xp: integer("xp").notNull(),
    vitalite: integer("vitalite").notNull(),
    force: integer("force").notNull(),
    puissance: integer("puissance").notNull(),
    agilite: integer("agilite").notNull(),
    energie: integer("energie").notNull(),
    pointsLibres: integer("points_libres").notNull(),
    zenies: integer("zenies").notNull().default(0),
    map: text("map").notNull(),
    /** Nom du point d'arrivée à rejoindre à la prochaine connexion (portail) ; vide si on reprend la position. */
    spawn: text("spawn"),
    x: real("x"),
    y: real("y"),
    creeLe: integer("cree_le").notNull(),
    majLe: integer("maj_le").notNull(),
  },
  (t) => [unique("personnages_compte_emplacement").on(t.compteId, t.emplacement)],
);

/** Inventaire par personnage (les objets ne sont jamais liés au personnage : décision 0021). */
export const inventaire = sqliteTable(
  "inventaire",
  {
    personnageId: integer("personnage_id")
      .notNull()
      .references(() => personnages.id, { onDelete: "cascade" }),
    objet: text("objet").notNull(),
    quantite: integer("quantite").notNull(),
  },
  (t) => [primaryKey({ columns: [t.personnageId, t.objet] })],
);

/** Équipement par personnage : un objet par emplacement (tête, torse, gants, bottes, accessoire). */
export const equipement = sqliteTable(
  "equipement",
  {
    personnageId: integer("personnage_id")
      .notNull()
      .references(() => personnages.id, { onDelete: "cascade" }),
    emplacement: text("emplacement").notNull(),
    objet: text("objet").notNull(),
  },
  (t) => [primaryKey({ columns: [t.personnageId, t.emplacement] })],
);
