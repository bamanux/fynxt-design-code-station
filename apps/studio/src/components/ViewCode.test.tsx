import { editorUrl } from "./ViewCode";

describe("editorUrl", () => {
  it("builds an editor link to the file under the Station folder", () => {
    expect(editorUrl("vscode", "/Users/a/fynxt-design-code-station/", "packages/ui/src/Badge/Badge.tsx")).toBe("vscode://file/Users/a/fynxt-design-code-station/packages/ui/src/Badge/Badge.tsx");
  });
  it("encodes spaces and accepts Windows paths and other editors", () => {
    expect(editorUrl("cursor", "C:\\Work\\My Station", "a/b.tsx")).toBe("cursor://file/C:/Work/My%20Station/a/b.tsx");
  });
});
