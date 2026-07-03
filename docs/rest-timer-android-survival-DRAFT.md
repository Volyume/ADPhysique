# Rest-timer / session survival on Android without a health permission or Play-sensitive declaration (DRAFT, evidence only)

Research draft for the P4 founder memo, 2026-07-02. Evidence-gathering only; no
recommendation is made here. FINALISED: the decision memo is
docs/p4a-rest-timer-survival-memo-2026-07-03.md (exact alarms + shortService
chosen and built); this file remains as its evidence appendix.

Constraint under study: improve rest-timer and workout-session survival on
Android WITHOUT declaring any health runtime permission (ACTIVITY_RECOGNITION,
BODY_SENSORS, etc.) and without any Play-sensitive declaration the app does
not already carry.

Terminology used throughout (the three kill severities behave differently):

- **Backgrounded**: app alive, JS suspended (home button, screen lock).
- **Swipe-kill / OS reap**: process killed (swiped from recents, or the OS
  reclaims memory; aggressive OEMs like some MIUI/EMUI builds do this early).
  AlarmManager alarms and scheduled notifications survive this on stock
  Android; app-posted sticky notifications do not (per this repo's own code
  comments, quoted below).
- **Force stop** (Settings > App info > Force stop): the app enters the
  stopped state. Android cancels its AlarmManager alarms and stops its
  services and receivers until the user next launches it. No path in this
  memo survives Force stop, including a foreground service.
  (Standard documented Android behaviour; training knowledge as of 2026-07,
  not re-verified against a live doc page in this session.)

---

## 1. Current state in the repo

### 1.1 The disabled foreground-service path (`USE_FOREGROUND_SERVICE = false`)

`src/lib/notifications/activeWorkout.js:36-56`:

> ```
> // Feature flag for the foreground-service-backed notification path.
> // When false, we use the standard expo-notifications sticky path
> // (works while the app is alive, dies on force-close). When true, we
> // drive the native foreground service in rest-timer-live which
> // survives force-close.
> //
> // HELD OFF until the manifest declares a health-related runtime
> // permission. WorkoutForegroundService starts itself with
> // FOREGROUND_SERVICE_TYPE_HEALTH (the correct fit for a workout
> // tracker), and from Android 14 (API 34) the OS rejects that service
> // type with SecurityException unless the app also declares one of:
> //   - ACTIVITY_RECOGNITION
> //   - BODY_SENSORS
> //   - HIGH_SAMPLING_RATE_SENSORS
> // The current manifest only carries FOREGROUND_SERVICE and
> // FOREGROUND_SERVICE_HEALTH, so startForeground() throws a native
> // SecurityException → "Volyume keeps stopping" on workout start.
> // Re-enable only after wiring the manifest entry + a runtime grant
> // prompt; flipping this back on without that change reintroduces the
> // crash.
> const USE_FOREGROUND_SERVICE = false;
> ```

Note the flag is currently doubly dead: the whole function it gates,
`showActiveWorkoutNotification`, is itself a hard no-op (early `return` at
`activeWorkout.js:136`, founder decision on the confusing "Set 3 of 2" copy;
pinned by `src/lib/__tests__/notifications.activeWorkout.test.js:37`).
CURRENT-STATE-DOSSIER.md:258 records the same reason for the flag:
"Android 14 rejects the health foreground-service type without a health
runtime permission → workout notification dies on force-close".

### 1.2 What the native module's manifest declares today

`modules/rest-timer-live/android/src/main/AndroidManifest.xml:1-24`: the
manifest declares NOTHING active. The service registration and both
permissions are commented out, with this rationale (lines 2-12):

> "The WorkoutForegroundService below is currently disabled at the JS level
> (USE_FOREGROUND_SERVICE = false ...) so the service is never actually
> started. We keep the class compiled in case the feature is revived later,
> but we do NOT declare the runtime permissions or service registration:
> Play Console requires a FOREGROUND_SERVICE_HEALTH justification with a
> demo video, which is pointless for a code path we don't invoke."

