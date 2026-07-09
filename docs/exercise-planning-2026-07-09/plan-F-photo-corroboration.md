# Plan F — Progress-Photo Signal Corroboration: The Deeper Loop

Date: 2026-07-09. Planning agent (read-only, no source-code changes). Commissioned by founder
decision D11 (`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`, line 106-110):

> **Divergence handling** — Plan deeper corroboration - commission a follow-up PLAN for
> photo-signal corroboration influencing coach recommendations. Constraints absolute: floors
> intact, ED-gated (calm/open-flag suppression), adherence-neutral, deterministic, no
> appearance-judgement language; the validation-data caveat from the existing blueprint must be
> addressed head-on in the plan (what data would validate the signal before it ever drives a
> recommendation). Plan only - no build without a further founder round.

This document is that plan. It builds directly on `docs/exercise-planning-2026-07-09/
plan-E-progress-photos-loop.md` (the encouragement/engine-consumption research commissioned the
same day) and re-reads the governing blueprints and source it references, rather than
summarising plan-E's summary. No code changes accompany this document.

---

## 0. What already exists (recap, cited fresh against source)

- The scan pipeline scores a photo set into a 0-100 "Volyume Score" via deterministic
  silhouette-ratio maths, bounded by a provisional body-fat-regressor anchor
  (`src/lib/progressScanAnalysis.js:566-685`), gated by quality withholds
  (`SCORE_WITHHOLD_REASONS`, `progressScanAnalysis.js:23-38`) and confidence tiers `high` |
  `moderate` | `low` | `not_enough` (`progressScanAnalysis.js:424-431`).
- That score is bounded into a v1 evidence object with `affectsTargets: false` hard-coded as a
  literal (`src/lib/progressScanCoachEvidence.js:87-129`, line 127), then classified against the
  engine's own already-computed outputs (`weightTrend`, `goalPhase`, `heldDecisions`) into
  `supports | conflicts | visual_change_weight_stable | inconclusive | not_used |
  insufficient_data` by `classifyAgainstWeightAndGoal`
  (`src/lib/progressScanCheckInEvidence.js:211-239`).
- This v2 packet renders at `WeeklyCheckInScreen.js:1567` and `CoachOutputScreen.js:1567` and is
  **never persisted** — `weekly_checkins` and `coach_outputs` stay scan-free by a live source
  guard.
- `runWeeklyCoach`, `coachApply`, `nutritionEngine`, `planEngine` take no scan input at all;
  `progressScanSafetyFloorIsolation.test.js` asserts `runWeeklyCoach` output is byte-identical
  with and without scan evidence present in the caller's state.
- The `conflicts` classification (scale and photo directions disagree) already exists and is
  receipted plainly: *"Your photo trend and scale trend disagree this week. The coach used
  weight and intake for the decision and kept the scan as context."*
  (`progressScanCheckInEvidence.js:277-278`).

Plan E's own conclusion stands: the receipt/interpretation layer already closes the founder's
original question at "read it and say so honestly." This plan is about the next layer — whether
and how a photo signal could ever legitimately move a coaching output beyond disclosure, and
answers the validation-data question the founder specifically flagged as unaddressed.

---

## 1. The validation-data question, head-on

### 1.1 What the on-device scan actually measures

Per `src/lib/progressScanAnalysis.js` (read in full, lines 1-1655):

- **Primary measured inputs**: four silhouette ratios averaged across front/back (+ side when
  present) photos — `waistToShoulder`, `waistToHip`, `waistToHeight`, `bodyAreaRatio`
  (`measuredInputsFromAssets`, `progressScanAnalysis.js:368-377`; `physiqueInputsFromAssets`,
  lines 483-500). These come from a MediaPipe/TFLite selfie-segmentation mask
  (`PROGRESS_SCAN_SEGMENTATION_MODEL_VERSION`, line 8), not a body-composition sensor of any
  kind.
