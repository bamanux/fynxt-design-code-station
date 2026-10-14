import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  /** Ancestors first; the last item is the current page. */
  items: BreadcrumbItem[];
}

/** FDS-101 Breadcrumb (node 73:14). */
export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="fx-breadcrumb">
      <ol className="fx-breadcrumb__list">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="fx-breadcrumb__item">
              {last ? (
                <span aria-current="page" className="fx-breadcrumb__current">{item.label}</span>
              ) : item.href ? (
                <a className="fx-breadcrumb__link" href={item.href} onClick={item.onClick}>{item.label}</a>
              ) : item.onClick ? (
                <button type="button" className="fx-breadcrumb__link" onClick={item.onClick}>{item.label}</button>
              ) : (
                <span className="fx-breadcrumb__text">{item.label}</span>
              )}
              {!last && <ChevronRight className="fx-breadcrumb__sep" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
