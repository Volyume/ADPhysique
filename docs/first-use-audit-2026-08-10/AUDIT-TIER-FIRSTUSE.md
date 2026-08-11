# Campaign 5 — Phases 7 and 8: Free vs Pro first use, and the trial / paywall first encounter

Lane: Phases 7 (`c5-CAMPAIGN5-ORDER.txt` lines 155-165) and 8 (lines
168-175) of the founder's Campaign 5 order. Branch
`claude/campaign5-first-use`. **Audit only: this lane changed no source,
test, doc or configuration outside this file, and committed, pushed and
stashed nothing.**

**Method.** Every claim below is read from the code on this branch and
carries `file:line` evidence. Where the order asks a comprehension
question, the answer quotes the rendered copy. Free and Pro are mapped
independently (§2 and §3), then every Free surface is walked for
locked-out dead ends (§4), then both onboardings are swept for
removed-feature promises (§5), then every published Free/Pro claim is
checked against the guards that actually enforce it (§6), then the five
Phase 8 comprehension questions are answered from live copy (§7).

**Bounds respected.** No tier-scope change is proposed. Billing
architecture, product IDs, prices, trial duration, purchase/restore
behaviour and billing provider are untouched and unproposed. Where a copy
correction touches a pricing or trial claim it is marked FOUNDER-GATED
with the exact correction named and no autonomous rewrite proposed. No
cardio, no AI, no new features, no advanced first-use controls, no
migration, no redesign.

**Baseline used.** Phase 1's map
(`docs/first-use-audit-2026-08-10/CURRENT-FIRST-USE-JOURNEY.md`) is taken
as read for the ordered journey; its §3.3 finding that **the free
first-run path is an exception path, not the normal new-user path**, is
re-verified here and is load-bearing for this lane.

---

## 1. Summary of findings

| ID | Class | Severity | One-line claim |
|----|-------|----------|----------------|
| C5-P7-01 | DEFECT | HIGH | The Free-to-Pro trial claim locks the user out of the whole app: `resetFirstRun` mounts the Pro wizard on Step 1, whose auto-skip refuses to fire for any user with a hydrated profile, leaving one OAuth button and no way forward. |
| C5-P7-02 | DEFECT | HIGH | `SubscriptionPolicyScreen` advertises "Plate calculator" as a Free feature; the plate calculator is a REJECTED and deleted feature pinned dead by two test suites. |
| C5-P7-03 | DEFECT | MEDIUM | The same screen sells "An account so your data is backed up and follows you across phones" as something **Pro adds**, when an account is mandatory for everyone and cloud sync is completely ungated. |
| C5-P7-04 | DEFECT | MEDIUM | Two surfaces promise that past check-ins and last-set nutrition targets stay viewable on Free; both screens are hard `withProGuard` locks, so neither promise is honoured. |
| C5-P7-05 | DEFECT | MEDIUM | `HomeWelcomeCard` tells a Free user "Your coach learns as you train ... There is nothing to set up"; there is no tier gate and Free has no coach. |
| C5-P7-06 | DEFECT | LOW | The free-tier differential paywall names a specific lift ("Your bench hasn't moved in three weeks") for a trigger that fires on any stalled lift. |
| C5-P8-01 | FOUNDER-GATED | MEDIUM | `TierComparisonStrip` renders a hardcoded `£0` beside the store-localised Pro price, against PLAY-002's own written rule; a non-UK user sees "£0" next to "$4.99". |
| C5-P8-02 | FOUNDER-GATED | MEDIUM | No first-use surface ever names the trial end date, and the only days-remaining readout is four taps deep; a user who declines notifications gets no warning before the trial ends. |
| C5-P8-03 | FOUNDER-GATED | MEDIUM | "Your store adds a further 7 days free" is true only if the 7-day intro offers exist in both store consoles, which the repo does not own (H4-adjacent release truth). |
| C5-P8-04 | FOUNDER-GATED | LOW | Settings > Account > "Switch to Free" writes tier locally only: no store cancellation, and the next cloud tier refresh restores Pro. |
| C5-P7-07 | FOUNDER-GATED | MEDIUM | The wellbeing (SCOFF) check's only entry point in the entire app sits inside `YouScreen`'s `isPro` branch, so a Free user can never take or update it. |
| C5-P7-08 | IMPROVEMENT | MEDIUM | For a Free user the fifth primary tab is labelled "Coach" and contains a Pro pitch card plus a Pro-locked Partners row, and nothing else. |
| C5-P7-09 | IMPROVEMENT | MEDIUM | Four surfaces publish four different definitions of "what stays free" (4, 5, 3 and 11 items), and only the longest one is wrong. |
| C5-P7-10 | IMPROVEMENT | LOW | A Free user is never told which tier they are on during first use; the tier is learned only by hitting a lock. |
| C5-P8-05 | IMPROVEMENT | LOW | `ProUpgradeScreen`'s no-account branch is unreachable (the route only exists inside signed-in tab stacks) and its copy implies the account itself is a Pro feature. |
| C5-P7-11 | IMPROVEMENT | LOW | The free weekly one-liner's weight sentence can never fire for a never-Pro user, because morning-weight logging is Pro-gated. |
| C5-P7-C1 | CLEAN | - | No removed-cardio promise survives in either onboarding; the one live "cardio" string is an honest physiological line that explicitly points outside the app. |
| C5-P7-C2 | CLEAN | - | Free receives a real product on day 0: starter plan, a genuine 6-week block with a recovery week, logging, PRs, progress, 31 plans, 551 exercises, CSV export, reminders. |
| C5-P7-C3 | CLEAN | - | No dead Pro route: every Pro lock reached from a Free surface renders a working `ProLocked` with an upgrade path, a "Not now" that always lands somewhere, and a restore action. |
| C5-P8-C4 | CLEAN | - | The card question is answered honestly and twice, and the in-app trial architecture in code matches the locked 14 + 7 shape exactly. |
| C5-P8-C5 | CLEAN | - | No hardcoded price on any paywall surface except C5-P8-01's `£0`; every figure comes from the store with a price-free fallback, and the review-excerpt block ships dark. |
| C5-P8-C6 | CLEAN | - | The monetisation surfaces are ED-safe: distress triggers were removed, the differential banner fails CLOSED on a flag or wellbeing read error, and the trial banner drops weight language under an open flag. |

Counts: **6 DEFECT, 5 FOUNDER-GATED, 5 IMPROVEMENT, 6 CLEAN.**

---

## 2. PHASE 7 — the FREE first-use journey, mapped independently

