import { Alert, Button, Modal, Select, Spinner, TextField } from "@fynxt/ui";
import { Code2, FileCode2, FolderOpen } from "lucide-react";
import { useState } from "react";
import type { CodeFiles } from "../../shared/types";
import { api } from "../lib/api";
import { load, save } from "../lib/storage";

type Query = { page: string } | { component: string } | { case: string };

/** Editors that open `<scheme>://file/<absolute path>[:line]` links. */
export const EDITORS = [
  { value: "vscode", label: "VS Code" },
  { value: "vscode-insiders", label: "VS Code Insiders" },
  { value: "cursor", label: "Cursor" },
] as const;

const EDITOR_KEY = "fdi.codeEditor";
/** Short name in the list (the group already says where): "Badge/Badge.tsx" for components, else the file name. */
const shortName = (path: string, group: string) => path.split("/").slice(group.startsWith("Components") ? -2 : -1).join("/");
const ROOT_KEY = "fdi.stationRoot";

/** `vscode://file/<root>/<path>`; spaces and other characters are encoded, slashes kept. */
export function editorUrl(editor: string, root: string, path: string): string {
  const abs = `${root.replace(/[\\/]+$/, "")}/${path}`.split("\\").join("/");
  const withSlash = abs.startsWith("/") ? abs : `/${abs}`;
  return `${editor}://file${encodeURI(withSlash)}`;
}

/**
 * "View code": lists the Station files behind a page, component or case and opens each one in the person's
 * editor (VS Code by default) to view, edit or review it there. The Station folder defaults to the Studio
 * machine's and can be set to your own clone; both choices are remembered in this browser.
 */
export function ViewCode({ query, label = "View code", size = "m" }: { query: Query; label?: string; size?: "s" | "m" }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CodeFiles | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<string>(() => load(EDITOR_KEY, "vscode"));
  const [root, setRoot] = useState<string>(() => load(ROOT_KEY, ""));

  async function show() {
    setOpen(true);
    setError(null);
    try {
      const d = await api.code(query);
      setData(d);
      if (!root) setRoot(d.root);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const base = root || data?.root || "";
  const groups = data ? [...new Set(data.files.map((f) => f.group))] : [];

  return (
    <>
      <Button variant="secondary" size={size} leadingIcon={<Code2 />} onClick={() => void show()}>
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={data ? `Code · ${data.title}` : "Code"} size="large">
        <div className="stack">
          <p className="muted">Each file opens in your editor, where you can read, edit and review it. Changes are saved in your Station working copy; commit them on the case branch.</p>
          <div className="code-settings">
            <Select label="Open in" options={EDITORS.map((e) => ({ value: e.value, label: e.label }))} value={editor} onChange={(e) => { setEditor(e.target.value); save(EDITOR_KEY, e.target.value); }} />
            <TextField
              label="My Station folder"
              helperText="Where the Station repo is on your computer. Defaults to the Studio machine's folder."
              value={base}
              onChange={(e) => { setRoot(e.target.value); save(ROOT_KEY, e.target.value); }}
            />
          </div>
          {error && <Alert status="error" title="Couldn't list the code">{error}</Alert>}
          {!data && !error && (
            <p className="row-gap muted" role="status"><Spinner /> Finding files…</p>
          )}
          {data?.note && <Alert status="info">{data.note}</Alert>}
          {data && data.folder && (
            <a className="code-folder" href={editorUrl(editor, base, data.folder)}>
              <FolderOpen aria-hidden="true" /> Open the folder {data.folder}
            </a>
          )}
          {data && data.files.length === 0 && !data.note && <p className="muted">No files found.</p>}
          {groups.map((g) => (
            <section key={g} aria-label={g} className="stack-tight">
              <h3 className="code-group">{g}</h3>
              {data!.folder && g.startsWith("Template") && <p className="muted">{data!.folder}</p>}
              <ul className="link-list">
                {data!.files.filter((f) => f.group === g).map((f) => (
                  <li key={f.path}>
                    {f.missing ? (
                      <span className="muted" title={f.path}><FileCode2 aria-hidden="true" className="inline-icon" /> {shortName(f.path, g)} (not in this checkout)</span>
                    ) : (
                      <a href={editorUrl(editor, base, f.path)} title={f.path} aria-label={`Open ${f.path}`}>
                        <FileCode2 aria-hidden="true" /> {shortName(f.path, g)}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Modal>
    </>
  );
}
