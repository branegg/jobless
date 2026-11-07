import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

import { KIND_LABELS, type Kind } from "./labels";

export { KIND_LABELS, type Kind };
export const KINDS = ["facts", "projects", "stories", "answers"] as const satisfies readonly Kind[];

const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const httpUrl = z.string().regex(/^https?:\/\/\S+$/i);

const dateField = z.preprocess((value) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") return String(value);
  return value === null ? undefined : value;
}, z.string().optional());

export const frontmatterSchema = z.object({
  title: z.string().min(1),
  status: z.enum(["draft", "confirmed", "rejected"]).default("draft"),
  visibility: z.enum(["public", "private"]).default("private"),
  source: z.string().default("unknown"),
  tags: z.array(z.string()).default([]),
  date: dateField,
  links: z.array(z.object({ label: z.string(), url: httpUrl })).default([]),
  screenshots: z.array(z.string()).default([]),
  reviewNote: z.string().optional(),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;
export type Entry = Frontmatter & { kind: Kind; slug: string; body: string; updatedAt: Date };
export type VaultProblem = { file: string; reason: string };

export function vaultDir(): string {
  return process.env.JOBLESSS_VAULT ?? path.join(process.cwd(), "vault");
}

export function isKind(value: string): value is Kind {
  return (KINDS as readonly string[]).includes(value);
}

export function entryPath(kind: Kind, slug: string): string {
  if (!isKind(kind) || !SLUG.test(slug)) throw new Error(`Invalid entry reference: ${kind}/${slug}`);
  return path.join(vaultDir(), kind, `${slug}.md`);
}

export function ensureVault(): void {
  for (const kind of KINDS) fs.mkdirSync(path.join(vaultDir(), kind), { recursive: true });
  fs.mkdirSync(path.join(vaultDir(), "assets"), { recursive: true });
}

function parseEntry(kind: Kind, slug: string, raw: string, updatedAt: Date): Entry {
  const parsed = matter(raw, {});
  const data = frontmatterSchema.parse(parsed.data);
  return { ...data, kind, slug, body: parsed.content.trim(), updatedAt };
}

export function readVault(): { entries: Entry[]; problems: VaultProblem[] } {
  const entries: Entry[] = [];
  const problems: VaultProblem[] = [];
  for (const kind of KINDS) {
    const dir = path.join(vaultDir(), kind);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".md")) continue;
      const slug = file.slice(0, -3);
      const full = path.join(dir, file);
      if (!SLUG.test(slug)) {
        problems.push({ file: `${kind}/${file}`, reason: "File name must use lowercase letters, numbers and dashes." });
        continue;
      }
      try {
        entries.push(parseEntry(kind, slug, fs.readFileSync(full, "utf8"), fs.statSync(full).mtime));
      } catch (error) {
        const reason = error instanceof z.ZodError ? error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") : String(error);
        problems.push({ file: `${kind}/${file}`, reason });
      }
    }
  }
  return { entries, problems };
}

export function getEntry(kind: Kind, slug: string): Entry | undefined {
  const file = entryPath(kind, slug);
  if (!fs.existsSync(file)) return undefined;
  return parseEntry(kind, slug, fs.readFileSync(file, "utf8"), fs.statSync(file).mtime);
}

function serialize(data: Frontmatter, body: string): string {
  const clean = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
  return matter.stringify(`\n${body.trim()}\n`, clean);
}

function atomicWrite(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomBytes(4).toString("hex")}.tmp`;
  fs.writeFileSync(temp, content);
  fs.renameSync(temp, file);
}

export function writeEntry(kind: Kind, slug: string, data: Frontmatter, body: string): void {
  atomicWrite(entryPath(kind, slug), serialize(frontmatterSchema.parse(data), body));
}

export function updateEntry(kind: Kind, slug: string, changes: Partial<Frontmatter> & { body?: string }): Entry {
  const current = getEntry(kind, slug);
  if (!current) throw new Error(`No entry at ${kind}/${slug}`);
  const { body = current.body, ...fields } = changes;
  writeEntry(kind, slug, { ...current, ...fields }, body);
  return getEntry(kind, slug)!;
}

export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "entry";
}

export function uniqueSlug(kind: Kind, title: string): string {
  const base = slugify(title);
  let slug = base;
  let counter = 2;
  while (fs.existsSync(entryPath(kind, slug))) slug = `${base}-${counter++}`;
  return slug;
}

export function usableInApplications(entries: Entry[]): Entry[] {
  return entries.filter((entry) => entry.status === "confirmed" && entry.visibility === "public");
}

export function preferencesPath(): string {
  return path.join(vaultDir(), "preferences.md");
}

export function readPreferences(): string | undefined {
  const file = preferencesPath();
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined;
}

function walkMarkdown(dir: string, found: string[] = []): string[] {
  if (!fs.existsSync(dir)) return found;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.name === ".git") continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walkMarkdown(full, found);
    else if (item.name.endsWith(".md") || item.name === "contact.yaml") found.push(full);
  }
  return found;
}

export type VaultSnapshot = Map<string, string>;

export function snapshotVault(): VaultSnapshot {
  return new Map(walkMarkdown(vaultDir()).map((file) => [file, fs.readFileSync(file, "utf8")]));
}

export type ImportReport = { added: string[]; restored: string[]; forcedToDraft: string[]; removed: string[] };

export function enforceImportRules(before: VaultSnapshot): ImportReport {
  const report: ImportReport = { added: [], restored: [], forcedToDraft: [], removed: [] };
  const root = vaultDir();
  for (const [file, raw] of before) {
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== raw) {
      atomicWrite(file, raw);
      report.restored.push(path.relative(root, file));
    }
  }
  for (const file of walkMarkdown(root)) {
    if (before.has(file)) continue;
    const relative = path.relative(root, file);
    const [folder, name, ...rest] = relative.split(path.sep);
    if (!isKind(folder) || !name || rest.length > 0) {
      fs.rmSync(file);
      report.removed.push(relative);
      continue;
    }
    report.added.push(relative);
    try {
      const parsed = matter(fs.readFileSync(file, "utf8"), {});
      const data = frontmatterSchema.parse(parsed.data);
      if (data.status !== "draft") {
        atomicWrite(file, serialize({ ...data, status: "draft" }, parsed.content));
        report.forcedToDraft.push(relative);
      }
    } catch {
      continue;
    }
  }
  return report;
}
