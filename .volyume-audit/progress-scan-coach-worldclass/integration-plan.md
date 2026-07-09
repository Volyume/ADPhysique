# Progress Scan + Coach Integration Plan and Status

Run: 2026-07-09. Lead: Fable. STATUS: BUILT AND VERIFIED (commits `7fc4ba0` evidence layer,
`84cab3b` UI wiring). Sections below are updated to as-built where review changed the plan;
each such change is marked "As built".

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
  Receipts recompute deterministically from stored scan rows + the engine's own outputs.
  **As built (anchoring):** `CoachOutputScreen` re-runs `runWeeklyCoach` fresh on every load,
  so nothing on that screen is frozen; the packet is anchored to the run's own moment
  (`Date.now()`), and the decision and receipt always move together from the same live inputs.
  The originally planned weekStart anchoring was rejected in review: it would have excluded
  the primary flow (a scan taken just before a mid-week check-in), and the evidence layer now
  also rejects any `capturedAt` after `nowMs`, so a scan can never classify into a window that
  predates it (negative-age fail-closed, test-pinned).
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
- **Optional pre-check-in scan prompt**: quiet dismissible card at the top, above both the
  wizard's first step and the Fast Check-In card: "Do a scan" navigates to ProgressPhotos,
  "Not now" dismisses for this visit only (component state, nothing persisted, no streaks, no
  guilt copy). Photo-suppression fail-closed; skipping never blocks or delays the check-in.
  **As built (no-nag rule):** the prompt shows ONLY when no recent scan exists for the window
  (`no_scan_ever` / `no_recent_scan`). A recent attempt that landed baseline, low-confidence
  or non-comparable already carries its own receipt and retake guidance on the scan surfaces;
  re-prompting at check-in would push a second capture at someone who just did one.
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

- Accessibility: `accessible` + plain-words `accessibilityLabel` (status + confidence) on the
  check-in evidence block and the coach assessment block; `accessibilityRole="button"` +
  labels on both prompt actions.
- Loading/absent/error states: check-in evidence block absent while loading and on any read
  failure (fail closed, same idiom as the screen's weight-trend block); prompt waits for the
  packet to resolve so it cannot flash on and vanish; suppressed users get NO placeholder,
  the surfaces are entirely absent.
- Receipt readability: coach card renders headline / optional detail / non-authority sentence
  as separated lines under a hairline divider; the non-authority sentence is deduplicated
  against the resolver body so it appears exactly once.
- Fast Check-In: read-only "Progress scan" context row when a valid packet exists.
- Copy tone: a dedicated wave tone guard (`progressScanIntegrationTone.guard.test.js`) pins
  every new screen string verbatim against source drift and bans shame/panic words, em dashes
  and exclamation marks; the receipt layer's own tone guard covers every classifier string.
- Consistency: the check-in classification uses the engine's own exported EWMA helpers over
  14 days of morning weights, so check-in and coach card read the same trend the same way.

## 11. Tests added

- Evidence layer (`progressScanCheckInEvidence.test.js`, 83 tests with the wave B additions):
  classifier determinism; every status/assessment path; low-confidence / withheld /
  non-comparable → recorded-not-used, never supports/conflicts; <3 comparable → inconclusive,
  never conflict; negative scan age (capturedAt after nowMs) fails closed to no_recent_scan;
  verbatim receipt coverage incl. targets-changed/held variants on supports and
  visual-change states and the conflicts hierarchy-sentence pin; tone guard over every
  exported string; source guards (affectsTargets literal, pure-layer imports, engine never
  imports it back); exact packet key set with no calorie/macro/target-named key.
- v1 pins updated loudly (`progressScanCoachEvidence.test.js`): usedFor enum exactly the two
  founder-approved values; affectsTargets pins re-asserted unchanged.
- UI (`WeeklyCheckInScreen.scanEvidence.test.js`, real mounts): prompt renders/dismisses/
  navigates, absent when a valid packet exists, absent under suppression; evidence block per
  packet state; no-scan renders only the quiet neutral line; Fast row; submit unaffected with
  no scan and no scan field persisted. (`CoachOutputScreen.progressScanAssessment.test.js`,
  house source-guard style): packet composed from the engine's own result fields at the
  run's own moment; targetsChanged derived from the calorie adjustment already on the card;
  dedupe + accessibility helpers pinned; saveCoachOutput and runWeeklyCoach inputs carry no
  scan/packet token. (`HomeScreen.progressScanNudge.test.js`): subline present unsuppressed,
  absent suppressed. (`ProgressPhotosScreen.checkInValueLine.test.js`): value line only for
  scored + high/moderate + Pro + unsuppressed, each condition individually.
- Tone (`progressScanIntegrationTone.guard.test.js`): every new screen string clean and
  verbatim-pinned to source.
- Safety: all pre-existing guards (byte-identical engine output, floor isolation, coach
  isolation, weekly_checkins COLS, suppression parity) untouched and green.

## 12. Hard blockers only

1. **Tier 2 corroboration rule** (scan trend corroborating the Coach's decision-confidence
   caption, blueprint §12 item 4): requires external ground-truth validation data (Tier 2),
   which cannot be manufactured from the current codebase. Category: requires a new external
   dataset.
2. **Scan-specific notification copy/category**: `docs/NOTIFICATIONS_LOCKED.md` is a locked
   founder document; changing reminder copy or adding a category requires founder sign-off.
   Category: founder decision on a locked system. The integration is complete without it (see
   §9).
