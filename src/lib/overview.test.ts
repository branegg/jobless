import { describe, expect, it } from "vitest";
import { openDb } from "../db";
import { agentRuns, events, inboxFindings } from "../db/schema";
import { agentActivity, countSearch, runningNow, searchOverview, writeBriefing, type SearchCounts } from "./overview";
import { gmailSearchUrl, markReplySeen } from "./inbox/inbox";
import { addApplication, moveStage } from "./tracker";

const fresh = () => openDb(":memory:").db;
const NOW = new Date("2026-11-05T16:30:00Z");
const MINUTE = 60 * 1000;
const none: SearchCounts = { toLookAt: 0, stillToSend: 0, sent: 0, out: 0, replies: 0, interviews: 0, offers: 0 };
const words = (parts: { text: string }[]) => parts.map((part) => part.text).join("").replaceAll("\u00a0", " ");

function add(db: ReturnType<typeof fresh>, company: string, stage: "saved" | "submitted" = "saved") {
  const result = addApplication(db, { company, title: "Engineer", stage });
  if (!result.ok) throw new Error("expected a new application");
  return result.id;
}

describe("counting the search", () => {
  it("counts what is still to send apart from what is out", () => {
    const counts = countSearch(
      [
        { stage: "saved", nextAction: null, appliedAt: null },
        { stage: "packet_ready", nextAction: null, appliedAt: null },
        { stage: "submitted", nextAction: "Follow up if no reply", appliedAt: NOW },
        { stage: "interview", nextAction: null, appliedAt: NOW },
        { stage: "rejected", nextAction: null, appliedAt: NOW },
      ],
      595,
    );
    expect(counts).toEqual({ toLookAt: 595, stillToSend: 2, sent: 3, out: 2, replies: 2, interviews: 1, offers: 0 });
  });
});

describe("the briefing", () => {
  it("says where things stand and flags a possible reply", () => {
    const parts = writeBriefing({ ...none, out: 8, stillToSend: 7 }, ["Northwind"], 1);
    expect(words(parts)).toBe("8 of your 15 applications are out, with no replies yet, though Northwind may have written back. 1 thing needs you.");
    expect(parts.find((part) => part.text.includes("Northwind"))).toMatchObject({ href: "/email", attention: true });
  });
  it("doesn't state a total when every application is out", () => {
    expect(words(writeBriefing({ ...none, out: 3 }, [], 0))).toBe("3 applications are out, with no replies yet. Nothing needs you right now.");
  });
  it("keeps each number on the same line as its noun", () => {
    const linked = writeBriefing({ ...none, out: 8, stillToSend: 14 }, [], 2).filter((part) => part.href);
    expect(linked.map((part) => part.text)).toEqual(["8\u00a0of your 22\u00a0applications", "2\u00a0things"]);
  });
  it("doesn't claim replies when nothing is out", () => {
    expect(words(writeBriefing(none, [], 0))).toBe("Nothing is out right now. Nothing needs you right now.");
  });
  it("uses singular wording for one of each", () => {
    expect(words(writeBriefing({ ...none, out: 1, stillToSend: 1, replies: 1, interviews: 1 }, [], 1))).toBe("1 of your 2 applications is out, with 1 reply, including 1 interview. 1 thing needs you.");
  });
});

