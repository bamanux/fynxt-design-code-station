import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivityWorkspace } from "./ActivityWorkspace";
import { validate } from "./FormDialog";
import { createMemoryAdapter } from "./memoryAdapter";
import type { ActivityDataAdapter, ActivityRecord, ActivityWorkspaceConfig, PermissionCheck } from "./types";

beforeEach(() => {
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});

const rec = (over: Partial<ActivityRecord> & Pick<ActivityRecord, "id" | "title">): ActivityRecord => ({
  activityType: "Task",
  description: "Short",
  tags: [],
  status: "upcoming",
  assignees: ["u1"],
  associations: [],
  attachments: [],
  followUps: [],
  commentCount: 0,
  createdBy: "Admin",
  createdAt: "2026-03-01T09:00:00.000Z",
  ...over,
});

const seed = () => [
  rec({ id: "a", title: "Alpha pricing", status: "in-progress", priority: "medium", tags: ["Pricing"], description: "A very long description that is definitely longer than the clamp limit set for tests." }),
  rec({ id: "b", title: "Beta renewal", activityType: "Follow-up", assignees: ["u2"] }),
  rec({ id: "c", title: "Gamma docs", status: "completed" }),
];

function makeConfig(over: { adapter?: ActivityDataAdapter; can?: PermissionCheck; records?: ActivityRecord[] } = {}): ActivityWorkspaceConfig {
  const statuses = [
    { value: "upcoming", label: "Upcoming" },
    { value: "in-progress", label: "In-progress" },
    { value: "completed", label: "Completed" },
  ];
  return {
    entity: { singular: "Task", plural: "Tasks" },
    views: [
      { id: "mine", label: "My Task" },
      { id: "team", label: "My Team's Task" },
    ],
    primaryActionLabel: "Add Task",
    banner: { title: "Automation is on", message: "Banner" },
    insights: { title: "Insights", metrics: [{ id: "total", label: "Total Task", help: "Help" }, { id: "completed", label: "Completed Task" }] },
    search: { label: "Search tasks", placeholder: "Search…" },
    filters: [
      { id: "activityType", label: "Activity Type", options: [{ value: "Task", label: "Task" }, { value: "Follow-up", label: "Follow-up" }] },
      { id: "status", label: "Status", options: statuses },
    ],
    statuses,
    completedStatus: "completed",
    reminders: [{ value: "1h", label: "1 hour before" }],
    priorities: [{ value: "medium", label: "Medium", badge: "warning" }],
    descriptionClamp: 40,
    labels: {
      actions: "Task actions", edit: "Edit", duplicate: "Duplicate", complete: "Mark as completed", delete: "Delete",
      deleteTitle: "Delete this task?", deleteMessage: "Gone for good.", scheduledOn: "Scheduled on:", description: "Description",
      associations: "Associations", addAssociation: "Add association", assignedTo: "Assigned to", status: "Status", reminder: "Reminder",
      noReminder: "No reminder", attachments: "Attachments", followUps: "Follow-ups", addFollowUp: "Follow Up", createdBy: "Created by:",
      createdOn: "Created on:", comments: "Comments", addComment: "Add a comment", commentAction: "Comment", noComments: "No comments yet",
      sortRecent: "Most recent", sortOldest: "Oldest", showMore: "Show more", showLess: "Show less", addFilter: "Add filter", all: "All",
      dismiss: "Dismiss banner", collapse: "Collapse insights", expand: "Expand insights",
    },
    states: {
      loading: "Loading tasks", emptyTitle: "No tasks yet", emptyDescription: "Create one", noResultsTitle: "No tasks match your filters",
      noResultsDescription: "Try again", errorTitle: "Couldn't load tasks", errorDescription: "Try later", retry: "Retry", clearAll: "Clear all",
    },
    recordForm: {
      addTitle: "Add Task", editTitle: "Edit Task", submitLabel: "Save", cancelLabel: "Cancel", clearLabel: "Clear fields",
      requiredMessage: (l) => `${l} is required.`, invalidDateMessage: "Invalid date.",
      fields: [
        { name: "title", label: "Task Name", type: "text", required: true },
        { name: "assignees", label: "Assign To", type: "users", required: true },
        { name: "scheduledAt", label: "Date & Time", type: "datetime" },
        { name: "description", label: "Description", type: "textarea", required: true },
      ],
    },
    followUpForm: {
      addTitle: "Add Follow-up", submitLabel: "Add", cancelLabel: "Cancel", size: "small",
      requiredMessage: (l) => `${l} is required.`, invalidDateMessage: "Invalid.",
      fields: [
        { name: "date", label: "Date", type: "date" },
        { name: "time", label: "Time", type: "time" },
        { name: "description", label: "Description", type: "textarea" },
      ],
    },
    formatDateTime: (v) => v,
    permissionCheck: over.can ?? (() => true),
    dataAdapter:
      over.adapter ??
      createMemoryAdapter({
        records: over.records ?? seed(),
        users: [{ value: "u1", label: "John Smith" }, { value: "u2", label: "Jane Doe" }],
        associable: [],
        currentUser: "Tester",
        inView: (view, r) => (view === "mine" ? r.assignees.includes("u1") : true),
        metrics: (rs) => ({ total: rs.length, completed: rs.filter((r) => r.status === "completed").length }),
        now: () => new Date("2026-03-05T10:00:00.000Z"),
      }),
  };
}

