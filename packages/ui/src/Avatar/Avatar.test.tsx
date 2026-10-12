import { render, screen } from "@testing-library/react";
import { Avatar, initials } from "./Avatar";

describe("Avatar", () => {
  it("derives initials from first and last name", () => {
    expect(initials("John Smith")).toBe("JS");
    expect(initials("Madonna")).toBe("M");
    expect(initials("  ana   de  souza ")).toBe("AS");
  });

  it("is an image named after the person by default", () => {
    render(<Avatar name="Asha Kumar" />);
    expect(screen.getByRole("img", { name: "Asha Kumar" })).toHaveTextContent("AK");
  });

  it("is hidden from assistive tech when decorative", () => {
    render(<Avatar name="Asha Kumar" decorative />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it.each([24, 32, 40] as const)("supports size %i", (size) => {
    const { container } = render(<Avatar name="A B" size={size} />);
    expect(container.firstChild).toHaveClass(`fx-avatar--${size}`);
  });
});
