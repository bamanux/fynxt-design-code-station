import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { GalleryEntry, GalleryModule, LibraryComponent, LibraryPayload, LibraryTemplate, TokenEntry } from "../shared/types";
import { listCases } from "./cases";
import { env } from "./env";

type TokenNode = { $value?: unknown; $type?: string; $extensions?: { "com.fynxt"?: { modes?: Record<string, unknown> } } } & Record<string, unknown>;

function flatten(node: TokenNode, path: string[], out: { path: string[]; token: TokenNode }[]) {
  if ("$value" in node) {
    out.push({ path, token: node });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (!key.startsWith("$") && child && typeof child === "object") flatten(child as TokenNode, [...path, key], out);
  }
}

function display(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value) && value.every((v) => typeof v !== "object")) return value.join(", ");
  return JSON.stringify(value);
}

async function tokens(): Promise<LibraryPayload["tokens"]> {
  const source = JSON.parse(await readFile(resolve(env.stationRoot, "packages/tokens/dist/tokens.json"), "utf8")) as TokenNode & {
    $extensions: { "com.fynxt.meta": { version: string; status: string } };
  };
  const all: { path: string[]; token: TokenNode }[] = [];
  flatten(source, [], all);
  const byPath = new Map(all.map((t) => [t.path.join("."), t.token]));
  const resolveValue = (value: unknown, depth = 0): unknown => {
    const m = typeof value === "string" ? value.match(/^\{(.+)\}$/) : null;
    if (!m || depth > 8) return value;
    return resolveValue(byPath.get(m[1]!)?.$value, depth + 1);
  };
  const groups: Record<string, TokenEntry[]> = {};
  for (const { path, token } of all) {
    const group = path[0] === "color" ? "color primitives" : path[0]!;
    const modes = token.$extensions?.["com.fynxt"]?.modes;
    (groups[group] ??= []).push({
      name: path.join("."),
      cssVar: `--fx-${path.join("-")}`,
      type: token.$type ?? "",
      value: display(token.$value),
      resolved: display(resolveValue(token.$value)),
      modes: modes ? Object.fromEntries(Object.entries(modes).map(([k, v]) => [k, display(resolveValue(v))])) : null,
    });
  }
  const meta = source.$extensions["com.fynxt.meta"];
  return { version: meta.version, status: meta.status, groups };
}

async function components(): Promise<LibraryComponent[]> {
  const root = resolve(env.stationRoot, "packages/ui/src");
  const dirs = (await readdir(root, { withFileTypes: true })).filter((d) => d.isDirectory());
  return Promise.all(
    dirs.map(async (d) => {
      const files = await readdir(join(root, d.name));
      const figmaFile = files.find((f) => f.endsWith(".figma.tsx"));
      const figmaUrls = figmaFile
        ? [...(await readFile(join(root, d.name, figmaFile), "utf8")).matchAll(/"(https:\/\/www\.figma\.com\/design\/[^"]+)"/g)].map((m) => m[1]!)
        : [];
      return {
        name: d.name,
        path: `packages/ui/src/${d.name}`,
        figmaUrls,
        hasTest: files.some((f) => f.endsWith(".test.tsx")),
        hasCodeConnect: Boolean(figmaFile),
      };
    })
  );
}

async function templates(): Promise<LibraryTemplate[]> {
  const file = resolve(env.enginePath, "templates/registry/template-registry.json");
  if (!existsSync(file)) return [];
  const registry = JSON.parse(await readFile(file, "utf8")) as { templates: (LibraryTemplate & { placeholder?: boolean })[] };
  return registry.templates.map((t) => ({
    id: t.id, name: t.name, category: t.category, status: t.status, version: t.version, placeholder: Boolean(t.placeholder), description: t.description,
  }));
}

async function gallery(): Promise<GalleryModule[]> {
  const menu = JSON.parse(await readFile(resolve(env.stationRoot, "apps/studio/gallery/menu.json"), "utf8")) as { modules: GalleryModule[] };
  return menu.modules;
}

interface RegisteredPage {
  id: string;
  label: string;
  module: string;
  section: string;
  caseId: string | null;
  template: string | null;
}

/** Pages registered for review (written by FDI at /fdi-build, next to registry.ts). */
async function registeredPages(): Promise<RegisteredPage[]> {
  const file = resolve(env.stationRoot, "apps/studio/gallery/pages.json");
  if (!existsSync(file)) return [];
  return (JSON.parse(await readFile(file, "utf8")) as { pages: RegisteredPage[] }).pages ?? [];
}

/** Published pages (menu.json) plus registered ones, each with its case's current status. */
export async function galleryEntries(menu?: GalleryModule[]): Promise<GalleryEntry[]> {
  const [modules, registered, cases] = await Promise.all([menu ? Promise.resolve(menu) : gallery(), registeredPages(), listCases()]);
  const statusOf = (caseId: string | null) => (caseId ? cases.find((c) => c.id === caseId)?.status ?? null : null);
  const entries = new Map<string, GalleryEntry>();
  for (const m of modules)
    for (const s of m.sections)
      for (const p of s.pages) entries.set(p.id, { id: p.id, label: p.label, module: m.label, section: s.label, caseId: p.caseId, caseStatus: statusOf(p.caseId), template: p.template, published: true });
  for (const p of registered) if (!entries.has(p.id)) entries.set(p.id, { ...p, caseStatus: statusOf(p.caseId), published: false });
  return [...entries.values()];
}

export async function library(): Promise<LibraryPayload> {
  const [t, c, tp, g] = await Promise.all([tokens(), components(), templates(), gallery()]);
  return { tokens: t, components: c, templates: tp, gallery: g, galleryEntries: await galleryEntries(g) };
}
