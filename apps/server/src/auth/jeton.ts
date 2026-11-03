import { createHmac, timingSafeEqual } from "node:crypto";

export interface ContenuJeton {
  /** id du compte */
  c: number;
  /** expiration, ms depuis 1970 */
  e: number;
}

const DUREE_MS = 7 * 24 * 3600 * 1000;

const signer = (donnees: string, secret: string) => createHmac("sha256", secret).update(donnees).digest("base64url");

export function creerJeton(compteId: number, secret: string, maintenant = Date.now()): string {
  const donnees = Buffer.from(JSON.stringify({ c: compteId, e: maintenant + DUREE_MS } satisfies ContenuJeton)).toString("base64url");
  return `${donnees}.${signer(donnees, secret)}`;
}

/** Renvoie l'id du compte, ou null si le jeton est invalide ou expiré. */
export function verifierJeton(jeton: unknown, secret: string, maintenant = Date.now()): number | null {
  if (typeof jeton !== "string") return null;
  const [donnees, signature] = jeton.split(".");
  if (!donnees || !signature) return null;
  const attendu = Buffer.from(signer(donnees, secret));
  const recu = Buffer.from(signature);
  if (attendu.length !== recu.length || !timingSafeEqual(attendu, recu)) return null;
  try {
    const contenu = JSON.parse(Buffer.from(donnees, "base64url").toString()) as ContenuJeton;
    return contenu.e > maintenant && Number.isInteger(contenu.c) ? contenu.c : null;
  } catch {
    return null;
  }
}
