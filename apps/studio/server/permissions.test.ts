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
const designer = { name: "D", role: "Product Designer" };
const pm = { name: "P", role: "Product Manager" };
const reviewer = { name: "R", role: "UI Code Reviewer" };

describe("permissions", () => {
  it("only configured approvers can decide a gate", () => {
    expect(canDecide(designer, "IN-REVIEW", cfg)).toBe(true);
    expect(canDecide(pm, "IN-REVIEW", cfg)).toBe(false);
    expect(canDecide(designer, "CODE-REVIEW", cfg)).toBe(false);
    expect(canDecide(reviewer, "CODE-REVIEW", cfg)).toBe(true);
  });
  it("nobody can decide a status that is not a review gate", () => {
    expect(canDecide(designer, "APPROVED", cfg)).toBe(false);
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
});
