# Campaign 3, Phase 24 — REVIEW B (power user / state truth)

Fresh-eyes adversarial review. Authority: the founder's PHASE 24 order,
REVIEW B, ten questions. Scope: `git diff 9aae57cb..HEAD -- src/` on
`claude/campaign3-discoverability`, baselined at **564f98a4** (Review A's
dead-tap fixes are already in the tree and are NOT re-reported here).
Rulings in this folder are law; FR-1..FR-5 are open by design and are not
re-raised as findings.

Method: every new writer, shortcut and route was traced to the store it
touches and to every reader of that store; every relabelled control was
traced to all of its readers; every new navigate target was checked
against the stack that owns it (`RootNavigator.js`); Phase 21 was run per
modified preference key across AsyncStorage, SQLite, profile fields, the
sync registry, navigation params and component state.

---

## The ten answers

**1. Does every reachable setting actually change what it claims?**
Mostly yes — with two exceptions. The Diary per-day-offset row claims the
day's target "includes" the adjustment on days where the engine
deliberately does not apply it (B-1). The Settings index row for Coaching
names two controls a free user cannot see (B-5). Everything else
verified: the diet chips, the meals-per-day relabel (readers traced:
DiaryScreen, MealNamesScreen, FoodSearchScreen), the partner-cheers
toggle (`scheduler.js:1448` gate covers all three beats), the win-back
copy, the corrected scan-privacy line, the kg-entry hint, and the
push-budget sentence (`EVENT_WEEKLY_CAP = 8` per local week) are true.

**2. Are there multiple writers for one preference?**
No new duplicate writer was created. `dietPreference` has two writers,
both `s.setDietPreference` against the same field, now rendering from the
same frozen `DIETS` list — explicitly equivalent, which is what the law
allows. `@volyume_meals_per_day` has exactly one writer. The
notification blob now has three merging writers and zero replacing ones.
`proteinApproach` remains two stores (nutrition_targets row + profile
mirror) with the row as live truth; the seed fix is correct but leaks a
display falsehood into the change summary (B-4).

**3. Are there readers with no reachable writer?**
Yes, all pre-existing and all already escalated: hide-exact-numbers
(FR-3), the dormant meal-plan prefs (FR-2), rest beep (FR-4). The
campaign added none.

**4. Did a new shortcut fork state?**
No. The diary multi-select route calls the existing `enterSelection`
(`DiaryScreen.js:1010`); the ManualBuilder remove button calls the
existing `handleLongPressExercise` (`:421`) with its undo toast; both
reuse the one handler with no second state. The campaign did, however,
add two SQLite writes whose rows no live surface reads (B-2, B-3) — not
a fork, but a store that will drift from the one the app obeys.

**5. Are advanced controls still reachable?**
Yes. Volume targets keeps its Analytics route and now has a Coach-tab
row; per-day targets keeps its Settings route and now has a Diary row;
label scanning gained a direct route without losing the post-miss one.
Nothing previously reachable was removed except the cycle toggle for
free/lapsed users (B-7).

**6. Are any settings actually dead residue?**
The `partner_cheer`, `morning_weight` and `weekly_checkin_reminder`
SQLite rows this campaign writes are cloud-synced but read by no
rendered surface (B-2, B-3). The `SettingsCoaching` cardio toggle is
recorded residue, untouched — correct.

**7. Does a local-only setting imply cloud sync?**
No copy claims sync. But partner cheers now *behave* device-local while
being pushed to `notification_preferences` (B-2): the sync-status line
counts them, and a second device will never honour the choice.

**8. Does a synced setting imply device-only?**
No instance found.

**9. Are tier/platform constraints truthful?**
Two defects: the Coaching index sub is untrue for free tier (B-5), and
the notification bottom note tells iOS users about Android notification
channels (B-6).

**10. Did the campaign accidentally resurrect legacy functionality?**
Nearly. The morning/check-in SQLite mirror re-instates writes that only
ever existed inside `NotificationSettingsScreen.applyNotifications`,
which is dead code — and ruling #3 permitted the restore *only if the
rows have a live reader*. They do not (B-3). No cardio entry point, no
cardio setting, no AI, no social scope, no restored travel mode: the
boundary holds. `SettingsScreen.js:45` actually *removed* the word
cardio from the index.

