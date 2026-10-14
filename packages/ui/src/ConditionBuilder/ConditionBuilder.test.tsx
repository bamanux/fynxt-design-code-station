import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ConditionBuilder, type ConditionBuilderProps } from "./ConditionBuilder";
import { isRuleComplete, summarize } from "./model";
import type { ConditionObject, ConditionValue } from "./types";

// Fixtures mirror the I1 Examples setup (R1–R4). Operators are illustrative (DCF-0003 Q4).
const OBJECTS: ConditionObject[] = [
  {
    id: "account",
    label: "Account",
    fields: [
      { id: "country", label: "Country", type: "list", options: [{ value: "GB", label: "United Kingdom" }, { value: "DE", label: "Germany" }] },
      { id: "status", label: "Account Status", type: "list", options: [{ value: "active", label: "Active" }] },
      { id: "type", label: "Account Type", type: "list", options: [{ value: "vip", label: "VIP" }] },
      { id: "created", label: "Created on", type: "date" },
    ],
  },
  { id: "ta", label: "Trading Account", fields: [{ id: "balance", label: "Balance", type: "number" }] },
];
const OPS: ConditionBuilderProps["operatorsByType"] = {
  list: [{ id: "is", label: "is", valueShape: "single" }, { id: "any_of", label: "is any of", valueShape: "multi" }, { id: "empty", label: "is empty", valueShape: "none" }],
  number: [{ id: "gt", label: "is greater than", valueShape: "single" }],
  date: [{ id: "after", label: "is after", valueShape: "single" }],
  text: [{ id: "contains", label: "contains", valueShape: "single" }],
};
const EXAMPLE: ConditionValue = {
  match: "all",
  items: [
    { kind: "rule", id: "r1", object: "account", field: "country", condition: "is", value: "GB" },
    { kind: "rule", id: "r2", object: "account", field: "status", condition: "is", value: "active" },
    {
      kind: "group",
      id: "g1",
      match: "any",
      rules: [
        { kind: "rule", id: "r3", object: "account", field: "type", condition: "is", value: "vip" },
        { kind: "rule", id: "r4", object: "ta", field: "balance", condition: "gt", value: "1000" },
      ],
    },
  ],
};

let seq = 0;
function Harness(props: Partial<ConditionBuilderProps> & { initial?: ConditionValue; spy?: (v: ConditionValue) => void }) {
  const { initial = EXAMPLE, spy, ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <ConditionBuilder
      objects={OBJECTS}
      operatorsByType={OPS}
      value={value}
      onChange={(v) => {
        setValue(v);
        spy?.(v);
      }}
      createId={() => `n${++seq}`}
      {...rest}
    />
  );
}

