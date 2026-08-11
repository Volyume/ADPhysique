# Campaign 5 — Phases 27-30: permissions, notifications, interruption, back

Lane: Phases 27, 28, 29 and 30 of the founder's Campaign 5 order
(`c5-CAMPAIGN5-ORDER.txt` lines 355-388). Branch
`claude/campaign5-first-use`. **Audit only**: no source, test,
configuration or doc outside this file was changed by this lane, and
nothing was committed, pushed or stashed.

**Method.** Every claim below is read from the code on this branch and
carries `file:line` evidence. Where the order asks a comprehension
question, the answer quotes the rendered copy. Phase 1's map
(`CURRENT-FIRST-USE-JOURNEY.md`) was used as a route list only; every
mechanism asserted here was re-derived from source, and one of its
findings is corrected below (see C5-P29-01).

**Bounds honoured.** No proposal here adds AI, cardio, a feature, a
social/gamification surface, an advanced first-use control, a migration
or a dependency. Article 9, ED/wellbeing semantics, D92-11, billing
architecture and `ONBOARDING_QUIZ_FIRST` are untouched; anything that
would need them is marked FOUNDER-GATED and carries no recommendation.

---

## 1. Summary of findings

| ID | Class | Severity | One-line claim |
|----|-------|----------|----------------|
| C5-P29-01 | DEFECT | CRITICAL | ProOnboarding Step 1 traps a signed-in user behind an OAuth-only screen; the Free-to-Pro upgrade path hits it with no interruption at all, and an email+password user has no in-app escape. |
| C5-P28-01 | DEFECT | HIGH | A 5 AM or 6 AM weigh-in reminder chosen in onboarding is silently moved to 7 AM by default quiet hours, while onboarding and Coaching reminders both keep displaying the chosen hour. |
| C5-P29-02 | DEFECT | MEDIUM | The free path can create a duplicate starter plan: `copyPlanFromLibrary` has no dedup, the tap is guarded only by React state, and a kill before `completeFirstRun` replays the whole quiz. |
| C5-P28-02 | DEFECT | MEDIUM | Onboarding writes the reminder preferences only to the legacy AsyncStorage blob, never to the per-category SQLite rows that sync, so a second device shows defaults instead of what onboarding wrote. |
| C5-P28-03 | DEFECT | MEDIUM | A second daily audible weigh-in prompt (19:30) is scheduled from onboarding and is named on no screen the user can reach. |
| C5-P27-01 | DEFECT | MEDIUM | Settings → Notifications fires an OS permission prompt on mount, so a Free user who has never been asked meets a system dialog with no intent and no explanation. |
| C5-P27-02 | DEFECT | MEDIUM | The onboarding OS prompt fires after the "Building your first plan" overlay has already started, and after a tap that means "finish setup", not "turn reminders on". |
| C5-P30-01 | DEFECT | MEDIUM | Android hardware Back exits the app from every onboarding stack root, including mid-wizard: no `BackHandler` exists in any onboarding screen. |
| C5-P30-03 | IMPROVEMENT | MEDIUM | The Pro wizard answers "can I change this later?" for 1 of its 19 controls; goal, phase, days, equipment, experience and recovery are all silent on reversibility. |
| C5-P28-04 | FOUNDER-GATED | MEDIUM | Nothing cancels the coaching weigh-in prompts when the trial lapses, and the only screen that can change them is Pro-gated, so a lapsed free user keeps two daily weight prompts with no in-app off-switch. |
| C5-P29-04 | UNCERTAIN | MEDIUM | `healthConsentChecked` has no failsafe; if the auth-enter block never runs, a not-yet-onboarded user sits on the boot splash indefinitely. |
| C5-P27-03 | DEFECT | LOW | Campaign 3 Open Settings gap: `ProgressGhostCapture` tells the user to turn camera access on in Settings but renders no route there. |
| C5-P27-04 | DEFECT | LOW | Campaign 3 Open Settings gap: `CoachingRemindersScreen`'s denied banner says "enable them in your device settings" with no tap-through. |
| C5-P30-02 | DEFECT | LOW | FreeStarter's on-screen chevron steps back one question but Android hardware Back pops the whole quiz and discards the answers. |
| C5-P29-03 | IMPROVEMENT | LOW | The free path re-asks a first name it already saved; the Pro wizard prefills the same field from the same source. |
| C5-P29-07 | IMPROVEMENT | LOW | A kill inside `advanceFrom6` replays every write on the retry; only `logMorningWeight` is same-day idempotent. |
| C5-P30-04 | UNCERTAIN | LOW | "Update goal and phase" rebuilds the plan and starts a fresh block with no confirmation before the write. |
| C5-P27-05 | CLEAN | - | Permission inventory verified: exactly one OS prompt in Pro first use, zero in Free; no camera, photos or health prompt anywhere in onboarding. |
| C5-P27-06 | CLEAN | - | Every camera denial path on the day-0 Pro surface is coherent: Open Settings when denied, re-ask when askable, manual entry as a real escape. |
| C5-P28-05 | CLEAN | - | A denied permission produces no fake scheduled state at any layer, and the hand-off screen says so plainly. |
| C5-P28-06 | CLEAN | - | The first check-in reminder cannot fire before the check-in is unlockable. |
| C5-P28-07 | CLEAN | - | The chosen check-in day survives a denied permission dialog (the preference is written before the prompt). |
| C5-P28-08 | CLEAN | - | Free first use is notification-silent: no prompt, and plan activation schedules nothing. |
| C5-P29-05 | CLEAN | - | Article 9 consent survives every kill point and is never skipped on relaunch; both read-failure paths resolve to null, not false. |
| C5-P29-06 | CLEAN | - | A restored wizard draft can never carry a user past the biological-sex gate. |
| C5-P30-05 | CLEAN | - | No Back affordance, hardware or on-screen, can bypass the consent gate. |
| C5-P30-06 | CLEAN | - | No Back affordance can bypass required-safe baseline data; `goBack()` refuses step 2 and step 2 renders no back control. |
| C5-P30-07 | CLEAN | - | Every onboarding input has a post-onboarding correction route; the table in §5.4 names each one. |

**Counts: 10 DEFECT, 3 IMPROVEMENT, 1 FOUNDER-GATED, 2 UNCERTAIN,
11 CLEAN.**

---

## 2. PHASE 27 — permissions timing

### 2.1 The complete permission inventory (C5-P27-05, CLEAN)

Every OS permission request reachable in first use, enumerated from
source rather than assumed:

