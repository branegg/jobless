import { and, asc, desc, eq, gte, inArray, isNull, notInArray } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../../db";
import { applications, companies, events, jobs } from "../../db/schema";
import { normalizeUrl } from "../tracker";
import { slugify } from "../vault/entries";
import type { Ats, FeedJob } from "./feeds";
import type { BoardJob, BoardSource } from "./boards";
import { matchesSearch, titleRank, type Search } from "./watchlist";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

function companyRow(tx: Tx, name: string, board?: { ats: Ats; token: string }) {
  const slug = slugify(name);
  const found = tx.select().from(companies).where(eq(companies.slug, slug)).get();
  if (!found) return tx.insert(companies).values({ name, slug, ats: board?.ats, boardToken: board?.token }).returning().get();
  if (board && (found.ats !== board.ats || found.boardToken !== board.token)) {
    tx.update(companies).set({ ats: board.ats, boardToken: board.token }).where(eq(companies.id, found.id)).run();
  }
  return found;
}

function urlKey(url: string | null): string | null {
  if (!url) return null;
  try {
    return normalizeUrl(url);
  } catch {
    return null;
  }
}

export type SyncResult = { added: number; updated: number; closed: number; reopened: number };

export function syncCompanyJobs(db: Db, board: { name: string; ats: Ats; token: string }, feed: FeedJob[], now: Date = new Date()): SyncResult {
  return db.transaction((tx) => {
    const result: SyncResult = { added: 0, updated: 0, closed: 0, reopened: 0 };
    const company = companyRow(tx, board.name, board);
    const known = new Map(tx.select().from(jobs).where(and(eq(jobs.companyId, company.id), eq(jobs.source, board.ats))).all().map((job) => [job.externalId, job]));
    const byHand = new Set(tx.select({ url: jobs.url }).from(jobs).where(inArray(jobs.source, ["manual", "url"])).all().map((job) => job.url));

    for (const job of feed) {
      const existing = known.get(job.externalId);
      if (existing) {
        const reopen = existing.status === "closed";
        tx.update(jobs)
          .set({ title: job.title, location: job.location, url: job.url, description: job.description, compensation: job.compensation, lastSeenAt: now, status: reopen ? "new" : existing.status })
          .where(eq(jobs.id, existing.id))
          .run();
        if (reopen) result.reopened++;
        else result.updated++;
      } else if (!byHand.has(urlKey(job.url))) {
        tx.insert(jobs).values({ ...job, source: board.ats, companyId: company.id, firstSeenAt: now, lastSeenAt: now }).run();
        result.added++;
      }
    }

    if (feed.length > 0) {
      const seen = new Set(feed.map((job) => job.externalId));
      for (const job of known.values()) {
        if (!seen.has(job.externalId) && job.status !== "closed" && job.status !== "applied") {
          tx.update(jobs).set({ status: "closed" }).where(eq(jobs.id, job.id)).run();
          result.closed++;
        }
      }
    }
    return result;
  });
}

const STALE_AFTER_DAYS = 14;

function titleKey(company: string, title: string): string {
  return `${company}|${title.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim()}`;
}

export type BoardSyncResult = { added: number; duplicates: number; closed: number };

export function knownBoardJobIds(db: Db, source: BoardSource): Set<string> {
  return new Set(db.select({ id: jobs.externalId }).from(jobs).where(eq(jobs.source, source)).all().map((row) => row.id));
}

