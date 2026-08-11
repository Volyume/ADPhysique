# NOTIFICATION MATRIX — Campaign 7, Phases 19-26

Rebuilt from CURRENT code on 2026-08-11 (HEAD `7b755fc6`). Nothing here is
carried over from the `docs/NOTIFICATIONS_LOCKED.md` ledger; every row was
re-derived from a call site. Read-only audit — no code was changed.

Authority: Campaign 7 order, Phases 19-24 plus the evidence halves of 25-26.
Law: `docs/NOTIFICATIONS_LOCKED.md`. Code: `src/lib/notifications/`,
`src/lib/payments/`, `supabase/functions/`.

---

## 0. THE COUNT (Phase 19 headline)

The old ledger's "23" is the size of the **enum**, not the inventory. Both
numbers happen to be 23 today, but they are not the same 23.

| Measure | Count |
| --- | --- |
| `CATEGORY` enum entries (`categories.js:17-44`) | **23** |
| …of those, with a live writer anywhere in the tree | **17** |
| …of those, referenced NOWHERE outside `categories.js` (dead enum rows) | **6** |
| Distinct OS-visible notification surfaces actually laid/presented | **23** |
| …plus dead code paths that can never fire | **1** (`active_workout`) |
| `data.type` values in flight with **no** enum row of their own | **3** (`partner_streak`, `partner_joined`, `rest_end`) |
| Android channels created in app code | **5** (+1 created by expo at runtime) |
| iOS notification categories registered | **1** (`rest_timer`) |

**FINAL COUNT: 23 live notification surfaces**, produced by 17 of the 23 enum
categories, across 21 writer functions in 6 modules + 2 Edge Functions.

**Dead enum rows** (`categories.js` only, no writer, no consumer):
`daily_checkin_reminder`, `subscription_expiring`, `coach_trial_ending`,
`sync_error`, `ed_pattern_lockout`, `ffm_floor_hold`. The last three are
in-app-only by ED/GDPR policy and the copy lives elsewhere
(`whyThisTemplates.js:384`), so the enum rows are simply unused labels — not a
missing feature. `daily_checkin_reminder` and `subscription_expiring` are
promises in the locked doc that were never built.

---

## 1. THE MATRIX (Phase 19)

Columns are abbreviated for width. Read as:
`id` = `data.type` on the wire · `tier` = who can receive it ·
`sched` = trigger mechanism · `perm` = is scheduling gated on OS permission ·
`QH` = quiet hours applied · `chan` = Android channel · `tap` = route ·
`supp` = suppression · `ctl` = user control · `reinstall` = who re-lays it ·
`TZ/DST` = timezone behaviour.

### 1.1 Weight / coaching habit reminders

| # | id | writer | tier | default | sched | perm | QH | chan | tap | supp | ctl | reinstall | TZ/DST |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `morning_weight` | `scheduler.js:102` | Pro only (`scheduler.js:1271`) | ON (`ProOnboardingScreen.js:891`) | 7× WEEKLY, hour 07:00 default, one per weekday for copy rotation (`scheduler.js:117-140`) | **NOT gated in the writer**; gated at 3 of 4 call sites | yes, `shiftHourMinuteOutOfQuietHours` (`:111`) | `coaching-reminders` | Home + `openWeightLog` (`notificationRoute.js:50-58`) | ED flag at schedule (`:109`) AND delivery (`handler.js:33`); delivery also skips if weight already logged | **time only** — no on/off switch anywhere (`CoachingRemindersScreen.js:440-478`) | `restoreNotifications` (Pro + `morningEnabled`) | WEEKLY = local wall-clock, DST-safe; TZ change re-lays via `rescheduleForTimezoneIfChanged` |
| 2 | `evening_weight` | `scheduler.js:222` | Pro only | ON, 19:30 fixed | 7× WEEKLY | as above | yes (`:231`) | `coaching-reminders` | same as #1 | same as #1 | **none of its own** — rides `morningEnabled` (`scheduler.js:1203-1205`) | same | same |
| 3 | `weekly_checkin` | `scheduler.js:392` | Pro only (`:1279`) | ON, Sunday 18:00 (`ProOnboardingScreen.js:896`) | **DATE one-shot**, re-laid at each check-in submit | not gated in writer | yes, `shiftDateOutOfQuietHours` (`:425`) | `coaching-reminders` | `ProfileTab/WeeklyCheckIn` | delivery skip if already checked in this LOCAL week (`handler.js:37`, `:106-118`) | day + hour pickers, no on/off | `restoreNotifications` → `scheduleNextCheckinReminder` | DATE = absolute instant → **shifts ±1h across a DST boundary** until the TZ re-lay fires |
| 4 | `meal_log_reminder` | `scheduler.js:301` | **Pro only** (`:307-311`, FM-01) | OFF (opt-in) | N× DAILY, user-defined rows | not gated in writer; gated at `NotificationSettingsScreen.js:491` | yes (`:338`) | `coaching-reminders` | **none — no route** (see F4) | ED flag at schedule, fail-closed (`:320-330`) AND delivery (`handler.js:56`) | one switch + time per reminder | `restoreNotifications` (`:1370-1376`) | DAILY = wall-clock, DST-safe |
| 5 | `training_reminder` | `trainingReminders.js:202` | **tier-blind** | OFF until enabled | N× WEEKLY on habit-derived days | **YES** — `getPermissionsAsync` (`:137-138`) | yes (`:178-183`) | `training-reminders` | `HomeTab/Home` | none (not ED-adjacent) | switch + time (`NotificationSettingsScreen.js:590-605`) | `restoreNotifications` (`:1386-1390`) | WEEKLY, DST-safe |

### 1.2 Lifecycle / event pushes (all budgeted)

