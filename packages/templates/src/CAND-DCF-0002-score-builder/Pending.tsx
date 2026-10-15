import { IconButton, Tooltip, type IconButtonProps } from "@fynxt/ui";
import type { ReactNode } from "react";
import type { PendingControl } from "./types";

/**
 * A control that is in the approved design but has no specified behaviour yet. It renders as in the
 * design, is announced as unavailable and explains why on hover / focus (DCF-0001 precedent).
 */
export function PendingIconButton({ control, icon, variant = "ghost", size }: { control: PendingControl; icon: ReactNode; variant?: IconButtonProps["variant"]; size?: IconButtonProps["size"] }) {
  return (
    <Tooltip content={control.pendingReason}>
      <IconButton variant={variant} size={size} label={control.label} icon={icon} aria-disabled="true" onClick={(e) => e.preventDefault()} />
    </Tooltip>
  );
}
