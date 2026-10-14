import { generateKeyPairSync, sign as rsaSign } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Point the server at throw-away engine, station and data folders.
const roots = vi.hoisted(() => {
  const { mkdtempSync } = require("node:fs") as typeof import("node:fs");
  const { tmpdir } = require("node:os") as typeof import("node:os");
  const { join } = require("node:path") as typeof import("node:path");
  const base = mkdtempSync(join(tmpdir(), "fdi-studio-"));
  return { engine: join(base, "engine"), station: join(base, "station"), data: join(base, "data") };
});
vi.mock("./env", () => ({
  env: {
    stationRoot: roots.station, enginePath: roots.engine, dataDir: roots.data, model: "test", maxBudgetUsd: 1, port: 0, hasApiKey: false,
    authMode: "dev", allowedDomain: "fynxt.com", entra: { tenantId: "", clientId: "", clientSecret: "" }, publicUrl: "http://127.0.0.1:5190",
    sessionSecret: "test-secret", bootstrapAdmins: ["admin@fynxt.com"],
  },
  stationRoot: roots.station,
  fdiConfig: () => ({
    approvers: { caseFile: ["Product Designer"], design: ["Product Designer"], code: ["UI Code Reviewer"] },
    studio: { status: "", roles: ["Product Designer", "UI Code Reviewer", "Product Manager"], permissions: { submitRequest: "*", comment: "*", decide: {}, runStage: {} }, headlessRuns: { figma: "", bashAllowlist: [] } },
  }),
}));

import { isAllowedEmail, verifyIdToken } from "./auth";
import { accessCase, createRequest, getCase, listCases } from "./cases";
import { galleryEntries } from "./library";
import { addMember } from "./members";
import { addPin } from "./pins";
import { sign, verify } from "./session";
import { activeUser, inviteUser, recordSignIn, updateUser } from "./users";

const admin = { email: "admin@fynxt.com", name: "Admin", roles: [], isAdmin: true };

beforeAll(() => {
  // A case built before membership existed (no members.json): Admin-only until members are added.
  const caseDir = join(roots.engine, "design-cases", "DCF-0003-object-enrolment");
  mkdirSync(join(caseDir, "figma", "code-verification"), { recursive: true });
  writeFileSync(join(caseDir, "case-file.md"), "---\nid: DCF-0003\ntitle: Incentive Programs\nstatus: CODE-REVIEW\nrevision: 1\n---\n\n# DCF-0003\n\n## 11. Review Feedback\n\n| # | Rev | Reviewer | Section | Feedback | Resolution (FDI) | Closed? |\n|---|---|---|---|---|---|---|\n\n## 12. Design & Build Record\n");
  writeFileSync(join(caseDir, "figma", "A1-list.png"), "png");
  writeFileSync(join(caseDir, "figma", "code-verification", "L1-list.png"), "png");
  writeFileSync(join(caseDir, "figma", "notes.txt"), "not an image");
  const gallery = join(roots.station, "apps/studio/gallery");
  mkdirSync(gallery, { recursive: true });
  writeFileSync(join(gallery, "menu.json"), JSON.stringify({ modules: [] }));
  writeFileSync(join(gallery, "pages.json"), JSON.stringify({ pages: [{ id: "crm.operations.incentive-programs", label: "Incentive Programs", module: "CRM", section: "Operations", caseId: "DCF-0003", template: "CAND-DCF-0003-incentive-programs" }] }));
});

