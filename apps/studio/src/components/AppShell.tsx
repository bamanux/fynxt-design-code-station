import { Button } from "@fynxt/ui";
import { FilePlus2, FolderKanban, LayoutDashboard, LayoutTemplate, Library, Moon, Sun, UserRound, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { Link, usePath } from "../lib/router";
import { useSession } from "../lib/session";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/new", label: "New request", icon: FilePlus2 },
  { href: "/cases", label: "Cases", icon: FolderKanban },
  { href: "/library", label: "Library", icon: Library },
  { href: "/gallery", label: "Gallery", icon: LayoutTemplate },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePath();
  const { user, signOut, theme, setTheme } = useSession();
  // Admin tools appear only for Admins; everything else is filtered by role and case membership on the server.
  const nav = user?.isAdmin ? [...NAV, { href: "/admin/users", label: "Users & roles", icon: UsersRound }] : NAV;
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <div className="studio">
      <a className="studio__skip" href="#main">
        Skip to content
      </a>
      <header className="studio__topbar">
        <Link href="/" className="studio__brand">
          <span className="studio__logo" aria-hidden="true">FDI</span>
          <span>
            <span className="studio__brand-name">FDI Studio</span>
            <span className="studio__brand-sub">FYNXT Design Inspector</span>
          </span>
        </Link>
        <div className="studio__user">
          <Button
            variant="ghost"
            size="s"
            aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            leadingIcon={theme === "light" ? <Moon /> : <Sun />}
          />
          <span className="studio__who">
            <UserRound aria-hidden="true" />
            <span>
              <strong>{user?.name}</strong>
              <span className="studio__role">
                {user?.roles.length ? user.roles.join(", ") : "No role yet"}
                {user?.isAdmin && " · Admin"}
              </span>
            </span>
          </span>
          <Button variant="secondary" size="s" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </header>
      <nav className="studio__nav" aria-label="Main">
        <ul>
          {nav.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="studio__nav-link" aria-current={active(href) ? "page" : undefined}>
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main id="main" className="studio__main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
