⚠ STATUS (2026-07-10): PRE-CAMPAIGN BLUEPRINT/SPEC - GATED. Do not build from this document. Any item here requires the D37 triage (verify against today's tree + the decision register) and the D38 elevation test before consideration. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md.

# CB-1b Blueprint — Calorie banking MOVES PLANNED FOOD (extends CB-1)

> Extends `docs/ultimate-audit-2026-06-13/pass4-blueprint-calorie-banking.md`.
> Safety-adjacent (edits daily calorie targets AND the planned food) → hands-on,
> spec-first, founder go before touching the maths (CLAUDE.md). Founder decision
> 2026-06-16: "Remove food from the day you're removing from as needed and notify
> the user the same way the coach would… say they have the option to adjust. I.e.
> 'We have removed some rice from Meal 1 and some from Meal 3', keeping in with the
> macro calculations we have set."

## THE GAP (founder QA 2026-06-16)
Today calorie banking shifts only the per-day TARGET number; the planned meals on
each day do not change. So a "higher-calorie day" has the same food as before and a
lower-calorie day still shows its full planned food, exceeding the reduced target.
The founder calls this pointless: the food must move with the target.

## WHAT EXISTS (reuse, do not reinvent)
- `planCalorieBank()` (`src/lib/food/calorieBank.js`) → `perDayDeltaKcal` keyed by
  date, floor-safe, sum === 0. Already shipped.
- `applyMacroDeltaToPlan({ plan: day, adjustmentKcal, floorKcal })`
  (`src/lib/food/planEdit.js`) → `{ plan: editedDay, change }`. Carbs-first lever,
  protein protected, workout carbs preserved, **double floor-clamp** so a day can
  never land below kcalMin / the day floor. Returns gram-level `change.edits`.
- `buildPlanEditNarration(change, { register })` (`src/lib/food/planExplain.js`) →
  `{ headline, body, edits[] }` — the coach-style "removed some rice from Meal 1"
  wording, already in house voice.
- Precedent: `applyCoachAdjustmentToActivePlan` already applies a per-day kcal delta
  to every plan day via `applyMacroDeltaToPlan` and narrates it. CB-1b is the same
  pattern driven by the bank's per-day deltas instead of a coach delta.

## DESIGN (proposed)
1. **Trigger.** When a higher-calorie day is applied/changed in CalorieBankSheet,
   AND the active week plan has planned food for the affected dates.
2. **Operate on the meal PLAN days, then re-sync the diary** (Approach A). For each
   plan day i (date = today + i, the existing add-to-diary mapping), apply that
   date's `perDayDeltaKcal` via `applyMacroDeltaToPlan` with the day's floor; rewrite
   that date's `is_planned` diary entries from the edited day. Reuses the tested,
   floor-safe path; the alternative (scaling raw diary entries directly) would
   duplicate that safety logic — rejected.
3. **Macro lever = carbs**, protein held, workout carbs preserved — inherited from
   `applyMacroDeltaToPlan`, and consistent with banking's existing carbs-only target
   shift (`KCAL_PER_G_CARB`).
4. **Notice (coach voice).** Aggregate the per-day `change.edits` into ONE message:
   e.g. "For your higher-calorie day on Saturday we've added a little to Meal 1 and
   Meal 3, and trimmed the rice and potato across Tuesday to Friday to match. Your
   week still adds up to the same total. Change anything you like." Built from
   `buildPlanEditNarration`. Always tell them they can adjust.
5. **Days with no planned food** → just the target shift (today's behaviour); no food
   change, no notice line for that day.
6. **Clearing the higher-calorie day** restores the un-banked plan food for those
   dates (re-derive from the stored plan, not a reverse-edit).

## SAFETY (each must hold; write-to-fail tests)
- No day's planned food total below `max(sexFloor, ffmFloor)` — enforced by
  `applyMacroDeltaToPlan`'s double clamp AND `planCalorieBank`'s refusal.
- Weekly total of planned food unchanged within rounding (sum of deltas === 0).
- Banking disabled under floored/compressed target, carb cycle, refeed, or open
  ED-pattern flag — already gated; food adjustment inherits the same gate.
- Protein never cut as the lever; carbs first, fat only as the spillover trade the
  engine already defines.
- Deterministic: same bank + same plan → same edits.
- Never re-frames as cheat/binge/save-up.

## OPEN DECISIONS FOR FOUNDER
- D-cb1b-1: Apply automatically on "Plan it", with the notice (founder said yes) —
  vs preview-the-changes-then-confirm. Recommend: apply + notice + "adjust as
  needed" (matches the stated intent; least friction).
- D-cb1b-2: Notice depth — one aggregated message (recommended) vs per-day lines.
- D-cb1b-3: Only adjust food when planned food exists (recommend yes); otherwise
  banking is target-only as today.

## TESTS
Invariant tests against the real engine: floor never breached on the trimmed days;
weekly sum preserved; carbs-lever/protein-held; deterministic; gated under
ED/calm/floored; clearing restores the original plan food. Fresh-eyes review after.
