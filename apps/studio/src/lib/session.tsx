import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { StudioMeta, StudioUser } from "../../shared/types";
import { api, setApiUser } from "./api";
import { load, save } from "./storage";

interface Session {
  user: StudioUser | null;
  setUser: (u: StudioUser | null) => void;
  meta: StudioMeta | null;
  metaError: string | null;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<StudioUser | null>(() => load<StudioUser | null>("fdi.studio.user", null));
  const [meta, setMeta] = useState<StudioMeta | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [theme, setThemeState] = useState<"light" | "dark">(() => load("fdi.studio.theme", "light"));

  setApiUser(user);

  useEffect(() => {
    api.meta().then(setMeta, (e: Error) => setMetaError(e.message));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Drop a stored identity whose role no longer exists in governance config.
  useEffect(() => {
    if (meta && user && !meta.roles.includes(user.role)) setUserState(null);
  }, [meta, user]);

  const value = useMemo<Session>(
    () => ({
      user,
      setUser: (u) => {
        save("fdi.studio.user", u);
        setApiUser(u);
        setUserState(u);
      },
      meta,
      metaError,
      theme,
      setTheme: (t) => {
        save("fdi.studio.theme", t);
        setThemeState(t);
      },
    }),
    [user, meta, metaError, theme]
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession outside SessionProvider");
  return ctx;
}
