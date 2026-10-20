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

/** The signed-in person. Identity comes from Microsoft 365 sign-in (or dev sign-in); roles from the Station user list. */
export interface StudioUser {
  email: string;
  name: string;
  /** Station roles assigned by an Admin (one or more of fdi.config.json studio.roles). */
  roles: string[];
  /** Admins manage Station users and roles, and can see every case. Not an approval role. */
  isAdmin: boolean;
}

/** "Name (Role, Role)" — how a person is written into case files and run logs. */
export function userLabel(u: Pick<StudioUser, "name" | "roles">): string {
  return `${u.name} (${u.roles.length ? u.roles.join(", ") : "no role"})`;
}

/** A Station user as an Admin sees it. */
export interface StationUser extends StudioUser {
  active: boolean;
  invitedBy: string | null;
  invitedAt: string | null;
  lastSignInAt: string | null;
}

export interface CaseMember {
  email: string;
  name: string;
  roles: string[];
  isOwner: boolean;
  isCreator: boolean;
}

/** An image in the case's figma/ folder: approved design frames or screenshots of the built page. */
export interface DesignAsset {
  name: string;
  group: "design" | "build";
  url: string;
}

/** A comment pinned to a spot on a built gallery page. It is also written to the case as §11 feedback. */
export interface PagePin {
  id: string;
  pageId: string;
  caseId: string;
  /** Position as a percentage of the page area, so pins survive different widths. */
  x: number;
  y: number;
  text: string;
  /** What was under the pointer, e.g. a button label. */
  hint: string;
  author: string;
  createdAt: string;
  feedbackRef: string;
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
  /** Set when the case was raised from a gallery page as a change to it. */
  changeOf: ChangeOf | null;
  /** Email of the person who created the case in Studio (null for cases created before membership). */
  creatorEmail: string | null;
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
  members: CaseMember[];
  /** Creator, owner or Admin: may invite and remove members. */
  canManageMembers: boolean;
  design: DesignAsset[];
  /** Gallery page built by this case, if registered. */
  builtPageId: string | null;
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

/** The gallery page (and the case that built it) a change request refers to. */
export interface ChangeOf {
  pageId: string;
  pageLabel: string;
  caseId: string | null;
  template: string | null;
}

/** A page Studio can show: published (menu.json) or registered for review (pages.json). */
export interface GalleryEntry {
  id: string;
  label: string;
  module: string;
  section: string;
  caseId: string | null;
  caseStatus: CaseStatus | null;
  template: string | null;
  published: boolean;
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
  /** Published and in-review pages with their case status (Gallery menu and page header). */
  galleryEntries: GalleryEntry[];
}

export interface StudioMeta {
  roles: string[];
  /** "entra" = Microsoft 365 sign-in; "dev" = development sign-in by email, never for production. */
  authMode: "entra" | "dev";
  allowedDomain: string;
  agentReady: boolean;
  agentProblem: string | null;
  model: string;
  maxBudgetUsd: number;
  permissionsNote: string;
}

/** "View code": Station files behind a page, component or case, opened in the person's editor. */
export interface CodeFile {
  /** Path from the Station root, e.g. "packages/ui/src/Select/Select.tsx". */
  path: string;
  /** Section heading in the list, e.g. "Page", "Template · CAND-…", "Components (@fynxt/ui)". */
  group: string;
  /** The file is not in the current checkout (case files on another branch). */
  missing?: boolean;
}

export interface CodeFiles {
  /** Station root on the Studio machine; people can override it with their own clone's path. */
  root: string;
  title: string;
  /** Folder to open as a whole, when there is one (template or component folder). */
  folder: string | null;
  /** Case branch, for case code. */
  branch?: string;
  files: CodeFile[];
  note?: string;
}
