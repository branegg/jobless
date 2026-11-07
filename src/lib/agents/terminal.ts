import { execFile } from "node:child_process";

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function appleScriptString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function terminalScript(folder: string, command: string): string {
  const line = `cd ${shellQuote(folder)} && ${command}`;
  return `tell application "Terminal"\nactivate\ndo script ${appleScriptString(line)}\nend tell`;
}

export function openInTerminal(folder: string, command: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const binary = process.env.JOBLESSS_OSASCRIPT_BIN ?? "osascript";
  return new Promise((resolve) => {
    execFile(binary, ["-e", terminalScript(folder, command)], { timeout: 30_000 }, (error, _stdout, stderr) => {
      resolve(error ? { ok: false, reason: stderr.trim() || error.message } : { ok: true });
    });
  });
}
