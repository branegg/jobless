import { getDb } from "../src/db";
import { checkEmail } from "../src/lib/inbox/check";

async function main() {
  const summary = await checkEmail(getDb());
  console.log(JSON.stringify(summary, null, 2));
  process.exit(!summary.skipped && !summary.ok ? 1 : 0);
}

main();
