# Volyume tab inventory (code as read, v3.4.0)

Read-only fact sheet. Citation format: `File.js:line`. A bare `XScreen.js` means `src/screens/XScreen.js`; anything else is written from `src/` (for example `components/home/TodayLine.js:36`). Route names are the registered names. `Tab>Screen` means a cross-tab navigation through `navigateCrossTab` or `navigation.navigate('XTab', {screen})`. [unclear] marks anything I could not settle from code.

Legend: [hidden under calm/ED] = a safety check in code hides the row entirely. [figures withheld under calm/ED] = the row still shows but drops numbers. "none" in the Taps column = display only.

---

## 0. Tab order and labels (confirmed)

Source: `navigation/RootNavigator.js:824-829` (titles) and `:808-820` (icons). Bar component: `components/VolyumeTabBar.js`.

| # | Tab label | Internal route | Stack root screen | Icon (focused) |
|---|---|---|---|---|
| 1 | Today | HomeTab | Home (HomeScreen) | today |
| 2 | Train | PlansTab | Plans (PlansScreen) | barbell |
| 3 | Nutrition | DiaryTab | Diary (DiaryScreen) | nutrition |
| 4 | Progress | ProgressTab | Analytics (AnalyticsScreen) | stats-chart |
| 5 | Community | CommunityTab | Community (CommunityHubScreen) | people |
| 6 | Coach | ProfileTab | You (YouScreen) | pulse |

- Default tab on launch is HomeTab; setup wizard can open PlansTab instead (`RootNavigator.js:763-777`).
- Settings is not a tab. It is a screen in the Coach stack (ProfileTab), opened from the gear on the Coach header (`YouScreen.js:338`).
- Tab bar extras: amber dot on Coach when an unseen weekly coach review exists (`components/VolyumeTabBar.js:153`); amber dot on Community when `community.unseen` (`:154`); an active-session mini-bar docks above the bar mid-workout, shows exercise name or rest timer, taps to HomeTab>ActiveWorkout (`components/ActiveSessionMiniBar.js:145`); the whole band hides while ActiveWorkout is focused (`VolyumeTabBar.js:121`).

---

## 1. Today tab: HomeScreen (`HomeScreen.js`, 4020 lines)

Order is exactly the JSX order in the single ScrollView (`:2605`). Pull-to-refresh is on (`:2624`).

| # | Section / card (heading or first line) | Shows when | What it shows | Taps go to | Cite |
|---|---|---|---|---|---|
| 1 | Header "Today" with a "Community" pill (people icon, amber dot or numeric badge) | always | Page title; pill carries unseen-activity dot or unread-message count (cap 9+) | Pill: CommunityTab root | HomeScreen.js:2631; components/community/CommunityHeaderAction.js:53-95 |
| 2 | Community row: "{n} people you follow trained today" / "Find people to follow" / zero line + "Invite" | `!initialLoading && communityRowVisible` (has Community profile, same-day count read) [hidden under calm/ED] | Count of followed people who trained today | Row: CommunityTab (or CommunityTab>Community segment=people when following nobody); "Find people" button: same; "Invite": native share sheet with own profile link | HomeScreen.js:2638; gate HomeScreen.js:882-891; components/HomeCommunityTodayRow.js:34-83 |
| 3 | Weigh-in strip: "Morning weight / Not logged yet" + "Log" (inline numeric field on tap) | `!initialLoading && user && coachingSetUp && todayWeight == null`; disappears once today's weight is logged [figures withheld under calm/ED: plausibility prompt names no figure, field opens empty under the flag tier] | Morning weight input; first-use line "Before breakfast, after the bathroom, so each reading is comparable." until a weigh-in has ever been logged | "Log"/row: opens the inline field and saves the weight (no navigation). TodayStrip also has a logged-state row that opens ProgressTab>Analytics{focusWeightTrend} (onOpenTrend wired at HomeScreen.js:2694), but Home renders the strip only while `todayWeight == null`, so that state is not reachable from this gate | HomeScreen.js:2672; components/TodayStrip.js:227-310 (logged state :227-250, not-logged state :262-310, first-use line :283-290) |
| 4 | Today line (single quiet tinted row, no heading) | One occupant at most, ranked: block finished > coach decision > check-in ready > planned recovery week > re-entry > nutrition-phase mismatch; nothing while a workout is active | One sentence: "Block finished. Choose what comes next." / "This week's coaching decision. See why." or "Calories adjusted to N kcal. See why." / "Your weekly check-in is ready. It shapes this week's coaching decision." / "Recovery week. Training is deliberately lighter. What that means." / "Welcome back. A quick question before your next session." / "Your nutrition targets are set for {phase}. Update them to match." | block finished: PlansTab>Plans; coach decision (dismissible): ProfileTab>CoachOutput{weekStart}; check-in (dismissible): ProfileTab>WeeklyCheckIn; recovery: "Recovery detail" bottom sheet (RecoveryStateCard); re-entry: 3-option alert; phase mismatch (dismissible): ProfileTab>NutritionTargets. No safety check in Home's gate for coach-decision or check-in occupants (`:2374`, `:1280`); whether the upstream coach output carries a calorie figure under an ED flag is [unclear] | HomeScreen.js:2706, 2510-2562; lib/home/todayLineArbiter.js:58-195; components/home/TodayLine.js:36-72 |
| 5 | Skeleton cards | `initialLoading` | Two placeholder cards | none | HomeScreen.js:2748 |
| 6 | "Welcome to Volyume" (two numbered steps) | `!initialLoading && totalSessions === 0 && !welcomeDismissed` | Step 1 "Start a session below", step 2 "Your coach learns as you train" | X button dismisses; no navigation | HomeScreen.js:2788; components/HomeWelcomeCard.js:44-78 |
| 7 | Plan rebuild note (title and lines come from the rebuild record) + "Got it" | `!initialLoading` and a stored rebuild note exists | One-time "what changed" after the plan was rebuilt | "Got it" dismisses | HomeScreen.js:2795; components/PlanRebuildNote.js:46-72 |
| 8 | "Your plan can be updated" card | `!initialLoading` and planRebuild says this plan needs a choice | Body: "Updating it needs a choice from you, such as a different number of days or a longer session, so your plan has been left exactly as it is." | "Update your plan": PlansTab>PlanUpdate; "Not now" dismisses | HomeScreen.js:2800; components/PlanRebuildChoiceCard.js:50-75; lib/structure/messages.js:553 |
| 9a | Hero: "Workout in progress / Tap to return to your workout" | `hasActiveWorkout` | Resume card | HomeTab>ActiveWorkout | HomeScreen.js:2809-2825 |
| 9b | Hero: eyebrow "Block complete", "Every week of this block is done" | not active workout, `blockAwaitingDecision` | Readiness chip line; three actions | Readiness chip: "Your block" sheet; "Choose what comes next": PlansTab>Plans; "Do another session": "Workout options" sheet; "Share this block" (if block id exists): CommunityCompose{kind:'block'} | HomeScreen.js:2826-2881 |
| 9c | Hero: eyebrow "Week complete", "Every session done this week" | not active, week resolved, no override | One line from `weekCompleteLine`, readiness chip | Chip: "Your block" sheet; "Do another session": "Workout options" sheet | HomeScreen.js:2882-2909 |
| 9d | Hero (training): eyebrow `{recovery label} · {plan label}`, session name, "N exercises" or circuit line | active plan and a session to show | Next session name; readiness chip ("On track for this block." style line); optional one-line coach brief with X (e.g. "Good to see you back. It's been a while since your last session."); "Start workout" and "Options" buttons | "Start workout": intent sheet "How are you feeling today?" then HomeTab>ActiveWorkout; "Options": "Workout options" sheet; chip: "Your block" sheet | HomeScreen.js:2910-3020; lib/homeCoachBrief.js:33-66 |
| 9e | Hero: "Your plan has no sessions yet" | plan exists with zero sessions | EmptyState | "Open your plan": PlansTab>PlanDetail; "Choose a different plan": PlansTab>PlanLibrary | HomeScreen.js:3021-3039 |
| 9f | Hero: "No active plan yet" + card "Start your first workout" | no plan | EmptyState with copy "Start with a plan and your coach builds one from your setup..." | "Start with a plan": plan-preview sheet; "Browse plans": PlansTab>PlanLibrary; "Start your first workout" card: blank session to HomeTab>ActiveWorkout | HomeScreen.js:3040-3096, 1913 |
| 10 | "Anything Volyume should build your training around?" offer card | `!initialLoading`, nothing set up under Injuries & limitations, not dismissed, welcome retired, no banner in the slot | Offer text: injuries, pain, long-term conditions or disabilities | "Set it up": HowYouTrainAdd; "No thanks" dismisses forever | HomeScreen.js:3105; components/HomeHowYouTrainOfferCard.js:24-42 |
| 11a | "Set up coaching" card (full) or one-line row "Coaching isn't set up yet. Set up" | `user && !coachingSetUp && mode resolved` (full at most once a day, then the row) | Setup prompt for quick-start users | "Set up coaching": coaching setup flow (`openCoachingSetup`); "Not now": row | HomeScreen.js:3121; components/CoachingSetupCard.js:28-96; lib/coachingSetup.js:56-64 |
| 11b | Evidence pane: title "Since your check-in" (only after a real check-in) then countdown line, then tick rows | `user && coachingSetUp && evidencePanelItem` [neutral variant under calm/ED: date-only countdown, no counts, no weight line, no food row] | Days to next check-in; "N training sessions logged" or "No training sessions yet"; "N of 3 morning weigh-ins this week" or "N morning weigh-ins this week"; "Morning weight {x}" once logged; "Food logged on N of the last 7 days" / "Not enough food logged to judge (N of the last 7 days)" | Whole pane: ProfileTab>You (Coach tab root) | HomeScreen.js:3128; components/home/EvidencePanel.js:22-70; lib/home/evidencePanel.js:101-176 |
| 12 | "Last session - {Today/Yesterday/...}" slim row | `lastSession` exists | Routine or session name; "{m}m - {n} sets - {total} kg lifted" | Row: WorkoutHistory; "Repeat" button: starts same session again | HomeScreen.js:3143; components/HomeLastSessionCard.js:37-99 |
| 13 | "Challenge" slim row | `!initialLoading && homeChallenge` (entrants only, active or ended) | Challenge title, score out of 100, days left | CommunityTab>Challenge{id} | HomeScreen.js:3157; components/HomeChallengeCard.js:23-39 |
| 14 | "See who is training" intro card | `!initialLoading && user && totalSessions > 0 && !communityIntroDismissed && no banner in slot` | "Connect with people at your gym and your friends, see each other's training weeks, and give respect." | "Have a look": CommunityTab (and dismisses); "Not now": dismisses forever | HomeScreen.js:3169; components/HomeCommunityIntroCard.js:28-49 |
| 15 | Lift plateau banner (one sentence + X) | plateau detected and not dismissed this week and it wins the one banner slot (plateau outranks activation) | e.g. exercise stall line from `plateauBannerLine` | ProgressTab>ExerciseDetail{exerciseId}; X dismisses. Training data only, no safety gate by design (`:1024-1028`) | HomeScreen.js:3180; :2463-2472 |
| 16 | Activation banner (title + body + X) | account young, stalled stage, not dismissed, wins slot [hidden under calm/ED] | Stall-stage nudge from `activationBannerLine` | Starts next workout (same path as hero "Start workout"); X dismisses | HomeScreen.js:3208; gate :1098-1131 |
| 17 | "Injuries & limitations" grouped list (small label + rows) | `hasConstraintRows` (active constraint with plan, awaiting prompt, undecided rule, ramp line, or read failed) | Quiet sentences: how the plan works around an injury; "You thought you would be back to {x} by about now. Still need it?"; "A change to your limitations is waiting for your decision."; reintroduction ramp line (not tappable); "Volyume could not check Injuries & limitations just now." (not tappable) | Tappable rows: HomeTab stack HowYouTrain | HomeScreen.js:3285-3369; hasConstraintRows :2310 |

