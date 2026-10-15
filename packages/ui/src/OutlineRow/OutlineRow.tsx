import { CircleAlert, CircleCheck, GripVertical, Zap } from "lucide-react";
import type { ReactNode } from "react";

export interface OutlineRowProps {
  name: string;
  /** Right-aligned value, e.g. the weight "40%" or "No values". */
  meta?: string;
  status: "complete" | "incomplete";
  /** Read with the status icon, e.g. "Complete" or "No values yet". */
  statusLabel?: string;
  selected?: boolean;
  /** Shows the override marker (DCF-0002 rev 3) and announces it. */
  override?: boolean;
  onSelect: () => void;
  /** Hover / focus actions (e.g. Duplicate, Remove IconButtons, DCF-0002 D30). */
  actions?: ReactNode;
}

/**
 * DCF-0002 candidate Outline Attribute Row (work file 80:18985): compact 40px row for the logic
 * outline: drag handle (shown on hover / selected), completion status, name, override marker,
 * weight, and optional hover actions. Weight is edited in the attribute editor (D20).
 */
export function OutlineRow({ name, meta, status, statusLabel, selected, override, onSelect, actions }: OutlineRowProps) {
  const Icon = status === "complete" ? CircleCheck : CircleAlert;
  const statusText = statusLabel ?? (status === "complete" ? "Complete" : "Incomplete");
  return (
    <div className="fx-outline-row" data-selected={selected || undefined} data-status={status}>
      <span className="fx-outline-row__grip" aria-hidden="true">
        <GripVertical />
      </span>
      <button type="button" className="fx-outline-row__main" aria-current={selected ? "true" : undefined} onClick={onSelect}>
        <Icon className="fx-outline-row__status" aria-hidden="true" />
        <span className="fx-outline-row__name">{name}</span>
        {override && <Zap className="fx-outline-row__override" aria-hidden="true" />}
        {meta && <span className="fx-outline-row__meta">{meta}</span>}
        <span className="fx-visually-hidden">
          {`, ${statusText}`}
          {override ? ", has override rules" : ""}
        </span>
      </button>
      {actions && <span className="fx-outline-row__actions">{actions}</span>}
    </div>
  );
}
