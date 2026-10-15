import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Menu, type MenuItem } from "./Menu";

beforeEach(() => {
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});

function setup(items: MenuItem[], selectable = false) {
  render(
    <Menu
      label="Task actions"
      items={items}
      selectable={selectable}
      renderTrigger={(p) => (
        <button type="button" {...p}>
          Actions
        </button>
      )}
    />
  );
  return screen.getByRole("button", { name: "Actions" });
}

describe("Menu", () => {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const items: MenuItem[] = [
    { id: "edit", label: "Edit", onSelect: onEdit },
    { id: "dup", label: "Duplicate", onSelect: vi.fn(), disabled: true },
    { id: "del", label: "Delete", onSelect: onDelete, destructive: true },
  ];

  it("is closed until the trigger is activated", async () => {
    const trigger = setup(items);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu", { name: "Task actions" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();
  });

  it("arrow keys skip disabled items and wrap", async () => {
    const trigger = setup(items);
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();
  });

  it("selecting an item runs it, closes, and returns focus to the trigger", async () => {
    const trigger = setup(items);
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("Escape closes and restores focus", async () => {
    const trigger = setup(items);
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("clicking outside closes", async () => {
    const trigger = setup(items);
    await userEvent.click(trigger);
    await act(async () => {
      await userEvent.click(document.body);
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("selectable menus expose radio semantics and focus the current choice", async () => {
    const trigger = setup(
      [
        { id: "a", label: "Upcoming", onSelect: vi.fn() },
        { id: "b", label: "In-progress", onSelect: vi.fn(), selected: true },
      ],
      true
    );
    await userEvent.click(trigger);
    const current = screen.getByRole("menuitemradio", { name: "In-progress" });
    expect(current).toHaveAttribute("aria-checked", "true");
    expect(current).toHaveFocus();
  });
  it("shows an optional heading that is not a menu item (DCF-0002)", async () => {
    render(<Menu label="Add condition" heading="Fields" items={[{ id: "a", label: "User Type", onSelect: () => {}, trailing: <span>→</span> }]} renderTrigger={(p) => <button {...p}>Add condition</button>} />);
    await userEvent.click(screen.getByRole("button", { name: "Add condition" }));
    expect(screen.getByText("Fields")).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")).toHaveLength(1);
    expect(screen.getByRole("menuitem", { name: "User Type" })).toBeInTheDocument();
  });
});
