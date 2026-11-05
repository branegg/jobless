import fs from "node:fs";
import path from "node:path";

export type BoardKeys = { reedKey?: string; adzunaId?: string; adzunaKey?: string };

const NAMES: Record<keyof BoardKeys, string> = { reedKey: "REED_API_KEY", adzunaId: "ADZUNA_APP_ID", adzunaKey: "ADZUNA_APP_KEY" };

function keysPath(): string {
  const database = process.env.JOBLESS_DB ?? path.join(process.cwd(), "data", "jobless.db");
  return path.join(path.dirname(database), ".env.boards");
}

export function readBoardKeys(): BoardKeys {
  const file = keysPath();
  if (!fs.existsSync(file)) return {};
  const lines = new Map(fs.readFileSync(file, "utf8").split("\n").map((line) => { const at = line.indexOf("="); return [line.slice(0, at), line.slice(at + 1).trim()] as const; }));
  const keys: BoardKeys = {};
  for (const [field, name] of Object.entries(NAMES) as [keyof BoardKeys, string][]) {
    const value = lines.get(name);
    if (value) keys[field] = value;
  }
  return keys;
}

export function saveBoardKeys(changes: BoardKeys): void {
  const merged = { ...readBoardKeys(), ...changes };
  const file = keysPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const lines = (Object.entries(NAMES) as [keyof BoardKeys, string][]).filter(([field]) => merged[field]).map(([field, name]) => `${name}=${merged[field]}`);
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, `${lines.join("\n")}\n`, { mode: 0o600 });
  fs.renameSync(temp, file);
}
