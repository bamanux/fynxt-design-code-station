import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { GalleryModule } from "../shared/types";
import { env } from "./env";

/** Gallery files in the Station: menu.json (published) and pages.json (registered for review). */

export interface RegisteredPage {
  id: string;
  label: string;
  module: string;
  section: string;
  caseId: string | null;
  template: string | null;
}

export async function menuModules(): Promise<GalleryModule[]> {
  const file = resolve(env.stationRoot, "apps/studio/gallery/menu.json");
  if (!existsSync(file)) return [];
  return (JSON.parse(await readFile(file, "utf8")) as { modules?: GalleryModule[] }).modules ?? [];
}

export async function registeredPages(): Promise<RegisteredPage[]> {
  const file = resolve(env.stationRoot, "apps/studio/gallery/pages.json");
  if (!existsSync(file)) return [];
  return (JSON.parse(await readFile(file, "utf8")) as { pages?: RegisteredPage[] }).pages ?? [];
}

/** The gallery page a case built, if any (published or registered). */
export async function pageForCase(caseId: string): Promise<string | null> {
  for (const m of await menuModules()) for (const s of m.sections) for (const p of s.pages) if (p.caseId === caseId) return p.id;
  return (await registeredPages()).find((p) => p.caseId === caseId)?.id ?? null;
}
