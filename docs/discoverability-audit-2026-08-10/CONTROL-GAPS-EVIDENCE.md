# Campaign 3 — Phase 4 / Phase 8 / Phase 10 verification evidence

**Auditor lane:** Phase 4 (re-audit the historical hard-to-find controls),
Phase 8 (control-gap classification), Phase 10 (hidden gestures).
**Baseline:** branch `claude/campaign3-discoverability` = main `9aae57cb`
(head `4fa57339`, coordination-docs only).
**Authority:** founder Campaign 3 order, PHASE 4 / PHASE 8 / PHASE 10 /
FOUNDER RULINGS sections.
**Method:** every claim below is traced to current main by file:line. Product
intent was sought in the D-register
(`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`), the locked
docs (`docs/NOTIFICATIONS_LOCKED.md`), pinned tests, shipped UI copy and
sibling controls. No intent was inferred from the existence of a storage key.
**Bounds observed:** read-only outside this file. Nothing committed, pushed or
stashed. No cardio surface inspected or proposed. No new feature proposed.

Tab names used below are the shipped titles from
`src/navigation/RootNavigator.js:638-642`: Today, Train, Progress, **Coach**
(= `YouScreen`).

---

## Section 1 — Phase 4: the historical "hard-to-find controls" against current main

### Summary table

| # | Control | Still live? | Entry points today (all) | Verdict |
|---|---|---|---|---|
| 1 | Goal lock | LIVE | `YouScreen.js:556-561` only | C — advanced but reachable; correctly placed. No change. |
| 2 | Manual training landmark/range editor | LIVE | `AnalyticsScreen.js:743` → `VolumeHeatmapScreen.js:709-717` | C — reachable, but the ONLY route is data-gated (`AnalyticsScreen.js:730`). Contextual shortcut warranted. |
| 3 | Per-day calorie offsets | LIVE | `SettingsScreen.js:71-78` only | C — canonical location correct; contextual shortcut warranted from the Diary target it changes. |
| 4 | Quiet hours | LIVE — **historical finding is STALE (fixed by E2.2)** | `SettingsScreen.js:88-93` → `NotificationSettingsScreen.js:754-804` | A — discoverable. One residual defect: a stale doc pointer. |
| 5 | Push-budget interaction | LIVE, internal | none (no UI anywhere) | E — internal by design, but a Phase 7 explanation gap (see below). |
| 6 | kJ display | LIVE | `SettingsScreen.js:101-106` → `SettingsDisplayScreen.js:98-121` | A/C — reachable but filed under a label a kJ-seeker will not predict. |
| 7 | Cycle opt-in | LIVE — **historical finding is STALE** | `SettingsScreen.js:41-46` → `SettingsCoachingScreen.js:278-292` | D — state-gated by design (female only). Correct. |
| 8 | Diet preference filtering | LIVE — **historical finding is STALE (already fixed)** | `SettingsScreen.js:81-86` **and** `MealPlanScreen.js:220-225` | A — canonical + contextual, single writer. Exemplar. |
| 9 | Travel-mode generator | LIVE — **historical finding is STALE / WRONG** | `BuildWorkoutScreen.js:246-250` | B — contextually discoverable, correctly placed. Not legacy. |
| 10 | Rest-timer in-app beep control | **DOES NOT EXIST** | none | See Phase 8 gap #1 — FOUNDER RULING REQUIRED. |

### 1.1 Goal lock

- **Live?** Yes. Screen `src/screens/GoalLockConsentScreen.js:39`; route
  registered `src/navigation/RootNavigator.js:123, 572`.
- **Write path:** `GoalLockConsentScreen.js:83` → `setGoalLockAdvanced(user.id,
  advanced)` (`src/lib/database.js`), plus telemetry
  `GoalLockConsentScreen.js:84-86`. Read back in edit mode at
  `GoalLockConsentScreen.js:74-77` (`getGoalLockAdvanced`).
- **Engine consequence:** raises the ED-pattern threshold 2 → 3 signals
  (`GoalLockConsentScreen.js:27-31` copy; `src/lib/edPatternDetector.js`), and
  gates day-calorie cycling (`src/lib/coachingGoals.js:215-216`
  `dayCalorieCyclingAllowed({ goalPhase, goalLockAdvanced, trainingGoal })`).
  Consumed on the coach screen at `CoachOutputScreen.js:1681, 1794, 1862`.
- **Entry points today (exhaustive):** ONE —
  `src/screens/YouScreen.js:556-561`, Coach tab, section "Safety checks"
  (`YouScreen.js:553`), row label "Goal lock", sub "Set the conservative limit
  for cutting goals.", `navigate('GoalLockConsent', { editMode: true })`. Pro
  only (`YouScreen.js:551` `{isPro ? …}`). The onboarding interstitial that
  used to call it was removed by founder order 2026-05-29
  (`GoalLockConsentScreen.js:18-21`).
- **When would a user look, can they find it from there?** A user looks after
  a hold ("why did my calories stop coming down?") or when setting an
  aggressive cut. The Coach tab's "Safety checks" group is exactly that
  mental model, and the coach screen already names the goal-lock extension in
  the lockout copy (`CoachOutputScreen.js:770, 782`
  `ED_PATTERN_LOCKOUT_COPY.bodyGoalLockExtension`). Findable.
- **Obscurity intentional?** Yes — advanced, safety-adjacent, and deliberately
  removed from onboarding by founder order. Classification **C**.
- **Canonical editor location verdict:** correct where it is. Do not move.
- **Contextual shortcut warranted?** No. The lockout copy already names it and
  a shortcut from an ED-adjacent hold surface would be an inducement to raise
  a safety threshold at the exact moment the safety threshold fired. Leave as
  is.

### 1.2 Manual training landmark / range editor

- **Live?** Yes. `src/screens/VolumeHeatmapScreen.js:66`; route
  `RootNavigator.js:93, 455, 510`.
- **Write path:** `VolumeHeatmapScreen.js:248` `saveLandmarks()` →
  AsyncStorage `@volyume_landmarks_${user.id}` (`:268`). Reset path
  `:300-311`. Read/resolution precedence manual > adapted(Pro) > research at
  `src/lib/effectiveLandmarks.js:15, 33`; screen state at
  `VolumeHeatmapScreen.js:206-216, 321`.
- **Entry points today (exhaustive):** ONE — `AnalyticsScreen.js:743`
  (`VolumeSummaryStrip … onPress={() => navigation.navigate('VolumeHeatmap')}`),
  i.e. Progress tab → "This week's volume" strip. The editor itself is a
  second step inside that screen: `VolumeHeatmapScreen.js:709-717` button
  "Edit volume targets", with "Reset to defaults" at `:721-729`.
  No other `navigate('VolumeHeatmap')` call site exists in `src/`.
