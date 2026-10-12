/**
 * Minimal, dependency-free helpers for the Design Case File format
 * (agent/fdi/design-case-file.template.md): YAML-subset frontmatter, numbered sections,
 * and pipe tables. Only the shapes that template uses are supported.
 */

export type FrontmatterValue = string | null | Record<string, string | null>;

const FM = /^---\n([\s\S]*?)\n---\n?/;

function scalar(raw: string): string | null {
  const v = raw.trim();
  if (v === "" || v === "null" || v === "~") return null;
  return v.replace(/^(["'])(.*)\1$/, "$2");
}

export function parseFrontmatter(md: string): Record<string, FrontmatterValue> {
  const match = md.match(FM);
  if (!match?.[1]) return {};
  const out: Record<string, FrontmatterValue> = {};
  let parent: string | null = null;
  for (const line of match[1].split("\n")) {
    const nested = line.match(/^ {2}([\w-]+):\s*(.*)$/);
    if (nested && parent) {
      const obj = (out[parent] ??= {}) as Record<string, string | null>;
      obj[nested[1]!] = scalar(nested[2]!);
      continue;
    }
    const top = line.match(/^([\w-]+):\s*(.*)$/);
    if (!top) continue;
    const value = top[2]!.trim();
    if (value === "") {
      parent = top[1]!;
      out[parent] = {};
    } else {
      parent = null;
      out[top[1]!] = scalar(value);
    }
  }
  return out;
}

/** Sets a top-level (`key`) or nested (`parent.key`) frontmatter value in place. */
export function setFrontmatter(md: string, path: string, value: string): string {
  const match = md.match(FM);
  if (!match?.[1]) throw new Error("Case file has no frontmatter");
  const lines = match[1].split("\n");
  const [parent, key] = path.includes(".") ? (path.split(".") as [string, string]) : [null, path];
  const safe = value.replace(/\n/g, " ");
  if (parent === null) {
    const i = lines.findIndex((l) => l.startsWith(`${key}:`));
    if (i === -1) lines.push(`${key}: ${safe}`);
    else lines[i] = `${key}: ${safe}`;
  } else {
    const p = lines.findIndex((l) => l === `${parent}:`);
    if (p === -1) {
      lines.push(`${parent}:`, `  ${key}: ${safe}`);
    } else {
      let i = p + 1;
      while (i < lines.length && lines[i]!.startsWith("  ")) {
        if (lines[i]!.startsWith(`  ${key}:`)) break;
        i++;
      }
      if (i < lines.length && lines[i]!.startsWith(`  ${key}:`)) lines[i] = `  ${key}: ${safe}`;
      else lines.splice(i, 0, `  ${key}: ${safe}`);
    }
  }
  return md.replace(FM, `---\n${lines.join("\n")}\n---\n`);
}

interface SectionBounds {
  start: number;
  end: number;
}

/** Line range of `## <n>. …` up to the next `## ` heading (exclusive). */
function sectionBounds(lines: string[], n: number): SectionBounds | null {
  const start = lines.findIndex((l) => new RegExp(`^## ${n}\\.\\s`).test(l));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i]!)) {
      end = i;
      break;
    }
  }
  return { start, end };
}

export function splitRow(line: string): string[] {
  const body = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return body.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|").replace(/<br>/g, "\n"));
}

/** Data rows (header and separator excluded) of the first table in section `n`. */
export function sectionTable(md: string, n: number): string[][] {
  const lines = md.split("\n");
  const b = sectionBounds(lines, n);
  if (!b) return [];
  const table = lines.slice(b.start, b.end).filter((l) => l.trim().startsWith("|"));
  return table.slice(2).map(splitRow);
}

export function escapeCell(text: string, max = 2000): string {
  return text.trim().slice(0, max).replace(/\r?\n/g, "<br>").replace(/\|/g, "\\|");
}

/** Appends a row after the last table line in section `n`. */
export function appendTableRow(md: string, n: number, cells: string[]): string {
  const lines = md.split("\n");
  const b = sectionBounds(lines, n);
  if (!b) throw new Error(`Section ${n} not found in case file`);
  let last = -1;
  for (let i = b.start; i < b.end; i++) if (lines[i]!.trim().startsWith("|")) last = i;
  if (last === -1) throw new Error(`Section ${n} has no table`);
  lines.splice(last + 1, 0, `| ${cells.map((c) => escapeCell(c)).join(" | ")} |`);
  return lines.join("\n");
}

/** True when a table row is still the template's placeholder (e.g. "| # | Question |" left empty). */
export function isPlaceholderRow(cells: string[]): boolean {
  return cells.every((c) => c === "" || /^(—|-|<.*>|YYYY-MM-DD)$/.test(c));
}
