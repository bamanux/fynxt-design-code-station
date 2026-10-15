import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SegmentedControl } from "./SegmentedControl";

const options = [
  { value: "and", label: "AND" },
  { value: "or", label: "OR" },
] as const;

function Harness({ initial = null as "and" | "or" | null, onChange = (_: string) => {} }) {
  const [value, setValue] = useState<"and" | "or" | null>(initial);
  return (
    <SegmentedControl
      label="Join Contact attributes with"
      options={[...options]}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe("SegmentedControl", () => {
  it("is a named radio group with nothing chosen when unset (Q43)", () => {
    render(<Harness />);
    expect(screen.getByRole("radiogroup", { name: "Join Contact attributes with" })).toHaveAttribute("data-unset", "true");
    for (const r of screen.getAllByRole("radio")) expect(r).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: "AND" })).toHaveAttribute("tabindex", "0");
  });

  it("selects on click and reports the value", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "OR" }));
    expect(screen.getByRole("radio", { name: "OR" })).toHaveAttribute("aria-checked", "true");
    expect(onChange).toHaveBeenCalledWith("or");
  });

  it("moves the choice with arrow keys and keeps one tab stop", async () => {
    render(<Harness initial="and" />);
    screen.getByRole("radio", { name: "AND" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    const or = screen.getByRole("radio", { name: "OR" });
    expect(or).toHaveAttribute("aria-checked", "true");
    expect(or).toHaveFocus();
    expect(screen.getByRole("radio", { name: "AND" })).toHaveAttribute("tabindex", "-1");
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "AND" })).toHaveAttribute("aria-checked", "true");
  });

  it("can be marked invalid and disabled", () => {
    render(<SegmentedControl label="Join" options={[...options]} value={null} onChange={() => {}} invalid disabled />);
    expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("radio", { name: "AND" })).toBeDisabled();
  });
});
