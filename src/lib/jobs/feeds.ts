import { z } from "zod";

export const ATS = ["greenhouse", "lever", "ashby", "workable", "recruitee"] as const;
export type Ats = (typeof ATS)[number];

export type FeedJob = {
  externalId: string;
  title: string;
  location: string | null;
  url: string | null;
  description: string | null;
  compensation: string | null;
  postedAt: Date | null;
};

const MAX_DESCRIPTION = 20_000;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…", bull: "•" };

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] !== "#") return ENTITIES[code.toLowerCase()] ?? whole;
    const point = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : whole;
  });
}

export function htmlToText(html: string): string {
  const stripped = decodeEntities(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/?(p|div|ul|ol|h[1-6]|br|tr|section)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return tidy(decodeEntities(stripped));
}

export function tidy(text: string): string {
  return text
    .replace(/[ \t ]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_DESCRIPTION);
}

export function safeUrl(value: string | null | undefined): string | null {
  return value && /^https?:\/\/\S+$/i.test(value) ? value : null;
}

export function safeDate(value: string | number | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const greenhouseJob = z.object({
  id: z.number(),
  title: z.string(),
  absolute_url: z.string().nullish(),
  location: z.object({ name: z.string().nullish() }).nullish(),
  content: z.string().nullish(),
  first_published: z.string().nullish(),
  updated_at: z.string().nullish(),
});

function fromGreenhouse(job: z.infer<typeof greenhouseJob>): FeedJob {
  return {
    externalId: String(job.id),
    title: job.title.trim(),
    location: job.location?.name?.trim() || null,
    url: safeUrl(job.absolute_url),
    description: job.content ? htmlToText(job.content) : null,
    compensation: null,
    postedAt: safeDate(job.first_published ?? job.updated_at),
  };
}

export function parseGreenhouse(data: unknown): FeedJob[] {
  return z.object({ jobs: z.array(greenhouseJob) }).parse(data).jobs.map(fromGreenhouse);
}

const leverJob = z.object({
  id: z.string(),
  text: z.string(),
  hostedUrl: z.string().nullish(),
  createdAt: z.number().nullish(),
  categories: z.object({ location: z.string().nullish(), allLocations: z.array(z.string()).nullish() }).nullish(),
  workplaceType: z.string().nullish(),
  descriptionPlain: z.string().nullish(),
  additionalPlain: z.string().nullish(),
  lists: z.array(z.object({ text: z.string().nullish(), content: z.string().nullish() })).nullish(),
  salaryRange: z.object({ min: z.number().nullish(), max: z.number().nullish(), currency: z.string().nullish(), interval: z.string().nullish() }).nullish(),
  salaryDescriptionPlain: z.string().nullish(),
});

function leverPay(job: z.infer<typeof leverJob>): string | null {
  const range = job.salaryRange;
  if (range?.min && range.max) return `${range.currency ?? ""} ${range.min.toLocaleString("en-GB")} – ${range.max.toLocaleString("en-GB")}${range.interval ? ` ${range.interval}` : ""}`.trim();
  return job.salaryDescriptionPlain?.trim() || null;
}

function fromLever(job: z.infer<typeof leverJob>): FeedJob {
  const places = job.categories?.allLocations?.length ? job.categories.allLocations.join("; ") : job.categories?.location;
  const lists = (job.lists ?? []).map((list) => `${list.text ?? ""}\n${htmlToText(list.content ?? "")}`);
  return {
    externalId: job.id,
    title: job.text.trim(),
    location: [places, job.workplaceType === "remote" ? "Remote" : null].filter(Boolean).join(", ") || null,
    url: safeUrl(job.hostedUrl),
    description: tidy([job.descriptionPlain, ...lists, job.additionalPlain].filter(Boolean).join("\n\n")) || null,
    compensation: leverPay(job),
    postedAt: safeDate(job.createdAt),
  };
}

export function parseLever(data: unknown): FeedJob[] {
  return z.array(leverJob).parse(data).map(fromLever);
}

const ashbyJob = z.object({
  id: z.string(),
  title: z.string(),
  location: z.string().nullish(),
  secondaryLocations: z.array(z.object({ location: z.string().nullish() })).nullish(),
  workplaceType: z.string().nullish(),
  isListed: z.boolean().nullish(),
  jobUrl: z.string().nullish(),
  descriptionPlain: z.string().nullish(),
  publishedAt: z.string().nullish(),
  shouldDisplayCompensationOnJobPostings: z.boolean().nullish(),
  compensation: z.object({ compensationTierSummary: z.string().nullish() }).nullish(),
});

function fromAshby(job: z.infer<typeof ashbyJob>): FeedJob {
  const places = [job.location, ...(job.secondaryLocations ?? []).map((item) => item.location)].filter(Boolean).join("; ");
  return {
    externalId: job.id,
    title: job.title.trim(),
    location: [places, job.workplaceType === "Remote" ? "Remote" : null].filter(Boolean).join(", ") || null,
    url: safeUrl(job.jobUrl),
    description: job.descriptionPlain ? tidy(job.descriptionPlain) : null,
    compensation: job.shouldDisplayCompensationOnJobPostings === false ? null : job.compensation?.compensationTierSummary?.trim() || null,
    postedAt: safeDate(job.publishedAt),
  };
}

export function parseAshby(data: unknown): FeedJob[] {
  return z.object({ jobs: z.array(ashbyJob) }).parse(data).jobs.filter((job) => job.isListed !== false).map(fromAshby);
}

const workableJob = z.object({
  shortcode: z.string(),
  title: z.string(),
  url: z.string().nullish(),
  telecommuting: z.boolean().nullish(),
  city: z.string().nullish(),
  country: z.string().nullish(),
  locations: z.array(z.object({ city: z.string().nullish(), country: z.string().nullish(), hidden: z.boolean().nullish() })).nullish(),
  description: z.string().nullish(),
  published_on: z.string().nullish(),
});

function joinPlaces(places: (string | null)[], remote: boolean | null | undefined): string | null {
  return [[...new Set(places.filter(Boolean))].join("; "), remote ? "Remote" : null].filter(Boolean).join(", ") || null;
}

function fromWorkable(job: z.infer<typeof workableJob>): FeedJob {
  const places = (job.locations ?? []).filter((place) => !place.hidden).map((place) => [place.city, place.country].filter(Boolean).join(", ") || null);
  return {
    externalId: job.shortcode,
    title: job.title.trim(),
    location: joinPlaces(places.length ? places : [[job.city, job.country].filter(Boolean).join(", ") || null], job.telecommuting),
    url: safeUrl(job.url),
    description: job.description ? htmlToText(job.description) : null,
    compensation: null,
    postedAt: safeDate(job.published_on),
  };
}

export function parseWorkable(data: unknown): FeedJob[] {
  return z.object({ jobs: z.array(workableJob) }).parse(data).jobs.map(fromWorkable);
}

const recruiteeJob = z.object({
  id: z.number(),
  title: z.string(),
  status: z.string().nullish(),
  careers_url: z.string().nullish(),
  location: z.string().nullish(),
  locations: z.array(z.object({ city: z.string().nullish(), country: z.string().nullish() })).nullish(),
  remote: z.boolean().nullish(),
  description: z.string().nullish(),
  requirements: z.string().nullish(),
  published_at: z.string().nullish(),
  salary: z.object({ min: z.union([z.number(), z.string()]).nullish(), max: z.union([z.number(), z.string()]).nullish(), period: z.string().nullish(), currency: z.string().nullish() }).nullish(),
});

function recruiteePay(job: z.infer<typeof recruiteeJob>): string | null {
  const pay = job.salary;
  if (!pay?.min || !pay.max) return null;
  return [pay.currency, `${Number(pay.min).toLocaleString("en-GB")} – ${Number(pay.max).toLocaleString("en-GB")}`, pay.period].filter(Boolean).join(" ");
}

function fromRecruitee(job: z.infer<typeof recruiteeJob>): FeedJob {
  const places = (job.locations ?? []).map((place) => [place.city, place.country].filter(Boolean).join(", ") || null);
  const text = [job.description, job.requirements].filter(Boolean).join("\n");
  return {
    externalId: String(job.id),
    title: job.title.trim(),
    location: joinPlaces(places.length ? places : [job.location ?? null], job.remote),
    url: safeUrl(job.careers_url),
    description: text ? htmlToText(text) : null,
    compensation: recruiteePay(job),
    postedAt: safeDate(job.published_at),
  };
}

export function parseRecruitee(data: unknown): FeedJob[] {
  return z.object({ offers: z.array(recruiteeJob) }).parse(data).offers.filter((job) => !job.status || job.status === "published").map(fromRecruitee);
}

const TOKEN = /^[A-Za-z0-9._-]+$/;
const SUBDOMAIN = /^[a-z0-9-]+$/i;

export function feedUrl(ats: Ats, token: string): string {
  if (!TOKEN.test(token)) throw new Error(`Invalid job board name: ${token}`);
  const name = encodeURIComponent(token);
  if (ats === "greenhouse") return `https://boards-api.greenhouse.io/v1/boards/${name}/jobs?content=true`;
  if (ats === "lever") return `https://api.lever.co/v0/postings/${name}?mode=json`;
  if (ats === "workable") return `https://apply.workable.com/api/v1/widget/accounts/${name}?details=true`;
  if (ats === "recruitee") {
    if (!SUBDOMAIN.test(token)) throw new Error(`Invalid job board name: ${token}`);
    return `https://${name}.recruitee.com/api/offers/`;
  }
  return `https://api.ashbyhq.com/posting-api/job-board/${name}?includeCompensation=true`;
}

export const PARSERS: Record<Ats, (data: unknown) => FeedJob[]> = { greenhouse: parseGreenhouse, lever: parseLever, ashby: parseAshby, workable: parseWorkable, recruitee: parseRecruitee };

export type Fetcher = (url: string, init?: RequestInit) => Promise<Pick<Response, "ok" | "status" | "json">>;

async function getJson(url: string, fetcher: Fetcher): Promise<unknown> {
  const response = await fetcher(url, { headers: { "User-Agent": "joblesss-personal-job-search" }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.json();
}

export async function fetchFeed(ats: Ats, token: string, fetcher: Fetcher = fetch): Promise<FeedJob[]> {
  return PARSERS[ats](await getJson(feedUrl(ats, token), fetcher));
}

export type BoardLink = { ats: Ats; token: string; id: string };

export function parseBoardLink(value: string): BoardLink | undefined {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  const [token, second, third] = url.pathname.split("/").filter(Boolean);
  if (!token || !TOKEN.test(token)) return undefined;
  const host = url.hostname.toLowerCase();
  if (/^(job-boards|boards)(\.eu)?\.greenhouse\.io$/.test(host) && second === "jobs" && third && /^\d+$/.test(third)) return { ats: "greenhouse", token, id: third };
  if (host === "apply.workable.com" && second === "j" && third && /^[0-9a-z]+$/i.test(third)) return { ats: "workable", token, id: third };
  if (host === "jobs.lever.co" && second && /^[0-9a-f-]{36}$/i.test(second)) return { ats: "lever", token, id: second };
  if (host === "jobs.ashbyhq.com" && second && /^[0-9a-f-]{36}$/i.test(second)) return { ats: "ashby", token, id: second };
  return undefined;
}

export async function fetchBoardJob(link: BoardLink, fetcher: Fetcher = fetch): Promise<FeedJob | undefined> {
  const jobs = await fetchFeed(link.ats, link.token, fetcher);
  return jobs.find((job) => job.externalId === link.id);
}
