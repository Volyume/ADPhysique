# Campaign 4 — AUDIT: Campaign 3 deferred items, dead settings/pref keys, telemetry

**Lane:** deferred-settings-telemetry (READ-ONLY audit; proposes, executes nothing)
**Order sections:** PHASE 3, PHASE 12, PHASE 18
**Baseline:** branch `claude/campaign4-coherence` = main `92b9644e` (audit commit `0f4d868e`)
**Authority chain used:** CLAUDE.md Section 2 inviolables → `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md` (D94, D94 addendum, D57) → `docs/NOTIFICATIONS_LOCKED.md` → Campaign 3 evidence (`docs/discoverability-audit-2026-08-10/`) → source.
**Classification law:** the order's CORE CLEANUP LAW, A–I. Zero callers never classified anything on its own; every verdict below carries the decision / migration / test / dynamic-access / rollback check that earns it.

---

## 0. Summary

| Class | Count | Items |
|---|---|---|
| A — LIVE, KEEP | 2 | S-8, S-9 |
| C — INTERNAL AND REQUIRED, KEEP | 1 | S-3 |
| D — INTENTIONAL ROLLBACK / COMPATIBILITY SEAM, KEEP | 3 | P3-3, P3-5, S-4 |
| F — CONFIRMED DEAD, REMOVE | 6 | P3-1, P3-2, P3-4, S-1, S-2, T-1a |
| G — PRODUCT-BOUNDARY REMNANT | 1 | S-5 |
| I — UNCERTAIN, DO NOT DELETE | 4 | S-6, T-1b, T-2, T-3 |

No H (data-destructive) items in this lane. No B, E items arose.

**Headline corrections to prior audits** (both proven below, both change what a future
engineer would otherwise do):

1. `tabLongPress` is **not** safe to remove. Deleting the handler is a user-visible
   behaviour change, proven from React Native's own Pressability source.
2. The notification-prefs AsyncStorage blob **is cloud-synced** (through `user_prefs`).
   Campaign 3's Review-B findings B-2/B-3 were reasoned from the premise that it is
   device-local. That premise is false, and it changes the rows-to-blob verdict from
   "divergence risk" to "redundant mirror, no product defect".

---

## PHASE 3 — CAMPAIGN 3 DEFERRED ITEMS

### P3-1 — Dead `applyNotifications` in NotificationSettingsScreen — **CLASS F, REMOVE**

**Current state on main.**
`applyNotifications` is defined at `src/screens/NotificationSettingsScreen.js:64-130`.
Its only caller is `scheduleApply` (`:368-381`, call at `:374`), which itself carries
`// eslint-disable-next-line no-unused-vars` at `:367` and the retention note at
`:363-366` ("only reachable via handlers removed in a half-finished refactor").
`scheduleApply` has zero call sites in the file and zero anywhere in `src/`.

**Why zero callers is not the proof (what actually earns class F).**
The order forbids deleting on caller count, so every unique responsibility the function
holds was traced to a live replacement:

| Responsibility in the dead function | Live replacement on main | Evidence |
|---|---|---|
| Cancel + re-lay morning-weight reminder | `CoachingRemindersScreen.applyScheduled` | `CoachingRemindersScreen.js:110-115` |
| Evening weigh-in backstop | same | `CoachingRemindersScreen.js:115` |
| Cancel + re-lay weekly check-in reminder (7-day min gap) | same | `CoachingRemindersScreen.js:111, 116-119` |
| Blob write of the reminder schedule | same, and **merge-safe** unlike the dead code | `CoachingRemindersScreen.js:121-133` |
| SQLite mirror `morning_weight` | same | `CoachingRemindersScreen.js:152` |
| SQLite mirror `weekly_checkin_reminder` | same | `CoachingRemindersScreen.js:153-156` |
| SQLite mirror `training_reminder` | `NotificationSettingsScreen.persistTrainingPreference` | `NotificationSettingsScreen.js:426-429` |

- **Decision check.** D94-1 (`DECISIONS-2026-07-09.md:2548-2571`) and
  `SETTINGS-OWNERSHIP.md:12` ruling #3 ordered exactly this transfer: "restore the
  mirror at the live writer only if the rows have a live reader; else dead residue →
  Campaign 4." The mirror was restored at the live writer in Campaign 3
  (`CoachingRemindersScreen.js:134-158`, whose comment names this dead code as the
  reason). The transfer is complete, so nothing unique remains here.
- **Rollback check.** The `:363-366` comment is a prior agent's caution note, not a
  founder decision or a recorded rollback seam. No decision, taskboard entry or locked
  doc retains it. `git log` records no "keep for rollback" instruction.
- **Test check.** No test references `applyNotifications` as behaviour. The three
  mentions are prose only: `reminderReschedule.guard.test.js:20`,
  `CoachingRemindersScreen.js:138`, `SETTINGS-INVENTORY.md:414`. The screen's live
  guards (`campaign1.integrity.test.js:249-255` MEAL_REMINDERS_KEY import;
  `notificationSettingsTrainingCopy.guard.test.js`; `cp10BatchGLane1LiveTheme.test.js:298`
  wiring-only; `screen-mount.test.js`) are all unaffected by this deletion.
