# Scout report: Future Coach/check-in integration attachment points

## Files inspected
- `src/lib/weeklyCoach.js` (full signature + body of `runWeeklyCoach`, lines 1-530+)
- `src/lib/coachApply.js` (exports list)
- `src/lib/nutritionEngine.js` (lines 560-960, exports list, `calculateNutritionTargets` at 807)
- `src/lib/coachingGoals.js`, `src/lib/whyThisTemplates.js` (physique-category false positives)
- `src/lib/checkinDerive.js`, `src/screens/WeeklyCheckInScreen.js` (check-in assembly)
- `src/lib/database.js` (`saveWeeklyCheckin`, lines 5036-5080; `weekly_checkins` COLS map)
- `src/screens/CoachOutputScreen.js` (lines 1230-1450, 1720-2050 — the coach-run/receipt boundary)
- `src/lib/progressScanCoachResolver.js` (full file, 142 lines)
- `src/lib/progressScanStore.js` (`getProgressScanCoachSummary`, lines 405-424)
- `src/lib/progressScanAnalysis.js` (exports list, `PHOTO_SCAN_SOURCE`)
- `src/lib/blockAdvisor.js`, `src/lib/planEngine.js` (exports lists; `generatePlan`, `getBlockAdvice` signatures)
- `src/hooks/usePhotoSuppression.js` and its call sites (ED/calm-mode gate)
- Tests: `src/lib/__tests__/progressScanSafetyFloorIsolation.test.js`, `src/lib/__tests__/ffmFloor.test.js`, `src/lib/__tests__/nutritionEngine.test.js` (lines 675-691), `src/lib/__tests__/progressScanCoachResolver.test.js`, `src/screens/__tests__/progressScanCoachIsolation.guard.test.js`, `src/lib/__tests__/checkinCoachAudit.guard.test.js`, `src/lib/__tests__/checkinIntegrity.a7.guard.test.js`
- Source documents: `audit/progress-flagship/stage1-internal-audit.md` (lines 100-145), `audit/progress-flagship/stage3-blueprint-approval-gate.md` (lines 225-415)
- `git log` for `src/lib/progressScanCoachResolver.js` (recency check)

## Search terms used
`photo|scan|image|physique|visual|ghost` (case-insensitive) across `weeklyCoach.js`, `coachApply.js`, `nutritionEngine.js`, `coachingGoals.js`, `checkinDerive.js`, `coachLedger.js`, `whyThisTemplates.js`, `coachOutput/viewCopy.js`, `coachApplyView.js`, `coachResponse.js`, `coachRegister.js`, `coachOutcome.js`; `photo_scan` and `bodyFatSource` repo-wide; `check.?in` (case-insensitive) repo-wide (176 files, used to scope candidate check-in files); `applyProgressScanCoachContext|resolveProgressScanCoachNote|progressScanCoachResolver`; `usePhotoSuppression|canShowProgressScanCoachContext`.

## Current-state evidence

**Contradiction found — the founder-fact framing needs qualification.** Progress photos/scans are not linked to *target-setting* (calories/macros/training/refeeds), but a photo-scan-derived coach note **is** wired into the Coach output screen today, not merely planned:

- `src/screens/CoachOutputScreen.js:1365-1367` calls `getProgressScanCoachSummary(user.id, { suppressed: edPatternOpen || calmNow })` on every coach-screen load.
- `src/screens/CoachOutputScreen.js:1444-1449` calls `resolveProgressScanCoachNote({ scan: scanCoachSummary, output: result, suppressed: resultEdPatternOpen || calmNow, trendOnly: hideExactScanRanges })` immediately after `runWeeklyCoach` returns.
- `src/screens/CoachOutputScreen.js:1725` computes `canShowProgressScanCoachContext = !!progressScanCoachContext && !edPatternOpen && !calmMode`.
- `src/screens/CoachOutputScreen.js:1769` folds it in: `applyProgressScanCoachContext(baseCoachResponse, canShowProgressScanCoachContext ? progressScanCoachContext : null)`, which appends `scanNote.coachLine` onto `coachResponse.interpretation` (`src/lib/progressScanCoachResolver.js:128-141`).
- `src/screens/CoachOutputScreen.js:2042-2048` renders a dedicated card ("Progress photo context" title, `progressScanCoachContext.body`) directly under the coach's weekly stat chips, gated on `canShowProgressScanCoachContext`.
- The data is real, not a stub: `getProgressScanCoachSummary` (`src/lib/progressScanStore.js:405-424`) queries the `progress_scan_sessions` SQLite table for the latest complete, fully-posed, analysed scan.
- `git log` shows this resolver file under active edit as recently as commit `883b772` (2026-07-08 05:36, today), part of a long chain of "Progress Scan" commits (`eb71b5b Add Progress Scan flow and safety guards` … `50343b6 Polish workout logger and progress scan`) already on this branch's history.

