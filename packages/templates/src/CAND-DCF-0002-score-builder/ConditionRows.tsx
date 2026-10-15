import {
  Button,
  DateField,
  IconButton,
  Menu,
  MultiSelect,
  NumberField,
  Select,
  TextField,
  type ConditionFieldType,
  type ConditionObject,
  type ConditionOperator,
  type ConditionRule,
  type ConditionValue,
} from "@fynxt/ui";
import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Flat condition rows as in the approved v5 frames: Applies to (frames 04–05: Field · Operator · Value)
 * and override rules (frames 17–18: If · Object · Field · Operator · Value). Template-level composite
 * over the DCF-0003 ConditionBuilder data model (`ConditionValue`, rules only, all must match).
 */
export interface ConditionRowsProps {
  /** Accessible name prefix, e.g. "Applies to" or "Override rule 1". */
  label: string;
  schema: ConditionObject[];
  operatorsByType: Record<ConditionFieldType, ConditionOperator[]>;
  value: ConditionValue;
  onChange: (value: ConditionValue) => void;
  /** Show an Object select before the field (override rules). */
  withObject?: boolean;
  /** Word before the first row, e.g. "If". */
  lead?: string;
  /** Show the per-row remove button (Applies to). Override rules remove the whole rule instead. */
  removable?: boolean;
  showErrors?: boolean;
  createId: () => string;
}

const rulesOf = (value: ConditionValue) => value.items.filter((i): i is ConditionRule => i.kind === "rule");

/** Field choices across objects; the object name is added only where a field label repeats. */
export function fieldChoices(schema: ConditionObject[]) {
  const all = schema.flatMap((o) => o.fields.map((f) => ({ object: o, field: f })));
  return all.map(({ object, field }) => ({
    value: `${object.id}:${field.id}`,
    label: all.filter((x) => x.field.label === field.label).length > 1 ? `${object.label} › ${field.label}` : field.label,
    object: object.id,
    field: field.id,
  }));
}

