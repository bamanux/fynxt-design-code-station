import { existsSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CaseMember, StudioUser } from "../shared/types";
import { HttpError } from "./errors";
import { listUsers } from "./users";

/**
 * Case membership: <case>/members.json. Only members (creator, owner, invited people) and Admins can see a case.
 * Cases created before membership existed have no file: only Admins see them until members are added.
 */

export interface Members {
  creator: string | null;
  owner: string | null;
  members: { email: string; invitedBy: string; invitedAt: string }[];
}

const EMPTY: Members = { creator: null, owner: null, members: [] };
const file = (dir: string) => join(dir, "members.json");

export async function readMembers(dir: string): Promise<Members> {
  if (!existsSync(file(dir))) return EMPTY;
  const m = JSON.parse(await readFile(file(dir), "utf8")) as Partial<Members>;
  return { creator: m.creator ?? null, owner: m.owner ?? null, members: m.members ?? [] };
}

async function writeMembers(dir: string, m: Members): Promise<void> {
  const tmp = `${file(dir)}.tmp`;
  await writeFile(tmp, JSON.stringify(m, null, 2));
  await rename(tmp, file(dir));
}

export const memberEmails = (m: Members) => [...new Set([m.creator, m.owner, ...m.members.map((x) => x.email)].filter((e): e is string => Boolean(e)))];
export const canView = (user: StudioUser, m: Members) => user.isAdmin || memberEmails(m).includes(user.email);
export const canManage = (user: StudioUser, m: Members) => user.isAdmin || user.email === m.creator || user.email === m.owner;

export async function initMembers(dir: string, creator: string, extra: string[] = []): Promise<void> {
  const now = new Date().toISOString();
  const members = [...new Set(extra.map((e) => e.toLowerCase()))].filter((e) => e !== creator).map((email) => ({ email, invitedBy: creator, invitedAt: now }));
  await writeMembers(dir, { creator, owner: creator, members });
}

/** Members with their Station names and roles, for the case page. */
export async function describeMembers(m: Members): Promise<CaseMember[]> {
  const users = await listUsers();
  return memberEmails(m).map((email) => {
    const u = users.find((x) => x.email === email);
    return { email, name: u?.name ?? email, roles: u?.roles ?? [], isOwner: email === m.owner, isCreator: email === m.creator };
  });
}

export async function addMember(dir: string, actor: StudioUser, email: string): Promise<void> {
  const m = await readMembers(dir);
  if (!canManage(actor, m)) throw new HttpError(403, "Only the case creator, its owner or an Admin can invite people.");
  const e = email.trim().toLowerCase();
  const target = (await listUsers()).find((u) => u.email === e && u.active);
  if (!target) throw new HttpError(400, "Invite people who are Station users. Ask an Admin to add them first.");
  if (memberEmails(m).includes(e)) return;
  await writeMembers(dir, { ...m, members: [...m.members, { email: e, invitedBy: actor.email, invitedAt: new Date().toISOString() }] });
}

export async function removeMember(dir: string, actor: StudioUser, email: string): Promise<void> {
  const m = await readMembers(dir);
  if (!canManage(actor, m)) throw new HttpError(403, "Only the case creator, its owner or an Admin can remove people.");
  const e = email.toLowerCase();
  if (e === m.creator || e === m.owner) throw new HttpError(409, "The creator and owner stay on the case. Change the owner first.");
  await writeMembers(dir, { ...m, members: m.members.filter((x) => x.email !== e) });
}

export async function setOwner(dir: string, actor: StudioUser, email: string): Promise<void> {
  const m = await readMembers(dir);
  if (!canManage(actor, m)) throw new HttpError(403, "Only the case creator, its owner or an Admin can change the owner.");
  const e = email.toLowerCase();
  if (!memberEmails(m).includes(e)) throw new HttpError(400, "Invite the person to the case before making them owner.");
  const members = m.owner && m.owner !== m.creator && !m.members.some((x) => x.email === m.owner) ? [...m.members, { email: m.owner, invitedBy: actor.email, invitedAt: new Date().toISOString() }] : m.members;
  await writeMembers(dir, { ...m, owner: e, members: members.filter((x) => x.email !== e) });
}
