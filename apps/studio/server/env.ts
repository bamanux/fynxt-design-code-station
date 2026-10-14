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

const list = (value: string | undefined) => (value ?? "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
const port = num(process.env.PORT, 5191);

export const env = {
  stationRoot,
  enginePath: resolve(stationRoot, process.env.ENGINE_PATH ?? "../fynxt-product-experience-engine"),
  model: process.env.FDI_MODEL ?? "claude-opus-5-5",
  maxBudgetUsd: num(process.env.FDI_MAX_BUDGET_USD, 10),
  port,
  hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
  /** "entra" = Microsoft 365 sign-in (required in production); anything else = development sign-in. */
  authMode: (process.env.STUDIO_AUTH_MODE === "entra" ? "entra" : "dev") as "entra" | "dev",
  /** Only addresses at this domain may sign in. */
  allowedDomain: (process.env.STUDIO_ALLOWED_DOMAIN ?? "fynxt.com").trim().toLowerCase(),
  entra: {
    tenantId: process.env.ENTRA_TENANT_ID ?? "",
    clientId: process.env.ENTRA_CLIENT_ID ?? "",
    clientSecret: process.env.ENTRA_CLIENT_SECRET ?? "",
  },
  /** Public origin of Studio, used for the sign-in redirect URL. */
  publicUrl: (process.env.STUDIO_PUBLIC_URL ?? `http://127.0.0.1:${port}`).replace(/\/$/, ""),
  /** HMAC key for session cookies. Required with entra; dev mode uses a per-process random key. */
  sessionSecret: process.env.STUDIO_SESSION_SECRET ?? "",
  /** Emails that are always Admins (first sign-in creates them). Comma-separated. */
  bootstrapAdmins: list(process.env.STUDIO_ADMINS),
  /** Station user list and other runtime data. Git-ignored. */
  dataDir: resolve(stationRoot, process.env.STUDIO_DATA_DIR ?? ".studio-data"),
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
