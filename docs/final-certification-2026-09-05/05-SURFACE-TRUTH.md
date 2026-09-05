# 05 — SURFACE TRUTH: claim → code → behaviour

Authority: founder brief 2026-09-05 "final whole-product adversarial
certification", Parts 3-5, 18, 20-26, 29-31, 36. Read-only discovery pass.
Scope: first run / account / setup, Today, Train, Coach, Nutrition, Progress,
Settings, error surfaces, first-use vs mature.

OUT OF SCOPE (other agents own them): the capability / "How you train"
feature itself, and kettlebell / circuit / minimal-kit internals. Where those
concepts appear on my surfaces they are named, not audited.

Verdicts: TRUE · OVERCLAIM · UNDERCLAIM · STALE · AMBIGUOUS · MISLEADING.

---

## A. FIRST RUN / ACCOUNT / SETUP

Gate order (`src/navigation/RootNavigator.js:2068-2131`): `!user` → Welcome;
signed-in + consent unresolved → blocking hold; `healthConsent === false` OR
(null AND !firstRunComplete) → Article 9; `!firstRunComplete` → ProOnboarding;
else MainTabs. Consent fails CLOSED for new users, as required.

| Claim (verbatim) | Code | Actual behaviour | Verdict |
|---|---|---|---|
| "Everything you need to build your physique." / "Training, nutrition, progress and coaching, connected in one app." | `src/screens/WelcomeScreen.js:111-115` | All four surfaces exist and are reachable | TRUE |
| "Completely free · No ads" | `WelcomeScreen.js:152`; `src/lib/proGate.js` `FULL_ACCESS_FOR_ALL = true` | No paywall, no ads, no route guarded; billing surfaces unregistered (`RootNavigator.js:417,443,501,549,619`) | TRUE |
| Quiz-first front door | `src/lib/onboarding/quizFlow.js:24` `ONBOARDING_QUIZ_FIRST = false` | Dead branch in `WelcomeScreen.js:74-77`; live path is AuthSheet | TRUE (flag off, honest) |
| "What Volyume looks at" / "What leaves your phone" / "What we never do with it" / "Where it lives" | `src/screens/Article9ConsentScreen.js:214-256` | Enumerated, EU-Dublin named, 30-day purge named | TRUE |
| "Volyume Score is a simple progress read, not a medical measure, DEXA scan, diagnosis, or medical advice." | `Article9ConsentScreen.js:225` | Matches `src/lib/progressScanResultsContract.js:305-307` meaning-moment copy | TRUE |
| Decline path | `Article9ConsentScreen.js:301-330` | "What if I don't agree?" reveals Sign out / Delete my account — no dead end | TRUE |
| "First name (optional) — Only used to greet you." | `ProOnboardingScreen.js:1948-1949` | Consumed at `ProSetupCompleteScreen.js:46,265`, `YouScreen.js:354`, `AthleteProfileScreen.js:282`. Never on share cards | TRUE |
| "Used by the calorie formula and safety floors. This stays private." (sex) | `ProOnboardingScreen.js:1968` | `nutritionEngine.js:714-722` floor 1500/1200; BMR | TRUE |
| "This sets your starting volume and how complex the exercises are." (experience) | `ProOnboardingScreen.js:2255` | `planEngine.js:127` `computeLandmarks(experience, …)`; `nutritionEngine.js:941,984` | TRUE |
| "Choose what you normally have access to, so swaps and exercise choices make sense." (equipment) | `ProOnboardingScreen.js:2294` | Swap surfaces now pass equipment: `ActiveWorkoutScreen.js:1578`, `RoutineDetailScreen.js:596-604`, `ExerciseDetailScreen.js:431` | TRUE |
| "Be honest here. This sets how much volume your plan includes…" (recovery) | `ProOnboardingScreen.js:2771` | `planEngine.js:127-129` REC_MULT; `blockLedgerGather.js:423` | TRUE |
| "Building your first plan — Using your goal, schedule and training setup to build your starting plan." | `ProOnboardingScreen.js:2683-2686` | Real staged generation over `_generatePlanInner`; sequence aborts on failure (`ProOnboardingScreen.js:124-131`) | TRUE |
| "Volyume uses your morning weigh-ins and weekly check-in to shape coaching. Food logging helps refine it, and the app stays cautious when data is missing." | `ProOnboardingScreen.js:2756-2757` | `weeklyCoach.js:227-242, 1114-1179` — holds under thin data | TRUE |
| Step 5: "Nothing in particular" vs "Later, from Settings" | `ProOnboardingScreen.js:2340-2358`, handler `advanceFrom5` at `1113-1117` | **Both buttons run the identical handler.** Nothing is recorded, nothing is scheduled, no reminder exists. "Later" promises a follow-up that never arrives | AMBIGUOUS/MISLEADING (A-1) |

**Fields collected → all consumed.** sex, age, height, weight, bodyFat %,
bodyFatSource (`nutritionEngine.js:601`), experience, sessionLengthMinutes
(`timeConstraint.js:121-130`, `planFit.js:104`), daysPerWeek, equipment,
division (`planFit.js:151-155`), weakPoints (`planEngine.js:3185-3199`),
proteinApproach (`nutritionEngine.js:837-852`), recoveryRating, notification
prefs. **No over-collection found.**

**Consumed but never explained:** `division` / competition category drives
volume re-weighting (`GoalChangeSummaryScreen.js:46`) but the onboarding hint
(`ProOnboardingScreen.js:2424`) says only "biases the plan towards the muscles
that category is judged on" — adequate. No unexplained load-bearing field
found.

---

## B. TODAY (HomeScreen)

Two independent regions: the **hero** (`HomeScreen.js:2254-2470`) and the
**Today line** (one ranked occupant, `src/lib/home/todayLineArbiter.js`).

### Hero state machine

