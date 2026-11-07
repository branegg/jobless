import { and, desc, eq, gte, lte, notInArray } from "drizzle-orm";
import type { Db } from "../db";
import { agentRuns, applications, companies, events, jobs } from "../db/schema";
import { runName } from "./format";
import { pendingFindings, repliesFound, repliesToRead } from "./inbox/inbox";
import { hasBeenSent, isEndStage, type Stage } from "./stages";
import { applicationsToAskAbout, dueApplications, listApplications, type ApplicationRow } from "./tracker";

const LIVE_WINDOW_MS = 60 * 60 * 1000;
const SAME_MOMENT_MS = 5 * 1000;
const FEED_SCAN = 60;
const REPLY_STAGES: Stage[] = ["screening", "interview", "offer", "rejected"];
const INTERVIEW_STAGES: Stage[] = ["interview", "offer"];
const REPLY_KINDS = ["screening", "interview", "offer", "rejection"];

export type SearchCounts = { toLookAt: number; stillToSend: number; sent: number; out: number; replies: number; interviews: number; offers: number };

export function countSearch(applied: Pick<ApplicationRow, "stage" | "nextAction" | "appliedAt">[], toLookAt: number): SearchCounts {
  const open = applied.filter((application) => !isEndStage(application.stage));
  const out = open.filter((application) => hasBeenSent(application.stage)).length;
  return {
    toLookAt,
    stillToSend: open.length - out,
    sent: applied.filter((application) => hasBeenSent(application.stage) || application.appliedAt !== null).length,
    out,
    replies: applied.filter((application) => REPLY_STAGES.includes(application.stage)).length,
    interviews: applied.filter((application) => INTERVIEW_STAGES.includes(application.stage)).length,
    offers: applied.filter((application) => application.stage === "offer").length,
  };
}

export type BriefingPart = { text: string; href?: string; attention?: boolean };
export type NewReply = { company: string; applicationId: number };

const plural = (count: number, one: string, many = `${one}s`) => `${count}\u00a0${count === 1 ? one : many}`;

export function writeBriefing(counts: SearchCounts, possibleReplies: string[], others: number, newReplies: NewReply[] = [], repliesHref = "/applications"): BriefingPart[] {
  const parts: BriefingPart[] = [];
  const total = counts.out + counts.stillToSend;
  if (counts.out > 0) {
    const outLabel = counts.out === total ? plural(counts.out, "application") : `${counts.out}\u00a0of your ${plural(total, "application")}`;
    parts.push({ text: outLabel, href: "/applications#stage-submitted" }, { text: counts.out === 1 ? " is out" : " are out" });
  } else {
    parts.push({ text: "Nothing is out right now" });
  }
  if (counts.replies > 0) {
    const replyWords = plural(counts.replies, "reply", "replies");
    const fresh = new Set(newReplies.map((reply) => reply.company));
    const named = fresh.size === 1 ? newReplies[0] : undefined;
    if (named && counts.replies === newReplies.length) {
      parts.push({ text: ", with " }, { text: `${replyWords} from ${named.company}`, href: `/applications/${named.applicationId}`, attention: true });
    } else {
      parts.push({ text: ", with " }, { text: replyWords, href: repliesHref });
      if (newReplies.length > 0) parts.push({ text: ", " }, { text: named ? `${newReplies.length}\u00a0new from ${named.company}` : `${newReplies.length}\u00a0new`, href: named ? `/applications/${named.applicationId}` : "#replies-heading", attention: true });
    }
    if (counts.interviews > 0) parts.push({ text: ", including " }, { text: plural(counts.interviews, "interview"), href: "/applications#stage-interview" });
  } else if (counts.out > 0) {
    parts.push({ text: ", with no replies yet" });
  }
  if (possibleReplies.length > 0) {
    const who = possibleReplies.length === 1 ? `${possibleReplies[0]} may have written back` : `${possibleReplies.length}\u00a0companies may have written back`;
    parts.push({ text: counts.replies > 0 ? ", and " : ", though " }, { text: who, href: "/email", attention: true });
  }
  parts.push({ text: ". " });

  if (others > 0) {
    parts.push({ text: plural(others, "thing"), href: "#needs-you", attention: true }, { text: others === 1 ? " needs you." : " need you." });
  } else {
    parts.push({ text: "Nothing needs you right now." });
  }
  return parts;
}