Overlays on Today (not in scroll order):

| Overlay | Opened by | Content | Taps go to | Cite |
|---|---|---|---|---|
| "Workout options" sheet | Hero "Options" or "Do another session" | Plan name; "View workout", "Blank workout", "Skip this workout" (when a session is outstanding), day picker with "Next up", Cancel | View workout: PlansTab>RoutineDetail{routineId}; Blank workout: BuildWorkout; picker sets today's session | components/HomeChangeWorkoutSheet.js:56-173; HomeScreen.js:3389 |
| "Your block" sheet | Readiness chip | Block name, block/deload definitions, seed lines; "Choose your next block" when block finished; Close | PlansTab>Plans | components/HomeBlockShapeSheet.js:43-87; HomeScreen.js:3381 |
| "Recovery detail" sheet | Today-line recovery occupant | RecoveryStateCard | none | HomeScreen.js:3416-3426 |
| "How are you feeling today?" sheet | Hero "Start workout" (unless opted out) | "Readiness (optional)" chip rows; Sharp / Average / Below par (each starts the workout); "Skip"; "Do not ask before each session" (text says: turn back on in Settings, Coaching) | HomeTab>ActiveWorkout | HomeScreen.js:3443-3560 |
| Plan preview sheet | "Start with a plan" | Prospective week; confirm "Start this plan"; links for equipment / avoided movements / manual builder | PlansTab>PlanUpdate; AvoidedMovements; PlansTab>ManualBuilder | HomeScreen.js:3565-3580 |
| What's-new sheet | per update | one dismissible sheet | none | HomeScreen.js:3582 |

Floating buttons on Today: none found in HomeScreen.js.

---

## 2. Train tab: PlansScreen (`PlansScreen.js`, 2830 lines)

Single ScrollView; pull-to-refresh on (`:1401`). No calm/ED/safety check anywhere in this file (grep for calm, edFlag, wellbeing, safety returned nothing).