| State | Condition | Copy | CTA → | Verdict |
|---|---|---|---|---|
| Active workout | `hasActiveWorkout` (`HomeScreen.js:1617`) | "Workout in progress" / "Tap to return to your workout" | ActiveWorkout | TRUE |
| Training day | `activePlan && nextWorkout` (`:2271`) | session name, "N exercises", readiness chip, "Start workout" + "Options" + "Skip this workout this time" | ActiveWorkout | TRUE |
| No plan | else (`:2415-2436`) | "No active plan yet" + "Start with a plan and your coach builds one from your setup… `BLOCK_START_SENTENCE`" | plan preview sheet / PlanLibrary | TRUE |
| First workout escape hatch | always in no-plan branch (`:2453-2461`) | "Log your sets as you go. You don't need a plan to start, and next time Volyume will start you at the weights you log today." | blank session | TRUE — prefill from history exists (`ActiveWorkoutScreen.js:2339-2341, 2538-2547`) |
| **Week complete** | `programmePosition.nextSession === null` | **no such state** | — | **MISSING (B-1)** |
| **Plan active, zero routines** | `routines.length === 0` → `setNextWorkout(null)` (`HomeScreen.js:1195`) | falls through to "No active plan yet" | — | **MISLEADING (B-2)** |
| Rest day | — | no rest-day state exists; a resolved week re-offers session 1 | — | see B-1 |

**B-1 detail.** `programmePosition.js:161-172, 200` returns
`nextSession: null` once every reached week is resolved. `HomeScreen.js:1224-1228`
then falls back to `idx = 0` and sets `nextWorkout = routines[0]`. Today
therefore shows the *first session of the week again*, eyebrow
`"<Plan> · Day 1 of N"` (`planDisplay.js:76-88`), readiness line "On track for
this block." (`readinessSummary.js:192-195`), primary CTA "Start workout", and
the skip link is correctly hidden. Nothing anywhere says the week's required
work is done. Train has the same shape ("Start next workout",
`PlansScreen.js:1315`), so the two agree — they are consistently silent.

### Today line occupants (`todayLineArbiter.js`)

| Rank | Copy | Condition (HomeScreen fact) | CTA → | Verdict |
|---|---|---|---|---|
| 1 safety | reserved | `safety: null` always (`HomeScreen.js:2058`) | — | unreachable by design, documented (`todayLineArbiter.js:35-43`) |
| 2 | "Block complete. Choose what's next." | `currentMesoWeek.awaitingDecision` (`:2060-2063`) | PlansTab → Plans | TRUE |
| 3 | "Calories adjusted to N kcal. See why." / "This week's coaching decision. See why." | `showCoachBanner` (`:2128-2131`) — requires `hasEnoughData` + completed decision + <7d | CoachOutput | TRUE |
| 4 | "Your weekly check-in is ready. It shapes this week's coaching decision." | `showCoachingNudge` | WeeklyCheckIn | TRUE |
| 4.5 first review | passes item through | **fact never supplied** (retired, `HomeScreen.js:2085-2088`) | — | dead branch (B-4, P3) |
| 5 | "Recovery week. Training is deliberately lighter. What that means." / "Training is lighter for now. Why?" / "Recovery week suggested. See why." | gated recovery state / deload eligible | recovery sheet / CoachReview | TRUE |
| 6 | "Welcome back. A quick question before your next session." | `reEntryDue` | re-entry prompt | TRUE |
| 7 | "Your nutrition targets are set for X. Update them to match." | `phaseBannerEligible` | NutritionTargets | TRUE |

Every occupant has a CTA. **No state without a CTA.** One-at-a-time cap (D14)
is enforced by the arbiter, not by ad-hoc conditions.

**B-3 (contradiction).** When the block is finished, Today shows "Block
complete. Choose what's next." on the Today line, `readinessSummary`
"Block finished. Targets hold at recovery-week volume until you choose what
comes next." (`HomeScreen.js:1850`) — while the hero simultaneously offers
"Start workout" on session 1 with eyebrow "Day 1 of N". Three regions, two
different truths. P1.

**Missed session:** correctly modelled — a missed required session simply stays
outstanding (`programmePosition.js:157`), so it remains the next workout. No
copy needed and none present. Not an anomaly.

**Generic copy check:** the default "Ready when you are" coach brief is
suppressed (`HomeScreen.js:1811-1815` against `homeCoachBrief.js:105-106`), so
no content-free filler card renders. Streak / "N weeks running" echo removed
(`HomeScreen.js:2404-2409`). Clean.

---

## C. TRAIN (Plans / plan lifecycle)

