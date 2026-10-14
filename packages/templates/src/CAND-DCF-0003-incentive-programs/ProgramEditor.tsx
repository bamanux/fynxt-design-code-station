import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  ConditionBuilder,
  ConfirmDialog,
  DataTable,
  IconButton,
  RadioGroup,
  Spinner,
  Stepper,
  TextArea,
  TextField,
  allRules,
  isRuleComplete,
  isRuleStale,
  type ConditionObject,
  type ConditionRule,
  type DataTableColumn,
} from "@fynxt/ui";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ParticipantPicker } from "./ParticipantPicker";
import type { BlockedEntry, IncentiveProgramsConfig, ManualEntry, Participant, ProgramInput, ProgramRecord } from "./types";

export interface ProgramEditorProps {
  config: IncentiveProgramsConfig;
  /** Omit to create a new program. */
  programId?: string;
  /** Called when the editor closes. `notice` is a success message for the list (frame L5). */
  onClose: (notice?: string) => void;
}

const STEPS = ["Participant type", "Enrollment criteria", "Participant blocking"];

type Schema = { state: "loading" } | { state: "error" } | { state: "ready"; objects: ConditionObject[] };
type Dialog = null | { kind: "leave" } | { kind: "changeType"; to: string; removedRules: ConditionRule[]; removedPeople: number } | { kind: "manual" } | { kind: "block" };

const today = () => new Date().toISOString().slice(0, 10);
const emptyInput = (participantType: string): ProgramInput => ({ name: "", description: "", participantType, criteria: { match: "all", items: [] }, manual: [], blocked: [] });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/**
 * P1 · Create / edit Incentive Program, full screen (DCF-0003 D3; DCF-0002 pattern: header + footer, no app shell).
 * Approved frames S1a–S3c and X1, version 2410117832155798624.
 */
