import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IncentiveProgramsPage from "./incentive-programs.page";

describe("Gallery page: CRM › Operations › Incentive Programs (DCF-0003)", () => {
  it("renders the list in the app shell and opens the full-screen editor", async () => {
    render(<IncentiveProgramsPage />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("button", { name: "Incentive Programs" })).toHaveAttribute("aria-current", "page");
    const table = await screen.findByRole("table", { name: "All incentive programs" }, { timeout: 3000 });
    expect(within(table).getByRole("row", { name: /UK VIP Rebate 2026/ })).toHaveTextContent("4 rules · 1 group · 1 manual");

    await userEvent.click(within(table).getByRole("button", { name: "UK VIP Rebate 2026" }));
    expect(await screen.findByText("This program is live", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Progress" })).toBeInTheDocument();
  });
});
