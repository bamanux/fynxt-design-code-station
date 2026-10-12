/**
 * Dev-only full-page preview of a registered gallery page, before it is published to menu.json.
 * Open /preview.html?page=<page id>, e.g. /preview.html?page=crm.tickets-activities.tasks
 */
import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "@fynxt/ui/styles.css";
import { pages } from "../gallery/registry";

const pageId = new URLSearchParams(window.location.search).get("page") ?? "";
const loader = pages[pageId];
const Page = loader ? lazy(loader) : null;

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");
createRoot(root).render(
  <StrictMode>
    {Page ? (
      <Suspense fallback={<p>Loading page…</p>}>
        <Page />
      </Suspense>
    ) : (
      <main style={{ padding: "var(--fx-spacing-6)", fontFamily: "var(--fx-font-family-body)" }}>
        <h1>Page preview</h1>
        <p>{pageId ? `"${pageId}" is not registered in apps/studio/gallery/registry.ts.` : "Add ?page=<page id> to the URL."}</p>
        <ul>
          {Object.keys(pages).map((id) => (
            <li key={id}>
              <a href={`?page=${id}`}>{id}</a>
            </li>
          ))}
        </ul>
      </main>
    )}
  </StrictMode>
);
