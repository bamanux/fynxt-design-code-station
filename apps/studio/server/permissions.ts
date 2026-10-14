import type { CaseAction, CaseStatus, RunStage, StudioUser } from "../shared/types";
import { fdiConfig, type FdiConfig } from "./env";

type Gate = "caseFile" | "design" | "code";
type Decision = { to: CaseStatus; label: string; tone: "approve" | "changes"; gate?: Gate };

/**
 * Sends a built page's feedback (e.g. pinned comments) back through every level: case file → Figma → code.
 * Owned by the case-file approver (Product Designer). agent/fdi/README.md §3, "Reopen".
 */
const REOPEN: Decision = { to: "CHANGES-REQUESTED", label: "Send feedback to FDI (update case file, design and code)", tone: "changes", gate: "caseFile" };

/** Human decisions available at each review gate (agent/fdi/README.md §3). */
const DECISIONS: Partial<Record<CaseStatus, Decision[]>> = {
  "IN-REVIEW": [
    { to: "APPROVED", label: "Approve case file", tone: "approve" },
    { to: "CHANGES-REQUESTED", label: "Request changes", tone: "changes" },
  ],
  "DESIGN-REVIEW": [
    { to: "DESIGN-APPROVED", label: "Approve design", tone: "approve" },
    { to: "DESIGN-CHANGES-REQUESTED", label: "Request design changes", tone: "changes" },
  ],
  "CODE-REVIEW": [
    { to: "CODE-APPROVED", label: "Approve code", tone: "approve" },
    { to: "CODE-CHANGES-REQUESTED", label: "Request code changes", tone: "changes" },
    REOPEN,
  ],
  "CODE-APPROVED": [REOPEN],
  PUBLISHED: [REOPEN],
};

/** Which FDI stage a status unlocks (the gate the command itself re-checks). */
const NEXT_RUN: Partial<Record<CaseStatus, { stage: RunStage; label: string }>> = {
  NEW: { stage: "intake", label: "Run FDI intake" },
  "CHANGES-REQUESTED": { stage: "revise", label: "Run FDI revise" },
  APPROVED: { stage: "figma", label: "Generate Figma design" },
  "DESIGN-CHANGES-REQUESTED": { stage: "figma", label: "Update Figma design" },
  "DESIGN-APPROVED": { stage: "build", label: "Build code in Station" },
  "CODE-CHANGES-REQUESTED": { stage: "build", label: "Rebuild code" },
  "CODE-APPROVED": { stage: "publish", label: "Publish to gallery" },
};

/** "*" allows every signed-in user; otherwise the user needs at least one of the listed roles. */
function allows(rule: "*" | string[], roles: string[]): boolean {
  return rule === "*" || roles.some((r) => rule.includes(r));
}

export function canSubmit(user: StudioUser, cfg: FdiConfig = fdiConfig()): boolean {
  return allows(cfg.studio.permissions.submitRequest, user.roles);
}

export function canComment(user: StudioUser, cfg: FdiConfig = fdiConfig()): boolean {
  return allows(cfg.studio.permissions.comment, user.roles);
}

export function decisionsFor(status: CaseStatus) {
  return DECISIONS[status] ?? [];
}

/** Whether the user may take this decision: the decision's own gate, else the status's gate from config. */
export function canDecide(user: StudioUser, status: CaseStatus, decision?: Decision, cfg: FdiConfig = fdiConfig()): boolean {
  const gate = decision?.gate ?? cfg.studio.permissions.decide[status];
  return gate !== undefined && cfg.approvers[gate].some((r) => user.roles.includes(r));
}

export function stageFor(status: CaseStatus): RunStage | null {
  return NEXT_RUN[status]?.stage ?? null;
}

export function canRun(user: StudioUser, stage: RunStage, cfg: FdiConfig = fdiConfig()): boolean {
  if (stage === "intake") return canSubmit(user, cfg);
  return allows(cfg.studio.permissions.runStage[stage] ?? [], user.roles);
}

/** Why a stage can't run headlessly from Studio, or null when it can. */
export function headlessBlocker(stage: RunStage, cfg: FdiConfig = fdiConfig()): string | null {
  return stage === "figma" ? cfg.studio.headlessRuns.figma : null;
}

export function actionsFor(user: StudioUser, status: CaseStatus, busy: boolean, cfg: FdiConfig = fdiConfig()): CaseAction[] {
  const actions: CaseAction[] = [];
  if (!busy) {
    for (const d of decisionsFor(status)) {
      if (canDecide(user, status, d, cfg)) actions.push({ kind: "decide", to: d.to, label: d.label, tone: d.tone, requiresNote: d.tone === "changes" });
    }
  }
  const next = NEXT_RUN[status];
  if (next && canRun(user, next.stage, cfg)) {
    const blocker = busy ? "FDI is already working on this case." : headlessBlocker(next.stage, cfg);
    actions.push({ kind: "run", stage: next.stage, label: next.label, available: blocker === null, ...(blocker ? { reason: blocker } : {}) });
  }
  return actions;
}

/** Who acts next at each status, for "Needs you" and the cases list. */
export function waitingOn(status: CaseStatus, cfg: FdiConfig = fdiConfig()): { roles: string[]; text: string } {
  const run = (stage: RunStage) => cfg.studio.permissions.runStage[stage] ?? [];
  switch (status) {
    case "NEW":
    case "DRAFT":
    case "DESIGN-IN-PROGRESS":
    case "CODE-IN-PROGRESS":
      return { roles: [], text: "FDI is working" };
    case "IN-REVIEW":
      return { roles: cfg.approvers.caseFile, text: "Case file review" };
    case "CHANGES-REQUESTED":
      return { roles: run("revise"), text: "Run FDI revise" };
    case "APPROVED":
    case "DESIGN-CHANGES-REQUESTED":
      return { roles: run("figma"), text: "Figma design (run /fdi-figma in Claude Code)" };
    case "DESIGN-REVIEW":
      return { roles: cfg.approvers.design, text: "Design review in Figma" };
    case "DESIGN-APPROVED":
    case "CODE-CHANGES-REQUESTED":
      return { roles: run("build"), text: "Build code in Station" };
    case "CODE-REVIEW":
      return { roles: cfg.approvers.code, text: "UI code review" };
    case "CODE-APPROVED":
      return { roles: run("publish"), text: "Publish to gallery" };
    case "PUBLISHED":
      return { roles: [], text: "Done" };
    case "BLOCKED":
      return { roles: cfg.approvers.caseFile, text: "Blocked — answer open questions" };
  }
}
