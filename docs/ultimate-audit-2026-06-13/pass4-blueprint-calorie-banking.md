# PASS-4 BLUEPRINT — Calorie banking (cluster: NUTRITION-SAFETY; spine item, hand-written)

Mandated format per `_AUDIT-SPEC.md:252-271`. Safety-adjacent (edits daily calorie targets) → written hands-on,
not by an agent (CLAUDE.md build model). Decision: `pass3-v2-founder-decisions.md` "APPROVED FOR BUILD within
SAFETY RAILS". Tags: [P1:file:line] impl fact · [P3] gap/decision · [INFERENCE] my proposal to confirm.

## ID / CLUSTER / TITLE
CB-1 / NUTRITION-SAFETY / Calorie banking ("Plan a bigger day")
- PRIORITY TIER: Tier-2 (founder-requested; safety-gated). IMPACT: high (named founder want; flexibility for
  real life). EFFORT: medium-high (safety integration + tests). PRIORITY SCORE: [INFERENCE] high-impact /
  medium-high-effort → schedule after the low-risk cluster items, sequenced alone like a safety feature.

## CURRENT STATE
- User-controlled calorie banking is ABSENT [P3: pass3-comparison-matrix.md FL/NU MISSING; gap-corrections B7].
- A redistribution mechanism already exists: `dayVariantTargets` moves calories between training/rest days within
  the engine band, weekly total preserved, capped, auto-flat when floored [P1:src/lib/food/mealPlanAssembler.js:78-124].
- The daily calorie floors: sex floor `male 1500 / else 1200` [P1:src/lib/nutritionEngine.js:792], also
  `KCAL_FLOOR = 1200` [P1:src/lib/coachApply.js:22]; FFM floor `computeFFMFloor(weightKg,{bodyFatPercent,bodyFatSource,sex})`
  at 30 kcal/kg [P1:src/lib/nutritionEngine.js:597,:119].
- The coach judges on the 7-day ROLLING AVERAGE intake + weight trend, not single days
  [P1:src/lib/weeklyCoach.js:828-834,:1129]; adherence is average-vs-target [P1:src/lib/weeklyCoach.js:334-339].
- Planned day-variation precedent the coach already accepts without misreading: `macroCycle`/`refeed` stored on
  the profile and consumed by the diary [P1:src/screens/DiaryScreen.js:73-76,:108-136] and coach
  [P1:src/lib/weeklyCoach.js:1019-1062].
- ED-pattern flag + carve-outs the assembler/coach already use: `edPatternOpen` [P1:src/lib/weeklyCoach.js:426],
  `targetWasFloored` auto-flat [P1:src/lib/food/mealPlanAssembler.js:88].

## THE GAP
[P3] Users want to pre-plan a bigger off-plan day (meal out/event) by shifting calories within the week, but
there is no user control to do so; only the engine's automatic day-variant cycling exists.

