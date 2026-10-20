// @vitest-environment node
import { componentCode, pageCode } from "./code";

describe("View code: files behind a page or component", () => {
  it("lists a gallery page's config, template and the @fynxt/ui components it uses", async () => {
    const code = await pageCode("crm.tickets-activities.tasks");
    const groups = [...new Set(code.files.map((f) => f.group))];
    expect(groups[0]).toBe("Page");
    expect(groups.some((g) => g.startsWith("Template · CAND-DCF-0001"))).toBe(true);
    expect(groups).toContain("Components (@fynxt/ui)");
    expect(code.files.map((f) => f.path)).toContain("apps/studio/gallery/pages/crm/tasks.config.tsx");
    expect(code.files.some((f) => f.path === "packages/ui/src/Button/Button.tsx")).toBe(true);
    expect(code.files.every((f) => !f.path.startsWith("/") && !f.path.includes(".."))).toBe(true);
  });

  it("lists a component's folder, source first, tests and Code Connect last", async () => {
    const code = await componentCode("Badge");
    expect(code.folder).toBe("packages/ui/src/Badge");
    expect(code.files[0]!.path).toBe("packages/ui/src/Badge/Badge.tsx");
    expect(code.files.at(-1)!.path).toMatch(/\.figma\.tsx$/);
  });

  it("only accepts registered pages and plain component names", async () => {
    await expect(pageCode("../../etc")).rejects.toThrow("isn't registered");
    await expect(componentCode("../Field")).rejects.toThrow("Invalid component name");
    await expect(componentCode("Nope")).rejects.toThrow("not found");
  });
});
