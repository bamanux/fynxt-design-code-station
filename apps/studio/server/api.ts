import { createReadStream } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { CaseStatus, RunStage, StudioMeta } from "../shared/types";
import { addFeedback, caseDir, CASE_ID, createRequest, decide, getCase, inputFile, listCases, UPLOAD_LIMITS } from "./cases";
import { env, fdiConfig } from "./env";
import { HttpError } from "./errors";
import { readForm, readJson, sendJson, userFrom } from "./http";
import { library } from "./library";
import { canRun, canSubmit, headlessBlocker, stageFor } from "./permissions";
import { agentProblem, cancelRun, startRun, subscribe } from "./runs";

function promptFor(stage: RunStage, id: string, folder: string, title: string, requestedBy: string): string {
  switch (stage) {
    case "intake":
      return `/fdi-intake ${title} -- Use the existing case folder design-cases/${folder} (ID ${id}) created by FDI Studio. The requester's text is in inputs/request.md; any other files in inputs/ are attachments. Requested by ${requestedBy}.`;
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

async function route(req: IncomingMessage, res: ServerResponse, path: string): Promise<void> {
  const method = req.method ?? "GET";
  const parts = path.split("/").filter(Boolean).slice(1); // drop "api"

  if (method === "GET" && parts[0] === "meta") {
    const cfg = fdiConfig();
    const problem = agentProblem();
    const meta: StudioMeta = {
      roles: cfg.studio.roles, authMode: env.authMode, agentReady: problem === null, agentProblem: problem,
      model: env.model, maxBudgetUsd: env.maxBudgetUsd, permissionsNote: cfg.studio.status,
    };
    return sendJson(res, 200, meta);
  }

  const user = userFrom(req);

  if (parts[0] === "library" && method === "GET") return sendJson(res, 200, await library());

  if (parts[0] === "cases") {
    const id = parts[1];
    if (!id) {
      if (method === "GET") return sendJson(res, 200, await listCases());
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
        const created = await createRequest({ title, module, description, links, files }, user);
        const requestedBy = `${user.name} (${user.role})`;
        let runError: string | null = null;
        try {
          await startRun({ caseId: created.id, caseDir: created.dir, stage: "intake", user, prompt: promptFor("intake", created.id, created.folder, title, requestedBy) });
        } catch (error) {
          runError = error instanceof Error ? error.message : String(error);
        }
        return sendJson(res, 201, { id: created.id, runError });
      }
    }
    if (id && !CASE_ID.test(id)) throw new HttpError(400, "Invalid case id");
    if (id && parts.length === 2 && method === "GET") return sendJson(res, 200, await getCase(id, user));
    if (id && parts[2] === "feedback" && method === "POST") {
      const body = await readJson<{ section?: string; text?: string }>(req);
      await addFeedback(id, user, String(body.section ?? ""), String(body.text ?? "").slice(0, 4000));
      return sendJson(res, 200, await getCase(id, user));
    }
    if (id && parts[2] === "decision" && method === "POST") {
      const body = await readJson<{ to?: string; note?: string }>(req);
      await decide(id, user, String(body.to ?? "") as CaseStatus, String(body.note ?? "").slice(0, 4000));
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
      const file = await inputFile(id, decodeURIComponent(parts[3]));
      res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${file.name.replace(/"/g, "")}"`,
        "X-Content-Type-Options": "nosniff",
      });
      createReadStream(file.path).pipe(res);
      return;
    }
  }

  if (parts[0] === "runs" && parts[1]) {
    const runId = parts[1];
    const caseId = runId.match(/^(DCF-\d{4})-/)?.[1];
    if (!caseId) throw new HttpError(400, "Invalid run id");
    if (parts[2] === "events" && method === "GET") {
      const { dir } = await caseDir(caseId);
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
  const path = new URL(req.url ?? "/", "http://studio.local").pathname;
  try {
    await route(req, res, path);
  } catch (error) {
    if (res.headersSent) return void res.end();
    if (error instanceof HttpError) return sendJson(res, error.status, { error: error.message });
    console.error("[studio]", error);
    sendJson(res, 500, { error: "Unexpected server error" });
  }
}
