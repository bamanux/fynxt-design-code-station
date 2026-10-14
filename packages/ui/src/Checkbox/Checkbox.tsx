import { Check, Minus } from "lucide-react";
import { forwardRef, useEffect, useId, useRef, type InputHTMLAttributes, type ReactNode } from "react";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label: ReactNode;
  /** Hide the label visually but keep it for assistive tech (e.g. a row checkbox). */
  hideLabel?: boolean;
  indeterminate?: boolean;
  description?: ReactNode;
}

/** FDS-101 Checkbox (node 54:104), Size=M. Native checkbox for keyboard and screen readers. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hideLabel, indeterminate = false, description, id, className, disabled, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const inner = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (inner.current) inner.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <label className={["fx-checkbox", className].filter(Boolean).join(" ")} htmlFor={inputId} data-disabled={disabled || undefined}>
      <input
        ref={(el) => {
          inner.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        id={inputId}
        type="checkbox"
        className="fx-checkbox__input"
        disabled={disabled}
        aria-describedby={description ? `${inputId}-desc` : undefined}
        {...rest}
      />
      <span className="fx-checkbox__box" aria-hidden="true">
        {indeterminate ? <Minus className="fx-checkbox__mark" /> : <Check className="fx-checkbox__mark" />}
      </span>
      <span className={hideLabel ? "fx-visually-hidden" : "fx-checkbox__text"}>
        <span className="fx-checkbox__label">{label}</span>
        {description && (
          <span id={`${inputId}-desc`} className="fx-checkbox__description">
            {description}
          </span>
        )}
      </span>
    </label>
  );
});
