import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ConfirmDialog, Modal } from "./Modal";

function Harness({ windowActions = false }: { windowActions?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Task" windowActions={windowActions} footer={<button type="button">Save</button>}>
        <label>
          Task Name <input />
        </label>
      </Modal>
    </>
  );
}

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens as a labelled modal dialog and focuses the first field", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog", { name: "Add Task" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("textbox", { name: "Task Name" })).toHaveFocus();
  });

  it("traps Tab inside the dialog", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.tab(); // -> Save
    await userEvent.tab(); // wraps -> Close (first focusable in header)
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("Escape and the close button close it and restore focus", async () => {
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open" });
    await userEvent.click(opener);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    await userEvent.click(opener);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("window actions minimize to a non-modal bar and toggle full size", async () => {
    render(<Harness windowActions />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.click(screen.getByRole("button", { name: "Full size" }));
    expect(screen.getByRole("button", { name: "Exit full size" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Minimize" }));
    const dialog = screen.getByRole("dialog", { name: "Add Task" });
    expect(dialog).toHaveAttribute("aria-modal", "false");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(screen.getByRole("textbox", { name: "Task Name" })).toBeInTheDocument();
  });
});

describe("ConfirmDialog", () => {
  it("is an alertdialog that focuses Cancel and calls the right handler", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog open destructive title="Delete this task?" message="This can't be undone." confirmLabel="Delete" onConfirm={onConfirm} onCancel={onCancel} />);
    const dialog = screen.getByRole("alertdialog", { name: "Delete this task?" });
    expect(dialog).toHaveAccessibleDescription("This can't be undone.");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
