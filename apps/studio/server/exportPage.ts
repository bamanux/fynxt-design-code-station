import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { build, type Plugin, type Rollup } from "vite";
import { HttpError } from "./errors";
import { env } from "./env";
import { galleryEntries } from "./library";

/**
 * "Download" on a gallery page: builds that one page into a single self-contained HTML file (JS, CSS,
 * icons and images inline) that anyone can open by double-clicking, before code review. The page runs on
 * its gallery demo adapter; nothing calls Studio or a backend. Web fonts still load from Google Fonts
 * (system font fallback offline).
 */

const studioRoot = resolve(env.stationRoot, "apps/studio");
const ENTRY = "\0fdi-export-entry";

/** The module a registered page id loads, read from gallery/registry.ts (the only pages Studio trusts). */
export async function pageModule(pageId: string): Promise<string | null> {
  const registry = await readFile(resolve(studioRoot, "gallery/registry.ts"), "utf8");
  for (const m of registry.matchAll(/^\s*"([^"]+)"\s*:\s*\(\)\s*=>\s*import\("([^"]+)"\)/gm)) {
    if (m[1] === pageId) return resolve(studioRoot, "gallery", m[2]!);
  }
  return null;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Inline code must not close its own tag early. */
const inlineSafe = (code: string, tag: "script" | "style") => code.replace(new RegExp(`</${tag}`, "gi"), `<\\/${tag}`);

export interface ExportedPage {
  fileName: string;
  html: string;
}

const running = new Map<string, Promise<ExportedPage>>();

/** One build per page at a time; concurrent clicks share it. */
export function exportPage(pageId: string): Promise<ExportedPage> {
  const existing = running.get(pageId);
  if (existing) return existing;
  const job = buildPage(pageId).finally(() => running.delete(pageId));
  running.set(pageId, job);
  return job;
}

async function buildPage(pageId: string): Promise<ExportedPage> {
  const entry = (await galleryEntries()).find((e) => e.id === pageId);
  const modulePath = await pageModule(pageId);
  if (!entry || !modulePath) throw new HttpError(404, "That gallery page isn't registered in the Station.");

  const entryPlugin: Plugin = {
    name: "fdi-export-entry",
    resolveId: (id) => (id === ENTRY ? ENTRY : null),
    load: (id) =>
      id === ENTRY
        ? [
            `import { StrictMode, createElement } from "react";`,
            `import { createRoot } from "react-dom/client";`,
            `import "@fynxt/ui/styles.css";`,
            `import Page from ${JSON.stringify(modulePath)};`,
            `createRoot(document.getElementById("root")).render(createElement(StrictMode, null, createElement(Page)));`,
          ].join("\n")
        : null,
  };

  const output = (await build({
    configFile: false,
    root: studioRoot,
    logLevel: "silent",
    mode: "production",
    plugins: [react(), entryPlugin],
    build: {
      write: false,
      minify: true,
      cssCodeSplit: false,
      modulePreload: false,
      assetsInlineLimit: () => true,
      rollupOptions: { input: ENTRY, output: { format: "es", inlineDynamicImports: true } },
    },
  })) as Rollup.RollupOutput | Rollup.RollupOutput[];

  const files = (Array.isArray(output) ? output : [output]).flatMap((o) => o.output);
  const js = files.filter((f): f is Rollup.OutputChunk => f.type === "chunk").map((c) => c.code).join("\n");
  const css = files
    .filter((f): f is Rollup.OutputAsset => f.type === "asset" && f.fileName.endsWith(".css"))
    .map((a) => (typeof a.source === "string" ? a.source : Buffer.from(a.source).toString("utf8")))
    .join("\n");

  const builtAt = new Date();
  const stamp = builtAt.toISOString().slice(0, 10);
  const title = `${entry.label}${entry.caseId ? ` · ${entry.caseId}` : ""} · FDI preview`;
  const html = `<!doctype html>
<!--
  FDI page preview: ${escapeHtml(entry.label)} (${escapeHtml(entry.id)})
  ${entry.caseId ? `Case ${escapeHtml(entry.caseId)}${entry.caseStatus ? ` · ${escapeHtml(entry.caseStatus)}` : ""} · ` : ""}built ${builtAt.toISOString()}
  Not production code: demo data only, nothing is saved. Open this file in any modern browser.
-->
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="generator" content="FDI Studio" />
    <title>${escapeHtml(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=Sora:wght@400;600;700&display=swap" rel="stylesheet" />
    <style>
      html, body, #root { block-size: 100%; margin: 0; }
      body { background: var(--fx-surface-background); font-family: var(--fx-font-family-body); }
    </style>
    <style>${inlineSafe(css, "style")}</style>
  </head>
  <body>
    <div id="root"></div>
    <noscript>This preview needs JavaScript.</noscript>
    <script type="module">${inlineSafe(js, "script")}</script>
  </body>
</html>
`;
  const slug = entry.id.replace(/[^a-z0-9.-]+/gi, "-");
  return { fileName: `${entry.caseId ? `${entry.caseId}-` : ""}${slug}-${stamp}.html`, html };
}