- **Data gate on the only route:** the whole section is wrapped in
  `{hasData && (` at `AnalyticsScreen.js:730`, and `hasData = allSets.length > 0`
  (`src/hooks/useProgressData.js:502`). A user with no logged sets has **no
  path at all** to the heatmap or the editor.
- **Campaign 2 disclosure copy (present, verified):**
  `VolumeHeatmapScreen.js:656-663` — D93 Phase 7 note that a manual override
  also pauses learned-range replay: "Your numbers set the targets from here; a
  block already underway keeps its written plan. While your own settings are
  in place, finished blocks don't teach the ranges the app learns for you."
- **When would a user look?** When a coached weekly target feels wrong for a
  muscle, or when they want to cap volume on a lagging/injured area — i.e.
  from a training or coaching surface, not from Progress.
- **Obscurity intentional or accidental?** The two-step depth is *intentional*
  (the founder order forbids exposing MEV/MAV/MRV as first-class power-user
  controls). The *route* is accidental: the only door is a data-gated card on
  a stats screen, and a user who thinks "training preference" will look on the
  Train or Coach tab and find nothing.
- **Canonical editor location verdict:** keep the editor inside
  `VolumeHeatmapScreen` (it is the surface that shows the consequence). Do not
  move it into Settings — that would create a second writer and violate the
  order's "no giant Settings dumping ground" bound.
