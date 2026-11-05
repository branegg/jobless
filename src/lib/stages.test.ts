import { describe, expect, it } from "vitest";
import { canMove } from "./stages";

describe("canMove", () => {
  it("moves forward, including skipping stages", () => {
    expect(canMove("saved", "packet_ready")).toBe(true);
    expect(canMove("submitted", "interview")).toBe(true);
  });
  it("refuses going backward and staying put", () => {
    expect(canMove("interview", "screening")).toBe(false);
    expect(canMove("offer", "offer")).toBe(false);
  });
  it("can end from any active stage", () => {
    expect(canMove("saved", "withdrawn")).toBe(true);
    expect(canMove("interview", "rejected")).toBe(true);
  });
  it("only a ghosted application can come back", () => {
    expect(canMove("ghosted", "interview")).toBe(true);
    expect(canMove("rejected", "interview")).toBe(false);
  });
});
