# a-15 — Settings, profile, data & GDPR (the You tab)

Phase 1 internal audit. Code-verified, file:line evidence. British English.
Branch `claude/admiring-bohr-2kb7pd`. No code changed.

Scope: the You tab end-to-end, profile editing, coaching/notification/health
settings, privacy & consent, GDPR data rights, account delete + wipe, Article 9
consent withdrawal, sign-out, subscription entry, support/about, and the
methodology-row a-07 discrepancy.

---

## 1. WHAT — every row and screen, with its function

### 1.0 How the tab is reached
Tab bar registers `ProfileTab` with title **"You"** (`RootNavigator.js:449`),
icon `person`/`person-outline` (`:439`), routed to `ProfileStack`
(`:364`). The stack's `tabPress` listener pops to top each time the tab is
tapped (`:366-367`), so re-tapping You always returns to the root screen, never
a buried sub-page. Root of the stack is `YouScreen`
(`name="You"`, `RootNavigator.js:372`, `headerShown:false`).

### 1.1 YouScreen — the tab root (`src/screens/YouScreen.js`)
Header "You" (`:81`). Then a `ScrollView` of cards in this exact order:

1. **Profile card** (`:86-100`) — avatar initial, display name
   (`userProfile.firstName` → email local-part → "You", `:61-63`), Pro badge if
   `tier==='pro'` (`:93`), training-age line (`:65-67,95`), completed-session
   count read live from `getAllWorkouts` on focus (`:47-59,96-98`). Read-only;
   not tappable.
2. **Go Pro** row — FREE ONLY (`!isPro`, `:103-112`) → `ProUpgrade`.
3. **Coaching section** — PRO ONLY (`isPro`, `:115-149`), five rows:
   - Weekly check-in → `WeeklyCheckIn` (`:118-123`)
   - Precision Coaching™ → `CoachOutput` (`:124-129`)
   - Update your plan → `ProGoalSetup` (`:130-135`) — goal, phase, schedule,
     equipment, experience; this is the only goal/division/phase editor.
   - Nutrition targets → `NutritionTargets` (`:136-141`)
   - Goal lock → `GoalLockConsent {editMode:true}` (`:142-147`)
4. **How Precision Coaching works** — FREE ONLY (`!isPro`, `:157-166`) →
   `Methodology {source:'you_tab'}`. (See §6 for the a-07 verdict.)
5. **Preferences section** (`:169-185`):
   - Wellbeing check — PRO ONLY (`isPro`, `:171-178`) → `WellbeingCheck`
     (health-screening answers).
   - Settings → `Settings` (`:179-184`) — the single door to all settings.
6. **About footer** (`:188-192`) — "Volyume", tagline "Less thinking. More
   lifting.", app version from `expo-application` (`:74-76`), hidden if the
   native value is unavailable.

### 1.2 SettingsScreen — settings landing (`src/screens/SettingsScreen.js`)
A flat list of category rows, each opening a focused sub-page:
Account (`:17-22`), Profile (`:23-28`), Coaching (`:29-34`), Notifications
(`:35-40`), Display and accessibility (`:41-46`), the health provider row
(only if `isHealthAvailable()`, `:47-54`), Your data (`:55-60`), Privacy and
legal (`:61-66`), Help and about (`:67-72`). Comment (`:7-9`) notes this
replaced an old 1,500-line single screen.

### 1.3 SettingsAccountScreen (`src/screens/SettingsAccountScreen.js`)
- **Plan** group: identity row (email + tier, non-tappable `:20-25`);
  Subscription → `Subscription` (`:26-31`); Go Pro if free (`:32-39`);
  **Switch to Free** if Pro, with a reassuring confirm alert (`:40-58`,
  `setTier('free', …)`).
- **Session** group (deliberately isolated below plan rows so a destructive tap
  is never beside a routine one, `:61-62`): **Sign out** (`:65-70`) and
  **Delete account** (`:71-76`), both `destructive`, both driven by
  `useAccountActions`.

### 1.4 SettingsProfileScreen (`src/screens/SettingsProfileScreen.js`)
Only two editable things: **first name** (TextInput, saved on blur via
`saveLocalProfile`, `:33-49`) and **Diet preference** chips omnivore/vegetarian/
vegan (`:9-13,56-82`, `setDietPreference`). Crucially, a comment (`:51-55`)
records that **gym-weight, body-weight and bar-weight unit rows were removed at
user request**; the store still holds the values but they are no longer
editable from Settings. Body-weight units come from onboarding only.
**No body-stats editor here** (height/weight/sex/goal/division) — those live in
`ProGoalSetup` (Pro) and onboarding.

