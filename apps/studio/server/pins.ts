import { existsSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PagePin, StudioUser } from "../shared/types";
import { addFeedback, caseDir } from "./cases";
import { HttpError } from "./errors";
import { galleryEntries } from "./library";
import { canComment } from "./permissions";

/**
 * Comments pinned to a built gallery page. Any signed-in user who may comment can pin one; it is stored in
 * <case>/pins.json and written to the page's case as §11 feedback, so it reaches every level through the gates.
 */

const file = (dir: string) => join(dir, "pins.json");

async function readPins(dir: string): Promise<PagePin[]> {
  return existsSync(file(dir)) ? (JSON.parse(await readFile(file(dir), "utf8")) as PagePin[]) : [];
}

async function pageCase(pageId: string): Promise<{ caseId: string; label: string; dir: string }> {
  const entry = (await galleryEntries()).find((e) => e.id === pageId);
  if (!entry) throw new HttpError(404, "That gallery page isn't registered in the Station.");
  if (!entry.caseId) throw new HttpError(409, "This page has no design case to send comments to.");
  return { caseId: entry.caseId, label: entry.label, dir: (await caseDir(entry.caseId)).dir };
}

export async function listPins(pageId: string): Promise<PagePin[]> {
  const { dir } = await pageCase(pageId);
  return (await readPins(dir)).filter((p) => p.pageId === pageId);
}

const clamp = (n: unknown) => Math.min(100, Math.max(0, Number.isFinite(Number(n)) ? Number(n) : 0));

export async function addPin(user: StudioUser, pageId: string, input: { x?: unknown; y?: unknown; text?: unknown; hint?: unknown }): Promise<PagePin> {
  if (!canComment(user)) throw new HttpError(403, "Your role cannot comment.");
  const text = String(input.text ?? "").trim().slice(0, 2000);
  if (!text) throw new HttpError(400, "Write the change you want.");
  const hint = String(input.hint ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  const { caseId, label, dir } = await pageCase(pageId);
  const existing = await readPins(dir);
  const id = `P${existing.length + 1}`;
  const where = hint ? ` at “${hint}”` : "";
  // Pipes would break the §11 markdown table.
  const feedbackRef = await addFeedback(caseId, user, `Built page · ${label}`, `[Pin ${id}${where}] ${text}`.replace(/\|/g, "/").replace(/\n+/g, " "));
  const pin: PagePin = { id, pageId, caseId, x: clamp(input.x), y: clamp(input.y), text, hint, author: user.name, createdAt: new Date().toISOString(), feedbackRef };
  const tmp = `${file(dir)}.tmp`;
  await writeFile(tmp, JSON.stringify([...existing, pin], null, 2));
  await rename(tmp, file(dir));
  return pin;
}
