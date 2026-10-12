/** Types shared by the Studio server and client. */

export const CASE_STATUSES = [
  "NEW",
  "DRAFT",
  "IN-REVIEW",
  "CHANGES-REQUESTED",
  "APPROVED",
  "DESIGN-IN-PROGRESS",
  "DESIGN-REVIEW",
  "DESIGN-CHANGES-REQUESTED",
  "DESIGN-APPROVED",
  "CODE-IN-PROGRESS",
  "CODE-REVIEW",
  "CODE-CHANGES-REQUESTED",
  "CODE-APPROVED",
  "PUBLISHED",
  "BLOCKED",
] as const;
/** `NEW` is Studio-only: request received, FDI intake not finished yet. */
export type CaseStatus = (typeof CASE_STATUSES)[number];

export type Stage = "case-file" | "design" | "code" | "published";
export type RunStage = "intake" | "revise" | "figma" | "build" | "publish";

export interface StudioUser {
  name: string;
  role: string;
}

export interface CaseSummary {
  id: string;
  folder: string;
  title: string;
  module: string;
  status: CaseStatus;
  revision: number;
  owner: string;
  requestedBy: string;
  created: string;
  updated: string;
  openFeedback: number;
  openQuestions: number;
  figmaUrl: string | null;
  prUrl: string | null;
  activeRun: RunSummary | null;
  waitingOn: { roles: string[]; text: string };
}

export interface TableRow {
  cells: string[];
}

export interface FeedbackItem {
  ref: string;
  revision: string;
  reviewer: string;
  section: string;
  feedback: string;
  resolution: string;
  closed: boolean;
}

export interface HistoryItem {
  date: string;
  transition: string;
  who: string;
  note: string;
}

export interface InputFile {
  name: string;
  size: number;
}

export type CaseAction =
  | { kind: "decide"; to: CaseStatus; label: string; tone: "approve" | "changes"; requiresNote: boolean }
  | { kind: "run"; stage: RunStage; label: string; available: boolean; reason?: string };

export interface CaseDetail extends CaseSummary {
  markdown: string | null;
  feedback: FeedbackItem[];
  history: HistoryItem[];
  openQuestionsTable: string[][];
  inputs: InputFile[];
  runs: RunSummary[];
  actions: CaseAction[];
  canComment: boolean;
}

export type RunState = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface RunSummary {
  id: string;
  caseId: string;
  stage: RunStage;
  state: RunState;
  startedBy: string;
  startedAt: string;
  finishedAt: string | null;
  costUsd: number | null;
  resultText: string | null;
}

export interface RunEvent {
  at: string;
  kind: "status" | "text" | "tool" | "result" | "error";
  text: string;
}

export interface TokenEntry {
  name: string;
  cssVar: string;
  type: string;
  value: string;
  resolved: string;
  modes: Record<string, string> | null;
}

export interface LibraryComponent {
  name: string;
  path: string;
  figmaUrls: string[];
  hasTest: boolean;
  hasCodeConnect: boolean;
}

export interface LibraryTemplate {
  id: string;
  name: string;
  category: string;
  status: string;
  version: string;
  placeholder: boolean;
  description: string;
}

export interface GalleryPage {
  id: string;
  label: string;
  caseId: string | null;
  template: string | null;
}
export interface GallerySection {
  id: string;
  label: string;
  pages: GalleryPage[];
}
export interface GalleryModule {
  id: string;
  label: string;
  sections: GallerySection[];
}

export interface LibraryPayload {
  tokens: { version: string; status: string; groups: Record<string, TokenEntry[]> };
  components: LibraryComponent[];
  templates: LibraryTemplate[];
  gallery: GalleryModule[];
}

export interface StudioMeta {
  roles: string[];
  authMode: "local";
  agentReady: boolean;
  agentProblem: string | null;
  model: string;
  maxBudgetUsd: number;
  permissionsNote: string;
}
