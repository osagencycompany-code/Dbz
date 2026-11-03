import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  degatsKi,
  degatsMelee,
  esquivePct,
  kiMax,
  puissanceAffichee,
  pvMax,
  vitessePxS,
  xpMonstre,
  xpQuete,
  xpRequise,
} from "./formulas.js";
import { balanceFormules, balanceProgression } from "./schemas/balance.js";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const lire = (rel: string): unknown => JSON.parse(readFileSync(join(racine, rel), "utf8"));

const f = balanceFormules.parse(lire("data/balance/formules.json"));
const p = balanceProgression.parse(lire("data/balance/progression.json"));
const golden = lire("tests/golden/formules.json") as {
  tolerance: number;
  stats: {
    niveau: number;
    stats: Record<"vit" | "force" | "pui" | "agi" | "ene", number>;
    super_saiyan: boolean;
    attendu: Record<string, number>;
  }[];
  xp: { niveau: number; xp_requise: number; xp_monstre: number }[];
  xp_quete?: { niveau_conseille: number; xp_niveaux: number; xp: number }[];
};

/**
 * Tolérance absolue du fichier de référence ; les valeurs arrondies à l'entier
 * (puissances affichées) ont droit à ±0,5 d'arrondi.
 */
function proche(obtenu: number, attendu: number) {
  const marge = Number.isInteger(attendu) ? 0.5 : golden.tolerance;
  expect(Math.abs(obtenu - attendu)).toBeLessThanOrEqual(marge);
}

describe("formules de stats (tests/golden/formules.json)", () => {
  for (const cas of golden.stats) {
    const nom = `niveau ${cas.niveau}, stats ${Object.values(cas.stats).join("/")}${cas.super_saiyan ? ", Super Saiyan" : ""}`;
    it(nom, () => {
      const s = {
        vitalite: cas.stats.vit,
        force: cas.stats.force,
        puissance: cas.stats.pui,
        agilite: cas.stats.agi,
        energie: cas.stats.ene,
      };
      // Bonus du Super Saiyan : data/transformations/super-saiyan.json
      const ssj = lire("data/transformations/super-saiyan.json") as {
        bonus_combat: Record<string, number>;
        multiplicateur_affiche: number;
      };
      const bonus = (cle: string) => (cas.super_saiyan ? (ssj.bonus_combat[cle] ?? 0) : 0);
      const a = cas.attendu;
      proche(pvMax(f, cas.niveau, s.vitalite, bonus("vitalite_pct")), a.pv_max!);
      proche(degatsMelee(f, cas.niveau, s.force, bonus("force_pct")), a.degats_melee!);
      proche(degatsKi(f, cas.niveau, s.puissance, bonus("puissance_pct")), a.degats_ki!);
      proche(kiMax(f, cas.niveau, s.energie), a.ki_max!);
      proche(esquivePct(f, cas.niveau, s.agilite), a.esquive_pct!);
      proche(vitessePxS(f, cas.niveau, s.agilite), a.vitesse_px_s!);
      const transfo = cas.super_saiyan
        ? { bonusPct: bonus("force_pct"), multiplicateurAffiche: ssj.multiplicateur_affiche }
        : undefined;
      proche(puissanceAffichee(f, cas.niveau, s, transfo), a.puissance_affichee!);
    });
  }
});

describe("progression (tests/golden/formules.json)", () => {
  for (const cas of golden.xp) {
    it(`niveau ${cas.niveau} : XP requise et XP d'un monstre`, () => {
      expect(xpRequise(p, cas.niveau)).toBe(cas.xp_requise);
      expect(xpMonstre(p, cas.niveau)).toBe(cas.xp_monstre);
    });
  }

  it("les monstres élites et boss multiplient l'XP du monstre commun", () => {
    expect(xpMonstre(p, 10, "elite")).toBe(Math.round(xpMonstre(p, 10) * p.xp_monstre.multiplicateur_elite));
    expect(xpMonstre(p, 10, "boss")).toBeGreaterThan(xpMonstre(p, 10, "elite"));
  });

  for (const cas of golden.xp_quete ?? []) {
    it(`XP de quête : ${cas.xp_niveaux} niveau(x) au niveau conseillé ${cas.niveau_conseille}`, () => {
      expect(xpQuete(p, cas.niveau_conseille, cas.xp_niveaux)).toBe(cas.xp);
    });
  }
});
