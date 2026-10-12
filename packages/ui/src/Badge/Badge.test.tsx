import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("defaults to neutral soft", () => {
    render(<Badge>Draft</Badge>);
    expect(screen.getByText("Draft")).toHaveClass("fx-badge--neutral", "fx-badge--soft");
  });
  it("supports every FDS-101 status in both styles", () => {
    const statuses = ["neutral", "primary", "success", "warning", "error", "info"] as const;
    for (const status of statuses) {
      for (const tone of ["soft", "solid"] as const) {
        const { unmount } = render(<Badge status={status} tone={tone}>{`${status}-${tone}`}</Badge>);
        expect(screen.getByText(`${status}-${tone}`)).toHaveClass(`fx-badge--${status}`, `fx-badge--${tone}`);
        unmount();
      }
    }
  });
});
