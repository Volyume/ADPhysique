# CAMPAIGN 3 — DISCOVERABILITY CLASSIFICATION (Phases 5, 6, 7, 14, 17, 18)

**Built:** 2026-08-10
**Tree audited:** branch `claude/campaign3-discoverability`, HEAD `d91c0db8`
(includes today's landings: `f113a1de` partner-cheer toggle + reminder-state
fixes, `10a2e774` Coach-tab Volume targets row, `ea21a8f3` Diary per-day-offset
disclosure, `cbec6052` saved-meals gesture copy, `d91c0db8` nutrition ownership).
Every `file:line` below was read at that HEAD.
**Authority:** founder Campaign 3 order (`c3-CAMPAIGN3-ORDER.txt`) — PHASE 5
(lines 382-423), PHASE 6 (426-458), PHASE 7 (461-495), PHASE 14 (663-686),
PHASE 17 (743-760), PHASE 18 (763-791), plus CORE PRODUCT LAW (105-134),
SECOND PRODUCT LAW (136-158) and THIRD PRODUCT LAW (160-175).
**Inputs:** `SETTINGS-INVENTORY.md` (91 live settings, canonical editors) and
`CONTROL-GAPS-EVIDENCE.md` (Phase 4/8/10 evidence). Where those documents
already own a question (rest-beep mute, hide-exact-numbers, push-budget
internals) this audit cites them and does not re-open the ruling.
**Bounds honoured:** read-only except this file; cardio's absence is never
treated as a finding and no cardio entry point is proposed; no new features
proposed anywhere; D93 terminology canon binds every label quoted.

**Class key** (order lines 112-134): **A** always discoverable · **B**
contextually discoverable · **C** advanced but reachable · **D** state-gated by
design · **E** internal · **F** legacy/unreachable · **G** unclear intent.

---

## PHASE 5 — TRAINING FEATURE DISCOVERABILITY

