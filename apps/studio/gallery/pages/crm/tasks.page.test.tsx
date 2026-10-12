import { render, screen, within } from "@testing-library/react";
import TasksPage from "./tasks.page";

describe("Gallery page: CRM › Tickets & Activities › Tasks (DCF-0001)", () => {
  it("renders the configured template inside the app shell", async () => {
    render(<TasksPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Tasks" })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("button", { name: "Tasks" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("tab", { name: "My Task" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Notifications (1)" })).toBeInTheDocument();
    const list = await screen.findByRole("list", { name: "Tasks" }, { timeout: 3000 });
    expect(within(list).getByRole("button", { name: "Task: Prepare revised pricing proposal" })).toHaveAttribute("aria-expanded", "true");
    expect(within(list).getByRole("button", { name: "Comments (2)" })).toBeInTheDocument();
  });
});
