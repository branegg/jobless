import type Database from "better-sqlite3";
import type { Kind, Entry } from "./entries";

export type SearchHit = { kind: Kind; slug: string; title: string; snippet: string };

const OPEN = "\u0001";
const CLOSE = "\u0002";
const signatures = new WeakMap<Database.Database, string>();

function fold(text: string): string {
  return text.replace(/ł/g, "l").replace(/Ł/g, "L");
}

function signature(entries: Entry[]): string {
  return entries.map((entry) => `${entry.kind}/${entry.slug}:${entry.updatedAt.getTime()}:${entry.status}`).sort().join("|");
}

export function syncIndex(sqlite: Database.Database, entries: Entry[]): void {
  const live = entries.filter((entry) => entry.status !== "rejected");
  const next = signature(live);
  if (signatures.get(sqlite) === next) return;
  sqlite.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vault_fts USING fts5(kind UNINDEXED, slug UNINDEXED, title, tags, body, folded, tokenize = "unicode61 remove_diacritics 2")`);
  const insert = sqlite.prepare("INSERT INTO vault_fts (kind, slug, title, tags, body, folded) VALUES (?, ?, ?, ?, ?, ?)");
  sqlite.transaction(() => {
    sqlite.exec("DELETE FROM vault_fts");
    for (const entry of live) insert.run(entry.kind, entry.slug, entry.title, entry.tags.join(" "), entry.body, fold(`${entry.title} ${entry.tags.join(" ")} ${entry.body}`));
  })();
  signatures.set(sqlite, next);
}

export function toFtsQuery(input: string): string | undefined {
  const words = fold(input).match(/[\p{L}\p{N}]+/gu);
  if (!words) return undefined;
  return words.map((word) => `"${word}"*`).join(" ");
}

export function searchVault(sqlite: Database.Database, entries: Entry[], input: string, limit = 30): SearchHit[] {
  const query = toFtsQuery(input);
  if (!query) return [];
  syncIndex(sqlite, entries);
  return sqlite
    .prepare(
      `SELECT kind, slug, title, snippet(vault_fts, 4, ?, ?, ' … ', 24) AS snippet
       FROM vault_fts WHERE vault_fts MATCH ? ORDER BY bm25(vault_fts, 0, 0, 6, 3, 1, 1) LIMIT ?`,
    )
    .all(OPEN, CLOSE, query, limit) as SearchHit[];
}

export function splitSnippet(snippet: string): { text: string; match: boolean }[] {
  const parts: { text: string; match: boolean }[] = [];
  for (const piece of snippet.split(OPEN)) {
    const closeAt = piece.indexOf(CLOSE);
    if (closeAt === -1) {
      if (piece) parts.push({ text: piece, match: false });
    } else {
      parts.push({ text: piece.slice(0, closeAt), match: true });
      if (piece.slice(closeAt + 1)) parts.push({ text: piece.slice(closeAt + 1), match: false });
    }
  }
  return parts;
}
