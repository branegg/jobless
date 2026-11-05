import { desc } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/db";
import { agentRuns } from "@/db/schema";
import { formatDuration, formatWhen, RUN_LABELS, runName } from "@/lib/format";

export const metadata = { title: "Agent activity" };

export default async function RunsPage() {
  await connection();
  const runs = getDb().select().from(agentRuns).orderBy(desc(agentRuns.startedAt)).limit(100).all();
  return (
    <>
      <header className="page-head">
        <h1>Agent activity</h1>
        <p className="lede">Every agent run, with what came of it. Full logs are in <code>data/logs/</code>.</p>
      </header>
      <div className="tally-wrap">
        {runs.length === 0 ? <p className="empty">No agents have run yet.</p> : (
          <table className="tally">
            <thead><tr><th scope="col">Job</th><th scope="col">Result</th><th scope="col">Started</th><th scope="col" className="num">Took</th></tr></thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td>{runName(run.agent)}<div className="row-note">{run.result ? `${run.result.slice(0, 140)}${run.result.length > 140 ? "…" : ""}` : ""}</div></td>
                  <td style={{ whiteSpace: "nowrap" }}>{RUN_LABELS[run.status]}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatWhen(run.startedAt)}</td>
                  <td className="num">{formatDuration(run.startedAt, run.endedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
