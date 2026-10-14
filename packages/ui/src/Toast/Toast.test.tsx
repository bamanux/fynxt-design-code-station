import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toast } from "./Toast";

describe("Toast", () => {
  it("announces its message and can be dismissed", async () => {
    const onClose = vi.fn();
    render(<Toast status="success" onClose={onClose}>Program created.</Toast>);
    expect(screen.getByRole("status")).toHaveTextContent("Program created.");
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onClose).toHaveBeenCalled();
  });
});
