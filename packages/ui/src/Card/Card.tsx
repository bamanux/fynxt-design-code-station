import type { HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** FDS-101 Card `Variant`. */
  variant?: "flat" | "elevated";
  /** Semantic element. Use `section`/`article` when the card has its own heading. */
  as?: "div" | "section" | "article" | "li";
}

/** FDS-101 Card (node 74:46). */
export function Card({ variant = "flat", as: Tag = "div", className, ...rest }: CardProps) {
  return <Tag className={["fx-card", `fx-card--${variant}`, className].filter(Boolean).join(" ")} {...rest} />;
}
