import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { StationUser, StudioUser } from "../shared/types";
import { isAllowedEmail } from "./auth";
import { env, fdiConfig } from "./env";
import { HttpError } from "./errors";

/**
 * Station users: who may sign in to FDI Studio and with which roles. Admins invite people and set roles.
 * Stored in <station>/.studio-data/users.json (git-ignored): it holds staff emails, not product data.
 */

interface UserRecord {
  email: string;
  name: string;
  roles: string[];
  isAdmin: boolean;
  active: boolean;
  invitedBy: string | null;
  invitedAt: string | null;
  lastSignInAt: string | null;
}

const file = () => join(env.dataDir, "users.json");
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
}

async function load(): Promise<UserRecord[]> {
  if (!existsSync(file())) return [];
  return ((JSON.parse(await readFile(file(), "utf8")) as { users?: UserRecord[] }).users ?? []).map((u) => ({ ...u, email: u.email.toLowerCase() }));
}

async function save(users: UserRecord[]): Promise<void> {
  await mkdir(env.dataDir, { recursive: true });
  const tmp = `${file()}.tmp`;
  await writeFile(tmp, JSON.stringify({ users }, null, 2), { mode: 0o600 });
  await rename(tmp, file());
}

const isBootstrapAdmin = (email: string) => env.bootstrapAdmins.includes(email.toLowerCase());
const toStudio = (u: UserRecord): StudioUser => ({ email: u.email, name: u.name, roles: u.roles, isAdmin: u.isAdmin || isBootstrapAdmin(u.email) });
const toStation = (u: UserRecord): StationUser => ({ ...toStudio(u), active: u.active, invitedBy: u.invitedBy, invitedAt: u.invitedAt, lastSignInAt: u.lastSignInAt });

function cleanRoles(roles: unknown): string[] {
  const allowed = fdiConfig().studio.roles;
  if (!Array.isArray(roles)) throw new HttpError(400, "Roles must be a list.");
  const picked = [...new Set(roles.map(String))];
  const bad = picked.filter((r) => !allowed.includes(r));
  if (bad.length) throw new HttpError(400, `Unknown role: ${bad.join(", ")}.`);
  return picked;
}

const cleanName = (name: unknown) => String(name ?? "").replace(/[^\p{L}\p{N} .'-]/gu, "").trim().slice(0, 80);

/** The active Station user for an email, or null. Bootstrap admins always resolve. */
export async function activeUser(email: string): Promise<StudioUser | null> {
  const e = email.toLowerCase();
  if (!isAllowedEmail(e)) return null;
  const hit = (await load()).find((u) => u.email === e);
  if (hit) return hit.active ? toStudio(hit) : null;
  return isBootstrapAdmin(e) ? { email: e, name: e.split("@")[0]!, roles: [], isAdmin: true } : null;
}

/** Called after a verified sign-in. Records the time and the person's name; creates bootstrap admins on first sign-in. */
export function recordSignIn(email: string, name: string): Promise<StudioUser | null> {
  return serial(async () => {
    const e = email.toLowerCase();
    if (!isAllowedEmail(e)) return null;
    const users = await load();
    let hit = users.find((u) => u.email === e);
    if (!hit && isBootstrapAdmin(e)) {
      hit = { email: e, name: cleanName(name) || e, roles: [], isAdmin: true, active: true, invitedBy: "bootstrap (STUDIO_ADMINS)", invitedAt: new Date().toISOString(), lastSignInAt: null };
      users.push(hit);
    }
    if (!hit || !hit.active) return null;
    if (cleanName(name)) hit.name = cleanName(name);
    hit.lastSignInAt = new Date().toISOString();
    await save(users);
    return toStudio(hit);
  });
}

export async function listUsers(): Promise<StationUser[]> {
  return (await load()).map(toStation).sort((a, b) => a.name.localeCompare(b.name));
}

function requireAdmin(actor: StudioUser) {
  if (!actor.isAdmin) throw new HttpError(403, "Only Admins can manage Station users.");
}

export async function inviteUser(actor: StudioUser, input: { email?: unknown; name?: unknown; roles?: unknown; isAdmin?: unknown }): Promise<StationUser> {
  requireAdmin(actor);
  return serial(async () => {
    const email = String(input.email ?? "").trim().toLowerCase();
    if (!isAllowedEmail(email)) throw new HttpError(400, `Only @${env.allowedDomain} addresses can be invited.`);
    const name = cleanName(input.name) || email.split("@")[0]!;
    const roles = cleanRoles(input.roles ?? []);
    const users = await load();
    const existing = users.find((u) => u.email === email);
    if (existing?.active) throw new HttpError(409, `${email} is already a Station user.`);
    const record: UserRecord = { email, name, roles, isAdmin: input.isAdmin === true, active: true, invitedBy: actor.email, invitedAt: new Date().toISOString(), lastSignInAt: existing?.lastSignInAt ?? null };
    await save(existing ? users.map((u) => (u.email === email ? record : u)) : [...users, record]);
    return toStation(record);
  });
}

export async function updateUser(actor: StudioUser, email: string, patch: { name?: unknown; roles?: unknown; isAdmin?: unknown; active?: unknown }): Promise<StationUser> {
  requireAdmin(actor);
  return serial(async () => {
    const e = email.toLowerCase();
    const users = await load();
    const hit = users.find((u) => u.email === e);
    if (!hit) throw new HttpError(404, "User not found.");
    if (e === actor.email && (patch.isAdmin === false || patch.active === false)) throw new HttpError(409, "You can't remove your own Admin access or deactivate yourself.");
    if (patch.name !== undefined) hit.name = cleanName(patch.name) || hit.name;
    if (patch.roles !== undefined) hit.roles = cleanRoles(patch.roles);
    if (patch.isAdmin !== undefined) hit.isAdmin = patch.isAdmin === true;
    if (patch.active !== undefined) hit.active = patch.active === true;
    // Never lock everyone out: keep at least one active admin (bootstrap admins count).
    const admins = users.filter((u) => u.active && (u.isAdmin || isBootstrapAdmin(u.email)));
    if (admins.length === 0 && env.bootstrapAdmins.length === 0) throw new HttpError(409, "Studio needs at least one active Admin.");
    await save(users);
    return toStation(hit);
  });
}
