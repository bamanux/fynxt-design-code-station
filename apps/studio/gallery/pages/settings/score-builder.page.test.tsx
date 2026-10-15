import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScoreBuilderPage from "./score-builder.page";

describe("Gallery page: Settings › Brand Setup › Score Builder (DCF-0002)", () => {
  it("renders the list in the Settings menu and opens the full-screen builder", async () => {
    render(<ScoreBuilderPage />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Score Builder" })).toHaveAttribute("aria-current", "page");
    const table = await screen.findByRole("table", { name: "All score models" }, { timeout: 3000 });
    const row = within(table).getByRole("row", { name: /Client Risk Score/ });
    expect(row).toHaveTextContent("Low Risk");

    await userEvent.click(within(table).getByRole("button", { name: "View Client Risk Score" }));
    expect(await screen.findByRole("navigation", { name: "Model outline" }, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /^Country/ }, { timeout: 3000 })).toBeInTheDocument();
  });
});
