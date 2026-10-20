import { createReadStream } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { CaseStatus, ChangeOf, RunStage, StudioMeta } from "../shared/types";
import { entraConfigProblem, FLOW_COOKIE, finishSignIn, isAllowedEmail, startSignIn } from "./auth";
import { accessCase, addFeedback, caseDir, CASE_ID, createRequest, decide, designFile, getCase, inputFile, listCases, UPLOAD_LIMITS } from "./cases";
import { env, fdiConfig } from "./env";
import { HttpError } from "./errors";
import { assertSameOriginWrite, currentUser, readForm, readJson, sendJson } from "./http";
import { galleryEntries, library } from "./library";
import { addMember, memberEmails, readMembers, removeMember, setOwner } from "./members";
import { canComment, canRun, canSubmit, headlessBlocker, stageFor } from "./permissions";
import { caseCode, componentCode, pageCode } from "./code";
import { exportPage } from "./exportPage";
import { addPin, listPins } from "./pins";
import { agentProblem, cancelRun, startRun, subscribe } from "./runs";
import { clearSession, cookie, readCookie, setSession } from "./session";
import { inviteUser, listUsers, recordSignIn, updateUser } from "./users";

function redirect(res: ServerResponse, location: string, cookies: string[] = []): void {
  res.writeHead(302, { Location: location, "Cache-Control": "no-store", ...(cookies.length ? { "Set-Cookie": cookies } : {}) });
  res.end();
}

const signInError = (message: string) => `/?signin_error=${encodeURIComponent(message)}`;

function changeNote(change: (ChangeOf & { caseFolder: string | null }) | undefined): string {
  if (!change) return "";
  const source = change.caseId ? ` It was built in ${change.caseId}${change.caseFolder ? ` (design-cases/${change.caseFolder}/case-file.md)` : ""}${change.template ? ` with template ${change.template}` : ""}.` : "";
  return ` This is a CHANGE REQUEST for the existing gallery page "${change.pageLabel}" (${change.pageId}).${source} Read that case file first: reuse its approved decisions, components and template, and classify the change against them (usually REUSE / EXTEND of what already exists). Record the source case as an input.`;
}

function promptFor(stage: RunStage, id: string, folder: string, title: string, requestedBy: string, change?: ChangeOf & { caseFolder: string | null }): string {
  switch (stage) {
    case "intake":
      return `/fdi-intake ${title} -- Use the existing case folder design-cases/${folder} (ID ${id}) created by FDI Studio. The requester's text is in inputs/request.md; any other files in inputs/ are attachments. Requested by ${requestedBy}.${changeNote(change)}`;
    case "revise":
      return `/fdi-revise ${id}`;
    case "figma":
      return `/fdi-figma ${id}`;
    case "build":
      return `/fdi-build ${id}`;
    case "publish":
      return `/fdi-publish ${id}`;
  }
}