## THE EVIDENCE
[P3 founder] Direct founder request 2026-06-14 ("bank calories in the week for an off plan ... if we can do it in
a stylish way"). No external competitor bar was gathered for banking specifically (not in the v2 brief) — this is
a founder-originated feature, graded on internal fit + safety, not a competitor teardown. [INFERENCE] Adjacent
precedent: flexible/“banking” patterns exist in mainstream trackers; not sourced here, so no [P2] claim is made.

## NEWBIE EXPERIENCE AFTER CHANGE
A beginner sees an optional "Plan a bigger day" on the diary/targets surface. Picking a day shows plain numbers
("Saturday: 2,900 kcal; the other days drop by about 80 kcal each"). If it cannot be done safely it says so
plainly and does nothing. No jargon, no "cheat day" language.

## ATHLETE EXPERIENCE AFTER CHANGE
A competitor can deliberately position a higher-calorie social day while holding the weekly total the coach adapts
on, without the coach reading it as a binge or the lighter days as under-eating.

## IMPLEMENTATION BLUEPRINT
FILES TO CHANGE:
- `src/lib/food/mealPlanAssembler.js:78-124` [P1] — generalise `dayVariantTargets` to accept an explicit per-day
  delta map, OR add a sibling `bankedDayTargets` reusing its clamp/floor/auto-flat guards. [INFERENCE — confirm
  which; see NA-cb-1.]
- `src/screens/DiaryScreen.js:73-76,:108-136` [P1] — read a new `userProfile.calorieBank` the same way it reads
  `macroCycle`/`refeed`, so each day shows its banked target.
- Check-in derivation that reads diary-vs-target [P1: weeklyCoach.js `deriveCalsAdherence` — NEEDS ANSWER NA-cb-2
  for exact file:line] — must reference the banked per-day target.
- A new "Plan a bigger day" surface [INFERENCE: Diary day view; confirm placement, NA-cb-3].

DATA:
- NEW `userProfile.calorieBank = { weekStartKey, bigDayKey, perDayDeltaKcal:{[dayKey]:+/-N}, appliedAt }`
  [INFERENCE — mirrors `userProfile.macroCycle`/`refeed` shape, P1:DiaryScreen.js:73-76]. Invariant: sum of
  `perDayDeltaKcal` === 0.

COMPONENT STRUCTURE:
- New `CalorieBankSheet` invoked from the diary day header [INFERENCE]; parent `src/screens/DiaryScreen.js`
  [P1:src/screens/DiaryScreen.js:73].

USER FLOW (sequence):
1. User opens "Plan a bigger day", picks the day and a bump amount.
2. Engine computes `cap = min(requestedBump, MAX_BANK_DELTA, room-to-band-max-on-big-day)` [P1: band/cap pattern
   mealPlanAssembler.js:90-108]; spreads `cap` as an even reduction across the other days.
3. Floor check on EVERY day (see ENTITLEMENT/EDGE). If any day would breach, reduce `cap`; if even the minimum
   meaningful bump can't clear, refuse with a plain message and write nothing.
4. Persist `userProfile.calorieBank` (sum delta === 0). Diary, floor check, and check-in derivation read the
   banked per-day target thereafter. Weekly total unchanged → coach unaffected [P1:weeklyCoach.js:828-834].

ENTITLEMENT GATING: PRO (banking sits in the Pro food/coaching domain) — gate via the existing Pro guard
[P1: NEEDS ANSWER NA-cb-4 for the exact gate fn used by the diary/nutrition surfaces].

EMPTY STATE: "Plan a bigger day. Pick a day and we will shift some calories onto it from the rest of the week.
Your weekly total stays the same." [British English, no em dashes, passes checkJargon — [INFERENCE] copy, founder
to confirm wording.]

LOADED STATE: shows the chosen big day's new target and the per-day reduction on the others, with the weekly total
unchanged line.

ERROR STATE: "That would take one of your days below your safe minimum, so we can't shift that much. Try a smaller
amount." [British, plain.]

EDGE CASES (each must hold):
- Any day < max(sexFloor, ffmFloor) → refuse [P1:nutritionEngine.js:792,:597].
- Open ED-pattern flag / calm mode / floored-or-compressed target → banking disabled (no-op), same carve-out the
  assembler uses [P1:weeklyCoach.js:426; mealPlanAssembler.js:88].
- Banking must preserve the weekly total (sum delta === 0) so ED-pattern + rapid-loss detection see identical
  7-day-average inputs to a flat week [P1:weeklyCoach.js:828-834,:677].
- No "cheat day"/"binge"/"save up" copy anywhere [P3 voice rail].

DUAL-AUDIENCE DESIGN: default off; one plain control; advanced users get the redistribution, beginners are never
nudged toward it and never see jargon.

## VERIFICATION
All implementation facts above tagged [P1] are read-backed this session. OPEN NA-ids (this blueprint is NOT final
until these are answered with file:line):
- NA-cb-1: generalise `dayVariantTargets` vs add `bankedDayTargets`? | files: src/lib/food/mealPlanAssembler.js, mealPlanService.js
- NA-cb-2: exact file:line of the check-in calorie-adherence derivation that reads diary-vs-target | files: src/lib/weeklyCoach.js, src/screens/WeeklyCheckInScreen.js
- NA-cb-3: surface placement (Diary day view vs Nutrition Targets) | files: src/screens/DiaryScreen.js, NutritionTargetsScreen.js
- NA-cb-4: exact Pro gate fn for the food/nutrition surfaces | files: src/components/ProGate.js, src/navigation/RootNavigator.js
- NA-cb-5: confirm `userProfile.macroCycle`/`refeed` persistence path to mirror for `calorieBank` | files: src/store/useAppStore.js, src/lib/database.js
INVARIANT TESTS (write-to-fail, against the real engine): sum-delta===0; no day < floor (over-bump → refusal);
disabled under ED flag/calm/floored; banked-week vs flat-week identical 7-day-average → identical detector inputs;
capped; deterministic.
