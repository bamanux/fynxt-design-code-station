import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

export type AlertStatus = "info" | "success" | "warning" | "error";

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  status?: AlertStatus;
  title?: ReactNode;
  /** Optional trailing action, e.g. a ghost Button. */
  action?: ReactNode;
}

const ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: AlertCircle } as const;

/** FDS-101 Alert (node 65:45). Errors and warnings use role="alert"; others role="status". */
export function Alert({ status = "info", title, action, children, className, role, ...rest }: AlertProps) {
  const Icon = ICONS[status];
  return (
    <div
      role={role ?? (status === "error" || status === "warning" ? "alert" : "status")}
      className={["fx-alert", `fx-alert--${status}`, className].filter(Boolean).join(" ")}
      {...rest}
    >
      <Icon className="fx-alert__icon" aria-hidden="true" strokeWidth={2} />
      <div className="fx-alert__body">
        {title && <p className="fx-alert__title">{title}</p>}
        {children && <div className="fx-alert__text">{children}</div>}
      </div>
      {action && <div className="fx-alert__action">{action}</div>}
    </div>
  );
}