describe("ConditionBuilder (DCF-0003)", () => {
  it("renders top-level rules and a group with their own All / Any", () => {
    render(<Harness />);
    expect(screen.getByRole("combobox", { name: "Participants must match" })).toHaveValue("all");
    const group = screen.getByRole("region", { name: "Group 1" });
    expect(within(group).getByRole("combobox", { name: "Rules in Group 1 must match" })).toHaveValue("any");
    expect(screen.getByRole("group", { name: "Rule 1" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Group 1, rule 2" })).toBeInTheDocument();
  });

  it("reads the rules back in plain language", () => {
    render(<Harness />);
    expect(screen.getByText(/Reads as:/).parentElement).toHaveTextContent(
      "Account › Country is United Kingdom AND Account › Account Status is Active AND ( Account › Account Type is VIP OR Trading Account › Balance is greater than 1000 )"
    );
  });

  it("uses the value control that fits the field type", () => {
    render(<Harness />);
    expect(within(screen.getByRole("group", { name: "Group 1, rule 2" })).getByRole("spinbutton", { name: "Value" })).toHaveValue(1000);
  });

  it("adds a blank rule, focuses it and announces it", async () => {
    render(<Harness />);
    await userEvent.click(screen.getAllByRole("button", { name: "Add rule" })[0]!);
    const rule = screen.getByRole("group", { name: "Rule 3" });
    const object = within(rule).getByRole("combobox", { name: "Object" });
    expect(object).toHaveValue("");
    expect(object).toHaveFocus();
    expect(screen.getByText("Rule added. 5 rules.")).toBeInTheDocument();
  });

  it("resets field, condition and value when the object changes", async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    const rule = screen.getByRole("group", { name: "Rule 1" });
    await userEvent.selectOptions(within(rule).getByRole("combobox", { name: "Object" }), "ta");
    expect(spy.mock.lastCall![0].items[0]).toMatchObject({ object: "ta", field: "", condition: "", value: null });
    expect(within(rule).getByRole("combobox", { name: "Field" })).toHaveValue("");
  });

  it("shows a multi-select for multi-value operators", async () => {
    render(<Harness />);
    const rule = screen.getByRole("group", { name: "Rule 1" });
    await userEvent.selectOptions(within(rule).getByRole("combobox", { name: "Condition" }), "any_of");
    // The single-value native select is replaced by the searchable MultiSelect (an input combobox), cleared.
    const value = within(rule).getByRole("combobox", { name: "Value" });
    expect(value.tagName).toBe("INPUT");
    expect(value).toHaveAttribute("aria-autocomplete", "list");
  });

  it("adds a group with one rule and the configured default match", async () => {
    render(<Harness initial={{ match: "all", items: [] }} newGroupMatch="any" />);
    await userEvent.click(screen.getByRole("button", { name: "Add group" }));
    expect(screen.getByRole("combobox", { name: "Rules in Group 1 must match" })).toHaveValue("any");
    expect(screen.getByRole("group", { name: "Group 1, rule 1" })).toBeInTheDocument();
  });

  it("removes a group when its last rule is deleted", async () => {
    render(<Harness initial={{ match: "all", items: [{ kind: "group", id: "g", match: "any", rules: [{ kind: "rule", id: "x", object: "", field: "", condition: "", value: null }] }] }} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete group 1, rule 1" }));
    expect(screen.queryByRole("region", { name: "Group 1" })).not.toBeInTheDocument();
    expect(screen.getByText("No rules yet", { selector: "h3" })).toBeInTheDocument();
  });

  it("asks before deleting a group with several rules", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Delete group 1" }));
    const dialog = screen.getByRole("alertdialog", { name: "Delete this group?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete group" }));
    expect(screen.queryByRole("region", { name: "Group 1" })).not.toBeInTheDocument();
  });

  it("asks before Clear all, then clears to an empty All builder", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Clear all" }));
    const dialog = screen.getByRole("alertdialog", { name: "Clear all rules?" });
    expect(dialog).toHaveTextContent("This removes 4 rules and 1 group.");
    await userEvent.click(within(dialog).getByRole("button", { name: "Clear all rules" }));
    expect(screen.getByText("No rules yet", { selector: "h3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear all" })).toBeDisabled();
  });

  it("changes the top-level match", async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Participants must match" }), "any");
    expect(spy.mock.lastCall![0].match).toBe("any");
    expect(screen.getByText(/Reads as:/).parentElement).toHaveTextContent(" OR Account › Account Status");
  });

  it("disables adding at the configured limits", () => {
    render(<Harness limits={{ rules: 4, groups: 1 }} />);
    for (const b of screen.getAllByRole("button", { name: "Add rule" })) expect(b).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add group" })).toBeDisabled();
  });

  it("flags a rule whose CRM field no longer exists", () => {
    render(<Harness initial={{ match: "all", items: [{ kind: "rule", id: "s", object: "account", field: "region", fieldLabel: "Region", condition: "is", value: "EMEA" }] }} />);
    expect(screen.getByText("Field no longer exists in the CRM")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Rule 1" })).getByRole("combobox", { name: "Field" })).toHaveAttribute("aria-invalid", "true");
  });

  it("marks incomplete rules only when validation is shown", () => {
    const initial: ConditionValue = { match: "all", items: [{ kind: "rule", id: "i", object: "account", field: "status", condition: "is", value: "" }] };
    const { rerender } = render(<Harness initial={initial} />);
    expect(screen.queryByText("Enter a value")).not.toBeInTheDocument();
    rerender(<Harness initial={initial} showValidation />);
    expect(screen.getByText("Enter a value")).toBeInTheDocument();
  });

  it("shows loading and error states with retry", async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<Harness status="loading" />);
    expect(screen.getByText("Loading CRM objects and fields…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add rule" })).toBeDisabled();
    rerender(<Harness status="error" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("ConditionBuilder model", () => {
  it("knows when a rule is complete", () => {
    expect(isRuleComplete({ kind: "rule", id: "a", object: "account", field: "country", condition: "is", value: "GB" }, OBJECTS, OPS)).toBe(true);
    expect(isRuleComplete({ kind: "rule", id: "a", object: "account", field: "country", condition: "any_of", value: [] }, OBJECTS, OPS)).toBe(false);
    expect(isRuleComplete({ kind: "rule", id: "a", object: "account", field: "country", condition: "empty", value: null }, OBJECTS, OPS)).toBe(true);
  });
  it("summarises an empty builder as an empty string", () => {
    expect(summarize({ match: "all", items: [] }, OBJECTS, OPS)).toBe("");
  });
});
