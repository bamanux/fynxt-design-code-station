import type { BadgeStatus, SideNavItem } from "@fynxt/ui";
import type { ReactNode } from "react";

/**
 * Activity Workspace — DRAFT candidate template from DCF-0001 (CRM Tasks).
 * A collection workspace (view tabs › insights › filter bar › expandable activity cards) with
 * create/edit and follow-up dialogs rendered from a form schema. No FYNXT-TPL id until approved.
 *
 * Business rules are NOT encoded here. Everything product-specific (labels, option sets, copy,
 * permissions, data) is configuration or comes from the data adapter.
 */

export interface Option {
  value: string;
  label: string;
}

export interface Association {
  id: string;
  label: string;
  /** Object type, e.g. "Deal", "Contact" (I1 AC10, AC19). */
  type: string;
}

export interface FollowUp {
  id: string;
  date: string;
  time: string;
  description: string;
}

export interface Attachment {
  id: string;
  name: string;
}

export interface ActivityRecord {
  id: string;
  /** e.g. "Task", "Follow-up" — the card title prefix (I1 AC4). */
  activityType: string;
  title: string;
  description: string;
  priority?: string;
  tags: string[];
  /** Local date-time "YYYY-MM-DDTHH:mm". */
  scheduledAt?: string;
  reminder?: string;
  status: string;
  /** User ids. One or more (I1 AC7). */
  assignees: string[];
  associations: Association[];
  attachments: Attachment[];
  followUps: FollowUp[];
  commentCount: number;
  createdBy: string;
  /** ISO date-time. */
  createdAt: string;
}

/** Fields the record form can edit. */
export type ActivityInput = Pick<
  ActivityRecord,
  "title" | "description" | "priority" | "tags" | "scheduledAt" | "reminder" | "assignees" | "associations"
> & { activityType?: string };

export interface Comment {
  id: string;
  author: string;
  /** ISO date-time. */
  createdAt: string;
  text: string;
}

export interface ListQuery {
  view: string;
  search: string;
  /** Active filters by filter id. The adapter must combine them with AND (I1 AC3 / BR3). */
  filters: Record<string, string>;
}

/** DEVELOPER INTEGRATION REQUIREMENT: the template never fetches or computes business data itself. */
export interface ActivityDataAdapter {
  list(query: ListQuery): Promise<ActivityRecord[]>;
  /** Metric id → value for the active view. Metric definitions are the adapter's (DCF-0001 Q8). */
  insights(view: string): Promise<Record<string, number>>;
  users(): Promise<Option[]>;
  associable(): Promise<Association[]>;
  create(input: ActivityInput): Promise<ActivityRecord>;
  update(id: string, input: ActivityInput): Promise<ActivityRecord>;
  duplicate(id: string): Promise<ActivityRecord>;
  remove(id: string): Promise<void>;
  setStatus(id: string, status: string): Promise<ActivityRecord>;
  setReminder(id: string, reminder: string): Promise<ActivityRecord>;
  addFollowUp(id: string, followUp: Omit<FollowUp, "id">): Promise<ActivityRecord>;
  comments(id: string): Promise<Comment[]>;
  addComment(id: string, text: string): Promise<Comment>;
}

export type ActivityAction =
  | "create"
  | "edit"
  | "duplicate"
  | "complete"
  | "delete"
  | "changeStatus"
  | "changeReminder"
  | "followUp"
  | "comment";

/**
 * REQUIRED. Permission rules come from the product (DCF-0001 Q5), never from the template.
 * Controls for disallowed actions are not rendered.
 */
export type PermissionCheck = (action: ActivityAction, record?: ActivityRecord) => boolean;

export type FormFieldType = "text" | "textarea" | "users" | "datetime" | "date" | "time" | "select" | "tags" | "associations";

export interface FormField {
  /** For the record form: an ActivityInput key. For the follow-up form: date | time | description. */
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  /** For select / tags. */
  options?: Option[];
  placeholder?: string;
  /** Half-width field (pairs with the next half field). */
  half?: boolean;
}

