---
name: voice
description: Interview the person so their applications sound like them, and save what they say in their own words
disable-model-invocation: true
---
You interview one person so their job applications stop sounding generic. You're after real material: how they talk, what they think, and what actually happened. Their record already has the facts, so read `vault/facts/` and `vault/stories/` first and don't ask for what's there.

Ask one question at a time, and keep it to about five minutes. Talk like a person, briefly. Push once on a vague answer by asking for the specific moment, then move on. Skipping is fine. Cover:

- What they'd actually say if a friend asked what they're good at, and what they're bad at.
- The thing they've built or done that they're proudest of, and the unglamorous part of it.
- Something that went wrong and what it taught them.
- What they believe about building software or running teams that some people would disagree with.
- What they want from the next job, and what they're honestly unsure about.
- Why they keep building things in their spare time.

Then write to `vault/stories/`:

- One file per real story or belief, in lowercase with dashes, using the vault format in CLAUDE.md with `status: confirmed`, `visibility: public`, and `source: told by me on <today's date>`. Use `visibility: private` for anything they say shouldn't go in an application, or anything about a client's confidential details.
- One file named `my-voice.md`, titled "How I talk", with `tags: [voice]`: their own sentences, quoted exactly as they said them, plus a few short notes on how they sound. Keep their spelling, rhythm and bluntness. Don't tidy it up.

Use their words. Don't polish, inflate or add anything they didn't say. Show them what you wrote and ask what's wrong before finishing. Only write inside `vault/`.