| # | Section / card (heading or first line) | Shows when | What it shows | Taps go to | Cite |
|---|---|---|---|---|---|
| 1 | Header "Train" (default Volyume V brand mark on the right, no actions) | always | Title | none | PlansScreen.js:1403; components/ScreenHeader.js:57-77 |
| 2 | Skeleton cards | `!loaded` | Three placeholders | none | PlansScreen.js:1409 |
| 3 | "Could not load your plans" EmptyState | `loadError && !activePlan` | "Check your connection and try again. Nothing has been lost." | "Retry" reloads | PlansScreen.js:1423 |
| 4 | Active plan card: badge "Active", ellipsis, plan name, "N workouts" | `activePlan` | Plan heading name; workout count | Ellipsis: peek menu (View plan, Set active, Move to folder, Start this plan again, Archive) | PlansScreen.js:1437-1456, 1182-1230 |
| 4a | ...row "Training style: {x}" | `activePlanStyle` set | Current training style | PlansStack>PlanUpdate{focus:'style'} | PlansScreen.js:1457-1470 |
| 4b | ...line "Week N of M" / "Recovery week, week N of M" / "Block finished" + info tooltip (block definition) | `blockAdvice.blockStatus` | Block position | tooltip only | PlansScreen.js:1479-1490 |
| 4c | ...peak-week note (advisor body, e.g. "One more week before your recovery week...") | advisor action 'continue' and one week before recovery | one sentence | none | PlansScreen.js:1500 |
| 4d | ...static line "Your coach reviews this plan each week and suggests changes for you to apply. Change training setup or switch plans from the options below." | always on active card | explainer | none | PlansScreen.js:1505 |
| 4e | ...line "Week complete. Your next session is on Monday." | `weekComplete` | state line | none | PlansScreen.js:1513 |
| 4f | ...buttons "Start next workout" (or "Do another session" when week complete) and "View plan" (hidden when week complete) | active plan | primary start / open plan | Start: HomeTab>ActiveWorkout (after capability preflight); Do another session and View plan: PlansStack>PlanDetail{planId} | PlansScreen.js:1518-1543, 982 |
| 5 | "No active plan yet" EmptyState | no active plan, no load error | "Start with a plan and your coach builds one from your setup, or browse the library and pick one yourself." | "Start with a plan": plan-preview sheet; "Browse plans": PlanLibrary | PlansScreen.js:1546-1577 |
| 6 | Block advisor card (headline from advisor, e.g. heads-up, early deload, in recovery, post-recovery) | `blockAdvice && activePlan && action !== 'continue' && !blockSnoozed` | Headline and body; programme verdict; signal chips; after recovery: "What this block showed" lines, "What continuing with adjustments would change" lines, two next-block options (one may be tagged "Suggested") | "See what this block showed": ProfileTab>BlockReflection; each option opens review sheet then starts next block; secondary ("Change my training setup"): PlanUpdate; "Got it" / "Remind me after recovery week" / "Not quite ready. Remind me later." snooze | PlansScreen.js:1581-1863, 1327-1331 |
| 7 | "Plan tools" label, then a card list | always | see rows 7a-7e | | PlansScreen.js:1878-1960 |
| 7a | "Injuries & limitations" row (live summary line) | always | HowYouTrain summary sub-line | PlansStack>HowYouTrain | PlansScreen.js:1883-1896 |
| 7b | "Training blocks / View completed blocks and long-term progress" row | always | static | PlansStack>MesocycleBuilder | PlansScreen.js:1897-1910 |
| 7c | "Avoided movements · N" row | `avoidedMovementsCount > 0` | "Types of movement Volyume is leaving out of suggestions" | PlansStack>AvoidedMovements | PlansScreen.js:1915-1932 |
| 7d | "Adjust training plan" card | active plan exists | "Change schedule, equipment, experience, division or weak points. Volyume previews the rebuild before it replaces your active plan." | PlansStack>PlanUpdate | PlansScreen.js:84-91, 1933-1958 |
| 7e | "Pick from the plan library" card; "Create your own" card | library card only with an active plan; "Create your own" always | "Choose a ready-made plan..." / "Create your own plan and choose every exercise..." | PlanLibrary; ManualBuilder | PlansScreen.js:92-105, 1378-1380 |
| 8 | "Previous plans · N" (collapsed by default) with optional folders and compact rows | `myPlans.length > 0` | Non-active plans; per row workout count and "Set active" | Header toggles; row: PlanDetail{planId}; row options: peek menu | PlansScreen.js:1968-2088 |
| 9 | "Archived plans · N" (collapsed) | `archivedPlans.length > 0` | Archived plans | Row: PlanDetail; options: View plan, Restore plan | PlansScreen.js:2099-2136 |
| 10 | "Saved workouts / Saved workouts you can start directly." | `templates.length > 0` | Saved routine name, "N exercises" | "Start": HomeTab>ActiveWorkout; ellipsis: routine options | PlansScreen.js:2143-2179, 1310 |

Overlays: plan-preview sheet (`PlansScreen.js:2189`), "What changed in your next block" receipt sheet titled "Your next block is set" (`:2206`), next-block review sheet (`:2258` onward, titled in-file as the NEXT-BLOCK REVIEW), peek menu (`:2184`). Floating buttons: none.

---

## 3. Nutrition tab: DiaryScreen (`DiaryScreen.js`, 2806 lines)

Single ScrollView inside a horizontal-swipe GestureDetector (swipe left/right changes day, `:1882`). Pull-to-refresh on.