| Permission | Call site | Reached in first use? | Intent before prompt? | Explanation before prompt? |
|---|---|---|---|---|
| Notifications | `ProOnboardingScreen.js:840` | Yes, Pro path only, once | Partial (see C5-P27-02) | Yes, two cards on step 6 |
| Notifications | `NotificationSettingsScreen.js:274` | Only if the user opens the screen | No, fires on mount | No (see C5-P27-01) |
| Notifications | `CoachingRemindersScreen.js:254` | Pro-gated, post-onboarding | Yes (the screen is the intent) | Screen title + intro |
| Camera | `ScanBarcodeScreen.js:129` (via `:159-165`) | Pro day 0, user taps Scan | Yes | On denial only |
| Camera | `ScanLabelScreen.js` (same pattern) | Pro day 0, from a barcode miss or the F2 link | Yes | On denial only |
| Camera | `ProgressPhotosScreen.js:341` | Pro, user taps "Take a photo" | Yes | Toast on denial |
| Camera | `ProgressGhostCapture.js:229` | Pro, inside the guided capture | Yes | Fallback surface (see C5-P27-03) |
| Camera | `ShareCardScreen.js:286` | Post-first-workout, user taps "add a background" | Yes | Toast on denial |
| Photo library (write) | `ShareCardScreen.js:355`, `BeforeAfterShareSheet.js:444` | User taps "Save to gallery" | Yes | Toast on denial |
| Health (HealthKit / Health Connect) | `src/lib/health.js` | **No** | n/a | n/a |

Health is genuinely absent from first use. `src/lib/health.js` is
imported by exactly three screens (`WorkoutSummaryScreen.js:800`,
`SettingsHealthScreen.js:16`, `SettingsScreen.js:7`), all
post-onboarding and all user-initiated, and the wizard carries the
explicit removal note at `ProOnboardingScreen.js:940-941`:

> `// (Health Connect / Apple Health connect-on-enrolment was removed with the`
> `// step-target feature, founder 2026-06-30.)`

The free path requests nothing at all: the only first-use call is
`ProOnboardingScreen.js:840`, which the free branch never reaches.

Photo-library *reads* correctly request nothing:
`ProgressPhotosScreen.js:345` and `AthleteProfileScreen.js:349` call
`launchImageLibraryAsync` straight, which routes through the OS picker
rather than a read permission. That is the right shape, not a gap.

### 2.2 C5-P27-01 — DEFECT (MEDIUM). Settings → Notifications prompts on mount.

`NotificationSettingsScreen`'s mount effect ends with:

```js
// NotificationSettingsScreen.js:273-278
try {
  const status = await requestNotificationPermissions();
  setPermissionStatus(status);
} catch (_) {
  setPermissionStatus('denied');
}
```

`requestNotificationPermissions` is a **prompt**, not a read: it returns
early only when the status is already `granted`, otherwise it calls
`Notifications.requestPermissionsAsync` (`permissions.js:25-34`). The
module exports a non-prompting sibling, `getNotificationPermissionStatus`
(`permissions.js:43-51`), which is what a mount-time status read wants,
and which `ProSetupCompleteScreen.js:87` already uses correctly.

Concrete user scenario. A Free user never meets a notification prompt in
first use (§2.1). Training reminders are deliberately tier-blind
(`NotificationSettingsScreen.js:69-72`), so this screen is on their
normal path. They open Settings → Notifications to *look*, and the phone
immediately asks "Allow Volyume to send you notifications?" before they
have touched a single control. Nothing on screen has explained why. If
they decline, the toggle they came to use now needs a Settings round trip
(`:335-340`).

Proposed minimal fix (needs a D96 ruling; no behaviour beyond the read):
swap the mount call to `getNotificationPermissionStatus()`. The
user-action path already prompts correctly at `:468`, and the
training-toggle path already refuses politely at `:335-340`, so nothing
else changes. Law/phase: Phase 27 "Do not request permissions before the
user understands why. Where possible: intent → explanation → OS prompt."

`CoachingRemindersScreen.js:254` has the identical shape but is
Pro-gated (`RootNavigator.js:231`) and the user arrived by choosing
"Coaching reminders", so intent is present. Recorded, lower severity,
same one-line fix if the ruling covers both.

### 2.3 C5-P27-02 — DEFECT (MEDIUM). The onboarding prompt lands under an animation.

Ordering inside `advanceFrom6`, verified:

1. `if (useSequence) startSequence();` — `ProOnboardingScreen.js:796`.
   The "Building your first plan" overlay is now on screen
   (`:1741-1786`).
2. `await AsyncStorage.setItem(NOTIF_PREFS_KEY, ...)` — `:839`.
3. `const status = await requestNotificationPermissions();` — `:840`.

So the OS dialog appears *over* a running build animation, and the
stage timers (`:769-775`) keep advancing behind it while the dialog is
up.

The explanation itself is genuinely present and good. Step 6 renders
two labelled cards before the tap: "Morning weight reminder / A quick
morning weigh-in gives a cleaner trend than occasional scale checks."
(`:1839-1843`) and "Weekly check-in reminder / Pick the day you are most
likely to review training, food and recovery honestly."
(`:1886-1890`), plus "Pick a morning time and weekly check-in day.
Change them any time in your coaching reminder settings." (`:1831`).

What is missing is the link between the tap and the dialog. The button
says "Continue" (`:1925`), which the user reads as "finish setup", and
no copy anywhere on step 6 says the phone is about to ask. Under
intent → explanation → OS prompt, the explanation is there but the
*intent* the prompt attaches to is the wrong one.

Proposed minimal fix (copy and/or ordering, needs a D96 ruling): move
`requestNotificationPermissions()` above `startSequence()` so the dialog
is not competing with an animation, and/or add one line to the
"Coaching reminders" field hint at `:1831` saying the phone will ask to
allow notifications. No new permission, no new screen, no change to
what is scheduled.

### 2.4 C5-P27-03 — DEFECT (LOW). Open Settings gap in the guided photo capture.

`ProgressGhostCapture`'s permanent-denial fallback
(`ProgressGhostCapture.js:372-406`) renders:

> "Camera access is off" / "You can turn camera access on in Settings
> whenever you like, or add a photo from your library instead."

Its only controls are "Use your photo library" (`:388-396`) and
"Not now" (`:397-404`). There is no `Linking.openSettings()` anywhere in
the file. Every sibling surface has the tap-through:
`ScanBarcodeScreen.js:291`, `ScanLabelScreen.js:277`, and
`NotificationSettingsScreen.js:516`, the last of which carries the
Campaign 3 rationale verbatim:

> `// Permission banner. F8 (discoverability audit 2026-08-10): "enable`
> `// them in your device settings" had no way to get there. Mirrors the`
> `// camera-flow pattern already shipped (ScanBarcodeScreen.js,`
> `// ScanLabelScreen.js) -- Linking.openSettings() as an explicit`
> `// tap-through, not just an instruction.`

This screen states the instruction and omits the tap-through: exactly
the pattern F8 was raised to close. Denied path is still coherent (the
library route is a real alternative), so LOW. Proposed minimal fix: one
`Linking.openSettings()` control in the `!canAskAgain` branch, matching
`ScanBarcodeScreen.js:288-293`.

### 2.5 C5-P27-04 — DEFECT (LOW). Open Settings gap in Coaching reminders.

`CoachingRemindersScreen.js:390-396`:

> "Notifications are disabled at the system level. Enable them in your
> device settings for these reminders to fire."

No button, no `Linking` import in the file. Same F8 pattern, same
family of screens, and this one sits one tap from the
`NotificationSettingsScreen` banner that *does* have the control
(`:507-524`). Proposed minimal fix: mirror that banner's action row.

