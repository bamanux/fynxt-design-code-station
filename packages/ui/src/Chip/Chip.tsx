import { X } from "lucide-react";
import type { ReactNode } from "react";

export interface ChipProps {
  label: string;
  /** Leading visual, e.g. an Avatar (FDS-101 `Avatar`) or icon (`Leading icon`). */
  leading?: ReactNode;
  /** FDS-101 `Removable`. Renders a remove button named "Remove {label}". */
  onRemove?: () => void;
  disabled?: boolean;
}

/** FDS-101 Chip / Selection (node 93:212), Type=Input. */
export function Chip({ label, leading, onRemove, disabled }: ChipProps) {
  return (
    <span className="fx-chip" data-disabled={disabled || undefined}>
      {leading && <span className="fx-chip__leading" aria-hidden="true">{leading}</span>}
      <span className="fx-chip__label">{label}</span>
      {onRemove && (
        <button type="button" className="fx-chip__remove" aria-label={`Remove ${label}`} onClick={onRemove} disabled={disabled}>
          <X aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
