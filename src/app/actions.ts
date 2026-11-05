"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { runAgent } from "@/lib/agents/run";
import { ensureVault, isKind, KINDS, uniqueSlug, updateEntry, writeEntry, type Frontmatter, type Kind } from "@/lib/vault/entries";
import { linkCitations } from "@/lib/vault/citations";
import { commitVault } from "@/lib/vault/git";

const reference = z.object({ kind: z.enum(KINDS), slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/) });

function saved(message: string) {
  try {
    commitVault(message);
  } catch (error) {
    console.error("Could not record vault history", error);
  }
  revalidatePath("/", "layout");
}

export async function confirmEntry(kind: Kind, slug: string) {
  const ref = reference.parse({ kind, slug });
  updateEntry(ref.kind, ref.slug, { status: "confirmed", reviewNote: undefined });
  saved(`confirm: ${ref.kind}/${ref.slug}`);
}

export async function rejectEntry(kind: Kind, slug: string) {
  const ref = reference.parse({ kind, slug });
  updateEntry(ref.kind, ref.slug, { status: "rejected" });
  saved(`reject: ${ref.kind}/${ref.slug}`);
}

export async function restoreEntry(kind: Kind, slug: string) {
  const ref = reference.parse({ kind, slug });
  updateEntry(ref.kind, ref.slug, { status: "draft" });
  saved(`restore: ${ref.kind}/${ref.slug}`);
}

export async function setVisibility(kind: Kind, slug: string, visibility: Frontmatter["visibility"]) {
  const ref = reference.parse({ kind, slug });
  updateEntry(ref.kind, ref.slug, { visibility: z.enum(["public", "private"]).parse(visibility) });
  saved(`visibility: ${ref.kind}/${ref.slug} ${visibility}`);
}

function parseTags(value: FormDataEntryValue | null): string[] {
  return String(value ?? "").split(",").map((tag) => tag.trim()).filter(Boolean);
}

export async function saveEntry(kind: Kind, slug: string, form: FormData) {
  const ref = reference.parse({ kind, slug });
  const title = String(form.get("title") ?? "").trim();
  if (!title) throw new Error("A title is required.");
  updateEntry(ref.kind, ref.slug, {
    title,
    tags: parseTags(form.get("tags")),
    body: String(form.get("body") ?? ""),
    date: String(form.get("date") ?? "").trim() || undefined,
  });
  saved(`edit: ${ref.kind}/${ref.slug}`);
  redirect(`/wiki/${ref.kind}/${ref.slug}`);
}

export type AddState = { error?: string };

export async function addEntry(_previous: AddState, form: FormData): Promise<AddState> {
  const kindValue = String(form.get("kind") ?? "");
  const title = String(form.get("title") ?? "").trim();
  if (!isKind(kindValue)) return { error: "Choose where this belongs." };
  if (!title) return { error: "Add a title so you can find this later." };
  ensureVault();
  const slug = uniqueSlug(kindValue, title);
  const today = new Date().toISOString().slice(0, 10);
  writeEntry(
    kindValue,
    slug,
    {
      title,
      status: "confirmed",
      visibility: form.get("private") === "on" ? "private" : "public",
      source: `told by me on ${today}`,
      tags: parseTags(form.get("tags")),
      links: [],
      screenshots: [],
    },
    String(form.get("body") ?? ""),
  );
  saved(`add: ${kindValue}/${slug}`);
  redirect(`/wiki/${kindValue}/${slug}`);
}

export type AskState = { question?: string; answer?: string; error?: string };

export async function askProfile(_previous: AskState, form: FormData): Promise<AskState> {
  const question = String(form.get("question") ?? "").trim();
  if (!question) return { error: "Type a question first." };
  if (question.length > 2000) return { question, error: "Shorten the question to under 2,000 characters." };
  const run = await runAgent("ask", { prompt: `Question: ${question}` });
  revalidatePath("/runs");
  if (run.status !== "ok" || !run.result) {
    return { question, error: `The answer didn't come through: ${run.reason ?? "the agent returned nothing"}. Check Agent activity for details.` };
  }
  return { question, answer: linkCitations(run.result) };
}
