# Facts: Plans & builder

Raw fact-extraction report, saved verbatim from a read-only subagent
(model: claude-sonnet-5) run on 2026-07-09. Evidence base for `ASSESSMENT.md`.
Facts only; all judgement lives in the assessment.

---

Not referenced by the plan/builder/exercise screens in scope, so skipping them per instructions. I now have all the facts needed.

## PLAN DISCOVERY

- **PlansScreen** (Train tab home): shows Active Plan card (name, workout count, current week X of Y), a "Block advisor" card (heads_up/early_deload/in_recovery/post_recovery states with signal chips and snooze), Folders (free tier, create/rename/delete/move-plan-to-folder), My plans list, Archived plans (collapsible), Workout templates, "Training blocks" row (→ MesocycleBuilderScreen), and a "Start with a plan"/"Switch your plan" decision hub with 2 (free) or 3 (Pro) action cards: Plan library, Create your own, and (Pro only) "Adjust training plan."
- **PlanLibraryScreen**: SearchBar + horizontal collection chips (`All plans, Featured, For women, For men, Beginner, Dumbbells only, Short sessions, Bodybuilding divisions`). Selecting "Bodybuilding divisions" reveals a `DivisionGrid` (3 Men's divisions: Men's Physique/Classic Physique/Men's Bodybuilding; 5 Women's: Bikini/Wellness/Figure/Women's Physique/Women's Bodybuilding — each with a one-line judging description). A 2-question quiz modal (`goal` then `equipment`) scores plans and recommends one; skippable at both steps. Plan cards show badges (Featured, division/gender, difficulty: Beginner/Intermediate/Advanced), workout count, description (2-line clamp), "Preview plan" + "Add to my plans" buttons. Non-quiz list defaults to beginner-plans-first (stable sort). FlashList-virtualized. Load-error state (FF-004) distinguishes real failure (retry button) from empty library.
- **PlanDetailScreen** (pre-commit preview, both library and owned plans): header badges (Library/Active plan/Featured), name, description, stats row (Workouts count, ~Est. sets/week computed from real per-routine set counts not a flat assumption, Level). Workouts list with per-workout exercise count. "Why this plan, for you" card — WHY_ORDER covers schedule/goal/experience/progression/equipment/recovery/nutrition/weakPoints, only shown for the active auto-generated plan. Free tier gets a "Manage" section (Edit/Duplicate/Archive); Pro users don't (they use the goal-change wizard instead). Adding a library plan always presents a 3-way dialog: Cancel / Save for later / Add and start this plan (mid-block switch is confirmed via `confirmPlanSwitchMidBlock`).
- Pre-account **PlanPreviewScreen** (COMP-030, quiz reveal before signup): shows headline, split name, structure, phase line — deliberately withholds calories/macros ("come after, with permission"); CTA "Create an account to keep it," footer disclaimer "No payment card. Nothing charged unless you choose."

## BUILDER

