import { z } from "zod";
import type { Db } from "../../db";
import { htmlToText, safeDate, safeUrl, tidy, type FeedJob, type Fetcher } from "./feeds";
import type { BoardKeys } from "./keys";
import { knownBoardJobIds, syncBoardJobs } from "./store";
import { matchesSearch, type Watchlist } from "./watchlist";

export const BOARD_NAMES = { reed: "Reed", adzuna: "Adzuna" } as const;
export type BoardSource = keyof typeof BOARD_NAMES;
export type BoardJob = FeedJob & { company: string; partial: boolean };
export type BoardOutcome = { name: string; added: number; duplicates: number; closed: number; reason?: string };
export type Pause = (ms: number) => Promise<void>;

const SEARCH_GAP = 1500;
const DETAIL_GAP = 400;
const MAX_DETAILS = 200;
const RESULTS_PER_SEARCH = 100;
const ADZUNA_PER_PAGE = 50;
const ANNUAL_PAY_FROM = 10_000;
const ADZUNA_MAX_DAYS_OLD = 30;

const USER_AGENT = "jobless-personal-job-search";

function pay(min: number | null | undefined, max: number | null | undefined, currency = "£"): string | null {
  if (!min && !max) return null;
  const text = (value: number) => `${currency}${Math.round(value).toLocaleString("en-GB")}`;
  return min && max && min !== max ? `${text(min)} – ${text(max)}` : text((max ?? min)!);
}

export function payBelow(top: number | null | undefined, minimum: number): boolean {
  return Boolean(minimum && top && top >= ANNUAL_PAY_FROM && top < minimum);
}

function reedDate(value: string | null | undefined): Date | null {
  const parts = value?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return parts ? safeDate(`${parts[3]}-${parts[2]}-${parts[1]}`) : null;
}

const reedResult = z.object({
  jobId: z.number(),
  employerName: z.string().nullish(),
  jobTitle: z.string(),
  locationName: z.string().nullish(),
  minimumSalary: z.number().nullish(),
  maximumSalary: z.number().nullish(),
  date: z.string().nullish(),
  jobDescription: z.string().nullish(),
  jobUrl: z.string().nullish(),
});

type Found = { job: BoardJob; top: number | null };

export function parseReed(data: unknown): Found[] {
  return z.object({ results: z.array(reedResult) }).parse(data).results.map((job) => ({
    top: job.maximumSalary ?? job.minimumSalary ?? null,
    job: {
      externalId: String(job.jobId),
      company: job.employerName?.trim() || "Unnamed employer",
      title: job.jobTitle.trim(),
      location: job.locationName?.trim() || null,
      url: safeUrl(job.jobUrl),
      description: job.jobDescription ? htmlToText(job.jobDescription) : null,
      compensation: pay(job.minimumSalary, job.maximumSalary),
      postedAt: reedDate(job.date),
      partial: true,
    },
  }));
}

const reedDetails = z.object({ jobDescription: z.string().nullish(), externalUrl: z.string().nullish(), jobUrl: z.string().nullish() });

export function parseReedDetails(data: unknown): { description: string | null; url: string | null } {
  const details = reedDetails.parse(data);
  return { description: details.jobDescription ? htmlToText(details.jobDescription) : null, url: safeUrl(details.externalUrl) ?? safeUrl(details.jobUrl) };
}

const adzunaResult = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  description: z.string().nullish(),
  created: z.string().nullish(),
  redirect_url: z.string().nullish(),
  salary_min: z.number().nullish(),
  salary_max: z.number().nullish(),
  salary_is_predicted: z.union([z.string(), z.number()]).nullish(),
  location: z.object({ display_name: z.string().nullish() }).nullish(),
  company: z.object({ display_name: z.string().nullish() }).nullish(),
});

export function parseAdzuna(data: unknown): Found[] {
  return z.object({ results: z.array(adzunaResult) }).parse(data).results.map((job) => {
    const guessed = Number(job.salary_is_predicted ?? 0) === 1;
    return {
      top: guessed ? null : (job.salary_max ?? job.salary_min ?? null),
      job: {
        externalId: String(job.id),
        company: job.company?.display_name?.trim() || "Unnamed employer",
        title: htmlToText(job.title),
        location: job.location?.display_name?.trim() || null,
        url: safeUrl(job.redirect_url),
        description: job.description ? tidy(htmlToText(job.description)) : null,
        compensation: guessed ? null : pay(job.salary_min, job.salary_max),
        postedAt: safeDate(job.created),
        partial: true,
      },
    };
  });
}

class BoardError extends Error {}

async function ask(name: string, url: string, headers: Record<string, string>, fetcher: Fetcher): Promise<unknown> {
  const response = await fetcher(url, { headers: { "User-Agent": USER_AGENT, ...headers }, signal: AbortSignal.timeout(30_000) });
  if (response.status === 401 || response.status === 403) throw new BoardError(`${name} rejected the key`);
  if (response.status === 429) throw new BoardError(`${name}'s request limit was reached`);
  if (!response.ok) throw new BoardError(`${name} answered ${response.status}`);
  return response.json();
}