| Confirm surface | Copy | Code | Verdict |
|---|---|---|---|
| Any plan activation | "This starts a six-week training block: five weeks that build, then a lighter recovery week." | `src/lib/blockExplain.js:54-56` (derived from `BLOCK_PLANNED_WEEKS`, cannot drift) | TRUE |
| Plan replace (block running) | "Confirming ends your current block at week N of M and starts a new one from week 1. **Your workout history and PRs are kept.**" | `blockExplain.js:101-103`, rendered `PlanPreviewSheet.js:370-373` | TRUE — answers "does the block reset / is history kept" explicitly |
| Rebuild that keeps every exercise | "Every exercise stays, so your current block carries on at week N of M rather than restarting. Your workout history and PRs are kept." | `blockExplain.js:114-116` | TRUE |
| Other plans displaced | "Your other plan moves to Archived plans on the Train tab. Nothing is deleted." | `PlanPreviewSheet.js:76-80` | TRUE |
| Hand edits | "Set, rep and note changes you made to the current workouts are not carried over." | `PlanPreviewSheet.js:84-85` (shown on every non-first path) | TRUE |
| Replacement target named | `This replaces "<plan name>".` | `PlanPreviewSheet.js:384-388` | TRUE |
| Adjust training setup | "Change schedule, equipment, experience, division or weak points. Volyume previews the rebuild before it replaces your active plan." | `PlansScreen.js:75-76`; preview really precedes the write (`PlanUpdateScreen.js:456-472`) | TRUE |
| Goal / phase change | preview sheet before the write, then `GoalChangeSummary` receipt | `ProGoalSetupScreen.js:787-794`, `:531` | TRUE |
| Volume / set edit on a routine | "This changes this workout only. Your weekly set targets stay with the block." | `RoutineDetailScreen.js:1357-1359` | TRUE |
| In-session swap | "Choose a close match for today. **Your plan is not changed**, and sets you log count towards the new exercise's own muscle in your weekly volume." | `ActiveWorkoutScreen.js:5946`; scope recorded as `SWAP_SCOPE.SESSION` (`src/lib/exercise/swapScope.js:26-30`) | TRUE — "this session only" is explicit |
| "I can't do this" | "Volyume will swap it for another exercise that works the same muscle group. **Choose whether that is just for today, or from now on.**" → two buttons | `ActiveWorkoutScreen.js:5484-5507` | TRUE |
| Exclusion / re-inclusion | "Rules that would leave it out apply again from now on. Nothing in your history changes." | `HowYouTrainScreen.js:1065,1077,1522-1523` (capability lane, noted only) | TRUE |
| Run this plan again | "A new training block starts today with the same workouts and the same set targets as last time." | `PlansScreen.js:585-586` | TRUE |
| Block end / continue with adjustments | "What continuing with adjustments would change" / "…: nothing"; "This block did not log enough recovery feedback to judge these, so this time both options start the next block from the same targets." | `PlansScreen.js:1470-1488` | TRUE — names the no-difference case rather than hiding it |
| Set as active | "Make this your active plan?" + `ACTIVATION_MEANING_SENTENCE` | `PlansScreen.js:872-876`, `blockExplain.js:65` | TRUE |
| Reduced session honesty | "…is unusually reduced: N of M exercises have no match inside how you train. You can pick replacements yourself, create a custom exercise, or keep the reduced session. Volyume will not add lower-quality work to hit a number." | `PlanPreviewSheet.js:311-317` | TRUE |
| Active plan card | "Your coach adjusts this plan as you progress and check in." | `PlansScreen.js:1307-1309` vs `CoachOutputScreen.js:956-957, 2435-2481` | **OVERCLAIM in the default mode** (C-1): default autonomy is `collaborative`, where the coach *proposes* and the athlete taps Apply. Only `coached` auto-applies |
| Block position | "Week N of M" / "Recovery week, week N of M" / "Block finished" + `BLOCK_DEFINITION` tooltip | `PlansScreen.js:1284-1291`, `blockExplain.js:79-87` | TRUE |

Plan Library, custom builder (`ManualBuilder`), archived plans, folders,
saved workouts and Past blocks all resolve to a real destination. No dead end
found on this tab. Load failure is a retry state, not a dead end
(`PlansScreen.js:1246-1250`).

---

## D. COACH

| Claim | Code | Behaviour | Verdict |
|---|---|---|---|
| Insufficient evidence: "Building your baseline." + a ticked/unticked ledger + "…first coaching review is ready on <date>." | `CoachOutputScreen.js:810-856`; rows from `src/lib/coachLedger.js:87-158` | Names *which* evidence is missing (`"2 of 3 mornings with a weigh-in in the last 7 days"`, `"Day 4 of 7 days of data"`, `"No training sessions yet"`) and the unlock date | TRUE — says what is missing and how to get it |
| Baseline weeks never advertised as a ready review | `HomeScreen.js:2124-2131` (`latestCoachDecisionComplete` includes `hasEnoughData`) | Today line stays silent during baseline | TRUE |
| HOLD copy gives a reason | `weeklyCoach.js:227-236` ("Need morning weights from at least 3 different days for a reliable trend…"), `:2021` (FFM floor, with the two numbers), `:2033` (target never really tried), `:2052` (oscillation), `:1274` (joint pain) | Every hold names its own cause in plain English | TRUE |
| Apply semantics stated before the tap | `src/lib/coachApplyView.js:78-79` "→ 2,340 kcal/day, stays until your next check-in." | Absolute post-tap value + duration | TRUE |
| Decline semantics | "Keep as is" button (`CoachOutputScreen.js:281-286`) → row renders "You chose to keep this as it is." (`:257-260`), recorded via `coachDecline.js` | Decline is a recorded decision, not a silent dismissal | TRUE |
| Manual mode ownership | "Manual mode: these are recommendations. The coach applies nothing; any change is yours to make. Change modes in Settings, under Coaching." | `CoachOutputScreen.js:2908-2912` | TRUE, but renders only inside the hero branch — on a "hold everything" week with no hero card the note is absent (D-2, P3) |
| Coached mode | "The coach applies each week's changes for you. Anything safety-related still waits for your confirmation." | `SettingsCoachingScreen.js:229-231`; enforced by `output.autoApplyHoldActive` guard at `CoachOutputScreen.js:2440` | TRUE |
| **"It cannot overrule you: every change it suggests waits until you accept it."** | `MethodologyScreen.js:115-118` vs auto-apply effect `CoachOutputScreen.js:2435-2481` | False for a `coached` user; the effect applies deload, training volume, calories and diet break with no tap | **MISLEADING (D-1, P1)** |
| ED-safety on Coach | `coachLedger.js:83-90` neutral variant under `edFlagOpen` — no weigh-in counts, title "Your coach is getting to know you"; `weeklyCoach.js:926` `learningStatus: 'held_for_insufficient_coach_data'` is internal only | Present, calm, proposes nothing | TRUE (confirmed, not modified) |
| Algorithm / rule-name leakage | grep of rendered bindings: no `{x.signal}`, `{x.classification}`, `{x.state}`, `{x.kind}` anywhere in `src/screens` or `src/components`. `reasons: ['Fewer than 5 weigh-ins']` (`weeklyCoach.js:240-242`) is never rendered | Only `d.reason` (prose) reaches the UI (`CoachOutputScreen.js:614,647`) | TRUE — no leak |
| "Based on the MATADOR trial (2017). This is a suggestion, not a requirement." | `CoachOutputScreen.js:544` | Cited, scoped, non-coercive | TRUE |
| Load failure | "Couldn't load your coach." + retry + "Your logs are safe." | `CoachOutputScreen.js:868-880` | TRUE — distinct from insufficient data, no dead end |
| Pre-check-in states (Coach tab) | `YouScreen.js:170-209` — five distinct states incl. a calm-mode variant that refuses to quote weigh-in counts | TRUE |

