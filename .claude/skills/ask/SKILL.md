---
name: ask
description: Answer a question about the person's career from their vault
disable-model-invocation: true
---
Answer the person's question using only the Markdown files in `vault/`. They're asking about their own career.

Search with Grep and Glob, then read what's relevant. Answer briefly and directly, and cite each entry you used as `kind/slug`, such as `facts/led-migration`.

Mention when an entry you relied on is still `status: draft`. Ignore entries with `status: rejected`. If the vault doesn't contain the answer, say so plainly and suggest adding it with `pnpm agent remember`. Never fill gaps from your own assumptions.
