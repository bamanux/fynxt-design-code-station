import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import type { StudioUser } from "../shared/types";
import { HttpError } from "./errors";
import { sessionEmail } from "./session";
import { activeUser } from "./users";

export function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

export async function readJson<T>(req: IncomingMessage, limit = 256 * 1024): Promise<T> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > limit) throw new HttpError(413, "Request body too large");
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

/** Parses multipart/form-data with the platform Request API (no extra dependency). */
export async function readForm(req: IncomingMessage, maxBytes: number): Promise<FormData> {
  const length = Number(req.headers["content-length"] ?? 0);
  if (length > maxBytes) throw new HttpError(413, "Upload too large");
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
  const request = new Request("http://studio.local/upload", {
    method: "POST",
    headers,
    body: Readable.toWeb(req) as ReadableStream,
    duplex: "half",
  } as RequestInit);
  return request.formData();
}

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * CSRF guard. Session cookies are SameSite=Lax, and every state-changing call must also carry this header,
 * which a cross-site form or link cannot set.
 */
export function assertSameOriginWrite(req: IncomingMessage): void {
  if (WRITE_METHODS.has(req.method ?? "GET") && req.headers["x-requested-with"] !== "fdi-studio") {
    throw new HttpError(403, "Request blocked: missing Studio header.");
  }
}

/** The signed-in Station user, from the session cookie. Throws 401 when signed out, deactivated or no longer invited. */
export async function currentUser(req: IncomingMessage): Promise<StudioUser> {
  const email = sessionEmail(req);
  const user = email ? await activeUser(email) : null;
  if (!user) throw new HttpError(401, "Sign in to FDI Studio.");
  return user;
}