export type RunningNow = { id: string; agent: string; startedAt: Date; text: string; applicationId: number | null };

function liveText(agent: string, job: string | null): string {
  if (agent === "tailor") return job ? `Writing the CV and answers for ${job}` : "Writing a CV and answers";
  if (agent === "apply") return job ? `Filling in the form for ${job}` : "Filling in a form";
  return `${runName(agent)} is running`;
}

export function runningNow(db: Db, now: Date = new Date()): RunningNow[] {
  const runs = db.select().from(agentRuns).where(and(eq(agentRuns.status, "running"), gte(agentRuns.startedAt, new Date(now.getTime() - LIVE_WINDOW_MS)))).orderBy(desc(agentRuns.startedAt)).all();
  return runs.map((run) => {
    const event = db
      .select({ applicationId: events.applicationId, title: jobs.title, company: companies.name })
      .from(events)
      .innerJoin(applications, eq(events.applicationId, applications.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(and(gte(events.at, new Date(run.startedAt.getTime() - SAME_MOMENT_MS)), lte(events.at, new Date(run.startedAt.getTime() + SAME_MOMENT_MS))))
      .orderBy(desc(events.id))
      .get();
    return { id: run.id, agent: run.agent, startedAt: run.startedAt, text: liveText(run.agent, event ? `${event.title} at ${event.company}` : null), applicationId: event?.applicationId ?? null };
  });
}

export type ActivityTag = "running" | "reply" | "done" | "failed" | "blocked";
export type ActivityItem = { key: string; at: Date; tag: ActivityTag; text: string; href?: string };

const RUN_SENTENCES: Record<string, string> = {
  "fetch-jobs": "Checked for new jobs",
  inbox: "Read your email",
  "job-scout": "Scored new jobs",
  "profile-import": "Read your files for profile drafts",
};

export function agentActivity(db: Db, now: Date = new Date(), limit = 10): ActivityItem[] {
  const live = runningNow(db, now);
  const quiet = db.select().from(agentRuns).where(notInArray(agentRuns.status, ["running"])).orderBy(desc(agentRuns.startedAt)).limit(FEED_SCAN).all();
  const runItems: ActivityItem[] = [];
  let previous: string | undefined;
  for (const run of quiet) {
    if (run.status === "ok" && run.agent === previous) continue;
    previous = run.status === "ok" ? run.agent : undefined;
    const text = run.status === "ok" ? run.result?.trim() || RUN_SENTENCES[run.agent] || runName(run.agent) : runName(run.agent);
    runItems.push({ key: `run-${run.id}`, at: run.endedAt ?? run.startedAt, tag: run.status === "ok" ? "done" : run.status === "blocked" ? "blocked" : "failed", text, href: run.status === "ok" ? undefined : "/runs" });
  }

  const replies: ActivityItem[] = repliesFound(db).map((reply) => ({ key: `reply-${reply.id}`, at: reply.createdAt, tag: "reply", text: `${reply.company}: ${reply.quote || reply.subject}`, href: `/applications/${reply.applicationId}` }));

  const finished = [...replies, ...runItems].sort((a, b) => b.at.getTime() - a.at.getTime());
  const running: ActivityItem[] = live.map((run) => ({ key: `live-${run.id}`, at: run.startedAt, tag: "running", text: run.text, href: run.applicationId ? `/applications/${run.applicationId}` : undefined }));
  return [...running, ...finished].slice(0, limit);
}

export function searchOverview(db: Db, toLookAt: number, now: Date = new Date()) {
  const all = listApplications(db);
  const counts = countSearch(all, toLookAt);
  const due = dueApplications(db, now);
  const toAsk = applicationsToAskAbout(db, now);
  const emails = pendingFindings(db);
  const possibleReplies = [...new Set(emails.filter((email) => REPLY_KINDS.includes(email.kind) && !email.suspicious).map((email) => email.company))];
  const replies = repliesToRead(db);
  const openReplyStage = (["screening", "interview", "offer"] as const).find((stage) => all.some((application) => application.stage === stage));
  const repliesHref = openReplyStage ? `/applications#stage-${openReplyStage}` : "/applications#stage-closed";
  return { counts, due, toAsk, emails, possibleReplies, replies, repliesHref };
}
