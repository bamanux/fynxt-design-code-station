import {
  ActivityCard,
  Alert,
  AppShell,
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  EntityChip,
  FilterChip,
  IconButton,
  Menu,
  SearchField,
  SideNav,
  Spinner,
  StatCard,
  Tabs,
  Tooltip,
  TopNav,
  type ActivityCardDetail,
  type MenuItem,
} from "@fynxt/ui";
import { Bell, Briefcase, ChevronDown, ChevronUp, Filter, Globe, Inbox, MessageSquare, MoreVertical, Plus, Search, Settings, User, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CommentsPanel } from "./CommentsPanel";
import { associationKey, FormDialog, type FormValues } from "./FormDialog";
import type { ActivityInput, ActivityRecord, ActivityWorkspaceConfig, Association, Option, ShellConfig, ToolAction } from "./types";

/** Renders a ToolAction; without onSelect it looks identical but is inactive and explains why. */
function Tool({ tool, size }: { tool: ToolAction; size: "xs" | "sm" }) {
  const button = (
    <IconButton
      variant={tool.variant ?? "ghost"}
      size={size}
      label={tool.label}
      icon={tool.icon}
      aria-disabled={tool.onSelect ? undefined : true}
      onClick={tool.onSelect}
    />
  );
  return tool.onSelect ? button : <Tooltip content={tool.pendingReason ?? "Not yet available"}>{button}</Tooltip>;
}

export interface ActivityWorkspaceProps {
  config: ActivityWorkspaceConfig;
}

type Dialog = { kind: "add" } | { kind: "edit"; record: ActivityRecord } | { kind: "followUp"; record: ActivityRecord } | null;
type Load = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; records: ActivityRecord[] };

