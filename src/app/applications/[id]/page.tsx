import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { addNoteAction, clearNextAction, moveApplication, saveNextAction, undoMove } from "../actions";
import { StageMark } from "@/components/application-row";
import { EditApplication } from "@/components/edit-application";
import { ScoreMark } from "@/components/job-row";
import { PacketSection } from "@/components/packet-section";
import { getDb } from "@/db";
import { formatDay, formatWhen, toDayInput } from "@/lib/format";
import { movesFrom, nextStage, STAGE_LABELS } from "@/lib/stages";
import { readPacket } from "@/lib/packets/build";
import { getApplication } from "@/lib/tracker";
import { readContact } from "@/lib/vault/contact";
import { readVault } from "@/lib/vault/entries";

export const metadata = { title: "Application" };

const SOURCE_LABELS = { manual: undefined, inbox: "From the email check", apply: "From form filling", tailor: "From the application packet" };

export default async function ApplicationPage({ params }: PageProps<"/applications/[id]">) {
  await connection();
  const id = Number((await params).id);
  const application = Number.isInteger(id) && id > 0 ? getApplication(getDb(), id) : undefined;
  if (!application) notFound();

  const next = nextStage(application.stage);
  const others = movesFrom(application.stage).filter((stage) => stage !== next);
  const canUndo = application.timeline.find((event) => event.kind === "stage_change")?.fromStage != null;

  return (
    <>
      <header className="page-head">
        <p className="lede back"><Link href="/applications">All applications</Link></p>
        <h1>{application.title} at {application.company}</h1>
        <div className="head-meta">
          {application.score !== null && <ScoreMark score={application.score} />}
          <StageMark stage={application.stage} />
          {application.location && <span>{application.location}</span>}
          {application.appliedAt && <span>Sent {formatDay(application.appliedAt)}</span>}
          {application.url && <a href={application.url} target="_blank" rel="noreferrer">Job page</a>}
        </div>
      </header>

      <section aria-label="Move this application" className="actions">
        {next && (
          <form action={moveApplication.bind(null, application.id)}>
            <input type="hidden" name="to" value={next} />
            <button className="button button-primary">Mark as {STAGE_LABELS[next].toLowerCase()}</button>
          </form>
        )}
        {others.length > 0 && (
          <form action={moveApplication.bind(null, application.id)} className="move-form">
            <label className="sr-only" htmlFor="move-to">Other stage</label>
            <select id="move-to" name="to" className="input" defaultValue="" required>
              <option value="" disabled>Other stage</option>
              {others.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}
            </select>
            <button className="button">Move</button>
          </form>
        )}
        {canUndo && (
          <form action={undoMove.bind(null, application.id)}>
            <button className="button button-quiet">Undo last move</button>
          </form>
        )}
      </section>

      <PacketSection applicationId={application.id} packet={readPacket(application.id)} hasDescription={Boolean(application.description?.trim())} hasLink={Boolean(application.url)} contactReady={Boolean(readContact()?.confirmed)} hasVoice={readVault().entries.some((entry) => entry.kind === "stories" && entry.slug === "my-voice")} />

      <section className="section" aria-labelledby="next-heading">
        <h2 id="next-heading">Next step</h2>
        <form action={saveNextAction.bind(null, application.id)} className="next-form" key={`${application.nextAction}-${application.nextActionAt?.getTime()}`}>
          <label className="field"><span>What needs doing</span><input name="action" className="input" defaultValue={application.nextAction ?? ""} required /></label>
          <label className="field"><span>By when</span><input name="day" type="date" className="input" defaultValue={application.nextActionAt ? toDayInput(application.nextActionAt) : ""} /></label>
          <button className="button">Save next step</button>
        </form>
        {application.nextAction && (
          <form action={clearNextAction.bind(null, application.id)} className="clear-form">
            <button className="button button-quiet">Clear next step</button>
          </form>
        )}
      </section>

      <section className="section" aria-labelledby="timeline-heading">
        <h2 id="timeline-heading">Timeline</h2>
        <form action={addNoteAction.bind(null, application.id)} className="inline-form note-form">
          <label className="sr-only" htmlFor="note">Add a note</label>
          <input id="note" name="note" className="input" placeholder="Add a note" required />
          <button className="button">Add note</button>
        </form>
        <div className="ledger">
          {application.timeline.map((event) => (
            <div className="row" key={event.id}>
              <div className="row-margin"><span className="row-when">{formatWhen(event.at)}</span></div>
              <div className="row-main">
                <p className={event.kind === "note" ? "timeline-note" : undefined}>{event.summary}</p>
                {SOURCE_LABELS[event.source] && <p className="row-note">{SOURCE_LABELS[event.source]}</p>}
                {event.evidence && <p className="row-note">{event.evidence}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <EditApplication application={{ id: application.id, company: application.company, title: application.title, url: application.url, location: application.location, description: application.description }} />
      </section>
    </>
  );
}