---

## Findings

### B-1 — The Diary offset row asserts an adjustment the engine did not apply (HIGH)

`src/screens/DiaryScreen.js:1435-1448` renders whenever
`perDayOffsetKcal !== 0`. But `src/lib/food/effectiveTargets.js:36-47`
applies the weekday offset **only on an otherwise-plain day**: a refeed
day, a carb-cycle day or a banked day returns before the offset branch is
reached. On any of those days the row still reads "Includes your +250
kcal day adjustment" while the shown target contains no such adjustment —
and the sibling refeed/cycle rows (`:1456`, `:1467`) render at the same
time, so the screen states two mutually exclusive truths.

Fix: gate the row on the same condition the engine uses
(`!isRefeedDay && !macroCycle && !bankedDelta`), or state it
conditionally ("applies on plain days"). Phase 20 law: no description may
promise an effect the code does not implement.

### B-2 — Partner cheers is pushed to the cloud but obeyed only from the device blob (MEDIUM)

`src/screens/CoachingRemindersScreen.js:350-372` writes both
`@volyume_notification_prefs.partnerCheerEnabled` and a `partner_cheer`
row via `setPrefRow`. The only consumer is
`src/lib/notifications/scheduler.js:1445-1448`, which reads the
AsyncStorage blob. The SQLite row is pushed by
`sync/tables/notificationPreferences.js` and applied back into SQLite by
`applyPreferenceFromPull` — and then read by nothing. Turning cheers off
on device A therefore leaves device B cheering, while the Settings sync
line counts the row as user data in flight.

This copies the pre-existing `checkin_missed` / `planned_meal_confirm`
shape, so it is consistent — but it makes a third setting look synced
without being honoured. Fix options: (A) have the screen and the
scheduler read the SQLite row with the blob as fallback (makes all three
genuinely synced); (B) stop writing the row and record the blob as
device-local. (A) is the one that matches the locked notification law.

### B-3 — The restored morning/check-in mirror has no live reader, which was the condition on ruling #3 (MEDIUM)

`src/screens/CoachingRemindersScreen.js:134-158` restores the
`morning_weight` / `weekly_checkin_reminder` cloud mirror. SETTINGS-
OWNERSHIP.md ruling #3 permitted this **only if the rows have a live
reader**. They do not:

- `CoachingRemindersScreen` — the live editor — seeds its pickers from
  the AsyncStorage blob only (`:222-239`); it never reads `getPreference`.
- `NotificationSettingsScreen:238-256` does read the rows, but into
  `morningHour` / `checkinDay` / `checkinHour` state that the screen no
  longer renders (`grep` shows those variables reaching only the dead
  `getPrefs` → `applyNotifications` pair, retained-but-unreachable per
  `:363-368`).
- The schedulers read the blob.

So a pulled row changes nothing on any surface, and a fresh push simply
overwrites the cloud with whatever the blob already said. Under its own
ruling this was dead residue for Campaign 4. Either wire the live editor
to prefer the row (fixing cross-device restore, and B-2 with it) or
revert the mirror and record it.

### B-4 — The protein re-seed makes the goal-change summary report a change the user did not make (MEDIUM)

`src/screens/ProGoalSetupScreen.js:113-131` now seeds the picker from the
saved `nutrition_targets` row (correct — that is the live truth). But
`:218` still captures `previousProfile.approach` from the **stale profile
mirror**, and `:399` hands it to `GoalChangeSummary`, which diffs
`previous.approach` against `next.approach`
(`GoalChangeSummaryScreen.js:170`, rendered at `:284-291` with a
"Your protein approach moves to X" reason line).

In exactly the scenario the fix targets — a user who changed approach on
Nutrition Targets, which writes only the row (`NutritionTargetsScreen.js:
497-506`) — the two values now disagree, so saving an untouched picker
tells the user their protein approach just changed. Before the fix both
sides came from the profile and the summary stayed silent. Fix: seed
`previousProfile.approach` from the same resolved value the picker was
seeded with.

