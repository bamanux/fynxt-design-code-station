import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, relative, resolve } from "node:path";
import { handleApi } from "./api";
import { env } from "./env";

const dist = resolve(env.stationRoot, "apps/studio/dist");
const host = process.env.HOST ?? "127.0.0.1";
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json", ".ico": "image/x-icon",
};

if (!existsSync(resolve(dist, "index.html"))) {
  console.error("Studio client is not built. Run `npm run build` at the Station root first.");
  process.exit(1);
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://studio.local");
  if (url.pathname.startsWith("/api/")) return void handleApi(req, res);
  let file = resolve(dist, `.${decodeURIComponent(url.pathname)}`);
  const rel = relative(dist, file);
  if (rel.startsWith("..") || !existsSync(file) || statSync(file).isDirectory()) file = resolve(dist, "index.html");
  res.writeHead(200, {
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
  });
  createReadStream(file).pipe(res);
}).listen(env.port, host, () => {
  console.log(`FDI Studio on http://${host}:${env.port} (engine: ${env.enginePath})`);
});
