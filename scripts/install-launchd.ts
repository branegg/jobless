import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type Job = { label: string; script: string[]; log: string; timing: string; summary: string };

const JOBS: Record<string, Job> = {
  daily: {
    label: "com.jobless.daily",
    script: ["scripts/jobs.ts", "daily"],
    log: "daily.log",
    timing: `<key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>8</integer>
    <key>Minute</key>
    <integer>30</integer>
  </dict>`,
    summary: "Jobs are checked and scored daily at 8:30, or when the Mac next wakes.",
  },
  inbox: {
    label: "com.jobless.inbox",
    script: ["scripts/inbox.ts"],
    log: "inbox.log",
    timing: `<key>StartInterval</key>
  <integer>14400</integer>`,
    summary: "Your email is checked every 4 hours while the Mac is awake.",
  },
};

const root = process.cwd();
const plistPath = (job: Job) => path.join(os.homedir(), "Library", "LaunchAgents", `${job.label}.plist`);
const domain = `gui/${process.getuid!()}`;

function which(tool: string): string {
  return execFileSync("zsh", ["-lc", `command -v ${tool}`], { encoding: "utf8" }).trim();
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function plist(job: Job): string {
  const node = process.execPath;
  const searchPath = [...new Set([path.dirname(node), path.dirname(which("claude")), "/usr/local/bin", "/usr/bin", "/bin"])].join(":");
  const log = path.join(root, "data", "logs", job.log);
  const strings = (items: string[]) => items.map((item) => `    <string>${escapeXml(item)}</string>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${job.label}</string>
  <key>ProgramArguments</key>
  <array>
${strings([node, path.join(root, "node_modules", "tsx", "dist", "cli.mjs"), ...job.script.map((part, index) => (index === 0 ? path.join(root, part) : part))])}
  </array>
  <key>WorkingDirectory</key>
  <string>${escapeXml(root)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${escapeXml(searchPath)}</string>
  </dict>
  ${job.timing}
  <key>StandardOutPath</key>
  <string>${escapeXml(log)}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(log)}</string>
</dict>
</plist>
`;
}

function launchctl(args: string[], quiet = false) {
  try {
    return execFileSync("launchctl", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    if (!quiet) throw error;
    return "";
  }
}

function install() {
  fs.mkdirSync(path.join(root, "data", "logs"), { recursive: true });
  for (const job of Object.values(JOBS)) {
    fs.mkdirSync(path.dirname(plistPath(job)), { recursive: true });
    launchctl(["bootout", `${domain}/${job.label}`], true);
    fs.writeFileSync(plistPath(job), plist(job));
    launchctl(["bootstrap", domain, plistPath(job)]);
    console.log(`Installed. ${job.summary}`);
  }
}

function uninstall() {
  for (const job of Object.values(JOBS)) {
    launchctl(["bootout", `${domain}/${job.label}`], true);
    fs.rmSync(plistPath(job), { force: true });
  }
  console.log("Removed the daily job check and the email check.");
}

function status() {
  for (const [name, job] of Object.entries(JOBS)) {
    const output = launchctl(["print", `${domain}/${job.label}`], true);
    console.log(`${name}: ${output ? output.split("\n").filter((line) => /^\s*(state =|runs =|last exit code)/.test(line)).map((line) => line.trim()).slice(0, 3).join(", ") : "not installed"}`);
  }
}

function run() {
  const job = JOBS[process.argv[3] ?? ""];
  if (!job) {
    console.error(`usage: pnpm schedule run <${Object.keys(JOBS).join("|")}>`);
    process.exit(2);
  }
  launchctl(["kickstart", `${domain}/${job.label}`]);
}

const actions: Record<string, () => void> = { install, uninstall, status, run };
const action = actions[process.argv[2] ?? ""];
if (!action) {
  console.error("usage: pnpm schedule install | uninstall | status | run <daily|inbox>");
  process.exit(2);
}
action();