Minor, same site: the seed effect has `[]` deps and only guards
unmount, so a chip tapped before the SQLite read resolves is silently
overwritten. Cheap to fix by skipping the seed once the user has
interacted.

### B-5 — The Coaching index sub names two Pro-only controls and drops the free one (MEDIUM)

`src/screens/SettingsScreen.js:45`: "Calmer coaching, who applies
changes, and cycle tracking where shown". On
`SettingsCoachingScreen.js`, Autonomy (`:222-262`) and Cycle tracking
(`:282`) are both inside `tier === 'pro'` blocks. A free user opening
that page finds Calmer coaching and Session readiness check — neither of
which the sub mentions. The index promises a free user two things they
cannot find, and hides the one they can. Fix: make the sub tier-aware, or
name the always-visible controls ("Calmer coaching and session readiness"
with the Pro items appearing on the page itself).

### B-6 — Android-only notification copy is shown to iOS users (LOW)

`src/screens/NotificationSettingsScreen.js:829` ends the bottom note with
"On Android, your device groups these into notification channels you can
tune in system settings." The file imports no `Platform` and the string
is unconditional, so every iOS user reads instructions for a capability
their OS does not have — the exact "controls shown for unavailable
platform capabilities" case Phase 7 asks about. Fix: wrap in
`Platform.OS === 'android'`.

### B-7 — The cycle Pro-gate leaves a lapsed user unable to revoke an Article 9 opt-in (LOW, privacy-adjacent)

`src/screens/SettingsCoachingScreen.js:282` gates Cycle tracking to
`tier === 'pro'`. The reasoning is sound (only the Pro weekly check-in
reads it, `cyclePrefs.js` + `WeeklyCheckInScreen.js:345`). But a user who
enabled it while Pro and then lapses keeps `@volyume_cycle_tracking =
true` with no UI to turn it off. No data is collected while free, so this
is not a live exposure — but a special-category opt-in that cannot be
withdrawn is the wrong default. Suggested: keep the row visible when the
stored value is already `true`, gate only the *enable* path. Founder call
if the lead prefers to leave it.

### B-8 — The new selection hint ignores the read-only branch every sibling prop guards (LOW)

`src/components/food/EntryRow.js:101` adds
`accessibilityHint={selectionMode ? undefined : 'Press and hold to select
several entries.'}`. Two lines above, `onPress`, `onLongPress`,
`disabled`, `accessibilityActions` and `accessibilityLabel` all branch on
`readOnly` first (`:80-97`), and `MealSection.js:75` uses
`!selectionMode && !readOnly` for the equivalent sighted hint. A lapsed
Pro user's screen reader is now told to press and hold a disabled row.
Fix: `readOnly || selectionMode ? undefined : ...`.

### B-9 — The saved-meals empty state teaches the gesture the campaign just replaced (LOW)