| # | Section / card (heading or first line) | Shows when | What it shows | Taps go to | Cite |
|---|---|---|---|---|---|
| 1 | Header "Nutrition" + "Trends" pill (analytics icon) | always | Title; pill labelled "Trends" | DiaryStack>FoodInsights (calorie, macro, consistency trends and diary export) | DiaryScreen.js:1896-1907 |
| 2 | One-line row "Coaching isn't set up yet. Set up" | `!coachingSetUp` | Setup prompt (compact mode only on this tab) | Coaching setup flow | DiaryScreen.js:1912-1916; components/CoachingSetupCard.js:36-50 |
| 3 | Day pager: previous chevron, date label with calendar icon, next chevron, optional "Today" pill, options icon | always (Today pill only when viewing another day) | Date heading and sub-label | Chevrons change day; date: native date picker; "Today": jump to today; options icon ("Open diary tools"): "Day tools" sheet | DiaryScreen.js:1922-1972 |
| 4 | "Targets updated. See why" chip | `coachingSetUp && targetsChangedRecently` (coach changed calories or diet break within the window) | One quiet line | ProfileTab>CoachOutput{weekStart} | DiaryScreen.js:1978-1990; :602-604 |
| 5 | Macro card (kcal ring with "left"/"over", "of N kcal", Protein / Carbs / Fat / Fibre bars, "+N planned", day-type chip, "{p}% protein · {c}% carbs · {f}% fat of calories") | always (totals only when coaching not set up) | Today's intake against targets; no calm/ED hiding found in MacroRings.js or the screen | Card (when entries exist): "by meal" breakdown sheet | DiaryScreen.js:1996-2003; components/food/MacroRings.js:182-400 |
| 6 | "Set your targets first and Volyume can suggest meals that fit them." EmptyState | `loaded && coachingSetUp && !effectiveTargets` | prompt | "Set nutrition targets": ProfileTab>NutritionTargets | DiaryScreen.js:2011-2022 |
| 7 | "Share barcode fixes? ..." card | today only and consent offer pending (`showOffCard`) | Optional food-source sharing offer | "Not now" dismisses; "Sharing settings": ProfileTab>SettingsPrivacy | DiaryScreen.js:2031-2066 |
| 8 | "Want a nudge to log?" card | `mealReminderOfferVisible` (some missing days, targets set, reminders off, not dismissed) [hidden under calm/ED] | "A gentle reminder at your usual meal times can make logging easier..." | "Not now" dismisses; "Set up reminders": ProfileTab>NotificationSettings | DiaryScreen.js:2073-2111; lib/food/mealReminderOffer.js:48-76 |
| 9 | Skeleton rows / "This day did not load" EmptyState | `!loaded` / `loadError && no entries` | placeholders or retry | "Retry" | DiaryScreen.js:2113-2133 |
| 10 | One-time hint captions ("Your meals are in the diary. Mark each one eaten..." / "Tick meals off one by one as you eat...") | planned meals present, hint not yet dismissed | hint text | dismiss | DiaryScreen.js:2154-2181 |
| 11 | Meal sections, one card per meal (heading = meal name, e.g. "Breakfast"; right side "{kcal} kcal · {n} g protein" once something is eaten) | `loaded`, one per visible slot (meals per day preference plus added meals), same on empty days | Entries (EntryRow), usual-food chips, "Yesterday's {meal}" copy chip, hour's meal suggestion chip, seasonal "optional extras" line, planned row with "Mark as eaten", "Add food" button | "Add food": DiaryStack>FoodSearch{mealSlot, entryDate}; entry tap: food edit sheet (can enter multi-select); chips log in one tap; "Mark as eaten" confirms planned | DiaryScreen.js:2189-2229; components/food/MealSection.js:224, 318-368 |
| 12 | "Add another meal" outline button | not in selection mode | extends today's meal ladder by one | adds a slot | DiaryScreen.js:2234-2243 |
| 13 | Feature list in one bordered surface: "Meal builder / Build a day or week from your targets."; "Copy yesterday"; "Higher-calorie day" | `loaded && !selectionMode`. Copy yesterday only on an empty day whose yesterday has food. Higher-calorie day [hidden under open ED flag, and when targets were floored] | doors | Meal builder: DiaryStack>MealPlan{entryDate}; Copy yesterday: confirm then copy; Higher-calorie day: calorie bank sheet | DiaryScreen.js:2265-2297; :568 |
| 14 | "Water" row (stepper, target editable) | always | Water so far against target | +/- steppers, hold for 500 ml, value tap edits target | DiaryScreen.js:2299-2307; components/food/WaterRow.js:59-83 |
| 15 | "N planned meals for this day." banner | `plannedCount > 0 && !selectionMode` | planned-meal count | "Mark as eaten" (not on future days); "Clear" | DiaryScreen.js:2315-2346 |

Floating and bottom elements:
- Scan FAB (barcode glyph, "Scan barcode"): hidden while selecting; goes to DiaryStack>ScanBarcode{entryDate, mealSlot} (`DiaryScreen.js:2399-2416`).
- Selection toolbar ("N selected": Move, To today, Save meal, Delete): selection mode only (`:2418-2449`).
- "Day tools" sheet (options icon): Trends (FoodInsights), "Copy from another day", "Meals" (meals-per-day and names sheet), "Nutrition targets" (ProfileTab>NutritionTargets) (`components/food/DayToolsSheet.js:29-53`; `DiaryScreen.js:2469-2477`).
- Other sheets: food detail/edit, macro breakdown by meal, move, save-as-meal, copy-from-day, calorie bank, date picker (`DiaryScreen.js:2350-2518`).

---

## 4. Progress tab: AnalyticsScreen (`AnalyticsScreen.js`, 896 lines)

Single ScrollView; pull-to-refresh on (`:396`).

| # | Section / card (heading or first line) | Shows when | What it shows | Taps go to | Cite |
|---|---|---|---|---|---|
| 1 | Header "Progress" (default V brand mark, no actions) | always | Title | none | AnalyticsScreen.js:405 |
| 2 | "Your plan week" label, plan-week card: headline "{done} of {required}" + "sessions", subline "in week N of your plan · {Session} is next" or "every session done", seven day cells (Mon to Sun). With no plan: "{n} sessions so far this week" (subline "Block finished" when the block awaits a decision) | `!loadError`; card when data and plan context are read | Plan-week completion | Card: none (PlanWeekCard has no onPress) | AnalyticsScreen.js:413-431; lib/progress/planWeek.js:166-167, 207-209; components/PlanWeekCard.js:56-81 |
| 2a | ...inside the same card, under a hairline: volume strip "This week so far: N sets logged across M muscles · K below maintenance" (or "no sets logged"; recovery week shows a neutral note), segmented bar, legend with info tooltip | `hasData` | Weekly set volume status | Strip: ProgressTab>VolumeHeatmap{windowWeeks:1} | AnalyticsScreen.js:421-427, 717-766; lib/progress/volumeStrip.js:218-236 |
| 3 | "Your progress" label, one raised card with four pillar rows, each = label + verdict line + evidence line | always (skeleton while loading) | see 3a-3d | | AnalyticsScreen.js:437-500 |
| 3a | "Training" | always | Strength direction in the last month, named bests | ProgressTab>LiftProgress | AnalyticsScreen.js:453-459 |
| 3b | "Body" | always [figures withheld under calm/ED: trend/rate figures dropped, headline stays; `hooks/useWeightTrend.js:58`] | "No weigh-ins logged yet / Your trend starts with your first morning weigh-in." or "Trend {x}, {rate}" | ProgressTab>BodyMetrics; row is also the scroll target of the `focusWeightTrend` param | AnalyticsScreen.js:461-469; lib/progress/pillars.js:331-357 |
| 3c | "Progress photos" | `!visualPillar.suppressed` [hidden under calm/ED] | scan/photo state line | ProgressTab>ProgressPhotos | AnalyticsScreen.js:470-484 |
| 3d | "Recovery" | always | Per-muscle recovery estimate summary | ProgressTab>Recovery | AnalyticsScreen.js:490-497 |
| 4 | "Couldn't load your training trends" EmptyState | `loadError && no sets` | "Your training history is safe..." | "Retry" | AnalyticsScreen.js:512-521 |
| 5 | "No training trends yet" EmptyState | no load error, no sets | "Training charts appear here once sessions are logged. Weigh-ins, photos and scans are in the rows above." | none | AnalyticsScreen.js:530-536 |
| 6 | "Recent sessions" label + "All sessions" outline button, then session cards (routine name, date, minutes, difficulty word chip) | any recent sessions | Latest sessions | Card: ProgressTab>WorkoutSummary{...}; "All sessions": WorkoutHistory | AnalyticsScreen.js:541-593, 773-808 |
| 7 | Recap banner (newspaper icon, "your monthly recap" text, X) | first 7 days of a month, at least RECAP_GATE sessions, not dismissed | Monthly recap invitation | RecapStory; X dismisses | AnalyticsScreen.js:598-619 |
| 8 | "More" label, grouped list: "Consistency", "Volume heatmap", "Full history", "Recaps" (sub "N sessions to go" until unlocked), "Year of lifts" (only once a year of data exists) | always (Year of lifts conditional) | doors | Consistency; VolumeHeatmap; WorkoutHistory; RecapStory (or a toast when locked); YearOfLifts | AnalyticsScreen.js:627-662 |

Floating buttons: none.

---

## 5. Community tab: CommunityHubScreen (`CommunityHubScreen.js`, 1633 lines)

