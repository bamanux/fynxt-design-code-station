import { Alert, Badge, Button, Card, Modal } from "@fynxt/ui";
import { ExternalLink, MessageSquarePlus } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import type { GalleryEntry } from "../../shared/types";
import { pages } from "../../gallery/registry";
import { EmptyState, PageHeader } from "../components/PageHeader";
import { RequestForm } from "../components/RequestForm";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";
import { Link, navigate } from "../lib/router";
import { useSession } from "../lib/session";
import { useAsync } from "../lib/useAsync";

/** Module › Section › pages, in first-seen order. */
function group(entries: GalleryEntry[]) {
  const modules = new Map<string, Map<string, GalleryEntry[]>>();
  for (const e of entries) {
    const sections = modules.get(e.module) ?? new Map<string, GalleryEntry[]>();
    sections.set(e.section, [...(sections.get(e.section) ?? []), e]);
    modules.set(e.module, sections);
  }
  return [...modules.entries()].map(([module, sections]) => ({ module, sections: [...sections.entries()].map(([section, items]) => ({ section, items })) }));
}

export function GalleryPage({ pageId }: { pageId: string | null }) {
  const { meta } = useSession();
  const lib = useAsync(api.library, []);
  const entries = lib.data?.galleryEntries ?? [];
  const entry = entries.find((e) => e.id === pageId) ?? null;
  const [requesting, setRequesting] = useState(false);
  const Page = useMemo(() => {
    const loader = pageId ? pages[pageId] : undefined;
    return loader ? lazy(loader) : null;
  }, [pageId]);

  return (
    <>
      <PageHeader
        title="Gallery"
        description="Pages built by FDI, organised by product menu: published pages and pages still in review. Open a page and use Request a change to send FDI a new requirement for it."
      />
      {lib.error && <Alert status="error">{lib.error}</Alert>}
      {entries.length === 0 && !lib.loading ? (
        <EmptyState title="No pages yet">Pages appear here once FDI builds them for review, and stay after they are published.</EmptyState>
      ) : (
        <div className="gallery">
          <nav aria-label="Gallery pages" className="gallery__menu">
            {group(entries).map((m) => (
              <div key={m.module}>
                <p className="gallery__module">{m.module}</p>
                {m.sections.map((s) => (
                  <div key={s.section}>
                    <p className="muted">{s.section}</p>
                    <ul>
                      {s.items.map((p) => (
                        <li key={p.id}>
                          <Link href={`/gallery/${p.id}`} aria-current={p.id === pageId ? "page" : undefined}>
                            {p.label}
                            {!p.published && <span className="gallery__tag">In review</span>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </nav>
          <div className="gallery__main">
            {entry && (
              <Card as="section" aria-label="About this page">
                <div className="gallery__bar">
                <div className="gallery__bar-info">
                  <p className="gallery__bar-title">{entry.label}</p>
                  <p className="muted">
                    {entry.module} › {entry.section}
                    {entry.template && <> · template {entry.template}</>}
                  </p>
                </div>
                <div className="gallery__bar-meta">
                  {entry.published ? <Badge status="success">Published</Badge> : entry.caseStatus && <StatusBadge status={entry.caseStatus} />}
                  {entry.caseId && <Link href={`/cases/${entry.caseId}`}>Case {entry.caseId}</Link>}
                  <a className="gallery__open" href={`/preview.html?page=${encodeURIComponent(entry.id)}`} target="_blank" rel="noreferrer">
                    Open full page <ExternalLink aria-hidden="true" />
                  </a>
                  <Button leadingIcon={<MessageSquarePlus />} onClick={() => setRequesting(true)}>
                    Request a change
                  </Button>
                </div>
                </div>
              </Card>
            )}
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
        </div>
      )}

      {entry && (
        <Modal open={requesting} onClose={() => setRequesting(false)} title={`Request a change to ${entry.label}`} size="large">
          <div className="stack">
            <p className="muted">
              FDI opens a new case for this change, linked to {entry.caseId ? `case ${entry.caseId}` : "this page"}. It reuses the page's approved decisions, components and template, then
              takes the change through case-file, design and code review like any other request.
            </p>
            {meta && !meta.agentReady && (
              <Alert status="warning" title="FDI is not configured">
                Your request will be saved, but FDI can't start until this is fixed: {meta.agentProblem}
              </Alert>
            )}
            <RequestForm
              initialTitle={`Change to ${entry.label}`}
              initialModule={`${entry.module} › ${entry.section}`}
              changeOfPage={entry.id}
              requirementPlaceholder="What should change on this page, and why? Name the step, field or state, and attach screenshots or documents if you have them."
              submitLabel="Send to FDI"
              onCancel={() => setRequesting(false)}
              onCreated={(created) => navigate(`/cases/${created.id}${created.runError ? "?queued=1" : ""}`)}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