The commented-out block (lines 14-22) would declare `FOREGROUND_SERVICE`,
`FOREGROUND_SERVICE_HEALTH` and a service with
`android:foregroundServiceType="health"`. The Kotlin service hard-codes the
same type at start: `startForeground(NOTIF_ID, notification,
ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH)`
(`WorkoutForegroundService.kt:66-73`). So the only FGS type this codebase has
ever wired is `health`, which is exactly the type the constraint rules out.

App-level manifest permissions today (`app.json:66-72`): CAMERA, VIBRATE,
RECEIVE_BOOT_COMPLETED, FOREGROUND_SERVICE, WAKE_LOCK. No FGS type
permission, no SCHEDULE_EXACT_ALARM, no USE_EXACT_ALARM (verified by grep
across `app.json` and every `node_modules/*/android/src/main/AndroidManifest.xml`
and `node_modules/*/plugin/build/*.js`: zero hits for `SCHEDULE_EXACT_ALARM`).
Target/compile SDK 35 (`app.json:173-174`).

### 1.3 What actually runs today (the fallback stack)

Four layers exist; only one survives process death:

1. **In-app timer, wall-clock anchored.** `useAppStore.js:1405-1481`: the
   store keeps `restTimerEndsAt` (epoch ms) and every tick recomputes
   remaining from the clock, so backgrounding never drifts it; RestTimer.js
   re-syncs on AppState 'active' (`RestTimer.js:90-113`). Dies with the
   process, but see layer 4.

