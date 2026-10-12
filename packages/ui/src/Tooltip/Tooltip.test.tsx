import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  it("is hidden until hover, and describes its trigger", async () => {
    render(
      <Tooltip content="Tasks not yet started">
        <button type="button">Help</button>
      </Tooltip>
    );
    const tip = screen.getByRole("tooltip", { hidden: true });
    expect(tip).not.toBeVisible();
    expect(screen.getByRole("button")).toHaveAttribute("aria-describedby", tip.id);
    await userEvent.hover(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Tasks not yet started");
    await userEvent.unhover(screen.getByRole("button"));
    expect(screen.getByRole("tooltip", { hidden: true })).not.toBeVisible();
  });

  it("opens on keyboard focus and closes on Escape", async () => {
    render(
      <Tooltip content="Explains the metric">
        <button type="button">Help</button>
      </Tooltip>
    );
    await userEvent.tab();
    expect(screen.getByRole("tooltip")).toBeVisible();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("tooltip", { hidden: true })).not.toBeVisible();
  });
});