const cards = () => within(screen.getByRole("list", { name: "Tasks" })).getAllByRole("article");
const metric = (label: string) => screen.getByText(label).closest(".fx-stat")!;

describe("ActivityWorkspace — workspace (AC1, AC2)", () => {
  it("loads the My Task scope with tabs, Add Task, banner and insights", async () => {
    render(<ActivityWorkspace config={makeConfig()} />);
    expect(screen.getByRole("status", { name: "Loading tasks" })).toBeInTheDocument();
    await waitFor(() => expect(cards()).toHaveLength(2));
    expect(screen.getByRole("tab", { name: "My Task" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Add Task" })).toBeInTheDocument();
    expect(metric("Total Task")).toHaveTextContent("2");
    expect(metric("Completed Task")).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "About Total Task" })).toBeInTheDocument();
  });

  it("switching to My Team's Task changes the scope", async () => {
    render(<ActivityWorkspace config={makeConfig()} />);
    await waitFor(() => expect(cards()).toHaveLength(2));
    await userEvent.click(screen.getByRole("tab", { name: "My Team's Task" }));
    await waitFor(() => expect(cards()).toHaveLength(3));
  });

  it("the banner can be dismissed and insights collapsed", async () => {
    render(<ActivityWorkspace config={makeConfig()} />);
    await userEvent.click(await screen.findByRole("button", { name: "Dismiss banner" }));
    expect(screen.queryByText("Automation is on")).not.toBeInTheDocument();
    const collapse = screen.getByRole("button", { name: "Collapse insights" });
    await userEvent.click(collapse);
    expect(screen.getByRole("button", { name: "Expand insights" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Total Task")).not.toBeVisible();
  });
});

describe("ActivityWorkspace — filters and search (AC3)", () => {
  it("combines filters with AND, shows no-results, and Clear all resets", async () => {
    render(<ActivityWorkspace config={makeConfig()} />);
    await waitFor(() => expect(cards()).toHaveLength(2));
    const bar = screen.getByRole("search", { name: "Search tasks" });
    await userEvent.click(within(bar).getByRole("button", { name: "Status" }));
    await userEvent.click(screen.getByRole("menuitemradio", { name: "In-progress" }));
    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(within(bar).getByRole("button", { name: "Status: In-progress" })).toBeInTheDocument();
    await userEvent.click(within(bar).getByRole("button", { name: "Activity Type" }));
    await userEvent.click(screen.getByRole("menuitemradio", { name: "Follow-up" }));
    expect(await screen.findByRole("heading", { name: "No tasks match your filters" })).toBeInTheDocument();
    await userEvent.click(within(bar).getByRole("button", { name: "Clear all" }));
    await waitFor(() => expect(cards()).toHaveLength(2));
  });

  it("search returns matching records", async () => {
    render(<ActivityWorkspace config={makeConfig()} />);
    await waitFor(() => expect(cards()).toHaveLength(2));
    await userEvent.type(screen.getByRole("searchbox", { name: "Search tasks" }), "alpha");
    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(cards()[0]).toHaveTextContent("Task: Alpha pricing");
  });

  it("add-filter is shown but inactive when no extra filters are configured (Q14)", async () => {
    render(<ActivityWorkspace config={makeConfig()} />);
    const add = await screen.findByRole("button", { name: "Add filter" });
    expect(add).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(add);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("ActivityWorkspace — cards (AC4, AC12, AC13, AC14)", () => {
  it("first card is expanded; cards show type-prefixed titles, details and Show more", async () => {
    render(<ActivityWorkspace config={makeConfig()} />);
    await waitFor(() => expect(cards()).toHaveLength(2));
    const first = cards()[0]!;
    expect(within(first).getByRole("button", { name: "Task: Alpha pricing" })).toHaveAttribute("aria-expanded", "true");
    expect(within(cards()[1]!).getByRole("button", { name: "Task: Gamma docs" })).toHaveAttribute("aria-expanded", "false");
    expect(within(first).getByText("Medium")).toBeInTheDocument();
    expect(within(first).getByText("John Smith")).toBeInTheDocument();
    await userEvent.click(within(first).getByRole("button", { name: "Show more" }));
    expect(within(first).getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
  });

  it("status change from the card updates the card and insights", async () => {
    render(<ActivityWorkspace config={makeConfig()} />);
    await waitFor(() => expect(cards()).toHaveLength(2));
    await userEvent.click(within(cards()[0]!).getByRole("button", { name: "Status: In-progress" }));
    await userEvent.click(screen.getByRole("menuitemradio", { name: "Completed" }));
    await waitFor(() => expect(within(cards()[0]!).getByRole("button", { name: "Status: Completed" })).toBeInTheDocument());
    // My Task scope = Alpha (now completed) + Gamma (completed).
    await waitFor(() => expect(metric("Completed Task")).toHaveTextContent("2"));
  });

  it("matches the signed-off card: status badge opens the menu; no reminder or created-on row (C13)", async () => {
    render(<ActivityWorkspace config={makeConfig()} />);
    await waitFor(() => expect(cards()).toHaveLength(2));
    const card = cards()[0]!;
    const status = within(card).getByRole("button", { name: "Status: In-progress" });
    expect(within(status).getByText("In-progress")).toHaveClass("fx-badge");
    expect(within(card).queryByText("Reminder:")).not.toBeInTheDocument();
    expect(within(card).queryByText("Created on:")).not.toBeInTheDocument();
  });

  it("header and insights tools without an action render inactive with a reason", async () => {
    const config = makeConfig();
    config.headerTools = [{ id: "tips", label: "Tips", icon: <svg />, variant: "info", pendingReason: "Not yet defined (Q40)" }];
    config.workspaceMenuPendingReason = "Not yet defined (Q9)";
    config.insights = { ...config.insights!, tools: [{ id: "lock", label: "Lock insights", icon: <svg />, pendingReason: "Not yet defined (Q13)" }] };
    render(<ActivityWorkspace config={config} />);
    for (const [name, reason] of [["Tips", "Q40"], ["Task actions", "Q9"], ["Lock insights", "Q13"]] as const) {
      const btn = screen.getByRole("button", { name });
      expect(btn).toHaveAttribute("aria-disabled", "true");
      await userEvent.hover(btn);
      expect(screen.getByRole("tooltip")).toHaveTextContent(reason);
      await userEvent.unhover(btn);
    }
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("kebab: Duplicate adds a copy, Mark as completed completes, Delete asks first", async () => {
    render(<ActivityWorkspace config={makeConfig()} />);
    await waitFor(() => expect(cards()).toHaveLength(2));
    await userEvent.click(screen.getByRole("button", { name: "Task actions: Alpha pricing" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    await waitFor(() => expect(cards()).toHaveLength(3));

    // Gamma is already completed, so "Mark as completed" is not offered.
    await userEvent.click(screen.getByRole("button", { name: "Task actions: Gamma docs" }));
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Mark as completed" })).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");

    await userEvent.click(screen.getAllByRole("button", { name: "Task actions: Alpha pricing" })[0]!);
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    const confirm = screen.getByRole("alertdialog", { name: "Delete this task?" });
    await userEvent.click(within(confirm).getByRole("button", { name: "Cancel" }));
    expect(cards()).toHaveLength(3);
    await userEvent.click(screen.getAllByRole("button", { name: "Task actions: Alpha pricing" })[0]!);
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(cards()).toHaveLength(2));
  });

  it("controls the permission check denies are not rendered", async () => {
    const can: PermissionCheck = (action) => !["delete", "create", "changeStatus", "followUp"].includes(action);
    render(<ActivityWorkspace config={makeConfig({ can })} />);
    await waitFor(() => expect(cards()).toHaveLength(2));
    expect(screen.queryByRole("button", { name: "Add Task" })).not.toBeInTheDocument();
    expect(within(cards()[0]!).queryByRole("button", { name: /^Status/ })).not.toBeInTheDocument();
    expect(within(cards()[0]!).queryByRole("button", { name: "Follow Up" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Task actions: Alpha pricing" }));
    expect(screen.queryByRole("menuitem", { name: "Delete" })).not.toBeInTheDocument();
  });
});

describe("ActivityWorkspace — create, validate, edit (AC5, AC6, AC7, AC11)", () => {
  it("blocks save with inline errors, then saves and adds the task to the list", async () => {
    render(<ActivityWorkspace config={makeConfig()} />);
    await waitFor(() => expect(cards()).toHaveLength(2));
    await userEvent.click(screen.getByRole("button", { name: "Add Task" }));
    const dialog = screen.getByRole("dialog", { name: "Add Task" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(within(dialog).getByText("Task Name is required.")).toBeInTheDocument();
    expect(within(dialog).getByText("Assign To is required.")).toBeInTheDocument();
    expect(within(dialog).getByText("Description is required.")).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: /Task Name/ })).toHaveFocus();

    await userEvent.type(within(dialog).getByRole("textbox", { name: /Task Name/ }), "New task");
    await userEvent.click(within(dialog).getByRole("combobox", { name: /Assign To/ }));
    await userEvent.click(within(dialog).getByRole("option", { name: "John Smith" }));
    await userEvent.click(within(dialog).getByRole("option", { name: "Jane Doe" }));
    expect(within(dialog).getByRole("button", { name: "Remove Jane Doe" })).toBeInTheDocument();
    await userEvent.type(within(dialog).getByRole("textbox", { name: /Description/ }), "Do it");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(cards()).toHaveLength(3));
    expect(cards()[0]).toHaveTextContent("Task: New task");
  });

  it("Clear fields empties the form", async () => {
    render(<ActivityWorkspace config={makeConfig()} />);
    await userEvent.click(await screen.findByRole("button", { name: "Add Task" }));
    const name = screen.getByRole("textbox", { name: /Task Name/ });
    await userEvent.type(name, "Draft");
    await userEvent.click(screen.getByRole("button", { name: "Clear fields" }));
    expect(name).toHaveValue("");
  });

  it("Edit opens pre-filled and saves changes to the card", async () => {
    render(<ActivityWorkspace config={makeConfig()} />);
    await waitFor(() => expect(cards()).toHaveLength(2));
    await userEvent.click(screen.getByRole("button", { name: "Task actions: Alpha pricing" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    const dialog = screen.getByRole("dialog", { name: "Edit Task" });
    const name = within(dialog).getByRole("textbox", { name: /Task Name/ });
    expect(name).toHaveValue("Alpha pricing");
    expect(within(dialog).getByRole("button", { name: "Remove John Smith" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Clear fields" })).not.toBeInTheDocument();
    await userEvent.clear(name);
    await userEvent.type(name, "Alpha pricing v2");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(cards()[0]).toHaveTextContent("Task: Alpha pricing v2"));
  });

  it("validate(): required and unparseable dates only", () => {
    const fields = [
      { name: "a", label: "A", type: "text" as const, required: true },
      { name: "d", label: "D", type: "datetime" as const },
      { name: "t", label: "T", type: "time" as const },
    ];
    const msgs = { requiredMessage: (l: string) => `${l}!`, invalidDateMessage: "bad" };
    expect(validate(fields, { a: "", d: "", t: "" }, msgs)).toEqual({ a: "A!" });
    expect(validate(fields, { a: "x", d: "not a date", t: "25:00" }, msgs)).toEqual({ d: "bad", t: "bad" });
    expect(validate(fields, { a: "x", d: "2026-03-12T10:00", t: "09:30" }, msgs)).toEqual({});
  });
});

describe("ActivityWorkspace — follow-ups and comments (AC15, AC16)", () => {
  it("Add Follow-up attaches a follow-up to the task", async () => {
    render(<ActivityWorkspace config={makeConfig()} />);
    await waitFor(() => expect(cards()).toHaveLength(2));
    await userEvent.click(within(cards()[0]!).getByRole("button", { name: "Follow Up" }));
    const dialog = screen.getByRole("dialog", { name: "Add Follow-up" });
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Description" }), "Call back");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(within(cards()[0]!).getByText(/Call back/)).toBeInTheDocument());
  });

  it("comments: empty state, add, sort control and card count badge", async () => {
    render(<ActivityWorkspace config={makeConfig()} />);
    await waitFor(() => expect(cards()).toHaveLength(2));
    const card = cards()[0]!;
    await userEvent.click(within(card).getByRole("button", { name: "Comments" }));
    expect(await within(card).findByText("No comments yet")).toBeInTheDocument();
    expect(within(card).getByRole("combobox", { name: "Sort comments" })).toHaveValue("recent");
    await userEvent.type(within(card).getByRole("textbox", { name: "Add a comment" }), "First!");
    await userEvent.click(within(card).getByRole("button", { name: "Comment" }));
    expect(await within(cards()[0]!).findByText("First!")).toBeInTheDocument();
    await waitFor(() => expect(within(cards()[0]!).getByRole("button", { name: "Comments (1)" })).toBeInTheDocument());
  });
});

describe("ActivityWorkspace — states", () => {
  it("empty scope shows the empty state with Add Task", async () => {
    render(<ActivityWorkspace config={makeConfig({ records: [] })} />);
    expect(await screen.findByRole("heading", { name: "No tasks yet" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Add Task" })).toHaveLength(2);
  });

  it("load failure shows the error state and Retry recovers", async () => {
    const good = makeConfig().dataAdapter;
    let fail = true;
    const adapter: ActivityDataAdapter = { ...good, list: (q) => (fail ? Promise.reject(new Error("offline")) : good.list(q)) };
    render(<ActivityWorkspace config={makeConfig({ adapter })} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load tasks");
    expect(metric("Total Task")).toHaveTextContent("—");
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(cards()).toHaveLength(2));
  });
});
