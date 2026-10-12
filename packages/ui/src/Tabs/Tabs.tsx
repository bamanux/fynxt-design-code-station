import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
  /** Optional trailing element, e.g. a count Badge. */
  adornment?: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** FDS-101 Primary Tab (75:18) or Secondary Tab (318:5979). */
  variant?: "primary" | "secondary";
  /** Accessible name for the tab list. */
  label: string;
}

/** FDS-101 Tabs. WAI-ARIA tabs pattern with automatic activation. */
export function Tabs({ items, value, onChange, variant = "primary", label }: TabsProps) {
  const baseId = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const enabled = items.filter((t) => !t.disabled);

  function move(event: KeyboardEvent<HTMLDivElement>) {
    const index = enabled.findIndex((t) => t.id === value);
    const keys: Record<string, number> = {
      ArrowRight: (index + 1) % enabled.length,
      ArrowLeft: (index - 1 + enabled.length) % enabled.length,
      Home: 0,
      End: enabled.length - 1,
    };
    const next = keys[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = enabled[next];
    if (!target) return;
    onChange(target.id);
    refs.current[target.id]?.focus();
  }

  const active = items.find((t) => t.id === value);
  return (
    <div className={`fx-tabs fx-tabs--${variant}`}>
      <div role="tablist" aria-label={label} className="fx-tabs__list" onKeyDown={move}>
        {items.map((tab) => {
          const selected = tab.id === value;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              disabled={tab.disabled}
              className="fx-tabs__tab"
              onClick={() => onChange(tab.id)}
            >
              <span className="fx-tabs__label" data-label={tab.label}>
                {tab.label}
              </span>
              {tab.adornment}
            </button>
          );
        })}
      </div>
      {active && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${active.id}`}
          aria-labelledby={`${baseId}-tab-${active.id}`}
          tabIndex={0}
          className="fx-tabs__panel"
        >
          {active.content}
        </div>
      )}
    </div>
  );
}
