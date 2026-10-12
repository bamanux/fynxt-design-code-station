import { render, screen } from "@testing-library/react";
import { FilterChip } from "./FilterChip";

describe("FilterChip", () => {
  it("default (not applied) shows only the label", () => {
    render(<FilterChip label="Status" />);
    const chip = screen.getByRole("button", { name: "Status" });
    expect(chip).not.toHaveClass("fx-filter-chip--active");
  });

  it("active shows the applied value in its name", () => {
    render(<FilterChip label="Status" value="In-progress" />);
    const chip = screen.getByRole("button", { name: "Status: In-progress" });
    expect(chip).toHaveClass("fx-filter-chip--active");
  });
});
