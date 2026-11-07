import { afterEach, describe, expect, it } from "vitest";
import { openInTerminal, terminalScript } from "./terminal";

describe("opening a Terminal window", () => {
  afterEach(() => {
    delete process.env.JOBLESSS_OSASCRIPT_BIN;
  });
  it("runs the command from the right folder", () => {
    expect(terminalScript("/Users/me/joblesss", "pnpm agent apply 3")).toBe(`tell application "Terminal"\nactivate\ndo script "cd '/Users/me/joblesss' && pnpm agent apply 3"\nend tell`);
  });
  it("can't be broken out of by an awkward folder name", () => {
    const script = terminalScript(`/tmp/it's "a" \\ folder; rm -rf x`, "pnpm agent apply 3");
    expect(script).toContain(`cd '/tmp/it'\\\\''s \\"a\\" \\\\ folder; rm -rf x' && pnpm agent apply 3`);
  });
  it("reports a failure instead of throwing", async () => {
    process.env.JOBLESSS_OSASCRIPT_BIN = "/nonexistent/osascript";
    expect(await openInTerminal("/tmp", "true")).toMatchObject({ ok: false });
  });
});
