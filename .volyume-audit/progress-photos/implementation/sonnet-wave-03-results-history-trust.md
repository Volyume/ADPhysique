# Sonnet implementation wave: Results, history, and trust

## Source docs

Read IN FULL first:
1. `.volyume-audit/progress-photos/blueprints/results-ui-and-copy-blueprint.md` (governing for
   this wave)
2. `.volyume-audit/progress-photos/blueprints/scoring-accuracy-and-validation-blueprint.md`
   (§5 tier table, §9 receipts, §13 copy)
3. `.volyume-audit/progress-photos/blueprints/safety-privacy-blueprint.md` (word lists)
4. `.volyume-audit/progress-photos/evidence/scout-05-results-ui-history-comparison.md`
5. `CLAUDE.md`

## Goal

Make what users SEE match the honesty the engine already computes: the confidence-tier rendered
contract, receipts on every outcome, the comparable-points-only trend view, the recalibration
note, and the one-time meaning moment. Presentation only; zero engine changes.

## FOUNDER GATES (must be answered before build)

- The scoring blueprint deliberately keeps the numeric uncertainty range hidden
  (qualitative-first). Confirm the founder endorses NOT surfacing a numeric range (Phase 1
  evidence-gaps §7 Q3). If the founder wants a range shown, this wave's specs change; stop and
  ask.
- Low-tier "Show score anyway" affordance (results blueprint §1): confirm wording and inclusion.

## Current evidence

- Score formatting: `formatVolyumeScore` → "NN/100" (`src/lib/progressScanDisplay.js:19-23`);
  assessment copy `progressScanAssessmentCopy` (`src/lib/progressScanAnalysis.js:815-832`) shows
  "Volyume Score 74/100" + confidence text; NO test pins the confidence chip's rendered
  prominence (scout 4).
- History card: `src/components/ProgressScanHistoryCard.js` — "Read quality" pill (~152-157),
  unscored-state labels (~45-54), why-copy (~105-125), weight cell (~99-103).
- Timeline: `renderCheckInCard` + `libraryScanSummary` (`src/screens/ProgressPhotosScreen.js`
  ~1032-1144); score row cells Score / Leanness / Change.
- Compare surfaces: `src/components/ProgressPhotoCompare.js` (neutral contract + banned-word
  test — DO NOT TOUCH) and `src/components/ProgressScanCompare.js` (score/band/weight/delta).
- Engine already computes everything receipts need: withhold reasons
  (`SCORE_WITHHOLD_REASONS`), setup findings (`scanSetupStability` issue codes, ~901-950),
  comparability status (`scanComparability`, ~961-1019), delta explanation
  (`explainMeasuredScanDelta`, ~1035-1190), trend gating (`canCallPairTrend`), bias-driven
  margin widening. `hiddenLegacyRange` exists and stays hidden.
- Historical recalibration: `normaliseStoredPhysiqueAssessment`
  (`progressScanAnalysis.js:644-689`) can shift stored scores on version migration with no user
  note (scout 5).
- No score-over-time chart exists (pairwise compare only); no dedicated meaning/methodology
  moment was evidenced (a `MethodologyScreen.js` exists in `src/screens/` — READ IT FIRST and
  reuse/extend rather than duplicating).
- Theme tokens mandatory (`src/styles/theme.js`); FlashList used for lists (e8 guard test
  exists); suppression via `usePhotoSuppression` (`src/hooks/usePhotoSuppression.js`).

## Files/areas likely involved

- `src/lib/progressScanDisplay.js` / `progressScanCopy.js` (receipt view-model, tier contract
  helpers — pure functions, testable)
- `src/components/ProgressScanHistoryCard.js`, `src/components/ProgressScanCompare.js`
- `src/screens/ProgressPhotosScreen.js` (trend view entry, meaning moment trigger,
  recalibration note)
- A new trend component (e.g. `src/components/ProgressScanTrend.js`) — check
  `.claude` dataviz conventions and existing chart components in the app first; match whatever
  charting approach the app already uses (search before adding anything)
- `src/lib/progressScanPreferences.js` or AsyncStorage for the meaning-moment seen flag
- Colocated `__tests__`

