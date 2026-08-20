# Capability Campaign 25 — initial challenge pass (PROVISIONAL — to be proven or destroyed by Wave 1 evidence)

_Written 2026-08-20 before any Wave 1 audit returned. Nothing here is a
decision. Every position below is a hypothesis the audits must confirm,
refute or reshape. The founder brief (Campaign 25+ master prompt,
2026-08-20) is the authority for scope; this file records where the lead
architect currently disagrees with, doubts, or extends that brief._

## Numbering note (bookkeeping, recorded up front)

The brief numbers this workstream from Campaign 25. The global register
already runs through Campaign 33 (see docs/TASKBOARD.md), including an
unrelated closed "Campaign 25 — Plans screen" (2026-08-17). This
workstream therefore carries its own namespace: **Capability Campaign 25
(CC25)** onward. Nothing is renumbered.

## The single most important repo fact known before auditing

Campaign 31 (2026-08-18, on main, migrate_142 live in production) already
built a movement-avoidance system: PATTERN_AVOID intents with day-bound
expiry (`exercise_intent.expires_at`), write helpers in
`movementConstraints.js`, `isPatternAvoided`, and set/notice/list/
allow-again UX. Campaign 32 added `load_semantics`
(total/per_hand/assisted/added_bodyweight). Campaign 20 built a live
set-prescription resolver; Campaign 21 oracle-locked the coach decision
graph (113 rules). **CC25 architecture must subsume and extend the C31
system — colliding with it or duplicating it is failure.** Whether
PATTERN_AVOID already collapses "dislike" and "can't" into one kind is a
load-bearing Audit C question.

## Provisional positions (hypotheses, each with its kill-test)

**H1 — One constraint entity, not four stored concepts.** The brief
proposes Capability Profile / Durable Restriction / Temporary Episode /
Effective State as four concepts. Provisionally: baseline facts and
durable restrictions are ONE stored entity — a typed constraint with
(a) role: `baseline` (defines this user's normal) vs `episode`
(departure from their normal), (b) typed source (self-declared
functional fact / user-reported clinician instruction / preference —
though preference likely STAYS in exercise_intent), (c) lifecycle
(active, expiry semantics, closure), (d) append-only versioned history.
"Capability Profile" would then be a derived view over active
baseline-role constraints, not a second source of truth.
Kill-test: Audit C shows exercise_intent semantics can't host this
cleanly, or versioning/sync needs force a separate aggregate.

**H2 — The load-bearing axis is representativeness.** Every learning
question reduces to: was behaviour under this constraint representative
of the user's normal? Baseline-role → yes (full-class evidence);
episode-role → no (context-restricted evidence). Source and expiry are
provenance/lifecycle, not eligibility. If true, the Learning Eligibility
Matrix keys on (consumer × constraint-role × affectedness), not on a
per-set global tag. Kill-test: Audits D/E/L find consumers whose
eligibility genuinely needs finer grain than role × affectedness.

**H3 — Interpretation-time provenance beats set-level denormalisation.**
Prefer a versioned constraint timeline (append-only intervals) joined at
read time over stamping every set with a context tag — IF the learning
consumers recompute from history. Incremental consumers (recovery EMA
etc.) cannot re-join later; they need ingestion-time eligibility or
recomputability. Audits D/E must classify every consumer as
incremental vs recompute-from-history; the split decides the model.
Sync corollary: intervals are append-only events, so a restriction
removed on device B never retroactively falsifies device A's history.

**H4 — One shared functional vocabulary.** A small closed set of
functional-demand tags used by BOTH exercises (demands) and constraints
(avoided/unavailable demands) makes resolution set-intersection and
explanations mechanical ("this exercise requires the overhead position
you've asked Volyume to avoid"). Ontology size is driven by the
restriction vocabulary users actually need, not biomechanics
completeness. Unknown is tri-state per dimension. Kill-test: Audit B
shows the library can't support even a minimal demand set without a
huge backfill, forcing a different gating design.

**H5 — The effective-prescription layer half-exists.** Session-time
resolution already exists (sessionAdjustments; the C20 resolver).
The right architecture is probably extending the existing
plan→session resolution pipeline with a constraint stage, not building
a parallel overlay store. Audits A/D/E/F decide where the real seam is.

**H6 — Highest contamination risk is block seeding.** blockSeed /
buildSeedRangesForNextBlock writes a finished block's evidence FORWARD
into the next block. A constrained block seeding the next block is the
single most damaging silent-baseline-corruption path. Audit E must map
exactly what a block teaches the next.

## Where I currently doubt the brief

- "Capability profile independent of any programme": agree directionally,
  but it may be nothing more than the set of active baseline-role
  constraints plus per-exercise manual allowances. Resist inventing a
  profile aggregate that duplicates state.
- Per-side (left/right) set logging: C32 gave per_hand load semantics
  only. Full per-side logging may be a deliberate scope ruling, not a
  default requirement. Constraint laterality at selection level may be
  the correct v1; Audit D evidence decides.
- Observed-discomfort discovery prompts: value depends entirely on what
  joint-discomfort data is actually captured today (Audit D).
- Free/Pro: baseline capability support that makes an ordinary programme
  usable for a disabled person smells like accessibility, not a Pro
  feature. Likely founder/business flag with a recommendation, per brief.

## Candidate terminology (to be settled at synthesis)

Baseline capability (defines normal) / Restriction (explicit rule with
typed source) / Limitation episode (temporary departure) / Effective
plan (resolved prescription). Domain names avoid "injury", "adapted",
"disability" as system states; those are contexts, not identities.
