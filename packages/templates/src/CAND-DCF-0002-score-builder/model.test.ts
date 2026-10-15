import { bandProblem, collectIssues, distribute, wordCount } from "./model";
import { defaultDuplicateName } from "./memoryAdapter";
import { completeModel, operatorsByType, schema } from "./fixtures.test-data";
import type { ScoreModelInput } from "./types";

const opts = { weightTotal: 100, descriptionMaxWords: 250 };
const issuesOf = (input: ScoreModelInput) => collectIssues(input, schema, operatorsByType, opts).map((i) => i.id);

describe("Score Builder model helpers (DCF-0002)", () => {
  it("distributes weights as whole numbers that add up (Q36 proposal)", () => {
    expect(distribute(100, 3)).toEqual([34, 33, 33]);
    expect(distribute(100, 4)).toEqual([25, 25, 25, 25]);
    expect(distribute(100, 0)).toEqual([]);
  });

  it("checks bands are in order with only the last open (R26)", () => {
    expect(bandProblem(completeModel().bands)).toBeNull();
    expect(bandProblem([])).toBe("Add at least one outcome band");
    expect(bandProblem([{ id: "a", upTo: "", label: "Low", description: "" }, { id: "b", upTo: "", label: "High", description: "" }])).toMatch(/Set where “Low” ends/);
    expect(bandProblem([{ id: "a", upTo: "55", label: "Low", description: "" }, { id: "b", upTo: "50", label: "Medium", description: "" }, { id: "c", upTo: "", label: "High", description: "" }])).toMatch(/^Bands overlap/);
  });

  it("finds no issues in a complete model", () => {
    expect(issuesOf(completeModel())).toEqual([]);
  });

  it("flags an empty model", () => {
    const ids = issuesOf({ name: "", description: "", method: "weighted", appliesTo: { match: "all", items: [] }, objects: [], connectors: [], bands: [], overrides: [] });
    expect(ids).toEqual(expect.arrayContaining(["name", "objects", "bands"]));
  });

  it("flags weights that don't total 100, unset logic and connectors", () => {
    const m = completeModel();
    m.objects[0]!.attributes[0]!.weight = "50";
    m.objects[0]!.logic = null;
    m.objects.push({ id: "g2", object: "deal", logic: null, attributes: [] });
    m.connectors = [null];
    const ids = issuesOf(m);
    expect(ids).toEqual(expect.arrayContaining(["total-g1", "logic-g1", "connector-g2", "empty-g2"]));
  });

  it("flags incomplete value rows, long band descriptions and incomplete overrides", () => {
    const m = completeModel();
    m.objects[0]!.attributes[1]!.values[0]!.score = "";
    m.bands[0]!.description = "word ".repeat(251);
    m.overrides = [{ id: "o1", objectId: "g1", conditions: { match: "all", items: [] }, outcome: { type: "forceBand", value: "" } }];
    expect(issuesOf(m)).toEqual(expect.arrayContaining(["rows-a2", "band-desc-b1", "override-o1"]));
  });

  it("counts words", () => {
    expect(wordCount("  Standard due   diligence. ")).toBe(3);
    expect(wordCount("")).toBe(0);
  });

  it("names copies <Name>_copy(n) (Q67)", () => {
    expect(defaultDuplicateName("Client Risk Score", [])).toBe("Client Risk Score_copy(1)");
    expect(defaultDuplicateName("Client Risk Score", ["Client Risk Score_copy(1)"])).toBe("Client Risk Score_copy(2)");
    expect(defaultDuplicateName("Client Risk Score_copy(1)", ["Client Risk Score_copy(1)"])).toBe("Client Risk Score_copy(2)");
  });
});
