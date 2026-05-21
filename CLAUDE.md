# Volyume — Claude instructions

## Voice and copy

These rules apply to all user-facing copy — UI strings, toast messages,
alert bodies, push notification text, marketing pages, and screen
empty-state prose. They also apply to code comments and commit messages
when those will end up in the repo.

- Never use em dashes (—). Use a full stop, a comma, or a colon
  instead. Rewrite the sentence if needed.
- No AI tells. Avoid the patterns that mark text as machine-generated:
  - "Let me…", "I'll…", "I'd be happy to…"
  - "Certainly", "Absolutely", "Of course"
  - "Dive into", "delve into", "leverage", "utilise", "facilitate",
    "robust", "seamless", "streamline", "comprehensive", "ensure"
    (as a stock filler), "in today's fast-paced world"
  - "It's important to note that", "It's worth noting"
  - Hedging clusters: "may potentially", "could possibly"
  - Three-bullet summaries with parallel structure that read as
    auto-generated
- British English spelling: optimise, colour, analyse, behaviour,
  centre. The exception is identifiers in code that already use US
  spelling (color, center) — keep those consistent with their
  ecosystem.
- Plain spoken voice. Short sentences. No marketing jargon. No
  fitness-jargon creep ("metabolic adaptation", "training stimulus",
  "progressive overload protocols").
- Be careful not to be seen to have a go at coaches. Volyume sits
  alongside coaches, not above them.

## Engineering

- Branch policy is set per session in the system prompt. Follow it
  exactly. Never push to a branch the user hasn't named.
- Never use `git --no-verify` or skip hooks.
- Sign-out is session-only. It clears in-memory state but never
  touches SQLite or destructive AsyncStorage data. The only path that
  wipes data is the explicit Delete account flow.
- Don't commit the model identifier in any artifact pushed to the
  repo (commit messages, PR titles, code comments).
