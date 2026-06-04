# Deep Feature Audit — Implementation Log

Running log of every change implemented after approval. Append-only.

---

## Item 1 — Welcome screen (tier selection) — IMPLEMENTED 2026-06-04
File: `src/screens/WelcomeScreen.js` (copy + one style; no logic change).
- Free-card backup note rewritten: "Your free account keeps every session
  backed up and synced across devices. No card, no ads." (was "Your data
  stays on your device. Sign up anytime to sync and protect it.")
- Added muted line under the cards: "Both tiers are a free account. No card.
  About a minute to set up." (new `tierNote` style: fontSize.xs, textMuted,
  centred).
- Disqualifier second paragraph softened: "Volyume is built for a few weeks
  of consistent data: that is when the weekly read earns its place. If you
  only want a quick tap-to-log or a standalone calorie counter, it is more
  than you need." (removed the "there are faster ones out there" line).
Verification: `screen-mount` suite green (455 tests); eslint 0 errors. No new
behaviour, so no new unit tests (copy-only on a presentational screen).
Commit: see git log.
