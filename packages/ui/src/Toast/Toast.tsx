import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import type { ReactNode } from "react";

export type ToastStatus = "info" | "success" | "warning" | "error";

export interface ToastProps {
  status?: ToastStatus;
  children: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
}

const ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: AlertCircle } as const;

/** FDS-101 Toast. Announced politely (role="status"); placement is the consumer's job. */
export function Toast({ status = "info", children, onClose, closeLabel = "Dismiss" }: ToastProps) {
  const Icon = ICONS[status];
  return (
    <div role="status" className={`fx-toast fx-toast--${status}`}>
      <Icon className="fx-toast__icon" aria-hidden="true" />
      <p className="fx-toast__text">{children}</p>
      {onClose && (
        <button type="button" className="fx-toast__close" aria-label={closeLabel} onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
