import "./ScoreBuilder.css";

export { ScoreBuilder } from "./ScoreBuilder";
export type { ScoreBuilderProps } from "./ScoreBuilder";
export { ScoreEditor } from "./ScoreEditor";
export { ScoreModelList } from "./ScoreModelList";
export { createScoreMemoryAdapter, defaultDuplicateName } from "./memoryAdapter";
export type { ScoreMemoryAdapterOptions } from "./memoryAdapter";
export { collectIssues, distribute, bandProblem, wordCount } from "./model";
export type { Issue, Selection } from "./model";
export type * from "./types";

/** Candidate metadata. Not a registered template: the FYNXT-TPL id is assigned at /fdi-publish. */
export const SCORE_BUILDER_CANDIDATE = {
  candidateId: "CAND-DCF-0002-score-builder",
  status: "DRAFT",
  version: "0.1.0",
  caseFile: "design-cases/DCF-0002-scoring-builder/case-file.md",
  figmaVersion: "2410527021694858974",
} as const;