### 2.1 How a user ends up on it

`RootNavigator.js:1598-1600`:
`if (!firstRunComplete) return tier === 'pro' ? <ProOnboardingStack /> : <FirstRunStack />;`

`tier` is set to `'pro'` inside the Article 9 handler
(`Article9ConsentScreen.js:135-147` awaiting `cascade.startCascade()`,
which mirrors the trial into the store at `cascade.js:125-132`). So the
Free first run is reached only when:

- `start_cascade` failed (offline, RPC error, no Supabase client:
  `cascade.js:43-48`), or
- the account's one trial entitlement is already spent
  (`proGate.js:47-52` maps `free` / `cascade_expired` / `unstarted` to
  `'free'`) while `first_run_complete` is false.

The server default is `trial_state = 'unstarted'`
(`supabase/migrate_030_tier_infrastructure.sql:32`), and
`canStillTrial` reads exactly that value (`cascade.js:469-472`), which
matters for C5-P7-01.

### 2.2 What the Free user is asked

Two screens, four inputs, no permission prompt, no unit question:

| Step | Screen | Ask | Blocking |
|---|---|---|---|
| 1 | `FirstRunScreen.js:63-111` | first name | yes (`:38,:96`) |
| 2 | `freeStarter.js:26-33` | "What do you want from training?" | one tap |
| 3 | `freeStarter.js:34-42` | "Where will you train?" | one tap |
| 4 | `freeStarter.js:43-51` | "How many days a week can you train?" | one tap |
| 5 | `FreeStarterScreen.js:190-240` | Start with this plan / Skip | no |

Gym units are hardcoded `'kg'` with no question
(`FirstRunScreen.js:34`). "Skip, I'll choose myself" is present on every
step and completes first run with no plan.

### 2.3 What the Free user RECEIVES immediately (verified, not claimed)

On tapping "Start with this plan" (`FreeStarterScreen.js:113-121`):

1. A real plan copied into their account (`copyPlanFromLibrary`,
   `database.js:3812`).
2. **A genuine training block**, not a stub: `activatePlanWithBlock`
   writes a mesocycle with `duration_weeks 6`, `planned_weeks 6`,
   `deload_week 6` and the RIR ladder `[3,2,1,0,0,4]`
   (`database.js`, `activatePlanWithBlock`), then
   `generateMesocycleWeeks`. So Welcome's "Training blocks ... stay
   free" (`WelcomeScreen.js:37`) is TRUE, and the Free user gets a
   recovery week in week 6 like anyone else. Block advice on
   `PlansScreen.js:615-830` reads no tier.
3. Home answers "what do I do today" with the session hero; the no-plan
   branch is a real `EmptyState` with two working CTAs plus a blank-session
   escape hatch (`HomeScreen.js:1949-2023`).
4. Free-visible product surfaces confirmed ungated: full workout logger
   and history, `ManualBuilder`, `PlanLibrary`, `PlanDetail`,
   `RoutineDetail`, `ExerciseDetail`, `MesocycleBuilder`
   (`RootNavigator.js:461-478`), `Analytics`, `Consistency`,
   `LiftProgress`, `WorkoutHistory`, `VolumeHeatmap`, `YearOfLifts` /
   `RecapStory` (`:481-499`), Settings, notifications, display,
   `SettingsData` including **CSV export**
   (`SettingsDataScreen.js:315-320`, no tier check) and cloud sync
   (`:258-264`, no tier check).
5. Library sizes behind the published claims: **551** canonical exercise
   entries (`seedExercises.js:580` `RAW`) and **31** library plans
   (`seedRoutines.js:33` `LIBRARY_PLANS`, 31 top-level objects). Both
   published figures ("400+", "31") are therefore true or conservative.

### 2.4 What the Free user is never told

Nothing in the Free first run states the tier, the existence of Pro, or
(for the C5-P1-02 population) that the 14 days they tapped for on Welcome
did not start. Greps over `FirstRunScreen.js`, `freeStarter.js` and
`FreeStarterScreen.js` return no occurrence of "Pro", "trial", "free
plan" or "upgrade". The first mention of tier a Free user meets is a lock
(§4). Recorded as C5-P7-10.

---

## 3. PHASE 7 — the PRO first-use journey, mapped independently

### 3.1 What Pro actually requires before the product opens

Steps 2 to 6 of `ProOnboardingScreen.js`, then a hand-off screen. The
blocking set, read from the `advanceFrom*` predicates:

| Step | Screen | Blocking inputs | Evidence |
|---|---|---|---|
| 2 | Baseline | first name, biological sex, age, height, body weight | `:650-689` |
| 3 | Body composition | none (Continue always enabled) | `:696-699` |
| 4 | Training week | experience, equipment | `:701-711` |
| 5 | Targets | none (phase pre-set) | `:713-727` |
| 6 | Check-in rhythm | recovery rating | `:786` |

Plus one OS notification prompt (`:840`), written-before-prompt so a
denial cannot discard the chosen day (`:825-839`), and a staged build
sequence that ends in `generateAndSavePlan`.

**Eight blocking answers. Every one of them is consumed before the
product opens**: sex, age, height and weight drive BMR and the ED calorie
floors; experience, equipment, days and recovery drive plan generation;
phase drives the calorie direction. No first-use input is asked "for
later".

### 3.2 What Pro receives immediately

`ProSetupCompleteScreen.js:229-536` hands over four things that already
exist at that moment: the weigh-in habit, a live calorie ring with macro
bars from `calculateNutritionTargets`, the generated split with its "Why
this plan, for you" rationale, and the dated first check-in.

### 3.3 What Pro CANNOT have yet, and how long it takes

The first coaching decision is gated, not instant:
`FIRST_CHECKIN_MIN_DAYS = 5` and `MIN_WEIGH_INS = 3` in the trailing 7
days (`trialActivation.js:23-24`, enforced at
`WeeklyCheckInScreen.js:388-393,551`). `firstReviewUnlockDate`
(`trialActivation.js:64-79`) lands the first review on the user's chosen
weekday at day 5 to 11. Against a 14-day trial that is **at most two
coaching decisions inside the trial, commonly one**. This is the single
most important number for Phase 8 and it is stated honestly on the
hand-off screen ("Your first weekly check-in opens on {date}",
`ProSetupCompleteScreen.js:485-489`).

Pro features that still need a separate user action after onboarding, none
of which is asked for during it: progress photos (capture), partner
(invite), dietary needs / allergens (`SettingsDietary`, never surfaced in
the wizard), per-day targets, meal plan (offered as one optional tap,
`ProSetupCompleteScreen.js:378-392`).