describe("replies", () => {
  function reply(db: ReturnType<typeof fresh>, company: string, overrides: Partial<typeof inboxFindings.$inferInsert> = {}) {
    const applicationId = add(db, company, "submitted");
    moveStage(db, applicationId, "screening");
    return db.insert(inboxFindings).values({ applicationId, messageId: company, kind: "screening", confidence: "low", emailAt: NOW, fromAddress: "Mark <mark@example.com>", subject: "Next steps", quote: "We would like to move you forward", status: "applied", ...overrides }).returning().get();
  }
  it("names one new reply in the headline", () => {
    const parts = writeBriefing({ ...none, out: 16, stillToSend: 20, replies: 1 }, [], 0, [{ company: "Northwind", applicationId: 11 }]);
    expect(words(parts)).toBe("16 of your 36 applications are out, with 1 reply from Northwind. Nothing needs you right now.");
    expect(parts.find((part) => part.text.includes("Northwind"))).toMatchObject({ href: "/applications/11", attention: true });
  });
  it("says how many are new when there are older replies too", () => {
    expect(words(writeBriefing({ ...none, out: 3, replies: 3 }, [], 0, [{ company: "Northwind", applicationId: 11 }]))).toBe("3 applications are out, with 3 replies, 1 new from Northwind. Nothing needs you right now.");
    expect(words(writeBriefing({ ...none, out: 3, replies: 3 }, [], 0, [{ company: "A", applicationId: 1 }, { company: "B", applicationId: 2 }]))).toBe("3 applications are out, with 3 replies, 2 new. Nothing needs you right now.");
  });
  it("keeps a reply on the overview until you've dealt with it, then keeps it in the feed", () => {
    const db = fresh();
    const found = reply(db, "Northwind");
    expect(searchOverview(db, 0, NOW).replies.map((item) => item.company)).toEqual(["Northwind"]);
    expect(agentActivity(db, NOW).find((item) => item.tag === "reply")?.text).toBe("Northwind: We would like to move you forward");
    markReplySeen(db, found.id);
    expect(searchOverview(db, 0, NOW).replies).toEqual([]);
    expect(agentActivity(db, NOW).some((item) => item.tag === "reply")).toBe(true);
  });
  it("leaves out suspicious emails and emails waiting for your OK", () => {
    const db = fresh();
    reply(db, "Odd", { suspicious: true });
    reply(db, "Waiting", { status: "pending" });
    expect(searchOverview(db, 0, NOW).replies).toEqual([]);
  });
  it("searches Gmail for the email without letting its text change the link", () => {
    expect(gmailSearchUrl('Mark <mark@example.com>', 'Next "steps"#x')).toBe(`https://mail.google.com/mail/u/0/#search/${encodeURIComponent('from:mark@example.com subject:"Next steps#x"')}`);
  });
});

describe("what the agents did", () => {
  it("names the job being worked on from the event at the same moment", () => {
    const db = fresh();
    const id = add(db, "Vandelay");
    const at = new Date(NOW.getTime() - MINUTE);
    db.insert(agentRuns).values({ id: "r1", agent: "apply", startedAt: at, status: "running" }).run();
    db.insert(events).values({ applicationId: id, at, kind: "note", summary: "Started filling in the form", source: "apply" }).run();
    expect(runningNow(db, NOW)[0]).toMatchObject({ text: "Filling in the form for Engineer at Vandelay", applicationId: id });
  });
  it("doesn't call an abandoned run live", () => {
    const db = fresh();
    db.insert(agentRuns).values({ id: "r1", agent: "apply", startedAt: new Date(NOW.getTime() - 3 * 60 * MINUTE), status: "running" }).run();
    expect(runningNow(db, NOW)).toEqual([]);
    expect(agentActivity(db, NOW)).toEqual([]);
  });
  it("reports what each run did, and flags runs that didn't finish", () => {
    const db = fresh();
    db.insert(agentRuns).values({ id: "f", agent: "fetch-jobs", startedAt: new Date(NOW.getTime() - 60 * MINUTE), endedAt: new Date(NOW.getTime() - 59 * MINUTE), status: "ok", result: "Checked 363 companies, 248 new jobs, 174 closed" }).run();
    db.insert(agentRuns).values({ id: "b", agent: "inbox", startedAt: new Date(NOW.getTime() - 90 * MINUTE), endedAt: new Date(NOW.getTime() - 89 * MINUTE), status: "blocked" }).run();
    expect(agentActivity(db, NOW).map(({ tag, text }) => [tag, text])).toEqual([
      ["done", "Checked 363 companies, 248 new jobs, 174 closed"],
      ["blocked", "Email check"],
    ]);
  });
  it("folds repeated runs of the same agent into one line", () => {
    const db = fresh();
    for (const [index, id] of ["a", "b", "c"].entries()) {
      db.insert(agentRuns).values({ id, agent: "job-scout", startedAt: new Date(NOW.getTime() - (index + 1) * MINUTE), endedAt: NOW, status: "ok" }).run();
    }
    expect(agentActivity(db, NOW).map((item) => item.text)).toEqual(["Scored new jobs"]);
  });
});
