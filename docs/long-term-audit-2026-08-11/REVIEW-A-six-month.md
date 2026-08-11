# REVIEW A - the six-month athlete, hostile re-examination

Campaign 6, Phase 53. Fresh-eyes adversarial review of the six-month
training experience. This document is the ONLY file this review wrote.
No `src/` file, no test, no other document was modified; no commit, no
push, no stash, no cloud command.

**Authority.** The Campaign 6 order, Phase 53 (the ten commissioned
questions, reproduced verbatim as the section headings below). Section 2
inviolables bind every direction sketch here. D97 rulings are settled
law: cited, never re-litigated. Where a ruling's IMPLEMENTATION is
defective that is reported as a finding, per the brief.

**Evidence reviewed against.** `PERSONALISATION-DIVIDEND.md`,
`SIX-BLOCK-SIMULATION.md` (including its addendum),
`PERSONALISATION-MATURITY.md`, `AUDIT-MATURITY-AND-SIX-MONTHS.md`
(M-1..M-24), `D97-RULINGS.md`, `RELATIONSHIP-MOMENTS.md`,
`CHOICE-MEMORY.md`, and the suites `campaign6.sixBlock`,
`campaign6.athlete180`, `campaign6.longitudinal`,
`campaign6.relationship`, `campaign6.applyRepeat`.

**Adversarial method.** For each question I tried to build a
counterexample against the REAL shipping modules before accepting the
campaign's claim. Probes drove `learnedRange.computeLearnedRange`,
`interBlock.classifyMuscleBlock`, `blockSeed.resolveSeedRange`,
`blockLedgerGather.profileAdjustedPrior` /
`buildSeededWeeklyTargets`, `effectiveLandmarks.mergeLandmarkPrecedence`
and `algorithms.VOLUME_LANDMARKS` directly, from a scratch jest config
outside the repo (probe sources live in the session scratchpad, not in
`src/`). Existing suites were run read-only. Every number below is a
probe output or a `file:line` citation, never a paraphrase of a doc.

**Tree state.** Reviewed at `28fc6bf3` on `claude/campaign6-long-term`.
The tree MOVED during this review: `c741f087` (M-6/M-7/M-8 fixes) and
`28fc6bf3` landed mid-pass, and the working tree carries uncommitted
changes in `database.js`, `mesocycle.js`, `sync.js`, `usePartners.js`,
`useWeeklyStreak.js`, `sync/tables/partners.js` from a concurrent lane.
Two candidate findings I had already constructed were withdrawn on
re-read against the new HEAD (recorded below as FALSE-ALARM-CHECKED).
`npx jest campaign6 interBlock learnedRange blockSeed blockAdvisor
blockExplain blockLedger` at review time: **15 suites, 339 tests, all
passing.**

**Not re-reported as new** (cited instead where relevant): D97-3 and its
addendum, D97-9, D91-24/25, R-3, R-16, R-18, D92-11, FR-C4-2/3,
P-7..P-11, F3, F9, B1, B2, B4, and every M-1..M-24 finding from
`AUDIT-MATURITY-AND-SIX-MONTHS.md`.

---

## The ten commissioned questions

### 1. Is Block 6 meaningfully more personalised than Block 1?

**VERDICT: HOLDS WITH CAVEAT.**

The mechanism is real. Probe RA6-J reproduced the
`PERSONALISATION-DIVIDEND.md` headline arc end to end through the real
chain: chest, intermediate / average recovery / lean gain / 31, with the
dose-response pair present in every block and the `adjust` intent every
time, seeds

    B1 6/23 profile -> B2 7/23 -> B3 8/23 -> B4 9/23 -> B5 10/23 -> B6 11/23 (ledger, deload 11)

against a no-history counterfactual of 6/23 for ever. The dividend is +5
weekly starting sets and a block-sized recovery week. That is a genuine,
computable, provenance-carrying difference.

Three caveats, each with a counterexample:

- **The dividend requires the user to decline the app's own
  recommendation.** For a healthy Pro athlete `buildNextBlockRecommendation`
  returns `'repeat'` (`blockAdvisor.js:279-296`, the branch taken when
  there are no high signals and readiness is at or above 60), and
  `PlansScreen.js:399` maps everything except an explicit Pro `adjust`
  tap to a true repeat. Probe RA6-B ran the SAME six perfect blocks on
  the repeat intent: every block earned its pair, every block's ledger
  said "the next block starts 1 set higher", and every block seeded
  **6/23**. Block 6 was byte-identical to Block 1. The personalisation
  dividend accrues only to users who repeatedly take the option the app
  does not recommend.
- **In the under-delivery case the six-month dividend is negative.**
  Probe RA6-G: a muscle classified RESPONSIVE in all eight blocks whose
  achieved weekly peak is 14 against a prescribed 21 walks the
  prescription 8/21 -> 8/19 -> 8/17 -> 8/15 -> 8/14 and sticks there.
  Probe RA6-L is worse: an athlete who earns the pair every block but
  only ever delivers 10 sets ends at 8/10 from a starting 6/23, having
  been told "responded well" at every step.
- **`PERSONALISATION-DIVIDEND.md`'s own provenance is defective**
  (RA6-7 below): its headline arc is pinned in none of the three suites
  it names, and two of its four table rows misdescribe the mechanism.

### 2. Does anything blindly ratchet upward?

**VERDICT: HOLDS WITH CAVEAT.**