function reedHeaders(key: string): Record<string, string> {
  return { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` };
}

function reedUrl(phrase: string, place: string | null): string {
  const query = new URLSearchParams({ keywords: place ? phrase : `${phrase} remote`, resultsToTake: String(RESULTS_PER_SEARCH) });
  if (place) {
    query.set("locationName", place);
    query.set("distanceFromLocation", "15");
  }
  return `https://www.reed.co.uk/api/1.0/search?${query}`;
}

function adzunaUrl(phrase: string, place: string | null, keys: BoardKeys, perPage = ADZUNA_PER_PAGE): string {
  const query = new URLSearchParams({ app_id: keys.adzunaId ?? "", app_key: keys.adzunaKey ?? "", results_per_page: String(perPage), title_only: phrase, sort_by: "date", max_days_old: String(ADZUNA_MAX_DAYS_OLD), "content-type": "application/json" });
  if (place) query.set("where", place);
  else query.set("what", "remote");
  return `https://api.adzuna.com/v1/api/jobs/gb/search/1?${query}`;
}

function markRemote(job: BoardJob, place: string | null): BoardJob {
  if (place || /remote/i.test(job.location ?? "") || !/\bremote\b/i.test(`${job.title} ${job.description ?? ""}`)) return job;
  return { ...job, location: [job.location, "Remote"].filter(Boolean).join(", ") };
}

export function boardReady(source: BoardSource, keys: BoardKeys): boolean {
  return source === "reed" ? Boolean(keys.reedKey) : Boolean(keys.adzunaId && keys.adzunaKey);
}

export async function checkBoardKeys(source: BoardSource, keys: BoardKeys, fetcher: Fetcher = fetch): Promise<string | undefined> {
  try {
    if (source === "reed") parseReed(await ask("Reed", reedUrl("engineer", "London").replace(`resultsToTake=${RESULTS_PER_SEARCH}`, "resultsToTake=1"), reedHeaders(keys.reedKey ?? ""), fetcher));
    else parseAdzuna(await ask("Adzuna", adzunaUrl("engineer", "london", keys, 1), {}, fetcher));
    return undefined;
  } catch (error) {
    return error instanceof BoardError ? error.message : `${BOARD_NAMES[source]} didn't answer as expected`;
  }
}

export async function fetchBoard(db: Db, source: BoardSource, watchlist: Watchlist, keys: BoardKeys, fetcher: Fetcher, pause: Pause): Promise<BoardOutcome> {
  const name = BOARD_NAMES[source];
  const { searches, places, minimumPay } = watchlist.boards;
  const found = new Map<string, BoardJob>();
  let reason: string | undefined;
  search: for (const phrase of searches) {
    for (const place of [...places, null]) {
      try {
        const results = source === "reed" ? parseReed(await ask(name, reedUrl(phrase, place), reedHeaders(keys.reedKey ?? ""), fetcher)) : parseAdzuna(await ask(name, adzunaUrl(phrase, place, keys), {}, fetcher));
        for (const { job, top } of results) {
          const marked = markRemote(job, place);
          if (!payBelow(top, minimumPay) && matchesSearch(marked, watchlist.search)) found.set(job.externalId, marked);
        }
      } catch (error) {
        reason = error instanceof BoardError ? error.message : `${name} didn't answer as expected`;
        break search;
      }
      await pause(SEARCH_GAP);
    }
  }
  if (source === "reed") reason = (await addReedDetails(db, found, keys, fetcher, pause)) ?? reason;
  return { name, ...syncBoardJobs(db, source, [...found.values()]), reason };
}

async function addReedDetails(db: Db, found: Map<string, BoardJob>, keys: BoardKeys, fetcher: Fetcher, pause: Pause): Promise<string | undefined> {
  const known = knownBoardJobIds(db, "reed");
  const fresh = [...found.values()].filter((job) => !known.has(job.externalId));
  const waiting = fresh.slice(0, MAX_DETAILS);
  for (const job of fresh.slice(MAX_DETAILS)) found.delete(job.externalId);
  for (const [index, job] of waiting.entries()) {
    try {
      const details = parseReedDetails(await ask("Reed", `https://www.reed.co.uk/api/1.0/jobs/${encodeURIComponent(job.externalId)}`, reedHeaders(keys.reedKey ?? ""), fetcher));
      found.set(job.externalId, { ...job, description: details.description ?? job.description, url: details.url ?? job.url, partial: !details.description });
    } catch (error) {
      for (const later of waiting.slice(index)) found.delete(later.externalId);
      return error instanceof BoardError ? error.message : "Reed didn't answer as expected";
    }
    await pause(DETAIL_GAP);
  }
  return undefined;
}