- **Score construction**: the four ratios are each scored against a hand-set lean/soft anchor
  pair (`computeVisualLeannessScore`, lines 502-523: e.g. waist-to-shoulder scored between 0.45
  "lean" and 0.75 "soft"), weighted-summed, then run through a fixed calibration curve
  (`calibrateVolyumeScore`, lines 573-582) to produce the 0-100 "Volyume Score". **These anchor
  points and the calibration curve are hand-set constants in this file, not fit to any measured
  ground-truth dataset** — there is no comment, test, or doc anywhere in this codebase citing an
  empirical source for the 0.45/0.75/0.68/1.00/etc thresholds.
- **The provisional body-fat regressor**: a separate on-device model
  (`assets/ml/progress_scan_bf_estimator_v1.json`) contributes an "anchor" that can shift the
  silhouette-only score. Its own asset carries `status: 'provisional_validation_pending'`
  (`progressScanAnalysis.js:570`, `estimatorIsProvisional()`) — the codebase's own artefact
  self-declares it is not yet validated. Its influence is deliberately clamped to ±8 points while
  provisional (`PROVISIONAL_ANCHOR_MAX_POINTS`, line 566), and engaging that clamp by more than 4
  points caps confidence at Moderate (lines 815-819) — an internal admission that when the two
  internal methods disagree, the safe response is "trust this less", not "average them
  confidently".
- **What is never measured or surfaced**: an actual body-fat percentage. The regressor's percent
  output is written `null` to storage and never displayed (per `accuracy-gate.md` §3, confirmed
  in `.volyume-audit/progress-photos/blueprints/scoring-accuracy-and-validation-blueprint.md` §3
  item 1). The Volyume Score is explicitly **not** a body-fat estimate, not DEXA-equivalent, and
  "never authoritative for safety floors" — these are literal string tags returned in
  `buildPhysiqueAssessment`'s `limitations` array (`progressScanAnalysis.js:863-869`).

### 1.2 Error bars: what exists, and what does not

- A numeric uncertainty margin (`uncertaintyMarginPctPoints`, `progressScanAnalysis.js:262-279`)
  is computed **only for the internal, never-surfaced body-fat percentage** — it ranges 3.5 to 9
  percentage points depending on bias flags (sex, skin tone not collected, very muscular, stage
  lean/prep, quality). It widens the internal range but that range is nulled before storage
  (`progressScanStore.js:395-399`, per `accuracy-gate.md` line 45) and never reaches any screen.
- **The user-facing 0-100 Volyume Score itself carries no numeric error bar.** Its uncertainty is
  expressed only qualitatively, as one of four confidence-tier words (High/Moderate/Low/Not
  enough), by explicit design decision: *"Uncertainty is expressed qualitatively (tier +
  reasons), never as a numeric percentage or error bar (fixation risk outweighs precision
  theatre)"* (`scoring-accuracy-and-validation-blueprint.md` §5, line 101, restated in the
  safety-privacy blueprint §4 item 2). This is a deliberate, founder-approved product decision,
  not a gap — but it means there is no quantitative confidence interval anywhere to reason about
  for a "how much should this move a decision" calculation; only an ordinal tier.
- Trend-detection thresholds (what counts as "slight" vs "clear" drift day to day,
  `progressSignalFromDelta`, `progressScanAnalysis.js:756-772`) are also hand-set constants (4/9
  points at High confidence, 5/11 at Moderate, 7/∞ at Low) with no cited empirical noise-floor
  behind them.

### 1.3 What evidence exists that the signal is reliable enough to influence coaching

**None, honestly, per the codebase's own governing document.** The scoring blueprint that
authored this system states its own validation status in two explicit tiers
(`scoring-accuracy-and-validation-blueprint.md` §10, lines 248-278):

- **Tier 1 (launch posture — required just to keep shipping the CURRENT display-only score)**:
  an internal consistency corpus (exists, automated), plus a **test-retest study** — "≥10
  volunteers, 3 capture repetitions per session under nominally identical conditions, across ≥3
  phone models," founder-run, to measure the pipeline's own noise floor — and a cross-condition
  sensitivity sweep. **Status: the harness/tooling for this exists
  (`progressScanCalibrationExport.js`, `scripts/run-progress-scan-calibration-report.cjs`,
  `progressScanCalibrationCorpus.test.js`) but the actual volunteer study has not been run.** The
  implementation log for this wave lists it as an open, unchecked item: *"[ ] Test-retest and
  sensitivity harness runs documented with sample output"*
  (`.volyume-audit/progress-photos/implementation/sonnet-wave-05-validation-privacy-tests.md:102`).
  **This means even Tier 1 — the bar for the CURRENT display-only feature — is not fully met
  today.** Nothing in the repository suggests otherwise; stating this as met would be a guess.
