# Progress Scan + Coach Integration Plan and Status

Run: 2026-07-09. Lead: Fable. Status legend: PLANNED → BUILT → VERIFIED.

## 1. Accuracy gate status

**PASS** (see `accuracy-gate.md`). All seven gate criteria pass; 554 targeted tests green; lint
clean. No scoring fixes required before integration.

## 2. Fable integration recommendation

Adopt the founder hypothesis with one architectural sharpening: scan evidence is integrated as a
**deterministic evidence/receipt layer composed around the engine, never inside it**.
`runWeeklyCoach`, `coachApply`, `nutritionEngine`, `planEngine` and `weekly_checkins` stay
scan-free (the existing byte-identical guard remains valid and untouched). The "Coach includes
scan evidence in its progress assessment" requirement is met at the Coach OUTPUT layer: a pure
classifier compares the scan trend against the engine's own weight-trend output and goal phase,
and emits a deterministic receipt stating how the evidence was interpreted. Target changes remain
Coach-rule decisions by construction, not by convention.

Role split (product model):
- **Check-in** = evidence review. The user sees their scan's status (valid / low confidence /
  withheld / non-comparable / none this period) with its receipt, beside their weight and
  adherence data, before submitting.
- **Coach output** = interpretation. The existing "Progress photo context" card grows the
  assessment receipt: supported / conflicted / visual change with stable weight / inconclusive /
  not used, plus why targets did or did not change (always attributed to Coach rules over logged
  data).

This run's founder instruction supersedes the "premium later" gating of integration blueprint
§12 items 1–3. Blueprint §12 item 4 (Tier 2 corroboration touching the decision-confidence
caption) stays hard-blocked: it requires external ground-truth validation data.

## 3. Integration architecture

- New pure module `src/lib/progressScanCheckInEvidence.js`: evidence packet v2 builder +
  deterministic assessment classifier + receipt builder. No I/O, no store access, no engine
  imports (source-guarded).
- Producers: existing `getProgressScanCoachSummary` (scan selection, suppression-aware) +
  `resolveProgressScanCoachNote` + `buildProgressScanCoachEvidence` (v1) feed the v2 builder.
- Consumers: `WeeklyCheckInScreen` (evidence block + optional scan prompt), `CoachOutputScreen`
  (card extension), `HomeScreen` (nudge subline), `ProgressPhotosScreen` (post-scan value line).
- Persistence: NONE. `weekly_checkins` and `coach_outputs` stay scan-free (existing guards).
  Receipts recompute deterministically from stored scan rows + stored coach output; evidence
  selection is windowed against the coach output's week so receipts are stable retroactively.
- Suppression: every new surface fail-closed via `usePhotoSuppression()` (screens) or the pure
  `isPhotoSuppressed` where a screen already owns raw reads (CoachOutputScreen pattern).
  Suppressed = the surface is absent, indistinguishable from no-scan.

## 4. Scan evidence object

`ProgressScanCheckInEvidence` (v2), wrapping/extending v1:

- `version: 2`
- `status`: `no_scan_ever | no_recent_scan | valid | low_confidence | withheld | not_comparable |
  baseline`
- `assessment`: `supports | conflicts | visual_change_weight_stable | inconclusive | not_used |
  insufficient_data`
- `eligibleForAssessment` (boolean): true only for scored, High/Moderate tier, comparable scans
  captured inside the check-in window
- carried v1 fields: `score`, `band`, `confidenceTier`, `capturedAt`, `withholdReasons`,
  `trendWindow`, `validityStatus`
- `receipt`: `{ headline, detail, usedSentence }` (deterministic strings)
- `conflictSource`: `scale | performance | null`
- `usedFor: 'progress_assessment_context'` (founder-authorised enum widening of the v1 enum;
  pinning tests updated loudly)
- `affectsTargets: false` — hard-coded literal, source-guarded, unchanged

Classifier rules (deterministic, ordered): withheld → not_used; low tier → not_used;
non-comparable → not_used; fewer than 3 comparable points in the trend window → inconclusive
("not enough comparable photo data yet" — mirrors blueprint §6: no conflict is ever declared on
thin data); otherwise compare scan trend direction vs goal-phase expectation vs weight-trend
direction (flat band respected): agreement → supports; weight flat + scan toward goal →
visual_change_weight_stable; divergence → conflicts (weight and intake always win for decisions);
else inconclusive. Low-confidence, withheld and non-comparable scans are recorded with receipts
but NEVER count as positive or negative progress evidence.

## 5. Check-in flow

`WeeklyCheckInScreen`:
- **Optional pre-check-in scan prompt**: quiet dismissible card at the top of step 0 (and
  mirrored above the Fast Check-In card): offer to do a scan first, "Do a scan" navigates to
  ProgressPhotos, "Not now" dismisses for this check-in only (component state, nothing
  persisted, no streaks, no guilt copy). Photo-suppression fail-closed; skipping never blocks
  or delays the check-in.
- **Evidence block in step 1 ("This week's data")**, after the weight-trend rows: scan status
  line + receipt + confidence chip for every state (valid / low confidence / withheld /
  non-comparable / baseline / none this period). Quiet neutral copy when absent; render nothing
  on read error (fail closed); loading state while resolving.
- **Fast Check-In**: one read-only scan context row in the summary when a valid packet exists;
  absent otherwise.
- No new fields to `saveWeeklyCheckin`; the scan-free COLS guard stays green and untouched.

## 6. Coach assessment flow

