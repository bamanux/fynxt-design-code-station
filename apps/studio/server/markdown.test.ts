import { appendTableRow, parseFrontmatter, sectionTable, setFrontmatter } from "./markdown";

const md = `---
id: DCF-0001
title: Leads list
status: IN-REVIEW
revision: 2
figma:
  fileKey: null
  approvedVersionId: null
---

# DCF-0001

## 11. Review Feedback

| # | Rev | Reviewer | Section | Feedback | Resolution (FDI) | Closed? |
|---|---|---|---|---|---|---|

## 13. Status History

| Date | From → To | Who | Note |
|---|---|---|---|
| 2026-10-12 | — → DRAFT | FDI | Created |
`;

describe("case-file markdown", () => {
  it("parses top-level and nested frontmatter", () => {
    const fm = parseFrontmatter(md);
    expect(fm.status).toBe("IN-REVIEW");
    expect(fm.figma).toEqual({ fileKey: null, approvedVersionId: null });
  });

  it("updates top-level and nested values", () => {
    let out = setFrontmatter(md, "status", "APPROVED");
    out = setFrontmatter(out, "figma.fileKey", "abc123");
    const fm = parseFrontmatter(out);
    expect(fm.status).toBe("APPROVED");
    expect(fm.figma).toEqual({ fileKey: "abc123", approvedVersionId: null });
  });

  it("appends escaped rows to the right section table", () => {
    const out = appendTableRow(md, 11, ["F1", "2", "Asha (Product Manager)", "§5", "Use a | pipe\nand newline", "", "No"]);
    const rows = sectionTable(out, 11);
    expect(rows).toHaveLength(1);
    expect(rows[0]![4]).toBe("Use a | pipe\nand newline");
    expect(sectionTable(out, 13)).toHaveLength(1);
  });
});
