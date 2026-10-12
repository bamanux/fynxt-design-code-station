import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

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
  kind: "input" | "textarea" | "select";
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
      <select
        ref={ref}
        id={fieldId}
        className={["fx-field__box", className].filter(Boolean).join(" ")}
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
    </FieldShell>
  );
});