### 2.6 C5-P27-06 — CLEAN. Denied camera paths.

Checks run and passed:

- `ScanBarcodeScreen.js:277-308`: "Camera access needed / Volyume uses
  the camera to scan barcodes." Renders **Open Settings** when
  `permission === 'denied'`, **Allow camera** when still askable, and
  **Type it in instead** (`:301-306`) as a real, non-dead-end escape to
  `AddCustomFood`.
- `ScanLabelScreen.js:257-283`: identical shape, same escape hatch.
- `ProgressPhotosScreen.js:341-342`: refuses with a calm toast
  ("Camera permission is needed to take a photo.") and returns, rather
  than trapping the user on a broken sheet.
- `ScanBarcodeScreen.js:150-166` documents why the re-ask fires for ANY
  non-granted status rather than only `not-determined` (Android 16
  reports never-asked as `denied`), so no user is dumped at the
  Settings fallback without ever having seen a dialog.

No custom permission workaround exists anywhere: every request goes
through the platform API. Campaign 3's Open Settings behaviour is
intact on all three surfaces that already had it (§2.4, §2.5 are the two
that never received it).

---

## 3. PHASE 28 — notifications during first use

### 3.1 What onboarding actually enables and schedules

The whole of it, from `ProOnboardingScreen.js:800-862`:

| Written / scheduled | Value | Chosen by the user? | Displayed later? | Manageable later? |
|---|---|---|---|---|
| `morningEnabled` (blob) | `true`, forced | No | Yes, `NotificationSettingsScreen.js:135` | Not directly (no toggle by design) |
| `morningHour` | user pick, 5-12, default 7 | Yes | Yes, `CoachingRemindersScreen.js:415` | Yes, Pro only |
| `checkinEnabled` (blob) | `true`, forced | No | Yes | Not directly (by design) |
| `checkinDay` | user pick, default Sunday | Yes | Yes, `CoachingRemindersScreen.js:449` | Yes, Pro only |
| `checkinHour` | hard-coded `18` | No | Yes | Yes, Pro only |
| Morning weight OS triggers | 7 weekly, `:842` | Time only | Indirectly | Pro only |
| **Evening weight OS triggers** | **7 weekly at 19:30, `:843`** | **No** | **No** | **No dedicated control** |
| Check-in OS trigger | `:848-850`, earliest = day `FIRST_CHECKIN_MIN_DAYS` | Day only | Yes | Pro only |
| Missed-check-in follow-ups | `:854-861` | No | Yes, `CoachingRemindersScreen.js:466+` | Yes, toggle, Pro only |

The forced `morningEnabled`/`checkinEnabled` are a deliberate, recorded
product decision, not a defect: `CoachingRemindersScreen.js:3-13`
explains that the toggles were removed because "the user has to keep
them on for the app to work as designed, so the toggle just added a way
to break the experience", and step 6 labels both cards "Part of your
coaching" (`:1846-1848`, `:1893-1895`). That is honest.

### 3.2 C5-P28-01 — DEFECT (HIGH). Quiet hours silently overrides the chosen hour.

Three facts, each verified:

1. Onboarding offers 5 AM through 12 PM:
   `const HOURS = Array.from({ length: 8 }, (_, i) => i + 5); // 5am to 12pm`
   (`ProOnboardingScreen.js:194`). `CoachingRemindersScreen.js:45`
   offers the same range.
2. Quiet hours default to **enabled, 22:00 → 07:00**
   (`quietHours.js:20-26`).
3. `scheduleMorningWeightNotification` shifts the trigger through
   `shiftHourMinuteOutOfQuietHours` (`scheduler.js:110-111`), which
   returns `{hour: quietHours.endHour, minute: quietHours.endMinute}`
   for any time inside the window (`quietHours.js:90-100`). For the
   wrap window 22:00→07:00, `isInsideQuietHours(5, 0, …)` is true
   (`quietHours.js:79-80`), so **05:00 and 06:00 both become 07:00**.

The preference blob still stores the user's pick (`:832`), so every
display keeps showing it: `CoachingRemindersScreen.js:415` renders
`Notification at {formatHour(morningHour)}` — "Notification at 5 AM" for
a notification that will fire at 7 AM.

Neither screen mentions quiet hours at all. `grep -i quiet` returns
zero hits in `ProOnboardingScreen.js` and zero in
`CoachingRemindersScreen.js`. The quiet-hours UI lives only on
`NotificationSettingsScreen.js:674-723`, a screen a Pro user has no
reason to visit (their reminder times are on the other screen, reached
by the cross-link at `:534-560`).

Concrete user scenario. A shift worker or an early riser picks 5 AM in
onboarding, is shown "5 AM" on the wizard and again on Coaching
reminders, and is nudged at 07:00 every day. They have no way to
discover why, and no reason to suspect a setting they were never shown.

