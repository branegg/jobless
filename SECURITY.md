# Security

Joblesss holds your career record and works in your browser and email, so please read this before you use it.

## What to know before using it

- **Agents read untrusted text.** Job pages and emails can contain instructions aimed at an AI. Agents are told to treat them as data, but that instruction can fail.
- **`apply` works in your logged-in Chrome.** It's told never to press Submit, and it has no script tool, but its clicks can't be technically limited. Watch it while it works, and don't leave it running on its own.
- **The email check reads your Gmail.** Its session is limited to search and read tools, and it stops if it finds any other tool.
- **Agent permissions depend on Claude Code.** `src/lib/agents/profiles.ts` sets the limits, and `scripts/verify-agent-limits.ts` tests them with real agent runs. Re-run it after you update Claude Code.
- **The dashboard has no login.** It binds to 127.0.0.1 and refuses requests that name any other host or come from another site. Don't expose it to a network.
- **Your data isn't encrypted.** `vault/` and `data/` are plain files on your disk, and API keys are in `data/.env.boards`. Both folders are ignored by git, and neither is backed up.

## Reporting a problem

Please report vulnerabilities privately through GitHub's "Report a vulnerability" button on the Security tab, not in a public issue. Include the steps to reproduce it. Never include real CVs, emails or vault contents.
