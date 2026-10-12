import type { CaseDetail, CaseStatus, CaseSummary, LibraryPayload, RunEvent, RunSummary, StudioMeta, StudioUser } from "../../shared/types";

let currentUser: StudioUser | null = null;
export function setApiUser(user: StudioUser | null) {
  currentUser = user;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    ...(currentUser ? { "X-FDI-User": encodeURIComponent(currentUser.name), "X-FDI-Role": encodeURIComponent(currentUser.role) } : {}),
    ...extra,
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { ...init, headers: headers(init.headers as Record<string, string> | undefined) });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`);
  return body as T;
}

const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

export const api = {
  meta: () => request<StudioMeta>("/api/meta"),
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

/** Streams run events over SSE using fetch (EventSource can't send identity headers). */
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
