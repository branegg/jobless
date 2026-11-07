import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";

const absoluteFolders = z.array(z.string().refine((folder) => path.isAbsolute(folder), "must start with / or ~/")).default([]);

const schema = z.object({
  cvFolders: absoluteFolders,
  cvNames: z.array(z.string().min(1).refine((name) => !/[*?[\]{}!/\\]|\.\./.test(name), "must be plain text, with no * ? [ ] { } ! / \\ or ..")).default([]),
  projectFolders: absoluteFolders,
  exclude: z.array(z.string().min(1)).default([]),
});

export type Sources = z.infer<typeof schema>;

function expandHome(folder: string, home: string): string {
  return folder === "~" || folder.startsWith("~/") ? path.join(home, folder.slice(1)) : folder;
}

export function parseSources(text: string, home: string = os.homedir()): Sources {
  const raw = (parse(text) ?? {}) as Record<string, unknown>;
  const expanded = (value: unknown) => (Array.isArray(value) ? value.map((folder) => (typeof folder === "string" ? expandHome(folder, home) : folder)) : value);
  return schema.parse({ ...raw, cvFolders: expanded(raw.cvFolders), projectFolders: expanded(raw.projectFolders) });
}

export function readSources(): Sources {
  const file = process.env.JOBLESSS_SOURCES ?? path.join(process.cwd(), "sources.yaml");
  return parseSources(fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "");
}

const CV_EXTENSIONS = ["pdf", "md", "txt"];

export function isCvName(name: string, sources: Pick<Sources, "cvNames">): boolean {
  return sources.cvNames.length === 0 || sources.cvNames.some((part) => name.includes(part));
}

export function sourceRules(sources: Sources): { allow: string[]; deny: string[] } {
  const folders = [...sources.cvFolders, ...sources.projectFolders];
  const cvRules = sources.cvNames.length === 0 ? sources.cvFolders.map((folder) => `Read(/${folder}/**)`) : sources.cvFolders.flatMap((folder) => sources.cvNames.flatMap((name) => CV_EXTENSIONS.map((extension) => `Read(/${folder}/*${name}*.${extension})`)));
  return {
    allow: [...cvRules, ...sources.projectFolders.map((folder) => `Read(/${folder}/**)`)],
    deny: sources.exclude.flatMap((name) => folders.map((folder) => `Read(/${folder}/**/*${name}*)`)),
  };
}