---

## E. NUTRITION

| Claim | Code | Verdict |
|---|---|---|
| "These are estimates. Adjust based on real-world progress over 2 to 4 weeks." | `NutritionTargetsScreen.js:81-83` | TRUE |
| "Estimated range: X to Y" (±10%) with "Aim for the single target, not the edges of the range." | `NutritionTargetsScreen.js:83, 1207` | TRUE |
| Derivation explained: BMR formula → Maintenance → goal-adjusted target | `NutritionTargetsScreen.js:64-70` | TRUE — names the formula inputs and the ±% by phase |
| "Your maintenance is N kcal. That is what you need to stay the same weight. Adding a X% surplus…" | `NutritionTargetsScreen.js:1462-1469` | TRUE |
| Refuses to invent a maintenance figure | "…maintenance cannot be verified from the current profile and evidence… we will not invent a maintenance number from the target." (`:1460`) | TRUE (exemplary) |
| Low-confidence body fat flagged | "Because this uses a best estimate, treat it as a sensible starting point rather than an exact measurement." (`:1485`); "Medium confidence. Based on a formula estimate." (`:165`) | TRUE |
| **Planned food is not intake** | `src/lib/food/db.js:325-337, 352-364` — every rollup, adherence, FFM and history query filters `is_planned = 0`; Diary excludes planned rows from real intake (`DiaryScreen.js:851-856`) | TRUE |
| Coach reads missing logging as missing, not zero | `src/lib/coachOutput/viewCopy.js:64` "You did not log your calories."; `:97` "Track your calories this week. Without that, the calorie target cannot be adjusted reliably." | TRUE |
| Changed target propagation | Diary shows "Targets updated. See why" linked to that week's decision (`DiaryScreen.js:1487-1496`); `targetsChangedRecently` | TRUE — Diary does not keep explaining an old target |
| Empty day / no targets | Rings still render; "Set your targets first and Volyume can suggest meals that fit them." + CTA (`DiaryScreen.js:1510-1527`) | TRUE — intentional, one way out |
| Barcode / custom / meal / recipe end states | `ScanBarcodeScreen.js:261, 284, 318, 387-410` (permission, no camera, manual entry, label fallback); `AddCustomFoodScreen.js:262-263, 411-413`; `RecipeBuilderScreen.js:285-323`; `MyMeals`/`MyRecipes` doors from `DiaryScreen.js:1891-1919` | TRUE — every path terminates in a toast + navigation, none dead-ends |
| Food exclusion scope | "…will be left out of your plans and suggestions from now on, and swapped out of this one. You can still search for it and log it whenever you like." | `MealPlanScreen.js:794` | TRUE |
| Meal swap scope | "Just this once, or from now on?" with two labelled options | `MealPlanScreen.js:1589-1621` | TRUE |
| Calorie floors 1,500 / 1,200 | `nutritionEngine.js:714-722`; deliberately kept qualitative in user copy ("There is also a fixed minimum below which Precision Coaching never suggests cutting", `MethodologyScreen.js:107-109`) | TRUE (deliberate, documented `MethodologyScreen.js:17`) |

---

## F. PROGRESS — observed vs calculated vs estimated

| Quantity | Label used | Code | Verdict |
|---|---|---|---|
| Weight trend | "Your trend" + tooltip "A smoothed version of your weight that ignores day-to-day noise." | `components/WeightTrendCard.js:96-98`, `src/lib/coachGlossary.js:41-42`; EWMA in `weightTrend.js` | TRUE — smoothing named and described, raw series drawn behind (`WeightTrendCard.js:105-115`) |
| Maintenance being built | "Your coach is building your estimate. Keep logging and it appears in about a week." | `WeightTrendCard.js:138-140` | TRUE |
| e1RM | "Est. max" everywhere, incl. the lens picker and headline | `LiftProgressScreen.js:80, 98` | TRUE |
| Strength level | "How your best estimated lifts compare to your own body weight… Each lift has its own thresholds" | `LiftProgressScreen.js:349` | TRUE |
| Volume | weekly set counts from logged sets | `blockMetrics.js` / `VolumeHeatmapScreen` | TRUE (observed, labelled as sets) |
| Volyume Score | "The Volyume Score is a progress read from your own photos. It is not a body fat measurement, a medical assessment, or a comparison with anyone else." (one-time meaning moment, `Understood`) | `src/lib/progressScanResultsContract.js:303-307`; consent-time twin at `Article9ConsentScreen.js:225` | TRUE — non-medical wording present at the surface, not only in consent |
| Low-confidence score | "This score has low confidence. The band and reasons above are the steadier read." | `progressScanResultsContract.js:132` | TRUE |
| Abstain reasons | 18 named, plain-English causes, each actionable (too dark → "Even front light will fix this next time.") | `progressScanResultsContract.js:163-180` | TRUE — no raw enum reaches the user |
| Recalibration | "Scores were recalibrated in an update. Your photos are unchanged." | `progressScanResultsContract.js:301` | TRUE |
| Sparse data | "Your starting set is saved. Take your next set the same way, at least a week from now, to unlock comparison." | `progressScanResultsContract.js:259` | TRUE |
| Block comparison | `BlockReflection` / "See what this block showed" | `PlansScreen.js:1513-1515` | TRUE |

