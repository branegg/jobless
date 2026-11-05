# Contributing

Bug reports and small fixes are welcome. For anything larger, please open an issue first.

Before opening a pull request, run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm test:e2e
```

Stop `pnpm dev` before the browser tests.

If you change `src/lib/agents/profiles.ts`, also run `pnpm tsx scripts/verify-agent-limits.ts`. It makes real agent runs on your Claude account.

Read `CLAUDE.md` first. The rules in it are the point of this project, especially the ones about never inventing claims and about what agents may do. Pull requests that remove those limits, or that add automatic submission, captcha workarounds or scraping of sites that forbid it, won't be accepted.

Never put real CVs, emails, postings or personal details in tests or fixtures.
