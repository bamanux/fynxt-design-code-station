/**
 * DCF-0001 · CRM Tasks — page configuration for the Activity Workspace candidate template.
 * Configuration only (station contract invariant 3). Case file:
 * fynxt-product-experience-engine/design-cases/DCF-0001-crm-tasks/case-file.md
 *
 * Every value marked "TBD (Qn)" is an open question in the case file, not a decided rule.
 * The data adapter is the gallery's in-memory DEMO; production supplies the real API (Q24).
 */
import { createMemoryAdapter, type ActivityRecord, type ActivityWorkspaceConfig } from "@fynxt/templates";
import { BarChart3, ClipboardList, Home, IdCard, Ticket } from "lucide-react";

const users = [
  { value: "u1", label: "John Smith" },
  { value: "u2", label: "Jane Doe" },
  { value: "u3", label: "Asha Kumar" },
];

const associable = [
  { id: "d1", label: "Deal name 1", type: "Deal" },
  { id: "c1", label: "Maya Sinclair", type: "Contact" },
  { id: "l1", label: "Acme Corp", type: "Lead" },
];

// Sample records mirror the approved Figma frames (version 2409447955195877898).
const records: ActivityRecord[] = [
  {
    id: "t1",
    activityType: "Task",
    title: "Prepare revised pricing proposal",
    description: "Share the revised pricing with the client and confirm the discount approval with the sales manager before the renewal call.",
    priority: "medium",
    tags: ["Pricing"],
    scheduledAt: "2026-03-12T10:00",
    reminder: "1h",
    status: "in-progress",
    assignees: ["u1"],
    associations: [associable[0]!],
    attachments: [],
    followUps: [],
    commentCount: 2,
    createdBy: "Admin",
    createdAt: "2026-03-01T09:30:00.000Z",
  },
  {
    id: "t2",
    activityType: "Follow-up",
    title: "Call Acme Corp about renewal",
    description: "Confirm the renewal date.",
    priority: "high",
    tags: ["Renewal"],
    scheduledAt: "2026-03-13T14:30",
    status: "upcoming",
    assignees: ["u1", "u2"],
    associations: [associable[2]!],
    attachments: [],
    followUps: [],
    commentCount: 0,
    createdBy: "Asha Kumar",
    createdAt: "2026-03-02T11:00:00.000Z",
  },
  {
    id: "t3",
    activityType: "Task",
    title: "Send onboarding documents",
    description: "Email the onboarding pack.",
    priority: "low",
    tags: ["Onboarding"],
    scheduledAt: "2026-03-14T09:00",
    status: "upcoming",
    assignees: ["u3"],
    associations: [],
    attachments: [],
    followUps: [],
    commentCount: 0,
    createdBy: "Admin",
    createdAt: "2026-03-03T08:00:00.000Z",
  },
  {
    id: "t4",
    activityType: "Task",
    title: "Review contract redlines",
    description: "Review legal's comments.",
    priority: "medium",
    tags: ["Legal"],
    scheduledAt: "2026-03-10T16:00",
    status: "overdue",
    assignees: ["u1"],
    associations: [associable[1]!],
    attachments: [],
    followUps: [],
    commentCount: 0,
    createdBy: "Jane Doe",
    createdAt: "2026-02-27T15:00:00.000Z",
  },
];

// I1 AC13 example status set. "Pending" (AC2) vs "Upcoming" (AC13) is unresolved (C1/Q6);
// whether Overdue is selectable or derived is unresolved (C2/Q7).
const statuses = [
  { value: "upcoming", label: "Upcoming" },
  { value: "in-progress", label: "In-progress" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
];

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });

