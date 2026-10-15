import { useId, type ButtonHTMLAttributes, type ReactNode } from "react";

export interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "role" | "aria-checked"> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  /** Hide the label visually (e.g. a table cell) but keep it for assistive tech. */
  hideLabel?: boolean;
}

/** FDS-101 Toggle (node 53:49): On / Off, Disabled. A native button with role="switch". */
export function Toggle({ checked, onChange, label, hideLabel, disabled, className, id, ...rest }: ToggleProps) {
  const autoId = useId();
  const labelId = `${id ?? autoId}-label`;
  return (
    <span className={["fx-toggle", className].filter(Boolean).join(" ")} data-disabled={disabled || undefined}>
      <button
        {...rest}
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        disabled={disabled}
        className="fx-toggle__track"
        onClick={() => onChange(!checked)}
      >
        <span className="fx-toggle__thumb" aria-hidden="true" />
      </button>
      <span id={labelId} className={hideLabel ? "fx-visually-hidden" : "fx-toggle__label"}>
        {label}
      </span>
    </span>
  );
}
