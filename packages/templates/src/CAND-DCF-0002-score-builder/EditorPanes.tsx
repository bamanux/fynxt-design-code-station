import { Alert, Badge, Button, IconButton, MultiSelect, NumberField, SegmentedControl, Select, Spinner, TextArea, TextField, Tooltip, type ConditionObject } from "@fynxt/ui";
import { Copy, GripVertical, Info, Plus, Trash2, X, Zap } from "lucide-react";
import { Fragment, useId, useState, type DragEvent, type KeyboardEvent } from "react";
import { AttributePicker } from "./AttributePicker";
import { AddConditionMenu, ConditionRows } from "./ConditionRows";
import { attributeLabel, bandProblem, conditionSchema, conditionsText, fieldOf, objectLabel, overrideHint, toNumber, wordCount } from "./model";
import type { Band, Logic, OverrideRule, ScoreAttribute, ScoreBuilderConfig, ScoreModelInput, ScoreObjectGroup, ValueRow } from "./types";

export const LOGIC_OPTIONS: { value: Logic; label: string }[] = [
  { value: "and", label: "AND" },
  { value: "or", label: "OR" },
];

/** D30: AND / OR explained in words next to the switch. */
export const logicWords = (logic: Logic | null) => (logic === "and" ? "All must match" : logic === "or" ? "Any can match" : "Choose how they combine");

