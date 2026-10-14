import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { env } from "./env";

/** Signed, HttpOnly cookies. The payload is not secret (an email and an expiry); the signature makes it tamper-proof. */

const devSecret = randomBytes(32).toString("hex");
const secret = () => (env.sessionSecret || (env.authMode === "dev" ? devSecret : ""));

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");
const mac = (data: string, key: string) => createHmac("sha256", key).update(data).digest("base64url");

export function sign(payload: object, key = secret()): string {
  if (!key) throw new Error("STUDIO_SESSION_SECRET is not set.");
  const body = b64(JSON.stringify(payload));
  return `${body}.${mac(body, key)}`;
}

export function verify<T extends { exp: number }>(token: string | undefined, key = secret(), now = Date.now()): T | null {
  if (!token || !key) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(mac(body, key));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(unb64(body)) as T;
    return typeof payload.exp === "number" && payload.exp > now ? payload : null;
  } catch {
    return null;
  }
}

export function readCookie(req: IncomingMessage, name: string): string | undefined {
  const header = req.headers.cookie ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export function cookie(name: string, value: string, maxAgeSeconds: number): string {
  const secure = env.publicUrl.startsWith("https://") ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export const SESSION_COOKIE = "fdi_session";
export const SESSION_HOURS = 8;

export function setSession(res: ServerResponse, email: string): void {
  const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
  res.setHeader("Set-Cookie", cookie(SESSION_COOKIE, sign({ email, exp }), SESSION_HOURS * 3600));
}

export function clearSession(res: ServerResponse): void {
  res.setHeader("Set-Cookie", cookie(SESSION_COOKIE, "", 0));
}

export function sessionEmail(req: IncomingMessage): string | null {
  return verify<{ email: string; exp: number }>(readCookie(req, SESSION_COOKIE))?.email ?? null;
}
