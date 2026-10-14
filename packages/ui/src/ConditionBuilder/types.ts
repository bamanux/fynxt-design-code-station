/** DCF-0003 ConditionBuilder: data model. A candidate pattern (CLAUDE.md §16, DCF-0003 Q22). */

export type ConditionFieldType = "list" | "number" | "date" | "text";
export type Match = "all" | "any";

export interface ConditionOption {
  value: string;
  label: string;
}

export interface ConditionField {
  id: string;
  label: string;
  type: ConditionFieldType;
  /** Value list for `list` fields (from the CRM, DCF-0003 B1 / R8). */
  options?: ConditionOption[];
}

export interface ConditionObject {
  id: string;
  label: string;
  fields: ConditionField[];
}

export interface ConditionOperator {
  id: string;
  label: string;
  /** How many values the operator takes. `multi` renders a multi-select (list fields). */
  valueShape: "single" | "multi" | "none";
}

export type RuleValue = string | string[] | null;

export interface ConditionRule {
  kind: "rule";
  id: string;
  object: string;
  field: string;
  condition: string;
  value: RuleValue;
  /** Snapshot of the field label when saved, so a deleted CRM field can still be named (DCF-0003 Q9). */
  fieldLabel?: string;
}

export interface ConditionGroup {
  kind: "group";
  id: string;
  match: Match;
  /** Rules only: groups never nest (DCF-0003 I1 U5). */
  rules: ConditionRule[];
}

export type ConditionItem = ConditionRule | ConditionGroup;

export interface ConditionValue {
  match: Match;
  items: ConditionItem[];
}

export interface ConditionLimits {
  rules?: number;
  groups?: number;
  rulesPerGroup?: number;
}
