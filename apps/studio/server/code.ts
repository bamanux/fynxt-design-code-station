import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import type { CodeFiles, StudioUser } from "../shared/types";
import { accessCase } from "./cases";
import { env } from "./env";
import { HttpError } from "./errors";
import { pageModule } from "./exportPage";
import { galleryEntries } from "./library";

/**
 * "View code": the Station files behind a gallery page, a component or a case, so Studio can open them in
 * the person's editor (vscode://file/…). Only paths computed here are returned; nothing is read from the request
 * except a registered page id, a component folder name or a case id.
 */

const run = promisify(execFile);
const root = () => env.stationRoot;
const rel = (abs: string) => relative(root(), abs).split("\\").join("/");
const SOURCE = /\.(tsx?|css|json|md)$/;
const order = (f: string) => (/\.test\.tsx?$/.test(f) ? 2 : /\.figma\.tsx$/.test(f) ? 3 : f.endsWith(".css") ? 1 : 0);

async function folderFiles(dir: string, group: string) {
  if (!existsSync(dir)) return [];
  const names = (await readdir(dir)).filter((f) => SOURCE.test(f)).sort((a, b) => order(a) - order(b) || a.localeCompare(b));
  return names.map((f) => ({ path: rel(join(dir, f)), group }));
}

/** `@fynxt/ui` components a set of files imports, as their component folders. */
async function uiComponentsUsed(files: string[]) {
  const names = new Set<string>();
  for (const f of files) {
    const src = await readFile(join(root(), f), "utf8").catch(() => "");
    for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*"@fynxt\/ui"/g))
      for (const part of m[1]!.split(",")) {
        const name = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]!.trim();
        if (/^[A-Z][A-Za-z0-9]*$/.test(name)) names.add(name);
      }
  }
  const out = [];
  for (const n of [...names].sort()) {
    const file = join(root(), "packages/ui/src", n, `${n}.tsx`);
    if (existsSync(file)) out.push({ path: rel(file), group: "Components (@fynxt/ui)" });
  }
  return out;
}

export async function pageCode(pageId: string): Promise<CodeFiles> {
  const entry = (await galleryEntries()).find((e) => e.id === pageId);
  const modulePath = await pageModule(pageId);
  if (!entry || !modulePath) throw new HttpError(404, "That gallery page isn't registered in the Station.");
  const base = modulePath.replace(/\.page$/, "");
  const page = [`${base}.config.tsx`, `${base}.page.tsx`, `${base}.page.test.tsx`].filter(existsSync).map((p) => ({ path: rel(p), group: "Page" }));
  const templateDir = entry.template ? resolve(root(), "packages/templates/src", entry.template) : null;
  const template = templateDir && dirname(templateDir) === resolve(root(), "packages/templates/src") ? await folderFiles(templateDir, `Template · ${entry.template}`) : [];
  const components = await uiComponentsUsed([...page, ...template].map((f) => f.path).filter((p) => !/\.test\./.test(p)));
  return { root: root(), title: entry.label, folder: templateDir ? rel(templateDir) : null, files: [...page, ...template, ...components] };
}

export async function componentCode(name: string): Promise<CodeFiles> {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) throw new HttpError(400, "Invalid component name");
  const dir = resolve(root(), "packages/ui/src", name);
  const files = await folderFiles(dir, name);
  if (!files.length) throw new HttpError(404, `Component ${name} not found`);
  return { root: root(), title: name, folder: rel(dir), files };
}

/** Files the case's commits touched on its Station branch (commit messages carry the case id). */
export async function caseCode(id: string, user: StudioUser): Promise<CodeFiles> {
  const { dir } = await accessCase(id, user);
  const front = (await readFile(join(dir, "case-file.md"), "utf8")).split(/^---$/m)[1] ?? "";
  const branch = /^\s*branch:\s*([^\s#]+)/m.exec(front)?.[1];
  if (!branch || branch === "null") return { root: root(), title: id, folder: null, files: [], note: "This case has no Station branch yet. Code appears after /fdi-build." };
  if (!/^[\w./-]+$/.test(branch)) throw new HttpError(400, "Invalid branch name in the case file");
  const git = (args: string[]) => run("git", ["-C", root(), ...args], { maxBuffer: 4 * 1024 * 1024 }).then((r) => r.stdout);
  const exists = await git(["rev-parse", "--verify", "--quiet", branch]).then(() => true, () => false);
  if (!exists) return { root: root(), title: id, folder: null, files: [], note: `Branch ${branch} isn't in this Station checkout.` };
  const changed = [...new Set((await git(["log", branch, "-i", `--grep=${id}`, "--name-only", "--format="])).split("\n").map((l) => l.trim()).filter(Boolean))].sort();
  const current = (await git(["rev-parse", "--abbrev-ref", "HEAD"])).trim();
  const groupOf = (p: string) => (p.startsWith("packages/ui/") ? "Components (@fynxt/ui)" : p.startsWith("packages/templates/") ? "Template" : p.startsWith("apps/studio/gallery/") ? "Gallery page" : "Other");
  return {
    root: root(),
    title: id,
    folder: null,
    branch,
    files: changed.map((p) => ({ path: p, group: groupOf(p), missing: !existsSync(join(root(), p)) || undefined })),
    note: current === branch ? undefined : `Your Station checkout is on ${current}. Switch to ${branch} to see this case's version of these files.`,
  };
}
