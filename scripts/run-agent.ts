import { execFileSync } from "node:child_process";
import { getDb } from "../src/db";
import { launchInteractive, runAgent } from "../src/lib/agents/run";
import { applyPrompt, buildPacket } from "../src/lib/packets/build";
import { recordFormStarted } from "../src/lib/tracker";
import { PROFILES, type AgentName } from "../src/lib/agents/profiles";
import { enforceImportRules, ensureVault, snapshotVault } from "../src/lib/vault/entries";
import { commitVault } from "../src/lib/vault/git";

const WRITES_VAULT: AgentName[] = ["setup", "remember", "voice", "profile-import"];

async function main() {
  const [name, ...rest] = process.argv.slice(2);
  if (!name || !(name in PROFILES)) {
    console.error(`usage: pnpm agent <${Object.keys(PROFILES).join("|")}> [prompt]`);
    process.exit(2);
  }
  const agent = name as AgentName;
  const prompt = rest.join(" ");
  ensureVault();

  if (agent === "apply" || agent === "tailor") {
    const applicationId = Number(rest[0]);
    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      console.error(`usage: pnpm agent ${agent} <application number, from its address in the dashboard>`);
      process.exit(2);
    }
    if (agent === "tailor") {
      const result = await buildPacket(getDb(), applicationId);
      console.log(result.ok ? `Packet built. ${result.packet.removed.length} unsupported claims removed.` : result.error);
      process.exit(result.ok ? 0 : 1);
    }
    const request = applyPrompt(getDb(), applicationId);
    if (!request) {
      console.error("That application needs a job link and a built packet first.");
      process.exit(1);
    }
    recordFormStarted(getDb(), applicationId);
    process.exit(await launchInteractive(agent, request));
  }

  if (PROFILES[agent].interactive) {
    const code = await launchInteractive(agent, prompt || undefined);
    if (WRITES_VAULT.includes(agent)) commitVault(`${agent}: update vault`);
    process.exit(code);
  }

  if (agent === "profile-import") {
    execFileSync("pnpm", ["-s", "tsx", "scripts/collect-sources.ts"], { stdio: "inherit" });
    commitVault("chore: vault before import");
    const before = snapshotVault();
    const outcome = await runAgent(agent, { prompt: prompt || "Run the profile import." });
    const report = enforceImportRules(before);
    commitVault("profile-import: add draft entries");
    console.log(JSON.stringify({ ...outcome, report }, null, 2));
    process.exit(outcome.status === "ok" ? 0 : 1);
  }

  const outcome = await runAgent(agent, { prompt: prompt || `Run the ${agent} job.` });
  console.log(JSON.stringify(outcome, null, 2));
  process.exit(outcome.status === "ok" ? 0 : 1);
}

main();