---

## G. SETTINGS

`src/screens/SettingsScreen.js:41-155` — 14 rows, each a real destination:
How you train → `HowYouTrain`; Account → `SettingsAccount`; Profile →
`SettingsProfile`; Coaching → `SettingsCoaching`; Workout & units →
`SettingsWorkout`; Nutrition targets → `NutritionTargets`; Dietary needs →
`SettingsDietary`; Notifications and reminders → `NotificationSettings`;
Coaching reminders → `CoachingReminders`; Display and accessibility →
`SettingsDisplay`; Home screen widget → in-place alert with per-platform
steps; Apple Health / Health Connect → `SettingsHealth` (only when available);
Your data → `SettingsData`; Privacy and legal → `SettingsPrivacy`; Help and
about → `SettingsAbout`.

- **No commercial residue reachable.** A full grep of `src/screens` and
  `src/components` for trial / upgrade / subscription / pricing / currency
  strings returns only the four dormant screens
  (`ProUpgrade`, `Subscription`, `SubscriptionPolicy`, `CascadeGate`) and their
  dormant components, none of which is registered
  (`RootNavigator.js:148-150, 417, 443, 501, 549, 619`) or navigated to from
  live code. `ProGate.js` is imported nowhere. `differentialPaywall` is
  short-circuited by `FULL_ACCESS_FOR_ALL` at `weeklyCoach.js:2346`. TRUE.
- **No duplicated controls.** The two reminder rows were explicitly
  disambiguated (`SettingsScreen.js:93-111`): Notifications owns training/meal/
  quiet hours, Coaching reminders owns weigh-in + check-in.
- **Consequential settings explain their effect.** Autonomy
  (`SettingsCoachingScreen.js:227-234`), calmer coaching, app lock, Health
  write-back ("Workouts will appear in your Health log from now on",
  `SettingsHealthScreen.js:111`).
- **Help / methodology accuracy.** "Precision Coaching follows clear, fixed
  rules, never a guess." (`SettingsFaqScreen.js:42`) matches the deterministic
  engine mandate — TRUE. The FFM floor is stated with its real number
  ("30 calories per kilogram of lean mass a day",
  `MethodologyScreen.js:105-106`) — TRUE. The one inaccuracy is D-1 below.
- MEV/MRV are never exposed as jargon; volume language is
  "weekly sets climb… then drop back" (`blockExplain.js:79-83`). TRUE.
- `MealNames` route registered but deliberately unlinked
  (`SettingsScreen.js:83-86`) — documented, harmless.

---

## H. ERROR SURFACES

Systematic grep for `Alert.alert` / `appAlert` / `toast.show` / `<Text>`
rendering `e.message`, `err.message`, `String(e)`, `JSON.stringify` or a raw
enum:

| file:line | What renders | Verdict |
|---|---|---|
| `src/screens/WeeklyCheckInScreen.js:1019-1022` | `appAlert("Couldn't save check-in", e?.message ?? 'Try again.')` — **raw exception text to the user** on the highest-stakes weekly action | **P1 (H-1)** |
| `src/screens/DebugLogScreen.js:142, 173` | `{crash.message}`, `{crash.stack.slice(0,1200)}`, `{e.message}` | By design (support screen behind a 7-tap gesture, `SettingsAboutScreen.js:92-112`); not advertised. P3 (H-2) |
| `src/screens/BodyMetricsScreen.js:936` | `result.message` — authored validation copy from `bodyMetricValidate.js`, not an exception | TRUE |
| `src/screens/ActiveWorkoutScreen.js:2653, 3193` | `validation.title/.message` — authored copy | TRUE |
| `src/screens/ExerciseDetailScreen.js:896` | `plateau.message` — authored coach copy | TRUE |
| `ProGoalSetupScreen.js:506`, `PlanUpdateScreen.js:299`, `HomeScreen.js:1389`, `PlansScreen.js:521`, `ProOnboardingScreen.js:1710` | `e?.message` captured into a **log/telemetry** field only; user sees a fixed calm message (e.g. `REBUILD_FAILED_MESSAGE`, `PlanUpdateScreen.js:79`) | TRUE |
| `Article9ConsentScreen.js:158`, `HomeScreen.js:1421` | `e?.message` into `markCloudSyncError` (store state) | not user-rendered as raw text; verify at the sync-status surface — **could not verify statically** whether `syncStatusLabel.js` ever prints it (H-3) |

Everything else is a fixed, calm string. DB-open failure has a real recovery
path ("Couldn't open your data… Try again", `RootNavigator.js:2033-2050`).

---

## I. FIRST USE vs MATURE