---

## 4. PHASE 7 — walking every Free surface for locked-out dead ends

The order's test is "do not make Free feel like a broken Pro demo". Walked
tab by tab, for a Free user with a starter plan and zero history.

| Surface | What a Free user meets | Dead end? |
|---|---|---|
| Tab bar | All five tabs always render; `VolyumeTabBar` reads no tier (grep: no `tier` in the file) | No, but see Nutrition and Coach below |
| Today (Home) | Session hero, welcome card, no-plan `EmptyState`, blank-session link. TodayStrip weigh-in card is Pro-only (`HomeScreen.js:1811`), coach runway Pro-only (`:2032`), Pro teaser only after 3+ sessions (`:2036`) | No |
| Train (Plans) | Active plan card, block card, library, builder, folders, archive. Only "Review with coach" routes to the paywall, and D94 already fixed "Build a new plan" to route to the free library (`PlansScreen.js:826-838`) | No |
| **Nutrition (Diary)** | `withReadOnlyProGuard(DiaryScreen, 'Nutrition', hasAnyFoodEntries)` (`RootNavigator.js:238`). A new Free user has no food entries, so the **tab root itself is a full-screen `ProLocked`** | Not a dead end (the show-then-sell teaser renders, `ProGate.js:178,228-238`, "Not now" falls back to `HomeTab` at `:253-254`), but the entire tab is a lock |
| Progress | Free: insights, recent sessions, weekly volume strip, lifetime totals, Consistency, Lifts, Full History, Recaps, Year of Lifts, VolumeHeatmap. Locked: Partners and Progress photos in the promoted slot right under the insight stack (`AnalyticsScreen.js:641-661`) plus Body Metrics in the grid (`:807`) | No |
| **Coach (Profile)** | Profile card, one Pro pitch card ("Coach is available on Pro", `YouScreen.js:419-450`), a Pro-locked Partners row (`:549`), Settings gear. The "This week", "Setup" and "Safety checks" sections are all inside `isPro` (`:452,:506,:554`) | No dead end, but the tab named "Coach" contains no Free content. C5-P7-08 |
| Settings | Nutrition targets, Per-day targets, Dietary needs and Coaching reminders rows are hidden for Free (`SettingsScreen.js:59-100`), which is honest hiding rather than teasing. Coaching (including calmer coaching) stays tier-blind (`:42-47`, `SettingsCoachingScreen.js:73-78`) | No |

**Verdict on "no dead Pro route".** Every Pro route reachable from a Free
surface renders `ProLocked` with a per-feature benefit line
(`ProGate.js:26-48`), an upgrade CTA, a "Not now" that always lands
somewhere, and a Play-required restore. Deep links cannot bypass a guard
(`RootNavigator.js` linking comment, guards are components not routes).
Recorded CLEAN as C5-P7-C3.

**Verdict on "broken Pro demo".** Free is a real product (§2.3), but two
of the five primary tabs are effectively Pro real estate for a Free user:
Nutrition is a lock at the root, and Coach carries only an upsell.
Recorded as C5-P7-08, not proposed as an IA change (redesign is out of
bounds); the lead ruling is whether the existing free-safe content that
already exists elsewhere should reach that tab, or whether nothing should
change.

---

## 5. PHASE 7 — removed-feature sweep across both onboardings