| # | id | writer | tier | default | sched | perm | QH | chan | tap | supp | ctl | reinstall | TZ/DST |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6 | `cascade_gate` day-19 | `scheduler.js:531` | trial | ON | DATE, trial end −2d @10:00 | no | yes (`:560`) | `coaching-reminders` | `ProfileTab/CascadeGate` `{variant:'day14'}` | budget rank 1 (never dropped, evicts) | **none** | `restoreNotifications` if `stageOf==='pro_trial'` (`:1320-1323`) | DATE → DST-shifted |
| 7 | `cascade_gate` day-21 | same | trial | ON | DATE, trial end @10:00 | no | yes | `coaching-reminders` | same | same | **none** | same | DATE → DST-shifted |
| 8 | `trial_day3` | `scheduler.js:609` | trial | ON | DATE, trial start +3d @10:00 | no | yes (`:660`) | `coaching-reminders` | S3 → `HomeTab`; else `ProfileTab/WeeklyCheckIn` | ED fail-closed (`:630,635`); budget rank 5 | **none** | `restoreNotifications` (trial only) | DATE → DST-shifted |
| 9 | `winback` | `scheduler.js:708` | ex-Pro | ON | DATE, lapse +30d (or stated return) | no | yes (`:765`) | `coaching-reminders` | `ProfileTab/Subscription` `{fromWinback:true}` | ED fail-closed (`:720`) **+ calm mode** (`:727-732`, the only lay that checks calm); 1/episode + 180-day floor | **none** (FR-5) | `restoreNotifications` (`:1330-1334`) + `lapseDetect.js:90` | DATE → DST-shifted |
| 10 | `checkin_missed` evening | `scheduler.js:819` | Pro only (`:826`) | ON | DATE, 20:00 on the missed day | no | yes (`:883`) | `coaching-reminders` | `ProfileTab/WeeklyCheckIn` | ED fail-closed (`:853`); delivery stand-down if checked in ≤72h (`handler.js:47`); budget rank 4 | switch (`CoachingRemindersScreen.js:525`) | `restoreNotifications` (`:1340-1344`) | DATE → DST-shifted |
| 11 | `checkin_missed` +48h | same | Pro only | ON | DATE, occurrence +48h | no | yes | `coaching-reminders` | `ProgressTab/Analytics` | same | same switch | same | DATE → DST-shifted |
| 12 | `activation_nudge` | `scheduler.js:933` | **tier-blind** | ON | DATE, anchored per stage (0/1/2 sessions) | no | yes (`:998`) | `coaching-reminders` | `HomeTab/Home` | ED fail-closed (`:972`); delivery stand-down if stage passed (`handler.js:63`); budget rank 3 | switch (`NotificationSettingsScreen.js:649`) | `restoreNotifications` (`:1357-1361`) **only** — see F7 | DATE → DST-shifted |
| 13 | `planned_meal_confirm` | `scheduler.js:1043` | Pro only (`:1048`) | ON | DATE, 20:00 today, only if unconfirmed planned meals exist | no | yes (`:1084`) | `coaching-reminders` | `DiaryTab/Diary` | ED fail-closed (`:1067`); self-cancels when nothing to confirm; budget rank 9 | switch (`CoachingRemindersScreen.js:549`) | `restoreNotifications` (`:1348-1352`) | DATE → DST-shifted |
| 14 | `weekly_coach_ready` | `scheduler.js:1151` | Pro only (`:1297`) | ON | DATE, next Monday 09:00, laid at check-in submit | no | yes, on the HOUR only (`:1156`) | `coaching-reminders` | `ProfileTab/CoachOutput` `{weekStart}` | budget rank 2 (evicts) | **none** | `restoreNotifications` only if `prefs.coachReady.weekStart` still in window | DATE → DST-shifted |
| 15 | `year_of_lifts_unlock` | `scheduler.js:1400` | tier-blind | ON | **immediate** (`trigger:{channelId}`) on qualifying app open | no | **NO — quiet hours never applied** | `coaching-reminders` | `ProgressTab/YearOfLifts` | idempotent AsyncStorage flag; budget rank 7; `sound:true` | **none** | never (once-ever flag survives only until reinstall) | n/a (immediate) |
| 16 | `monthly_recap` | `scheduler.js:1443` | tier-blind | ON | **immediate** on first qualifying open of a new month | no | **NO** | `coaching-reminders` | `ProgressTab/Analytics` | per-month flag; budget rank 8; softened copy under calm/ED (`neutral` arg); `sound:true` | **none** | per-month flag lost on reinstall | n/a |
| 17 | `partner_cheer` | `scheduler.js:1546` | Pro (partners) | ON | DATE, now+5s | no | yes (`:1542`) | `coaching-reminders` | `ProgressTab/Consistency` | ED fail-closed (`:1512`); cheer-id watermark; budget rank 10 | switch (`CoachingRemindersScreen.js:573`) | fires off partner sync pull (`sync/tables/partners.js:249`) | n/a |
| 18 | `partner_streak` | `scheduler.js:1577` | Pro (partners) | ON | DATE, now+5s | no | yes | `coaching-reminders` | **none — no route** (F4) | as #17 but **invisible to the budget** (F3) | same switch | same | n/a |
| 19 | `partner_joined` | `scheduler.js:1607` | Pro (partners) | ON | DATE, now+5s | no | yes | `coaching-reminders` | **none — no route** (F4) | as #18 | same switch | same | n/a |

### 1.3 Session-local surfaces

| # | id | writer | tier | default | sched | perm | QH | chan | tap | supp | ctl | reinstall | TZ/DST |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 20 | `rest_timer` (JS sticky) | `activeWorkout.js:259` | tier-blind (free feature) | ON during rest | **immediate, `trigger:null`**, Android only | no | n/a | `rest-timer` (LOW, silent) | body tap → no route; 5 action buttons via `rest_timer` iOS category (`categories.js:81-87`) | none | OS channel toggle only | n/a (session-scoped) | n/a |
| 21 | `rest_timer` (native FGS chronometer) | `restForeground.js:64` → `WorkoutForegroundService` | tier-blind | ON for rests ≤170s | native shortService | no | n/a | `rest-timer` | `volyume://active-workout`; +15s / Skip via native bridge (`restTimerActions.installRestActionBridge`) | none | OS channel toggle | n/a | n/a |
| 22 | `rest_end` | `restEnd.js:57` | tier-blind | ON | DATE at rest end | no | **deliberately NOT applied** (locked addendum 2026-07-01) | `rest-alerts` (HIGH, sound) | **none — no route** | foreground delivery suppressed (`handler.js:25`); budget exempt | in-app switch, Settings → Workout & units (`store.restEndAlertEnabled`, `restEnd.js:48`) | cancelled on skip/adjust/end/sign-out | absolute DATE, seconds out |

