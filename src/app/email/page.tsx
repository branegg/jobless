import Link from "next/link";
import { connection } from "next/server";
import { acceptFindingAction, ignoreFindingAction, setAutoApply } from "./actions";
import { EmailCheck } from "@/components/email-check";
import { getDb } from "@/db";
import { formatDay, formatWhen } from "@/lib/format";
import { KIND_LABELS, lastCheckedAt, pendingFindings, recentFindings } from "@/lib/inbox/inbox";
import { readSettings } from "@/lib/settings";
import { STAGE_LABELS } from "@/lib/stages";

export const metadata = { title: "Email check" };

const STATUS_LABELS = { applied: "Applied", ignored: "Ignored", no_change: "Already up to date", pending: "Waiting", seen: "Seen" };

export default async function EmailPage() {
  await connection();
  const db = getDb();
  const pending = pendingFindings(db);
  const recent = recentFindings(db);
  const { inboxAutoApply } = readSettings();
  const checked = lastCheckedAt(db);
  return (
    <>
      <header className="page-head">
        <h1>Email check</h1>
        <p className="lede">
          Joblesss searches your Gmail for news about your open applications. It can only search and read, so it can&apos;t send, delete or change anything. {checked ? `Last checked ${formatWhen(checked)}.` : "It hasn't checked yet."}
        </p>
      </header>

      <div className="stack">
        <EmailCheck />
        <form action={setAutoApply.bind(null, !inboxAutoApply)} className="check-form">
          <button className="button button-quiet auto-toggle">{inboxAutoApply ? "Ask me first again" : "Apply clear updates automatically"}</button>
          <span className="row-note">{inboxAutoApply ? "Clear updates apply by themselves. Unclear or suspicious ones still wait for you." : "Every update waits for your OK."}</span>
        </form>
      </div>

      <section className="section" aria-labelledby="pending-heading">
        <h2 id="pending-heading">Waiting for your OK</h2>
        <div className="ledger">
          {pending.length === 0 ? <p className="empty">Nothing waiting.</p> : pending.map((finding) => (
            <div className="row" key={finding.id}>
              <div className="row-margin">
                <span className="mark mark-stage">{KIND_LABELS[finding.kind]}</span>
                <span className="row-when">{formatDay(finding.emailAt)}</span>
              </div>
              <div className="row-main">
                <Link className="row-title" href={`/applications/${finding.applicationId}`}>{finding.title} at {finding.company}</Link>
                <p className="row-note">{finding.fromAddress}: {finding.subject}</p>
                <p className="timeline-note">&ldquo;{finding.quote}&rdquo;</p>
                {finding.suspicious && <p className="due-late">This email contains text aimed at AI tools, which was ignored. Check it yourself.</p>}
                {finding.confidence === "low" && <p className="row-note">Joblesss isn&apos;t sure about this one.</p>}
                <div className="actions row-actions">
                  <form action={acceptFindingAction.bind(null, finding.id)}>
                    <button className="button">{finding.proposedStage ? `Move to ${STAGE_LABELS[finding.proposedStage]}` : "Add to timeline"}</button>
                  </form>
                  <form action={ignoreFindingAction.bind(null, finding.id)}><button className="button button-quiet">Ignore</button></form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="section" aria-labelledby="recent-heading">
          <h2 id="recent-heading">Earlier</h2>
          <div className="ledger">
            {recent.map((finding) => (
              <div className="row" key={finding.id}>
                <div className="row-margin">
                  <span className="mark mark-ended">{STATUS_LABELS[finding.status]}</span>
                  <span className="row-when">{formatDay(finding.emailAt)}</span>
                </div>
                <div className="row-main">
                  <Link className="row-title" href={`/applications/${finding.applicationId}`}>{finding.title} at {finding.company}</Link>
                  <p className="row-note">{KIND_LABELS[finding.kind]}: {finding.subject}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
