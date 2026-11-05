import Link from "next/link";
import type { ReactNode } from "react";
import { ScoreMark } from "@/components/job-row";
import { formatDay } from "@/lib/format";
import { isEndStage, STAGE_LABELS } from "@/lib/stages";
import type { ApplicationRow as Row } from "@/lib/tracker";

function dueLabel(at: Date, now: Date): { text: string; late: boolean } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (at.getTime() < start.getTime()) return { text: `Was due ${formatDay(at)}`, late: true };
  if (at.getTime() <= now.getTime()) return { text: "Due today", late: true };
  return { text: `Due ${formatDay(at)}`, late: false };
}

export function StageMark({ stage }: { stage: Row["stage"] }) {
  return <span className={`mark ${isEndStage(stage) ? "mark-ended" : "mark-stage"}`}>{STAGE_LABELS[stage]}</span>;
}

export function ApplicationRow({ application, now, showStage = false, children }: { application: Row; now: Date; showStage?: boolean; children?: ReactNode }) {
  const due = application.nextActionAt ? dueLabel(application.nextActionAt, now) : undefined;
  return (
    <div className="row">
      <div className="row-margin">
        {application.score !== null && <ScoreMark score={application.score} />}
        {showStage ? (
          <StageMark stage={application.stage} />
        ) : (
          <span className="row-when">{application.appliedAt ? `Sent ${formatDay(application.appliedAt)}` : `Added ${formatDay(application.createdAt)}`}</span>
        )}
      </div>
      <div className="row-main">
        <Link className="row-title" href={`/applications/${application.id}`}>{application.title} at {application.company}</Link>
        {application.nextAction && (
          <p className="row-note">
            {application.nextAction}
            {due && <>. <span className={due.late ? "due-late" : undefined}>{due.text}</span></>}
          </p>
        )}
        {application.location && <p className="row-note">{application.location}</p>}
        {children}
      </div>
    </div>
  );
}
