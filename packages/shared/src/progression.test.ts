import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { xpMonstre, xpRequise } from "./formulas.js";
import { coupRate, gagnerXp, pvApresKo, xpApresKo, xpGagneeSurMonstre, zenkaiDeclenche } from "./progression.js";
import { balanceProgression } from "./schemas/balance.js";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const p = balanceProgression.parse(JSON.parse(readFileSync(join(racine, "data/balance/progression.json"), "utf8")));

describe("gagnerXp", () => {
  it("ajoute de l'XP sans monter de niveau", () => {
    expect(gagnerXp(p, { niveau: 1, xp: 0 }, 10)).toEqual({ niveau: 1, xp: 10, niveauxGagnes: 0 });
  });

  it("monte d'un niveau exactement à la limite, report à 0", () => {
    const besoin = xpRequise(p, 1);
    expect(gagnerXp(p, { niveau: 1, xp: 0 }, besoin)).toEqual({ niveau: 2, xp: 0, niveauxGagnes: 1 });
  });

  it("enchaîne plusieurs niveaux et garde le reste", () => {
    const total = xpRequise(p, 1) + xpRequise(p, 2) + 7;
    expect(gagnerXp(p, { niveau: 1, xp: 0 }, total)).toEqual({ niveau: 3, xp: 7, niveauxGagnes: 2 });
  });

  it("s'arrête au niveau maximum", () => {
    const r = gagnerXp(p, { niveau: p.niveau_max - 1, xp: 0 }, xpRequise(p, p.niveau_max - 1) * 50);
    expect(r).toEqual({ niveau: p.niveau_max, xp: 0, niveauxGagnes: 1 });
    expect(gagnerXp(p, { niveau: p.niveau_max, xp: 0 }, 1000).niveauxGagnes).toBe(0);
  });

  it("ignore un gain négatif ou fractionnaire", () => {
    expect(gagnerXp(p, { niveau: 1, xp: 5 }, -50).xp).toBe(5);
    expect(gagnerXp(p, { niveau: 1, xp: 0 }, 3.9).xp).toBe(3);
  });
});

describe("xpGagneeSurMonstre", () => {
  it("applique le multiplicateur global sur un monstre de même niveau", () => {
    expect(xpGagneeSurMonstre(p, 5, 5, "commun")).toBe(xpMonstre(p, 5) * p.multiplicateur_global);
  });

  it("réduit l'XP d'un monstre trop faible (plus de xp_reduite_au_dela niveaux d'écart)", () => {
    const ecart = p.ecart_niveau.xp_reduite_au_dela;
    const pleine = xpGagneeSurMonstre(p, 5 + ecart, 5, "commun");
    const reduite = xpGagneeSurMonstre(p, 6 + ecart, 5, "commun");
    expect(pleine).toBe(xpMonstre(p, 5) * p.multiplicateur_global);
    expect(reduite).toBe(Math.round((xpMonstre(p, 5) * p.ecart_niveau.xp_reduite_pct * p.multiplicateur_global) / 100));
  });

  it("ajoute le bonus Zenkai en dernier", () => {
    const sans = xpGagneeSurMonstre(p, 10, 10, "elite");
    const avec = xpGagneeSurMonstre(p, 10, 10, "elite", { zenkaiActif: true });
    expect(avec).toBe(Math.round(sans * (1 + p.zenkai.bonus_xp_pct / 100)));
  });
});

describe("coupRate", () => {
  it("ne rate jamais jusqu'au seuil d'écart", () => {
    expect(coupRate(p, 5, 5 + p.ecart_niveau.coups_rates_au_dela, 0)).toBe(false);
  });
  it("rate selon le tirage au-delà du seuil", () => {
    const niveauMonstre = 6 + p.ecart_niveau.coups_rates_au_dela;
    expect(coupRate(p, 5, niveauMonstre, 0)).toBe(true);
    expect(coupRate(p, 5, niveauMonstre, 0.999)).toBe(false);
  });
});

describe("K.O. et Zenkai", () => {
  it("retire un pourcentage de l'XP du niveau, sans descendre sous 0 ni perdre de niveau", () => {
    const perte = Math.round((xpRequise(p, 10) * p.ko.perte_xp_niveau_pct) / 100);
    expect(xpApresKo(p, { niveau: 10, xp: perte + 40 })).toEqual({ niveau: 10, xp: 40 });
    expect(xpApresKo(p, { niveau: 10, xp: 1 })).toEqual({ niveau: 10, xp: 0 });
  });
  it("rend un pourcentage des PV au retour", () => {
    expect(pvApresKo(p, 200)).toBe(Math.round((200 * p.ko.pv_retour_pct) / 100));
  });
  it("déclenche le Zenkai contre un ennemi de niveau ≥, hors recharge", () => {
    expect(zenkaiDeclenche(10, 10, 100, 0)).toBe(true);
    expect(zenkaiDeclenche(10, 9, 100, 0)).toBe(false);
    expect(zenkaiDeclenche(10, 12, 100, 200)).toBe(false);
  });
});
