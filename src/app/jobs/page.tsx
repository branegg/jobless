import Link from "next/link";
import { connection } from "next/server";
import { getDb } from "@/db";
import { CheckJobs, PasteJob } from "@/components/job-forms";
import { JobRow } from "@/components/job-row";
import { dismissedJobs, jobsToReview } from "@/lib/jobs/store";
import { readWatchlist } from "@/lib/jobs/watchlist";

export const metadata = { title: "Jobs" };

const SHOWN = 100;

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  await connection();
  const showDismissed = (await searchParams).show === "dismissed";
  const db = getDb();
  const watchlist = readWatchlist();
  const { jobs, otherOpenJobs } = jobsToReview(db, watchlist.search);
  const dismissed = dismissedJobs(db);
  const rows = showDismissed ? dismissed : jobs;
  const unscored = jobs.filter((job) => job.score === null).length;

  return (
    <>
      <header className="page-head">
        <h1>Jobs</h1>
        <p className="lede">
          From {watchlist.companies.length} companies and any <Link href="/job-sources">job boards you&apos;ve connected</Link>, best fit first. {jobs.length} to look at, {unscored} not scored yet. {otherOpenJobs} other open {otherOpenJobs === 1 ? "job misses" : "jobs miss"} your search.
        </p>
      </header>

      <div className="stack">
        <CheckJobs />
        <PasteJob />
      </div>

      <nav className="filters" aria-label="Which jobs">
        <Link href="/jobs" aria-current={showDismissed ? undefined : "page"}>To look at</Link>
        <Link href="/jobs?show=dismissed" aria-current={showDismissed ? "page" : undefined}>Not for me ({dismissed.length})</Link>
      </nav>

      <div className="ledger">
        {rows.length === 0 ? (
          <p className="empty">{showDismissed ? "Nothing dismissed." : "No jobs yet. Check for new jobs, or add one from a link."}</p>
        ) : (
          rows.slice(0, SHOWN).map((job) => <JobRow key={job.id} job={job} />)
        )}
      </div>
      {rows.length > SHOWN && <p className="row-note list-end">Showing the top {SHOWN} of {rows.length}.</p>}
    </>
  );
}
