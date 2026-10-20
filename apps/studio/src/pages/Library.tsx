import { Alert, Badge, Button, Card, Select, Tabs, TextArea, TextField } from "@fynxt/ui";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { LibraryPayload, TokenEntry } from "../../shared/types";
import { EmptyState, PageHeader } from "../components/PageHeader";
import { ViewCode } from "../components/ViewCode";
import { api } from "../lib/api";
import { navigate } from "../lib/router";
import { useAsync } from "../lib/useAsync";

function Swatch({ token }: { token: TokenEntry }) {
  return (
    <li className="swatch">
      <span className="swatch__chip" style={{ background: `var(${token.cssVar})` }} aria-hidden="true" />
      <span className="swatch__name">{token.name}</span>
      <code className="swatch__value">{token.resolved}</code>
      {token.modes?.Dark && <code className="swatch__value muted">dark {token.modes.Dark}</code>}
    </li>
  );
}

function TokenTable({ tokens }: { tokens: TokenEntry[] }) {
  return (
    <table className="table">
      <caption className="fx-visually-hidden">Tokens</caption>
      <thead><tr><th scope="col">Token</th><th scope="col">CSS variable</th><th scope="col">Value</th><th scope="col">Modes</th></tr></thead>
      <tbody>
        {tokens.map((t) => (
          <tr key={t.name}>
            <td>{t.name}</td>
            <td><code>{t.cssVar}</code></td>
            <td><code>{t.value}</code>{t.value !== t.resolved && <span className="muted"> → {t.resolved}</span>}</td>
            <td>{t.modes ? Object.entries(t.modes).map(([m, v]) => <span key={m} className="mode-chip">{m}: {v}</span>) : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TokensView({ tokens }: { tokens: LibraryPayload["tokens"] }) {
  const groups = Object.entries(tokens.groups);
  const [group, setGroup] = useState(groups[0]?.[0] ?? "");
  const current = tokens.groups[group] ?? [];
  const isColor = current.every((t) => t.type === "color");
  return (
    <div className="stack">
      <Alert status={tokens.status === "DRAFT" ? "warning" : "success"} title={`Tokens v${tokens.version} · ${tokens.status}`}>
        Generated from FDS-101. Change a value in the engine's tokens.json and every component, template and page updates.
      </Alert>
      <Select label="Group" value={group} onChange={(e) => setGroup(e.target.value)} options={groups.map(([g, list]) => ({ value: g, label: `${g} (${list.length})` }))} />
      {isColor ? <ul className="swatch-grid">{current.map((t) => <Swatch key={t.name} token={t} />)}</ul> : <TokenTable tokens={current} />}
    </div>
  );
}

const DEMOS: Record<string, ReactNode> = {
  Button: (
    <div className="row wrap">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button size="s">Small</Button>
      <Button loading>Loading</Button>
      <Button disabled>Disabled</Button>
    </div>
  ),
  Badge: (
    <div className="row wrap">
      {(["neutral", "primary", "success", "warning", "error", "info"] as const).map((s) => <Badge key={s} status={s}>{s}</Badge>)}
      {(["primary", "success", "error"] as const).map((s) => <Badge key={`${s}-solid`} status={s} tone="solid">{s}</Badge>)}
    </div>
  ),
  Card: (
    <div className="row wrap">
      <Card className="demo-card">Flat card</Card>
      <Card variant="elevated" className="demo-card">Elevated card</Card>
    </div>
  ),
  Field: (
    <div className="demo-fields">
      <TextField label="Default" placeholder="Enter text" helperText="Helper text" />
      <TextField label="Error" required status="error" defaultValue="Bad value" helperText="This field is required" />
      <TextArea label="Text area" placeholder="Enter description" />
      <Select label="Select" placeholder="Choose" defaultValue="" options={[{ value: "a", label: "Option A" }]} />
    </div>
  ),
  Alert: (
    <div className="stack">
      <Alert status="info" title="Info">Something worth knowing.</Alert>
      <Alert status="success">Saved.</Alert>
      <Alert status="warning">Check this.</Alert>
      <Alert status="error">Something failed.</Alert>
    </div>
  ),
};

function ComponentsView({ library }: { library: LibraryPayload }) {
  return (
    <ul className="component-grid">
      {library.components.map((c) => (
        <li key={c.name}>
          <Card as="article" aria-labelledby={`cmp-${c.name}`}>
            <div className="row-between">
              <h3 id={`cmp-${c.name}`} className="fx-typo-heading-base">{c.name}</h3>
              <span className="row">
                <Flag ok={c.hasTest} label="Tests" />
                <Flag ok={c.hasCodeConnect} label="Code Connect" />
              </span>
            </div>
            <div className="row-between">
              <code className="muted">@fynxt/ui · {c.path}</code>
              <ViewCode query={{ component: c.name }} size="s" />
            </div>
            {DEMOS[c.name] && <div className="demo">{DEMOS[c.name]}</div>}
            {c.figmaUrls.length > 0 && (
              <ul className="link-list">
                {c.figmaUrls.map((u) => (
                  <li key={u}><a href={u} target="_blank" rel="noreferrer">FDS-101 node {new URL(u).searchParams.get("node-id")} <ExternalLink aria-hidden="true" /></a></li>
                ))}
              </ul>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}

function Flag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge status={ok ? "success" : "error"}>
      {ok ? <CheckCircle2 aria-hidden="true" className="inline-icon" /> : <XCircle aria-hidden="true" className="inline-icon" />} {label}
    </Badge>
  );
}

function TemplatesView({ library }: { library: LibraryPayload }) {
  if (!library.templates.length) return <EmptyState title="No templates registered" />;
  return (
    <table className="table">
      <caption className="fx-visually-hidden">Template registry</caption>
      <thead><tr><th scope="col">Template</th><th scope="col">Category</th><th scope="col">Status</th><th scope="col">Version</th><th scope="col">Description</th></tr></thead>
      <tbody>
        {library.templates.map((t) => (
          <tr key={t.id}>
            <td><strong>{t.id}</strong><br />{t.name}</td>
            <td>{t.category}</td>
            <td><Badge status={t.placeholder ? "neutral" : "info"}>{t.placeholder ? "Placeholder" : t.status}</Badge></td>
            <td>{t.version}</td>
            <td className="muted">{t.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function LibraryPage() {
  const lib = useAsync(api.library, []);
  const [tab, setTab] = useState("tokens");
  return (
    <>
      <PageHeader title="Library" description="The single sources FDI builds from: design tokens, the @fynxt/ui component library and the template registry." />
      {lib.error && <Alert status="error" title="Couldn't load the library">{lib.error}</Alert>}
      {lib.data && (
        <Card>
          <Tabs
            label="Library sections"
            value={tab}
            onChange={setTab}
            items={[
              { id: "tokens", label: "Tokens", content: <TokensView tokens={lib.data.tokens} /> },
              { id: "components", label: `Components (${lib.data.components.length})`, content: <ComponentsView library={lib.data} /> },
              { id: "templates", label: `Templates (${lib.data.templates.length})`, content: <TemplatesView library={lib.data} /> },
            ]}
          />
        </Card>
      )}
      {!lib.data && !lib.error && <p className="muted">Loading…</p>}
      <p className="muted">Need a component that isn't here? <Button variant="ghost" size="s" onClick={() => navigate("/new")}>Request it</Button></p>
    </>
  );
}
