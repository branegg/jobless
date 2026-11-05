import Link from "next/link";
import { connection } from "next/server";
import { Markdown } from "@/components/markdown";
import { ReviewRow } from "@/components/review-row";
import { KIND_LABELS, KINDS, readVault } from "@/lib/vault/entries";

export const metadata = { title: "Review drafts" };

export default async function ReviewPage() {
  await connection();
  const { entries, problems } = readVault();
  const drafts = entries
    .filter((entry) => entry.status === "draft")
    .sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || a.title.localeCompare(b.title));

  return (
    <>
      <header className="page-head">
        <h1>Review drafts</h1>
        <p className="lede">Agents write these from your files, so they can be wrong. Confirm what&apos;s true, edit what&apos;s close, and reject the rest. Public entries can go into applications once confirmed, and private ones never do.</p>
      </header>
      {problems.length > 0 && (
        <div className="notice" role="status">
          <strong>{problems.length === 1 ? "1 file can't be read." : `${problems.length} files can't be read.`}</strong> Fix these in <code>vault/</code>:
          <ul>{problems.map((problem) => <li key={problem.file}><code>{problem.file}</code>: {problem.reason}</li>)}</ul>
        </div>
      )}
      {drafts.length === 0 ? (
        <div className="ledger"><p className="empty">Nothing to review. See <Link href="/wiki">your profile</Link> or run <code>pnpm agent profile-import</code> to look for more.</p></div>
      ) : (
        <div className="ledger">
          {drafts.map((entry) => (
            <ReviewRow key={`${entry.kind}/${entry.slug}`} kind={entry.kind} slug={entry.slug} title={entry.title} kindLabel={KIND_LABELS[entry.kind]} source={entry.source} visibility={entry.visibility} reviewNote={entry.reviewNote}>
              <Markdown>{entry.body || "No details yet."}</Markdown>
            </ReviewRow>
          ))}
        </div>
      )}
    </>
  );
}