`CoachOutputScreen`:
- The existing "Progress photo context" card is extended with the v2 assessment receipt. The
  classifier runs at render-time on data already in scope: `output.trend` (delta, deltaLabel,
  onTarget), `output.goalPhase`, `output.adjustments.calories.change`, `output.heldDecisions`,
  `output.loadSignal`, plus the scan summary/note the screen already fetches.
- Receipt selection also keys on whether targets changed (calorie change nonzero → "targets
  changed for other Coach-rule reasons" wording) or were held ("targets held" wording), so the
  user always sees how the evidence sat alongside the decision.
- Suppression unchanged (pure `isPhotoSuppressed` on the screen's existing fail-closed reads).
- Engine inputs, `coach_outputs` persistence, and the folded-response adapter pattern unchanged.

## 7. Receipt model

Deterministic patterns (British English, calm, no em dash, non-chat), all carrying the
non-authority sentence where scan content renders:

1. Supports: "Your photo trend points the same way as your weight trend. Targets are set from
   your logged data."
2. Conflicts with scale/intake: "Your photo trend and scale trend disagree this week. The coach
   used weight and intake for the decision and kept the scan as context."
3. Conflicts with performance: performance-flavoured variant driven by `loadSignal` divergence.
4. Low confidence, not used: "Your recent photo set could not be read with confidence, so it was
   not used. Your plan comes from your logs as usual."
5. Withheld, not used: "No usable photo read this week. Your plan comes from your logs as usual."
6. No recent comparable scan: "No comparable photo set this period. The coach worked from your
   logged data."
7. Considered, targets changed for other reasons: "Your scan was considered as context. Targets
   changed because of your logged trend, not the scan."
8. Considered, targets held: "Your scan was considered as context. Targets were held based on
   your logged data, for the reasons above."
9. Visual progress, stable weight: "Your scale trend is steady while your photos suggest visual
   change. That can happen during recomposition. Targets are set from your logged data."
10. Inconclusive: "The photo read was inconclusive this week, so it was set aside."
11. Non-comparable: "This photo set was not comparable with your earlier sets, so it was kept as
    a record rather than evidence."

Measurements-conflict wording is included in the receipt set but only reachable if a
measurements trend is actually in scope at the call site (the agent verifies; if the coach
output carries no measurements trend, the pattern exists in the builder, documented as
unreached, rather than inventing an undata-backed conflict).

## 8. Today/check-in guidance

- `HomeScreen`: the EXISTING "Your weekly check-in is ready" nudge gains one optional,
  photo-suppression-gated subline: adding a progress scan first gives the check-in extra
  context, explicitly optional. No new banner competes in the one-banner priority chain.
- `ProgressPhotosScreen`: after a scan completes and is check-in-eligible (scored,
  Moderate+ tier, comparable), one value line: the coach can use this as context at the next
  check-in. Suppression-gated; absent for withheld/low results (their receipts already guide
  retakes — existing condition-blaming retake copy is the low-confidence retry prompt).
- Skipped scans produce NO copy anywhere beyond the neutral "No photo set this period." line.

## 9. Notification/deep-link decision

**No notification changes in this pass.** The locked check-in reminder
(`weekly_checkin_reminder`, `scheduler.js`) plus the existing `volyume://checkin` deep link and
`notificationRoute.js` mapping already deliver the user into the check-in flow, where the
optional scan prompt now lives — the minimum useful reminder/deep-link path exists with zero
changes. `docs/NOTIFICATIONS_LOCKED.md` locks category copy and the category table; adding scan
wording to the reminder or a `scan_ready` category requires explicit founder sign-off (locked
system). Recorded as a founder decision item, not silently built and not parked as "later": the
integration is complete without it, and the founder may commission it separately if wanted.

## 10. World-class polish completed

(updated as built)
- PLANNED: accessibility labels on every new block; loading/absent/error states on touched
  surfaces; receipt readability pass on the coach card; check-in evidence summary row in Fast
  Check-In; copy tone tests extended to all new strings.

## 11. Tests added

(updated as built — see implementation-log.md for run output)
- Evidence layer: classifier determinism + every status/assessment path; low-confidence /
  withheld / non-comparable → recorded-not-used; <3 comparable → inconclusive, never conflict;
  receipt pattern coverage incl. banned-word/em-dash tone guard; `affectsTargets:false` literal
  + enum pin (updated v1 pins); source guard that engine modules never import the new module and
  the new module never imports mutation functions.
- UI: check-in block renders per state; skipped scan does not block submit; `weekly_checkins`
  COLS still scan-free; suppression parity on all four touched surfaces (fail-closed); coach
  card shows assessment receipt incl. targets-held and targets-changed-for-other-reasons
  wording; stable-weight + visual-change receipt; Home nudge subline suppression; post-scan
  value line eligibility.
- Safety: existing nine guard tests remain green and unweakened; byte-identical engine guard
  untouched.

## 12. Hard blockers only

1. **Tier 2 corroboration rule** (scan trend corroborating the Coach's decision-confidence
   caption, blueprint §12 item 4): requires external ground-truth validation data (Tier 2),
   which cannot be manufactured from the current codebase. Category: requires a new external
   dataset.
2. **Scan-specific notification copy/category**: `docs/NOTIFICATIONS_LOCKED.md` is a locked
   founder document; changing reminder copy or adding a category requires founder sign-off.
   Category: founder decision on a locked system. The integration is complete without it (see
   §9).