- **ManualBuilderScreen** is 2 pages: Page 1 (name, goal chips: Build Muscle/Balanced Bodybuilding/Aesthetic Focus/Strength-Biased/Lose Fat Keep Muscle, days-per-week 2-6) → creates empty Day 1..N; Page 2 is the day/exercise editor (also reached directly in edit mode via `planId` param, bypassing Page 1).
- Per exercise: steppers for Sets(1-20)/Reps min/Reps max(1-50, kept coherent so min≤max)/Rest(30-600s step 15), reorder via up/down chevrons (not drag — see below), long-press to remove with an 8s Undo toast (no confirm alert).
- **Supersets**: tap-to-select up to 2 exercises, "Group N into superset" button; capped at pairs (toast: "Supersets pair two exercises for now."); reorder treats a superset pair as one atomic block so it can never be split.
- **Plan Balance card** (`PlanBalanceCard`): live per-muscle set totals for 8 priority muscles (chest/back/shoulders/quads/hamstrings/biceps/triceps/glutes) against MEV/MAV/MRV volume landmarks, with dot-status (○ none/◐ low/● good/● high/● over) and text warnings ("No X work in this plan" / "X work is low, consider adding a set or two" / "X volume is very high, this may affect recovery"). Only shown once >=1 exercise is added.
- Validation on save: plan name required, ≥1 day required, ≥1 exercise per day required (unless saving a draft, which is lenient).
- Day-level actions: Add day, Duplicate day (remaps superset group ids independently), Remove day (Undo toast).
- Save flows differ by mode: new plan → "Save draft" (goBack to plans tab) or "Save and activate" (success bottom sheet: "Plan activated" / "Stay here" / "Go to Train"); edit mode → single "Save changes" (deliberately does NOT re-trigger `activatePlanWithBlock`, so editing an active plan never resets its training block).
- **BuildWorkoutScreen** (ad-hoc single workout, not a saved plan): per-exercise Sets/Reps-min/Reps-max/Rest/Starting-weight controls; exercise picker is a full-screen modal with search (render-capped at 80 with "Showing the first 80, refine your search" hint) but filters the WHOLE library first, not truncating pre-filter. "Travel / hotel gym" quick-fill generates a deterministic full-body session (bodyweight/dumbbells/hotel gym) via `generateTravelPlan`. Footer: "Start without a plan" (empty) or "Start training (N)".
- **ExercisePickerModal** (shared across Manual Builder / RoutineDetail / swap / active workout): fuzzy typo-tolerant search (`fuzzySearch`), muscle-group chip filters (all muscles) + equipment chip filters (Barbell/Dumbbell/Cable/Machine/Bodyweight/Smith Machine/Bands), a "Recent" horizontal row of recently-used exercises (add-mode only, hidden once searching/filtering), and an always-visible "Create a custom exercise" footer action (never hidden behind empty results) with fields for name, primary muscle, secondary muscles (multi-select, mutually exclusive with primary), equipment, and exercise type (Weight & reps/Bodyweight+added weight/Reps only/Time/Distance & time). Swap mode hides the browse filters to keep focus on search-and-select.
- **RoutineDetailScreen** (editing one saved workout/routine within a plan): muscle-coverage chip row (count-tiered colour), superset chip labels (A/B/C), swap-exercise flow (ranked substitutes via `rankSwaps` + reason text, or full-library search), reorder toggle (chevrons, not drag), per-exercise edit sheet (sets/reps/rest/start weight), and handles "unresolved" exercise rows (broken FK from pre-deterministic-ID sync era) with a warning-styled card and one-tap re-link via the swap modal.
- **PlanUpdateScreen** (Pro-only "Adjust training plan"): training-only rebuild (goal/weak-points/experience/days/session-length/equipment/recovery) that explicitly never touches calories/macros. "Review my plan changes" triggers a dry-run + before/after diff bottom sheet (days/split/session-length rows, moves added/dropped) before any commit; "Confirm and rebuild" commits (rebuild-first-then-activate, so a failed rebuild can't split-brain the profile).

## EXERCISE DETAIL

`ExerciseDetailScreen` shows: tag row (primary muscle, subregion, equipment, compound/isolation, difficulty), secondary muscles ("Also works"), Estimated max (tooltip-explained Epley 1RM), a 3-stat row (Quality/Fatigue out of 5, Rep range) — no muscle diagram/illustration anywhere. PR highlight card (Est. max / Best set / Most reps with achieved date). Optional target-weight goal with progress bar and auto-detected achievement (animated congrats banner). Plateau-detection banner. Strength trend chart with 5 switchable metrics (Est. max, Max weight, Total reps, Volume, Best-set vol) and time-window chips; a computed one-line takeaway. History list (last 8 sessions, sets with weight×reps, warmup/dropset tags). All-time PRs list. "Similar exercises" horizontal cards (ranked substitutes). Coaching cue callout. "How to do it" card — auto-splits form-tip/notes text into numbered steps when ≥2 sentences detected, else a single paragraph. No exercise video, illustration, or muscle-diagram image anywhere in this screen.

## COPY (verbatim)

1. "Answer a few quick questions and we'll suggest a starter plan, or browse the library if you'd rather choose yourself."
2. "Not sure where to start? Answer two quick questions and we'll point you to the right plan."
3. "A new training block starts today with the same workouts. Aim to match or improve on last time's weights."
4. "\"{name}\" has no exercises. Add one or remove the day" (warning toast)
5. "Supersets pair two exercises for now."
6. "No {muscle} work in this plan" / "{muscle} work is low. Consider adding a set or two."
7. "{muscle} volume is very high. This may affect recovery."
8. "Copy \"{name}\" into your plans. Make it active now, or just add it for later."
9. "Showing the first 80. Refine your search to see more."
10. "Add at least one exercise, or start empty from the footer."
11. "The plan will be hidden from My plans. Session history stays intact and you can restore it from the Archived section."
12. "No payment card. Nothing charged unless you choose." (PlanPreviewScreen footer)

## STATE COVERAGE

- **Empty states**: PlanLibrary ("No plans found" with context-specific sub-text for search/division/filter, vs. "Couldn't load plans" retry state for real errors — FF-004 distinguishes the two); ManualBuilder exercise picker "No matching exercises" with Clear-search button; ExerciseDetail "You haven't logged this exercise yet" with Start-workout CTA; ExerciseDetail read-failure card ("Couldn't load exercise details… your workout history has not been changed") with Try-again; MesocycleBuilder differentiated empty copy depending on whether a plan is active; RoutineDetail "No exercises yet. Add some below."; PlanDetail "No workouts in this plan" (library) vs "No workouts yet. Edit the plan to add workouts." (owned).
- **Unsaved-changes guards**: none observed — ManualBuilder's back/close actions don't confirm discard; PlanUpdateScreen's diff-sheet "Back" simply clears staged state without any writes having occurred (so there's nothing to lose), by design (nothing written until commit).
- **Loading**: skeleton screens throughout (SkeletonCard mirroring real layout) rather than spinners — PlansScreen, PlanLibraryScreen, PlanDetailScreen, ExerciseDetailScreen, ManualBuilder (edit-mode load), MesocycleBuilderScreen.
- **Error handling**: consistent pattern of `logError`/`logWarn` + calm toast ("Couldn't X, try again"), never a raw crash; PlanLibrary and ExerciseDetail additionally distinguish "empty" vs "load failed" with a dedicated retry surface.

