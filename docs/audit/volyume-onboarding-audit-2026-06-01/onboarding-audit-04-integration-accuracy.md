# Onboarding Audit 04 — Integration Accuracy

> HANDOFF UPDATE, end of 2026-06-01 session. Fixed and shipped (batches 1-3):
> F1 food line now points to the in-app diary; F2 Complete column removed; F3/F4
> trial length and price corrected; F6 paywall headline reframed; F8 weak points
> now persist; F9 dead legacy-goal branches removed. STILL OPEN: F5 was fixed
> (quiz "2 questions"), the broader differential-paywall "food data" framing was
> left intact as a product decision, and the day14/28 docstring synonyms in
> cascade remain by design. Re-verify against the live code before acting on the
> pre-fix tables below.

Status: COMPLETE (Phase 4 of 7). Fresh audit from the live code. Date: 2026-06-01.

Confirms each feature reference in both flows against how the app actually works.
The six checks below are weighted equally. Verdict scale: ACCURATE / OUTDATED /
MISSING / CONTRADICTORY.

---

## 1. Steps and activity tracking — ACCURATE
Steps are read automatically from the platform health aggregator (phone
pedometer, Apple Watch, Garmin, Fitbit, Whoop), manual entry is a fallback only,
no wearable forced (`activitySteps.js:2-14`, :104-113). Onboarding copy "Your
phone fills the number in for you." (ProOnboarding:1190) is accurate. No copy
presents manual entry as primary. No fix needed.

## 2. Food logging and Diary — OUTDATED COPY (the one critical here)
The question is whether the food-logging process is mentioned and explained
clearly in the flow. It is not, and where it is touched it is wrong:
- `NutritionEducationScreen:103-109` (linked from the reveal's "5-minute guide")
  tells the user to "Use an app like MyFitnessPal or Cronometer." That describes
  an external app, not the current process. Flag as a critical copy error.
- The Diary tab is otherwise not introduced in the flow, and its contribution to
  coach recommendations is not explained.
For context only (not a build task here): the coach adapts primarily from the
morning-weight trend (`weeklyCoach.js:373-379`), with food adherence used only
when food data exists on 5+ of 7 days (`WeeklyCheckInScreen:97-105`).
Fix: correct the copy to describe the in-app process; do not send users to a
competitor.

## 3. Division-specific training — ACCURATE
"Biases volume toward the muscles that category is judged on." (ProOnboarding:1002,
ProGoalSetup:303) matches the engine's real per-division overlays, MRV caps and
pool rules (`planEngine.js:127-360`, :846). Caveat: onboarding hardcodes days=4,
so the engine's day-sensitivity is not exercised from a first-time plan.

## 4. Nutrition targets — ACCURATE
Mifflin-St Jeor / Katch-McArdle BMR, activity multiplier, adaptive TDEE from the
weight trend (`nutritionEngine.js:334-352`, :544-545, :214-264). The label is
plain ("Standard calorie formula" / "Lean mass-adjusted formula", :633). The
wizard hints and the reveal numbers are accurate.

## 5. Pre-population in the plan builder — PARTIALLY PRESENT
`ProGoalSetup` pre-populates every field from `userProfile` (:70-87) and rescopes
weak points on goal change (:145-147). It recalculates nutrition from the latest
morning-weight EWMA rather than the stale profile weight (:183-191), correct, but
the weight it uses is not shown on the screen. Latent bug: onboarding's saved
profile omits `planWeakPoints` (ProOnboarding:460-483) while `buildPlanInputs`
reads it (planAutoGen.js:97), so a regenerate-from-profile drops the weak points.
`ManualBuilder` pre-populates nothing.

## 6. Pro and trial — CONTRADICTORY / OUTDATED
| Claim | Source | Reality |
|---|---|---|
| "Try Pro free for 14 days" | PaywallScreen:92-94 | day-21 trial in code |
| "Day 14 / Day 28" gates | CascadeGateScreen:5-7 docstring | single day-21 gate (:39-59) |
| Pro = "adds food data" | PaywallScreen:107-109 | Pro = coaching |
| £2.99/month | PaywallScreen:91 | £0.99 / £1.99 / £3.99 (catalogue.js) |
| Pro vs "Complete" comparison | TierComparisonStrip:23-74 | 2-tier model, Complete removed |
Trial actually starts at consent (`Article9ConsentScreen:90`), day-21 expiry
(`cascade.js:165`).

---

## Flag list
Critical (references behaviour that is not current):
- F1 NutritionEducation "use MyFitnessPal/Cronometer" (NutritionEducationScreen:103-109).
- F2 TierComparisonStrip "Complete" column (:23-74).
- F3 Trial length 14 vs day14/28 vs day21 (PaywallScreen, CascadeGate, cascade).
- F4 Price £2.99 not in catalogue (PaywallScreen:91).
- F5 "Answer 3 questions", quiz has 2 (PlanLibrary:439).
- F6 Paywall "food data" headline mis-frames Pro (PaywallScreen:107-109).

High:
- F7 Diary food-logging process not clearly introduced in the flow.
- F8 planWeakPoints dropped from saved profile (regenerate loses weak points).
- F9 Dead legacy-goal branches in GoalChangeSummary (:38-44).