2. **Live sticky rest notification with action buttons.**
   `presentRestTimerNotification` (`activeWorkout.js:246-272`) posts a
   sticky, silent notification re-presented ON EACH JS TICK from
   `RestTimer.js:76-88`. Because updates are JS-driven, the visible countdown
   FREEZES at its last value the moment the app is backgrounded (JS
   suspended), and the module's own header says the sticky path "works while
   the app is alive, dies on force-close" (`activeWorkout.js:37-38`).
   Dormant asset: the native chronometer notification
   (`RestTimerLiveModule.start`, `RestTimerLiveModule.kt:41-91`) ticks down
   via Android's built-in chronometer "without the app having to wake"
   (`modules/rest-timer-live/index.ts:41-49`) and needs NO service, NO new
   permission. It is compiled into the build but never called from app code:
   the only `require('rest-timer-live')` is `activeWorkout.js:64`, and the
   only methods invoked are `startWorkoutForeground`/`stopWorkoutForeground`
   inside dead paths. It would still be cleared on process death
   (`RestTimerLiveModule.kt:105-107` comment: "sticky NotificationManager
   notifications don't" survive force-close), but it fixes the frozen
   countdown while merely backgrounded.

3. **The A2 end-of-rest scheduled notification (`restEnd.js`).** One OS
   scheduled local notification at the rest end timestamp, rescheduled on
   ±15s/skip/replace, cancelled at session end (`restEnd.js:40-74`,
   `useAppStore.js:1424-1480`). Its design intent is explicit
   (`restEnd.js:20-21`): "OS-scheduled means it survives process death: if
   Android reaps the app mid-rest, the alert still fires on time."
   Mechanism (verified in the installed library, expo-notifications 0.32.17):
   `ExpoSchedulingDelegate.kt:106-121` schedules via AlarmManager,
   `setExactAndAllowWhileIdle` IF `canScheduleExactAlarms()` is true,
   otherwise `setAndAllowWhileIdle` (inexact). Because nothing in this app or
   its dependency tree declares SCHEDULE_EXACT_ALARM (see 1.2),
   `canScheduleExactAlarms()` is false on every Android 12+ device, so
   **today's backstop is an INEXACT alarm**: the OS may batch it and deliver
   late (usually near-time on an awake device; minutes late is possible under
   batching/Doze). On Android 11 and lower it is exact. The alert is
   delivered by expo-notifications' broadcast receiver, which also
   re-registers alarms on BOOT_COMPLETED and MY_PACKAGE_REPLACED
   (`node_modules/expo-notifications/android/src/main/AndroidManifest.xml`),
   so it survives swipe-kill and (after the app has run once) reboot. It does
   NOT survive Force stop (alarms cancelled, receiver inert until relaunch).

4. **Session snapshot restore.** Every workout mutation snapshots the session
   to AsyncStorage including the rest anchor: "persist the rest anchor so a
   process kill mid-rest restores a truthful countdown"
   (`useAppStore.js:106-109`); `restoreActiveWorkout` resumes a still-future
   rest on relaunch and notes "scheduled notifications survive process death,
   which is exactly the backstop working" (`useAppStore.js:1342-1352`).

**Net position today.** Survives swipe-kill/OS reap: the end-of-rest alert
(inexact on Android 12+) and the full session + rest state on next launch.
Dies on swipe-kill: the live countdown notification, the (already no-op)
active-workout notification, in-app beeps/haptics. Degrades on mere
backgrounding: the countdown notification freezes stale. Survives Force stop:
nothing.

---

## 2. Candidate paths (researched 2026-07-02)

Web sources reachable this session are listed at the end; policy readings are
deliberately pessimistic per the brief.

### (a) FGS type `shortService`

Facts (Android Developers, verified 2026-07-02):

- "Can only run for a short period of time (about 3 minutes)", timed from
  `startForeground()`; miss the timeout after `onTimeout()` and the app ANRs.
- "Doesn't require a type-specific permission, though it still requires the
  FOREGROUND_SERVICE permission" (already in `app.json:70`).
- No sticky services; cannot start other FGS; re-calling `startForeground`
  extends by another ~3 minutes ONLY if the app is then visible or otherwise
  eligible to start an FGS from the background, which a pocketed phone
  mid-rest generally is not.
- Play policy (Device and Network Abuse page, verified 2026-07-02):
  `shortService` and `systemExempted` are explicitly EXEMPT from the
  foreground-service criteria, and search results consistently report it is
  exempt from the Play Console FGS declaration form (no form, no video).

Fit against the need: Volyume rests are clamped 30-600s
(`useAppStore.js:1532-1533`, "Clamp to the same 30-600s band the routine
builder uses"). A single 3-minute window covers most rests but not the upper
band, and the extension mechanism cannot be relied on from the background. It
cannot cover the WORKOUT SESSION (tens of minutes) at all.

- Reliability delta over today: small. Keeps a live notification and process
  alive across the rest window for rests under ~3 min, protecting against OS
  reap during that window; the end alert is already covered by layer 3. No
  session-length survival. Nothing on Force stop.
- Play review risk: minimal (declaration-exempt, no new manifest permission
  beyond what exists). ANR risk if the stop path misses the timeout is an
  engineering risk, not a policy one.
- Effort: medium. Manifest service entry (type `shortService`), retype the
  start call in `WorkoutForegroundService.kt`, add `onTimeout()` handling and
  hard stop discipline, JS wiring, device matrix testing (EAS build).

### (b) FGS type `specialUse`

Facts (Android Developers + Play Console Help, verified 2026-07-02):

- Requires `FOREGROUND_SERVICE_SPECIAL_USE` permission plus a manifest
  `<property android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE">`
  free-form explanation; "these values and corresponding use cases are
  reviewed when you submit your app in the Google Play Console".
- The Play Console FGS declaration applies: description of the functionality,
  user impact if deferred/interrupted, a demonstration video link, and a use
  case selection, per FGS type. Community threads (2025) show rejections
  where "Play Console declaration and/or app description ... does not
  sufficiently demonstrate the use of permission", including insufficient
  videos.

Pessimistic reading for Volyume: Google frames `specialUse` as the residual
category for use cases NOT covered by any other type. A workout rest timer is
squarely what `health` exists for (Google's own health examples are exercise
trackers), so a reviewer can reasonably bounce a `specialUse` declaration
with "use the health type", which lands back on the exact health-permission
requirement this memo is constrained to avoid. That makes `specialUse` the
path most likely to convert into either a rejection loop or a forced health
declaration. Each app update after the declaration re-exposes the surface,
and the manifest note in this very repo (1.2) records the team already chose
not to carry a justification burden for an uninvoked path.

- Reliability delta over today: largest if approved. A true FGS survives
  swipe-kill and OS reap for the whole session (not Force stop) and carries
  the notification with it.
- Play review risk: highest of the four. Free-form justification, human
  review, video burden, plausible redirect-to-health outcome, recurring
  exposure at policy refreshes (2025/2026 posture has been tightening,
  UNVERIFIED beyond the community-thread evidence above).
- Effort: medium code (same service, different type + property) plus the
  ongoing declaration/video/compliance burden, which is the real cost.

### (c) Exact alarms (SCHEDULE_EXACT_ALARM / USE_EXACT_ALARM)

Facts (Android Developers behaviour-change page + Play policy, verified
2026-07-02):

- `SCHEDULE_EXACT_ALARM` (API 31+): a special app access the USER grants.
  From Android 14 it is "no longer being pre-granted to most newly installed
  apps targeting Android 13 and higher (will be set to denied by default)";
  the app sends `ACTION_REQUEST_SCHEDULE_EXACT_ALARM` to open the grant
  screen and checks `canScheduleExactAlarms()`. Play policy permits it for
  user-facing, precisely-timed features (a broader set than USE_EXACT_ALARM);
  it is not limited to alarm-clock apps, but the app must degrade gracefully
  when denied.
- `USE_EXACT_ALARM` (API 33+): granted at install, not user-revocable, and
  Play-RESTRICTED: acceptable only when the app's CORE function needs it,
  Google's examples being an alarm/timer app or a calendar app. Pessimistic
  reading: Volyume is a training and nutrition coach; a rest timer inside a
  fitness app is unlikely to pass the "core functionality is an alarm/timer"
  test, and apps failing the criteria "will be disallowed from publishing".
  Treat USE_EXACT_ALARM as unavailable.
- The channel-based alternative is ALREADY the shipped mechanism: layer 3
  above (expo-notifications DATE trigger on the `rest-alerts` HIGH-importance
  channel, `channels.js:58-65`). Critically, the installed library
  auto-upgrades: the moment `canScheduleExactAlarms()` returns true it uses
  `setExactAndAllowWhileIdle` with NO change to `restEnd.js`
  (`ExpoSchedulingDelegate.kt:106-113`). So declaring SCHEDULE_EXACT_ALARM in
  `app.json` plus a one-time in-app grant prompt converts today's inexact
  backstop into an exact one, and a user who declines simply keeps today's
  behaviour.

- Reliability delta over today: moderate and narrow. The end-of-rest alert
  becomes second-accurate on Android 12+ instead of window-batched (removes
  the "alert buzzed 40 seconds late" class). No effect on the live countdown,
  no session survival, nothing on Force stop.
- Play review risk: low-moderate for SCHEDULE_EXACT_ALARM (declared
  permission, policy-reviewed use case; a user-started rest timer fits the
  "precisely-timed, user-initiated" language, but approval is not guaranteed,
  UNVERIFIED for fitness apps specifically). High for USE_EXACT_ALARM
  (restricted; pessimistically fails the core-function test).
- Effort: small. One `app.json` permission line, a calm one-time grant prompt
  (respecting NOTIFICATIONS_LOCKED.md and the existing rest-alert off switch
  at `useAppStore.js:1541-1559`), graceful degrade already built into the
  library. EAS build required (manifest change).

### (d) Keep current behaviour + one-time in-app explanation

- Reliability delta: zero by definition. Today's guarantees stay: exact-ish
  alert on Android 11 and lower, inexact alert on 12+, frozen countdown while
  backgrounded, full session restore after any kill, nothing across Force
  stop.
- Play review risk: zero. No manifest change, no declaration, nothing new at
  review.
- Effort: trivial. One dismissible, calm explanation surface (for example the
  first time a rest ends while the app was backgrounded), copy in the locked
  coaching voice, British English, no em dash; plus optionally pointing users
  of aggressive OEMs at battery-optimisation exemption for the app, which is
  user-side and needs no declaration (the `ACTION_REQUEST_IGNORE_BATTERY_
  OPTIMIZATIONS` prompt itself IS Play-sensitive and is NOT proposed here).
- Note: the dormant native chronometer notification (1.3, layer 2) sits
  between (d) and the FGS paths: no new permission, no declaration, fixes the
  frozen countdown while backgrounded, still dies on process death. It is
  listed here as repo evidence, not a recommendation.

---

## 3. Per-path summary table

| Path | Survives backgrounding | Survives swipe-kill / OS reap | Survives Force stop | Play review risk | Effort |
|---|---|---|---|---|---|
| Today (baseline) | Alert yes; countdown freezes | Alert yes (inexact on 12+); session restores on relaunch; countdown dies | No | n/a | n/a |
| (a) shortService FGS | Yes, within ~3 min window | Yes, within window only; no session cover | No | Minimal (declaration-exempt) | Medium |
| (b) specialUse FGS | Yes | Yes, whole session (if approved) | No | Highest; plausible bounce to health type | Medium + ongoing declaration burden |
| (c) SCHEDULE_EXACT_ALARM | Alert yes, now exact | Alert yes, now exact; countdown unchanged | No | Low-moderate (USE_EXACT_ALARM: treat as unavailable) | Small |
| (d) Keep + explain | Unchanged | Unchanged | No | None | Trivial |

---

## Sources

Repo (all paths absolute under /home/user/ADPhysique):
`src/lib/notifications/activeWorkout.js` (flag 36-56, no-op 129-136, sticky
246-284), `modules/rest-timer-live/android/src/main/AndroidManifest.xml`,
`modules/rest-timer-live/android/src/main/java/expo/modules/resttimerlive/WorkoutForegroundService.kt`,
`.../RestTimerLiveModule.kt`, `modules/rest-timer-live/index.ts`,
`src/lib/notifications/restEnd.js`, `src/lib/notifications/channels.js`,
`src/components/RestTimer.js`, `src/store/useAppStore.js` (86-116, 1306-1358,
1405-1559), `app.json` (58-79, 162-176), `CURRENT-STATE-DOSSIER.md:258`,
`node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/service/delegates/ExpoSchedulingDelegate.kt:106-121`,
`node_modules/expo-notifications/android/src/main/AndroidManifest.xml`,
expo-notifications 0.32.17 CHANGELOG (SCHEDULE_EXACT_ALARM must be added by
the app, PR #17334).

Web (fetched/searched 2026-07-02):
- https://developer.android.com/develop/background-work/services/fgs/service-types
- https://developer.android.com/about/versions/14/changes/schedule-exact-alarms
- https://support.google.com/googleplay/android-developer/answer/13392821
- https://support.google.com/googleplay/android-developer/answer/13315670
- https://support.google.com/googleplay/android-developer/thread/240847726
- https://support.google.com/googleplay/android-developer/thread/257355854
- https://developer.android.com/develop/background-work/services/fgs/timeout

UNVERIFIED items are marked inline: Force-stop alarm cancellation (standard
documented behaviour, not re-fetched), 2025/2026 specialUse tightening beyond
the cited threads, and Play acceptance of SCHEDULE_EXACT_ALARM for fitness
rest timers specifically.
