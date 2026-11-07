import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";

const absoluteFolders = z.array(z.string().refine((folder) => path.isAbsolute(folder), "must start with / or ~/")).default([]);

const schema = z.object({
  cvFolders: absoluteFolders,
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

export function sourceRules(sources: Sources): { allow: string[]; deny: string[] } {
  const folders = [...sources.cvFolders, ...sources.projectFolders];
  return {
    allow: folders.map((folder) => `Read(/${folder}/**)`),
    deny: sources.exclude.flatMap((name) => folders.map((folder) => `Read(/${folder}/**/*${name}*)`)),
  };
}
