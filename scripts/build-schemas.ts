/**
 * Génère schemas/*.schema.json à partir des schémas zod (source de vérité : packages/shared/src/schemas).
 * Usage : npm run schemas:build
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { registreSchemas } from "../packages/shared/src/schemas/registre.js";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

export function genererJsonSchema(nom: string): string {
  const schema = registreSchemas[nom];
  if (!schema) throw new Error(`Schéma inconnu : ${nom}`);
  const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" });
  return `${JSON.stringify(json, null, 2)}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(join(racine, "schemas"), { recursive: true });
  for (const nom of Object.keys(registreSchemas)) {
    writeFileSync(join(racine, "schemas", `${nom}.schema.json`), genererJsonSchema(nom));
    console.log(`schemas/${nom}.schema.json`);
  }
}