- **Dynamic-access check.** No `require`/`eval`/registry reaches it; the function is
  module-private (not exported).
- **Latent hazard, strengthening the case.** `:90` writes the blob **wholesale**
  (`JSON.stringify(prefs)`, no merge). Every other writer of that key merges
  (`NotificationSettingsScreen.js:417-420`, `CoachingRemindersScreen.js:123-133`,
  `ProOnboardingScreen.js:831-848` after the Campaign 3 fix). If this path were ever
  re-wired it would silently drop `missedCheckinEnabled`, `plannedMealConfirmEnabled`,
  `partnerCheerEnabled` and `activationNudgeEnabled`.

**What dies with it (the full blast radius).**
1. `applyNotifications` (`:64-130`) and `scheduleApply` (`:363-381`).
2. Five imports that become unused: `scheduleMorningWeightNotification`,
   `scheduleEveningWeightReminder`, `scheduleCheckinReminder` (`:11-13`),
   `cancelMorningNotification`, `cancelCheckinNotification` (`:14-15`).
   `requestNotificationPermissions` (`:16`) stays (used `:346`, `:568`);
   `restoreNotifications` (`:29`) stays (used `:530`).
3. `saving` / `saved` state (`:173-174`) and `savedTimer` (`:175`) — set only inside
   `scheduleApply`. The "Saving..." / "Saved" render block (`:834-835`) becomes
   permanently unreachable and goes with them, plus `styles.savingText` / `savedText`
   (`:992-997`, `:1018-1024`) and their `buildLiveStyles` mirrors (`:1049`, `:1053`).
4. `debounceTimer` (`:177`) and the `savedTimer`/`debounceTimer` halves of the unmount
   cleanup (`:358-361`).

**What must NOT die with it (explicit do-not-touch).**
- `getPrefs` (`:383-408`) stays: it is live via `handleTrainingToggle` (`:442`) and
  `handleTrainingTimePick` (`:484`).
- The `morningEnabled/morningHour/morningMinute/checkinEnabled/checkinDay/checkinHour/
  checkinMinute` state (`:145-151`) and the SQLite read block (`:198-236`) stay. They
  are not decoration: `getPrefs` folds them into `persistTrainingPreference`'s merge
  (`:420`), which is the only path on main by which a **pulled** `morning_weight` /
  `weekly_checkin_reminder` row can reach the AsyncStorage blob the schedulers read.
  Removing them silently deletes the one rows-to-blob path (see P3-5).

**Act plan.** Delete items 1–4 above in one commit. Lint (`no-unused-vars`) confirms the
import/state sweep is complete. Device checklist: open Settings > Notifications, toggle
training reminders on/off, change the reminder time, confirm the row persists across a
kill/relaunch; open Settings > Coaching reminders, change the morning hour and the
check-in day, confirm "Reminder schedule saved" toast and that both reminders re-lay.

---

### P3-2 — Lying `mealSlots` comment — **CLASS F, CORRECT**

**Exact lines and exact text on main.**

`src/lib/food/mealSlots.js:6-8`:
```
 * ("Meal 1", "Meal 2", ...) plus, when the user opts in
 * (userProfile.mealPlanPeriWorkout, "Around training" on MealPlanScreen),
 * Pre-workout and Post-workout as named meals the user places around
```

`src/lib/food/mealSlots.js:133-135`:
```
// They are the same opt-in the meal-plan generator already gates on
// (userProfile.mealPlanPeriWorkout, surfaced as "Around training" on
// MealPlanScreen) so enabling it in one place turns them on everywhere.
```

**Proof the claim is false on current main.** `MealPlanScreen`'s preference sheet renders
exactly two controls, Meals per day and Variety (`MealPlanScreen.js:209-246`). The only
`mealPlanPeriWorkout` references in that file are **reads** (`:780`, `:782`). The store
setter permits the key (`useAppStore.js:1862`) but no UI passes it: the sheet's writer
`handleSetPref` (`MealPlanScreen.js:754-771`) never sends it. Live readers exist
(`DiaryScreen.js:108`, `FoodDetailSheet.js:104`, `QuickAddSheet.js:36`,
`mealPlanAssembler.js:618`), so the flag is read-only in practice and permanently `false`
(`planPreferences.js:28`).

**Authority.** `SETTINGS-OWNERSHIP.md:17` (D94-1): "The lying mealSlots comment is
recorded for Campaign 4. No UI invented from key residue." The *control* question is
**FR-2 and stays open** — this item corrects the comment only and must not add, remove or
rename any control or key.

**Exact correction (comment text only, no code change).**

`:7` becomes:
```
 * (userProfile.mealPlanPeriWorkout, an internal preference with no control
 * on MealPlanScreen today - see FR-2),
```
`:133-135` becomes:
```
// They are the same opt-in the meal-plan generator already gates on
// (userProfile.mealPlanPeriWorkout). That preference currently has NO user
// control anywhere: MealPlanScreen's preferences sheet renders only Meals per
// day and Variety (MealPlanScreen.js:209-246), so the flag is permanently
// false unless FR-2 rules otherwise. Every reader honours it, so a control
// added later turns the slots on everywhere at once.
```

