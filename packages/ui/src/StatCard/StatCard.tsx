import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Tooltip } from "../Tooltip";

export interface StatCardProps {
  label: string;
  /** Displayed value. `null` renders an em dash (loading or unavailable). */
  value: ReactNode | null;
  /** FDS-101 `Caption`. Omitted in the compact Tasks Insights (DCF-0001 E2). */
  caption?: ReactNode;
  /** Help tooltip next to the label (DCF-0001 AC2). Not in FDS-101 Stat Card yet (Q34). */
  help?: string;
  /** Selected/pressed when used as a filter shortcut (live product shows a focus ring). */
  selected?: boolean;
  /** Compact tile (DCF-0001 E2): padding spacing/2. */
  density?: "default" | "compact";
}

/** FDS-101 Stat Card (node 359:54), compact form without the Delta badge. */
export function StatCard({ label, value, caption, help, selected, density = "default" }: StatCardProps) {
  return (
    <div className={density === "compact" ? "fx-stat fx-stat--compact" : "fx-stat"} data-selected={selected || undefined}>
      <div className="fx-stat__label-row">
        <span className="fx-stat__label">{label}</span>
        {help && (
          <Tooltip content={help}>
            <button type="button" className="fx-stat__help" aria-label={`About ${label}`}>
              <HelpCircle aria-hidden="true" />
            </button>
          </Tooltip>
        )}
      </div>
      <span className="fx-stat__value">{value ?? "—"}</span>
      {caption && <span className="fx-stat__caption">{caption}</span>}
    </div>
  );
}
