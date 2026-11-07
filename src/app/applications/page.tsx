import { connection } from "next/server";
import { getDb } from "@/db";
import { AddApplication } from "@/components/add-application";
import { ApplicationActions } from "@/components/application-actions";
import { ApplicationRow } from "@/components/application-row";
import { toDayInput } from "@/lib/format";
import { ACTIVE_STAGES, isEndStage, STAGE_LABELS } from "@/lib/stages";
import { listApplications, type ApplicationRow as Row } from "@/lib/tracker";
import { readContact } from "@/lib/vault/contact";

export const metadata = { title: "Applications" };

const FURTHEST_FIRST = [...ACTIVE_STAGES].reverse();

export default async function ApplicationsPage() {
  await connection();
  const all = listApplications(getDb()).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const now = new Date();
  const closed = all.filter((application) => isEndStage(application.stage));
  const contactReady = Boolean(readContact()?.confirmed);
  const actions = (application: Row) => (
    <ApplicationActions id={application.id} stage={application.stage} hasPacket={Boolean(application.packetPath)} hasDescription={application.hasDescription} url={application.url} contactReady={contactReady} />
  );
  return (
    <>
      <header className="page-head">
        <h1>Applications</h1>
        <p className="lede">
          {all.length === 0
            ? "Nothing here yet. Add anything you've already sent, so its follow-ups don't get lost."
            : `${all.length - closed.length} open, ${closed.length} closed. The furthest along come first, then the best fit.`}
        </p>
      </header>

      <AddApplication open={all.length === 0} today={toDayInput(now)} />


      {FURTHEST_FIRST.map((stage) => {
        const rows = all.filter((application) => application.stage === stage);
        if (rows.length === 0) return null;
        return (
          <section className="section" key={stage} aria-labelledby={`stage-${stage}`}>
            <h2 id={`stage-${stage}`}>{STAGE_LABELS[stage]}</h2>
            <div className="ledger">
              {rows.map((application) => <ApplicationRow key={application.id} application={application} now={now}>{actions(application)}</ApplicationRow>)}
            </div>
          </section>
        );
      })}

      {closed.length > 0 && (
        <section className="section" aria-labelledby="stage-closed">
          <h2 id="stage-closed">Closed</h2>
          <div className="ledger">
            {closed.map((application) => <ApplicationRow key={application.id} application={application} now={now} showStage>{actions(application)}</ApplicationRow>)}
          </div>
        </section>
      )}
    </>
  );
}
