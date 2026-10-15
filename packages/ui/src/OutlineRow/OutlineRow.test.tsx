import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OutlineRow } from "./OutlineRow";

describe("OutlineRow", () => {
  it("names the row with its status and weight", () => {
    render(<OutlineRow name="Country" meta="40%" status="complete" onSelect={() => {}} />);
    expect(screen.getByRole("button", { name: /Country.*40%.*Complete/ })).toBeInTheDocument();
  });

  it("announces an incomplete reason and the override marker", () => {
    render(<OutlineRow name="Income" meta="No values" status="incomplete" statusLabel="No values yet" override onSelect={() => {}} />);
    const row = screen.getByRole("button", { name: /Income/ });
    expect(row).toHaveTextContent("No values yet");
    expect(row).toHaveTextContent("has override rules");
    expect(row.closest(".fx-outline-row")).toHaveAttribute("data-status", "incomplete");
  });

  it("marks the selected row and selects on click", async () => {
    const onSelect = vi.fn();
    render(<OutlineRow name="Country" status="complete" selected onSelect={onSelect} />);
    const row = screen.getByRole("button", { name: /Country/ });
    expect(row).toHaveAttribute("aria-current", "true");
    await userEvent.click(row);
    expect(onSelect).toHaveBeenCalled();
  });

  it("renders hover actions next to the row button", async () => {
    const remove = vi.fn();
    render(<OutlineRow name="Occupation" status="complete" onSelect={() => {}} actions={<button type="button" onClick={remove}>Remove Occupation</button>} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove Occupation" }));
    expect(remove).toHaveBeenCalled();
  });
});
