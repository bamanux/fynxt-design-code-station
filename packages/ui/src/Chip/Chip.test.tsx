import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Chip } from "./Chip";

describe("Chip", () => {
  it("renders a label with no remove control by default", () => {
    render(<Chip label="Pricing" />);
    expect(screen.getByText("Pricing")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("removable chips expose a named remove button", async () => {
    const onRemove = vi.fn();
    render(<Chip label="John Smith" onRemove={onRemove} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove John Smith" }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("disabled chips cannot be removed", async () => {
    const onRemove = vi.fn();
    render(<Chip label="Legal" onRemove={onRemove} disabled />);
    await userEvent.click(screen.getByRole("button", { name: "Remove Legal" }));
    expect(onRemove).not.toHaveBeenCalled();
  });
});