export function ConditionRows({ label, schema, operatorsByType, value, onChange, withObject, lead, removable = true, showErrors }: Omit<ConditionRowsProps, "createId">) {
  const rules = rulesOf(value);
  const choices = fieldChoices(schema);
  const setRule = (id: string, patch: Partial<ConditionRule>) => onChange({ ...value, items: value.items.map((i) => (i.kind === "rule" && i.id === id ? { ...i, ...patch } : i)) });

  return (
    <div className="fx-sb-conds">
      {rules.map((r, i) => {
        const n = i + 1;
        const object = schema.find((o) => o.id === r.object);
        const field = object?.fields.find((f) => f.id === r.field);
        const ops = field ? (operatorsByType[field.type] ?? []) : [];
        const op = ops.find((o) => o.id === r.condition);
        const name = `${label}, condition ${n}`;
        const missing = (v: unknown) => (showErrors && !v ? "error" : undefined);
        let valueControl: ReactNode = null;
        if (field && op && op.valueShape !== "none") {
          if (field.type === "list" && op.valueShape === "multi") {
            valueControl = <MultiSelect label={`${name} values`} hideLabel maxChips={1} placeholder="Select values" options={field.options ?? []} value={Array.isArray(r.value) ? r.value : r.value ? [r.value] : []} onChange={(v) => setRule(r.id, { value: v })} status={showErrors && !(Array.isArray(r.value) && r.value.length) ? "error" : undefined} />;
          } else if (field.type === "list") {
            valueControl = <Select label={`${name} value`} hideLabel placeholder="Value" options={field.options ?? []} value={typeof r.value === "string" ? r.value : ""} onChange={(e) => setRule(r.id, { value: e.target.value })} status={missing(r.value)} />;
          } else if (field.type === "number") {
            valueControl = <NumberField label={`${name} value`} hideLabel value={typeof r.value === "string" ? r.value : ""} onChange={(e) => setRule(r.id, { value: e.target.value })} status={missing(r.value)} />;
          } else if (field.type === "date") {
            valueControl = <DateField label={`${name} value`} hideLabel value={typeof r.value === "string" ? r.value : ""} onChange={(e) => setRule(r.id, { value: e.target.value })} status={missing(r.value)} />;
          } else {
            valueControl = <TextField label={`${name} value`} hideLabel value={typeof r.value === "string" ? r.value : ""} onChange={(e) => setRule(r.id, { value: e.target.value })} status={missing(r.value)} />;
          }
        } else {
          valueControl = <Select label={`${name} value`} hideLabel placeholder="Value" options={[]} value="" disabled />;
        }
        return (
          <div key={r.id} className="fx-sb-cond" data-object={withObject || undefined} role="group" aria-label={name}>
            {lead !== undefined && <span className="fx-sb-rule__word">{i === 0 ? lead : "and"}</span>}
            {withObject && (
              <Select
                label={`${name} object`}
                hideLabel
                placeholder="Object"
                options={schema.map((o) => ({ value: o.id, label: o.label }))}
                value={r.object}
                onChange={(e) => setRule(r.id, { object: e.target.value, field: "", condition: "", value: null })}
                status={missing(r.object)}
              />
            )}
            {withObject ? (
              <Select
                label={`${name} field`}
                hideLabel
                placeholder="Field"
                options={(object?.fields ?? []).map((f) => ({ value: f.id, label: f.label }))}
                value={r.field}
                onChange={(e) => {
                  const f = object?.fields.find((x) => x.id === e.target.value);
                  setRule(r.id, { field: e.target.value, fieldLabel: f?.label, condition: f ? (operatorsByType[f.type]?.[0]?.id ?? "") : "", value: null });
                }}
                status={missing(r.field)}
                disabled={!object}
              />
            ) : (
              <Select
                label={`${name} field`}
                hideLabel
                placeholder="Field"
                options={choices.map(({ value: v, label: l }) => ({ value: v, label: l }))}
                value={r.object && r.field ? `${r.object}:${r.field}` : ""}
                onChange={(e) => {
                  const c = choices.find((x) => x.value === e.target.value);
                  const f = schema.find((o) => o.id === c?.object)?.fields.find((x) => x.id === c?.field);
                  setRule(r.id, { object: c?.object ?? "", field: c?.field ?? "", fieldLabel: f?.label, condition: f ? (operatorsByType[f.type]?.[0]?.id ?? "") : "", value: null });
                }}
                status={missing(r.field)}
              />
            )}
            <Select
              label={`${name} operator`}
              hideLabel
              placeholder="Operator"
              options={ops.map((o) => ({ value: o.id, label: o.label }))}
              value={r.condition}
              onChange={(e) => setRule(r.id, { condition: e.target.value, value: null })}
              status={missing(r.condition)}
              disabled={!field}
            />
            {valueControl}
            {removable && <IconButton variant="ghost" size="sm" label={`Remove ${name}`} icon={<Trash2 />} onClick={() => onChange({ ...value, items: value.items.filter((x) => x.id !== r.id) })} />}
          </div>
        );
      })}
    </div>
  );
}

/** "+ Add condition" with the Fields menu (frame 04). */
export function AddConditionMenu({ label, schema, operatorsByType, value, onChange, createId }: Pick<ConditionRowsProps, "label" | "schema" | "operatorsByType" | "value" | "onChange" | "createId">) {
  const choices = fieldChoices(schema);
  return (
    <Menu
      label={`${label}: choose a field`}
      heading="Fields"
      align="end"
      items={choices.map((c) => {
        const f = schema.find((o) => o.id === c.object)?.fields.find((x) => x.id === c.field);
        return {
          id: c.value,
          label: c.label,
          onSelect: () => onChange({ ...value, items: [...value.items, { kind: "rule", id: createId(), object: c.object, field: c.field, fieldLabel: f?.label, condition: f ? (operatorsByType[f.type]?.[0]?.id ?? "") : "", value: null }] }),
        };
      })}
      renderTrigger={(t) => (
        <Button {...t} variant="ghost" size="s" leadingIcon={<Plus />} disabled={!choices.length}>
          Add condition
        </Button>
      )}
    />
  );
}