export function syncBoardJobs(db: Db, source: BoardSource, found: BoardJob[], now: Date = new Date()): BoardSyncResult {
  return db.transaction((tx) => {
    const result: BoardSyncResult = { added: 0, duplicates: 0, closed: 0 };
    const known = new Map(tx.select().from(jobs).where(eq(jobs.source, source)).all().map((job) => [job.externalId, job]));
    const open = new Set(
      tx
        .select({ slug: companies.slug, title: jobs.title })
        .from(jobs)
        .innerJoin(companies, eq(jobs.companyId, companies.id))
        .where(notInArray(jobs.status, ["closed"]))
        .all()
        .map((row) => titleKey(row.slug, row.title)),
    );
    const links = new Set(tx.select({ url: jobs.url }).from(jobs).all().map((row) => row.url).filter(Boolean));
    for (const { company, partial, ...job } of found) {
      const existing = known.get(job.externalId);
      if (existing) {
        tx.update(jobs).set({ lastSeenAt: now, status: existing.status === "closed" ? "new" : existing.status }).where(eq(jobs.id, existing.id)).run();
        continue;
      }
      const key = titleKey(slugify(company), job.title);
      if (open.has(key) || (job.url && links.has(job.url))) {
        result.duplicates++;
        continue;
      }
      const owner = companyRow(tx, company);
      tx.insert(jobs).values({ ...job, source, companyId: owner.id, previewOnly: partial, firstSeenAt: now, lastSeenAt: now }).run();
      open.add(key);
      if (job.url) links.add(job.url);
      result.added++;
    }
    if (found.length > 0) {
      const cutoff = now.getTime() - STALE_AFTER_DAYS * 86_400_000;
      for (const job of known.values()) {
        if (job.status === "new" && job.lastSeenAt.getTime() < cutoff && !found.some((item) => item.externalId === job.externalId)) {
          tx.update(jobs).set({ status: "closed" }).where(eq(jobs.id, job.id)).run();
          result.closed++;
        }
      }
    }
    return result;
  });
}

export type PastedResult = { id: number; isNew: boolean };

export function addPastedBoardJob(db: Db, board: { name: string; ats: Ats; token: string }, job: FeedJob): PastedResult {
  return db.transaction((tx) => {
    const company = companyRow(tx, board.name, board);
    const existing = tx.select().from(jobs).where(and(eq(jobs.source, board.ats), eq(jobs.externalId, job.externalId))).get();
    if (existing) {
      tx.update(jobs).set({ pasted: true, status: existing.status === "dismissed" || existing.status === "closed" ? "new" : existing.status }).where(eq(jobs.id, existing.id)).run();
      return { id: existing.id, isNew: false };
    }
    const row = tx.insert(jobs).values({ ...job, source: board.ats, companyId: company.id, pasted: true }).returning().get();
    return { id: row.id, isNew: true };
  });
}

export function addPastedJob(db: Db, input: { company: string; title: string; url: string; location?: string; description?: string }): PastedResult {
  const url = normalizeUrl(input.url);
  return db.transaction((tx) => {
    const existing = tx.select().from(jobs).where(eq(jobs.url, url)).get();
    if (existing) {
      tx.update(jobs).set({ pasted: true, status: existing.status === "dismissed" || existing.status === "closed" ? "new" : existing.status }).where(eq(jobs.id, existing.id)).run();
      return { id: existing.id, isNew: false };
    }
    const company = companyRow(tx, input.company.trim());
    const row = tx
      .insert(jobs)
      .values({ source: "url", externalId: url, companyId: company.id, title: input.title.trim(), url, location: input.location?.trim() || null, description: input.description?.trim() || null, pasted: true })
      .returning()
      .get();
    return { id: row.id, isNew: true };
  });
}

const summary = {
  id: jobs.id,
  title: jobs.title,
  location: jobs.location,
  url: jobs.url,
  compensation: jobs.compensation,
  score: jobs.score,
  scoreReason: jobs.scoreReason,
  status: jobs.status,
  pasted: jobs.pasted,
  firstSeenAt: jobs.firstSeenAt,
  postedAt: jobs.postedAt,
  company: companies.name,
};

export type JobSummary = ReturnType<typeof jobsToReview>["jobs"][number];

function ranked<T extends { score: number | null; pasted: boolean; firstSeenAt: Date }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || Number(b.pasted) - Number(a.pasted) || b.firstSeenAt.getTime() - a.firstSeenAt.getTime());
}

export function jobsToReview(db: Db, search: Search) {
  const rows = db.select(summary).from(jobs).innerJoin(companies, eq(jobs.companyId, companies.id)).where(eq(jobs.status, "new")).all();
  const shown = rows.filter((job) => job.pasted || matchesSearch(job, search));
  return { jobs: ranked(shown), otherOpenJobs: rows.length - shown.length };
}

export function dismissedJobs(db: Db) {
  return db.select(summary).from(jobs).innerJoin(companies, eq(jobs.companyId, companies.id)).where(eq(jobs.status, "dismissed")).orderBy(desc(jobs.score), desc(jobs.id)).limit(200).all();
}

