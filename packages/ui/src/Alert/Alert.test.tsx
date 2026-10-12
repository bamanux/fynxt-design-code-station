import { render, screen } from "@testing-library/react";
import { Alert } from "./Alert";

describe("Alert", () => {
  it("uses role=status for info", () => {
    render(<Alert title="Heads up">Queued</Alert>);
    expect(screen.getByRole("status")).toHaveTextContent("Heads up");
  });
  it("uses role=alert for errors", () => {
    render(<Alert status="error">Failed</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("fx-alert--error");
  });
});
