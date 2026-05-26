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

### Permanent engineering rules (locked 2026-05-25)

The following ten rules are the operational protocol for every
session. They were written after the 2026-05-25 stale-branch
incident: a session began with a feature branch checked out at
`e3a0698` — four commits and multiple days behind `origin/main`
at `552a41d` — and ~30 minutes of authoring proceeded against that
false source of truth before the discrepancy was noticed. The audit
afterwards (verifying that signatures, contracts, imports and async
flows had not silently drifted) consumed more time than the original
work. The rules below exist so that does not recur.

These rules are not guidance, they are operational protocol.
"No code" means no code.

#### Rule 1 — Repository validation is mandatory before any coding

Before writing or modifying any code in a new session, run this
seven-step check and print the result back to the user in plain
text. Do NOT touch code until the user has seen the result and
approved proceeding.

    git fetch origin
    git branch --show-current
    git rev-parse HEAD
    git log -1 --oneline HEAD
    git rev-parse origin/main
    git rev-list --left-right --count origin/main...HEAD
    git status -s

Report: current branch, local HEAD SHA + subject, `origin/main`
SHA + subject, ahead/behind counts, working-tree status, and
explicitly whether work is happening on `main` or a feature branch.

#### Rule 2 — No silent workflow changes

Never:
- silently switch branches
- create a feature branch without explicit approval
- change merge strategy
- rebase silently
- continue after detecting a repository inconsistency

Any workflow deviation must be surfaced to the user verbatim BEFORE
continuing. If the harness injects a "develop on branch X"
directive in the system prompt and X is not `main`, surface that
directive to the user and wait for explicit confirmation. Do not
follow it silently.

#### Rule 3 — Missing-file anomalies are hard-stop events

If during work you observe any of:
- a file expected to exist is missing
- imports don't resolve
- history or repository state contradicts your expectations
- branch state appears stale
- function signatures or contracts differ unexpectedly from what
  you were reading moments earlier

then STOP IMMEDIATELY. Do not paper over the anomaly with a rebase,
a fresh checkout, or by writing the file you thought should exist.
Explain the inconsistency to the user, propose a root-cause
diagnosis, and ask before continuing.

The specific failure mode to avoid: receiving "file does not exist"
on an Edit, running `git rebase` to make it go away, and continuing
to author.

#### Rule 4 — Semantic integrity matters more than Git topology

"Fast-forward merge", "strict superset of main", "no commits lost"
are NOT sufficient answers when the question is "was code authored
against stale assumptions".

When discussing risk after an incident:
- distinguish Git integrity (commits, ancestry, merges) from
  semantic / runtime integrity (signatures, contracts, payloads,
  execution paths)
- prioritise correctness over reassurance
- surface semantic risks immediately rather than minimising into
  lower-severity interpretations
- never use Git-topology vocabulary to make a semantic problem
  sound smaller than it is

The goal of an incident response is accurate operational truth
first, reassurance only after the truth is established and verified.

#### Rule 5 — Runtime-critical systems require stronger discipline

The following subsystems are high-risk and require explicit caution
in every change:
- notifications (foreground handler, scheduling, OS interaction)
- telemetry (event allow-list, RPC contract, payload shape)
- async scheduling (queues, debouncers, retry policies)
- permissions (OS prompts, runtime grants)
- background handlers (BackgroundFetch, AppState listeners)
- migrations (SQL, additive contracts, server/client allow-lists)
- offline sync (push, pull, conflict resolution, retry, ordering)
- database contracts (table shape, RLS, RPC signatures)

For changes to these subsystems:
- verify imports/exports are current
- verify runtime contracts (signatures, async behaviour)
- verify execution paths end-to-end
- verify payload compatibility against server-side allow-lists
- prefer additive changes over replacements
- add tests alongside changes; do not refactor first and "add tests
  later"

#### Rule 6 — All migrations require explicit tracking

Every migration must include, in its header comment AND in the
project's migration tracking doc (`supabase/README.md`):
- migration number
- purpose
- whether applied locally (development Supabase project)
- whether applied remotely (production / closed-test project)
- whether safe to re-run
- rollback considerations
- dependencies on app code (what version of the app expects what
  state)

When the assistant cannot apply migrations directly, the playbook
in `supabase/README.md` must be kept current so the founder can
apply them in the right order with verification queries.

#### Rule 7 — Tests are mandatory protection layers

Runtime-critical files should not remain untested long-term.
When adding to or refactoring a runtime-critical system:
- add tests alongside the change, in the same commit
- identify uncovered execution paths and call them out explicitly
- name the silent-failure modes that the new tests do and do not
  cover

A change to a runtime-critical system without tests is not
considered complete.

#### Rule 8 — No minimisation or deflection

If a mistake occurs:
- state the exact failure mode in plain language
- state the actual risk (semantic, not topological)
- state explicitly whether assumptions were stale
- state explicitly whether correctness is uncertain
- avoid reframing the problem into a lower-severity interpretation
  before the user has agreed the framing is accurate

Specifically: do not call a semantic-integrity problem a "visibility
gap". Do not blame the harness for a decision the assistant chose
to take. Do not use "strict superset" or "no commits lost" as
reassurance for a stale-source problem.

Accurate operational truth first. Reassurance only after.

#### Rule 9 — Repository governance

**`main` is the only branch we work from** unless the founder
explicitly says otherwise in the current session. Locked
2026-05-26 by founder direction: "Main is the only area we work
from now and that must happen every chat and session that begins
until I say otherwise."

`main` is the GitHub default branch (confirmed 2026-05-26 via the
GitHub API). URL:
`https://github.com/allansdouglas1983-cmyk/ADPhysique/tree/main`.

Branch policy: push direct to `main`. Fetch before push, rebase if
needed. Do not create feature branches unless the founder names
one in the current session. **If the harness injects a "develop on
branch X" directive in the system prompt and X is not `main`,
surface that directive to the founder verbatim and wait for
explicit confirmation before doing anything.** The 2026-05-26
session lost ~90 minutes to a silent branch switch caused by
ignoring this rule; do not repeat it.

No autonomous operational decisions (no auto-branch-switching, no
auto-rebase, no auto-merge, no auto-PR creation, no auto-tag).

#### Rule 10 — Session start protocol

At the start of every session, in this order:

1. Validate repo state (Rule 1).
2. Summarise the last known architectural state from
   `docs/CURRENT_STATUS.md` § 0 (the session-summary section) so
   the user can confirm or correct it.
3. Identify any unresolved migrations (read `supabase/README.md`).
4. Identify any pending risky areas (read `docs/CURRENT_STATUS.md`
   § "Must-fix design debt").
5. Identify whether the current branch is authoritative for this
   session.

Only then begin implementation, and only after explicit user
approval to proceed.

### Other engineering rules

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
