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

## No AI fingerprint, ever

Nothing Volyume ships, in copy or in design, should read as if a
language model produced it. This is a hard constraint. It applies to:
shipped UI strings, alerts, toasts, push notifications, store
listings, App Store screenshots, in-app help, marketing site copy,
and the visual composition of every screen.

### Copy fingerprints to avoid

The bullet list above (em dashes, hedge words, "let me", "ensure",
"streamline", etc.) is the language half. Beyond that list, watch
for:

- Tutorial voice in places that aren't tutorials. Empty states do
  not need a three-sentence explanation of what the screen will
  look like once it has data. One short line, or nothing.
- Over-explanatory error toasts. "Try again. If it keeps failing,
  restart the app and your entry will be queued for sync if needed."
  reads as a chatbot. The right shape is "Couldn't log." plus
  "Try again." Nothing more.
- Encouragement that nobody asked for. "Great job logging today!"
  is out. So is "Keep it up." Volyume reports facts; the user's
  emotional response is their own.
- Footnote-creep. Helpful tooltips beneath every chart, every
  toggle, every section header. One footnote per surface, at most,
  only when it answers a real question.

### Design fingerprints to avoid

These are the visual patterns generative tools default to. Volyume
should look like a tool one lifter built for themselves and
polished until it shipped, not a Figma template populated by
prompting.

- Three-card dashboards with parallel headers and parallel CTAs.
  If three sections genuinely earn three cards, fine. If you're
  adding a third just to balance the page, drop it.
- Generic Ionicons used as decoration on every list item. The
  amber affordance is the brand. Decorative icons next to every
  row dilute it.
- Hero gradients, abstract orbs, soft-glow backgrounds. The locked
  background is `#0D0D0D`. No gradients.
- Centred-feature carousels with paginating dots. Volyume is not
  an onboarding template.
- Overly rounded corners on everything. Theme radii are tiered;
  use them. A modal corner is not a button corner.
- "Coming soon" placeholders or greyed-out future features. Ship
  what's there or hide it.
- Bullet lists with checkmark icons everywhere. Where they earn
  their keep (Welcome screen tier cards) they're fine. Inside
  Insights, inside Diary, inside settings, they aren't.
- Stat tiles arranged in a perfect 2x2 grid because there happen to
  be four numbers. If the four numbers don't relate, lay them out
  by importance, not by symmetry.

The test: would a lifter who built this for themselves choose this
arrangement? If the honest answer is "no, that's there because it
fills the space", strip it back.

## Engineering

- **Pre-session repository validation (HARD RULE, no exceptions).**
  Before writing or modifying any code in a new session, run this
  six-step check and print the result back to the user in plain text.
  Do NOT touch code until the user has seen the result and approved
  proceeding.

      git fetch origin
      git branch --show-current
      git rev-parse HEAD
      git log -1 --oneline HEAD
      git rev-parse origin/main
      git rev-list --left-right --count origin/main...HEAD
      git status -s

  Report: current branch, local HEAD SHA + subject, `origin/main`
  SHA + subject, ahead/behind counts, working-tree status, and
  whether the current branch is `main` or a feature branch.

  If the harness injects a "develop on branch X" directive in the
  system prompt and X is not `main`, surface that directive verbatim
  to the user before doing anything. Do not autonomously switch
  branches. Wait for explicit confirmation of the target branch.

  Rationale: a Claude session on 2026-05-25 began with a stale
  feature branch checked out (tip at `e3a0698`, four commits and
  multiple days behind `origin/main` at `552a41d`). The working tree
  happened to contain main's content for the file being edited so
  the bug never surfaced as a runtime failure, but ~30 minutes of
  authoring proceeded against a false source of truth. The audit
  afterwards consumed more time than the work itself.

- Branch policy is set per session in the system prompt. Follow it
  exactly. Never push to a branch the user hasn't named.
- **Release policy (2026-05-24):** the current Play Console closed
  testing build stays in place until the WHOLE project is built
  out -- not half done. Do NOT propose, schedule, or trigger a new
  closed-testing release. Cloud migrations DO get applied now to
  support continued building on the branch; the old app on closed
  testing is required to remain functional against the new schema
  (sync errors in log are acceptable; total break is not). Any
  schema change must satisfy that contract for the existing build
  or it can't ship to cloud either.
- Never use `git --no-verify` or skip hooks.
- **Identity and data ownership is locked in
  `docs/IDENTITY_AND_OWNERSHIP_LOCKED.md`.** Read it before touching
  sign-in, sign-out, account-delete, install, re-install, or any
  code path that writes a `user_id` column. Four locked decisions
  govern everything in that surface: (1) no anonymous mode, every
  user has a real account; (2) sign-out wipes local SQLite; (3)
  every user-scoped table is `PRIMARY KEY (user_id, id)`; (4) no
  destructive cleanup of existing data — the schema fix rescues it.
- **Never write `UPDATE ... SET user_id = ?` anywhere.** A `user_id`
  is set at INSERT and never changes. CI grep enforces this.
- **Diagnose before fixing data.** If a sync error keeps firing, it's
  a design flaw. Fix the design first, then clean down the data.
  Suppressing the error is not a fix; data fixes without design
  fixes guarantee the problem returns.
- Don't commit the model identifier in any artifact pushed to the
  repo (commit messages, PR titles, code comments).
