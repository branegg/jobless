import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Db } from "../../db";
import { agentRuns } from "../../db/schema";
import { BOARD_NAMES, boardReady, fetchBoard, type BoardOutcome, type BoardSource, type Pause } from "./boards";
import { fetchFeed, type Ats, type Fetcher } from "./feeds";
import { readBoardKeys, type BoardKeys } from "./keys";
import { syncCompanyJobs } from "./store";
import type { Watchlist } from "./watchlist";

const GAP_BETWEEN_COMPANIES: Partial<Record<Ats, number>> = { lever: 1000, workable: 2500 };
const DEFAULT_GAP = 150;

export type FetchSummary = { added: number; closed: number; companies: number; failures: { name: string; reason: string }[]; boards: BoardOutcome[] };
export type FetchOptions = { keys?: BoardKeys; pause?: Pause };

const wait: Pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchAllJobs(db: Db, watchlist: Watchlist, fetcher: Fetcher = fetch, options: FetchOptions = {}): Promise<FetchSummary> {
  const id = randomUUID();
  const pause = options.pause ?? wait;
  db.insert(agentRuns).values({ id, agent: "fetch-jobs" }).run();
  const summary: FetchSummary = { added: 0, closed: 0, companies: 0, failures: [], boards: [] };
  const systems = Map.groupBy(watchlist.companies, (board) => board.ats);
  await Promise.all(
    [...systems].map(async ([ats, boards]) => {
      for (const board of boards) {
        try {
          const result = syncCompanyJobs(db, board, await fetchFeed(board.ats, board.token, fetcher));
          summary.added += result.added + result.reopened;
          summary.closed += result.closed;
          summary.companies++;
        } catch (error) {
          summary.failures.push({ name: board.name, reason: error instanceof Error ? error.message : String(error) });
        }
        await pause(GAP_BETWEEN_COMPANIES[ats] ?? DEFAULT_GAP);
      }
    }),
  );

  const keys = options.keys ?? readBoardKeys();
  if (watchlist.boards.searches.length > 0) {
    for (const source of Object.keys(BOARD_NAMES) as BoardSource[]) {
      if (!boardReady(source, keys)) continue;
      const outcome = await fetchBoard(db, source, watchlist, keys, fetcher, pause);
      summary.boards.push(outcome);
      summary.added += outcome.added;
      summary.closed += outcome.closed;
    }
  }

  const failed = summary.failures.length > 0 ? `, ${summary.failures.length} failed: ${summary.failures.map((item) => item.name).join(", ")}` : "";
  const boards = summary.boards.map((board) => `. ${board.name}: ${board.added} new, ${board.duplicates} already found elsewhere${board.reason ? `, stopped because ${board.reason}` : ""}`).join("");
  db.update(agentRuns)
    .set({
      endedAt: new Date(),
      status: summary.companies === 0 && summary.failures.length > 0 ? "failed" : "ok",
      result: `Checked ${summary.companies} companies, ${summary.added} new jobs, ${summary.closed} closed${failed}${boards}`,
    })
    .where(eq(agentRuns.id, id))
    .run();
  return summary;
}
