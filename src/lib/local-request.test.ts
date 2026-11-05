import { describe, expect, it } from "vitest";
import { isLocalRequest } from "./local-request";

describe("which requests the dashboard answers", () => {
  it("answers on this machine's own addresses", () => {
    for (const host of ["127.0.0.1:3000", "localhost:3000", "[::1]:3000", "127.0.0.1"]) expect(isLocalRequest(host, null), host).toBe(true);
    expect(isLocalRequest("127.0.0.1:3000", "http://127.0.0.1:3000")).toBe(true);
  });
  it("refuses a website's name pointed at this machine", () => {
    for (const host of ["evil.example", "evil.example:3000", "127.0.0.1.evil.example:3000", null]) expect(isLocalRequest(host, null), String(host)).toBe(false);
  });
  it("refuses a request sent from another site", () => {
    expect(isLocalRequest("127.0.0.1:3000", "https://evil.example")).toBe(false);
    expect(isLocalRequest("evil.example:3000", "http://evil.example:3000")).toBe(false);
    expect(isLocalRequest("127.0.0.1:3000", "null")).toBe(false);
  });
});
