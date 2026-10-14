import { Alert, Badge, Button, DataTable, EmptyState, IconButton, Menu, Select, SearchField, Spinner, Toast, type DataTableColumn, type MenuItem } from "@fynxt/ui";
import { MoreVertical, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { IncentiveProgramsConfig, ProgramListQuery, ProgramRecord } from "./types";

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; rows: ProgramRecord[] };

export interface ProgramListProps {
  config: IncentiveProgramsConfig;
  onCreate: () => void;
  onEdit: (program: ProgramRecord) => void;
  /** Success message shown after returning from the editor (approved frame L5). */
  notice: string | null;
  onDismissNotice: () => void;
}

function criteriaLabel(p: ProgramRecord): string {
  const rules = p.criteria.items.flatMap((it) => (it.kind === "group" ? it.rules : [it])).length;
  const groups = p.criteria.items.filter((it) => it.kind === "group").length;
  const parts: string[] = [];
  if (rules) parts.push(`${rules} ${rules === 1 ? "rule" : "rules"}${groups ? ` · ${groups} ${groups === 1 ? "group" : "groups"}` : ""}`);
  if (p.manual.length) parts.push(rules ? `${p.manual.length} manual` : `${p.manual.length} manual only`);
  return parts.join(" · ") || "No criteria";
}

