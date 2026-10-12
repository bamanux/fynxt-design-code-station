import { render, screen } from "@testing-library/react";
import { Card } from "./Card";

describe("Card", () => {
  it("renders flat by default as a div", () => {
    render(<Card data-testid="c">Body</Card>);
    const el = screen.getByTestId("c");
    expect(el.tagName).toBe("DIV");
    expect(el).toHaveClass("fx-card--flat");
  });
  it("renders the elevated variant with a semantic element", () => {
    render(<Card as="section" variant="elevated" aria-label="Summary">Body</Card>);
    expect(screen.getByRole("region", { name: "Summary" })).toHaveClass("fx-card--elevated");
  });
});
