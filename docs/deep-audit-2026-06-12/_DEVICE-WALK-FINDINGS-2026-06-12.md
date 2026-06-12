# Founder device-walk findings — 2026-06-12

Live findings from the founder walking the deep-audit build on device.
Tracked here so nothing is silently dropped. Each item: finding → root cause →
status. The systemic conclusion is at the bottom.

## 1. Training partners sheet: black-on-black text — FIXED (5801cc8)
- **Finding:** the partner privacy sheet rendered its title/body near-black on
  the dark background. "Looks like a half done attempt."
- **Root cause:** `colors.text` does not exist in the theme; `color: undefined`
  falls back to RN's near-black default. Same phantom token shipped in
  QuizScreen + PlanPreviewScreen (quiz-first onboarding); `colors.surfaceAlt`
  (PartnerSection) and `radius.pill` (MealPlanScreen) were also phantoms.
- **Status:** all call sites fixed; `themeTokens.guard.test.js` now fails CI on
  ANY reference to a non-existent theme token, app-wide.

## 2. Partner system buried under You → Consistency — OPEN (research commissioned)
- **Finding:** the partner feature lives as one row inside the Consistency
  screen; the founder questions the placement and the half-finished feel.
- **Context:** NEW-002 shipped as a deliberately quiet derived-signals feature
  (ticks, shared streak, cheer). The surface under-delivers its blueprint and
  its placement gives it no discovery story.
- **Action:** deep research into how partner/accountability systems work in
  leading fitness apps (placement, pairing UX, signal design, notifications,
  privacy) → blueprint → rebuild properly. Founder-requested.

## 3. Progress → "Weight" tile lands on Body Metrics — PARTIAL FIX
- **Finding:** "Why is this under Progress? It's just the body Metrics that was
  in You... not weight progress at all."
- **Root cause:** the Progress hub's NavTile says "Weight" with a trending-up
  icon — it promises a progress view but lands on the logging-oriented Body
  Metrics screen, which with sparse data is all placeholders.
- **Action now:** tile renamed to match its destination honestly.
- **Action later (IA pass):** Body Metrics should lead with the trend once
  data exists, and the Progress hub's weight story should surface the trend
  card first, logging second.

## 4. "Supplements, honestly" screen — REMOVED (founder decision)
- **Finding:** flagged as off-style ("half arsed"), then founder decided:
  "Let's get rid of the supplements, honestly thing. It's rubbish."
- **Action taken:** feature removed entirely — screen, You-tab row (and its
  now-unneeded ED-flag read), navigator entry, mount-test entry. The G2
  blueprint doc stays in the audit folder as history. If supplement guidance
  ever returns it goes through founder design review first.

## 6. Style mismatch across the last 24-48 h — ORDERED (in progress)
- **Founder:** "We need a proper review and fixing of styles because it's
  become a total mismatch over the last 24/48 hours."
- **Action:** a conformance pass over every NEW surface from this build
  (Quiz / PlanPreview / FreeStarter onboarding, MealPlanScreen + food
  components, PartnerSection, plate teaser, milestone/phase cards) against
  docs/rules/styling.md and the house card/section/type idioms. Phantom-token
  guard already merged; visual conformance fixes land per-screen.

## 5. Meal plan: slot/swap/schedule/protein faults — IN FLIGHT
- Tracked separately in `blueprints/bp-meal-plan-RETHINK-2026-06-12.md`
  (research done, founder decisions locked, increment 1 shipped: Meal 1 places
  a breakfast meal; swaps respect slot character).

## 7. "How Precision Coaching works" — an extra You button — FIXED
- **Finding:** "Why not have the info in the Precision Coaching Screen?
  Rather than an extra button further down You."
- **Reality check:** the coach screen ALREADY links to the methodology
  in-context (the why-block's "learn more" + the held-decisions card), so the
  You row was redundant for Pro users. It was, however, a free user's ONLY
  path to the trust copy (free users have no coach screen; deliberate
  conversion decision).
- **Action taken:** the You row now shows for FREE users only; Pro users use
  the in-context links on the coaching screen.

## 8. Generated split days criticised by their own coverage card — FIXED
- **Finding:** "Back + Delts" days flagged "No hamstring work", "Chest + Arms"
  flagged "No pulling work" — the app's own generated plans called out as
  wrong, with week-level balance logic applied to a single day of a split.
- **Action taken:** day-level balance warnings removed from RoutineDetail
  entirely (a split day is supposed to be "unbalanced"; the generator already
  balances the week; authoring feedback lives in the manual builder). The
  factual muscle-coverage chips stay.

## 9. Workout History: delete a workout — SHIPPED (founder request)
- Trash affordance per history card → destructive confirm → local hard delete
  (workout + sets; derived stats self-heal) + cloud delete with queued retry
  so a restore pull cannot resurrect it.
- **Founder action needed:** confirm the Supabase RLS on `workouts` and
  `workout_sets` permits DELETE for row owners (auth.uid()). If it does not,
  the cloud delete fails (visible in Debug logs as
  sync.deleteWorkoutFromCloud), local deletion still works, and a future
  restore could resurrect the session until the policy is added.

## Systemic conclusion (the real finding)
Several agent-built surfaces shipped without device-level visual verification
and without conformance to docs/rules/styling.md. The phantom-token guard now
catches the worst class mechanically. Beyond that, every NEW screen needs a
**visual-conformance review step against docs/rules/styling.md** in the
operating model (reviewer checks: theme tokens only, house card/section
patterns, type.* usage, no off-style layouts) — and founder device-walks stay
the final arbiter.
