import { describe, expect, it } from "vitest";
import { openDb } from "../db";
import { companies, jobs } from "../db/schema";
import { addApplication, addNote, deleteApplication, dueApplications, FOLLOW_UP, getApplication, listApplications, moveStage, normalizeUrl, setNextAction, undoLastMove, updateDetails } from "./tracker";

function add(db: ReturnType<typeof openDb>["db"], extra = {}) {
  const result = addApplication(db, { company: "Acme", title: "Head of Engineering", ...extra });
  if (!result.ok) throw new Error("expected a new application");
  return result.id;
}
const fresh = () => openDb(":memory:").db;
const DAY = 24 * 60 * 60 * 1000;

describe("adding applications", () => {
  it("starts saved, with a timeline entry", () => {
    const db = fresh();
    const application = getApplication(db, add(db, { note: "Referred by Ola" }))!;
    expect(application.stage).toBe("saved");
    expect(application.company).toBe("Acme");
    expect(application.timeline.map((event) => event.summary)).toEqual(["Referred by Ola", "Added as Saved"]);
  });
  it("reuses a company whatever the capitalisation", () => {
    const db = fresh();
    add(db);
    add(db, { company: "ACME", title: "CTO" });
    expect(db.select().from(companies).all()).toHaveLength(1);
  });
  it("keeps differently named companies apart even when their names have no latin letters", () => {
    const db = fresh();
    add(db, { company: "株式会社" });
    add(db, { company: "合同会社" });
    expect(new Set(listApplications(db).map((row) => row.company))).toEqual(new Set(["株式会社", "合同会社"]));
  });
  it("keeps a description given by hand, and the list knows whether there is one", () => {
    const db = fresh();
    add(db, { description: "  Lead the team  " });
    add(db, { company: "Other", title: "CTO", description: "   " });
    const rows = listApplications(db);
    expect(rows.find((row) => row.company === "Acme")!.hasDescription).toBe(true);
    expect(rows.find((row) => row.company === "Other")!.hasDescription).toBe(false);
  });
  it("spots the same job by link, ignoring tracking codes", () => {
    const db = fresh();
    const id = add(db, { url: "https://jobs.acme.com/1/?utm_source=x#apply" });
    expect(addApplication(db, { company: "Other", title: "Other", url: "https://jobs.acme.com/1" })).toEqual({ ok: false, existingId: id });
  });
  it("spots the same job by company and title", () => {
    const db = fresh();
    const id = add(db);
    expect(addApplication(db, { company: "acme", title: "head of engineering" })).toEqual({ ok: false, existingId: id });
  });
  it("uses the given date when it was already sent, and a follow-up from that date", () => {
    const db = fresh();
    const sent = new Date(Date.now() - 30 * DAY);
    const application = getApplication(db, add(db, { stage: "submitted", appliedAt: sent }))!;
    expect(application.appliedAt?.getTime()).toBe(Math.floor(sent.getTime() / 1000) * 1000);
    expect(application.nextAction).toBe(FOLLOW_UP);
    expect(dueApplications(db).map((row) => row.id)).toEqual([application.id]);
  });
  it("ignores a sent date on something not sent yet", () => {
    const db = fresh();
    expect(getApplication(db, add(db, { stage: "saved", appliedAt: new Date() }))!.appliedAt).toBeNull();
  });
});

