import { Check } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";

export interface MenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  /** Destructive styling (e.g. Delete). FDS-101 Menu Item has no destructive variant yet (Q37). */
  destructive?: boolean;
  /** For single-choice menus (`selectable`): marks the current choice. */
  selected?: boolean;
  /** Decorative trailing icon, e.g. an arrow on a "go to" item (DCF-0002 issues list). */
  trailing?: ReactNode;
}

export interface MenuTriggerProps {
  ref: Ref<HTMLButtonElement>;
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  "aria-controls": string;
  onClick: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
}

export interface MenuProps {
  /** Accessible name of the menu. */
  label: string;
  items: MenuItem[];
  /** Renders the trigger (e.g. an IconButton or FilterChip) with the props it needs. */
  renderTrigger: (props: MenuTriggerProps) => ReactNode;
  /** Single-choice menu: items render as `menuitemradio` with a check on the selected one. */
  selectable?: boolean;
  align?: "start" | "end";
  /** Visible section heading at the top of the list (FDS-101 Dropdown Menu header, e.g. "Fields"). */
  heading?: ReactNode;
}

/** FDS-101 Dropdown Menu (345:67) + Menu Item (344:15). WAI-ARIA menu button pattern. */
export function Menu({ label, items, renderTrigger, selectable, align = "end", heading }: MenuProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);

  const focusItem = useCallback((index: number | undefined) => {
    if (index !== undefined) itemRefs.current[index]?.focus();
  }, []);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const openAt = (where: "first" | "last") => {
    setOpen(true);
    const selectedIndex = items.findIndex((it) => it.selected && !it.disabled);
    const target = where === "last" ? enabled[enabled.length - 1] : selectedIndex >= 0 ? selectedIndex : enabled[0];
    requestAnimationFrame(() => focusItem(target));
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);

  function onMenuKey(e: KeyboardEvent<HTMLDivElement>) {
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    const pos = enabled.indexOf(current);
    const moves: Record<string, number | undefined> = {
      ArrowDown: enabled[(pos + 1) % enabled.length],
      ArrowUp: enabled[(pos - 1 + enabled.length) % enabled.length],
      Home: enabled[0],
      End: enabled[enabled.length - 1],
    };
    if (e.key in moves) {
      e.preventDefault();
      focusItem(moves[e.key]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") {
      close(false);
    }
  }

  const trigger = renderTrigger({
    ref: triggerRef,
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": id,
    onClick: () => (open ? close(false) : openAt("first")),
    onKeyDown: (e) => {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openAt("first");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        openAt("last");
      }
    },
  });

  return (
    <span className="fx-menu" ref={wrapRef}>
      {trigger}
      <div role="menu" id={id} aria-label={label} className={`fx-menu__list fx-menu__list--${align}`} hidden={!open} onKeyDown={onMenuKey}>
        {heading && (
          <div role="presentation" className="fx-menu__heading">
            {heading}
          </div>
        )}
        {items.map((item, i) => (
          <button
            key={item.id}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            type="button"
            role={selectable ? "menuitemradio" : "menuitem"}
            aria-checked={selectable ? Boolean(item.selected) : undefined}
            tabIndex={-1}
            disabled={item.disabled}
            className="fx-menu__item"
            data-destructive={item.destructive || undefined}
            data-selected={item.selected || undefined}
            onClick={() => {
              close(true);
              item.onSelect();
            }}
          >
            <span className="fx-menu__label">{item.label}</span>
            {item.trailing && (
              <span className="fx-menu__trailing" aria-hidden="true">
                {item.trailing}
              </span>
            )}
            {selectable && item.selected && <Check className="fx-menu__check" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </span>
  );
}
