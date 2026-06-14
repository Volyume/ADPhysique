> ⚠️ DRAFT (written ahead of the Pass-4 process). Content is read-backed and valid, but it must be reformatted
> into the mandated BLUEPRINT FORMAT (`_AUDIT-SPEC.md:252-271`) with a source tag on every factual sentence and an
> NA-id for the open schema question, as a Pass-4 cluster blueprint. Kept as the content draft, not the final form.

# PASS-4 BLUEPRINT — Calorie banking ("Plan a bigger day")

Status: BLUEPRINT for founder review. NO code written yet (touches the safety surface → plan-first per CLAUDE.md).
Decision source: `pass3-v2-founder-decisions.md` ("APPROVED FOR BUILD within SAFETY RAILS" + coach-integration).
Source tags: [P3] = founder decision · file:line = read-backed code · [INFERENCE] = design proposal to confirm.

## 1. What it is (UX)
A Pro user planning an off-plan day (meal out, event) can **"Plan a bigger day"**: pick a day, the engine pulls a
**capped** amount of calories **evenly from the other days in the week** so that day is higher and the rest are
slightly lower, with the **weekly total unchanged**. Shows the new per-day numbers; **refuses** if any day would
breach a floor. No "cheat day"/"binge"/"save up" language [P3 voice rail].

## 2. Mechanisms it BUILDS ON (do not invent a parallel path)
- **Redistribution engine already exists:** `mealPlanAssembler.js:78-124 dayVariantTargets` already moves calories
  between days within the engine's ±band, weekly total preserved, capped at `MAX_CYCLE_DELTA_KCAL`, auto-flat when
  floored/trivial. Banking = a **user-directed** variant of this, not a new redistributor. [INFERENCE: generalise
  `dayVariantTargets` to accept an explicit per-day delta map, or add a sibling `bankedDayTargets` that reuses the
  same clamp/floor guards.]
- **Planned day-variation precedent:** `userProfile.macroCycle` / `userProfile.refeed` are stored on the profile
  and consumed by the diary (`DiaryScreen.js:73-76,:108-136`) and the coach (`weeklyCoach.js:1019-1062`). Banking
  mirrors this storage + consumption pattern exactly.
- **The coach is weekly-average-based:** judges on 7-day average intake + weight trend, not single days
  (`weeklyCoach.js:828-834,:1129`; adherence `mapCalsAdherence:334-339`). A banked week has the SAME 7-day average
  → invisible to the trend logic [P3 coach requirement].

## 3. Data model [INFERENCE — confirm]
Store on `userProfile.calorieBank` (mirrors macroCycle/refeed):
```
calorieBank = {
  weekStartKey,                 // which week this applies to
  bigDayKey,                    // the chosen day
  perDayDeltaKcal: { [dayKey]: +/-N },  // signed deltas; sum === 0 (weekly total preserved)
  appliedAt,                    // timestamp
}
```
Per-day target a surface reads = base daily target + `perDayDeltaKcal[dayKey]` (0 if absent). Same shape the diary
already uses for macroCycle days.

## 4. Algorithm (deterministic, no LLM)
1. Input: the engine's single daily target (`calculateNutritionTargets` output, verbatim — never recompute), the
   week's day keys, the chosen big day, requested bump.
2. `cap = min(requestedBump, MAX_BANK_DELTA, room-to-kcalMax-on-big-day)`; spread `cap` evenly as a reduction
   across the other 6 days.
3. **Floor check on EVERY day** (see §5): if any other day would fall below its floor, reduce `cap` until all days
   clear, or refuse if even the minimum meaningful bump can't clear.
4. Persist `perDayDeltaKcal` with `sum === 0`. Determinism: same inputs → same split.

## 5. SAFETY RAILS (hard invariants — non-negotiable) [P3]
- **R1 Weekly total preserved:** `sum(perDayDeltaKcal) === 0`. Banking never creates a net deficit.
- **R2 Never below floor on ANY day:** each day's banked target ≥ `max(sexFloor, ffmFloor)` where
  sexFloor = `nutritionEngine.js:792` (`male 1500 / else 1200`; cf. `coachApply.js:22 KCAL_FLOOR`) and
  ffmFloor = `nutritionEngine.js:597 computeFFMFloor` (30 kcal/kg FFM, `:119`). A day that would breach → refuse.
- **R3 Capped:** reuse/share the assembler's capped swing (`MAX_CYCLE_DELTA_KCAL`); add `MAX_BANK_DELTA`.
- **R4 Auto-disabled** when: open ED-pattern flag (`getOpenEdPatternFlag` / `edPatternDetector.js`,
  `weeklyCoach.js:23,:426 edPatternOpen`), calm/wellbeing mode (`isCalm`), or the target was floored/compressed
  (`mealPlanAssembler.js:88 targetWasFloored`). Same carve-out the assembler already applies.
- **R5 Must not trip/mask ED detection:** because R1 preserves the weekly total and the detector works off the
  7-day average, banking is neutral to `detectEdPatternFlag` and rapid-loss (`weeklyCoach.js:677`). Invariant test
  must PROVE a banked week and its flat equivalent yield identical detector inputs.

## 6. Coach / diary / check-in integration [P3]
- Diary, the floor check, and check-in auto-derivation (`deriveCalsAdherence`) all read the **banked per-day
  target**, never the flat one — so a deliberately-light banked day is NEVER shown/derived as "under-eaten".
- Coach keeps adapting on the preserved **weekly average** (no change to weeklyCoach math).
- The banked plan is a visible intentional marker (`userProfile.calorieBank`), like macroCycle/refeed.

## 7. Voice / copy [P3 + COACHING_VOICE_SYNTHESIS_LOCKED.md]
Surface name "Plan a bigger day". No "cheat/binge/save-up". Plain language, numbers-first, passes `checkJargon`
+ the copy-lint. Honesty test on every line.

## 8. Invariant tests (write to FAIL first — CLAUDE.md build model)
1. `sum(perDayDeltaKcal) === 0` for every generated bank.
2. No banked day < `max(sexFloor, ffmFloor)`; over-bump → refusal, not a sub-floor day.
3. Banking returns disabled/no-op under ED flag, calm mode, floored target.
4. Banked week and flat week produce identical 7-day-average → identical ED-detector + rapid-loss inputs (R5).
5. Capped: no day delta exceeds the cap.
6. Determinism: same inputs → same split.

## 9. Out of scope / founder confirms
- Storage key `userProfile.calorieBank` + the generalise-vs-sibling choice in §2/§3 [INFERENCE].
- Default `MAX_BANK_DELTA` value (propose: same as `MAX_CYCLE_DELTA_KCAL`).
- Whether banking is offered to all Pro users or gated (note: distinct from the train/rest-cycling gate decision).
- Surface placement (Diary day view vs Nutrition Targets).

## 10. Build sequence (edit-gate, when authorised — not this branch)
1. Pure `bankedDayTargets` (or `dayVariantTargets` generalisation) + the 6 invariant tests (red→green).
2. Persistence on `userProfile.calorieBank` + diary/check-in read-through.
3. "Plan a bigger day" surface + voice-compliant copy + copy-lint.
4. `npm run lint && npm test` (full), founder device-walk from green.
