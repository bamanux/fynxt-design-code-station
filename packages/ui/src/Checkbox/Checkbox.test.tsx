import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("toggles and keeps its label and description", async () => {
    const onChange = vi.fn();
    render(<Checkbox label="Imran Khan" description="CL-30117" onChange={onChange} />);
    const box = screen.getByRole("checkbox", { name: /Imran Khan/ });
    expect(box).toHaveAccessibleDescription("CL-30117");
    await userEvent.click(box);
    expect(box).toBeChecked();
    expect(onChange).toHaveBeenCalled();
  });
  it("supports indeterminate, disabled and a hidden label", () => {
    render(<Checkbox label="Select all" hideLabel indeterminate disabled />);
    const box = screen.getByRole("checkbox", { name: "Select all" }) as HTMLInputElement;
    expect(box.indeterminate).toBe(true);
    expect(box).toBeDisabled();
  });
});