### 1.4 Server-sent

| # | id | writer | tier | default | sched | perm | QH | chan | tap | supp | ctl | reinstall | TZ/DST |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 23 | `subscription_payment_failure` | `play-billing-rtdn/index.ts:305` and `_shared/appStore.ts:250` → `send-push/index.ts:160-166` | paying users | ON | Expo Push, store-event driven | requires a registered token (`pushToken.js:78-90`) | **NO — transactional, exempt** | **`'default'` — a channel that does not exist** → lands on expo's fallback channel (F2) | **none — no route** | budget exempt | **none** (system-required) | token re-registered on sign-in | n/a |

### 1.5 Dead

| id | where | state |
| --- | --- | --- |
| `active_workout` | `activeWorkout.js:128-172` | Unreachable — `return;` at `:129` precedes all logic. Its channel `volyume_active_workout` is therefore never created. Founder decision ("Set 3 of 2"), left in place deliberately. |

---

## 2. ANDROID CHANNELS (Phase 20)

### 2.1 Channels created

| ID | name | importance | sound | vibrate | badge | created at | source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `training-reminders` | Training reminders | HIGH | default | yes | no | boot (`ensureNotifChannels`) **and** on every `scheduleTrainingReminders` (`trainingReminders.js:83-97`) | `channels.js:34`, `trainingReminders.js:86` |
| `coaching-reminders` | Coaching reminders | HIGH | default | yes | **yes** | boot | `channels.js:42` |
| `rest-timer` | Rest timer | LOW | null | no | no | boot **and** lazily on first rest (`activeWorkout.js:216`) | `channels.js:50`, `activeWorkout.js:216` |
| `rest-alerts` | Rest finished | HIGH | default | yes | no | boot | `channels.js:58` |
| `volyume_active_workout` | Active workout | LOW | null | no | no | **never** (creator is behind dead code) | `activeWorkout.js:66` |
| `expo_notifications_fallback_notification_channel` | "Miscellaneous" (expo string resource) | HIGH | default | yes | yes | created by the library the first time a notification names a missing channel | `node_modules/expo-notifications/.../BaseNotificationBuilder.kt:113-121` |

18 of the 23 surfaces target `coaching-reminders`. That single channel is
therefore the de-facto master switch for everything coaching, retention and
billing-adjacent — including the two daily weigh-in prompts and every
lifecycle push. A user who mutes it loses the trial-end gate along with the
weigh-in nudge.

### 2.2 Assessment

- **Stable IDs across versions?** Yes for the four live channels — the strings
  are hard-coded literals and have not changed. **But they are duplicated, not
  shared:** `'training-reminders'` is declared independently at
  `channels.js:5` and `trainingReminders.js:17`; `'rest-timer'` at
  `channels.js:6`, `activeWorkout.js:34` and as a bare literal at
  `restForeground.js:71`. A rename in one place silently orphans the other.
  Only `REST_ALERTS_CHANNEL` and `COACHING_REMINDERS_CHANNEL` are exported and
  imported by their consumers.
- **Creation timing launch-safe?** Mostly. `ensureNotifChannels()` is called
  fire-and-forget in an `App.js:682` effect and never awaited.
  `restoreNotifications` runs later, from the RootNavigator bootstrap after
  `initDatabase()` + a network `getSession()`, so in practice channels exist
  first. It is not *guaranteed*: a slow `setNotificationChannelAsync` and a
  warm-cached session could invert the order, and anything scheduled before
  the channel exists lands on the expo fallback channel permanently (the
  channel is baked into the notification at post time).
- **Could an upgrade silently recreate channels under new IDs?** No. No ID has
  changed, and Android's `createNotificationChannel` on an existing ID is a
  no-op except for name/description. One real defect follows from that:
  `activeWorkout.js:216` recreates `rest-timer` **without a description**,
  while `channels.js:50` creates it **with** one. Whichever call runs on a
  fresh install wins; on an upgraded install the description can be blanked.
  Cosmetic, but it is a live divergence between two writers of one channel.
- **Removed/cardio channel lingering?** None found. There is no cardio channel
  in the tree, current or historical. `volyume_active_workout` is the only
  declared-but-never-created channel, and because it is never created it
  cannot linger in user settings.
- **"Open settings" intent correct?** The app uses `Linking.openSettings()`
  (`NotificationSettingsScreen.js:547`, `CoachingRemindersScreen.js:430`),
  which resolves to `ACTION_APPLICATION_DETAILS_SETTINGS` — the app info page,
  not the notification-channel list. Correct and safe on both platforms, but
  it is one extra tap from the per-channel controls the copy at
  `NotificationSettingsScreen.js:780` points the user at
  (`"Your device groups these into notification channels you can tune in
  system settings."`). `ACTION_APP_NOTIFICATION_SETTINGS` would land directly.

---

## 3. iOS (Phase 21)

- **Categories/actions registered:** exactly one —
  `registerRestTimerCategory()` (`categories.js:162-174`) registers
  `rest_timer` with five actions (`Log set`, `+15s`, `−15s`, `Skip rest`,
  `Add exercise`, `categories.js:81-87`). It is called from
  `ensureNotifChannels()` (`channels.js:70`), which has no platform guard, so
  it does run on iOS. No other notification carries a
  `categoryIdentifier`, so no other push has action buttons on iOS.
- **Foreground presentation:** `handler.js:17-83`. Returns
  `shouldShowAlert` + `shouldShowBanner` + `shouldShowList` (the iOS-14+ keys
  were added in the 2026-07-13 audit; the legacy-only form had silently
  killed every iOS foreground banner). `shouldPlaySound:false` and
  `shouldSetBadge:false` unconditionally.
- **Provisional permission: not used.** `requestNotificationPermissions`
  (`permissions.js:22-38`) requests normal authorisation with
  `{ allowAlert:true, allowBadge:true, allowSound:false }`. No
  `provisional`, no `allowAnnouncements`, no critical alerts.
