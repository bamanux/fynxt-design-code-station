import { Alert, Button, Card, TextField } from "@fynxt/ui";
import { LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useSession } from "../lib/session";

/** Sign-in: Microsoft 365 (production) or development sign-in by email. Only invited @fynxt.com users get in. */
export function SignIn() {
  const { meta, metaError, refresh } = useSession();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(() => new URLSearchParams(window.location.search).get("signin_error"));
  const domain = meta?.allowedDomain ?? "fynxt.com";

  async function devSignIn(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.devSignIn(email.trim());
      window.history.replaceState(null, "", "/");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="identity">
      <Card as="section" variant="elevated" className="identity__card" aria-labelledby="signin-title">
        <h1 id="signin-title" className="fx-typo-heading-lg">Sign in to FDI Studio</h1>
        <p className="muted">
          For FYNXT staff with a @{domain} account. An Admin must invite you first; they also choose your roles, which decide what you can approve and run.
        </p>
        {metaError && <Alert status="error" title="Studio server is not reachable">{metaError}</Alert>}
        {error && <Alert status="error" title="Couldn't sign you in">{error}</Alert>}
        {meta?.authMode === "entra" ? (
          <Button size="l" leadingIcon={<LogIn />} onClick={() => window.location.assign("/api/auth/login")}>
            Sign in with Microsoft
          </Button>
        ) : (
          meta && (
            <form onSubmit={devSignIn} className="stack" noValidate>
              <TextField label="Work email" type="email" autoComplete="email" required placeholder={`name@${domain}`} value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button type="submit" loading={busy}>
                Sign in (development)
              </Button>
              <Alert status="warning" title="Development sign-in">
                No password is checked on this machine. Production uses Microsoft 365 sign-in (STUDIO_AUTH_MODE=entra).
              </Alert>
            </form>
          )
        )}
      </Card>
    </main>
  );
}
