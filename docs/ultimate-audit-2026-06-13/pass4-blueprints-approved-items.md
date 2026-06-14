> ⚠️ DRAFT (written ahead of the Pass-4 process). This is a useful per-item content draft, but the mandated
> process requires each to be expanded into the full BLUEPRINT FORMAT (`_AUDIT-SPEC.md:252-271`), grouped into
> clusters, every factual sentence source-tagged, with NA-ids for any missing fact. Treat this as the cluster
> draft, not the final blueprints.

# PASS-4 BLUEPRINTS — remaining approved items (calorie banking has its own doc)

Status: BLUEPRINTS for founder review. NO code yet. Decisions: `pass3-v2-founder-decisions.md`. Source tags:
file:line = read-backed · [INF] = design choice to confirm · [verify] = read more at build time.
**Standing rule on ALL of these:** every new string passes the locked voice / `checkJargon` + copy-lint
(`COACHING_VOICE_SYNTHESIS_LOCKED.md`); British English; no em dashes. None below touch `src/coaching/safety`
except where noted. Build via edit-gate, one item, `npm run lint && npm test`, commit.

Size key: **S** small · **M** medium · **L** large (schema/architecture).

---
## NUTRITION & MEALS

### 1. Raw/cooked weight toggle — **M**
WHAT: let the user weigh a food raw OR cooked at log/build time. BUILDS ON: `foodRoles.js:139-145` already
annotates dry/cooked/ready weight-state per food ("50g dry pasta ≈ 115g cooked, identical carbs"). APPROACH:
surface a per-item raw|cooked choice; convert using the existing state map; default to the DB's stated basis.
[INF: confirm conversion factors source — extend the weight-state map vs a new raw↔cooked ratio table.] TESTS:
identical macros whichever basis chosen; round-trip stable.

### 2. Auto grocery list — **M**
WHAT: turn the active meal plan into an aggregated, aisle-grouped UK shopping list. BUILDS ON: plan is
foods+grams (`curatedMeals.js` components; `mealPlanService`); not present today (grep = 0). APPROACH: sum
components across the chosen days → grams per food → round to UK pack sizes → group by aisle. Deterministic, pure.
TESTS: aggregation sums correctly; pack-size rounding; exclusions respected.

### 3. Gate train/rest cycling to advanced-only — **S**
WHAT: stop carb-cycling the whole target for everyone; flat daily target except advanced cutters/competitors.
BUILDS ON: cycling at `mealPlanAssembler.js:503` (`dayVariantTargets`) via `mealPlanService.js:183`; coach gate
`weeklyCoach.js:1020` `phase.isCut && (goalLockAdvanced || isCompetitionGoal)`. APPROACH: gate the
`dayVariantTargets` call on that same predicate; keep floored/trivial auto-flat guards; non-advanced → flat
(drop day-type chip). TESTS: non-advanced user → all 7 days equal target; advanced cutter → cycles as before.

### 4. Micronutrients / NRV tracking — **L (schema migration, Supabase rules apply)**
WHAT: track vitamins/minerals vs NRV. BUILDS ON: `food/db.js:239-240,:1298-1306` foods+custom_foods carry
macros+fibre/sodium/sugar only; resolve/log at `:733-737,:1139-1143`; CoFID seed has rich micronutrients [verify
coverage]. APPROACH: add micro columns to both tables (local SQLite migration + Supabase migration + sync), seed
from CoFID/OFF where present, extend resolve/log, display vs NRV reference values. Heaviest item; sequence alone.
TESTS: migration idempotent; missing micros render as unknown not zero; NRV maths UK-compliant.

### 5. Protein-consistency metric — **S**
WHAT: "how often you hit your protein" over the window. BUILDS ON: `FoodInsightsScreen` 7-day adherence.
APPROACH: % of days protein ≥ target across the window; one stat row. Plain wording (no jargon). TESTS:
counts hit-days correctly; empty-data safe.

### 6. Analytics windows 14/30/90d — **S/M**
WHAT: extend Food Insights beyond 7 days. BUILDS ON: `FoodInsightsScreen` (7-day only today). APPROACH: window
selector (7/14/30/90); reuse the existing rollup over a longer range. TESTS: each window aggregates correctly.

---
## PROGRESS & COACHING

### 7. Recomp-reframing view — **M**
WHAT: reframe flat scale-weight as recomposition. BUILDS ON existing data only — body-fat + 9-site measurements
(`BodyMetricsScreen`), composite strength standing (`LiftProgressScreen`/`strengthStandards.js`), weight trend
(`WeightTrendCard`). APPROACH: a view that shows "weight flat, but body-fat ↓ / measurements ↓ / strength ↑" when
the data supports it; no new capture. Voice: factual, no hype. TESTS: only asserts recomp when data supports it.

