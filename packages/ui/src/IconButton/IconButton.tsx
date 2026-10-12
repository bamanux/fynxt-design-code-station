import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type IconButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "destructive";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /** Accessible name. Required: an icon-only button has no visible text. */
  label: string;
  icon: ReactNode;
  /** FDS-101 Icon Button `Variant`. */
  variant?: IconButtonVariant;
  /** FDS-101 Icon Button `Size`. */
  size?: IconButtonSize;
  /**
   * FDS-101 `Badge` property. `true` renders the status dot. A number renders a count
   * (DCF-0001 D1: comment count; app-shell notifications) and is announced with the label.
   */
  badge?: boolean | number;
}

/** FDS-101 Icon Button (node 106:1149). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = "secondary", size = "md", badge, className, type = "button", ...rest },
  ref
) {
  const count = typeof badge === "number" && badge > 0 ? badge : undefined;
  const accessibleName = count !== undefined ? `${label} (${count})` : label;
  return (
    <button
      ref={ref}
      type={type}
      aria-label={accessibleName}
      className={["fx-icon-btn", `fx-icon-btn--${variant}`, `fx-icon-btn--${size}`, className].filter(Boolean).join(" ")}
      {...rest}
    >
      <span className="fx-icon-btn__icon" aria-hidden="true">{icon}</span>
      {badge === true && <span className="fx-icon-btn__dot" aria-hidden="true" />}
      {count !== undefined && (
        <span className="fx-icon-btn__count" aria-hidden="true">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
});
