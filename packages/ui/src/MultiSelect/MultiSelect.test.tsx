import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MultiSelect, type MultiSelectOption } from "./MultiSelect";

const users: MultiSelectOption[] = [
  { value: "u1", label: "John Smith" },
  { value: "u2", label: "Jane Doe" },
  { value: "u3", label: "Asha Kumar" },
];

function Harness(props: { initial?: string[]; status?: "error"; helperText?: string }) {
  const [value, setValue] = useState(props.initial ?? []);
  return <MultiSelect label="Assign To" required options={users} value={value} onChange={setValue} status={props.status} helperText={props.helperText} />;
}

describe("MultiSelect", () => {
  it("is a labelled combobox that opens a multi-selectable listbox", async () => {
    render(<Harness />);
    const box = screen.getByRole("combobox", { name: /Assign To/ });
    expect(box).toHaveAttribute("aria-required", "true");
    await userEvent.click(box);
    expect(screen.getByRole("listbox")).toHaveAttribute("aria-multiselectable", "true");
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("filters by search and selects with the keyboard into removable chips", async () => {
    render(<Harness />);
    const box = screen.getByRole("combobox");
    await userEvent.type(box, "jan");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Remove Jane Doe" })).toBeInTheDocument();
    expect(box).toHaveValue("");
  });

  it("selects more than one and removes by clicking x or Backspace", async () => {
    render(<Harness initial={["u1"]} />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "Asha Kumar" }));
    expect(screen.getByRole("option", { name: "Asha Kumar" })).toHaveAttribute("aria-selected", "true");
    await userEvent.click(screen.getByRole("button", { name: "Remove John Smith" }));
    expect(screen.queryByRole("button", { name: "Remove John Smith" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.keyboard("{Backspace}");
    expect(screen.queryByRole("button", { name: "Remove Asha Kumar" })).not.toBeInTheDocument();
  });

  it("shows a no-matches row", async () => {
    render(<Harness />);
    await userEvent.type(screen.getByRole("combobox"), "zzz");
    expect(screen.getByText("No matches")).toBeInTheDocument();
  });

  it("error status marks the field invalid and announces the helper", () => {
    render(<Harness status="error" helperText="Assign the task to at least one user." />);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Assign the task to at least one user.");
  });
});