/** P0 · Incentive Programs list (approved frames L1–L6). */
export function ProgramList({ config, onCreate, onEdit, notice, onDismissNotice }: ProgramListProps) {
  const { adapter, can, copy, statuses, participantTypes } = config;
  const [query, setQuery] = useState<ProgramListQuery>({ search: "", status: "", participantType: "" });
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoad({ state: "loading" });
    adapter.list(query).then(
      (rows) => setLoad({ state: "ready", rows }),
      () => setLoad({ state: "error" })
    );
  }, [adapter, query]);

  useEffect(refresh, [refresh]);

  const status = (value: string) => statuses.find((s) => s.value === value);
  const typeLabel = (value: string) => participantTypes.find((t) => t.value === value)?.label ?? value;
  const filtered = query.search !== "" || query.status !== "" || query.participantType !== "";

  async function run(action: () => Promise<unknown>, failure: string) {
    setActionError(null);
    try {
      await action();
      refresh();
    } catch {
      setActionError(failure);
    }
  }

  function menuFor(p: ProgramRecord): MenuItem[] {
    const items: MenuItem[] = [];
    if (can("edit", p)) items.push({ id: "edit", label: "Edit program", onSelect: () => onEdit(p) });
    if (can("duplicate", p)) items.push({ id: "duplicate", label: "Duplicate", onSelect: () => run(() => adapter.duplicate(p.id), "Couldn't duplicate the program.") });
    if (config.deactivatedStatus && p.status !== config.deactivatedStatus && p.status !== config.draftStatus && can("deactivate", p))
      items.push({ id: "deactivate", label: "Deactivate", onSelect: () => run(() => adapter.setStatus(p.id, config.deactivatedStatus!), "Couldn't deactivate the program.") });
    if (can("viewParticipants", p)) items.push({ id: "view", label: "View enrolled participants", onSelect: () => onEdit(p) });
    return items;
  }

  const columns: DataTableColumn<ProgramRecord>[] = [
    {
      id: "name",
      header: "Program name",
      width: "30%",
      cell: (p) => (
        <span className="fx-ip-name">
          {can("edit", p) ? (
            <button type="button" className="fx-ip-link" onClick={() => onEdit(p)}>
              {p.name}
            </button>
          ) : (
            p.name
          )}
          <span className="fx-ip-sub">{p.code}</span>
        </span>
      ),
    },
    { id: "type", header: "Participant type", cell: (p) => typeLabel(p.participantType) },
    { id: "criteria", header: "Enrollment criteria", cell: criteriaLabel },
    { id: "enrolled", header: "Enrolled", cell: (p) => (p.enrolledCount === null ? "—" : p.enrolledCount.toLocaleString("en-GB")) },
    { id: "status", header: "Status", cell: (p) => <Badge status={status(p.status)?.tone ?? "neutral"}>{status(p.status)?.label ?? p.status}</Badge> },
    {
      id: "updated",
      header: "Last updated",
      cell: (p) => (
        <span className="fx-ip-stack">
          <span>{new Date(p.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
          <span className="fx-ip-sub">by {p.updatedBy}</span>
        </span>
      ),
    },
    {
      id: "actions",
      header: <span className="fx-visually-hidden">Actions</span>,
      width: "var(--fx-spacing-12)",
      align: "center",
      cell: (p) => {
        const items = menuFor(p);
        return items.length ? (
          <Menu label={`Actions for ${p.name}`} items={items} renderTrigger={(t) => <IconButton {...t} variant="ghost" size="sm" label={`Actions for ${p.name}`} icon={<MoreVertical />} />} />
        ) : null;
      },
    },
  ];

  return (
    <div className="fx-ip-list">
      {notice && (
        <div className="fx-ip-toast">
          <Toast status="success" onClose={onDismissNotice}>
            {notice}
          </Toast>
        </div>
      )}
      <header className="fx-ip-list__header">
        <h1 className="fx-ip-list__title">{copy.pageTitle}</h1>
      </header>
      <div className="fx-ip-list__body">
        <div className="fx-ip-section">
          <div>
            <h2 className="fx-ip-section__title">{copy.sectionTitle}</h2>
            <p className="fx-ip-section__desc">{copy.sectionDescription}</p>
          </div>
          {can("create") && (
            <Button leadingIcon={<Plus />} onClick={onCreate}>
              Create program
            </Button>
          )}
        </div>
        <div className="fx-ip-card">
          <div className="fx-ip-toolbar">
            <div className="fx-ip-toolbar__filters">
              <Select label="Status" hideLabel placeholder="All statuses" options={[{ value: "", label: "All statuses" }, ...statuses]} value={query.status} onChange={(e) => setQuery({ ...query, status: e.target.value })} />
              <Select
                label="Participant type"
                hideLabel
                options={[{ value: "", label: "All participant types" }, ...participantTypes.map(({ value, label }) => ({ value, label }))]}
                value={query.participantType}
                onChange={(e) => setQuery({ ...query, participantType: e.target.value })}
              />
              {filtered && (
                <Button variant="ghost" onClick={() => setQuery({ search: "", status: "", participantType: "" })}>
                  Clear all
                </Button>
              )}
            </div>
            <div className="fx-ip-toolbar__search">
              <SearchField label="Search programs" placeholder="Search programs by name or ID…" value={query.search} onChange={(search) => setQuery({ ...query, search })} />
            </div>
          </div>
          {actionError && <Alert status="error" title={actionError} />}
          {load.state === "loading" && (
            <div className="fx-ip-state" role="status">
              <Spinner />
              <span>Loading programs…</span>
            </div>
          )}
          {load.state === "error" && (
            <div className="fx-ip-state">
              <EmptyState
                title="Couldn't load incentive programs"
                description="Check your connection and try again. If it keeps happening, contact support."
                action={
                  <Button variant="secondary" onClick={refresh}>
                    Try again
                  </Button>
                }
              />
            </div>
          )}
          {load.state === "ready" && load.rows.length === 0 && (
            <div className="fx-ip-state">
              <EmptyState
                title={filtered ? "No programs match these filters" : "No incentive programs yet"}
                description={filtered ? "Change or clear the filters to see more programs." : "Create a program to reward clients or IBs, then choose who can enrol."}
                action={
                  !filtered && can("create") ? (
                    <Button leadingIcon={<Plus />} onClick={onCreate}>
                      Create program
                    </Button>
                  ) : undefined
                }
              />
            </div>
          )}
          {load.state === "ready" && load.rows.length > 0 && <DataTable caption={copy.sectionTitle} columns={columns} rows={load.rows} getRowId={(p) => p.id} />}
        </div>
      </div>
    </div>
  );
}
