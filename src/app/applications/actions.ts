"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { openInTerminal } from "@/lib/agents/terminal";
import { parseDay } from "@/lib/format";
import { applyPrompt, buildPacket } from "@/lib/packets/build";
import { canMove, STAGES } from "@/lib/stages";
import { addApplication, addNote, deleteApplication, getApplication, moveStage, setNextAction, undoLastMove, updateDetails } from "@/lib/tracker";

const link = z.string().trim().regex(/^https?:\/\/\S+$/i, "The link must start with http:// or https://.");
const details = z.object({
  company: z.string().trim().min(1, "Add the company name."),
  title: z.string().trim().min(1, "Add the role."),
  url: z.union([z.literal(""), link]),
  location: z.string().trim(),
});
const stage = z.enum(STAGES);
const id = z.number().int().positive();

function text(form: FormData, name: string): string {
  return String(form.get(name) ?? "");
}

function changed() {
  revalidatePath("/", "layout");
}

export type FormState = { error?: string; existingId?: number };

export async function addApplicationAction(_previous: FormState, form: FormData): Promise<FormState> {
  const parsed = details.safeParse({ company: text(form, "company"), title: text(form, "title"), url: text(form, "url"), location: text(form, "location") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const chosen = stage.safeParse(text(form, "stage"));
  if (!chosen.success) return { error: "Choose where this application is now." };
  const sentOn = text(form, "appliedOn");
  const appliedAt = sentOn ? parseDay(sentOn) : undefined;
  if (sentOn && !appliedAt) return { error: "That date doesn't look right." };
  const result = addApplication(getDb(), { ...parsed.data, url: parsed.data.url || undefined, stage: chosen.data, appliedAt, note: text(form, "note"), description: text(form, "description") });
  if (!result.ok) return { error: "You're already tracking this job.", existingId: result.existingId };
  changed();
  redirect(`/applications/${result.id}`);
}

export async function moveApplication(applicationId: number, form: FormData) {
  const to = stage.parse(form.get("to"));
  const db = getDb();
  const current = getApplication(db, id.parse(applicationId));
  if (current && canMove(current.stage, to)) moveStage(db, applicationId, to);
  changed();
}

export async function undoMove(applicationId: number) {
  undoLastMove(getDb(), id.parse(applicationId));
  changed();
}

export async function addNoteAction(applicationId: number, form: FormData) {
  const note = text(form, "note").trim();
  if (note) addNote(getDb(), id.parse(applicationId), note);
  changed();
}

export async function saveNextAction(applicationId: number, form: FormData) {
  const action = text(form, "action").trim();
  const day = text(form, "day");
  setNextAction(getDb(), id.parse(applicationId), action || null, day ? (parseDay(day) ?? null) : null);
  changed();
}

export async function clearNextAction(applicationId: number) {
  setNextAction(getDb(), id.parse(applicationId), null, null);
  changed();
}

export async function saveDetails(applicationId: number, _previous: FormState, form: FormData): Promise<FormState> {
  const parsed = details.safeParse({ company: text(form, "company"), title: text(form, "title"), url: text(form, "url"), location: text(form, "location") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  updateDetails(getDb(), id.parse(applicationId), { ...parsed.data, url: parsed.data.url || undefined, description: text(form, "description") });
  changed();
  return {};
}

export async function removeApplication(applicationId: number) {
  deleteApplication(getDb(), id.parse(applicationId));
  changed();
  redirect("/applications");
}

export type PacketState = { error?: string };

export async function buildPacketAction(applicationId: number, _previous: PacketState, form: FormData): Promise<PacketState> {
  void form;
  const result = await buildPacket(getDb(), id.parse(applicationId));
  changed();
  return result.ok ? {} : { error: result.error };
}

export type FillState = { opened?: boolean; error?: string };

export async function fillInForm(applicationId: number, _previous: FillState, form: FormData): Promise<FillState> {
  void form;
  const valid = id.parse(applicationId);
  if (!applyPrompt(getDb(), valid)) return { error: "This application needs a job link and a written CV first." };
  const command = `pnpm agent apply ${valid}`;
  const result = await openInTerminal(process.cwd(), command);
  if (!result.ok) {
    console.error("Could not open Terminal", result.reason);
    return { error: `Terminal didn't open. Allow it in System Settings, under Privacy & Security, then Automation, or run ${command} yourself from ${process.cwd()}.` };
  }
  return { opened: true };
}

export async function startVoiceInterview(_previous: FillState, form: FormData): Promise<FillState> {
  void form;
  const result = await openInTerminal(process.cwd(), "pnpm agent voice");
  if (!result.ok) {
    console.error("Could not open Terminal", result.reason);
    return { error: `Terminal didn't open. Run pnpm agent voice yourself from ${process.cwd()}.` };
  }
  return { opened: true };
}
