import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ensureVault, vaultDir } from "./entries";

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: vaultDir(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

export function commitVault(message: string): boolean {
  ensureVault();
  if (!fs.existsSync(path.join(vaultDir(), ".git"))) git(["init", "-q"]);
  git(["add", "-A"]);
  if (git(["status", "--porcelain"]).trim() === "") return false;
  git(["commit", "-q", "-m", message]);
  return true;
}
