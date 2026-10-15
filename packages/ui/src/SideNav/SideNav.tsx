import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Avatar } from "../Avatar";
import { SearchField } from "../SearchField";

export interface SideNavItem {
  id: string;
  label: string;
  /** Top-level items show an icon (also used by the collapsed rail). */
  icon?: ReactNode;
  href?: string;
  children?: SideNavItem[];
}

/** Settings menu that opens over the main menu (DCF-0002 D8 / D13 / D14). */
export interface SideNavSettings {
  /** Label of the bottom item and the Settings menu header, e.g. "Settings". */
  label: string;
  icon: ReactNode;
  items: SideNavItem[];
  /** Placeholder of the filter field in the Settings menu. Omit to hide the field. */
  searchPlaceholder?: string;
}

/** User tag at the bottom of the nav (DCF-0002 D8): avatar, name and a short line such as "ID: 100245 · Admin". */
export interface SideNavUser {
  name: string;
  meta?: string;
  avatarSrc?: string;
}

export type SideNavMode = "main" | "settings";

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
  /** Optional Settings menu, opened from the bottom of the nav. */
  settings?: SideNavSettings;
  /** Optional user tag, below a divider at the bottom of the nav. */
  user?: SideNavUser;
  /**
   * Which menu is shown. Uncontrolled by default: starts on Settings when the current page is a
   * Settings page. Switching menus never changes the page (D8).
   */
  mode?: SideNavMode;
  onModeChange?: (mode: SideNavMode) => void;
}

const contains = (item: SideNavItem, id: string): boolean => item.id === id || Boolean(item.children?.some((c) => contains(c, id)));

function filterTree(items: SideNavItem[], query: string): SideNavItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.flatMap((item) => {
    if (item.label.toLowerCase().includes(q)) return [item];
    const children = item.children ? filterTree(item.children, q) : [];
    return children.length ? [{ ...item, children }] : [];
  });
}

/**
 * DCF-0001 candidate Side Nav (work file 21:3687): collapsible navigation matching the live product
 * (I2/I3). Expanded = groups of Sidebar Nav Items (FDS-101 135:1006); Collapsed = icon rail
 * (FDS-101 Nav Rail Item 360:12). Overlaps FDS-101 Side Navigation (C9).
 * DCF-0002 variant (Mode = Main / Settings): optional Settings item + user tag at the bottom; the
 * Settings menu replaces the main menu, Back returns without navigating, and Settings stays
 * selected while a Settings page is open (D8, D13, D14).
 */
export function SideNav({
  items,
  activeId,
  collapsed,
  onCollapsedChange,
  logo,
  logoMark,
  onNavigate,
  label = "Main",
  settings,
  user,
  mode: modeProp,
  onModeChange,
}: SideNavProps) {
  const baseId = useId();
  const inSettings = Boolean(settings?.items.some((i) => contains(i, activeId)));
  const [modeState, setModeState] = useState<SideNavMode>(inSettings ? "settings" : "main");
  const mode = settings ? (modeProp ?? modeState) : "main";
  const setMode = (next: SideNavMode) => {
    setModeState(next);
    onModeChange?.(next);
  };
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries([...items, ...(settings?.items ?? [])].map((i) => [i.id, true])));
  const [query, setQuery] = useState("");

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

  const rail = (list: SideNavItem[]) =>
    list.map((item) => (
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
    ));

  const tree = (list: SideNavItem[]) =>
    list.map((item) => {
      const groupActive = contains(item, activeId);
      const hasChildren = Boolean(item.children?.length);
      const isOpen = query.trim() ? true : (open[item.id] ?? true);
      const childListId = `${baseId}-${item.id}`;
      const parentContent = (
        <>
          <span className="fx-sidenav__icon" aria-hidden="true">{item.icon}</span>
          <span className="fx-sidenav__label">{item.label}</span>
          {hasChildren && (isOpen ? <ChevronDown className="fx-sidenav__chevron" aria-hidden="true" /> : <ChevronRight className="fx-sidenav__chevron" aria-hidden="true" />)}
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
    });

  const showSettingsMenu = Boolean(settings) && mode === "settings";
  const backButton = (
    <button type="button" className={collapsed ? "fx-sidenav__rail-item" : "fx-sidenav__back"} aria-label="Back to main menu" title="Back to main menu" onClick={() => setMode("main")}>
      {collapsed ? <ArrowLeft aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
    </button>
  );

  // D13: the bottom Settings item is hidden while the Settings menu is open.
  const settingsEntry =
    settings && mode === "main" ? (
      collapsed ? (
        <button type="button" className="fx-sidenav__rail-item" data-active={inSettings || undefined} aria-label={settings.label} title={settings.label} onClick={() => setMode("settings")}>
          <span aria-hidden="true">{settings.icon}</span>
        </button>
      ) : (
        <button type="button" className={`fx-sidenav__parent${inSettings ? " fx-sidenav__parent--active" : ""}`} onClick={() => setMode("settings")}>
          <span className="fx-sidenav__icon" aria-hidden="true">{settings.icon}</span>
          <span className="fx-sidenav__label">{settings.label}</span>
        </button>
      )
    ) : null;

  return (
    <nav aria-label={label} className={collapsed ? "fx-sidenav fx-sidenav--collapsed" : "fx-sidenav"} data-mode={mode}>
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

      {showSettingsMenu && settings ? (
        collapsed ? (
          <ul className="fx-sidenav__rail" aria-label={settings.label}>
            <li>{backButton}</li>
            <li className="fx-sidenav__rail-divider" aria-hidden="true" />
            {rail(settings.items)}
          </ul>
        ) : (
          <div className="fx-sidenav__settings">
            <div className="fx-sidenav__settings-header">
              {backButton}
              <h2 className="fx-sidenav__settings-title">{settings.label}</h2>
            </div>
            {settings.searchPlaceholder && <SearchField size="sm" label={`Search ${settings.label.toLowerCase()}`} placeholder={settings.searchPlaceholder} value={query} onChange={setQuery} />}
            <ul className="fx-sidenav__list" aria-label={settings.label}>
              {tree(filterTree(settings.items, query))}
            </ul>
          </div>
        )
      ) : collapsed ? (
        <ul className="fx-sidenav__rail">{rail(items)}</ul>
      ) : (
        <ul className="fx-sidenav__list">{tree(items)}</ul>
      )}

      {(settingsEntry || user) && (
        <div className="fx-sidenav__bottom">
          {settingsEntry}
          {settingsEntry && user && <hr className="fx-sidenav__divider" />}
          {user && (
            <div className="fx-sidenav__user">
              <Avatar name={user.name} src={user.avatarSrc} online decorative={!collapsed} />
              {!collapsed && (
                <span className="fx-sidenav__user-text">
                  <span className="fx-sidenav__user-name">{user.name}</span>
                  {user.meta && <span className="fx-sidenav__user-meta">{user.meta}</span>}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