const toggle = (set: Set<string>, id: string) => {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

/** DRAFT candidate template (DCF-0001). See ./types.ts for the configuration contract. */
export function ActivityWorkspace({ config }: ActivityWorkspaceProps) {
  const body = <WorkspaceBody config={config} />;
  return config.shell ? <WorkspaceShell shell={config.shell}>{body}</WorkspaceShell> : body;
}

function WorkspaceShell({ shell, children }: { shell: ShellConfig; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <AppShell
      nav={<SideNav items={shell.nav} activeId={shell.activeNavId} collapsed={collapsed} onCollapsedChange={setCollapsed} logo={shell.logo} logoMark={shell.logoMark} />}
      header={
        <TopNav
          title={shell.title}
          actions={
            <>
              <IconButton variant="ghost" size="sm" label="Settings" icon={<Settings />} />
              <IconButton variant="ghost" size="sm" label="Notifications" icon={<Bell />} badge={shell.notifications} badgeStatus="error" />
              {shell.language && (
                <Button variant="secondary" size="s" leadingIcon={<Globe />} aria-label={`Language: ${shell.language}`}>
                  {shell.language}
                </Button>
              )}
              <Avatar name={shell.userName} />
            </>
          }
        />
      }
    >
      {children}
    </AppShell>
  );
}

function WorkspaceBody({ config }: { config: ActivityWorkspaceConfig }) {
  const { dataAdapter: api, labels, states, permissionCheck: can } = config;
  const [view, setView] = useState(config.views[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [extraFilters, setExtraFilters] = useState<string[]>([]);
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [insights, setInsights] = useState<Record<string, number> | null>(null);
  const [users, setUsers] = useState<Option[]>([]);
  const [associable, setAssociable] = useState<Association[]>([]);
  const [bannerOpen, setBannerOpen] = useState(Boolean(config.banner));
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [descOpen, setDescOpen] = useState<Set<string>>(new Set());
  const [commentsOpen, setCommentsOpen] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toDelete, setToDelete] = useState<ActivityRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const request = useRef(0);
  const firstLoad = useRef(true);

  const reload = useCallback(async () => {
    const n = ++request.current;
    setLoad((l) => (l.state === "ready" ? l : { state: "loading" }));
    try {
      const [records, metrics] = await Promise.all([api.list({ view, search, filters }), config.insights ? api.insights(view) : Promise.resolve({})]);
      if (n !== request.current) return;
      setLoad({ state: "ready", records });
      setInsights(metrics);
      if (firstLoad.current && records[0]) setExpanded(new Set([records[0].id]));
      firstLoad.current = false;
    } catch (e) {
      if (n !== request.current) return;
      setLoad({ state: "error", message: e instanceof Error ? e.message : String(e) });
      setInsights(null);
    }
  }, [api, view, search, filters, config.insights]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    api.users().then(setUsers, () => setUsers([]));
    api.associable().then(setAssociable, () => setAssociable([]));
  }, [api]);

  const userName = useCallback((id: string) => users.find((u) => u.value === id)?.label ?? id, [users]);
  const statusLabel = (v: string) => config.statuses.find((s) => s.value === v)?.label ?? v;
  const statusBadge = (v: string) => config.statuses.find((s) => s.value === v)?.badge ?? "info";
  const filtersActive = Boolean(search) || Object.values(filters).some(Boolean);

  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  function toInput(values: FormValues, base?: ActivityRecord): ActivityInput {
    const str = (k: string) => (typeof values[k] === "string" ? (values[k] as string) : undefined);
    const arr = (k: string) => (Array.isArray(values[k]) ? (values[k] as string[]) : []);
    return {
      activityType: base?.activityType,
      title: str("title") ?? "",
      description: str("description") ?? "",
      priority: str("priority") || undefined,
      tags: arr("tags"),
      scheduledAt: str("scheduledAt") || undefined,
      reminder: str("reminder") || undefined,
      assignees: arr("assignees"),
      associations: arr("associations")
        .map((key) => associable.find((a) => associationKey(a) === key) ?? base?.associations.find((a) => associationKey(a) === key))
        .filter((a): a is Association => Boolean(a)),
    };
  }

  const recordValues = (r?: ActivityRecord): FormValues =>
    Object.fromEntries(
      config.recordForm.fields.map((f) => {
        if (!r) return [f.name, ["users", "tags", "associations"].includes(f.type) ? [] : ""];
        if (f.name === "associations") return [f.name, r.associations.map(associationKey)];
        const v = (r as unknown as Record<string, unknown>)[f.name];
        return [f.name, Array.isArray(v) ? (v as string[]) : typeof v === "string" ? v : ""];
      })
    );

  const allFilters = [...config.filters, ...(config.additionalFilters ?? []).filter((f) => extraFilters.includes(f.id))];
  const remainingFilters = (config.additionalFilters ?? []).filter((f) => !extraFilters.includes(f.id));

  function renderCard(r: ActivityRecord) {
    const priority = config.priorities.find((p) => p.value === r.priority);
    const longDesc = r.description.length > config.descriptionClamp;
    const showFull = descOpen.has(r.id);
    const menuItems: MenuItem[] = [
      can("edit", r) && { id: "edit", label: labels.edit, onSelect: () => setDialog({ kind: "edit", record: r }) },
      can("duplicate", r) && { id: "duplicate", label: labels.duplicate, onSelect: () => void run(() => api.duplicate(r.id)) },
      can("complete", r) && r.status !== config.completedStatus && { id: "complete", label: labels.complete, onSelect: () => void run(() => api.setStatus(r.id, config.completedStatus)) },
      can("delete", r) && { id: "delete", label: labels.delete, destructive: true, onSelect: () => setToDelete(r) },
    ].filter((i): i is MenuItem => Boolean(i));

    const details: ActivityCardDetail[] = [
      {
        label: labels.description,
        value: (
          <>
            <span className={longDesc && !showFull ? "fx-aw-clamp" : undefined}>{r.description}</span>
            {longDesc && (
              <button type="button" className="fx-aw-link" aria-expanded={showFull} onClick={() => setDescOpen((s) => toggle(s, r.id))}>
                {showFull ? labels.showLess : labels.showMore}
              </button>
            )}
          </>
        ),
      },
      {
        label: labels.associations,
        span: "half",
        value: (
          <>
            {can("edit", r) && <IconButton size="xs" label={labels.addAssociation} icon={<Plus />} onClick={() => setDialog({ kind: "edit", record: r })} />}
            {r.associations.map((a) => (
              <EntityChip key={associationKey(a)} label={a.label} icon={<Briefcase />} />
            ))}
          </>
        ),
      },
      { label: labels.assignedTo, span: "half", align: "end", value: r.assignees.map((u) => <EntityChip key={u} label={userName(u)} icon={<User />} />) },
      {
        // Approved frame shows a Badge; it also opens the status menu (AC13, decided 2026-10-13).
        label: labels.status,
        value: can("changeStatus", r) ? (
          <Menu
            label={labels.status}
            selectable
            align="start"
            items={config.statuses.map((s) => ({ id: s.value, label: s.label, selected: s.value === r.status, onSelect: () => void run(() => api.setStatus(r.id, s.value)) }))}
            renderTrigger={(p) => (
              <button {...p} type="button" className="fx-aw-badge-trigger" aria-label={`${labels.status}: ${statusLabel(r.status)}`}>
                <Badge status={statusBadge(r.status)}>{statusLabel(r.status)}</Badge>
              </button>
            )}
          />
        ) : (
          <Badge status={statusBadge(r.status)}>{statusLabel(r.status)}</Badge>
        ),
      },
    ];
    if (r.attachments.length) details.push({ label: labels.attachments, value: r.attachments.map((a) => <EntityChip key={a.id} label={a.name} />) });
    if (r.followUps.length)
      details.push({
        label: labels.followUps,
        value: (
          <ul className="fx-aw-followups">
            {r.followUps.map((f) => (
              <li key={f.id}>
                {f.date} {f.time} — {f.description}
              </li>
            ))}
          </ul>
        ),
      });

    return (
      <li key={r.id}>
        <ActivityCard
          title={`${r.activityType}: ${r.title}`}
          expanded={expanded.has(r.id)}
          onExpandedChange={() => setExpanded((s) => toggle(s, r.id))}
          meta={
            <>
              {r.tags.map((t) => (
                <Badge key={t} status="primary">{t}</Badge>
              ))}
              {r.scheduledAt && (
                <span className="fx-aw-pill">
                  <span className="fx-aw-pill__label">{labels.scheduledOn}</span> {config.formatDateTime(r.scheduledAt)}
                </span>
              )}
              {priority && <Badge status={priority.badge}>{priority.label}</Badge>}
            </>
          }
          actions={
            menuItems.length > 0 && (
              <Menu label={labels.actions} items={menuItems} renderTrigger={(p) => <IconButton {...p} size="xs" label={`${labels.actions}: ${r.title}`} icon={<MoreVertical />} />} />
            )
          }
          details={details}
          footerStart={
            <>
              <span>
                {labels.createdBy} <span className="fx-aw-strong">{r.createdBy}</span>
              </span>
            </>
          }
          footerEnd={
            <>
              <IconButton
                variant="ghost"
                size="xs"
                label={labels.comments}
                icon={<MessageSquare />}
                badge={r.commentCount}
                aria-expanded={commentsOpen.has(r.id)}
                onClick={() => setCommentsOpen((s) => toggle(s, r.id))}
              />
              {can("followUp", r) && (
                <Button variant="secondary" size="s" leadingIcon={<Plus />} onClick={() => setDialog({ kind: "followUp", record: r })}>
                  {labels.addFollowUp}
                </Button>
              )}
            </>
          }
        >
          {commentsOpen.has(r.id) && <CommentsPanel recordId={r.id} canComment={can("comment", r)} config={config} onAdded={() => void reload()} />}
        </ActivityCard>
      </li>
    );
  }

  const clearAll = () => {
    setSearch("");
    setFilters({});
  };

  let collection: ReactNode;
  if (load.state === "loading") collection = <div className="fx-aw-state"><Spinner label={states.loading} /><p className="fx-aw-muted">{states.loading}</p></div>;
  else if (load.state === "error")
    collection = (
      <div className="fx-aw-state">
        <Alert status="error" title={states.errorTitle}>{states.errorDescription}</Alert>
        <Button variant="secondary" onClick={() => void reload()}>{states.retry}</Button>
      </div>
    );
  else if (load.records.length === 0)
    collection = filtersActive ? (
      <EmptyState icon={<Search />} title={states.noResultsTitle} description={states.noResultsDescription} action={<Button variant="secondary" leadingIcon={<X />} onClick={clearAll}>{states.clearAll}</Button>} />
    ) : (
      <EmptyState
        icon={<Inbox />}
        title={states.emptyTitle}
        description={states.emptyDescription}
        action={can("create") ? <Button leadingIcon={<Plus />} onClick={() => setDialog({ kind: "add" })}>{config.primaryActionLabel}</Button> : undefined}
      />
    );
  else collection = <ul className="fx-aw-list" aria-label={config.entity.plural}>{load.records.map(renderCard)}</ul>;

  const content = (
    <div className="fx-aw-content">
      {bannerOpen && config.banner && (
        <Alert title={config.banner.title} action={<IconButton variant="ghost" size="sm" label={labels.dismiss} icon={<X />} onClick={() => setBannerOpen(false)} />}>
          {config.banner.message}
        </Alert>
      )}
      {config.insights && (
        <section className="fx-aw-insights" aria-labelledby="fx-aw-insights-title">
          <div className="fx-aw-insights__header">
            <h2 id="fx-aw-insights-title" className="fx-aw-insights__title">{config.insights.title}</h2>
            <div className="fx-aw-tools">
            {config.insights.tools?.map((t) => <Tool key={t.id} tool={t} size="xs" />)}
            <IconButton
              variant="ghost"
              size="xs"
              label={insightsOpen ? labels.collapse : labels.expand}
              aria-expanded={insightsOpen}
              aria-controls="fx-aw-insights-metrics"
              icon={insightsOpen ? <ChevronUp /> : <ChevronDown />}
              onClick={() => setInsightsOpen((o) => !o)}
            />
            </div>
          </div>
          <div id="fx-aw-insights-metrics" className="fx-aw-insights__metrics" hidden={!insightsOpen}>
            {config.insights.metrics.map((m) => (
              <StatCard key={m.id} density="compact" label={m.label} help={m.help} value={insights ? insights[m.id] ?? null : null} />
            ))}
          </div>
        </section>
      )}
      <div className="fx-aw-filters" role="search" aria-label={config.search.label}>
        <div className="fx-aw-filters__group">
          {remainingFilters.length > 0 ? (
            <Menu
              label={labels.addFilter}
              align="start"
              items={remainingFilters.map((f) => ({ id: f.id, label: f.label, onSelect: () => setExtraFilters((x) => [...x, f.id]) }))}
              renderTrigger={(p) => <IconButton {...p} variant="ghost" label={labels.addFilter} icon={<Filter />} />}
            />
          ) : (
            <Tooltip content="No more filters available (Q14)">
              <IconButton variant="ghost" label={labels.addFilter} icon={<Filter />} aria-disabled />
            </Tooltip>
          )}
          <span className="fx-aw-divider" aria-hidden="true" />
          {allFilters.map((f) => (
            <Menu
              key={f.id}
              label={f.label}
              selectable
              align="start"
              items={[
                { id: "", label: labels.all, selected: !filters[f.id], onSelect: () => setFilters(({ [f.id]: _gone, ...rest }) => rest) },
                ...f.options.map((o) => ({ id: o.value, label: o.label, selected: filters[f.id] === o.value, onSelect: () => setFilters((x) => ({ ...x, [f.id]: o.value })) })),
              ]}
              renderTrigger={(p) => <FilterChip {...p} label={f.label} value={f.options.find((o) => o.value === filters[f.id])?.label} />}
            />
          ))}
          <span className="fx-aw-divider" aria-hidden="true" />
          <Button variant="ghost" size="s" leadingIcon={<X />} onClick={clearAll}>
            {states.clearAll}
          </Button>
        </div>
        <SearchField size="sm" label={config.search.label} placeholder={config.search.placeholder} value={search} onChange={setSearch} className="fx-aw-filters__search" />
      </div>
      {actionError && <Alert status="error" title={states.errorTitle}>{actionError}</Alert>}
      {collection}
    </div>
  );

  const editing = dialog?.kind === "edit" ? dialog.record : undefined;
  const following = dialog?.kind === "followUp" ? dialog.record : undefined;
  const recordInitial = useMemo(() => recordValues(editing), [editing, config.recordForm]);

  return (
    <div className="fx-aw">
      <div className="fx-aw-top">
        <div className="fx-aw-top__actions">
          {can("create") && (
            <Button leadingIcon={<Plus />} onClick={() => setDialog({ kind: "add" })}>
              {config.primaryActionLabel}
            </Button>
          )}
          {config.headerTools?.map((t) => <Tool key={t.id} tool={t} size="sm" />)}
          {config.workspaceActions && config.workspaceActions.length > 0 ? (
            <Menu
              label={labels.actions}
              items={config.workspaceActions.map((a) => ({ id: a.id, label: a.label, onSelect: a.onSelect }))}
              renderTrigger={(p) => <IconButton {...p} size="sm" label={labels.actions} icon={<MoreVertical />} />}
            />
          ) : (
            config.workspaceMenuPendingReason && (
              <Tool tool={{ id: "workspace-menu", label: labels.actions, icon: <MoreVertical />, variant: "secondary", pendingReason: config.workspaceMenuPendingReason }} size="sm" />
            )
          )}
        </div>
        <Tabs label={config.entity.plural} value={view} onChange={setView} items={config.views.map((v) => ({ id: v.id, label: v.label, content: v.id === view ? content : null }))} />
      </div>

      <FormDialog
        open={dialog?.kind === "add" || dialog?.kind === "edit"}
        mode={dialog?.kind === "edit" ? "edit" : "add"}
        config={config.recordForm}
        initial={recordInitial}
        users={users}
        associable={associable}
        saveErrorTitle={states.errorTitle}
        onClose={() => setDialog(null)}
        onSubmit={async (values) => {
          if (editing) await api.update(editing.id, toInput(values, editing));
          else await api.create(toInput(values));
          setDialog(null);
          await reload();
        }}
      />
      <FormDialog
        open={dialog?.kind === "followUp"}
        mode="add"
        config={config.followUpForm}
        initial={Object.fromEntries(config.followUpForm.fields.map((f) => [f.name, ""]))}
        users={users}
        associable={associable}
        saveErrorTitle={states.errorTitle}
        onClose={() => setDialog(null)}
        onSubmit={async (values) => {
          if (!following) return;
          const s = (k: string) => (typeof values[k] === "string" ? (values[k] as string) : "");
          await api.addFollowUp(following.id, { date: s("date"), time: s("time"), description: s("description") });
          setDialog(null);
          await reload();
        }}
      />
      <ConfirmDialog
        open={toDelete !== null}
        destructive
        title={labels.deleteTitle}
        message={labels.deleteMessage}
        confirmLabel={labels.delete}
        busy={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          setDeleting(true);
          await run(() => api.remove(toDelete.id));
          setDeleting(false);
          setToDelete(null);
        }}
      />
    </div>
  );
}
