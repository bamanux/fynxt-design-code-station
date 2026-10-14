import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { DateField, NumberField, Select, TextArea, TextField } from "./Field";

describe("TextField", () => {
  it("associates label and helper text", () => {
    render(<TextField label="Title" helperText="Short and specific" />);
    const input = screen.getByLabelText("Title");
    expect(input).toHaveAccessibleDescription("Short and specific");
  });
  it("marks required and error state accessibly", () => {
    render(<TextField label="Title" required status="error" helperText="Title is required" />);
    const input = screen.getByRole("textbox", { name: /Title/ });
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Title is required");
  });
  it("accepts typing", async () => {
    render(<TextField label="Name" />);
    await userEvent.type(screen.getByLabelText("Name"), "Leads list");
    expect(screen.getByLabelText("Name")).toHaveValue("Leads list");
  });
});

describe("TextArea", () => {
  it("renders a labelled multi-line box", () => {
    render(<TextArea label="Requirement" />);
    expect(screen.getByLabelText("Requirement").tagName).toBe("TEXTAREA");
  });
});

describe("Select", () => {
  it("renders options with a placeholder", async () => {
    render(<Select label="Module" placeholder="Choose…" defaultValue="" options={[{ value: "crm", label: "CRM" }]} />);
    const select = screen.getByLabelText("Module");
    await userEvent.selectOptions(select, "crm");
    expect(select).toHaveValue("crm");
  });
});

describe("NumberField (DCF-0003)", () => {
  it("is a labelled spinbutton with helper text", () => {
    render(<NumberField label="Value" helperText="Account currency" />);
    const input = screen.getByRole("spinbutton", { name: "Value" });
    expect(input).toHaveAccessibleDescription("Account currency");
  });
  it("steps up and down with the stepper and fires onChange", async () => {
    const onChange = vi.fn();
    render(<NumberField label="Value" defaultValue="1000" step={100} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Increase" }));
    expect(screen.getByLabelText("Value")).toHaveValue(1100);
    await userEvent.click(screen.getByRole("button", { name: "Decrease" }));
    await userEvent.click(screen.getByRole("button", { name: "Decrease" }));
    expect(screen.getByLabelText("Value")).toHaveValue(900);
    expect(onChange).toHaveBeenCalledTimes(3);
  });
  it("updates a controlled value through the stepper", async () => {
    function Controlled() {
      const [v, setV] = useState("5");
      return <NumberField label="Value" value={v} onChange={(e) => setV(e.target.value)} />;
    }
    render(<Controlled />);
    await userEvent.click(screen.getByRole("button", { name: "Increase" }));
    expect(screen.getByLabelText("Value")).toHaveValue(6);
  });
  it("respects max", async () => {
    render(<NumberField label="Value" defaultValue="10" max={10} />);
    await userEvent.click(screen.getByRole("button", { name: "Increase" }));
    expect(screen.getByLabelText("Value")).toHaveValue(10);
  });
  it("keeps the stepper out of the tab order", () => {
    render(<NumberField label="Value" />);
    expect(screen.getByRole("button", { name: "Increase" })).toHaveAttribute("tabindex", "-1");
  });
  it("disables the stepper when disabled or read-only", () => {
    const { rerender } = render(<NumberField label="Value" disabled />);
    expect(screen.getByRole("button", { name: "Increase" })).toBeDisabled();
    rerender(<NumberField label="Value" readOnly />);
    expect(screen.getByRole("button", { name: "Decrease" })).toBeDisabled();
  });
  it("marks the error state accessibly", () => {
    render(<NumberField label="Value" status="error" helperText="Enter a number" />);
    expect(screen.getByLabelText("Value")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a number");
  });
});

describe("DateField (DCF-0003)", () => {
  it("is a labelled date input", () => {
    render(<DateField label="Value" />);
    expect(screen.getByLabelText("Value")).toHaveAttribute("type", "date");
  });
  it("accepts a date", async () => {
    const onChange = vi.fn();
    render(<DateField label="Value" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Value"), "2026-01-01");
    expect(screen.getByLabelText("Value")).toHaveValue("2026-01-01");
    expect(onChange).toHaveBeenCalled();
  });
  it("marks required and error state accessibly", () => {
    render(<DateField label="Value" required status="error" helperText="Pick a date" />);
    const input = screen.getByLabelText(/Value/);
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
  it("supports disabled", () => {
    render(<DateField label="Value" disabled />);
    expect(screen.getByLabelText("Value")).toBeDisabled();
  });
});
