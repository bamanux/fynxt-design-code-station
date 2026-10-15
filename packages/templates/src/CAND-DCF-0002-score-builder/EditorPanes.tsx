import {
  Alert,
  Badge,
  Button,
  ConditionBuilder,
  IconButton,
  MultiSelect,
  NumberField,
  SegmentedControl,
  Select,
  TextArea,
  TextField,
  Tooltip,
  summarize,
  type ConditionObject,
} from "@fynxt/ui";
import { ArrowDown, ArrowUp, Copy, Info, Plus, Trash2, Zap } from "lucide-react";
import { attributeLabel, bandProblem, fieldOf, objectLabel, toNumber, wordCount } from "./model";
import type { Band, Logic, OverrideRule, ScoreAttribute, ScoreBuilderConfig, ScoreModelInput, ScoreObjectGroup, ValueRow } from "./types";

export const LOGIC_OPTIONS: { value: Logic; label: string }[] = [
  { value: "and", label: "AND" },
  { value: "or", label: "OR" },
];

/** D30: AND / OR explained in words next to the switch. */
export const logicWords = (logic: Logic | null) => (logic === "and" ? "All must match" : logic === "or" ? "Any can match" : "Choose how they combine");

export const newId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}`);

const emptyConditions = () => ({ match: "all" as const, items: [] });

interface PaneBase {
  config: ScoreBuilderConfig;
  schema: ConditionObject[];
  schemaStatus: "loading" | "ready" | "error";
  onRetrySchema: () => void;
  input: ScoreModelInput;
  update: (patch: Partial<ScoreModelInput>) => void;
}

/* ---------------------------------------------------------------- Details (Step 1) */

export function DetailsPane({ config, schema, schemaStatus, onRetrySchema, input, update, showErrors }: PaneBase & { showErrors: boolean }) {
  return (
    <>
      <Alert status="info" title="How scoring works">
        {config.copy.howItWorks}
      </Alert>
      <section className="fx-sb-card" aria-labelledby="fx-sb-details">
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
        <TextArea label="Description" placeholder="About the score model" value={input.description} onChange={(e) => update({ description: e.target.value })} />
      </section>
      <section className="fx-sb-card fx-sb-card--row" aria-labelledby="fx-sb-method">
        <div className="fx-sb-grow">
          <h2 id="fx-sb-method" className="fx-sb-card__title">
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
        <h2 id="fx-sb-applies" className="fx-sb-card__title">
          Applies to
        </h2>
        <ConditionBuilder
          objects={schema}
          operatorsByType={config.operatorsByType}
          value={input.appliesTo}
          onChange={(appliesTo) => update({ appliesTo })}
          status={schemaStatus}
          onRetry={onRetrySchema}
          limits={config.limits}
          showValidation={showErrors}
          description="Score only records that match All or Any of these conditions."
          emptyDescription="No conditions: every record of the selected objects is scored. Add a rule to narrow it down."
          createId={newId}
        />
      </section>
    </>
  );
}

/* ---------------------------------------------------------------- Override rules (attribute / object) */

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
  showErrors,
}: PaneBase & { objectId: string; attributeId?: string; title: string; showErrors: boolean }) {
  const mine = input.overrides.filter((o) => o.objectId === objectId && o.attributeId === attributeId);
  const bands = input.bands.filter((b) => b.label.trim());
  const set = (id: string, patch: Partial<OverrideRule>) => update({ overrides: input.overrides.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  return (
    <section className="fx-sb-card" aria-label={title}>
      <div className="fx-sb-card__head">
        <Zap className="fx-sb-icon" aria-hidden="true" />
        <h2 className="fx-sb-card__title">{title}</h2>
        <Badge status={mine.length ? "warning" : "neutral"}>{mine.length ? `${mine.length} ${mine.length === 1 ? "rule" : "rules"}` : "Optional"}</Badge>
      </div>
      <p className="fx-sb-sub">When a rule matches, it replaces the result: force a band, set a score, reject, or refer to compliance.</p>
      {mine.map((o, i) => {
        const needsBand = o.outcome.type === "forceBand" || o.outcome.type === "atLeastBand";
        const missing = showErrors && (!o.outcome.type || ((needsBand || o.outcome.type === "setScore") && !o.outcome.value));
        return (
          <div key={o.id} className="fx-sb-rule" aria-label={`Override rule ${i + 1}`} role="group">
            <ConditionBuilder
              objects={schema}
              operatorsByType={config.operatorsByType}
              value={o.conditions}
              onChange={(conditions) => set(o.id, { conditions })}
              status={schemaStatus}
              onRetry={onRetrySchema}
              limits={config.limits}
              showValidation={showErrors}
              description="If these conditions match:"
              emptyDescription="Add a rule, e.g. Deal › Approval status is not Approved."
              createId={newId}
            />
            <div className="fx-sb-rule__then">
              <span className="fx-sb-rule__word">Then</span>
              <Select
                label={`Outcome of rule ${i + 1}`}
                hideLabel
                placeholder="Choose outcome"
                options={config.outcomeTypes}
                value={o.outcome.type}
                onChange={(e) => set(o.id, { outcome: { type: e.target.value as OverrideRule["outcome"]["type"], value: "" } })}
                status={showErrors && !o.outcome.type ? "error" : undefined}
              />
              {needsBand && (
                <Select
                  label={`Band for rule ${i + 1}`}
                  hideLabel
                  placeholder="Choose band"
                  options={bands.map((b) => ({ value: b.id, label: b.label }))}
                  value={o.outcome.value}
                  onChange={(e) => set(o.id, { outcome: { ...o.outcome, value: e.target.value } })}
                  status={missing ? "error" : undefined}
                />
              )}
              {o.outcome.type === "setScore" && (
                <NumberField label={`Score for rule ${i + 1}`} hideLabel value={o.outcome.value} onChange={(e) => set(o.id, { outcome: { ...o.outcome, value: e.target.value } })} status={missing ? "error" : undefined} />
              )}
              <IconButton variant="ghost" size="sm" label={`Remove override rule ${i + 1}`} icon={<Trash2 />} onClick={() => update({ overrides: input.overrides.filter((x) => x.id !== o.id) })} />
            </div>
            {missing && <Alert status="error" title="Choose what this rule does" />}
          </div>
        );
      })}
      <div>
        <Button
          variant="secondary"
          leadingIcon={<Plus />}
          onClick={() => update({ overrides: [...input.overrides, { id: newId(), objectId, attributeId, conditions: emptyConditions(), outcome: { type: "", value: "" } }] })}
        >
          Add override
        </Button>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Object */

export function ObjectPane(props: PaneBase & { group: ScoreObjectGroup; showErrors: boolean; onLogic: (logic: Logic) => void }) {
  const { schema, group, onLogic, showErrors } = props;
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
            <p className="fx-sb-sub">One operator joins all attributes of this object. {logicWords(group.logic)}.</p>
          </div>
          <SegmentedControl label={`Join ${name} attributes with`} options={LOGIC_OPTIONS} value={group.logic} onChange={onLogic} invalid={showErrors && group.attributes.length > 1 && !group.logic} />
        </div>
      </section>
      <OverrideRules {...props} objectId={group.id} title={`${name} override rules`} />
    </>
  );
}

/* ---------------------------------------------------------------- Attribute */

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
          <div className="fx-sb-weight">
            <NumberField
              label={points ? "Max points" : "Weight %"}
              min={0}
              max={config.weightTotal}
              value={a.weight}
              onChange={(e) => onChange({ ...a, weight: e.target.value })}
              status={(showErrors && weight === null) || total > config.weightTotal ? "error" : undefined}
              helperText={
                total !== config.weightTotal
                  ? `${objectLabel(schema, group.object)} total ${total}${points ? " pts" : "%"} · ${total > config.weightTotal ? `${total - config.weightTotal} over` : `${config.weightTotal - total} left`}`
                  : undefined
              }
            />
          </div>
        </div>
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
                          <MultiSelect label={`Values, row ${n}`} hideLabel placeholder="Select options" options={field?.options ?? []} value={row.values} onChange={(values) => setRow(row.id, { values })} status={showErrors && !row.values.length ? "error" : undefined} />
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
      <OverrideRules {...props} objectId={group.id} attributeId={a.id} title={`${label} override rules`} />
    </>
  );
}

/* ---------------------------------------------------------------- Outcome bands (Step 3) */

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
          const prev = i > 0 ? toNumber(input.bands[i - 1]!.upTo) : null;
          const words = wordCount(b.description);
          const n = i + 1;
          return (
            <div key={b.id} className="fx-sb-band-row" role="group" aria-label={`Band ${n}`}>
              <div className="fx-sb-band-row__line">
                <span className="fx-sb-rule__word">Score</span>
                <span className="fx-sb-band-row__edge">{last ? (prev === null ? "Any score" : `Above ${prev}`) : prev === null ? "Up to and including" : `Above ${prev}, up to and including`}</span>
                {!last && <NumberField label={`Band ${n} upper limit`} hideLabel min={0} max={config.weightTotal} value={b.upTo} onChange={(e) => set(b.id, { upTo: e.target.value })} />}
                <span aria-hidden="true">→</span>
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
        <div>
          <Button variant="ghost" leadingIcon={<Plus />} onClick={() => update({ bands: [...input.bands, { id: newId(), upTo: "", label: "", description: "" }] })}>
            Add band
          </Button>
        </div>
      </section>
    </>
  );
}

/* ---------------------------------------------------------------- All overrides (Step 3) */

export function OverridesPane({ config, schema, input, update, onOpen }: Pick<PaneBase, "config" | "schema" | "input" | "update"> & { onOpen: (o: OverrideRule) => void }) {
  const move = (i: number, d: -1 | 1) => {
    const next = [...input.overrides];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x!);
    update({ overrides: next });
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
          <h2 id="fx-sb-overrides" className="fx-sb-card__title fx-sb-card__title--lg">
            All override rules
          </h2>
          <Badge status={input.overrides.length ? "warning" : "neutral"}>{`${input.overrides.length} ${input.overrides.length === 1 ? "rule" : "rules"}`}</Badge>
        </div>
        <p className="fx-sb-sub">Rules are checked in this order. Which rule wins when several match is still to be confirmed.</p>
        {input.overrides.length === 0 && <p className="fx-sb-sub">No override rules. Add them on an object or attribute.</p>}
        <ol className="fx-sb-ordered">
          {input.overrides.map((o, i) => (
            <li key={o.id} className="fx-sb-ordered__item">
              <span className="fx-sb-strong">{i + 1}</span>
              <span className="fx-sb-stack fx-sb-grow">
                <span>
                  If {summarize(o.conditions, schema, config.operatorsByType) || "…"} → {outcome(o)}
                </span>
                <span className="fx-sb-sub">{scope(o)}</span>
              </span>
              <IconButton variant="ghost" size="sm" label={`Move rule ${i + 1} up`} icon={<ArrowUp />} disabled={i === 0} onClick={() => move(i, -1)} />
              <IconButton variant="ghost" size="sm" label={`Move rule ${i + 1} down`} icon={<ArrowDown />} disabled={i === input.overrides.length - 1} onClick={() => move(i, 1)} />
              <Button variant="ghost" size="s" onClick={() => onOpen(o)}>
                Edit
              </Button>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