async function route(req: IncomingMessage, res: ServerResponse, path: string, query: URLSearchParams): Promise<void> {
  const method = req.method ?? "GET";
  const parts = path.split("/").filter(Boolean).slice(1); // drop "api"
  assertSameOriginWrite(req);

  if (method === "GET" && parts[0] === "meta") {
    const cfg = fdiConfig();
    const problem = agentProblem();
    const meta: StudioMeta = {
      roles: cfg.studio.roles, authMode: env.authMode, allowedDomain: env.allowedDomain, agentReady: problem === null, agentProblem: problem,
      model: env.model, maxBudgetUsd: env.maxBudgetUsd, permissionsNote: cfg.studio.status,
    };
    return sendJson(res, 200, meta);
  }

  // ---------- Sign-in (Microsoft 365, @allowedDomain only; dev sign-in when not in entra mode)
  if (parts[0] === "auth") {
    if (parts[1] === "login" && method === "GET") {
      const problem = entraConfigProblem() ?? (env.authMode !== "entra" ? "Microsoft sign-in is off (STUDIO_AUTH_MODE is not \"entra\")." : null);
      if (problem) return redirect(res, signInError(problem));
      const { url, flowCookie } = startSignIn();
      return redirect(res, url, [cookie(FLOW_COOKIE, flowCookie, 600)]);
    }
    if (parts[1] === "callback" && method === "GET") {
      try {
        const who = await finishSignIn(query, readCookie(req, FLOW_COOKIE));
        if (!isAllowedEmail(who.email)) return redirect(res, signInError(`Only @${env.allowedDomain} accounts can use FDI Studio.`), [cookie(FLOW_COOKIE, "", 0)]);
        const user = await recordSignIn(who.email, who.name);
        if (!user) return redirect(res, signInError(`${who.email} isn't a Station user yet. Ask an Admin to invite you.`), [cookie(FLOW_COOKIE, "", 0)]);
        setSession(res, user.email);
        res.setHeader("Set-Cookie", [res.getHeader("Set-Cookie") as string, cookie(FLOW_COOKIE, "", 0)]);
        return redirect(res, "/");
      } catch (error) {
        return redirect(res, signInError(error instanceof HttpError ? error.message : "Sign-in failed. Try again."), [cookie(FLOW_COOKIE, "", 0)]);
      }
    }
    if (parts[1] === "dev" && method === "POST") {
      if (env.authMode === "entra") throw new HttpError(404, "Not found");
      const body = await readJson<{ email?: string }>(req);
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!isAllowedEmail(email)) throw new HttpError(400, `Use your @${env.allowedDomain} address.`);
      const user = await recordSignIn(email, "");
      if (!user) throw new HttpError(403, `${email} isn't a Station user yet. Ask an Admin to invite you.`);
      setSession(res, user.email);
      return sendJson(res, 200, user);
    }
    if (parts[1] === "logout" && method === "POST") {
      clearSession(res);
      return sendJson(res, 200, { ok: true });
    }
  }

  const user = await currentUser(req);

  if (parts[0] === "me" && method === "GET") return sendJson(res, 200, user);

  // ---------- Station users (Admins only)
  if (parts[0] === "users") {
    if (parts.length === 1 && method === "GET") {
      // Everyone may read names and roles (to invite people to a case); only Admins see the admin fields.
      const users = await listUsers();
      return sendJson(res, 200, user.isAdmin ? users : users.filter((u) => u.active).map(({ email, name, roles }) => ({ email, name, roles, isAdmin: false, active: true, invitedBy: null, invitedAt: null, lastSignInAt: null })));
    }
    if (parts.length === 1 && method === "POST") return sendJson(res, 201, await inviteUser(user, await readJson(req)));
    if (parts.length === 2 && method === "PATCH") return sendJson(res, 200, await updateUser(user, decodeURIComponent(parts[1]!), await readJson(req)));
  }

  if (parts[0] === "library" && method === "GET") return sendJson(res, 200, await library());

  // ---------- View code: files behind a page, component or case, for opening in an editor
  if (parts[0] === "code" && method === "GET") {
    const page = query.get("page"), component = query.get("component"), caseId = query.get("case");
    if (page) return sendJson(res, 200, await pageCode(page));
    if (component) return sendJson(res, 200, await componentCode(component));
    if (caseId) return sendJson(res, 200, await caseCode(caseId, user));
    throw new HttpError(400, "Say which code: ?page=, ?component= or ?case=");
  }

  // ---------- Download a gallery page as one self-contained HTML file (share before code review)
  if (parts[0] === "pages" && parts[1] && parts[2] === "export" && method === "GET") {
    const page = await exportPage(decodeURIComponent(parts[1]));
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${page.fileName}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(page.html);
    return;
  }

  // ---------- Pinned comments on built gallery pages
  if (parts[0] === "pages" && parts[1] && parts[2] === "pins") {
    const pageId = decodeURIComponent(parts[1]);
    if (method === "GET") return sendJson(res, 200, await listPins(pageId));
    if (method === "POST") return sendJson(res, 201, await addPin(user, pageId, await readJson(req)));
  }

  if (parts[0] === "cases") {
    const id = parts[1];
    if (!id) {
      if (method === "GET") return sendJson(res, 200, await listCases(user));
      if (method === "POST") {
        if (!canSubmit(user)) throw new HttpError(403, "Your role cannot submit requests.");
        const form = await readForm(req, UPLOAD_LIMITS.maxFiles * UPLOAD_LIMITS.maxFileBytes + 1024 * 1024);
        const title = String(form.get("title") ?? "").trim().slice(0, 140);
        const description = String(form.get("description") ?? "").trim().slice(0, 20000);
        const module = String(form.get("module") ?? "").trim().slice(0, 80);
        const links = String(form.get("links") ?? "").split(/\s+/).filter((l) => /^https?:\/\/\S+$/.test(l)).slice(0, 20);
        if (!title) throw new HttpError(400, "A title is required.");
        if (!description && form.getAll("files").length === 0) throw new HttpError(400, "Describe the requirement or attach a document.");
        const uploads = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
        if (uploads.length > UPLOAD_LIMITS.maxFiles) throw new HttpError(400, `Attach at most ${UPLOAD_LIMITS.maxFiles} files.`);
        const files = await Promise.all(
          uploads.map(async (f) => {
            const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
            if (!UPLOAD_LIMITS.extensions.includes(ext)) throw new HttpError(400, `File type ${ext} is not accepted.`);
            if (f.size > UPLOAD_LIMITS.maxFileBytes) throw new HttpError(413, `${f.name} is larger than 25 MB.`);
            return { name: f.name, data: Buffer.from(await f.arrayBuffer()) };
          })
        );
        // A change raised from a gallery page: trust only a page id Studio knows, and take its case from there.
        const pageId = String(form.get("changeOfPage") ?? "").trim();
        let changeOf: (ChangeOf & { caseFolder: string | null }) | undefined;
        let members: string[] = [];
        if (pageId) {
          const entry = (await galleryEntries()).find((e) => e.id === pageId);
          if (!entry) throw new HttpError(400, "That gallery page isn't registered in the Station.");
          const source = entry.caseId ? await caseDir(entry.caseId).catch(() => null) : null;
          changeOf = { pageId: entry.id, pageLabel: entry.label, caseId: entry.caseId, template: entry.template, caseFolder: source?.folder ?? null };
          // The source case's team works on the change too.
          if (source) members = memberEmails(await readMembers(source.dir));
        }
        const created = await createRequest({ title, module, description, links, files, changeOf, members }, user);
        let runError: string | null = null;
        try {
          await startRun({ caseId: created.id, caseDir: created.dir, stage: "intake", user, prompt: promptFor("intake", created.id, created.folder, title, `${user.name} <${user.email}>`, changeOf) });
        } catch (error) {
          runError = error instanceof Error ? error.message : String(error);
        }
        return sendJson(res, 201, { id: created.id, runError });
      }
    }
    if (id && !CASE_ID.test(id)) throw new HttpError(400, "Invalid case id");
    if (id && parts.length === 2 && method === "GET") return sendJson(res, 200, await getCase(id, user));
    if (id && parts[2] === "feedback" && method === "POST") {
      await accessCase(id, user);
      if (!canComment(user)) throw new HttpError(403, "Your role cannot comment.");
      const body = await readJson<{ section?: string; text?: string }>(req);
      const text = String(body.text ?? "").trim().slice(0, 4000);
      if (!text) throw new HttpError(400, "Feedback text is required.");
      await addFeedback(id, user, String(body.section ?? ""), text);
      return sendJson(res, 200, await getCase(id, user));
    }
    if (id && parts[2] === "decision" && method === "POST") {
      await accessCase(id, user);
      const body = await readJson<{ to?: string; note?: string }>(req);
      await decide(id, user, String(body.to ?? "") as CaseStatus, String(body.note ?? "").slice(0, 4000));
      return sendJson(res, 200, await getCase(id, user));
    }
    if (id && parts[2] === "members") {
      const { dir } = await accessCase(id, user);
      const body = method === "GET" ? {} : await readJson<{ email?: string }>(req);
      const email = String((body as { email?: string }).email ?? "");
      if (method === "POST" && parts.length === 3) await addMember(dir, user, email);
      else if (method === "DELETE" && parts.length === 3) await removeMember(dir, user, email);
      else if (method === "POST" && parts[3] === "owner") await setOwner(dir, user, email);
      else throw new HttpError(404, "Not found");
      return sendJson(res, 200, await getCase(id, user));
    }
    if (id && parts[2] === "runs" && method === "POST") {
      const detail = await getCase(id, user);
      const stage = stageFor(detail.status);
      if (!stage) throw new HttpError(409, `No FDI stage runs from ${detail.status}.`);
      if (!canRun(user, stage)) throw new HttpError(403, `Your role cannot start the ${stage} stage.`);
      const blocker = headlessBlocker(stage);
      if (blocker) throw new HttpError(409, blocker);
      const { dir, folder } = await caseDir(id);
      try {
        const run = await startRun({ caseId: id, caseDir: dir, stage, user, prompt: promptFor(stage, id, folder, detail.title, detail.requestedBy) });
        return sendJson(res, 202, run);
      } catch (error) {
        throw new HttpError(409, error instanceof Error ? error.message : String(error));
      }
    }
    if (id && parts[2] === "inputs" && parts[3] && method === "GET") {
      const file = await inputFile(id, user, decodeURIComponent(parts[3]));
      res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${file.name.replace(/"/g, "")}"`,
        "X-Content-Type-Options": "nosniff",
      });
      createReadStream(file.path).pipe(res);
      return;
    }
    if (id && parts[2] === "design" && parts[3] && parts[4] && method === "GET") {
      const path = await designFile(id, user, parts[3], decodeURIComponent(parts[4]));
      res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" });
      createReadStream(path).pipe(res);
      return;
    }
  }

  if (parts[0] === "runs" && parts[1]) {
    const runId = parts[1];
    const caseId = runId.match(/^(DCF-\d{4})-/)?.[1];
    if (!caseId) throw new HttpError(400, "Invalid run id");
    const { dir } = await accessCase(caseId, user);
    if (parts[2] === "events" && method === "GET") {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
      const unsubscribe = await subscribe(runId, dir, (event) => {
        if (event) res.write(`data: ${JSON.stringify(event)}\n\n`);
        else {
          res.write("event: end\ndata: {}\n\n");
          res.end();
        }
      });
      req.on("close", unsubscribe);
      return;
    }
    if (parts[2] === "cancel" && method === "POST") {
      const stage = runId.split("-").pop() as RunStage;
      if (!canRun(user, stage)) throw new HttpError(403, "Only people who can start this stage can cancel it.");
      return sendJson(res, cancelRun(runId) ? 200 : 404, { ok: true });
    }
  }

  throw new HttpError(404, "Not found");
}

/** Handles /api/* requests. Shared by the Vite dev server and the production server. */
export async function handleApi(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://studio.local");
  try {
    await route(req, res, url.pathname, url.searchParams);
  } catch (error) {
    if (res.headersSent) return void res.end();
    if (error instanceof HttpError) return sendJson(res, error.status, { error: error.message });
    console.error("[studio]", error);
    sendJson(res, 500, { error: "Unexpected server error" });
  }
}