Header and segmented control (Feed / People / Groups / You) render first, then the chosen segment (`:1507-1513`). Feed is a FlashList; the other three are ScrollViews. Segment choice is remembered per device (`:99`). Rows marked "not joined" show only to someone with no Community profile.

Header and chrome:

| # | Element | Shows when | What | Taps go to | Cite |
|---|---|---|---|---|---|
| H1 | Header "Community" with three 34 dp glyphs | always (second and third glyph only when joined) | Title | Search glyph ("Search Community"): CommunitySearch; bell glyph ("Activity", amber dot if unseen): CommunityActivity; chat glyph ("Messages", unread count badge): CommunityConversations | CommunityHubScreen.js:790-827 |
| H2 | Segmented control "Community sections": Feed, People, Groups, You | always | tab switch inside the screen | switches segment | CommunityHubScreen.js:834-841 |

Notices (top of every segment, each only when its condition holds): moderation notice "Your Community access is suspended." / "Some of your Community access is restricted." with "Community rules" link (`:849-871`); "The Community rules have changed..." with "Read the rules" (`:875-892`); "Your sessions post to Community" one-time receipt with "Change who sees this" (CommunityPrivacy) and "Dismiss" [hidden under calm/ED] (`:897-927`); "Partner invites have moved" with "Find people" (CommunityFindPeople) and "Dismiss" (`:929-959`).

Segment Feed (default; list order):

| # | Section | Shows when | What | Taps go to | Cite |
|---|---|---|---|---|---|
| F1 | Hero "See what people are training" + "Join Community" / "Browse first" + privacy receipt (or the one-line "Not joined yet" row after Browse first) | not joined | invitation and the "what is shared" promise | CommunityJoin; "Browse first" hides hero | CommunityHubScreen.js:965-1015 |
| F2 | "Challenge" band: entrant rows (trophy icon, title, "{score} · {days left}") and "Challenge at your gym" invite row | entrant, or same-gym non-entrant with an invite | challenge status | Challenge{id}; ChallengeJoin{code} | CommunityHubScreen.js:1022-1046 |
| F3 | Caption lines "Nobody at your gym has posted yet. Showing everyone." / "Showing what you last saw. You are offline." | conditions in name | status | none | CommunityHubScreen.js:1058-1067 |
| F4 | Presence band (avatar stack, who is training now, first names) | joined and server returned it [hidden under calm/ED] | people training now | none | CommunityHubScreen.js:1071-1073; components/community/PresenceBand.js:29-58 |
| F5 | Feed controls card: row = scope name (Following / My gym / My groups / Everyone) with "{Newest|Most respected} first"; input-style well "Share something from your training"; or the join row when not joined | always | filter and compose entry | Row: "What you see" sheet (scopes, sort); well: "Share something" sheet (A note: CommunityCompose{kind:'note'}; Your last session: CommunityCompose{kind:'session'}); not joined: CommunityJoin | CommunityHubScreen.js:1078-1097, 1519-1568 |
| F6 | Post cards (PostRow, Respect action) | posts exist | feed posts | Post: CommunityPost{id}; author: CommunityProfile{handle}; Respect toggles | CommunityHubScreen.js:1166-1183 |
| F7 | Empty/failed states: "Follow a few people to fill this feed" + "Find people"; "Set your gym to see who trains there" + "Set gym"; "Join or start a group" + "Groups"; "Nothing posted yet. Yours could be first." + "Write a post"; "Could not load Community" / "You are offline" + "Try again" | by scope and load state | | CommunityFindPeople; CommunityEditProfile{openGymPicker}; Groups segment; compose or CommunityJoin; retry | CommunityHubScreen.js:1101-1164 |

Segment People (joined only):

| # | Section | What | Taps go to | Cite |
|---|---|---|---|---|
| P1 | Input-style well "Search people and groups" | search entry | CommunitySearch | CommunityHubScreen.js:1222-1226 |
| P2 | "Find people" row ("People who train like you, at your gym, near you or in your discipline") | | CommunityFindPeople | :1227-1233 |
| P3 | "Requests" row ("N people want to connect" / "No new requests") | | CommunityActivity | :1234-1244 |
| P4 | "Your gym" band: gym cohort row ("{n} trained today · {m} members") or "Set your gym / See who trains there" | | CommunityDimension{kind,key,label}; CommunityEditProfile | :1247-1261 |
| P5 | "Disciplines" band (cohort rows) | shown while loading or when cohorts exist | CommunityDimension | :1262-1272 |
| P6 | "Near you" band (area cohort rows) | cohorts exist | CommunityDimension | :1273-1281 |

Segment Groups (joined only):

| # | Section | What | Taps go to | Cite |
|---|---|---|---|---|
| G1 | "My groups" band (group rows with member and trained-today line, unread count) or the group-purpose line | hidden for a minor with no groups | CommunityGroup{id} | CommunityHubScreen.js:1289-1318 |
| G2 | "Invites" band ("Invited you to join", Decline / Accept) | pending invites | CommunityGroup{id}; accept/decline in place | :1319-1358 |
| G3 | "New group" row (hidden for minors) and "Browse open groups" row | always | CommunityGroupCreate; CommunitySearch{mode:'groups'} | :1359-1374 |

Segment You (joined only):

| # | Section | Shows when | What | Taps go to | Cite |
|---|---|---|---|---|---|
| Y1 | Your row ("You", week sessions metric, day dots, streak caption) plus progress strip | `!consistencyGated` [hidden under calm/ED] | your training week | CommunityProfile{userId}; strip: CommunityBoard{scope:'following', window:'week'} | CommunityHubScreen.js:1382-1404 |
| Y2 | "Host" band (host profile card, "Follow", "Not now") | host row rules pass and not dismissed | the Community host | CommunityProfile{handle}; Follow | :1405-1429 |
| Y3 | "You are the first here from {gym}." / "You are one of the first here." + invite button | summary answered with no cohorts | early-days line | native share sheet | :1430-1451 |
| Y4 | Account rows: "My profile" (avatar, @handle), "Followers and connections", "Privacy and sharing", "Training profile", "Community rules" | always (joined) | | CommunityProfile{userId}; CommunityFollowers; CommunityPrivacy; CommunityTrainingProfile; CommunityRules | :1452-1485 |

Floating buttons: none.

---

## 6. Coach tab: YouScreen (`YouScreen.js`, 693 lines)

Single ScrollView, no pull-to-refresh. Safety state is read (`:274-275`) and only changes the copy of the Weekly check-in row (`:115-122`); no row is removed under calm/ED.

