# PHASE H SPEC: the directory-wide scenario matrix (order sections 15, 16)

Lead-authored contract; implementation is mechanical against it. Two new
suites + one generator script. Existing end-to-end proofs stay the deep
anchors (contamination replay, coach suite, adherence, reintroduction,
onboarding walks); Phase H adds BREADTH across every directory profile.

## Suite 1: src/lib/capability/__tests__/directoryScenarioMatrix.test.js

Built over the derived library (parse RAW + SUBREGION_MAP like
capabilityFamilyPlans.test.js) and the REAL directory profiles.

For EVERY profile in conditions.js + injuries.js:
1. Materialise its questions as constraint rows (demand -> demand rule;
   family -> one row per familyKey; exercise_list -> exercise rows by
   resolved id). Injury profiles as role episode (episodeGroupId 'eg1');
   condition profiles as role baseline.
2. Resolve with buildCapabilityResolveState and assert over ALL rows of
   the derived library:
   - NO INCOMPATIBLE AUTO-SUGGESTION: every exercise the resolver calls
     eligible has zero DEFINITE conflicts (recompute conflicts directly
     from the rules and the exercise's axes/family - independent
     reimplementation in the test, not a call back into the resolver).
   - NO INVENTED RESTRICTION: every exercise the resolver calls
     INELIGIBLE has a nameable cause (a definite conflict OR an unknown
     axis among the profile's constrained axes). Zero unexplained
     exclusions.
   - HONEST UNKNOWNS: any exercise excluded for unknown-only reasons is
     counted separately (goes to the stats, never silently).
3. USEFUL PLAN OR HONEST GAP: per muscle, count eligible exercises;
   assert the profile leaves at least 6 muscles with >= 3 eligible
   exercises (the useful-plan floor), OR the profile is explicitly
   listed in THIN_PROFILES with its honest reason (expected: none).
4. BASELINE DIGNITY: for condition profiles (baseline role), assert the
   resolve state carries no episode and isConstraintActiveAt semantics
   treat rows as plain baseline (no temporary framing exists at this
   layer; the CC26 role-scoping guard already pins the UI).
5. STACKS: three canonical multi-constraint scenarios:
   - wheelchair_user baseline + shoulder_rotator_cuff_related episode;
   - grip_hand_dexterity baseline + low_back episode;
   - multiple_sclerosis baseline (balance) + wrist_hand_loading episode.
   Assert: union semantics (eligible set = intersection of each state's
   eligible sets); ending the episode restores exactly the baseline
   eligible set; the baseline set is untouched throughout.
6. LATERALITY: for one laterality-carrying profile question set (upper
   limb difference), assert a left-qualified bilateral_upper rule keeps
   unilateral-loadable exercises eligible while true-bilateral rows
   conflict (33.8 carving).

## Suite 2: src/lib/capability/__tests__/movementConstraintFixtures.test.js

The order section 16 fixtures, one test each, driven through
demandAxisConflict + family matching over the derived library:
1. overhead restricted -> Barbell Overhead Press conflicts, Barbell
   Bench Press does not;
2. horizontal press problematic (flat+incline+decline family rules) ->
   Barbell Bench Press blocked, Neutral Grip Pull-Up eligible;
3. loaded elbow flexion (curl families) -> Dumbbell Curl blocked,
   Machine Chest Press eligible;
4. bar grip restricted -> Deadlift conflicts, Leg Press eligible
   (supportive), plus an exercise_allow carve restores one named row;
5. axial restricted -> Barbell Back Squat conflicts, Leg Press eligible;
6. deep hip flexion (squat_press family + abs flexion family) ->
   squats and Hanging Knee Raise blocked, Romanian Deadlift eligible;
7. deep knee flexion (squat_press + knee_flexion + knee_extension
   families) -> Leg Press and Lying Leg Curl and Leg Extension blocked,
   Barbell Hip Thrust eligible;
8. dorsiflexion-limited squat pattern (squat_press family + allowances)
   -> family blocked, allowance re-admits 'Leg Press' for that user;
9. unilateral stack: baseline left bilateral_upper + episode right
   grip_bar -> Single-Arm Cable Row stays eligible (unilateral,
   side-carved), Barbell Bench Press conflicts.
Fixture 9's exact expectations follow the resolver's carve semantics;
derive them from resolve.js, never invent.

## Generator: scripts/scenario-coverage.mjs -> docs/capability-campaign-25-2026-08-20/SCENARIO-COVERAGE.md

Per directory profile: eligible-exercise count total and per muscle,
unknown-only exclusion count, definite-conflict count, muscles at or
above the 3-eligible floor. Plus a scenario tally (profiles x checks
run, stacks, fixtures) and the generation date line taken from git (not
Date.now - scripts may not use it? scripts CAN use Date; only Workflow
scripts cannot. Use new Date().toISOString().slice(0,10)).

## Hard bounds

- Read-only over product code: these suites import and drive; they never
  modify modules, never touch the DB harness (pure resolver layer only).
- No test may weaken an existing pin; no snapshot tests.
- British English comments; no em dash anywhere.
- The suites must FAIL loudly if a directory profile's questions bind to
  a family/axis with zero library presence (that would be a dead
  question) - assert every question's rule matches at least one library
  row somewhere (eligibility direction irrelevant).