### 1.5 SettingsCoachingScreen (`src/screens/SettingsCoachingScreen.js`)
- **Calmer experience** toggle — FREE + Pro, `setWellbeingMode('calm'|'normal')`
  (`:113-126`); drops aggressive calorie targets, quietens prompts.
- PRO-ONLY block (`tier==='pro'`, `:127-234`): Daily step target toggle + typed
  target with 1,000–30,000 clamp (`:129-160,90-100`); requests step permission
  on enable (`:79-85`); **Cardio** toggle (`:161-179`); **Coaching tone**
  selector Automatic/Supportive/Precise (C1, local-only `coachTone`,
  `:180-213`, `:38,41-47`); **Show the science** toggle (C2, local-only
  `showScience`, off by default, `:214-232,39,49-55`).
- **Cycle tracking** toggle — shown only when body profile sex is female
  (`:235-250`, `bioSex==='female'`).
Comment (`:36-37`) confirms tone + science are local-only profile fields that
survive the sync merge.

### 1.6 SettingsNotificationsScreen (`src/screens/SettingsNotificationsScreen.js`)
A two-row hub: **Training reminders** → `NotificationSettings` (`:14-19`,
all tiers); **Coaching reminders** → `CoachingReminders` (`:20-26`, PRO ONLY).
The detailed reminder UIs live on those separate screens (out of this audit's
file set).

### 1.7 SettingsDisplayScreen (`src/screens/SettingsDisplayScreen.js`)
FREE, never Pro-gated (comment `:10-11`). **Appearance** segmented control
Dark/Light/Match phone (`:12-16,73-95`); **Larger text**, **Higher contrast**,
**Colour-blind safe palette**, **Reduce motion** toggles (`:98-166`). All but
reduce-motion need an app reload; an explicit reload prompt fires on change
(`:23-43,167-169`).

### 1.8 SettingsHealthScreen (`src/screens/SettingsHealthScreen.js`)
Per-scope connect toggles for the device provider (Apple Health / Health
Connect): **Read morning weight** (`:176-194`), **Read daily steps**
(`:195-213`), **Write workouts** (`:214-232`), **Sync weight now** (when weight
granted, `:233-241`), **Open Health settings** (`:242-249`). Turning a scope
OFF is honest about the platform reality: HealthKit/Health Connect expose no
revoke API, so it sends the user to system settings with a toast (`:60-68,
94-99,126-131`). `sdk_unavailable` is handled with an "install Health Connect"
prompt rather than a dead-end toast (`:42-58`). Footer: "Volyume only touches
what you switch on" (`:251-253`).

### 1.9 SettingsDataScreen — the data-rights surface (`src/screens/SettingsDataScreen.js`)
- **Cloud sync** — manual resync through the same `syncAll` runner as the
  background triggers (`:41-66,162-168`).
- **Import from another app** → `Import` (Hevy/Strong, `:169-174`).
- **Back up everything (JSON)** — full-DB backup via `exportBackup`, framed as
  device-migration (`:96-106,175-179`).
- **Restore from backup** — destructive, replaces ALL data, confirm alert
  (`:108-133,180-184`).
- **Restore a snapshot** → `Snapshots` (auto safety copies, `:185-190`).
- **Export workout log (CSV)** — `buildWorkoutCSV` → share sheet; empty-state
  alert if no rows (`:68-94,191-195`). **Workout-only**, not full account data.
- **Clear workout history** — destructive, also clears PRs, confirm alert
  (`:135-157,196-201`).
- Footer: "Your data is always yours. Export or back up any time, no account
  required." (`:203-205`).

### 1.10 SettingsPrivacyScreen (`src/screens/SettingsPrivacyScreen.js`)
- **Health-data consent** row (`:43-54`): reads `healthConsent` tri-state
  (granted/withdrawn/not-recorded). When granted, tapping it runs
  `handleWithdrawConsent`. This IS the post-onboarding Article 9 review point
  (see §1.12 / §4).
