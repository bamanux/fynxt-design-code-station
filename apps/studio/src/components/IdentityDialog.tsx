import { Alert, Button, Card, Select, TextField } from "@fynxt/ui";
import { useState, type FormEvent } from "react";
import { useSession } from "../lib/session";

export function IdentityDialog() {
  const { meta, metaError, setUser } = useSession();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [touched, setTouched] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (name.trim() && role) setUser({ name: name.trim(), role });
  }

  return (
    <main className="identity">
      <Card as="section" variant="elevated" className="identity__card" aria-labelledby="identity-title">
        <h1 id="identity-title" className="fx-typo-heading-lg">Welcome to FDI Studio</h1>
        <p className="muted">
          Request designs, review case files and follow them through Figma and code. Tell us who you are so your
          requests, feedback and approvals are recorded against your name.
        </p>
        {metaError && <Alert status="error" title="Studio server is not reachable">{metaError}</Alert>}
        <form onSubmit={submit} className="stack" noValidate>
          <TextField
            label="Your name"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            status={touched && !name.trim() ? "error" : "default"}
            helperText={touched && !name.trim() ? "Enter your name." : undefined}
          />
          <Select
            label="Your role"
            required
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder={meta ? "Choose your role" : "Loading roles…"}
            options={(meta?.roles ?? []).map((r) => ({ value: r, label: r }))}
            status={touched && !role ? "error" : "default"}
            helperText={touched && !role ? "Choose a role." : "Your role decides which approvals and FDI runs you can trigger."}
          />
          <Button type="submit" disabled={!meta}>
            Continue
          </Button>
        </form>
        <Alert status="warning" title="Local mode">
          Identity is self-declared on this machine and is not authentication. Single sign-on is required before
          Studio goes live.
        </Alert>
      </Card>
    </main>
  );
}
