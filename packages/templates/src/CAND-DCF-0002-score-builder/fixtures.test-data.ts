import type { ConditionFieldType, ConditionObject, ConditionOperator } from "@fynxt/ui";
import type { ScoreModel } from "./types";

/** Test fixtures (fictional sample data from I3). */
export const schema: ConditionObject[] = [
  {
    id: "contact",
    label: "Contact",
    fields: [
      { id: "country", label: "Country", type: "list", options: [{ value: "in", label: "India" }, { value: "cn", label: "China" }, { value: "us", label: "USA" }] },
      { id: "occupation", label: "Occupation", type: "list", options: [{ value: "salaried", label: "Salaried" }, { value: "student", label: "Student" }] },
      { id: "income", label: "Income", type: "number" },
      { id: "type", label: "User Type", type: "list", options: [{ value: "contact", label: "Contact" }] },
    ],
  },
  { id: "deal", label: "Deal", fields: [{ id: "approval", label: "Approval status", type: "list", options: [{ value: "approved", label: "Approved" }, { value: "pending", label: "Pending" }] }] },
];

export const operatorsByType: Record<ConditionFieldType, ConditionOperator[]> = {
  list: [
    { id: "is", label: "is", valueShape: "single" },
    { id: "in", label: "is any of", valueShape: "multi" },
  ],
  number: [{ id: "gt", label: "greater than", valueShape: "single" }],
  date: [{ id: "before", label: "before", valueShape: "single" }],
  text: [{ id: "contains", label: "contains", valueShape: "single" }],
};

export const completeModel = (over: Partial<ScoreModel> = {}): ScoreModel => ({
  id: "m2001",
  code: "2001",
  name: "Client Risk Score",
  description: "Contact risk for traders",
  status: "active",
  method: "weighted",
  appliesTo: { match: "all", items: [{ kind: "rule", id: "r1", object: "contact", field: "type", condition: "is", value: "contact" }] },
  objects: [
    {
      id: "g1",
      object: "contact",
      logic: "and",
      attributes: [
        { id: "a1", field: "country", weight: "60", values: [{ id: "v1", category: "Low", values: ["in"], from: "", to: "", score: "10" }] },
        { id: "a2", field: "occupation", weight: "40", values: [{ id: "v2", category: "High", values: ["student"], from: "", to: "", score: "90" }] },
      ],
    },
  ],
  connectors: [],
  bands: [
    { id: "b1", upTo: "55", label: "Low Risk", description: "Standard due diligence." },
    { id: "b2", upTo: "", label: "High Risk", description: "" },
  ],
  overrides: [],
  updatedAt: "2026-10-15",
  updatedBy: "A. Bansal",
  ...over,
});
