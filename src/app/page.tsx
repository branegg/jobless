import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { markReplyRead, sentAnswer } from "@/app/email/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { dueLabel } from "@/components/application-row";
import { JobRow } from "@/components/job-row";
import { getDb } from "@/db";
import { agentRuns } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { formatClock } from "@/lib/format";
import { gmailSearchUrl, KIND_LABELS, lastCheckedAt } from "@/lib/inbox/inbox";
import { jobsToReview } from "@/lib/jobs/store";
import { readWatchlist } from "@/lib/jobs/watchlist";
import { agentActivity, runningNow, searchOverview, writeBriefing, type ActivityTag, type BriefingPart } from "@/lib/overview";
import { readContact } from "@/lib/vault/contact";
import { KIND_LABELS as RECORD_LABELS, KINDS, readPreferences, readVault, type Entry } from "@/lib/vault/entries";

const BEST_SCORE = 60;
const BEST_SHOWN = 5;
const ROWS_PER_GROUP = 5;
const REFRESH_WHILE_RUNNING_MS = 30_000;
const REFRESH_WHEN_QUIET_MS = 60_000;

const TAG_LABELS: Record<ActivityTag, string> = { running: "Running", reply: "Reply", done: "Done", failed: "Failed", blocked: "Blocked" };

function Briefing({ parts }: { parts: BriefingPart[] }) {
  return (
    <h1 className="brief">
      {parts.map((part, index) =>
        part.href ? (
          <Link key={index} href={part.href} className={part.attention ? "brief-link brief-link-attention" : "brief-link"}>{part.text}</Link>
        ) : (
          part.text
        ),
      )}
    </h1>
  );
}

function Stat({ value, label, href, attention = false, startsGroup = false }: { value: number; label: string; href: string; attention?: boolean; startsGroup?: boolean }) {
  const tone = `${value === 0 ? " stat-zero" : attention ? " stat-attention" : ""}${startsGroup ? " stat-group" : ""}`;
  if (value === 0) {
    return (
      <div className={`stat${tone}`}>
        <strong>0</strong>
        <span>{label}</span>
      </div>
    );
  }
  return (
    <Link className={`stat${tone}`} href={href}>
      <strong>{value.toLocaleString("en-GB")}</strong>
      <span>{label}</span>
    </Link>
  );
}

function Group({ id, title, count, more, good = false, children }: { id: string; title: string; count?: number; more?: { href: string; text: string }; good?: boolean; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className={good ? "group-head group-head-good" : "group-head"}>{title}{count !== undefined && `: ${count}`}</h3>
      {children}
      {more && <p className="group-more"><Link href={more.href}>{more.text}</Link></p>}
    </section>
  );
}

function Need({ title, href, note, side, children }: { title: string; href: string; note?: ReactNode; side?: ReactNode; children?: ReactNode }) {
  return (
    <div className="need">
      <div className="need-main">
        <Link className="need-title" href={href}>{title}</Link>
        {note && <p className="need-note">{note}</p>}
        {children}
      </div>
      {side && <span className="need-side">{side}</span>}
    </div>
  );
}