## INTERACTION

- **No drag-to-reorder anywhere** — ManualBuilder and RoutineDetailScreen both use up/down chevron buttons deliberately, per an explicit code comment: `react-native-gesture-handler` is in the dependency tree but no screen builds a drag surface on it; chevrons were chosen "to match [the] established convention" rather than introduce a new interaction pattern.
- Reorder respects superset-pair atomicity (a pair moves as one block, never split).
- Sheets vs full screens: BottomSheet used for plan-diff preview (PlanUpdateScreen), success confirmation (ManualBuilder), goal editor (ExerciseDetail); full-screen Modals (with nested SafeAreaProvider to fix inset issues under RN's own modal window) used for exercise pickers, swap picker, and travel-mode equipment picker.
- Animations respect `reduceMotion` (from accessibility store) throughout — modals swap `slide`/`fade` for `none`, and ExerciseDetail's congrats banner switches from an `Animated.sequence` to an instant show/hide with `setTimeout`.
- Long-press = destructive-with-undo pattern (exercise/day removal in ManualBuilder) rather than confirm dialogs; separately, destructive actions elsewhere (archive plan, delete folder, remove exercise in RoutineDetail) do use confirm `appAlert` dialogs — so the app mixes both patterns depending on reversibility cost.
- Haptics: not referenced in any of the 10 screens read (no `expo-haptics` import), despite CLAUDE.md flagging Core-Haptics dependency as a held/gated decision item.

## STANDOUT

**Strong:**
- Plan Balance card in ManualBuilder gives live volume-landmark feedback (MEV/MAV/MRV) per muscle while authoring, with a documented rule that this authoring-time feedback is deliberately NOT duplicated as day-level "unbalanced" criticism inside RoutineDetailScreen (a founder device-walk fix, comment cites 2026-06-12).
- PlanUpdateScreen's dry-run + before/after diff sheet before any commit is a deliberate anti-split-brain design (rebuild-first-then-activate, profile only saved as canonical after success) — a genuinely careful pattern for a coaching-adjacent write.
- ExerciseDetailScreen's "How to do it" auto-splits prose into numbered steps only when ≥2 real sentences are detected (regex respects decimal ranges like "30–45°" so they don't wrongly split) — thoughtful text-processing rather than a naive split.
- FF-004's separation of "empty library" vs "failed to load" in PlanLibraryScreen prevents a false "no plans" message masking a real connectivity/init failure.
- "Unresolved exercise" recovery UX in RoutineDetailScreen: broken-FK legacy rows get a distinct warning-styled card with one-tap re-link into the swap modal, rather than silently breaking or crashing.

**Rough edges:**
- No drag-to-reorder for exercises or plan days anywhere, despite gesture-handler already being a dependency — chevron taps only, which is markedly less fluid than typical fitness-app plan builders (Hevy, Strong, etc.).
- No unsaved-changes guard in ManualBuilder — a user who edits a plan then backs out mid-session (outside the "nothing written until Save" pages) has no explicit warning dialog observed.
- ExerciseDetailScreen has no exercise illustration, video, or muscle diagram at all — "How to do it" is text-only steps, unusual for a fitness app given competitors typically ship demo GIFs/images.
- Supersets are hard-capped at exactly 2 exercises ("Supersets pair two exercises for now"), with no path to a true giant set (3+), enforced with a toast rather than the UI simply disabling further selection.
- Haptics are entirely absent from all screens read, consistent with the CLAUDE.md note that Core-Haptics is still a gated/undecided item — so tactile feedback on stepper taps, superset grouping, drag/reorder, etc. is currently zero across this whole builder surface.