| Teaching surface | Persistence key | Decays? |
|---|---|---|
| Home welcome card | `welcomeDismissed` + auto-retires at `totalSessions > 0` (`HomeScreen.js:2236`) | YES |
| "How you train" one-time offer | `hytOfferDismissed`, also self-retires once anything is set up (`HomeScreen.js:2246-2250`) | YES |
| Coach brief line | `@volyume_brief_dismissed_date` — once per day | YES (daily) |
| Coach banner | `@volyume_coach_banner_dismissed_<weekStart>` + 7-day window | YES |
| Phase mismatch banner | `@volyume_phase_banner_dismissed_v1` (keyed to the phase) | YES |
| Plateau banner | `@volyume_plateau_banner_dismissed_<user>_<ex>_<week>` | YES |
| Activation nudge | `@volyume_home_activation_nudge_dismissed_<user>_<stage>` | YES |
| Coaching nudge | `@volyume_seen_coaching_nudge` | once-ever |
| Diary hints (food / water / mark-eaten / plan-added) | `@volyume_seen_diary_*` (`DiaryScreen.js:2155-2164`) | once-ever |
| Workout info tip, rest hint, superset / unilateral walkthroughs | `@volyume_seen_workout_info`, `_rest_hint`, `_superset_walkthrough`, `_unilateral_walkthrough` | once-ever |
| Coach adherence-why, coach result | `@volyume_seen_coach_adherence_why`, `@volyume_seen_coach_result_<uid>` | once-ever |
| Progress scan meaning moment, baseline receipt, recalibration | `@volyume_progress_scan_meaning_moment_seen`, `@volyume_seen_scan_baseline_receipt`, `…recalibration_seen_ids` | once-ever |
| Photo prompt, partner moments, meal-reminder offer, OFF consent card | `@volyume_photo_prompt_shown_v1`, `@volyume_partner_moments_*`, `@volyume_meal_reminder_offer_dismissed_<uid>`, `@volyume_off_consent_card_dismissed_v1` | YES |
| What's new | `@volyume_whats_new_last_seen` | YES |

**No permanent teaching copy on a daily surface.** The two standing lines are
facts, not tuition: "Your coach adjusts this plan as you progress and check in."
(Plans, see C-1) and the readiness chip. The standing Diary education row was
deliberately removed (`DiaryScreen.js:1530-1535`). Clean.

---

## ANOMALIES

### P1

**D-1 · MethodologyScreen contradicts the Coached autonomy mode.**
`src/screens/MethodologyScreen.js:115-118` states, as a flat fact:
> "It cannot overrule you: every change it suggests waits until you accept it."

`src/screens/CoachOutputScreen.js:2435-2481` auto-applies deload, training
volume, calories and diet break with no user action whenever
`coachAutonomy === 'coached'` and no safety hold is open. Methodology is
reachable from every coaching decision (`CoachOutputScreen.js:3155, 3240`) and
from setup complete (`ProSetupCompleteScreen.js:591`) regardless of mode, so a
Coached user is told the opposite of what the app does. Suggested fix: scope
the sentence — e.g. *"It never overrules a safety hold, and unless you have
chosen Coached mode in Settings, every change waits for your tap."*

**B-1 · Today has no completed-week state; it re-offers session 1.**
`src/lib/programmePosition.js:200` returns `nextSession: null` when the week is
resolved; `src/screens/HomeScreen.js:1224-1228` falls back to `idx = 0` and
presents `routines[0]` as the next workout with eyebrow "Day 1 of N"
(`src/lib/planDisplay.js:76-88`) and readiness "On track for this block."
(`src/lib/readinessSummary.js:192-195`). The athlete who has done every
required session this week is invited to start the first one again, with
nothing saying the week's work is done. Train repeats it
(`PlansScreen.js:1315` "Start next workout").

**B-3 · Block-finished contradiction inside one screen.**
With `currentMesoWeek.awaitingDecision`, Today shows the line "Block complete.
Choose what's next." (`todayLineArbiter.js:64`) and the chip "Block finished.
Targets hold at recovery-week volume until you choose what comes next."
(`HomeScreen.js:1850`) — while the hero directly below offers "Start workout"
on session 1 with eyebrow "<Plan> · Day 1 of N". Three regions, two truths.

**H-1 · Raw exception text shown on check-in failure.**
`src/screens/WeeklyCheckInScreen.js:1019-1022`:
```js
appAlert('Couldn\'t save check-in', e?.message ?? 'Try again.')
```
Every other write path in the app captures `e.message` into telemetry and shows
a fixed calm line (`PlanUpdateScreen.js:79, 299`). Suggested copy:
*"Couldn't save your check-in. Nothing has been lost — try again in a moment."*

**B-2 · "No active plan yet" shown while a plan is active.**
`src/screens/HomeScreen.js:1195`: `if (routines.length === 0) { setNextWorkout(null); return; }`
leaves `activePlan` set but `nextWorkout` null, so the hero renders the
EmptyState "No active plan yet" (`:2415-2436`) for a user who has one. The
offered fix ("Start with a plan") would replace the plan they already own.
Rare, but the copy is false when it fires.

### P2

**A-1 · Onboarding step 5's two skip buttons are the same button.**
`src/screens/ProOnboardingScreen.js:2340-2358` — "Nothing in particular" and
"Later, from Settings" both call `advanceFrom5` (`:1113-1117`), which records
nothing and schedules nothing. "Later, from Settings" reads as a deferral the
app will honour; there is no reminder, no flag and no later prompt. Either
collapse to one action or make "Later" real.

**C-1 · "Your coach adjusts this plan as you progress and check in."**
`src/screens/PlansScreen.js:1307-1309`, shown to every account. In the default
autonomy mode (`collaborative`, `CoachOutputScreen.js:956`) the coach proposes
and the athlete taps Apply; nothing is adjusted on its own. Suggested:
*"Your coach reviews this plan each week and suggests changes for you to apply."*

### P3

**D-2 · Manual-mode ownership note only renders with a hero card.**
`src/screens/CoachOutputScreen.js:2901-2912` — on a "hold everything" week the
hero branch is skipped (`:2922`), so a Manual user sees rows with no Apply
pills and no line explaining why.

**B-4 · Two arbiter branches are structurally unreachable.**
`src/lib/home/todayLineArbiter.js:188-198` (`facts.safety` is `null` at the
only call site, `HomeScreen.js:2058`) and `:111-121` (`facts.firstReview` is
never supplied since the Campaign 26 retirement, `HomeScreen.js:2085-2088`).
Both are documented as reserved/retired, so this is dead code, not a lie —
listed only so the certification record is complete.

**H-2 · DebugLog renders crash text and stack traces.**
`src/screens/DebugLogScreen.js:142, 173`. Reachable in production by 7 rapid
taps on the version row (`SettingsAboutScreen.js:92-112`). Support-only,
unadvertised, and the content is the user's own device log — acceptable, but it
is the one screen where raw error text reaches a user by design.

