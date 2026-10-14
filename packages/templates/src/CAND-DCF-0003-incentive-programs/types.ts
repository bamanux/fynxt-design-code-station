import type { BadgeStatus, ConditionFieldType, ConditionLimits, ConditionObject, ConditionOperator, ConditionValue, Match, SideNavItem } from "@fynxt/ui";

/**
 * Incentive Programs: DRAFT candidate template from DCF-0003. A programs list (in the app shell)
 * that opens a full-screen, three-step create / edit editor (DCF-0002 pattern: header + footer).
 *
 * Business rules are NOT encoded here. Who enrols is decided by the backend (DCF-0003 B2).
 * Everything the case file lists as a PROPOSAL (§10.1) is configuration, so it can change
 * without touching the template.
 */

export interface ProgramOption {
  value: string;
  label: string;
}

export interface Participant {
  id: string;
  name: string;
  /** Secondary identifier shown under the name, e.g. "CL-10482 · aisha@example.com". */
  ref: string;
  /** Participant type value (Client / IB). */
  type: string;
}

export interface ManualEntry {
  participant: Participant;
  addedBy: string;
  /** ISO date. */
  addedAt: string;
}

export interface BlockedEntry {
  participant: Participant;
  reason?: string;
  blockedBy: string;
  /** ISO date. */
  blockedAt: string;
}

export interface ProgramRecord {
  id: string;
  /** Human-readable id, e.g. "IP-1024". */
  code: string;
  name: string;
  description?: string;
  participantType: string;
  criteria: ConditionValue;
  manual: ManualEntry[];
  blocked: BlockedEntry[];
  status: string;
  /** Null when not known yet (e.g. a draft). */
  enrolledCount: number | null;
  /** ISO date. */
  updatedAt: string;
  updatedBy: string;
}

export type ProgramInput = Pick<ProgramRecord, "name" | "description" | "participantType" | "criteria" | "manual" | "blocked">;

export interface ProgramListQuery {
  search: string;
  status: string;
  participantType: string;
}

/** DEVELOPER INTEGRATION REQUIREMENT: the template never fetches or computes business data itself (DCF-0003 Q19). */
export interface ProgramsAdapter {
  list(query: ProgramListQuery): Promise<ProgramRecord[]>;
  get(id: string): Promise<ProgramRecord>;
  /** CRM objects and fields usable in rules for a participant type (DCF-0003 B1, Q7). */
  schema(participantType: string): Promise<ConditionObject[]>;
  /** Search CRM participants of a type by name, email or id. */
  searchParticipants(participantType: string, query: string): Promise<Participant[]>;
  /** `draft` keeps the program in its draft state; `submit` is Create program / Save changes. */
  create(input: ProgramInput, mode: "draft" | "submit"): Promise<ProgramRecord>;
  update(id: string, input: ProgramInput, mode: "draft" | "submit"): Promise<ProgramRecord>;
  duplicate(id: string): Promise<ProgramRecord>;
  setStatus(id: string, status: string): Promise<ProgramRecord>;
}

export type ProgramAction = "create" | "edit" | "duplicate" | "deactivate" | "viewParticipants";

/** REQUIRED. Permissions come from the product (DCF-0003 Q16), never from the template. */
export type ProgramPermissionCheck = (action: ProgramAction, program?: ProgramRecord) => boolean;

export interface ParticipantTypeConfig extends ProgramOption {
  description: string;
  /** Object ids rules may use for this type. Changing type removes rules on other objects (Q7 proposal). */
  objects: string[];
}

export interface StatusConfig extends ProgramOption {
  tone: BadgeStatus;
}

export interface ProgramsShellConfig {
  title: string;
  nav: SideNavItem[];
  activeNavId: string;
  logo: string;
  logoMark: string;
}

export interface IncentiveProgramsConfig {
  /** Omit to render the list without the app shell (e.g. inside another host). */
  shell?: ProgramsShellConfig;
  adapter: ProgramsAdapter;
  can: ProgramPermissionCheck;
  /** Display name for "by …" stamps. */
  currentUser: string;
  participantTypes: ParticipantTypeConfig[];
  /** Operators per field type (Q4 proposal). */
  operatorsByType: Record<ConditionFieldType, ConditionOperator[]>;
  limits?: ConditionLimits;
  newGroupMatch?: Match;
  statuses: StatusConfig[];
  /** Status a new program gets on "Save draft". */
  draftStatus: string;
  /** Statuses that mean "live": editing shows the live banner (Q16 / Q29). */
  liveStatuses: string[];
  /** Status that "Deactivate" sets (Q37). Omit to hide the action. */
  deactivatedStatus?: string;
  /** Next / Create need at least one rule or manual participant (Q10 proposal). */
  requireCriteria: boolean;
  /** Saving is blocked while a rule uses a deleted CRM field (Q9 proposal). */
  blockSaveOnStaleRules: boolean;
  copy: {
    pageTitle: string;
    sectionTitle: string;
    sectionDescription: string;
    /** "Who gets enrolled" explainer (Q3 proposal). */
    enrollmentExplainer: string;
    liveBanner: string;
  };
}