## Requirements

1. **Tier rendered contract** (scoring blueprint §5 table): High/Moderate/Low/Not-enough each
   render exactly what the table allows; confidence chip at equal visual weight with the score
   (shared type-scale tokens); accessibility labels always include the tier with the score.
2. **Receipts**: every scored / downgraded / withheld / baseline / not-comparable outcome renders
   one calm sentence + a "Why?" expansion, built from existing reason/setup-finding codes via a
   pure view-model. Internal flag names never render; bias flags surface only as the calibration
   honesty line (safety blueprint §4).
3. **Trend view**: comparable scans only; unconnected markers for non-comparable; confidence
   encoded by marker shape (not colour alone); gaps visible with tap-through reasons; no
   smoothing/projections/goals; language ladder (starting point / early read / trend); empty
   state "Trends appear after three comparable photo sets"; suppression-gated like every score
   surface.
4. **Recalibration note**: when a stored assessment renders with a version-migrated score, show
   the one-time inline note ("Scores were recalibrated in an update. Your photos are unchanged.").
5. **Meaning moment**: one-time, one-screen, before the first score render (exact copy from the
   results blueprint §1); "Understood" dismiss; never shown again; reuse `MethodologyScreen`
   content where sensible.
6. All copy verbatim from the blueprints where given; British English; no em dash; theme tokens;
   44x44 minimum targets on new elements.

## Acceptance criteria

- [ ] Founder confirmations recorded (range stays hidden; Low-tier affordance wording).
- [ ] Per-tier render tests pass (all four tiers, including Low's gated integer).
- [ ] A test fails if the confidence chip is removed or demoted from any score render
      (source guard or render assertion).
- [ ] Every outcome class renders a receipt; snapshot/behavioural tests per class; no banned
      words (extend the banned-word test pattern to the scored surfaces with the safety
      blueprint's list).
- [ ] Trend view plots only comparable points (fixture with mixed comparability proves it).
- [ ] Recalibration note renders exactly once per migrated assessment.
- [ ] Meaning moment shows once, persists dismissal, and blocks nothing else.
- [ ] Neutral compare (`ProgressPhotoCompare`) byte-identical; its banned-word test untouched
      and passing.
- [ ] Suppression: with calm mode or open ED flag, scores/deltas/trend language absent from all
      new surfaces (fail-closed), photos still viewable.
- [ ] `npm run lint && npm test` output reported verbatim.
- [ ] Manual device checklist (Android EAS build): view a scored set per tier state where
      reproducible; open trend view with 0/1/2/3+ comparable sets; VoiceOver/TalkBack pass on
      the score row and trend points.

## Tests required

- Pure view-model tests (receipt builder, tier contract helper).
- Render tests per tier + suppression states.
- Scored-surface tone contract test (banned-word regex, new).
- Trend comparability filtering + empty state.
- Recalibration-note once-only.

## Safety rules

No shame, no score chasing, no body panic, no false certainty. Word lists in the safety
blueprint §1 are law. Down-trends use the same neutral structure as up-trends. Nothing new on
home/Today/notifications.

## Coach rules

Do not touch Coach/check-in integration. `CoachOutputScreen.js` and
`progressScanCoachResolver.js` are out of scope (wave 4).

## Do-not-overbuild warnings

- No numeric uncertainty display (deliberate decision, founder-confirmed above).
- No chart library additions without asking (CLAUDE.md dependency rule); prefer what exists.
- No animations; respect Reduce Motion by having nothing to reduce.
- No redesign of the timeline cards; the score row keeps its shape, gains the contract.

## Forbidden changes

- Engine files (`progressScanAnalysis.js` maths, thresholds, reasons) — display only reads.
- ED-safety system; `ProgressPhotoCompare` and its test; share-sheet flow; `SYNC_REGISTRY`;
  billing/tier/identity/notifications; `main` branch. No attribution in commits.

## Final response format for Sonnet

1. Files changed (paths + one line each).
2. Tests run (exact commands + verbatim result lines).
3. Acceptance checklist with pass/fail.
4. Remaining risks (bullets, honest).
