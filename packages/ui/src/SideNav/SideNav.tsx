import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

export interface SideNavItem {
  id: string;
  label: string;
  /** Top-level items show an icon (also used by the collapsed rail). */
  icon?: ReactNode;
  href?: string;
  children?: SideNavItem[];
}

export interface SideNavProps {
  items: SideNavItem[];
  /** Id of the current page's item. Its group is highlighted. */
  activeId: string;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  /** Tenant logo (expanded) and logo mark (collapsed). */
  logo: ReactNode;
  logoMark: ReactNode;
  /** Called for items without `href` (SPA routing). */
  onNavigate?: (id: string) => void;
  /** Accessible name of the navigation landmark. */
  label?: string;
}

const contains = (item: SideNavItem, id: string): boolean => item.id === id || Boolean(item.children?.some((c) => contains(c, id)));

/**
 * DCF-0001 candidate Side Nav (work file 21:3687): collapsible navigation matching the live product
 * (I2/I3). Expanded = groups of Sidebar Nav Items (FDS-101 135:1006); Collapsed = icon rail
 * (FDS-101 Nav Rail Item 360:12). Overlaps FDS-101 Side Navigation (C9).
 */
export function SideNav({ items, activeId, collapsed, onCollapsedChange, logo, logoMark, onNavigate, label = "Main" }: SideNavProps) {
  const baseId = useId();
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(items.map((i) => [i.id, true])));

  const link = (item: SideNavItem, className: string, content: ReactNode, ariaLabel?: string) => {
    const current = item.id === activeId ? "page" : undefined;
    return item.href ? (
      <a className={className} href={item.href} aria-current={current} aria-label={ariaLabel} title={ariaLabel}>
        {content}
      </a>
    ) : (
      <button type="button" className={className} aria-current={current} aria-label={ariaLabel} title={ariaLabel} onClick={() => onNavigate?.(item.id)}>
        {content}
      </button>
    );
  };

  return (
    <nav aria-label={label} className={collapsed ? "fx-sidenav fx-sidenav--collapsed" : "fx-sidenav"}>
      <div className="fx-sidenav__brand">{collapsed ? logoMark : logo}</div>
      <button
        type="button"
        className="fx-sidenav__collapse"
        aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        aria-expanded={!collapsed}
        onClick={() => onCollapsedChange(!collapsed)}
      >
        {collapsed ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
      </button>
      {collapsed ? (
        <ul className="fx-sidenav__rail">
          {items.map((item) => (
            <li key={item.id}>
              {item.children?.length ? (
                <button
                  type="button"
                  className="fx-sidenav__rail-item"
                  data-active={contains(item, activeId) || undefined}
                  aria-label={item.label}
                  title={item.label}
                  onClick={() => onCollapsedChange(false)}
                >
                  <span aria-hidden="true">{item.icon}</span>
                </button>
              ) : (
                link(item, "fx-sidenav__rail-item", <span aria-hidden="true">{item.icon}</span>, item.label)
              )}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="fx-sidenav__list">
          {items.map((item) => {
            const groupActive = contains(item, activeId);
            const hasChildren = Boolean(item.children?.length);
            const isOpen = open[item.id] ?? true;
            const childListId = `${baseId}-${item.id}`;
            const parentContent = (
              <>
                <span className="fx-sidenav__icon" aria-hidden="true">{item.icon}</span>
                <span className="fx-sidenav__label">{item.label}</span>
                {hasChildren && (isOpen ? <ChevronUp className="fx-sidenav__chevron" aria-hidden="true" /> : <ChevronDown className="fx-sidenav__chevron" aria-hidden="true" />)}
              </>
            );
            return (
              <li key={item.id}>
                {hasChildren ? (
                  <button
                    type="button"
                    className="fx-sidenav__parent"
                    data-active={groupActive || undefined}
                    aria-expanded={isOpen}
                    aria-controls={childListId}
                    onClick={() => setOpen((o) => ({ ...o, [item.id]: !isOpen }))}
                  >
                    {parentContent}
                  </button>
                ) : (
                  link(item, `fx-sidenav__parent${groupActive ? " fx-sidenav__parent--active" : ""}`, parentContent)
                )}
                {hasChildren && (
                  <ul id={childListId} className="fx-sidenav__children" hidden={!isOpen}>
                    {item.children?.map((child) => (
                      <li key={child.id}>{link(child, "fx-sidenav__child", <span className="fx-sidenav__label">{child.label}</span>)}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