British English, no em dash, no user-facing string touched.

---

### P3-3 — Inert `tabLongPress` — **CLASS D, KEEP AND DOCUMENT (do NOT remove)**

**The finding Campaign 3 recorded.** `VolyumeTabBar.js:156-158` emits `tabLongPress` and
no listener exists anywhere in `src/` (`CONTROL-GAPS-EVIDENCE.md:714, 763`). Verified on
main: the only occurrence of the string is the emit itself; `RootNavigator.js` registers
`tabPress` listeners only (`:366, :443, :473, :500, :535, :608`), as do
`HomeScreen.js:374`, `PlansScreen.js:161`, `AnalyticsScreen.js:250`.

**Why the expected act ("remove the dead handler/plumbing") is wrong here.**
Removing `onLongPress` is not a no-op. React Native's Pressability suppresses `onPress`
only when an `onLongPress` config is present:

`node_modules/react-native/Libraries/Pressability/Pressability.js:749-758`
```
const {onLongPress, onPress, android_disableSound} = this._config;
if (onPress != null) {
  const isPressCanceledByLongPress =
    onLongPress != null && prevState === 'RESPONDER_ACTIVE_LONG_PRESS_IN';
  if (!isPressCanceledByLongPress) {
    ...
    onPress(event);
  }
}
```

The `Pressable` at `VolyumeTabBar.js:161-168` passes both `onPress` and `onLongPress`.
**Today:** press-and-hold a tab, release, nothing happens. **If `onLongPress` is deleted:**
the same gesture falls through to `onPress` and navigates (and fires the M1 selection
haptic through `screenListeners`). That is a real, user-observable behaviour change
produced by deleting "dead" code, which is exactly what the CORE CLEANUP LAW exists to
prevent.

**Second, independent reason to keep.** The file's own stated contract is stock-bar
parity: `VolyumeTabBar.js:12-14` — "tab presses are emitted exactly like the stock bar, so
the NAV-5 re-tap-to-root listeners keep working too". `tabLongPress` is part of the stock
`BottomTabBar` event surface; dropping it makes the custom bar quietly non-equivalent for
any future `screenListeners` consumer.

**Verdict.** Class D, intentional compatibility seam. Keep the handler and the emit.
The only defensible act is documentation.

**Act plan.** Add one comment above `:156`:
```
// Stock-bar parity (see the header note). No listener consumes tabLongPress
// today, and the handler is deliberately retained anyway: Pressability only
// suppresses onPress after a long press when an onLongPress config exists
// (Pressability.js "isPressCanceledByLongPress"), so deleting this would make
// press-and-hold on a tab start navigating.
```
No test needed (behaviour unchanged); if a tombstone is wanted, a source guard asserting
`onLongPress` survives in `VolyumeTabBar.js` fits Phase 24's pattern.

---

### P3-4 — "LOCAL-ONLY" comment imprecision — **CLASS F, CORRECT**

**The mechanism, proven end to end.** Six profile fields are documented as local-only.
All six live in `@volyume_user_profile_<uid>` (`useAppStore.js:15`,
`PROFILE_KEY_PFX`), and that key is **not** excluded from pref sync:

- `shouldSyncPref` is allow-by-prefix: `sync.js:1362-1365` returns true for any
  `@volyume_` key not matching `PREF_EXCLUDE_PATTERNS` (`sync.js:1300-1360`).
- `@volyume_user_profile_` appears in none of the 18 exclusion patterns (verified by
  running the pattern list against the key).
- `_pushAllUserPrefs` (`sync.js:1455-1477`) ships every passing key to `user_prefs`.
- `_pullUserPrefs` (`sync.js:1968-2008`, called from `pullFromCloud` at `sync.js:1618`)
  writes them back with "cloud value wins unconditionally" for non-guarded keys.

So the fields do leave the device, and can be overwritten from the cloud. The comments'
underlying *fact* (no dedicated `users_profile` column) is correct; the *word* is not.

**Authority.** `SETTINGS-OWNERSHIP.md:16` (D94-1) DOCUMENTed this and sent the comment
fixes to Campaign 4. This is not a data-protection defect (the values are innocuous), it
is a truth defect that would make a future engineer build a false "device-only" promise.

**Exact corrections.**

1. `src/screens/SettingsCoachingScreen.js:34-36`, currently
   ```
   // C1/C2 (founder decision #2): coaching tone register + the opt-in science
   // layer. Both are LOCAL-ONLY profile fields (no synced column; the pull
   // merge in sync/tables/profiles.js spreads local first, so they survive).
   ```
   becomes
   ```
   // C1/C2 (founder decision #2): coaching tone register + the opt-in science
   // layer. Both are profile fields with NO dedicated cloud column (the
   // profiles pull merge spreads local first, so they survive it). They are
   // NOT device-only: they ride @volyume_user_profile_<uid> into user_prefs
   // via the bulk pref push (sync.js:1362 shouldSyncPref, :1455
   // _pushAllUserPrefs) and come back on a pull. Never build a user-facing
   // "stays on this device" claim on this comment.
   ```