export function getJob(db: Db, id: number) {
  const job = db.select({ ...summary, description: jobs.description, previewOnly: jobs.previewOnly, source: jobs.source, scoredAt: jobs.scoredAt }).from(jobs).innerJoin(companies, eq(jobs.companyId, companies.id)).where(eq(jobs.id, id)).get();
  if (!job) return undefined;
  const application = db.select({ id: applications.id, stage: applications.stage }).from(applications).where(eq(applications.jobId, id)).get();
  return { ...job, application };
}

export function dismissJob(db: Db, id: number): void {
  db.update(jobs).set({ status: "dismissed" }).where(and(eq(jobs.id, id), eq(jobs.status, "new"))).run();
}

export function restoreJob(db: Db, id: number): void {
  db.update(jobs).set({ status: "new" }).where(and(eq(jobs.id, id), eq(jobs.status, "dismissed"))).run();
}

export function saveJob(db: Db, id: number): number {
  return db.transaction((tx) => {
    const job = tx.select().from(jobs).where(eq(jobs.id, id)).get();
    if (!job) throw new Error(`No job ${id}`);
    const existing = tx.select({ id: applications.id }).from(applications).where(eq(applications.jobId, id)).get();
    if (existing) return existing.id;
    const application = tx.insert(applications).values({ jobId: id }).returning().get();
    tx.update(jobs).set({ status: "shortlisted" }).where(eq(jobs.id, id)).run();
    const scored = job.score === null ? "" : `, scored ${Math.round(job.score)}`;
    tx.insert(events).values({ applicationId: application.id, kind: "stage_change", toStage: "saved", summary: `Saved from job search${scored}`, source: "manual" }).run();
    return application.id;
  });
}

export function jobsScoredSince(db: Db, since: Date): number {
  return db.select({ id: jobs.id }).from(jobs).where(gte(jobs.scoredAt, since)).all().length;
}

export function scoringCandidates(db: Db, search: Search, limit: number) {
  const rows = db
    .select({ id: jobs.id, title: jobs.title, location: jobs.location, compensation: jobs.compensation, description: jobs.description, previewOnly: jobs.previewOnly, pasted: jobs.pasted, company: companies.name, firstSeenAt: jobs.firstSeenAt })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(and(eq(jobs.status, "new"), isNull(jobs.score)))
    .orderBy(asc(jobs.id))
    .all();
  const rankOf = (job: (typeof rows)[number]) => (job.pasted ? -1 : (titleRank(job.title, search) ?? Number.MAX_SAFE_INTEGER));
  return rows
    .filter((job) => job.pasted || matchesSearch(job, search))
    .sort((a, b) => rankOf(a) - rankOf(b) || b.firstSeenAt.getTime() - a.firstSeenAt.getTime())
    .slice(0, limit);
}

export const scoreOutputSchema = z.object({
  scores: z.array(
    z.object({
      id: z.number().int(),
      score: z.number().min(0).max(100),
      reason: z.string().min(1).max(600),
      suspicious: z.boolean().default(false),
    }),
  ),
});

export const SCORE_JSON_SCHEMA = {
  type: "object",
  properties: {
    scores: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          score: { type: "number", minimum: 0, maximum: 100 },
          reason: { type: "string", maxLength: 600 },
          suspicious: { type: "boolean" },
        },
        required: ["id", "score", "reason", "suspicious"],
        additionalProperties: false,
      },
    },
  },
  required: ["scores"],
  additionalProperties: false,
} as const;

export const SUSPICIOUS_NOTE = "This posting contains text aimed at AI tools, which was ignored.";

export function applyScores(db: Db, batchIds: number[], output: unknown, now: Date = new Date()): { saved: number; ignored: number } {
  const parsed = scoreOutputSchema.parse(output);
  const allowed = new Set(batchIds);
  let saved = 0;
  let ignored = 0;
  db.transaction((tx) => {
    for (const item of parsed.scores) {
      if (!allowed.delete(item.id)) {
        ignored++;
        continue;
      }
      const reason = item.suspicious ? `${SUSPICIOUS_NOTE} ${item.reason}` : item.reason;
      tx.update(jobs).set({ score: Math.round(item.score), scoreReason: reason, scoredAt: now }).where(eq(jobs.id, item.id)).run();
      saved++;
    }
  });
  return { saved, ignored };
}

export function openJobCount(db: Db): number {
  return db.select({ id: jobs.id }).from(jobs).where(notInArray(jobs.status, ["closed", "dismissed"])).all().length;
}
