import type { ReactNode } from "react";

export interface TopNavProps {
  /** Page title (h1). */
  title: string;
  /** Right-side controls: settings, notifications, language, avatar (FDS-101 Top Nav toggles). */
  actions?: ReactNode;
}

/** FDS-101 Top Nav (141:117), Desktop: page title + global actions. */
export function TopNav({ title, actions }: TopNavProps) {
  return (
    <header className="fx-topnav">
      <h1 className="fx-topnav__title">{title}</h1>
      {actions && <div className="fx-topnav__actions">{actions}</div>}
    </header>
  );
}

export interface AppShellProps {
  /** Usually a SideNav. */
  nav: ReactNode;
  /** Usually a TopNav. */
  header: ReactNode;
  children: ReactNode;
}

/**
 * DCF-0001 candidate App Shell (work file 22:3867): side navigation, header and the page content
 * slot (`<main>`). Overlaps FDS-101 App Shell 407:456 (C9).
 */
export function AppShell({ nav, header, children }: AppShellProps) {
  return (
    <div className="fx-appshell">
      {nav}
      <div className="fx-appshell__main">
        {header}
        <main className="fx-appshell__content">{children}</main>
      </div>
    </div>
  );
}
