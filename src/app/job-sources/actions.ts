"use server";

import { revalidatePath } from "next/cache";
import { checkBoardKeys, type BoardSource } from "@/lib/jobs/boards";
import { saveBoardKeys, type BoardKeys } from "@/lib/jobs/keys";

export type KeyState = { message?: string; error?: string };

async function connect(source: BoardSource, keys: BoardKeys, name: string): Promise<KeyState> {
  const problem = await checkBoardKeys(source, keys);
  if (problem) return { error: `${problem}. Nothing was saved.` };
  saveBoardKeys(keys);
  revalidatePath("/job-sources");
  return { message: `${name} is connected. It's checked with your daily job search from now on.` };
}

function field(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}

export async function connectReed(_previous: KeyState, form: FormData): Promise<KeyState> {
  const reedKey = field(form, "key");
  if (!/^[\w-]{8,}$/.test(reedKey)) return { error: "Paste the API key from Reed." };
  return connect("reed", { reedKey }, "Reed");
}

export async function connectAdzuna(_previous: KeyState, form: FormData): Promise<KeyState> {
  const adzunaId = field(form, "id");
  const adzunaKey = field(form, "key");
  if (!/^\w{4,}$/.test(adzunaId) || !/^\w{8,}$/.test(adzunaKey)) return { error: "Paste both the Application ID and the Application Key from Adzuna." };
  return connect("adzuna", { adzunaId, adzunaKey }, "Adzuna");
}
