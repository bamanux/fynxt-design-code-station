import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label: ReactNode;
  /** Optional second line under the label, e.g. what choosing this option means. */
  description?: ReactNode;
}

/**
 * FDS-101 Radio (node 55:83), Size=M: 20px ring, 10px dot, Body/SM label.
 * A native radio input keeps arrow-key navigation and screen-reader semantics. DCF-0003 Step 1.
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, description, id, className, disabled, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const labelId = `${inputId}-label`;
  const descId = `${inputId}-desc`;
  return (
    <label className={["fx-radio", className].filter(Boolean).join(" ")} htmlFor={inputId} data-disabled={disabled || undefined}>
      <input
        ref={ref}
        id={inputId}
        type="radio"
        className="fx-radio__input"
        disabled={disabled}
        // Name from the label only; the description is announced as a description.
        aria-labelledby={labelId}
        aria-describedby={description ? descId : undefined}
        {...rest}
      />
      <span className="fx-radio__ring" aria-hidden="true">
        <span className="fx-radio__dot" />
      </span>
      <span className="fx-radio__text">
        <span id={labelId} className="fx-radio__label">
          {label}
        </span>
        {description && (
          <span id={descId} className="fx-radio__description">
            {description}
          </span>
        )}
      </span>
    </label>
  );
});

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  legend: ReactNode;
  name: string;
  options: RadioOption[];
  /** Controlled value. Omit to use `defaultValue`. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  required?: boolean;
  hideLegend?: boolean;
  disabled?: boolean;
  /** "card": each option is a bordered, selectable card (DCF-0003 Step 1, approved frame S1a). */
  appearance?: "default" | "card";
}

/** A labelled set of Radios in a fieldset. One tab stop; arrow keys move the selection. */
export function RadioGroup({ legend, name, options, value, defaultValue, onChange, orientation = "vertical", required, hideLegend, disabled, appearance = "default" }: RadioGroupProps) {
  const controlled = value !== undefined;
  return (
    <fieldset className="fx-radio-group" data-orientation={orientation} data-appearance={appearance} disabled={disabled}>
      <legend className={hideLegend ? "fx-radio-group__legend fx-visually-hidden" : "fx-radio-group__legend"}>
        {legend}
        {required && <span className="fx-field__required" aria-hidden="true">*</span>}
      </legend>
      <div className="fx-radio-group__options">
        {options.map((o) => (
          <Radio
            key={o.value}
            name={name}
            value={o.value}
            label={o.label}
            description={o.description}
            disabled={o.disabled}
            required={required}
            {...(controlled ? { checked: value === o.value } : { defaultChecked: defaultValue === o.value })}
            onChange={(e) => e.target.checked && onChange?.(o.value)}
          />
        ))}
      </div>
    </fieldset>
  );
}
