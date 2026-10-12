import { ChevronDown } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";

export interface FilterChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  /** Filter name, e.g. "Status". */
  label: string;
  /** Applied value, e.g. "In-progress". Absent = filter not applied (FDS-101 default state). */
  value?: string;
}

/**
 * FDS-101 Filter chip (node 432:22480). A trigger button: pair it with Menu (`renderTrigger`)
 * to pick the value. Active when a value is applied.
 */
export const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(function FilterChip(
  { label, value, className, type = "button", ...rest },
  ref
) {
  const active = Boolean(value);
  return (
    <button
      ref={ref}
      type={type}
      aria-label={active ? `${label}: ${value}` : label}
      className={["fx-filter-chip", active && "fx-filter-chip--active", className].filter(Boolean).join(" ")}
      {...rest}
    >
      <span className="fx-filter-chip__label">{label}</span>
      {active && <span className="fx-filter-chip__value">: {value}</span>}
      <ChevronDown className="fx-filter-chip__chevron" aria-hidden="true" />
    </button>
  );
});