describe("sign-in rules", () => {
  it("accepts only exact @fynxt.com addresses", () => {
    expect(isAllowedEmail("priya@fynxt.com")).toBe(true);
    expect(isAllowedEmail("priya@FYNXT.com")).toBe(true);
    for (const bad of ["priya@gmail.com", "priya@fynxt.com.evil.io", "priya@sub.fynxt.com", "@fynxt.com", "a b@fynxt.com"]) expect(isAllowedEmail(bad)).toBe(false);
  });

  it("signs session cookies and rejects tampered or expired ones", () => {
    const token = sign({ email: "priya@fynxt.com", exp: Date.now() + 1000 });
    expect(verify<{ email: string; exp: number }>(token)?.email).toBe("priya@fynxt.com");
    const [body, mac] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ email: "admin@fynxt.com", exp: Date.now() + 1000 })).toString("base64url")}.${mac}`;
    expect(verify(forged)).toBeNull();
    expect(verify(sign({ email: "x@fynxt.com", exp: Date.now() - 1 }))).toBeNull();
    expect(verify(`${body}.${mac}`, "other-secret")).toBeNull();
  });

  it("verifies Microsoft ID tokens: signature, tenant, audience, expiry and nonce", () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const jwks = { keys: [{ ...(publicKey.export({ format: "jwk" }) as object), kid: "k1" }] };
    const tenantId = "tenant-1";
    const clientId = "client-1";
    const now = Date.now();
    const make = (claims: Record<string, unknown>, kid = "k1") => {
      const h = Buffer.from(JSON.stringify({ alg: "RS256", kid })).toString("base64url");
      const p = Buffer.from(JSON.stringify(claims)).toString("base64url");
      return `${h}.${p}.${rsaSign("RSA-SHA256", Buffer.from(`${h}.${p}`), privateKey).toString("base64url")}`;
    };
    const good = { iss: `https://login.microsoftonline.com/${tenantId}/v2.0`, tid: tenantId, aud: clientId, exp: Math.floor(now / 1000) + 600, nonce: "n1", preferred_username: "Priya@fynxt.com", name: "Priya" };
    const check = { jwks, tenantId, clientId, nonce: "n1", now };
    expect(verifyIdToken(make(good), check)).toEqual({ email: "priya@fynxt.com", name: "Priya" });
    expect(() => verifyIdToken(make({ ...good, tid: "other" }), check)).toThrow(/tenant/);
    expect(() => verifyIdToken(make({ ...good, aud: "other" }), check)).toThrow(/different app/);
    expect(() => verifyIdToken(make({ ...good, exp: Math.floor(now / 1000) - 3600 }), check)).toThrow(/expired/);
    expect(() => verifyIdToken(make({ ...good, nonce: "other" }), check)).toThrow(/browser/);
    expect(() => verifyIdToken(make(good, "unknown"), check)).toThrow(/key/);
    const t = make(good);
    expect(() => verifyIdToken(`${t.split(".")[0]}.${Buffer.from(JSON.stringify({ ...good, aud: clientId, name: "Mallory" })).toString("base64url")}.${t.split(".")[2]}`, check)).toThrow(/signature/);
  });
});

describe("Station users", () => {
  it("lets only invited @fynxt.com users in; Admins invite and set roles", async () => {
    expect(await recordSignIn("priya@fynxt.com", "Priya")).toBeNull();
    expect(await recordSignIn("admin@fynxt.com", "Aman")).toMatchObject({ isAdmin: true, name: "Aman" });
    await expect(inviteUser({ ...admin, isAdmin: false }, { email: "x@fynxt.com", roles: [] })).rejects.toThrow(/Only Admins/);
    await expect(inviteUser(admin, { email: "x@gmail.com", roles: [] })).rejects.toThrow(/@fynxt.com/);
    await expect(inviteUser(admin, { email: "x@fynxt.com", roles: ["Wizard"] })).rejects.toThrow(/Unknown role/);
    await inviteUser(admin, { email: "Priya@fynxt.com", name: "Priya", roles: ["Product Manager"] });
    await inviteUser(admin, { email: "dev@fynxt.com", name: "Dee", roles: ["Product Designer", "UI Code Reviewer"] });
    await inviteUser(admin, { email: "rex@fynxt.com", name: "Rex", roles: ["UI Code Reviewer"] });
    expect(await recordSignIn("priya@fynxt.com", "Priya")).toMatchObject({ roles: ["Product Manager"], isAdmin: false });
    await updateUser(admin, "rex@fynxt.com", { active: false });
    expect(await activeUser("rex@fynxt.com")).toBeNull();
  });
});

