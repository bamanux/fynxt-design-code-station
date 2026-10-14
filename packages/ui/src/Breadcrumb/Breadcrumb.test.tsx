import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Breadcrumb } from "./Breadcrumb";

describe("Breadcrumb", () => {
  it("lists ancestors and marks the current page", async () => {
    const back = vi.fn();
    render(<Breadcrumb items={[{ label: "Incentive Programs", onClick: back }, { label: "Create program" }]} />);
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
    expect(screen.getByText("Create program")).toHaveAttribute("aria-current", "page");
    await userEvent.click(screen.getByRole("button", { name: "Incentive Programs" }));
    expect(back).toHaveBeenCalled();
  });
});