export interface FormConfig {
  addTitle: string;
  editTitle?: string;
  submitLabel: string;
  cancelLabel: string;
  /** "Clear fields" (I1 AC5). Omit to hide. */
  clearLabel?: string;
  fields: FormField[];
  /** Inline validation copy (DCF-0001 Q23). */
  requiredMessage: (label: string) => string;
  invalidDateMessage: string;
  size?: "small" | "medium" | "large";
  /** Minimize / full-size controls (Form Modal window actions). */
  windowActions?: boolean;
}

export interface StateCopy {
  loading: string;
  emptyTitle: string;
  emptyDescription: string;
  noResultsTitle: string;
  noResultsDescription: string;
  errorTitle: string;
  errorDescription: string;
  retry: string;
  clearAll: string;
}

export interface ShellConfig {
  title: string;
  nav: SideNavItem[];
  activeNavId: string;
  logo: string;
  logoMark: string;
  userName: string;
  /** Unread notification count for the header bell. */
  notifications?: number;
  language?: string;
}

/**
 * A header/panel tool button. Without `onSelect` it renders exactly as designed but inactive
 * (aria-disabled + tooltip `pendingReason`), for controls whose behaviour is not yet defined.
 */
export interface ToolAction {
  id: string;
  label: string;
  icon: ReactNode;
  variant?: "secondary" | "ghost" | "info";
  onSelect?: () => void;
  pendingReason?: string;
}

export interface ActivityWorkspaceConfig {
  entity: { singular: string; plural: string };
  /** Optional application frame (DCF-0001 D2–D4 candidate App Shell). */
  shell?: ShellConfig;
  /** List-scope tabs, e.g. My Task / My Team's Task (I1 AC1). */
  views: { id: string; label: string }[];
  primaryActionLabel: string;
  /** Header tools after the primary action (approved frame: lightbulb). */
  headerTools?: ToolAction[];
  /** Shown as an inactive kebab when `workspaceActions` is empty and this is set (Q9). */
  workspaceMenuPendingReason?: string;
  /** Workspace kebab items (I1 AC1). Items are TBD (Q9); the kebab only renders when provided. */
  workspaceActions?: { id: string; label: string; onSelect: () => void }[];
  /** Dismissible informational banner (I1 AC1). */
  banner?: { title: string; message: string };
  insights?: {
    title: string;
    metrics: { id: string; label: string; help?: string }[];
    /** Panel tools before the collapse toggle (approved frame: lock, settings — Q13). */
    tools?: ToolAction[];
  };
  search: { label: string; placeholder: string };
  /** Filter chips; combined with AND by the adapter (I1 AC3). */
  filters: { id: string; label: string; options: Option[] }[];
  /** Filters offered by the add-filter control (Q14). Empty = control shown disabled. */
  additionalFilters?: { id: string; label: string; options: Option[] }[];
  /** Status options with the Badge colour used on cards (colour mapping is a design decision, Q6). */
  statuses: (Option & { badge?: BadgeStatus })[];
  /** Status value set by "Mark as completed" (I1 AC12). */
  completedStatus: string;
  reminders: Option[];
  /** Priority value → label and Badge status (colour mapping is a design decision, Q29). */
  priorities: (Option & { badge: BadgeStatus })[];
  /** Descriptions longer than this get a "Show more" toggle (I1 AC4). */
  descriptionClamp: number;
  labels: {
    actions: string;
    edit: string;
    duplicate: string;
    complete: string;
    delete: string;
    deleteTitle: string;
    deleteMessage: string;
    scheduledOn: string;
    description: string;
    associations: string;
    addAssociation: string;
    assignedTo: string;
    status: string;
    reminder: string;
    noReminder: string;
    attachments: string;
    followUps: string;
    addFollowUp: string;
    createdBy: string;
    createdOn: string;
    comments: string;
    addComment: string;
    commentAction: string;
    noComments: string;
    sortRecent: string;
    sortOldest: string;
    showMore: string;
    showLess: string;
    addFilter: string;
    /** Filter option that clears the filter. */
    all: string;
    dismiss: string;
    collapse: string;
    expand: string;
  };
  states: StateCopy;
  recordForm: FormConfig;
  followUpForm: FormConfig;
  /** Formats a stored date-time for display. */
  formatDateTime: (value: string) => string;
  permissionCheck: PermissionCheck;
  dataAdapter: ActivityDataAdapter;
}
