import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ActivityCard } from "./ActivityCard";

function Harness({ initial = false }: { initial?: boolean }) {
  const [expanded, setExpanded] = useState(initial);
  return (
    <ActivityCard
      title="Task: Prepare revised pricing proposal"
      meta={<span>Medium</span>}
      actions={<button type="button">More</button>}
      expanded={expanded}
      onExpandedChange={setExpanded}
      details={[
        { label: "Description", value: "Share the revised pricing" },
        { label: "Assigned to", value: "John Smith", span: "half" },
      ]}
      footerStart={<span>Created by: Admin</span>}
      footerEnd={<button type="button">Follow Up</button>}
    />
  );
}

describe("ActivityCard", () => {
  it("compact density shows the header only, with a collapsed disclosure", () => {
    render(<Harness />);
    const toggle = screen.getByRole("button", { name: "Task: Prepare revised pricing proposal" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("heading", { level: 3 })).toContainElement(toggle);
    expect(screen.queryByText("Share the revised pricing")).not.toBeVisible();
    expect(screen.getByText("Medium")).toBeVisible();
  });

  it("expands to show details as a description list and the footer", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: /Prepare revised pricing/ }));
    expect(screen.getByRole("button", { name: /Prepare revised pricing/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("term").map((t) => t.textContent)).toEqual(["Description:", "Assigned to:"]);
    expect(screen.getByText("Share the revised pricing")).toBeVisible();
    expect(screen.getByRole("button", { name: "Follow Up" })).toBeVisible();
  });

  it("collapses again", async () => {
    render(<Harness initial />);
    await userEvent.click(screen.getByRole("button", { name: /Prepare revised pricing/ }));
    expect(screen.queryByText("Created by: Admin")).not.toBeVisible();
  });
});
