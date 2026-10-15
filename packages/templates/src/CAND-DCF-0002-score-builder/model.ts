import { allRules, isRuleComplete, type ConditionFieldType, type ConditionObject, type ConditionOperator } from "@fynxt/ui";
import type { Band, ScoreAttribute, ScoreModelInput, ScoreObjectGroup } from "./types";

/**
 * UI-side helpers for the builder. They check that the form is complete and do display arithmetic
 * (R10 contribution). They never decide a record's score or band (Q41, Q52, Q60).
 */

export type Selection =
  | { kind: "details" }
  | { kind: "object"; objectId: string }
  | { kind: "attribute"; objectId: string; attributeId: string }
  | { kind: "bands" }
  | { kind: "overrides" };

export interface Issue {
  id: string;
  message: string;
  target: Selection;
}

export const toNumber = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const wordCount = (text: string): number => (text.trim() ? text.trim().split(/\s+/).length : 0);

export const objectLabel = (schema: ConditionObject[], objectId: string) => schema.find((o) => o.id === objectId)?.label ?? objectId;

export const fieldOf = (schema: ConditionObject[], objectId: string, fieldId: string) => schema.find((o) => o.id === objectId)?.fields.find((f) => f.id === fieldId);

export const attributeLabel = (schema: ConditionObject[], objectId: string, a: ScoreAttribute) => fieldOf(schema, objectId, a.field)?.label ?? a.field;

/** Sum of an object's attribute weights (BR1). */
export function weightSum(group: ScoreObjectGroup): number {
  return group.attributes.reduce((sum, a) => sum + (toNumber(a.weight) ?? 0), 0);
}

/** A value row is complete when it matches something and has a score. */
export function isValueRowComplete(row: ScoreAttribute["values"][number], type: ConditionFieldType | undefined): boolean {
  const matches = type === "number" ? toNumber(row.from) !== null || toNumber(row.to) !== null : row.values.length > 0;
  return Boolean(row.category) && matches && toNumber(row.score) !== null;
}

export function isAttributeComplete(a: ScoreAttribute, type: ConditionFieldType | undefined): boolean {
  return toNumber(a.weight) !== null && a.values.length > 0 && a.values.every((r) => isValueRowComplete(r, type));
}

/**
 * "Distribute evenly" (D10 / D23): whole numbers that add up to the total, remainder on the first
 * attributes (e.g. 34 / 33 / 33). Rounding rule is PROPOSED (Q36).
 */
export function distribute(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const rest = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < rest ? 1 : 0));
}

/** Bands are valid when every upper limit is a number in order and only the last is open (R26). */
export function bandProblem(bands: Band[]): string | null {
  if (!bands.length) return "Add at least one outcome band";
  let prev = -Infinity;
  for (const [i, b] of bands.entries()) {
    const last = i === bands.length - 1;
    const upTo = toNumber(b.upTo);
    if (upTo === null && !last) return `Set where “${b.label || `Band ${i + 1}`}” ends`;
    if (upTo !== null) {
      if (upTo <= prev) return `Bands overlap: “${b.label || `Band ${i + 1}`}” ends at ${upTo}, but the band before already covers up to ${prev}`;
      prev = upTo;
    }
  }
  return null;
}

export function collectIssues(
  input: ScoreModelInput,
  schema: ConditionObject[],
  operatorsByType: Record<ConditionFieldType, ConditionOperator[]>,
  opts: { weightTotal: number; descriptionMaxWords: number }
): Issue[] {
  const issues: Issue[] = [];
  const add = (id: string, message: string, target: Issue["target"]) => issues.push({ id, message, target });
  if (!input.name.trim()) add("name", "Enter a name for this score model", { kind: "details" });
  if (allRules(input.appliesTo).some((r) => !isRuleComplete(r, schema, operatorsByType))) add("applies", "Complete or remove the Applies to conditions", { kind: "details" });
  if (!input.objects.length) add("objects", "Add at least one object to score", { kind: "details" });

  input.objects.forEach((g, i) => {
    const obj = objectLabel(schema, g.object);
    const target = { kind: "object", objectId: g.id } as const;
    if (i > 0 && !input.connectors[i - 1]) add(`connector-${g.id}`, `Choose AND or OR to join ${objectLabel(schema, input.objects[i - 1]!.object)} and ${obj}`, target);
    if (!g.attributes.length) add(`empty-${g.id}`, `${obj} has no attributes`, target);
    if (g.attributes.length > 1 && !g.logic) add(`logic-${g.id}`, `Choose how ${obj} attributes combine`, target);
    for (const a of g.attributes) {
      const type = fieldOf(schema, g.object, a.field)?.type;
      const at = { kind: "attribute", objectId: g.id, attributeId: a.id } as const;
      const label = attributeLabel(schema, g.object, a);
      if (!a.values.length) add(`values-${a.id}`, `${label} has no values`, at);
      else if (!a.values.every((r) => isValueRowComplete(r, type))) add(`rows-${a.id}`, `${label}: complete or remove the value rows`, at);
      if (toNumber(a.weight) === null) add(`weight-${a.id}`, `Set a weight for ${label}`, at);
    }
    const sum = weightSum(g);
    if (g.attributes.length && sum !== opts.weightTotal) add(`total-${g.id}`, `${obj} weights total ${sum}% (needs ${opts.weightTotal}%)`, target);
  });

  const bands = bandProblem(input.bands);
  if (bands) add("bands", bands, { kind: "bands" });
  input.bands.forEach((b, i) => {
    if (!b.label.trim()) add(`band-label-${b.id}`, `Give band ${i + 1} a label`, { kind: "bands" });
    if (wordCount(b.description) > opts.descriptionMaxWords) add(`band-desc-${b.id}`, `“${b.label || `Band ${i + 1}`}” description is over ${opts.descriptionMaxWords} words`, { kind: "bands" });
  });

  input.overrides.forEach((o, i) => {
    const rules = allRules(o.conditions);
    const outcomeNeedsValue = o.outcome.type === "forceBand" || o.outcome.type === "atLeastBand" || o.outcome.type === "setScore";
    const incomplete = !rules.length || rules.some((r) => !isRuleComplete(r, schema, operatorsByType)) || !o.outcome.type || (outcomeNeedsValue && !o.outcome.value.trim());
    if (incomplete) {
      const target = o.attributeId ? ({ kind: "attribute", objectId: o.objectId, attributeId: o.attributeId } as const) : ({ kind: "object", objectId: o.objectId } as const);
      add(`override-${o.id}`, `Complete or remove override rule ${i + 1}`, target);
    }
  });
  return issues;
}

/** Plain-language readout of the logic for the summary panel (client-side, D18). */
export function readout(input: ScoreModelInput, schema: ConditionObject[]): { object: string; attributes: string; joinBefore?: string }[] {
  return input.objects.map((g, i) => ({
    object: objectLabel(schema, g.object),
    attributes: g.attributes.length ? g.attributes.map((a) => attributeLabel(schema, g.object, a)).join(g.logic ? ` ${g.logic.toUpperCase()} ` : " · ") : "No attributes yet",
    joinBefore: i > 0 ? (input.connectors[i - 1]?.toUpperCase() ?? "AND / OR ?") : undefined,
  }));
}
