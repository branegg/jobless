import { getDb } from "../src/db";
import { fetchAllJobs } from "../src/lib/jobs/fetch";
import { scoreNewJobs } from "../src/lib/jobs/score";
import { readWatchlist } from "../src/lib/jobs/watchlist";

async function main() {
  const command = process.argv[2];
  if (!["fetch", "score", "daily"].includes(command)) {
    console.error("usage: pnpm jobs:fetch | jobs:score | jobs:daily");
    process.exit(2);
  }
  const db = getDb();
  const watchlist = readWatchlist();
  if (command !== "score") console.log(JSON.stringify({ fetch: await fetchAllJobs(db, watchlist) }, null, 2));
  if (command !== "fetch") {
    const scoreAll = process.argv[3] === "all";
    const limit = process.argv[3] && !scoreAll ? Number(process.argv[3]) : undefined;
    const summary = await scoreNewJobs(db, watchlist, { maxJobs: limit, ignoreDailyCap: scoreAll });
    console.log(JSON.stringify({ score: summary }, null, 2));
    if (summary.failed > 0) process.exit(1);
  }
}

main();