Method: grep, then read every hit in context (the order's requirement).

- `grep -rni "cardio" src/screens src/components` returns **11 hits, all
  comments except one**. The comments are historical notes
  (`AnalyticsScreen.js:748-750`, `HomeScreen.js:1809`,
  `TodayStrip.js:6`, `WeeklyCheckInScreen.js:745-747`,
  `WorkoutSummaryScreen.js:714,1660`, `WorkoutHistoryScreen.js:102,1204`).
- The single live user-facing string is
  `NutritionEducationScreen.js:53-56`: "Cardio and steps are part of that
  maintenance number already, whether or not you track them elsewhere."
  followed by "Other apps add exercise calories back on top. Volyume never
  does." Read in full, this is a physiological explanation that explicitly
  places cardio tracking **outside** the app ("elsewhere") and is the
  honest justification for not adding exercise calories back. It promises
  no cardio feature. This screen is registered inside `ProOnboardingStack`
  (`RootNavigator.js:721`) and linked from the hand-off screen, so it IS a
  Pro-onboarding surface; it passes.
- Pro onboarding copy extracted and read (`ProOnboardingScreen.js:53-186`,
  `:1109-1120`, `:1169-1176`, `:1395-1403`, `:1468-1514`, `:1590-1625`,
  `:1795-1820`): no cardio, no steps, no wearables, no held feature. The
  one forward-looking line, "Progress Photos can refine physique change
  later with your Volyume Score" (`:1403`), names a live Pro feature
  (`RootNavigator.js:220`, `progressPhotos.js`).
- Free onboarding copy read in full (`FirstRunScreen.js:20-111`,
  `freeStarter.js:24-52`, `FreeStarterScreen.js:160-240`): no removed
  feature, no Pro promise, no false personalisation.
- Paywall surfaces (`ProUpgradeScreen.js:30-62`,
  `TierComparisonStrip.js:31-35`, `SubscriptionPolicyScreen.js:40-134`,
  `CascadeGateScreen.js:90-137`): no cardio. `SubscriptionPolicyScreen`
  does name one removed feature, but it is the plate calculator, not
  cardio. See C5-P7-02.

Recorded CLEAN as C5-P7-C1, with the plate-calculator exception raised
separately.

---

## 6. PHASE 7 — every published Free/Pro claim against the code that enforces it

### 6.1 "What stays free", checked line by line

`SubscriptionPolicyScreen.js:40-63`:

| Claim | Verdict | Evidence |
|---|---|---|
| "Full workout logger with rest timer, beeps and haptics." | TRUE | `ActiveWorkoutScreen` ungated (`RootNavigator.js:439`); rest alerts live in `SettingsWorkout`, ungated (`SettingsScreen.js:53-58`) |
| "400+ exercise library with form notes." | TRUE | 551 entries, `seedExercises.js:580` |
| "31 ready-made plans you can pick from." | TRUE | 31 objects in `LIBRARY_PLANS`, `seedRoutines.js:33` |
| "Create your own routines from scratch." | TRUE | `ManualBuilder` ungated, `RootNavigator.js:466` |
| "Workout history kept on your phone." | TRUE | `WorkoutHistory` ungated, `:459,:483` |
| "Personal records and strength standing." | TRUE | `LiftProgressScreen.js:24,32` and `AthleteProfileScreen`, both ungated |
| "Weekly muscle-group volume targets." | TRUE | `VolumeHeatmap` ungated (`:484`), reached from the Analytics volume strip (`AnalyticsScreen.js:743`) |
| "Year of Lifts: a shareable review of your training year." | TRUE | `:493-494`, ungated; the tile appears once a year of history exists (`AnalyticsScreen.js:843-857`) |
| **"Plate calculator."** | **FALSE** | The feature is deleted and pinned dead: `campaign4.boundaries.test.js:120` "the plate calculator stays deleted (D14/D57)" and `gymBasics.guard.test.js:94-95`. `docs/SUBMISSION_CHECKLIST.md:156-158` records it as "a REJECTED feature (D14/D57, never to be...)". No implementation exists anywhere in `src/`. **C5-P7-02** |
| "Training reminders." | TRUE | `NotificationSettingsScreen.js:555` "Section 3, Training reminders (available to all tiers)" |
| "Export your training history to CSV anytime." | TRUE | `SettingsDataScreen.js:315-320`, no tier check |
| "The core logbook is free on every account, **and your training data stays on your phone**." | MISLEADING | Cloud sync is ungated for Free (`SettingsDataScreen.js:258-264`; no tier read anywhere in `src/lib/sync/`). Paired with the Pro bullet below it implies Free is device-only. **C5-P7-03** |

### 6.2 "What Pro adds", checked line by line

`SubscriptionPolicyScreen.js:65-80`: coach decisions, personalised
calorie and protein targets, weekly check-ins with reasons, nutrition
guidance, body measurements, morning weight log. All six are genuine Pro
gates (`RootNavigator.js:207-249`). The seventh is not:

| Claim | Verdict | Evidence |
|---|---|---|
| "An account so your data is backed up and follows you across phones." | **FALSE as a Pro addition** | An account is mandatory for every user (no anonymous mode, `docs/IDENTITY_AND_OWNERSHIP_LOCKED.md`, `LoginScreen.js:284-285`), and sync is ungated. The screen's own C7 note at `:45-48` already corrected a sibling contradiction ("'no account needed' contradicted the identity rule"); this bullet is the mirror image of that error. **C5-P7-03** |

### 6.3 "If you switch from Pro back to Free", checked against the guards

`SubscriptionPolicyScreen.js:82-101`. The founder's E10 read-only lapse
decision (2026-07-02) covers exactly three screens: Body metrics,
Progress photos and Diary (`RootNavigator.js:213-238`,
`withReadOnlyProGuard`). Everything else is a hard lock. So:

| Claim | Verdict | Evidence |
|---|---|---|
| "Past coaching write-ups stay readable in your history." | TRUE | `CoachHeldHistoryScreen` is registered ungated (`RootNavigator.js:550`) and surfaced to Free when history exists (`YouScreen.js:492-503`) |
| **"Past check-ins stay viewable; you just can't run new ones."** | **FALSE** | `WeeklyCheckIn` is `withProGuard` (`RootNavigator.js:207`), a full lock regardless of history. Its only two entry points are `YouScreen.js:469` (inside `isPro`) and `CoachHeldHistoryScreen.js:204`, which for a Free user lands on `ProLocked`. No other surface reads `weekly_checkins` for display (grep over `src/screens`, `src/components`). **C5-P7-04** |
| "Plans you built on Pro stay viewable; you can re-use them." | TRUE | `PlansScreen` and `PlanDetail` ungated |
| **"Nutrition targets last set on Pro stay visible; they just won't auto-update."** | **FALSE** | `NutritionTargets` is `withProGuard` (`RootNavigator.js:208`), its Settings row is hidden for Free (`SettingsScreen.js:59-66`), and every other entry point (`YouScreen.js:519`, `CoachOutputScreen.js:2389`, `WeeklyCheckInScreen.js:1050`, `PerDayTargetsScreen.js:131`) is itself Pro-gated. **C5-P7-04** |
| "Body measurements you've logged stay there; only new entries pause." | TRUE | `withReadOnlyProGuard(BodyMetrics, ..., getBodyMetricLog)` (`RootNavigator.js:218`) |

The same unhonoured check-in promise is repeated in the downgrade confirm
alert: "Past coach decisions, **check-ins**, training blocks and PRs
remain readable" (`SettingsAccountScreen.js:49`).

### 6.4 The four different "what stays free" lists

| Surface | Items | Content |
|---|---|---|
| Welcome | 4 | logging; exercise library + PRs; plan library + own plans; **training blocks** + progress stats (`WelcomeScreen.js:33-38`) |
| ProUpgrade FAQ | 5 | logging; own plans; exercise library; PRs; progress stats. **No plan library, no blocks** (`ProUpgradeScreen.js:51-53`) |
| TierComparisonStrip | 3 | Workout logging; Create your own plans; Progress stats (`TierComparisonStrip.js:31-35`) |
| SubscriptionPolicy | 11 | §6.1, one of them false |

Plus the paywall headline "Free keeps your training log. Pro reads it like
a coach" (`ProUpgradeScreen.js:478-480`), which reduces Free to a
logbook. A user comparing two of these surfaces gets two different
answers to the order's Phase 8 question "what does Free include".
Recorded as C5-P7-09.

---

## 7. PHASE 8 — trial and paywall comprehension, answered from the live copy

The order asks whether the user can answer five questions. Each is
answered below **only** from copy that a first-use user actually reaches.

### Q1. What does Free include?
**Partly.** Welcome's second card is unambiguous and well placed: "What
stays free / If you don't subscribe after the trial, these stay"
(`WelcomeScreen.js:137-138`) over four concrete bullets. The problem is
consistency, not presence: see §6.4 (C5-P7-09) and the false and
misleading bullets in §6.1 to §6.3 (C5-P7-02, C5-P7-03).

### Q2. What does Pro add?
**Yes.** Four perk lines on the paywall (`ProUpgradeScreen.js:30-35`), a
per-feature benefit line on every lock (`ProGate.js:26-48`, keyed to the
exact `feature` label the guard passes), and a three-row side-by-side
strip. All name shipped, Pro-gated capabilities. The one over-claim is the
account bullet on the policy screen (C5-P7-03).

### Q3. Does the trial need a card?
**Yes, answered twice and correctly.** Welcome: "No payment card needed.
Afterwards it's {price} a month on {store}, or carry on free."
(`WelcomeScreen.js:116-120`). Paywall FAQ: "No payment card needed. New
accounts get full Pro free for 14 days (one trial per account)"
(`ProUpgradeScreen.js:55-57`). Both match the code: the in-app trial is a
`start_cascade` RPC with no billing call
(`Article9ConsentScreen.js:135-147`, `cascade.js:105-166`).

### Q4. What happens after the trial?
**Weakly.** Three statements exist:
- Welcome, before sign-up: "or carry on free" (`WelcomeScreen.js:118`).
- The hand-off screen, once: "Your full access runs for 14 days. If you
  decide not to continue after that, your training log, plans and personal
  bests stay free forever." (`ProSetupCompleteScreen.js:501-505`).
- The day-14 gate itself: "Your Pro trial is winding down / Pro keeps the
  weekly coaching and the food log. Free keeps your data and safety
  checks, but some features become view-only."
  (`CascadeGateScreen.js:111-121`).

What is missing is **when**. No surface names the trial end date. The
`daysRemaining` helper exists (`cascade.js:479-493`) but its only readout
is `SubscriptionScreen.js:151-154`, four taps deep (Coach > gear >
Account > Subscription). The two pre-expiry warnings are push
notifications (`scheduler.js:490-497`, day 12 and day 14) that require a
permission the user may have denied at wizard step 6; when denied, the
only remaining surface is the **post**-expiry gate presented once at Home
(`HomeScreen.js:229-260`, gated on `trial_state === 'cascade_expired'`).
Contrast the app's own kept-promise rule for the first check-in, which
names an exact date (`ProSetupCompleteScreen.js:485-489`,
`trialActivation.js:50-79`). Recorded as C5-P8-02, FOUNDER-GATED because
any fix states a trial claim.

### Q5. What survives a return to Free?
**Stated well, enforced incompletely.** The FAQ answer is good and calm
("Everything you logged is saved, and will be exactly as you left it if
you come back", `ProUpgradeScreen.js:43-44`) and the policy screen
devotes a whole section to it. Two of its five bullets are not honoured by
the guards (C5-P7-04), and the "view-only" framing used at the day-14
gate is true for exactly three screens.

### 7.1 The trial-start moment is invisible
The 14-day clock starts on the **Continue** button of a legal consent
screen. `Article9ConsentScreen.js:181-303` renders no word about the
trial: not "your 14 days start now", not a date, nothing; `startCascade`
is fired at `:135-147` after consent is recorded. Between Welcome ("Start
your 14 days") and the hand-off screen the user passes through the account
wall, the consent gate and five wizard steps with no confirmation that the
thing they tapped for has begun. Folded into C5-P8-02.

### 7.2 Trial architecture in code vs the locked doc
`docs/SUBSCRIPTION_AND_PAYMENT_LOCKED.md:10-36` locks "14 cardless days in
the app" plus a "7-day store intro free trial", net 21. The code matches:
`TRIAL_LENGTH_DAYS = 14` (`trialActivation.js:18`), `TRIAL_MS = 14 *
86400000` (`CascadeGateScreen.js:55`), catalogue comment "The 7-day intro
free-trial offer is configured per product in each store, not here"
(`catalogue.js:11-14`), and `DifferentialBadge.js:53-62` records the
earlier 7-vs-14 contradiction as already fixed. Recorded CLEAN as
C5-P8-C4, with the console dependency raised as C5-P8-03.

---

## 8. Findings in detail

### C5-P7-01 — DEFECT (HIGH). Claiming the trial from Free locks the user out of the entire app.

**Mechanism, verified end to end.**

1. A Free user with an unspent entitlement opens the paywall and taps
   "Start your free trial" (`ProUpgradeScreen.js:542-553`, label chosen by
   `canTrial`, `:85`).
2. `completeUpgrade` takes the `canStillTrial` branch, awaits
   `startCascade`, confirms a live `trial_state`, then calls
   `resetFirstRun()` (`ProUpgradeScreen.js:245-291`).
3. `resetFirstRun` sets `firstRunComplete: false`
   (`useAppStore.js`, `resetFirstRun`), so
   `RootNavigator.js:1598-1600` mounts `ProOnboardingStack` (tier is now
   `'pro'`).
4. The wizard mounts at `step = 1` and its auto-skip effect
   (`ProOnboardingScreen.js:462-483`) runs:

```js
if (proOnboardingAccountCreated) { setAccountCreated(true); setStep(2); return; }
// Otherwise an existing account is being restored and the
// navigator is about to send the user to MainTabs.
if (userProfile) return;          // ProOnboardingScreen.js:479
```

   `proOnboardingAccountCreated` is `false`: it is written in exactly one
   place, `ProOnboardingScreen.js:619` inside the wizard's own OAuth
   handler, and it is reset to `false` by `completeFirstRun`
   (`useAppStore.js:1140`) which this user already ran on the Free path.
   `userProfile` is non-null: `Article9ConsentScreen.js:74` upserts a
   `users_profile` row for every user, and the Free path also writes a
   local profile (`FirstRunScreen.js`, `saveLocalProfile`). So the effect
   returns and the step stays 1.
5. No draft rescues them: drafts are only written from step 2 onwards
   (`ProOnboardingScreen.js:545-560`), and this user has never been in the
   wizard.
6. Step 1 renders "Set up your Pro account safely" whose only control is
   `OAuthButtons` (`ProOnboardingScreen.js:1102-1139`); the email and
   password path was removed from this step on 2026-07-01 (`:1118-1122`).
   `OAuthButtons` shows **Apple on iOS only and Google on Android only**
   (`OAuthButtons.js:40,73-88`). There is no Continue, no back, no skip,
   and MainTabs is not mounted, so the whole app is behind this screen.

**Concrete user scenario.** An Android user signs up with email and
password on a train with no signal. `start_cascade` fails at consent
(`cascade.js:43-48` returns `no_client`; `Article9ConsentScreen.js:135-147`
tolerates it), so they land on the Free path, name themselves, pick a
starter plan and train for a fortnight. Their `trial_state` is still the
schema default `'unstarted'`
(`migrate_030_tier_infrastructure.sql:32`), so `canStillTrial` is true.
They tap Settings > Account > Go Pro > "Start your free trial". The RPC
succeeds, the 14-day clock starts server-side, the app switches to the Pro
wizard, and they are looking at "Set up your Pro account safely" with a
single "Continue with Google" button. Tapping it authenticates a different
identity and triggers the cross-account modal
(`RootNavigator.js:1252-1260`). Killing the app returns to the same
screen because `firstRunComplete` is persisted false. Their trial burns
down while they cannot reach the product at all.

**Population.** Exactly the users Phase 1 flagged in C5-P1-02, the ones
whose trial grant failed. Phase 1 noted their trial "is recovered only if
the user later finds the upgrade screen"; this lane finds that the
recovery route is itself broken. Google and Apple users can escape with
one confusing tap that happens to re-auth the same identity
(`handleOAuthOnboarding` sets the flag at `:619`); email and password
users on Android cannot.

**Proposed minimal fix** (implementation is another lane's, after a D96
ruling): make the auto-skip trust the session rather than the profile, i.e.
treat any authenticated non-local user at step 1 as account-complete, or
persist `proOnboardingAccountCreated` per uid. This is the same one-line
class of fix Phase 1 proposed for C5-P1-01; this lane's contribution is
that it is not only an interruption edge case, it sits on the
Free-to-Pro conversion path, so it should be ruled at that severity. No
gating change, no new screen, no dependency, no billing change.

**Law / phase.** Order Phase 7 "no dead Pro route" and Phase 40's FREE
pin "Free can complete core training journey; no dead Pro route"; second
first-use law (never re-ask what is already done).

### C5-P7-02 — DEFECT (HIGH). The Free tier is sold a deleted feature.

`SubscriptionPolicyScreen.js:60` renders `<Bullet>Plate calculator.</Bullet>`
inside the "What stays free" section. The plate calculator is a REJECTED
feature: `src/__tests__/campaign4.boundaries.test.js:119-121` pins
`lib/plateMath.js` deleted under "REVERTED / REJECTED surfaces stay
gone (D14/D57)", `src/__tests__/gymBasics.guard.test.js:94-95` pins the
string out of the active logger, `useAppStore.js:1898-1899` records "the
plate calculator never reappears", and `warmupRamp.js:50` documents the
salvage of the one function that survived deletion. No implementation
exists in `src/`.

**Scenario.** A user on the paywall taps "What stays if you switch back to
Free later" (`ProUpgradeScreen.js:617-626`), reads that a plate
calculator is part of the free tier, subscribes or stays, and can never
find it. It is a false feature claim on the screen the paywall itself
nominates as the honest answer.

**Exact correction.** Delete the single bullet at
`SubscriptionPolicyScreen.js:60`. Nothing else on the screen depends on
it, and no test pins it (`shareCopyPolish.guard.test.js` reads this file
but asserts only share-CTA strings). No price, product ID, trial length,
purchase or restore path is touched. Because the screen is billing-adjacent
copy, the deletion should be recorded as a D96 ruling rather than made
autonomously by an audit lane.

### C5-P7-03 — DEFECT (MEDIUM). The account is sold as a Pro feature.

`SubscriptionPolicyScreen.js:79` lists "An account so your data is backed
up and follows you across phones" under "What Pro adds", and `:50` tells
the Free reader "your training data stays on your phone". Both are wrong
in the same direction. Accounts are mandatory for everyone (no anonymous
mode; the only entries are Apple, Google or email and password,
`LoginScreen.js:159-289`), and sync is entirely tier-blind: the registry
runner and transport read no tier (grep over `src/lib/sync/` returns only
the unrelated `tier_history` table name at `registry.js:143`), and the
"Cloud sync" row in Settings has no tier check
(`SettingsDataScreen.js:258-264`).

This screen has already been corrected once for the mirror-image error:
its own comment at `:45-48` records that "'no account needed' contradicted
the identity rule". The same reasoning applies here.

**Exact correction (FOUNDER-GATED, tier copy).** Either drop the bullet, or
restate it as the Pro-specific truth it is trying to convey (Pro-created
coaching content syncing across devices). Do not change what Free receives.

### C5-P7-04 — DEFECT (MEDIUM). Two downgrade promises the guards do not keep.

Evidence in §6.3. "Past check-ins stay viewable"
(`SubscriptionPolicyScreen.js:97`, repeated at
`SettingsAccountScreen.js:49`) and "Nutrition targets last set on Pro stay
visible" (`SubscriptionPolicyScreen.js:99`) are both contradicted by
`withProGuard` on `WeeklyCheckIn` and `NutritionTargets`
(`RootNavigator.js:207-208`).

**Scenario.** A user reads the downgrade policy before deciding not to
subscribe, drops to Free at day 14, then goes looking for the check-in
they filled in during the trial and the calorie target they were eating
to. Both are gone behind the same lock, with no view-only state, on the
day they are most likely to feel the product took something back.

**Two routes to truth, both FOUNDER-GATED:**
(a) extend `withReadOnlyProGuard` to those two screens, matching the
founder's own 2026-07-02 "view yes, log no" decision that already covers
Body metrics, Progress photos and Diary. That is a tier-scope change, so
it is the founder's call and this lane does not propose it.
(b) correct the copy on both surfaces to name only what is genuinely
readable (past coaching write-ups, plans, body measurements, photos, food
diary). That is billing-adjacent copy, so it is also the founder's call.
Recommendation deliberately withheld; the evidence is the deliverable.

### C5-P7-05 — DEFECT (MEDIUM). A Free user is promised a coach on day 0.

`HomeWelcomeCard.js:59-61` renders step 2 as "Your coach learns as you
train / Every session you log sharpens your plan. There is nothing to set
up." Its gate is `HomeScreen.js:1832`:

```js
{!initialLoading && totalSessions === 0 && !welcomeDismissed && activePlan && nextWorkout && (
```

with **no tier check**. Weekly coaching, adaptive plan updates and the
coach output are Pro (`RootNavigator.js:207-249`), and the Free weekly
line is a read-only sentence with no plan effect
(`coachResponse.js:520-575`). So the very first orientation card a Free
user sees promises a capability their tier does not have, and their Coach
tab then tells them "Coach is available on Pro" (`YouScreen.js:441`).

This confirms and extends Phase 1's C5-P1-08. In first-use terms it is
also the third law's territory: it states a future personalisation the
tier will never deliver.

**Proposed minimal fix** (lead ruling): tier-gate the second step, or
reword it to something true for both tiers. Copy only, no gating change.

### C5-P7-06 — DEFECT (LOW, outside the first-use window). A named lift the engine did not name.

`differentialPaywall.js:50` and `:65`: "Your bench hasn't moved in three
weeks." The `stalled_lift` context fires on
`weeksLiftStalled >= 3` for **any** lift
(`differentialPaywall.js:176-178`), and the caller passes a plateau count
with no lift identity (`HomeScreen.js:826,858-862`). A user whose stalled
lift is a squat is told a fact about a bench they may never have pressed.

Cannot fire in first use: the detector needs three weekly check-ins
(`:128-138`) and `getRecentCheckins` is empty for a never-Pro user, since
check-ins are Pro. It therefore only reaches lapsed users. Handed to Phase
31 (Free first month) rather than proposed here. Any fix is copy that must
stay inside the locked-copy contract at `:40-48`.

### C5-P8-01 — FOUNDER-GATED (MEDIUM). A hardcoded currency on a price row.

`TierComparisonStrip.js:59` renders `<Text ...>£0</Text>` for the Free
column while the Pro column beside it renders the store's localised price
(`:83`, `priceFor('pro', pricingWindow) ?? '…'`). The repo's own PLAY-002
rule forbids exactly this: "Do not wire priceText back into a screen as a
fallback: it would show the wrong currency and amount to a non-UK user"
(`catalogue.js:19-24`). The strip renders on both revenue surfaces
(`ProUpgradeScreen.js:518`, `SubscriptionScreen.js:165`).

**Scenario.** A user in Ireland or the US opens the paywall and sees
"Free £0" next to "Pro $4.99 per month", which reads as a currency the app
does not charge in and undermines the price it does.

**Exact correction needed.** Render the Free column's price without a
hardcoded currency symbol (for example the word "Free", or a zero derived
from the same store-price formatter), leaving the Pro column and every
purchase path untouched. FOUNDER-GATED: it is a price-display change on a
locked billing surface, so this lane names the correction and proposes no
edit.

### C5-P8-02 — FOUNDER-GATED (MEDIUM). The trial has no visible clock.

Evidence in §7.4 and §7.1. Three facts together:
1. The trial starts silently on a consent screen that never mentions it
   (`Article9ConsentScreen.js:181-303`, `:135-147`).
2. No surface names the end date; the only days-remaining readout is
   `SubscriptionScreen.js:151-154`, four taps deep, and it prints a count,
   not a date.
3. The two pre-expiry warnings are pushes
   (`scheduler.js:490-497`) that need a permission requested once at
   `ProOnboardingScreen.js:840`; if denied, `ProSetupCompleteScreen.js`
   shows "Reminders off" (`:275-283`) and the user's next trial signal is
   the **post**-expiry gate at `HomeScreen.js:229-260`.

**Scenario.** A Pro-trial user declines the notification prompt during
setup, trains for a fortnight, and discovers the trial ended only when a
modal tells them they are back on Free. Nothing they saw in the app ever
said which day that would be.

**Exact correction needed (do not execute autonomously).** Any of: name
the end date on the hand-off screen beside the existing 14-day sentence
(the app already has the date arithmetic, `trialStartFromEndsAt` and
`daysRemaining`, `trialActivation.js:29-33`, `cascade.js:479-493`);
surface days remaining on an existing first-use surface rather than a new
one; or accept the current shape. All three are trial claims, which the
order locks (lines 169-175). Recommendation withheld.

### C5-P8-03 — FOUNDER-GATED (MEDIUM). Two live claims depend on store console configuration the repo does not own.

`ProUpgradeScreen.js:528-529`: "You're in. Pro's free for the next 14
days, and {store} adds another week free when you subscribe."
`SubscriptionPolicyScreen.js:112`: "Your store adds a further 7 days
free, then it renews at the price shown at checkout until you cancel."

Both match the locked design
(`docs/SUBSCRIPTION_AND_PAYMENT_LOCKED.md:18-27`), but that same document
states the dependency: "**Console setup still required:** the App Store
Connect / Google Play subscription products and 7-day intro offers must
exist before purchases convert" (`:33-36`), and
`catalogue.js:11-14` confirms the offer is store config, not code. If the
intro offer is absent or the user is ineligible, the store sheet will
simply charge, and two in-app screens will have promised a free week that
did not happen.

**Founder action to record alongside H4**: confirm the 7-day intro offer
exists and is active on `pro_monthly` and `pro_annual` in **both**
consoles before release, or rule on the copy. No code change is proposed
and none would fix it.

### C5-P8-04 — FOUNDER-GATED (LOW, outside first use). "Switch to Free" is a local-only tier write.

`SettingsAccountScreen.js:42-60` calls `setTier('free',
'SettingsScreen.switchToFree')` and nothing else: no `cascade.skipToFree`
(`cascade.js:365-374`), no store handoff, no cancellation. `setTier`
writes AsyncStorage and the in-memory tier, so the next
`refreshTierFromCloud` for a `paid_pro` row restores Pro while the
subscription keeps billing. The screen's own sibling flow does it
properly: `SubscriptionScreen.js:82-93` opens the store's subscription
page. Recorded for the billing lane, not proposed: any change here is
billing architecture.

### C5-P7-07 — FOUNDER-GATED (MEDIUM). Free users can never reach the wellbeing check.

`WellbeingCheckScreen` is registered ungated
(`RootNavigator.js:558`), but its only navigation entry in the whole app
is `YouScreen.js:567`, inside the `isPro` branch that opens at `:554`
("Safety checks"). Grep for `WellbeingCheck` across `src` returns only the
registration, the screen itself and that one call site. Phase 1 separately
established that there is no first-run wellbeing choice at all (C5-P1-03),
so a Free user has no route to the SCOFF questions in first use or ever.

Calm mode itself IS tier-blind and reachable (Settings > Coaching,
`SettingsScreen.js:42-47`, `SettingsCoachingScreen.js:73-78,120-136`), so
the calmer-coaching control is not the gap; the screening questionnaire
entry point is.

**Why FOUNDER-GATED.** This is ED and wellbeing semantics, which the order
and CLAUDE.md put out of autonomous reach, and the CLAUDE.md mandate that
"guardrails are tier-blind" bears directly on it. Documented, with no
proposal and no change.

### C5-P7-08 — IMPROVEMENT (MEDIUM). The Free user's fifth tab is an upsell.

Evidence in §4. For a Free user, `ProfileTab` (label "Coach",
`RootNavigator.js:626`) renders: the profile card
(`YouScreen.js:377-402`), the Pro pitch card
(`:419-450`), a Pro-locked Partners row (`:545-552`), and, only if they
are a lapsed Pro with history, a coaching-history row (`:492-503`). Every
other section is `isPro`.

Not proposed as an IA change: the order forbids redesign and forbids
altering tier scope. Recorded so the lead can rule on whether existing
free-safe content should reach that tab.

### C5-P7-09 — IMPROVEMENT (MEDIUM). Four definitions of Free.

Evidence in §6.4. A lead ruling could nominate one canonical list (the
policy screen, once corrected) and have the shorter surfaces be honest
subsets of it. Copy only; the three shorter lists contain nothing false
today.

### C5-P7-10 — IMPROVEMENT (LOW). A Free user is never told their tier.

Evidence in §2.4. The first tier signal is a lock. For the C5-P1-02
population, who tapped "Start your 14 days" on Welcome and silently did not
get them, this compounds: nothing in the Free first run acknowledges the
difference between what they asked for and what they got. The copy fix is
entangled with the trial claim (C5-P1-02 is already FOUNDER-GATED), so it
is recorded, not proposed.

### C5-P8-05 — IMPROVEMENT (LOW). A dead paywall branch that mis-frames the account.

`ProUpgradeScreen.js:555-569` renders "Pro needs a free account so your
plan and progress are backed up and your access carries over across
devices" plus OAuth buttons when `hasAccount` is false (`:84`). The route
is registered only inside the five signed-in tab stacks
(`RootNavigator.js:419,447,470,499,565`), so a signed-out user can never
reach it. Legacy (class H) from the removed local-user era, and its copy
repeats C5-P7-03's framing. Recorded, not removed: dead-code removal was
Campaign 4's lane and this lane changes nothing.

### C5-P7-11 — IMPROVEMENT (LOW). A free line whose better half can never fire.

`coachResponse.js:533-545` only produces the weight sentence when at least
four morning weights exist in the window, and morning-weight logging is
Pro (`HomeScreen.js:1811` TodayStrip, `RootNavigator.js:218` BodyMetrics).
A never-Pro user therefore only ever sees the training sentence. Correct
behaviour (it never fabricates), but worth the lead knowing the free
weekly line is one sentence, not two, for its main audience.

---

## 9. Checks run and clean

- **C5-P7-C1 Removed-feature sweep.** §5. Zero cardio promises in either
  onboarding; the one live string is honest and points outside the app.
- **C5-P7-C2 Free is a real product on day 0.** §2.3, including the
  verified 6-week block with a deload week for Free users
  (`database.js`, `activatePlanWithBlock`), 551 exercises, 31 plans,
  ungated CSV export and cloud sync.
- **C5-P7-C3 No dead Pro route.** §4. Every lock has a benefit line, an
  upgrade path, a restore, and a "Not now" that falls back to `HomeTab`
  when there is no back entry (`ProGate.js:247-258`). The read-only guard
  fails CLOSED on a thrown or slow history read
  (`ProGate.js:334-353`, 4s timeout), so a transient DB failure can never
  soften the tier posture.
- **C5-P8-C4 The card question and the trial shape.** §7.3, §7.2. Copy
  matches `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` and the code; product IDs
  `pro_monthly` / `pro_annual` unchanged (`catalogue.js:33-50`).
- **C5-P8-C5 No hardcoded prices** other than C5-P8-01: every surface
  reads `usePlayPrices` and degrades to price-free copy
  (`WelcomeScreen.js:116-120`, `ProUpgradeScreen.js:526-531`,
  `SubscriptionScreen.js:172-174`, `CascadeGateScreen.js:213-218`,
  `DifferentialBadge.js:58-66`). The Play-review excerpt block ships dark
  with an empty array acting as the flag (`paywallExcerpts.js:42-46`), and
  its honesty contract (`:15-39`) includes an absolute ED-safety screen.
- **C5-P8-C6 Monetisation is ED-safe.** The two distress contexts were
  removed as paywall triggers (`differentialPaywall.js:21-28,71-73`); the
  banner loader fails CLOSED on a flag or wellbeing read error
  (`HomeScreen.js:832-840`); the trial banner drops weigh-in counts and
  the weight ask under an open flag
  (`trialActivation.js:145-149`); the day-14 gate's recap is
  training-mechanics only and flag-invariant by construction
  (`CascadeGateScreen.js:58-83,174-180`); `ProSetupCompleteScreen.js:93-140`
  collapses the reveal under calm mode or an open flag. Nothing in this
  lane touches any of it.
- **Tier resolution unchanged.** `PRO_BETA_ACTIVE = false`
  (`proGate.js:28`); `_resolveTier` maps legacy Complete states onto Pro
  (`:39-53`); safety logic consults no tier (verified: no `tier` read in
  `nutritionEngine.js`, `edPatternDetector.js`, `wellbeing.js`).

---

## 10. Notes handed to other lanes

- **Phase 2 / 29 / 43 (entry, interruption, state review):** C5-P7-01 is
  the same defect as Phase 1's C5-P1-01 but reached without any
  interruption, on the conversion path. Whoever rules on C5-P1-01 should
  see this severity.
- **Phase 12 (Home):** C5-P7-05 is a Home card with a missing tier gate.
- **Phase 27 / 28 (permissions, notifications):** C5-P8-02 depends on the
  notification permission requested at `ProOnboardingScreen.js:840`; a
  denial removes the only pre-expiry trial warning.
- **Phase 31 (Free first month):** C5-P7-06 (the "bench" copy) and
  C5-P7-11 (the one-sentence free weekly line) both land in that window.
- **Phase 35 (empty states):** for a zero-history Free user, `hasData`
  false hides most of Progress (`AnalyticsScreen.js:730,762`), leaving the
  two promoted Pro-locked tiles high on the screen.
- **Phase 38 (analytics):** paywall funnel events observed while tracing,
  no new telemetry proposed: `paywall_shown` with
  `surface: 'pro_upgrade' | 'cascade_gate' | differential_*`
  (`ProUpgradeScreen.js:123-137`, `CascadeGateScreen.js:161-172`,
  `HomeScreen.js:1763-1770`), `paywall_tapped_cta`
  (`ProUpgradeScreen.js:138-143`), `feature_locked_viewed`
  (`ProGate.js:168-174`), `cascade_state_transition` and friends
  (`cascade.js:67-103`), `trial_lapse_day1_return`
  (`HomeScreen.js:240-247`).
- **Phase 45 (release truth):** C5-P8-03 is a console-configuration
  dependency that belongs beside H4 on the founder's pre-release list, and
  C5-P7-02 is a live product-truth error of the same family as H4 (the app
  advertising a feature that no longer exists), differing only in that this
  one IS fixable from code.

---

*Phases 7 and 8 evidence file. Audit only: no source, test, doc or
configuration outside this file was modified, and nothing was committed,
pushed or stashed by this lane.*
