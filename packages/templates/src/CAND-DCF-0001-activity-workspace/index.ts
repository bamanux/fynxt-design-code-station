import "./ActivityWorkspace.css";

export { ActivityWorkspace } from "./ActivityWorkspace";
export type { ActivityWorkspaceProps } from "./ActivityWorkspace";
export { createMemoryAdapter } from "./memoryAdapter";
export type { MemoryAdapterOptions } from "./memoryAdapter";
export { validate as validateForm } from "./FormDialog";
export type * from "./types";

/** Candidate metadata. Not a registered template: the FYNXT-TPL id is assigned at /fdi-publish. */
export const ACTIVITY_WORKSPACE_CANDIDATE = {
  candidateId: "CAND-DCF-0001-activity-workspace",
  status: "DRAFT",
  version: "0.1.0",
  caseFile: "design-cases/DCF-0001-crm-tasks/case-file.md",
} as const;
