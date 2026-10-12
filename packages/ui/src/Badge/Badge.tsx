import type { HTMLAttributes } from "react";

export type BadgeStatus = "neutral" | "primary" | "success" | "warning" | "error" | "info";
export type BadgeStyle = "soft" | "solid";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status?: BadgeStatus;
  /** FDS-101 Badge `Style`. Named `tone` to avoid clashing with the DOM `style` prop. */
  tone?: BadgeStyle;
}

/** FDS-101 Badge (node 64:39). */
export function Badge({ status = "neutral", tone = "soft", className, ...rest }: BadgeProps) {
  return <span className={["fx-badge", `fx-badge--${status}`, `fx-badge--${tone}`, className].filter(Boolean).join(" ")} {...rest} />;
}