export default async function OverviewPage() {
  await connection();
  const db = getDb();
  const now = new Date();
  const { entries } = readVault();
  const reviewable = jobsToReview(db, readWatchlist().search).jobs;
  const overview = searchOverview(db, reviewable.length, now);
  const { counts, due, toAsk, emails, possibleReplies, replies, repliesHref } = overview;
  const running = runningNow(db, now);
  const activity = agentActivity(db, now);
  const bestJobs = reviewable.filter((job) => (job.score ?? 0) >= BEST_SCORE).slice(0, BEST_SHOWN);
  const drafts = entries.filter((entry) => entry.status === "draft").length;
  const firstRun = entries.length === 0;
  const noPreferences = !firstRun && drafts === 0 && readPreferences() === undefined;
  const contactMissing = !firstRun && !readContact()?.confirmed;
  const emailsAsReplies = emails.filter((email) => possibleReplies.includes(email.company)).length;
  const setupItems = (drafts > 0 ? 1 : 0) + (noPreferences ? 1 : 0) + (contactMissing ? 1 : 0);
  const others = emails.length - emailsAsReplies + due.length + toAsk.length + setupItems;
  const total = replies.length + emails.length + due.length + toAsk.length + setupItems + (firstRun ? 1 : 0);
  const lastJobCheck = db.select({ at: agentRuns.startedAt }).from(agentRuns).where(and(eq(agentRuns.agent, "fetch-jobs"), eq(agentRuns.status, "ok"))).orderBy(desc(agentRuns.startedAt)).get()?.at;
  const lastEmailCheck = lastCheckedAt(db);
  const count = (kind: Entry["kind"], status: Entry["status"]) => entries.filter((entry) => entry.kind === kind && entry.status === status).length;

  return (
    <>
      <AutoRefresh everyMs={running.length > 0 ? REFRESH_WHILE_RUNNING_MS : REFRESH_WHEN_QUIET_MS} />
      <div className="overview-top">
      <header className="briefing">
        {firstRun ? <h1 className="brief">Start by building your profile.</h1> : <Briefing parts={writeBriefing(counts, possibleReplies, others, replies.map((reply) => ({ company: reply.company, applicationId: reply.applicationId })), repliesHref)} />}
        <p className="status-line">
          <span className={running.length > 0 ? "live-dot live-dot-on" : "live-dot"} aria-hidden="true" />
          <span>
            {running.length > 0 ? `${running[0].text} now, started ${formatClock(running[0].startedAt, now)}.` : "Nothing is running."}
            {lastJobCheck && ` Jobs checked ${formatClock(lastJobCheck, now)}.`}
            {lastEmailCheck && ` Email checked ${formatClock(lastEmailCheck, now)}.`}
          </span>
        </p>
      </header>

      <div className="stats">
        <Stat value={counts.toLookAt} label="jobs to look at" href="/jobs" />
        <Stat value={counts.stillToSend} label="still to send" href="/applications#stage-packet_ready" startsGroup />
        <Stat value={counts.sent} label="sent" href="/applications#stage-submitted" />
        <Stat value={counts.replies} label={counts.replies === 1 ? "reply" : "replies"} href={replies.length > 0 ? "#replies-heading" : repliesHref} startsGroup />
        <Stat value={counts.interviews} label={counts.interviews === 1 ? "interview" : "interviews"} href="/applications#stage-interview" />
        <Stat value={counts.offers} label={counts.offers === 1 ? "offer" : "offers"} href="/applications#stage-offer" />
      </div>

      <div className="panes">
        <section className="sheet" id="needs-you" aria-labelledby="needs-heading">
          <h2 id="needs-heading" className="sheet-head">Needs you <small>{total === 1 ? "1 thing" : `${total} things`}</small></h2>
          {total === 0 && <p className="empty">Nothing needs you right now. New jobs and replies will show up here.</p>}

          {firstRun && (
            <Group id="setup-heading" title="Get started">
              <Need title="Build your profile" href="/wiki" note="This reads your CVs and projects and writes draft entries about your career. Nothing counts until you confirm it. Run this in your terminal, in this project's folder:">
                <code className="command">pnpm agent profile-import</code>
              </Need>
            </Group>
          )}

          {replies.length > 0 && (
            <Group id="replies-heading" title={replies.length === 1 ? "A company wrote back" : "Companies wrote back"} count={replies.length > 1 ? replies.length : undefined} good>
              {replies.map((reply) => (
                <Need key={reply.id} title={`${reply.title} at ${reply.company}`} href={`/applications/${reply.applicationId}`} side={formatClock(reply.emailAt, now)} note={`${KIND_LABELS[reply.kind]}, from ${reply.fromAddress.split("<")[0].trim() || reply.fromAddress}`}>
                  <p className="reply-quote">&ldquo;{reply.quote || reply.subject}&rdquo;</p>
                  <div className="actions row-actions">
                    <a className="button button-primary" href={gmailSearchUrl(reply.fromAddress, reply.subject)} target="_blank" rel="noreferrer">Open in Gmail</a>
                    <form action={markReplyRead.bind(null, reply.id)}><button className="button button-quiet">I&rsquo;ve dealt with this</button></form>
                  </div>
                </Need>
              ))}
            </Group>
          )}

          {emails.length > 0 && (
            <Group id="email-heading" title="Emails waiting for your OK" count={emails.length}>
              {emails.map((email) => (
                <Need key={email.id} title={email.company} href="/email" side={formatClock(email.emailAt, now)} note={<>{email.suspicious ? "Looks suspicious, check it carefully" : KIND_LABELS[email.kind]}: &ldquo;{email.quote || email.subject}&rdquo;</>} />
              ))}
            </Group>
          )}

          {toAsk.length > 0 && (
            <Group id="ask-heading" title="Did you send these?">
              {toAsk.map((application) => (
                <Need key={application.id} title={`${application.title} at ${application.company}`} href={`/applications/${application.id}`} side="No email found">
                  <div className="actions row-actions">
                    <form action={sentAnswer.bind(null, application.id, true)}><button className="button">Yes, I sent it</button></form>
                    <form action={sentAnswer.bind(null, application.id, false)}><button className="button button-quiet">Not yet</button></form>
                  </div>
                </Need>
              ))}
            </Group>
          )}

          {due.length > 0 && (
            <Group id="due-heading" title="Due now" count={due.length} more={due.length > ROWS_PER_GROUP ? { href: "/applications", text: `See all ${due.length}` } : undefined}>
              {due.slice(0, ROWS_PER_GROUP).map((application) => {
                const label = application.nextActionAt ? dueLabel(application.nextActionAt, now) : undefined;
                return <Need key={application.id} title={`${application.title} at ${application.company}`} href={`/applications/${application.id}`} side={label && <span className={label.late ? "due-late" : undefined}>{label.text}</span>} note={application.nextAction} />;
              })}
            </Group>
          )}

          {setupItems > 0 && (
            <Group id="record-need-heading" title="Your record">
              {drafts > 0 && <Need title={drafts === 1 ? "1 draft to review" : `${drafts} drafts to review`} href="/review" note="Only entries you confirm can ever appear in an application." />}
              {noPreferences && (
                <Need title="Tell Joblesss what you're looking for" href="/wiki" note="A five-minute interview about roles, location, pay and dealbreakers. Job scoring uses your answers. Run this in your terminal:">
                  <code className="command">pnpm agent setup</code>
                </Need>
              )}
              {contactMissing && <Need title="Check your contact details" href="/contact" note="CVs can't be built until you've saved them." />}
            </Group>
          )}
        </section>

        <section className="sheet sheet-agents" aria-labelledby="agents-heading">
          <h2 id="agents-heading" className="sheet-head">What the agents did</h2>
          {activity.length === 0 ? (
            <p className="empty">No agents have run yet.</p>
          ) : (
            <ul className="feed">
              {activity.map((item) => (
                <li key={item.key}>
                  <time dateTime={item.at.toISOString()}>{formatClock(item.at, now)}</time>
                  <span className={`mark mark-${item.tag}`}>{TAG_LABELS[item.tag]}</span>
                  {item.href ? <Link href={item.href} title={item.text}>{item.text}</Link> : <span title={item.text}>{item.text}</span>}
                </li>
              ))}
            </ul>
          )}
          <p className="group-more"><Link href="/runs">All agent activity</Link></p>
        </section>
      </div>
      </div>

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
                  <td><Link href={`/wiki?kind=${kind}`}>{RECORD_LABELS[kind]}</Link></td>
                  <td className="num">{count(kind, "confirmed")}</td>
                  <td className="num">{count(kind, "draft")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
