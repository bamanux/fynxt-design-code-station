import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select, TextArea, TextField } from "./Field";

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
