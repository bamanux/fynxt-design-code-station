import { Alert, Badge, Button, Card, Select, Tabs, TextArea } from "@fynxt/ui";
import { ArrowLeft, Copy, Download, ExternalLink, Play, Square } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import type { CaseAction, CaseDetail, DesignAsset, StationUser } from "../../shared/types";
import { Markdown } from "../components/Markdown";
import { EmptyState, PageHeader } from "../components/PageHeader";
import { ViewCode } from "../components/ViewCode";
import { RunLog } from "../components/RunLog";
import { StageStepper } from "../components/StageStepper";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";
import { Link } from "../lib/router";
import { useSession } from "../lib/session";
import { formatDate } from "../lib/status";
import { useAsync } from "../lib/useAsync";

const SECTIONS = [
  "General", "§1 Summary", "§2 Inputs", "§3 Requirement Understanding", "§4 Library Search", "§5 Page Plan",
  "§6 Component Plan", "§7 Template Changes", "§8 Tokens", "§9 Conflicts", "§10 Open Questions",
];

function Decision({ id, action, onDone }: { id: string; action: Extract<CaseAction, { kind: "decide" }>; onDone: (c: CaseDetail) => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (action.requiresNote && !note.trim()) return setError("Describe what needs to change.");
    setBusy(true);
    setError(null);
    try {
      onDone(await api.decide(id, action.to, note));
      setOpen(false);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }
  if (!open) {
    return (
      <Button variant={action.tone === "approve" ? "primary" : "secondary"} onClick={() => setOpen(true)}>
        {action.label}
      </Button>
    );
  }
  return (
    <form onSubmit={submit} className="decision stack">
      <TextArea
        label={action.requiresNote ? "What needs to change?" : "Note (optional)"}
        required={action.requiresNote}
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        status={error ? "error" : "default"}
        helperText={error ?? (action.requiresNote ? "Added to the case file's Review Feedback for FDI to address." : "Recorded in the status history.")}
        autoFocus
      />
      <div className="row-end">
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        <Button type="submit" variant={action.tone === "approve" ? "primary" : "destructive"} loading={busy}>
          Confirm: {action.label}
        </Button>
      </div>
    </form>
  );
}

function ActionPanel({ detail, onChange, reload }: { detail: CaseDetail; onChange: (c: CaseDetail) => void; reload: () => void }) {
  const { meta } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  async function run() {
    setStarting(true);
    setError(null);
    try {
      await api.run(detail.id);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStarting(false);
    }
  }
  const decisions = detail.actions.filter((a): a is Extract<CaseAction, { kind: "decide" }> => a.kind === "decide");
  const runs = detail.actions.filter((a): a is Extract<CaseAction, { kind: "run" }> => a.kind === "run");
  return (
    <Card as="section" aria-labelledby="next-step" className="action-panel">
      <h2 id="next-step" className="fx-typo-heading-base">Next step</h2>
      <p>
        {detail.waitingOn.text}
        {detail.waitingOn.roles.length > 0 && <span className="muted"> — {detail.waitingOn.roles.join(" or ")}</span>}
      </p>
      {detail.changeOf && (
        <p className="muted">
          Change to{" "}
          <Link href={`/gallery/${detail.changeOf.pageId}`}>{detail.changeOf.pageLabel}</Link>
          {detail.changeOf.caseId && (
            <>
              {" "}(built in <Link href={`/cases/${detail.changeOf.caseId}`}>{detail.changeOf.caseId}</Link>)
            </>
          )}
        </p>
      )}
      {(detail.status === "APPROVED" || detail.status === "DESIGN-CHANGES-REQUESTED") && !detail.activeRun && <FigmaHandoff id={detail.id} />}
      {decisions.length > 0 && <div className="stack">{decisions.map((a) => <Decision key={a.to} id={detail.id} action={a} onDone={onChange} />)}</div>}
      {runs.map((a) => (
        <div key={a.stage} className="stack">
          <Button leadingIcon={<Play />} onClick={run} loading={starting} disabled={!a.available || (meta ? !meta.agentReady : true)}>
            {a.label}
          </Button>
          {!a.available && a.reason && <p className="muted">{a.reason}</p>}
          {a.available && meta && !meta.agentReady && <p className="muted">{meta.agentProblem}</p>}
        </div>
      ))}
      {decisions.length === 0 && runs.length === 0 && !detail.activeRun && (
        <p className="muted">Nothing for your role to do at this stage.</p>
      )}
      {error && <Alert status="error">{error}</Alert>}
      {(detail.figmaUrl || detail.prUrl) && (
        <ul className="link-list">
          {detail.figmaUrl && (
            <li><a href={detail.figmaUrl} target="_blank" rel="noreferrer">Open Figma design <ExternalLink aria-hidden="true" /></a></li>
          )}
          {detail.prUrl &&
            (/^https?:\/\//.test(detail.prUrl) ? (
              <li><a href={detail.prUrl} target="_blank" rel="noreferrer">Open pull request <ExternalLink aria-hidden="true" /></a></li>
            ) : (
              <li className="muted">Code review: {detail.prUrl}</li>
            ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * The Figma stage needs the interactive Figma connector, so it can't run from Studio. The Product
 * Designer runs one command in Claude Code; the case then comes back here at DESIGN-REVIEW.
 */
function FigmaHandoff({ id }: { id: string }) {
  const command = `/fdi-figma ${id}`;
  const [copied, setCopied] = useState(false);
  return (
    <div className="handoff" role="note" aria-label="Design update needed">
      <p className="handoff__title">Design update needed</p>
      <p className="muted">The Product Designer runs this in Claude Code (Figma needs their sign-in). When it finishes, the case returns here for design review.</p>
      <div className="handoff__cmd">
        <code>{command}</code>
        <Button
          variant="secondary"
          size="s"
          leadingIcon={<Copy />}
          onClick={() =>
            navigator.clipboard?.writeText(command).then(
              () => setCopied(true),
              () => setCopied(false)
            )
          }
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

function FeedbackTab({ detail, onChange }: { detail: CaseDetail; onChange: (c: CaseDetail) => void }) {
  const [section, setSection] = useState("General");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return setError("Write your feedback first.");
    setBusy(true);
    setError(null);
    try {
      onChange(await api.feedback(detail.id, section, text));
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      {detail.feedback.length === 0 ? (
        <EmptyState title="No feedback yet">Comments from anyone on the team are added to §11 of the case file. FDI resolves each one on its next revision.</EmptyState>
      ) : (
        <ul className="feedback-list">
          {detail.feedback.map((f) => (
            <li key={f.ref} className="feedback">
              <div className="feedback__head">
                <strong>{f.ref}</strong>
                <span className="muted">rev {f.revision} · {f.section} · {f.reviewer}</span>
                <Badge status={f.closed ? "success" : "warning"}>{f.closed ? "Closed" : "Open"}</Badge>
              </div>
              <p className="pre">{f.feedback}</p>
              {f.resolution && <p className="feedback__resolution"><strong>FDI:</strong> <span className="pre">{f.resolution}</span></p>}
            </li>
          ))}
        </ul>
      )}
      {detail.canComment ? (
        <form onSubmit={submit} className="stack feedback-form">
          <Select label="Section" value={section} onChange={(e) => setSection(e.target.value)} options={SECTIONS.map((s) => ({ value: s, label: s }))} />
          <TextArea label="Your feedback" rows={4} value={text} onChange={(e) => setText(e.target.value)} status={error ? "error" : "default"} helperText={error ?? undefined} />
          <div className="row-end"><Button type="submit" loading={busy}>Add feedback</Button></div>
        </form>
      ) : (
        <p className="muted">Feedback opens once FDI has written the case file.</p>
      )}
    </div>
  );
}

export function CaseDetailPage({ id }: { id: string }) {
  const state = useAsync(() => api.case(id), [id]);
  const detail = state.data;

  if (state.error) return <Alert status="error" title="Couldn't load case">{state.error}</Alert>;
  if (!detail) return <p className="muted">Loading…</p>;

  const tabs = [
    {
      id: "case",
      label: "Case file",
      content: detail.markdown ? (
        <Markdown source={detail.markdown} />
      ) : (
        <EmptyState title="FDI hasn't written the case file yet">
          {detail.activeRun ? "Intake is running — follow it in the activity log." : "Intake hasn't run. Start it from Next step once FDI is configured."}
        </EmptyState>
      ),
    },
    {
      id: "design",
      label: "Design",
      adornment: detail.design.length ? <Badge>{detail.design.length}</Badge> : undefined,
      content: <DesignTab detail={detail} />,
    },
    {
      id: "feedback",
      label: "Feedback",
      adornment: detail.openFeedback ? <Badge status="warning">{detail.openFeedback}</Badge> : undefined,
      content: <FeedbackTab detail={detail} onChange={state.setData} />,
    },
    {
      id: "questions",
      label: "Open questions",
      adornment: detail.openQuestions ? <Badge status="error">{detail.openQuestions}</Badge> : undefined,
      content: detail.openQuestionsTable.length ? (
        <table className="table">
          <caption className="fx-visually-hidden">Open questions</caption>
          <thead><tr><th scope="col">#</th><th scope="col">Question</th><th scope="col">Blocks</th><th scope="col">Owner</th><th scope="col">Answer</th></tr></thead>
          <tbody>{detail.openQuestionsTable.map((r, i) => <tr key={i}>{[0, 1, 2, 3, 4].map((j) => <td key={j} className="pre">{r[j] ?? ""}</td>)}</tr>)}</tbody>
        </table>
      ) : (
        <EmptyState title="No open questions" />
      ),
    },
    {
      id: "activity",
      label: "Activity",
      content: <Activity detail={detail} />,
    },
    {
      id: "inputs",
      label: `Inputs (${detail.inputs.length})`,
      content: detail.inputs.length ? (
        <ul className="file-list">
          {detail.inputs.map((f) => (
            <li key={f.name}>
              <span>{f.name}</span>
              <span className="muted">{Math.ceil(f.size / 1024)} KB</span>
              <a className="fx-btn fx-btn--ghost fx-btn--s" href={api.inputUrl(detail.id, f.name)} aria-label={`Download ${f.name}`}><Download aria-hidden="true" /></a>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No inputs" />
      ),
    },
  ];

  return (
    <>
      <Link href="/cases" className="back-link"><ArrowLeft aria-hidden="true" /> All cases</Link>
      <PageHeader
        eyebrow={`${detail.id}${detail.module ? ` · ${detail.module}` : ""}`}
        title={detail.title}
        description={`Requested by ${detail.requestedBy || "—"} · rev ${detail.revision || "—"} · updated ${formatDate(detail.updated)}`}
        actions={
          <span className="row-gap">
            <ViewCode query={{ case: detail.id }} size="s" />
            <StatusBadge status={detail.status} />
          </span>
        }
      />
      <StageStepper status={detail.status} />
      {detail.activeRun && (
        <Card as="section" aria-label="Live FDI run" className="section">
          <div className="row-between">
            <h2 className="fx-typo-heading-base">FDI · {detail.activeRun.stage}</h2>
            <Button variant="ghost" size="s" leadingIcon={<Square />} onClick={() => void api.cancelRun(detail.activeRun!.id).then(state.reload)}>Stop</Button>
          </div>
          <RunLog run={detail.activeRun} onEnd={state.reload} />
        </Card>
      )}
      <div className="detail-layout">
        <CaseTabs tabs={tabs} />
        <div className="stack">
          <ActionPanel detail={detail} onChange={state.setData} reload={state.reload} />
          <MembersPanel detail={detail} onChange={state.setData} />
        </div>
      </div>
    </>
  );
}

function DesignGroup({ title, assets }: { title: string; assets: DesignAsset[] }) {
  if (!assets.length) return null;
  return (
    <section className="stack" aria-label={title}>
      <h3 className="fx-typo-heading-base">{title}</h3>
      <div className="design-grid">
        {assets.map((a) => (
          <figure key={a.url}>
            <a href={a.url} target="_blank" rel="noreferrer">
              <img src={a.url} alt={a.name.replace(/\.png$/, "").replace(/[-_]/g, " ")} loading="lazy" />
            </a>
            <figcaption>{a.name}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/** The case's UI design: approved Figma frames, screenshots of the built page, and the live page. No Figma account needed. */
function DesignTab({ detail }: { detail: CaseDetail }) {
  const design = detail.design.filter((a) => a.group === "design");
  const build = detail.design.filter((a) => a.group === "build");
  return (
    <div className="stack">
      <ul className="link-list">
        {detail.builtPageId && (
          <li>
            <Link href={`/gallery/${detail.builtPageId}`}>Open the built page in Gallery</Link> — pin comments on it to request UI changes
          </li>
        )}
        {detail.figmaUrl && (
          <li>
            <a href={detail.figmaUrl} target="_blank" rel="noreferrer">Open in Figma <ExternalLink aria-hidden="true" /></a> (needs access to the FDI work file)
          </li>
        )}
      </ul>
      {detail.design.length === 0 ? (
        <EmptyState title="No design yet">Approved frames appear here after FDI builds the Figma design and saves its screenshots in the case folder.</EmptyState>
      ) : (
        <>
          <DesignGroup title="Approved design (Figma frames)" assets={design} />
          <DesignGroup title="Built page (code screenshots)" assets={build} />
        </>
      )}
    </div>
  );
}

/** Who can see and work on this case. The creator, owner or an Admin invites Station users. */
function MembersPanel({ detail, onChange }: { detail: CaseDetail; onChange: (c: CaseDetail) => void }) {
  const users = useAsync<StationUser[]>(() => (detail.canManageMembers ? api.users() : Promise.resolve([])), [detail.canManageMembers]);
  const [pick, setPick] = useState("");
  const [error, setError] = useState<string | null>(null);
  const memberEmails = new Set(detail.members.map((m) => m.email));
  const candidates = (users.data ?? []).filter((u) => u.active && !memberEmails.has(u.email));

  async function act(fn: () => Promise<CaseDetail>) {
    setError(null);
    try {
      onChange(await fn());
      setPick("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Card as="section" aria-labelledby="members" className="action-panel">
      <h2 id="members" className="fx-typo-heading-base">Members</h2>
      {detail.members.length === 0 ? (
        <p className="muted">No members yet. Only Admins can see this case until someone is invited.</p>
      ) : (
        <ul className="member-list">
          {detail.members.map((m) => (
            <li key={m.email}>
              <span className="stack-tight">
                <span>
                  {m.name} {m.isOwner && <Badge status="primary">Owner</Badge>} {m.isCreator && !m.isOwner && <Badge>Creator</Badge>}
                </span>
                <span className="muted">{m.roles.length ? m.roles.join(", ") : m.email}</span>
              </span>
              {detail.canManageMembers && !m.isOwner && (
                <span className="row-gap">
                  <Button variant="ghost" size="s" onClick={() => void act(() => api.setOwner(detail.id, m.email))}>Make owner</Button>
                  {!m.isCreator && (
                    <Button variant="ghost" size="s" aria-label={`Remove ${m.name}`} onClick={() => void act(() => api.removeMember(detail.id, m.email))}>
                      Remove
                    </Button>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {detail.canManageMembers && (
        <div className="stack">
          <Select
            label="Invite a Station user"
            placeholder={users.loading ? "Loading…" : candidates.length ? "Choose a person" : "Everyone is already a member"}
            options={candidates.map((u) => ({ value: u.email, label: `${u.name} — ${u.roles.join(", ") || "no role"}` }))}
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            disabled={!candidates.length}
          />
          <Button variant="secondary" disabled={!pick} onClick={() => void act(() => api.addMember(detail.id, pick))}>
            Invite to case
          </Button>
        </div>
      )}
      {error && <Alert status="error">{error}</Alert>}
    </Card>
  );
}

function CaseTabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode; adornment?: ReactNode }[] }) {
  const [tab, setTab] = useState("case");
  return (
    <Card className="detail-main">
      <Tabs label="Case sections" items={tabs} value={tab} onChange={setTab} />
    </Card>
  );
}

function Activity({ detail }: { detail: CaseDetail }) {
  const [openRun, setOpenRun] = useState<string | null>(null);
  return (
    <div className="stack">
      <h3 className="fx-typo-heading-sm">Status history</h3>
      {detail.history.length ? (
        <table className="table">
          <caption className="fx-visually-hidden">Status history</caption>
          <thead><tr><th scope="col">Date</th><th scope="col">Change</th><th scope="col">Who</th><th scope="col">Note</th></tr></thead>
          <tbody>{detail.history.map((h, i) => <tr key={i}><td>{h.date}</td><td>{h.transition}</td><td>{h.who}</td><td className="pre">{h.note}</td></tr>)}</tbody>
        </table>
      ) : (
        <p className="muted">No status changes yet.</p>
      )}
      <h3 className="fx-typo-heading-sm">FDI runs</h3>
      {detail.runs.length ? (
        <ul className="run-list">
          {detail.runs.map((r) => (
            <li key={r.id}>
              <div className="row-between">
                <span>
                  <strong>{r.stage}</strong> <span className="muted">· {r.startedBy} · {formatDate(r.startedAt)}{r.costUsd !== null ? ` · $${r.costUsd.toFixed(2)}` : ""}</span>
                </span>
                <span className="row">
                  <Badge status={r.state === "succeeded" ? "success" : r.state === "running" ? "info" : "error"}>{r.state}</Badge>
                  <Button variant="ghost" size="s" aria-expanded={openRun === r.id} onClick={() => setOpenRun(openRun === r.id ? null : r.id)}>
                    {openRun === r.id ? "Hide log" : "Show log"}
                  </Button>
                </span>
              </div>
              {openRun === r.id && <RunLog run={r} />}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">FDI hasn't run on this case yet.</p>
      )}
    </div>
  );
}
