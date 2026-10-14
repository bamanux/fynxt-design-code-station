import { Plus, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Alert } from "../Alert";
import { Button } from "../Button";
import { EmptyState } from "../EmptyState";
import { DateField, NumberField, Select, TextField } from "../Field";
import { IconButton } from "../IconButton";
import { ConfirmDialog } from "../Modal";
import { MultiSelect } from "../MultiSelect";
import { Spinner } from "../Spinner";
import { allRules, countGroups, findField, isRuleComplete, isRuleStale, summarize } from "./model";
import type {
  ConditionFieldType,
  ConditionGroup,
  ConditionLimits,
  ConditionObject,
  ConditionOperator,
  ConditionRule,
  ConditionValue,
  Match,
} from "./types";

export interface ConditionBuilderProps {
  /** Objects and their fields, from the CRM (DCF-0003 B1). */
  objects: ConditionObject[];
  /** Operators per field type. Supplied by the page: they are a product decision (DCF-0003 Q4). */
  operatorsByType: Record<ConditionFieldType, ConditionOperator[]>;
  value: ConditionValue;
  onChange: (value: ConditionValue) => void;
  /** Schema loading state. While not "ready", adding and editing rules is disabled. */
  status?: "ready" | "loading" | "error";
  onRetry?: () => void;
  limits?: ConditionLimits;
  /** Match of a newly added group (DCF-0003 Q12). */
  newGroupMatch?: Match;
  /** Ask before Clear all, and before deleting a group with 2+ rules (DCF-0003 Q13). */
  confirmDestructive?: boolean;
  /** Show incomplete rules as errors, e.g. after the user pressed Next (DCF-0003 R7). */
  showValidation?: boolean;
  /** Optional message under the description row, e.g. a validation summary. */
  alert?: ReactNode;
  showSummary?: boolean;
  description?: string;
  /** Stable id generator; defaults to crypto.randomUUID. */
  createId?: () => string;
}

const MATCH_OPTIONS = [
  { value: "all", label: "All" },
  { value: "any", label: "Any" },
];

const blankRule = (id: string): ConditionRule => ({ kind: "rule", id, object: "", field: "", condition: "", value: null });

