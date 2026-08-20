# CC25 ARCHITECTURE — capability-aware, disability-inclusive, restriction and injury-aware training intelligence

**Status: PROVISIONAL — written 2026-08-20 by the campaign lead from the
banked Wave 1 evidence; goes to the two bounded red teams next, then
revision, then the completion gate.** Authority: founder master brief +
Amendment 1 (2026-08-20) + the cost-governance order. Every load-bearing
claim below cites its evidence (audits/AUDIT-X §n, research/Rn, or the
consolidated map). Decisions, laws, rejections and review flags are
registered in DECISION-REGISTER.md; the implementation plan is
ROADMAP-CC26-PLUS.md.

Reading guide: §1 current state, §2 domain model, §3 product laws, §4
precedence, §5 data model, §6 provenance, §7 learning-eligibility matrix,
§8 exercise-demand ontology, §9 resolver, §10 ranking, §11-§20 UX and
engine integration, §21-§24 lifecycle, §25-§29 safety/privacy/
accessibility/sync/observability, §30 migration, §31 tests, §32 register
pointer. Amendment deliverables (routine library, coverage registry,
marketing gates, validation plan) live in ROADMAP-CC26-PLUS.md.

---

## 1. CURRENT-STATE ARCHITECTURE MAP (deliverable 1)

Every arrow verified against live code by Wave 1 (citations in the named
audits).

```
ONBOARDING (A§2)                 PROFILE (A§4)
 free: units+name only ────────► AsyncStorage blob (no history,
 pro: 6-step wizard              generator inputs device-local)
        │                                 │
        ▼                                 ▼
PLAN GENERATION (A§2.4-2.7)      PLAN LIBRARY (A§10)
 buildPlanInputs (defaults)       31 seeded plans, tag browse
 getAllExercises                  copyPlanFromLibrary (no filters,
 loadGenerationIntent             metadata dropped on install)
 filterLibraryForGeneration ◄──── exercise_intent (C§2)
 (C31 intent filter, drop         3 kinds × (id | family:) targets,
  report, fails open)             upsert destroys history
 readDemonstratedStructure ◄───── programmeStructureMemory (E§2.8)
 generatePlan (pure engine)       │
  filterPool = equipment hard     │
  never-starve quality gates      │
 withContinuity / resolveSeed     │
 (post-engine intent re-check)    │
        │                         │
        ▼                         ▼
PROGRAMME (programmes/routines/routine_exercises — one storage model
for generated AND library plans, A§10.5)
        │ activatePlanWithBlock → mesocycles + planned_muscle_volume
        ▼                          (seeded via blockSeed chain, E§2.2)
WORKOUT (D§2)
 HomeScreen intent sheet → createWorkout (readiness cols)
 C20 resolver (pure, 3-session/45-day window, comparability stage)
 handleCompleteSet → workout_sets (one row per set; no per-set
 effort/pain; per-side flow stores nothing per side)
 swap → exercise_swaps (no reason); remove → nothing durable
 finish → session_resolutions (2 values, no reason) │
 WorkoutSummary → workouts.joint_discomfort (session-level,
 fanned to every muscle trained, D§5.1) + adaptation_events
        │
        ▼
EVIDENCE CONSUMERS (~186 sites, L) 
 recovery EMA / readiness / sessionAdjustments (recompute, D§13Q4)
 adapted landmarks (rolling 200-row window, E§2.1)
 BLOCK LEDGER (frozen at computation, E§2.2) ──► learnedRange replay
 blockSeed → NEXT BLOCK planned volume          (E§13Q2)
 programmeStructureMemory → next generated plan
 weeklyCoach (no per-muscle channel, F#1) → limiters → ladder →
 Apply/Decline → coachApply → planned_muscle_volume
 + 17 hidden consumers: share cards, CSV export, widgets,
 notifications, partner signal, billing cascade screen (L)
        │
SYNC (I digest): registry engine (weekly_checkins only) + legacy
sync.js for everything else; per-row LWW on updated_at; cloud
refuse-stale triggers on the modern tables.
```

What does NOT exist today (checked-and-absent, A§10.6, C§13.3, D§Q2/Q3):
any capability/restriction concept beyond C31's merged avoidance; any
demand metadata (position/floor/grip/overhead/axial/balance); any
representativeness gate keyed on physical capability; any per-side data;
any body-region signal; any effective-prescription concept; any reason on
swaps, skips or omissions.

---

## 2. FINAL DOMAIN MODEL (deliverable 2)

Four concepts were proposed by the brief. The evidence resolves them to
TWO stored entities, one derived view, and one resolution layer.

### 2.1 Constraint (stored) — the single capability entity

One table, `capability_constraints` (§5). A constraint is a typed rule
about the user's body-facing training reality, with:

- **role** — the load-bearing axis (challenge-pass H1/H2, CONFIRMED by
  the evidence):
  - `baseline`: defines this user's NORMAL. Training under baseline-only
    constraints is fully representative evidence (CAP-1).
  - `episode`: a TEMPORARY departure from their normal (injury episode,
    flare, post-op period). Evidence in its affected scope is not
    representative of normal (CAP-12).
