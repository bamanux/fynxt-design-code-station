import { render, screen } from "@testing-library/react";
import { AppShell, TopNav } from "./AppShell";

describe("AppShell / TopNav", () => {
  it("provides navigation, banner and main landmarks, with the page title as h1", () => {
    render(
      <AppShell nav={<nav aria-label="Main">nav</nav>} header={<TopNav title="Tasks" actions={<button type="button">Settings</button>} />}>
        <p>Page body</p>
      </AppShell>
    );
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toContainElement(screen.getByRole("heading", { level: 1, name: "Tasks" }));
    expect(screen.getByRole("main")).toHaveTextContent("Page body");
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  });
});
