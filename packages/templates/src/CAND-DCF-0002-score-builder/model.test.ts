import { BAND_FIELD, CATEGORY_FIELD, bandProblem, collectIssues, conditionSchema, conditionsText, distribute, overrideHint, wordCount } from "./model";
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

  describe("rev 6 conditions on categories and bands (D33 / D35)", () => {
    const cfg = {
      categories: ["Low", "Medium", "High"],
      categoryOperators: [{ id: "is", label: "is", valueShape: "single" as const }, { id: "any_of", label: "is any of", valueShape: "multi" as const }],
      bandOperators: [{ id: "reaches", label: "reaches", valueShape: "single" as const }],
    };
    const full = { ...opts, ...cfg };
    const rule = (field: string, condition: string, value: string) => ({ match: "all" as const, items: [{ kind: "rule" as const, id: "c1", object: "contact", field, condition, value }] });

    it("adds each attribute's category and the object's band to the condition fields", () => {
      const contact = conditionSchema(schema, completeModel(), cfg).find((o) => o.id === "contact")!;
      const extra = contact.fields.filter((f) => "group" in f);
      expect(extra.map((f) => f.label)).toEqual(["Country category", "Occupation category", "Contact band"]);
      expect(conditionSchema(schema, completeModel(), cfg).find((o) => o.id === "deal")!.fields.some((f) => f.id === BAND_FIELD)).toBe(false);
    });

    it("reads category and band rules as sentences", () => {
      const cs = conditionSchema(schema, completeModel(), cfg);
      expect(conditionsText(rule(CATEGORY_FIELD("country"), "is", "High"), cs, operatorsByType, "sentence")).toBe("Country category is High");
      expect(conditionsText(rule(BAND_FIELD, "reaches", "b2"), cs, operatorsByType, "sentence")).toBe("Contact band reaches High Risk");
    });

    it("accepts a complete Raise rule and rejects one whose band was deleted", () => {
      const raise = completeModel({ overrides: [{ id: "o1", objectId: "g1", attributeId: "a1", conditions: rule(CATEGORY_FIELD("country"), "is", "Low"), outcome: { type: "raise", value: "" } }] });
      expect(collectIssues(raise, schema, operatorsByType, full)).toEqual([]);
      const gone = completeModel({ overrides: [{ id: "o1", objectId: "g1", conditions: rule(BAND_FIELD, "reaches", "b9"), outcome: { type: "atLeastBand", value: "b2" } }] });
      expect(collectIssues(gone, schema, operatorsByType, full).map((i) => i.id)).toEqual(["override-o1"]);
    });

    it("hints which values a category covers, or that the rule never triggers", () => {
      const m = completeModel();
      const o = (value: string, type: "raise" | "forceBand") => ({ id: "o1", objectId: "g1", attributeId: "a1", conditions: rule(CATEGORY_FIELD("country"), "is", value), outcome: { type, value: "" } });
      expect(overrideHint(o("Low", "raise"), m, schema)).toEqual({ status: "success", text: "Contact takes Country's score when it is higher · Low = India (10)" });
      expect(overrideHint(o("High", "raise"), m, schema)).toEqual({ status: "warning", text: "No Country value is in High yet, so this rule never triggers" });
      const band = { id: "o2", objectId: "g1", conditions: rule(BAND_FIELD, "reaches", "b9"), outcome: { type: "raise" as const, value: "" } };
      expect(overrideHint(band, m, schema)?.status).toBe("error");
    });
  });
});