### 8. Named autonomy modes — **M**
WHAT: Coached / Collaborative / Manual control of how adjustments apply. NOTE [important]: this is DISTINCT from
the existing **coachTone** (automatic/supportive/precise) at `SettingsCoachingScreen.js:38,:194-196`, which is
*voice register*, not apply-control. Autonomy = auto-apply vs confirm vs suggest-only. BUILDS ON: confirm-then-
apply already exists (`CoachOutputScreen.js:778-1045 markApplied`). APPROACH: new setting; Coached=auto-apply,
Collaborative=confirm (today's behaviour), Manual=suggest-only. [INF confirm semantics + default.] Voice: plain
names + plain explanation. TESTS: each mode's apply-path; default = Collaborative (no behaviour change for
existing users).

### 9. Plan diff/preview — **M**
WHAT: show before/after when a plan rebuilds. BUILDS ON: `PlanUpdateScreen.js:212` rebuilds in place (U-B-7).
APPROACH: compute a diff (added/removed/changed routines+exercises) and show it for confirm before committing the
rebuild. TESTS: diff correctness; cancel leaves plan unchanged.

---
## WORKOUT

### 10. Keyboard-completes-the-set — **S**
WHAT: reps "done" logs the set directly (one fewer tap). BUILDS ON: `SetEntry.js:126` reps "done" only dismisses
keyboard today; `ActiveWorkoutScreen handleCompleteSet:738`. APPROACH: wire reps `onSubmitEditing` to complete
the set (with the existing validation). TESTS: done logs a valid set; invalid input still blocked.

### 11. Mid-session exercise swap — **M**
WHAT: swap an occupied-machine exercise mid-workout without breaking the saved routine. BUILDS ON: substitution
ranking (`algorithms.js:785-812` SFR/stretch/fatigue, equipment-aware), `swapEngine.js`, plan-level swap
(`database.js:2414`). APPROACH: in ActiveWorkout, offer ranked same-pattern substitutes; apply to the live session
only (not the template); keep volume tracking on the target muscle. TESTS: swap doesn't mutate the routine; volume
still attributed correctly.

---
## RETENTION / RECAP

### 12. Wire share/export to recap cards — **S/M**
WHAT: make Year-of-Lifts / block recap cards shareable. BUILDS ON: export already exists — `ShareCardScreen.js:11-18`
(FileSystem + Sharing), `:803-808` base64 capture; recaps `getYearOfLiftsData`/`getRecapData`/`getBlockReflectionData`
(`YearOfLiftsScreen.js:27`). APPROACH: render a card to image (local, offline), 9:16, British/GBP, hand to Sharing.
TESTS: image generates offline; no PII leaked.

### 13. Monthly recap cadence — **S**
WHAT: add monthly recaps (block + annual already exist via `BlockReflectionScreen`/`RecapStory` + `YearOfLifts`).
BUILDS ON: `getRecapData`. APPROACH: monthly variant of the recap payload + entry point. TESTS: month boundaries.

### 14. Relative/landmark framing — **S**
WHAT: replace hollow absolute tonnage with relative comparisons (factual, no hype). BUILDS ON: recap stat payload.
APPROACH: a pure transform (e.g. "the weight of N …"); British landmarks optional. Voice: no "crush"/hype. TESTS:
transform deterministic; honesty test on copy.

---
## CARDIO & UX

### 15. Passive cardio import — **M**
WHAT: read-only Apple Health/Health Connect cardio-session + HR, feedback-only (NOT HRV — that was dismissed).
BUILDS ON: `health.js` already reads steps+weight. APPROACH: extend read scope to cardio sessions; show as
feedback, never add to the food target; queue locally, background sync (offline-first, EU residency). [verify
permission scopes.] TESTS: import never alters the calorie target; offline queue.

### 16. Cardio trend view — **S/M**
WHAT: turn the cardio history list into a "done vs planned" trend. BUILDS ON: `CardioHistoryScreen` (list today).
APPROACH: weekly minutes + done-vs-planned over time; plain wording (NOT "adherence"). TESTS: aggregation.

### 17. Timeline food logging — **M/L**
WHAT: continuous timestamped logging instead of Breakfast/Lunch/Dinner buckets (MacroFactor pattern). BUILDS ON:
`DiaryScreen` six meal sections today. APPROACH: order entries by timestamp; keep slot labels optional. Bigger UX
change; sequence carefully. TESTS: ordering; existing data migrates cleanly.

### 18. Core-Haptics waveforms — **S**
WHAT: custom iOS haptic patterns on PR / rest-timer-zero (we already fire basic expo-haptics across 7 surfaces).
APPROACH: Core Haptics on iOS with graceful fallback to current haptics. TESTS: no crash without the capability.

---
## SUGGESTED BUILD ORDER (low-risk first; calorie banking + micronutrients sequenced alone)
1. S items: gate train/rest cycling · keyboard-complete · protein-consistency · relative framing · monthly recap ·
   Core-Haptics.
2. M items: analytics windows · recomp view · plan diff/preview · auto grocery list · raw/cooked toggle ·
   mid-session swap · cardio trend · wire recap share · autonomy modes · passive cardio import.
3. L / careful: timeline food logging · micronutrients/NRV (schema) · **calorie banking** (own blueprint, safety).
