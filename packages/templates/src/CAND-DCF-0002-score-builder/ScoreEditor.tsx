import { Alert, Badge, Button, ConfirmDialog, IconButton, Menu, OutlineRow, SegmentedControl, Spinner, Toast, allRules, type ConditionObject } from "@fynxt/ui";
import { ArrowRight, Box, ChevronDown, ChevronLeft, ChevronRight, Copy, FileText, MoreVertical, Plus, Target, Trash2, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AttributePicker } from "./AttributePicker";
import { AttributePane, BandsPane, DetailsPane, LOGIC_OPTIONS, ObjectPane, OverridesPane, logicWords, newId, unusedFields } from "./EditorPanes";
import { attributeLabel, collectIssues, distribute, fieldOf, isAttributeComplete, issueArea, objectLabel, readout, toNumber, weightSum, type Selection } from "./model";
import type { Logic, ScoreAttribute, ScoreBuilderConfig, ScoreModel, ScoreModelInput, ScoreObjectGroup } from "./types";

export interface ScoreEditorProps {
  config: ScoreBuilderConfig;
  /** Omit to create a new model. */
  modelId?: string;
  /** `notice` is a success message for the list (frame 34). */
  onClose: (notice?: string) => void;
}

type Load = { state: "loading" } | { state: "notFound" } | { state: "ready" };
type Dialog = null | { kind: "leave" } | { kind: "removeObject"; group: ScoreObjectGroup } | { kind: "removeAttribute"; group: ScoreObjectGroup; attribute: ScoreAttribute };

const emptyInput = (): ScoreModelInput => ({ name: "", description: "", method: "weighted", appliesTo: { match: "all", items: [] }, objects: [], connectors: [], bands: [], overrides: [] });
const toInput = (m: ScoreModel): ScoreModelInput => ({ name: m.name, description: m.description, method: m.method, appliesTo: m.appliesTo, objects: m.objects, connectors: m.connectors, bands: m.bands, overrides: m.overrides });

/** Rules anywhere (overrides) that check an object, so removing it can warn (frame 29 · Remove Deal). */
const overridesUsing = (input: ScoreModelInput, group: ScoreObjectGroup) =>
  input.overrides.filter((o) => o.objectId === group.id || allRules(o.conditions).some((r) => r.object === group.object));

/**
 * P1 · Score Builder, full screen without the app shell (D17, Q45). Logic outline · editor · summary
 * (on demand, D31). Approved Figma version 2412391106275681573 (rev 6).
 */
