import fs from "node:fs";
import path from "node:path";

export type Settings = { inboxAutoApply: boolean };

function settingsPath(): string {
  const database = process.env.JOBLESS_DB ?? path.join(process.cwd(), "data", "jobless.db");
  return path.join(path.dirname(database), "settings.json");
}

export function readSettings(): Settings {
  const file = settingsPath();
  const saved = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Partial<Settings>) : {};
  return { inboxAutoApply: saved.inboxAutoApply === true };
}

export function writeSettings(settings: Settings): void {
  const file = settingsPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(settings, null, 2));
}