Proposed minimal fix (needs a D96 ruling, copy-or-range only): either
(a) drop 5 and 6 from the onboarding `HOURS` list so the offer matches
the default behaviour, or (b) render a plain note on both screens when
the picked hour falls inside the current quiet window ("Quiet hours
currently run to 7 AM, so this will arrive then"). No change to
quiet-hours enforcement, which is locked by
`NOTIFICATIONS_LOCKED.md` and correct as written. Law/phase: Phase 28
"quiet hours apply correctly", and Campaign 1 notification integrity
(the displayed state must be the real state).

### 3.3 C5-P28-02 — DEFECT (MEDIUM). Onboarding never writes the synced preference rows.

`advanceFrom6` writes exactly one storage location for reminders:

```js
// ProOnboardingScreen.js:839
await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs)).catch(() => {});
```

It never calls `setPreference` (`src/lib/notifications/preferences.js:62`),
the per-category SQLite writer whose rows are the *only* thing the
registry push ships to the cloud `notification_preferences` table
(`preferences.js:16-23, 83-88`). Verified writers, whole tree:
`CoachingRemindersScreen.js:153-154`, `NotificationSettingsScreen.js:250`
and `:326`. The one-shot back-fill `migrateFromLegacyBlob`
(`preferences.js:222`) has exactly one caller,
`NotificationSettingsScreen.js:211`.

Consequence: until the user visits Settings → Notifications or Settings
→ Coaching reminders, their onboarding choices exist only in a
device-local AsyncStorage blob.

Concrete user scenario. A Pro user onboards on their phone and picks
Wednesday check-ins at 7 AM. They install Volyume on a tablet and sign
in. The tablet has no blob and no SQLite rows, so
`NotificationSettingsScreen`'s read (`:120-183`) falls through both
sources and renders `morningEnabled = false` with the Sunday defaults
from `useState` (`:80-87`). Nothing is scheduled on the tablet either
(see §3.5). The state onboarding wrote is not the state Settings
displays.

Proposed minimal fix: one `setPreference` pair inside `advanceFrom6`
beside the blob write, mirroring `CoachingRemindersScreen.js:153-158`
exactly (same categories, same `time_pref` encoding). No schema change,
no migration.

**FOUNDER-GATED overlap:** FR-C4-2 (notification-pref dual-family) is
the open ruling that owns this dual-storage design. Recorded here as
first-use evidence that raises its priority; **not** to be executed
without that ruling.

### 3.4 C5-P28-03 — DEFECT (MEDIUM). An undisclosed second daily weight prompt.

`ProOnboardingScreen.js:843` calls `scheduleEveningWeightReminder()`
with no arguments, so it takes its defaults: seven weekly triggers at
**19:30, with `sound: true`** (`scheduler.js:216-247`).

Step 6 presents exactly two reminders, both named on screen: "Morning
weight reminder" (`:1839`) and "Weekly check-in reminder" (`:1886`).
`ProSetupCompleteScreen` summarises the outcome as "Coach reminders
set" (`:276`). `CoachingRemindersScreen` renders a Morning weight card,
a Weekly check-in card and three toggles; it has **no evening row**, and
the blob carries no `eveningEnabled` key of its own, because the evening
prompt rides `morningEnabled` (`scheduler.js:1234-1240`,
`CoachingRemindersScreen.js:114-115`).

`grep -i evening` over `ProOnboardingScreen.js`,
`ProSetupCompleteScreen.js`, `CoachingRemindersScreen.js` and
`NotificationSettingsScreen.js` returns only import lines, code
comments, and two unrelated user-facing lines about the *missed-check-in*
nudge (`CoachingRemindersScreen.js:480`) and the *planned-meal* confirm
(`:504`). No copy anywhere tells the user a second daily weight prompt
exists.

Concrete user scenario. A user picks a 7 AM weigh-in on step 6 and is
told nothing else. That evening at 19:30 their phone makes a sound and
says "Before the day's out, Alex — A gentle nudge to log today's weight
if you haven't already." They did not agree to two weight prompts a day
and cannot find the one they want to stop.

The ED protections around this prompt are correct and are **not**
questioned here: it is gated at schedule time by `weighInEdFlagOpen`
(`scheduler.js:172-196, 222-224`), which fails **closed** on a read
error, and stood down again at delivery. The finding is the disclosure
gap, not the safety behaviour.

**Classification: DEFECT for the disclosure gap; FOUNDER-GATED for any
change to what is scheduled.** The prompt is weight-adjacent and
ED-adjacent, so options are recorded without a recommendation:
(a) name the evening backstop on step 6 alongside the other two;
(b) name it on `CoachingRemindersScreen` where the morning card already
lives; (c) leave both the behaviour and the silence as they are.

### 3.5 C5-P28-04 — FOUNDER-GATED (MEDIUM). Nothing stands the prompts down at trial end.

Chain, verified end to end:

1. Onboarding lays morning + evening + check-in weekly OS triggers on
   day 0 (`ProOnboardingScreen.js:842-850`). OS triggers persist across
   launches; nothing in the app expires them.
2. The only cancel paths are `CoachingRemindersScreen.js:110-111`
   (behind `withProGuard`, `RootNavigator.js:231`) and
   `CoachOutputScreen.js:1790` (Pro). A lapsed free user can open
   neither.
3. `restoreNotifications` is the function that *would* gate the re-lay
   on tier — `isPro && prefs.morningEnabled` (`scheduler.js:1224-1240`),
   with the rationale spelled out at `:1214-1222`: "A daily audible
   weigh-in prompt aimed at someone who cannot act on it is exactly the
   pressure pattern the ED rules exist to avoid." But it **never runs at
   launch for a signed-in user**. Its only bootstrap call site sits
   inside the *no cloud session* branch (`RootNavigator.js:1086-1092`,
   reached only after the `if (session?.user) { … return; }` at
   `:1002-1057` has been skipped), and `App.js` calls only
   `rescheduleForTimezoneIfChanged` (`App.js:992`), which itself returns
   unless the timezone offset moved (`scheduler.js:1197-1201`).

So on day 15, a user who does not subscribe keeps receiving two
audible daily weight prompts plus a weekly check-in reminder, with the
one screen that could change them locked behind the paywall.

This touches ED/wellbeing-adjacent notification behaviour **and** free/pro
gating, so it is FOUNDER-GATED and carries no recommendation. It also
overlaps FR-C4-8 (check-in reminder off-switch). Recorded as first-use
evidence because the schedule originates entirely from what onboarding
laid on day 0.

Side note for whichever lane owns notification integrity: the stale
comments at `scheduler.js:160-162` and `:221-222` both assert these
prompts are "Re-laid on every launch (restoreNotifications)". Against
the call graph above that is false for every signed-in user. Recorded,
not fixed; it is not this lane's file to change.

### 3.6 Checks run and clean

- **C5-P28-05 — no fake scheduled state under denial.** Verified at
  three layers: `advanceFrom6` schedules only inside
  `if (status === 'granted')` (`ProOnboardingScreen.js:841-861`);
  `restoreNotifications` returns before any schedule when the status is
  not granted (`scheduler.js:1210-1212`); `scheduleTrainingReminders`
  checks the enabled pref *and* the permission
  (`trainingReminders.js:128-138`). The user is told:
  `ProSetupCompleteScreen.js:276` renders "Reminders off. Enable them
  any time in Settings." instead of "Coach reminders set", and the tile
  is a live route to `NotificationSettings` (`:266-272`, the T13 fix).
  `NotificationSettingsScreen.js:669` and `:721` add honest lines for
  the meal reminders and quiet hours under denial.
- **C5-P28-06 — the first check-in reminder cannot fire early.**
  `scheduleCheckinReminder(checkinDay, 18, 0, { earliestMs: Date.now() + FIRST_CHECKIN_MIN_DAYS * 86400000 })`
  (`ProOnboardingScreen.js:848-850`), with the reason recorded inline:
  "a day-0 schedule could invite a brand new user into a locked 'wait a
  few days' screen".
- **C5-P28-07 — the preference survives a denial.** The blob is written
  at `:839`, the prompt fires at `:840`. The OB-2 comment at `:836-838`
  records the bug this fixed: denying used to discard the chosen
  check-in day and send the user back to the default Sunday.
- **C5-P28-08 — free first use is notification-silent.** No prompt on
  the free path (§2.1) and nothing scheduled: plan activation does call
  `scheduleTrainingReminders` (`database.js:3756-3762`), but that
  self-gates on `REMINDER_PREF_KEY`, which is unset and therefore
  reads false (`trainingReminders.js:128-133`). A free user who installs
  a starter plan receives nothing they did not ask for.
- **Check-in hour honesty.** `checkinHour` is pinned to 18
  (`ProOnboardingScreen.js:832`) specifically so the value lands inside
  `CoachingRemindersScreen`'s own `HOURS_EVENING` range and renders as a
  selected chip; finding #13's regression (a 12 that showed as nothing
  selected) is fixed and stayed fixed.
- **Merge discipline.** `advanceFrom6` read-merge-writes the blob
  (`:822-831`), matching every other writer, so onboarding cannot drop
  keys it does not own.

---

