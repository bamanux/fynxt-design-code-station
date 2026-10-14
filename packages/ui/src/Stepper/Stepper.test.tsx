import { render, screen } from "@testing-library/react";
import { Stepper } from "./Stepper";

describe("Stepper (DCF-0003 D1)", () => {
  it("marks the current step and completed steps", () => {
    render(<Stepper steps={["Participant type", "Enrollment criteria", "Participant blocking"]} current={1} />);
    const list = screen.getByRole("list", { name: "Progress" });
    const items = list.querySelectorAll("li");
    expect(items[0]).toHaveAttribute("data-state", "completed");
    expect(items[0]).toHaveTextContent("Participant type (completed)");
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[2]).toHaveAttribute("data-state", "upcoming");
  });
});
