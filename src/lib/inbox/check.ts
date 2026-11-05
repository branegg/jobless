import type { Db } from "../../db";
import { runAgent } from "../agents/run";
import { readSettings } from "../settings";
import { applicationsToCheck, buildInboxPrompt, FINDINGS_JSON_SCHEMA, recordFindings, type RecordSummary } from "./inbox";

export type CheckSummary = { skipped: true; reason: string } | { skipped: false; ok: false; reason: string } | ({ skipped: false; ok: true } & RecordSummary);

export async function checkEmail(db: Db): Promise<CheckSummary> {
  const rows = applicationsToCheck(db);
  if (rows.length === 0) return { skipped: true, reason: "no open applications" };
  const run = await runAgent("inbox", { prompt: buildInboxPrompt(rows), jsonSchema: FINDINGS_JSON_SCHEMA });
  if (run.status !== "ok" || !run.structured) return { skipped: false, ok: false, reason: run.reason ?? "the agent returned nothing" };
  return { skipped: false, ok: true, ...recordFindings(db, rows, run.structured, readSettings().inboxAutoApply) };
}