/** Branch arrow from the dotted tree line into a rule or group. Decorative. */
function Branch() {
  return (
    <svg className="fx-cb__branch" width="24" height="16" viewBox="0 0 24 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M0 8H19" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
      <path d="M17 4L21 8L17 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Root() {
  return (
    <svg className="fx-cb__root" width="9" height="6" viewBox="0 0 9 6" aria-hidden="true" focusable="false">
      <path d="M0 0H9L4.5 6Z" fill="currentColor" />
    </svg>
  );
}

/**
 * DCF-0003 ConditionBuilder (candidate, Figma work file: Condition Row 84:4954, Condition Group v2 95:7994,
 * Logic Tree 94:7364, Rules Summary 84:4989). The structure follows the live Add Data Filter (DCF-0003 D2):
 * an All / Any root with a dotted tree of rules and one level of groups.
 *
 * It only collects rules. It never evaluates them: who enrols is decided by the backend (DCF-0003 B2).
 */
export function ConditionBuilder({
  objects,
  operatorsByType,
  value,
  onChange,
  status = "ready",
  onRetry,
  limits = {},
  newGroupMatch = "any",
  confirmDestructive = true,
  showValidation = false,
  alert,
  showSummary = true,
  description = "Create rules and groups. Participants enrol only if they match All or Any of them.",
  createId = () => crypto.randomUUID(),
}: ConditionBuilderProps) {
  const ready = status === "ready";
  const rules = allRules(value);
  const groups = countGroups(value);
  const canAddRule = ready && (limits.rules === undefined || rules.length < limits.rules);
  const canAddGroup = canAddRule && (limits.groups === undefined || groups < limits.groups);

  const [announcement, setAnnouncement] = useState("");
  const [confirm, setConfirm] = useState<null | { kind: "clear" } | { kind: "group"; id: string }>(null);
  const focusTarget = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const addRuleRef = useRef<HTMLButtonElement>(null);
  const describeId = useId();

  useEffect(() => {
    const target = focusTarget.current;
    if (!target) return;
    focusTarget.current = null;
    const el = target === "add" ? addRuleRef.current : rootRef.current?.querySelector<HTMLElement>(`[data-focus-id="${target}"]`);
    el?.focus();
  });

  function commit(next: ConditionValue, message: string) {
    onChange(next);
    const n = allRules(next).length;
    setAnnouncement(`${message} ${n} ${n === 1 ? "rule" : "rules"}.`);
  }

  function patchRule(id: string, patch: (r: ConditionRule) => ConditionRule) {
    onChange({
      ...value,
      items: value.items.map((it) => (it.kind === "group" ? { ...it, rules: it.rules.map((r) => (r.id === id ? patch(r) : r)) } : it.id === id ? patch(it) : it)),
    });
  }

  /** Focus the item after `id` in reading order, else the one before, else Add rule. */
  function focusNeighbour(id: string) {
    const order = value.items.flatMap((it) => (it.kind === "group" ? [it.id, ...it.rules.map((r) => r.id)] : [it.id]));
    const i = order.indexOf(id);
    focusTarget.current = order[i + 1] ?? order[i - 1] ?? "add";
  }

  function addRule() {
    const rule = blankRule(createId());
    focusTarget.current = rule.id;
    commit({ ...value, items: [...value.items, rule] }, "Rule added.");
  }

  function addGroup() {
    const rule = blankRule(createId());
    const group: ConditionGroup = { kind: "group", id: createId(), match: newGroupMatch, rules: [rule] };
    focusTarget.current = rule.id;
    commit({ ...value, items: [...value.items, group] }, "Group added.");
  }

  function addRuleToGroup(groupId: string) {
    const rule = blankRule(createId());
    focusTarget.current = rule.id;
    commit({ ...value, items: value.items.map((it) => (it.kind === "group" && it.id === groupId ? { ...it, rules: [...it.rules, rule] } : it)) }, "Rule added.");
  }

  function deleteRule(id: string) {
    focusNeighbour(id);
    const items = value.items
      .filter((it) => it.id !== id)
      .map((it) => (it.kind === "group" ? { ...it, rules: it.rules.filter((r) => r.id !== id) } : it))
      // A group whose last rule is deleted goes too (DCF-0003 Q14 proposal).
      .filter((it) => it.kind !== "group" || it.rules.length > 0);
    commit({ ...value, items }, "Rule deleted.");
  }

  function deleteGroup(id: string) {
    focusNeighbour(id);
    commit({ ...value, items: value.items.filter((it) => it.id !== id) }, "Group deleted.");
  }

  function requestDeleteGroup(group: ConditionGroup) {
    if (confirmDestructive && group.rules.length > 1) setConfirm({ kind: "group", id: group.id });
    else deleteGroup(group.id);
  }

  function clearAll() {
    focusTarget.current = "add";
    commit({ match: "all", items: [] }, "All rules cleared.");
  }

  function renderRule(rule: ConditionRule, groupLabel?: string) {
    const object = objects.find((o) => o.id === rule.object);
    const field = findField(objects, rule.object, rule.field);
    const stale = isRuleStale(rule, objects);
    const operators = field ? operatorsByType[field.type] ?? [] : [];
    const operator = operators.find((o) => o.id === rule.condition);
    const incomplete = showValidation && !stale && !isRuleComplete(rule, objects, operatorsByType);
    // Rules are numbered among rules: top-level rules together, and each group's rules within the group.
    const siblings = groupLabel
      ? value.items.find((g): g is ConditionGroup => g.kind === "group" && g.rules.some((r) => r.id === rule.id))!.rules
      : value.items.filter((x): x is ConditionRule => x.kind === "rule");
    const position = siblings.findIndex((x) => x.id === rule.id) + 1;
    const name = groupLabel ? `${groupLabel}, rule ${position}` : `Rule ${position}`;
    const missing = (v: unknown) => incomplete && (v === "" || v === null || (Array.isArray(v) && v.length === 0));

    let valueControl: ReactNode = null;
    if (field && operator && operator.valueShape !== "none") {
      const common = { label: "Value", disabled: !ready, status: missing(rule.value) ? ("error" as const) : undefined, helperText: missing(rule.value) ? "Enter a value" : undefined };
      if (field.type === "list" && operator.valueShape === "multi") {
        valueControl = (
          <MultiSelect
            label="Value"
            options={field.options ?? []}
            value={Array.isArray(rule.value) ? rule.value : []}
            onChange={(v) => patchRule(rule.id, (r) => ({ ...r, value: v }))}
            disabled={!ready}
            status={common.status}
            helperText={common.helperText}
          />
        );
      } else if (field.type === "list") {
        valueControl = (
          <Select
            {...common}
            placeholder="Select a value"
            options={field.options ?? []}
            value={typeof rule.value === "string" ? rule.value : ""}
            onChange={(e) => patchRule(rule.id, (r) => ({ ...r, value: e.target.value }))}
          />
        );
      } else if (field.type === "number") {
        valueControl = <NumberField {...common} value={typeof rule.value === "string" ? rule.value : ""} onChange={(e) => patchRule(rule.id, (r) => ({ ...r, value: e.target.value }))} />;
      } else if (field.type === "date") {
        valueControl = <DateField {...common} value={typeof rule.value === "string" ? rule.value : ""} onChange={(e) => patchRule(rule.id, (r) => ({ ...r, value: e.target.value }))} />;
      } else {
        valueControl = <TextField {...common} value={typeof rule.value === "string" ? rule.value : ""} onChange={(e) => patchRule(rule.id, (r) => ({ ...r, value: e.target.value }))} />;
      }
    } else {
      valueControl = <Select label="Value" placeholder="—" options={[]} value="" disabled onChange={() => undefined} />;
    }

    return (
      <li key={rule.id} className="fx-cb__item" data-state={stale ? "stale" : incomplete ? "incomplete" : undefined}>
        <span className="fx-cb__branch-slot">
          <Branch />
        </span>
        <div role="group" aria-label={name} className="fx-cb__rule">
          <div className="fx-cb__controls">
            <Select
              label="Object"
              placeholder="Select an object"
              options={objects.map((o) => ({ value: o.id, label: o.label }))}
              value={object ? rule.object : ""}
              disabled={!ready}
              status={missing(rule.object) ? "error" : undefined}
              helperText={missing(rule.object) ? "Select an object" : undefined}
              data-focus-id={rule.id}
              onChange={(e) => patchRule(rule.id, (r) => ({ ...r, object: e.target.value, field: "", condition: "", value: null, fieldLabel: undefined }))}
            />
            <Select
              label="Field"
              placeholder={stale ? `${rule.fieldLabel ?? rule.field} (deleted)` : "Select a field"}
              options={(object?.fields ?? []).map((f) => ({ value: f.id, label: f.label }))}
              value={field ? rule.field : ""}
              disabled={!ready || !object}
              status={stale || missing(field ? rule.field : "") ? "error" : undefined}
              helperText={stale ? "Field no longer exists in the CRM" : missing(field ? rule.field : "") ? "Select a field" : undefined}
              onChange={(e) => {
                const f = object?.fields.find((x) => x.id === e.target.value);
                patchRule(rule.id, (r) => ({ ...r, field: e.target.value, fieldLabel: f?.label, condition: "", value: null }));
              }}
            />
            <Select
              label="Condition"
              placeholder="Select a condition"
              options={operators.map((o) => ({ value: o.id, label: o.label }))}
              value={operator ? rule.condition : ""}
              disabled={!ready || !field}
              status={missing(field ? rule.condition : "") ? "error" : undefined}
              helperText={missing(field ? rule.condition : "") ? "Select a condition" : undefined}
              onChange={(e) => {
                const next = operators.find((o) => o.id === e.target.value);
                patchRule(rule.id, (r) => ({ ...r, condition: e.target.value, value: next?.valueShape === "multi" ? [] : next?.valueShape === "none" ? null : "" }));
              }}
            />
            <div className="fx-cb__value">{valueControl}</div>
          </div>
          <IconButton className="fx-cb__delete" variant="ghost" size="lg" label={`Delete ${name.toLowerCase()}`} icon={<Trash2 />} disabled={!ready} onClick={() => deleteRule(rule.id)} />
        </div>
      </li>
    );
  }

  let groupNo = 0;
  const summary = summarize(value, objects, operatorsByType);

  return (
    <div className="fx-cb" ref={rootRef}>
      <div className="fx-cb__description">
        <p id={describeId} className="fx-cb__description-text">
          {description}
        </p>
        <Button variant="ghost" disabled={!ready || value.items.length === 0} onClick={() => (confirmDestructive ? setConfirm({ kind: "clear" }) : clearAll())}>
          Clear all
        </Button>
      </div>
      {alert}
      <div className="fx-cb__root-row">
        <div className="fx-cb__match">
          <Select
            label="Participants must match"
            hideLabel
            options={MATCH_OPTIONS}
            value={value.match}
            disabled={!ready}
            aria-describedby={describeId}
            onChange={(e) => onChange({ ...value, match: e.target.value as Match })}
          />
        </div>
        <div className="fx-cb__actions">
          <Button ref={addRuleRef} variant="secondary" leadingIcon={<Plus />} disabled={!canAddRule} onClick={addRule}>
            Add rule
          </Button>
          <Button variant="secondary" leadingIcon={<Plus />} disabled={!canAddGroup} onClick={addGroup}>
            Add group
          </Button>
        </div>
      </div>

      {status === "loading" && (
        <div className="fx-cb__loading" role="status">
          <Spinner />
          <span>Loading CRM objects and fields…</span>
        </div>
      )}
      {status === "error" && (
        <div className="fx-cb__error">
          <Alert status="error" title="Couldn't load CRM fields">
            Rules are unavailable right now. You can save a draft and come back.
          </Alert>
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      )}
      {ready && value.items.length === 0 && <EmptyState compact title="No rules yet" description="Add a rule to enrol participants by their CRM data, or add a group to combine rules." />}
      {ready && value.items.length > 0 && (
        <div className="fx-cb__tree">
          <Root />
          <ul className="fx-cb__items">
            {value.items.map((it) => {
              if (it.kind === "rule") return renderRule(it);
              const label = `Group ${++groupNo}`;
              const fullGroup = limits.rulesPerGroup !== undefined && it.rules.length >= limits.rulesPerGroup;
              return (
                <li key={it.id} className="fx-cb__item fx-cb__item--group">
                  <span className="fx-cb__branch-slot fx-cb__branch-slot--group">
                    <Branch />
                  </span>
                  <section className="fx-cb__group" aria-label={label}>
                    <div className="fx-cb__group-header">
                      <h3 className="fx-cb__group-title">{label}</h3>
                      <div className="fx-cb__match">
                        <Select
                          label={`Rules in ${label} must match`}
                          hideLabel
                          options={MATCH_OPTIONS}
                          value={it.match}
                          data-focus-id={it.id}
                          onChange={(e) => onChange({ ...value, items: value.items.map((g) => (g.id === it.id ? { ...it, match: e.target.value as Match } : g)) })}
                        />
                      </div>
                      <div className="fx-cb__group-actions">
                        <Button variant="secondary" leadingIcon={<Plus />} disabled={!canAddRule || fullGroup} onClick={() => addRuleToGroup(it.id)}>
                          Add rule
                        </Button>
                        <IconButton className="fx-cb__delete" variant="ghost" size="lg" label={`Delete ${label.toLowerCase()}`} icon={<Trash2 />} onClick={() => requestDeleteGroup(it)} />
                      </div>
                    </div>
                    <div className="fx-cb__tree fx-cb__tree--inner">
                      <Root />
                      <ul className="fx-cb__items">{it.rules.map((r) => renderRule(r, label))}</ul>
                    </div>
                  </section>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {showSummary && ready && (
        <p className="fx-cb__summary">
          <span className="fx-cb__summary-label">Reads as:</span> {summary || "No rules yet"}
        </p>
      )}

      <div className="fx-visually-hidden" aria-live="polite">
        {announcement}
      </div>

      <ConfirmDialog
        open={confirm !== null}
        destructive
        title={confirm?.kind === "clear" ? "Clear all rules?" : "Delete this group?"}
        message={confirm?.kind === "clear" ? `This removes ${rules.length} ${rules.length === 1 ? "rule" : "rules"}${groups ? ` and ${groups} ${groups === 1 ? "group" : "groups"}` : ""}.` : "The group and all its rules will be removed."}
        confirmLabel={confirm?.kind === "clear" ? "Clear all rules" : "Delete group"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind === "clear") clearAll();
          else if (confirm?.kind === "group") deleteGroup(confirm.id);
          setConfirm(null);
        }}
      />
    </div>
  );
}
