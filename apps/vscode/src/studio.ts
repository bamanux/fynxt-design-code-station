import * as vscode from "vscode";

/** Subset of FDI Studio's shared types this extension reads (apps/studio/shared/types.ts). */
export interface CaseSummary {
  id: string;
  folder: string;
  title: string;
  module: string;
  status: string;
  revision: number;
  requestedBy: string;
  updated: string;
  openFeedback: number;
  openQuestions: number;
  figmaUrl: string | null;
  prUrl: string | null;
  activeRun: { id: string; stage: string } | null;
  waitingOn: { roles: string[]; text: string };
}

export interface StudioMeta {
  roles: string[];
  agentReady: boolean;
  agentProblem: string | null;
}

export interface Identity {
  name: string;
  role: string;
}

export function settings() {
  const c = vscode.workspace.getConfiguration("fdi");
  return {
    studioUrl: c.get<string>("studioUrl", "http://127.0.0.1:5190").replace(/\/+$/, ""),
    name: c.get<string>("userName", "").trim(),
    role: c.get<string>("userRole", "").trim(),
    stationPath: c.get<string>("stationPath", "").trim(),
    enginePath: c.get<string>("enginePath", "").trim(),
    refreshSeconds: Math.max(10, c.get<number>("refreshSeconds", 30)),
  };
}

export function identity(): Identity | null {
  const { name, role } = settings();
  return name && role ? { name, role } : null;
}

export class StudioError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

async function request<T>(path: string, user: Identity | null): Promise<T> {
  const { studioUrl } = settings();
  let res: Response;
  try {
    res = await fetch(`${studioUrl}${path}`, {
      headers: user ? { "X-FDI-User": encodeURIComponent(user.name), "X-FDI-Role": encodeURIComponent(user.role) } : {},
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new StudioError(0, `FDI Studio is not reachable at ${studioUrl}.`);
  }
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new StudioError(res.status, body.error ?? `Studio returned ${res.status}`);
  return body;
}

export const studio = {
  meta: () => request<StudioMeta>("/api/meta", null),
  cases: (user: Identity) => request<CaseSummary[]>("/api/cases", user),
};

/** Studio URL for a page, carrying identity in the hash so the embedded Studio signs in as you. */
export function studioPageUrl(path: string): string {
  const { studioUrl } = settings();
  const user = identity();
  const hash = user ? `#fdi-as=${encodeURIComponent(user.name)}|${encodeURIComponent(user.role)}` : "";
  return `${studioUrl}${path}${hash}`;
}

/** The FDI slash command that moves a case forward from its current status. */
export function claudeCommandFor(c: CaseSummary): string {
  switch (c.status) {
    case "CHANGES-REQUESTED":
      return `/fdi-revise ${c.id}`;
    case "APPROVED":
    case "DESIGN-CHANGES-REQUESTED":
      return `/fdi-figma ${c.id}`;
    case "DESIGN-APPROVED":
    case "CODE-CHANGES-REQUESTED":
      return `/fdi-build ${c.id}`;
    case "CODE-APPROVED":
      return `/fdi-publish ${c.id}`;
    default:
      return `/fdi-status ${c.id}`;
  }
}

export const STATUS_LABEL: Record<string, string> = {
  NEW: "Queued for FDI",
  DRAFT: "Drafting",
  "IN-REVIEW": "Case file review",
  "CHANGES-REQUESTED": "Changes requested",
  APPROVED: "Case file approved",
  "DESIGN-IN-PROGRESS": "Designing",
  "DESIGN-REVIEW": "Design review",
  "DESIGN-CHANGES-REQUESTED": "Design changes",
  "DESIGN-APPROVED": "Design approved",
  "CODE-IN-PROGRESS": "Building",
  "CODE-REVIEW": "Code review",
  "CODE-CHANGES-REQUESTED": "Code changes",
  "CODE-APPROVED": "Code approved",
  PUBLISHED: "Published",
  BLOCKED: "Blocked",
};
