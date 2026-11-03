import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@playwright/test";

// Les ports et la base de test sont à part : on peut lancer les tests pendant que le jeu de développement tourne.
const PORT_SERVEUR = 2599;
const PORT_CLIENT = 5199;
process.env.DBZ_E2E_DB ??= join(tmpdir(), `dbz-e2e-${Date.now()}.sqlite`);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT_CLIENT}`, viewport: { width: 960, height: 540 } },
  webServer: [
    {
      command: "npm run assets:build && npm run start",
      url: `http://localhost:${PORT_SERVEUR}/api/sante`,
      timeout: 60_000,
      reuseExistingServer: false,
      env: { PORT: String(PORT_SERVEUR), DB_PATH: process.env.DBZ_E2E_DB, ESSAIS_PAR_MINUTE: "1000" },
    },
    {
      command: "npm run dev:client",
      url: `http://localhost:${PORT_CLIENT}`,
      timeout: 60_000,
      reuseExistingServer: false,
      env: { CLIENT_PORT: String(PORT_CLIENT), DBZ_API: `http://localhost:${PORT_SERVEUR}`, VITE_SERVEUR: `ws://localhost:${PORT_SERVEUR}` },
    },
  ],
});
