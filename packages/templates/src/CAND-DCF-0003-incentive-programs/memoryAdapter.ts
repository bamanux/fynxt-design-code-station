import type { ConditionObject } from "@fynxt/ui";
import type { ProgramListQuery, Participant, ProgramInput, ProgramRecord, ProgramsAdapter } from "./types";

/**
 * GALLERY / TEST ONLY. In-memory ProgramsAdapter for previewing the template without an API
 * (DCF-0003 Q19: the real contract is unknown). It evaluates no enrolment rules.
 */
export interface MemoryAdapterOptions {
  programs: ProgramRecord[];
  schemas: Record<string, ConditionObject[]>;
  participants: Participant[];
  currentUser: string;
  draftStatus: string;
  /** Status a submitted program gets (Q42). */
  submittedStatus: string;
  latency?: number;
  now?: () => Date;
  /** Make schema() fail, to preview the CRM error state. */
  failSchema?: boolean;
}

export function createProgramsMemoryAdapter(opts: MemoryAdapterOptions): ProgramsAdapter {
  let programs = opts.programs.map((p) => ({ ...p }));
  let seq = 2000;
  const now = opts.now ?? (() => new Date());
  const today = () => now().toISOString().slice(0, 10);
  const wait = <T>(v: T) => new Promise<T>((res) => setTimeout(() => res(v), opts.latency ?? 0));
  const find = (id: string) => {
    const p = programs.find((x) => x.id === id);
    if (!p) throw new Error(`Program ${id} not found`);
    return p;
  };
  const save = (p: ProgramRecord) => {
    programs = programs.some((x) => x.id === p.id) ? programs.map((x) => (x.id === p.id ? p : x)) : [p, ...programs];
    return wait({ ...p });
  };
  return {
    list: (q: ProgramListQuery) =>
      wait(
        programs.filter(
          (p) =>
            (!q.search || `${p.name} ${p.code}`.toLowerCase().includes(q.search.toLowerCase())) &&
            (!q.status || p.status === q.status) &&
            (!q.participantType || p.participantType === q.participantType)
        )
      ),
    get: (id) => wait({ ...find(id) }),
    schema: (type) => (opts.failSchema ? Promise.reject(new Error("CRM unavailable")) : wait(opts.schemas[type] ?? [])),
    searchParticipants: (type, query) =>
      wait(opts.participants.filter((p) => p.type === type && `${p.name} ${p.ref}`.toLowerCase().includes(query.toLowerCase()))),
    create: (input: ProgramInput, mode) => {
      const id = `p${++seq}`;
      return save({ ...input, id, code: `IP-${seq}`, status: mode === "draft" ? opts.draftStatus : opts.submittedStatus, enrolledCount: null, updatedAt: today(), updatedBy: opts.currentUser });
    },
    update: (id, input, mode) => {
      const prev = find(id);
      const status = mode === "draft" ? prev.status : prev.status === opts.draftStatus ? opts.submittedStatus : prev.status;
      return save({ ...prev, ...input, status, updatedAt: today(), updatedBy: opts.currentUser });
    },
    duplicate: (id) => {
      const prev = find(id);
      const copyId = `p${++seq}`;
      return save({ ...prev, id: copyId, code: `IP-${seq}`, name: `${prev.name} (copy)`, status: opts.draftStatus, enrolledCount: null, updatedAt: today(), updatedBy: opts.currentUser });
    },
    setStatus: (id, status) => save({ ...find(id), status, updatedAt: today(), updatedBy: opts.currentUser }),
  };
}
