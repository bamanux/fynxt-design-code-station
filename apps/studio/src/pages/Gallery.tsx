import { Alert, Card } from "@fynxt/ui";
import { lazy, Suspense, useMemo } from "react";
import { pages } from "../../gallery/registry";
import { EmptyState, PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";
import { Link } from "../lib/router";
import { useAsync } from "../lib/useAsync";

export function GalleryPage({ pageId }: { pageId: string | null }) {
  const lib = useAsync(api.library, []);
  const modules = lib.data?.gallery ?? [];
  const Page = useMemo(() => {
    const loader = pageId ? pages[pageId] : undefined;
    return loader ? lazy(loader) : null;
  }, [pageId]);

  return (
    <>
      <PageHeader title="Gallery" description="Every published page, organised by product menu. A page is a template plus its configuration, so a fix to a template or component shows up here everywhere at once." />
      {lib.error && <Alert status="error">{lib.error}</Alert>}
      {modules.length === 0 && !lib.loading ? (
        <EmptyState title="No published pages yet">
          Pages appear here after a case passes case-file, design and code review and FDI publishes it.
        </EmptyState>
      ) : (
        <div className="gallery">
          <nav aria-label="Gallery pages" className="gallery__menu">
            {modules.map((m) => (
              <div key={m.id}>
                <p className="gallery__module">{m.label}</p>
                {m.sections.map((s) => (
                  <div key={s.id}>
                    <p className="muted">{s.label}</p>
                    <ul>
                      {s.pages.map((p) => (
                        <li key={p.id}>
                          <Link href={`/gallery/${p.id}`} aria-current={p.id === pageId ? "page" : undefined}>{p.label}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </nav>
          <Card className="gallery__stage">
            {Page ? (
              <Suspense fallback={<p className="muted">Loading page…</p>}>
                <Page />
              </Suspense>
            ) : (
              <EmptyState title={pageId ? "This page isn't registered in the Station" : "Choose a page"} />
            )}
          </Card>
        </div>
      )}
    </>
  );
}