| # | Section / card (heading or first line) | Shows when | What it shows | Taps go to | Cite |
|---|---|---|---|---|---|
| 1 | Header "Coach" + subtitle "Weekly coaching based on what you log." + settings gear (34 dp square, "Settings") | always | Title, subtitle | Gear: ProfileStack>Settings | YouScreen.js:333-347 |
| 2 | "Set up coaching" card (full) or row "Coaching isn't set up yet. Set up" | `!coachingSetUp && mode resolved` (full unless "Not now" applies) | Setup prompt | ProfileStack>CoachingSetup; "Not now" collapses to the row | YouScreen.js:349-356 |
| 3 | "Could not refresh Coach / Your saved profile stays unchanged. Tap to try again." | `loadError` | warning card | reloads | YouScreen.js:369-384 |
| 4 | Profile card: avatar, display name, "N completed sessions", focus line (phase - goal - "N days/week") | always | You | ProfileStack>AthleteProfile | YouScreen.js:393-416 |
| 5 | "Weekly coaching decision: {date}" card + "What your coach changed this week, what stayed the same, and why." | a completed decision exists for the current week | decision hero | ProfileStack>CoachOutput{weekStart} | YouScreen.js:436-463 |
| 6 | "Your body" label, row "Injuries & limitations" (live summary line) | always | HowYouTrain summary | ProfileStack>HowYouTrain | YouScreen.js:468-478 |
| 7 | "This week" label, three rows in one group: "Weekly check-in" (sub = "Answer a few questions so your coach knows how your week went." or readiness title such as "First check-in 19 July" / "Weekly check-in is open" / "First check-in needs more morning weights" [neutral wording under calm/ED]); "Coaching decision" (only when no completed decision this week but history exists; "Your latest coaching decision, kept here to look back on."); "Your week" ("Your training, eating, weigh-ins and your coach's decision, in one place.") | rows 1 and 3 always; row 2 conditional | | WeeklyCheckIn; CoachOutput; WeeklyStory | YouScreen.js:483-522 |
| 8 | Row "Community" ("Connect with other lifters and share your training progress.") in its own group, no heading | always | | CommunityTab root | YouScreen.js:527-536, 326-328 |
| 9 | "Setup" label: "Update goal and phase", "Nutrition targets", "Coaching reminders" | `coachingSetUp` only | goal/phase, targets, reminders | ProGoalSetup; NutritionTargets; CoachingReminders | YouScreen.js:542-566 |
| 10 | "Safety checks" label: "Goal lock" ("Set the conservative limit for cutting goals."), "Wellbeing check" ("Update the questions behind your safety checks.") | always | | GoalLockConsent{editMode:true}; WellbeingCheck | YouScreen.js:580-598 |

Floating buttons: none.

---

## 7. Settings: SettingsScreen (`SettingsScreen.js`, 153 lines)

Reached from the gear on the Coach header only (`YouScreen.js:338`). Header is a back header titled "Settings" (`components/SettingsPrimitives.js:93-103`). Six headings, rows below. No calm/ED handling. No floating buttons.

| # | Section / heading | Row (sub line) | Taps go to | Cite |
|---|---|---|---|---|
| 1 | Training | "Injuries & limitations" ("Injuries, pain, long-term conditions or disabilities that affect your training.") | HowYouTrain | SettingsScreen.js:30-37 |
| 1 | Training | "Coaching" ("Calmer coaching, session readiness and coaching preferences") | SettingsCoaching | :38-43 |
| 1 | Training | "Workout" ("Session length, default rest timer and rest alerts") | SettingsWorkout | :44-49 |
| 2 | Nutrition | "Nutrition targets" ("Your calorie and macro targets") | NutritionTargets | :51-58 |
| 2 | Nutrition | "Dietary needs" ("Diet, allergies and foods to avoid") | SettingsDietary | :59-64 |
| 3 | Reminders | "Notifications" ("Training reminder, getting-started nudges, welcome-back note, Community alerts, meal-log reminders and quiet hours") | NotificationSettings | :66-73 |
| 3 | Reminders | "Coaching reminders" ("Morning weigh-in, weekly check-in, missed check-in follow-up and planned-meal confirmation") | CoachingReminders | :74-79 |
| 4 | Display & accessibility | "Display" ("Appearance, text size, contrast, colour-blind palette, motion and haptics") | SettingsDisplay | :81-88 |
| 4 | Display & accessibility | "Units" ("Body weight and food energy") | SettingsUnits | :89-94 |
| 4 | Display & accessibility | "Home screen widget" ("Your next session, right on your home screen"), Android only | alert with how to add the widget | :95-106 |
| 5 | Privacy & data | "Your data" ("Sync, backup, import, export") | SettingsData | :108-115 |
| 5 | Privacy & data | "Privacy and legal" ("Consent, data sharing and policy") | SettingsPrivacy | :116-121 |
| 5 | Privacy & data | "Community" ("Your feed, people, groups and privacy") | CommunityTab root | :122-128 |
| 6 | Account & help | "Account" (sub = signed-in email) | SettingsAccount | :130-137 |
| 6 | Account & help | "Profile" ("Name, sex, height, date of birth and diet preference") | SettingsProfile | :138-143 |
| 6 | Account & help | "Help and about" ("Feedback, rating, version") | SettingsAbout | :144-149 |

---

## 8. Same content in more than one place

Facts only. "Screen > section" with the destination in brackets. Line cites are in the sections above unless added here.

### 8.1 Starting or resuming a session
- Today > hero "Start workout" [intent sheet, then ActiveWorkout] (HomeScreen.js:2991).
- Train > active plan card "Start next workout" [ActiveWorkout] (PlansScreen.js:1521).
- Today > activation banner (young accounts only) [starts next workout] (HomeScreen.js:3208).
- Today > hero "Workout in progress" [ActiveWorkout] and the tab-bar mini-bar [ActiveWorkout] (components/ActiveSessionMiniBar.js:145).
- Train > "Saved workouts" "Start" [ActiveWorkout] (PlansScreen.js:2157).
- Today > no-plan card "Start your first workout" [blank session]; Today > Workout options "Blank workout" [BuildWorkout].
- Today > last-session row "Repeat" (HomeLastSessionCard.js:84-93).
- Progress > plan-week card names the next session but has no tap (planWeek.js:207).

### 8.2 Next session name and plan position (block week)
- Today > hero eyebrow (plan label, recovery label) and session name (HomeScreen.js:2923-2941).
- Today > readiness chip line [Your block sheet] (HomeScreen.js:2576-2597).
- Train > active card "Week N of M" / "Recovery week..." / "Block finished" (PlansScreen.js:1479-1490).
- Progress > plan-week card "{done} of {required} sessions", "in week N of your plan · {Session} is next" (planWeek.js:207-209).
- Train > "Training blocks" row [MesocycleBuilder]; Today > "Your block" sheet (block definition); Train > info tooltip with the same block definition (`BLOCK_DEFINITION`, PlansScreen.js:1488).

### 8.3 Week complete
- Today > hero "Week complete" (HomeScreen.js:2882); Today > readiness chip "Every session done for this week." (HomeScreen.js:2335, `readinessSummary`); Train > "Week complete. Your next session is on Monday." (PlansScreen.js:1513); Progress > plan-week subline "every session done" (planWeek.js:208).
- "Do another session" appears on Today (hero, both completed states) and on Train (active card) with different destinations (Today: Workout options sheet; Train: PlanDetail).

### 8.4 Block finished and next-block decision
- Today > Today line "Block finished. Choose what comes next." [Plans] (lib/home/todayLineArbiter.js:63-64).
- Today > hero "Block complete" with "Choose what comes next" [Plans] (HomeScreen.js:2826-2851).
- Today > readiness chip line "Block finished. Sets stay as light as a recovery week until you choose what comes next." (HomeScreen.js:2333).
- Today > "Your block" sheet "Choose your next block" [Plans] (HomeBlockShapeSheet.js:77-81).
- Train > block advisor card post-recovery, two next-block options (PlansScreen.js:1748-1810); Train > active card "Block finished" (PlansScreen.js:1485).
- Progress > plan-week subline "Block finished" (no-plan branch) (planWeek.js:167).

