import type { BadgeStatus, ConditionFieldType, ConditionLimits, ConditionObject, ConditionOperator, ConditionValue, SideNavItem, SideNavSettings, SideNavUser } from "@fynxt/ui";

/**
 * Score Builder: DRAFT candidate template from DCF-0002 (approved Figma version 2410527021694858974,
 * prototype v5). A list of score models (in the app shell, Settings › Brand Setup › Score Builder) that
 * opens a full-screen builder without the shell (D17, Q45): logic outline · editor · minimal summary.
 *
 * Business rules are NOT encoded here. The template collects the model; scoring a record is done by
 * the backend. In particular how AND / OR change a score (Q41), how objects relate (Q42), which
 * override wins (Q52) and what Reject / Refer do (Q60) are open questions, so nothing here computes a
 * total. The only arithmetic is the per-value contribution `score × weight` shown in the editor (R10).
 */

export type Logic = "and" | "or";
export type ScoringMethod = "weighted" | "points";

/** One value row of an attribute: a category, the values (or a number range) it matches, and a score. */
export interface ValueRow {
  id: string;
  category: string;
  /** Matched options for list fields. */
  values: string[];
  /** Range for number fields. An empty `to` means "and above". */
  from: string;
  to: string;
  /** Kept as text while editing; validated as a number. */
  score: string;
}

export interface ScoreAttribute {
  id: string;
  /** Field id within the object (from the CRM schema). */
  field: string;
  /** Weight % (weighted) or maximum points (points). Text while editing. */
  weight: string;
  values: ValueRow[];
}

export interface ScoreObjectGroup {
  id: string;
  /** Object id from the CRM schema, e.g. "contact". */
  object: string;
  /** One operator joins all the object's attributes (R14). `null` until chosen (Q43). */
  logic: Logic | null;
  attributes: ScoreAttribute[];
}

/** Outcome band (R12, R26, R29). The last band has an empty `upTo` ("above"). */
export interface Band {
  id: string;
  upTo: string;
  /** Free text, e.g. "Low Risk". */
  label: string;
  /** Optional free text, shown as a tooltip wherever the band appears (D28, max words: config). */
  description: string;
}

export type OverrideOutcomeType = "forceBand" | "atLeastBand" | "setScore" | "reject" | "refer";

/** Override rule (R17–R19, R27–R28). Scoped to an object, or to one attribute of it. */
export interface OverrideRule {
  id: string;
  objectId: string;
  attributeId?: string;
  conditions: ConditionValue;
  outcome: { type: OverrideOutcomeType | ""; value: string };
}

export interface ScoreModelInput {
  name: string;
  description: string;
  method: ScoringMethod;
  /** Model-level "Applies to" conditions (D22). */
  appliesTo: ConditionValue;
  objects: ScoreObjectGroup[];
  /** connectors[i] joins objects[i] and objects[i + 1] (R15). `null` until chosen (Q43). */
  connectors: (Logic | null)[];
  bands: Band[];
  /** In evaluation order (Q52). */
  overrides: OverrideRule[];
}

export interface ScoreModel extends ScoreModelInput {
  id: string;
  /** Human-readable id, e.g. "2001". */
  code: string;
  status: string;
  /** ISO date. */
  updatedAt: string;
  updatedBy: string;
}

export interface ScoreModelQuery {
  search: string;
  status: string;
  object: string;
}

/** DEVELOPER INTEGRATION REQUIREMENT: the template never fetches or computes business data itself (Q4, Q24). */
export interface ScoreModelsAdapter {
  list(query: ScoreModelQuery): Promise<ScoreModel[]>;
  get(id: string): Promise<ScoreModel>;
  /** Scoreable CRM objects with their fields and options (Q4). Also used for Applies to and override conditions. */
  schema(): Promise<ConditionObject[]>;
  create(input: ScoreModelInput): Promise<ScoreModel>;
  update(id: string, input: ScoreModelInput): Promise<ScoreModel>;
  /** Copy name follows `config.duplicateName` (Q67). */
  duplicate(id: string, name: string): Promise<ScoreModel>;
  remove(id: string): Promise<void>;
  setStatus(id: string, status: string): Promise<ScoreModel>;
}

export type ScoreAction = "create" | "edit" | "duplicate" | "delete" | "toggle";

/** REQUIRED. Permissions come from the product (Q15), never from the template. */
export type ScorePermissionCheck = (action: ScoreAction, model?: ScoreModel) => boolean;

export interface ScoreStatusConfig {
  value: string;
  label: string;
  tone: BadgeStatus;
}

export interface ScoreShellConfig {
  title: string;
  nav: SideNavItem[];
  activeNavId: string;
  logo: string;
  logoMark: string;
  settings?: SideNavSettings;
  user?: SideNavUser;
}

export interface ScoreBuilderConfig {
  /** Omit to render the list without the app shell. */
  shell?: ScoreShellConfig;
  adapter: ScoreModelsAdapter;
  can: ScorePermissionCheck;
  currentUser: string;
  statuses: ScoreStatusConfig[];
  /** Status of a newly saved model, and the "on" value of the list toggle (Q3). */
  activeStatus: string;
  /** "Off" value of the list toggle (Q3). */
  inactiveStatus: string;
  /** Status a duplicate gets (Q67, PROPOSED Draft). Drafts have no toggle. */
  draftStatus: string;
  /** Value categories (I1: Low / Medium / High; configurability Q17). */
  categories: string[];
  /** Operators per field type, for Applies to and override conditions (Q5). */
  operatorsByType: Record<ConditionFieldType, ConditionOperator[]>;
  limits?: ConditionLimits;
  /** Override outcomes offered (R19, R27). Labels are product copy. */
  outcomeTypes: { value: OverrideOutcomeType; label: string }[];
  /** Band description limit in words (Q63: 250). */
  descriptionMaxWords: number;
  /** Required total per object: 100 (BR1, Q42 PROPOSED per object). */
  weightTotal: number;
  /** Copy name for Duplicate (Q67: "<Name>_copy(n)"). */
  duplicateName: (name: string, existingNames: string[]) => string;
  copy: {
    pageTitle: string;
    sectionTitle: string;
    sectionDescription: string;
    banner?: { title: string; text: string };
    /** Breadcrumb in the builder header, e.g. ["Settings", "Brand Setup", "Score Builder"]. */
    breadcrumb: string[];
    howItWorks: string;
  };
}
