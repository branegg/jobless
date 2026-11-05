---
name: remember
description: File something about the person's career into the vault
disable-model-invocation: true
---
The person is telling you something about their career, so file it in the vault and they never have to remember it again.

Pick the folder: `facts/` for achievements and work history, `projects/` for things they built, `stories/` for situations they could tell in an interview, `answers/` for reusable answers to form questions. Check for an existing entry on the same subject with Glob and Grep, and update it instead of duplicating.

Since the person told you directly, use `status: confirmed` and `source: told by me on <today's date>`. Use `visibility: private` if it involves a client or confidential detail, otherwise `public`. Record what they said without inflating it. If a number or date would make it much more useful, ask once.

Follow the vault format in CLAUDE.md, and say in one line what you saved and where. Only write inside `vault/`.
