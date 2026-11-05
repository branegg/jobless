export function linkCitations(text: string): string {
  return text.replace(/`?\b(facts|projects|stories|answers)\/([a-z0-9][a-z0-9-]*)\b`?/g, (_match, kind: string, slug: string) => `[${kind}/${slug}](/wiki/${kind}/${slug})`);
}
