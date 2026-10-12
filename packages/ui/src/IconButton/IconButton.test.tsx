import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("uses the label as its accessible name and defaults to secondary MD", () => {
    render(<IconButton label="More actions" icon={<svg />} />);
    const btn = screen.getByRole("button", { name: "More actions" });
    expect(btn).toHaveClass("fx-icon-btn--secondary", "fx-icon-btn--md");
    expect(btn).toHaveAttribute("type", "button");
  });

  it.each(["primary", "secondary", "ghost", "outline", "destructive"] as const)("applies the %s variant", (variant) => {
    render(<IconButton label="x" icon={<svg />} variant={variant} />);
    expect(screen.getByRole("button")).toHaveClass(`fx-icon-btn--${variant}`);
  });

  it("renders a dot badge without changing the name", () => {
    const { container } = render(<IconButton label="Alerts" icon={<svg />} badge />);
    expect(container.querySelector(".fx-icon-btn__dot")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alerts" })).toBeInTheDocument();
  });

  it("announces a count badge in the accessible name and caps it at 99+", () => {
    const { rerender } = render(<IconButton label="Comments" icon={<svg />} badge={2} />);
    expect(screen.getByRole("button", { name: "Comments (2)" })).toHaveTextContent("2");
    rerender(<IconButton label="Comments" icon={<svg />} badge={120} />);
    expect(screen.getByRole("button")).toHaveTextContent("99+");
  });

  it("does not fire when disabled", async () => {
    const onClick = vi.fn();
    render(<IconButton label="Close" icon={<svg />} disabled onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});