export const tasksConfig: ActivityWorkspaceConfig = {
  entity: { singular: "Task", plural: "Tasks" },
  shell: {
    title: "Tasks",
    // Menu per live product (I2/I3, D3). Tasks under Tickets & Activities (Q39).
    nav: [
      { id: "dashboard", label: "Dashboard", icon: <Home />, children: [{ id: "exec", label: "Executive Dashboard" }, { id: "sales-dash", label: "Sales Dashboard" }] },
      {
        id: "sales",
        label: "Sales",
        icon: <ClipboardList />,
        children: ["Lead", "Deal", "Contact", "Company", "Account", "Lead Eligibility Criteria", "Campaigns"].map((l) => ({ id: l.toLowerCase().replace(/\W+/g, "-"), label: l })),
      },
      { id: "tickets", label: "Tickets & Activities", icon: <Ticket />, children: [{ id: "service", label: "Service Ticket" }, { id: "meeting", label: "Activity Meeting" }, { id: "tasks", label: "Tasks" }] },
      { id: "operations", label: "Operations", icon: <IdCard />, children: [{ id: "trading", label: "Trading Account" }, { id: "cash", label: "Cash Transactions" }, { id: "assess", label: "Assessment Attempts" }] },
      { id: "reports", label: "Reports", icon: <BarChart3 /> },
    ],
    activeNavId: "tasks",
    logo: "Tenant logo",
    logoMark: "T",
    userName: "Demo User",
    notifications: 1,
    language: "EN",
  },
  views: [
    { id: "mine", label: "My Task" },
    { id: "team", label: "My Team's Task" },
  ],
  primaryActionLabel: "Add Task",
  // workspaceActions: items TBD (Q9) — the kebab is not rendered until they are defined.
  banner: { title: "Automation is on for Tasks", message: "Banner copy TBD (Q10). Shown until dismissed; dismissal persistence TBD." },
  insights: {
    title: "Insights",
    metrics: [
      { id: "total", label: "Total Task", help: "Definition TBD (Q8)" },
      { id: "pending", label: "Pending Task", help: "Definition TBD (Q8)" },
      { id: "inProgress", label: "In-progress Task", help: "Definition TBD (Q8)" },
      { id: "overdue", label: "Overdue Task", help: "Definition TBD (Q8)" },
      { id: "completed", label: "Completed Task", help: "Definition TBD (Q8)" },
    ],
  },
  search: { label: "Search tasks", placeholder: "Search tasks…" },
  // I1 AC3 (approved with exception E3 / C11): Activity Type + Status.
  filters: [
    { id: "activityType", label: "Activity Type", options: [{ value: "Task", label: "Task" }, { value: "Follow-up", label: "Follow-up" }] },
    { id: "status", label: "Status", options: statuses },
  ],
  additionalFilters: [], // add-filter options TBD (Q14)
  statuses,
  completedStatus: "completed",
  reminders: [
    { value: "1h", label: "1 hour before" },
    { value: "30m", label: "30 mins before" },
  ], // I1 AC8 examples; full option set TBD (Q29)
  // Priority values beyond "Medium" and the colour mapping are TBD (Q29); this follows the Figma sample.
  priorities: [
    { value: "high", label: "High", badge: "error" },
    { value: "medium", label: "Medium", badge: "warning" },
    { value: "low", label: "Low", badge: "neutral" },
  ],
  descriptionClamp: 80,
  labels: {
    actions: "Task actions",
    edit: "Edit",
    duplicate: "Duplicate",
    complete: "Mark as completed",
    delete: "Delete",
    deleteTitle: "Delete this task?",
    deleteMessage: "Copy TBD (Q18): soft or hard delete, and whether undo exists.",
    scheduledOn: "Scheduled on:",
    description: "Description",
    associations: "Associations",
    addAssociation: "Add association",
    assignedTo: "Assigned to",
    status: "Status",
    reminder: "Reminder",
    noReminder: "No reminder",
    attachments: "Attachments",
    followUps: "Follow-ups",
    addFollowUp: "Follow Up",
    createdBy: "Created by:",
    createdOn: "Created on:",
    comments: "Comments",
    addComment: "Add a comment…",
    commentAction: "Comment",
    noComments: "No comments yet",
    sortRecent: "Most recent",
    sortOldest: "Oldest",
    showMore: "Show more",
    showLess: "Show less",
    addFilter: "Add filter",
    all: "All",
    dismiss: "Dismiss banner",
    collapse: "Collapse insights",
    expand: "Expand insights",
  },
  states: {
    loading: "Loading tasks… (copy TBD, Q23)",
    emptyTitle: "No tasks yet",
    emptyDescription: "Copy TBD (Q23). Create a task to plan and track your work.",
    noResultsTitle: "No tasks match your filters",
    noResultsDescription: "Copy TBD (Q23). Try a different search or clear the filters.",
    errorTitle: "We couldn't load your tasks",
    errorDescription: "Copy TBD (Q23). Check your connection and try again.",
    retry: "Retry",
    clearAll: "Clear all",
  },
  recordForm: {
    addTitle: "Add Task",
    editTitle: "Edit Task",
    submitLabel: "Save",
    cancelLabel: "Cancel",
    clearLabel: "Clear fields",
    windowActions: true, // minimized behaviour TBD (Q25)
    requiredMessage: (label) => `${label} is required. (copy TBD, Q23)`,
    invalidDateMessage: "Enter a valid date and time. (rule TBD, Q11)",
    fields: [
      { name: "title", label: "Task Name", type: "text", required: true, placeholder: "Enter task name" },
      { name: "assignees", label: "Assign To", type: "users", required: true, placeholder: "Search team members…" },
      { name: "scheduledAt", label: "Date & Time", type: "datetime", half: true },
      { name: "priority", label: "Priority", type: "select", placeholder: "Select priority", half: true, options: [{ value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }] },
      { name: "reminder", label: "Reminder", type: "select", placeholder: "Select reminder", half: true, options: [{ value: "1h", label: "1 hour before" }, { value: "30m", label: "30 mins before" }] },
      { name: "tags", label: "Tags", type: "tags", half: true, placeholder: "Select tags", options: ["Pricing", "Renewal", "Onboarding", "Legal"].map((t) => ({ value: t, label: t })) },
      // Rich text with @mentions is deferred (Q28); plain text until the editor is approved.
      { name: "description", label: "Description", type: "textarea", required: true, placeholder: "Describe the task" },
      { name: "associations", label: "Associations", type: "associations", placeholder: "Search records…" },
    ],
  },
  followUpForm: {
    addTitle: "Add Follow-up",
    submitLabel: "Add",
    cancelLabel: "Cancel",
    size: "small",
    requiredMessage: (label) => `${label} is required. (copy TBD, Q23)`,
    invalidDateMessage: "Enter a valid date or time. (rule TBD, Q11)",
    // Which follow-up fields are mandatory is TBD (Q12b).
    fields: [
      { name: "date", label: "Date", type: "date", half: true },
      { name: "time", label: "Time", type: "time", half: true },
      { name: "description", label: "Description", type: "textarea", placeholder: "Describe the follow-up" },
    ],
  },
  formatDateTime: (v) => dateFmt.format(new Date(v)),
  // DEMO ONLY: the permission model is undefined (Q5). Production must supply real rules.
  permissionCheck: () => true,
  dataAdapter: createMemoryAdapter({
    records,
    users,
    associable,
    comments: {
      t1: [
        { id: "c1", author: "John Smith", createdAt: "2026-03-12T10:42:00.000Z", text: "Client asked for the 3-year option as well." },
        { id: "c2", author: "Asha Kumar", createdAt: "2026-03-12T09:15:00.000Z", text: "Discount approval is pending with the sales manager." },
      ],
    },
    currentUser: "Demo User",
    latency: 300,
    // DEMO scope: "My Task" = assigned to the demo user (u1). Real scope rules TBD (Q4).
    inView: (view, r) => (view === "mine" ? r.assignees.includes("u1") : true),
    // DEMO metric definitions (Q8): counts by status; "Pending" mapped to Upcoming pending C1.
    metrics: (rs) => ({
      total: rs.length,
      pending: rs.filter((r) => r.status === "upcoming").length,
      inProgress: rs.filter((r) => r.status === "in-progress").length,
      overdue: rs.filter((r) => r.status === "overdue").length,
      completed: rs.filter((r) => r.status === "completed").length,
    }),
  }),
};