- **Contextual shortcut warranted?** YES, exactly one, per the order's THIRD
  PRODUCT LAW ("if a manual training range changes adaptive coaching, the
  relevant training surface should make the existence of the manual control
  discoverable"). Named surface: the **Coach tab training/volume section**
  (`YouScreen.js`, alongside the existing training rows) or the volume
  block on `AnalyticsScreen.js` made non-data-gated. Recommended: a single row
  on the Coach tab navigating to `VolumeHeatmap` — one destination, no forked
  state, no new writer. Phase 9 build decision.

### 1.3 Per-day calorie offsets

- **Live?** Yes. `src/screens/PerDayTargetsScreen.js:30`; route + Pro guard
  `RootNavigator.js:211` (`withProGuard(…, 'Per-day targets')`), `:559`.
- **Write path:** the screen imports the store from
  `src/lib/food/perDayTargets.js:20`; sync table
  `src/lib/sync/tables/perDayTargetOffsets.js:48, 108` (note `:9` — "clear the
  target" writes zeros, never deletes the row).
- **Engine consequence:** `src/lib/food/effectiveTargets.js:34, 43-48` shifts
  kcal via carbs on an otherwise-plain day, clamped by `floorKcal`
  (`effectiveTargets.js:30`). ED-safety floor is enforced at the clamp, not by
  the screen alone.
- **Entry points today (exhaustive):** ONE — `SettingsScreen.js:71-78`, label
  "Per-day targets", sub "Plan a different calorie target for each weekday",
  Pro-gated (`SettingsScreen.js:70`). Settings itself is reached from the
  Coach tab gear `YouScreen.js:332` or `AthleteProfileScreen.js:618`.
- **Consequence surface with NO link back:** the Diary reads the offset every
  day — `DiaryScreen.js:43` (import), `:430-438` (`loadPerDayOffsets`,
  `offsetForDate`), `:455-456` (`resolveEffectiveTargets(… perDayOffsetKcal …)`).
  `DiaryScreen.js:425-427` even comments that the diary re-reads on focus "so
  an edit in the Per-day targets screen is reflected". There is no navigation
  from Diary or `NutritionTargetsScreen` to `PerDayTargets`; the only
  `navigate('PerDayTargets')` in `src/` is `SettingsScreen.js:76`.
- **When would a user look?** Standing on the Diary day whose target looks
  different, or on the nutrition target screen. Neither offers the door.
- **Obscurity intentional?** Advanced, yes (Phase 12 territory) — but the
  *silent* effect is the defect: a Thursday target can differ from a Wednesday
  target with nothing on the Diary explaining why or where to change it.
- **Canonical editor location verdict:** keep in Settings (Pro, advanced).
- **Contextual shortcut warranted?** YES. Named surface: the **Diary target
  row / target editor** (`DiaryScreen.js` around the effective-target render
  at `:455`), or `NutritionTargetsScreen`. Order's THIRD PRODUCT LAW, second
  worked example verbatim: "If daily offsets materially change targets, can
  the user find them from the target they are changing?" One link to the
  canonical screen; no second writer.

### 1.4 Quiet hours — historical finding is STALE

- **Live and fully controllable.** Store `src/lib/notifications/quietHours.js`
  (`QUIET_HOURS_KEY = '@volyume_quiet_hours_v1'`, `:18`; `getQuietHours` `:35`;
  `setQuietHours` `:50-52`).
- **Single writer:** `NotificationSettingsScreen.js:522-525`
  (`persistQuietHours`). No other `setQuietHours` call site in `src/` outside
  the module and its barrel re-export (`src/lib/notifications/index.js:79`).
  ONE OWNER PER SETTING is satisfied.
- **UI:** `NotificationSettingsScreen.js:754-804` — section label "Quiet
  hours" (`:755`), on/off Switch (`:761-769`), start/end time pickers
  (`:773-796`), and the relationship explanation the order asks for at
  `:799-803`: "A reminder that would land inside this window waits until it
  ends. Applies to every reminder Volyume schedules."
- **Entry points today (exhaustive):** `SettingsScreen.js:88-93` — "Notifications
  and reminders", sub "Training, meals, check-ins and **quiet hours**" (the
  sub-label names it, so it is findable from the Settings index without
  entering); plus a conditional deep-link from
  `ProSetupCompleteScreen.js:268` when the notification permission is not
  granted.
- **The screen comment records the history:** `NotificationSettingsScreen.js:54-56`
  — "E2.2 (dossier C18): quiet hours had a setter but no settings UI."
  **That is the historical finding, and it has been fixed.**
- **Residual defect (documentation, not code):** `docs/NOTIFICATIONS_LOCKED.md:19-20`
  still says quiet hours are "user-configurable in You → Diary preferences".
  That location does not exist; the live location is Settings → Notifications
  and reminders. A locked doc pointing at a dead location is a
  discoverability hazard for future work. **Recommend a one-line doc
  correction** (does not touch notification semantics, so Campaign 1 is not
  reopened).
- **Truth check (order Phase 20):** the copy claims "every reminder". Two
  founder-accepted exceptions exist and are recorded:
  `docs/NOTIFICATIONS_LOCKED.md:305-318` — the rest-finished alert does NOT
  respect quiet hours or the push budget. The Phase 7/20 question of whether
  "every reminder Volyume schedules" is therefore over-claimed is flagged
  here for the Phase 7 lane; it is not a Phase 4 discoverability defect.
- **Classification:** A. Canonical editor correct. No shortcut needed.

### 1.5 Push-budget interaction

- **Live and entirely internal.** `src/lib/notifications/budget.js:34-35`
  (`EVENT_DAILY_CAP = 2`, `EVENT_WEEKLY_CAP = 8`), fixed collision priority
  `:42-57`, orchestrator `requestEventPushSlot` `:235`. Authority recorded in
  the module header `:1-31` ("NOTIFICATIONS_LOCKED.md proposed addendum,
  2026-06-12, founder decision 5 / gap G6").
- **Call sites (all engine-side, no UI):** `scheduler.js:543, 642, 736, 854,
  967, 1053, 1122, 1336, 1379, 1469, 1500, 1530`.
- **Entry points today:** NONE, and none should exist. It is a delivery
  policy, not a preference. Classification **E — internal**. The order's
  Phase 2 rule applies: do not create a control merely because a key exists.
- **Discoverability consequence that IS in scope (Phase 7 question "Can they
  understand why a notification may not arrive?"):** a user can have every
  toggle ON and still not receive a push, because the daily cap dropped it by
  priority (`budget.js:42-57`). No copy anywhere in
  `NotificationSettingsScreen.js` mentions any frequency limit (grepped: no
  "at most" / "per day" / "limit" copy). This is an *explanation* gap, not a
  *control* gap. Recommended treatment: one calm sentence in the notification
  settings bottom note, no new control. Hand to the Phase 7 lane.
- **No founder ruling required.**

### 1.6 kJ display

- **Live.** Store field `useAppStore.js:1925`
  (`energyUnit: 'kcal'` — "food-UI energy DISPLAY unit: 'kcal' | 'kj'.
  Display-only … stored values, targets + the coaching engine stay in kcal").
- **Single writer:** `SettingsDisplayScreen.js:113`
  `setAccessibilityPref('energyUnit', opt.value)`; options defined `:19-25`.
- **Copy is truthful (Phase 20 check passes):** `SettingsDisplayScreen.js:101-103`
  — "How food energy is shown. kJ (kilojoules) matches the energy on EU food
  labels. This changes the display only. Your targets and coaching stay the
  same." This is exactly what the order demands of a display-only unit.
- **Read sites (broad, reactive):** `src/lib/format.js`,
  `src/lib/food/diaryDaySummary.js`, `src/lib/coachApplyView.js`, and the
  whole `src/components/food/*` family (`MacroRings.js`, `EntryRow.js`,
  `FoodRow.js`, `FoodDetailSheet.js`, `MealSection.js`, `CuratedMealSheet.js`,
  `QuickAddSheet.js`, `SavedMealDetailSheet.js`, `CalorieBankSheet.js`,
  `TodaysPlateTeaser.js`, `MacroBreakdownSheet.js`), plus
  `NutritionTargetsScreen.js`, `PerDayTargetsScreen.js`, `BodyMetricsScreen.js`,
  `WeeklyCheckInScreen.js`, `MyMealsScreen.js:204`.
- **Entry points today (exhaustive):** ONE — `SettingsScreen.js:101-106`,
  label "**Display and accessibility**", sub "Text size, contrast, motion".
- **Findability defect:** the row's label and sub say *nothing* about energy
  units. A user looking for kJ thinks "nutrition" or "units", and the sibling
  row that literally says "units" is "**Workout & units**"
  (`SettingsScreen.js:55-57`) — which owns body-weight units, not food energy.
  So the one word a kJ-seeker would scan for points at the wrong screen.
- **Obscurity intentional?** No — accidental, a labelling artefact.
- **Canonical editor location verdict:** the setting belongs with the other
  display preferences. Do NOT move it and do NOT create a second writer in a
  nutrition screen. **Fix the sub-label** so the row advertises what it owns
  (Phase 13 "names match what users would look for"), and consider one
  contextual link from a nutrition surface to the canonical screen
  (Phase 9 / Phase 14 lane).
- **Classification:** A (a normal user may reasonably seek it any time), with
  a label defect.

### 1.7 Cycle opt-in — historical finding is STALE

- **Live, with a writer.** Preference module `src/lib/cyclePrefs.js`:
  `CYCLE_TRACKING_KEY = '@volyume_cycle_tracking'` (`:18`), `getCycleTracking`
  (`:20`), `setCycleTracking` (`:28`), pure gate
  `shouldShowCycleQuestion(sex, enabled)` (`:37-39`).
- **Canonical editor:** `SettingsCoachingScreen.js:278-292` — row "Cycle
  tracking", sub "Adds an optional weekly check-in question so the coach can
  steady targets around your period.", Switch → `toggleCycleTracking`
  (`:80-84`) → `setCycleTracking`. Hydrated at `:104`. **Only writer in `src/`.**
- **State gate on the row itself:** `SettingsCoachingScreen.js:278`
  `{bioSex === 'female' && (` — correct, and it matches the pure rule at
  `cyclePrefs.js:37-39` so the row and the question can never disagree.
- **Entry point:** `SettingsScreen.js:41-46` → Settings → Coaching.
- **Consequence surface:** `WeeklyCheckInScreen.js:49` (import), `:268`
  (`getCycleTracking`), `:345` (`shouldShowCycleQuestion(bioSex, cycleEnabled)`),
  answer persisted `:782` (`cycleOverride: showCycle && cycle === 'yes'`),
  round-tripped `:531`. Engine reads `cycleOverride` at
  `src/lib/weeklyCoach.js:754, 942, 962, 1305, 1513`; annotation module
  `src/lib/cyclePhase.js:35-51`; render `CoachOutputScreen.js:2755-2758`.
  Local-only by design and excluded from sync (`src/lib/sync.js:1349`,
  "menstrual-cycle data (Article 9)").
- **Privacy note:** `cyclePrefs.js:1-14` records this as the founder-asked
  extra Article 9 gate, off by default on every device, deliberately unsynced.
  Do not "fix" the per-device default.
- **Classification:** **D — state-gated by design.** Correctly hidden for
  users whose recorded biological sex is not female; correctly opt-in.
  Canonical editor location correct. No shortcut warranted — a contextual
  prompt inside the weekly check-in would be an Article 9 nudge.
- **One residual wording note (no action proposed here):** `cyclePrefs.js:34-36`
  says "the feature is opted in AND the recorded biological sex is female. Pure
  so **both screens** share one rule" — both screens do exist
  (`SettingsCoachingScreen.js:278`, `WeeklyCheckInScreen.js:345`), so the
  comment is accurate. Recorded because an earlier reading of a partial grep
  suggested a missing writer; it is present.

### 1.8 Diet preference filtering — historical finding is STALE (already fixed)

- **Live.** Shared editor component
  `src/components/food/DietaryPreferencesEditor.js:40`.
- **Two render sites, ONE writer:** `SettingsDietaryScreen.js:2, 17` (canonical)
  and `MealPlanScreen.js:25` rendered from the inline sheet
  (`MealPlanScreen.js:294-299, 1483-1488`). Both mount the *same* component,
  which writes through the store, so there is no forked state. The header
  records the founder ask that produced it:
  `DietaryPreferencesEditor.js:32-36` ("Extracted out of SettingsDietaryScreen
  (founder ask 2026-07-10)… both call sites").
- **Contextual discoverability at the point of consequence:** `MealPlanScreen.js:220-225`
  "Dietary needs" row → opens the inline sheet; live summary of the current
  diet/allergen state at `MealPlanScreen.js:119-137` (`dietaryNeedsSummary`)
  and a chip at `:139-161` (`dietaryChipInfo`) whose comment cites "Campaign
  item 4 (dietary-needs discoverability)" and states the chip surfaces the row
  "rather than staying invisible, since discoverability is [the point]".
- **Engine consequence proven (Phase 20 style):** `src/lib/food/mealPlanService.js:106`
  `diet: p.dietPreference || 'omnivore'` — the meal generator really does read
  the stored preference. Allergen filtering is enforced at every addition
  render site (`MealSection.js:62-63`, `CuratedMealSheet.js:40, 74-76`,
  `mealAdditions.js:23-31`, `mealSwap.js:19`).
- **Store write paths:** `useAppStore.js:1799-1804` (`dietPreference`,
  per-field stamp) and `:1858` (allergens MUST go through
  `setAllergenExcludes`, Campaign 1 P0-3 note at `:70-75`).
- **Entry points today:** `SettingsScreen.js:81-86` ("Dietary needs", sub
  "Diet, allergies and foods to avoid", Pro) **and** `MealPlanScreen.js:220-225`.
- **Classification:** **A**, and this is the exemplar pattern the rest of
  Campaign 3 should copy: one stored preference, one canonical editor, one
  contextual surface that reuses the same editor rather than duplicating it.
  No change needed.

### 1.9 Travel-mode generator — historical finding is STALE / WRONG

- **The historical claim is refuted by current main.** `docs/_FULL-APP-PRODUCT-MAP.md:10509-10513`
  records U6 as "I found no screen, navigation route, or Settings row that
  invokes it … PLANNED-DOCUMENTED-ONLY or LEGACY-UNREACHABLE, but I did not
  exhaustively grep every call site and will not assert it." It is live.
- **Live, reachable, labelled:** `src/screens/BuildWorkoutScreen.js:22`
  (`import { generateTravelPlan } from '../lib/travelMode'`), trigger
  `BuildWorkoutScreen.js:246-250` — a visible chip with an aeroplane icon,
  visible text "Travel / hotel gym", chevron, and
  `accessibilityLabel="Travel or hotel gym mode"`. Sheet at `:405-441`
  (title `:414`, equipment radiogroup `:416-429` bodyweight / dumbbells /
  hotel gym, "Create workout" `:434-439`). Apply path `:196-222`
  (`generateTravelPlan({ equipment, daysPerWeek: 4, splitType: 'full_body' })`
  at `:200`).
- **Generator:** `src/lib/travelMode.js` — pure, no I/O (`:1-9`).
- **Entry point to the host screen:** `HomeChangeWorkoutSheet.js:86`
  `navigation.navigate('BuildWorkout')` — the only `navigate('BuildWorkout')`
  in `src/`, i.e. Today tab → change today's workout → build your own.
- **Is obscurity intentional?** Yes and correctly so. The sheet copy at `:415`
  states the contract: "Volyume will build a full-body workout that keeps you
  moving **without changing your plan**." That is a contextual, state-relevant
  affordance — it belongs on the build-a-session surface and nowhere else.
  Classification **B — contextually discoverable**.
- **Canonical location verdict:** correct. **No Settings row, no shortcut,
  no resurrection work needed — it was never dead.**
- **Action:** correct the product map's U6/F-12-adjacent entry when the map is
  next touched. No code change.

### 1.10 Rest-timer in-app beep control

- **The control does not exist.** Full trace in Section 2, gap #1.
- **Phase 4 verdict:** **G — UNCLEAR PRODUCT INTENT → FOUNDER RULING
  REQUIRED.** Do not invent an entry point.

---

## Section 2 — Phase 8: control-gap classifications with evidence

### Gap #1 — `restSound` beeps with no mute → **D. FOUNDER RULING REQUIRED**

**Current behaviour (traced).**

- Sound production: `src/lib/restSound.js` synthesises four WAV beeps at
  `:96-101` (660 Hz / 770 Hz / 880 Hz / 1100 Hz "GO"), preloads them
  `:103-147`, plays via `playRestBeep(key)` `:154-166`.
- Fired unconditionally by the rest timer:
  `src/components/RestTimer.js:13` (import), `:255` (`preloadRestBeeps` when
  the timer becomes active), `:300` (`playRestBeep('three')`), `:303` (`'two'`),
  `:306` (`'one'`), `:309` (`'go'`), and `:240` (`'go'` again on the
  return-to-foreground catch-up path). **No branch anywhere reads any
  preference before playing.**
- The beep deliberately defeats the OS silent switch:
  `restSound.js:114-124` sets `playsInSilentModeIOS: true` with the comment
  "Without setAudioModeAsync, iOS mutes synthesised audio when the ringer
  switch is silent, which is most lifters at the gym." So an iOS user who
  silences their phone still hears it. Android ducks other audio
  (`shouldDuckAndroid: true`, `:121`).
- The only related setting is a *different* thing: "Rest finished alert"
  (`SettingsWorkoutScreen.js:164-173`), store field `restEndAlertEnabled`,
  which gates the **OS notification** only — `RestTimer.js:273`
  (`if (!useAppStore.getState().restEndAlertEnabled) return;`) guards the
  Android exact-alarm prompt, not the beeps. The rows at `:300-309` are
  outside it.

**Evidence searched for product intent (the order forbids inferring from a key).**

- **UI copy — points AWAY from a mute.** `SettingsWorkoutScreen.js:165-166`,
  sub-label verbatim: "Sound and vibrate when your rest ends, even with the
  phone locked. **In-app cues are unaffected.**" The shipped product tells the
  user, in writing, that this toggle does not touch the in-app cues. That is a
  deliberate boundary statement — but it states the boundary, it does not
  state that no in-app control should ever exist.
- **Locked docs — silent on it.** `docs/NOTIFICATIONS_LOCKED.md:305-328`
  (rest-finished alert addendum, founder decision 2026-07-01 Wave 1 A2) covers
  the OS alert only; `:320-322` names its disable path ("an in-app toggle in
  Settings → Workout & units"). No sentence covers the in-app beep.
- **D-register — silent.** No entry on rest sound, beeps or muting in
  `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`.
- **Tests — silent.** No test pins the beeps as unconditional and none pins a
  mute.
- **Sibling controls — point BOTH ways.** In favour of a control: every other
  cue on this screen is user-controllable — "Auto-start rest timer"
  (`SettingsWorkoutScreen.js:146-156`), "Rest finished alert" (`:164-173`),
  "Default rest timer" (`:124-140`); and the *haptic* half of the very same
  3-2-1 ladder already has a global mute — `RestTimer.js:10-12` records that
  all haptics ride the named vocabulary "so the reduce-motion setting silences
  them", i.e. `accessibility.reduceMotion` (`useAppStore.js:1922-1923`)
  silences the vibration but nothing silences the audio. Against: there is no
  sound preference of any kind in the accessibility block
  (`useAppStore.js:1907-1937` — reduceMotion, theme, energyUnit,
  showHomeNutrition, showFibre/Sugar/Sodium; no audio field), so a mute would
  be the first of its kind.
- **Prior audit** flagged it without resolving intent:
  `docs/_FULL-APP-PRODUCT-MAP.md:10500-10504` (U5) — "I found no mute setting
  for the in-app sound."

**Why this is D and not A or B.** The "In-app cues are unaffected" sentence is
genuine evidence that the split is deliberate, which blocks classification A
(it is not a straightforward "intent exists, UI missing"). But it is a
statement about one toggle's scope, not a recorded decision that the beep must
be unmutable, which blocks classification B. Nothing is dead, which blocks C.
The order's FOUNDER RULINGS section names this exact question verbatim:
"Should users be able to mute this in-app sound?"

**User consequence.** A user in a quiet gym, a shared flat, a physio clinic or
a library-quiet home gym cannot silence a 1100 Hz tone that the app plays
*through* their phone's silent switch on iOS. Their only remedies are turning
the media volume to zero (which also kills their music) or not using the rest
timer. The haptic ladder alone carries the countdown
(`RestTimer.js:291-296, 313`), so muting is behaviourally safe.

**Safest options (founder's choice, presented flat).**

1. **Add a "Rest countdown sound" switch** in Settings → Workout & units,
   default ON, beside the existing rest rows (`SettingsWorkoutScreen.js:146-173`),
   read once in `RestTimer.js` before each `playRestBeep`. One writer, one
   reader, no new dependency, no engine contact.
2. **Fold it into the existing "Rest finished alert" toggle** so one switch
   governs both the OS alert and the in-app beeps, and amend the sub-label at
   `SettingsWorkoutScreen.js:165-166`. Fewer controls, but it silently changes
   the meaning of a shipped toggle for existing users and contradicts the
   founder's 2026-07-01 A2 framing.
3. **Document the beep as fixed product behaviour**, change nothing, and add
   one clarifying sentence so the user at least knows the sound is intentional
   and tied to the timer.
4. **Respect an existing global instead of adding a setting** — e.g. mute the
   beeps when `accessibility.reduceMotion` is on, reusing the haptic mute.
   No new setting, but it overloads a motion preference with an audio meaning,
   which is a truth defect of the kind Phase 20 forbids.

**Recommended option: 1.** It matches the order's "every cue the app produces
should have a user control" spirit, matches the sibling pattern on the same
settings page exactly, keeps ONE OWNER PER SETTING, adds no scope, and leaves
the founder's A2 decision on the OS alert untouched. Option 4 is explicitly
not recommended.

**Release blocked?** No. This is a comfort/consent defect, not a safety,
privacy or billing defect. It should not gate a build.

---

### Gap #2 — progress-scan "hide exact numbers" with no UI writer → **D. FOUNDER RULING REQUIRED**

**Current behaviour (traced).**

- Preference module `src/lib/progressScanPreferences.js`:
  `PROGRESS_SCAN_HIDE_EXACT_KEY = '@volyume_progress_scan_hide_exact_numbers'`
  (`:3`); reader `getProgressScanHideExactPreference` (`:34-42`) — **defaults
  to `true` when unset AND returns `true` on a read failure**; writer
  `setProgressScanHideExactPreference` (`:44-50`).
- **ALL readers of the preference (exhaustive grep over `src/`):** exactly ONE
  production reader — `src/screens/CoachOutputScreen.js:44` (import), `:1508`
  (`const hideExactScanRanges = await getProgressScanHideExactPreference();`),
  consumed at `:1819` (`trendOnly: hideExactScanRanges` passed into
  `resolveProgressScanCoachNote`). Plus test mocks at
  `ProgressPhotosScreen.addFlow.test.js:114-115`.
- **ALL writers:** NONE in production. `setProgressScanHideExactPreference` has
  no call site anywhere in `src/` outside its own module and
  `src/lib/__tests__/progressScanPreferences.test.js:33-39`.
- **Net effect:** `trendOnly` is `true` for 100% of users, permanently.
- Downstream of `trendOnly`: `src/lib/progressScanCoachResolver.js:101, 108`
  (trend-only wording), `:136-137` (`leannessBand` and `leannessBandLabel`
  forced to `null`), and the rendered body reaches the screen at
  `CoachOutputScreen.js:2813` (`progressScanCoachContext.body`).
- The separate `hideExact` prop on the photo-library components is a different,
  hard-coded value: `ProgressPhotosScreen.js:1758` passes `hideExact={false}`
  to `ProgressScanCompare` (`src/components/ProgressScanCompare.js:110`), and
  `ProgressScanHistoryCard.js:132` defaults it to `false`.

**The user-facing truth defect this creates.**

`src/lib/progressScanCoachResolver.js:111`:

```
trendOnly && label ? 'Detailed scores are hidden, as you chose.' : null,
```

Every Pro user with a scored progress scan and a band/confidence label is told
the app is hiding their detailed score **because they chose to** — and no user
has ever been able to choose it, because no UI writes the key. The sentence
renders through `body` at `CoachOutputScreen.js:2813`. Under the order's
Phase 20 rule ("No setting description may promise an effect the code does not
implement") this is the sharpest single finding in this lane: the copy asserts
a user decision that the product never offered.

Compounding it: the same user sees the **exact** score, leanness band and
weight on the photo library screen (`ProgressPhotosScreen.js:1758`
`hideExact={false}`, and `hideWeight={false}` on the same call), so the app
hides on one screen, shows on another, and blames the user for the hiding.

**Evidence searched for product intent.**

- **A pinned test forbids the control on the photo screen.**
  `src/screens/__tests__/ProgressPhotosScreen.progressScan.guard.test.js:27-30`,
  test name "has no score-hiding switch and keeps one-week scan cadence":
  `expect(SCREEN).not.toMatch(/getProgressScanHideExactPreference/)`,
  `not.toMatch(/setProgressScanHideExactPreference/)`,
  `not.toMatch(/Hide score/)`. This is real intent evidence — but it is
  **location-specific**: it bans the switch from `ProgressPhotosScreen`. It
  does not say the preference must never be writable anywhere, and it does not
  license the "as you chose" copy.
- **The same guard suite pins the trend-only machinery as live behaviour**
  (`:65-69`, "suppression gates scan deltas while scores stay visible
  otherwise"), so the `hideExact` pathway is intentional product behaviour,
  not residue. That blocks classification C.
- **D-register — silent.** No entry on hide-exact / score hiding.
- **Prior audit could not resolve it either:**
  `docs/_FULL-APP-PRODUCT-MAP.md:10512-10515` (U7) — "Whether a control was
  removed or never built is not recoverable from the code alone";
  `:9192` classifies it "LEGACY-UNREACHABLE as a user setting; effectively a
  hard-coded ON default".
- **Sibling controls point at intent-to-configure:** the same preference module
  holds three siblings that all have real writers — camera facing and timer
  (`progressScanPreferences.js:78-98`, written from the scan capture flow, cf.
  `ProgressPhotosScreen` guard `:119-121`), and the seen-flags (`:119-145`).
  Hide-exact is the odd one out.
- **Safety framing:** `progressScanPreferences.js:34-42` fails **closed** to
  hidden, and `_FULL-APP-PRODUCT-MAP.md:9192` reads the default as "An
  ED-protective default". A default that fails closed on a read error is the
  house ED-safety pattern, which is genuine evidence the hiding itself is
  deliberate.

**Why D and not A/B/C.** A is arguable (a writer was clearly contemplated —
the copy says "as you chose") but the pinned guard test forbidding the switch
on the obvious screen means adding UI would be a product decision, not a
gap-fill. B is arguable (fail-closed ED-protective default) but then the copy
is simply false and must change. C is refuted — the pathway is pinned as live.
The two candidate readings lead to opposite builds, so this is a ruling.

**User consequence.** Every Pro user with a scored scan is (a) shown a
trend-only coach read they cannot switch off, and (b) told they chose it.
Users who want their number see it on the photo library anyway, so the hiding
is inconsistent rather than protective; users who wanted it hidden get no
credit for a choice they never made.

**Safest options (founder's choice, presented flat).**

1. **Keep the hiding fixed ON; fix only the copy.** Change
   `progressScanCoachResolver.js:111` to a sentence that does not assert a
   user choice (it currently is the only false claim), and record the fixed
   behaviour in the settings docs. No new control, guard test untouched, ED
   posture unchanged. Smallest diff, removes the falsehood.
2. **Give the preference a real writer**, in Settings (coaching or display) —
   NOT on `ProgressPhotosScreen`, so the pinned guard at
   `ProgressPhotosScreen.progressScan.guard.test.js:27-30` stays green — and
   keep the fail-closed default ON. The copy at `:111` then becomes true.
3. **Make the two surfaces consistent as well as truthful**: have
   `ProgressPhotosScreen.js:1758` read the same preference instead of
   hard-coding `hideExact={false}`. This is the most coherent product but it
   changes what a Pro user currently sees on the library screen, so it must
   not be done without a ruling.
4. **Treat the preference as internal**, delete nothing (Campaign 4 owns dead
   code), and fix the copy as in option 1.

**Recommended option: 1, with 2 as the founder's upgrade if a choice is
wanted.** Option 1 removes a false user-facing claim immediately, touches no
ED-safety default, and keeps the guard test green. Option 3 is explicitly not
recommended without a ruling because it changes what a paying user currently
sees.

**Release blocked?** No — but the false "as you chose" sentence is the highest
-priority copy fix found in this lane and should not ship another campaign
unchanged.

---

### Gap #3 — `partnerCheerEnabled` with no toggle → **A. INTENT EXISTS, UI MISSING → FIX**

**Current behaviour (traced).**

- **Reader (sole):** `src/lib/notifications/scheduler.js:1448`
  `if (prefs.partnerCheerEnabled === false) return;` inside
  `schedulePartnerBeats(userId)` (`:1423`), reading the shared blob
  `NOTIF_PREFS_KEY` = `@volyume_notification_prefs` (`:1444-1447`). Default
  ON (absent key ≠ `false`).
- **Writers:** NONE anywhere in `src/`. Exhaustive grep for
  `partnerCheerEnabled` across the repo returns: `scheduler.js:1442` (a
  comment), `scheduler.js:1448` (the read), and documentation. The matches in
  `WorkoutSummaryScreen.js` (`:81, 927, 1224, 1235-1236, 1906-1917,
  2227-2230`) are a *different* thing — `partnerCheer*` style names and
  `pair.cheerEnabled`, the send-a-cheer button, not this preference.
- **What it gates:** all three partner "beats" pushes —
  `scheduler.js:1469` (cheer received), `:1500` (streak kept), `:1530` (join),
  each going out through `requestEventPushSlot({ category: CATEGORY.PARTNER_CHEER })`.
- **It is a real push category:** `src/lib/notifications/categories.js:38`
  (`PARTNER_CHEER: 'partner_cheer'`), `:130`
  (`[CATEGORY.PARTNER_CHEER]: [CHANNEL.PUSH, CHANNEL.IN_APP]`), `:203`.

**Evidence for product intent — four independent sources, all pointing the
same way.**

1. **A locked, load-bearing product principle.**
   `docs/NOTIFICATIONS_LOCKED.md:22-23`, verbatim: "**Every push has a clear
   unsubscribe path (single tap to disable the category).**" `PARTNER_CHEER`
   is a PUSH-channel category (`categories.js:130`). It has no in-app disable.
   The principle is violated as shipped.
2. **The code's own comment frames the absence as deferred, not decided.**
   `scheduler.js:1441-1442`: "Preferences toggle (default ON; **the
   notification settings screen can surface `partnerCheerEnabled` later**
   without a schema change)." The author built the gate expecting the UI to
   follow.
3. **Established sibling controls — the identical pattern, three times over.**
   Every other optional category in the same AsyncStorage blob has a Switch:
   - `missedCheckinEnabled` — read `scheduler.js:806`, written
     `CoachingRemindersScreen.js:270` (state `:200-201`);
   - `plannedMealConfirmEnabled` — read `scheduler.js:1023`, written
     `CoachingRemindersScreen.js:299` (state `:203-204`);
   - `activationNudgeEnabled` — read by the scheduler, written
     `NotificationSettingsScreen.js:456-465`, with its own Switch and helper
     copy at `:687-708` and the comment "S6: the early-activation nudge
     (tier-blind). **Its own one-tap disable.**" (`:687`).
   `partnerCheerEnabled` is the only member of that family without one.
4. **The screen that should own it already exists and already owns the blob.**
   `NotificationSettingsScreen.js:396-403` writes the same blob; `:413` names
   the keys it must preserve. There is no architectural obstacle and no schema
   change (confirmed by `scheduler.js:1442`).

**Why A and not B/C/D.** B is refuted by the locked principle at
`NOTIFICATIONS_LOCKED.md:22-23` — a push category with no unsubscribe path
cannot be "intentional fixed behaviour" against a rule the founder locked. C
is refuted — the key is read on the live path that gates three shipped pushes
(`scheduler.js:1469, 1500, 1530`). D is not needed: intent is documented in
four places, so no ruling is required to close it.

**User consequence.** A Pro user with an active partnership receives partner
cheer / streak / join pushes with **no in-app way to stop them**. Their only
remedy is the Android channel or the OS notification settings — an OS-level
control masquerading as the only control, which is exactly the Phase 7
question "Does an OS-level setting masquerade as an in-app setting?".

**FIX (specified, for the Phase 9/build lane — not built by this lane).**
One Switch on `NotificationSettingsScreen.js`, in the partner/social area,
default ON, writing `partnerCheerEnabled` into the existing
`@volyume_notification_prefs` blob using the identical read/merge/write
pattern as `handleActivationNudgeToggle` (`NotificationSettingsScreen.js:456-465`)
so the sibling keys at `:413` are preserved. No schema change
(`scheduler.js:1442`). No new writer for any other key. Campaign 2 terminology
for the label. Pin a navigation/ownership test per Phase 23 ("reminder controls
map to their actual notification types").

**Release blocked?** No, but it is the one Phase 8 item that is a
straightforward, evidence-backed defect against a locked principle, and it
should land in this campaign.

---

### Phase 8 classification summary

| Gap | Class | One-line basis |
|---|---|---|
| `restSound` beep, no mute | **D — founder ruling** | Shipped copy says the existing toggle leaves "In-app cues … unaffected" (`SettingsWorkoutScreen.js:165-166`), but no decision anywhere says the beep must be unmutable; the beep defeats the iOS silent switch (`restSound.js:114-124`). |
| Progress-scan hide-exact, no writer | **D — founder ruling** | Pinned guard bans the switch on the photos screen (`ProgressPhotosScreen.progressScan.guard.test.js:27-30`) yet the coach screen tells every user "Detailed scores are hidden, **as you chose**" (`progressScanCoachResolver.js:111`) with zero writers. |
| `partnerCheerEnabled`, no toggle | **A — fix** | A PUSH category (`categories.js:130`) with no unsubscribe path, against `NOTIFICATIONS_LOCKED.md:22-23`; the code defers the UI (`scheduler.js:1441-1442`) and three siblings already have Switches. |

---

## Section 3 — Phase 10: hidden gestures and secondary actions

### 3.1 Method

Swept `src/screens` and `src/components` (tests excluded) for `onLongPress`
(49 call sites), `Swipeable` / `renderRightActions` / `Gesture.Pan()`, and
icon-only touch targets. Icon-only sweep: a scripted scan for
`TouchableOpacity` / `Pressable` / `PressableCard` / `TouchableHighlight`
elements containing an `Ionicons` child, no `<Text>` child and no
`accessibilityLabel` on the element or in its body returned **0 results** —
every icon-only control in the app carries an accessible name. The remaining
question is therefore sighted-user discoverability, handled per row below.

### 3.2 Gesture table

| # | Gesture | File:line | What it does | Visible alternative route | Verdict |
|---|---|---|---|---|---|
| 1 | Long-press exercise row (plan builder) | `ManualBuilderScreen.js:1055` → `:421-461` | **Removes an exercise from a day** (undo toast, 8 s) | **NONE.** The row's only visible controls are move-up `:1129-1139`, move-down `:1140-1150`, and ungroup-superset `:1153-1160`. Disclosure exists only in `accessibilityHint` (`:1060`, "Tap to select for a superset, hold to remove") — screen-reader-only. | **FLAGGED — important action, gesture-only, undisclosed to sighted users.** |
| 2 | Long-press diary entry | `DiaryScreen.js:1617` (`onLongPressEntry={enterSelection}`) → `:1011` | Enters multi-select, unlocking **Move to another meal, Copy to today, Save as meal, Delete** (`DiaryScreen.js:1838-1859`) | Partial. Delete has a visible alternative (swipe-to-delete `EntryRow.js:146-160`; sheet Remove `FoodDetailSheet.js:455`). **Move to another meal**, **Copy to today** and **Save as meal** have no other route. No visible "Select" control exists (`selectionMode` is set only at `:1011`). | **FLAGGED — three actions gesture-only; one, "Save as meal", is the sole creation path for a whole feature (see #3).** |
| 3 | (consequence of #2) Create a saved meal | `MyMealsScreen.js:9-10` header: "Create happens elsewhere: from the diary multi-select toolbar's 'Save as meal'" | Creating a saved meal | `MyMealsScreen.js` has no create control; its empty state (`:249-258`) says 'Select foods in your diary and tap "Save as meal".' — which discloses the *destination* but never that "select" means long-press. | **FLAGGED — the only creation path for Saved meals begins with an undisclosed gesture.** |
| 4 | Long-press meal-plan food item | `MealPlanScreen.js:1128` → `handleFlagFood` | Adds a food to the permanent avoid list | Disclosed in the row's `accessibilityLabel` (`:1131`, "Tap to swap, long press to leave it out for good") and in visible copy on the dietary editor (`DietaryPreferencesEditor.js:166`, "You can flag a food from any meal plan"). Removal from the list has a visible Remove chip (`DietaryPreferencesEditor.js:172-179`); **adding has no visible control.** | Borderline: add-direction is gesture-only, but disclosed in visible copy on the canonical editor. Recommend a visible affordance only if Phase 9 touches this screen. |
| 5 | Long-press food row (search) | `FoodSearchScreen.js:814` → `:686-710` | Cycles favourite → exclude → neutral | Gesture-only, but **disclosed in visible copy**: `FoodSearchScreen.js:72` empty state "No favourites yet. **Hold a food to star it.**", plus `FoodRow.js:71` `accessibilityHint` and the re-log hint `FoodSearchScreen.js:816` ("Long-press to change the portion") with the caption gate at `:823-826`. | Acceptable — disclosed. No action. |
| 6 | Long-press plan card | `PlansScreen.js:671` → `handlePlanOptions` `:490` | Plan options menu (View, Set active, Move to folder, …) | **Yes** — visible "Plan options" button `PlansScreen.js:684-692` (sibling overlay, `accessibilityLabel="Plan options"`). | Accelerator. No action. |
| 7 | Long-press folder header | `PlansScreen.js:1008` → `handleFolderOptions` | Folder options | **Yes** — visible options button `PlansScreen.js:1022-1030`. | Accelerator. |
| 8 | Long-press archived plan card | `PlansScreen.js:1082` → `handleArchivedPlanOptions` | Archived-plan options (incl. restore) | **Yes** — visible "Archived plan options" button `PlansScreen.js:1095-1101`. | Accelerator. |
| 9 | Long-press saved-meal row | `MyMealsScreen.js:195` → `openMenu` | Rename / delete a saved meal | **Yes** — visible ellipsis button `MyMealsScreen.js:216-223` ("More actions for …"), and the row's `accessibilityHint` `:197` names both buttons. | Accelerator. |
| 10 | Long-press lift row | `LiftProgressScreen.js:427` (`onLongPressWithLayout`) → `openLiftMenu` `:216` | Peek menu: "View exercise detail" (`:220`), "Share this PR" (`:235`) | Partial — "View exercise detail" duplicates the row tap (`:426`). **"Share this PR" from this row has no visible control**, though `ShareCardScreen` itself is reachable from other surfaces (`RootNavigator.js:456, 520`). | Minor: sharing is an optional accelerator, not an important action. No action, recorded. |
| 11 | Long-press workout-history row | n/a — **no gesture** | Repeat / delete a workout | Both are visible buttons: Repeat `WorkoutHistoryScreen.js:604-613`, delete `:614-620`. The peek menu at `:264-271` opens from the visible button. | Correct pattern; cited as the house exemplar (`:259-262`). | 
| 12 | Long-press logged weight (Today strip) | `TodayStrip.js:171` | Edit today's logged weight (tap goes to the trend when a trend door exists) | **Disclosed in the accessible name** (`TodayStrip.js:175-177`, "…Tap to see your trend, long press to edit."), and weight is editable from `BodyMetricsScreen` (route `RootNavigator.js:512`). | Accelerator. No action. |
| 13 | Long-press water +/- | `DiaryScreen.js:2085, 2095` | ±500 ml instead of ±250 ml | Same visible buttons; disclosed in both accessible names (`:2089`, `:2099`) and in the code comment `:2078-2079`. | Accelerator. |
| 14 | Long-press rest-timer adjust | `RestTimer.js:444` (`startRepeat(delta)`) | Repeat-hold on the visible ± control | Same visible button. | Accelerator. |
| 15 | Long-press set stepper (weight/reps/seconds) | `SetEntry.js:155, 197, 223, 247, 275, 304, 324, 348, 376, 413` | Repeat-hold on visible ± controls | Same visible buttons. | Accelerator. |
| 16 | Swipe-left a diary entry | `EntryRow.js:136-177` (`Swipeable`, `renderRightActions` `:146-156`) | Delete the entry (undo toast, `DiaryScreen.js:1178-1179`) | **Yes** — sheet delete `FoodDetailSheet.js:455` ("Remove entry"), plus an explicit accessibility action `EntryRow.js:173` (`onAccessibilityDelete`) and the bulk Delete `DiaryScreen.js:1856`. Correctly disabled in read-only/lapse (`EntryRow.js:163`). | Accelerator. |
| 17 | Horizontal swipe on the diary body | `DiaryScreen.js:899` (`daySwipe`), attached `:1313` | Change day | **Yes** — visible chevrons and a date picker, per `DiaryScreen.js:872, 883-888`. | Accelerator. |
| 18 | Drag to reorder | `DragReorderList.js:421` (`Gesture.Pan()`), used in `ManualBuilderScreen.js:1036-1046` | Reorder exercises | **Yes** — visible move-up/move-down chevrons `ManualBuilderScreen.js:1129-1150`, and a drag handle with an accessible name (`ManualBuilderScreen.js:1042`). | Accelerator. |
| 19 | Pan in photo compare / viewer / chart | `ProgressPhotoCompare.js:150, 253`; `ProgressPhotoViewer.js:258`; `VolyumeChart.js:272` | View manipulation (slider, zoom/pan, chart scrub) | View-only; performs no state-changing action. | Not an action. |
| 20 | Long-press Progress-photos control | `ProgressPhotosScreen.js:1466` | Exports scan calibration JSON | Founder-gated (`isProgressScanCalibrationExportAllowed(user)`, pinned `ProgressPhotosScreen.progressScan.guard.test.js:192-201`); `undefined` for everyone else. | **E — internal by design.** Correct that it is hidden. |
| 21 | Long-press "About" | `SettingsAboutScreen.js:130` | Opens the debug log — `__DEV__` only | Not present in production builds. | **E — internal.** Correct. |
| 22 | Long-press a tab bar item | `VolyumeTabBar.js:156-158` | Emits `tabLongPress`; **no listener exists anywhere in `src/`** | n/a | Inert. No user-facing action; record for Campaign 4, do not remove in this campaign. |

### 3.3 Phase 10 finding

**Important actions available ONLY through an undisclosed gesture: 3.**

1. **Remove an exercise from a day in the plan builder** —
   `ManualBuilderScreen.js:1055`. No visible control; disclosure is
   screen-reader-only (`:1061`). A sighted user building a plan cannot delete
   a mis-added exercise by any visible means. Note the *day*-level equivalent
   is correctly visible (`ManualBuilderScreen.js:1007` → `handleRemoveDay`
   `:463`), so the row level is an inconsistency, not a design stance.
2. **Move a diary entry to another meal / Copy entries to today** —
   `DiaryScreen.js:1617` → `:1011`, actions at `:1838-1859`. No visible route
   into selection mode.
3. **Create a saved meal** — same gesture; `MyMealsScreen.js:9-10` confirms it
   is the *only* creation path, and that screen's empty state
   (`MyMealsScreen.js:254`) instructs the user to "Select foods in your diary"
   without ever saying how to select.

All three are "provide a visible equivalent" cases under the order's Phase 10
instruction; none require removing a gesture. Recommended (for the build lane,
not built here): a visible remove affordance on the plan-builder exercise row,
and one visible "Select" entry point on the diary meal section header that
enters the existing `selectionMode` (no new state, no new writer).

Everything else in the table is an optional accelerator with a visible route,
an internal/founder-gated affordance that is correctly hidden, or a view
manipulation.

---

## STOP-AND-REPORT items (ambiguity surfaced, not resolved by this lane)

1. **Two founder rulings required** — Phase 8 gaps #1 and #2, fields as
   specified in Section 2. Neither blocks a release.
2. **`docs/NOTIFICATIONS_LOCKED.md:19-20` points quiet hours at "You → Diary
   preferences"**, a location that does not exist; the live editor is Settings
   → Notifications and reminders (`NotificationSettingsScreen.js:754-804`).
   A locked doc, so this lane did not edit it.
3. **Quiet-hours copy scope** — `NotificationSettingsScreen.js:801-802` says
   "Applies to every reminder Volyume schedules", while
   `docs/NOTIFICATIONS_LOCKED.md:311-318` records the rest-finished alert as a
   founder-accepted exception. Phase 7/Phase 20 lane, not this one.
4. **`VolumeHeatmap` is unreachable for a user with no logged sets**
   (`AnalyticsScreen.js:730` + `useProgressData.js:502`). Correct as an empty
   state for the heatmap, questionable as the only door to the manual editor;
   folded into the Phase 4 §1.2 shortcut recommendation rather than treated as
   a defect here.
5. **`tabLongPress` has no listener** (`VolyumeTabBar.js:156-158`). Dead
   emission; recorded for Campaign 4 per the order's Phase 22 rule.
6. **Product-map corrections needed** when the map is next touched: U6 travel
   mode is live and reachable (`_FULL-APP-PRODUCT-MAP.md:10509-10513` vs
   `BuildWorkoutScreen.js:246-250`); the quiet-hours entry is stale; the
   cycle opt-in has a live writer (`SettingsCoachingScreen.js:80-84`).
