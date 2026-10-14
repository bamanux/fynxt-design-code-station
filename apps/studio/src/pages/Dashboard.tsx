import { Alert, Button, Card } from "@fynxt/ui";
import { FilePlus2 } from "lucide-react";
import type { CaseSummary } from "../../shared/types";
import { EmptyState, PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";
import { Link, navigate } from "../lib/router";
import { useSession } from "../lib/session";
import { STAGES, formatDate, statusInfo } from "../lib/status";
import { useAsync } from "../lib/useAsync";

function CaseRow({ c }: { c: CaseSummary }) {
  return (
    <li className="case-row">
      <Link href={`/cases/${c.id}`} className="case-row__link">
        <span className="case-row__id">{c.id}</span>
        <span className="case-row__title">{c.title}</span>
      </Link>
      <StatusBadge status={c.status} />
      <span className="muted case-row__meta">{c.waitingOn.text} · updated {formatDate(c.updated)}</span>
    </li>
  );
}

export function DashboardPage() {
  const { user, meta } = useSession();
  const cases = useAsync(api.cases, []);
  const list = cases.data ?? [];
  // The server only returns cases this user is a member of; "Needs you" narrows that to their roles.
  const mine = list.filter((c) => user && c.waitingOn.roles.some((r) => user.roles.includes(r)));
  const requested = list.filter((c) => user && c.creatorEmail === user.email);
  const working = list.filter((c) => c.activeRun);

  return (
    <>
      <PageHeader
        eyebrow={`Hello ${user?.name ?? ""}`}
        title="Dashboard"
        description="Everything waiting on you, what FDI is working on, and where each design is in the pipeline."
        actions={
          <Button leadingIcon={<FilePlus2 />} onClick={() => navigate("/new")}>
            New design request
          </Button>
        }
      />
      {meta && !meta.agentReady && (
        <Alert status="warning" title="FDI can't run yet">
          {meta.agentProblem} Requests are still saved and will wait until FDI is configured.
        </Alert>
      )}
      {cases.error && <Alert status="error" title="Couldn't load cases">{cases.error}</Alert>}

      <section aria-labelledby="stage-heading" className="section">
        <h2 id="stage-heading" className="fx-typo-heading-base">Pipeline</h2>
        <ul className="stat-grid">
          {STAGES.map((s) => {
            const n = list.filter((c) => statusInfo(c.status).stage === s.id && c.status !== "PUBLISHED").length;
            const shown = s.id === "published" ? list.filter((c) => c.status === "PUBLISHED").length : n;
            return (
              <li key={s.id}>
                <Card className="stat">
                  <span className="stat__value">{cases.loading ? "–" : shown}</span>
                  <span className="muted">{s.label}</span>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="two-col">
        <Card as="section" aria-labelledby="needs-you">
          <h2 id="needs-you" className="fx-typo-heading-base">Needs you ({mine.length})</h2>
          {mine.length ? (
            <ul className="case-list">{mine.map((c) => <CaseRow key={c.id} c={c} />)}</ul>
          ) : (
            <EmptyState title="Nothing waiting on your role">Reviews and FDI runs that your role can act on appear here.</EmptyState>
          )}
        </Card>
        <Card as="section" aria-labelledby="my-requests">
          <h2 id="my-requests" className="fx-typo-heading-base">Your requests ({requested.length})</h2>
          {requested.length ? (
            <ul className="case-list">{requested.map((c) => <CaseRow key={c.id} c={c} />)}</ul>
          ) : (
            <EmptyState title="You haven't requested anything yet" action={<Button variant="secondary" size="s" onClick={() => navigate("/new")}>Start a request</Button>} />
          )}
        </Card>
      </div>

      {working.length > 0 && (
        <Card as="section" aria-labelledby="working" className="section">
          <h2 id="working" className="fx-typo-heading-base">FDI is working on</h2>
          <ul className="case-list">{working.map((c) => <CaseRow key={c.id} c={c} />)}</ul>
        </Card>
      )}
    </>
  );
}