The START never ratchets blindly. `interBlock.js:352-360`: `+1` requires
`doseResponse.lateProgression && doseResponse.lateRecoveryOk` at
composite confidence >= 0.6, and `lateRecoveryOk` needs POSITIVE late
evidence (soreness AND joint answered on at least half the late sessions,
all calm) rather than absence of complaint (`blockMetrics.js:351-381`).
`+1` is the maximum, once per block. Probe RA6-B/RA6-J confirm the cap
holds across six blocks; `campaign6.sixBlock` pins it.

The CEILING does carry one unguarded upward mechanism. `learnedRange.js:
157-160` steps the ceiling toward `highestHandledPeak`, an **all-time
running maximum that never decays and is never re-qualified**. Probe
RA6-A, on the real module:

| after | learned ceiling |
|---|---|
| B1 RESPONSIVE, achieved peak 21 | 21 |
| B2..B5 STRAINED (starts 10, 9, 8, 7) | 19, 17, 15, **13** |
| B6 RESPONSIVE, achieved peak only 10 | **15** |
| B7 RESPONSIVE, achieved peak only 10 | **17** |
| B8 RESPONSIVE, achieved peak only 10 | **19** |

Four consecutive blocks of strain evidence are undone by three blocks
whose own delivered volume never exceeded 10 sets, because the target of
the upward step is a peak the muscle handled eight blocks earlier. The
step is capped at 2 per block, so it is slow, but nothing about the
current block's volume gates it. This is not the age question D97-3 and
D91-25 defer: the whole history here is continuous and recent. It is an
ordering asymmetry inside the fold. See RA6-3.

The opposite direction has its own problem: for a user who never exceeds
their prescription the ceiling can only ever go DOWN. See RA6-4.

### 3. Does the app know when it does NOT know?

**VERDICT: HOLDS.**

Five independent INSUFFICIENT_DATA gates fire before any quadrant is
assigned (`interBlock.js:282-306`: adherence < 0.6, fewer than 4
exposures, fewer than 4 recovery points, exercise discontinuity,
performance confidence < 0.6). `learnedRange.js:133-150` additionally
refuses entries below confidence 0.6, INSUFFICIENT_DATA entries,
manual-deferred entries and entries with no usable measurement, and
`isLearned` stays false when nothing qualified. `resolveSeedRange`
refuses an unjudged entry as a seed (`blockSeed.js:88-92`), and probe
runs of the hamstrings arc confirm the fallback lands on `profile` with
`evidenceBlocks: 0` rather than on a fabricated band. Copy matches:
`blockExplain.js` emits `RESEARCH_START_LINE` (or the D97-16 mature
variant) and returns `[]` rather than guessing when a source is unknown.
Recovery nulls pass through honestly (`blockLedgerGather.js:104-114`),
and FB-36 / P-3 keep a sleep-only row from counting as a reading.

One consistency gap, low severity: the confidence bar the MEMORY enforces
is not enforced at the SEED. Probe RA6-F: an entry at confidence 0.5
contributes zero evidence to the learned band (`isLearned: false`,
`evidenceBlocks: 0`) yet still seeds the next block at 12/22 with a
strain-scaled deload of 9. Today this is benign because such a block
cannot earn a climb (the `+1` gate reads the same composite confidence),
so the seed is a retention or a reduction. Recorded as RA6-10.

### 4. Are muscle responses independent?

**VERDICT: HOLDS WITH CAVEAT.**

Classification, proposal, learned band and seed are all computed per
muscle, and the muscle guard is watertight: `priorLedgerEntries`
(`blockLedgerGather.js:373`) matches on exact `e.muscle === muscle`, so
an entry with a missing muscle key can never reach another muscle's fold.
I tried to build cross-contamination through `learnedRange.js:132`'s
`raw.muscle != null` guard and could not: the entry never arrives.
Recorded as a checked false alarm.

The caveat is real and it is not in the campaign's evidence. Three of the
five recovery-cost signals are BLOCK-LEVEL constants mirrored into every
muscle by the runner (`blockLedgerRunner.js:173, 250-253`), and the
excessive-cost threshold is 2 (`interBlock.js:78`) while the block-level
deload flag alone is worth 2 (`interBlock.js:105`). Probe RA6-D on the
real module:

    chest, no systemic signals ....................... RESPONSIVE
    chest, block deload flag fired .................. OVERREACHED
    chest, block readiness slope -0.35 + 2 sleep weeks OVERREACHED
    back,  block deload flag fired .................. OVERREACHED

and the per-muscle voice attributes it to the muscle:
"Chest progressed, but the recovery cost ran high late in the block, so
the starting volume carries over unchanged and the peak comes down."

Every trained muscle flips together, and every muscle's peak comes down
together, on evidence that says nothing about any of them individually.
`campaign6.sixBlock.test.js:132` scripts `deloadFlagFired: true` for
quads while chest in the same block is RESPONSIVE. That arc is
UNREACHABLE in production, because the runner has one systemic value per
block. The flagship simulation therefore demonstrates more per-muscle
independence than the shipping runner can deliver. See RA6-2.

### 5. Can a successful dose simply be retained?

**VERDICT: HOLDS WITH CAVEAT.**

Retention is the default and it is explicit: without the evidence pair
`start = previousStart` and the peak holds at the finished block's plan
(`interBlock.js:356-362`). The receipt states it as a decision rather
than silence ("Keeping a dose that worked is a decision too",
`blockExplain.js`), and M-8's manual-hold branch has now landed at
`c741f087`. `campaign6.applyRepeat` pins REPEAT -> REPEAT with no drift.

