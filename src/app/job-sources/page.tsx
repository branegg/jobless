import { connection } from "next/server";
import { AdzunaKeys, ReedKey } from "@/components/board-keys";
import { boardReady } from "@/lib/jobs/boards";
import { readBoardKeys } from "@/lib/jobs/keys";
import { readWatchlist } from "@/lib/jobs/watchlist";

export const metadata = { title: "Job sources" };

const SYSTEM_LABELS: Record<string, string> = { greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby", workable: "Workable", recruitee: "Recruitee" };

export default async function JobSourcesPage() {
  await connection();
  const watchlist = readWatchlist();
  const keys = readBoardKeys();
  const counts = Map.groupBy(watchlist.companies, (company) => company.ats);
  const reed = boardReady("reed", keys);
  const adzuna = boardReady("adzuna", keys);

  return (
    <>
      <header className="page-head">
        <h1>Job sources</h1>
        <p className="lede">Where Jobless looks for jobs each morning. Keys stay on this Mac and are only sent to the board they belong to.</p>
      </header>

      <section className="section" aria-labelledby="companies-heading">
        <h2 id="companies-heading">Companies</h2>
        <p>{watchlist.companies.length} companies, read from their own job boards: {[...counts].map(([ats, list]) => `${list.length} on ${SYSTEM_LABELS[ats]}`).join(", ")}. To add one, edit <code>watchlist.yaml</code>.</p>
      </section>

      <section className="section" aria-labelledby="reed-heading">
        <h2 id="reed-heading">Reed</h2>
        <p className="row-note">{reed ? "Connected. " : "Not connected. "}UK job board with full job descriptions. Includes recruitment agencies. <a href="https://www.reed.co.uk/developers/jobseeker" target="_blank" rel="noreferrer">Get a free key</a>.</p>
        <ReedKey connected={reed} />
      </section>

      <section className="section" aria-labelledby="adzuna-heading">
        <h2 id="adzuna-heading">Adzuna</h2>
        <p className="row-note">{adzuna ? "Connected. " : "Not connected. "}Gathers jobs from many UK sites, but only shares a short preview of each, so you paste the full description in before a CV can be written. <a href="https://developer.adzuna.com/signup" target="_blank" rel="noreferrer">Get free keys</a>.</p>
        <AdzunaKeys connected={adzuna} />
      </section>

      <section className="section" aria-labelledby="left-out-heading">
        <h2 id="left-out-heading">Left out on purpose</h2>
        <p className="row-note">LinkedIn doesn&apos;t allow automated searching, so paste those links under Jobs. SmartRecruiters blocks automated access, and Workday has no public feed.</p>
      </section>
    </>
  );
}