describe("case membership", () => {
  it("hides pre-membership cases from everyone but Admins", async () => {
    const priya = (await activeUser("priya@fynxt.com"))!;
    expect((await listCases(priya)).map((c) => c.id)).not.toContain("DCF-0003");
    await expect(accessCase("DCF-0003", priya)).rejects.toThrow(/not found/);
    expect((await listCases((await activeUser("admin@fynxt.com"))!)).map((c) => c.id)).toContain("DCF-0003");
  });

  it("creator sees their case and invites Station users; others can't", async () => {
    const priya = (await activeUser("priya@fynxt.com"))!;
    const dee = (await activeUser("dev@fynxt.com"))!;
    const created = await createRequest({ title: "Leads list", module: "CRM", description: "x", links: [], files: [] }, priya);
    expect((await listCases(priya)).map((c) => c.id)).toContain(created.id);
    await expect(accessCase(created.id, dee)).rejects.toThrow(/not found/);
    await expect(addMember(created.dir, dee, "dev@fynxt.com")).rejects.toThrow(/creator/);
    await expect(addMember(created.dir, priya, "stranger@fynxt.com")).rejects.toThrow(/Station users/);
    await addMember(created.dir, priya, "dev@fynxt.com");
    const detail = await getCase(created.id, dee);
    expect(detail.members.map((m) => m.email)).toEqual(["priya@fynxt.com", "dev@fynxt.com"]);
    expect(detail.canManageMembers).toBe(false);
  });

  it("a change request from a gallery page records the page and brings the source team", async () => {
    await addMember(join(roots.engine, "design-cases", "DCF-0003-object-enrolment"), (await activeUser("admin@fynxt.com"))!, "dev@fynxt.com");
    const priya = (await activeUser("priya@fynxt.com"))!;
    const created = await createRequest(
      {
        title: "Change to Incentive Programs", module: "CRM › Operations", description: "Add an end date.", links: [], files: [],
        changeOf: { pageId: "crm.operations.incentive-programs", pageLabel: "Incentive Programs", caseId: "DCF-0003", template: "CAND-DCF-0003-incentive-programs", caseFolder: "DCF-0003-object-enrolment" },
        members: ["dev@fynxt.com"],
      },
      priya
    );
    expect(readFileSync(join(created.dir, "inputs/request.md"), "utf8")).toContain("design-cases/DCF-0003-object-enrolment/case-file.md");
    const detail = await getCase(created.id, (await activeUser("dev@fynxt.com"))!);
    expect(detail.changeOf?.caseId).toBe("DCF-0003");
    expect(detail.creatorEmail).toBe("priya@fynxt.com");
  });
});

describe("gallery, design tab and pinned comments", () => {
  it("lists registered pages with their case status", async () => {
    expect((await galleryEntries())[0]).toMatchObject({ id: "crm.operations.incentive-programs", published: false, caseStatus: "CODE-REVIEW" });
  });

  it("shows approved frames and build screenshots (PNG only) to members", async () => {
    const detail = await getCase("DCF-0003", (await activeUser("dev@fynxt.com"))!);
    expect(detail.design.map((d) => `${d.group}:${d.name}`)).toEqual(["design:A1-list.png", "build:L1-list.png"]);
    expect(detail.builtPageId).toBe("crm.operations.incentive-programs");
  });

  it("a pinned comment from any signed-in user becomes §11 feedback on the page's case", async () => {
    const priya = (await activeUser("priya@fynxt.com"))!;
    const pin = await addPin(priya, "crm.operations.incentive-programs", { x: 42.5, y: 130, text: "Make | the CTA wording clearer", hint: "Create program" });
    expect(pin).toMatchObject({ id: "P1", x: 42.5, y: 100, feedbackRef: "F1" });
    const md = readFileSync(join(roots.engine, "design-cases", "DCF-0003-object-enrolment", "case-file.md"), "utf8");
    expect(md).toContain("| F1 | 1 | Priya (Product Manager) | Built page · Incentive Programs | [Pin P1 at “Create program”] Make / the CTA wording clearer |");
  });
});