| Feature | Entry points (all) | Contextual entry | State requirement | Findable when expected? | Overexposed? | Hidden for good reason? |
| --- | --- | --- | --- | --- | --- | --- |
| Create plan | `PlansScreen.js:52-58` (`Create your own` card, free set) and `:83-87` (Pro set) → `ManualBuilder`; `PlansScreen.js:961-971` empty state; onboarding `RootNavigator.js:725` | Plans empty state offers it beside the library | none | **YES** — a first-class card on the Train tab root | No | n/a |
| Edit plan | `PlanDetailScreen.js` (from `PlansScreen` plan cards), `RoutineDetailScreen.js`, `ManualBuilderScreen.js:793` | Routine rows tap straight through | plan must exist | **YES** | No | n/a |
| Plan library | `PlansScreen.js:44-51` / `:75-82` action card → `PlanLibrary`; `PlansScreen.js:968-970` empty-state secondary; `FreeStarterScreen`; onboarding (`RootNavigator.js:695, 725`) | Offered at every "no plan" moment | none | **YES** | No | n/a |
| Exercise substitution | `ActiveWorkoutScreen.js:3446-3456` (exercise-options sheet `Swap exercise`), `:3133-3136` (superset row), `RoutineDetailScreen.js:823-828` (plan-side swap) | Both at the moment the exercise is in front of the user | in-workout, or a routine open | **YES** — a labelled row in a sheet reached by a visible overflow control | No | n/a |
| Exercise history | `LiftProgressScreen.js:225, 426` → `ExerciseDetail`; `WorkoutHistoryScreen.js:514`; `AthleteProfileScreen.js:527`; `WorkoutSummaryScreen.js:862`; `HomeScreen.js:1696` (plateau banner); `ExerciseDetailScreen.js:947` (substitute chain) | In-workout the *last session's* sets render inline (`ActiveWorkoutScreen.js:2765-2790`, `Last:` label) | sets logged for that exercise | **YES** | No | Full trend deliberately not in-workout; the inline `Last:` row carries what a lifter needs mid-set |
| Records (PRs) | `AnalyticsScreen.js:443-450` (`New PRs` spark card) → `LiftProgress`; `AnalyticsScreen.js:800` NavTile `Lifts`; `LiftProgressScreen` `best` filter; `WorkoutSummaryScreen.js:865` | PR celebration at the moment it is set (`PRCelebration.js`) | ≥1 completed set | **YES** | No | n/a |
| Estimated max | `ExerciseDetailScreen.js:557-560` chart-metric chips; inline e1RM hint on the set card (`SetEntry.js:471-474` comment records it as the single in-card estimate) | Beside the reps field while logging | sets logged | **YES** | No | n/a |
| Set targets | Set from the plan (`RoutineDetailScreen`), shown on the set card in `ActiveWorkoutScreen` | Point of consequence is the set card | in-workout | **YES** | No | n/a |
| Reps-short-of-failure guidance | `BlockProgressCard.js:37-46` — `Effort n/5` chip + `InfoTooltip` on `GLOSSARY.effort`; `HomeBlockShapeSheet.js:66` (`GLOSSARY.rir`); recovery-week line `ActiveWorkoutScreen.js:1304` | Home, on the week's plan card | active block | **YES** | No | **Yes** — the per-set RIR picker was deliberately removed (`SetEntry.js:466-469`: "rarely used in practice … RIR still gets recorded internally"). Guidance is surfaced, the control is not. Correct class **B** |
| Rest timer | `components/RestTimer.js` mounted by `ActiveWorkoutScreen.js:15`; settings at `SettingsWorkoutScreen.js:122-141` (default), `:144-156` (auto-start), `:162-175` (finished alert), `:180-187` (Android exact alarms) | Runs itself between sets | in-workout for the timer; none for the settings | **YES** | No | n/a |
| Training schedule | `ProGoalSetupScreen.js:502-512` (`Training days per week`), reached from `YouScreen.js:521-526`; `PlansScreen.js:66-73` (`Adjust training plan` → `PlanUpdate`); training-reminder *time* at `NotificationSettingsScreen.js:664-676` with days learned automatically (`:681-683`) | Both the Coach Setup list and the Train decision hub | Pro | **YES** | No | n/a |
| Manual workload / volume ranges (MEV/MAV/MRV) | `VolumeHeatmapScreen.js:246-317` editor. Routes in: `AnalyticsScreen.js:743` (**gated on `hasData`**, `:730`), `AnalyticsScreen.js` volume tile, and **`YouScreen.js:544-549`** (`Volume targets`, landed today under D94/Phase 9) | Coach tab Setup row states the precedence ("Your own numbers take precedence") | Pro for the Coach row; Analytics route needs data | **YES for Pro** (fixed today). Free users with no data still have no route, but also nothing to edit — acceptable **C** | No — correctly behind the heatmap, not on a settings wall | Yes. Adaptive internals stay non-editable; only the landmark table is user-writable, exactly as designed |
| Weekly coaching | `YouScreen.js:463-470` (`Weekly check-in`), `:419-449` (tappable weekly-update hero), `:476-483` (archive row) | Home coach banner; check-in reminder push | Pro | **YES** | No | n/a |
| Applied adjustment receipts | `CoachOutputScreen.js` apply rows + `:2766` `WhyBlock`, `:2770-2784` data-confidence caption, `CoachHeldHistoryScreen` via `YouScreen.js:509-514` | The decision screen itself is the receipt | Pro, completed decision | **YES** | No | n/a |
| Recovery week | `PlansScreen.js:780-782, 863-880` (`in_recovery` card); `BlockProgressCard.js:36-38` (`Recovery week` on the week chip); `ActiveWorkoutScreen.js:1304` | Announced in three places at the moment it is live | block in its deload week | **YES** | No | Correctly **D** |
| Early recovery / deload proposal | `PlansScreen.js:836-861` (`early_deload` card, `Got it, ease off this week` / `Keep going`) | Train tab root, above the plan list | ≥2 check-ins and week ≥2 (`blockAdvisor.js:333`) | **YES** | No | Correctly **D**; the history gate stops a week-one user being told to halve their sets |
| Block completion | `PlansScreen.js:809-834` (`post_recovery` card) | Train tab root | block past its planned weeks | **YES** | No | Correctly **D** |
| Repeat plan | `PlansScreen.js:816-821` primary button, label from `blockAdvisor.js:187` (`Continue this plan`) / `:225` (`Repeat this plan anyway`) | On the block-completion card | as above | **YES** | No | n/a |
| Continue with adjustments | Same button, label `blockAdvisor.js:206` (`Continue with adjustments`); seeded ranges via `PlansScreen.js:322` | as above | `adjust` recommendation | **YES** | No | n/a |
| Block history | `PlansScreen.js:1172-1186` (`Training blocks` card → `MesocycleBuilder`); `ConsistencyScreen.js:141`; per-block reflection `MesocycleBuilderScreen.js:283` → `BlockReflection` | Train tab root, permanent card | none | **YES** | No | n/a |
| Muscle / workload detail | `VolumeHeatmapScreen`, `AnalyticsScreen.js:730-745` (`This week's volume` strip + `InfoTooltip` "Tap to see every muscle on the heatmap") | Progress tab | sets logged (`hasData`) | **YES** | No | n/a |
| Manual / coached mode (Autonomy) | **ONE**: `SettingsCoachingScreen.js:224-255`, reached only from `SettingsScreen.js:42-47` | **NONE.** `CoachOutputScreen.js:2556-2559` names Manual mode but does not say where it is set; `YouScreen.js:518-551` Setup list has no coaching-preferences row | Pro (`SettingsCoachingScreen.js:162`) | **NO** — see F11, F12 | No | Partly: it is an advanced control (**C** by placement, **A** by the user's likely search). The defect is the missing pointer, not the placement |
| Calm mode | `SettingsCoachingScreen.js:120-136` (`Calmer coaching`); first-run ask | Read fail-closed by consuming surfaces (e.g. `NutritionTargetsScreen.js:304-313`) | tier-blind | **Reachable, but the Settings row that leads to it does not name it** — F12 | No | No — it must stay findable; the row label is the gap |

**Phase 5 verdict: 20 PASS / 1 FAIL (Autonomy).** Calm mode and Autonomy share
one root cause: the Settings root sub-copy at `SettingsScreen.js:45`
("Coach tone, cardio and weekly check-ins") names neither, and names
"weekly check-ins" which are **not** on that screen (they are on
`CoachingRemindersScreen`). No adaptive internal is editable anywhere;
MEV/MAV/MRV remain confined to the heatmap editor as designed.

---

## PHASE 6 — NUTRITION FEATURE DISCOVERABILITY

**Scanners — which are live.** Exactly two. **Barcode** (`ScanBarcodeScreen`,
route `RootNavigator.js:389`) and **label/OCR** (`ScanLabelScreen`, route
`:395`, engine `lib/food/ocr.js`). There is **no photo-of-meal scanner and no
free-text scanner** in the tree; those are skipped per the order.

| Feature | Entry points (all) | Contextual entry | State requirement | Findable when expected? | Overexposed? | Hidden for good reason? |
| --- | --- | --- | --- | --- | --- | --- |
| Calorie target | `NutritionTargetsScreen.js:804-841, 925` (calculate). Routes in: `SettingsScreen.js:59-66`, `YouScreen.js:527-532`, `HomeScreen.js:1671`, `FoodSearchScreen.js:869`, `FoodInsightsScreen.js:124`, `MealPlanScreen.js:369`, `WeeklyCheckInScreen.js:1083`, `CoachOutputScreen.js:2466`, `PerDayTargetsScreen.js:131` | Nine routes, most from the surface that shows the target | Pro | **YES** — the best-linked screen in the app | No | n/a |
| Macro / protein target | `NutritionTargetsScreen.js:850-906`; second writer `ProGoalSetupScreen.js:546` | Same routes as above | Pro | **YES** (two writers is a Phase 2 ownership issue, recorded as inventory §4 #6 / G7 — not a discoverability defect) | No | n/a |
| Meal logging | `DiaryScreen.js:911` (`FoodSearch` per slot), `:1544-1551` empty-day CTAs, FAB `:1848` | The diary is the surface | Pro (read-only on lapse, `:134`) | **YES** | No | n/a |
| Food search | `DiaryScreen.js:911`; `RecipeBuilderScreen.js:168`; `ScanBarcodeScreen.js:176` (hit) | Per meal slot | Pro | **YES** | No | n/a |
| Barcode scanner | `DiaryScreen.js:919, 1848` (persistent FAB), `FoodSearchScreen.js:765` | Diary FAB | Pro | **YES** | No | n/a |
| Label scanner | **ONE**: `ScanBarcodeScreen.js:181` — reached *only* after a barcode lookup misses | none | a scanned barcode with no match | **NO** — see F2 | No | No. `ProGate.js:32` sells `Label scanning` as a named Pro benefit, so the intent is a reachable feature |
| Meal plans / suggestions | `DiaryScreen.js:1550, 1660` (`Meal builder` row on the empty day and in the day view), `CoachOutputScreen.js:2470, 2730`, `lib/food/planExplain.js:124` deep link | Offered from the empty diary day — the exact moment of need | Pro | **YES** | No | n/a |
| Dietary preferences | `components/food/DietaryPreferencesEditor.js:94-114`, mounted by `SettingsDietaryScreen.js:17` **and** `MealPlanScreen.js:1510`; opened from the plan at `MealPlanScreen.js:212-224` (`Dietary needs` row, sub = live summary) and `:1042` (chip) | **Model pattern.** One component, two mount points, one store — exactly what the SECOND PRODUCT LAW asks for | Pro | **YES** — the order's specific test ("if a preference changes meal suggestions, can the user discover that from the meal-planning context?") **passes** | No | n/a |
| Allergens / exclusions | `DietaryPreferencesEditor.js:123-144` (allergens), `:156-184` (foods you avoid, remove); added from the plan at `MealPlanScreen.js:690-724` | Add at the point of consequence, manage centrally | Pro | **YES** | No | n/a |
| Calorie banking | `DiaryScreen.js:1683-1692` — visible `Plan a higher-calorie day` button; sheet `:2028-2040` | Diary, below the day's food actions | `bankingAvailable` (not floored / cycling / refeed / ED flag) | **YES** | No | Correctly **D** — it must not appear when the safe redistribution is unavailable |
| Calorie cycling (training/rest split, refeed) | Applied from `CoachOutputScreen`; exits shown at `DiaryScreen.js:1453-1476` (`Training and rest targets active. Tap to use one target.` / `Refeed day today. Tap to remove it.`) | The exit sits on the surface the state changes | applied state | **YES** | No | Correctly **D** |
| Per-day calorie offsets | `PerDayTargetsScreen.js:160-178`; routes: `SettingsScreen.js:71-78`, **`DiaryScreen.js:1435-1445`** (disclosure row, landed today) | The Diary row states the applied delta and links to the editor | Pro; the Diary row only when the offset ≠ 0 | **YES** (fixed today). Note the offsets are planning-only (`lib/food/perDayTargets.js:6-13`), so the *targets* screen correctly stays silent about them — the point of consequence is the day's target, and that is where the disclosure now is | No — zero-clutter default | n/a |
| Phase / goal controls | `ProGoalSetupScreen.js:477-489` via `YouScreen.js:521-526`; `NutritionTargetsScreen.js:814-841` | Both live where a user goes to change direction | Pro | **YES** (divergent writers = inventory §4 #5 / G7, ownership not discoverability) | No | n/a |
| Weigh-ins | `BodyMetricsScreen.js:1241+` log button; `NutritionTargetsScreen.js:763-772`; morning-weight reminder `CoachingRemindersScreen.js:349-355` | Home weight prompt; the coach's own thin-data caption names it (`CoachOutputScreen.js:2780-2783`) | Pro (read-only on lapse) | **YES** | No | n/a |
| Trend | `BodyMetricsScreen.js:1109` chart + window chips `:243-247`; `AnalyticsScreen.js:673` `WeightTrendCard`; `HomeScreen.js:1820` `onOpenTrend` | Home differential banner links to it | data | **YES** | No | n/a |
| Nutrition coaching proposals | `CoachOutputScreen.js:2393-2407` (`NextWeekCard` apply rows) | The weekly decision screen | Pro, completed decision | **YES** | No | n/a |
| Maintenance / adaptive target information | `CoachOutputScreen.js:2766` `WhyBlock` → `Methodology`; `NutritionEducationScreen`; adaptive TDEE computed at `BodyMetricsScreen.js:53` | Explained beside the number it produced | Pro | **YES** | No | n/a |
| Reminder controls (nutrition) | Meal reminders `NotificationSettingsScreen.js:712-752`; planned-meal confirm `CoachingRemindersScreen.js:485-505` | Settings root row sub names "meals" (`SettingsScreen.js:90`) | tier-blind / Pro | **YES for meal reminders. NO for the planned-meal confirm** — it lives on Coaching reminders and the only row that leads there advertises only weight + check-in (F6) | No | n/a |
| Unit display (kcal/kJ) | **ONE**: `SettingsDisplayScreen.js:100-121`, reached only from `SettingsScreen.js:101-106` | **NONE** from any nutrition surface | none, free | **NO** — see F3 | No | No — accidental, a labelling artefact (`CONTROL-GAPS-EVIDENCE.md` §1.6 reached the same conclusion) |
| Data-confidence holds | `CoachOutputScreen.js:2770-2784` (confidence caption + "Only N morning weigh-ins landed this week"); `CoachOutputScreen.js:873-922` `InsufficientDataView` — full receipt with the rule and the named unlock date | Rendered inside the decision the confidence applies to | Pro | **YES** — this is the strongest explanation surface in the app | No | n/a |

**Phase 6 verdict: 17 PASS / 3 FAIL** (label scanner reach F2, kJ findability
F3, planned-meal-confirm reach F6). No stored preference writer was duplicated
by anything in this audit; the two "Meals per day" controls and the two protein
writers are pre-existing ownership items already recorded as
`SETTINGS-INVENTORY.md` §4 #4/#6 and G7.

---

## PHASE 7 — NOTIFICATION SETTINGS UX

Campaign 1 integrity semantics are untouched below; this is discoverability and
relationship clarity only.

### 7.1 Inventory — what each toggle actually controls

| Control | Label (verbatim) | Owner (file:line) | Controls exactly | Contextual entry | State requirement |
| --- | --- | --- | --- | --- | --- |
| Workout reminders | `Remind me to train` | `NotificationSettingsScreen.js:649` | Schedules/cancels the weekly training pushes. **Time only** — days are learned from recent workouts, stated at `:681-683` | none | tier-blind; refuses to arm without OS permission (`:430-437`) |
| Training reminder time | `Reminder time` | `:664-676` | The hour, from `TRAINING_PRESET_TIMES` (`:41`) | none | only when the toggle is on (`:661`) |
| Getting-started nudges | `Getting-started nudges` | `:690-708` | One first-fortnight nudge if no session is logged; stops itself (`:705-707`) | none | tier-blind |
| Meal reminders ×3 | `Breakfast` / `Lunch` / `Dinner` | `:714-746` | Local reminders to log a meal. Copy explicitly disclaims streaks (`:748-750`) | none | tier-blind |
| Check-in reminders | `Weekly check-in reminder` (Day + Hour) | `CoachingRemindersScreen.js:422-455` | The weekly coaching cadence; honest next-fire date with a 7-day minimum (`:452-454`) | `WeeklyCheckInScreen.js:1421` links here | Pro |
| Morning weight | `Morning weight reminder` (Hour) | `CoachingRemindersScreen.js:398-420` | The morning-weight series the coach's EWMA reads; the evening backstop rides it (`NotificationSettingsScreen.js:77-78`) | none | Pro |
| Check-in follow-up | `Follow up if a check-in slips by` | `CoachingRemindersScreen.js:456-482` | An evening nudge + a +48h trend look after a missed check-in; suppressed under an open ED flag | none | Pro |
| Meal-plan reminder | `Remind me to confirm planned meals` | `CoachingRemindersScreen.js:485-505` | One evening nudge when planned meals are unconfirmed | none | Pro |
| Partner notifications | `Partner cheers` | `CoachingRemindersScreen.js:506-529` (landed today) | Suppresses partner-cheer / shared-streak / new-partner pushes (`scheduler.js:1448`) | **none** — `PartnerScreen` does not link here | Pro |
| Quiet hours | `Quiet hours`, `Starts`, `Ends` | `NotificationSettingsScreen.js:756-804` | A reminder landing inside the window waits until it ends. Copy claims **every** reminder (`:800-802`) — verified true: every scheduler path calls `shiftDateOutOfQuietHours` / `shiftHourMinuteOutOfQuietHours` (e.g. `scheduler.js:733, 1117`) | none | tier-blind |
| Rest-timer notification | `Rest finished alert` | `SettingsWorkoutScreen.js:162-175` | The OS lock-screen alert only; states "In-app cues are unaffected" (`:165`) | none | tier-blind |
| Exact alarms | `Make rest alerts exact` | `SettingsWorkoutScreen.js:180-187` | Opens an Android **system** screen (`requestExactAlarmAccess`) | none | Android **and** alert on **and** not yet granted (`:180`) |
| In-app rest sound | **no control** | `lib/restSound.js:96-166`, fired unconditionally by `RestTimer.js:300-309` | 3-2-1-GO beeps that defeat the iOS silent switch (`restSound.js:114-124`) | n/a | n/a — **FOUNDER RULING open**, fully evidenced in `CONTROL-GAPS-EVIDENCE.md` §2 Gap #1. Not re-opened here |
| Billing / trial reminders | **no control** | `scheduler.js:510` (cascade day 19/21), `:588` (trial day 3) | Transactional entitlement notices | n/a | Matches `NOTIFICATIONS_LOCKED.md:34-36` ("User can disable: Push only", i.e. at OS level) — **not** a finding |
| Weekly coach ready | **no control** | `scheduler.js:1112-1148` | One push the Monday after a check-in is submitted | n/a | `NOTIFICATIONS_LOCKED.md:39` says "User can disable: **Yes**" — see F13 |
| Win-back | **no control** | `scheduler.js:687-763`, copy `winbackContent.js:50-68` | One re-engagement push ~30 days after lapse, capped at one per 180 days, ED-suppressed | n/a | see F13 |
| Notification permission state | banner only | `NotificationSettingsScreen.js:603-609`; `CoachingRemindersScreen.js:387-393` | Displays denial; no tap-through | n/a | `permissionStatus === 'denied'` only |
| Android channels | **no in-app surface** | `lib/notifications/channels.js:32-71` (4) + `trainingReminders.js:86` + `activeWorkout.js:66, 216` | OS-level per-channel importance/sound | n/a | Android |

### 7.2 The order's Phase 7 questions, answered

1. **Can the user understand what each toggle controls?** **Mostly yes.**
   Every in-app toggle carries a helper line stating its behaviour, and three
   are unusually honest: the training reminder admits it only owns the *time*
   (`:681-683`), the rest alert states its boundary (`SettingsWorkoutScreen.js:165`),
   and the meal reminders disclaim streaks (`:748-750`). The exception is the
   cross-link row (F6), whose sub-copy under-describes the screen it opens.

2. **Can they understand why a notification may not arrive?** **Partly — and
   this is the biggest Phase 7 gap.** Quiet hours are explained (`:800-802`).
   Permission denial is explained, but only via a top-of-screen banner and
   only in the `denied` state (F8, F9). **Push budget is explained nowhere**:
   `budget.js:34-35` caps event pushes at 2/day and 8/week and evicts by fixed
   priority (`:42-57`), so a user with every switch on can still receive
   nothing; grepping `NotificationSettingsScreen.js` finds no "limit", "per
   day" or "at most" copy. **Android channels are named nowhere**: nearly every
   scheduled push targets `COACHING_REMINDERS_CHANNEL` (`scheduler.js:329, 416,
   554, 653, 747, 866, 979, 1066, 1133, 1346, 1391, 1479`), whose OS-visible
   description is "Morning weight, weekly check-in and coaching updates"
   (`channels.js:44`) — so silencing that one channel also silences meal
   reminders, getting-started nudges, trial gates and partner cheers, with no
   in-app account of it. → **F7**.

3. **Are quiet hours discoverable?** **Yes.** Own section heading
   (`NotificationSettingsScreen.js:755`), on the screen the Settings root row
   names ("Training, meals, check-ins and quiet hours", `SettingsScreen.js:90`).
   `CONTROL-GAPS-EVIDENCE.md` §1.4 already ruled the historical "hard to find"
   claim STALE; confirmed.

4. **Do quiet hours affect all expected categories?** **Yes** — verified across
   every scheduler entry point; persisting a change re-lays everything already
   scheduled (`NotificationSettingsScreen.js:512-527`).

5. **Does an OS-level setting masquerade as an in-app setting?** **One, mildly.**
   `Make rest alerts exact` (`SettingsWorkoutScreen.js:181-186`) renders as an
   ordinary settings row and navigates to an Android system screen. Its sub-copy
   ("Allow exact alarms and the rest alert fires to the second") does signal a
   grant, and the row is correctly triple-gated, so this is **acceptable**, not
   a finding. Nothing else: the health-provider rows are permanently hidden
   (`health.js:109-110`), and the widget row is explicitly an instructions alert
   (`SettingsScreen.js:111-117`).

6. **Is a sound produced by the app with no corresponding user control?**
   **Yes — the rest countdown beeps.** Fully traced in
   `CONTROL-GAPS-EVIDENCE.md` §2 Gap #1 and standing as **FOUNDER RULING
   REQUIRED**. **STOP-AND-REPORT: not re-classified here**, per the order's
   "do not infer from implementation residue".

7. **Are controls shown for unavailable platform capabilities?** **No.**
   Exact alarms are `Platform.OS === 'android'`-gated (`SettingsWorkoutScreen.js:180`),
   the widget copy branches per platform (`SettingsScreen.js:113-115`), and the
   whole health group is unreachable by design (`SettingsScreen.js:119`,
   `health.js:109-110`, class **F**, already recorded for Campaign 4).

**Phase 7 verdict: 4 of 7 questions PASS outright, 3 carry findings**
(F6, F7, F8/F9, plus F13). No notification semantics were re-opened.

---

## PHASE 14 — UNITS / DISPLAY SETTINGS

| Preference | Canonical setting (one?) | Immediate effect? | Persistence | Sync contract | Labels canonical (D93)? | Discoverable from the domain it affects? |
| --- | --- | --- | --- | --- | --- | --- |
| Body weight unit (kg / lb / stone) | **YES, one** — `SettingsWorkoutScreen.js:98-118`, writer `useAppStore.js:1775-1788`. Onboarding (`ProOnboardingScreen.js:938`) writes the same field, so no second live editor | **YES** — store `set()` first, persist after | AsyncStorage profile blob + `_stampProfileFields(['bodyWeightUnits'])` | Rides the profile blob to `user_prefs`; **not** in `sync/tables/profiles.js` FIELD_MAP (inventory §2.4) | Yes (`Stone` / `Kg` / `Lbs`) | **NO** — one entry point only, `SettingsScreen.js:53-58`. `BodyMetricsScreen` (the weigh-in surface), the Analytics weight trend and `WeeklyCheckInScreen` all render in the chosen unit but offer no route to change it. → **F4**. Worse, `NutritionTargetsScreen.js:672, 763` hard-code `Current weight (kg)` and ignore the preference entirely → **F5** |
| Gym weight unit | n/a — coerced to kg, no UI by design (`useAppStore.js:1755-1760`) | n/a | n/a | synced | n/a | Correct **E** |
| Energy units (kcal / kJ) | **YES, one** — `SettingsDisplayScreen.js:100-121`, writer `setAccessibilityPref('energyUnit', …)` `:113`. Read broadly and reactively (`lib/format.js`, the whole `components/food/*` family, `NutritionTargetsScreen`, `PerDayTargetsScreen`, `BodyMetricsScreen`, `WeeklyCheckInScreen`) | **YES** — store-first (`useAppStore.js:1960-1967`) | `@volyume_a11y_prefs` | Synced (`:1972`) | Yes, and the copy is truthful about scope: "This changes the display only. Your targets and coaching stay the same." (`:101-104`) — satisfies the order's "if kJ is display-only, do not imply the engine calculates differently" | **NO** — one entry point, behind a row labelled "Display and accessibility / Text size, contrast, motion" (`SettingsScreen.js:101-106`) that names neither energy units nor appearance, while the sibling row that *does* say "units" owns a different unit. → **F3** |
| Theme / appearance | **YES, one** — `SettingsDisplayScreen.js:72-96` | **YES**, app-wide live (`:28-33`) | `@volyume_a11y_prefs` | Synced | Yes (`Dark` / `Light` / `Match phone`) | Same row-label gap as energy units → **F3** |
| Larger text | one — `SettingsDisplayScreen.js:192-208` | YES (1.2× on fontSize tokens) | as above | Synced | Yes; copy defers correctly to the OS setting (`:195`) | Yes — the row sub names "text size" |
| Higher contrast | one — `:209-225` | YES | as above | Synced | Yes | Yes ("contrast" is in the row sub) |
| Colour-blind safe palette | one — `:226-242` | YES | as above | Synced | Yes | Partly — not named in the row sub, but a user seeking it would scan "accessibility" |
| Reduce motion | one — `:243-256`; effective value = `systemReduceMotion \|\| userPref` (`useAppStore.js:1963-1966`) | YES | user pref synced; the OS mirror is **never** persisted (`:1974-1979`) — correct | Synced | Yes | Yes ("motion" is in the row sub) |
| Nutrients shown (fibre / sugars / sodium) | one each — `:147-188` | YES | as above | Synced | Yes; scope copy is honest ("Shown for that food only. This never changes your targets or daily totals.", `:144-145`) | Yes for someone in Display; **no** contextual pointer from a food detail. Advanced-but-reachable **C**, acceptable |
| Show nutrition on Home | one — `:126-139` | YES | as above | Synced | Yes | Yes |
| Exact-number hiding (progress scan) | **no writer** — `progressScanPreferences.js:34-50`, default `true`, guard test forbids a call site | n/a | n/a | would sync | n/a | **STOP-AND-REPORT** — `CONTROL-GAPS-EVIDENCE.md` §2 Gap #2, FOUNDER RULING open. The false "as you chose" copy half was already fixed this campaign (CAMPAIGN-LOG). Not re-classified here |
| Date / time format | **no setting exists** | n/a | n/a | n/a | n/a | Correct — dates follow the device locale; no reader wants a preference. **Not** a gap |
| Chart windows + metric | four scoped keys: weight `BodyMetricsScreen.js:243-247`, e1RM `ExerciseDetailScreen.js:551-555`, metric `:557-560`, volume `VolumeHeatmapScreen.js:119-123` | YES | AsyncStorage per key | Synced | Yes | Yes — the chips sit on the chart they control. **Deliberately not one canonical setting**: each chart remembers its own window, which is view state, not a global preference. **PASS** |

**Phase 14 verdict: 11 PASS / 3 FAIL** (F3, F4, F5). One canonical writer per
preference throughout — no duplicated or forked unit state was found anywhere,
and no calculation unit is affected by any display preference.

---

## PHASE 17 — SUBSCRIPTION / GATED FEATURE DISCOVERABILITY

### 17.1 Can a user tell why a locked feature is unavailable? — **YES**

`ProGate.js` carries a per-feature benefit map (`:26-49`, 22 entries keyed to
the exact `feature` strings `withProGuard` passes in `RootNavigator.js`). The
full-screen lock renders `"{feature} is part of Pro"` (`:219`) plus that
feature's own benefit line (`:222`), so `Label scanning`, `Per-day targets` and
`Training partner` each explain themselves rather than sharing one pitch. The
inline sheet does the same (`:114-130`). `DEFAULT_BENEFIT` (`:53-54`) covers
anything unmapped. **PASS.**

### 17.2 Do locked controls look broken? — **NO**

- Locked routes render a purposeful screen, never a dead one: lock icon, title,
  benefit, `Upgrade to Pro`, `Not now`, and `Restore purchases` (`ProGate.js:204-278`).
- `Not now` can never strand a user: it falls back to `HomeTab` when there is no
  back entry (`:250-255`).
- Inline gates dim the content and show a `Pro` chip (`:92-111`), which reads as
  locked, not failed.
- Pro-only Settings rows are **hidden**, not disabled (`SettingsScreen.js:59, 71,
  79, 93`), so no free user meets an inert control.
- Coach-tab rows that lead to Pro carry `pro` and announce it —
  `accessibilityLabel={pro ? `${label}. Part of Pro.` : label}` (`YouScreen.js:87`).

**One exception**, and it is a tier-coherence defect rather than a broken look:
the `Cycle tracking` row (`SettingsCoachingScreen.js:277-292`) is gated on
`bioSex === 'female'` only, **outside** the `tier === 'pro'` block that wraps
every sibling (`:162-269`). Its sole reader is `WeeklyCheckInScreen.js:345`,
behind `withProGuard` (`RootNavigator.js:208`). A free female user can therefore
switch on a preference whose promised effect ("adds an optional weekly check-in
question", `:283`) cannot occur at her tier. → **F10**.

### 17.3 `PlansScreen.js:826` — the review-noted free-user ProUpgrade routing

**Verified live, and it is a genuine defect — but not a dead route.**

```js
onPress={() => navigation.navigate(tier === 'pro' ? 'PlanUpdate' : 'ProUpgrade')}
```

- **The route resolves.** `ProUpgrade` is registered in `PlansStack`
  (`RootNavigator.js:488`). Nothing crashes.
- **Free users genuinely reach this card.** `getBlockAdvice` is called with no
  tier gate (`PlansScreen.js:207`); training blocks are created by three
  free-accessible paths — `FreeStarterScreen.js:118`, `PlanLibraryScreen.js:374`,
  `ManualBuilderScreen.js:793` — all through `activatePlanWithBlock`
  (`database.js:3700`), which always writes a 6-week block. A free user with no
  check-ins gets `post_recovery` with `recommendation: 'repeat'`
  (`blockAdvisor.js:180-189`, zero high signals + default readiness 70).
- **The button's label promises a free feature.** `secondaryLabel` is
  `Build a new plan` (`blockAdvisor.js:188, 207`). Building a plan is Free by
  the constitution, and the very same screen offers it 200px below as
  `Create your own` → `ManualBuilder` (`PlansScreen.js:52-58`). So the block
  card paywalls something the user can do for free on the same screen.
  The third variant, `Review with coach` (`:225`), *is* legitimately Pro.
- **Telemetry side-effect:** this is the only `ProUpgrade` call site that passes
  no `source`, so the paywall logs `'unknown'` (`ProUpgradeScreen.js:128`).

→ **F1.**

### 17.4 Dead `ProUpgrade` routes — **NONE**

All twelve call sites resolve against a stack that registers the route:
`ProGate.js:88, 232, 242` (rendered inside guarded screens in every stack);
`BodyMetricsScreen.js:1046` (Progress `:525`, Profile `:583`);
`SubscriptionScreen.js:135` and `SettingsAccountScreen.js:39` (Profile `:583`);
`HomeScreen.js:1531, 1760, 1770` (Home `:461`); `DiaryScreen.js:1391`
(Diary `:433`); `PlansScreen.js:826` (Plans `:488`); `YouScreen.js:425`
(Profile `:583`). **PASS** — the only issue is F1's *intent*, not reachability.

### 17.5 Lapse read-only coherence — **PASS**

`withReadOnlyProGuard` (`ProGate.js:326-357`) gives a lapsed user their history
back rather than a lock, on the three surfaces where product law says data stays
readable: Diary (`RootNavigator.js:236`), Body metrics (`:218`), Progress photos
(`:219`). It fails **closed** to the lock on a hung or failed existence read
(4 s timeout, `:343-347`), which is the right direction. Inside those screens
the state is stated plainly and has exactly one way out:

- Diary — `"Your diary is view-only on the free plan. Everything you logged is
  safe and stays yours."` + `Upgrade to keep logging`
  (`DiaryScreen.js:1382-1398`); every write affordance is withheld
  (`:1367`, `:1435`, `:1683`, `:2029`) and the empty day switches to a plain
  fact instead of three write CTAs (`:1538-1542`).
- Body metrics — the log button and form never render (`BodyMetricsScreen.js:1241`).
- Progress photos — the empty copy drops its call to action (`:1676-1677`).
- Coaching history stays readable for lapsed users with history
  (`YouScreen.js:509-514`, sub: "Past Pro decisions stay readable. View-only on
  the free plan.").

**Phase 17 verdict: 4 PASS / 2 FAIL** (F1, F10).

---

## PHASE 18 — EMPTY STATES AS DISCOVERY

Quoted copy is verbatim. **W** = answers *what is this*, **Y** = *why would I
use it*, **H** = *how do I start*.

| Empty state | file:line | Copy | W | Y | H | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| No plan | `PlansScreen.js:961-971` | title `No active plan yet`; text `Answer a few quick questions and we'll suggest a starter plan, or browse the library if you'd rather choose yourself.`; actions `Start with a plan` / `Browse plans` | ✓ | ✓ | ✓ | **PASS** |
| No workout history | `WorkoutHistoryScreen.js:890-894` | `Your workouts will appear here` / `Completed workouts appear here, saved automatically when you finish.` | ✓ | — | ✓ (implicit: finish a session) | **PASS** — weakest of the set, but the screen is a record of an action started elsewhere, and the copy correctly does **not** imply automatic behaviour |
| No PRs | `LiftProgressScreen.js:516-527` | `Your bests will show here` / `When a session beats your best estimated max, that lift appears here. Keep training and they'll come.` (and `Your lifts start here` / `Log a few sessions and each lift's trend builds up here.`) | ✓ | ✓ | ✓ | **PASS** |
| No weight data | `BodyMetricsScreen.js:1230-1236` | `No body metrics yet` / `Log body weight or measurements when you want this trend to start.`, or, when onboarding weight exists, `We have your onboarding body weight saved as a starting point (…). Log a fresh weight to start the trend.` | ✓ | ✓ | ✓ (Log button renders directly beneath, `:1241`) | **PASS** |
| No nutrition history | `DiaryScreen.js:1544-1551` → `EmptyDiary` (`components/food/EmptyDiary.js:18, 33-77`) | `Nothing logged for this day yet.` + `Meal builder` row (`Build a day or week from your targets. Nothing is logged until you add it.`) + `Add food` / `Copy yesterday`. Trend side: `FoodInsightsScreen.js:469-470` `Log at least two days to see your calorie trend.`, `:586-593` `Log food on a few days to see this view fill out.` + `Open diary` | ✓ | ✓ | ✓ | **PASS** |
| No meal plan | `MealPlanScreen.js:872-931` | `Meal builder` / `Build meals from your targets, review them, then add the ones you want to your diary.` + three steps (`Uses your calories and macros`, `Follows your meal preferences`, `Nothing is logged until you add it`) + the live preference controls + `Build today` / `Build week` | ✓ | ✓ | ✓ | **PASS** — the best empty state in the app; it is also where dietary preferences become discoverable |
| No partners | `PartnerScreen.js:1127-1196` | `Train with a partner` / `Pair with one person you already train with. They see whether you trained this week, one daily cheer and only the updates you choose to send. Food, photos, body metrics and notes stay private.` + `Invite someone you train with` / `I have a code` | ✓ | ✓ | ✓ | **PASS** — states the privacy boundary as part of the *why* |
| No progress photos | `ProgressPhotosScreen.js:1674-1678` | `No saved photos yet` / `Add front, back and side photos to start.\n\nThe scale can't tell muscle from water. Photos can.` | ✓ | ✓ | ✓ | **PASS** |
| No block history | `MesocycleBuilderScreen.js:332-338` | `No block running yet` / `Your plan is active and ready to train. A training block adds week-by-week tracking on top, and one starts when you activate a plan.`, or `Your training blocks start here` / `Training blocks start when you activate a plan. Activate one to track week-by-week progress across a training phase.` | ✓ | ✓ | ✓ | **PASS** — correctly branches on whether a plan is already active |
| Insufficient coaching history | `CoachOutputScreen.js:873-922` | `Building your baseline.` + the ledger receipt rows + `Your coach reads your training and weight from day one. It holds calorie and volume changes until it has about two weeks of weigh-ins plus a check-in, so it moves on a real trend rather than one noisy week. Keep logging sessions, your morning weight, and your weekly check-in. The first adjustment lands once the trend is clear.` + the named unlock line | ✓ | ✓ | ✓ | **PASS** — and it is distinguished from a load failure (`LoadErrorView`, `:928-945`), so a dropped connection never masquerades as "you haven't logged enough" |

**Phase 18 verdict: 10 PASS / 0 FAIL.** No empty state advertises an
out-of-scope feature, and none implies automatic behaviour that actually
requires the user to act. **No Phase 18 findings.**

---

## FINDINGS — genuine defects only

Every entry below is a normal user path that fails today. Findings already
owned by another document (rest-beep mute, hide-exact-numbers, push-budget
internals, duplicate meals-per-day / protein / goal writers) are **not**
repeated here.

### F1 — Free users are sent to the paywall by a button labelled with a free feature — **HIGH**
`PlansScreen.js:826` routes free users to `ProUpgrade` for the block-decision
card's secondary action, whose label is `Build a new plan`
(`blockAdvisor.js:188, 207`). Plan building is Free and is offered on the same
screen at `PlansScreen.js:52-58` (`Create your own` → `ManualBuilder`). Free
users genuinely reach this card: blocks are created by
`FreeStarterScreen.js:118`, `PlanLibraryScreen.js:374` and
`ManualBuilderScreen.js:793`, and `getBlockAdvice` is not tier-gated
(`PlansScreen.js:207`). The call also omits `source`, so the paywall logs
`'unknown'` (`ProUpgradeScreen.js:128`).
**Smallest fix (route + param):** for `tier !== 'pro'`, route by the
recommendation — `ManualBuilder` when `secondaryLabel` is `Build a new plan`,
keeping `ProUpgrade` only for `Review with coach` (`blockAdvisor.js:225`) — and
pass `{ source: 'plans_block_card' }`.

### F2 — Label scanning is reachable only through a barcode miss — **MEDIUM**
`ScanBarcodeScreen.js:181` is the **only** navigator to `ScanLabel` in `src/`.
A food with no barcode at all (loose, bakery, imported, own-label) can never
reach the label scanner, even though `ProGate.js:32` sells it as a named Pro
benefit ("Snap a nutrition label to capture its macros without typing them in").
**Smallest fix (link):** a second quiet link beside the existing
`Enter barcode number` link on the scanner (`ScanBarcodeScreen.js:369-378`) —
"No barcode? Scan the label" → `navigation.replace('ScanLabel', { mealSlot, entryDate })`.

### F3 — The Settings row that owns appearance and kcal/kJ advertises neither — **MEDIUM**
`SettingsScreen.js:101-106`: label `Display and accessibility`, sub
`Text size, contrast, motion`. That screen owns **Appearance**
(`SettingsDisplayScreen.js:72-96`) and **Energy units** kcal/kJ (`:100-121`).
Meanwhile the only row containing the word "units" — `Workout & units`
(`SettingsScreen.js:53-58`) — owns body-weight units, so the one word a
kJ-seeker or a light-mode-seeker scans for points at the wrong screen.
(`CONTROL-GAPS-EVIDENCE.md` §1.6 reached the same conclusion independently.)
**Smallest fix (label):** change the sub to name what the screen owns, e.g.
`Appearance, energy units, text size, contrast, motion`.

### F4 — No unit control is reachable from any weight surface — **MEDIUM**
`SettingsWorkout` has exactly one entry point in the whole app
(`SettingsScreen.js:57`). Every surface that *renders* body weight in the chosen
unit — `BodyMetricsScreen.js:502`, the Analytics weight trend
(`AnalyticsScreen.js:673`), `WeeklyCheckInScreen.js:301`, `HomeScreen.js:267` —
offers no route to change it. The order's THIRD PRODUCT LAW asks precisely for
this ("a unit control is discoverable from the domain it affects", line 684).
**Smallest fix (link):** one contextual row on `BodyMetricsScreen`, beside the
weight chart's window chips, reading `Change weight units` → `SettingsWorkout`
(canonical editor unchanged, no second writer).

### F5 — The nutrition-targets weight field ignores the body-weight unit preference — **MEDIUM**
`NutritionTargetsScreen.js:672` and `:763` hard-code the label
`Current weight (kg)` and the accessibility label
`Current weight in kilograms`, while `bodyWeightUnits` defaults to `st`
(`useAppStore.js:1774`) and every other weight surface honours it. A stone user
recalculating targets must convert by hand; the validator then rejects the raw
stone figure (`:456`, `isValidBodyWeightKg`), so the failure is visible but
unexplained. The label is not *dishonest* — it does say kg — so this is a
consistency defect, not a truth defect.
**Smallest fix (copy):** add the user's latest logged weight in their own unit
as helper text/placeholder under the field, e.g. `Your last weigh-in: 13 st 4 lb (84.4 kg)`.

### F6 — The Coaching-reminders cross-link under-describes what it opens — **MEDIUM**
`NotificationSettingsScreen.js:632-634` describes that screen as
`Morning weight and weekly check-in schedule. Always on for Pro.`
`CoachingRemindersScreen` now also owns **Check-in follow-up** (`:456-482`),
**Meal-plan reminder** (`:485-505`) and **Partner cheers** (`:506-529`, landed
today). A user hunting the partner-cheer or planned-meal mute reads straight
past the only row that leads to it — and `PartnerScreen` never links there
either.
**Smallest fix (label):** update the sub to name the four categories, e.g.
`Weigh-in and check-in times, check-in follow-ups, meal-plan reminders and partner cheers.`

### F7 — Nothing explains the two non-obvious reasons a notification does not arrive — **MEDIUM**
(a) **Push budget.** `budget.js:34-35` caps event pushes at 2/day and 8/week
with fixed priority eviction (`:42-57`), applied at twelve scheduler call sites.
No copy anywhere on `NotificationSettingsScreen.js` mentions any frequency
limit. (b) **Android channels.** Almost every push targets
`COACHING_REMINDERS_CHANNEL` (`scheduler.js:329, 416, 554, 653, 747, 866, 979,
1066, 1133, 1346, 1391, 1479`), described to the OS as "Morning weight, weekly
check-in and coaching updates" (`channels.js:44`), so muting that one Android
channel also silences meal reminders, getting-started nudges, trial gates and
partner cheers. The bottom note (`NotificationSettingsScreen.js:807-811`) says
only "You can disable them any time from your device settings".
The budget is correctly **class E internal** — no control is warranted, only an
explanation (`CONTROL-GAPS-EVIDENCE.md` §1.5 hands this to Phase 7).
**Smallest fix (copy):** two calm sentences appended to the existing bottom
note — one stating Volyume sends at most a couple of these a day so a busy day
never turns into a pile, one stating that Android groups them and turning a
Volyume category off in phone settings silences everything in that group.

### F8 — "Enable them in your device settings" with no way to get there — **LOW-MEDIUM**
`NotificationSettingsScreen.js:603-609` and `CoachingRemindersScreen.js:387-393`
both instruct the user to open device settings and provide no tap-through,
while the app's camera-permission flows already ship exactly that affordance
(`ScanBarcodeScreen.js:281`, `ScanLabelScreen.js:277`, both `Linking.openSettings()`).
**Smallest fix (link):** reuse `Linking.openSettings()` as an `Open settings`
action inside both existing banners.

### F9 — One OS state, two contradictory in-app behaviours — **LOW-MEDIUM**
With notifications denied, `handleTrainingToggle` refuses and explains
(`NotificationSettingsScreen.js:430-437`), while `toggleMealReminder`
(`:565-575`) and quiet hours persist the change and simply never schedule
(`:560-562`). A user at the bottom of the screen flips `Breakfast` on, watches
it stay on, and receives nothing; the only explanation is the banner at the top
of a long scroll.
**Smallest fix (copy):** add the same one-line denied notice to the meal-reminder
card's existing helper row (`:747-751`) whenever `permissionStatus === 'denied'`,
so the explanation sits next to the switch that needs it.

### F10 — Free users get a live control whose promised effect cannot happen — **LOW-MEDIUM**
`SettingsCoachingScreen.js:277-292` renders `Cycle tracking` gated on
`bioSex === 'female'` alone, outside the `tier === 'pro'` block that wraps every
sibling (`:162-269`). Its only reader is `WeeklyCheckInScreen.js:345`, behind
`withProGuard` (`RootNavigator.js:208`). A free female user can switch it on and
nothing can ever come of it, contradicting the order's "settings unavailable to
current tier behave coherently" (line 755).
**Smallest fix (gate, one line):** move the row inside the existing
`tier === 'pro'` block, matching every other coach-input control on the screen.
Article 9 handling is unchanged either way (the key stays sync-excluded,
`sync.js:1349`).

### F11 — Manual mode explains itself but not where it lives — **LOW**
`CoachOutputScreen.js:2556-2559` renders
`Manual mode: these are recommendations. The coach applies nothing; any change
is yours to make.` — good D93 work — but names no route to the control that
caused it (`SettingsCoachingScreen.js:224-255`), and the Coach tab's Setup
section (`YouScreen.js:518-551`) has no coaching-preferences row at all. A user
who set Manual months ago, or who inherited it from another device, sees Apply
buttons vanish with no path back.
**Smallest fix (copy):** append the location to that existing sentence, e.g.
`… yours to make. Change this in Settings, under Coaching.`

### F12 — The Settings row for Coaching names none of the three things users look for there — **LOW**
`SettingsScreen.js:42-47`: sub `Coach tone, cardio and weekly check-ins`. The
screen actually owns **Calmer coaching** (`SettingsCoachingScreen.js:127`),
**Autonomy** (`:224`) and **Cycle tracking** (`:281`) — and does **not** own
weekly check-ins, which live on `CoachingRemindersScreen`. The sub-copy
therefore both under-sells and mis-directs.
**Smallest fix (label):** e.g. `Calmer coaching, coach tone, who applies changes, cardio`.

### F13 — Two push categories have no unsubscribe path, and one contradicts the screen's own promise — **LOW**
`NOTIFICATIONS_LOCKED.md:22` states "Every push has a clear unsubscribe path
(single tap to disable the category)", and `:39` lists
`Weekly coach output ready … User can disable: Yes`. In current main
`scheduleWeeklyCoachReady` (`scheduler.js:1112-1148`) has no in-app control, and
neither does `scheduleWinbackNotification` (`:687-763`) — whose copy sells Pro
("Pro picks up exactly where it left off", `winbackContent.js:55-62`) while
`NotificationSettingsScreen.js:593-595` and `:807-811` both state Volyume never
sends marketing notifications. Both categories are otherwise well-behaved
(one-shot, quiet-hours shifted, budgeted, ED-suppressed, and win-back is capped
at one per 180 days).
**Smallest fix (copy) + escalation:** name the always-on categories honestly in
the bottom note (they are one-per-week/one-per-episode account notices, not
campaigns), and refer the *control* question — whether either deserves a toggle
under the locked unsubscribe law — to **Phase 8 classification / founder
ruling**. Do not add a toggle from this audit.

---

## STOP-AND-REPORT — ambiguity surfaced, not resolved

1. **In-app rest beep (`restSound.js`).** Phase 7 question 6 answers "yes, a
   sound with no control". The ruling is already open in
   `CONTROL-GAPS-EVIDENCE.md` §2 Gap #1 (**FOUNDER RULING REQUIRED**, four
   options, recommendation #1). This audit deliberately does **not**
   re-classify it and proposes nothing.
2. **`hide exact scan numbers` (`progressScanPreferences.js:34-50`).** Phase 14
   lists it as a display preference with no writer and an active guard test
   against adding one. Ruling open in `CONTROL-GAPS-EVIDENCE.md` §2 Gap #2.
   ED-adjacent — must not be agent-decided.
3. **F13's control half.** Whether `weekly_coach_ready` and `winback` require
   toggles is a collision between `NOTIFICATIONS_LOCKED.md:22/39` and the
   shipped product. The copy half is fixable now; the control half is a Phase 8
   classification and, if intent is genuinely absent, a founder ruling. Not
   decided here.
4. **F1's `Review with coach` variant.** For the third recommendation
   (`blockAdvisor.js:225`), routing a free user to `ProUpgrade` is *correct*
   (the coach is Pro). The fix must branch on the recommendation, not blanket
   the card — flagging this so the fix is not applied too broadly.
5. **F5 vs. the ED-adjacent nutrition-targets form.** The `Current weight (kg)`
   field feeds the calorie-floor branch. The proposed fix is helper **copy**
   only and touches no value, no validator and no engine input. Anything beyond
   that (accepting stone input, converting on save) is safety-adjacent and must
   be lead-ruled, not agent-decided — it sits next to the unresolved FR-1 sex
   field.

---

## SCOPE CONFIRMATIONS

- **Cardio:** no cardio entry point, setting, route or copy is proposed or
  recommended anywhere above. Its absence from Progress is not treated as a
  finding; the existing Coach-tab row (`YouScreen.js:494-501`) is recorded only
  as inventory fact.
- **No new features** are proposed. Every fix shape is a route correction, a
  link to an existing canonical editor, a label, or copy.
- **D93 canon:** every label quoted is verbatim from current main; no
  relabelling is proposed that departs from the Campaign 2 terminology canon.
- **Read-only:** this file is the only artefact written.
