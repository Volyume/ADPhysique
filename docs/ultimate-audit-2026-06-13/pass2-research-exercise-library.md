# PASS 2 — RESEARCH: EXERCISE LIBRARY (area code EL)

Method: direct, no agents, provenance-labelled.

## FINDINGS
- **EL-F1** | Multi-angle video/animated demonstrations + form cues are now STANDARD expectations in
  workout apps (Jefit 1,400+ animated movements with muscle maps + difficulty; others 500-550+ videos
  with step-by-step instructions). | CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR (zing/garagegym/setgraph
  roundups) | US-SKEWED. → **Directly corroborates Volyume U-A-6**: exercise demonstrations ABSENT
  (Pass-1 Section 4, text-only) is below the category standard. Real gap.
- **EL-F2** | Library-size benchmark: ~500 (lower bound) to 1,200-1,400+ exercises with demos. |
  CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR | US-SKEWED. → Volyume has POOL (13-muscle hardcoded) +
  library-generated pool (generatePoolFromLibrary) + custom_exercises (Pass-1); actual library SIZE
  VALUE DEFERRED — compare to the 500-1,400 bar when consumed.
- **EL-F3** | Custom exercises + substitutions are expected (Hevy custom-exercise creation/duplication;
  SHRED substitutions). | CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR (incl. Hevy vendor) | US-SKEWED. →
  Volyume HAS custom_exercises table + swapEngine (rankSwaps/auto-swap, Pass-1) — at parity.
- **EL-F4** | Top complaint: "one-size-fits-all plans that only adjust by weight/age/goal labels";
  users want dynamic programs adapting to performance, recovery, injury, equipment, preferences. |
  CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR (consagous/quora) | US-SKEWED. → Volyume planEngine DOES
  adapt on experience/recovery/nutrition/age/equipment/weak-points (Pass-1-verified) — differentiator.
- **EL-F5** | Complaint (study-cited via aggregator): "23 of 30 apps did not provide an actual training
  plan or explain how to choose a workout" — hard for beginners. | CONFIDENCE PARTIAL | PROVENANCE
  AGGREGATOR (citing a study, not fetched) | US-SKEWED. → Volyume generates real structured plans
  (planEngine) — differentiator vs the field.
- **EL-F6** | Trend: AI form coaching ("AI coaches now provide form cues"). | CONFIDENCE PARTIAL |
  PROVENANCE AGGREGATOR | US-SKEWED. → ⚠ Volyume no-AI rule excludes AI form coaching; static form
  tips (formTips.js) are the compliant path — relevant to U-A-7 (guarantee form guidance renders).

## APPS RESEARCHED (named): Jefit, Hevy, FitPros, SHRED, Exercise.com, LIFT Workout Manager (6).
- App count 6 → THIN on breadth (flagged).

## PER-AREA PROVENANCE SUMMARY
- By provenance: PRIMARY 0, QUANT 0, AGGREGATOR 6 (incl. vendor + a study-via-aggregator), UNREACHABLE
  (subreddits/quora-not-fetched).
- Representativeness: **US-SKEWED**.
- Plain statement: AGGREGATOR/PARTIAL throughout. The decision-relevant items are firm because they
  meet Pass-1 facts: demos ABSENT vs standard (U-A-6 confirmed gap); custom-exercises+swaps at parity;
  dynamic plan adaptation a Volyume differentiator. The "23/30" study is named-not-fetched → verify.

Sources: [Zing — best muscle-gain apps](https://www.zing.coach/fitness-library/best-workout-apps-for-muscle-gain) ·
[Hevy — custom exercises](https://www.hevyapp.com/features/custom-exercises/) (vendor) ·
[consagous — why fitness apps fail](https://www.consagous.co/blog/from-download-to-delete-the-real-reasons-fitness-apps-fail-users) ·
[WorkoutX — top exercise databases](https://workoutxapp.com/blog/top-10-exercise-databases-fitness-apps.html)