**This is precisely the design the founder pre-approved.** `audit/progress-flagship/stage3-blueprint-approval-gate.md:236-240` specified "Add a resolver outside the engine: `getLatestUsableProgressScanForCoach(userId)` … Returns a bounded summary or `null`" and lines 271-278 specified the coach "must not… Lower safety floors… Change calories from scan data alone… Surface exact body-fat estimates under ED/calm suppression." The shipped `progressScanCoachResolver.js` matches this shape and these rules closely (see "What already works well" below). So: **not a rogue integration**, but also **not "unlinked"** — it is a live, narrow, display-only linkage that was already scoped and approved in a prior audit stage, and is already built.

**No linkage into decision-making code.** Separately and correctly verified:
- `runWeeklyCoach` (`src/lib/weeklyCoach.js:383` destructuring, through line ~490) has no scan/photo/image field in its input contract, and no `...rest` passthrough — every accepted field is named explicitly.
- `src/screens/CoachOutputScreen.js:1381-1440` — the actual `runWeeklyCoach({...})` call — passes only `bodyFatPercent`/`bodyFatSource` sourced from `getBodyMetricLog` (`latestBf`, `src/screens/CoachOutputScreen.js:1263-1264`), not from any progress-scan table. `resolveProgressScanCoachNote`/`scanCoachSummary` are called and used only *after* this, for display.
- `bodyFatSource: 'photo_scan'` is a recognised enum value in `nutritionEngine.js` (`calcConfidence`, line 715) but is explicitly excluded from `isAuthoritativeBodyFatSource` (line 573-575, only `dexa|caliper|bia`) and `isBaselineBodyFatSource` (line 577-582, adds `visual|manual|self_reported` but not `photo_scan`). A photo-scan body-fat value therefore can never trigger Katch-McArdle BMR or lower the FFM floor — confirmed by `computeFFMFloor`/`calcBMR` logic and by five separate tests (see "Tests found").
- `src/lib/database/bodyMetrics.js` (body-fat log writer) has zero references to `photo_scan`/`progressScan` — nothing currently writes a photo-scan estimate into the body-metrics log that feeds `runWeeklyCoach`'s `bodyFatSource`.
- `weekly_checkins` table columns (`src/lib/database.js:5058-5073`, the `COLS` map in `saveWeeklyCheckin`) have no photo/scan/image field. `WeeklyCheckInScreen.js` has zero photo/scan references.
- "physique" hits in `coachingGoals.js`/`whyThisTemplates.js`/`nutritionEngine.js` are false positives: they are the `mens_physique`/`classic_physique`/`womens_physique` **competition-category** enum (bodybuilding divisions), unrelated to progress-photo scanning.

## What is evidenced
- One-way, display-only photo-scan → Coach linkage exists today (`CoachOutputScreen.js` lines 1365-1367, 1444-1449, 1725, 1769, 2042-2048).
- The linkage is architecturally isolated from `runWeeklyCoach`'s inputs/outputs, from `nutritionEngine.js`, `coachApply.js`, and from persisted `coach_outputs` (per `saveCoachOutput` guard test below).
- `photo_scan` is a recognised-but-non-authoritative `bodyFatSource` value in `nutritionEngine.js`, deliberately bucketed with `low` confidence and excluded from both the authoritative and baseline allowlists.
- The suppression gate (`!edPatternOpen && !calmMode`) matches the same ED-safety gating pattern used elsewhere (`usePhotoSuppression`), and `resolveProgressScanCoachNote` itself no-ops when `suppressed` or `scan.confidence === 'not_enough'`.
- A prior founder-approved blueprint (`audit/progress-flagship/stage3-blueprint-approval-gate.md`) already specifies this exact resolver-outside-engine pattern, bounded summary shape, and "must not" list — the current code closely follows it.
- Five distinct tests already assert `photo_scan` cannot gain FFM/Katch-McArdle authority (`progressScanSafetyFloorIsolation.test.js`, `ffmFloor.test.js`, `nutritionEngine.test.js`).
- `runWeeklyCoach`'s input destructuring has no catch-all/rest spread — a structural guarantee against silently smuggling extra fields into the engine.

