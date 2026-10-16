// @vitest-environment node
import { exportPage, pageModule } from "./exportPage";

describe("Gallery page download (single HTML file)", () => {
  it("only resolves page ids that are in gallery/registry.ts", async () => {
    expect(await pageModule("crm.tickets-activities.tasks")).toMatch(/gallery\/pages\/crm\/tasks\.page$/);
    expect(await pageModule("../../etc/passwd")).toBeNull();
    await expect(exportPage("not.a.page")).rejects.toThrow("isn't registered");
  });

  it("builds one self-contained HTML file with the page's JS and CSS inline", async () => {
    const { fileName, html } = await exportPage("crm.tickets-activities.tasks");
    expect(fileName).toMatch(/^DCF-0001-crm\.tickets-activities\.tasks-\d{4}-\d{2}-\d{2}\.html$/);
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('<script type="module">');
    expect(html).toContain("--fx-surface-background");
    // Nothing to fetch from Studio: no external scripts or stylesheets other than the web fonts.
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect([...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].every((m) => m[0].includes("fonts.googleapis.com"))).toBe(true);
    expect(html).not.toContain("/api/");
  }, 120_000);
});
