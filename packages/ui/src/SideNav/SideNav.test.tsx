import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SideNav, type SideNavItem } from "./SideNav";

const items: SideNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <svg />, children: [{ id: "exec", label: "Executive Dashboard", href: "#exec" }] },
  {
    id: "tickets",
    label: "Tickets & Activities",
    icon: <svg />,
    children: [
      { id: "service", label: "Service Ticket", href: "#service" },
      { id: "tasks", label: "Tasks", href: "#tasks" },
    ],
  },
  { id: "reports", label: "Reports", icon: <svg />, href: "#reports" },
];

function Harness({ initial = false }: { initial?: boolean }) {
  const [collapsed, setCollapsed] = useState(initial);
  return <SideNav items={items} activeId="tasks" collapsed={collapsed} onCollapsedChange={setCollapsed} logo="Tenant logo" logoMark="T" />;
}

describe("SideNav", () => {
  it("is a named navigation landmark with the current page marked", () => {
    render(<Harness />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Tasks" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("button", { name: "Tickets & Activities" })).toHaveAttribute("data-active", "true");
  });

  it("groups toggle their children", async () => {
    render(<Harness />);
    const group = screen.getByRole("button", { name: "Dashboard" });
    expect(group).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(group);
    expect(group).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Executive Dashboard" })).not.toBeInTheDocument();
  });

  it("collapses to an icon rail with named items and expands again", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Collapse navigation" }));
    expect(screen.getByRole("button", { name: "Expand navigation" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Tickets & Activities" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("link", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByText("T")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Tickets & Activities" }));
    expect(screen.getByRole("link", { name: "Tasks" })).toBeInTheDocument();
  });
});
