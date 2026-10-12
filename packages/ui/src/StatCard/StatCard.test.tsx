import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("shows label and value", () => {
    render(<StatCard label="Total Task" value={24} />);
    expect(screen.getByText("Total Task")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
  });

  it("shows an em dash when the value is unavailable (loading/error)", () => {
    render(<StatCard label="Overdue Task" value={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("help is a keyboard-reachable button that reveals the tooltip", async () => {
    render(<StatCard label="Pending Task" value={9} help="Definition pending (Q8)" />);
    const help = screen.getByRole("button", { name: "About Pending Task" });
    await userEvent.tab();
    expect(help).toHaveFocus();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Definition pending (Q8)");
  });
});
