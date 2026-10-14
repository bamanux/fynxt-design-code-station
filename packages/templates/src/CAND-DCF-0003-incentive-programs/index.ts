import "./IncentivePrograms.css";

export { IncentivePrograms } from "./IncentivePrograms";
export type { IncentiveProgramsProps } from "./IncentivePrograms";
export { ProgramEditor } from "./ProgramEditor";
export { ProgramList } from "./ProgramList";
export { createProgramsMemoryAdapter } from "./memoryAdapter";
export type { MemoryAdapterOptions as ProgramsMemoryAdapterOptions } from "./memoryAdapter";
export type * from "./types";

/** Candidate metadata. Not a registered template: the FYNXT-TPL id is assigned at /fdi-publish. */
export const INCENTIVE_PROGRAMS_CANDIDATE = {
  candidateId: "CAND-DCF-0003-incentive-programs",
  status: "DRAFT",
  version: "0.1.0",
  caseFile: "design-cases/DCF-0003-object-enrolment/case-file.md",
} as const;
