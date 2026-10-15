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

// DCF-0002 variant: Settings menu (D8, D13, D14).
const settingsItems: SideNavItem[] = [
  { id: "profile", label: "Profile Settings", icon: <svg />, href: "#profile" },
  { id: "brand", label: "Brand Setup", icon: <svg />, children: [{ id: "score-builder", label: "Score Builder", href: "#score" }] },
];

function SettingsHarness({ activeId = "score-builder", initial = false }: { activeId?: string; initial?: boolean }) {
  const [collapsed, setCollapsed] = useState(initial);
  return (
    <SideNav
      items={items}
      activeId={activeId}
      collapsed={collapsed}
      onCollapsedChange={setCollapsed}
      logo="Tenant logo"
      logoMark="T"
      settings={{ label: "Settings", icon: <svg />, items: settingsItems, searchPlaceholder: "Search settings" }}
      user={{ name: "John Doe", meta: "ID: 100245 · Admin" }}
    />
  );
}

describe("SideNav · Settings mode (DCF-0002)", () => {
  it("opens on the Settings menu when a Settings page is current, without a duplicate Settings item (D13)", () => {
    render(<SettingsHarness />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Score Builder" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).queryByRole("button", { name: "Settings" })).not.toBeInTheDocument();
    expect(within(nav).getByText("John Doe")).toBeInTheDocument();
    expect(within(nav).getByText("ID: 100245 · Admin")).toBeInTheDocument();
  });

  it("Back shows the main menu without navigating and keeps Settings selected (D8)", async () => {
    render(<SettingsHarness />);
    await userEvent.click(screen.getByRole("button", { name: "Back to main menu" }));
    const settingsItem = screen.getByRole("button", { name: "Settings" });
    expect(settingsItem).toHaveClass("fx-sidenav__parent--active");
    expect(screen.getByRole("button", { name: "Tickets & Activities" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Score Builder" })).not.toBeInTheDocument();
    await userEvent.click(settingsItem);
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });

  it("filters the Settings menu", async () => {
    render(<SettingsHarness />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Search settings" }), "score");
    expect(screen.getByRole("link", { name: "Score Builder" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Profile Settings" })).not.toBeInTheDocument();
  });

  it("collapses the Settings menu to a rail with Back and the settings icons (D14)", async () => {
    render(<SettingsHarness initial />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("button", { name: "Back to main menu" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Brand Setup" })).toHaveAttribute("data-active", "true");
    expect(within(nav).getByRole("link", { name: "Profile Settings" })).toBeInTheDocument();
    expect(within(nav).queryByRole("button", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("starts on the main menu for non-Settings pages, with the Settings item not active", () => {
    render(<SettingsHarness activeId="tasks" />);
    expect(screen.getByRole("button", { name: "Settings" })).not.toHaveClass("fx-sidenav__parent--active");
    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute("aria-current", "page");
  });
});
