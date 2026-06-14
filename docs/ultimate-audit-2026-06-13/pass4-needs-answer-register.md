# PASS-4 — NEEDS-ANSWER REGISTER

Per `_AUDIT-SPEC.md:241-250`: any fact a blueprint needs but Pass 1/2/3 doesn't hold is logged here as an NA-id.
The agent/author does NOT guess. A targeted codebase read answers each with a CONFIRMED file:line. NO blueprint is
final while it holds an open NA-id (`:270-271`). Status: OPEN until answered.

## SPINE ITEMS (hand-written blueprints)
### Calorie banking (`pass4-blueprint-calorie-banking.md`)
- NA-cb-1 OPEN — generalise `dayVariantTargets` vs add `bankedDayTargets`? | src/lib/food/mealPlanAssembler.js, mealPlanService.js
- NA-cb-2 OPEN — exact file:line of check-in calorie-adherence derivation reading diary-vs-target | src/lib/weeklyCoach.js, src/screens/WeeklyCheckInScreen.js
- NA-cb-3 OPEN — surface placement (Diary day view vs Nutrition Targets) | src/screens/DiaryScreen.js, NutritionTargetsScreen.js
- NA-cb-4 OPEN — exact Pro gate fn for food/nutrition surfaces | src/components/ProGate.js, src/navigation/RootNavigator.js
- NA-cb-5 OPEN — `macroCycle`/`refeed` persistence path to mirror for `calorieBank` | src/store/useAppStore.js, src/lib/database.js

### Micronutrients / NRV (`pass4-blueprints-micronutrients.md`)
- **NA-mn-1 OPEN (BLOCKING)** — Pass-1 Q1 schema authority (setup_complete.sql 252 vs schema.sql 187 vs migrations 114) | supabase/setup_complete.sql, supabase/schema.sql, supabase/migrate_*.sql
- NA-mn-2 OPEN — which micronutrient columns the CoFID import carries | src/lib/food/seed.js, assets/seed/cofid_uk.dat
- NA-mn-3 OPEN — sync registry/mapping file for new food columns | src/lib/sync.js, src/lib/food/libraryDelta.js
- NA-mn-4 OPEN — exact Pro gate fn for diary/food surfaces | src/components/ProGate.js, src/navigation/RootNavigator.js

## CLUSTER-AGENT ITEMS
### Nutrition cluster (`pass4-blueprints-nutrition.md`) — 10 OPEN
NA-nutrition-1 (raw↔cooked gram-conversion source — NONE in code, grep=0), -2 (manual portion-entry surface
file:line), -3 (migration + default for NEW `food_entries.weight_state`), -4 (UK supermarket-aisle taxonomy vs
macro-role grouping), -5 (which weight state the grocery list shows), -6 (exact profile fields + `phase.isCut`
derivation to mirror the coach gate byte-for-byte), -7 (non-advanced: hide vs no-op the "Training day" chip),
-8 (protein-"hit" tolerance band), -9 (render calories at 30/90-day windows — 90 bars don't fit), -10
(`getRollupsForRange` uncapped for 90 days?). Full text in the blueprint file.

### Coaching/progress cluster (`pass4-blueprints-coaching-progress.md`) — 16 OPEN
NA-coaching-1/7/11 (PRIORITY SCORE not in source docs), -2 (lift/strength row reuse without duplicating
LiftProgress load), -3 (deterministic thresholds for "weight flat" / "composition moved"), -4 (recomp card FREE
vs PRO), -5 (recomp empty state), -6 (recomp suppression under ED flag/calm), -8 (autonomy local field name +
sync), -9 (autonomy option British copy), **-10 SAFETY-ADJACENT (is Coached auto-apply permitted while a safety
hold/suppression is active? → FOUNDER ESCALATION; do NOT resolve without founder + safety review)**, -12 (dry-run
seam in `generateAndSavePlan`), -13 (current-active-plan reader to diff against), -14 (diff screen vs panel),
-15 ("nothing would change" empty state copy), -16 (confirm `buildPlanInputs`→generation is pure so dry-run==commit).

### Workout/recap cluster (`pass4-blueprints-workout-recap.md`) — 11 OPEN
**MAJOR FINDING (read-confirmed):** recap items 3/4/5 are ALREADY LARGELY BUILT under prior work "COMP-005" —
share/export wired end-to-end (`YearOfLiftsScreen.js:425-471`, `ShareCardScreen.js:603-705,:903-926,:995-1015`),
monthly cadence built (`YearOfLiftsScreen.js:167-249 buildMonthCards`; `AnalyticsScreen.js:41-65`;
`scheduler.js:893-908`), month/block relative deltas exist. Genuine deltas only: keyboard-complete
(`SetEntry.js:124-126`), the swap's "keeps volume tracking" clause (swap exists `ActiveWorkoutScreen.js:319-342`,
store-only, routine read-only), and a relative anchor on the raw-tonnage hero (`YearOfLifts:77-86`).
NA-wr-1/5/8 (confirm Free/no-Pro-gate on logging + recap), -2 (enumerate `<SetEntry>` consumers), **-3 load-bearing
(exact meaning of "keeps volume tracking" on swap — founder clarify)**, -4/-6 (swap-modal JSX; getAllExercises
error guard), -7/-9 (residual recap share entries; monthly gating thresholds), **-10 load-bearing FOUNDER DECISION
(exact relative/landmark framing — note: bodyweight-relative is barred from share cards by privacy exclusion;
UK-landmark is single-source Gemini)**, -11 (sourced provenance for any landmark data = NEW data). Full text in file.

