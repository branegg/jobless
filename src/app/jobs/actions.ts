"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { fetchAllJobs } from "@/lib/jobs/fetch";
import { fetchBoardJob, parseBoardLink } from "@/lib/jobs/feeds";
import { scoreNewJobs } from "@/lib/jobs/score";
import { addPastedBoardJob, addPastedJob, dismissJob, restoreJob, saveJob } from "@/lib/jobs/store";
import { readWatchlist } from "@/lib/jobs/watchlist";

const id = z.number().int().positive();
const link = z.string().trim().regex(/^https?:\/\/\S+$/i);

function changed() {
  revalidatePath("/", "layout");
}

export async function saveJobAction(jobId: number) {
  saveJob(getDb(), id.parse(jobId));
  changed();
}

export async function dismissJobAction(jobId: number) {
  dismissJob(getDb(), id.parse(jobId));
  changed();
}

export async function restoreJobAction(jobId: number) {
  restoreJob(getDb(), id.parse(jobId));
  changed();
}

export type PasteState = { error?: string };

function nameFromToken(token: string): string {
  return token.split(/[-_.]/).filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

export async function pasteJob(_previous: PasteState, form: FormData): Promise<PasteState> {
  const value = String(form.get("url") ?? "");
  const url = link.safeParse(value);
  if (!url.success) return { error: "Paste the full link to the job, starting with https://." };
  const company = String(form.get("company") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const db = getDb();
  const board = parseBoardLink(url.data);
  let jobId: number;
  if (board) {
    let found;
    try {
      found = await fetchBoardJob(board);
    } catch {
      return { error: "That job board didn't answer. Try again, or fill in the company and role by hand." };
    }
    if (!found) return { error: "That job is no longer on the company's job board." };
    const listed = readWatchlist().companies.find((item) => item.ats === board.ats && item.token === board.token);
    jobId = addPastedBoardJob(db, { name: listed?.name ?? (company || nameFromToken(board.token)), ats: board.ats, token: board.token }, found).id;
  } else {
    if (!company || !title) return { error: "Joblesss doesn't read this site. Add the company and role, and paste the description so it can be scored." };
    jobId = addPastedJob(db, { company, title, url: url.data, location: String(form.get("location") ?? ""), description: String(form.get("description") ?? "") }).id;
  }
  changed();
  redirect(`/jobs/${jobId}`);
}

export type CheckState = { message?: string; error?: string };

export async function checkForJobs(_previous: CheckState, form: FormData): Promise<CheckState> {
  void form;
  const db = getDb();
  const watchlist = readWatchlist();
  const fetched = await fetchAllJobs(db, watchlist);
  const scored = await scoreNewJobs(db, watchlist, { maxJobs: watchlist.scoring.batchSize });
  changed();
  const boards = fetched.boards.map((board) => board.name).join(" and ");
  const boardProblems = fetched.boards.filter((board) => board.reason).map((board) => ` ${board.name}: ${board.reason}.`).join("");
  const found = `Checked ${fetched.companies} companies${boards ? ` and ${boards}` : ""} and found ${fetched.added} new ${fetched.added === 1 ? "job" : "jobs"}.${boardProblems}`;
  if (scored.missingPreferences) return { error: `${found} Scoring needs your preferences first: run pnpm agent setup.` };
  if (scored.failed > 0) return { error: `${found} Scoring stopped: ${scored.reason}. See Agent activity.` };
  const cap = scored.capReached ? " Today's scoring limit is used up, so the rest wait until tomorrow." : "";
  return { message: `${found} Scored ${scored.scored}.${cap}` };
}
