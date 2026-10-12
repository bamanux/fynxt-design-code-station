import { X } from "lucide-react";
import type { ReactNode } from "react";

export interface EntityChipProps {
  label: string;
  /** Record-type icon (user, deal, account, lead). */
  icon?: ReactNode;
  /** When set, the underlined label opens the record. */
  onOpen?: () => void;
  /** When set, a remove button named "Remove {label}" is shown (live product, DCF-0001 I2). */
  onRemove?: () => void;
}

/** FDS-101 Entity Chip (node 361:2). Linked-record chip. */
export function EntityChip({ label, icon, onOpen, onRemove }: EntityChipProps) {
  return (
    <span className="fx-entity-chip">
      {icon && <span className="fx-entity-chip__icon" aria-hidden="true">{icon}</span>}
      {onOpen ? (
        <button type="button" className="fx-entity-chip__link" onClick={onOpen}>
          {label}
        </button>
      ) : (
        <span className="fx-entity-chip__label">{label}</span>
      )}
      {onRemove && (
        <button type="button" className="fx-entity-chip__remove" aria-label={`Remove ${label}`} onClick={onRemove}>
          <X aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