### 8.5 Weekly volume status
- Progress > plan-week card volume strip and legend [VolumeHeatmap{windowWeeks:1}] (AnalyticsScreen.js:421-427).
- Progress > More > "Volume heatmap" [VolumeHeatmap] (AnalyticsScreen.js:631). Two doors to one destination on one screen.
- Today: no weekly-volume section is rendered. HomeScreen.js:3250 records that "This week's plan" moved to Progress; `calculateWeeklyVolume` on Today only feeds the reintroduction ramp line (HomeScreen.js:1488-1502).
- Train: no volume figure; block position only (8.2).

### 8.6 Recovery
- Today > Today line recovery occupant [Recovery detail sheet] and hero eyebrow recovery label (HomeScreen.js:2121-2124, 2547).
- Progress > "Recovery" pillar row [Recovery] (AnalyticsScreen.js:490-497); Progress > volume strip recovery-week note (volumeStrip.js:234).
- Train > block advisor card (in_recovery and early_deload states) (PlansScreen.js:1581-1600); Train > active card "Recovery week, week N of M".

### 8.7 Last session and history
- Today > last-session row [WorkoutHistory] (HomeLastSessionCard.js:57-62).
- Progress > "Recent sessions" cards [WorkoutSummary], "All sessions" [WorkoutHistory], More > "Full history" [WorkoutHistory] (AnalyticsScreen.js:546, 632). Two doors to WorkoutHistory on one screen.
- Coach > profile card "N completed sessions" [AthleteProfile] (YouScreen.js:408).
- Today > evidence pane "N training sessions logged" (lib/home/evidencePanel.js:126-136).
- Progress > "Training" pillar [LiftProgress]; Today > plateau banner [ExerciseDetail].

### 8.8 Weigh-in prompt and morning weight
- Today > weigh-in strip "Morning weight / Not logged yet / Log" (components/TodayStrip.js:262-310); after logging, the strip is removed and one row "Morning weight {x}" appears in the evidence pane (HomeScreen.js:2672; lib/home/evidencePanel.js:155). Progress accepts a `focusWeightTrend` param that scrolls to the Body pillar (AnalyticsScreen.js:257-264); the only sender found in screens is HomeScreen.js:2694, via the strip's logged state (not rendered by Home's gate).
- Today > evidence pane "N of 3 morning weigh-ins this week" (lib/home/evidencePanel.js:148).
- Progress > "Body" pillar: "No weigh-ins logged yet. Your trend starts with your first morning weigh-in." or trend figure [BodyMetrics] (lib/progress/pillars.js:333).
- Coach > "Weekly check-in" row sub-line carries weigh-in readiness text (e.g. "First check-in needs more morning weights") (YouScreen.js:108-151, 497-499).
- Settings > Reminders > "Coaching reminders" sub "Morning weigh-in..." (SettingsScreen.js:77); Coach > Setup > "Coaching reminders" (YouScreen.js:558-563). Same CoachingReminders destination.

### 8.9 Weekly check-in
- Today > Today line "Your weekly check-in is ready..." [WeeklyCheckIn] (todayLineArbiter.js:97-98).
- Today > evidence pane countdown to next check-in and "Since your check-in" title [Coach tab root] (HomeScreen.js:2506-2509).
- Coach > "This week" > "Weekly check-in" [WeeklyCheckIn] (YouScreen.js:494-501).
- Settings > Reminders > "Coaching reminders" (check-in reminders) and Coach > Setup > "Coaching reminders" (same destination).

### 8.10 Weekly coaching decision ("why")
- Today > Today line "This week's coaching decision. See why." / "Calories adjusted to N kcal. See why." [CoachOutput] (todayLineArbiter.js:78-90).
- Nutrition > "Targets updated. See why" chip [CoachOutput] (DiaryScreen.js:1978-1990).
- Coach > "Weekly coaching decision: {date}" card [CoachOutput] (YouScreen.js:436-463); Coach > "Coaching decision" row [CoachOutput] when no current decision (YouScreen.js:507-514).
- Coach > "Your week" [WeeklyStory].
- Tab bar: amber dot on the Coach tab for an unseen review (components/VolyumeTabBar.js:153).

### 8.11 Nutrition targets
- Today > Today line phase mismatch [NutritionTargets] (HomeScreen.js:2555-2559).
- Nutrition > no-targets EmptyState "Set nutrition targets" [NutritionTargets] (DiaryScreen.js:2011-2022); Nutrition > Day tools sheet "Nutrition targets" [NutritionTargets] (DayToolsSheet.js:51).
- Coach > Setup > "Nutrition targets" [NutritionTargets] (YouScreen.js:552-557).
- Settings > Nutrition > "Nutrition targets" [NutritionTargets] (SettingsScreen.js:53-58).
- Coach > Setup > "Update goal and phase" [ProGoalSetup] is the only entry to ProGoalSetup among these screens.

### 8.12 "Set up coaching" prompt (quick-start users)
- Today (HomeScreen.js:3121), Nutrition (DiaryScreen.js:1912, compact only), Coach (YouScreen.js:349). One shared component and one shared snooze record, three surface keys ('home', 'nutrition', 'coach_home') (components/CoachingSetupCard.js:28-33; lib/coachingSetup.js:66-76). Today and Coach use `openCoachingSetup` / `CoachingSetup`; Today's strip and evidence pane are replaced by this card while coaching is not set up.

### 8.13 Injuries & limitations
- Today > "Injuries & limitations" grouped rows (HomeScreen.js:3285-3369) [HowYouTrain] and the one-time offer card [HowYouTrainAdd] (HomeScreen.js:3105).
- Train > Plan tools > "Injuries & limitations" [HowYouTrain] and "Avoided movements" [AvoidedMovements] (PlansScreen.js:1883, 1915).
- Coach > "Your body" > "Injuries & limitations" [HowYouTrain] (YouScreen.js:471).
- Settings > Training > "Injuries & limitations" [HowYouTrain] (SettingsScreen.js:32).
- Four screens, one destination (registered in the Home, Plans, Progress and Coach stacks).

### 8.14 Plan change entry points
- "Update your plan" [PlanUpdate]: Today card (HomeScreen.js:2800), Train "Adjust training plan" card (PlansScreen.js:84-91), Train "Training style" row (:1457), Train block card "Change my training setup" (:1798-1809), plan-preview sheet equipment link (both screens).
- "Browse plans" [PlanLibrary]: Today no-plan EmptyState (HomeScreen.js:3066), Today "no sessions" EmptyState "Choose a different plan" (:3037), Train no-plan EmptyState (PlansScreen.js:1575), Train "Pick from the plan library" card.
- "Start with a plan" opens the same plan-preview sheet component on Today and Train (HomeScreen.js:3565; PlansScreen.js:2189), and both EmptyStates use near-identical copy (HomeScreen.js:3061; PlansScreen.js:1569).
- "Create your own" [ManualBuilder]: Train card (PlansScreen.js:99-104); Today plan-preview sheet link (HomeScreen.js:3577).

