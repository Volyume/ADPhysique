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
