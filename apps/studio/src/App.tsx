import { AppShell } from "./components/AppShell";
import { SignIn } from "./components/SignIn";
import { match, RouterProvider, usePath } from "./lib/router";
import { SessionProvider, useSession } from "./lib/session";
import { AdminUsersPage } from "./pages/AdminUsers";
import { CaseDetailPage } from "./pages/CaseDetail";
import { CasesPage } from "./pages/Cases";
import { DashboardPage } from "./pages/Dashboard";
import { GalleryPage } from "./pages/Gallery";
import { LibraryPage } from "./pages/Library";
import { NewRequestPage } from "./pages/NewRequest";
import { NotFoundPage } from "./pages/NotFound";

function Routes() {
  const path = usePath();
  const { user } = useSession();
  if (user === undefined) return <p className="muted identity">Checking your sign-in…</p>;
  if (user === null) return <SignIn />;
  let page;
  let params: Record<string, string> | null;
  if (path === "/") page = <DashboardPage />;
  else if (path === "/new") page = <NewRequestPage />;
  else if (path === "/cases") page = <CasesPage />;
  else if ((params = match("/cases/:id", path))) page = <CaseDetailPage id={params.id!} />;
  else if (path === "/library") page = <LibraryPage />;
  else if (path === "/admin/users") page = user.isAdmin ? <AdminUsersPage /> : <NotFoundPage />;
  else if (path === "/gallery" || match("/gallery/:page", path)) page = <GalleryPage pageId={match("/gallery/:page", path)?.page ?? null} />;
  else page = <NotFoundPage />;
  return <AppShell>{page}</AppShell>;
}

export function App() {
  return (
    <SessionProvider>
      <RouterProvider>
        <Routes />
      </RouterProvider>
    </SessionProvider>
  );
}