- **Tier 2 (required before ANY coach/check-in influence beyond display context, in the
  blueprint's own words)**: "the full 8-point protocol... DEXA-grade ground truth with
  subgroup-level error reporting (sex, skin tone, body-fat extremes, very muscular); genuine
  test-retest at scale; cross-condition robustness; device coverage; drift monitoring...
  independent (non-self) replication or review; a defined and user-visible 'do not trust this
  score' boundary; and demographic fairness reporting." The blueprint states plainly: *"No
  competitor has published this... Volyume does not get to skip it either"* and *"Tier 2 is
  explicitly a founder-commissioned programme, not a code task"* (§10, lines 275-278).
  **Status: not started. UNKNOWN whether any part of this exists outside this codebase** (e.g. a
  founder-run external study) — nothing in the repo references one, so this plan states UNKNOWN
  rather than assuming none exists anywhere.
- The most recent audit (`accuracy-gate.md`, run 2026-07-09, same day as this plan) gave the
  scoring system a full PASS — but explicitly scoped to "world-class enough to proceed to
  Coach/check-in evidence integration" at the **receipt/display layer only** (§8, line 79). It
  did not certify the score as decision-grade, and could not have — Tier 2 evidence does not
  exist for it to certify against.

**Plain-language answer to the founder's question**: the app's own governing documents already
say, in the founder's own commissioned research, that no validation evidence exists today that
would make a photo signal reliable enough to influence a coaching decision, and that the DEXA-
grade study required to produce that evidence has not been run and is explicitly scoped as a
founder-commissioned external research programme, not something buildable in a coding session.

### 1.4 What would need to be collected before ANY photo signal touches a coaching adjustment

Reading `scoring-accuracy-and-validation-blueprint.md` §10 as the authority (this plan does not
invent new criteria):

1. Tier 1 completed and documented: the test-retest study actually run (≥10 volunteers, 3 reps,
   ≥3 phone models) with a measured per-tier noise floor, and the cross-condition sensitivity
   sweep confirming each quality gate catches what it claims to catch. This is the floor for
   the CURRENT display-only feature, not yet met (see §1.3).
2. Tier 2, in full, before any coach-facing use beyond display: DEXA-grade (or equivalent
   clinical body-composition reference) ground truth, subgroup-reported (sex, skin tone,
   body-fat extremes, very muscular populations — the same axes the existing bias-flag machinery
   already worries about, `deriveBiasFlags`, `progressScanAnalysis.js:252-260`); test-retest at
   scale; cross-condition robustness; multi-device coverage; drift monitoring across app/model
   updates; independent (non-founder, non-self) replication or review; a defined, user-visible
   "do not trust this score" boundary; demographic fairness reporting.
3. A translation step this plan adds (not in the existing blueprint, because the blueprint never
   had to specify HOW MUCH validated signal buys HOW MUCH corroboration): even once Tier 2 exists,
   someone must define, in writing, founder-approved, the exact mapping from "Tier 2 validated
   accuracy for population subgroup X" to "how many comparable scans, at what confidence tier,
   corroborate a hold by exactly one step" — a bounded, single, named rule per
   `future-coach-checkin-integration-blueprint.md` §12 item 4 ("one named, tested, documented
   engine-adjacent rule with its own kill switch"), not a general "let photos influence the
   engine" mechanism.

### 1.5 Collecting this without violating EU-Dublin residency or data minimisation

This question has a simpler answer than it might appear, because of an architecture fact worth
stating precisely: **progress photos already never leave the device, full stop, regardless of
this plan.**

- Verified in code: `src/lib/progressScanStore.js` (the module owning all photo/scan
  persistence) contains **no** upload, HTTP, Supabase, or cloud-storage call of any kind — a
  targeted grep for `upload|supabase|fetch(|http|POST|storage.|cloud` returns zero matches.
- Verified against the sync layer: `progress_scan` tables are absent from
  `src/lib/sync/registry.js` entirely — they are not registered for sync to Supabase EU-Dublin
  at all, by construction, not merely by policy.
- Confirmed in the governing privacy blueprint: *"Architecture stays: photos device-local, no
  sync, no cloud table, guard-tested. Any change to this is a founder-level architecture event"*
  (`safety-privacy-blueprint.md` §6 item 1, line 132) and the shipped user-facing copy: *"Private
  on this device. Your progress photos are never uploaded and never leave this phone unless you
  export or share them yourself"* (`safety-privacy-blueprint.md` line 84-85).

So: **the EU-Dublin residency question does not arise for the existing feature**, because there
is no cloud transfer to be resident anywhere. The open question is narrower and different: **how
does a Tier 1/Tier 2 validation STUDY collect ground-truth data without breaking this
architecture or the app's data-minimisation posture for its existing users?**

- The Tier 1 test-retest/sensitivity study is already scoped in the blueprint as **founder-run,
  using the existing calibration export tool** (`progressScanCalibrationExport.js`,
  `scripts/run-progress-scan-calibration-report.cjs`) — i.e. volunteers recruited outside the
  production app's own user base and userbase telemetry, with the founder (or a founder-directed
  party) physically running the capture sessions and exporting the resulting anonymised
  calibration numbers (ratios, quality scores, scan confidence) for offline analysis. This is
  **not** a change to the shipped app's data flows: no new telemetry event, no new upload path,
  no new consumer of production users' photos. It is a separate, bounded research exercise using
  the same on-device pipeline.
- A Tier 2 DEXA-grade study is, by definition, an external clinical research programme (volunteers
  attending a body-composition scanning facility, correlating results with device photos taken
  under controlled conditions) — this is inherently outside VOLYUME's own production data flows
  and outside this codebase's residency concerns, because it does not touch a single production
  user's account, photo, or Supabase row. It is a founder-commissioned external study, not an
  app feature.
- **The one thing this plan flags as a genuine open question, not yet answered anywhere**: if
  the founder ever wanted to validate against PRODUCTION users' own real photos and real
  outcomes (e.g. "did users whose scans said X actually have outcome Y"), rather than a separate
  volunteer cohort, that would require either (a) an opt-in research-consent flow layered on top
  of the existing Article 9 health-data consent gate (a new, separate, explicit consent event,
  not an extension of existing consent), with any resulting research data still processed and
  stored under EU-Dublin residency and the existing data-minimisation rules, or (b) fully
  on-device aggregate/differential-privacy analysis that never leaves the device at all. Neither
  exists in the codebase today. **This plan does not recommend either path — it flags that IF
  production-data validation is ever wanted (as opposed to an external volunteer study), it is a
  separate founder decision with its own consent-design work**, not something this plan should
  pre-decide.

---

## 2. Corroboration semantics: where this could attach without touching engine determinism

### 2.1 The absolute constraints, restated against actual code (not paraphrase)

- **Calorie floors**: `KCAL_FLOOR = 1200` (female/unknown), `KCAL_FLOOR_MALE = 1500`
  (`src/lib/coachApply.js:29-30`), enforced in `computeCalorieTargets`
  (`coachApply.js:66-70`, `Math.max(kcalFloorForSex(sex), current + change)`) and mirrored in
  `nutritionEngine.js`. No photo signal may participate in this `Math.max` call or any function
  that feeds it, ever.
- **FFM energy floor, rapid-loss gate, max-safe-loss, ED-pattern detector, Beat UK/calm mode**:
  all live inside `weeklyCoach.js`/`coachApply.js`/`edPatternDetector.js`/`wellbeing.js`, per
  CLAUDE.md §2. This plan proposes **zero** new inputs to any of these; nothing below touches
  them.
- **Determinism**: `runWeeklyCoach`'s existing guarantee — same inputs, same outputs, no
  randomness — is pinned today by `progressScanSafetyFloorIsolation.test.js` as **byte-identical
  output with and without scan evidence present at all**. Any Stage 2 work (§4.3) that wants a
  photo signal to move so much as one word of the engine's own output necessarily changes what
  that guard test asserts. This is not a contradiction of "the engine is deterministic" — a
  photo signal becoming an explicit, named, typed input parameter is still deterministic (same
  input tuple, including the photo parameter, still produces the same output) — but it is a
  change to the CURRENT isolation guarantee ("engine takes no scan input at all") into a NARROWER
  one ("engine takes a specific, bounded, explicit scan input that can only move one specific
  field by one bounded step"). §4.3 surfaces this distinction as a founder decision because it
  is exactly the kind of fork CLAUDE.md's workflow rules require to be asked, not assumed.

### 2.2 Exact attachment point identified in the real engine

The "decision confidence caption" the founder-approved blueprint refers to
(`future-coach-checkin-integration-blueprint.md` §5 table, "Affects decision confidence?"
column) is a real, named field: `runWeeklyCoach`'s return value carries `confidence:
confidence.level` (`src/lib/weeklyCoach.js:1407`), where `confidence` comes from
`assessDataConfidence()` (`weeklyCoach.js:114-140`), a pure function of **logged data only**:
`weigh_ins` count, `adherenceKnown`, `weeksInPhase`, `hasUnusualEvent`. Its output is one of
`'high' | 'medium' | 'low' | 'data_hold'` with a `reasons` array of plain-English strings
(`weeklyCoach.js:110-111`).

This is the one and only field in the entire engine output that the blueprint's "corroborate the
caption one step" language could sensibly refer to. Two structurally different ways a photo
signal could reach it, with different implications:

**(a) Never touch `assessDataConfidence`/`confidence.level` itself — corroboration stays a
pure display layer, exactly like today's receipt.** A new, separate field
(e.g. `photoCorroborationNote: { level: 'supports' | 'none', reasons: [...] }`) is computed
OUTSIDE `runWeeklyCoach`, by a new pure function mirroring
`progressScanCheckInEvidence.js`'s existing composed-around pattern, and rendered ALONGSIDE the
existing confidence caption on screen — never merged into it, never read by `coachApply`. This
preserves the CURRENT byte-identical guard test completely unchanged (the engine is still
provably scan-free) and requires no new engine input contract. This is, in effect, Stage 1 below
formalised further, not new engine wiring at all.

**(b) `assessDataConfidence` (or a wrapper around `runWeeklyCoach`) takes an explicit new
optional parameter, e.g. `photoCorroboration: { eligible: boolean, direction: 'supports' |
'conflicts' | null }`, and its OWN logic (not `coachApply`, not any calorie/macro/training path)
may raise `level` by exactly one step (e.g. `medium` → `high`) when photo evidence, itself
Tier-2-validated and already agreeing with a decision the logged data was already leaning
toward, is present — never lowering it, never inventing a decision the logs did not already
support, never touching `heldDecisions`, `adjustments.calories`, or any floor/gate.** This is
what the blueprint literally means by "corroborate... one step" (§5, §12 item 4) but it is a
genuine change to the engine's input contract, and the existing byte-identical guard test would
need to become a narrower, still-strict "identical when photo input is absent or ineligible;
bounded one-step-only when present and eligible" guard — a new, differently-shaped test, not a
relaxation.

**Both (a) and (b) satisfy "never originate an adjustment, never touch floors/gates" — they
differ only in whether the engine's own confidence field can ever move.** Which one the founder
wants (or whether corroboration should ever move an engine-owned field at all, versus staying
permanently a side-by-side display note) is Founder Question 3 below.

### 2.3 What corroboration must never do (restated as a checklist against the forbidden list)

Per `future-coach-checkin-integration-blueprint.md` §4 (forbidden list, starred items permanent):
no automatic calorie change of any size or direction from a photo score; no macro change from a
single scan or from anything below High confidence; no training-volume/refeed/diet-break/deload
change from scan data ever; no body-fat claims from photos, validated or not, anywhere
user-facing (*permanent); no score-based shame/ranking/comparison/urgency (*permanent); no hidden
target change (any scan-correlated target difference must be stated in the receipt, and since
scan-driven changes are forbidden, any detected correlation is treated as a bug); low-confidence
or withheld scans must never influence anything beyond their own receipt; no overconfident coach
language ("your photos prove...", *permanent); scan data must never enter the ED-pattern detector
as a risk input without its own dedicated safety review (none is proposed here); `photo_scan`
stays permanently excluded from `nutritionEngine`'s `isAuthoritativeBodyFatSource` allowlist.

---

## 3. ED-safety analysis

- **Suppression mechanism, unchanged.** Every new corroboration surface this plan could produce
  (receipt sentence, logged history, or the Stage 2 confidence nudge) inherits
  `usePhotoSuppression()`'s existing fail-closed pattern (`src/hooks/usePhotoSuppression.js`,
  consumed today across 30 files including every progress-photo screen and component) —
  suppressed under calm mode or an open ED flag means the surface is **entirely absent**, not
  present-but-softened, matching the existing pattern (`safety-privacy-blueprint.md` §5 item 1).
  No new suppression mechanism is proposed; this plan explicitly rejects inventing a second one.
- **Adherence-neutral framing.** Every existing receipt sentence already avoids attributing
  score movement to effort or character (`safety-privacy-blueprint.md` §4, "Copy never promises
  the score will improve, and never attributes score movement to effort or character"). Any new
  corroboration copy (Stage 0/1) must pass the same `progressScanIntegrationTone.guard.test.js`
  pattern that already bans shame/panic words, em dashes and exclamation marks — extended with
  new pinned strings, never a relaxation of the existing bans.
- **Locked voice constraints** (`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`, calm/plain/no-shame,
  and `scoring-accuracy-and-validation-blueprint.md` §3's banned-claims list): no accuracy
  adjectives ("accurate", "validated", "measured your body fat"), no certainty language about a
  single scan, no implied medical/health-risk meaning, no claim that the coach uses the score to
  set targets **unless and until that claim is ever true** — today it is not, and Stage 0/1 keep
  it not true.
- **No appearance-judgement language, ever, on either side of a corroboration.** A "supports"
  classification must never read as a compliment on appearance; a "conflicts" classification must
  never read as a criticism of appearance or of logging honesty. The existing conflict receipt
  models this correctly ("the coach used weight and intake for the decision and kept the scan as
  context" — a hierarchy statement, not a judgement); any new Stage 0 "check your logging
  conditions" sentence (plan-E option 3b) must stay in that register, about routine/conditions,
  never about the body.
- **Checking-frequency protection.** No corroboration surface may create an incentive to scan
  more often than the existing weekly cadence; this rules out, for example, "scan again to
  confirm this corroboration" prompts.

---

## 4. Tier and staged rollout

### 4.1 Tier

Progress-photo scanning and its receipts are **Pro-only** (per CLAUDE.md §2, "Pro: everything
nutrition/coaching... Precision Coaching"; the existing check-in value line is already gated
`Pro, unsuppressed` per `final-completion-report.md` §5). Every stage below is Pro-only by the
same rule; nothing here proposes exposing any coaching-adjacent photo feature to free tier.
**Guardrails stay tier-blind** regardless: the calorie floors, FFM floor, rapid-loss gate,
max-safe-loss, and ED-pattern detector never consult tier (`proGate.js:22`, "Safety logic stays
tier-blind: engine guardrails (FFM floor..."), and this plan adds nothing that would make any of
them tier-aware.

### 4.2 Stage 0 — receipt-side corroboration copy only (zero engine risk)

**What ships**: the founder-approved benefit line (D11, already decided — "The scale can't tell
muscle from water. Photos can.") plus, if the founder chooses it in the still-open plan-E
question 2, the "manual review flag" sentence on a `conflicts` classification (plan-E Option 3b:
a calm, blame-free "when your logs and photos disagree, it's often worth checking your weigh-in
routine" line). Both are pure copy additions to the EXISTING receipt surfaces
(`progressScanCheckInEvidence.js` receipt strings, `WeeklyCheckInScreen.js`,
`CoachOutputScreen.js`). No new data read, no new persistence, no engine change.

- **Entry criteria**: none. Buildable immediately; requires only the founder's plan-E answers
  (already a separate open question) and new tone-guard string pins.
- **Test contract**: extend `progressScanIntegrationTone.guard.test.js` with the new strings;
  behavioural test that the sentence appears only alongside an existing `conflicts` receipt and
  never alone; suppression parity test (absent under calm/ED-flag, matching every other surface).
- **Founder decision point**: whether to ship it at all (this duplicates plan-E's still-open
  question 2 — this plan does not re-decide it, only notes it is Stage 0 of this deeper plan).
- **Effort**: small (single agent session; no schema, no engine touch).

### 4.3 Stage 1 — signal logged and shown over time, still `affectsTargets: false`

**What is genuinely new here** (today's build computes the v2 packet fresh every render and
never persists it — `integration-plan.md` §3/§11, "never persisted"): an additive, idempotent
migration (per CLAUDE.md §2 database rules) that persists the CLASSIFICATION history only
(`assessment` enum value + `status` + timestamp — never the photo, never the raw score, never
free text) to a new table, so a user or the coach receipt can eventually say something like
"supports has held for 3 of your last 4 check-ins" as calm, historical, still fully display-only
context. `runWeeklyCoach`/`coachApply` still take no scan input at all; this table is written
AFTER the engine runs and is never read BY the engine — a new source guard (mirroring the
existing `weekly_checkins`/`coach_outputs` scan-free guards) asserts no engine module ever
imports this table's accessor.

- **Entry criteria**: founder sign-off on the new additive table (cloud migration is
  founder-applied manually per CLAUDE.md; this is a schema event, not a refactor). **Not** gated
  on Tier 1/Tier 2 validation, because nothing here reads the persisted history back into any
  decision — it remains exactly as authoritative as today's fresh-computed receipt, just given
  memory across weeks.
- **Test contract**: new source guard (engine modules never import the new table's read path);
  persistence-shape test (only enum + timestamp, no photo/score/free-text fields); suppression
  parity (history surface absent under calm/ED-flag, matching the live surfaces it's derived
  from); a guard test that deleting a user's account or photos per the existing per-user wipe
  also removes this history (extends the existing wipe-scope tests).
- **Founder decision point**: whether the multi-week history is worth the schema addition, and
  where it should surface (a new history view, or folded into the existing Coach card).
- **Effort**: small-medium (one additive migration + one new lib module + guard tests + a display
  surface); mechanically buildable now, independent of any validation programme.

### 4.4 Stage 2 — bounded corroboration influence on an engine-owned field

**What this would be**: the blueprint's single named rule — a strong (3+ comparable scans),
Moderate+ confidence, ALREADY-AGREEING photo trend corroborates (raises by exactly one step,
never lowers, never originates) `runWeeklyCoach`'s own `confidence.level` field, using attachment
option (b) from §2.2. Nothing else in the engine's output changes; no calorie, macro, training,
refeed, or diet-break value is ever touched by this rule, by construction (it lives inside
`assessDataConfidence`, which today only ever returns a level and reasons array — it has no path
into `calorieAdjustment`, `stepsAdjustment`, `cardioAdjustment`, or any floor).

- **Entry criteria (hard, not negotiable per the governing blueprint's own words)**: Tier 1
  validation completed and documented (test-retest + sensitivity sweep actually run, not just the
  harness existing — currently NOT met, §1.3) **and** full Tier 2 validation completed (DEXA-grade
  ground truth, subgroup fairness reporting, independent replication — currently NOT started,
  UNKNOWN whether any external programme exists) **and** a separate, explicit founder unlock for
  this one specific rule, with its own kill switch (`future-coach-checkin-integration-blueprint.md`
  §12 item 4, "with its own kill switch"). This plan does not propose starting Stage 2 work now;
  it exists here only so the founder can see the full ceiling, per the blueprint's own gate.
- **Test contract (once unlocked)**: a bounded-delta guard test replacing the current
  byte-identical guard — asserting the engine output is identical whenever the photo input is
  absent/ineligible, and that `confidence.level` can move by at most one step in one direction
  (toward higher confidence only) when present and eligible, with every other field
  (`adjustments.*`, `heldDecisions`, all floors) still byte-identical in every case; a kill-switch
  test (a single flag/config value fully disables the rule, restoring the pre-Stage-2 guard
  exactly); an ED-pattern-detector isolation test (this rule's input never reaches
  `edPatternDetector.js`).
- **Founder decision point**: (i) whether to commission the Tier 1 study now (independent of
  Stage 2 — it is required to keep the CURRENT display-only feature on solid ground regardless),
  (ii) whether to commission Tier 2 at all, ever, given it is described as a substantial external
  research programme, and (iii), only if and after both exist, whether to actually unlock this
  specific rule.
- **Effort**: the CODE for the rule itself, once Tier 2 evidence exists, is small (one bounded,
  named, kill-switched function plus its guard tests) — the blueprint is explicit that the
  validation programme, not the code, is the expensive part. Effort for Tier 1: a founder-run
  volunteer study using existing tooling — days to weeks of founder/volunteer time, not
  engineering time. Effort for Tier 2: UNKNOWN, likely substantial (clinical-grade reference
  measurements, multi-device coverage, independent review) — this plan does not estimate it
  because no comparable programme is described anywhere in the codebase or its research docs to
  scale from.

---

## 5. Founder questions

1. **Tier 1 validation study** — the codebase's own governing blueprint says Tier 1 (the bar for
   the CURRENT, already-shipped, display-only score) is not fully met: the test-retest/
   sensitivity-sweep harness exists but the actual volunteer study has not been run
   (`sonnet-wave-05-validation-privacy-tests.md:102`). Should this be commissioned now,
   independently of anything else in this plan?
   a) Commission the Tier 1 volunteer study now (founder-run, using the existing
      `progressScanCalibrationExport.js`/`run-progress-scan-calibration-report.cjs` tooling).
   b) Leave Tier 1 as-is for now (harness exists, no study yet); revisit later.
   c) Something else — specify.

2. **Tier 2 validation programme** — required before ANY coach/check-in influence beyond
   display, per the blueprint's own gate, and described as a founder-commissioned external
   research programme (DEXA-grade ground truth, subgroup fairness reporting, independent
   replication), not a coding task.
   a) Commission scoping of what a Tier 2 programme would require (partners, cost, timeline) as
      its own separate piece of work.
   b) Do not commission Tier 2 at this time; Stage 2 (§4.4) stays permanently out of reach until
      a future decision revisits this.
   c) Something else — specify.

3. **Which corroboration attachment model, if Stage 2 is ever unlocked** — §2.2 identifies two
   structurally different ways a photo signal could ever touch `runWeeklyCoach`'s output:
   a) Corroboration should NEVER move an engine-owned field (e.g. `confidence.level`) — it stays
      permanently a separate, side-by-side display note, no matter how much validation evidence
      ever exists (attachment option (a); the current byte-identical engine guard is never
      loosened, ever).
   b) Corroboration MAY, once Tier 1 + Tier 2 + a specific founder unlock all exist, move
      `confidence.level` by exactly one bounded step under the named rule in §4.4 (attachment
      option (b); the current byte-identical guard is deliberately narrowed to a bounded-delta
      guard at that point, not before).
   c) Decide this later, once Tier 1/Tier 2 answers (questions 1-2) are known.

4. **Stage 0 and Stage 1 — buildable now, independent of the validation questions above.**
   a) Build Stage 0 only (receipt copy additions; depends on plan-E's still-open question 2 for
      the exact wording/scope).
   b) Build Stage 0 and Stage 1 (adds the persisted classification-history table and its guard
      tests).
   c) Build neither yet; hold this plan as reference only until the validation questions above
      are answered.
   d) Something else — specify.
