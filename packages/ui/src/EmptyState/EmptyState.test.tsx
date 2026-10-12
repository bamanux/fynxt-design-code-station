import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders title as a heading at the requested level, with description and action", () => {
    render(<EmptyState title="No tasks yet" description="Create a task" action={<button type="button">Add Task</button>} headingLevel={2} />);
    expect(screen.getByRole("heading", { level: 2, name: "No tasks yet" })).toBeInTheDocument();
    expect(screen.getByText("Create a task")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Task" })).toBeInTheDocument();
  });

  it("compact mode drops the card chrome", () => {
    const { container } = render(<EmptyState title="No comments yet" compact />);
    expect(container.firstChild).toHaveClass("fx-empty--compact");
  });
});