export function ScoreEditor({ config, modelId, onClose }: ScoreEditorProps) {
  const { adapter } = config;
  const [load, setLoad] = useState<Load>(modelId ? { state: "loading" } : { state: "ready" });
  const [model, setModel] = useState<ScoreModel | null>(null);
  const [input, setInput] = useState<ScoreModelInput>(emptyInput);
  const [saved, setSaved] = useState(() => JSON.stringify(emptyInput()));
  const [schema, setSchema] = useState<ConditionObject[]>([]);
  const [schemaStatus, setSchemaStatus] = useState<"loading" | "ready" | "error">("loading");
  const [schemaTick, setSchemaTick] = useState(0);
  const [selection, setSelection] = useState<Selection>({ kind: "details" });
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [summaryOpen, setSummaryOpen] = useState(true); // D31 / Q64: shown on every launch, not remembered.
  const [showErrors, setShowErrors] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [howItWorksOpen, setHowItWorksOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [undo, setUndo] = useState<{ message: string; snapshot: ScoreModelInput } | null>(null);

  useEffect(() => {
    if (!modelId) return;
    adapter.get(modelId).then(
      (m) => {
        setModel(m);
        setInput(toInput(m));
        setSaved(JSON.stringify(toInput(m)));
        // Frame 35: an existing model opens on its first attribute.
        const g = m.objects[0];
        const a = g?.attributes[0];
        if (g && a) setSelection({ kind: "attribute", objectId: g.id, attributeId: a.id });
        setLoad({ state: "ready" });
      },
      () => setLoad({ state: "notFound" })
    );
  }, [adapter, modelId]);

  useEffect(() => {
    let live = true;
    setSchemaStatus("loading");
    adapter.schema().then(
      (s) => {
        if (!live) return;
        setSchema(s);
        setSchemaStatus("ready");
      },
      () => live && setSchemaStatus("error")
    );
    return () => {
      live = false;
    };
  }, [adapter, schemaTick]);

  const dirty = JSON.stringify(input) !== saved;
  const issues = useMemo(() => collectIssues(input, schema, config.operatorsByType, config), [input, schema, config]);
  const update = useCallback((patch: Partial<ScoreModelInput>) => setInput((i) => ({ ...i, ...patch })), []);
  const setGroup = (id: string, patch: Partial<ScoreObjectGroup>) => update({ objects: input.objects.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  const setAttribute = (groupId: string, a: ScoreAttribute) => setGroup(groupId, { attributes: input.objects.find((g) => g.id === groupId)!.attributes.map((x) => (x.id === a.id ? a : x)) });
  const status = config.statuses.find((s) => s.value === (model?.status ?? config.draftStatus));
  const unit = input.method === "points" ? " pts" : "%";

  function remember(message: string) {
    setUndo({ message, snapshot: input });
  }

  function addObject(objectId: string) {
    const g: ScoreObjectGroup = { id: newId(), object: objectId, logic: null, attributes: [] };
    update({ objects: [...input.objects, g], connectors: input.objects.length ? [...input.connectors, null] : input.connectors });
    setSelection({ kind: "object", objectId: g.id });
  }

  function removeObject(group: ScoreObjectGroup) {
    const i = input.objects.findIndex((g) => g.id === group.id);
    const connectors = [...input.connectors];
    if (connectors.length) connectors.splice(Math.max(0, i - 1), 1);
    const dropped = new Set(overridesUsing(input, group).map((o) => o.id));
    remember(`${objectLabel(schema, group.object)} removed`);
    update({ objects: input.objects.filter((g) => g.id !== group.id), connectors, overrides: input.overrides.filter((o) => !dropped.has(o.id)) });
    setSelection({ kind: "details" });
  }

  function removeAttribute(group: ScoreObjectGroup, a: ScoreAttribute) {
    remember(`${attributeLabel(schema, group.object, a)} removed`);
    update({
      objects: input.objects.map((g) => (g.id === group.id ? { ...g, attributes: g.attributes.filter((x) => x.id !== a.id) } : g)),
      overrides: input.overrides.filter((o) => o.attributeId !== a.id),
    });
    setSelection({ kind: "object", objectId: group.id });
  }

  function duplicateAttribute(group: ScoreObjectGroup, a: ScoreAttribute) {
    const copy: ScoreAttribute = { ...structuredClone(a), id: newId(), weight: "0", values: a.values.map((r) => ({ ...r, id: newId() })) };
    const at = group.attributes.findIndex((x) => x.id === a.id);
    const attributes = [...group.attributes];
    attributes.splice(at + 1, 0, copy);
    setGroup(group.id, { attributes });
    setSelection({ kind: "attribute", objectId: group.id, attributeId: copy.id });
  }

  function addAttributes(group: ScoreObjectGroup, fields: string[]) {
    const added = fields.map((field) => ({ id: newId(), field, weight: "", values: [] }));
    if (!added.length) return;
    setGroup(group.id, { attributes: [...group.attributes, ...added] });
    setSelection({ kind: "attribute", objectId: group.id, attributeId: added[0]!.id });
  }

  function distributeEvenly(group: ScoreObjectGroup) {
    const shares = distribute(config.weightTotal, group.attributes.length);
    setGroup(group.id, { attributes: group.attributes.map((a, i) => ({ ...a, weight: String(shares[i]) })) });
  }

  async function save() {
    if (issues.length) {
      setShowErrors(true);
      setSelection(issues[0]!.target);
      return;
    }
    setBusy(true);
    setSaveError(false);
    try {
      const result = model ? await adapter.update(model.id, input) : await adapter.create(input);
      setSaved(JSON.stringify(input));
      onClose(`Score model “${result.name}” saved`);
    } catch {
      setSaveError(true);
    } finally {
      setBusy(false);
    }
  }

  function requestLeave() {
    if (dirty) setDialog({ kind: "leave" });
    else onClose();
  }

  if (load.state !== "ready") {
    return (
      <div className="fx-sb-editor">
        <header className="fx-sb-editor__header">
          <IconButton variant="ghost" size="sm" label="Back to Score Builder" icon={<ChevronLeft />} onClick={() => onClose()} />
          <div className="fx-sb-editor__heading">
            <p className="fx-sb-crumbs">{config.copy.breadcrumb.join(" › ")}</p>
            <p className="fx-sb-editor__title">{load.state === "loading" ? "Loading…" : "Score model not found"}</p>
          </div>
        </header>
        <div className="fx-sb-state fx-sb-state--page" role="status">
          {load.state === "loading" ? (
            <>
              <Spinner />
              <span>Loading score model…</span>
            </>
          ) : (
            <div className="fx-sb-empty">
              <p className="fx-sb-strong">This score model no longer exists</p>
              <p className="fx-sb-sub">It may have been deleted. Go back to the list to pick another model.</p>
              <Button onClick={() => onClose()}>Back to Score Builder</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const selectedGroup = selection.kind === "object" || selection.kind === "attribute" ? input.objects.find((g) => g.id === selection.objectId) : undefined;
  const selectedAttr = selection.kind === "attribute" ? selectedGroup?.attributes.find((a) => a.id === selection.attributeId) : undefined;
  const paneBase = { config, schema, schemaStatus, onRetrySchema: () => setSchemaTick((t) => t + 1), input, update };
  const allCollapsed = input.objects.length > 0 && input.objects.every((g) => collapsedGroups[g.id]);
  const issueLabel = `${issues.length} ${issues.length === 1 ? "issue" : "issues"}`;
  // Frame 27: "1 issue · outcome bands"; several issues show the count only (frame 12).
  const issueLine = issues.length === 1 ? `${issueLabel} · ${issueArea(issues[0]!.target, schema, input)}` : issueLabel;
  const objectIcon = (objectId: string) => config.objectIcons?.[objectId] ?? <Box />;

  // Frame 06 / 22: object menu. Primary inside the empty outline (frame 03), full width below the groups.
  const addObjectMenu = (primary = false) => (
    <Menu
      label="Choose an object"
      heading="Objects"
      align="start"
      items={schema.map((o) => ({ id: o.id, label: o.label, onSelect: () => addObject(o.id) }))}
      renderTrigger={(t) => (
        <Button {...t} variant={primary ? "primary" : "secondary"} size="s" leadingIcon={<Plus />} disabled={schemaStatus !== "ready"} className={primary ? undefined : "fx-sb-addobject"}>
          Add object
        </Button>
      )}
    />
  );

  return (
    <div className="fx-sb-editor">
      <header className="fx-sb-editor__header">
        <IconButton variant="ghost" size="sm" label="Back to Score Builder" icon={<ChevronLeft />} onClick={requestLeave} />
        <div className="fx-sb-editor__heading">
          <nav aria-label="Breadcrumb">
            <p className="fx-sb-crumbs">{config.copy.breadcrumb.join(" › ")}</p>
          </nav>
          <div className="fx-sb-editor__title-row">
            <h1 className="fx-sb-editor__title">{input.name.trim() || "New score model"}</h1>
            {status && <Badge status="neutral">{status.label}</Badge>}
          </div>
        </div>
        <div className="fx-sb-editor__header-actions">
          {issues.length > 0 && dirty ? (
            <Menu
              label="Issues to fix"
              heading={<span className="fx-sb-strong">{`${issueLabel} to fix before saving`}</span>}
              align="end"
              items={issues.map((iss) => ({ id: iss.id, label: iss.message, trailing: <ArrowRight />, onSelect: () => setSelection(iss.target) }))}
              renderTrigger={(t) => (
                <button {...t} type="button" className="fx-sb-issues">
                  {issueLine}
                </button>
              )}
            />
          ) : (
            <span className="fx-sb-sub" aria-live="polite">
              {model && !dirty ? "All changes saved" : dirty ? "Unsaved changes" : "Not saved yet"}
            </span>
          )}
          <Button variant="secondary" onClick={requestLeave} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy} disabled={!dirty || issues.length > 0}>
            Save score model
          </Button>
        </div>
      </header>

      <div className="fx-sb-editor__body" data-summary={summaryOpen ? "open" : "hidden"}>
        {/* ---------------- Left: logic outline (D20 / D30) */}
        <nav className="fx-sb-outline" aria-label="Model outline">
          <p className="fx-sb-label">Step 1 · Model</p>
          <button type="button" className="fx-sb-navitem" aria-current={selection.kind === "details" ? "true" : undefined} onClick={() => setSelection({ kind: "details" })}>
            <FileText aria-hidden="true" />
            Details &amp; scope
          </button>

          <div className="fx-sb-outline__label-row">
            <p className="fx-sb-label">Step 2 · Objects &amp; logic</p>
            <span className="fx-sb-sub">
              {input.objects.length} {input.objects.length === 1 ? "object" : "objects"}
            </span>
            {input.objects.length > 1 && (
              <Button variant="ghost" size="s" onClick={() => setCollapsedGroups(Object.fromEntries(input.objects.map((g) => [g.id, !allCollapsed])))}>
                {allCollapsed ? "Expand all" : "Collapse all"}
              </Button>
            )}
          </div>

          {input.objects.length === 0 && (
            <div className="fx-sb-empty fx-sb-empty--outline">
              <p className="fx-sb-sub">Add the object you want to score, e.g. Contact. You can add more and join them with AND / OR.</p>
              {addObjectMenu(true)}
            </div>
          )}

          {input.objects.map((g, gi) => {
            const name = objectLabel(schema, g.object);
            const collapsed = Boolean(collapsedGroups[g.id]);
            const sum = weightSum(g);
            const objOverrides = input.overrides.some((o) => o.objectId === g.id);
            return (
              <div key={g.id} className="fx-sb-group-wrap">
                {gi > 0 && (
                  <div className="fx-sb-connector">
                    <SegmentedControl
                      size="sm"
                      label={`Join ${objectLabel(schema, input.objects[gi - 1]!.object)} and ${name} with`}
                      options={LOGIC_OPTIONS}
                      value={input.connectors[gi - 1] ?? null}
                      onChange={(v: Logic) => update({ connectors: input.connectors.map((c, ci) => (ci === gi - 1 ? v : c)) })}
                      invalid={showErrors && !input.connectors[gi - 1]}
                    />
                    <p className="fx-sb-sub">{input.connectors[gi - 1] === "and" ? "Both objects must match" : input.connectors[gi - 1] === "or" ? "Either object can match" : "Choose AND or OR to join these objects"}</p>
                  </div>
                )}
                <section className="fx-sb-group" aria-label={name} data-selected={selection.kind === "object" && selection.objectId === g.id ? true : undefined}>
                  <div className="fx-sb-group__head">
                    <IconButton variant="ghost" size="sm" label={`${collapsed ? "Expand" : "Collapse"} ${name}`} aria-expanded={!collapsed} icon={collapsed ? <ChevronRight /> : <ChevronDown />} onClick={() => setCollapsedGroups((c) => ({ ...c, [g.id]: !collapsed }))} />
                    <button type="button" className="fx-sb-group__name" aria-current={selection.kind === "object" && selection.objectId === g.id ? "true" : undefined} onClick={() => setSelection({ kind: "object", objectId: g.id })}>
                      <span className="fx-sb-group__icon" aria-hidden="true">
                        {objectIcon(g.object)}
                      </span>
                      {name}
                      {objOverrides && <Zap className="fx-sb-icon" aria-label="has override rules" />}
                    </button>
                    <span className="fx-sb-sub">{g.attributes.length ? `${g.attributes.length} ${g.attributes.length === 1 ? "attribute" : "attributes"}` : "No attributes"}</span>
                    <Badge status={!g.attributes.length ? "neutral" : sum === config.weightTotal ? "success" : sum > config.weightTotal ? "error" : "warning"}>{`${sum}${unit}`}</Badge>
                    <Menu
                      label={`${name} actions`}
                      align="end"
                      items={[
                        { id: "collapse", label: collapsed ? "Expand" : "Collapse", onSelect: () => setCollapsedGroups((c) => ({ ...c, [g.id]: !collapsed })) },
                        { id: "distribute", label: "Distribute weights evenly", disabled: !g.attributes.length, onSelect: () => distributeEvenly(g) },
                        { id: "remove", label: "Remove object", destructive: true, onSelect: () => setDialog({ kind: "removeObject", group: g }) },
                      ]}
                      renderTrigger={(t) => <IconButton {...t} variant="ghost" size="sm" label={`${name} actions`} icon={<MoreVertical />} />}
                    />
                  </div>
                  <div className="fx-sb-group__logic">
                    <span className="fx-sb-sub">{logicWords(g.logic)}</span>
                    <SegmentedControl size="sm" label={`Join ${name} attributes with`} options={LOGIC_OPTIONS} value={g.logic} onChange={(logic: Logic) => setGroup(g.id, { logic })} invalid={showErrors && g.attributes.length > 1 && !g.logic} />
                  </div>
                  {!collapsed && (
                    <>
                      <div className="fx-sb-group__rows">
                        {g.attributes.map((a) => {
                          const type = fieldOf(schema, g.object, a.field)?.type;
                          const done = isAttributeComplete(a, type);
                          const label = attributeLabel(schema, g.object, a);
                          const w = toNumber(a.weight);
                          return (
                            <OutlineRow
                              key={a.id}
                              name={label}
                              meta={a.values.length ? (w === null ? "—" : `${w}${unit}`) : "No values"}
                              status={done ? "complete" : "incomplete"}
                              statusLabel={done ? "Complete" : !a.values.length ? "No values yet" : "Incomplete"}
                              selected={selection.kind === "attribute" && selection.attributeId === a.id}
                              override={input.overrides.some((o) => o.attributeId === a.id)}
                              onSelect={() => setSelection({ kind: "attribute", objectId: g.id, attributeId: a.id })}
                              actions={
                                <>
                                  <IconButton variant="ghost" size="sm" label={`Duplicate ${label}`} icon={<Copy />} onClick={() => duplicateAttribute(g, a)} />
                                  <IconButton variant="ghost" size="sm" label={`Remove ${label}`} icon={<Trash2 />} onClick={() => setDialog({ kind: "removeAttribute", group: g, attribute: a })} />
                                </>
                              }
                            />
                          );
                        })}
                      </div>
                      <div className="fx-sb-group__actions">
                        <AttributePicker objectName={name} fields={unusedFields(schema, g)} onAdd={(fields) => addAttributes(g, fields)} disabled={schemaStatus !== "ready"} />
                        {g.attributes.length > 1 && (
                          <Button variant="ghost" size="s" onClick={() => distributeEvenly(g)}>
                            Distribute evenly
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </section>
              </div>
            );
          })}

          {input.objects.length > 0 && addObjectMenu()}

          <p className="fx-sb-label">Step 3 · Result</p>
          <button type="button" className="fx-sb-navitem" aria-current={selection.kind === "bands" ? "true" : undefined} onClick={() => setSelection({ kind: "bands" })}>
            <Target aria-hidden="true" />
            Outcome bands
          </button>
          <button type="button" className="fx-sb-navitem" aria-current={selection.kind === "overrides" ? "true" : undefined} onClick={() => setSelection({ kind: "overrides" })}>
            <Zap aria-hidden="true" />
            Overrides{input.overrides.length ? ` · ${input.overrides.length}` : ""}
          </button>
        </nav>

        {/* ---------------- Centre: editor */}
        <main className="fx-sb-pane" aria-label="Editor">
          {saveError && (
            <Alert
              status="error"
              title="Couldn't save the score model"
              action={
                <Button variant="secondary" size="s" onClick={save}>
                  Retry
                </Button>
              }
            >
              Your changes are still here. Check your connection and try again.
            </Alert>
          )}
          {selection.kind === "details" && <DetailsPane {...paneBase} showErrors={showErrors} howItWorksOpen={howItWorksOpen} onCloseHowItWorks={() => setHowItWorksOpen(false)} />}
          {selection.kind === "object" && selectedGroup && (
            <ObjectPane {...paneBase} group={selectedGroup} showErrors={showErrors} onLogic={(logic) => setGroup(selectedGroup.id, { logic })} onAddAttributes={(fields) => addAttributes(selectedGroup, fields)} />
          )}
          {selection.kind === "attribute" && selectedGroup && selectedAttr && (
            <AttributePane
              {...paneBase}
              group={selectedGroup}
              attribute={selectedAttr}
              showErrors={showErrors}
              onChange={(a) => setAttribute(selectedGroup.id, a)}
              onDuplicate={() => duplicateAttribute(selectedGroup, selectedAttr)}
              onDistribute={() => distributeEvenly(selectedGroup)}
            />
          )}
          {selection.kind === "bands" && <BandsPane config={config} input={input} update={update} showErrors={showErrors} />}
          {selection.kind === "overrides" && (
            <OverridesPane config={config} schema={schema} input={input} update={update} onOpen={(o) => setSelection(o.attributeId ? { kind: "attribute", objectId: o.objectId, attributeId: o.attributeId } : { kind: "object", objectId: o.objectId })} />
          )}
        </main>

        {/* ---------------- Right: summary on demand (D18 minimal, D31 hide / show) */}
        {summaryOpen ? (
          <aside className="fx-sb-summary" aria-label="Summary">
            <div className="fx-sb-summary__head">
              <h2 className="fx-sb-card__title">Summary</h2>
              <IconButton variant="ghost" size="sm" label="Hide summary" icon={<ChevronRight />} onClick={() => setSummaryOpen(false)} />
            </div>
            <p className="fx-sb-label">Logic</p>
            <div className="fx-sb-readout" aria-live="polite">
              {input.objects.length === 0 && <span className="fx-sb-sub">Add an object to build the logic.</span>}
              {readout(input, schema).map((r, i) => (
                <div key={i} className="fx-sb-stack">
                  {r.joinBefore && <span className="fx-sb-op">{r.joinBefore}</span>}
                  <span className="fx-sb-strong">{r.object}</span>
                  <span className="fx-sb-sub">{r.attributes}</span>
                </div>
              ))}
              {input.overrides.length > 0 && (
                <span className="fx-sb-op">
                  {input.overrides.length} override {input.overrides.length === 1 ? "rule" : "rules"} can replace or raise the result
                </span>
              )}
            </div>
            <p className="fx-sb-label">{input.method === "points" ? "Points" : "Weights"}</p>
            {input.objects.length === 0 ? (
              <span className="fx-sb-sub">—</span>
            ) : (
              <ul className="fx-sb-weights">
                {input.objects.map((g) => {
                  const sum = weightSum(g);
                  const diff = config.weightTotal - sum;
                  return (
                    <li key={g.id}>
                      <span>{objectLabel(schema, g.object)}</span>
                      <Badge status={!g.attributes.length ? "neutral" : diff === 0 ? "success" : diff < 0 ? "error" : "warning"}>
                        {`${sum}${unit}`}
                        {g.attributes.length && diff !== 0 ? ` · ${diff > 0 ? `${diff}${unit} left` : `${-diff}${unit} over`}` : ""}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        ) : (
          <button type="button" className="fx-sb-fab" aria-label={`Show summary${issues.length ? `, ${issueLabel}` : ""}`} onClick={() => setSummaryOpen(true)}>
            <ChevronLeft aria-hidden="true" />
            {issues.length > 0 && <Badge status="warning">{issues.length}</Badge>}
          </button>
        )}
      </div>

      {undo && (
        <div className="fx-sb-toast fx-sb-toast--bottom">
          <Toast status="info" onClose={() => setUndo(null)}>
            {undo.message}.{" "}
            <button
              type="button"
              className="fx-sb-link"
              onClick={() => {
                setInput(undo.snapshot);
                setUndo(null);
              }}
            >
              Undo
            </button>
          </Toast>
        </div>
      )}

      <ConfirmDialog
        open={dialog?.kind === "leave"}
        title="Discard unsaved changes?"
        message="Your changes to this score model will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onCancel={() => setDialog(null)}
        onConfirm={() => onClose()}
      />
      <ConfirmDialog
        open={dialog?.kind === "removeObject"}
        title={dialog?.kind === "removeObject" ? `Remove ${objectLabel(schema, dialog.group.object)} from this model?` : ""}
        message={
          dialog?.kind === "removeObject"
            ? [
                `Its ${dialog.group.attributes.length} ${dialog.group.attributes.length === 1 ? "attribute" : "attributes"}${input.objects.length > 1 ? " and its connector" : ""} will be removed.`,
                overridesUsing(input, dialog.group).length ? `${overridesUsing(input, dialog.group).length} override ${overridesUsing(input, dialog.group).length === 1 ? "rule uses" : "rules use"} it and will be removed too.` : "",
              ]
                .filter(Boolean)
                .join(" ")
            : ""
        }
        confirmLabel="Remove"
        destructive
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.kind === "removeObject") removeObject(dialog.group);
          setDialog(null);
        }}
      />
      <ConfirmDialog
        open={dialog?.kind === "removeAttribute"}
        title={dialog?.kind === "removeAttribute" ? `Remove ${attributeLabel(schema, dialog.group.object, dialog.attribute)}?` : ""}
        message={dialog?.kind === "removeAttribute" ? `Its values and weight (${dialog.attribute.weight || 0}${unit}) will be removed.` : ""}
        confirmLabel="Remove"
        destructive
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.kind === "removeAttribute") removeAttribute(dialog.group, dialog.attribute);
          setDialog(null);
        }}
      />
    </div>
  );
}