---

## COULD NOT BE VERIFIED STATICALLY

1. **H-3** — whether `markCloudSyncError(e?.message)`
   (`Article9ConsentScreen.js:158`, `HomeScreen.js:1421`) ever surfaces that
   raw string in the sync-status UI. `src/lib/syncStatusLabel.js` was not read
   to the end of the mechanism in this pass; the store field exists and its
   render path needs one read to close.
2. Whether the Article 9 line "Anonymous measurement numbers from photo
   analysis (never the photos…) leave your phone" matches what
   `progressScanCalibrationTelemetry.js` / `…CalibrationExport.js` actually
   transmit. The modules exist and are named for exactly that; their payload
   was not opened (out of this surface's scope, but it is a consent claim and
   should be closed by someone).
3. Real device behaviour of every state above — reachability of B-2 in
   practice, and whether the B-1 week-complete state is common enough to be
   met weekly, need a device walk on a green build.
4. The "How you train" copy quoted in A/C is reproduced for context only; its
   truth against the capability engine is `02-CAPABILITY-CONCEPT.md`'s call.

---

## VERIFICATION ADDENDUM (Article 9 payload, sync error text)

Read-only follow-up closing "COULD NOT BE VERIFIED STATICALLY" items 1 and 2.

### TASK 1 — Article 9 telemetry payload

**Payload field inventory — `buildScanCalibrationRow` (`src/lib/progressScanCalibrationTelemetry.js:112-131`), sent by `submitScanCalibrationRow` (`:167-183`) to Supabase table `scan_calibration_events` (`:174`):**

| field | file:line | type | could identify a person? |
|---|---|---|---|
| `app_version` | `:113` (from `expo-constants`) | version identifier (string) | No — shared by every install of that build |
| `platform` | `:114` | enum (`'ios'`\|`'android'`) | No |
| `sex` | `:115` | enum (`'male'`\|`'female'`\|`null`) | No, alone |
| `height_band` | `:116`, band fn `:24-29` | number-range string, 5-unit band | No — coarsened by construction |
| `weight_band` | `:117`, same band fn | number-range string, 5-unit band | No — coarsened by construction |
| `score` | `:118` (`finiteNumber`) | number (0-100ish) | No |
| `band` | `:119` | enum (`leannessBandLabel`) | No |
| `confidence` | `:120` | enum (`scanConfidenceTier`) | No |
| `abstention_reasons` | `:121`, source `:77-79` | array of enum strings (fixed reason codes, e.g. `'model_unavailable'`, `'estimate_out_of_range'`, `'segmentation_low_confidence'` — confirmed fixed set in `progressScanAnalysis.js:1655-1808`, not free text) | No |
| `ratios` (`waistToShoulder`, `waistToHip`, `waistToHeight`, `bodyAreaRatio`, `frontBackWaistSpread`, `sideWaistToHeight`, `bmi`) | `:122-125`, `numbersOnly` `:47-54` | numbers (dimensionless ratios / BMI) | No — ratios, not absolute measurements; no identifier attached |
| `pose_ratios` (per-pose silhouette ratios, `RATIO_KEYS` `:41-45`) | `:81-92, 126` | numbers keyed by pose enum (`front`/`back`/`side`) | No |
| `quality` (segmentation confidence, framing/blur/lighting score, pose confidence, background separation, camera tilt degrees, component dominance, connected components, foreground threshold) | `:93-98, 127` | numbers | No — image-quality metrics, not image content |
| `engine` | `:100, 128` | enum/version string (e.g. `'fast_tflite'`, confirmed fixed constants in `progressScanVision.js:1013`) | No |
| `model_version` | `:101, 129` | version identifier string (fixed constant, e.g. `PROGRESS_SCAN_SEGMENTATION_MODEL_VERSION` = `'mediapipe_selfie_segmentation_general_builtin_ops_v2'`, `progressScanVision.js:21-22`) | No |
| `measurement_version` | `:102, 130` | version identifier string (fixed constant `'silhouette_bands_anatomical_v3'`, `progressScanVision.js:42`) | No |
| `vision_debug` | `withFounderVisionDebug` `:143-160`, source `getLastVisionDebug` (`progressScanVision.js:971-973`) | **conditionally attached object** containing `rgbBase64` (base64 256×256 RGB pixel array — model input derived directly from the user's photo) and `maskBase64` (segmentation mask), plus `engine`/`contentRect`/`inputSize` | **Yes, in principle** — `rgbBase64` is photo-derived pixel data, not a "measurement number". See verdict below on scope. |

No field in the base row is a user id, device id, account id, filename, URI, exact timestamp, photo hash, or free-text note — confirmed absent by the module's own construction (`:8` "no user id, no photo, no uri, no note, no exact timestamp"; DB defaults the row's day, not the client). `height_band`/`weight_band` are 5-unit-banded, not exact values, so they cannot be combined with an identifier to re-identify (no identifier is present to combine with).

**`vision_debug` scope check.** `withFounderVisionDebug` (`:143-160`) gates attachment on `isProgressScanCalibrationExportAllowed({ email })` (`progressScanCalibrationAccess.js:56-63`), which checks the **current signed-in user's own email** (`store.getState()?.user?.email`, `:148`) against a 3-entry SHA-256 allow-list (`progressScanCalibrationAccess.js:15-19`) — i.e. it only ever attaches image-derived pixel data to a row generated from **that same founder/allow-listed account's own scan**. It is not a channel through which one user's photo data is sent under another user's identity, and it never fires for the general user population (`isProgressScanCalibrationExportAllowed` returns `false` for every other email, `:56-63`).

**Consent-screen sentence (`Article9ConsentScreen.js:234`):**
> "Anonymous measurement numbers from photo analysis (never the photos, never your name or account) to keep scoring accurate for every body type"

