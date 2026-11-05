import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { Db } from "../../db";
import { applications, events, jobs } from "../../db/schema";
import { runAgent } from "../agents/run";
import { canMove } from "../stages";
import { readContact, type Contact } from "../vault/contact";
import { readVault, usableInApplications } from "../vault/entries";
import { buildTailorPrompt, DRAFT_JSON_SCHEMA, draftSchema, formDetails, verifyDraft, type VerifiedPacket } from "./packet";
import { renderCvHtml, renderPdf } from "./render";

export type Packet = VerifiedPacket & { contact: Contact; cvFile: string; builtAt: string };
export type BuildResult = { ok: true; packet: Packet } | { ok: false; error: string };

export function packetsDir(): string {
  const database = process.env.JOBLESS_DB ?? path.join(process.cwd(), "data", "jobless.db");
  return path.join(path.dirname(database), "packets");
}

export function packetDir(applicationId: number): string {
  return path.join(packetsDir(), String(applicationId));
}

function cvFileName(name: string): string {
  return `${name.replace(/[^\p{L}\p{N} -]/gu, "").trim() || "My"} CV.pdf`;
}

export function readPacket(applicationId: number): Packet | undefined {
  const file = path.join(packetDir(applicationId), "packet.json");
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Packet) : undefined;
}

export function cvPath(applicationId: number): string | undefined {
  const packet = readPacket(applicationId);
  if (!packet) return undefined;
  const file = path.join(packetDir(applicationId), path.basename(packet.cvFile));
  return fs.existsSync(file) ? file : undefined;
}

export async function buildPacket(db: Db, applicationId: number): Promise<BuildResult> {
  const row = db.select().from(applications).innerJoin(jobs, eq(applications.jobId, jobs.id)).where(eq(applications.id, applicationId)).get();
  if (!row) return { ok: false, error: "That application doesn't exist." };
  const contact = readContact();
  if (!contact?.confirmed) return { ok: false, error: "Check your contact details first, so the CV can include them." };
  if (!row.jobs.description?.trim()) return { ok: false, error: "This job has no description to tailor to. Add it under Fix the details." };
  if (row.jobs.previewOnly) return { ok: false, error: "The job board only shares a short preview of this job. Copy the full description from the job page into Fix the details, then try again." };
  const entries = usableInApplications(readVault().entries).filter((entry) => entry.kind !== "answers");
  if (entries.length === 0) return { ok: false, error: "Nothing in your profile is confirmed and public yet." };

  const { getJob } = await import("../jobs/store");
  const job = getJob(db, row.jobs.id)!;
  const prompt = buildTailorPrompt({ title: job.title, company: job.company, location: job.location, compensation: job.compensation, description: job.description }, entries);
  const run = await runAgent("tailor", { prompt, jsonSchema: DRAFT_JSON_SCHEMA });
  if (run.status !== "ok" || !run.structured) return { ok: false, error: `The packet wasn't written: ${run.reason ?? "the agent returned nothing"}. See Agent activity.` };
  const parsed = draftSchema.safeParse(run.structured);
  if (!parsed.success) return { ok: false, error: "The agent's packet came back in the wrong shape. Try again." };

  const verified = verifyDraft(parsed.data, entries, `${job.title}\n${job.description ?? ""}`);
  const dir = packetDir(applicationId);
  fs.mkdirSync(dir, { recursive: true });
  const cvFile = cvFileName(contact.name);
  await renderPdf(renderCvHtml(verified.draft, contact), path.join(dir, cvFile));
  const packet: Packet = { ...verified, contact, cvFile, builtAt: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, "packet.json"), JSON.stringify(packet, null, 2));

  db.transaction((tx) => {
    const current = row.applications.stage;
    const advance = canMove(current, "packet_ready");
    tx.update(applications).set({ packetPath: dir, stage: advance ? "packet_ready" : current, updatedAt: new Date() }).where(eq(applications.id, applicationId)).run();
    tx.insert(events)
      .values({
        applicationId,
        kind: advance ? "stage_change" : "packet",
        fromStage: advance ? current : null,
        toStage: advance ? "packet_ready" : null,
        summary: `Built the application packet${verified.removed.length ? `, ${verified.removed.length} unsupported claims removed` : ""}`,
        source: "tailor",
      })
      .run();
  });
  return { ok: true, packet };
}

export function applyPrompt(db: Db, applicationId: number, ending = "Stop before Submit and tell me what, if anything, is left for me."): string | undefined {
  const row = db.select().from(applications).innerJoin(jobs, eq(applications.jobId, jobs.id)).where(eq(applications.id, applicationId)).get();
  const cv = cvPath(applicationId);
  const contact = readContact();
  if (!row?.jobs.url || !cv || !contact?.confirmed) return undefined;
  const details = formDetails(contact, readVault().entries, row.jobs);
  return `Fill in the application form for this job.\n\nJob page: ${row.jobs.url}\nPacket: ${path.join(packetDir(applicationId), "packet.json")}\nCV to upload: ${cv}\n\nMy current details and saved answers, which replace any contact details in the packet:\n${details}\n\n${ending}`;
}
