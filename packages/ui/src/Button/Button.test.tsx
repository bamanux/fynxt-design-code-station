import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders FDS-101 defaults (primary, M)", () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveClass("fx-btn", "fx-btn--primary", "fx-btn--m");
    expect(btn).toHaveAttribute("type", "button");
  });

  it.each(["primary", "secondary", "ghost", "destructive"] as const)("applies the %s variant", (variant) => {
    render(<Button variant={variant}>Go</Button>);
    expect(screen.getByRole("button")).toHaveClass(`fx-btn--${variant}`);
  });

  it("loading disables the button and marks it busy", async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Submit</Button>);
    const btn = screen.getByRole("button", { name: "Submit" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("hides decorative icons from assistive tech", () => {
    render(<Button leadingIcon={<svg data-testid="icon" />}>Add</Button>);
    expect(screen.getByTestId("icon").parentElement).toHaveAttribute("aria-hidden", "true");
  });
});
