import type { CaseDetail, CaseStatus, CaseSummary, LibraryPayload, PagePin, RunEvent, RunSummary, StationUser, StudioMeta, StudioUser } from "../../shared/types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/** Identity is the session cookie set at sign-in. This header marks Studio's own calls (CSRF guard on the server). */
function headers(extra?: Record<string, string>): Record<string, string> {
  return { "X-Requested-With": "fdi-studio", ...extra };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { ...init, headers: headers(init.headers as Record<string, string> | undefined) });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`);
  return body as T;
}

const json = (body: unknown, method = "POST"): RequestInit => ({ method, body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

export const api = {
  meta: () => request<StudioMeta>("/api/meta"),
  me: () => request<StudioUser>("/api/me"),
  devSignIn: (email: string) => request<StudioUser>("/api/auth/dev", json({ email })),
  signOut: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  users: () => request<StationUser[]>("/api/users"),
  inviteUser: (body: { email: string; name: string; roles: string[]; isAdmin: boolean }) => request<StationUser>("/api/users", json(body)),
  updateUser: (email: string, patch: Partial<Pick<StationUser, "name" | "roles" | "isAdmin" | "active">>) => request<StationUser>(`/api/users/${encodeURIComponent(email)}`, json(patch, "PATCH")),
  addMember: (id: string, email: string) => request<CaseDetail>(`/api/cases/${id}/members`, json({ email })),
  removeMember: (id: string, email: string) => request<CaseDetail>(`/api/cases/${id}/members`, json({ email }, "DELETE")),
  setOwner: (id: string, email: string) => request<CaseDetail>(`/api/cases/${id}/members/owner`, json({ email })),
  pins: (pageId: string) => request<PagePin[]>(`/api/pages/${encodeURIComponent(pageId)}/pins`),
  addPin: (pageId: string, body: { x: number; y: number; text: string; hint: string }) => request<PagePin>(`/api/pages/${encodeURIComponent(pageId)}/pins`, json(body)),
  cases: () => request<CaseSummary[]>("/api/cases"),
  case: (id: string) => request<CaseDetail>(`/api/cases/${id}`),
  createCase: (form: FormData) => request<{ id: string; runError: string | null }>("/api/cases", { method: "POST", body: form }),
  feedback: (id: string, section: string, text: string) => request<CaseDetail>(`/api/cases/${id}/feedback`, json({ section, text })),
  decide: (id: string, to: CaseStatus, note: string) => request<CaseDetail>(`/api/cases/${id}/decision`, json({ to, note })),
  run: (id: string) => request<RunSummary>(`/api/cases/${id}/runs`, { method: "POST" }),
  cancelRun: (runId: string) => request<{ ok: boolean }>(`/api/runs/${runId}/cancel`, { method: "POST" }),
  library: () => request<LibraryPayload>("/api/library"),
  inputUrl: (id: string, name: string) => `/api/cases/${id}/inputs/${encodeURIComponent(name)}`,
};

/** Streams run events over SSE using fetch (keeps the Studio header on the request). */
export function streamRun(runId: string, onEvent: (e: RunEvent) => void, onEnd: () => void): () => void {
  const controller = new AbortController();
  void (async () => {
    try {
      const res = await fetch(`/api/runs/${runId}/events`, { headers: headers(), signal: controller.signal });
      if (!res.body) return onEnd();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          if (frame.startsWith("event: end")) return onEnd();
          const data = frame.split("\n").find((l) => l.startsWith("data: "));
          if (data) onEvent(JSON.parse(data.slice(6)) as RunEvent);
        }
      }
      onEnd();
    } catch {
      if (!controller.signal.aborted) onEnd();
    }
  })();
  return () => controller.abort();
}
