import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Point the server at throw-away engine and station folders.
const roots = vi.hoisted(() => {
  const { mkdtempSync } = require("node:fs") as typeof import("node:fs");
  const { tmpdir } = require("node:os") as typeof import("node:os");
  const { join } = require("node:path") as typeof import("node:path");
  return { engine: mkdtempSync(join(tmpdir(), "fdi-engine-")), station: mkdtempSync(join(tmpdir(), "fdi-station-")) };
});
vi.mock("./env", () => ({
  env: { stationRoot: roots.station, enginePath: roots.engine, model: "test", maxBudgetUsd: 1, port: 0, authMode: "local", hasApiKey: false },
  stationRoot: roots.station,
  fdiConfig: () => ({ approvers: { caseFile: [], design: [], code: [] }, studio: { status: "", roles: [], permissions: { submitRequest: "*", comment: "*", decide: {}, runStage: {} }, headlessRuns: { figma: "", bashAllowlist: [] } } }),
}));

import { createRequest, listCases } from "./cases";
import { galleryEntries } from "./library";

beforeAll(() => {
  const caseDir = join(roots.engine, "design-cases", "DCF-0003-object-enrolment");
  mkdirSync(caseDir, { recursive: true });
  writeFileSync(join(caseDir, "case-file.md"), "---\nid: DCF-0003\ntitle: Incentive Programs\nstatus: CODE-REVIEW\nrevision: 1\n---\n\n# DCF-0003\n");
  const gallery = join(roots.station, "apps/studio/gallery");
  mkdirSync(gallery, { recursive: true });
  writeFileSync(join(gallery, "menu.json"), JSON.stringify({ modules: [] }));
  writeFileSync(
    join(gallery, "pages.json"),
    JSON.stringify({ pages: [{ id: "crm.operations.incentive-programs", label: "Incentive Programs", module: "CRM", section: "Operations", caseId: "DCF-0003", template: "CAND-DCF-0003-incentive-programs" }] })
  );
});

describe("gallery entries", () => {
  it("lists registered pages with their case status", async () => {
    const [entry] = await galleryEntries();
    expect(entry).toMatchObject({ id: "crm.operations.incentive-programs", published: false, caseId: "DCF-0003", caseStatus: "CODE-REVIEW" });
  });
});

describe("change requests from the gallery", () => {
  it("records the page and its source case on the new case", async () => {
    const created = await createRequest(
      {
        title: "Change to Incentive Programs",
        module: "CRM › Operations",
        description: "Add an end date to programs.",
        links: [],
        files: [],
        changeOf: { pageId: "crm.operations.incentive-programs", pageLabel: "Incentive Programs", caseId: "DCF-0003", template: "CAND-DCF-0003-incentive-programs", caseFolder: "DCF-0003-object-enrolment" },
      },
      { name: "Priya", role: "Product Manager" }
    );
    expect(created.id).toBe("DCF-0004");
    const request = readFileSync(join(created.dir, "inputs/request.md"), "utf8");
    expect(request).toContain("## Change to an existing page");
    expect(request).toContain("design-cases/DCF-0003-object-enrolment/case-file.md");
    const summary = (await listCases()).find((c) => c.id === "DCF-0004");
    expect(summary?.changeOf).toEqual({ pageId: "crm.operations.incentive-programs", pageLabel: "Incentive Programs", caseId: "DCF-0003", template: "CAND-DCF-0003-incentive-programs" });
  });
});
