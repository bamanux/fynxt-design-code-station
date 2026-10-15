import { useId, useRef, type KeyboardEvent } from "react";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  /** Accessible name of the group, e.g. "Join Contact attributes with". */
  label: string;
  options: SegmentedOption<T>[];
  /** `null` = nothing chosen yet (DCF-0002 Q43: no default AND / OR). */
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  /** Marks the group invalid (e.g. a connector that still needs a choice). */
  invalid?: boolean;
  className?: string;
}

/**
 * FDS-101 Button Group (node 108:30, Connected) used as a single-choice control: the DCF-0002
 * Logic Switch (AND / OR / unset, work file 72:17580) and the Scoring method switch.
 * A radio group: arrow keys move the choice, Tab enters and leaves the group.
 */
export function SegmentedControl<T extends string>({ label, options, value, onChange, disabled, size = "md", invalid, className }: SegmentedControlProps<T>) {
  const name = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = options.findIndex((o) => o.value === value);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-invalid={invalid || undefined}
      className={["fx-segmented", `fx-segmented--${size}`, className].filter(Boolean).join(" ")}
      data-unset={value === null || undefined}
    >
      {options.map((o, i) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            name={name}
            aria-checked={checked}
            // Roving tab stop: the chosen option, or the first one when nothing is chosen yet.
            tabIndex={checked || (index === -1 && i === 0) ? 0 : -1}
            className="fx-segmented__option"
            disabled={disabled}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
