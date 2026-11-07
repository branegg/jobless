import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { enforceImportRules, entryPath, getEntry, readVault, slugify, snapshotVault, uniqueSlug, updateEntry, usableInApplications, vaultDir, writeEntry, type Entry, type Frontmatter } from "./entries";
import { searchVault, splitSnippet, toFtsQuery } from "./search";

let dir: string;
const base: Frontmatter = { title: "Shipped X", status: "draft", visibility: "private", source: "me", tags: [], links: [], screenshots: [] };

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-"));
  process.env.JOBLESSS_VAULT = dir;
});
afterEach(() => {
  delete process.env.JOBLESSS_VAULT;
  fs.rmSync(dir, { recursive: true, force: true });
});

function raw(relative: string, text: string) {
  const file = path.join(vaultDir(), relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return file;
}

describe("entries", () => {
  it("round-trips an entry", () => {
    writeEntry("facts", "shipped-x", { ...base, status: "confirmed", tags: ["a"] }, "Body text");
    expect(getEntry("facts", "shipped-x")).toMatchObject({ title: "Shipped X", status: "confirmed", tags: ["a"], body: "Body text" });
  });
  it("treats missing status and visibility as draft and private", () => {
    raw("facts/a.md", "---\ntitle: A\n---\nbody");
    expect(readVault().entries[0]).toMatchObject({ status: "draft", visibility: "private" });
  });
  it("reports a broken file without hiding the good ones", () => {
    raw("facts/good.md", "---\ntitle: Good\n---\nbody");
    raw("facts/bad.md", "---\nstatus: confirmed\n---\nno title");
    raw("facts/broken-yaml.md", "---\ntitle: [unclosed\n---\nbody");
    const { entries, problems } = readVault();
    expect(entries.map((entry) => entry.slug)).toEqual(["good"]);
    expect(problems.map((problem) => problem.file).sort()).toEqual(["facts/bad.md", "facts/broken-yaml.md"]);
  });
  it("rejects a status it doesn't know instead of guessing", () => {
    raw("facts/a.md", "---\ntitle: A\nstatus: verified\n---\nbody");
    expect(readVault().problems).toHaveLength(1);
  });
  it("rejects link addresses that aren't web links", () => {
    raw("projects/a.md", "---\ntitle: A\nlinks:\n  - label: x\n    url: javascript:alert(1)\n---\nbody");
    expect(readVault().problems).toHaveLength(1);
  });
  it("refuses paths that leave the vault", () => {
    expect(() => entryPath("facts", "../../etc/passwd")).toThrow();
    expect(() => entryPath("../secret" as "facts", "a")).toThrow();
  });
  it("can clear a review note", () => {
    writeEntry("facts", "a", { ...base, reviewNote: "Check the date" }, "Claim");
    expect(getEntry("facts", "a")?.reviewNote).toBe("Check the date");
    expect(updateEntry("facts", "a", { status: "confirmed", reviewNote: undefined }).reviewNote).toBeUndefined();
    expect(fs.readFileSync(entryPath("facts", "a"), "utf8")).not.toContain("reviewNote");
  });
  it("updates only the fields given", () => {
    writeEntry("facts", "a", { ...base, tags: ["keep"] }, "Keep me");
    const updated = updateEntry("facts", "a", { status: "confirmed" });
    expect(updated).toMatchObject({ status: "confirmed", tags: ["keep"], body: "Keep me" });
  });
  it("makes readable, unique file names, including Polish letters", () => {
    expect(slugify("Łódź — Żółć & więcej!")).toBe("lodz-zolc-wiecej");
    writeEntry("facts", "my-title", base, "x");
    expect(uniqueSlug("facts", "My title")).toBe("my-title-2");
  });
});

describe("what can reach an application", () => {
  const entry = (status: Entry["status"], visibility: Entry["visibility"]) => ({ ...base, status, visibility, slug: `${status}-${visibility}`, kind: "facts", body: "", updatedAt: new Date() }) as Entry;
  it("only confirmed public entries", () => {
    const usable = usableInApplications([entry("confirmed", "public"), entry("confirmed", "private"), entry("draft", "public"), entry("draft", "private"), entry("rejected", "public")]);
    expect(usable.map((item) => item.slug)).toEqual(["confirmed-public"]);
  });
});

describe("import rules", () => {
  it("restores anything the import changed or deleted", () => {
    const edited = raw("facts/edited.md", "---\ntitle: Mine\nstatus: confirmed\n---\noriginal");
    const deleted = raw("facts/deleted.md", "---\ntitle: Gone\n---\nbody");
    const prefs = raw("preferences.md", "Remote only");
    const before = snapshotVault();
    fs.writeFileSync(edited, "---\ntitle: Tampered\nstatus: confirmed\n---\nchanged");
    fs.rmSync(deleted);
    fs.writeFileSync(prefs, "Anything goes");
    const report = enforceImportRules(before);
    expect(report.restored.sort()).toEqual(["facts/deleted.md", "facts/edited.md", "preferences.md"]);
    expect(getEntry("facts", "edited")?.title).toBe("Mine");
    expect(getEntry("facts", "deleted")?.title).toBe("Gone");
    expect(fs.readFileSync(prefs, "utf8")).toBe("Remote only");
  });
  it("forces new entries to draft, so an import can't confirm its own claims", () => {
    const before = snapshotVault();
    raw("facts/new.md", "---\ntitle: New\nstatus: confirmed\nvisibility: public\n---\nbody");
    const report = enforceImportRules(before);
    expect(report.forcedToDraft).toEqual(["facts/new.md"]);
    expect(getEntry("facts", "new")).toMatchObject({ status: "draft", visibility: "public", body: "body" });
  });
  it("removes files created outside the entry folders", () => {
    const before = snapshotVault();
    const stray = raw("preferences-2.md", "x");
    const nested = raw("facts/sub/deep.md", "---\ntitle: Deep\n---\nx");
    const report = enforceImportRules(before);
    expect(report.removed.sort()).toEqual(["facts/sub/deep.md", "preferences-2.md"]);
    expect(fs.existsSync(stray)).toBe(false);
    expect(fs.existsSync(nested)).toBe(false);
  });
});

describe("search", () => {
  const entry = (slug: string, title: string, body: string, status: Entry["status"] = "confirmed") => ({ ...base, status, title, slug, kind: "facts", body, updatedAt: new Date() }) as Entry;
  it("matches prefixes and ignores Polish accents", () => {
    const db = new Database(":memory:");
    const entries = [entry("a", "Zażółć gęślą", "kubernetes migration"), entry("b", "Other", "nothing here")];
    expect(searchVault(db, entries, "zazolc").map((hit) => hit.slug)).toEqual(["a"]);
    expect(searchVault(db, entries, "kuber").map((hit) => hit.slug)).toEqual(["a"]);
    expect(searchVault(db, entries, "Zażółć").map((hit) => hit.slug)).toEqual(["a"]);
  });
  it("hides rejected entries", () => {
    const db = new Database(":memory:");
    expect(searchVault(db, [entry("a", "Secret", "hidden", "rejected")], "hidden")).toEqual([]);
  });
  it("handles search syntax typed by accident", () => {
    const db = new Database(":memory:");
    const entries = [entry("a", "C++ work", "AND OR NOT")];
    for (const text of ['"', "AND", "c++ (", "NEAR(", "*", "a:b"]) {
      expect(() => searchVault(db, entries, text)).not.toThrow();
    }
    expect(toFtsQuery("!!!")).toBeUndefined();
  });
  it("marks matches without using HTML", () => {
    expect(splitSnippet("a \u0001b\u0002 <i>c</i>")).toEqual([{ text: "a ", match: false }, { text: "b", match: true }, { text: " <i>c</i>", match: false }]);
  });
});