- **source** — `self` (user-declared functional fact) or
  `clinician_reported` (the user reports a professional's instruction).
  Preference is NOT a source: preference stays in `exercise_intent`
  (CAP-4; R1 finding 8 makes this separation the Article 9 wall).
- **rule** — what it constrains (§5.2): a functional demand tag (the new
  ontology, §8), a movement family (C31 continuity), a single exercise,
  or a single-exercise ALLOWANCE (the user's "I can do this one",
  closing Audit C §10.7).
- **laterality** — optional left/right qualifier.
- **lifecycle** — active → ended (expired / user_ended / superseded /
  promoted), with an interval [starts_at, ended_at] that makes history
  interpretable (§6).

Why one entity, not two: a baseline fact and a durable restriction differ
only in the role axis; every other property (source typing, rules,
laterality, lifecycle, sync, consent, erasure) is identical. Two tables
would duplicate the entire pipeline for no semantic gain. Kill-test H1
passed: Audit C proved `exercise_intent` cannot host this (one row per
target, destroyed history, merged semantics, Art 9 contamination of the
preference lane), so the constraint store is NEW, and the preference
store is untouched.

### 2.2 Capability state (derived, never stored)

`capabilityState(userId, atMs?)` = the active constraints partitioned by
role, plus the derived demand-exclusion set and per-exercise allowances.
The "capability profile" of the brief is exactly this view over
baseline-role rows. No aggregate is persisted — a second source of truth
was rejected (register CC-D3).

### 2.3 Effective prescription (resolution layer, not a store)

The existing pipeline already resolves plan → session (C20 resolver,
sessionAdjustments, the pre-engine intent filter). The effective
prescription is that pipeline with ONE new senior stage (§9), plus a
compact per-session record of what the constraint stage changed
(`session_constraint_effects`, §5.3) — the durable deviation provenance
Audit D §Q5 found missing. The base plan is never rewritten (extends the
C31 law "no plan is ever auto-rewritten", C§7.10). Overlay-as-store was
rejected: Audit E shows plan/session state already flows through
resolution seams, and a parallel overlay store would create a second
truth that Audit G's denominators would then disagree with (CC-D5).

### 2.4 Chronic and flare

A chronic condition is baseline constraints (the stable state) plus
episode constraints during flares — the same two roles, no third model
(brief's "PERSONAL BASELINE + FLARE = CURRENT EFFECTIVE CAPABILITY"
adopted as-is). A "flare mode" is a UX affordance: re-activating a
previous episode's rule set in one flow (§21), not a new entity.

### 2.5 Terminology (user-facing)

"Baseline capability" / "temporary restriction" / "your training" /
"effective session". The words injury, adaptive, disabled, modified,
rehabilitation never name system states (CAP-2, CAP-22; R3 CR-13; R2
wording blacklist). The settings surface is named "Movement & capability"
(the existing SettingsHealthScreen is device-health integration and keeps
its name).

---

## 3. PRODUCT LAWS (deliverable 3)

Each law is binding on every later campaign; enforcement site named.
Rationale citations in the register.

- **CAP-1 Normal is personal.** Baseline capability defines the user's
  normal; evidence under baseline-only constraints is fully
  representative and receives every learning, progression, PR and
  coaching mechanism unmarked. *Enforced: eligibility matrix §7 row
  semantics; guard tests (§31).*
- **CAP-2 Stable capability is not an injury state.** Baseline
  constraints never trigger episode machinery, "modified" labelling,
  recovery framing, or reduced coaching sophistication. *Enforced: UX
  copy register + guard tests.*
- **CAP-3 Function, not diagnosis.** The system stores what the user can,
  cannot, or should not do. No diagnosis or condition name is required,
  requested, or stored (v1 stores no free text at all). *Enforced: schema
  (§5 has no such field); R1 L18.*
- **CAP-4 Preference and capability are separate lanes.** Preference
  stays in `exercise_intent` (ordinary personal data); capability lives
  only in `capability_constraints` (Article 9 lane). No shared field, no
  inference from one lane into the other, in either direction.
  *Enforced: schema separation; source guard forbidding capability reads
  in preference modules and vice versa.*
- **CAP-5 Capability filtering is hard and reported.** It runs before
  every never-starve quality fallback, at every automatic suggestion
  surface (generation, dry run, picker including rails, swap ranking,
  library recommendation, travel mode, builder suggestions), with
  machine-readable reasons; it never silently drops. *Enforced: §9
  resolver contract; extends the existing drop-report pattern (A§9.3).*
- **CAP-6 Manual control survives.** The user can always log, add, or
  keep any exercise. Automatic surfaces filter; manual paths warn and
  confirm; an allowance row makes the exception durable. *Enforced: §9.4
  manual-conflict flows.*
- **CAP-7 Clinician-reported restrictions cannot be silently
  overridden** — not by readiness, coach proposals, learned preference,
  or a manual add. Overriding requires the explicit restriction-change
  flow ("My restriction has changed"), which ends the row first.
  *Enforced: precedence §4 rank 2; confirm flow §9.4.*
- **CAP-8 Unknown is not compatible.** Unknown demand on a constrained
  axis excludes an exercise from automatic suggestion (own reason code,
  own explanation) but never blocks manual use. *Enforced: §8.4 tri-state
  policy.*
- **CAP-9 No compatible option is a valid result.** The engine may
  deliver fewer exercises, fewer sets, or an omitted slot, with an
  explanation and a route to user action; it never widens quality gates
  or invents junk to fill a number. *Enforced: §9.5; extends
  plan_blocked_by_exclusions and blockedSlots (A§2.7).*
- **CAP-10 Volume may honestly under-deliver under constraint.**
  Effective weekly target = min(landmark-derived target, deliverable
  quality-compatible volume). Missed volume creates no debt and no
  catch-up. *Enforced: §15.*
- **CAP-11 Episodes alter the effective prescription, never the base
  plan.** Effective changes are reversible, diffable, and user-approved
  where consequential. *Enforced: §14; §2.3.*
- **CAP-12 Temporary behaviour cannot silently become durable.**
  Episode-affected evidence teaches no durable capacity, preference, or
  structure lesson, in either direction; unaffected scopes learn
  normally, per muscle. *Enforced: §7 matrix; gather-time eligibility
  §6.2.*
- **CAP-13 Forced behaviour is not preference.** Constraint-caused
  substitutions and omissions carry their cause and are ineligible as
  preference evidence; a substitute may rank contextually during the
  episode only. *Enforced: §6.3 swap cause; intent readers §7.*
- **CAP-14 Historical truth is immutable.** Past workouts, PRs and
  records are never rewritten by capability changes; interpretation joins
  history against the constraint intervals in force when the work was
  done (keyed on workouts.started_at — D§P-4). *Enforced: §6.1; append-
  only lifecycle §5.*
- **CAP-15 Return is conservative and user-directed.** Ending an episode
  restores eligibility, never old loads. Re-entry rides the resolver's
  existing first-time/stale-history semantics plus a bounded volume ramp
  toward the protected baseline. No decay formulas, no fixed percentage
  caps, no symptom-keyed gates. *Enforced: §23; R3 CR-8.*
- **CAP-16 Promotion is explicit.** An episode becomes the new baseline
  only by user action; promotion re-labels the future and never re-judges
  the past. *Enforced: §24.*
- **CAP-17 Safety-relevant reads fail closed and say so.** If capability
  state cannot be read, automatic suggestion surfaces exclude nothing
  silently: generation proceeds using the last KNOWN state where
  available, otherwise surfaces a visible capability-unavailable notice
  and offers to hold; nothing is fabricated. (Sharpened from C31's
  fail-open D109-2, because the harm direction here is inverted — the
  C31 spec itself flagged this, C§13.4.) *Enforced: §9.6.*
- **CAP-18 Explanations are mechanical and calm.** Every capability
  decision is explainable from stored rules plus metadata, in functional
  language. "Safe", "rehabilitation", "therapy", condition names and the
  R2 blacklist never appear; the existing "safe to perform" equipment
  claim (planEngine.js:2759) is corrected in the first implementation
  campaign that touches that file. *Enforced: copy register; lint-style
  wording guard.*
- **CAP-19 Capability accommodation is never paywalled** (founder FD-1).
  The capability store, onboarding step, filtering, library
  compatibility, builder support, custom/adapted logging, effective-
  session handling and capability settings are tier-blind. *Enforced:
  mechanical guard test over gate call sites (J-1 baseline: today's 18
  withProGuard screens are all nutrition/coaching).*
- **CAP-20 The capability lane is consent-gated, minimised, exportable,
  erasable.** Separate granular Article 9 consent (own version, own
  withdrawal that disables and deletes capability data without closing
  the account); no diagnosis, no v1 free text; no per-user capability
  telemetry; export includes it; erasure reaches the timeline and every
  derivative marker. *Enforced: §26; R1 register.*
- **CAP-21 Asymmetry is a fact, not a defect.** Laterality is stored and
  respected in selection and explanation. No symmetry targets, no
  corrective framing, no per-side arithmetic conversions, no
  cross-education claims. *Enforced: §16; R3 CR-9/CR-10.*
- **CAP-22 The app never diagnoses, treats, rehabilitates, or predicts
  recovery.** Red-flag situations get refusal plus signposting, with no
  severity grading, no likelihood ranking, no tolerability prediction.
  *Enforced: §25 safety boundary; R2 boundary table rows 9/15/16.*

---

## 4. PRECEDENCE MODEL (deliverable 4)

Deterministic, total, and split by QUESTION — Audit C §7 showed one
flat ordering misleads; eligibility, reporting and ranking are separate
chains there and remain so here.

### 4.1 Suggestion eligibility (what automatic surfaces may offer)

An exercise is ineligible if ANY of the following holds; the FIRST
matching row names the reported reason (reporting order = this table):

| Rank | Condition | Reason code |
|---|---|---|
| 1 | ED-safety / calm-mode suppression applies to the surface (existing law, unchanged, senior) | (existing) |
| 2 | Active clinician-reported constraint conflicts (demand / family / exercise), no allowance can carve it | `capability_clinician` |
| 3 | Active self-declared constraint conflicts AND no exercise allowance covers it | `capability_declared` |
| 4 | Constrained axis demand is UNKNOWN for this exercise (CAP-8) | `capability_unknown` |
| 5 | exercise_intent exclusion / block avoidance / pattern avoid (preference lane, as today) | existing C31 codes |
| 6 | Equipment unreachable (as today) | existing |
| 7 | Quality gates (canonicality, difficulty, assisted, division) — never-starve, as today | existing |

An **allowance** (rule_kind `exercise_allow`) carves rank 3 and rank 4
for its exercise. It never carves rank 2: a clinician-reported rule is
edited, not excepted (CAP-7). Ranks 2-4 are HARD (no never-starve
re-entry; they join equipment in the pre-engine filter and the
post-engine re-check, A§14 Q2 rows 1 and 6).

### 4.2 Prescription seniority (how much / how hard)

Existing seniority stands (deload owns its session; senior states
disable adjustStronger; readiness eases downward only — D§7 I-6..I-8).
The constraint stage adds: effective volume ceiling per muscle =
deliverable quality-compatible volume (§15); no coach or landmark
mechanism may push volume into an affected muscle above it; reductions
remain always allowed (matches coordinateChanges R2's open direction,
G§2.5).

### 4.3 Learning seniority

Manual landmark edits > everything (unchanged, E§13 Q3). Eligibility
(§7) is not a rank but a gate applied before any learning fold.

### 4.4 Conflict rulings the table implies

- Restriction vs coach proposal: the coach never proposes an ineligible
  exercise and never proposes affected-muscle volume above the effective
  ceiling; proposals in flight when a constraint is added are re-resolved
  at Apply time (coachApply re-checks, §20).
- Restriction vs learned preference / slot default: eligibility wins;
  the default is not offered while ineligible (extends
  approvedDefaultFor's existing refusal, C§7.7).
- Baseline vs episode on the same target: both apply (union of
  exclusions); lifecycle keeps them distinct rows.
- Two episodes overlapping: union; each keeps its own lifecycle.
- Restriction vs manually-installed plan content: install-time and
  view-time conflict surfacing with substitution offers; the plan is
  never silently rewritten (§14).
- Equipment vs capability: independent axes, both hard, reasons kept
  distinct end to end (the existing equipment/exclusion separation at
  attachBlockedSlots is the pattern, C§13.3).

---

## 5. CAPABILITY / CONSTRAINT DATA MODEL (deliverable 5)

### 5.1 `capability_constraints` (new; local SQLite + cloud, synced via the registry)

```
id                TEXT PRIMARY KEY          -- uid()
user_id           TEXT NOT NULL
role              TEXT NOT NULL             -- 'baseline' | 'episode'
source            TEXT NOT NULL             -- 'self' | 'clinician_reported'
rule_kind         TEXT NOT NULL             -- 'demand' | 'family' | 'exercise' | 'exercise_allow'
rule_value        TEXT NOT NULL             -- demand tag | family key | exercise id
laterality        TEXT                      -- NULL | 'left' | 'right'
starts_at         INTEGER NOT NULL          -- epoch ms
ends_at           INTEGER                   -- NULL = open; episodes may carry a
                                            -- planned end (date-bound) or NULL
                                            -- ('until I end it')
state             TEXT NOT NULL             -- 'active' | 'ended'
ended_at          INTEGER
ended_reason      TEXT                      -- 'expired'|'user_ended'|'superseded'|'promoted'
episode_group_id  TEXT                      -- groups the rules of one episode
                                            -- (one shoulder problem = N rules,
                                            -- one lifecycle); NULL for baseline
created_at        INTEGER NOT NULL
updated_at        INTEGER NOT NULL
deleted_at        INTEGER                   -- erasure tombstone only
```

Local CHECKs mirrored by cloud CHECKs on role/source/rule_kind/state.
Indexes: (user_id, state), (user_id, episode_group_id).

Design rules:
- **Append-only in meaning.** A rule is never edited into a different
  rule: changing one = end the old row (`superseded`) + insert the new.
  The only mutations a row ever receives are its ending fields and
  erasure. This is what makes the timeline interpretable (§6.1) and makes
  per-row LWW safe: concurrent edits can only race on *ending*, where
  refuse-stale + latest-wins is acceptable (worst case: an ended
  constraint briefly reads active, which fails SAFE — over-restriction,
  never under-restriction).
- **No read-time sweeps that write.** Date-bound episode expiry is
  evaluated at READ time (like C31) but never lazily stamps rows (the
  Audit C §12.5 sweep-clobber hazard is designed out): an expired-but-
  active row is simply treated as inactive by readers, and the state
  transition to 'ended/expired' is written only by an explicit user-
  visible flow (§22).
- **No severity, no diagnosis, no free text** (CAP-3; R1 L18; v1 scope).
- **Erasure**: deleting capability data hard-deletes all rows (cloud
  delete_user_data extension) and neutralises every derivative marker
  (§6.4). Consent withdrawal for the capability purpose does the same
  without touching the account (CAP-20; R1 L19).

### 5.2 Rule kinds

| rule_kind | rule_value domain | Meaning | Notes |
|---|---|---|---|
| `demand` | one of the §8 demand tags | "build around: no {demand}" | the new expressive power; e.g. `overhead_position`, `standing`, `floor_access` |
| `family` | movement-family key | "avoid this movement pattern" | capability-lane sibling of C31's PATTERN_AVOID; C31 rows stay preference-lane |
| `exercise` | exercise id | "I cannot do this exercise" | distinct from preference EXCLUDED by lane |
| `exercise_allow` | exercise id | "this one works for me" | carves ranks 3-4 (§4.1); the manual-compatibility override the brief required |

### 5.3 `session_constraint_effects` (new; the effective-prescription record)

```
id            TEXT PRIMARY KEY              -- sce_${workout_id}
user_id       TEXT NOT NULL
workout_id    TEXT NOT NULL UNIQUE
effects_json  TEXT NOT NULL                 -- [{slot, exerciseFrom, effect:
              -- 'substituted'|'omitted'|'reduced', exerciseTo?, constraintIds:[...]}]
created_at / updated_at / deleted_at
```
Written once when a session is served/completed with any constraint
effect; empty sessions write nothing. This closes Audit D §Q5 (deviation
provenance) and Audit G C3 (silent removal) for the constraint cause
specifically, without per-set tags (D54/C-3 respected). Adherence (§18)
and the coach (§20) read it; erasure reaches it (Art 9-derived, R1 #19).

### 5.4 Exercise demand metadata (§8) — columns on `exercises` (+ custom),
seeded + backfilled like C32's load_semantics (B§5 template), synced with
the existing exercise pull path.

### 5.5 `exercise_swaps.cause` (one additive column)

`cause TEXT NULL` — `'constraint'` written ONLY when the swap flow was
entered from a constraint notice/blocked state; NULL otherwise. Never
free text. This is the minimum choice-aware-learning provenance (CAP-13)
and mirrors the existing scope column's asymmetric-counting pattern
(C§7.9).

### 5.6 Sync classification

Both new tables enter the REGISTRY (not legacy sync.js): row + module +
cloud refuse-stale trigger, per the weekly_checkins worked example
(consolidated map §8). `capability_constraints`: lww, softDelete true,
bidirectional. `session_constraint_effects`: lww, softDelete true,
bidirectional. Both added to campaign15.stateContract classification, the
local wipe list, export, and delete_user_data. Offline conflict walk in
§28.

---

## 6. EVIDENCE-PROVENANCE MODEL (deliverable 6)

Three mechanisms, matched to the three consumer shapes Audit D §Q4 and
Audit E §Q1 established (recompute / frozen-at-gather / write-once):

### 6.1 Interpretation-time interval join (recompute consumers)

For every consumer that recomputes from raw rows (recovery EMA,
readiness, adapted landmarks, live prescription, PR/plateau detection,
coach context), eligibility is resolved AT READ TIME by joining the
workout's `started_at` (never set `created_at` — D§P-4) against the
constraint intervals active at that time, scoped by affectedness (§6.5).
No set-level tags exist (rejected: the naive global Baseline/Constrained
set tag — register CC-R2). History reinterprets correctly even when
constraint rows arrive late from another device (§28).

### 6.2 Gather-time stamping (the frozen block ledger)

The ledger is computed once and never re-judged (E§7.11), so eligibility
must be decided AT GATHER TIME: `buildBlockLedger` receives, per muscle,
`constrainedShare` (fraction of the block's sessions for that muscle that
fell inside an episode-affected interval) and writes per-entry
`eligibility: 'normal' | 'constrained'`. The per-entry `suppressed`
marker (E§9.1) is the structural precedent; unlike suppression, this is
PER MUSCLE (fixing E§C3) and gates BOTH directions (CAP-12): a
`constrained` entry is skipped by learnedRange, establishedStart,
structure-memory verdicts and seeding, exactly as `deferredToManual`
entries are today (E§13 Q3.3) — the proven no-teaching path. Threshold:
an entry is `constrained` when constrainedShare > 0.25 (a quarter of the
muscle's sessions; below that the block is substantially normal — the
red team is invited to attack this number; it is a lead ruling, register
CC-D9).

### 6.3 Write-time cause capture (user actions only)

`exercise_swaps.cause` (§5.5) and `session_constraint_effects` (§5.3).
Nothing else is stamped at write time. The skip flow stays reason-free
(the founder's "an unstated reason is UNKNOWN" law, G§7.14, is kept;
restriction-aware adherence comes from the effective prescription, not
from interrogating the user).

### 6.4 Derivative markers and erasure

Every derivative that mentions constraint context (`eligibility` on
ledger entries, `session_constraint_effects`, `exercise_swaps.cause`) is
reachable by capability erasure: effects rows are deleted; ledger
`eligibility:'constrained'` values are rewritten to `'unknown'` (which
consumers treat as not-eligible-to-teach — conservative, and no longer
health-revealing); swap `cause` is nulled. R1 L7/L8 confirm the residual
posture with counsel.

### 6.5 Affected scope (deterministic)

An episode's affected scope is derived, never guessed: the set of
exercises whose demands/family/id match its rules (via §8 metadata), and
the set of muscles reached by those exercises (primary + secondary via
the existing allocator, E§10 C5). A session is affected for muscle M if
it fell in the interval and M is in the episode's muscle scope. This is
what makes per-muscle eligibility (shoulder episode: delts/chest/triceps
constrained, quads normal) mechanical.

---

## 7. LEARNING-ELIGIBILITY MATRIX (deliverable 7 — MANDATORY)

Contexts: **BN** ordinary training, no relevant constraint or
baseline-only (CAP-1: identical treatment, deliberately one column);
**EA** episode-active, affected scope; **EU** episode-active, unaffected
scope; **RI** reintroduction window (§23); **PB** post-episode /
returned to baseline; **CF** chronic flare (= EA of a flare episode).

Values: **F** fully eligible · **C** contextual (usable with the stated
qualifier) · **I** ineligible · **n/a**.

| Consumer (evidence site) | BN | EA | EU | RI | PB | CF | Qualifier / mechanism |
|---|---|---|---|---|---|---|---|
| Recent performance recall — C20 resolver (D§13Q4) | F | C | F | C | F | C | C: history assembled per exercise; an affected exercise's constrained sessions stay VISIBLE (comparable:false) but out of LEARNING, via the resolver's existing comparability stage; unaffected exercises untouched |
| Recovery EMA / readiness (D§5.2) | F | F | F | F | F | F | Systemic recovery is real regardless of cause; no gating (P2 fan-out is a recorded pre-existing issue) |
| Session adjustments (COMP-015) | F | C | F | C | F | C | C: adds suppressed for affected muscles (effective ceiling §15); holds/reductions unaffected |
| Live-prescription LEARNING (load steps) | F | C | F | C | F | C | as row 1; DROP/HOLD still allowed (safety direction open) |
| Plateau detection (E§2.5) | F | I | F | I | F | I | I: affected exercises' constrained sessions excluded from plateau windows (a "plateau" under restriction is not a plateau) |
| Estimated strength / e1RM trends (displays, recompReframe) | F | C | F | C | F | C | C: display continues (historical truth) with contextual annotation where surfaced; no durable state |
| PR detection (E§2.4) | F | F | F | F | F | F | PRs remain PRs (CAP-14); a constrained period simply produces few; no separate universes (register CC-R6) |
| Exercise preference — swapEvidenceFor / repeated swaps (C§3.1) | F | I | F | C | F | I | I: cause='constraint' swaps excluded from preference evidence; C(RI): substitute evidence earned during episode ranks contextually only while the episode/RI is live |
| Slot defaults (approvedDefaultFor) | F | I | F | C | F | I | A default accepted under constraint is episode-scoped, not durable (stored as allowance-adjacent, offered again for confirmation at PB) |
| Movement avoidance learning (repeated-swap → offer) | F | I | F | I | F | I | Never offer durable avoidance from forced behaviour |
| Exercise-slot verdicts (blockAdvisor/programmeEpoch) | F | I | F | I | F | I | Affected slots read KEEP + reason capability, not evidence-judged |
| Adherence — weekly ratio (G§2.4) | F | C | F | C | F | C | C: denominators use the EFFECTIVE prescription (§18); within it, fully eligible |
| EXECUTION limiter (G§2.5) | F | C | F | C | F | C | C: shortfalls explained by constraint effects reclassify as CONSTRAINED (§20), never 'sessions_missed' |
| Session resolution semantics | F | F | F | F | F | F | Two values unchanged; meaning derives from effective prescription |
| Block ledger classification (E§6.2) | F | I | F | I | F | I | Per-muscle `eligibility:'constrained'` → INSUFFICIENT-like: judges nothing, teaches nothing, erases nothing (E§7.7 semantics) |
| learnedRange fold (ceiling/floor/establishedStart) | F | I | F | I | F | I | Constrained entries skipped like deferredToManual |
| Block seeding (blockSeed/buildSeedRanges) | F | I | F | I | F | I | Constrained entries invalid as seed source; falls through the existing chain (repeat numbers / learned / profile / research) |
| Inter-block response + rebound windows | F | I | F | I | F | I | as ledger |
| Adapted landmarks (E§2.1) | F | I | F | I | F | I | Affected (muscle, session) rows excluded from the 8-window at compute time (recompute — cheap); window self-heals at PB |
| Programme structure memory (E§13 Q2e) | F | I | F | I | F | I | Blocks with any constrained entry excluded from structure verdicts (a split cannot be judged by a constrained run of it) |
| Weekly coach performance score / volume matrix | F | C | F | C | F | C | C: affected muscles held at no-change with capability copy; unaffected muscles coached normally (needs the per-muscle seam, §20) |
| Coach intervention/outcome memory | F | C | F | C | F | C | C: outcomes measured during an episode marked CONFOUNDED (existing state, F reusable #6) |
| Effective-maintenance memo (nutrition) | F | F | F | F | F | F | Nutrition evidence stays authoritative (brief; anti-causal law); training context never adjusts calories |
| Demonstrated-structure generation input | F | I | F | I | F | I | via structure memory |
| Insights/analytics surfaces (retired or display-only, L) | F | C | F | C | F | C | Display with context where surfaced; no durable state |
| Partner signal / widget / share surfaces (L hidden consumers) | F | C | F | C | F | C | C: counts computed against effective prescription (§18); no health content ever exported (§26) |

Why this shape: BN=F everywhere is CAP-1 (the disabled-user column IS
the normal column). The EA column implements CAP-12/13 with the two
proven no-teach mechanisms (comparability stage; deferredToManual-style
skip). EU=F is the per-muscle granularity today's global suppression
lacks (E§C3). RI mirrors EA until exit criteria (§23). PB=F with
self-healing windows (adapted landmarks) and fresh accumulation
(learned range) — recovery of the protected baseline, not of the
constrained period.

---

## 8. EXERCISE-DEMAND ONTOLOGY (deliverable 8)

### 8.1 The vocabulary rule

ONE closed set of functional-demand tags, shared verbatim between
exercise metadata (what a movement asks of the body) and constraint
rules (what the user has asked Volyume to build around). Resolution is
then set intersection and explanations are mechanical (H4, confirmed).
The four existing movement vocabularies (C§13.6) are NOT extended or
renamed — families remain the stimulus taxonomy; demands are a new,
orthogonal axis set. No fifth loose vocabulary: demands are constants in
one module with a decoder, like familyTargetKey (C§9.3 pattern).

### 8.2 The nine axes (each justified by a deterministic decision)

| Axis | Values | User restriction it serves | Decision it drives |
|---|---|---|---|
| `position` | standing / seated / lying / kneeling / mixed | "I can't train standing" / "seated works for me" / "no kneeling" | eligibility; seated-compatible library browse |
| `floor_access` | true/false | "I can't get down to or up from the floor" | eligibility |
| `overhead_position` | true/false | "avoid overhead work" | eligibility (the canonical shoulder case) |
| `grip_demand` | none / supportive / bar | "I can't grip a bar" / limited grip | eligibility; strap/implement guidance later |
| `unilateral_loadable` | true/false | one-side training required or preferred | selection for limb difference; RI design |
| `bilateral_upper` | true/false (needs both arms) | "I train with one arm" | eligibility |
| `bilateral_lower` | true/false (needs both legs) | "I train with one leg" / seated users | eligibility |
| `axial_load` | true/false (spinal compression under load) | commonly clinician-restricted | eligibility |
| `impact` | true/false | "no jumping/impact" | eligibility |
| `balance_demand` | supported / stable / high | "I need external support" | eligibility for balance-limited users |

(Ten columns listing nine axes plus position's enum.) Each axis maps 1:1
to an onboarding/settings card (§11). REJECTED axes (register CC-R8):
breathing/IAP demand, neuromuscular-control demand, vestibular demand,
per-joint ROM degrees, eccentric demand — no deterministic product
decision consumes them and several drift clinical (brief's
minimal-orthogonal instruction).

### 8.3 Storage and derivation

Columns on `exercises` (and served for custom rows): nullable = UNKNOWN.
Seed coverage comes from a derivation script in the C32 backfill mould
(B§5): high-precision rules only (equipment category → grip/balance;
movement pattern + muscle → position/overhead/axial for unambiguous
classes; curated name lists for the rest), everything ambiguous left
NULL, followed by a reviewed curation pass over the 552 rows (the
implementation campaign carries the coverage targets; ROADMAP). The
existing derivations that Audit B graded reliable (equipmentCategory,
laterality regex) inform but do not silently populate: every derived
value is materialised at seed time so behaviour never depends on a
runtime regex.

### 8.4 Unknown policy (CAP-8)

Tri-state per axis: required / not-required / NULL. Automatic surfaces
treat NULL-on-a-constrained-axis as ineligible with reason
`capability_unknown` and distinct copy ("Volyume doesn't know yet
whether this movement involves {axis label}; you can still add it
yourself"). Manual paths always work. An `exercise_allow` row clears the
unknown for that user+exercise. Custom exercises: when (and only when)
the user has an active constraint on an axis, the creation form asks
that ONE axis as an optional third question (progressive disclosure —
never a biomechanics exam); unanswered stays NULL and the exercise
remains fully manually usable, per B's evidence that custom rows get no
derived metadata today.

### 8.5 Validation

Metadata invariants get their own suite: closed value domains; no
contradictions (seated + floor_access, standing-position with
balance 'supported' allowed — table of legal combinations in the
implementation spec); coverage floor per axis before any marketing
claim relies on it (ROADMAP coverage registry).

---

## 9. CONSTRAINT / ELIGIBILITY RESOLVER (deliverable 9)

### 9.1 Shape

A pure module `src/lib/capability/resolve.js` mirroring the C31 read
layer's proven contract (one loader, pure questions over a state
object — C§9.1):

- `loadCapabilityState(userId, {atMs})` — single IO point; returns
  `{constraints, allowances, unavailable}`.
- `demandConflicts(state, exercise)` → `[{constraintId, axis|family|id, source}]`.
- `isCapabilityEligible(state, exercise)` → boolean (ranks 2-4 of §4.1).
- `capabilityBlockReason(state, exercise)` → first-match reason
  (§4.1 order) or null.
- `affectedScope(state)` → {exerciseIds, muscles} (§6.5).
- `resolveEffectiveTargets(state, plannedByMuscle, compatibleVolumeByMuscle)`
  → effective ceilings (§15).

### 9.2 Insertion points (all existing seams; no engine rewrite)

1. **Pre-engine**: `filterLibraryForGeneration` gains the capability
   check alongside intent, same drop-report contract (A§9.3).
2. **Post-engine**: `resolveSeed`'s `generationBlockFor` re-check gains
   the capability arm (closes the POOL-fallback hole for capability as
   C31 closed it for intent).
3. **The senior question**: `isEligibleExercise` composes capability +
   intent — every existing caller (16 sites, C§9.1) inherits it
   (the superset property, C§9.6). The three id-level-blind readers and
   the Recent rail (C§10.8/10.9) are upgraded to the senior question in
   the same campaign.
4. **Session layer**: the C20 resolver packet gains
   `constraintContext` (affected? effective ceiling?) at the
   comparability/assembly stage; sessionAdjustments reads the effective
   ceiling.
5. **Library/browse**: plan compatibility is COMPUTED from plan
   contents vs state (no curated capability tags to rot; A§10.6 showed
   tags would not even survive installation). Install-time conflict
   check uses the senior question (fixes A§11.8).
6. **Builder/picker**: default-on capability filter with a
   "show anyway" toggle (the existing showExcluded pattern) and
   explanation rows.

### 9.3 Determinism and performance

Same inputs → same output everywhere (pure functions; the loader is the
only IO). Cost: state is a handful of rows; demand checks are field
comparisons. The picker memoises per state hash (the existing intent
pattern); generation already passes one filtered library through.
No graph traversal exists to optimise.

### 9.4 Manual conflict flows (CAP-6/7)

- Self-declared conflict, manual add: inline warning naming the
  constraint + two actions: "Add anyway (just this plan)" (no state
  change, conflict badge persists) / "This one works for me" (writes
  `exercise_allow`).
- Clinician-reported conflict, manual add: blocked with "Your
  restriction says {rule}. If that's changed, update it first" →
  one-tap route to the restriction editor; ending it there requires the
  explicit "My restriction has changed" confirm. No inline override.
- Unknown-demand conflict: add allowed with the unknown copy + optional
  "record that this works for me".

### 9.5 No-compatible-option (CAP-9)

Extends the existing blocked-slot machinery (A§2.7): a slot with no
capability-eligible candidate is OMITTED and reported in
`blockedSlots`-style detail (reason class capability), with the actions:
suggest with unknowns shown / pick manually / create a custom exercise /
accept the reduced session. Whole-muscle emptiness feeds §15's honest
volume statement. Generation aborts only when EVERYTHING is blocked
(existing plan_blocked_by_exclusions semantics, now with capability
reasons distinguished).

### 9.6 Failure posture (CAP-17)

`loadCapabilityState` failure returns `unavailable: true` with the LAST
KNOWN in-memory state if one exists this session; surfaces then behave
normally on that state. With NO known state: automatic suggestion
surfaces show the capability-unavailable notice and offer "hold
suggestions" vs "continue without capability filtering" — an explicit
user choice, never a silent fail-open (sharpening D109-2 for the
inverted harm direction the C31 spec itself flagged, C§13.4). Logging is
never blocked by any of this.

---

## 10. RANKING AFTER ELIGIBILITY (deliverable 10)

Unchanged in structure: eligibility gates, then the existing structural
ranking (swapEngine) and personalisation (rankPersonalised tiers,
maturity weighting — C§7C). Two additions:
1. Substitution ranking for a constraint-blocked slot prefers
   same-family, then same-muscle-role candidates via the existing
   COVERAGE_ROLES machinery (A§9.6) — "covers the job" beats "same
   movement" when the movement itself is the problem.
2. Contextual substitute evidence (§7 preference rows): evidence earned
   during an episode carries the episode id and ranks only while that
   episode (or its RI window) is live.
Compatibility never implies quality: a technically-eligible candidate
still passes every existing quality gate before it ranks (CAP-9's
no-junk rule; the never-starve gates remain preference-level BELOW
capability in §4.1).

---

## 11. INCLUSIVE ONBOARDING UX (deliverable 11)

### 11.1 Placement

One optional step in BOTH paths, before first plan selection/generation:
- Free: a new card in FreeStarterScreen's short flow ("Anything Volyume
  should build around?") — the free path finally persists something,
  into `capability_constraints`, not the profile blob (A§11.4 makes the
  blob unusable).
- Pro: a new step in ProOnboardingScreen between Training week and
  Targets (touches TOTAL_STEPS/STEP_LABELS + draft clamp + the sexGate
  suite — a pinned-contract change done under its guards, A§11.14).

### 11.2 Flow (structured cards first; no free text — decision CC-D13)

1. Entry: "Anything we should account for when building your training?"
   — options: "Nothing in particular" (default, one tap, zero friction) /
   "Yes, let's set that up" / "Later" (skip is first-class; the settings
   surface is named in the skip copy).
2. Consent moment (only on "yes"): the granular capability consent
   (§26.2) in one calm screen.
3. Functional cards (multi-select, plain language, no diagnosis ask):
   "I train seated / can't train standing" · "Getting to the floor
   doesn't work for me" · "I train with one arm / one leg" (side
   picker) · "Grip is limited" (bar-grip axis) · "No overhead work" ·
   "No spinal loading" · "No impact/jumping" · "I need support for
   balance" · "Specific exercises I can't do" (picker) · "A clinician
   has given me restrictions" (marks selected rules
   clinician_reported + optional end date).
4. Durability: one question per selection group — "Is this how you
   train generally, or a temporary thing right now?" → role
   baseline/episode (episode → optional end date).
5. Confirmation: a plain-language readback ("Volyume will build your
   training seated, without overhead work…") + edit affordance.

Wording is DRAFT for the copy pass; the structure is the decision.
Free-text-first was rejected (CC-R4): deterministic mapping, privacy
(R1 L18), and cognitive load all favour cards; nothing stops a later
assisted-entry layer that must still land on structured confirmation
(brief's determinism law).

### 11.3 First-plan integration

Free: starter recommendation + library browse become
capability-computed (§9.2.5) so the first offered routine is compatible
on day one. Pro: generation runs with the capability filter active from
the first build; blocked-slot reporting surfaces during preview.

---

## 12. SETTINGS / HEALTH UX (deliverable 12)

New surface "Movement & capability" (free tier, CAP-19), distinct from
SettingsHealthScreen (device integrations — name collision checked):
- Baseline list (edit = supersede; end).
- Active temporary restrictions with time remaining / "until you end
  it", end + "this has become how I train" (promotion, §24) actions.
- Add flows = the onboarding cards.
- History (ended constraints, read-only) — no hidden stale state; an
  expired-but-unconfirmed episode shows as "waiting for you to confirm"
  (§22).
- Links: the preference list (AvoidedMovementsScreen) cross-references
  here and vice versa, with one sentence distinguishing the lanes
  ("Things you'd rather not do live under Plan tools").
- Data controls: view/export/delete capability data + consent
  withdrawal (§26).

---

## 13. INITIAL PLAN GENERATION (deliverable 13)

Already §9.2.1-2: capability joins equipment in the hard pre-engine
class; structural floors and SUBREGION_REQUIREMENTS coverage roles
operate on the filtered pool and may under-deliver honestly (§15). The
"safe to perform" whyThis sentence is replaced by capability-aware
honest copy (CAP-18). Demonstrated-structure input is already
eligibility-filtered by §7. The generator gains NO new inputs beyond
the filtered library + effective ceilings — the engine stays pure
(A§7.7 law preserved).

---

## 14. EXISTING-PLAN ADAPTATION (deliverable 14)

When an episode is created with an installed plan active:
1. Volyume computes a PROPOSED effective diff per affected slot:
   UNCHANGED / TEMPORARILY REPLACED (best-ranked eligible substitute) /
   TEMPORARILY OMITTED (no good option) / REDUCED (effective ceiling
   bites), with per-line reasons.
2. The user Applies/Declines the diff as a whole or per line
   (consequential-change approval, CAP-11; micro-approvals avoided by
   grouping to slots).
3. Applied lines live as the effective view (rendered in Today/logger
   with quiet "temporary" markers); the BASE plan rows are untouched;
   declining leaves slots visibly conflicted with swap shortcuts (the
   existing pattern-avoid notice pattern, D§9).
4. Ending the episode retires the effective view (§23) — nothing to
   "restore" because nothing was overwritten.
Library installs and manual builds under an active episode run the same
conflict surfacing at install/build time (§9.2.5-6).

---

## 15. VOLUME AND PROGRESSION UNDER CONSTRAINT (deliverable 15)

- Per muscle: `compatibleVolume` = quality-eligible deliverable weekly
  sets from the filtered pool (computed with the existing allocator
  semantics). `effectiveTarget = min(plannedTarget, compatibleVolume)`.
- Landmarks are NOT rewritten (no capability-adjusted MEV/MRV — those
  numbers stay research/learned/manual per the two resolvers, E§C4);
  the effective ceiling is applied at the consumption points:
  generation's floors/caps stage, sessionAdjustments' allocation, coach
  volume proposals (§20). Under-delivery renders the honest line:
  "{Muscle} is below its usual range while your restriction is active —
  Volyume won't add lower-quality work to hit a number" (copy pass to
  finalise; no em dash in shipped copy).
- No volume debt (CAP-10; register CC-R1): ending an episode triggers
  §23's ramp, never repayment.
- Progression: the C20 resolver behaves per §7 row 1; affected-muscle
  session adds are suppressed (extends the founder's no-adds-under-
  senior-states ruling, D§2.7/F#other); DROP/HOLD always available.
- Intensity-preservation guidance (R3 §6.5: protect relative load when
  volume is cut) shapes substitute prescription defaults where
  compatible — recorded as design intent, with no numeric law.

## 16. ASYMMETRY / LATERALITY MODEL (deliverable 16)

v1 (this workstream): laterality on constraints; bilateral_upper/lower
+ unilateral_loadable demands; selection prefers unilateral-loadable
variants under one-side constraints; explanations name the side;
load_semantics per_hand continues to define entry meaning (C32).
NOT in v1: per-side rep/RIR logging and per-side progression. D54
reversed per-side rep divergence as ED-adverse with a guard suite
(D§C-2); the amendment's "unilateral logging needed for correct
logging" is satisfied for one-limb users by unilateral EXERCISES logged
normally (per_hand semantics carry the load meaning; R3 §4.6: no
per-side↔bilateral arithmetic exists to justify dual-entry). The narrow
residual question — whether a declared permanent one-side user should
get optional per-side capacity logging on bilateral-capable movements —
collides with D54 and goes to the FOUNDER with a recommendation
(register CC-F2: recommend NOT reopening in this workstream; unilateral
variants serve the need without the ED-adverse surface). Asymmetry is
never pathologised (CAP-21).

## 17. WORKOUT UX (deliverable 17)

- Pre-workout: sessions with active effects show one quiet line in the
  pre-workout sheet ("Today's session works around your current
  restriction") — no badge parade (CAP-2).
- In-workout: the status strip (the sanctioned surface, D§C-1 — the
  retired set-card provenance line is NOT re-added) carries the
  constraint notice with the Swap shortcut, as pattern-avoid does
  today; swap sheets rank per §10; a swap from the notice writes
  cause='constraint'; blocked exercises show the §9.4 flows; removal of
  an affected exercise writes a session_constraint_effects omission
  (closing G§C3's silent path for the constraint case).
- Mid-workout "this movement is a problem today": the exercise-level
  sheet gains one entry — "Work around this" → substitute now (+
  optionally start/extend an episode via the standard flow). No pain
  scales, no per-set questions (D§C-3; R2 rows 6-8: raw logging fine,
  symptom analytics not).
- Post-workout summary: unchanged questions (CAP: no new
  questionnaires); if constraint effects occurred, the summary's quiet
  line links to the restriction if the user wants to change it.

## 18. ADHERENCE SEMANTICS (deliverable 18)

The elegant fix for G§C1-C4/C9: **denominators read the effective
prescription.**
- `getWeeklySessionStats.planned` counts effective sessions (a session
  fully omitted by an applied effective diff reduces planned);
  per-exercise omissions make a session count COMPLETED when everything
  effectively prescribed was performed (session_constraint_effects
  supplies the facts; the Time-Crunch forgiveness pattern generalised
  and made durable, G§C4).
- ended_early remains ended_early when the user stops beyond effective
  scope; the two-value resolution enum is UNCHANGED (no reason field —
  G§P2's founder stance preserved; the reason lives in the effective
  record, not in an interrogation).
- interBlock's per-muscle adherence compares against effective planned
  sets (its INSUFFICIENT_DATA behaviour then fires only for genuine
  evidence thinness, and §7's eligibility handles the rest).
- The directive copy set (G§C7) becomes constraint-aware at its data
  source: the ratio those strings render is the effective one, and the
  stabilise gate (G§C6) reads it too — a constrained-but-adherent week
  no longer locks out coaching.
- Partner/widget/billing surfaces (L) inherit the effective counts
  automatically since they read the same stats function.

## 19. WEEKLY CHECK-IN (deliverable 19)

Minimal delta (do not turn the check-in into a questionnaire):
- No new standing questions. The existing joint-pain question stays
  as-is.
- When an episode is ACTIVE, one conditional question replaces the
  generic joint question for that week: "How did training around your
  restriction go this week?" — options: fine / it got in the way more
  than expected / mostly didn't come up (draft copy). It updates ONE
  thing: the episode's weekly note in the coach context (hold vs
  suggest-reviewing-the-restriction) — it never auto-modifies
  constraints, never infers deterioration curves (deterioration
  asymmetry beyond hold-vs-escalate-block is CLINICAL-REVIEW territory,
  register CC-C2).
- The self-generated duplicate-signal defect (F#3: the app's own
  "Joint pain flagged" sentence re-parsed as an injury flag) is fixed
  in the coach campaign (recorded; mention-don't-fix now).

## 20. COACH INTEGRATION (deliverable 20)

Entry points (from F's seam map):
- `buildCoachContext` gains a `physicalConstraint` fact (existing fact
  vocabulary with scope + provenance, G§9.4) carrying: active episode?,
  affected muscles, effective ceilings, weekly conditional answer.
- `classifyTrainingLimiter` gains **LIMITER.CONSTRAINED**, classified
  BEFORE execution/progress when the week's shortfall or regression is
  within the affected scope (exact conditions in the implementation
  spec; C21's oracle and rule count are extended, not bypassed —
  the graph docs get a drift-managed update, F§doc-drift).
- Under CONSTRAINED: interventions cap at EXPLAIN +
  exercise-substitution offers for affected slots; volume adds blocked
  for affected muscles (unaffected muscles coach normally — requires
  the per-muscle application path that computeDeloadVolume already
  demonstrates, F reusable); copy explains the why from the constraint
  rules (CAP-18).
- coachApply re-checks eligibility at Apply time (proposals staled by a
  new constraint re-resolve rather than apply blind).
- The inert anti-causal `neverClaim` list (F#4) is wired or retired in
  the coach campaign — flagged, not silently inherited.
- The F#6 misread (restricted shoulder → +1 set everywhere,
  auto-applied) is closed by the CONSTRAINED limiter + §15 ceilings.

## 21. CHRONIC / FLARE MODEL (deliverable 21)

Baseline rules hold the stable state; a flare is an ordinary episode,
usually created from a saved shape: ending an episode keeps its rule
set addressable ("Start this again" from the Movement & capability
history — one confirm, correct dates, no re-entry of every card). This
is the low-friction repeated-update path chronic users need without a
magic toggle that hides state (brief's scepticism of the one-tap flare
adopted: the affordance is fast, but the state is always explicit and
inspectable). Fluctuating capability that changes what BASELINE means
is handled by editing baseline (supersede), not by permanent episodes.
No prediction of flares (CAP-22; R2 row 15).

## 22. EPISODE STATE MACHINE (deliverable 22)

States (per episode_group):
`ACTIVE` → (`planned end reached`) → `AWAITING_CONFIRMATION` →
(`user: ended`) → `ENDED/RESOLVED` → optional `REINTRODUCTION` window
(§23, a phase of ENDED, not a stored state) …
plus from ACTIVE: `user extends` (supersede end date), `user ends
early`, `user promotes` (§24 → baseline rows; episode ENDED/PROMOTED).

Transitions are user-visible actions only. AWAITING_CONFIRMATION is the
read-time-derived state for a date-bound episode past its end
(constraints STILL APPLY — fail safe — until the user confirms
"ended" or extends; the confirm prompt appears on Today/settings, never
a modal ambush). No lazy write-backs (§5.1). The richer PROTECT →
MODIFIED → IMPROVING ladders from prior models are REJECTED as v1
product states (CC-R9): they imply symptom-tracked recovery phases the
evidence says not to automate (R3 CR-8); the honest machine is
active/awaiting/ended + the RI window.

## 23. REINTRODUCTION MODEL (deliverable 23)

On episode end (user-confirmed):
1. Eligibility restores instantly (selection/browse/coach).
2. LOADS: nothing to restore — the C20 resolver's stale-history
   semantics already resolve a returning movement conservatively
   (45-day window → FIRST_TIME_BAND / INSUFFICIENT_EVIDENCE, E§13 Q5
   path 9 verified NOT contaminated). If comparable history still
   exists (short episode), the resolver's normal gates apply. NO fixed
   percentages, NO detraining formula (R3 §1.6/§2.5; register CC-R3).
3. VOLUME: affected muscles ramp from current effective volume toward
   the protected baseline target using the existing seeded-ramp
   machinery (buildSeededWeeklyTargets pattern) across the remaining
   block; at the next block boundary, seeding uses the PRE-EPISODE
   protected state (which §7 kept clean) via the normal chain.
4. The RI window (a derived interval, default = the ramp's duration)
   keeps §7's RI column semantics: still no durable teaching from
   affected scope until the window closes — first sessions back are
   re-familiarisation, not baseline evidence (mirrors blockMetrics'
   isNew discounting philosophy, E§Q4).
5. Explanations: "Rebuilding {muscle} gradually after your restriction
   ended" — trajectory copy, no promises, no timelines (CAP-22).
"Reintroduction as a controlled experiment" with explicit
symptom-checked gates is DEFERRED to clinical review (CC-C3): its
entry/exit criteria would be symptom-keyed (R3 CR-8). The shipped
model is the defensible subset: conservative, transparent,
user-directed.

## 24. TEMPORARY → DURABLE TRANSITION (deliverable 24)

"This is how I train now" (settings action on an active or awaiting
episode): ends the episode (`promoted`) and creates baseline rows with
the same rules (new rows, new starts_at). Effects:
- Future evidence is baseline-normal (CAP-1) from promotion forward.
- HISTORY IS NOT RE-JUDGED: constrained-period ledger entries stay
  ineligible; the learned range rebuilds from post-promotion blocks
  (the effective-maintenance revalidation-marker pattern is the
  precedent for context-change-invalidates-old-learning, E§9.7).
  Retrospective promotion of episode evidence was REJECTED (CC-R10):
  Audit E's fold rules make selective re-folding unsound (frozen
  ledgers, monotone floors), and the episode period typically mixes
  severities (brief's own warning).
- The plan: the user is offered a rebuild/adjust against the new
  baseline (normal generation under the now-baseline constraints);
  nothing silently rewrites.

## 25. SAFETY BOUNDARY (deliverable 25)

The product DOES: build training around user-declared functional
constraints; substitute, reduce, omit with explanations; hold learning
under episodes; support conservative user-directed returns.
The product does NOT: diagnose, treat, rehabilitate, grade severity,
rank likelihood, predict recovery or tolerability, prescribe
condition-specific programmes, or interpret pain reports as tissue
signals (R3 CR-1..8; R2 rows 9/15/16).
RED-FLAG posture: wherever the user describes acute-trauma-shaped
situations in the flows we control (episode creation offers no such
inputs by design — no free text), the surface carries the standing
line: training-around support only, "if something serious has happened,
a professional needs to see it" (copy via clinical review, CC-C1). The
app can SUSPEND automatic adaptation per-episode by the user's choice
("just hold my plan") — a state where Volyume proposes nothing and
waits. Trigger vocabularies for automatic escalation are CLINICAL
REVIEW items, not shipped logic.
Module boundary: all capability logic lives in `src/lib/capability/`
with typed interfaces at the §9.2 seams, satisfying R2 E11's
separable-module instruction should any future feature cross the line.

## 26. PRIVACY MODEL (deliverable 26)

- Classification: the capability lane is treated as Article 9
  end-to-end (R1 table rows 1-5, 11, 18-20); the preference lane stays
  ordinary data by structural separation (CAP-4).
- Consent: a SEPARATE granular explicit-consent record for the
  capability purpose (own CONSENT_VERSION line, own consent_log rows
  via the record_health_consent RPC pattern; pendingConsent handles
  round-trip failure). Withdrawal disables the feature and erases the
  lane WITHOUT closing the account (R1 L5/L19). The existing gate is
  untouched.
- Minimisation: no diagnosis, no free text (v1), closed vocabularies
  only; expired/ended rows enter a retention review clock (period set
  with counsel, L7) rather than living forever.
- Telemetry: NO per-user capability events (R1 #12). Debug
  observability uses §29's aggregate counters only.
- Sentry: capability state and rule values are excluded from
  breadcrumbs/payloads by construction and pinned by a scrub guard test
  (sentryScrub gains the allow-list entries; R1 L11).
- Export: capability rows join the export surface (Art 20 portability,
  R1 #22); erasure per §6.4 + cloud delete_user_data extension.
- DPIA before launch (R1 L12) — founder-side action recorded on the
  board when the first implementation campaign opens.
- Share cards: capability data is banned content on every card
  (extends the existing GDPR card rules).

## 27. ACCESSIBILITY MODEL (deliverable 27)

Scope for THIS workstream (the app-operation half of Amendment §6):
- The new surfaces (onboarding cards, Movement & capability, diffs,
  notices) ship accessible from day one: labels/roles/state on every
  interactive element, WCAG 2.2 target sizes, no gesture-only paths,
  Dynamic Type-safe layouts, screen-reader announcements for
  state changes using per-platform mechanics (R4: iOS lacks live
  regions — announceForAccessibility on iOS, liveRegion on Android).
- Direct barriers audit of the CORE OPERATION path (Today → start →
  log → rest timer → finish): the rest timer's sound+haptic+visual
  channels verified and made redundant-cue complete (1.3.3); logger
  steppers get the adjustable-trait pattern; drag/long-press-only
  interactions on the core path get button alternatives (R4 checklist
  applied). The FULL per-screen a11y audit + remediation is its own
  implementation campaign (ROADMAP) — this workstream fixes the
  feature-path barriers, not the whole app (brief's boundary).
- EAA/EN 301 549 applicability = legal review (R4/R1 L15).
- Cognitive: onboarding cards follow COGA basics (one idea per card,
  no memory burden, plain language, error tolerance).

## 28. SYNC / OFFLINE MODEL (deliverable 28)

- Both new tables ride the registry (contract per consolidated map §8)
  with cloud refuse-stale triggers; soft-delete tombstones.
- Interval interpretability under conflict (the brief's device A/B
  scenario): device A logs workouts under a restriction it holds
  active; device B ends the restriction online. Because rows are
  append-only-in-meaning and ending is monotone (active→ended with
  ended_at), LWW converges on ended; device A's workouts INTERPRET
  correctly forever because §6.1 joins on the interval
  [starts_at, ended_at], and ended_at (B's confirm time) postdates A's
  sessions. The reverse race (A re-creates while B ends) yields two
  rows (new id) — no clobber by construction. The C31 sweep-clobber
  class is designed out (§5.1 no read-time writes).
- Late-arriving constraint rows: recompute consumers self-correct at
  next read (§6.1); the frozen ledger computes at block end — if a
  block's ledger was computed before a backdated episode row arrived,
  the entry's eligibility is stale. Mitigation: ledger computation
  records the capability watermark it saw; the backfill path
  (backfillMissingBlockLedgers) recomputes eligibility-only for
  entries whose watermark predates the row (eligibility is the ONE
  field exempt from the never-recompute law, because it is provenance,
  not judgement — register CC-D17; guard-tested).
- Offline creation of constraints works fully (local-first); push on
  save + queued retry as everywhere.

## 29. OBSERVABILITY (deliverable 29)

Debug without health surveillance (R1 #12 constraint):
- NO per-user capability events. Operational counters are aggregate
  and content-free, emitted as existing engine telemetry with counts
  only: `capability_resolution_no_candidate` (count/day),
  `capability_state_unavailable`, `capability_unknown_metadata_hit`
  (axis-level count, no exercise ids tied to users),
  `effective_diff_applied|declined` (counts). Threshold/suppression
  review with counsel before any dashboard (R1 L10).
- On-device diagnostics (never transmitted): the resolver can render
  its own decision trace in the Engine Log pattern for the user's own
  transparency (CAP-18's explainability is user-facing, not
  analytics).
- Sentry: capability-adjacent code paths log ERROR-class events with
  scrubbed payloads only (§26).

## 30. MIGRATION PLAN (deliverable 30)

All additive; nothing rewrites history (CAP-14):
1. Local PRAGMA migrations: capability_constraints,
   session_constraint_effects, exercises demand columns,
   exercise_swaps.cause.
2. Cloud migrate_NNN files (one per concern, standard headers,
   founder-gated application as ever): the two tables + RLS +
   refuse-stale triggers; exercises/custom_exercises demand columns;
   exercise_swaps.cause; delete_user_data extension; consent purpose
   addition.
3. Seed/backfill: demand derivation script + curated pass (§8.3) —
   local seed + cloud backfill in the C32 mould.
4. NO migration touches exercise_intent rows (existing merged rows
   stay preference-lane; their Art 9 posture is legal-register L3, not
   a data rewrite).
5. Existing users: zero behaviour change until they add capability
   data (activation explicit; the brief's compatibility law). Rollback:
   feature-inert if tables are empty; columns additive.

## 31. TEST ARCHITECTURE (deliverable 31)

- Unit: resolver purity/determinism (same-state byte-identical
  outputs, the campaign9 identical-writes pattern); demand-vocabulary
  closure; state machine transitions; affected-scope derivation.
- Contract: the §7 matrix AS A SUITE — every consumer × context cell
  that says I/C gets a pinned test against the REAL mechanism
  (learnedRange skip, gather eligibility, preference exclusion,
  effective denominators, CONSTRAINED limiter), in the C21
  oracle-extension style.
- Contamination replay: the Audit E §Q5 six-week scenario as an
  end-to-end fixture — constrained block in, assert: ledger entry
  constrained; learned ceiling/floor/establishedStart unchanged;
  structure memory unchanged; next-block seed unchanged; unaffected
  muscles progress. This is the campaign's definitive regression
  proof.
- Guard tests (founder-law pins): CAP-19 tier-blindness (gate-site
  sweep); CAP-4 lane separation (source guards both directions);
  CAP-17 fail-closed surfaces; wording guard for the R2 blacklist in
  user-facing strings; share-card capability ban; Sentry scrub
  allow-list.
- Sync: registry-contract suite for both tables (push/pull/tombstone/
  refuse-stale; the A/B interval walk of §28 as a replay test);
  stateContract classification.
- Migration-window suites bumped per the established pattern; C31's
  unpaid behavioural test debt (C§8.2) is paid in the campaign that
  first touches those call sites (listed in ROADMAP CC27).
- Property/fuzz: resolver over randomized state/metadata (no throws,
  monotone: adding a constraint never ADDS eligibility except via
  allowances).
- Accessibility: automatable checks on the new surfaces (labels
  present, target sizes) in the guard style.

## 32. DECISION REGISTER

DECISION-REGISTER.md carries: confirmed facts, the CC-D architectural
decisions, CAP laws, CC-R rejections, deferrals, and the three review
registers (clinical, legal/privacy, founder/business). ROADMAP-CC26-
PLUS.md carries the campaign decomposition and every Amendment
deliverable (routine library plan, coverage registry, marketing
readiness matrix, validation plan). EXTERNAL-CONSULTATION-QUEUE.md
carries the Checkpoint A prompts.
