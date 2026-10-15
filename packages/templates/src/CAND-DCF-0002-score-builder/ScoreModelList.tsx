import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  FilterChip,
  IconButton,
  Menu,
  SearchField,
  Select,
  Spinner,
  Tabs,
  Toast,
  Toggle,
  Tooltip,
  type ConditionObject,
  type DataTableColumn,
  type MenuItem,
} from "@fynxt/ui";
import { ChevronLeft, ChevronRight, Columns3, Eye, Filter, Lightbulb, MoreHorizontal, MoreVertical, Plus, X } from "lucide-react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { conditionsText, objectLabel } from "./model";
import { PendingIconButton } from "./Pending";
import type { ScoreBuilderConfig, ScoreModel, ScoreModelQuery } from "./types";

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; rows: ScoreModel[] };
type Pending = null | { kind: "delete"; model: ScoreModel } | { kind: "turnOff"; model: ScoreModel };
type Sort = null | { column: string; dir: "asc" | "desc" };

export interface ScoreModelListProps {
  config: ScoreBuilderConfig;
  onCreate: () => void;
  onEdit: (model: ScoreModel) => void;
  /** Success message shown after returning from the builder (frame 34). */
  notice: string | null;
  onDismissNotice: () => void;
}

const EMPTY_QUERY: ScoreModelQuery = { search: "", status: "", object: "" };

