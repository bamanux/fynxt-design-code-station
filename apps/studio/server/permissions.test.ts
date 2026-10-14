import type { FdiConfig } from "./env";
import { actionsFor, canDecide, canRun } from "./permissions";

const cfg: FdiConfig = {
  approvers: { caseFile: ["Product Designer"], design: ["Product Designer"], code: ["UI Code Reviewer"] },
  studio: {
    status: "test",
    roles: ["Product Designer", "UI Code Reviewer", "Product Manager"],
    permissions: {
      submitRequest: "*",
      comment: "*",
      decide: { "IN-REVIEW": "caseFile", "DESIGN-REVIEW": "design", "CODE-REVIEW": "code" },
      runStage: { revise: ["Product Designer"], figma: ["Product Designer"], build: ["Product Designer", "UI Code Reviewer"], publish: ["UI Code Reviewer"] },
    },
    headlessRuns: { figma: "disabled", bashAllowlist: [] },
  },
};
const person = (name: string, roles: string[]) => ({ email: `${name.toLowerCase()}@fynxt.com`, name, roles, isAdmin: false });
const designer = person("D", ["Product Designer"]);
const pm = person("P", ["Product Manager"]);
const reviewer = person("R", ["UI Code Reviewer"]);
const both = person("B", ["Product Designer", "UI Code Reviewer"]);

describe("permissions", () => {
  it("only configured approvers can decide a gate", () => {
    expect(canDecide(designer, "IN-REVIEW", undefined, cfg)).toBe(true);
    expect(canDecide(pm, "IN-REVIEW", undefined, cfg)).toBe(false);
    expect(canDecide(designer, "CODE-REVIEW", undefined, cfg)).toBe(false);
    expect(canDecide(reviewer, "CODE-REVIEW", undefined, cfg)).toBe(true);
  });
  it("nobody can decide a status that is not a review gate", () => {
    expect(canDecide(designer, "APPROVED", undefined, cfg)).toBe(false);
  });
  it("anyone can submit; stage runs are role-gated", () => {
    expect(canRun(pm, "intake", cfg)).toBe(true);
    expect(canRun(pm, "revise", cfg)).toBe(false);
    expect(canRun(reviewer, "publish", cfg)).toBe(true);
  });
  it("blocks headless Figma runs with a reason and hides decisions while busy", () => {
    const run = actionsFor(designer, "APPROVED", false, cfg).find((a) => a.kind === "run");
    expect(run).toMatchObject({ stage: "figma", available: false, reason: "disabled" });
    expect(actionsFor(designer, "IN-REVIEW", true, cfg)).toHaveLength(0);
  });
  it("a person with several roles gets the actions of each", () => {
    expect(canRun(both, "build", cfg)).toBe(true);
    expect(canDecide(both, "CODE-REVIEW", undefined, cfg)).toBe(true);
  });
  it("only the Product Designer can send built-page feedback back through every level", () => {
    const reopen = (u: typeof designer, status: "CODE-REVIEW" | "PUBLISHED") => actionsFor(u, status, false, cfg).find((a) => a.kind === "decide" && a.to === "CHANGES-REQUESTED");
    expect(reopen(designer, "CODE-REVIEW")).toBeDefined();
    expect(reopen(designer, "PUBLISHED")).toBeDefined();
    expect(reopen(reviewer, "CODE-REVIEW")).toBeUndefined();
    // The reviewer still gets the normal code decisions.
    expect(actionsFor(reviewer, "CODE-REVIEW", false, cfg).map((a) => a.kind === "decide" && a.to)).toEqual(["CODE-APPROVED", "CODE-CHANGES-REQUESTED"]);
  });
});
