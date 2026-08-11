# Campaign 6 — D97 rulings register

Every ruling made in this campaign, with rationale. Lead-ruled under
D33 (best-for-user criterion) unless marked founder. Section 2
inviolables bind every ruling; billing PRICE changes stay
founder-gated; D91-24/25 stay characterise-only.

## D97-1 (Phase 7) — stale-history copy, two fixes, copy only

"Readiness a bit below your recent average" (blockAdvisor) rested on
the last 8 check-in ROWS at any age → now "your personal baseline"
(what the z-score actually is; the high-severity sibling already said
so). "Targets use your recent weight trend" (ProGoalSetup) rested on
the last logged weigh-in at any age → now "your last logged weight"
(temporal identity, true at any age). Every other recency claim traced
to a genuinely dated window and recorded truthful in LAPSE-MATRIX.md.
No calculation touched.

## D97-2 (Phase 2 finding) — adaptive-band ordering inversion, FIXED

getAdaptiveLandmarkHistory returns ORDER BY started_at DESC;
computeAdaptiveLandmarks takes entries.slice(-8) as "the last 8 data
points". Together: the Pro session-grain adapted bands were computed
from the OLDEST eight sessions inside the 200-row window — months-old
evidence presented as current for any mature user, barely moving as
new sessions arrived. Ruled a plain contract bug (the function's own
comment states "last 8"), NOT D91-25 freshness semantics: no decay, no
age rule, no epoch — the fix is one .reverse() at the feeder so the
slice reads the genuinely most recent sessions. Both consumers
(effectiveLandmarks, sessionAdjustments) feed the array straight into
computeAdaptiveLandmarks; the internal trend derivation is
per-muscle-constant and unaffected. Pinned in
campaign6.longTerm.test.js. Downstream clamps (MRV caps, manual >
adaptive precedence, suppression, safetyHold) all unchanged.

## D97-3 (Phase 6) — the stored-ledger layoff asymmetry: FOUNDER QUESTION, carried

A ledger computed at decision time is served as-is months later
(idempotent by version) and resolveSeedRange takes no age input, so a
user who SAW the decision screen before a long layoff is offered the
fresh-time climb, while a user who never opened it gets the >= 4-week
stale-evidence hold. Bounded today (max +1 start; peak reached only
via the 5-week ramp; loads cut 10% on 7-day exercise gaps and
effort-gated by FQ-3) but no mechanism reduces SEEDED VOLUME after
absence when the ledger predates the layoff. Any fix would be
freshness semantics — exactly what D91-25 defers. Carried to Phase 57
debt triage as a founder decision, with the full characterisation in
LAPSE-MATRIX.md and the behaviour pinned as CURRENT in
campaign6.longitudinal.test.js.

## Phase 2 candidate defects carried for later phases (not yet ruled)

- stimulusReady in the session-adjustment engine reads lastFeedback of
  unbounded age (the only ungated branch is the one that ADDS a set) —
  to be verified and ruled in the Phase 12 progression lane.
- consecutiveOffTargetWeeks / PoorRecovery / Exceeded counters chain
  across arbitrary gaps with no week-adjacency test (the sibling
  lastCalAdjustmentWeeksAgo counts real elapsed weeks) — to be
  verified and ruled in the Phase 26 lapse lane.

## D97-4 (Phase 12) — stimulusReady age gate, FIXED conservative-only

The session-adjustment +1 branch read lastFeedback (performance/pump)
of unbounded age: the soreness branches are age-gated (72h/4d) but the
one branch that ADDS a set survived any absence, so a six-month-old
"easy, mild pump" session read as readiness for more volume on the
first session back. Gated on the engine's EXISTING 14-day detraining
boundary (the same constant blockLedgerGather's rebound window uses:
"a longer gap is detraining, not rebound") - no new semantics, no
decay, strictly conservative (the branch simply does not fire on stale
feedback; no behaviour became more aggressive). Verified against the
full engine suites.

