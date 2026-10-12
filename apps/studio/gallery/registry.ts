import type { ComponentType } from "react";

/**
 * Page id (from menu.json) → lazy loader for the configured page.
 * FDI adds one line per published page, e.g.
 *   "crm.leads.list": () => import("./pages/crm/leads-list.page"),
 * where the page file renders a template from @fynxt/templates with its config.
 */
export const pages: Record<string, () => Promise<{ default: ComponentType }>> = {};
