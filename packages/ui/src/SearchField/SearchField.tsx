import { Search, X } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size" | "onChange"> {
  /** Accessible name (the field has no visible label). */
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** sm = 32px on surface/card, as in the approved toolbar (DCF-0001). */
  size?: "md" | "sm";
}

/** FDS-101 Table Search Field (node 432:22033): leading search icon, clear button when filled. */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { label, value, onChange, placeholder = "Search…", className, disabled, size = "md", ...rest },
  ref
) {
  return (
    <div className={["fx-search", size === "sm" && "fx-search--sm", className].filter(Boolean).join(" ")} data-disabled={disabled || undefined}>
      <Search className="fx-search__icon" aria-hidden="true" />
      <input
        ref={ref}
        type="search"
        role="searchbox"
        aria-label={label}
        className="fx-search__input"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
      {value && !disabled && (
        <button type="button" className="fx-search__clear" aria-label="Clear search" onClick={() => onChange("")}>
          <X aria-hidden="true" />
        </button>
      )}
    </div>
  );
});