export const newId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}`);

interface PaneBase {
  config: ScoreBuilderConfig;
  schema: ConditionObject[];
  schemaStatus: "loading" | "ready" | "error";
  onRetrySchema: () => void;
  input: ScoreModelInput;
  update: (patch: Partial<ScoreModelInput>) => void;
}

/** Fields of an object not yet used as attributes (Add attribute). */
export const unusedFields = (schema: ConditionObject[], g: ScoreObjectGroup) => (schema.find((o) => o.id === g.object)?.fields ?? []).filter((f) => !g.attributes.some((a) => a.field === f.id));

function SchemaState({ status, onRetry }: { status: PaneBase["schemaStatus"]; onRetry: () => void }) {
  if (status === "loading")
    return (
      <div className="fx-sb-state" role="status">
        <Spinner />
        <span>Loading fields…</span>
      </div>
    );
  return (
    <Alert
      status="error"
      title="Couldn't load CRM fields"
      action={
        <Button variant="secondary" size="s" onClick={onRetry}>
          Retry
        </Button>
      }
    />
  );
}

/* ---------------------------------------------------------------- Details (Step 1) · frames 02–05 */

export function DetailsPane({ config, schema, schemaStatus, onRetrySchema, input, update, showErrors, howItWorksOpen, onCloseHowItWorks }: PaneBase & { showErrors: boolean; howItWorksOpen: boolean; onCloseHowItWorks: () => void }) {
  const hasConditions = input.appliesTo.items.length > 0;
  return (
    <>
      <p className="fx-sb-path">Model</p>
      {howItWorksOpen && (
        <Alert status="info" title="How scoring works" action={<IconButton variant="ghost" size="sm" label="Dismiss how scoring works" icon={<X />} onClick={onCloseHowItWorks} />}>
          {config.copy.howItWorks}
        </Alert>
      )}
      <section className="fx-sb-card fx-sb-card--form" aria-labelledby="fx-sb-details">
        <h2 id="fx-sb-details" className="fx-sb-card__title">
          Model details
        </h2>
        <TextField
          label="Score model name"
          required
          placeholder="Enter score model name"
          value={input.name}
          onChange={(e) => update({ name: e.target.value })}
          status={showErrors && !input.name.trim() ? "error" : undefined}
          helperText={showErrors && !input.name.trim() ? "Enter a name for this score model" : undefined}
        />
        <TextArea
          label={
            config.copy.descriptionInfo ? (
              <>
                Description
                <Tooltip content={config.copy.descriptionInfo}>
                  <span className="fx-sb-info" tabIndex={0} aria-label="About the description">
                    <Info aria-hidden="true" />
                  </span>
                </Tooltip>
              </>
            ) : (
              "Description"
            )
          }
          placeholder="About the score model"
          value={input.description}
          onChange={(e) => update({ description: e.target.value })}
          helperText={config.copy.descriptionHelp}
        />
      </section>
      <section className="fx-sb-card fx-sb-card--row" aria-labelledby="fx-sb-method">
        <div className="fx-sb-grow">
          <h2 id="fx-sb-method" className="fx-sb-card__title fx-sb-card__title--sm">
            Scoring method
          </h2>
          <p className="fx-sb-sub">Weighted: value score × attribute weight. Points: each value's points add up (max {config.weightTotal}).</p>
        </div>
        <SegmentedControl
          label="Scoring method"
          options={[
            { value: "weighted", label: "Weighted" },
            { value: "points", label: "Points" },
          ]}
          value={input.method}
          onChange={(method) => update({ method })}
        />
      </section>
      <section className="fx-sb-card" aria-labelledby="fx-sb-applies">
        <h2 id="fx-sb-applies" className="fx-sb-card__title fx-sb-card__title--sm">
          Applies to
          <span className="fx-field__required" aria-hidden="true">
            *
          </span>
        </h2>
        <p className="fx-sb-sub">
          {hasConditions
            ? "Only records that match all these conditions are scored by this model."
            : "No conditions yet, so every record of the selected objects is scored. Add conditions to narrow it down, e.g. User Type is Contact."}
        </p>
        {schemaStatus !== "ready" ? (
          <SchemaState status={schemaStatus} onRetry={onRetrySchema} />
        ) : (
          <div className="fx-sb-condbox">
            <ConditionRows label="Applies to" schema={schema} operatorsByType={config.operatorsByType} value={{ ...input.appliesTo, match: "all" }} onChange={(appliesTo) => update({ appliesTo })} showErrors={showErrors} />
            <div className="fx-sb-condbox__foot">
              <AddConditionMenu label="Applies to" schema={schema} operatorsByType={config.operatorsByType} value={{ ...input.appliesTo, match: "all" }} onChange={(appliesTo) => update({ appliesTo })} createId={newId} />
            </div>
          </div>
        )}
      </section>
    </>
  );
}

/* ---------------------------------------------------------------- Override rules (attribute / object) · frames 16–21 */

export function OverrideRules({
  config,
  schema,
  schemaStatus,
  onRetrySchema,
  input,
  update,
  objectId,
  attributeId,
  title,
  description,
  showErrors,
}: PaneBase & { objectId: string; attributeId?: string; title: string; description: string; showErrors: boolean }) {
  const mine = input.overrides.filter((o) => o.objectId === objectId && o.attributeId === attributeId);
  const bands = input.bands.filter((b) => b.label.trim());
  const set = (id: string, patch: Partial<OverrideRule>) => update({ overrides: input.overrides.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  const group = input.objects.find((g) => g.id === objectId);
  // Conditions can test fields, an attribute's category or an object's band (rev 6, D33 / D35).
  const cschema = conditionSchema(schema, input, config);
  // Raise to that score is offered in Weighted mode only until Q77 is answered.
  const outcomes = config.outcomeTypes.filter((t) => t.value !== "raise" || input.method !== "points");

  function addRule() {
    // A new rule starts with this object; the admin picks the field (V6-01).
    const rule = { kind: "rule" as const, id: newId(), object: group?.object ?? "", field: "", condition: "", value: null };
    update({ overrides: [...input.overrides, { id: newId(), objectId, attributeId, conditions: { match: "all", items: [rule] }, outcome: { type: "", value: "" } }] });
  }

  return (
    <section className="fx-sb-card" aria-label={title}>
      <div className="fx-sb-card__head">
        <Zap className="fx-sb-icon" aria-hidden="true" />
        <h2 className="fx-sb-card__title fx-sb-card__title--sm">{title}</h2>
        <Badge status={mine.length ? "warning" : "neutral"}>{mine.length ? `${mine.length} ${mine.length === 1 ? "rule" : "rules"}` : "Optional"}</Badge>
      </div>
      <p className="fx-sb-sub">{description}</p>
      {schemaStatus !== "ready" && mine.length > 0 && <SchemaState status={schemaStatus} onRetry={onRetrySchema} />}
      {schemaStatus === "ready" &&
        mine.map((o) => {
          const n = input.overrides.indexOf(o) + 1;
          const needsBand = o.outcome.type === "forceBand" || o.outcome.type === "atLeastBand";
          const bandGone = needsBand && !!o.outcome.value && !bands.some((b) => b.id === o.outcome.value);
          const missing = (showErrors && (!o.outcome.type || ((needsBand || o.outcome.type === "setScore") && !o.outcome.value))) || bandGone;
          const hint = overrideHint(o, input, schema);
          return (
            <Fragment key={o.id}>
            <div className="fx-sb-rule" aria-label={`Override rule ${n}`} role="group">
              <ConditionRows label={`Override rule ${n}`} schema={cschema} operatorsByType={config.operatorsByType} value={o.conditions} onChange={(conditions) => set(o.id, { conditions })} withObject lead="If" removable={o.conditions.items.length > 1} showErrors={showErrors} />
              <div className="fx-sb-rule__then" data-outcome={o.outcome.type || undefined}>
                <span className="fx-sb-rule__word">Then</span>
                <Select
                  label={`Outcome of rule ${n}`}
                  hideLabel
                  placeholder="Choose outcome"
                  options={outcomes}
                  value={o.outcome.type}
                  onChange={(e) => set(o.id, { outcome: { type: e.target.value as OverrideRule["outcome"]["type"], value: "" } })}
                  status={showErrors && !o.outcome.type ? "error" : undefined}
                  helperText={showErrors && !o.outcome.type ? "Choose what this rule does" : undefined}
                />
                {needsBand && (
                  <Select
                    label={`Band for rule ${n}`}
                    hideLabel
                    placeholder="Choose band"
                    options={bands.map((b) => ({ value: b.id, label: b.label }))}
                    value={bandGone ? "" : o.outcome.value}
                    onChange={(e) => set(o.id, { outcome: { ...o.outcome, value: e.target.value } })}
                    status={missing && o.outcome.type ? "error" : undefined}
                  />
                )}
                {o.outcome.type === "setScore" && (
                  <NumberField label={`Score for rule ${n}`} hideLabel value={o.outcome.value} onChange={(e) => set(o.id, { outcome: { ...o.outcome, value: e.target.value } })} status={missing ? "error" : undefined} />
                )}
                <span className="fx-sb-grow" />
                <IconButton variant="ghost" size="xs" label={`Remove override rule ${n}`} icon={<Trash2 />} onClick={() => update({ overrides: input.overrides.filter((x) => x.id !== o.id) })} />
              </div>
            </div>
            {hint && (
              <div className="fx-sb-hint" aria-live="polite">
                <Badge status={hint.status}>{hint.text}</Badge>
              </div>
            )}
            </Fragment>
          );
        })}
      <div>
        <Button variant="secondary" size="s" leadingIcon={<Plus />} onClick={addRule} disabled={schemaStatus !== "ready"}>
          Add override
        </Button>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Object · frames 07–09, 19–21, 38 */

export function ObjectPane(props: PaneBase & { group: ScoreObjectGroup; showErrors: boolean; onLogic: (logic: Logic) => void; onAddAttributes: (fieldIds: string[]) => void }) {
  const { config, schema, schemaStatus, group, onLogic, onAddAttributes, showErrors } = props;
  const name = objectLabel(schema, group.object);
  return (
    <>
      <p className="fx-sb-path">{name}</p>
      <section className="fx-sb-card" aria-labelledby="fx-sb-object">
        <div className="fx-sb-card__head">
          <h2 id="fx-sb-object" className="fx-sb-card__title fx-sb-card__title--lg">
            {name}
          </h2>
          <Badge status="neutral">Object</Badge>
        </div>
        <div className="fx-sb-card--row">
          <div className="fx-sb-grow">
            <p className="fx-sb-strong">Join {name} attributes with</p>
            <p className="fx-sb-sub">One operator joins all attributes of this object.</p>
          </div>
          <SegmentedControl label={`Join ${name} attributes with`} options={LOGIC_OPTIONS} value={group.logic} onChange={onLogic} invalid={showErrors && group.attributes.length > 1 && !group.logic} />
        </div>
      </section>
      {group.attributes.length === 0 ? (
        <section className="fx-sb-empty" aria-label={`${name} attributes`}>
          <p className="fx-sb-strong">No attributes yet</p>
          <p className="fx-sb-sub">Pick a field of {name} to score.</p>
          <AttributePicker objectName={name} fields={unusedFields(schema, group)} onAdd={onAddAttributes} variant="primary" disabled={schemaStatus !== "ready"} align="center" />
        </section>
      ) : (
        <OverrideRules
          {...props}
          objectId={group.id}
          title={`${name} override rules`}
          description={`When a rule matches, it replaces or raises the ${name} result. Test a field, ${name}'s score or ${name}'s band${config.copy.objectOverrideExample ? `, e.g. ${config.copy.objectOverrideExample}` : ""}.`}
        />
      )}
    </>
  );
}

/* ---------------------------------------------------------------- Attribute · frames 10–18, 36, 39 */

export function AttributePane(
  props: PaneBase & {
    group: ScoreObjectGroup;
    attribute: ScoreAttribute;
    showErrors: boolean;
    onChange: (a: ScoreAttribute) => void;
    onDuplicate: () => void;
    onDistribute: () => void;
  }
) {
  const { config, schema, group, attribute: a, input, onChange, onDuplicate, onDistribute, showErrors } = props;
  const weightId = useId();
  const field = fieldOf(schema, group.object, a.field);
  const type = field?.type;
  const label = attributeLabel(schema, group.object, a);
  const points = input.method === "points";
  const weight = toNumber(a.weight);
  const setRow = (id: string, patch: Partial<ValueRow>) => onChange({ ...a, values: a.values.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const newRow = (category = ""): ValueRow => ({ id: newId(), category, values: [], from: "", to: "", score: "" });
  const contribution = (row: ValueRow) => {
    const score = toNumber(row.score);
    if (score === null) return "—";
    if (points) return String(score);
    return weight === null ? "—" : ((score * weight) / 100).toFixed(1);
  };
  const otherTotal = group.attributes.filter((x) => x.id !== a.id).reduce((s, x) => s + (toNumber(x.weight) ?? 0), 0);
  const total = otherTotal + (weight ?? 0);
  const weightInvalid = (showErrors && weight === null) || total > config.weightTotal;
  const unit = points ? "pts" : "%";

  return (
    <>
      <div className="fx-sb-toolbar-row">
        <p className="fx-sb-path">
          {objectLabel(schema, group.object)} › {label}
        </p>
        <Button variant="ghost" size="s" leadingIcon={<Copy />} onClick={onDuplicate}>
          Duplicate attribute
        </Button>
        <Button variant="ghost" size="s" onClick={onDistribute}>
          Distribute evenly
        </Button>
      </div>
      <section className="fx-sb-card" aria-labelledby="fx-sb-attr">
        <div className="fx-sb-card__head">
          <h2 id="fx-sb-attr" className="fx-sb-card__title fx-sb-card__title--lg">
            {label}
          </h2>
          <Badge status="neutral">{type === "number" ? "Number" : type === "list" ? "Dropdown" : (type ?? "Field")}</Badge>
          <span className="fx-sb-grow" />
          {/* FDS-101 Input Addon (Unit = Percentage): inline label, grey control, unit segment. */}
          <div className="fx-sb-weight" data-status={weightInvalid ? "error" : undefined}>
            <label htmlFor={weightId} className="fx-sb-weight__label">
              {points ? "Max points" : "Weight"}
            </label>
            <div className="fx-sb-addon">
              <input
                id={weightId}
                className="fx-sb-addon__input"
                type="number"
                inputMode="decimal"
                min={0}
                max={config.weightTotal}
                placeholder="0"
                value={a.weight}
                aria-invalid={weightInvalid || undefined}
                aria-describedby={total !== config.weightTotal ? `${weightId}-help` : undefined}
                onChange={(e) => onChange({ ...a, weight: e.target.value })}
              />
              <span className="fx-sb-addon__unit" aria-hidden="true">
                {unit}
              </span>
            </div>
          </div>
        </div>
        {total !== config.weightTotal && (
          <p id={`${weightId}-help`} className="fx-sb-weight__help" data-status={total > config.weightTotal ? "error" : undefined}>
            {`${objectLabel(schema, group.object)} total ${total}${points ? " pts" : "%"} · ${total > config.weightTotal ? `${total - config.weightTotal} over` : `${config.weightTotal - total} left`}`}
          </p>
        )}
        <p className="fx-sb-sub">
          Group values as {config.categories.join(" / ")}; add as many as you need. {points ? "Each value's points are added to the total." : "Contribution = score × weight."}
        </p>
        {a.values.length === 0 ? (
          <div className="fx-sb-empty">
            <p className="fx-sb-strong">No values yet</p>
            <p className="fx-sb-sub">Example: {config.categories[0]} · India, China · 10.</p>
            <div className="fx-sb-actions">
              <Button variant="secondary" onClick={() => onChange({ ...a, values: config.categories.map((c) => newRow(c)) })}>
                Add {config.categories.join(" / ")} rows
              </Button>
              <Button variant="ghost" leadingIcon={<Plus />} onClick={() => onChange({ ...a, values: [newRow()] })}>
                Add value
              </Button>
            </div>
          </div>
        ) : (
          <div className="fx-sb-tablewrap">
            <table className={`fx-sb-table fx-sb-table--${type === "number" ? "range" : "list"}`}>
              <caption className="fx-visually-hidden">{label} values</caption>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  {type === "number" ? (
                    <>
                      <th scope="col">From</th>
                      <th scope="col">To</th>
                    </>
                  ) : (
                    <th scope="col">Value(s)</th>
                  )}
                  <th scope="col">{points ? "Points" : "Score"}</th>
                  <th scope="col">{points ? "Adds" : "Contrib."}</th>
                  <th scope="col">
                    <span className="fx-visually-hidden">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {a.values.map((row, i) => {
                  const n = i + 1;
                  return (
                    <tr key={row.id}>
                      <td>
                        <Select label={`Category, row ${n}`} hideLabel placeholder="Category" options={config.categories.map((c) => ({ value: c, label: c }))} value={row.category} onChange={(e) => setRow(row.id, { category: e.target.value })} status={showErrors && !row.category ? "error" : undefined} />
                      </td>
                      {type === "number" ? (
                        <>
                          <td>
                            <NumberField label={`From, row ${n}`} hideLabel value={row.from} onChange={(e) => setRow(row.id, { from: e.target.value })} />
                          </td>
                          <td>
                            <NumberField label={`To, row ${n}`} hideLabel placeholder="and above" value={row.to} onChange={(e) => setRow(row.id, { to: e.target.value })} />
                          </td>
                        </>
                      ) : (
                        <td>
                          <MultiSelect label={`Values, row ${n}`} hideLabel maxChips={1} placeholder="Select options" options={field?.options ?? []} value={row.values} onChange={(values) => setRow(row.id, { values })} status={showErrors && !row.values.length ? "error" : undefined} />
                        </td>
                      )}
                      <td>
                        <NumberField label={`${points ? "Points" : "Score"}, row ${n}`} hideLabel value={row.score} onChange={(e) => setRow(row.id, { score: e.target.value })} status={showErrors && toNumber(row.score) === null ? "error" : undefined} />
                      </td>
                      <td className="fx-sb-num">{contribution(row)}</td>
                      <td>
                        <IconButton variant="ghost" size="sm" label={`Remove row ${n}`} icon={<Trash2 />} onClick={() => onChange({ ...a, values: a.values.filter((r) => r.id !== row.id) })} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="fx-sb-tablefoot">
              <Button variant="ghost" size="s" leadingIcon={<Plus />} onClick={() => onChange({ ...a, values: [...a.values, newRow()] })}>
                {type === "number" ? "Add range" : "Add value"}
              </Button>
            </div>
          </div>
        )}
      </section>
      <OverrideRules {...props} objectId={group.id} attributeId={a.id} title={`${label} override rules`} description="When a rule matches, it replaces or raises the result: force a band, set a score, or raise to the matched score." />
    </>
  );
}

/* ---------------------------------------------------------------- Outcome bands (Step 3) · frames 30, 31, 37, 54 */

/** Edge sentence for a band (R26): "Up to and including" / "Above 55, up to and including" / "Above". */
function edgeLabels(prev: Band | undefined) {
  const prevUpTo = prev ? toNumber(prev.upTo) : null;
  const from = prevUpTo === null ? "" : prev?.inclusive === false ? `From ${prevUpTo}, ` : `Above ${prevUpTo}, `;
  return {
    inclusive: from ? `${from}up to and including` : "Up to and including",
    exclusive: from ? `${from}below` : "Below",
    open: prevUpTo === null ? "Any score" : prev?.inclusive === false ? "From" : "Above",
  };
}

export function BandsPane({ config, input, update, showErrors }: Pick<PaneBase, "config" | "input" | "update"> & { showErrors: boolean }) {
  const problem = bandProblem(input.bands);
  const set = (id: string, patch: Partial<Band>) => update({ bands: input.bands.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  const max = config.descriptionMaxWords;
  return (
    <>
      <p className="fx-sb-path">Result › Outcome bands</p>
      <section className="fx-sb-card" aria-labelledby="fx-sb-bands">
        <h2 id="fx-sb-bands" className="fx-sb-card__title fx-sb-card__title--lg">
          Outcome bands
        </h2>
        <p className="fx-sb-sub">Give each band a label and an optional description (max {max} words). The description shows as a tooltip wherever the band appears.</p>
        {problem && input.bands.length > 0 && (showErrors || problem.startsWith("Bands overlap")) && <Alert status="error" title={problem.startsWith("Bands overlap") ? "Bands overlap" : problem}>{problem.startsWith("Bands overlap") ? problem : undefined}</Alert>}
        {input.bands.map((b, i) => {
          const last = i === input.bands.length - 1;
          const prev = i > 0 ? input.bands[i - 1] : undefined;
          const labels = edgeLabels(prev);
          const words = wordCount(b.description);
          const n = i + 1;
          return (
            <div key={b.id} className="fx-sb-band-row" role="group" aria-label={`Band ${n}`}>
              <div className="fx-sb-band-row__line">
                <span className="fx-sb-rule__word">Score</span>
                {last ? (
                  <>
                    <Select label={`Band ${n} edge`} hideLabel options={[{ value: "open", label: labels.open }]} value="open" onChange={() => {}} />
                    {prev && <NumberField label={`Band ${n} starts after`} hideLabel value={prev.upTo} readOnly />}
                  </>
                ) : (
                  <>
                    <Select
                      label={`Band ${n} edge`}
                      hideLabel
                      options={[
                        { value: "incl", label: labels.inclusive },
                        { value: "excl", label: labels.exclusive },
                      ]}
                      value={b.inclusive === false ? "excl" : "incl"}
                      onChange={(e) => set(b.id, { inclusive: e.target.value !== "excl" })}
                    />
                    <NumberField label={`Band ${n} upper limit`} hideLabel min={0} max={config.weightTotal} value={b.upTo} onChange={(e) => set(b.id, { upTo: e.target.value })} status={showErrors && toNumber(b.upTo) === null ? "error" : undefined} />
                  </>
                )}
                <span className="fx-sb-arrow" aria-hidden="true">
                  →
                </span>
                <TextField label={`Band ${n} label`} hideLabel placeholder="Band label, e.g. Low Risk" value={b.label} onChange={(e) => set(b.id, { label: e.target.value })} status={showErrors && !b.label.trim() ? "error" : undefined} />
                {b.description.trim() ? (
                  <Tooltip content={b.description}>
                    <IconButton variant="ghost" size="sm" label={`Preview tooltip for ${b.label || `band ${n}`}`} icon={<Info />} />
                  </Tooltip>
                ) : (
                  <IconButton variant="ghost" size="sm" label={`Preview tooltip for ${b.label || `band ${n}`}`} icon={<Info />} disabled />
                )}
                <IconButton variant="ghost" size="sm" label={`Remove band ${n}`} icon={<Trash2 />} onClick={() => update({ bands: input.bands.filter((x) => x.id !== b.id) })} />
              </div>
              <TextArea
                label={`Band ${n} description`}
                hideLabel
                placeholder="Description (optional) · shown as a tooltip"
                value={b.description}
                onChange={(e) => set(b.id, { description: e.target.value })}
                status={words > max ? "error" : undefined}
                helperText={`${words} / ${max} words`}
              />
            </div>
          );
        })}
        <div className="fx-sb-end">
          <Button size="s" leadingIcon={<Plus />} onClick={() => update({ bands: [...input.bands, { id: newId(), upTo: "", label: "", description: "", inclusive: true }] })}>
            Add band
          </Button>
        </div>
      </section>
    </>
  );
}

/* ---------------------------------------------------------------- All overrides (Step 3) · frame 32 */

export function OverridesPane({ config, schema, input, update, onOpen }: Pick<PaneBase, "config" | "schema" | "input" | "update"> & { onOpen: (o: OverrideRule) => void }) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");
  // Raise rules are checked first (Q78), so they are listed first; the rest keep their order (V6-07).
  const ordered = [...input.overrides.filter((o) => o.outcome.type === "raise"), ...input.overrides.filter((o) => o.outcome.type !== "raise")];
  const move = (from: number, to: number) => {
    if (to < 0 || to >= ordered.length || from === to) return;
    const next = [...ordered];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x!);
    update({ overrides: next });
    setAnnounce(`Rule moved to position ${to + 1} of ${next.length}`);
  };
  const onGripKey = (i: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const to = e.key === "ArrowUp" ? i - 1 : i + 1;
      move(i, to);
      requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-grip="${to}"]`)?.focus());
    }
  };
  const scope = (o: OverrideRule) => {
    const g = input.objects.find((x) => x.id === o.objectId);
    if (!g) return "—";
    const a = g.attributes.find((x) => x.id === o.attributeId);
    return a ? `${objectLabel(schema, g.object)} › ${attributeLabel(schema, g.object, a)}` : `${objectLabel(schema, g.object)} (object)`;
  };
  const outcome = (o: OverrideRule) => {
    const type = config.outcomeTypes.find((t) => t.value === o.outcome.type)?.label ?? "No outcome yet";
    const band = input.bands.find((b) => b.id === o.outcome.value)?.label;
    return o.outcome.type === "setScore" ? `${type} ${o.outcome.value}` : band ? `${type} ${band}` : type;
  };
  return (
    <>
      <p className="fx-sb-path">Result › Overrides</p>
      <section className="fx-sb-card" aria-labelledby="fx-sb-overrides">
        <div className="fx-sb-card__head">
          <Zap className="fx-sb-icon" aria-hidden="true" />
          <h2 id="fx-sb-overrides" className="fx-sb-card__title fx-sb-card__title--sm">
            All override rules
          </h2>
          <Badge status={input.overrides.length ? "warning" : "neutral"}>{`${input.overrides.length} ${input.overrides.length === 1 ? "rule" : "rules"}`}</Badge>
        </div>
        <p className="fx-sb-sub">Raise rules are checked first, then the others in this order; drag to reorder. Which rule wins when several match is still to be confirmed.</p>
        {input.overrides.length === 0 && <p className="fx-sb-sub">No override rules. Add them on an object or attribute.</p>}
        <ol className="fx-sb-ordered">
          {ordered.map((o, i) => (
            <li
              key={o.id}
              className="fx-sb-ordered__item"
              data-dragging={dragging === i || undefined}
              onDragOver={(e: DragEvent) => dragging !== null && e.preventDefault()}
              onDrop={() => {
                if (dragging !== null) move(dragging, i);
                setDragging(null);
              }}
            >
              <button
                type="button"
                className="fx-sb-grip"
                data-grip={i}
                draggable
                aria-label={`Reorder rule ${i + 1}. Use arrow up or down to move.`}
                onDragStart={() => setDragging(i)}
                onDragEnd={() => setDragging(null)}
                onKeyDown={onGripKey(i)}
              >
                <GripVertical aria-hidden="true" />
              </button>
              <span className="fx-sb-ordered__n">{i + 1}</span>
              <span className="fx-sb-stack fx-sb-grow">
                <span className="fx-sb-ordered__text">
                  If {conditionsText(o.conditions, conditionSchema(schema, input, config), config.operatorsByType, "sentence", input.objects.find((g) => g.id === o.objectId)?.object) || "…"} → {outcome(o)}
                </span>
                <span className="fx-sb-sub">{scope(o)}</span>
              </span>
              <Button variant="ghost" size="s" onClick={() => onOpen(o)}>
                Edit
              </Button>
            </li>
          ))}
        </ol>
        <p className="fx-visually-hidden" aria-live="polite">
          {announce}
        </p>
      </section>
    </>
  );
}
