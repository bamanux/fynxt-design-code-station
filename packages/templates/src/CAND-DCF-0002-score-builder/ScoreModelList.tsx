import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  IconButton,
  Menu,
  SearchField,
  Select,
  Spinner,
  Toast,
  Toggle,
  Tooltip,
  summarize,
  type ConditionObject,
  type DataTableColumn,
  type MenuItem,
} from "@fynxt/ui";
import { MoreVertical, Plus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { objectLabel } from "./model";
import type { ScoreBuilderConfig, ScoreModel, ScoreModelQuery } from "./types";

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; rows: ScoreModel[] };
type Pending = null | { kind: "delete"; model: ScoreModel } | { kind: "turnOff"; model: ScoreModel };

export interface ScoreModelListProps {
  config: ScoreBuilderConfig;
  onCreate: () => void;
  onEdit: (model: ScoreModel) => void;
  /** Success message shown after returning from the builder (frame 34). */
  notice: string | null;
  onDismissNotice: () => void;
}

/** P2 · Score Builder list (approved frames 01, 34, 44–52, 59, 60). */
export function ScoreModelList({ config, onCreate, onEdit, notice, onDismissNotice }: ScoreModelListProps) {
  const { adapter, can, copy, statuses } = config;
  const [query, setQuery] = useState<ScoreModelQuery>({ search: "", status: "", object: "" });
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [schema, setSchema] = useState<ConditionObject[]>([]);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(notice);
  const [actionError, setActionError] = useState<string | null>(null);
  const [bannerOpen, setBannerOpen] = useState(true);

  useEffect(() => setToast(notice), [notice]);
  useEffect(() => {
    adapter.schema().then(setSchema, () => setSchema([]));
  }, [adapter]);

  const refresh = useCallback(() => {
    setLoad({ state: "loading" });
    adapter.list(query).then(
      (rows) => setLoad({ state: "ready", rows }),
      () => setLoad({ state: "error" })
    );
  }, [adapter, query]);
  useEffect(refresh, [refresh]);

  const status = (value: string) => statuses.find((s) => s.value === value);
  const filtered = query.search !== "" || query.status !== "" || query.object !== "";

  async function run(action: () => Promise<unknown>, success: string, failure: string) {
    setActionError(null);
    setBusy(true);
    try {
      await action();
      setToast(success);
      onDismissNotice();
      refresh();
    } catch {
      setActionError(failure);
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  function duplicate(m: ScoreModel) {
    const rows = load.state === "ready" ? load.rows : [];
    const name = config.duplicateName(m.name, rows.map((r) => r.name));
    run(() => adapter.duplicate(m.id, name), `Copy created as Draft: ${name}`, "Couldn't duplicate the score model.");
  }

  function menuFor(m: ScoreModel): MenuItem[] {
    const items: MenuItem[] = [];
    if (can("edit", m)) items.push({ id: "edit", label: "Edit", onSelect: () => onEdit(m) });
    if (can("duplicate", m)) items.push({ id: "duplicate", label: "Duplicate", onSelect: () => duplicate(m) });
    if (can("delete", m)) items.push({ id: "delete", label: "Delete", destructive: true, onSelect: () => setPending({ kind: "delete", model: m }) });
    return items;
  }

  function setActive(m: ScoreModel, on: boolean) {
    if (!on) setPending({ kind: "turnOff", model: m });
    else run(() => adapter.setStatus(m.id, config.activeStatus), `${m.name} turned on`, "Couldn't change the status.");
  }

  const columns: DataTableColumn<ScoreModel>[] = [
    { id: "code", header: "ID", width: "6%", cell: (m) => m.code },
    {
      id: "name",
      header: "Name",
      width: "22%",
      cell: (m) => (
        <span className="fx-sb-stack">
          {can("edit", m) ? (
            <button type="button" className="fx-sb-link" onClick={() => onEdit(m)}>
              {m.name}
            </button>
          ) : (
            m.name
          )}
          {m.description && <span className="fx-sb-sub">{m.description}</span>}
        </span>
      ),
    },
    { id: "object", header: "Object", cell: (m) => m.objects.map((g) => objectLabel(schema, g.object)).join(", ") || "—" },
    { id: "applies", header: "Applies to", width: "20%", cell: (m) => <span className="fx-sb-truncate">{summarize(m.appliesTo, schema, config.operatorsByType) || "All records"}</span> },
    { id: "attributes", header: "# Attributes", cell: (m) => m.objects.reduce((n, g) => n + g.attributes.length, 0) },
    {
      id: "bands",
      header: "Outcome bands",
      width: "22%",
      cell: (m) => (
        <span className="fx-sb-bands">
          {m.bands.map((b) =>
            b.description ? (
              <Tooltip key={b.id} content={b.description}>
                <span tabIndex={0} className="fx-sb-band">
                  <Badge status="neutral">{b.label}</Badge>
                </span>
              </Tooltip>
            ) : (
              <Badge key={b.id} status="neutral">
                {b.label}
              </Badge>
            )
          )}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (m) =>
        m.status === config.draftStatus ? (
          <Badge status={status(m.status)?.tone ?? "neutral"}>{status(m.status)?.label ?? m.status}</Badge>
        ) : (
          <Toggle checked={m.status === config.activeStatus} onChange={(on) => setActive(m, on)} label={`${m.name} active`} hideLabel disabled={!can("toggle", m) || busy} />
        ),
    },
    {
      id: "actions",
      header: <span className="fx-visually-hidden">Actions</span>,
      width: "var(--fx-spacing-12)",
      align: "center",
      cell: (m) => {
        const items = menuFor(m);
        return items.length ? (
          <Menu label={`Actions for ${m.name}`} items={items} align="end" renderTrigger={(t) => <IconButton {...t} variant="ghost" size="sm" label={`Actions for ${m.name}`} icon={<MoreVertical />} />} />
        ) : null;
      },
    },
  ];

  return (
    <div className="fx-sb-list">
      {toast && (
        <div className="fx-sb-toast">
          <Toast
            status="success"
            onClose={() => {
              setToast(null);
              onDismissNotice();
            }}
          >
            {toast}
          </Toast>
        </div>
      )}
      <header className="fx-sb-list__header">
        <h1 className="fx-sb-list__title">{copy.pageTitle}</h1>
      </header>
      <div className="fx-sb-list__body">
        {copy.banner && bannerOpen && (
          <Alert status="info" title={copy.banner.title} action={<IconButton variant="ghost" size="sm" label="Dismiss" icon={<X />} onClick={() => setBannerOpen(false)} />}>
            {copy.banner.text}
          </Alert>
        )}
        <div className="fx-sb-section">
          <div>
            <h2 className="fx-sb-section__title">{copy.sectionTitle}</h2>
            <p className="fx-sb-section__desc">{copy.sectionDescription}</p>
          </div>
          {can("create") && (
            <Button leadingIcon={<Plus />} onClick={onCreate}>
              Create score model
            </Button>
          )}
        </div>
        <div className="fx-sb-card fx-sb-card--table">
          <div className="fx-sb-toolbar">
            <div className="fx-sb-toolbar__filters">
              <Select label="Status" hideLabel options={[{ value: "", label: "All statuses" }, ...statuses.map(({ value, label }) => ({ value, label }))]} value={query.status} onChange={(e) => setQuery({ ...query, status: e.target.value })} />
              <Select label="Object" hideLabel options={[{ value: "", label: "All objects" }, ...schema.map((o) => ({ value: o.id, label: o.label }))]} value={query.object} onChange={(e) => setQuery({ ...query, object: e.target.value })} />
              {filtered && (
                <Button variant="ghost" onClick={() => setQuery({ search: "", status: "", object: "" })}>
                  Clear all
                </Button>
              )}
            </div>
            <div className="fx-sb-toolbar__search">
              <SearchField label="Search score models" placeholder="Search for score model name…" value={query.search} onChange={(search) => setQuery({ ...query, search })} />
            </div>
          </div>
          {actionError && <Alert status="error" title={actionError} />}
          {load.state === "loading" && (
            <div className="fx-sb-state" role="status">
              <Spinner />
              <span>Loading score models…</span>
            </div>
          )}
          {load.state === "error" && (
            <div className="fx-sb-state">
              <EmptyState
                title="Couldn't load score models"
                description="Check your connection and try again."
                action={
                  <Button variant="secondary" onClick={refresh}>
                    Try again
                  </Button>
                }
              />
            </div>
          )}
          {load.state === "ready" && load.rows.length === 0 && (
            <div className="fx-sb-state">
              <EmptyState
                title={query.search ? `No score models match “${query.search}”` : filtered ? "No score models match these filters" : "No score models yet"}
                description={filtered ? "Check the spelling or clear the search and filters." : "Create a score model to rate contacts, deals or other records."}
                action={
                  filtered ? (
                    <Button variant="secondary" onClick={() => setQuery({ search: "", status: "", object: "" })}>
                      Clear search and filters
                    </Button>
                  ) : can("create") ? (
                    <Button leadingIcon={<Plus />} onClick={onCreate}>
                      Create score model
                    </Button>
                  ) : undefined
                }
              />
            </div>
          )}
          {load.state === "ready" && load.rows.length > 0 && <DataTable caption={copy.sectionTitle} columns={columns} rows={load.rows} getRowId={(m) => m.id} />}
        </div>
      </div>

      <ConfirmDialog
        open={pending?.kind === "delete"}
        title={`Delete ${pending?.model.name ?? ""}?`}
        message="Deleting this score model can't be undone."
        confirmLabel="Delete"
        destructive
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => pending && run(() => adapter.remove(pending.model.id), "Score model deleted", "Couldn't delete the score model.")}
      />
      <ConfirmDialog
        open={pending?.kind === "turnOff"}
        title={`Turn off ${pending?.model.name ?? ""}?`}
        message="Records will stop being scored by this model. Existing scores stay as they are."
        confirmLabel="Turn off"
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => pending && run(() => adapter.setStatus(pending.model.id, config.inactiveStatus), `${pending.model.name} turned off`, "Couldn't change the status.")}
      />
    </div>
  );
}
