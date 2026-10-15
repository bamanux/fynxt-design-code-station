import type { ConditionObject } from "@fynxt/ui";
import type { ScoreModel, ScoreModelInput, ScoreModelQuery, ScoreModelsAdapter } from "./types";

/**
 * GALLERY / TEST ONLY. In-memory ScoreModelsAdapter for previewing the template without an API
 * (DCF-0002 Q24: the real contract is unknown). It scores nothing.
 */
export interface ScoreMemoryAdapterOptions {
  models: ScoreModel[];
  schema: ConditionObject[];
  currentUser: string;
  /** Status a new model gets on save (Q3). */
  savedStatus: string;
  /** Status a duplicate gets (Q67). */
  draftStatus: string;
  latency?: number;
  now?: () => Date;
  /** Make the next save fail, to preview the save-error state. */
  failNextSave?: boolean;
}

export function createScoreMemoryAdapter(opts: ScoreMemoryAdapterOptions): ScoreModelsAdapter {
  let models = opts.models.map((m) => structuredClone(m));
  let seq = Math.max(2000, ...models.map((m) => Number(m.code) || 0));
  let failNext = Boolean(opts.failNextSave);
  const now = opts.now ?? (() => new Date());
  const today = () => now().toISOString().slice(0, 10);
  const wait = <T>(v: T) => new Promise<T>((res) => setTimeout(() => res(structuredClone(v)), opts.latency ?? 0));
  const find = (id: string) => {
    const m = models.find((x) => x.id === id);
    if (!m) throw new Error(`Score model ${id} not found`);
    return m;
  };
  const save = (m: ScoreModel) => {
    models = models.some((x) => x.id === m.id) ? models.map((x) => (x.id === m.id ? m : x)) : [...models, m];
    return wait(m);
  };
  const failing = () => {
    if (!failNext) return false;
    failNext = false;
    return true;
  };
  return {
    list: (q: ScoreModelQuery) =>
      wait(
        models.filter(
          (m) =>
            (!q.search || `${m.name} ${m.code}`.toLowerCase().includes(q.search.toLowerCase())) &&
            (!q.status || m.status === q.status) &&
            (!q.object || m.objects.some((g) => g.object === q.object))
        )
      ),
    get: (id) => {
      try {
        return wait(find(id));
      } catch (e) {
        return Promise.reject(e);
      }
    },
    schema: () => wait(opts.schema),
    create: (input: ScoreModelInput) => {
      if (failing()) return Promise.reject(new Error("Network error"));
      const code = String(++seq);
      return save({ ...structuredClone(input), id: `m${code}`, code, status: opts.savedStatus, updatedAt: today(), updatedBy: opts.currentUser });
    },
    update: (id, input) => {
      if (failing()) return Promise.reject(new Error("Network error"));
      return save({ ...find(id), ...structuredClone(input), updatedAt: today(), updatedBy: opts.currentUser });
    },
    duplicate: (id, name) => {
      const code = String(++seq);
      return save({ ...structuredClone(find(id)), id: `m${code}`, code, name, status: opts.draftStatus, updatedAt: today(), updatedBy: opts.currentUser });
    },
    remove: (id) => {
      find(id);
      models = models.filter((m) => m.id !== id);
      return wait(undefined);
    },
    setStatus: (id, status) => save({ ...find(id), status, updatedAt: today(), updatedBy: opts.currentUser }),
  };
}

/** Q67 (Aman Bansal, 2026-10-15): "Name_copy(0count)", read as `<Name>_copy(n)` with n counting copies. To confirm. */
export function defaultDuplicateName(name: string, existingNames: string[]): string {
  const base = name.replace(/_copy\(\d+\)$/, "");
  let n = 1;
  while (existingNames.includes(`${base}_copy(${n})`)) n++;
  return `${base}_copy(${n})`;
}
