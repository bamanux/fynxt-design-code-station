import type { ActivityDataAdapter, ActivityInput, ActivityRecord, Association, Comment, ListQuery, Option } from "./types";

/**
 * GALLERY / TEST ONLY. In-memory ActivityDataAdapter for previewing the template without an API
 * (DCF-0001 Q24: the real contract is unknown). It holds no business rules of its own: view scope
 * and metric definitions are passed in by the host, so they stay visible as open questions.
 */
export interface MemoryAdapterOptions {
  records: ActivityRecord[];
  users: Option[];
  associable: Association[];
  comments?: Record<string, Comment[]>;
  /** Name recorded as creator / comment author. */
  currentUser: string;
  /** Which records a view (tab) shows. Host-defined (Q4). */
  inView: (view: string, record: ActivityRecord) => boolean;
  /** Metric values for a view. Host-defined (Q8). */
  metrics: (records: ActivityRecord[]) => Record<string, number>;
  /** Simulated latency in ms (0 in tests). */
  latency?: number;
  /** Clock, for deterministic tests. */
  now?: () => Date;
}

export function createMemoryAdapter(opts: MemoryAdapterOptions): ActivityDataAdapter {
  let records = opts.records.map((r) => ({ ...r }));
  const comments: Record<string, Comment[]> = { ...(opts.comments ?? {}) };
  let seq = 1000;
  const now = opts.now ?? (() => new Date());
  const wait = <T>(v: T) => new Promise<T>((res) => setTimeout(() => res(v), opts.latency ?? 0));
  const find = (id: string) => {
    const r = records.find((x) => x.id === id);
    if (!r) throw new Error(`Record ${id} not found`);
    return r;
  };
  const patch = (id: string, change: Partial<ActivityRecord>) => {
    const next = { ...find(id), ...change };
    records = records.map((r) => (r.id === id ? next : r));
    return wait(next);
  };
  const fromInput = (input: ActivityInput) => ({
    title: input.title,
    description: input.description,
    priority: input.priority,
    tags: input.tags,
    scheduledAt: input.scheduledAt,
    reminder: input.reminder,
    assignees: input.assignees,
    associations: input.associations,
  });

  return {
    list(q: ListQuery) {
      const term = q.search.trim().toLowerCase();
      const active = Object.entries(q.filters).filter(([, v]) => v);
      return wait(
        records.filter(
          (r) =>
            opts.inView(q.view, r) &&
            (!term || r.title.toLowerCase().includes(term) || r.description.toLowerCase().includes(term)) &&
            // All active filters must match (AND), per I1 AC3.
            active.every(([key, v]) => (r as unknown as Record<string, unknown>)[key] === v)
        )
      );
    },
    insights: (view) => wait(opts.metrics(records.filter((r) => opts.inView(view, r)))),
    users: () => wait(opts.users),
    associable: () => wait(opts.associable),
    create(input) {
      const r: ActivityRecord = {
        id: `r${++seq}`,
        activityType: input.activityType ?? "Task",
        status: records[0]?.status ?? "",
        attachments: [],
        followUps: [],
        commentCount: 0,
        createdBy: opts.currentUser,
        createdAt: now().toISOString(),
        ...fromInput(input),
      };
      records = [r, ...records];
      return wait(r);
    },
    update: (id, input) => patch(id, fromInput(input)),
    duplicate(id) {
      const src = find(id);
      const copy: ActivityRecord = { ...src, id: `r${++seq}`, commentCount: 0, followUps: [], createdBy: opts.currentUser, createdAt: now().toISOString() };
      records = [copy, ...records];
      return wait(copy);
    },
    remove(id) {
      find(id);
      records = records.filter((r) => r.id !== id);
      return wait(undefined);
    },
    setStatus: (id, status) => patch(id, { status }),
    setReminder: (id, reminder) => patch(id, { reminder }),
    addFollowUp: (id, f) => patch(id, { followUps: [...find(id).followUps, { ...f, id: `f${++seq}` }] }),
    comments: (id) => wait([...(comments[id] ?? [])]),
    async addComment(id, text) {
      const c: Comment = { id: `c${++seq}`, author: opts.currentUser, createdAt: now().toISOString(), text };
      comments[id] = [...(comments[id] ?? []), c];
      await patch(id, { commentCount: comments[id].length });
      return c;
    },
  };
}
