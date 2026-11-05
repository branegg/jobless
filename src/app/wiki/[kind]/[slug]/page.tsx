import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { saveEntry } from "@/app/actions";
import { EntryActions } from "@/components/entry-actions";
import { Markdown } from "@/components/markdown";
import { StatusMark, VisibilityMark } from "@/components/marks";
import { getEntry, isKind, KIND_LABELS } from "@/lib/vault/entries";

const SLUG = /^[a-z0-9][a-z0-9-]*$/;

export default async function EntryPage({ params }: PageProps<"/wiki/[kind]/[slug]">) {
  await connection();
  const { kind, slug } = await params;
  if (!isKind(kind) || !SLUG.test(slug)) notFound();
  const entry = getEntry(kind, slug);
  if (!entry) notFound();
  const save = saveEntry.bind(null, kind, slug);

  return (
    <article>
      <p className="row-note" style={{ marginBottom: "0.75rem" }}><Link href={`/wiki?kind=${kind}`}>{KIND_LABELS[kind]}</Link></p>
      <header className="page-head">
        <h1>{entry.title}</h1>
        <div className="actions" style={{ marginTop: "0.75rem" }}>
          <StatusMark status={entry.status} />
          <VisibilityMark visibility={entry.visibility} />
        </div>
      </header>

      <Markdown>{entry.body || "No details yet."}</Markdown>
      {entry.reviewNote && <p className="review-note" style={{ marginTop: "1rem" }}><strong>Check this:</strong> {entry.reviewNote}</p>}

      {entry.screenshots.length > 0 && (
        <div style={{ display: "grid", gap: "1rem", marginTop: "1.5rem" }}>
          {entry.screenshots.map((shot) => (
            <Image key={shot} src={`/vault-asset/${shot.split("/").map(encodeURIComponent).join("/")}`} alt={`Screenshot of ${entry.title}`} width={1280} height={800} unoptimized style={{ width: "100%", height: "auto", border: "1px solid var(--rule)", borderRadius: 4 }} />
          ))}
        </div>
      )}

      <dl className="meta-list section">
        <dt>Source</dt><dd>{entry.source}</dd>
        {entry.date && (<><dt>Date</dt><dd>{entry.date}</dd></>)}
        {entry.tags.length > 0 && (<><dt>Tags</dt><dd>{entry.tags.join(", ")}</dd></>)}
        {entry.links.length > 0 && (<><dt>Links</dt><dd>{entry.links.map((link) => <div key={link.url}><a href={link.url} target="_blank" rel="noreferrer">{link.label}</a></div>)}</dd></>)}
        <dt>In applications</dt>
        <dd>{entry.status === "confirmed" && entry.visibility === "public" ? "Can be used" : entry.visibility === "private" ? "Never used, because it's private" : "Not used until you confirm it"}</dd>
      </dl>

      <div className="section"><EntryActions kind={kind} slug={slug} status={entry.status} visibility={entry.visibility} /></div>

      <details className="disclosure section">
        <summary>Edit this entry</summary>
        <div>
          <form action={save}>
            <label className="field"><span>Title</span><input name="title" className="input" defaultValue={entry.title} required /></label>
            <label className="field"><span>Details, in Markdown</span><textarea name="body" className="input" defaultValue={entry.body} /></label>
            <label className="field"><span>Date</span><input name="date" className="input" defaultValue={entry.date} placeholder="2024-06" /></label>
            <label className="field"><span>Tags, separated by commas</span><input name="tags" className="input" defaultValue={entry.tags.join(", ")} /></label>
            <button className="button button-primary">Save changes</button>
          </form>
        </div>
      </details>
    </article>
  );
}
