import type { ComponentType } from "react";

/**
 * Page id (from menu.json) → lazy loader for the configured page.
 * FDI adds one line per published page, e.g.
 *   "crm.leads.list": () => import("./pages/crm/leads-list.page"),
 * where the page file renders a template from @fynxt/templates with its config.
 * The menu.json entry is written at /fdi-publish (agent/fdi/README.md §8).
 */
export const pages: Record<string, () => Promise<{ default: ComponentType }>> = {
  // DCF-0001 (CODE-IN-PROGRESS): registered for review; menu entry added on publish.
  "crm.tickets-activities.tasks": () => import("./pages/crm/tasks.page"),
  // DCF-0003 (CODE-IN-PROGRESS): registered for review; menu entry added on publish.
  "crm.operations.incentive-programs": () => import("./pages/crm/incentive-programs.page"),
};