## 4. PHASE 29 — the interruption matrix

### 4.1 Persistence inventory (what survives a process kill)

| State | Key / location | Survives kill? | Written when |
|---|---|---|---|
| Supabase session | SecureStore | Yes | Sign-in |
| `first_run_complete` | `@volyume_first_run_complete` + `_<uid>` (`useAppStore.js:13-14`) | Yes | `completeFirstRun` (`:1132-1140`), `resetFirstRun` (`:1101-1119`), `restoreSessionFromCloud` |
| Article 9 consent | `@volyume_health_consent_<uid>` (`Article9ConsentScreen.js:31`) + cloud `consent_log` | Yes | On Continue (`:107-109`) |
| Pro wizard answers | `@volyume_pro_onboarding_draft_<uid>` (`proOnboardingDraft.js:16`) | Yes, steps 2-6 only, 600ms debounce (`:27`) | Debounced effect (`ProOnboardingScreen.js:553-577`); cleared at `:1079` |
| User profile | `@volyume_user_profile_<uid>` (`useAppStore.js:15`) | Yes | `saveLocalProfile` (`:287`), `restoreSessionFromCloud` (`:958`) |
| Tier | `@volyume_tier` | Yes | `setTier`, cascade |
| Notification prefs | `@volyume_notification_prefs` | Yes | `advanceFrom6:839` |
| Nutrition targets | `@volyume_nutrition_targets` + SQLite | Yes | `advanceFrom6:1027-1041` |
| Plan / block / metrics | SQLite | Yes | `advanceFrom6:1050-1077`, `FreeStarterScreen.js:113-115` |
| **`proOnboardingAccountCreated`** | **Zustand memory only** (`useAppStore.js:220-221`, no persist middleware in the file) | **No** | `handleOAuthOnboarding` (`ProOnboardingScreen.js:619`), draft restore (`:534`) |
| `onboardingQuiz` | Zustand memory only, deliberately (`useAppStore.js:1161-1165`) | No | Dark path only, flag off |
| FreeStarter `answers` / `step` | Component state | No | — |
| FirstRunScreen `firstName` field | Component state, `useState('')` (`FirstRunScreen.js:35`) | No | — |

### 4.2 The matrix

Kill point → what the code does on relaunch. Every row traced through
`RootNavigator.renderNavigator` (`:1555-1605`) with the persistence
above.

| # | Kill point | Relaunch route | Data lost | Re-asked? | Duplicate writes? | Verdict |
|---|---|---|---|---|---|---|
| 1 | On Welcome, before sign-in | `WelcomeStack` | None | n/a | No | OK. `RootNavigator.js:1067-1078` also clears a stale saved tier when first run never completed, so an abandoned setup restarts clean. |
| 2 | Mid-OAuth / mid-email sign-up | `WelcomeStack` or the consent resolver, depending on whether the session landed | None | Sign-in only | No | OK |
| 3 | **After account creation, before consent** | Consent resolver splash → `Article9ConsentStack` (`:1579`, `:1594-1597`) | None | Consent (correctly, it was never given) | No | **OK, and this is the fail-closed guarantee.** |
| 4 | **After consent, before wizard step 2** | `ProOnboardingStack` → step 1 | Nothing persisted yet | See row 8 | No | **RACE.** `userProfile` is null at first render unless a prior launch cached it, so the auto-advance usually fires. Second relaunch is deterministic: see C5-P29-01. |
| 5 | Mid-wizard, steps 2-6, more than 600ms after the last edit | `ProOnboardingStack` → draft restores step + answers (`:495-541`) | Up to 600ms of typing | No | No | OK. Sex is clamped so a corrupt draft cannot restore past the gate (`:534-538`). |
| 6 | Mid-wizard, within the 600ms debounce | Same, minus the last edit | Last edit only | That field | No | OK, accepted design. |
| 7 | **Inside `advanceFrom6`** (during the plan build) | Draft still at step 6 (cleared only at `:1079`, after the try block) → user taps Continue again | None | No | **Yes**: a second `generateAndSavePlan`, `logBodyMetric`, `saveUserBodyProfile` and targets write | See C5-P29-07. Not contradictory (the old plan is archived), but untidy. `logMorningWeight` is same-day idempotent (`database.js:5426-5430`). |
| 8 | **On ProSetupComplete, before "Start training"** | `ProOnboardingStack` → **step 1, no draft** (it was cleared at `:1079`), `userProfile` non-null (saved at `:964`) | Nothing, but the user cannot reach it | **Everything** | Would be, on the retry | **DEFECT, deterministic. C5-P29-01.** |
| 9 | On the free name screen | `FirstRunStack` → `FirstRunBranch` | Typed name if not yet submitted | Name | No | OK |
| 10 | After the name, during the three questions | `FirstRunStack` → **name screen again**, field empty | Quiz answers | Name **and** all three questions | No | C5-P29-03 (name re-ask). Answer loss is accepted: three one-tap questions. |
| 11 | **After `copyPlanFromLibrary`, before `completeFirstRun`** | `FirstRunStack` → name → quiz → "Start with this plan" again | None | Name + quiz | **Yes: a second plan copy** | **DEFECT. C5-P29-02.** |
| 12 | After the OS permission prompt, before the writes finish | Row 7 | None | No | Prefs merge-write, so harmless | OK |
| 13 | Immediately after `completeFirstRun` | `MainTabs` | None | No | No | OK |
| 14 | During a Free→Pro upgrade (`resetFirstRun`) | `ProOnboardingStack` → step 1 | Nothing, but blocked | **Everything** | — | **DEFECT, and no kill is even required. C5-P29-01.** |
| 15 | Sign-out at any point | `AsyncStorage.clear()` (`useAppStore.js:541`) wipes draft, profile, consent cache, prefs and quiet hours | All local onboarding state | Consent + all of onboarding | No | Heavy but internally consistent; it is also the only escape from row 8/14. |

### 4.3 C5-P29-01 — DEFECT (CRITICAL). The Step 1 dead end.

**Mechanism.** The auto-advance effect that is supposed to skip the
now-obsolete account step:

```js
// ProOnboardingScreen.js:463-483
if (step === 1 && user && !user.isLocal) {
  if (proOnboardingAccountCreated) {
    setAccountCreated(true);
    setStep(2);
    return;
  }
  // Otherwise an existing account is being restored and the
  // navigator is about to send the user to MainTabs. A hydrated
  // userProfile means don't flash Step 2 before it catches up.
  if (userProfile) return;        // <- line 479
  setAccountCreated(true);
  setStep(2);
}
```

Two things are wrong with this.

First, `proOnboardingAccountCreated` is **not persisted**, despite the
comment three lines above calling it "the persisted flag"
(`:466-467`). It is a plain Zustand field (`useAppStore.js:220-221`);
the store file contains no `persist` middleware, and the only writers
are `handleOAuthOnboarding` (`ProOnboardingScreen.js:619`) and the
draft restore (`:534`). A process kill loses it.