2. `src/screens/SettingsCoachingScreen.js:42-45`, replace
   `// tone above (which is voice register only). Same local-only field` /
   `// pattern as coachTone/showScience: no synced column, survives the pull` /
   `// merge (sync/tables/profiles.js spreads local first). Default`
   with
   ```
   // tone above (which is voice register only). Same field pattern as
   // coachTone/showScience: no dedicated cloud column, survives the profiles
   // pull merge, still shipped inside the profile blob by pref sync. Default
   ```

3. `src/store/useAppStore.js:1834-1836`, replace
   `// R1). A local profile field (the meal plan is local-only for now, so no` /
   `// cloud column / pushPrefSoon); the generator + swaps read it via`
   with
   ```
   // R1). A profile field with no cloud column and no pushPrefSoon (the meal
   // plan has no dedicated cloud table yet). It is still carried to the cloud
   // inside the profile blob by the bulk pref push (sync.js:1455); the
   // generator + swaps read it via
   ```

4. `src/store/useAppStore.js:1851-1853`, replace
   `// variety dial, fat convention, peri-workout slots. Local profile` /
   `// fields (plan is local-only); merged + persisted, read by`
   with
   ```
   // variety dial, fat convention, peri-workout slots. Profile fields with no
   // cloud column of their own (they still ride the profile blob into
   // user_prefs); merged + persisted, read by
   ```

5. `src/store/useAppStore.js:1871-1872`, replace
   `// Calorie banking (CB-1, "Plan a bigger day"): a local profile field like the` /
   `// meal-plan prefs (plan/banking are local-only). `bank` is the`
   with
   ```
   // Calorie banking (CB-1, "Plan a bigger day"): a profile field like the
   // meal-plan prefs - no cloud column, but still shipped inside the profile
   // blob by pref sync. `bank` is the
   ```

**Out of scope for this item, stated so it is not confused with the above.** The other 20+
"local-only" comments found in `src/` (e.g. `database.js:1689`, `food/db.js:354`,
`progressScanClassificationHistory.js:14`) describe tables genuinely absent from
`SYNC_REGISTRY` and were spot-checked as accurate. Do not sweep them.

**Suggested guard (Phase 24 pattern, optional).** A source guard asserting
`@volyume_user_profile_` never appears in `PREF_EXCLUDE_PATTERNS` **and** that
`SettingsCoachingScreen.js` contains no bare `LOCAL-ONLY` claim, so the corrected comment
cannot silently regress.

---

### P3-5 — Rows-to-blob notification mirror gap — **CLASS D, DOCUMENT, NO REFACTOR**

The order requires a determination between four options and forbids a refactor absent a
concrete correctness issue. The determination:

**The architecture as it actually is.**
- Per-category SQLite rows (`notification_preferences`, `lib/notifications/preferences.js`)
  are written by `CoachingRemindersScreen` (`:152-156`, `:310`, `:337`, `:368`) and
  `NotificationSettingsScreen.persistTrainingPreference` (`:426-429`), pushed/pulled by
  `sync/tables/notificationPreferences.js`, registry entry `registry.js:179-186`
  (bidirectional, last_write_wins), cloud table from migration 044.
- Every runtime *send* decision reads the AsyncStorage blob
  `@volyume_notification_prefs`, not the rows: `scheduler.js:626, 803, 912, 1020, 1203,
  1445`, `RootNavigator.js:1098`, and the screens.
- The only rows-to-blob path is indirect: `NotificationSettingsScreen` seeds state from
  the rows on mount (`:198-236`) and `getPrefs` folds that state into
  `persistTrainingPreference`'s merge write (`:420`) whenever the user touches the
  training toggle or time.

**The correction that changes the verdict.** Campaign 3's Review B concluded a second
device "will never honour the choice" (`REVIEW-B-power-user.md:113-119, 131-158`), and
D94-3 recorded the gap as pre-existing architecture on that basis. The premise is wrong:
`@volyume_notification_prefs` is itself a `@volyume_` key, is **not** in
`PREF_EXCLUDE_PATTERNS` (`sync.js:1300-1360`), and is therefore pushed by
`_pushAllUserPrefs` (`sync.js:1455-1477`) and written back by `_pullUserPrefs`
(`sync.js:1968-2008`, cloud wins). **The blob syncs cross-device.** A second device does
honour the user's reminder choices, through the blob, on the next `pullFromCloud`.

**Therefore:**
- Not **state divergence**: both stores are written together by the live editor
  (`applyScheduled` writes blob and rows in the same function), and the blob is the one
  the schedulers read. No path was found where the two stores can carry different values
  that a user could observe.
- Not **dead mirror residue**: the rows have a live reader
  (`NotificationSettingsScreen.js:198-236`), a live writer, a registry entry, a cloud
  table (migration 044) and a locked requirement — `NOTIFICATIONS_LOCKED.md:156`
  ("RLS scoped to user_id. Synced via the registry"). Deleting them would breach a locked
  contract and strand a live cloud table.
- Not **deliberate belt-and-braces either**: it is a redundant second sync channel for
  values the pref sync already carries. That is honest to say and not worth acting on.
- **It belongs in a future sync-consolidation project** — exactly where Phase 10 says
  broad consolidation goes. Class D, keep.