- **`allowSound:false` is a live iOS defect.** Eight surfaces are scheduled
  with `sound:true` — `morning_weight` (`scheduler.js:130`, added by Q1
  precisely so a locked phone would be *heard*), `evening_weight` (`:242`),
  `training_reminder` (`trainingReminders.js:206`),
  `year_of_lifts_unlock` (`:1418`), `monthly_recap` (`:1463`) and
  `rest_end` (`restEnd.js:63`). On iOS none of them can make a sound, because
  the app never requested the sound authorisation. `rest_end` exists solely to
  cover the locked/pocketed phone (`restEnd.js:16-17`: *"Fires on BOTH
  platforms… this is iOS's first lock-screen rest signal"*) and on iOS it
  arrives silently. The `send-push` Edge Function even cites this deliberately
  (`send-push/index.ts:157-159`), so the omission is intentional for server
  pushes — but the six local `sound:true` sites were written on the opposite
  assumption.
- **Denied path:** the app never re-prompts (correct per platform rules).
  Both settings screens render a denied banner with an `Open Settings`
  tap-through (`NotificationSettingsScreen.js:538-554`,
  `CoachingRemindersScreen.js:421-437`).
- **Android-channel copy on iOS?** No leak. The only channel-facing string is
  `NotificationSettingsScreen.js:780`, gated on
  `Platform.OS === 'android'`. `SettingsWorkoutScreen.js:163` mentions
  channels in a code comment only.

---

## 4. PERMISSION LIFECYCLE (Phase 22)

**Key question — can the app claim a reminder is "scheduled" while the OS
permission is denied? YES, in three places.**

`scheduleNotificationAsync` succeeds on Android 13+ with `POST_NOTIFICATIONS`
denied; the notification is simply never displayed. Only two of the twenty-one
writers check permission at all:

| Gate | Location | Verdict |
| --- | --- | --- |
| `restoreNotifications` | `scheduler.js:1252-1254` — `if (status !== 'granted') return;` | **Correctly gated.** Note it returns *before* `cancelAllNotifications()`, so revoking permission never wipes an existing schedule (harmless — the OS suppresses it anyway). |
| `scheduleTrainingReminders` | `trainingReminders.js:137-138` | **Correctly gated.** |
| every other writer (#1-4, 6-19, 22) | — | **Ungated.** Relies entirely on the caller. |

Call-site gating:

| Path | Location | Verdict |
| --- | --- | --- |
| Pro onboarding | `ProOnboardingScreen.js:926-947` — `if (status === 'granted')` | gated |
| Coaching reminders save | `CoachingRemindersScreen.js:113,167` | gated |
| Meal-reminder persist | `NotificationSettingsScreen.js:491` | gated |
| Training toggle | `NotificationSettingsScreen.js:364-370` — refuses with an alert | gated |
| **Meal-reminder toggle** | `NotificationSettingsScreen.js:496-502` | **UI claims ON while denied.** Requests permission, then persists the switch regardless of the answer. Mitigated only by the disclosure string at `:718`. |
| **Getting-started nudge toggle** | `NotificationSettingsScreen.js:384-403` | **UI claims ON while denied.** No permission check, no disclosure line. |
| **ED-flag-cleared weigh-in re-lay** | `CoachOutputScreen.js:1936-1943` | ungated (no user-facing claim, so no false promise — but it lays into the void) |

Transition-by-transition:

| Transition | Behaviour | Cite |
| --- | --- | --- |
| Fresh install | `firstRunComplete=false` → Welcome; no schedules until Pro onboarding asks | `ProOnboardingScreen.js:926` |
| Deny at onboarding | Prefs blob (day/time) still persists; nothing scheduled | `ProOnboardingScreen.js:905,926` |
| Allow later (OS settings) | Nothing re-lays until the next cold start reaches `restoreNotifications`; there is no permission-change listener | `RootNavigator.js:1072-1075` |
| OS-disable after grant | Schedules remain laid but undelivered; nothing cancels them | `scheduler.js:1253` |
| Reinstall | OS discards all scheduled local notifications; AsyncStorage gone → `RootNavigator.js:1072` finds no prefs blob → `restoreNotifications` is never called → **nothing is re-laid until the user re-visits a settings screen or re-onboards.** Cloud `notification_preferences` rows exist (3 categories) but no code re-hydrates the blob from them. | `RootNavigator.js:1071-1075` |
| App upgrade (Android) | expo's `NotificationsService` receiver handles `MY_PACKAGE_REPLACED` and reschedules | `node_modules/expo-notifications/android/src/main/AndroidManifest.xml` |
| **Sign-out** | `AsyncStorage.clear()` wipes every pref key, but **no `cancelAllNotifications()` is ever called** — only `unregisterPushToken` and `cancelRestEndNotification`. See F1. | `useAppStore.js:507-596` |
| **Account switch** | User B's sign-in reaches `RootNavigator.js:1071`, finds no prefs blob (cleared at sign-out), so `restoreNotifications` — and its `cancelAllNotifications()` — never runs. User A's weekly triggers keep firing. See F1. | `RootNavigator.js:1071-1075` |
| Free → Pro | Nothing re-lays until the next launch's `restoreNotifications`; `isPro` is read there (`:1266-1268`) | `scheduler.js:1265-1286` |
| Pro → Free (paid churn) | `handlePotentialLapse` cancels the two weigh-in prompts at the moment of observation | `lapseDetect.js:80-85` |
| **Trial → Free (day 21)** | Explicitly **excluded** from `lapseDetect` (`lapseDetect.js:16-18`: *"reconcile only runs for trial_state 'paid_pro', so a pro_trial→free day-21 downgrade never reaches here"*). Nothing cancels the weigh-in prompts. See R-16. | `lapseDetect.js:16-18` |
| Calm mode | Only `winback` consults it (`scheduler.js:727-732`). Every other lay checks the ED flag alone. `monthly_recap` softens copy via a `neutral` arg supplied by the caller. | `scheduler.js:727` |
| Open ED flag | Suppressed at schedule time (fail-CLOSED) for #1,2,4,8,9,10,11,12,13,17,18,19; at delivery for #1,2,4,10,12. `_edFlagOpen` returns `true` on a read error (`handler.js:149-154`). `CoachOutputScreen.js:1926` additionally cancels the weigh-in pair the instant a flag is raised, because background delivery runs no handler. | `handler.js:140-155`, `scheduler.js:190-205` |

---

## 5. SCHEDULING (Phase 23)

| Concern | Verdict | Cite |
| --- | --- | --- |
| Quiet hours default | 22:00-07:00 local, enabled, user-editable; corrupt blob falls back to the locked default | `quietHours.js:20-48` |
| Shift rule | Inside-window triggers move to the window END (not "next available minute" as the doc says — same thing in practice, but the doc wording is looser than the code) | `quietHours.js:95-129` |
| **Quiet-hours coverage gaps** | `year_of_lifts_unlock` and `monthly_recap` are immediate (`trigger:{channelId}`) and never consult quiet hours — both carry `sound:true`. `rest_end` is exempt by founder decision. Server pushes are exempt by class. | `scheduler.js:1410-1421`, `:1453-1466` |
| Exact-local-time | WEEKLY/DAILY triggers pin hour+minute → the OS fires at local wall-clock. DATE triggers pin an absolute instant. | `scheduler.js:132-138` vs `:436-440` |
| Timezone change | `rescheduleForTimezoneIfChanged` compares `getTimezoneOffset()` against `@volyume_notif_tz_offset` on every foreground, and re-lays everything on a delta. First run records a baseline only. | `scheduler.js:1235-1247`, `App.js:988-994` |
| DST forward/back | The same offset check fires at a DST boundary, so DATE triggers self-correct on the next foreground. Until then a DATE push is ±1h off (cascade gates at 10:00, coach-ready at 09:00, missed check-in at 20:00, planned-meal at 20:00). WEEKLY/DAILY are unaffected. **Residual risk:** a user who does not foreground the app across the boundary keeps the shifted time — for the cascade day-21 gate that is a one-shot conversion moment. | `scheduler.js:1238-1245` |
| Reboot | Handled by the library, not by app code: expo-notifications registers `NotificationsService` for `BOOT_COMPLETED` / `REBOOT` / `QUICKBOOT_POWERON` / `MY_PACKAGE_REPLACED`. `RECEIVE_BOOT_COMPLETED` in `app.json:69` is redundant with the library's own manifest but harmless. **No app-owned boot receiver exists, and none is needed.** | `node_modules/expo-notifications/android/src/main/AndroidManifest.xml` |
| Weeks-unopened staleness | The whole design assumes an app open. `restoreNotifications` only runs at launch/foreground. WEEKLY triggers survive indefinitely without one — this is the mechanism behind R-16. | `RootNavigator.js:1071` |
| Duplicate-schedule prevention | Strong. Every writer cancels its own fixed identifier before laying (`scheduler.js:107,225,304,395,539,658,763,874,991,1079,1154`), and `budget.js:191` enforces one-topic-per-day. `cancelMealReminders` and `cancelTrainingReminders` sweep by identifier prefix. | as cited |
| Cancelled-event cleanup | Good for cascade (`cancelCascadeGateNotifications`), trial day-3, win-back, missed check-in, planned-meal, activation nudge, rest-end. **Weak for sign-out** (F1) and **absent for trial expiry** (R-16). | `scheduler.js:593,605,704,814,929,1031` |
| Stale coach-ready | Solved by PM-01(b): `weekStart` is baked into `data` at schedule time and routed through (`notificationRoute.js:47-49`), and RB-2 re-lays it from `prefs.coachReady.weekStart` with a window check (`scheduler.js:1297-1305`). | as cited |
| Monday / weekStart routing | Consistent: `localWeekStartMs()` (`dayKey.js`) is used by the scheduler (`:459-461`), the budget's week window (`budget.js:94-98`) and the handler's check-in suppression (`handler.js:110-112`). The old UTC anchor was fixed under NOTIF-3. | as cited |

**Test run** (read-only, no test files modified):

```
npx jest src/lib/notifications
  Test Suites: 16 passed, 16 total
  Tests:       162 passed, 162 total

npx jest src/lib/__tests__/notifications src/lib/__tests__/activationNudge.test.js src/lib/__tests__/trialActivation.test.js
  Test Suites: 13 passed, 13 total
  Tests:       218 passed, 218 total
```

**29 suites, 380 tests, all green.** No pinned-test conflict was encountered.

---

## 6. PRESS / DEEP-LINK (Phase 24)

`routeForNotificationType` (`notificationRoute.js:25-115`) → RootNavigator's
`onTap` (`RootNavigator.js:897-926`). A `null` target is a silent no-op: the
OS still foregrounds the app, so the user lands on whatever screen was last
open. Graceful, never a crash — but also never the promised destination.

| `data.type` | target | screen exists? |
| --- | --- | --- |
| `weekly_checkin` | `ProfileTab/WeeklyCheckIn` | yes (`RootNavigator.js:545`, Pro-guarded) |
| `year_of_lifts_unlock` | `ProgressTab/YearOfLifts` | yes (`:500`) |
| `monthly_recap` | `ProgressTab/Analytics` | yes (`:490`) |
| `cascade_gate` | `ProfileTab/CascadeGate` | yes (`:563`, modal) |
| `weekly_coach_ready` | `ProfileTab/CoachOutput` (+`weekStart`) | yes (`:546`, Pro-guarded) |
| `morning_weight` / `evening_weight` | `HomeTab/Home` (+`openWeightLog`) | yes (`:437`) |
| `training_reminder` | `HomeTab/Home` | yes |
| `activation_nudge` | `HomeTab/Home` | yes |
| `winback` | `ProfileTab/Subscription` (+`fromWinback`) | yes (`:562`) |
| `partner_cheer` | `ProgressTab/Consistency` | yes (`:497`) |
| `checkin_missed` | `WeeklyCheckIn` / `Analytics` by slot | yes |
| `planned_meal_confirm` | `DiaryTab/Diary` | yes (`:370`, Pro-guarded — consistent, the push is Pro-only) |
| `diary_day` | `DiaryTab/Diary` (+`date`) | yes — **no writer sets this type**; a forward-declared mapping (documented as such at `notificationRoute.js:93-100`) |
| `trial_day3` | `HomeTab` (S3) / `ProfileTab/WeeklyCheckIn` | yes |
| **`partner_streak`** | — | **MISSING** (laid at `scheduler.js:1584`) |
| **`partner_joined`** | — | **MISSING** (laid at `scheduler.js:1611`) |
| **`meal_log_reminder`** | — | **MISSING** (laid at `scheduler.js:346`) |
| **`rest_end`** | — | **MISSING** (laid at `restEnd.js:62`) — arguably fine, the app opens to the live session anyway |
| **`subscription_payment_failure`** | — | **MISSING** (sent at `play-billing-rtdn/index.ts:305`) — the tap that should reach billing goes nowhere |
| `rest_timer` | — | intentionally none; body tap opens the app, action buttons are handled in `listeners.js:76-82` and `ActiveWorkoutScreen.js:1243` |
| `active_workout` | — | dead path |

**No stale destinations** — every route that exists points at a screen that
exists. The defect is the other way round: five in-flight `data.type` values
have no route at all.

Three separate `addNotificationResponseReceivedListener` registrations are
live simultaneously: `listeners.js:99` (routing + telemetry),
`App.js:684` (`data.url` deep link — no scheduled notification sets `data.url`,
so it is inert for local pushes) and `ActiveWorkoutScreen.js:1243`
(rest-timer action buttons). They do not conflict, but the App.js one is
effectively dead weight.

---

## 7. R-16 EVIDENCE — the weigh-in prompt category (Phase 25)

**Founder-gated. Documented, not fixed.**

### 7.1 Exact behaviour

`morning_weight` and `evening_weight` are laid as **fourteen WEEKLY OS
triggers** — seven each, one per weekday, purely so the copy can rotate
(`scheduler.js:117-140`, `:233-252`, NOTIF-4). Both carry `sound:true`. Both
are Pro-only on the re-lay path (`scheduler.js:1271`, E10-F4) and both ride
the single `morningEnabled` flag; `evening_weight` has no control of its own
(`scheduler.js:1203-1205`).

There is **no on/off switch for either prompt anywhere in the app.** The
morning toggle was deliberately removed ("it is a coaching input",
`NotificationSettingsScreen.js:556-562`); `CoachingRemindersScreen` offers an
hour picker only, and that screen is wrapped in `withProGuard`
(`RootNavigator.js:231`) *and* its entry link is rendered only under
`{isPro && …}` (`NotificationSettingsScreen.js:565`). A non-Pro user can
neither reach nor see it.

### 7.2 Interaction map

| Input | Effect |
| --- | --- |
| Permission denied | Not laid (all four call sites gate) — clean |
| ED flag open | Not laid (`scheduler.js:109,229`, fail-closed) and not delivered (`handler.js:33`); `CoachOutputScreen.js:1926` cancels the pair the moment a flag is raised, because an already-laid weekly trigger fires in the background where no handler runs |
| ED flag clears | Re-laid at `CoachOutputScreen.js:1936-1943` |
| Calm mode | **Not consulted** — calm mode gates only `winback` (`scheduler.js:727`) and softens `monthly_recap` copy. Two audible daily weight prompts continue under calm mode. |
| Weight already logged | Delivery suppressed — **only while the app process is alive** (`handler.js:33`). A backgrounded/killed app gets no suppression. |
| Paid Pro → Free | Cancelled at `lapseDetect.js:80-85` (C5-P28-04), but **only when the app is opened** — `handlePotentialLapse` runs off the RootNavigator reconcile (`RootNavigator.js:196`). |
| **Trial → Free (day 21)** | **Nothing cancels them.** `lapseDetect` explicitly excludes trial downgrades (`lapseDetect.js:16-18`). |
| Next app open (any tier loss) | `restoreNotifications` → `cancelAllNotifications()` → `isPro` false → not re-laid. Self-healing on first open. |
| Sign-out | **Not cancelled** (F1). |
| Reinstall | OS discards them. Clean. |

### 7.3 Realistic volume for a 180-day lapsed user

Two cohorts:

**(a) Lapsed paid Pro who opens the app at least once after the lapse.**
`handlePotentialLapse` cancels both prompts at that open, and
`restoreNotifications` would have wiped them anyway. **Exposure: 0-2 prompts.**
Not the problem.

**(b) A user who stops opening the app entirely.** The fourteen WEEKLY
triggers persist in the OS indefinitely. No app open means no
`restoreNotifications`, no `handlePotentialLapse`, no handler-side
suppression, no tier read. The device keeps firing:

- 07:00 — "Good morning, {First}. Whenever you're ready, hop on the scales…"
- 19:30 — "Evening, {First}. If you haven't caught today's weight yet…"

Both with sound (on Android; silent on iOS, §3). **2 per day × 180 days =
≈360 audible weigh-in prompts**, for a person who has stopped using the app
and, if they are past a trial, is not entitled to the feature the prompts
serve. Plus training reminders (tier-blind) on their habit days.

The **trial cohort is the larger one**: every Pro-onboarded trial user has
these laid on day 0 (`ProOnboardingScreen.js:928-929`), and the day-21
auto-downgrade is the one downgrade path `lapseDetect` never sees. A trial
that lapses without the user reopening the app is the modal churn shape.

Termination conditions: the user opens the app (self-heals immediately), taps
any notification (which opens the app, so also self-heals), mutes the
`coaching-reminders` Android channel (which also silences the trial-end gate
and every other coaching push), turns off notifications for the app entirely,
or uninstalls.

### 7.4 Classification

**HIGH POST-RELEASE.**

Not a release blocker:
- It self-heals the instant the app is opened or any notification is tapped.
- It cannot fire under an open ED flag (schedule-time gate is fail-closed and
  `CoachOutputScreen` cancels on flag-raise), so the ED-safety inviolables are
  not breached.
- The copy is calm and non-accusatory by construction, and no floor,
  threshold or gate is implicated.
- The paid-churn path was already closed under C5-P28-04.

Not lower than HIGH:
- The affected surface is a **weight prompt** — the most ED-sensitive category
  in the product — firing twice daily, audibly, at a disengaged user, for
  months, with **no in-app off switch reachable at that tier**.
- It directly contradicts the locked unsubscribe principle
  (`NOTIFICATIONS_LOCKED.md:22-23`) and the founder's own reasoning in the
  C5-P28-04 comment (`lapseDetect.js:69-78`) — the fix was made for paid churn
  and the trial hole was left open.
- Play Store review and one-star reviews both key on exactly this shape.

### 7.5 Recommendation (do not implement — founder call)

Options, in the order I would put them to the founder:

1. **Close the trial hole at its source.** Cancel both weigh-in prompts on the
   trial→free cutover, wherever `cascade.js` performs the day-21 downgrade,
   mirroring `lapseDetect.js:80-85`. Smallest possible change; closes the
   dominant cohort. Does not help the "app never reopened" case, which is
   exactly where the problem lives — the downgrade itself is observed only on
   an app open too.
2. **Give the weigh-in prompts an expiry.** Re-lay them as a bounded horizon
   (e.g. 14 forward one-shot DATE triggers refreshed on each open) instead of
   infinite WEEKLY repeats. A user who stops opening the app goes quiet within
   a fortnight, automatically, on every tier and every churn path — including
   ones nobody has thought of yet. This is the only option that fixes the
   class rather than an instance. Cost: 14 schedule calls per open instead of
   7, plus a re-lay path.
3. **Give `morning_weight` a real off switch** on a tier-blind screen. Directly
   satisfies the locked unsubscribe principle. Conflicts with the deliberate
   2026-07 decision that it is a coaching input, not a preference — so this is
   a founder reversal, not an engineering call.
4. Do nothing and accept it.

My reading: (2) is the correct fix and (1) is the correct stopgap; they are
not exclusive. But per D33 the ruling is the founder's, and I have not
implemented any of them.

---

## 8. FR-5 / FR-C4-8 CONTROL MATRIX (Phase 26)

**Founder-gated. Evidence only — no setting was added.**

Control-state key: **own** = its own switch · **umbrella** = covered by
another category's switch · **none** = no in-app control, OS channel only ·
**system** = transactional, correctly uncontrollable ·
**safety** = suppressed by ED/calm, not by user choice ·
**retention** = a growth lever with no control.

| # | category | control state | where | gap? |
| --- | --- | --- | --- | --- |
| 1 | `morning_weight` | **time only** | `CoachingRemindersScreen.js:440` (Pro-gated) | **YES — R-16** |
| 2 | `evening_weight` | **umbrella** (`morningEnabled`) | — | **YES — R-16** |
| 3 | `meal_log_reminder` | own (per row) | `NotificationSettingsScreen.js:685` | no |
| 4 | `weekly_checkin` | day+hour only, no off | `CoachingRemindersScreen.js:482` | minor |
| 5 | `training_reminder` | own | `NotificationSettingsScreen.js:595` | no |
| 6-7 | `cascade_gate` ×2 | **none** | — | acceptable — twice per lifetime, and it is the trial-end notice |
| 8 | `trial_day3` | **none** | — | acceptable — once per trial |
| 9 | `winback` | **none** | — | **YES — the original FR-5** |
| 10-11 | `checkin_missed` ×2 | own | `CoachingRemindersScreen.js:525` | no |
| 12 | `activation_nudge` | own | `NotificationSettingsScreen.js:649` | no |
| 13 | `planned_meal_confirm` | own | `CoachingRemindersScreen.js:549` | no |
| 14 | `weekly_coach_ready` | **none** (`prefs.coachReady.enabled` is read at `scheduler.js:1297` and `WeeklyCheckInScreen.js:865` but **no UI writes it**) | — | **YES — a dead pref** |
| 15 | `year_of_lifts_unlock` | **none** | — | acceptable — once ever |
| 16 | `monthly_recap` | **none** | — | **YES — recurring, 12/year, no control** |
| 17-19 | `partner_cheer` / `_streak` / `_joined` | own (one switch covers all three) | `CoachingRemindersScreen.js:573` | no |
| 20-21 | `rest_timer` | none in-app (OS channel) | — | acceptable — silent, session-scoped |
| 22 | `rest_end` | own | Settings → Workout & units | no |
| 23 | `subscription_payment_failure` | **system** | — | correct |

**Four meaningful gaps.** Exact founder options for each:

**G1 — `morning_weight` / `evening_weight` (R-16).** Options as §7.5.

**G2 — `winback` (the standing FR-5 question).** One push per churn episode
with a 180-day cross-episode floor, aimed at a user who has already left.
Options: (a) leave it uncontrolled — the frequency floor is the control;
(b) add a "Occasional updates about your subscription" switch beside Partner
cheers, default on, which would also cover `trial_day3` and both
`cascade_gate` pushes; (c) make it opt-out from the push itself via a
notification action button (iOS category, needs a native build).
I would put (b) forward: it converts four uncontrolled categories into one
honest umbrella at the cost of one switch.

**G3 — `weekly_coach_ready` has a preference key with no UI.**
`prefs.coachReady.enabled !== false` is read in two places and written by
none, so the "unless the user disabled it" comment at
`WeeklyCheckInScreen.js:864` describes a control that does not exist.
Options: (a) surface the switch in Coaching reminders (the key already works —
this is a UI-only change); (b) delete the dead read and document the push as
non-optional. (a) is the honest one, and the plumbing is already there.

**G4 — `monthly_recap`.** Twelve pushes a year, `sound:true`, no quiet-hours
shift (it is immediate), no control. Options: (a) fold it into the same
umbrella as G2(b); (b) give it its own switch beside Getting-started nudges;
(c) leave it. Given it is the only *recurring* uncontrolled category, (a) or
(b) is warranted.

None of these touch an ED-safety gate, a floor, the deterministic engine,
free/pro gating, product IDs or the schema. All are Section-2 clean.

---

## 9. THE TEN MOST CONSEQUENTIAL FINDINGS

**F1 — Sign-out leaves every laid notification firing.** `HIGH`
`src/store/useAppStore.js:507-596`. The sign-out path unregisters the push
token (`:510`), wipes SQLite, calls `AsyncStorage.clear()` (`:548`) and
cancels only the rest-end alert (`:596`). It never calls
`cancelAllNotifications()`. Worse, because `AsyncStorage.clear()` removes
`@volyume_notification_prefs`, the next launch's guard at
`RootNavigator.js:1071-1075` (`if (raw)`) is false, so `restoreNotifications`
— and its `cancelAllNotifications()` — never runs either. The previous user's
weigh-in, training and meal triggers keep firing on the device, under a
different account or none. The copy carries the **previous user's first name**
baked in at schedule time (`scheduler.js:62-73`), so on a shared device this
is a first-name disclosure to a different user. Directly contradicts the
in-code founder direction at `:544-546`: *"signing out should leave nothing
behind."*

**F2 — Server pushes target a channel that does not exist.** `MEDIUM`
`supabase/functions/send-push/index.ts:166` sends `channelId: 'default'`. The
app creates `training-reminders`, `coaching-reminders`, `rest-timer`,
`rest-alerts` — never `default`. Per
`node_modules/expo-notifications/.../BaseNotificationBuilder.kt:64-74` the
notification falls back to `expo_notifications_fallback_notification_channel`,
which the library creates on the spot with IMPORTANCE_HIGH and the generic
"Miscellaneous" name. So the payment-failure push **does** display, but on a
fifth, unbranded channel the user cannot recognise, appearing in their system
settings the first time a payment fails. Fix is one string.

**F3 — Two partner pushes are invisible to the push budget.** `MEDIUM`
`scheduler.js:1584` and `:1611` lay `data.type` `partner_streak` /
`partner_joined`. `categoryForDataType` (`categories.js:192-215`) has no case
for either, so `budget.js:128-131` `toOccupant()` returns `null` and they are
not counted as occupants of the day or week. They *consume* a
`PARTNER_CHEER` slot when laid (`:1574`, `:1604`) but do not *occupy* one
afterwards. On a day where all three partner beats fire, the locked
"2 event pushes per day" cap (`budget.js:35`) can be overshot to five. They
also produce no `notification_sent` / `notification_tapped` telemetry, for the
same reason (`telemetry.js:53-55`).

**F4 — Five in-flight `data.type` values have no tap route.** `MEDIUM`
`partner_streak` (`scheduler.js:1584`), `partner_joined` (`:1611`),
`meal_log_reminder` (`:346`), `rest_end` (`restEnd.js:62`) and
`subscription_payment_failure` (`play-billing-rtdn/index.ts:305`) all fall
through `notificationRoute.js:112` to `null`, so
`RootNavigator.js:906` returns and the user lands on whatever screen was last
open. Fails gracefully — no crash, no stale screen — but the payment-failure
tap is the one that most needs to reach billing, and
`notificationRoute.js:6-7` states the module's own contract as *"Every type
the scheduler sets must have a route here, or tapping that notification
dead-ends."* The contract is violated by its own file.

**F5 — `allowSound:false` silences six local pushes on iOS.** `MEDIUM`
`permissions.js:27-33` requests iOS authorisation without sound. Six local
surfaces are scheduled with `sound:true` — `morning_weight`
(`scheduler.js:130`), `evening_weight` (`:242`), `training_reminder`
(`trainingReminders.js:206`), `year_of_lifts_unlock` (`:1418`),
`monthly_recap` (`:1463`), `rest_end` (`restEnd.js:63`). None can make a
sound on iOS. `rest_end` exists specifically to cover the locked phone and its
own header claims iOS coverage (`restEnd.js:16-17`); Q1 added sound to
`morning_weight` explicitly so it would be noticed on a locked phone
(`scheduler.js:126-129`). Both goals are unmet on iOS.

**F6 — R-16: the trial→free weigh-in hole.** `HIGH` — see §7.
`lapseDetect.js:16-18` documents the exclusion; nothing else cancels.

**F7 — The activation nudge's workout-completion hook does not exist.**
`LOW-MEDIUM` `scheduler.js:924-926` states *"the workout-completion hook lays
the next stage the instant a session lands."* Repo-wide, `scheduleActivationNudge`
has exactly two call sites: `scheduler.js:1360` (launch restore) and
`NotificationSettingsScreen.js:399` (the toggle). No workout-completion hook
exists. Functionally the lever still works — the next launch re-lays the
correct stage — but stage advancement lags by one app launch, and the comment
asserts a mechanism that is not there.

**F8 — `weekly_coach_ready` has a preference nothing can set.** `LOW`
`scheduler.js:1297` and `WeeklyCheckInScreen.js:865` both read
`prefs.coachReady.enabled !== false`. Grep finds no writer. The comment
"unless the user disabled it" describes a control that has never shipped. See
G3.

**F9 — Channel-ID literals are duplicated across modules.** `LOW`
`'training-reminders'` is an unexported const in both `channels.js:5` and
`trainingReminders.js:17`; `'rest-timer'` appears at `channels.js:6`,
`activeWorkout.js:34` and as a bare string at `restForeground.js:71`.
Additionally `activeWorkout.js:216` recreates `rest-timer` without the
description that `channels.js:50` sets, so which description a user sees
depends on which call ran first on that install.

**F10 — Two immediate pushes bypass quiet hours entirely.** `LOW`
`year_of_lifts_unlock` (`scheduler.js:1412-1421`) and `monthly_recap`
(`:1455-1466`) use `trigger: { channelId }` (immediate) with `sound:true` and
never call `getQuietHours()`. They fire on the app open that qualifies them,
so in practice the user is holding the phone — but `NOTIFICATIONS_LOCKED.md:83`
says "Quiet hours always win", and these two do not. Unlike `rest_end`, this
exemption is not recorded anywhere as a founder decision.

---

## 10. WHAT IS SOLID

Recorded so the fixes above are read in proportion:

- **ED-safety suppression is thorough and consistently fail-CLOSED.** Twelve
  categories gate at schedule time, five again at delivery, every read error
  maps to "flag open" (`handler.js:149-154`, `scheduler.js:199-204`, and the
  `'read_failed'` sentinel pattern at `:630, :720, :853, :972, :1067, :1512`).
  `CoachOutputScreen.js:1926` closes the background-delivery hole by cancelling
  at flag-raise. No push surface can reach a flagged user.
- **The push budget is a real, pure, tested mechanism** with fail-OPEN
  semantics so it can never be the reason a push silently breaks
  (`budget.js:243-245`).
- **Every scheduler is idempotent** — cancel-own-identifier before lay, at
  eleven distinct call sites.
- **The historic "launch wipe" bug class is closed.** `restoreNotifications`
  now re-lays cascade, trial day-3, win-back, missed check-in, planned-meal,
  activation nudge, meal reminders, training reminders and coach-ready
  (`scheduler.js:1307-1390`).
- **Week/day boundaries are consistently local-Monday** across scheduler,
  budget and handler.
- **Copy discipline holds** — British English, no shame framing, warm
  complete sentences, name suffix handled cleanly, guarded by
  `scheduler.copyFixes.guard.test.js`.
- **29 test suites / 380 tests green**, including source-level regression
  guards.