### Cardio/UX cluster (`pass4-blueprints-cardio-ux.md`) — 20 OPEN
**FINDINGS (read-confirmed):** cardio import infra mostly exists (`cardio_log.source/distance/avg_hr`
`database.js:1221-1223`; import-cursor pattern `health.js:588-656`); cardio trend pieces exist
(`summariseWeekCardio`, `cardioComplianceFromLog`); meal model already a flexible numbered ladder (`mealSlots.js`),
not fixed buckets. NA-cux-1..20; load-bearing/decision ones: **NA-cux-4** (cardio import de-dup: new `ext_id`
column vs deterministic id), **NA-cux-9** (are past weekly cardio targets stored? decides if "planned" is accurate),
**NA-cux-13** (does `food_entries` store time-of-day? without it there is no true timeline), **NA-cux-15 FOUNDER
DECISION** (timeline replace vs toggle — a toggle may conflict with the dismissed dense/personalisation toggle),
**NA-cux-19 FOUNDER DECISION (NEW DEPENDENCY)** (Core-Haptics needs a new managed-Expo lib — needs explicit yes
per CLAUDE.md no-deps-without-asking). Full text in file.

## NA-id DISPOSITION (for the resolution pass)
- **ANSWERABLE BY TARGETED CODEBASE READ** (most): file:line lookups, schema fields, gate fns, seams. Resolve via
  an Opus-8 read pass; complete each blueprint with the real answer.
- **FOUNDER DECISIONS (cannot be read-resolved):** NA-coaching-10 (safety: auto-apply during a hold),
  NA-wr-3 (meaning of "keeps volume tracking" on swap), NA-wr-10 (relative/landmark framing wording),
  NA-cux-4 (de-dup approach), NA-cux-15 (timeline replace vs toggle), NA-cux-19 (Core-Haptics dependency),
  NA-cb-3 (banking surface placement). + all PRIORITY-SCORE NA-ids → resolved by `pass4-master-priority.md`.
- **BLOCKED (Pass-1 carry):** NA-mn-1 schema authority (Q1).

## FOUNDER-DECISION NA-ids — RESOLVED 2026-06-14 (see pass3-v2-founder-decisions.md)
- NA-coaching-10 → never auto-apply during a safety hold. NA-cux-19 → Core-Haptics approved (name+licence at build).
- NA-cux-15 → timeline replaces buckets. NA-cb-3 → both entry points. NA-wr-3 → credit actual exercise's muscle.
- NA-wr-10 → relative % vs prior period. NA-coaching-4 → recomp = PRO. NA-nutrition-1 → store basis, no conversion.
- **NA-mn-1 (Q1) RESOLVED:** migrations canonical; micronutrients = new `migrate_087`; snapshots are stale.
- PRIORITY-SCORE NA-ids → resolved by `pass4-master-priority.md` (3 tiers).

## STILL OPEN — read-answerable NA-ids (~50)
File:line lookups / schema fields / gate fns / seams across the 6 blueprints. These do NOT need the founder; they
need a targeted Opus-8 codebase read pass (`_AUDIT-SPEC.md:241-250`), one answer with CONFIRMED file:line each,
then each blueprint is completed and marked final.

## RESOLUTION
A targeted codebase read answers each open NA-id with a CONFIRMED file:line; the owning blueprint is then completed.
The Pass-4 exit gate (`pass4-final-reconciliation.md`) cannot pass while any read-answerable NA-id is OPEN.