Second, the `if (userProfile) return;` guard rests on an assumption
that is false in at least two live situations: "an existing account is
being restored and the navigator is about to send the user to
MainTabs". The navigator sends a user to `ProOnboardingStack`
precisely when `!firstRunComplete` (`RootNavigator.js:1598-1600`), and
a hydrated `userProfile` with `firstRunComplete === false` is a normal,
reachable state.

Step 1 renders **one control**: `OAuthButtons`
(`ProOnboardingScreen.js:1123-1127`). There is no Continue, no Back, no
sign-out, and the email + password path was deliberately removed from
this step on 2026-07-01 (`:437-441`, `:1118-1122`) — while
`LoginScreen` re-added email + password for everyone on 2026-07-21.
`OAuthButtons` renders Apple on iOS only (`OAuthButtons.js:40`) and
Google on non-iOS only (`:77`).

**Scenario A — no interruption at all (deterministic).** A Free user
taps a Pro lock and upgrades. `ProUpgradeScreen.js:285` (or `:421`)
calls `resetFirstRun()`, which sets `firstRunComplete = false`
(`useAppStore.js:1115`) expressly so the Pro wizard mounts
(`ProUpgradeScreen.js:416-418`). That user has a fully hydrated
`userProfile`. `proOnboardingAccountCreated` is false. The effect hits
line 479 and returns. They are shown "Set up your Pro account safely"
with a single "Continue with Google" button, having just paid.

**Scenario B — kill on the hand-off screen (deterministic).** A Pro
user finishes the entire wizard. `advanceFrom6` writes the local
profile (`:964` → `useAppStore.js:287`, writing
`@volyume_user_profile_<uid>`), clears the draft (`:1079`), and
replaces into `ProSetupComplete` (`:1097`). `firstRunComplete` is still
false; it is only set when they tap "Start training"
(`ProSetupCompleteScreen.js:201`). They press Android Back (which exits
the app, see C5-P30-01) or the OS reaps the app. On relaunch the
bootstrap reads `@volyume_user_profile_<uid>` and sets `userProfile`
**before** `setInitialAuthResolved(true)` (`RootNavigator.js:1015-1031`
then `:1056-1057`), so `userProfile` is non-null on the wizard's very
first render. No draft exists. Line 479 returns. Step 1.

**Escape analysis.**
- Signed in with Google on Android / Apple on iOS: tapping the button
  re-authenticates the same account, `_lastUid` matches so no
  cross-account modal fires (`RootNavigator.js:1243-1245`),
  `setProOnboardingAccountCreated(true)` runs (`:619`) and they reach
  step 2 — then must redo all five steps, generating a second plan.
  Confusing, recoverable.
- **Signed in with email + password: no escape.** Step 1 offers only
  the other platform's OAuth identity. Tapping it authenticates a
  different account, which fires "You're signing in to a different
  account" (`RootNavigator.js:1247-1262`). "Keep this device's data"
  signs them straight back out and returns them to Welcome; signing in
  with email again lands on step 1 again. "Switch accounts" abandons
  the setup they just paid for. The only clean exit is an explicit
  sign-out, and **step 1 renders no sign-out control**.

**Correction to Phase 1's C5-P1-01.** That finding described this as a
narrow race in a 600ms draft window. It is broader and worse: the
Free→Pro upgrade path reaches it with no interruption whatsoever, and
the post-wizard kill reaches it deterministically because
`saveLocalProfile` guarantees the AsyncStorage profile exists by then.

**No pinned test blocks a fix.** `screen-mount.test.js:2382-2404` pins
only `proOnboardingAccountCreated: true` + hydrated profile → step 2,
and `:2406-2427` pins a **local** user with a **null** profile → step 1.
The defective combination (non-local user, `proOnboardingAccountCreated`
false, hydrated profile) is uncovered.

