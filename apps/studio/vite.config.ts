import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/** Mounts the Studio API into the Vite dev server so `npm run dev` is a single process. */
function studioApi(): Plugin {
  return {
    name: "fdi-studio-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        void server.ssrLoadModule("/server/api.ts").then(({ handleApi }) => handleApi(req, res));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), studioApi()],
  server: { host: "127.0.0.1", port: 5190, strictPort: true },
  preview: { host: "127.0.0.1", port: 5190 },
});