/** P2 · Score Builder list (approved frames 01, 34, 44–52, 59, 60). */
export function ScoreModelList({ config, onCreate, onEdit, notice, onDismissNotice }: ScoreModelListProps) {
  const { adapter, can, copy, statuses } = config;
  const pageSizes = config.pageSizes?.length ? config.pageSizes : [10, 25, 50];
  const [tab, setTab] = useState("models");
  const [query, setQuery] = useState<ScoreModelQuery>(EMPTY_QUERY);
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [schema, setSchema] = useState<ConditionObject[]>([]);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(notice);
  const [actionError, setActionError] = useState<string | null>(null);
  const [bannerOpen, setBannerOpen] = useState(true);
  const [sort, setSort] = useState<Sort>(null);
  const [pageSize, setPageSize] = useState(pageSizes[0]!);
  const [page, setPage] = useState(0);

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
  useEffect(() => setPage(0), [query, pageSize]);

  const status = (value: string) => statuses.find((s) => s.value === value);
  const filtered = query.search !== "" || query.status !== "" || query.object !== "";
  const attributeCount = (m: ScoreModel) => m.objects.reduce((n, g) => n + g.attributes.length, 0);
  const objectsText = (m: ScoreModel) => m.objects.map((g) => objectLabel(schema, g.object)).join(", ");

  // Client-side sort and paging of what the adapter returned (column menus and pagination, frame 01).
  const sortKeys: Record<string, (m: ScoreModel) => string | number> = {
    code: (m) => Number(m.code) || m.code,
    name: (m) => m.name.toLowerCase(),
    object: (m) => objectsText(m).toLowerCase(),
    applies: (m) => conditionsText(m.appliesTo, schema, config.operatorsByType, "compact").toLowerCase(),
    attributes: attributeCount,
    bands: (m) => m.bands.map((b) => b.label).join(" / ").toLowerCase(),
    status: (m) => status(m.status)?.label ?? m.status,
  };
  const loaded = load.state === "ready" ? load.rows : [];
  const sortKey = sort ? sortKeys[sort.column] : undefined;
  const dir = sort?.dir === "desc" ? -1 : 1;
  const rows = sortKey ? [...loaded].sort((a, b) => (sortKey(a) < sortKey(b) ? -dir : sortKey(a) > sortKey(b) ? dir : 0)) : loaded;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const visible = rows.slice(current * pageSize, current * pageSize + pageSize);

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
    const all = load.state === "ready" ? load.rows : [];
    const name = config.duplicateName(m.name, all.map((r) => r.name));
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

  /** FDS-101 Data Table Header menu (⋯): sort this column. */
  const headerMenu = (id: string, name: string) => (
    <Menu
      label={`${name} column`}
      align="end"
      selectable
      items={[
        { id: "asc", label: "Sort ascending", selected: sort?.column === id && sort.dir === "asc", onSelect: () => setSort({ column: id, dir: "asc" }) },
        { id: "desc", label: "Sort descending", selected: sort?.column === id && sort.dir === "desc", onSelect: () => setSort({ column: id, dir: "desc" }) },
        { id: "clear", label: "Clear sort", disabled: sort?.column !== id, onSelect: () => setSort(null) },
      ]}
      renderTrigger={(t) => <IconButton {...t} variant="ghost" size="xs" label={`${name} column options`} icon={<MoreHorizontal />} className="fx-sb-th-menu" />}
    />
  );
  const col = (id: string, name: string, width: string, cell: DataTableColumn<ScoreModel>["cell"]): DataTableColumn<ScoreModel> => ({ id, header: name, width, cell, headerAction: headerMenu(id, name) });

  const columns: DataTableColumn<ScoreModel>[] = [
    col("code", "ID", "7.1%", (m) => m.code),
    col("name", "Name", "17.8%", (m) => (
      <span className="fx-sb-stack">
        <span className="fx-sb-truncate">{m.name}</span>
        {m.description && <span className="fx-sb-sub fx-sb-truncate">{m.description}</span>}
      </span>
    )),
    col("object", "Object", "9.8%", (m) => <span className="fx-sb-truncate">{objectsText(m) || "—"}</span>),
    col("applies", "Applies to", "20.4%", (m) => <span className="fx-sb-truncate">{conditionsText(m.appliesTo, schema, config.operatorsByType, "compact") || "All records"}</span>),
    col("attributes", "# Attributes", "13.3%", attributeCount),
    col("bands", "Outcome bands", "16%", (m) => (
      <span className="fx-sb-truncate">
        {m.bands.map((b, i) => (
          <Fragment key={b.id}>
            {i > 0 && " / "}
            {b.description ? (
              <Tooltip content={b.description}>
                <span tabIndex={0} className="fx-sb-bandtext">
                  {b.label}
                </span>
              </Tooltip>
            ) : (
              b.label
            )}
          </Fragment>
        ))}
      </span>
    )),
    col("status", "Status", "10.7%", (m) =>
      m.status === config.draftStatus ? (
        <Badge status={status(m.status)?.tone ?? "neutral"}>{status(m.status)?.label ?? m.status}</Badge>
      ) : (
        <Toggle checked={m.status === config.activeStatus} onChange={(on) => setActive(m, on)} label={`${m.name} active`} hideLabel disabled={!can("toggle", m) || busy} />
      )
    ),
    {
      id: "actions",
      header: copy.columns ? <PendingIconButton control={copy.columns} icon={<Columns3 />} size="xs" /> : <span className="fx-visually-hidden">Actions</span>,
      width: "5%",
      align: "center",
      cell: (m) => {
        const items = menuFor(m);
        return (
          <span className="fx-sb-rowactions">
            {can("edit", m) && <IconButton variant="ghost" size="xs" label={`View ${m.name}`} icon={<Eye />} onClick={() => onEdit(m)} />}
            {items.length > 0 && <Menu label={`Actions for ${m.name}`} items={items} align="end" renderTrigger={(t) => <IconButton {...t} variant="ghost" size="xs" label={`Actions for ${m.name}`} icon={<MoreVertical />} />} />}
          </span>
        );
      },
    },
  ];

  const statusLabel = statuses.find((s) => s.value === query.status)?.label;
  const objectLabelValue = schema.find((o) => o.id === query.object)?.label;

  const models = (
    <div className="fx-sb-list__body">
      {copy.banner && bannerOpen && (
        <Alert status="info" title={copy.banner.title} action={<IconButton variant="ghost" size="sm" label="Dismiss" icon={<X />} onClick={() => setBannerOpen(false)} />}>
          {copy.banner.text}
        </Alert>
      )}
      <div className="fx-sb-card fx-sb-card--table">
        <div className="fx-sb-toolbar">
          <div className="fx-sb-toolbar__filters">
            {copy.addFilter && (
              <Tooltip content={copy.addFilter.pendingReason}>
                <button type="button" className="fx-sb-addfilter" aria-label={copy.addFilter.label} aria-disabled="true" onClick={(e) => e.preventDefault()}>
                  <Filter aria-hidden="true" />
                  <Plus aria-hidden="true" />
                </button>
              </Tooltip>
            )}
            <span className="fx-sb-divider" aria-hidden="true" />
            <Menu
              label="Status"
              heading="Status"
              selectable
              align="start"
              items={[{ value: "", label: "All statuses" }, ...statuses].map((s) => ({ id: s.value || "all", label: s.label, selected: query.status === s.value, onSelect: () => setQuery({ ...query, status: s.value }) }))}
              renderTrigger={(t) => <FilterChip {...t} label="Status" value={statusLabel} />}
            />
            <Menu
              label="Object"
              heading="Object"
              selectable
              align="start"
              items={[{ id: "", label: "All objects" }, ...schema].map((o) => ({ id: o.id || "all", label: o.label, selected: query.object === o.id, onSelect: () => setQuery({ ...query, object: o.id }) }))}
              renderTrigger={(t) => <FilterChip {...t} label="Object" value={objectLabelValue} />}
            />
            <span className="fx-sb-divider" aria-hidden="true" />
            <Button variant="ghost" size="s" leadingIcon={<X />} onClick={() => setQuery(EMPTY_QUERY)} disabled={!filtered}>
              Clear All
            </Button>
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
        {load.state === "ready" && rows.length === 0 && (
          <div className="fx-sb-state">
            <EmptyState
              title={query.search ? `No score models match “${query.search}”` : filtered ? "No score models match these filters" : "No score models yet"}
              description={filtered ? "Check the spelling or clear the search and filters." : "Create a score model to rate contacts, deals or other records."}
              action={
                filtered ? (
                  <Button variant="secondary" onClick={() => setQuery(EMPTY_QUERY)}>
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
        {load.state === "ready" && rows.length > 0 && (
          <>
            <DataTable caption={copy.sectionTitle} columns={columns} rows={visible} getRowId={(m) => m.id} />
            <nav className="fx-sb-pagination" aria-label="Pagination">
              <div className="fx-sb-pagination__size">
                <span id="fx-sb-rows-label">Rows per page:</span>
                <Select label="Rows per page" hideLabel options={pageSizes.map((n) => ({ value: String(n), label: String(n) }))} value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))} />
              </div>
              <div className="fx-sb-pagination__pager">
                <span aria-live="polite">{`${current * pageSize + 1}–${Math.min(rows.length, (current + 1) * pageSize)} of ${rows.length}`}</span>
                <IconButton variant="ghost" size="sm" label="Previous page" icon={<ChevronLeft />} disabled={current === 0} onClick={() => setPage(current - 1)} />
                {Array.from({ length: pageCount }, (_, i) => (
                  <button key={i} type="button" className="fx-sb-page" aria-current={i === current ? "page" : undefined} aria-label={`Page ${i + 1}`} onClick={() => setPage(i)}>
                    {i + 1}
                  </button>
                ))}
                <IconButton variant="ghost" size="sm" label="Next page" icon={<ChevronRight />} disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)} />
              </div>
            </nav>
          </>
        )}
      </div>
    </div>
  );

  const audit = copy.auditLogs && (
    <div className="fx-sb-list__body">
      <div className="fx-sb-card">
        <EmptyState title={copy.auditLogs.label} description={copy.auditLogs.pendingReason} />
      </div>
    </div>
  );

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
      <div className="fx-sb-list__header">
        <div className="fx-sb-list__actions">
          {can("create") && (
            <Button leadingIcon={<Plus />} onClick={onCreate}>
              Create score model
            </Button>
          )}
          {copy.pageActions?.tips && <PendingIconButton control={copy.pageActions.tips} icon={<Lightbulb />} variant="info" size="lg" />}
          {copy.pageActions?.more && <PendingIconButton control={copy.pageActions.more} icon={<MoreVertical />} variant="secondary" size="lg" />}
        </div>
        <Tabs
          label={copy.pageTitle}
          value={tab}
          onChange={setTab}
          items={[
            { id: "models", label: copy.pageTitle, content: tab === "models" ? models : null },
            ...(copy.auditLogs ? [{ id: "audit", label: copy.auditLogs.label, content: tab === "audit" ? audit : null }] : []),
          ]}
        />
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