Caveat: retention retains the START, not always the whole dose. The
non-earned peak is `min(rampTop, max(plannedPeak, start))` where
`rampTop` is the learned ceiling (`interBlock.js:361-362`), so whenever
the ceiling has stepped below the previous plan the "retained" block is
prescribed a lower peak. Probe RA6-G shows six consecutive retention
blocks walking the peak 21 -> 14 while every rationale says "responded
well at this dose ... and the peak comes down". The reduction is spoken
but its CAUSE (the user's own delivered volume, not strain) is never
stated anywhere in the tree. That cause gap is RA6-4.

### 6. Does a stale old success masquerade as current capacity?

**VERDICT: HOLDS WITH CAVEAT.**

Within a block boundary the evidence-age machinery is real: the
>= 4-week stale-evidence hold (`interBlock.js:88, 240-245`), D97-4's
14-day gate on the session-adjustment `+1`, D97-5's calendar adjacency on
the consecutive-week counters, D97-8's fresh-check-in requirement for
current signals, and R-6's recent-session requirement for the Home
caution.

Three residual paths, all already carried, are cited rather than
re-reported: the stored-ledger layoff asymmetry and the learned band's
absence of any clock (**D97-3** and its addendum), the freshness
semantics that would be required to close them (**D91-25**), and the
session-grain adapted bands, which read a 200-row window with no age
bound at all (`database.js:5470-5546`; D97-2 corrected the ORDERING only
and explicitly declined the age question).

What IS new is that the learned ceiling can serve a stale success as
current capacity without any elapsed time at all. RA6-A above: a peak
achieved in block 1 re-inflates a strain-reduced ceiling in blocks 6, 7
and 8 of a continuous, fully recent history. No freshness rule would
catch it, because nothing here is old. See RA6-3.

### 7. Do Repeat and Adjust remain genuinely different?

**VERDICT: HOLDS WITH CAVEAT.**

They are different by construction: `blockSeed.js:98-101` returns the
finished block's own observed start and planned peak for `repeat`, the
full proposal for `adjust`, and only `adjust` carries a strain-scaled
`deloadSets` (`blockSeed.js:126-147`). `campaign6.applyRepeat` Phase 14
pins ADJUST->ADJUST climbing, REPEAT->REPEAT not drifting, and
REPEAT->ADJUST still producing evidence. P-6 made the repeat button's
promise true even for unjudgeable entries.

The caveat is how OFTEN they differ. Probe RA6-H ran both intents over a
six-block retention arc (RESPONSIVE, no dose-response pair, which is
precisely the founder's stated normal case: "a successful dose should
normally be retained"):

| block | adjust | repeat | identical start/peak |
|---|---|---|---|
| 1 | 6/23 | 6/23 | yes |
| 2..6 | 6/23 dl6 | 6/23 | yes |

Start and peak are identical in all six blocks; the only difference is
the deload field, which in this arc resolves to the same number. The
paid, Pro-gated option ("Part of Pro. Your next block's weekly set
targets start from what this block showed, muscle by muscle.",
`blockAdvisor.js:212-214`) is numerically indistinguishable from the free
one whenever the coach's own default judgement applies. See RA6-9.

### 8. Does Apply still reach sessions months later?

**VERDICT: HOLDS.**

I could not break this. The path is entirely persisted-row based and
carries no rolling window and no age gate: `handleApplyTraining` writes
`planned_muscle_volume` rows for the next mesocycle week
(`CoachOutputScreen.js:1257-1290`), and `getSessionWeeklyAllocation`
reads the block's rows unbounded and scales the routine's counts through
`computeWeeklySessionAllocation` (`sessionAdjustments.js:48-72`), with an
identity fallback when rows are absent. Applied changes also reach the
NEXT block's ledger, because `previousStart` and `plannedPeak` are read
from the written planned rows (`blockLedgerRunner.js:206-211`).

Boundaries are honest rather than silent: `nextTrainingWeekId` is null
when no live block exists or the current week is the last, and the Apply
control hides (`CoachOutputScreen.js:2099-2117, 2469`); D97-10's age
bound stops a months-old output being auto-executed by Coached mode while
leaving the manual button, and the viewed week's date range is rendered
above it (`CoachOutputScreen.js:2593`) so an old output is visibly old.
`campaign6.applyRepeat` Phase 13 pins that proposals reach sessions only
through persisted rows and that an ignored proposal leaves no trace.

### 9. Does manual intent always win?

**VERDICT: HOLDS WITH CAVEAT.**

Manual is rung 1 of the fallback chain, is suppression-proof, defers the
ledger entry (`proposal.startSets` null), and teaches the learner nothing
(`blockSeed.js:69-79`, `interBlock.js:140`, `learnedRange.js:138`). The
relationship suite pins that it beats rich history, and probe RA6-E
confirms a manual `mev` one set above research wins outright.

The counterexample: a manual value that COINCIDES with the research
default is discarded. Probe RA6-E, chest, manual `{mev: 6, mav: 14,
mrv: 22}` (exactly `VOLUME_LANDMARKS.chest`) against a ledger entry
proposing 14/24:

    seed with manual equal to research -> 14/24, source 'ledger'
    seed with manual one set higher    -> 7/14, source 'manual'

`isManualEdit` (`effectiveLandmarks.js:85-96`) cannot distinguish "the
user deliberately chose this number" from "the editor saved a default",
because the storage format records values, not intent. Stage 6 blocker #1
made this trade deliberately and it was the right call at the time; the
residual is that a user who types the research number to PIN a muscle is
silently overruled by the engine. See RA6-6.

### 10. Does Pro feel more personalised rather than merely more cluttered?

**VERDICT: HOLDS WITH CAVEAT.**

Pro's personalisation is mechanically real and Free's is honestly absent:
the adapted landmark layer is tier-gated (`effectiveLandmarks.js:118`),
the ledger `adjust` intent is Pro-only and fails closed
(`PlansScreen.js:399`), free keeps repeat as self-directed continuity,
and M-19 confirmed Free's "set by how your last block went" is TRUE.
Restraint is real too: M-16 records bounded upsell cadence, and the
saturation rule keeps B1/B4 provenance deliberately unsprayed.

Three things dilute it, one of them serious:

- **A legacy manual blob silently disables the Pro adapted layer
  everywhere.** `mergeLandmarkPrecedence` never consults `isManualEdit`
  (`effectiveLandmarks.js:44-50`). Probe RA6-M, with a full-table blob of
  research defaults and a genuine adapted chest band:

      with the legacy blob:    chest {mev 6, mav 14, mrv 22}, source 'manual'
      without it:              chest {mev 9, mav 18, mrv 26}, source 'adapted'
      isManualEdit says:       false

  Every pre-Stage-6 save wrote all seventeen muscles
  (`VolumeHeatmapScreen.js:250-255` documents exactly this), the blob
  syncs by prefix (`sync.js:1400`) so it survives a reinstall, and four
  display screens plus the ledger's landmark frame read this resolver. A
  paying Pro user in that state sees research numbers labelled as their
  own setting while the adapted layer they pay for is inert. See RA6-1.
- **The paid block-decision option is numerically identical to the free
  one on the default retention arc** (RA6-9, question 7).
- **The app recommends the option that discards the coaching** for the
  modal healthy Pro user (RA6-8, question 1).

---

## Findings

Severity: HIGH / MED-HIGH / MED / LOW-MED / LOW. Every row is NEW unless
marked. Nothing here is applied; the lead actions these.

| ID | Class | Sev | Finding | Evidence |
|---|---|---|---|---|
| RA6-1 | DEFECT | **MED-HIGH** | `mergeLandmarkPrecedence` does not consult `isManualEdit`, so a legacy full-table manual blob (values equal to research) beats the Pro adapted layer on four display screens and in the ledger's landmark frame. `PERSONALISATION-MATURITY.md` §4 asserts the protection exists | probe RA6-M; `effectiveLandmarks.js:44-50, 85-96`; `blockLedgerRunner.js:179, 226`; `VolumeHeatmapScreen.js:212, 250-255`; `AnalyticsScreen.js:219`; `CoachReviewScreen.js:283`; `WorkoutSummaryScreen.js:605`; `sync.js:1400` |
| RA6-2 | DEFECT | **MED-HIGH** | Three of the five recovery-cost signals are block-level constants mirrored into every muscle, and the block deload flag alone meets the excessive threshold, so one systemic signal reclassifies every trained muscle at once with per-muscle-voiced rationale | probe RA6-D; `blockLedgerRunner.js:173, 250-253`; `interBlock.js:78, 99-107, 146` |
| RA6-3 | DEFECT | MED | The learned ceiling's upward step targets a never-decaying all-time maximum, so a low-volume responsive block re-inflates a strain-reduced ceiling toward a peak achieved many blocks earlier. Not the D97-3/D91-25 age question: the history is continuous | probe RA6-A; `learnedRange.js:119, 153-161, 165-167` |
| RA6-4 | LATENT | MED | For a user who never exceeds their prescription the learned ceiling is monotone non-increasing: `achievedPeak <= plannedPeak <= ceiling` by construction, so capacity discovery is one-directional and no copy explains why a "responded well" block lowers the peak | probes RA6-G, RA6-L; `learnedRange.js:153-161`; `interBlock.js:361-362` |
| RA6-5 | DEFECT | MED | The non-earned RESPONSIVE branch passes a plain-string rationale, so a learned-ceiling clamp that reverses the direction produces "responded well at this dose, so the next block starts 1 set lower". The earned branch got the function-form fix; this one did not | probe RA6-L block 8; `interBlock.js:211-224, 359, 368` |
| RA6-6 | LATENT | LOW-MED | A manual landmark equal to the research default is indistinguishable from an untouched default and is discarded, so a deliberate "pin this muscle to research" choice is silently overruled by the ledger | probe RA6-E; `effectiveLandmarks.js:85-96`; `blockSeed.js:73-79` |
| RA6-7 | DEFECT | MED | `PERSONALISATION-DIVIDEND.md` mis-states its own provenance: the headline chest arc is pinned in none of the three suites it names and is contradicted by two of them; the calves reduction is attributed to strain rules on an arc with no strained block; 21 is called a "research peak" when calves' research MAV is 14 | probes RA6-J, RA6-G; `campaign6.sixBlock.test.js` (chest reaches 7); `campaign6.athlete180.test.js` (chest reaches 6); `algorithms.js` `VOLUME_LANDMARKS.calves` |
| RA6-8 | IMPROVEMENT | MED | The healthy-user next-block recommendation is `repeat`, which discards every ledger proposal, so the personalisation dividend accrues only to users who decline the app's own advice | probe RA6-B; `blockAdvisor.js:279-296`; `PlansScreen.js:399` |
| RA6-9 | IMPROVEMENT | MED | On the retention default (the founder's stated normal case) `adjust` and `repeat` produce identical start and peak, so the Pro-gated option's stated benefit is numerically nil in the modal block | probe RA6-H; `blockSeed.js:93-148`; `blockAdvisor.js:212-214` |
| RA6-10 | LATENT | LOW | `resolveSeedRange` applies no confidence bar, so a block the learned band refuses as evidence (< 0.6) still seeds the next block directly. Benign today because such a block cannot earn a climb | probe RA6-F; `blockSeed.js:88-92`; `learnedRange.js:133` |
| RA6-11 | DEFECT | LOW-MED | `buildNextBlockRecommendation`'s `avgReadiness` reads the last 8 check-in ROWS at any age, the pattern D97-8 closed for `detectSignals` in the same function; a returning user's recommendation and its copy can be computed entirely from pre-lapse rows | `blockAdvisor.js:275-276, 279, 299, 374, 402-405, 433, 456, 501` |
| RA6-F1 | FALSE-ALARM-CHECKED | - | Cross-muscle contamination of the learned band via `learnedRange.js:132`'s `raw.muscle != null` guard is unreachable: `priorLedgerEntries` matches on exact equality first | `blockLedgerGather.js:373`; `learnedRange.js:132` |
| RA6-F2 | FALSE-ALARM-CHECKED | - | `upwardCarryPrevented` reading false on the suppressed refused-climb case: constructed, then found already fixed at `c741f087` (M-6). The residual, that the copy still speaks the retain-dose voice, is founder-gated B2 | `interBlock.js:246-250, 352-370`; probe RA6-C on current HEAD |
| RA6-F3 | FALSE-ALARM-CHECKED | - | `INSERT OR IGNORE` on `planned_muscle_volume` silently dropping a new seed: week ids are `uid()` per activation, so ids never collide across blocks. The remaining retry-window concern is already P9-09, carried | `database.js:4230-4300, 4116-4119` |

**Counts.** DEFECT 6 · IMPROVEMENT 2 · LATENT 3 · FALSE-ALARM-CHECKED 3.

---

## Detail and direction sketches

Directions are sketches for the lead to rule on, not applied changes.
None of them touches ED-safety floors or gates, the deterministic engine
guarantee, GDPR/Article 9, product IDs, billing flows, free/pro gating
policy or the dependency set.

### RA6-1 (DEFECT, MED-HIGH) - the legacy manual blob disables the Pro adapted layer

`effectiveLandmarks.js` opens with "Do not re-derive the precedence
anywhere else", and every consumer obeys: four display screens and
`blockLedgerRunner.js:179` all resolve through `mergeLandmarkPrecedence`.
That function accepts any manual entry with three finite numbers
(`:46-50`). `isManualEdit` (`:85-96`) exists precisely to neutralise
historical full-table saves, and Stage 6 wired it into
`blockLedgerRunner.js:231` (`manualOverride`) and
`blockLedgerRunner.js:408` / `blockSeed.js:76` (the seed's manual rung),
but not into the resolver itself.

Probe RA6-M, on the real module, with a full-table blob of research
defaults and a genuine adapted chest band `{mev 9, mav 18, mrv 26,
isAdapted: true}`:

    with the blob:  table.chest = {mev 6, mav 14, mrv 22}, source 'manual'
    without it:     table.chest = {mev 9, mav 18, mrv 26}, source 'adapted'
    isManualEdit(blob.chest, research) = false

Reachability is broad, not theoretical. `VolumeHeatmapScreen.js:250-255`
records that the editor "historically saved ALL muscles"; the key
`@volyume_landmarks_<userId>` mirrors to `user_prefs` by prefix
(`sync.js:1400`), so the blob survives reinstall and reaches a new
device; and nothing migrates it. Only a fresh save through the current
editor clears it, and a user with no reason to revisit that screen never
will.

Consequences: (a) the Pro adapted layer is inert on VolumeHeatmap,
Analytics, CoachReview and WorkoutSummary; (b) `landmarks` handed to
`classifyMuscleBlock` (`blockLedgerRunner.js:226`) is the research table
rather than the adapted one, which changes `mev`, `mav` and therefore
`peakCeiling` and every clamp in `finish()`; (c) the `source` map labels
a value the user never chose as "your own setting", which is the exact
inverse of the SHOW ME WHY promise. Note also that
`PERSONALISATION-MATURITY.md` §4 states "`isManualEdit` protects the
adaptive layer from being disabled by untouched editor defaults", which
is not true of the resolver it is describing; that line needs correcting
alongside any fix.

**Direction sketch.** Apply the existing predicate at the one resolver:
in `mergeLandmarkPrecedence`, treat a manual entry as present only when
`isManualEdit(entry, research[muscle])`, so an untouched or legacy
default falls through to `adapted` and then `research`. This is a pure
change to an already-pure function, it re-derives no precedence, and it
makes the resolver agree with the two consumers that already apply the
predicate. Pin both directions (a real edit still wins; a research-equal
blob no longer suppresses `adapted`) and re-anchor the maturity doc's §4
sentence.

### RA6-2 (DEFECT, MED-HIGH) - systemic signals decide every muscle at once

`recoveryCostWeight` (`interBlock.js:99-107`) sums five signals. Two are
per-muscle (`sorenessLateAvg`, `jointDiscomfortAvg`, 1 each). Three are
block-level and identical for every muscle, because
`blockLedgerRunner.js:250-253` writes the same `readinessSlope`,
`sleepFlaggedWeeks`, `deloadFlagFired` and `deloadFlagMidBlock` into
every muscle's recovery input. `deloadFlagFired` alone scores 2, and the
excessive-cost threshold IS 2 (`interBlock.js:78, 146`).

Probe RA6-D: with performance up 2.5% and per-muscle soreness and joint
answers benign, a single block-level deload flag moves chest from
RESPONSIVE to OVERREACHED, and back with it. The OVERREACHED branch then
pulls every muscle's peak to `min(achievedPeak, plannedPeak) - 2` and
speaks it per muscle: "Chest progressed, but the recovery cost ran high
late in the block". The same happens from `readinessSlope <= -0.3`
combined with two flagged sleep weeks.

Two consequences worth separating. The BEHAVIOUR may well be correct and
protective: a corroborated systemic fatigue signal arguably should pull
everything back, and `buildBlockLedger`'s recovery-duration rule already
requires two persistent systemic signals before stretching the deload
(`interBlock.js:398-404`). The problems are that (i) the per-muscle
VOICE claims muscle-specific evidence the block does not have, and (ii)
the campaign's flagship simulation demonstrates independence that
production cannot reproduce: `campaign6.sixBlock.test.js:132` gives quads
`deloadFlagFired: true` in block 1 while chest is RESPONSIVE in the same
block, which the runner's single systemic value forbids.

**Direction sketch.** Two separable pieces for the lead to rule on.
(1) Voice: when `costWeight` is met with no per-muscle contribution
(`sorenessLateAvg` and `jointDiscomfortAvg` both null or below
threshold), the rationale should name the block-level cause rather than
the muscle, for example "Recovery ran high across the block, so the peak
comes down here too." (British English, no em dash, no internals.)
(2) Simulation fidelity: the sixBlock and athlete180 harnesses should
derive each muscle's `readinessSlope` / `sleepFlaggedWeeks` /
`deloadFlagFired` from ONE block-level script value, as the runner does,
so the pinned arcs are reachable. Whether the classification threshold
itself should require any per-muscle contribution is a genuine engine
question and should be a founder or lead decision, not a quiet change:
raising the bar would make the system LESS conservative, which Section 2
posture disfavours.

### RA6-3 (DEFECT, MED) - a stale peak re-inflates a strain-reduced ceiling

`learnedRange.js:119` declares `highestHandledPeak` as a running maximum
over the whole replayed history; `:157-160` sets the ceiling's step
target to that maximum on every RESPONSIVE entry, gated only on the entry
not being suppressed. The current block's own achieved volume is used to
UPDATE the maximum but never to bound the step. STRAINED and OVERREACHED
move the ceiling down (`:162-167`) but do not touch the maximum.

Probe RA6-A (table under question 2): 21 -> 13 across four strained
blocks, then 13 -> 19 across three responsive blocks whose achieved peak
was 10. The muscle's most recent seven blocks contain no evidence
whatsoever for a 19-set ceiling.

The header comment states the intent: "the ceiling learns the HIGHEST
volume handled (a later good lower-volume block cannot erase proven
capacity)". That rule is sound in isolation. The gap is its interaction
with the downward rules: strain evidence is spent (it lowers the ceiling
once, 2 sets at a time) while success evidence is permanent, so any
sequence with intermittent responsive blocks converges back to the
all-time maximum regardless of what has happened since.

**Direction sketch.** Options, in ascending order of change, for the lead
to choose between rather than for me to pick:
(a) bound the upward step by the CURRENT entry as well as the running
maximum, for example `stepToward(ceiling, min(highestHandledPeak,
achievedPeak + CEILING_STEP_MAX), CEILING_STEP_MAX)`, so re-earning
proven capacity still takes 2 sets a block but each step is corroborated
by the block in front of it;
(b) reset `highestHandledPeak` on a STRAINED or OVERREACHED entry, so the
maximum means "highest handled since the last time this muscle struggled"
rather than "ever";
(c) leave the behaviour and pin it as a deliberate characterisation, on
the argument that proven capacity should never expire.
Whichever is chosen, the invariant should be pinned explicitly, because
today no suite exercises a strain-then-recovery sequence at a lower
volume. Note that (a) and (b) are strictly conservative and (c) is the
status quo, so none of them makes the engine more aggressive.

### RA6-4 (LATENT, MED) - capacity discovery is one-directional

By construction `achievedPeak <= plannedPeak` for a compliant user, the
seeded peak is clamped by the learned ceiling, and the RESPONSIVE step
target is the maximum achieved peak. So the supremum of the ceiling is
non-increasing over any history in which the user never exceeds their
prescription. Probe RA6-G shows the convergence and the fixed point: 21,
19, 17, 15, 14, 14, 14, 14, with every block classified RESPONSIVE.

The only paths that can raise a ceiling above its profile-adjusted
starting value are user-ADDED sets (ruled legitimate evidence under
P9-10) and the adapted MRV clamp, which raises the CAP but never the
ceiling itself. The engine therefore cannot discover that a muscle
tolerates more than the research prior said unless the user
spontaneously does more than they were asked.

The user-facing half is the sharper problem. The rationale says "and the
peak comes down" but never why, and the true reason is the user's own
delivered volume, which they may well read as the coach deciding they
cannot handle it. This sits beside M-1 (frozen provenance clause) and B1
(per-muscle band provenance, founder-gated) but is a different claim: not
that the copy lacks depth, but that a specific reduction has an
unstated and counter-intuitive cause.

**Direction sketch.** Copy first, mechanism second and separately.
(1) When the peak reduction traces to `achievedPeak < plannedPeak` on a
RESPONSIVE block, say so plainly, for example "Your top week came in
around N sets rather than the M planned, so the next block's peak is set
where the work actually landed." (2) Whether the engine should ever
PROBE upward (a deliberate above-ceiling week to test capacity) is new
coaching behaviour and a founder question, not a lead ruling: it would
make the engine more aggressive and touches the volume prescription
directly.

### RA6-5 (DEFECT, MED) - "responded well ... so the next block starts lower"

`composeRationale` (`interBlock.js:211-224`) supports a function-form
`why` precisely so a branch whose clamp reverses direction can re-word
itself, and the earned RESPONSIVE branch uses it
(`interBlock.js:363-367`). The non-earned branch passes a bare string
(`:368`), while the same branch is subject to
`start = min(start, learnedCeiling - 2)` at `:359`.

Probe RA6-L walks the real chain: chest, pair every block until block 8,
achieved peak pinned at 10, so the start climbs while the ceiling falls.

    B7  seed 11/13  lc=11  -> 9/11   "...its learned volume ceiling sets where the next block can safely sit, so the next block starts 2 sets lower and the peak comes down."   (earned form, coherent)
    B8  seed 9/11   lc=10  -> 8/10   "Chest responded well at this dose, so the next block starts 1 set lower and the peak comes down."                                        (retention form, incoherent)

The Stage 2 review's own rule ("a clamp that nullifies a cut must not
still claim one", review #1) is violated in the opposite direction here:
a clamp that creates a cut still claims retention.

**Direction sketch.** Give the non-earned branch the same function form,
returning the retention sentence when `ds === 0` and a ceiling-framed
sentence when `ds < 0`, reusing the earned branch's existing
ceiling clause so no new vocabulary is introduced. Pure copy, no number
changes; pin both arms.

### RA6-6 (LATENT, LOW-MED) - manual intent that coincides with research

`isManualEdit` returns false when every band equals the research row
(`effectiveLandmarks.js:92-95`), which is correct for the untouched
default it was written for and wrong for a deliberate choice of the same
number. Probe RA6-E shows the ledger taking over (14/24) where the user
had asked for 6/14.

This is narrow (it needs all three bands to match research exactly) and
the Stage 6 trade-off was the right one given the storage format. But
question 9 asks whether manual intent ALWAYS wins, and the honest answer
is no.

**Direction sketch.** Record intent rather than infer it: store an
explicit marker alongside the values (for example an `editedAt` stamp per
muscle written by `saveLandmarks`), and treat presence of the marker as
the manual test, falling back to the current value comparison for legacy
blobs. This composes with RA6-1's fix rather than competing with it, and
it is additive to a pref blob that is already guarded and stamped
(F4, D97-19). Low priority; the lead may reasonably rule it not worth
the storage change.

### RA6-7 (DEFECT, MED) - the dividend document's provenance

`PERSONALISATION-DIVIDEND.md:5-7` states that "the same arcs are pinned
permanently in campaign6.sixBlock.test.js, campaign6.athlete180.test.js
and campaign6.relationship.test.js". Three problems:

1. **The headline chest arc is pinned nowhere.** The table's Block 6
   "start 11" requires the dose-response pair in five consecutive blocks
   on the `adjust` intent. Probe RA6-J reproduces it exactly (6, 7, 8, 9,
   10, 11 with deload 11), so the number is TRUE; but `campaign6.sixBlock`
   drives chest to 7 (pairs in blocks 2 and 4 only, block 5 suppressed)
   and `campaign6.athlete180` drives chest to 6 (exercise change in block
   4, calm in block 5). The document's own headline is therefore
   contradicted by two of the three suites it cites as its pins.
2. **The calves mechanism is mis-attributed.** §2 row 3 records
   "Strain-led reduction | Calves ceiling 21 -> 15 from handled-volume
   evidence | longitudinal STRAINED/OVERREACHED fold rules", and §1 calls
   it the "strain/thin-data arc". The calves arc in both suites contains
   no STRAINED and no OVERREACHED block; every block is RESPONSIVE. The
   ceiling falls through `learnedRange.js:153-161`, the RESPONSIVE
   handled-peak step, because the athlete delivered 14 to 15 sets against
   a prescribed 21. That is an adherence-shaped reduction, not a strain
   signal, and the difference matters: the document presents it as
   "personalisation protecting the user" when the mechanism is "the
   ceiling learned what you actually did".
3. **"Research peak of 21" is not the research peak.** Probe RA6-J:
   calves research is `{mev 8, mav 14, mrv 20}` and the profile-adjusted
   prior is `{mev 8, mav 21, mrv 22}`. 21 is the PROFILE-ADJUSTED MAV.
   The honed endpoint of 15 is still above the raw research MAV of 14, so
   the "honed the ceiling DOWN" framing overstates the protection.

None of this changes any shipping behaviour; it changes what the campaign
has evidenced. Given the document's own stated standard ("Nothing here is
aspirational copy"), the mismatch is a finding.

**Direction sketch.** Either pin the headline arc (add the
pair-every-block chest arc to `campaign6.sixBlock` or a sibling suite so
the claim has a home) or restate §1 as a probe result with the probe
recorded, and correct §2 row 3 and §1 row 4 to name the RESPONSIVE
handled-peak rule and the profile-adjusted (not research) prior. This
review deliberately did not edit that file.

### RA6-8 (IMPROVEMENT, MED) - the recommendation steers away from the dividend

`buildNextBlockRecommendation` returns `'repeat'` whenever there are no
high signals and average readiness is at or above 60
(`blockAdvisor.js:279-296`), which is the modal state for a healthy
athlete, and returns `'repeat'` by default when there are no check-ins at
all (`:276`, default 70). `PlansScreen.js:399` maps `repeat` and
`consider_rebuild` to a true repeat, which discards every ledger
proposal.

Probe RA6-B ran six blocks in which the athlete earned the dose-response
pair EVERY time, on the repeat intent. Every block's ledger said "the
next block starts 1 set higher". Every block seeded 6/23. Block 6 was
Block 1.

The copy compounds it: the repeat branch's body says "You'll come back a
little stronger each block", on the option that guarantees identical
weekly set targets. That may be defensible if "stronger" means loads
rather than sets, but it sits next to a decision card whose whole purpose
is the volume choice.

FQ-2 correctly stopped either option being framed as the wrong one, and I
am not proposing to reverse that. The question is whether the RECOMMENDED
option should be the one that throws away the block's evidence when that
evidence says the athlete has earned more.

**Direction sketch.** A product fork for the lead under D33, framed as
options rather than a recommendation:
(a) leave it: recommending continuity is conservative and the adjusted
option is always rendered;
(b) recommend `adjust` when the finished block's ledger contains at least
one earned climb or a reduction, and `repeat` otherwise, so the advice
tracks what the evidence actually says;
(c) leave the recommendation and change only the repeat branch's body so
it does not promise progression it will not deliver.
Whichever is chosen, the Free path must be unaffected: Free's only
reachable intent is repeat and its copy is already ruled clean (M-19).

### RA6-9 (IMPROVEMENT, MED) - the Pro option's numeric difference is often nil

Probe RA6-H: over a six-block retention arc, `adjust` and `repeat` return
identical `startSets` and `peakSets` in every block, and in this arc the
same deload number. `blockSeed.js:93-108` makes this structural: when the
ledger's proposal equals the observed numbers, which is exactly what the
founder's retention rule produces in the absence of an earned pair, the
two intents converge. The strain-scaled deload (`:126-147`) is the only
guaranteed difference, and it differs from the flat research MEV week
only when the achieved peak and strain weight put the dose above it.

The Pro copy states a mechanism ("your next block's weekly set targets
start from what this block showed, muscle by muscle") rather than an
outcome, so it is not false. But a user upgrading for that line will, on
the coach's own default judgement, receive the same numbers.

**Direction sketch.** Do not change the gate. Consider making the
DIFFERENCE visible at the moment of choice: the seed receipt already
computes the per-muscle deltas (`blockExplain.buildSeedReceipt`), so the
decision card could state what adjust would change before the user
commits, and say plainly when the answer is "the same targets, with a
recovery week sized to this block". That turns a hidden nil into an
honest retention statement, which is the FB-27 posture already adopted
elsewhere. Copy and composition only; no gating change.

### RA6-10 (LATENT, LOW) - the seed has no confidence bar

`learnedRange.js:133` refuses entries below confidence 0.6;
`resolveSeedRange` (`blockSeed.js:88-92`) checks only that the proposal
carries numbers, is not manual-deferred and is not INSUFFICIENT_DATA.
Probe RA6-F: a confidence-0.5 entry contributes nothing to the band
(`isLearned: false`) yet seeds 12/22 with a deload of 9.

Benign today: the composite confidence also gates the `+1`
(`interBlock.js:353-355`), so a sub-bar block can only retain or reduce.
It is recorded because the two bars disagree by design accident rather
than by decision, and a future change to either branch could make the gap
bite.

**Direction sketch.** Record the asymmetry as a deliberate
characterisation with a pin ("a sub-bar entry may seed a retention but
may never seed a climb"), or align the bars. No behaviour change is
needed now; the value is the pin.

### RA6-11 (DEFECT, LOW-MED) - the next-block recommendation reads rows of any age

D97-8 closed exactly this pattern for `detectSignals` in this function:
`getRecentCheckins(userId, 8)` is row-limited, not dated, so a returning
user met present-tense advice built from pre-lapse rows. The fix gates
`signals` on a check-in within 14 days (`blockAdvisor.js:402-405`).

`avgReadiness` was not gated. `blockAdvisor.js:275-276` maps the SAME
unfiltered `checkins` array through `checkinReadiness`, and that average
is the sole numeric input to the branch choice at `:279` and `:299`. All
three call sites pass the unfiltered array (`:433, :456, :501`).

Consequence for the six-month athlete: a user returning after a long
absence, with `signals` correctly empty, still has their next-block
recommendation chosen by check-ins from before the gap. With stale
readiness at or above 60 they are told "Go again: same plan"; below 60
they are told "Same plan, slightly adjusted. The structure is working",
a present-tense claim about a block that ended months ago. The direction
of error is not uniformly conservative: it can push a returning user onto
the adjusted path on stale evidence.

This is genuinely narrow in effect (both branches are benign options and
both remain user-confirmed) but it is the same defect D97-8 named,
surviving in the sibling read.

**Direction sketch.** Apply D97-8's own boundary: compute `avgReadiness`
from check-ins within the 14-day detraining window, and when none
qualify use the existing no-data default (70) rather than stale rows,
which lands on the conservative `repeat` branch. No new semantics, no
decay, no age rule beyond the constant already in use; strictly the
same standard the sibling meets. Pin the returning-user case in
`blockAdvisor.test.js`.

---

## Method note on what I could not break

Recorded so the lead knows where the review pushed and failed, not only
where it succeeded:

- The `+1` cap. I could not construct any input in which a single block
  moved the start by more than 1 without an explicit manual override.
  `interBlock.js:356` admits only `+1`, and `blockSeed` never adds.
- Suppression. I could not make a suppressed block raise the learned
  ceiling, seed a climb, or size a deload upward: three independent locks
  (`learnedRange.js:156`, `blockSeed.js:102-107, 126`, `interBlock.js:
  240-245`) each hold on their own.
- Determinism. Repeated probe runs and `campaign6.sixBlock`'s
  byte-identity test produced identical output every time; no clock, no
  randomness and no I/O reaches any module in this chain.
- Manual teaching. A `deferredToManual` entry contributes zero evidence
  and cannot seed, confirmed independently of the pinned test.
- ED-safety. Nothing in this chain consults tier, and nothing in it can
  move a calorie floor, an FFM floor or a suppression state.
- Apply plumbing (question 8). Persisted rows, unbounded reads, honest
  null when there is no next week.
