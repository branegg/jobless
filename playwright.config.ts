import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";

const stamp = process.env.JOBLESS_E2E_DIR ?? path.join(os.tmpdir(), `jobless-e2e-${Date.now()}`);
process.env.JOBLESS_E2E_DIR = stamp;

export default defineConfig({
  testDir: "./tests",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3100" },
  webServer: {
    command: "pnpm exec next dev -H 127.0.0.1 -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: { JOBLESS_VAULT: path.join(stamp, "vault"), JOBLESS_DB: path.join(stamp, "test.db"), JOBLESS_CLAUDE_BIN: path.resolve("tests/fake-claude.sh"), JOBLESS_OSASCRIPT_BIN: path.resolve("tests/fake-osascript.sh"), JOBLESS_E2E_DIR: stamp },
  },
});
