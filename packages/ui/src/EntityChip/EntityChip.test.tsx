import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntityChip } from "./EntityChip";

describe("EntityChip", () => {
  it("renders plain text when it cannot be opened", () => {
    render(<EntityChip label="Deal name 1" />);
    expect(screen.getByText("Deal name 1")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens the record from the label and removes from the x", async () => {
    const onOpen = vi.fn();
    const onRemove = vi.fn();
    render(<EntityChip label="John Smith" onOpen={onOpen} onRemove={onRemove} />);
    await userEvent.click(screen.getByRole("button", { name: "John Smith" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove John Smith" }));
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
