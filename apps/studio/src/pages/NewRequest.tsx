import { Alert, Button, Card, TextArea, TextField } from "@fynxt/ui";
import { Paperclip, X } from "lucide-react";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";
import { navigate } from "../lib/router";
import { useSession } from "../lib/session";

const ACCEPT = ".pdf,.docx,.doc,.md,.txt,.png,.jpg,.jpeg,.webp,.gif,.svg,.xlsx,.csv,.pptx,.json";
const MAX_FILES = 10;
const MAX_BYTES = 25 * 1024 * 1024;

const prettySize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

export function NewRequestPage() {
  const { meta } = useSession();
  const [title, setTitle] = useState("");
  const [module, setModule] = useState("");
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const titleError = touched && !title.trim() ? "Give the request a short title." : null;
  const bodyError = touched && !description.trim() && files.length === 0 ? "Describe the requirement or attach a document." : null;

  function addFiles(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    const tooBig = picked.filter((f) => f.size > MAX_BYTES);
    if (tooBig.length) setError(`${tooBig.map((f) => f.name).join(", ")} is larger than 25 MB.`);
    setFiles((prev) => [...prev, ...picked.filter((f) => f.size <= MAX_BYTES)].slice(0, MAX_FILES));
    e.target.value = "";
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!title.trim() || (!description.trim() && files.length === 0)) return;
    setSubmitting(true);
    setError(null);
    const form = new FormData();
    form.set("title", title.trim());
    form.set("module", module.trim());
    form.set("description", description);
    form.set("links", links);
    files.forEach((f) => form.append("files", f, f.name));
    try {
      const created = await api.createCase(form);
      navigate(`/cases/${created.id}${created.runError ? "?queued=1" : ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="New design request"
        description="Share what the product needs. FDI reads it, searches the template and component libraries, and writes a Design Case File for review."
      />
      {meta && !meta.agentReady && (
        <Alert status="warning" title="FDI is not configured">
          Your request will be saved, but FDI can't start the case file until this is fixed: {meta.agentProblem}
        </Alert>
      )}
      <Card as="section" className="form-card">
        <form onSubmit={submit} className="stack" noValidate>
          <TextField
            label="Title"
            required
            maxLength={140}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Leads list with bulk assignment"
            status={titleError ? "error" : "default"}
            helperText={titleError ?? undefined}
          />
          <TextField
            label="Module"
            value={module}
            onChange={(e) => setModule(e.target.value)}
            placeholder="e.g. CRM › Sales"
            helperText="Where in the product this belongs."
          />
          <TextArea
            label="Requirement"
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What problem are we solving, for whom, and what must the page do? Include business rules, permissions and anything you already know is out of scope."
            status={bodyError ? "error" : "default"}
            helperText={bodyError ?? "FDI only uses rules that are written down. Anything it can't find a source for becomes an open question."}
          />
          <TextArea
            label="Links"
            rows={2}
            value={links}
            onChange={(e) => setLinks(e.target.value)}
            placeholder="Figma, PRD/FRD, tickets — one per line"
            helperText="Only http(s) links are kept."
          />
          <div className="field-like">
            <span className="field-like__label" id="files-label">
              Attachments
            </span>
            <div className="dropzone">
              <input
                ref={fileInput}
                id="files"
                type="file"
                multiple
                accept={ACCEPT}
                className="fx-visually-hidden"
                aria-labelledby="files-label"
                aria-describedby="files-help"
                onChange={addFiles}
              />
              <Button variant="secondary" leadingIcon={<Paperclip />} onClick={() => fileInput.current?.click()} disabled={files.length >= MAX_FILES}>
                Attach PRD, FRD, wireframes…
              </Button>
              <p id="files-help" className="muted">
                PDF, Word, Markdown, images, spreadsheets. Up to {MAX_FILES} files, 25 MB each.
              </p>
              {files.length > 0 && (
                <ul className="file-list">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`}>
                      <span>{f.name}</span>
                      <span className="muted">{prettySize(f.size)}</span>
                      <Button variant="ghost" size="s" aria-label={`Remove ${f.name}`} leadingIcon={<X />} onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {error && <Alert status="error" title="Couldn't submit">{error}</Alert>}
          <div className="row-end">
            <Button variant="ghost" onClick={() => navigate("/")}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Submit to FDI
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
