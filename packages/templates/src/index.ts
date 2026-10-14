/**
 * Template registry. FDI adds an export per template once it is approved into the Station,
 * e.g. `export { TableList } from "./FYNXT-TPL-LIST-002";`. Pages never import a template
 * by path — always from "@fynxt/templates".
 *
 * DRAFT candidates (no FYNXT-TPL id until registered at /fdi-publish) are listed separately.
 */
export const TEMPLATE_IDS: readonly string[] = [];

export const CANDIDATE_IDS: readonly string[] = ["CAND-DCF-0001-activity-workspace", "CAND-DCF-0003-incentive-programs"];
export * from "./CAND-DCF-0001-activity-workspace";
export * from "./CAND-DCF-0003-incentive-programs";