### 8.15 Community entry points
- Today > header "Community" pill (HomeScreen.js:2631) [CommunityTab].
- Today > Community row (HomeScreen.js:2638) [CommunityTab; Community people segment; share sheet].
- Today > "See who is training" intro card (HomeScreen.js:3169) [CommunityTab].
- Today > "Share this block" on the block-complete hero [CommunityCompose] (HomeScreen.js:2866-2879).
- Today > Challenge row [Challenge] (HomeScreen.js:3157).
- Coach > "Community" row (YouScreen.js:527-536) [CommunityTab].
- Settings > Privacy & data > "Community" (SettingsScreen.js:123) [CommunityTab].
- Community tab itself, with its own dot (VolyumeTabBar.js:154).
- Progress and Nutrition: none (AnalyticsScreen.js:623-626 states the Partners tile stays removed).

### 8.16 Community unread / activity signals
- Today pill dot or message badge (CommunityHeaderAction.js:78-95); Community header bell dot and chat badge (CommunityHubScreen.js:799-824); tab-bar Community dot (VolyumeTabBar.js:154). All three read the cached Community `me` (unseen activity, unseen messages).

### 8.17 Gym challenge
- Today > "Challenge" row [Challenge{id}] (HomeScreen.js:3157-3162).
- Community > Feed > "Challenge" band [Challenge{id}], plus gym invite row [ChallengeJoin] (CommunityHubScreen.js:1022-1046).

### 8.18 Community profile, privacy and sharing
- Community > You > "Privacy and sharing" [CommunityPrivacy] (CommunityHubScreen.js:1470); join-receipt notice "Change who sees this" [CommunityPrivacy] (:911).
- Settings > Privacy & data > "Privacy and legal" [SettingsPrivacy] (SettingsScreen.js:116); Nutrition > "Share barcode fixes?" card "Sharing settings" [SettingsPrivacy] (DiaryScreen.js:2047-2056).
- Three different "profile" doors: Coach profile card [AthleteProfile] (YouScreen.js:393), Settings "Profile" [SettingsProfile] (SettingsScreen.js:138), Community > You "My profile" [CommunityProfile] (CommunityHubScreen.js:1461).

### 8.19 Notification and reminder settings
- Settings > Reminders > "Notifications" [NotificationSettings] and "Coaching reminders" [CoachingReminders] (SettingsScreen.js:68-79).
- Coach > Setup > "Coaching reminders" [CoachingReminders] (YouScreen.js:558).
- Nutrition > "Want a nudge to log?" > "Set up reminders" [NotificationSettings] (DiaryScreen.js:2092-2108).
- Today > intent sheet text points to "Settings, Coaching" (HomeScreen.js:3557, text only, no link).

### 8.20 Settings shortcuts located outside Settings
- Coach header gear [Settings] (YouScreen.js:338). Nutrition > barcode card [SettingsPrivacy] and reminder offer [NotificationSettings]. Settings rows that point back at Coach-tab content: "Nutrition targets", "Coaching reminders", "Injuries & limitations" (same destinations as Coach > Setup / Your body).

### 8.21 Food logging adherence
- Today > evidence pane "Food logged on N of the last 7 days" (lib/home/evidencePanel.js:166-167) while the log itself is on Nutrition; Coach > "Your week" blurb names eating (YouScreen.js:518).

### 8.22 Duplicate doors inside a single screen
- Nutrition: "Trends" header pill and Day tools "Trends" both [FoodInsights] (DiaryScreen.js:1903, 2472). "Copy yesterday" feature row and Day tools "Copy from another day" are separate actions.
- Progress: volume strip and "Volume heatmap" row [VolumeHeatmap]; "All sessions" button and "Full history" row [WorkoutHistory]; recap banner and "Recaps" row [RecapStory].
- Today: three rows to HowYouTrain (HomeScreen.js:3292, 3310, 3328); three Community doors (pill, row, intro card); the hero "Options" sheet "View workout" opens PlansStack>RoutineDetail (components/HomeChangeWorkoutSheet.js:70-74) while Train rows open PlanDetail.
- Community: header search glyph, People "Search people and groups" well, and "Browse open groups" all reach CommunitySearch (CommunityHubScreen.js:797, 1225, 1372); header bell and People "Requests" both reach CommunityActivity (:803, 1240); "Find people" appears in People, the legacy notice and the Following empty state (CommunityFindPeople); "My profile" and the You row both reach CommunityProfile{userId} (:1392, 1463); "Share something" well and the "Write a post" empty-state button both open compose (:1090, 1128).

---

## 9. Header and global actions

| Tab | Header content | Right-slot action(s) and destination | Cite |
|---|---|---|---|
| Today | Title "Today" (h1) | One "Community" pill (people icon + word, amber dot or message count): CommunityTab root. Replaces the V brand mark on this tab only | HomeScreen.js:2631; components/community/CommunityHeaderAction.js:53-95 |
| Train | Title "Train" | Default V brand mark, not tappable | PlansScreen.js:1403; components/ScreenHeader.js:57-59 |
| Nutrition | Title "Nutrition" | "Trends" pill (analytics icon + word): DiaryStack>FoodInsights | DiaryScreen.js:1896-1907; components/HeaderAction.js:28-60 |
| Progress | Title "Progress" | Default V brand mark, not tappable | AnalyticsScreen.js:405 |
| Community | Title "Community"; segmented control Feed / People / Groups / You under it | Three glyphs: Search (CommunitySearch); Activity bell (CommunityActivity, dot when unseen; joined only); Messages (CommunityConversations, count badge; joined only) | CommunityHubScreen.js:790-841 |
| Coach | Title "Coach" + subtitle "Weekly coaching based on what you log." | Settings cog (34 dp square): ProfileStack>Settings. No avatar in the header; the avatar is in the profile card below | YouScreen.js:333-347, 393-416 |
| Settings | Back header titled "Settings" (back arrow, no right action) | none | components/SettingsPrimitives.js:93-103 |

Global elements shared across tabs:
- Bottom tab bar with six tabs, selection haptic on change, re-tap pops the tab's stack to root (`RootNavigator.js:792-800`, per-stack `tabPress` listeners e.g. `:590-600`).
- Amber dots on the Coach and Community tabs (`components/VolyumeTabBar.js:153-154`).
- Active-session mini-bar above the tab bar while a workout is active and ActiveWorkout is not focused (`components/VolyumeTabBar.js:125`; `components/ActiveSessionMiniBar.js:145`).
- Scan FAB exists only on Nutrition (`DiaryScreen.js:2399`); no other tab has a floating button.
- What's-new sheet mounts on Today only (`HomeScreen.js:3582`).
- Toasts and alerts are app-wide (not inventoried per screen).

---

## 10. Unresolved

- [unclear] Whether the Today-line "Calories adjusted to N kcal" occupant can carry a calorie figure while an ED flag is open; Home's own gate (`HomeScreen.js:2374`) has no safety check, any suppression would be upstream in the coach output (not read).
- [unclear] Exact line text of the Today readiness chip variants other than the two fixed strings at `HomeScreen.js:2333-2335` (the rest comes from `lib/readinessSummary.js`, not read).
- [unclear] The exact line shown by the Community presence band (`presenceLine`, `lib/community` not read); recorded here only as "who is training now".
