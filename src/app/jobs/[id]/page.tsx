import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { dismissJobAction, restoreJobAction, saveJobAction } from "../actions";
import { StageMark } from "@/components/application-row";
import { ScoreMark } from "@/components/job-row";
import { getDb } from "@/db";
import { BOARD_NAMES, type BoardSource } from "@/lib/jobs/boards";
import { getJob } from "@/lib/jobs/store";

export const metadata = { title: "Job" };

export default async function JobPage({ params }: PageProps<"/jobs/[id]">) {
  await connection();
  const id = Number((await params).id);
  const job = Number.isInteger(id) && id > 0 ? getJob(getDb(), id) : undefined;
  if (!job) notFound();
  const board = BOARD_NAMES[job.source as BoardSource];

  return (
    <>
      <header className="page-head">
        <p className="lede back"><Link href="/jobs">All jobs</Link></p>
        <h1>{job.title} at {job.company}</h1>
        <div className="head-meta">
          <ScoreMark score={job.score} />
          {job.location && <span>{job.location}</span>}
          {job.compensation && <span>{job.compensation}</span>}
          {job.url && <a href={job.url} target="_blank" rel="noreferrer">Job page</a>}
          {board && <span>Found on {board}</span>}
          {job.status === "closed" && <span className="due-late">No longer listed</span>}
        </div>
      </header>

      {job.scoreReason && <p className="score-reason">{job.scoreReason}</p>}

      <section className="actions" aria-label="What to do with this job">
        {job.application ? (
          <>
            <StageMark stage={job.application.stage} />
            <Link className="button" href={`/applications/${job.application.id}`}>Open application</Link>
          </>
        ) : job.status === "dismissed" ? (
          <form action={restoreJobAction.bind(null, job.id)}><button className="button">Put back</button></form>
        ) : (
          <>
            <form action={saveJobAction.bind(null, job.id)}><button className="button button-primary">Save to applications</button></form>
            {job.status === "new" && <form action={dismissJobAction.bind(null, job.id)}><button className="button button-quiet">Not for me</button></form>}
          </>
        )}
      </section>

      <section className="section" aria-labelledby="description-heading">
        <h2 id="description-heading">Description</h2>
        {job.previewOnly && <p className="row-note">{board ?? "The job board"} only shares this short preview. The score is based on it, and writing a CV needs the full description pasted in from the job page.</p>}
        {job.description ? <p className="job-text">{job.description}</p> : <p className="row-note">No description saved. Open the job page to read it.</p>}
      </section>
    </>
  );
}