- **Share scanned labels with Open Food Facts** — OFF write-back consent toggle,
  default OFF (`:26,55-68`, `getConsent`/`setConsent` from `food/writeback`).
- **Share usage data** — analytics/telemetry toggle; on = `!analyticsOptOut`,
  copy promises "Never your training, food, or body data" (`:69-82`).
- **Privacy Policy** → `PrivacyPolicy` (`:83-87`).

### 1.11 SettingsAboutScreen (`src/screens/SettingsAboutScreen.js`)
**Send feedback** (FeedbackSheet, `:15-20`); **Rate Volyume** (in-app review →
store fallback, platform-correct, `:21-50`); **Credits** → `Credits`
(OpenFoodFacts/CoFID/USDA attribution, `:51-56`); version footer — tap to share
the build id, **long-press opens the on-device DebugLog** (`:63-89`).

### 1.12 useAccountActions — the destructive engine (`src/hooks/useAccountActions.js`)
One hook holds sign-out, delete-account and Article 9 withdrawal so the Account
and Privacy pages can't drift (`:14-23`).
- **Sign out** (`:37-123`): blocks mid-workout (`:42-49`); confirm alert with
  local-vs-cloud copy (`:50-54`); push-first — wipes local SQLite only after a
  successful cloud sync (`:82-115`); AUTH-5 "Sign out anyway" escape hatch on
  sync failure (`:88-114`); cloud signOut retried once (`:73-77`); reloads the
  JS bundle (`:79-80`).
- **Delete account** (`:125-161`): **two-step** confirm ("Delete account?" →
  "Are you sure?"), local-vs-cloud copy, audit events at tap/confirm.
- **performDeleteAccount** (`:163-299`): cloud user → `delete-account` Edge
  Function (wipes `public.*` AND `auth.users`), falling back to the
  `delete_user_data` RPC (`:170-231`); **CRITICAL abort if the cloud wipe
  failed** (`:233-247`) so it can't strand a logged-out-but-alive cloud account;
  then local `wipeAllUserData` (`:254`), in-memory clear, **`AsyncStorage.clear()`**
  (catches the three un-prefixed keys, `:258-269`), belt-and-braces SecureStore
  token wipe so a session can't be revived (`:271-286`), then bundle reload
  (`:287-295`).
- **handleWithdrawConsent** (Article 9, `:301-394`): two-step confirm; records
  withdrawal in `consent_log` via `record_health_consent(false)` (soft-fails,
  `:349-363`); fires `article9_consent_withdrawn` telemetry (`:365-373`); then
  drives `performDeleteAccount('consent_withdrawal')` — **withdrawing consent
  deletes the account**, because losing consent loses the lawful basis
  (`:301-312,374-379`).

### 1.13 wipeAllUserData (`src/lib/database.js:3562-3651+`)
The local wipe guard. Returns early if no `userId` (`:3563`). Deletes in a
single transaction, deepest FK child first (adaptation_events →
planned_muscle_volume → mesocycle_weeks → routine_exercises → all direct
user_id tables → custom exercises), each table in its own try/catch so a
missing table on an older schema can't abort the whole wipe (`:3579-3651`).
Canonical seed exercises are spared; only `is_custom=1` rows go (`:3643-3650`).

---

## 2. WHERE — findable vs buried, dead ends

- **Findable:** Settings is a single, predictable door from You (`YouScreen:179`)
  into a flat 9-row landing. Every category is one tap deep; sub-pages are leaf
  pages. The `popToTop` on tab-press means You is never "stuck" in a sub-page.
- **Subscription management** has two entrances (Account row `:26-31` and the
  Go Pro upsell), good for a billing-anxious user.
- **Buried / hard to find:**
  - **GDPR full export.** The CSV row is **workout-only** (`SettingsData:71,
    191-195`); the only full-data dump is "Back up everything (JSON)"
    (`:175-179`) framed as device-migration, not as a data-access right. A user
    looking for "download my data" under Privacy finds nothing — Privacy has no
    export at all (§1.10). The data rights are split across two pages by feel
    (Data = backup/CSV, Privacy = consent/policy).
  - **DebugLog** is reachable only by a 600 ms long-press on the version string
    (`SettingsAbout:76`) — intentional, but invisible.
  - **Article 9 consent review** lives only inside Privacy as a single row, and
    its only action is destructive (withdraw = delete). There is **no
    non-destructive "review what I consented to" view** (§4).