`src/screens/MyMealsScreen.js:257` now reads "Press and hold any entry in
your diary to start selecting foods". Correct as far as it goes, but the
same campaign added a visible route into the same selection mode from the
edit sheet a normal tap opens (`FoodDetailSheet.js:470-483`). The one
instructional surface still teaches only the accelerator. Fix: name the
tap route ("open any entry and choose Select entries, or press and hold
it").

Related, same fix: that new sheet action is an **icon-only** button
(`checkbox-outline`, label only in `accessibilityLabel`) sitting beside
the trash icon. Phase 10 counts icon-only actions as a hidden-affordance
class, so the gesture-only action has been converted into an
unlabelled-icon action. A text label would close it properly.

### B-10 — Onboarding still writes a morning hour the canonical picker cannot display (MEDIUM)

Ruling #13 fixed `checkinHour: 12` → `18` because 12 sits outside
`CoachingRemindersScreen.js:47 HOURS_EVENING [14..21]`. The identical
defect on the *morning* value was not fixed: `ProOnboardingScreen.js:191`
offers `HOURS = 5..18` ("5am to 6pm"), while
`CoachingRemindersScreen.js:46 HOURS_MORNING = [5..12]`. Any user who
picks 1pm–6pm for their weigh-in reminder at onboarding later opens
Coaching reminders and sees **no hour chip selected**, with the reminder
really firing at the hour they chose — the same "UI value reconstructed
incorrectly after reload" class the campaign fixed one field away. Fix:
either clamp onboarding's list to the picker's range, or widen
`HOURS_MORNING` to match onboarding. (Widening changes a canonical
editor's allowed values; clamping changes an onboarding option set —
lead's call, but they must agree.)

### B-11 — The campaign's navigation pins are string matches, and the repo's real route guard does not canary the routes this campaign used (LOW, test quality)

`src/__tests__/campaign3.discoverability.test.js:51-65` asserts the
*text* of the navigate call. That is why all three dead taps Review A
found passed green: a string pin cannot know whether the target stack
registers the route. The repo already owns the right guard —
`src/__tests__/navigationTargets.guard.test.js` — but its
`PROFILE_ONLY_ROUTES` canary list (`:22`) is
`['CoachOutput','NutritionTargets','SettingsPrivacy','WeeklyCheckIn']`,
which does not include `PerDayTargets` or `SettingsWorkout`, and it has
no equivalent list for the Home/Progress-only routes (`VolumeHeatmap`).
Fix: add `PerDayTargets` and `SettingsWorkout` to `PROFILE_ONLY_ROUTES`,
add `YouScreen.js` to `NON_PROFILE_SCREENS`' counterpart for
Progress-only routes, so the bug class cannot return through the same
door twice.

---

## Verified clean (no action)

- **Cardio boundary.** No entry point, route, setting or education added.
  `SettingsScreen.js:45` removed the word "cardio" from the index; the
  `SettingsCoachingScreen.js:163-180` toggle is the recorded pre-existing
  residue and is untouched.
- **F1 tier routing.** `PlansScreen.js:826-841`: `blockAdvisor.js:188/207`
  gives `secondaryLabel = 'Build a new plan'` for `repeat`/`adjust` and
  `'Review with coach'` only for `consider_rebuild`, so the free split is
  exactly right. `PlanLibrary` is registered in `PlansStack`
  (`RootNavigator.js:486`) — same stack, live route.
- **F2 label scanner.** `ScanLabel` is registered in `DiaryStack`
  (`RootNavigator.js:395`), the only stack that owns `ScanBarcode`;
  `ScanLabelScreen.js:79-80` reads both forwarded params.
- **Diet unification.** `DIETS` is frozen at four values
  (`curatedMeals.js:41`); `SettingsProfileScreen.js:51` and
  `DietaryPreferencesEditor.js:22` build identical option sets with
  identical labels and both call `s.setDietPreference`
  (`useAppStore.js:1799`). Pescatarian users now see their own selection.
- **Meals-per-day relabel.** Every reader of `@volyume_meals_per_day`
  traced: `DiaryScreen.js:586-591` (focus-effect, so the diary updates on
  return), `MealNamesScreen.js:39`, `FoodSearchScreen.js:282`. The
  MealPlan control writes a different key (`mealPlanMealsPerDay`,
  `MealPlanScreen.js:231`) and is untouched. Label is honest.
- **Onboarding blob merge (#14).** `ProOnboardingScreen.js:820-840` now
  read-merge-writes like every other writer of that key.
- **Gesture routes.** Both new visible controls call the pre-existing
  handler; no second state machine, no second writer.
- **Cloud CHECK.** `partner_cheer` is admitted by
  `migrate_125_notification_preferences_category_full_enum.sql:67`
  (applied 2026-07-27), so the new row will not 23514.
- **Scan-privacy copy.** `progressScanCoachResolver.js:115` no longer
  claims a choice; `getProgressScanHideExactPreference` defaults `true`
  with no caller of the setter — matching FR-3's description exactly.
- **Win-back copy.** No Pro pitch remains (`winbackContent.js:61-69`).
- **Per-side logging.** Untouched, as ruling #16 requires.
