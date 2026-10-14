import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { StudioMeta, StudioUser } from "../../shared/types";
import { api, ApiError } from "./api";
import { load, save } from "./storage";

interface Session {
  /** The signed-in Station user; null when signed out; undefined while checking. */
  user: StudioUser | null | undefined;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  meta: StudioMeta | null;
  metaError: string | null;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StudioUser | null | undefined>(undefined);
  const [meta, setMeta] = useState<StudioMeta | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [theme, setThemeState] = useState<"light" | "dark">(() => load("fdi.studio.theme", "light"));

  const refresh = useCallback(async () => {
    try {
      setUser(await api.me());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setUser(null);
      else throw e;
    }
  }, []);

  useEffect(() => {
    api.meta().then(setMeta, (e: Error) => setMetaError(e.message));
    refresh().catch((e: Error) => setMetaError(e.message));
  }, [refresh]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo<Session>(
    () => ({
      user,
      refresh,
      signOut: async () => {
        await api.signOut().catch(() => undefined);
        setUser(null);
      },
      meta,
      metaError,
      theme,
      setTheme: (t) => {
        save("fdi.studio.theme", t);
        setThemeState(t);
      },
    }),
    [user, refresh, meta, metaError, theme]
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession outside SessionProvider");
  return ctx;
}

/** For pages that only render once signed in (App guards this). */
export function useUser(): StudioUser {
  const { user } = useSession();
  if (!user) throw new Error("useUser while signed out");
  return user;
}
