import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Tabs, type TabItem } from "./Tabs";

const items: TabItem[] = [
  { id: "a", label: "Case file", content: "A content" },
  { id: "b", label: "Feedback", content: "B content" },
  { id: "c", label: "Activity", content: "C content", disabled: true },
];

function Harness() {
  const [value, setValue] = useState("a");
  return <Tabs items={items} value={value} onChange={setValue} label="Case sections" />;
}

describe("Tabs", () => {
  it("exposes tablist semantics and shows the active panel", () => {
    render(<Harness />);
    expect(screen.getByRole("tablist", { name: "Case sections" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Case file" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("A content");
  });
  it("moves with arrow keys and skips disabled tabs", async () => {
    render(<Harness />);
    screen.getByRole("tab", { name: "Case file" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Feedback" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("B content");
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Case file" })).toHaveFocus();
  });
  it("activates on click", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("tab", { name: "Feedback" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("B content");
  });
});
