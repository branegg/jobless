import { describe, expect, it } from "vitest";
import { linkCitations } from "./citations";

describe("linkCitations", () => {
  it("links plain and code-formatted citations", () => {
    expect(linkCitations("See facts/led-team and `projects/my-app`.")).toBe("See [facts/led-team](/wiki/facts/led-team) and [projects/my-app](/wiki/projects/my-app).");
  });
  it("leaves other paths alone", () => {
    expect(linkCitations("src/facts and other/thing")).toBe("src/facts and other/thing");
  });
});
