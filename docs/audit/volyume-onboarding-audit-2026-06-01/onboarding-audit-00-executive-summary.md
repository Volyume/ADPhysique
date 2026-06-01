# Onboarding Audit 00 — Executive Summary

Status: COMPLETE. Full seven-phase audit. Written last.
Date: 2026-06-01
Scope: first launch to the workout screen (Flow A), and the Plans tab plan
builder for returning users (Flow B). Every screen, question, selection, copy
string and feature reference read from the live code. No prior audit material
was used. Code is the only source of truth.

Companion documents:
- 01 flow map, 02 copy and tone, 03 design, 04 integration accuracy,
  05 research, 06 proposal, 07 build recommendations, 08 look/feel and
  communication vs the field.

---

## The headline

Volyume's onboarding is well built and well written in most places. The wizard
explains why it asks each thing, the reveal is genuinely premium, and the voice
is human. The damage is concentrated in a small number of places where the copy
has not kept up with how good the app has become:

1. **Onboarding tells new users to log food in a competitor's app.**
   `NutritionEducationScreen`, linked straight from the reveal and described in
   its own code as "the first thing a new Pro user reads", says "Use an app like
   MyFitnessPal or Cronometer" (NutritionEducationScreen:103-109). Volyume ships
   its own complete, coach-integrated food logger (the Eat / Diary tab:
   `DiaryScreen` reads the coach's targets and tracks the day against them, with
   barcode scan, label OCR, multi-source search, saved meals and recipes,
   `food/db.js` + `food/sources` + `food/ocr`). The instruction is not just
   stale, it points users away from the product. This is the single most
   important fix and it is a one-paragraph change (doc 07, C1).

2. **The food model is mis-sold and under-explained.** The coach adapts calories
   from the morning-weight trend, not from food logs (weeklyCoach.js:373-379,
   WeeklyCheckInScreen:97-105). Food logging in Eat is optional and sharpening.
   Nothing in the flow says this, and the paywall inverts it by selling Pro as
   "adds food data / the food layer" (PaywallScreen:107-109). Users are left
   thinking they must log every meal, the opposite of the truth.

3. **The Pro and trial surfaces are a mix of three incompatible stories.** Trial
   length is stated as 14 days (PaywallScreen), day 14/28 (CascadeGate
   docstring) and day 21 (the actual `cascade.js` mechanic). Price shows £2.99
   where the catalogue holds £0.99 / £1.99 / £3.99. The paywall's comparison
   strip still pits Pro against a deleted "Complete" tier and frames Pro as the
   downgrade (TierComparisonStrip:23-74). All of this is 3-tier residue in a
   2-tier app.

4. **The richest builder is hidden, and Free users have no coached builder.**
   The coached generator (`ProGoalSetup`, "Update your plan") only appears on
   the Plans tab when the user is Pro and already has an active plan
   (PlansScreen:362-367). New Pro users without a plan, and all Free users, see
   only templates and a manual hand-builder. Free users get no coached plan in
   onboarding or the Plans tab at all.

5. **Onboarding hides two real options.** It never asks training days per week
   (hardcoded to 4, ProOnboarding:41), so every first plan is a 4-day plan, and
   it never asks protein approach (defaulted). The returning-user builder asks
   both. Onboarding is the thinner flow, not the builder.

---

## Parity verdict

Against the brief's rule ("everything in onboarding must exist in the builder"),
the coached options are present in `ProGoalSetup`, so there is no missing-option
gap in that direction. The real problems are the reverse and the structure:
- Onboarding omits days-per-week and protein that the builder has.
- The coached builder is gated/hidden and visually unlike onboarding.
- Manual Builder and Plan Library share none of the coached vocabulary, and the
  app carries five different goal/division taxonomies with diverging keys.

Full table in doc 01.

---

## What is genuinely good (keep it)

- The per-question "why" hints. This is Volyume's research-backed strength.
- The steps explanation, accurate and plain ("Your phone fills the number in
  for you", the lever-order line about steps before food).
- The reveal: routine cards, the "Why this plan, for you" engine rationale, the
  founder note.
- Division-specific training copy, which is truthful, the engine really does
  bias volume per division.
- Nutrition copy, the targets are real (Mifflin-St Jeor / Katch-McArdle +
  adaptive TDEE) and described without jargon.

---

## Recommended order of work (from doc 07)

1. One short copy/asset PR: delete the MyFitnessPal instruction and introduce
   Eat, re-frame the paywall, remove the defunct Complete column, fix the trial
   length and price, fix "3 questions", drop the "MAV" jargon. (C1-C7, mostly
   Effort 1.)
2. Parity and truth: add days-per-week to onboarding, make the coached builder
   reachable for all Pro users, persist weak points, add the "how coaching
   works" line, introduce Eat in context, add protein. (C8-C10, H1-H3.)
3. Structural unification: one account component, one selection language across
   both flows, one goal/division vocabulary. (H4-H8.)
4. Polish. (P1-P7.)

---

## Process note

This audit was run after a direct correction from the founder: the app now has
a complete food logger (Eat) that ties into the coach, food no longer needs
separate logging, steps are automatic, and several old onboarding instructions
are no longer valid. That correction was right, and it is reflected throughout
docs 01, 04, 06 and 07. The lesson for the next pass: read the food subsystem
and every linked explainer screen, not only the screens named in the navigator
stacks.

No code has been changed. Awaiting confirmation to proceed.