**Verdict: TRUE for the general user population; OVERCLAIM as a literal universal statement because of the allow-listed `vision_debug` path.**
- For every account not on the 3-entry SHA-256 allow-list (i.e. every real user), the transmitted row exactly matches the claim: bounded numbers, enum strings, and version identifiers only — no photo, no name, no account identifier. TRUE.
- For the ≤3 founder-allow-listed accounts, the row can additionally carry `rgbBase64`/`maskBase64` — a base64-encoded, 256×256-downsampled, model-input pixel array derived directly from that account's own photo (not "the photo" file itself, but photo-derived image content, which is more than a "measurement number"). This only ever happens to the allow-listed account's own scan (self-diagnostic, founder order D83 "put it all", `:134-142`), never to another user's photo — so it is not a leak of one user's photo under cover of "anonymous," but it does mean the literal sentence "never the photos" is not accurate for those specific accounts' own data.

**Consent gating — transmission is NOT explicitly gated on the consent flag at the send site.**
- `finishProgressScanSession` (`src/lib/progressScanStore.js:282-439`, telemetry call `:423-437`) contains **no check of `healthConsent`/`healthConsentGranted`** anywhere in the function (confirmed by grep of the file — zero matches for "consent" except the pre-existing `consentVersion` column write at scan-creation, `:46, 161-166`, which is a different concern).
- `submitScanCalibrationRow` (`progressScanCalibrationTelemetry.js:167-183`) calls `getSupabaseClient()` and `c.from('scan_calibration_events').insert(row)` **directly**, bypassing the registry-driven sync layer (`src/lib/sync/transport.js`, `runner.js`) entirely. Those sync-layer modules DO gate on `healthConsent === true` (`transport.js:189-194`, `runner.js:99-111`), but this telemetry path is not routed through them, so that gate does not apply here. Per CLAUDE.md §1 ("Components NEVER query Supabase directly; everything flows through the sync layer"), this module is a direct-query exception to the stated architecture.
- The only gate in practice is **implicit**: a user cannot reach the progress-scan capture/scoring flow that produces a row at all unless they are past the un-skippable Article 9 consent screen (app-wide `RootNavigator.js:2117-2118` routes any user with `healthConsent !== true` back to the consent gate before any feature screen, progress scan included). There is no separate, feature-local, explicit consent check inside the telemetry code path itself.
- **On consent withdrawal:** per the consent screen's own copy (`Article9ConsentScreen.js:269`), "withdrawing... means closing your account and deleting your data" — Volyume has no "withdrawn but still active" state; withdrawal = account deletion, which removes the user from the app entirely, so no further scans (and no further calibration rows) can occur post-withdrawal. Rows already sent before withdrawal remain in `scan_calibration_events` — by design not deletable/traceable to the person, since the row carries no identifier to locate them by (module header `:8-11`: "the stored data is not personal data (GDPR recital 26)").

### TASK 2 — `markCloudSyncError` raw error string

| step | file:line | detail |
|---|---|---|
| Write site 1 | `src/screens/Article9ConsentScreen.js:158` | `.catch((e2) => store.getState().markCloudSyncError?.(e2?.message))` |
| Write site 2 | `src/screens/HomeScreen.js:1421` | `.catch((err) => useAppStore.getState().markCloudSyncError(err?.message))` |
| Write site 3 (not named in the brief, found in follow-up grep) | `src/navigation/RootNavigator.js:1870` | `.catch((err) => useAppStore.getState().markCloudSyncError(err?.message))` |
| Store reducer | `src/store/useAppStore.js:848-852` | `markCloudSyncError: (msg) => set(s => ({ cloudSyncStatus: 'error', cloudSyncVersion: s.cloudSyncVersion + 1, cloudSyncError: msg ?? 'Unknown error' }))` — stores the raw string verbatim in `cloudSyncError` |
| Full-repo grep for `cloudSyncError` | — | Only 3 matches outside `useAppStore.js`: none of them a render — `src/store/__tests__/accountMemoryReset.test.js:24,36` (test scaffolding only) |
| Full-repo grep for `cloudSyncStatus` | — | Only read by `useAppStore.js` itself and the same test file; **no screen or component selects `cloudSyncStatus` or `cloudSyncError` from the store anywhere** |
| Full-repo grep for `cloudSync` (catches any other casing/consumer) | — | 4 files total: `HomeScreen.js`, `PlansScreen.js`, `useAppStore.js`, the test file. `HomeScreen.js:260,442-446` and `PlansScreen.js:320-325` read **`cloudSyncVersion` only**, as a numeric re-fetch trigger (`if (cloudSyncVersion > 0 ...) refetch()`) — neither reads or renders `cloudSyncError` |
| `src/lib/syncStatusLabel.js` (full file, 57 lines) | `:36-56` `formatLastSynced(snapshot, nowMs)` | Reads `snapshot.last_run_at`, `snapshot.queue_depth`, `snapshot.failed` from the **sync runner's `getStatus()` snapshot** (a different data source entirely — not the Zustand store, not `cloudSyncError`). Header comment `:8-13` confirms this is deliberate: a prior transient red error banner was removed by founder direction; the file never references `cloudSyncError`, `msg`, or `e?.message` in any form. |

**Verdict: the raw error message string currently CANNOT be rendered to the user anywhere in the codebase.** `cloudSyncError` is written by three call sites but has zero read/render sites outside the store definition and its own unit test. `syncStatusLabel.js` — the one plausible surface — was read to its end and confirmed to never touch this field; it derives its (deliberately calm, non-alarming) text from an unrelated snapshot object. There is no quote to give for "the render" because no render exists; this is dead state, not a live leak. (Original H-3 concern — that a Postgres/PostgREST error string might reach the UI verbatim — does not materialise on the current tree.)