**Proposed minimal fix (needs a D96 ruling; implementation is another
lane's).** Either (a) drop the `if (userProfile) return;` guard so any
authenticated non-local user at step 1 is treated as account-complete —
the navigator has already decided this user belongs in the wizard, so
the guard is second-guessing it; or (b) persist
`proOnboardingAccountCreated` per uid so it survives a relaunch, which
also makes the `:466-467` comment true. No new screen, no new
dependency, no identity change, no gating change. Law/phase: Phase 29
("on relaunch: do not restart unnecessarily"), Phase 30 (a state with no
forward and no back), second first-use law (never re-ask what is
already done).

### 4.4 C5-P29-02 — DEFECT (MEDIUM). The free path can duplicate the starter plan.

`copyPlanFromLibrary` (`database.js:3812-3838`) unconditionally calls
`createProgramme` and copies every routine. There is no "does this user
already have a copy of this library plan" check anywhere in it.
`activatePlanWithBlock` (`:3715-3765`) then deactivates all existing
mesocycles and inserts a fresh one.

Unlike the Pro path, the free path never archives the previous plan.
`generateAndSavePlan` calls `archiveOtherUserPlans(userId, prog.id)`
(`planAutoGen.js:225`); `FreeStarterScreen.handleStartPlan`
(`:108-129`) does not.

**Route 1, interruption.** Kill between
`await activatePlanWithBlock(...)` (`:115`) and
`await completeFirstRun()` (`:122`). On relaunch `firstRunComplete` is
still false, so the navigator mounts `FirstRunStack`
(`RootNavigator.js:1598-1600`) and the user walks the name screen and
the three questions again. Tapping "Start with this plan" produces a
**second identical copy** of the same library plan, plus a second
mesocycle that silently deactivates the first (`database.js:3720-3723`),
resetting the block start date. The user lands on Home with two
identical plans under My plans and a block that thinks it started today.

**Route 2, double tap.** `handleStartPlan` guards only on the `busy`
React state (`FreeStarterScreen.js:108`), which does not take effect
until the next render. `Button` disables on `loading`
(`Button.js:120-121`) but through the same render cycle. The codebase
treats this exact risk as real elsewhere: `ProOnboardingScreen.js:330-332`
introduces `submittingRef` specifically because "a fast second tap
before the overlay commits could fire two plan generations", and a ref
"is synchronous where `busy` state is not".

Proposed minimal fix (needs a D96 ruling): add the same synchronous
`submittingRef` guard used by `advanceFrom6`, and have
`handleStartPlan` no-op when the user already has an active plan for
this library id. No schema change, no new feature. Law/phase: Phase 29
("do not duplicate writes; do not create duplicate plans"), Phase 40's
PLAN pin ("first plan activation creates one valid active plan/block;
retry does not duplicate").

### 4.5 C5-P29-03 — IMPROVEMENT (LOW). The free path re-asks a saved name.

`FirstRunScreen.js:35` is `useState('')`, with no prefill, while the
screen already reads `userProfile` from the store (`:26`) and the Pro
wizard prefills the identical field from the identical source
(`ProOnboardingScreen.js:334`: `useState(userProfile?.firstName || '')`).
So a free user killed at matrix row 10 or 11 retypes a name the app
already stored (`:50-51` writes it through `saveLocalProfile`). Not a
data-loss bug (the write is a merge), but it is a re-ask of completed
work, which the second first-use law is against. One-line change, but
still a lead ruling.

### 4.6 C5-P29-04 — UNCERTAIN (MEDIUM). No failsafe on the consent latch.

`renderNavigator` holds a not-yet-onboarded signed-in user on a blocking
splash until `healthConsentChecked` is true
(`RootNavigator.js:1579-1581`). The comment at `:1573-1578` asserts
"This wait always ends: the consent check runs on SIGNED_IN and
INITIAL_SESSION and sets healthConsentChecked=true in every branch".

Verified: `setHealthConsent` / `healthConsentGranted` have exactly four
call sites (`RootNavigator.js:1361`, `:1380`, `:1383`, `:1398`), and all
four sit inside the `isAuthEnter` block (`:1197+`). There is **no
timeout failsafe** on this latch, unlike `initialAuthResolved` which has
an 8s one (`:1110`) and `setAuthLoading` which has its own.

The block can be entered and left without reaching the consent check:
the pending-deletion path returns at `:1240` and the cross-account
"Keep this device's data" path returns at `:1259`. Both sign the user
out first, so `SIGNED_OUT` clears `user` and the gate at `:1579` stops
applying — those two are safe. What is unproven from code alone is the
case where `onAuthStateChange` never delivers `INITIAL_SESSION` for a
session that `getSession()` already restored at `:1003`, or where the
AUTH-4 3s dedup (`:1200-1203`) swallows the only delivery. In those
cases `user` is set by the bootstrap but `healthConsentChecked` never
flips, and a user with `firstRunComplete === false` sits on the splash
with no failsafe and no route out but a reinstall.

Classified UNCERTAIN rather than DEFECT because reproducing it needs
runtime behaviour of `supabase-js`'s event delivery, which is not
decidable from this tree. Evidence attached; the safe, Article-9-neutral
shape of a fix would be a failsafe that resolves the latch to
`setHealthConsent(null, true)` — the value that keeps the gate **closed**
for a new user (`:1594`) — never to `true`. Recorded for a ruling; not
proposed for execution, because it is adjacent to the consent gate.

### 4.7 C5-P29-07 — IMPROVEMENT (LOW). Retry after a mid-build kill replays every write.

`advanceFrom6` clears the draft at `:1079`, *after* the try block. A
kill anywhere inside the build (matrix row 7) therefore leaves the
draft at step 6, and the retry re-runs the whole sequence:
`logBodyMetric` (`:997`), `saveUserBodyProfile` (`:1015`), the targets
write (`:1034`) and `generateAndSavePlan` (`:1064`).

Consequences are bounded, not contradictory: `logMorningWeight` dedups
by local day (`database.js:5426-5430`), `saveUserBodyProfile` and the
targets write are upserts, and `generateAndSavePlan` archives the
earlier plan (`planAutoGen.js:225`) so only one is active. The visible
residue is a second body-metric row and an archived "Your plan" beside
the new "Your plan 2" (`makeUniquePlanName`, `planAutoGen.js:162`).
Recorded for completeness; the cheapest honest fix is a persisted
"build already started" marker, which is a lead ruling and probably not
worth the complexity.

### 4.8 Checks run and clean

- **C5-P29-05 — consent is never skipped and never duplicated.** The
  gate is evaluated before both onboarding branches
  (`RootNavigator.js:1594-1600`); a new account is held on a resolver
  splash until the read resolves (`:1579-1581`); an unresolved (null)
  read for a user who has not finished onboarding routes **into** the
  gate (`:1594`); and both read-failure paths set null rather than false
  (`:1380`, `:1398`), so a network blip can neither bypass the gate nor
  re-prompt a user who already consented. On relaunch the per-uid cache
  short-circuits the cloud read (`:1358-1362`), so consent is asked
  exactly once. The RPC is queued for retry on failure
  (`Article9ConsentScreen.js:93-105`), so the audit row is not lost by a
  kill either. Pinned by `src/__tests__/onboardingConsentRouting.guard.test.js`
  and `healthConsentRouting.guard.test.js`. **Untouched by this lane.**
- **C5-P29-06 — the sex gate survives a corrupt draft.** `parseDraft`
  never invents values (`proOnboardingDraft.js:42-55`), the restore only
  accepts an explicit prior choice
  (`ProOnboardingScreen.js:513-514`), and the restored step is clamped
  to 2 when sex is not an accepted value (`:534-538`). Required-safe
  data cannot be reached past by any interruption path.
- **Cross-account safety during onboarding.** A different uid signing in
  is gated by an explicit modal *before* any restore, sync or wipe side
  effect (`RootNavigator.js:1206-1273`), with a snapshot taken before
  the wipe (`:1267-1271`). An interrupted onboarding cannot silently
  lose another account's data.
- **Stale-uid guards.** `restoreSessionFromCloud` bails at four points
  if a different user signed in mid-flight (`useAppStore.js:801-806`,
  `:829`, `:909`, `:962`), so a late restore cannot write user A's
  first-run state over user B's.

---

## 5. PHASE 30 — back navigation and "change my mind"

### 5.1 C5-P30-05 / C5-P30-06 — CLEAN. Back cannot bypass consent or required-safe data.

- **Consent.** `Article9ConsentStack` (`RootNavigator.js:691-701`)
  registers `Article9Consent` as the stack root, so there is nothing to
  pop; Android hardware Back exits the app, which is the correct
  fail-closed outcome, and the consent state is unchanged on relaunch
  (matrix row 3). The one pushed route, `PrivacyPolicy`, returns to the
  gate. The screen offers a deliberate, non-bypassing alternative
  instead: the "What if I don't agree?" expander with Sign out / Delete
  my account (`Article9ConsentScreen.js:53-57`).
- **Required-safe baseline.** `goBack()` refuses step 1 and refuses step
  2 once the account exists (`ProOnboardingScreen.js:571-575`), and step
  2 passes **no** `onBack` to its header, so no chevron is rendered at
  all (`ProOnboardingHeader` renders the control only when `onBack` is
  truthy, `:231-241`; `onBack` is passed at `:1397`, `:1469`, `:1591`
  and `:1796` only, i.e. steps 3, 4, 5 and 6). Sex, age, height and
  weight cannot be skipped backwards.

### 5.2 C5-P30-01 — DEFECT (MEDIUM). Hardware Back exits the app from every onboarding root.

`grep -rn BackHandler src/` returns exactly two non-test users:
`BottomSheet.js:257` and `ActiveWorkoutScreen.js:860`. No onboarding
screen registers one.

The six-step Pro wizard is a **single** registered screen
(`RootNavigator.js:706`) whose step lives in component state
(`ProOnboardingScreen.js:310`), so React Navigation has nothing to pop
and Android's Back button/gesture closes the app from any step. Same for
`FirstRunBranch` (`:672`) and `ProSetupComplete` (reached by
`navigation.replace`, `:1097`, so the stack holds one screen).

Consequences: the on-screen chevron on steps 3-6 and the hardware Back
button do different things on the same screen, and this is the
mechanism by which a user reaches matrix row 8 and therefore
C5-P29-01. Draft persistence limits the data loss (rows 5-6), but the
behaviour reads as a crash.

Proposed minimal fix (needs a D96 ruling): a `BackHandler` in
`ProOnboardingScreen` mapping hardware Back to the existing `goBack()`
while `step > 2`, returning `false` otherwise so the fail-closed exit at
steps 1-2 is preserved. No navigation restructure. Law/phase: Phase 30
("audit every setup choice for appropriate reversibility... no
destructive surprise").

### 5.3 C5-P30-02 — DEFECT (LOW). FreeStarter's two Backs disagree.

`handleBack` steps back one question and only calls
`navigation.goBack()` at step 0 (`FreeStarterScreen.js:77-80`). But the
screen is a **pushed** route in `FirstRunStack` (`RootNavigator.js:676`),
so Android hardware Back pops the whole screen to the name screen, the
component unmounts, and `answers` / `step` are gone (§4.1). A user two
questions in loses both. Same `BackHandler` fix as C5-P30-01.

### 5.4 C5-P30-07 — CLEAN. Everything asked in onboarding can be corrected later.

| Onboarding input | Correction route | Evidence |
|---|---|---|
| First name | Settings → Profile | `SettingsProfileScreen.js` |
| Biological sex | Settings → Profile (`changeSex`, dual-writes profile + body profile) | `SettingsProfileScreen.js:176-188` |
| Age | Settings → Profile (`saveAge`, bounds-checked) | `:150-168` |
| Height | Settings → Profile (`saveHeight`, bounds-checked) | `:115-144` |
| Body weight | Body metrics / morning weigh-in | `BodyMetricsScreen.js` |
| Body-weight units | Settings → Workout | `SettingsWorkoutScreen.js:106` |
| Body fat % + source | Nutrition targets / Body metrics | `NutritionTargetsScreen`, `BodyMetricsScreen` |
| Training goal (division) | You → "Update goal and phase" | `YouScreen.js:511` → `ProGoalSetupScreen.js:450` |
| Training phase | Same | `ProGoalSetupScreen.js:108, 515` |
| Experience | Same | `:147, 527` |
| Days per week | Same | `:148, 541` |
| Session length | Same | `:149, 549` |
| Equipment | Same | `:150, 559` |
| Recovery rating | Same | `:151` |
| Weak points | Same | `:264-265` |
| Protein approach | Same | `:111` |
| Morning reminder hour | Settings → Coaching reminders (**Pro only**) | `CoachingRemindersScreen.js:410-421` |
| Check-in day / hour | Same (**Pro only**) | `:434-448` |
| Plan | Train tab, library / builder / archived | `PlansScreen.js` |
| Free starter quiz answers | Re-runnable from the no-plan empty state | `HomeScreen.js:1961`, `PlansScreen.js:976` |

Two caveats, both already recorded elsewhere in this file: the two
reminder times are Pro-gated after the trial (C5-P28-04), and a second
device may not see what onboarding wrote until Settings is visited
(C5-P28-02).

### 5.5 C5-P30-03 — IMPROVEMENT (MEDIUM). Onboarding barely says any of this.

The Campaign 5 comprehension question is "Can I change this later?".
Across the whole Pro wizard, exactly **one** control answers it:

> "Pick a morning time and weekly check-in day. **Change them any time
> in your coaching reminder settings.**" — `ProOnboardingScreen.js:1831`

Nothing on step 2 (name, sex, age, height, weight), step 3 (body fat),
step 4 (experience, session length, days, equipment) or step 5 (phase,
division, weak points, protein) says the choice is revisable, even
though §5.4 shows every one of them is. The nearest miss is step 3's
"Progress Photos can refine physique change later" (`:1403`), which is
about a different thing.

The free path does better with one line, and it is the right shape:
"There's no wrong answer. **You can change direction any time.**"
(`FreeStarterScreen.js:167-168`).

This matters most for `trainingPhase`, which is pre-set to `lean_gain`
(`ProOnboardingScreen.js:381-384`) and passes `advanceFrom5`'s truthiness
check untouched (`:714`), so a user can be enrolled in a calorie surplus
without ever opening the dropdown — and is never told they can change
it. Proposed minimal fix: reversibility copy on the step 4 and step 5
headers, in the shape already used at `:1831`. Copy only; no gating,
no ED-safety, no engine change. Lead ruling.

### 5.6 C5-P30-04 — UNCERTAIN (LOW). The correction route itself is destructive.

`ProGoalSetupScreen.handleSave` (`:202-411`) writes the profile,
recalculates nutrition, then calls `generateAndSavePlan`
(`:390`) — which archives every other plan (`planAutoGen.js:225`) and
starts a **new** six-week block via `activatePlanWithBlock`
(`:224`), deactivating the current one (`database.js:3720-3723`). The
only confirmation is `GoalChangeSummary`, navigated to at `:405`,
**after** the write.

So a first-week user who realises the default phase was wrong, and acts
on it, loses their in-progress block start. Whether that is intended is
a product question this lane cannot rule on: it may be exactly right
(a different phase genuinely needs a different block), and the summary
screen exists precisely to explain the change. Recorded with evidence
for whichever lane owns first-block semantics. Note that it does **not**
auto-create a block without user action — the user tapped Save — so it
does not breach the order's "no auto block transitions" bound.

---

## 6. Notes handed to other lanes

- **Phase 7/8 (free vs Pro, trial):** C5-P29-01 scenario A is a
  Free→Pro upgrade defect as much as an interruption defect; the paid
  user is blocked at the first screen after paying. C5-P28-04 is a
  lapsed-trial honesty issue.
- **Phase 12/13 (Home, first workout):** nothing from this lane.
- **Phase 22 (weigh-in habit):** C5-P28-03 (an undisclosed second daily
  weight prompt) is directly relevant to "do not encourage compulsive
  weighing", though the ED gates on it are intact.
- **Phase 36 (copy density):** C5-P30-03 proposes *adding* reversibility
  copy while Phase 36 looks to remove copy. Both can hold: this is one
  short clause per step, not a card.
- **Phase 38 (analytics):** no telemetry gap found in this lane and none
  proposed. Note only that `onboarding_step_completed`
  (`ProOnboardingScreen.js:641-648`) fires on the Pro path only.
- **Phase 40 (test matrix):** three concrete pins fall out of this lane
  and none of them conflicts with an existing test — (1) a non-local
  authenticated user with a hydrated profile and
  `proOnboardingAccountCreated === false` must not render step 1
  (uncovered gap beside `screen-mount.test.js:2382-2427`); (2) the free
  starter path must not produce two plan copies on a repeated
  activation; (3) a morning hour inside the quiet-hours window must not
  be displayed as the firing time.
- **Founder rulings whose priority this lane raises:** FR-C4-2
  (notification-pref dual-family) via C5-P28-02; FR-C4-8 (check-in
  reminder off-switch) via C5-P28-04. Neither is resolved here.

---

*Phases 27-30 evidence file. Audit only: no source, test, doc or
configuration outside this file was modified, and nothing was
committed, pushed or stashed by this lane.*
