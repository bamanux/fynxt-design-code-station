import type { ConditionField, ConditionItem, ConditionObject, ConditionOperator, ConditionFieldType, ConditionRule, ConditionValue, Match } from "./types";

/** UI-side helpers. They check the form is filled in; they never decide who enrols. */

export function findField(objects: ConditionObject[], objectId: string, fieldId: string): ConditionField | undefined {
  return objects.find((o) => o.id === objectId)?.fields.find((f) => f.id === fieldId);
}

/** A rule whose object or field is no longer in the schema (a CRM field renamed away or deleted). */
export function isRuleStale(rule: ConditionRule, objects: ConditionObject[]): boolean {
  if (!rule.object || !rule.field) return false;
  return !findField(objects, rule.object, rule.field);
}

export function isRuleComplete(rule: ConditionRule, objects: ConditionObject[], operatorsByType: Record<ConditionFieldType, ConditionOperator[]>): boolean {
  const field = findField(objects, rule.object, rule.field);
  if (!field || !rule.condition) return false;
  const op = operatorsByType[field.type]?.find((o) => o.id === rule.condition);
  if (!op) return false;
  if (op.valueShape === "none") return true;
  if (op.valueShape === "multi") return Array.isArray(rule.value) && rule.value.length > 0;
  return typeof rule.value === "string" && rule.value.trim() !== "";
}

export function allRules(value: ConditionValue): ConditionRule[] {
  return value.items.flatMap((it) => (it.kind === "group" ? it.rules : [it]));
}

export function countGroups(value: ConditionValue): number {
  return value.items.filter((it) => it.kind === "group").length;
}

const JOIN: Record<Match, string> = { all: " AND ", any: " OR " };

function ruleText(rule: ConditionRule, objects: ConditionObject[], operatorsByType: Record<ConditionFieldType, ConditionOperator[]>): string {
  const object = objects.find((o) => o.id === rule.object);
  const field = object?.fields.find((f) => f.id === rule.field);
  const objectLabel = object?.label ?? "…";
  const fieldLabel = field?.label ?? (rule.field ? `${rule.fieldLabel ?? rule.field} (deleted)` : "…");
  const op = field ? operatorsByType[field.type]?.find((o) => o.id === rule.condition) : undefined;
  const label = (v: string) => field?.options?.find((o) => o.value === v)?.label ?? v;
  let valueText = "…";
  if (op?.valueShape === "none") valueText = "";
  else if (Array.isArray(rule.value) && rule.value.length) valueText = rule.value.map(label).join(", ");
  else if (typeof rule.value === "string" && rule.value !== "") valueText = label(rule.value);
  return [`${objectLabel} › ${fieldLabel}`, op?.label ?? "…", valueText].filter(Boolean).join(" ");
}

/** The plain-language "Reads as" line. */
export function summarize(value: ConditionValue, objects: ConditionObject[], operatorsByType: Record<ConditionFieldType, ConditionOperator[]>): string {
  if (!value.items.length) return "";
  return value.items
    .map((it: ConditionItem) => (it.kind === "group" ? `( ${it.rules.map((r) => ruleText(r, objects, operatorsByType)).join(JOIN[it.match])} )` : ruleText(it, objects, operatorsByType)))
    .join(JOIN[value.match]);
}
