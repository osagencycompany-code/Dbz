import { createReadStream, existsSync, statSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TYPES: Record<string, string> = { ".png": "image/png", ".json": "application/json", ".tmj": "application/json" };

/**
 * Sert maps/ et assets/build/ (générés par `npm run assets:build`) comme le fera le serveur en production.
 * Le jeu ne charge jamais assets/raw/.
 */
function ressourcesDuJeu(): Plugin {
  return {
    name: "ressources-du-jeu",
    configureServer(serveur) {
      serveur.middlewares.use((req, res, suite) => {
        const url = decodeURIComponent((req.url ?? "").split("?")[0] ?? "");
        const dossier = ["/maps/", "/assets/build/"].find((p) => url.startsWith(p));
        if (!dossier) return suite();
        const fichier = normalize(join(racine, url));
        if (!fichier.startsWith(join(racine, dossier.slice(1))) || !existsSync(fichier) || !statSync(fichier).isFile()) {
          res.statusCode = 404;
          return res.end("introuvable");
        }
        res.setHeader("content-type", TYPES[extname(fichier)] ?? "application/octet-stream");
        createReadStream(fichier).pipe(res);
      });
    },
  };
}

export default defineConfig({
  root: dirname(fileURLToPath(import.meta.url)),
  plugins: [ressourcesDuJeu()],
  server: {
    port: Number(process.env.CLIENT_PORT ?? 5173),
    strictPort: true,
    proxy: { "/api": process.env.DBZ_API ?? "http://localhost:2567" },
    fs: { allow: [racine] },
  },
  build: { outDir: join(racine, "dist", "client"), emptyOutDir: true },
});
