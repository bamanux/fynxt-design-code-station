import { Alert, Button, Card, TextField } from "@fynxt/ui";
import { FilePlus2 } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState, PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";
import { Link, navigate } from "../lib/router";
import { STAGES, formatDate, statusInfo, type StageId } from "../lib/status";
import { useAsync } from "../lib/useAsync";

export function CasesPage() {
  const cases = useAsync(api.cases, []);
  const [stage, setStage] = useState<StageId | "all">("all");
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (cases.data ?? []).filter(
      (c) =>
        (stage === "all" || statusInfo(c.status).stage === stage) &&
        (!needle || `${c.id} ${c.title} ${c.module} ${c.requestedBy}`.toLowerCase().includes(needle))
    );
  }, [cases.data, stage, q]);

  return (
    <>
      <PageHeader
        title="Cases"
        description="Every design request and where it is: case file, Figma, code or published."
        actions={<Button leadingIcon={<FilePlus2 />} onClick={() => navigate("/new")}>New request</Button>}
      />
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Filter by stage">
          {[{ id: "all" as const, label: "All" }, ...STAGES].map((s) => (
            <Button key={s.id} size="s" variant={stage === s.id ? "primary" : "secondary"} aria-pressed={stage === s.id} onClick={() => setStage(s.id)}>
              {s.label}
            </Button>
          ))}
        </div>
        <div className="toolbar__search">
          <TextField label="Search cases" hideLabel type="search" placeholder="Search by ID, title, module, requester" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {cases.error && <Alert status="error" title="Couldn't load cases">{cases.error}</Alert>}
      <Card className="table-card">
        {rows.length === 0 && !cases.loading ? (
          <EmptyState title={cases.data?.length ? "No cases match" : "No cases yet"}>
            {cases.data?.length ? "Try another stage or search." : "Submit the first design request to get started."}
          </EmptyState>
        ) : (
          <table className="table">
            <caption className="fx-visually-hidden">Design cases</caption>
            <thead>
              <tr>
                <th scope="col">Case</th>
                <th scope="col">Module</th>
                <th scope="col">Status</th>
                <th scope="col">Next step</th>
                <th scope="col">Open feedback</th>
                <th scope="col">Requested by</th>
                <th scope="col">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td data-label="Case">
                    <Link href={`/cases/${c.id}`} className="table__primary">
                      <span className="case-row__id">{c.id}</span> {c.title}
                    </Link>
                  </td>
                  <td data-label="Module">{c.module || "—"}</td>
                  <td data-label="Status"><StatusBadge status={c.status} /></td>
                  <td data-label="Next step">{c.waitingOn.text}{c.waitingOn.roles.length ? <span className="muted"> · {c.waitingOn.roles.join(", ")}</span> : null}</td>
                  <td data-label="Open feedback">{c.openFeedback}</td>
                  <td data-label="Requested by">{c.requestedBy || "—"}</td>
                  <td data-label="Updated">{formatDate(c.updated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