## What is not evidenced
- No evidence of scan/photo data reaching `coachApply.js` (macro cycle, refeed day, deload volume), `planEngine.js` (`generatePlan`, training volume), `blockAdvisor.js` (block/diet-break transitions), or `cardio/cardioEngine.js`.
- No evidence of scan data persisted into `coach_outputs` (asserted by `progressScanCoachIsolation.guard.test.js:41-47`, not independently re-verified against the live save call site beyond the guard test's regex).
- No evidence that check-in submission (`WeeklyCheckInScreen.js`, `saveWeeklyCheckin`) reads, writes, or references scans in any way.
- No evidence of a written blueprint specifically for "photo/scan attaching to check-ins" (only "attaching to Coach output" is documented in stage1/stage3 — check-in-form attachment appears genuinely unscoped, not just unbuilt).

## What already works well
- Naming/shape discipline: the resolver's own header comment states it is "deliberately NOT part of weeklyCoach or nutritionEngine" (`progressScanCoachResolver.js:1-8`), and the returned note always carries `affectsTargets: false` and `usedFor: 'visual_trend_context_only'` (lines 123-124), self-documenting the boundary in the data shape itself.
- The allowlist pattern (`isAuthoritativeBodyFatSource`) is a clean, single-source-of-truth chokepoint — new sources default to *not* authoritative unless explicitly added, which is the safe failure direction.
- `decisionLine()` (`progressScanCoachResolver.js:82-92`) explicitly writes into the copy itself that "The weekly target still comes from your logs, weight trend, training and recovery, not from this scan" whenever a calorie adjustment is present — the user-facing text reinforces the non-authority in-line, not just in code comments.
- Dev-time jargon/dash guard (`clean()`, `progressScanCoachResolver.js:12-23`) reuses `checkJargon` from `whyThisTemplates.js`, keeping this new surface inside the existing coaching-voice lock rather than inventing parallel copy rules.
- ED/calm suppression reuses the same `edPatternOpen`/`calmMode` signals already computed for the rest of the coach screen — no parallel suppression logic to drift.

## Accuracy/trust risks
- `scanLabel()` (`progressScanCoachResolver.js:35-44`) surfaces a `leannessBandLabel` and `confidence` even though the estimator is explicitly "low confidence" by design (`nutritionEngine.js:711-716`); if the future work adds any additional context (e.g. training-volume framing) alongside this note, there is no structural block preventing scope creep beyond "trend context" other than test coverage and code review discipline.
- The isolation is currently enforced by **regex-based source guards** (`progressScanCoachIsolation.guard.test.js`, `progressScanSafetyFloorIsolation.test.js`), not by a type system or a runtime assertion inside the engine itself. A future refactor that renames `runWeeklyCoach`'s call site, or restructures `CoachOutputScreen.js`'s function boundaries, could silently defeat a regex guard (e.g. the `\n      });` delimiter search in `callBody()`) without failing loudly — worth flagging for anyone touching that screen.
- `coachSummaryFromScan` (referenced in `progressScanStore.js:419` but not read in this pass) is the actual place that turns a raw scan row into the bounded summary; its internal logic wasn't inspected in this pass and would need its own review before being trusted as an attachment point for anything beyond display copy.

## UX/safety risks
- The Coach-screen card (`CoachOutputScreen.js:2042-2048`) sits directly under the weekly stat chips, visually adjacent to calorie/weight-trend information — a user could read positional proximity as causal linkage ("the scan changed my calories") even though it structurally cannot. This is a copy/comprehension risk, not a code risk; `decisionLine()` already tries to pre-empt it in text.
- Suppression correctly cascades from both `edPatternOpen` and `calmMode` (`CoachOutputScreen.js:1725`, `1447`), consistent with the rest of the ED-safety system's fail-closed posture.

## Tests found
- `src/lib/__tests__/progressScanSafetyFloorIsolation.test.js` — house-style source-level regex guard (`fs.readFileSync` + `expect(source).not.toMatch(...)`) plus behavioural assertions that `photo_scan` cannot lower the FFM floor or authorise a deeper `runWeeklyCoach` cut. This is the pattern to copy for any new attachment surface.
- `src/lib/__tests__/ffmFloor.test.js` — behavioural test: `photo_scan` source is fallback-only, never `katch_mcardle`.
- `src/lib/__tests__/nutritionEngine.test.js:684-690` — `calculateNutritionTargets` with `bodyFatSource: 'photo_scan'` produces identical `bmrKcal` to no body-fat data at all, and `confidence: 'low'`.
- `src/screens/__tests__/progressScanCoachIsolation.guard.test.js` — the most directly relevant guard for future work: asserts (a) the `runWeeklyCoach({...})` call body contains no `progressScan|photo_scan|estimateBodyFatPercent|rangeLow|rangeHigh` tokens, (b) `saveCoachOutput(...)` call bodies contain none of those tokens either (nothing persisted), (c) the render gate requires `!edPatternOpen && !calmMode`, and (d) `nutritionEngine.js` still exposes an explicit allowlist function rather than a denylist (`not.toMatch(/bodyFatSource !== 'visual'/)`).
- `src/lib/__tests__/progressScanCoachResolver.test.js` — unit tests for `resolveProgressScanCoachNote`/`applyProgressScanCoachContext` in isolation (suppressed → null, wrong source → null, `trendOnly` hides band/score, `decisionLine` wording differs when a calorie adjustment is present vs not).
- `src/lib/__tests__/checkinCoachAudit.guard.test.js` and `src/lib/__tests__/checkinIntegrity.a7.guard.test.js` — same fs-regex-guard house style applied to check-in/coach wiring generally (narration vocabulary, confidence captions, late check-in handling); no scan content in either, confirming check-ins are untouched.

## Launch-critical opportunities
- None identified as "launch-critical" for the Progress Photos feature itself from this angle — the existing resolver already ships a safe, tested, founder-pre-approved integration. The main launch-relevant item is documentation/founder-awareness: the "not currently linked" framing this scout was asked to verify is stale relative to the repo, and whoever is coordinating the progress-photos audit should have this corrected explicitly (see Questions for Fable).

## Premium later opportunities
- `recentWeeklyHistory` (fed into `runWeeklyCoach`, `src/lib/weeklyCoach.js` ~453) and the ED-pattern detector's `signals` are the natural home for a *trend-only* scan signal if the founder ever wants scan trend (not the estimate) to influence e.g. the differential-paywall "stalled progress" trigger (`detectDifferentialTrigger`, imported line 24) — the audit docs' suggested bounded summary (`stage3-blueprint-approval-gate.md:242-259`: `{ source, capturedAt, bodyFatPercent, rangeLow, rangeHigh, confidence, qualityLabel, comparableScanCount, trendDirection, trendMagnitudePctPoints, supportingSignals, limitations }`) is a ready-made interface shape for this, but it is currently used only for the Coach-screen display card, not passed to any decision function.
- `getBlockAdvice(userId, activeBlock, userProfile)` (`src/lib/blockAdvisor.js:216`) is a plausible future attachment point for "physique recomposition supports holding the block" style context (mirroring the stage3 blueprint's "Hold unnecessary cutting pressure when scan, strength, and measurements support recomposition"), but there is currently zero wiring toward it.

## Things not to rebuild
- Do not build a second resolver/adapter pattern — `progressScanCoachResolver.js` already is the "resolver outside the engine" the stage3 blueprint called for; any future context (e.g. for check-ins or block-advisor) should extend this file or add a sibling with the same `affectsTargets: false` / `usedFor` self-documenting shape, not invent a new mechanism.
- Do not re-litigate the `isAuthoritativeBodyFatSource`/`isBaselineBodyFatSource` allowlist split in `nutritionEngine.js` — it already correctly excludes `photo_scan`, is covered by five tests across three files, and is the correct place to gate any future body-fat source.
- Do not rebuild ED/calm suppression for a new scan-adjacent surface — reuse `usePhotoSuppression` (screens/components) or the `edPatternOpen`/`calmMode` pair already computed in `CoachOutputScreen.js` (used identically by the existing scan-context gate).

## Questions for Fable
1. The founder fact framing this task as "progress photos/scans are NOT currently linked to Coach or check-ins" does not match the repository: `CoachOutputScreen.js` already renders a live "Progress photo context" card sourced from `progress_scan_sessions` via `getProgressScanCoachSummary` → `resolveProgressScanCoachNote` → `applyProgressScanCoachContext` (display-only, target-blind, per `audit/progress-flagship/stage3-blueprint-approval-gate.md`'s pre-approved design). Does the founder want this scout's "future attachment points" framing revised to "extend the existing display-only linkage" rather than "design a first linkage"?
2. Is the existing display-only linkage itself in scope for this progress-photos audit's review (i.e., should another scout independently verify `coachSummaryFromScan` in `progressScanStore.js`, which this pass did not open), or is it considered already-approved/out-of-scope because it matches the stage3 blueprint?
3. Given `git log` shows this integration under active edit today (2026-07-08) by commits attributed to "Codex", is there a coordination gap between concurrent agents/sessions working on Progress Photos that the founder should be aware of before more work lands on this branch?
