import { ChevronDown } from "lucide-react";
import {
  forwardRef,
  useId,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";

/** FDS-101 Input/Textarea/Select validation states that change the box or helper colour. */
export type FieldStatus = "default" | "error" | "success" | "info";

interface FieldChromeProps {
  label: ReactNode;
  /** Helper text under the box. Coloured by `status`. */
  helperText?: ReactNode;
  status?: FieldStatus;
  required?: boolean;
  /** Hide the label visually but keep it for assistive tech. */
  hideLabel?: boolean;
}

interface ShellProps extends FieldChromeProps {
  id: string;
  helperId: string;
  kind: "input" | "textarea" | "select" | "number" | "date";
  readOnly?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

function FieldShell({ id, helperId, label, helperText, status = "default", required, hideLabel, kind, readOnly, disabled, children }: ShellProps) {
  return (
    <div
      className={`fx-field fx-field--${kind}`}
      data-status={status}
      data-readonly={readOnly || undefined}
      data-disabled={disabled || undefined}
    >
      <label htmlFor={id} className={hideLabel ? "fx-field__label fx-visually-hidden" : "fx-field__label"}>
        {label}
        {required && <span className="fx-field__required" aria-hidden="true">*</span>}
      </label>
      {children}
      {helperText && (
        <p id={helperId} className="fx-field__helper" role={status === "error" ? "alert" : undefined}>
          {helperText}
        </p>
      )}
    </div>
  );
}

function a11yProps(helperId: string, helperText: ReactNode, status: FieldStatus | undefined, describedBy?: string) {
  const ids = [helperText ? helperId : undefined, describedBy].filter(Boolean).join(" ");
  return { "aria-describedby": ids || undefined, "aria-invalid": status === "error" || undefined };
}

export type TextFieldProps = FieldChromeProps & Omit<InputHTMLAttributes<HTMLInputElement>, "size">;

/** FDS-101 Input (node 46:621). */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, helperText, status, required, hideLabel, id, className, readOnly, disabled, ...rest },
  ref
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const helperId = `${fieldId}-helper`;
  return (
    <FieldShell {...{ id: fieldId, helperId, label, helperText, status, required, hideLabel, readOnly, disabled }} kind="input">
      <input
        ref={ref}
        id={fieldId}
        className={["fx-field__box", className].filter(Boolean).join(" ")}
        required={required}
        readOnly={readOnly}
        disabled={disabled}
        {...a11yProps(helperId, helperText, status, rest["aria-describedby"])}
        {...rest}
      />
    </FieldShell>
  );
});

export type TextAreaProps = FieldChromeProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

/** FDS-101 Textarea (node 51:73). */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, helperText, status, required, hideLabel, id, className, readOnly, disabled, ...rest },
  ref
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const helperId = `${fieldId}-helper`;
  return (
    <FieldShell {...{ id: fieldId, helperId, label, helperText, status, required, hideLabel, readOnly, disabled }} kind="textarea">
      <textarea
        ref={ref}
        id={fieldId}
        className={["fx-field__box", className].filter(Boolean).join(" ")}
        required={required}
        readOnly={readOnly}
        disabled={disabled}
        {...a11yProps(helperId, helperText, status, rest["aria-describedby"])}
        {...rest}
      />
    </FieldShell>
  );
});

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type SelectProps = FieldChromeProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
    options: SelectOption[];
    /** Rendered as a disabled first option when no value is selected. */
    placeholder?: string;
  };

/** FDS-101 Select (node 50:81). Native select for full keyboard and screen-reader support. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, helperText, status, required, hideLabel, id, className, options, placeholder, disabled, ...rest },
  ref
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const helperId = `${fieldId}-helper`;
  return (
    <FieldShell {...{ id: fieldId, helperId, label, helperText, status, required, hideLabel, disabled }} kind="select">
      <span className="fx-field__select">
        <select
          ref={ref}
          id={fieldId}
          className={["fx-field__box", className].filter(Boolean).join(" ")}
          data-empty={rest.value === "" || undefined}
          required={required}
          disabled={disabled}
          {...a11yProps(helperId, helperText, status, rest["aria-describedby"])}
          {...rest}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="fx-field__chevron" aria-hidden="true" />
      </span>
    </FieldShell>
  );
});

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

export type NumberFieldProps = FieldChromeProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> & {
    /** Accessible names for the stepper buttons. */
    incrementLabel?: string;
    decrementLabel?: string;
  };

/**
 * FDS-101 Number Input (node 119:916). Native number input plus the 28px stepper.
 * Stepper buttons are mouse aids (tabIndex -1); keyboard users step with Arrow Up / Down.
 * DCF-0003: rule Value for number fields (e.g. Trading Account › Balance).
 */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  { label, helperText, status, required, hideLabel, id, className, readOnly, disabled, incrementLabel = "Increase", decrementLabel = "Decrease", ...rest },
  ref
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const helperId = `${fieldId}-helper`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const locked = disabled || readOnly;

  function step(direction: 1 | -1) {
    const el = inputRef.current;
    if (!el || locked) return;
    if (direction === 1) el.stepUp();
    else el.stepDown();
    // stepUp/stepDown do not fire events; dispatch one so React's onChange runs.
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  return (
    <FieldShell {...{ id: fieldId, helperId, label, helperText, status, required, hideLabel, readOnly, disabled }} kind="number">
      <div className="fx-field__box fx-field__group">
        <input
          ref={(el) => {
            inputRef.current = el;
            assignRef(ref, el);
          }}
          id={fieldId}
          type="number"
          className={["fx-field__control", className].filter(Boolean).join(" ")}
          required={required}
          readOnly={readOnly}
          disabled={disabled}
          {...a11yProps(helperId, helperText, status, rest["aria-describedby"])}
          {...rest}
        />
        <div className="fx-number__stepper">
          <button type="button" tabIndex={-1} className="fx-number__step" aria-label={incrementLabel} aria-controls={fieldId} disabled={locked} onClick={() => step(1)}>
            <ChevronUp aria-hidden="true" className="fx-number__icon" />
          </button>
          <button type="button" tabIndex={-1} className="fx-number__step" aria-label={decrementLabel} aria-controls={fieldId} disabled={locked} onClick={() => step(-1)}>
            <ChevronDown aria-hidden="true" className="fx-number__icon" />
          </button>
        </div>
      </div>
    </FieldShell>
  );
});

export type DateFieldProps = FieldChromeProps & Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type">;

/**
 * FDS-101 Date Field (node 121:160). Native date input (browser picker, locale display
 * format) behind the 18px calendar icon. DCF-0003: rule Value for date fields.
 */
export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(function DateField(
  { label, helperText, status, required, hideLabel, id, className, readOnly, disabled, ...rest },
  ref
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const helperId = `${fieldId}-helper`;
  return (
    <FieldShell {...{ id: fieldId, helperId, label, helperText, status, required, hideLabel, readOnly, disabled }} kind="date">
      <div className="fx-field__box fx-field__group">
        <Calendar aria-hidden="true" className="fx-date__icon" />
        <input
          ref={ref}
          id={fieldId}
          type="date"
          className={["fx-field__control", className].filter(Boolean).join(" ")}
          required={required}
          readOnly={readOnly}
          disabled={disabled}
          {...a11yProps(helperId, helperText, status, rest["aria-describedby"])}
          {...rest}
        />
      </div>
    </FieldShell>
  );
});
