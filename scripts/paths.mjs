import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const stationRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(resolve(stationRoot, ".env"))) process.loadEnvFile(resolve(stationRoot, ".env"));
export const enginePath = resolve(stationRoot, process.env.ENGINE_PATH ?? "../fynxt-product-experience-engine");
