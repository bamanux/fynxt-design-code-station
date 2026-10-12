import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import type { StudioUser } from "../shared/types";
import { fdiConfig } from "./env";
import { HttpError } from "./errors";

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

/**
 * Local mode identity: the browser declares name + role in headers. This is a convenience for
 * a trusted local network only — it is NOT authentication. Replace with SSO before going live.
 */
export function userFrom(req: IncomingMessage): StudioUser {
  const rawName = req.headers["x-fdi-user"];
  const rawRole = req.headers["x-fdi-role"];
  const name = typeof rawName === "string" ? decodeURIComponent(rawName).replace(/[^\p{L}\p{N} .'-]/gu, "").trim().slice(0, 60) : "";
  const role = typeof rawRole === "string" ? decodeURIComponent(rawRole) : "";
  if (!name || !fdiConfig().studio.roles.includes(role)) throw new HttpError(401, "Choose your name and role first.");
  return { name, role };
}
