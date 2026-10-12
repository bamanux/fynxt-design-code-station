#!/usr/bin/env node
// Pulls the single token source from the engine repo and regenerates @fynxt/tokens.
// The engine's build.mjs is the only generator — this script never re-implements it.
import { copyFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { stationRoot, enginePath } from "./paths.mjs";

const tokenDir = resolve(enginePath, "design-system/tokens");
if (!existsSync(resolve(tokenDir, "tokens.json"))) {
  console.error(`tokens.json not found under ${tokenDir}. Set ENGINE_PATH in .env.`);
  process.exit(1);
}
const outDir = resolve(stationRoot, "packages/tokens/dist");
execFileSync(process.execPath, [resolve(tokenDir, "build.mjs"), outDir], { stdio: "inherit" });
copyFileSync(resolve(tokenDir, "tokens.json"), resolve(outDir, "tokens.json"));
console.log(`Synced tokens.json from ${tokenDir}`);
