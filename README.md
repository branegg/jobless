# Joblesss

A job search app that runs on your own Mac. It keeps your career record as Markdown files, reads job feeds, scores what it finds, drafts a CV and cover note for each role from claims you've confirmed, and fills in application forms while you watch.

Nothing is hosted. The dashboard only answers on 127.0.0.1, and you press Submit yourself.

## Is this for you?

You'll need:

- **A Mac.** Scheduling uses launchd, and the form button opens Terminal through AppleScript.
- **Node 22 or later, and pnpm.**
- **[Claude Code](https://claude.com/claude-code), logged in to a Claude plan.** Every agent runs through it and uses your plan's limits. `ANTHROPIC_API_KEY` is deliberately removed from agent runs, so API billing isn't used.
- **Optional, for form filling:** Chrome with the Claude in Chrome extension.
- **Optional, for email updates:** the Gmail connector on claude.ai.
- **Optional, for UK boards:** your own API keys for Reed and Adzuna, added on the Job sources page. Both are UK-only here. Company job boards (Greenhouse, Lever, Ashby, Workable, Recruitee) work anywhere.

Please read [SECURITY.md](SECURITY.md) first. Agents read untrusted job pages, and `apply` works in your logged-in Chrome.

## Getting started

```bash
pnpm install
cp watchlist.example.yaml watchlist.yaml     # the companies, roles and places to look for
cp sources.example.yaml sources.yaml         # the folders holding your CVs and projects
pnpm dev                                     # dashboard at http://127.0.0.1:3000
```

Then, in another terminal:

```bash
pnpm agent setup                             # interview about what you want next
pnpm agent profile-import                    # draft entries from your CVs and projects
```

Review the drafts in the dashboard, since only entries you confirm can be used in applications. Save your contact details on the Contact page, then read jobs with `pnpm jobs:fetch` and score them with `pnpm jobs:score`.

`profile-import` also collects the names and descriptions of your GitHub repositories, including private ones, if the `gh` command is logged in. Those go into local draft entries for you to review.

## Everyday use

```bash
pnpm agent remember shipped the billing work # save something the moment it happens
pnpm agent ask "when did I last lead a team?"
pnpm agent apply 12                          # what the "Fill in the form" button runs: fills in Chrome, stops before Submit
pnpm jobs:fetch                              # read the job feeds in watchlist.yaml, no AI used
pnpm jobs:score                              # score new matches, up to the daily limit in watchlist.yaml
pnpm jobs:score all                          # score every waiting match now, ignoring the daily limit
pnpm inbox                                   # search Gmail for news about open applications
pnpm schedule install                        # check jobs daily at 8:30 and email every 4 hours
pnpm schedule status                         # also: run daily, run inbox, uninstall
```

## Settings

**`watchlist.yaml`** holds the companies to check, the role and place filters, and `dailyCap`, the most jobs scored per day. Each score uses your Claude plan, so raise the cap with care. Without this file, the app uses `watchlist.example.yaml`.

**`sources.yaml`** names what `profile-import` may read:

| Setting | Meaning |
|---|---|
| `cvFolders` | Folders holding your CVs as PDFs |
| `projectFolders` | Folders whose subfolders are your projects |
| `exclude` | Names of files or projects to block, such as someone else's CV |

Without this file, `profile-import` can't read any of your folders.

## Your data

`vault/` holds your career record as Markdown, with local history in its own git repository. `data/` holds the database, logs and API keys. Both are ignored by this repository, along with `watchlist.yaml` and `sources.yaml`. Nothing is backed up off your machine by default.

## Checks

```bash
pnpm test                                # unit tests
pnpm typecheck                           # type check
pnpm test:e2e                            # browser tests, with `pnpm dev` stopped
pnpm tsx scripts/verify-agent-limits.ts  # real agent runs that try forbidden actions
pnpm tsx scripts/verify-injection.ts     # a real scoring run on a posting with planted instructions
```

The last two use your Claude plan.

## Licence

[MIT](LICENSE)