- **Dead ends:** none fatal. Health "off" toggles correctly redirect to system
  settings rather than silently failing. The cloud-wipe-failed delete path
  surfaces an error and preserves the session (`useAccountActions:240-247`).

---

## 3. FEEL — first impression for Besa vs Eddie; destructive-flow tone; trust

**Besa (gym newbie / light user).** The You root is gentle: a friendly profile
card, a single "Go Pro" nudge, "How Precision Coaching works", and one
"Settings" door. She is not buried under coaching levers (those are Pro-gated
away). The Settings landing reads as plain-English categories. Tone of the
destructive flows is genuinely reassuring: Switch-to-Free says "Everything
you've logged stays" (`Account:46-47`); sign-out says "Your data is safe in the
cloud" (`useAccountActions:54`); delete is a deliberate two-step. This is
welcoming.

**Eddie (athlete / power user).** The Pro You tab is dense and capable — five
coaching rows, tone register, science layer, step/cardio levers, cycle tracking.
Everything he'd want to tune is present. The friction for Eddie is **where**:
goal/division/phase edits hide behind "Update your plan" inside the You tab's
Coaching section (`YouScreen:130-135`), while body composition and units are
non-editable from Settings entirely (§1.4). A returning athlete who changed
weight class will hunt for a body-stats editor that Settings no longer offers.

**Destructive-flow tone.** Strong. Delete is two confirmations with
local-vs-cloud honesty; the copy never threatens. Article 9 withdrawal is
unusually candid — it tells the user plainly that withdrawing consent deletes
the account and purges backups within 30 days (`useAccountActions:316-321,
328-332`). Destructive rows are visually separated and red-tinted
(`SettingsPrimitives:25-29,96-99`; `Account:61-62`).

**Trust surfaces.** Multiple, and they land: "Your data is always yours… no
account required" (`SettingsData:204`); "Never your training, food, or body
data" on telemetry (`Privacy:72`); "Volyume only touches what you switch on"
(`Health:251-252`); OFF write-back default OFF; analytics is opt-out-respecting.
Collectively this reads as a privacy-serious app.

---

## 4. GAPS / FRICTION (per code)

1. **No GDPR data-access export, and no JSON/PDF "my data" download framed as a
   right.** The user-facing export is workout-CSV only
   (`SettingsData:71,191-195`); food, body metrics, check-ins, coach decisions
   are not in it. The full-DB JSON exists but is labelled "Back up everything"
   for device migration (`:175-179`), not discoverable as a data-subject access
   path, and lives on the Data page not the Privacy/legal page. **Friction:**
   a user (or a regulator-minded reviewer) cannot self-serve a complete copy of
   their personal data in a portable, labelled way.

2. **Article 9 consent can be *withdrawn* but not *reviewed* non-destructively.**
   Privacy shows one tri-state row whose only action is "withdraw = delete the
   account" (`Privacy:43-54` → `useAccountActions:313-394`). There is no
   read-only "here is exactly what you consented to, and when" screen
   post-onboarding. The brief's question "can it be reviewed/withdrawn?" — code
   answer: **withdrawn yes (destructively), reviewed no.** Withdrawing health
   consent is an all-or-nothing account deletion, which is legally defensible
   but a heavy, possibly surprising, coupling for a user who just wanted to stop
   weight syncing.

3. **Body stats / units no longer editable from Settings.** Comment at
   `SettingsProfile:51-55` confirms gym-weight, body-weight and bar units were
   removed; there is no height/weight/sex editor on any settings page. Goal/
   division/phase changes are reachable only via the Pro "Update your plan" row
   (`YouScreen:130-135`, `ProGoalSetup` is Pro-gated, `RootNavigator:153,393`).
   A **free** user has no way to revise body stats post-onboarding from the You
   tab at all. Friction for the expanding light-user base.

4. **Health "turn off" is a redirect, not a switch.** Toggling a health scope
   off cannot revoke in-app; it opens system settings and shows a toast
   (`Health:60-68,94-99,126-131`). Honest and platform-correct, but the toggle
   visually implies in-app control it does not have.

