import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { ATS } from "./feeds";

const terms = z.array(z.string().min(1)).default([]);

const schema = z.object({
  search: z.object({ titles: terms, excludeTitles: terms, places: terms, remoteElsewhere: terms }),
  scoring: z.object({ dailyCap: z.number().int().min(0).default(40), batchSize: z.number().int().min(1).max(25).default(10) }).prefault({}),
  boards: z.object({ searches: terms, places: terms, minimumPay: z.number().int().min(0).default(0) }).prefault({}),
  companies: z.array(z.object({ name: z.string().min(1), ats: z.enum(ATS), token: z.string().min(1) })).default([]),
});

export type Watchlist = z.infer<typeof schema>;
export type Search = Watchlist["search"];

export function parseWatchlist(text: string): Watchlist {
  return schema.parse(parse(text));
}

function watchlistFile(): string {
  if (process.env.JOBLESS_WATCHLIST) return process.env.JOBLESS_WATCHLIST;
  const own = path.join(process.cwd(), "watchlist.yaml");
  return fs.existsSync(own) ? own : path.join(process.cwd(), "watchlist.example.yaml");
}

export function readWatchlist(): Watchlist {
  return parseWatchlist(fs.readFileSync(watchlistFile(), "utf8"));
}

function term(words: string): RegExp {
  const escaped = words.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "iu");
}

function hasAny(text: string, list: string[]): boolean {
  return list.some((words) => term(words).test(text));
}

export function titleRank(title: string, search: Search): number | undefined {
  if (hasAny(title, search.excludeTitles)) return undefined;
  const rank = search.titles.findIndex((words) => term(words).test(title));
  return rank === -1 ? undefined : rank;
}

export function placeMatches(location: string | null, search: Search): boolean {
  if (!location) return true;
  if (hasAny(location, search.places)) return true;
  return /remote/i.test(location) && !hasAny(location, search.remoteElsewhere);
}

export function matchesSearch(job: { title: string; location: string | null }, search: Search): boolean {
  return titleRank(job.title, search) !== undefined && placeMatches(job.location, search);
}
