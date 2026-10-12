import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  /** FDS-101 `Icon` (24px, in a circle). Decorative. */
  icon?: ReactNode;
  /** FDS-101 `Show Action`: usually a primary Button. */
  action?: ReactNode;
  /** Heading level for the title so it fits the host page outline. */
  headingLevel?: 2 | 3 | 4;
  /** Compact: no card chrome, for use inside panels (e.g. "No comments yet"). */
  compact?: boolean;
}

/** FDS-101 Empty State (node 343:83). */
export function EmptyState({ title, description, icon, action, headingLevel = 3, compact }: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className={compact ? "fx-empty fx-empty--compact" : "fx-empty"}>
      {icon && <span className="fx-empty__icon" aria-hidden="true">{icon}</span>}
      <Heading className="fx-empty__title">{title}</Heading>
      {description && <p className="fx-empty__description">{description}</p>}
      {action && <div className="fx-empty__action">{action}</div>}
    </div>
  );
}
