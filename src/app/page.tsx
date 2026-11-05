import Link from "next/link";
import { connection } from "next/server";
import { desc } from "drizzle-orm";
import { ApplicationRow } from "@/components/application-row";
import { sentAnswer } from "@/app/email/actions";
import { JobRow } from "@/components/job-row";
import { getDb } from "@/db";
import { agentRuns } from "@/db/schema";
import { KIND_LABELS, KINDS, readPreferences, readVault, type Entry } from "@/lib/vault/entries";
import { formatWhen, RUN_LABELS, runName } from "@/lib/format";
import { jobsToReview } from "@/lib/jobs/store";
import { readWatchlist } from "@/lib/jobs/watchlist";
import { isEndStage } from "@/lib/stages";
import { pendingFindings } from "@/lib/inbox/inbox";
import { applicationsToAskAbout, dueApplications, listApplications } from "@/lib/tracker";

const BEST_SCORE = 60;
const BEST_SHOWN = 5;

function NextStep({ hasPreferences, entries, due, open }: { hasPreferences: boolean; entries: Entry[]; due: number; open: number }) {
  const drafts = entries.filter((entry) => entry.status === "draft").length;
  if (entries.length === 0) {
    return (
      <div className="next-step">
        <h1>Start by building your profile.</h1>
        <p>This reads your CVs and projects and writes draft entries about your career. Nothing counts until you confirm it. Run this in your terminal, in this project&apos;s folder:</p>
        <code className="command">pnpm agent profile-import</code>
      </div>
    );
  }
  if (drafts > 0) {
    return (
      <div className="next-step">
        <h1>{drafts === 1 ? "1 draft is" : `${drafts} drafts are`} waiting for your review.</h1>
        <p>Only entries you confirm can ever appear in an application. Check each one against what really happened.</p>
        <Link className="button button-primary" href="/review">Review drafts</Link>
      </div>
    );
  }
  if (!hasPreferences) {
    return (
      <div className="next-step">
        <h1>Tell Jobless what you&apos;re looking for.</h1>
        <p>A five-minute interview about roles, location, pay and dealbreakers. Job scoring uses your answers. Run this in your terminal, in this project&apos;s folder:</p>
        <code className="command">pnpm agent setup</code>
      </div>
    );
  }
  if (due > 0) {
    return (
      <div className="next-step">
        <h1>{due === 1 ? "1 next step is" : `${due} next steps are`} due.</h1>
      </div>
    );
  }
  if (open === 0) {
    return (
      <div className="next-step">
        <h1>Your profile is ready. Pick a job to go after.</h1>
        <p>Save the ones worth applying for. If you&apos;ve already sent some, <Link href="/applications">add them</Link> so their follow-ups don&apos;t get lost.</p>
        <Link className="button button-primary" href="/jobs">See jobs</Link>
      </div>
    );
  }
  return (
    <div className="next-step">
      <h1>Nothing is due today.</h1>
      <p>You have {open === 1 ? "1 open application" : `${open} open applications`}. <Link href="/applications">See them all</Link></p>
      <p>When something worth keeping happens, save it right away:</p>
      <code className="command">pnpm agent remember shipped the new billing system</code>
    </div>
  );
}

export default async function TodayPage() {
  await connection();
  const { entries } = readVault();
  const db = getDb();
  const now = new Date();
  const due = dueApplications(db, now);
  const toAsk = applicationsToAskAbout(db, now);
  const emailUpdates = pendingFindings(db).length;
  const open = listApplications(db).filter((application) => !isEndStage(application.stage)).length;
  const bestJobs = jobsToReview(db, readWatchlist().search).jobs.filter((job) => (job.score ?? 0) >= BEST_SCORE).slice(0, BEST_SHOWN);
  const runs = db.select().from(agentRuns).orderBy(desc(agentRuns.startedAt)).limit(4).all();
  const count = (kind: Entry["kind"], status: Entry["status"]) => entries.filter((entry) => entry.kind === kind && entry.status === status).length;

  return (
    <>
      <NextStep hasPreferences={readPreferences() !== undefined} entries={entries} due={due.length} open={open} />

      {emailUpdates > 0 && (
        <section className="section" aria-labelledby="email-heading">
          <h2 id="email-heading">Email updates</h2>
          <p><Link href="/email">{emailUpdates === 1 ? "1 update from your email needs" : `${emailUpdates} updates from your email need`} your OK</Link></p>
        </section>
      )}

      {toAsk.length > 0 && (
        <section className="section" aria-labelledby="ask-heading">
          <h2 id="ask-heading">Did you send these?</h2>
          <div className="ledger">
            {toAsk.map((application) => (
              <div className="row" key={application.id}>
                <div className="row-margin"><span className="row-when">No email found</span></div>
                <div className="row-main">
                  <Link className="row-title" href={`/applications/${application.id}`}>{application.title} at {application.company}</Link>
                  <div className="actions row-actions">
                    <form action={sentAnswer.bind(null, application.id, true)}><button className="button">Yes, I sent it</button></form>
                    <form action={sentAnswer.bind(null, application.id, false)}><button className="button button-quiet">Not yet</button></form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {due.length > 0 && (
        <section className="section" aria-labelledby="due-heading">
          <h2 id="due-heading">Due now</h2>
          <div className="ledger">
            {due.map((application) => <ApplicationRow key={application.id} application={application} now={now} showStage />)}
          </div>
        </section>
      )}

      {bestJobs.length > 0 && (
        <section className="section" aria-labelledby="best-heading">
          <h2 id="best-heading">Best new jobs</h2>
          <div className="ledger">
            {bestJobs.map((job) => <JobRow key={job.id} job={job} />)}
          </div>
          <p className="list-end"><Link href="/jobs">All jobs</Link></p>
        </section>
      )}

      <section className="section" aria-labelledby="record-heading">
        <h2 id="record-heading">Your record so far</h2>
        <div className="tally-wrap">
          <table className="tally">
            <thead>
              <tr><th scope="col">Section</th><th scope="col" className="num">Confirmed</th><th scope="col" className="num">Drafts</th></tr>
            </thead>
            <tbody>
              {KINDS.map((kind) => (
                <tr key={kind}>
                  <td><Link href={`/wiki?kind=${kind}`}>{KIND_LABELS[kind]}</Link></td>
                  <td className="num">{count(kind, "confirmed")}</td>
                  <td className="num">{count(kind, "draft")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {runs.length > 0 && (
        <section className="section" aria-labelledby="runs-heading">
          <h2 id="runs-heading">Latest agent activity</h2>
          <div className="tally-wrap">
            <table className="tally">
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>{runName(run.agent)}</td>
                    <td>{RUN_LABELS[run.status]}</td>
                    <td className="num">{formatWhen(run.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
