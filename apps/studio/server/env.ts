import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const stationRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const envFile = resolve(stationRoot, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const env = {
  stationRoot,
  enginePath: resolve(stationRoot, process.env.ENGINE_PATH ?? "../fynxt-product-experience-engine"),
  model: process.env.FDI_MODEL ?? "claude-opus-5-5",
  maxBudgetUsd: num(process.env.FDI_MAX_BUDGET_USD, 10),
  port: num(process.env.PORT, 5191),
  authMode: "local" as const,
  hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
};

export interface FdiConfig {
  approvers: Record<"caseFile" | "design" | "code", string[]>;
  studio: {
    status: string;
    roles: string[];
    permissions: {
      submitRequest: "*" | string[];
      comment: "*" | string[];
      decide: Record<string, "caseFile" | "design" | "code">;
      runStage: Record<string, string[]>;
    };
    headlessRuns: { figma: string; bashAllowlist: string[] };
  };
}

/** Re-read on every call so governance edits apply without a restart. */
export function fdiConfig(): FdiConfig {
  return JSON.parse(readFileSync(resolve(env.enginePath, "agent/fdi/fdi.config.json"), "utf8")) as FdiConfig;
}
