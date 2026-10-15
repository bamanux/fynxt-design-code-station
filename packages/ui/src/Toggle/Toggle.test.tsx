import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Toggle } from "./Toggle";

function Harness() {
  const [on, setOn] = useState(true);
  return <Toggle checked={on} onChange={setOn} label="Client Risk Score active" hideLabel />;
}

describe("Toggle", () => {
  it("is a named switch that reports its state", async () => {
    render(<Harness />);
    const sw = screen.getByRole("switch", { name: "Client Risk Score active" });
    expect(sw).toHaveAttribute("aria-checked", "true");
    await userEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "false");
  });

  it("works with the keyboard and can be disabled", async () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Active" />);
    screen.getByRole("switch").focus();
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenCalledWith(true);
    render(<Toggle checked={false} onChange={onChange} label="Locked" disabled />);
    expect(screen.getByRole("switch", { name: "Locked" })).toBeDisabled();
  });
});
