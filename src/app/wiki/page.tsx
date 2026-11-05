import Link from "next/link";
import { connection } from "next/server";
import { AddEntry } from "@/components/add-entry";
import { AskBox } from "@/components/ask-box";
import { Markdown } from "@/components/markdown";
import { StatusMark, VisibilityMark } from "@/components/marks";
import { getConnection } from "@/db";
import { isKind, KIND_LABELS, KINDS, readPreferences, readVault, type Entry } from "@/lib/vault/entries";
import { searchVault, splitSnippet } from "@/lib/vault/search";

export const metadata = { title: "My profile" };

function EntryRow({ entry }: { entry: Entry }) {
  return (
    <div className="row">
      <div className="row-margin">
        <StatusMark status={entry.status} />
        {entry.visibility === "private" && <VisibilityMark visibility="private" />}
      </div>
      <div className="row-main">
        <Link className="row-title" href={`/wiki/${entry.kind}/${entry.slug}`}>{entry.title}</Link>
        {(entry.date || entry.tags.length > 0) && <p className="row-note">{[entry.date, entry.tags.join(", ")].filter(Boolean).join(". ")}</p>}
      </div>
    </div>
  );
}

export default async function WikiPage({ searchParams }: PageProps<"/wiki">) {
  await connection();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const kindParam = typeof params.kind === "string" && isKind(params.kind) ? params.kind : undefined;
  const { entries } = readVault();
  const live = entries.filter((entry) => entry.status !== "rejected");
  const preferences = readPreferences();
  const hits = query ? searchVault(getConnection().sqlite, entries, query) : [];
  const shownKinds = kindParam ? [kindParam] : KINDS;

  return (
    <>
      <header className="page-head">
        <h1>My profile</h1>
        <p className="lede">Everything about your working life, kept in one place so you never have to reconstruct it.</p>
      </header>

      <section aria-labelledby="ask-heading">
        <h2 id="ask-heading" style={{ marginBottom: "0.6rem" }}>Ask about your career</h2>
        <AskBox />
      </section>

      <section className="section" aria-labelledby="browse-heading">
        <h2 id="browse-heading" style={{ marginBottom: "0.6rem" }}>Browse and search</h2>
        <form className="inline-form" action="/wiki" role="search">
          <label className="sr-only" htmlFor="q">Search your profile</label>
          <input id="q" name="q" type="search" className="input" defaultValue={query} placeholder="Search for a skill, company or project" />
          <button className="button">Search</button>
        </form>

        {query ? (
          <div style={{ marginTop: "1.25rem" }}>
            <p className="lede" style={{ marginBottom: "0.75rem" }}>
              {hits.length === 0 ? `Nothing matches “${query}”.` : `${hits.length} ${hits.length === 1 ? "match" : "matches"} for “${query}”.`} <Link href="/wiki">Clear search</Link>
            </p>
            {hits.length > 0 && (
              <div className="ledger">
                {hits.map((hit) => (
                  <div className="row" key={`${hit.kind}/${hit.slug}`}>
                    <div className="row-margin"><span className="row-note" style={{ margin: 0 }}>{KIND_LABELS[hit.kind]}</span></div>
                    <div className="row-main">
                      <Link className="row-title" href={`/wiki/${hit.kind}/${hit.slug}`}>{hit.title}</Link>
                      <p className="row-note">{splitSnippet(hit.snippet).map((part, index) => part.match ? <mark key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <nav className="filters" aria-label="Sections">
              <Link href="/wiki" aria-current={!kindParam ? "page" : undefined}>Everything</Link>
              {KINDS.map((kind) => <Link key={kind} href={`/wiki?kind=${kind}`} aria-current={kindParam === kind ? "page" : undefined}>{KIND_LABELS[kind]}</Link>)}
            </nav>
            {shownKinds.map((kind) => {
              const rows = live.filter((entry) => entry.kind === kind).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.title.localeCompare(b.title));
              if (rows.length === 0 && !kindParam) return null;
              return (
                <div key={kind} style={{ marginBottom: "1.75rem" }}>
                  <h3 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>{KIND_LABELS[kind]}</h3>
                  <div className="ledger">
                    {rows.length === 0 ? <p className="empty">Nothing here yet. Add the first one below.</p> : rows.map((entry) => <EntryRow key={entry.slug} entry={entry} />)}
                  </div>
                </div>
              );
            })}
            {live.length === 0 && !kindParam && <div className="ledger"><p className="empty">Your profile is empty. Run <code>pnpm agent profile-import</code> in your terminal, or add something below.</p></div>}
          </>
        )}
      </section>

      <section className="section" style={{ display: "grid", gap: "0.75rem" }} aria-label="Add and preferences">
        <AddEntry />
        {preferences && (
          <details className="disclosure">
            <summary>What I&apos;m looking for</summary>
            <div><Markdown>{preferences}</Markdown></div>
          </details>
        )}
      </section>
    </>
  );
}