describe("moving between stages", () => {
  it("records when it was sent, plans a follow-up and marks the job", () => {
    const db = fresh();
    const id = add(db);
    moveStage(db, id, "submitted");
    const application = getApplication(db, id)!;
    expect(application.appliedAt).toBeInstanceOf(Date);
    expect(application.nextAction).toBe(FOLLOW_UP);
    expect(application.nextActionAt!.getTime()).toBeGreaterThan(Date.now() + 6 * DAY);
    expect(dueApplications(db)).toEqual([]);
    expect(db.select().from(jobs).get()!.status).toBe("applied");
  });
  it("drops the automatic follow-up once they reply, but keeps one you wrote", () => {
    const db = fresh();
    const id = add(db);
    moveStage(db, id, "submitted");
    moveStage(db, id, "screening");
    expect(getApplication(db, id)!.nextAction).toBeNull();
    setNextAction(db, id, "Prepare for the call", new Date());
    moveStage(db, id, "interview");
    expect(getApplication(db, id)!.nextAction).toBe("Prepare for the call");
  });
  it("clears the next step when it ends and stops counting it as due", () => {
    const db = fresh();
    const id = add(db);
    setNextAction(db, id, "Email them", new Date(Date.now() - DAY));
    expect(dueApplications(db)).toHaveLength(1);
    moveStage(db, id, "rejected");
    expect(getApplication(db, id)!.nextAction).toBeNull();
    expect(dueApplications(db)).toEqual([]);
  });
  it("refuses a backward move and changes nothing", () => {
    const db = fresh();
    const id = add(db, { stage: "interview" });
    expect(() => moveStage(db, id, "screening")).toThrow(/Can't move/);
    expect(getApplication(db, id)!.stage).toBe("interview");
    expect(getApplication(db, id)!.timeline).toHaveLength(1);
  });
  it("keeps where a move came from, as evidence for later", () => {
    const db = fresh();
    const id = add(db, { stage: "submitted" });
    moveStage(db, id, "rejected", { source: "inbox", evidence: "Email on 3 Nov" });
    expect(getApplication(db, id)!.timeline[0]).toMatchObject({ source: "inbox", evidence: "Email on 3 Nov", fromStage: "submitted", toStage: "rejected" });
  });
});

describe("undo", () => {
  it("puts back the earlier stage and keeps the mistake in the timeline", () => {
    const db = fresh();
    const id = add(db, { stage: "submitted" });
    const sent = getApplication(db, id)!.appliedAt;
    moveStage(db, id, "rejected");
    expect(undoLastMove(db, id)).toBe(true);
    const application = getApplication(db, id)!;
    expect(application.stage).toBe("submitted");
    expect(application.appliedAt).toEqual(sent);
    expect(application.nextAction).toBe(FOLLOW_UP);
    expect(application.timeline).toHaveLength(3);
  });
  it("forgets the sent date and follow-up when undoing the send", () => {
    const db = fresh();
    const id = add(db);
    moveStage(db, id, "submitted");
    undoLastMove(db, id);
    const application = getApplication(db, id)!;
    expect(application.stage).toBe("saved");
    expect(application.appliedAt).toBeNull();
    expect(application.nextAction).toBeNull();
    expect(db.select().from(jobs).get()!.status).toBe("shortlisted");
  });
  it("has nothing to undo right after adding", () => {
    const db = fresh();
    const id = add(db);
    expect(undoLastMove(db, id)).toBe(false);
    expect(getApplication(db, id)!.stage).toBe("saved");
  });
});

describe("notes, details and deleting", () => {
  it("adds a note", () => {
    const db = fresh();
    const id = add(db);
    addNote(db, id, "  Spoke to Ola  ");
    expect(getApplication(db, id)!.timeline[0]).toMatchObject({ kind: "note", summary: "Spoke to Ola" });
  });
  it("only counts a next step as due once its day comes", () => {
    const db = fresh();
    const id = add(db);
    setNextAction(db, id, "Later", new Date(Date.now() + DAY));
    expect(dueApplications(db)).toEqual([]);
    expect(dueApplications(db, new Date(Date.now() + 2 * DAY))).toHaveLength(1);
    setNextAction(db, id, null, null);
    expect(dueApplications(db, new Date(Date.now() + 2 * DAY))).toEqual([]);
  });
  it("fixes the details", () => {
    const db = fresh();
    const id = add(db);
    updateDetails(db, id, { company: "Acme Labs", title: "CTO", url: "https://acme.dev/cto", location: "London" });
    expect(getApplication(db, id)).toMatchObject({ company: "Acme Labs", title: "CTO", url: "https://acme.dev/cto", location: "London" });
  });
  it("deletes the application, its timeline and the hand-added job", () => {
    const db = fresh();
    const id = add(db);
    deleteApplication(db, id);
    expect(listApplications(db)).toEqual([]);
    expect(db.select().from(jobs).all()).toEqual([]);
  });
  it("tidies links but refuses what isn't one", () => {
    expect(normalizeUrl(" https://a.io/x/?utm_medium=y&id=1 ")).toBe("https://a.io/x/?id=1");
    expect(() => normalizeUrl("not a link")).toThrow();
  });
});
