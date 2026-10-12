#!/usr/bin/env node
// Station invariant 1 (agent/fdi/station-contract.md): component and template styles use
// token CSS variables only. Raw hex colours and px sizes fail unless the line carries an
// `OBSERVED: no token` note referencing the case file that justified it.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { stationRoot } from "./paths.mjs";

const ROOTS = ["packages/ui/src", "packages/templates/src", "apps/studio/src"];
const LITERAL = /#[0-9a-fA-F]{3,8}\b|(?<![\w-])\d*\.?\d+px\b/g;
// Allowed without a token: hairlines and zero, which FDS-101 does not tokenise.
const ALLOWED = new Set(["0px", "1px"]);

function* cssFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* cssFiles(full);
    else if (entry.endsWith(".css")) yield full;
  }
}

const problems = [];
for (const root of ROOTS) {
  for (const file of cssFiles(join(stationRoot, root))) {
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      if (line.includes("OBSERVED: no token")) return;
      const hits = (line.match(LITERAL) ?? []).filter((h) => !ALLOWED.has(h));
      if (hits.length) problems.push(`${relative(stationRoot, file)}:${i + 1}  ${hits.join(", ")}  →  ${line.trim()}`);
    });
  }
}
if (problems.length) {
  console.error(`Token-literal check failed (${problems.length}). Use var(--fx-*) or annotate "/* OBSERVED: no token — DCF-XXXX */":\n` + problems.join("\n"));
  process.exit(1);
}
console.log("Token-literal check passed.");