**One real, narrow gap worth recording (not a product defect, do not fix here).**
`ProOnboardingScreen.js:831-848` writes the blob but calls no `setPrefRow`, so for a user
who never opens Settings > Notifications the cloud `notification_preferences` rows for
`morning_weight` / `weekly_checkin_reminder` are simply absent until
`migrateFromLegacyBlob` runs (`NotificationSettingsScreen.js:281-284`). Consequence is
cloud-table completeness only: the user's reminders still work, still sync, still restore,
because the blob carries them. Record it against the future consolidation; adding a
`setPrefRow` call to onboarding is not warranted on this evidence.

**Act plan.** No code change. Correct the two stale comments that encode the wrong model,
so the next audit does not re-derive Review B's conclusion:
- `CoachingRemindersScreen.js:134-141` — keep the "live writer" framing, drop the implied
  claim that the rows are the cross-device carrier; state that the blob syncs via
  `user_prefs` and the rows are the registry mirror required by
  `NOTIFICATIONS_LOCKED.md:156`.
- `lib/notifications/preferences.js:16-24` — the "Sync direction" block still names
  `NotificationSettingsScreen` as the caller of `setPreference` and `sync.js
  bulkUploadLocalData` as the pusher. Both are stale: the live callers are
  `CoachingRemindersScreen` and `persistTrainingPreference`, and the push is
  `sync/tables/notificationPreferences.pushNotificationPreferences`.

---

## PHASE 12 — DEAD SETTINGS / PREF KEYS