## D97-5 (Phase 26) — consecutive-week counters gain calendar adjacency, FIXED

consecutiveOffTargetWeeks chained +1 from a coach output of any age;
consecutivePoorRecoveryWeeks and consecutiveExceededWeeks counted
unbroken ROW runs, so a months-long gap chained an ancient week onto
today's ("second consecutive poor week" on the first week back -
false certainty, lapse-is-not-failure law; ancient "exceeded" weeks
fed the D15 faster-update path with false upward evidence). All three
now require adjacent CALENDAR weeks (the standard the sibling
lastCalAdjustmentWeeksAgo already meets). Deliberately NOT changed:
consecutiveGrade3RecoveryWeeks - it certifies the ABSENCE of
persistent fatigue to unlock an upward-leaning softening, and an
unknown gap must keep withholding that certification (adjacency there
would have weakened conservatism). Pinned with the asymmetry named.

## D97-6 (Phase 1 seam 3) — launch-time notification restore was dead for signed-in users, FIXED

The only launch-time restoreNotifications call sat BELOW the signed-in
branch's return in RootNavigator, so for every signed-in user it never
ran (and the no-session path it did run on had a null user id). Every
"re-laid on every launch" guarantee (FM-03 training reminders, the
cascade/win-back windows, meal reminders, RB-2's coach-ready re-lay)
was real only after a quiet-hours edit or a timezone change. The
restore now also runs on the signed-in path with the real user id;
every scheduler inside self-gates on permission, tier, toggles, push
budget and ED flags, so this restores intended behaviour and changes
no policy.

## D97-7 (Phase 1 seam 4) — the phase clock, FIXED

phaseStartedAt was written once at onboarding and never again, so
weeksInPhase measured weeks-since-account for ever: false week labels
on coach outputs after any phase change, and a brand-new cut skipped
the honest baseline period (weeksInPhase >= 2 permanently satisfied),
receiving full trend coaching in week one from a weight series built
during the previous phase. ProGoalSetup now resets the clock ONLY when
the phase genuinely changes; schedule/equipment edits through the same
screen leave it alone.

## D97-8 (Phase 1 seam 2) — no current signals without a current check-in, FIXED

detectSignals speaks in the present tense; its input was row-limited,
so a returning user met "this week" recovery advice computed from
months-old rows (a fabricated recovery assumption). getBlockAdvice now
detects signals only when the LATEST check-in is within 14 days (the
engine's detraining boundary); the z-score baseline still reads older
rows once a fresh latest exists, and blockLedgerGather's block-end
reads are date-anchored separately and unaffected. Behavioural pin in
blockAdvisor.test.js; fixtures re-anchored same-meaning with fresh
stamps.

## D97-9 (Phase 1 seam 5) — activation paths that discard the learned band: FOUNDER QUESTION, carried

Ledger seeding travels on exactly one route (Continue with adjustments
passes { ledger: seedRanges }); plan switch, phase-change rebuild and
the post-upgrade wizard all create template ramps (source 'template',
honestly labelled). So a block-eight user who changes plan or phase
receives block-one volumes even though the muscle-scoped learned band
is portable by design intent. Wiring the learned band into the other
activation paths is real engine design (which paths, which intent
semantics, suppression posture) - surfaced as a founder decision in
the Phase 57 triage with a recommendation, not silently built.

## D97-3 addendum (Phase 1 seam 1)

Second bypass recorded: a block abandoned mid-way classifies
INSUFFICIENT_DATA (adherence/exposure gates), which resolveSeedRange
treats as no-valid-ledger, falling through to the LEARNED BAND - the
one path with no staleness guard (computeLearnedRange has no clock).
So the exact D91-25 case (multi-month absence, return to the same
plan) routes around the >= 4-week ledger hold. Carried with D97-3 to
the founder triage; characterised only.

## D97-10 (Phases 16 + 26) — Coached auto-apply bounded to the current cycle, FIXED

The Coached-mode auto-walk fired on whatever output the screen
displayed, and the no-check-in-this-week redirect (correct for the
normal Monday flow) has no age bound - so a returning Coached user's
months-old reviewed-but-unapplied output was executed into TODAY's
block the moment the Coach tab opened (an old proposal resurrected;
Phase 26's question 7). The walk now requires the displayed output's
week to be the live week or the immediately previous one (the Monday
redirect case), preserving the intended Coached cycle exactly; older
outputs keep their manual Apply buttons with every clamp intact. The
D16 safety-hold confirm-first gate stays ahead of the age gate,
pinned.

## D97-11..17 (Phases 9 + 44) — the plan-lifecycle batch, FIXED

From AUDIT-PLAN-LIFECYCLE.md (7 DEFECT / 7 LATENT / 8 CLEAN):

- **D97-11 (P9-01, HIGH).** A block left by switching plans never had
  its ledger computed and no caller could ever reach it again - five
  weeks of real evidence permanently unread. KEY FACT: the evidence
  was never destroyed, only never judged. backfillMissingBlockLedgers
  now judges switched-away finished blocks lazily at consumption time
  (seed building; BlockReflection computes-if-absent). Every existing
  protection composes: the runner's finished-state precondition
  (status is DATE-derived, so abandoned blocks become judgeable when
  their calendar runs out), the adherence/exposure gates (a week-2
  abandonment classifies INSUFFICIENT_DATA honestly), and the
  >= 4-week stale hold (weeksOverdue is real at backfill time, so old
  evidence cannot climb). Idempotent, bounded, best-effort.
- **D97-12 (P44-02, HIGH + P9-08).** setActivePlan now unarchives on
  activation and runs its deactivate/activate pair in one transaction;
  getActivePlan gains the deterministic newest-wins tiebreak. The
  active/archived partition is a partition again.
- **D97-13 (P44-03, MED-HIGH).** is_archived now syncs both ways (the
  cloud column existed since migrate_012 - no migration needed) and
  archivePlan/unarchivePlan/archiveOtherUserPlans schedule pushes.
  Reinstall no longer resurrects every archived plan. The stale
  local-only comment corrected. Campaign 1 positional pin re-anchored
  same-meaning with the new column asserted.
- **D97-14 (P9-04).** PlanDetailScreen gains the RB-3 synchronous
  guard on both activation paths (the one entry point the pin missed).
- **D97-15 (P44-05).** An abandoned block's end_date truncates to the
  switch day (only when its planned end is still ahead), so Past
  blocks stops showing overlapping six-week ranges for two-week
  blocks. Status remains start-derived; display truth only.
- **D97-16 (P9-06).** buildBlockStartLines gains hadPriorBlocks: a
  mature user's template-seeded block now reads "This block starts
  from research-based guidance for this plan..." instead of falsely
  claiming they lack personal history. First-use copy unchanged.
- **D97-17 (P9-07 + P44-11/12).** The recovery-week and open-decision
  switches get their own honest dialogues (the blanket silent pass
  and its false "about to roll over anyway" rationale removed);
  duplicatePlan stamps source provenance; the free-starter dedup
  reuses an archived copy instead of duplicating it.
- **Accepted/no-action:** P9-10 (set-count edits teaching
  achievedPeak) - ruled NOT a defect: user-ADDED sets are performed
  work the muscle genuinely handled; the manual exclusion is for
  landmark OVERRIDES, not for training actually done. P44-13
  (next_workout_index not synced) - the cloud column does not exist,
  so the fix needs a migration; recorded for the Phase 57 triage
  rather than written mid-campaign. P9-09 (pre/post-transaction gaps
  in activatePlanWithBlock) - recorded; full closure needs the
  week-generation calls inside the transaction, a deeper change
  carried to the triage. P9-14: this batch adds the missing
  planSwitch behaviour pins via campaign6.longTerm.

## D97-18 (Phases 10 + 11) — exercise/PR audit ruling directions (implementation in progress)

From AUDIT-EXERCISE-PR-HISTORY.md (10 DEFECT / 7 LATENT, 16 verified
invariants):

- **P11-1 (HIGH), split ruling.** Cluster-committed rows (myo-reps /
  rest-pause) store actual_reps as the SUM of every effort - not a rep
  count - so they are EXCLUDED from estimated-max record candidacy
  everywhere (eligibility truth, not maths tuning). The separate
  high-rep Epley fidelity question (20-rep sets out-estimating heavy
  fives on ORDINARY sets) is PR maths for real sets and goes to the
  FOUNDER (Phase 57) - not changed here.
- **P11-2 (HIGH), fix.** computePRsPerWeek mirrors the live detector's
  gates (no first-exposure records - FQ-7; warm-ups excluded;
  weight-reps exercises only). The pinned test that enshrined the
  defect is re-anchored same-meaning-corrected with FQ-7 named.
- **P10-1 (HIGH), fix.** The records wall derives from ALL completed
  history: completed-workouts join and the LiftProgress unbounded
  pattern replace the 200-row window (a records surface may not
  truncate; the replay's first-exposure semantics need the true
  beginning of history).
- Remaining P10/P11 findings: to be ruled with the implementation
  batch (this entry is the recovery anchor if the session dies
  mid-batch; the full findings live in the audit file).

## D97-18 completion — the three HIGH record defects, FIXED

- P11-1: isE1rmEligibleRow shared eligibility - a cluster row (myo-reps
  / rest-pause, whose actual_reps is a SUM of efforts) can neither set
  nor seed an estimated-max record in detectPR. The high-rep Epley
  fidelity question for ORDINARY sets goes to the founder (Phase 57),
  untouched here.
- P11-2: computePRsPerWeek mirrors the live detector - first exposure
  is a baseline (FQ-7), warm-ups and clusters excluded, non-weight
  exercises excluded (the unused exerciseMap now read). The pinned
  test that enshrined the first-set-is-a-record defect is re-anchored
  CORRECTED with FQ-7 named, plus new gate pins.
- P10-1: the records wall reads getCompletedSetHistoryForExercise
  (completed-only join, unbounded) - a records surface may never
  derive from a rolling 200-row window; incomplete-workout rows and
  the false window-edge first-exposure marker go with it. Mount-test
  mocks re-anchored to the new fetch.
- Remaining P10/P11 MED/LOW findings and the LiftProgress/strength-
  standing cluster-eligibility wiring: carried on the audit file for
  the next batch; the record WRITER (detectPR) is closed, so no new
  inflated records can be created from clusters anywhere.

## D97-19 (addendum: choice memory) — F-register rulings

From CHOICE-MEMORY.md (39 choices: 29 remembered/respected, 10 not):
- **F5 FIXED**: the insight-dismissal ratchet on pull (a cloud null can
  never clear a local dismissal - the calm-ratchet pattern; Promise 4).
  The honest-timestamp half needs a local schema column - deferred with
  the note in code.
- **F8 FIXED**: the block-decision snooze is per-user now.
- **F4 FIXED (both safe halves)**: the per-uid profile blob (tone,
  autonomy, show-science, bodyweight units, meal prefs) is now a
  GUARDED pref - saveLocalProfile stamps real writes; and a
  machine-rebuilt blob (reinstall restore) is flagged and suppressed
  from the pref push until a real user write lands, closing the
  single-device reinstall wipe. Residual recorded: the choices are
  absent for the first post-reinstall session (in-memory profile
  rehydrates next launch).
- **F3 CARRIED** (workout_notes sync needs a cloud migration - founder
  decision), **F9 CARRIED** (revert expiry is undefined product law -
  beside D97-3 in the triage), F6=FR-C4-2, F7=P44-13 as already ruled.
- **PERSONALISATION-MATURITY.md corrected** (dated banner): the
  AsyncStorage reinstall-loss claims were wrong - pref sync is
  allow-by-prefix and manual landmarks/calm are stamp-guarded; all
  five named values cross a reinstall. Verified by the lead.
- Relationship moments: A=12 B=6 C=0 D=2. B2 (upwardCarryPrevented
  never spoken) is a FOUNDER COPY QUESTION (calm/ED are deliberately
  ORed; separating them in copy risks exposing detector state). B1
  (per-muscle band provenance dropped at the merge) and B4 (nutrition
  provenance constant) recorded as the two implementation candidates
  under the saturation rule; evidence-age gaps deliberately routed to
  the D91-25/D97-3 triage.

## D97-20 (Phases 18-21) — tier/trial audit ruling directions

From AUDIT-TIER-TRANSITIONS.md (6 DEFECT / 5 LATENT / 5 CLEAN):
- **P-1 (HIGH), fix**: the FQ-6.1 retry never arms - startCascade
  NEVER rejects ({ok:false} results), so the consent screen's .catch
  queue path and the flush's try/catch split are dead code, and the
  flush clears the queue unconditionally. Rewire both to inspect
  RESULTS (queue on network-shaped ok:false; keep the queue on a
  failed flush; clear only on success or definitive refusal), with
  BEHAVIOURAL tests this time.
- **P-2 (HIGH), split**: weeksInPhase counts wall-clock across
  uncoached months ("Week 34 · Cut" + "below maintenance for 34
  weeks" on the first run back; hasEnoughData permanently satisfied).
  Direction: evidence-bounded claims - the copy that asserts
  continuous adherence must not count gap weeks; the diet-break
  suggestion is protective and stays. Exact mechanism to be
  implemented with care next batch; NOT a silent phase-clock reset.
- **P-3 (MED-HIGH), fix**: blockLedgerRunner's sleepFreeReadiness
  still defaults energy/soreness to 3 for evidence-free rows - align
  with FB-36 (a row answering neither is no reading, returns null).

**P-1 LANDED** at 23e3f907: Article9ConsentScreen queues on the
RESULT (`grant.ok === false`), flushPendingCascade judges the result
(ok → clear + flushed; network-shaped error → KEEP queue; definitive
refusal → clear without grant; unexpected local throw → keep).
Behavioural suite `payments/__tests__/pendingCascade.flush.test.js`
(6 tests, mocked storage + cascade) replaces the dead-path source
pins; fq6.billing pins re-anchored same-meaning. Full bar green
(825 suites, 10,036 tests, lint clean).

**P-3 LANDED** at 06796ce8: sleepFreeReadiness in blockLedgerRunner
holds the FB-36 guard (a row answering neither energy nor soreness
returns null, which computeReadinessSlope already discards); pinned
in campaign6.longTerm.test.js.

**P-2 LANDED** at the following commit: evidence-bounded claims,
exactly per the recorded direction. Mechanism: new pure engine input
`evidencedWeeksInPhase` (caller-derived: distinct phase weeks with a
saved coach output via new `getCoachOutputWeekStartsSince`, plus the
week being run). The phase clock, gates, deload trigger and
diet-break TRIGGER still read wall-clock weeksInPhase (no reset, no
decay, D91-25 untouched). Claims bounded: week label counts coached
weeks; under a genuine gap (evidenced < wall-clock - 1) the
diet-break note and the DietBreakCard state the cut's SET-AGE ("This
cut has been set for N weeks") instead of continuous under-eating,
via new output field `dietBreakContinuityEvidenced`. One-week
tolerance keeps continuously coached users byte-identical; absent
input keeps every legacy caller byte-identical (both pinned in
weeklyCoach.evidencedClaims.test.js, 9 tests).

**P-4 LANDED** at 853819d0 (lead-ruled, D33: evidence-honest and
stricter only). Both arms of the completed-check-in gate (the bare
`!!checkin` truthiness and the caller's lastCheckinAt taking the
newest row regardless of content) accepted the sleep-only row a
workout summary writes; both now require recorded check-in answers
(energy, soreness or calorie adherence) - the same evidence rule as
FB-36 and the recovery counters. Without a real check-in the
recalibration freeze stands, which is the founder decision's stated
intent ("the wellbeing capture has not gone dark"). Pinned in
adaptiveTdee.b1.replay.test.js.

**P-5 LANDED** at 61fb8a51 (lead-ruled): hadPriorBlocks counts an
ENDED prior block alongside a stored ledger, so a mature user whose
blocks were never judged is no longer handed beginner copy. No claim
gets stronger. Pin re-anchored in campaign6.longTerm.test.js.

**P-6 LANDED** at 300bd5d1 (lead-ruled, D33 rationale recorded): of
the audit's fork, ruling (a) - a repeat intent seeds from the
finished block's own observed numbers before any learned step, even
when the entry is unjudgeable - is the best-for-user answer because
(i) it makes the repeat button's promise TRUE rather than re-wording
it, (ii) it closes the free/pro leak (Free's only intent is repeat;
the learned band is coaching-shaped) which option (b) would leave
open, and (iii) it honours self-directed continuity as autonomy (the
addendum's RESPECT MY CHOICES). Adjust intent untouched; the D97-3
staleness question on the learned band stays open and unchanged.
Pinned in blockSeed.stage6.test.js (4 tests).

**Latents P-7..P-11 disposition (lead):** P-7 (startCascade fails
OPEN on {ok:true, data:null} - defaults to a live trial and writes
tier pro) is a billing-flow behaviour change and therefore
FOUNDER-GATED under Section 2; carried to Phase 57 triage as a
founder question with a written test-plan requirement. P-8 (Pro-era
recovery cards render up to 14 days after tier loss), P-9 (recovery
insight calls sleep rows "weekly check-ins"), P-10 (offline-expired
trial shows stale Subscription copy) and P-11 (ledger frozen with
computing tier, no tier provenance) carried to Phase 57 triage with
severities as recorded in AUDIT-TIER-TRANSITIONS.md.

## D97-21 (addendum: 180-day relationship report) — the nine questions derived

The addendum requires the 180-day report to answer "the nine
questions" (line 134-135) but enumerates none, anywhere in either
source document (both read end-to-end; the six-block seven ARE
enumerated at line 131-132). Lead ruling (D33) rather than a silent
guess or a parked deliverable: Q1-Q5 = the five permanent promises
applied to the 180-day arc; Q6-Q8 = the three campaign laws plus the
safety inviolables; Q9 = the honest continuity/loyalty verdict
(handover item 96). Derivation stated in the report header
(ATHLETE-180-REPORT.md) and FLAGGED FOR FOUNDER CONFIRMATION in the
final handover; if the founder's intended nine differ, the section is
re-answered against them. Rationale: the mapping uses only the
addendum's own stated frameworks, adds nothing, and keeps the
deliverable auditable against its source.

## D97-22 (Phases 25-31) — return/history audit rulings

From AUDIT-RETURN-AND-HISTORY.md (29 findings, lead-verified):
- **R-1 (HIGH) FIXED** at 1e90ae09: the weigh-in week window is
  clock-anchored (nowMs) instead of newest-row-anchored, and a week
  with no readings has a null delta. Strictly conservative (the data
  hold can only fire more often). Verified hands-on: the caller read
  IS row-limited (getMorningWeights(60)) and the degenerate 0-delta
  was real. LAPSE-MATRIX.md's adaptive-TDEE "truthful" row is
  superseded; corrected banner to be added when that file is next
  touched.
- **R-2 (MED-HIGH), fix ruled**: the Progress trend card must be
  date-windowed like the coach now is (decision vs displayed truth
  must agree). NEXT batch.
- **R-4 (MED-HIGH), fix ruled**: a mid-accumulation leaver must not
  resume inside an unearned recovery week; direction to be
  implemented against the audit's 4x3 matrix. NEXT batch.
- **R-5 (MED-HIGH), fix ruled**: "Your body's ready" at unbounded
  weeksOverdue is an unsupportable claim plus urgency copy in the
  lapse lane; replace with honest neutral copy. NEXT batch.
- **R-3 FOUNDER-GATED (verbatim carried)**: buildWeighInSeries still
  has no production caller (revert dd67bbf4) - ED-safety gates stay
  blind to Body Metrics weigh-ins; added to the founder board beside
  D97-3.
- R-7 (device-global churn key), R-8 (Home weigh-in uneditable),
  R-9 (ledger never rebuilds after history deletion; force exists
  uncalled - attached to D97-3), R-10 (streak pause evaporates
  outside the 12-week window): ruled fix/carry per the audit's
  sketches, worked in the NEXT batches; remaining LATENT/IMPROVEMENT
  items to Phase 57 triage.

## D97-23 (Phases 32-38) — reinstall/sync audit rulings

From AUDIT-REINSTALL-SYNC-OFFLINE.md (24 findings, key items
lead-verified hands-on):
- **S-1 (HIGH) = D92-11, UNCHANGED (compliance correction
  2026-08-11)**: this finding is the already-known D92-11 issue
  (open ED-pattern/safety state does not propagate cross-device),
  and the Campaign 6 order explicitly holds D92-11 UNCHANGED and
  forbids adding cross-device ED propagation. Therefore NOT built in
  this campaign - an implementation briefly drafted in-session was
  reverted uncommitted the moment the boundary was re-confirmed.
  NEW EVIDENCE recorded under D92-11, raising its stakes for the
  founder's separate decision: the flag has NO cloud writer anywhere
  (client pull_only; the handler comment claiming the server writes
  it is false), and TWO cloud-side consumers read the never-written
  table - partner-cheer's ED downgrade (functions/partner-cheer
  /index.ts:149-161) and migrate_123's suppressed_wellbeing
  retention-email contract - so those suppressions cannot operate as
  designed, and a reinstall silently loses an open flag. If the
  founder later authorises the architecture, it is separately
  commissioned work, not Campaign 6.
- **S-14 + S-15 (HIGH) VERIFIED - migration 135 is DEFECTIVE AS
  WRITTEN and must NOT be run**: its tie-break deletes the applied
  receipt when the merely-viewed duplicate is newer, and after its
  unique index a device holding a legacy coach-output id poisons its
  entire 200-row batch upsert (atomic) with 23505 permanently.
  MIGRATION-RELEASE-GATES.md corrected: 135 HELD pending a corrected
  tie-break (applied wins outright, newest among applied) plus a
  client-side re-id migration in the same build. Revised order:
  134 -> 132 -> 133; 135 later.
- **S-11 (HIGH) VERIFIED**: 132 is a hard gate for cross-device
  adaptive truth (provenance AND the [mev,mrv] clamp band are lost
  without it); stays in the run-next batch.
- **S-2/S-3/S-8 (pref sync last-syncer-wins, no tombstones, dual
  notification families)**: narrow fixes ruled IN PRINCIPLE within
  the existing guarded-pref mechanism (extend stamps to the
  reminder/quiet-hours keys); NO wholesale consolidation. NEXT
  batch; FR-C4-2 remains the founder's architecture question.
- **S-4 (adaptation_events restore lands in a zero-reader mirror)**:
  product consequence now proven (revert memory, add-frequency cap,
  Engine Log lost on reinstall); FR-C4-3 carried to the founder with
  this evidence. **S-5 (offline delete queue parks + resurrection)**:
  fix ruled, NEXT batch. S-6/S-7/S-17/S-19 + S-16's correction to
  the gates record: recorded; triage.

## D97-21 CORRECTION (compliance recovery, 2026-08-11)

D97-21's premise was false: the addendum DOES enumerate Review E's
twelve questions - the session scratchpad capture had compressed them
to a count. The derived nine-question framework is superseded as a
commissioned requirement (retained in ATHLETE-180-REPORT.md as a
marked lead-derived analysis structure only). Review E runs on the
exact twelve questions from the founder's restatement. Root cause
(compressed addendum captures) recorded in the compliance ledger;
every subsequent requirement check runs against the recovery order's
enumeration, not session memory.

## D97-22 dispositions completed under the compliance recovery order

- **R-4 FIXED** (ruling (b)+(a)): a recovery week is only claimed LIVE
  with a completed workout inside the 14-day boundary; otherwise the
  calendar fact is stated with no prescription. Option (c) (pausing
  the block clock) is D91-25-adjacent → Phase 57 founder item.
- **R-6 FIXED**: the Home readiness caution requires the last session
  inside 14 days; undated sessions cannot prove recency.
- **R-12 FIXED (semantics)**: an untrained week is the accumulation
  boundary, never "a rest week the user took"; outcome unchanged and
  polarity pinned.
- **R-14 FIXED (display only)**: the coach weight chip formats the
  raw kg delta per bodyWeightUnits; maths and storage stay kg.
- **R-15 FIXED**: Year of Lifts records gated by isE1rmEligibleRow.
- **R-17 FIXED**: win-back claims storage only; calm mode joins the
  lay gate.
- **R-16 BLOCKED-FOUNDER**: an inactivity stand-down for the weigh-in
  prompts is NEW notification policy under NOTIFICATIONS_LOCKED.md
  (Section 2 locked doc) and sits beside the already-founder-gated
  FR-5 unsubscribe question. Recommendation for the ruling: stand
  both prompts down after 3 consecutive weeks with no weigh-in and no
  session (mirroring lapseDetect's C5-P28-04 precedent), re-laid by
  restoreNotifications on return; full stop, no taper. NOT built.
- **R-18 BLOCKED-FOUNDER**: the FFM-floor weight input (profile
  weight of unbounded age) is a floor INPUT and therefore Section 2;
  carried to Phase 57 beside R-3 with recommendation (a) (refresh
  userProfile.weightKg from logged morning weights exactly as Goal
  Setup already back-fills it - keeps "stated truth" stated, never
  lowers a floor by rule change). NOT built.
- **R-9 CARRIED**: ledger rebuild after historical deletion is the
  D97-3 family (the force path exists, uncalled); one founder
  decision covers both.
- **R-13 CARRIED to Phase 40**: the ~20-rescan Progress landing cost
  is the commissioned measure-first performance lane's first
  measurement, actioned there, not ad hoc.

## D97-23 dispositions completed under the compliance recovery order

- **S-2 FIXED**: notification-pref blob + quiet hours join
  GUARDED_PREF_PATTERNS; all six writers stamp. S-3's
  deletion/tombstone half stays with FR-C4-2 (founder architecture).
- **S-5 FIXED (ruling (b))**: network-shaped failures never spend the
  delete retry budget; the delete workers rethrow transport errors so
  the scheduler sees the real shape; definitive refusals still park.
  Behavioural pins both ways.
- **S-14/S-15 FIXED, UNAPPLIED (route A+C)**: migrate_135 corrected
  in place (applied wins outright; survivors re-idded deterministic)
  + local v72 re-ids legacy device rows. Proven in a scratch cluster
  (S-14 receipt survives; zero non-deterministic ids; idempotent) and
  behaviourally (v72 runs the real pipeline on real SQLite). Release
  condition recorded: 135 only after the v72 build is live. NOT run.
- **R-3 BLOCKED-FOUNDER, proof complete**: buildWeighInSeries has NO
  production caller (test-only); Body Metrics weights never reach the
  rapid-loss/max-safe-loss/ED s1 signal, which reads morning_weights
  exclusively. The locked record answers the wiring question the
  OTHER way: dd67bbf4 explicitly REVERTED this exact merge as
  crossing an ED-safety inviolable, and
  CoachOutputScreen.morningWeightsSource.guard.test.js pins the
  current wiring so a silent merge fails CI. Wiring it is therefore a
  FOUNDER decision by standing law. Consequence for that decision:
  the gap is false-negative shaped (a user weighing in only via Body
  Metrics gets no rapid-loss protection); R-8's fix narrows the gap's
  edge (Home rows now correctable) but does not close it.
