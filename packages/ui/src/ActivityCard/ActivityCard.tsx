import { ChevronDown, ChevronUp } from "lucide-react";
import { useId, type ReactNode } from "react";

export interface ActivityCardDetail {
  /** Visible term, e.g. "Description", "Assigned to", "Status". */
  label: string;
  value: ReactNode;
  /** Layout hint: `full` takes its own row (description); `half` pairs with the next half item. */
  span?: "full" | "half";
}

export interface ActivityCardProps {
  title: string;
  /** Heading level for the title within the host page outline. */
  headingLevel?: 2 | 3 | 4;
  /** Header pills next to the title: tag Badge, scheduled-on pill, priority Badge. */
  meta?: ReactNode;
  /** Kebab menu (Menu + IconButton). */
  actions?: ReactNode;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** Expanded body rows. */
  details?: ActivityCardDetail[];
  /** Footer start, e.g. "Created by". */
  footerStart?: ReactNode;
  /** Footer end, e.g. comment IconButton (with count badge, DCF-0001 D1) and Follow Up Button. */
  footerEnd?: ReactNode;
  /** Extra expanded content below the footer (e.g. an open comments panel). */
  children?: ReactNode;
}

/**
 * FDS-101 Activity Card (GUNA, node 361:134). Density Compact = header only;
 * Expanded = description, details, footer. The disclosure button carries `aria-expanded`.
 */
export function ActivityCard({
  title,
  headingLevel = 3,
  meta,
  actions,
  expanded,
  onExpandedChange,
  details = [],
  footerStart,
  footerEnd,
  children,
}: ActivityCardProps) {
  const bodyId = useId();
  const Heading = `h${headingLevel}` as const;
  const Toggle = expanded ? ChevronUp : ChevronDown;
  return (
    <article className={expanded ? "fx-activity fx-activity--expanded" : "fx-activity"}>
      <div className="fx-activity__header">
        <Heading className="fx-activity__title">
          <button type="button" className="fx-activity__toggle" aria-expanded={expanded} aria-controls={bodyId} onClick={() => onExpandedChange(!expanded)}>
            <Toggle className="fx-activity__chevron" aria-hidden="true" />
            <span>{title}</span>
          </button>
        </Heading>
        {meta && <div className="fx-activity__meta">{meta}</div>}
        {actions && <div className="fx-activity__actions">{actions}</div>}
      </div>
      <div id={bodyId} className="fx-activity__body" hidden={!expanded}>
        {details.length > 0 && (
          <dl className="fx-activity__details">
            {details.map((d) => (
              <div key={d.label} className={`fx-activity__row fx-activity__row--${d.span ?? "full"}`}>
                <dt className="fx-activity__term">{d.label}:</dt>
                <dd className="fx-activity__value">{d.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {(footerStart || footerEnd) && (
          <div className="fx-activity__footer">
            <div className="fx-activity__footer-start">{footerStart}</div>
            <div className="fx-activity__footer-end">{footerEnd}</div>
          </div>
        )}
        {children}
      </div>
    </article>
  );
}