Scope note: FR-1..FR-5 territory is listed for completeness under S-6 and is **not**
proposed for any change, per the order ("Do NOT resolve FR-1/FR-3/FR-4/FR-5 without
founder rulings" and "Do not let this cleanup accidentally resolve them by deleting
code"). Cardio keys/toggles belong to the cardio lane and are not proposed here.

### S-1 — `setBarWeight` — **CLASS F (dead runtime control), REMOVE THE SETTER ONLY**

- **Definition:** `src/store/useAppStore.js:1889-1901`. **Callers:** none. Repo-wide grep
  for `setBarWeight` returns only the definition, a prose mention at
  `useAppStore.js:240`, `ARCHITECTURE.md:544`, and two audit docs. No screen selects it.
- **Why it is dead, not hidden:** the Settings row was removed at founder request, with
  the removal recorded in source at `SettingsProfileScreen.js:227-231`
  ("Gym weight units, body weight units, and bar weight rows removed at user request...
  The store still holds these values; they just aren't user-editable from Settings any
  more"). `SettingsWorkoutScreen` renders body-weight unit, rest defaults and rest alert,
  and no bar-weight control (`SettingsWorkoutScreen.js:39-56`).
- **Decision check:** D57 (`DECISIONS-2026-07-09.md:1107`) dropped the plate calculator;
  the order's Phase 23 pins "PLATE CALCULATOR - never reappears". Nothing retains the
  setter as a rollback seam.
- **DEAD RUNTIME CONTROL vs HISTORICAL STORAGE — the distinction the order asks for:**
  - **Runtime control (dead):** `setBarWeight`. Remove.
  - **Storage and read path (LIVE, keep untouched):** the `barWeight` store value
    (`useAppStore.js:1888`, default 20) is read live by `ActiveWorkoutScreen.js:224, 233`
    and consumed at `:3395` as the warm-up ramp's bar weight
    (`warmupRamp(working, { barKg: barWeight || DEFAULT_BAR_KG })`). The synced column
    `bar_weight` (`sync/tables/profiles.js:36, 107, 119, 137, 242`), the
    `PROFILE_FIELDS_TRACKED` entry (`useAppStore.js:64`) and the hydration paths
    (`RootNavigator.js:1036`, `useAppStore.js:946, 966`) all stay. This is a live read of
    a value that is currently only ever the default, not historical residue.
- **Act plan.** Delete `useAppStore.js:1889-1901` only. Do not touch the field, the
  column, `PROFILE_FIELDS_TRACKED` or `plateMath.js`. Device checklist: start a barbell
  session, open the warm-up ramp sheet, confirm the ramp still computes off a 20 kg bar.
- **Cross-lane note (do not action here):** `calculatePlates` (`lib/plateMath.js:42`) and
  `PLATE_SET_KG` have no live caller — only `DEFAULT_BAR_KG` is imported
  (`ActiveWorkoutScreen.js:73`). That belongs to the dead-functions lane
  (`AUDIT-DEAD-FUNCTIONS.md`), not this one.

### S-2 — `SettingsWorkoutScreen` header comment claims a bar-weight row — **CLASS F, CORRECT**

`src/screens/SettingsWorkoutScreen.js:30-37` states the moved block is
"body-weight unit, **barbell weight**, global default rest timer, and auto-start rest".
The screen renders no barbell-weight control (`:39-56` destructure has no `barWeight`;
grep for `barWeight` in the file returns only this comment). Same defect class as P3-2:
a comment that would send the next engineer looking for a control that does not exist.
Correct to "body-weight unit, global default rest timer, auto-start rest and the
rest-finished alert (the bar-weight row named in the original R1/R2 scope was removed at
founder request, see SettingsProfileScreen.js:227-231)".

### S-3 — Unused `CATEGORY` enum members — **CLASS C, KEEP (do not delete)**

Eight members of `src/lib/notifications/categories.js:17-46` have zero references outside
their own file: `DAILY_CHECKIN_REMINDER`, `SUBSCRIPTION_PAYMENT_FAILURE`,
`SUBSCRIPTION_EXPIRING`, `SYNC_ERROR`, `ED_PATTERN_LOCKOUT`, `FFM_FLOOR_HOLD`,
`COACH_TRIAL_ENDING`, `REST_TIMER`.

They are **not** dead residue:
- The file is the transcription of a locked contract — its own header says "The category
  enum from NOTIFICATIONS_LOCKED.md. Every scheduled push, in-app banner, or email belongs
  to exactly one category" (`:1-15`).
- Three of them are unused *by design*: `NOTIFICATIONS_LOCKED.md:239` — "ED-pattern
  lockout, FFM-floor hold and sync errors remain in-app only". An enum member with no
  scheduler is the locked spec's stated outcome, not an oversight.
- `REST_TIMER` has a live sibling (`REST_TIMER_CATEGORY_ID`, `:53`) consumed by the
  native rest-timer notification path.
- Deleting members would also breach the file's stated purpose as the registration point
  for new surfaces.

Class C, internal and required. No action. Recording it here so a future dead-code sweep
does not delete them on caller count.

### S-4 — `MealNamesScreen` route and `@volyume_meal_labels` — **CLASS D, KEEP**

Campaign 3 classed this F (`SETTINGS-INVENTORY.md:190`) on the evidence that the route is
registered (`RootNavigator.js:210, 558`) with no `navigate('MealNames')` anywhere.
Verified true on main. **But the retention is explicitly ruled**, in source:
`SettingsScreen.js:67-70` — "Founder order (2026-07-13): the 'Meal names' settings row is
REMOVED - not needed. The MealNames screen and its route stay registered (harmless,
unreachable from Settings) in case meal renaming ever returns by founder decision."

That is a founder-recorded rollback seam. Class D, keep the route, the screen and the key.
The key `@volyume_meal_labels` (`food/mealSlots.js:37`) retains a live reader
(diary meal headers) for any user who wrote labels before the row was removed, so it is
HISTORICAL STORAGE that must not be cleared. Cross-lane note to `AUDIT-ROUTES.md`: this
route is **not** a stale registration.

### S-5 — Health-integration pref keys — **CLASS G, DO NOT ACT IN THIS LANE**

`isHealthAvailable()` is permanently false on both platforms: the native getters were
stubbed to `null` when the integration was removed (founder 2026-06-30,
`src/lib/health.js:100-119`). Consequently the following are unreachable at runtime:
- `@volyume_ios_health_scopes` (`health.js:45`),
- `@volyume_health_last_import_<uid>` (`health.js:29`),
- `@volyume_health_cardio_last_import_<uid>` (`health.js:735`),
- the whole `SettingsHealthScreen` (its Settings row is gated on
  `isHealthAvailable()`, `SettingsScreen.js:22`), which is where Campaign 3's F-class
  "Health provider settings (5 rows)" came from (`SETTINGS-INVENTORY.md:259`).

**Why this lane stops here.** Two of the five rows are "Read cardio sessions" and "Write
workouts", which sit precisely on the three-way distinction the order forbids collapsing
(cardio logging vs general activity/steps vs writing a strength workout to Health).
Disposition belongs with the cardio/health lane (`AUDIT-CARDIO.md`) and the routes lane,
not with a settings sweep. Recorded as class G (product-boundary remnant), no proposal.

**One consequence that IS in this lane** is carried under T-1 below: with health
permanently unavailable, no step data can reach the coach.

### S-6 — FR-1..FR-5 territory — **CLASS I, UNTOUCHED**

Verified still open on main; the decisions register has no later ruling
(`DECISIONS-2026-07-09.md:2569-2571, 2600`). Listed so this sweep is provably not
resolving them by deletion:
- **FR-2** `userProfile.mealPlanPeriWorkout` / `mealPlanFatConvention` /
  `mealPlanPinnedMeals` — readers with no writer, permitted by `setMealPlanPrefs`
  (`useAppStore.js:1861-1862`), consumed by `mealPlanAssembler.js:119, 618` and
  `mealPlanService.js:113-114`. **No change proposed** beyond the P3-2 comment fix.
- **FR-3** `@volyume_progress_scan_hide_exact_numbers` — `getProgressScanHideExactPreference`
  is live (`CoachOutputScreen.js:1508`); `setProgressScanHideExactPreference`
  (`progressScanPreferences.js:44-50`) has no production caller and a pinned guard forbids
  one (`ProgressPhotosScreen.progressScan.guard.test.js:29`). The setter is the exact
  thing FR-3 option A would delete. **Do not delete it in Campaign 4 cleanup** — that
  would silently rule FR-3.
- FR-1, FR-4, FR-5 have no dead-key surface in this lane.

Campaign 4 evidence adds nothing new to any of the five; recommendations stand as recorded
in `SETTINGS-OWNERSHIP.md:27-92`.

### S-7 — `@volyume_notification_prefs` is a synced key — **record of fact, no action**

Stated explicitly because two prior audits assumed otherwise (see P3-5). Not a dead key.

### S-8 — `partnerCheerEnabled` — **CLASS A, no action**

Campaign 3 recorded it as a reader with no writer (`SETTINGS-INVENTORY.md:216`, G-class
question G5). **Resolved on current main:** `CoachingRemindersScreen.js:354-374` writes
both the blob flag and the `partner_cheer` row, with a rendered toggle at `:516-523`.
Live. Re-verified so it does not resurface as a dead key.

### S-9 — Other read/write-asymmetry candidates checked and cleared — **CLASS A**

A mechanical sweep of all 130 `@volyume_` key literals in `src/` + `App.js` + `index.js`
produced candidates that all cleared on inspection, recorded so the work is not repeated:
`@volyume_partner_moments_seen_v1` / `_pb_v1` (read through the `readJson` wrapper,
`partners/moments.js:128-130, 250-252`); `@volyume_progress_scan_camera_facing` /
`_timer_seconds` (written by `ProgressGhostCapture.js:361, 367`);
`@volyume_physique_tracking_enabled` (read `BodyMetricsScreen.js:595`, written `:598` and
`NutritionTargetsScreen.js:539`); `@volyume_body_metrics_` (used
`NutritionTargetsScreen.js:517`); `@volyume_pull_wm_` / `_push_wm_`,
`@volyume_pro_onboarding_draft_`, `@volyume_deletion_auth_pending_`,
`@volyume_recap_notified_` (all read/written across multi-line calls the scan could not
see). No dead key found among them.

---

## PHASE 18 — ANALYTICS / TELEMETRY CATALOGUE

**Cardio result, stated plainly as the order requires:** there is **no cardio-specific
telemetry anywhere in the codebase**. `src/screens/LogCardioScreen.js`,
`src/screens/CardioHistoryScreen.js` and every file in `src/lib/cardio/` contain zero
`track`/`postEvent`/`telemetry` references, and no event name in
`src/lib/telemetry/events.js` is cardio-related. Removing cardio logging therefore removes
no emitter and requires no catalogue change. Nothing in this section touches Campaign 1's
privacy decisions (no allow-list is loosened, no new payload, no new transmission).

### T-1 — `step_tdee_modifier_evaluated` is an IMPOSSIBLE EVENT

**T-1a — the catalogue entry: CLASS F, CORRECT.**
**T-1b — the emit block: CLASS I, ruling needed (do not delete alone).**

**Proof the event can never fire.**
1. `runWeeklyCoach` has exactly one production call site:
   `src/screens/CoachOutputScreen.js:1732`.
2. That call hard-codes the step inputs off:
   `src/screens/CoachOutputScreen.js:1760-1762`
   ```
   // Step targets are not part of the shipped coaching product.
   dailyStepsSeries: null,
   stepsTodayKey: null,
   ```
   (and `currentStepsTarget: 0`, `stepsEnabled: false` at `:1782-1783`).
3. `src/lib/weeklyCoach.js:986` initialises
   `let stepModifier = { gain: 0.5, active: false, direction: 0, reason: 'not_evaluated' };`
   and `:1043` is the only reassignment, guarded by
   `if (Array.isArray(dailyStepsSeries) && dailyStepsSeries.length && !rapidLossOverride)`.
4. `result.stepModifier.reason` is therefore always `'not_evaluated'`, and the emit at
   `src/screens/CoachOutputScreen.js:1924-1932` is guarded by
   `if (result.stepModifier && result.stepModifier.reason !== 'not_evaluated')`.

**Corroborating boundary evidence.** Step data could only ever come from the platform
health aggregator (`lib/activitySteps.js:1-18, 41-46`), and that aggregator is permanently
unavailable since the 2026-06-30 removal (S-5). So the event is impossible from both ends.

**T-1a act plan (safe, in scope).** `src/lib/telemetry/events.js:180` currently reads
`{ name: 'step_tdee_modifier_evaluated', deferred: false, panel: 2 },`. Flip it to
`deferred: true` with
`deferralReason: 'the only runWeeklyCoach call site supplies dailyStepsSeries: null (CoachOutputScreen.js:1761), so stepModifier.reason is always not_evaluated and the emit is unreachable'`.
This is precisely the order's "telemetry catalogue does not claim an event is emitted when
its feature is permanently removed". No transmission changes (the event never sends today);
`ALLOWED_EVENTS` loses a name that is never used. `telemetry.catalogue.test.js` will then
`test.skip` it (`:52-56`), which is the correct state.

**T-1b, why the emit block is class I.** Deleting `CoachOutputScreen.js:1922-1932` alone
leaves `computeStepTrendModifier` and the `weeklyCoach.js:1041-1052` branch as an engine
seam with no observability, and the whole step-trend engine's disposition (live seam vs
dead engine function) belongs to the dead-engine-function lane
(`AUDIT-DEAD-FUNCTIONS.md`) plus the order's Phase 2 warning not to remove
steps/activity while removing cardio. **Do not delete the emit in this lane.** Either it
goes with the step-trend engine in one ruled change, or it stays as the seam's paired
observability. Flagged to that lane.

**Test-truth note (Phase 17 adjacent).** `telemetry.catalogue.test.js:57-72` accepts an
event as "emitted" on a bare string-literal match with `matches.length >= 2`. It cannot
distinguish an emitter from an unreachable one, which is exactly how this entry stayed
`deferred: false`. Worth one line in that test's header saying what it does not prove.

### T-2 — `chart_metric_changed`: an emitter for an event on no allow-list — **CLASS I**

`src/screens/ExerciseDetailScreen.js:560` emits `chart_metric_changed`. The name appears
in **no** allow-list: not in `src/lib/telemetry/events.js`, and not in any
`supabase/migrate_*.sql` `record_engine_telemetry` CHECK list. `postEvent` therefore drops
it before persisting and logs a warning every time
(`src/lib/telemetry/transport.js:66-71`). The sibling on the very next control,
`chart_window_changed` (`:554`), is catalogued (`events.js:152`) and works.

The surface is live (`selectChartMetric` is a real, reachable control), so this is not a
retired-feature remnant. Two mutually exclusive fixes, and Phase 18 rules out one of them:

- **(A) Remove the dead emit** at `:560`. Loses a metric that was never collected.
  Consistent with "Remove impossible emitted-event code where safe".
- **(B) Add the event to the client catalogue and a server allow-list migration.** This is
  new data transmission, which Phase 18 forbids ("Do not transmit new data"), and would
  need a migration written-not-run under Phase 28.

Class I, lead/founder ruling. Independent of the choice, the current state also produces a
recurring `telemetry.transport.unknownEvent` warning in the error log on an ordinary user
action, which is worth stating in the ruling.

### T-3 — `partner_block_proposed` / `partner_block_adopted`: client catalogue omission — **CLASS I**

- Emitted at `src/lib/partners/service.js:515` and `:539`, from live paths
  (`usePartners.js:692, 709`).
- **On the server allow-list**: `supabase/migrate_100_partner_shared_blocks.sql:279-280`
  (which explicitly introduces "three new derived-only event names
  (partner_block_proposed / adopted / ...)", `:31`), re-listed in
  `migrate_102_partner_safety_consent.sql:410-411`,
  `migrate_103_feature_locked_telemetry.sql:111-112`,
  `migrate_104_photo_prompt_telemetry.sql:108-109`.
- **Absent from the client catalogue** `src/lib/telemetry/events.js` (which does carry the
  third of the trio, `partner_block_left`, at `:196`, added precisely because the
  client allow-list had rejected it — same bug, previously fixed for one name only).
- Result: both are dropped at `transport.js:66-71` with a warning, every time.
- Tests assert the emit happens (`partners/__tests__/service.test.js:277, 301`), so the
  test suite pins the call while the runtime discards it.

Not dead residue and not a boundary remnant: the server was deliberately built to accept
them. This is a client-side omission whose fix is "add two names to the catalogue", which
under Phase 18 counts as newly transmitting data. Class I, ruling required. The alternative
(delete the emitters and the two test assertions) throws away deliberately designed
adoption telemetry, so it should not be taken silently.

### T-4 — emitters checked and cleared

`ocr_writeback_attempted` (`food/writeback.js:158, 167`, live via
`AddCustomFoodScreen.js:29` / `SettingsPrivacyScreen.js:13`), `feature_locked_viewed`
(`ProGate.js:174`), `photo_prompt_shown` / `_accepted` (`ProgressPhotoPrompt`, rendered at
`WorkoutSummaryScreen.js:1358`), `app_cold_start` / `app_foregrounded` /
`app_backgrounded` (emitted from `App.js:743` and `:892`, outside `src/` — a `src`-only
grep makes these look uncatalogued, which is a trap worth recording), and the deferred
entries `account_deleted`, `held_decision_created/cleared`, `first_session_choice`,
`onboarding_quiz_completed` (correctly flagged, reasons recorded in `events.js`). No
action on any of them.

---

## Cross-lane handoffs

| To | Item |
|---|---|
| `AUDIT-CARDIO.md` | S-5 health-integration keys + `SettingsHealthScreen` disposition; and the clean result that no cardio telemetry exists to remove |
| `AUDIT-ROUTES.md` | S-4: `MealNames` is a founder-recorded retention (`SettingsScreen.js:67-70`), NOT a stale registration |
| `AUDIT-DEAD-FUNCTIONS.md` | T-1b step-trend engine seam; `calculatePlates` (`plateMath.js:42`) with no live caller |
| Phase 17 / test truth | `telemetry.catalogue.test.js:57-72` proves literal presence, not reachability |

## Founder / lead rulings requested from this lane

1. **T-2** `chart_metric_changed`: remove the emitter, or catalogue it (new transmission,
   needs a Phase 28 written-not-run migration).
2. **T-3** `partner_block_proposed` / `partner_block_adopted`: catalogue them client-side
   (server already accepts them; counts as new transmission) or delete the emitters and
   their pinned test assertions.
3. **T-1b** the step-trend emit block: retire with the step-trend engine, or retain as its
   paired seam.

FR-1..FR-5 remain open and untouched by this lane.