5. **Accessibility/appearance changes demand an app reload.** Larger text,
   contrast, colour-blind palette and theme all require a relaunch
   (`SettingsDisplay:18-22,167-169`). The reload prompt mitigates it, but a
   newbie toggling "Larger text" hits a "Volyume needs to reopen" wall —
   friction at exactly the accessibility moment that should feel frictionless.

6. **Promised-in-copy but not delivered as expected:** the delete-flow comment
   anticipates a "privacy management section" that would pass
   `reason='consent_withdrawal'` from Settings (`useAccountActions:184-187`);
   that wiring now exists in `handleWithdrawConsent` (`:374-379`), so this is
   reconciled — but the comment's framing implies a richer privacy section than
   the single consent row that shipped.

---

## 5. SURFACE INVENTORY

**Screens reachable in/under the You tab (15):**
1. `YouScreen` (tab root)
2. `SettingsScreen` (landing)
3. `SettingsAccountScreen`
4. `SettingsProfileScreen`
5. `SettingsCoachingScreen`
6. `SettingsNotificationsScreen`
7. `SettingsDisplayScreen`
8. `SettingsHealthScreen` (conditional on `isHealthAvailable`)
9. `SettingsDataScreen`
10. `SettingsPrivacyScreen`
11. `SettingsAboutScreen`
12. `MethodologyScreen` (free-only entry from You; route ungated)
13. `WellbeingCheckScreen` (Pro)
14. `GoalLockConsentScreen` (Pro, editMode)
15. `SubscriptionScreen` (billing entry)

**Further sub-routes navigated to from these (10):** `ProUpgrade`,
`WeeklyCheckIn`, `CoachOutput`, `ProGoalSetup` (Pro-gated), `NutritionTargets`
(Pro-gated), `NotificationSettings`, `CoachingReminders` (Pro), `Import`,
`Snapshots`, `PrivacyPolicy`, plus `Credits` and `DebugLog` (long-press) from
About — 12 onward links in total.

**Shared primitives (1):** `SettingsPrimitives.js` (`SettingRow`,
`SectionHeader`, `SettingsPage`).

**Engine hooks/libs:** `useAccountActions.js`; `database.wipeAllUserData`,
`buildWorkoutCSV`, `clearWorkoutHistory`; `dataBackup.exportBackup/importBackup`;
`food/writeback` consent; `wellbeing`, `cyclePrefs`, `health`, `activitySteps`;
`sync` runner.

**Editable user fields exposed:** first name, diet preference (Profile);
calmer mode, step target, cardio, coaching tone, show-science, cycle tracking
(Coaching, mostly Pro); theme + 4 a11y toggles (Display); 3 health scopes
(Health); OFF write-back, usage-data telemetry (Privacy). **Not editable from
Settings:** body stats, units, goal/division (units removed; goal via Pro plan
flow only).

**Toggles total:** ~14 switches + 3 segmented/chip selectors across the
settings surface.

---

## 6. THE METHODOLOGY-ROW VERDICT (a-07 vs gap-list)

**Definitive, file:line.** The discrepancy dissolves because a-07 and the gap
list are describing two different things:

- The **route** `Methodology` is registered **ungated** and renders the same
  `MethodologyScreen` for everyone (`RootNavigator.js:389`). a-07's "ungated,
  identical … free-only row expected by the brief is absent" was reading the
  route table and the screen, both of which are tier-agnostic.
- The **You-tab entry row** that opens it **is free-only gated**, wrapped in
  `{!isPro && ( … )}` at **`src/screens/YouScreen.js:157-166`**, navigating
  `Methodology {source:'you_tab'}` (`:163`). The block comment (`:151-156`)
  states the founder decision explicitly: Pro users reach the methodology
  in-context on the Precision Coaching screen, so the redundant You row was
  removed for them; a free user has no coach screen, so their row stays as
  trust copy for weighing up Pro.

**Verdict: the methodology *row in the You tab* is FREE-ONLY gated
(`YouScreen.js:157`, condition `!isPro`).** The methodology *screen/route*
itself is not gated (`RootNavigator.js:389`) and is also reachable by Pro users
from coaching surfaces. So both statements are true at once: a-07 is correct
about the route/screen being ungated and identical; the gap-list "free-only" is
correct about the You-tab row. The free-only row a-07 reported as "absent" is in
fact present at `YouScreen.js:157-166` — a-07 looked at the route registration,
not the You row, and so missed it.

---

*End a-15. No commit, no code changes made.*
