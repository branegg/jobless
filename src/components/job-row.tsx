import Link from "next/link";
import { dismissJobAction, restoreJobAction, saveJobAction } from "@/app/jobs/actions";

type Job = { id: number; title: string; company: string; location: string | null; compensation: string | null; score: number | null; scoreReason: string | null; status: string };

export function ScoreMark({ score }: { score: number | null }) {
  if (score === null) return <span className="row-when">Not scored yet</span>;
  return <span className={score >= 75 ? "score score-high" : "score"} aria-label={`Score ${Math.round(score)} out of 100`}>{Math.round(score)}</span>;
}

export function JobRow({ job }: { job: Job }) {
  const where = [job.location, job.compensation].filter(Boolean).join(". ");
  return (
    <div className="row row-compact">
      <div className="row-margin"><ScoreMark score={job.score} /></div>
      <div className="row-main">
        <Link className="row-title" href={`/jobs/${job.id}`}>{job.title} at {job.company}</Link>
        {job.scoreReason && <p className="row-note row-clamp" title={job.scoreReason}>{job.scoreReason}</p>}
      </div>
      <p className="row-where" title={where}>{where}</p>
      <div className="actions row-side">
        {job.status === "dismissed" ? (
          <form action={restoreJobAction.bind(null, job.id)}><button className="button">Put back</button></form>
        ) : (
          <>
            <form action={saveJobAction.bind(null, job.id)}><button className="button" aria-label="Save to applications">Save</button></form>
            <form action={dismissJobAction.bind(null, job.id)}><button className="button button-quiet">Not for me</button></form>
          </>
        )}
      </div>
    </div>
  );
}
