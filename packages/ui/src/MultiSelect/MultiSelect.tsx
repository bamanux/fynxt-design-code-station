import { ChevronDown } from "lucide-react";
import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Chip } from "../Chip";
import type { FieldStatus } from "../Field";

export interface MultiSelectOption {
  value: string;
  label: string;
  /** Optional leading visual for the option and its chip (e.g. an Avatar). */
  leading?: ReactNode;
}

export interface MultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  required?: boolean;
  status?: FieldStatus;
  helperText?: ReactNode;
  disabled?: boolean;
  /** Text shown when the search matches nothing. */
  noResultsText?: string;
  /** Leading icon in the box, e.g. a search icon (FDS-101 Search Multi-Select 57:87). */
  leadingIcon?: ReactNode;
  /** Hide the label visually but keep it for assistive tech (e.g. a table cell, DCF-0002 Q27). */
  hideLabel?: boolean;
}

/**
 * FDS-101 Search Multi-Select (57:87) / Multi Select (56:85): searchable list, selections as
 * removable chips. WAI-ARIA combobox (list autocomplete) with a multi-selectable listbox.
 */
export function MultiSelect({
  label,
  hideLabel,
  options,
  value,
  onChange,
  placeholder = "Search…",
  required,
  status = "default",
  helperText,
  disabled,
  noResultsText = "No matches",
  leadingIcon,
}: MultiSelectProps) {
  const id = useId();
  const listId = `${id}-list`;
  const helperId = `${id}-helper`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);
  const selected = value.map((v) => options.find((o) => o.value === v)).filter((o): o is MultiSelectOption => Boolean(o));

  const toggle = (opt: MultiSelectOption) => {
    onChange(value.includes(opt.value) ? value.filter((v) => v !== opt.value) : [...value, opt.value]);
    setQuery("");
    inputRef.current?.focus();
  };

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      const opt = filtered[active];
      if (opt) toggle(opt);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && query === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  const activeOption = open ? filtered[active] : undefined;
  return (
    <div className="fx-field fx-multiselect" data-status={status} data-disabled={disabled || undefined}>
      <label htmlFor={id} className={hideLabel ? "fx-visually-hidden" : "fx-field__label"}>
        {label}
        {required && <span className="fx-field__required" aria-hidden="true">*</span>}
      </label>
      <div className="fx-multiselect__box" onClick={() => inputRef.current?.focus()}>
        {leadingIcon && <span className="fx-multiselect__leading" aria-hidden="true">{leadingIcon}</span>}
        {selected.map((opt) => (
          <Chip key={opt.value} label={opt.label} leading={opt.leading} onRemove={disabled ? undefined : () => onChange(value.filter((v) => v !== opt.value))} />
        ))}
        <input
          ref={inputRef}
          id={id}
          className="fx-multiselect__input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption ? `${id}-opt-${activeOption.value}` : undefined}
          aria-required={required || undefined}
          aria-invalid={status === "error" || undefined}
          aria-describedby={helperText ? helperId : undefined}
          value={query}
          placeholder={selected.length ? undefined : placeholder}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKey}
        />
        <ChevronDown className="fx-multiselect__chevron" aria-hidden="true" />
      </div>
      <ul role="listbox" id={listId} aria-label={label} aria-multiselectable="true" className="fx-multiselect__list" hidden={!open}>
        {filtered.length === 0 ? (
          <li className="fx-multiselect__empty" role="presentation">{noResultsText}</li>
        ) : (
          filtered.map((opt, i) => (
            <li
              key={opt.value}
              id={`${id}-opt-${opt.value}`}
              role="option"
              aria-selected={value.includes(opt.value)}
              className="fx-multiselect__option"
              data-active={i === active || undefined}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggle(opt)}
            >
              {opt.leading}
              <span>{opt.label}</span>
            </li>
          ))
        )}
      </ul>
      {helperText && (
        <p id={helperId} className="fx-field__helper" role={status === "error" ? "alert" : undefined}>
          {helperText}
        </p>
      )}
    </div>
  );
}