export function ProgramEditor({ config, programId, onClose }: ProgramEditorProps) {
  const { adapter, participantTypes, operatorsByType } = config;
  const [program, setProgram] = useState<ProgramRecord | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [input, setInput] = useState<ProgramInput>(() => emptyInput(participantTypes[0]?.value ?? ""));
  const [saved, setSaved] = useState<string>(() => JSON.stringify(emptyInput(participantTypes[0]?.value ?? "")));
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState<Record<number, boolean>>({});
  const [schema, setSchema] = useState<Schema>({ state: "loading" });
  const [schemaTick, setSchemaTick] = useState(0);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!programId) return;
    adapter.get(programId).then(
      (p) => {
        setProgram(p);
        const next: ProgramInput = { name: p.name, description: p.description ?? "", participantType: p.participantType, criteria: p.criteria, manual: p.manual, blocked: p.blocked };
        setInput(next);
        setSaved(JSON.stringify(next));
      },
      () => setLoadError(true)
    );
  }, [adapter, programId]);

  useEffect(() => {
    let live = true;
    setSchema({ state: "loading" });
    adapter.schema(input.participantType).then(
      (objects) => live && setSchema({ state: "ready", objects }),
      () => live && setSchema({ state: "error" })
    );
    return () => {
      live = false;
    };
  }, [adapter, input.participantType, schemaTick]);

  useEffect(() => headingRef.current?.focus(), [step]);

  const dirty = JSON.stringify(input) !== saved;
  const typeOf = (v: string) => participantTypes.find((t) => t.value === v);
  const live = program !== null && config.liveStatuses.includes(program.status);
  const status = config.statuses.find((s) => s.value === (program?.status ?? config.draftStatus));
  const objects = schema.state === "ready" ? schema.objects : [];
  const rules = allRules(input.criteria);
  const staleRules = schema.state === "ready" ? rules.filter((r) => isRuleStale(r, objects)) : [];
  const incompleteRules = schema.state === "ready" ? rules.filter((r) => !isRuleStale(r, objects) && !isRuleComplete(r, objects, operatorsByType)) : [];

  /** UI completeness checks for each step. Who enrols is decided elsewhere (DCF-0003 B2). */
  const problems = useMemo(() => {
    const p: Record<number, string[]> = { 0: [], 1: [], 2: [] };
    if (!input.name.trim()) p[0]!.push("name");
    if (config.requireCriteria && rules.length === 0 && input.manual.length === 0) p[1]!.push("nothing");
    if (incompleteRules.length) p[1]!.push("incomplete");
    if (config.blockSaveOnStaleRules && staleRules.length) p[1]!.push("stale");
    return p;
  }, [input, rules.length, incompleteRules.length, staleRules.length, config.requireCriteria, config.blockSaveOnStaleRules]);

  const update = (patch: Partial<ProgramInput>) => setInput((i) => ({ ...i, ...patch }));

  function goTo(next: number) {
    setStep(next);
    setAnnounce(`Step ${next + 1} of 3: ${STEPS[next]}`);
  }

  function next() {
    if (problems[step]!.length) {
      setShowErrors((s) => ({ ...s, [step]: true }));
      return;
    }
    goTo(step + 1);
  }

  const save = useCallback(
    async (mode: "draft" | "submit") => {
      // Every save needs a name; Create / Save changes also needs every step valid.
      const checks = mode === "draft" ? [0] : [0, 1, 2];
      const failing = checks.find((s) => problems[s]!.length || (s === 1 && config.blockSaveOnStaleRules && staleRules.length));
      if (failing !== undefined || (mode === "draft" && config.blockSaveOnStaleRules && staleRules.length)) {
        const target = failing ?? 1;
        setShowErrors((s) => ({ ...s, [target]: true }));
        goTo(target);
        return;
      }
      setBusy(true);
      setSaveError(null);
      try {
        const result = program ? await adapter.update(program.id, input, mode) : await adapter.create(input, mode);
        setProgram(result);
        setSaved(JSON.stringify(input));
        if (mode === "submit") onClose(program ? `Changes to “${result.name}” saved.` : `“${result.name}” created.`);
        else setAnnounce("Draft saved.");
      } catch {
        setSaveError("Couldn't save the program. Your changes are still here. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [adapter, input, onClose, problems, program, staleRules.length, config.blockSaveOnStaleRules]
  );

  function requestLeave() {
    if (dirty) setDialog({ kind: "leave" });
    else onClose();
  }

  function requestTypeChange(to: string) {
    const allowed = typeOf(to)?.objects ?? [];
    const removedRules = rules.filter((r) => r.object && !allowed.includes(r.object));
    const removedPeople = [...input.manual, ...input.blocked].filter((e) => e.participant.type !== to).length;
    if (removedRules.length || removedPeople) setDialog({ kind: "changeType", to, removedRules, removedPeople });
    else update({ participantType: to });
  }

  function applyTypeChange(to: string) {
    const allowed = typeOf(to)?.objects ?? [];
    const keep = (r: ConditionRule) => !r.object || allowed.includes(r.object);
    update({
      participantType: to,
      criteria: {
        ...input.criteria,
        items: input.criteria.items
          .map((it) => (it.kind === "group" ? { ...it, rules: it.rules.filter(keep) } : it))
          .filter((it) => (it.kind === "group" ? it.rules.length > 0 : keep(it))),
      },
      manual: input.manual.filter((e) => e.participant.type === to),
      blocked: input.blocked.filter((e) => e.participant.type === to),
    });
  }

  if (loadError) {
    return (
      <div className="fx-ip-editor">
        <div className="fx-ip-editor__body">
          <Alert status="error" title="Couldn't open this program" action={<Button variant="secondary" onClick={() => onClose()}>Back to Incentive Programs</Button>} />
        </div>
      </div>
    );
  }
  if (programId && !program) {
    return (
      <div className="fx-ip-editor">
        <div className="fx-ip-state" role="status">
          <Spinner />
          <span>Loading program…</span>
        </div>
      </div>
    );
  }

  const typeLabel = typeOf(input.participantType)?.label ?? input.participantType;
  const blockedIds = new Set(input.blocked.map((b) => b.participant.id));
  const overlap = input.manual.filter((m) => blockedIds.has(m.participant.id));

  const participantColumn = <T extends { participant: Participant }>(): DataTableColumn<T> => ({
    id: "participant",
    header: "Participant",
    cell: (e) => (
      <span className="fx-ip-stack">
        <span>{e.participant.name}</span>
        <span className="fx-ip-sub">{e.participant.ref}</span>
      </span>
    ),
  });
  const manualColumns: DataTableColumn<ManualEntry>[] = [
    participantColumn<ManualEntry>(),
    { id: "type", header: "Type", width: "16%", cell: () => typeLabel },
    {
      id: "added",
      header: "Added",
      width: "24%",
      cell: (e) => (
        <span className="fx-ip-stack">
          <span>{fmtDate(e.addedAt)}</span>
          <span className="fx-ip-sub">by {e.addedBy}</span>
        </span>
      ),
    },
    {
      id: "remove",
      header: <span className="fx-visually-hidden">Remove</span>,
      width: "var(--fx-spacing-12)",
      align: "center",
      cell: (e) => <IconButton className="fx-ip-danger" variant="ghost" size="sm" label={`Remove ${e.participant.name}`} icon={<Trash2 />} onClick={() => update({ manual: input.manual.filter((m) => m !== e) })} />,
    },
  ];
  const blockedColumns: DataTableColumn<BlockedEntry>[] = [
    participantColumn<BlockedEntry>(),
    { id: "type", header: "Type", width: "12%", cell: () => typeLabel },
    { id: "reason", header: "Reason", width: "28%", cell: (e) => e.reason || "—" },
    {
      id: "blocked",
      header: "Blocked",
      width: "20%",
      cell: (e) => (
        <span className="fx-ip-stack">
          <span>{fmtDate(e.blockedAt)}</span>
          <span className="fx-ip-sub">by {e.blockedBy}</span>
        </span>
      ),
    },
    {
      id: "remove",
      header: <span className="fx-visually-hidden">Unblock</span>,
      width: "var(--fx-spacing-12)",
      align: "center",
      cell: (e) => <IconButton className="fx-ip-danger" variant="ghost" size="sm" label={`Unblock ${e.participant.name}`} icon={<Trash2 />} onClick={() => update({ blocked: input.blocked.filter((b) => b !== e) })} />,
    },
  ];

  const stepAlert =
    showErrors[1] && problems[1]!.length ? (
      problems[1]!.includes("nothing") ? (
        <Alert status="error" title="Add at least one rule or participant">A program needs enrollment criteria before you continue. Save a draft to finish later.</Alert>
      ) : problems[1]!.includes("stale") ? (
        <Alert status="warning" title="A rule uses a CRM field that no longer exists">Until you fix it, this rule is treated as not met. Update or delete it to save.</Alert>
      ) : (
        <Alert status="error" title={`Complete or delete ${incompleteRules.length} incomplete ${incompleteRules.length === 1 ? "rule" : "rules"}`}>
          Every rule needs an Object, Field, Condition and Value.
        </Alert>
      )
    ) : staleRules.length ? (
      <Alert status="warning" title="A rule uses a CRM field that no longer exists">Until you fix it, this rule is treated as not met. Update or delete it to save.</Alert>
    ) : null;

  return (
    <div className="fx-ip-editor">
      <header className="fx-ip-editor__header">
        <IconButton variant="ghost" size="md" label="Back to Incentive Programs" icon={<ArrowLeft />} onClick={requestLeave} />
        <div className="fx-ip-editor__heading">
          <Breadcrumb items={[{ label: "Incentive Programs", onClick: requestLeave }, { label: program ? program.name : "Create program" }]} />
          <div className="fx-ip-editor__title-row">
            <p className="fx-ip-editor__title">{input.name.trim() || "New incentive program"}</p>
            {status && <Badge status={status.tone}>{status.label}</Badge>}
          </div>
        </div>
        <div className="fx-ip-editor__header-actions">
          <span className="fx-ip-sub" aria-live="polite">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </span>
          <Button variant="secondary" onClick={requestLeave}>
            Cancel
          </Button>
          <Button onClick={() => save(live ? "submit" : "draft")} loading={busy} disabled={!dirty}>
            {live ? "Save changes" : "Save draft"}
          </Button>
        </div>
      </header>

      <main className="fx-ip-editor__body">
        <div className="fx-ip-editor__content">
          {live && <Alert status="warning" title="This program is live">{config.copy.liveBanner}</Alert>}
          {saveError && <Alert status="error" title={saveError} />}
          <Stepper steps={STEPS} current={step} />
          <section className="fx-ip-card fx-ip-step" aria-labelledby="fx-ip-step-heading">
            {step === 0 && (
              <>
                <div>
                  <h1 id="fx-ip-step-heading" ref={headingRef} tabIndex={-1} className="fx-ip-section__title">
                    Program details
                  </h1>
                  <p className="fx-ip-section__desc">Name the program so your team can find it in the Incentive Programs list.</p>
                </div>
                <div className="fx-ip-fields">
                  <TextField
                    label="Program name"
                    required
                    placeholder="Enter program name"
                    value={input.name}
                    onChange={(e) => update({ name: e.target.value })}
                    status={showErrors[0] && !input.name.trim() ? "error" : undefined}
                    helperText={showErrors[0] && !input.name.trim() ? "Enter a program name" : undefined}
                  />
                  <TextArea label="Description (optional)" helperText="Up to 500 characters" maxLength={500} value={input.description} onChange={(e) => update({ description: e.target.value })} />
                </div>
                <hr className="fx-ip-divider" />
                <RadioGroup
                  legend="Participant type"
                  required
                  name="participant-type"
                  appearance="card"
                  orientation="horizontal"
                  options={participantTypes.map(({ value, label, description }) => ({ value, label, description }))}
                  value={input.participantType}
                  onChange={requestTypeChange}
                />
                <p className="fx-ip-section__desc">Who this program is for. It also sets which CRM objects you can use in enrollment rules (Step 2).</p>
              </>
            )}

            {step === 1 && (
              <>
                <div>
                  <h1 id="fx-ip-step-heading" ref={headingRef} tabIndex={-1} className="fx-ip-section__title">
                    Enrollment criteria
                  </h1>
                  <p className="fx-ip-section__desc">Choose who can enrol. All criteria are evaluated once, when a participant enrols.</p>
                </div>
                <ConditionBuilder
                  objects={objects}
                  operatorsByType={operatorsByType}
                  value={input.criteria}
                  onChange={(criteria) => update({ criteria })}
                  status={schema.state}
                  onRetry={() => setSchemaTick((t) => t + 1)}
                  limits={config.limits}
                  newGroupMatch={config.newGroupMatch}
                  showValidation={Boolean(showErrors[1])}
                  alert={stepAlert}
                />
                <div className="fx-ip-block">
                  <div className="fx-ip-block__header">
                    <div>
                      <h2 className="fx-ip-block__title">Manual enrollment{input.manual.length ? ` (${input.manual.length})` : ""}</h2>
                      <p className="fx-ip-section__desc">Named participants are enrolled even if they don’t match the rules.</p>
                    </div>
                    <Button variant="secondary" leadingIcon={<Plus />} onClick={() => setDialog({ kind: "manual" })}>
                      Add participants
                    </Button>
                  </div>
                  {input.manual.length ? (
                    <DataTable caption="Manual enrollment" columns={manualColumns} rows={input.manual} getRowId={(e) => e.participant.id} />
                  ) : (
                    <p className="fx-ip-section__desc">No participants added.</p>
                  )}
                </div>
                <Alert status="info" title="Who gets enrolled">
                  {config.copy.enrollmentExplainer}
                </Alert>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <h1 id="fx-ip-step-heading" ref={headingRef} tabIndex={-1} className="fx-ip-section__title">
                    Participant blocking
                  </h1>
                  <p className="fx-ip-section__desc">Blocked participants can never enrol in this program, even if they match the rules or were added manually.</p>
                </div>
                <div className="fx-ip-block__header">
                  <h2 className="fx-ip-block__title">Blocked participants{input.blocked.length ? ` (${input.blocked.length})` : ""}</h2>
                  <Button variant="secondary" leadingIcon={<Plus />} onClick={() => setDialog({ kind: "block" })}>
                    Add blocked participant
                  </Button>
                </div>
                {input.blocked.length ? (
                  <DataTable caption="Blocked participants" columns={blockedColumns} rows={input.blocked} getRowId={(e) => e.participant.id} />
                ) : (
                  <div className="fx-ip-empty">
                    <p className="fx-ip-block__title">No blocked participants</p>
                    <p className="fx-ip-section__desc">Optional. Block participants you want to keep out of this program.</p>
                  </div>
                )}
                {overlap.map((m) => (
                  <Alert key={m.participant.id} status="warning" title={`${m.participant.name} is also in Manual enrollment`}>
                    Blocking wins: {m.participant.name} won’t be enrolled. Remove them from Manual enrollment to avoid confusion.
                  </Alert>
                ))}
                <Alert status="info" title="Review before you save">
                  {`${typeLabel} program · ${rules.length} ${rules.length === 1 ? "rule" : "rules"}${input.criteria.items.some((i) => i.kind === "group") ? ` (${input.criteria.items.filter((i) => i.kind === "group").length} ${input.criteria.items.filter((i) => i.kind === "group").length === 1 ? "group" : "groups"})` : ""} · ${input.manual.length} added manually · ${input.blocked.length} blocked. Rules are checked once, when each participant enrols.`}
                </Alert>
              </>
            )}
          </section>
        </div>
      </main>

      <footer className="fx-ip-editor__footer">
        <div>
          {step > 0 ? (
            <Button variant="secondary" onClick={() => goTo(step - 1)}>
              Back
            </Button>
          ) : (
            <span className="fx-ip-sub">Step 1 of 3</span>
          )}
        </div>
        <div className="fx-ip-editor__footer-right">
          {step > 0 && <span className="fx-ip-sub">Step {step + 1} of 3</span>}
          {step < 2 ? (
            <Button onClick={next}>Next</Button>
          ) : (
            <Button onClick={() => save("submit")} loading={busy}>
              {program && program.status !== config.draftStatus ? "Save changes" : "Create program"}
            </Button>
          )}
        </div>
      </footer>

      <div className="fx-visually-hidden" aria-live="polite">
        {announce}
      </div>

      <ConfirmDialog
        open={dialog?.kind === "leave"}
        title="Leave without saving?"
        message={`Your changes to “${input.name.trim() || "New incentive program"}” will be lost. Save a draft to keep them.`}
        confirmLabel="Discard and leave"
        cancelLabel="Keep editing"
        destructive
        onCancel={() => setDialog(null)}
        onConfirm={() => onClose()}
      />
      <ConfirmDialog
        open={dialog?.kind === "changeType"}
        title={`Change participant type to ${dialog?.kind === "changeType" ? typeOf(dialog.to)?.label : ""}?`}
        message={
          dialog?.kind === "changeType"
            ? [
                dialog.removedRules.length ? `${dialog.removedRules.length} ${dialog.removedRules.length === 1 ? "rule uses" : "rules use"} objects this type doesn’t have. They will be removed.` : "",
                dialog.removedPeople ? `${dialog.removedPeople} added or blocked ${dialog.removedPeople === 1 ? "participant is" : "participants are"} a different type and will be removed.` : "",
              ]
                .filter(Boolean)
                .join(" ")
            : ""
        }
        confirmLabel="Change and remove"
        cancelLabel={`Keep ${typeLabel}`}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.kind === "changeType") applyTypeChange(dialog.to);
          setDialog(null);
        }}
      />
      <ParticipantPicker
        open={dialog?.kind === "manual"}
        title="Add participants"
        description="Search by name, email or ID. Added participants are enrolled even if they don’t match the rules."
        participantType={input.participantType}
        typeLabel={typeLabel}
        adapter={adapter}
        unavailable={Object.fromEntries(input.manual.map((m) => [m.participant.id, "already added"]))}
        confirmLabel={(n) => (n ? `Add ${n} ${n === 1 ? "participant" : "participants"}` : "Add participants")}
        onClose={() => setDialog(null)}
        onConfirm={(people) => {
          update({ manual: [...input.manual, ...people.map((participant) => ({ participant, addedBy: config.currentUser, addedAt: today() }))] });
          setDialog(null);
        }}
      />
      <ParticipantPicker
        open={dialog?.kind === "block"}
        title="Add blocked participant"
        description="Blocked participants can’t enrol in this program, whatever the rules or manual enrollment say."
        participantType={input.participantType}
        typeLabel={typeLabel}
        adapter={adapter}
        unavailable={Object.fromEntries(input.blocked.map((b) => [b.participant.id, "already blocked"]))}
        withReason
        destructive
        confirmLabel={(n) => (n ? `Block ${n} ${n === 1 ? "participant" : "participants"}` : "Block participants")}
        onClose={() => setDialog(null)}
        onConfirm={(people, reason) => {
          update({ blocked: [...input.blocked, ...people.map((participant) => ({ participant, reason: reason || undefined, blockedBy: config.currentUser, blockedAt: today() }))] });
          setDialog(null);
        }}
      />
    </div>
  );
}
