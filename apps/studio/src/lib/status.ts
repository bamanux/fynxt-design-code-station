import type { BadgeStatus } from "@fynxt/ui";
import type { CaseStatus } from "../../shared/types";

export const STAGES = [
  { id: "case-file", label: "Case file" },
  { id: "design", label: "Figma design" },
  { id: "code", label: "Code" },
  { id: "published", label: "Published" },
] as const;
export type StageId = (typeof STAGES)[number]["id"];

const INFO: Record<CaseStatus, { label: string; badge: BadgeStatus; solid?: boolean; stage: StageId }> = {
  NEW: { label: "Queued for FDI", badge: "info", stage: "case-file" },
  DRAFT: { label: "Drafting", badge: "neutral", stage: "case-file" },
  "IN-REVIEW": { label: "Case file review", badge: "warning", stage: "case-file" },
  "CHANGES-REQUESTED": { label: "Changes requested", badge: "error", stage: "case-file" },
  APPROVED: { label: "Case file approved", badge: "success", stage: "design" },
  "DESIGN-IN-PROGRESS": { label: "Designing", badge: "info", stage: "design" },
  "DESIGN-REVIEW": { label: "Design review", badge: "warning", stage: "design" },
  "DESIGN-CHANGES-REQUESTED": { label: "Design changes", badge: "error", stage: "design" },
  "DESIGN-APPROVED": { label: "Design approved", badge: "success", stage: "code" },
  "CODE-IN-PROGRESS": { label: "Building", badge: "info", stage: "code" },
  "CODE-REVIEW": { label: "Code review", badge: "warning", stage: "code" },
  "CODE-CHANGES-REQUESTED": { label: "Code changes", badge: "error", stage: "code" },
  "CODE-APPROVED": { label: "Code approved", badge: "success", stage: "published" },
  PUBLISHED: { label: "Published", badge: "primary", solid: true, stage: "published" },
  BLOCKED: { label: "Blocked", badge: "error", solid: true, stage: "case-file" },
};

export const statusInfo = (s: CaseStatus) => INFO[s];

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
