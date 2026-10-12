import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Spinner } from "../Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "s" | "m" | "l";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** FDS-101 Button `Variant`. */
  variant?: ButtonVariant;
  /** FDS-101 Button `Size`: S 32px, M 40px, L 48px. */
  size?: ButtonSize;
  /** FDS-101 `State=Loading`. Disables the button and announces busy state. */
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

/** FDS-101 Button (node 62:745). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "m", loading = false, leadingIcon, trailingIcon, disabled, className, children, type = "button", ...rest },
  ref
) {
  const classes = ["fx-btn", `fx-btn--${variant}`, `fx-btn--${size}`, className].filter(Boolean).join(" ");
  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : leadingIcon && <span className="fx-btn__icon" aria-hidden="true">{leadingIcon}</span>}
      {children !== undefined && <span className="fx-btn__label">{children}</span>}
      {!loading && trailingIcon && <span className="fx-btn__icon" aria-hidden="true">{trailingIcon}</span>}
    </button>
  );
});
