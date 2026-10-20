import { Alert, Badge, Button, Card, Modal, TextArea } from "@fynxt/ui";
import { Download, ExternalLink, MessageSquarePlus, MousePointerClick, X } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { GalleryEntry, PagePin } from "../../shared/types";
import { pages } from "../../gallery/registry";
import { EmptyState, PageHeader } from "../components/PageHeader";
import { RequestForm } from "../components/RequestForm";
import { StatusBadge } from "../components/StatusBadge";
import { ViewCode } from "../components/ViewCode";
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
  const [download, setDownload] = useState<{ busy: boolean; error: string | null; saved: string | null }>({ busy: false, error: null, saved: null });

  useEffect(() => setDownload({ busy: false, error: null, saved: null }), [pageId]);

  async function downloadPage(id: string) {
    setDownload({ busy: true, error: null, saved: null });
    try {
      setDownload({ busy: false, error: null, saved: await api.downloadPage(id) });
    } catch (err) {
      setDownload({ busy: false, error: err instanceof Error ? err.message : String(err), saved: null });
    }
  }
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
                  <Button variant="secondary" leadingIcon={<Download />} loading={download.busy} onClick={() => void downloadPage(entry.id)}>
                    Download
                  </Button>
                  <ViewCode query={{ page: entry.id }} />
                  <Button leadingIcon={<MessageSquarePlus />} onClick={() => setRequesting(true)}>
                    Request a change
                  </Button>
                </div>
                </div>
              </Card>
            )}
            {entry && download.error && <Alert status="error" title="Couldn't build the download">{download.error}</Alert>}
            {entry && download.saved && (
              <Alert status="success" title="Page downloaded">
                {download.saved} is one HTML file with everything inline. Send it to anyone: it opens in any browser, with demo data and no sign-in. It is a snapshot of the page now, not production code.
              </Alert>
            )}
            {entry && Page ? (
              <PinnedPage entry={entry}>
                <Suspense fallback={<p className="muted">Loading page…</p>}>
                  <Page />
                </Suspense>
              </PinnedPage>
            ) : (
              <Card className="gallery__stage">
                <EmptyState title={pageId ? "This page isn't registered in the Station" : "Choose a page"} />
              </Card>
            )}
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

type Draft = { x: number; y: number; hint: string } | null;

/** What was under the pointer: the nearest button, link, label or heading text. */
function hintAt(x: number, y: number): string {
  const el = document.elementFromPoint(x, y);
  const target = el?.closest("button, a, label, h1, h2, h3, th, td, legend, [role=tab]") ?? el;
  return (target?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
}

/**
 * The built page with pinned comments. In Comment mode a click drops a pin; each pin becomes §11 feedback on the
 * page's case, so the Product Designer can send it through case file → Figma → code.
 */
function PinnedPage({ entry, children }: { entry: GalleryEntry; children: React.ReactNode }) {
  const pins = useAsync(() => (entry.caseId ? api.pins(entry.id) : Promise.resolve([] as PagePin[])), [entry.id]);
  const [commenting, setCommenting] = useState(false);
  const [draft, setDraft] = useState<Draft>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);

  function place(e: MouseEvent<HTMLDivElement>) {
    const box = canvas.current!.getBoundingClientRect();
    // Look through the overlay to find what the person pointed at.
    overlay.current!.style.pointerEvents = "none";
    const hint = hintAt(e.clientX, e.clientY);
    overlay.current!.style.pointerEvents = "";
    setDraft({ x: ((e.clientX - box.left) / box.width) * 100, y: ((e.clientY - box.top) / box.height) * 100, hint });
    setText("");
    setError(null);
  }

  async function send() {
    if (!draft || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const pin = await api.addPin(entry.id, { ...draft, text });
      pins.setData([...(pins.data ?? []), pin]);
      setSent(`Comment ${pin.id} was added to case ${pin.caseId} as feedback ${pin.feedbackRef}.`);
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const form = draft && (
    <Card as="section" aria-label="New comment" className="pin-form">
      <p className="muted">{draft.hint ? `On “${draft.hint}”` : "General comment on this page"}</p>
      <TextArea label="What should change?" rows={3} autoFocus value={text} onChange={(e) => setText(e.target.value)} />
      {error && <Alert status="error">{error}</Alert>}
      <div className="row-end">
        <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
        <Button loading={busy} disabled={!text.trim()} onClick={() => void send()}>Send comment</Button>
      </div>
    </Card>
  );

  return (
    <div className="stack">
      {entry.caseId && (
        <div className="row-between">
          <p className="muted">{commenting ? "Click anywhere on the page to pin a comment. The page is paused while commenting." : `${pins.data?.length ?? 0} comment(s) on this page.`}</p>
          <span className="row-gap">
            <Button variant="ghost" size="s" onClick={() => setDraft({ x: 0, y: 0, hint: "" })}>Comment without pinning</Button>
            <Button variant={commenting ? "primary" : "secondary"} size="s" leadingIcon={commenting ? <X /> : <MousePointerClick />} aria-pressed={commenting} onClick={() => { setCommenting(!commenting); setDraft(null); }}>
              {commenting ? "Done commenting" : "Comment"}
            </Button>
          </span>
        </div>
      )}
      {sent && <Alert status="success" title="Comment sent">{sent}</Alert>}
      {draft && !commenting && form}
      <Card className="gallery__stage">
        <div className="pin-canvas" ref={canvas}>
          {children}
          {(pins.data ?? []).filter((p) => p.x || p.y).map((p) => (
            <span key={p.id} className="pin" style={{ left: `${p.x}%`, top: `${p.y}%` }} title={`${p.id} · ${p.author}: ${p.text}`} aria-hidden="true">{p.id.slice(1)}</span>
          ))}
          {commenting && <div ref={overlay} className="pin-overlay" onClick={place} aria-hidden="true" />}
          {commenting && draft && (
            <>
              <span className="pin pin--draft" style={{ left: `${draft.x}%`, top: `${draft.y}%` }} aria-hidden="true">+</span>
              <div className="pin-popover" style={{ left: `min(${draft.x}%, calc(100% - var(--fx-spacing-12) * 8))`, top: `${draft.y}%` }}>{form}</div>
            </>
          )}
        </div>
      </Card>
      {(pins.data?.length ?? 0) > 0 && (
        <Card as="section" aria-labelledby="pins-title">
          <h2 id="pins-title" className="fx-typo-heading-base">Comments on this page</h2>
          <ol className="pin-list">
            {pins.data!.map((p) => (
              <li key={p.id}>
                <strong>{p.id}</strong> {p.hint && <span className="muted">on “{p.hint}”</span>} — {p.text}
                <span className="muted"> · {p.author} · feedback {p.feedbackRef} in {p.caseId}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
