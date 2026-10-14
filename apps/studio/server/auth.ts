import { createHash, createPublicKey, randomBytes, verify as verifySignature, type JsonWebKey } from "node:crypto";
import { env } from "./env";
import { HttpError } from "./errors";
import { sign, verify } from "./session";

/**
 * Microsoft 365 (Entra ID) sign-in: OpenID Connect authorization code flow with PKCE, confidential client.
 * Only accounts from the configured tenant AND with an @<allowedDomain> address get through.
 * No dependencies: tokens are verified with node:crypto against Microsoft's published keys.
 */

const authority = () => `https://login.microsoftonline.com/${env.entra.tenantId}`;
export const redirectUri = () => `${env.publicUrl}/api/auth/callback`;
export const FLOW_COOKIE = "fdi_oidc";

export function entraConfigProblem(): string | null {
  if (env.authMode !== "entra") return null;
  const missing = [
    !env.entra.tenantId && "ENTRA_TENANT_ID",
    !env.entra.clientId && "ENTRA_CLIENT_ID",
    !env.entra.clientSecret && "ENTRA_CLIENT_SECRET",
    !env.sessionSecret && "STUDIO_SESSION_SECRET",
  ].filter(Boolean);
  return missing.length ? `Microsoft sign-in is not configured: set ${missing.join(", ")} in the Station .env.` : null;
}

/** True only for an exact @<domain> address (not sub.fynxt.com, not fynxt.com.evil). */
export function isAllowedEmail(email: string, domain = env.allowedDomain): boolean {
  const at = email.lastIndexOf("@");
  return at > 0 && email.slice(at + 1).toLowerCase() === domain && /^[^\s@]+$/.test(email.slice(0, at));
}

/** Builds the Microsoft authorize URL and the signed, short-lived cookie that carries state, nonce and the PKCE verifier. */
export function startSignIn(): { url: string; flowCookie: string } {
  const state = randomBytes(16).toString("base64url");
  const nonce = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const params = new URLSearchParams({
    client_id: env.entra.clientId,
    response_type: "code",
    redirect_uri: redirectUri(),
    response_mode: "query",
    scope: "openid profile email",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  const flowCookie = sign({ state, nonce, verifier, exp: Date.now() + 10 * 60 * 1000 });
  return { url: `${authority()}/oauth2/v2.0/authorize?${params}`, flowCookie };
}

interface Jwks {
  keys: (JsonWebKey & { kid?: string })[];
}
let jwksCache: { at: number; jwks: Jwks } | null = null;
async function microsoftKeys(fetcher: typeof fetch): Promise<Jwks> {
  if (jwksCache && Date.now() - jwksCache.at < 3600 * 1000) return jwksCache.jwks;
  const res = await fetcher(`${authority()}/discovery/v2.0/keys`);
  if (!res.ok) throw new HttpError(502, "Couldn't reach Microsoft to verify the sign-in.");
  jwksCache = { at: Date.now(), jwks: (await res.json()) as Jwks };
  return jwksCache.jwks;
}

export interface IdTokenCheck {
  jwks: Jwks;
  tenantId: string;
  clientId: string;
  nonce: string;
  now?: number;
}

/** Verifies an Entra ID token's signature and claims. Returns the signed-in email and name. */
export function verifyIdToken(token: string, check: IdTokenCheck): { email: string; name: string } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new HttpError(401, "Malformed sign-in token.");
  const [h, p, s] = parts as [string, string, string];
  const header = JSON.parse(Buffer.from(h, "base64url").toString("utf8")) as { alg?: string; kid?: string };
  if (header.alg !== "RS256") throw new HttpError(401, "Unexpected sign-in token algorithm.");
  const jwk = check.jwks.keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new HttpError(401, "Sign-in token key is unknown.");
  const ok = verifySignature("RSA-SHA256", Buffer.from(`${h}.${p}`), createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(s, "base64url"));
  if (!ok) throw new HttpError(401, "Sign-in token signature is invalid.");
  const claims = JSON.parse(Buffer.from(p, "base64url").toString("utf8")) as Record<string, unknown>;
  const now = Math.floor((check.now ?? Date.now()) / 1000);
  const skew = 120;
  if (claims.iss !== `https://login.microsoftonline.com/${check.tenantId}/v2.0`) throw new HttpError(401, "Sign-in came from the wrong tenant.");
  if (claims.tid !== check.tenantId) throw new HttpError(401, "Sign-in came from the wrong tenant.");
  if (claims.aud !== check.clientId) throw new HttpError(401, "Sign-in token is for a different app.");
  if (typeof claims.exp !== "number" || claims.exp + skew < now) throw new HttpError(401, "Sign-in token has expired.");
  if (typeof claims.nbf === "number" && claims.nbf - skew > now) throw new HttpError(401, "Sign-in token is not valid yet.");
  if (claims.nonce !== check.nonce) throw new HttpError(401, "Sign-in could not be matched to this browser. Try again.");
  const email = String(claims.email ?? claims.preferred_username ?? "").trim().toLowerCase();
  if (!email) throw new HttpError(401, "Your Microsoft account has no email address.");
  return { email, name: String(claims.name ?? email.split("@")[0]).slice(0, 80) };
}

/** Completes the sign-in: checks state, exchanges the code (with the PKCE verifier) and verifies the ID token. */
export async function finishSignIn(query: URLSearchParams, flowCookie: string | undefined, fetcher: typeof fetch = fetch): Promise<{ email: string; name: string }> {
  const flow = verify<{ state: string; nonce: string; verifier: string; exp: number }>(flowCookie);
  if (query.get("error")) throw new HttpError(401, query.get("error_description") ?? "Microsoft sign-in was cancelled.");
  if (!flow || query.get("state") !== flow.state) throw new HttpError(401, "Sign-in expired or was started in another browser. Try again.");
  const code = query.get("code");
  if (!code) throw new HttpError(400, "Microsoft didn't return a sign-in code.");
  const res = await fetcher(`${authority()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.entra.clientId,
      client_secret: env.entra.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
      code_verifier: flow.verifier,
      scope: "openid profile email",
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { id_token?: string; error_description?: string };
  if (!res.ok || !body.id_token) throw new HttpError(401, body.error_description ?? "Microsoft rejected the sign-in.");
  return verifyIdToken(body.id_token, { jwks: await microsoftKeys(fetcher), tenantId: env.entra.tenantId, clientId: env.entra.clientId, nonce: flow.nonce });
}
