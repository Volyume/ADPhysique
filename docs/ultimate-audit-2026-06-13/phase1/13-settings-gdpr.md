# Phase 1 inventory — Settings, account & GDPR surfaces (2026-06-13)

Audited READ-ONLY against the real source. Token values resolved against
`src/styles/theme.js`. Many of these screens are built from the shared
primitives in `src/components/SettingsPrimitives.js`, so the visual specs
below cite that file for any element rendered through `SettingRow`,
`SectionHeader`, or `SettingsPage`.

Shared primitive reference (used by SettingsScreen, SettingsAccount,
SettingsData, SettingsHealth, SettingsNotifications, SettingsPrivacy,
SettingsAbout, SettingsProfile):
- `SettingsPage` content padding `spacing.lg (16)`, row gap `spacing.sm (8)`, bottom pad `spacing.xxl (32)` (`SettingsPrimitives.js:63`).
- `settingRow`: `flexDirection:row`, `padding: spacing.lg (16)`, `borderBottomWidth:1` `colors.border` (`SettingsPrimitives.js:80-87`). The row's vertical hit area is roughly icon-height (34) + 2×16 padding ≈ 66px, comfortably ≥ 44px.
- `settingIcon`: fixed `34×34`, `borderRadius:9`, `colors.primaryBg` (`SettingsPrimitives.js:88-95`). Fixed px — does not scale with larger-text.
- `settingLabel`: `type.body` → `fontSize.md (16)` regular (`SettingsPrimitives.js:97`, theme.js:394-397/262).
- `settingSub`: `fontSize.xs (11)`, `colors.textMuted`, `lineHeight:16` (`SettingsPrimitives.js:98`, theme.js:258).
- `settingValue`: `fontSize.sm (13)`, `colors.textSecondary` (`SettingsPrimitives.js:105`).
- `sectionHeader`: `fontSize.xs (11)`, `fontWeight.black (900)`, `colors.textMuted`, letterSpacing 0.5 (`SettingsPrimitives.js:64-72`).

---

SCREEN: You (YouScreen)
WHAT IT IS: Root of the "You" tab. The personal hub: profile summary, the Pro coaching/preference shortcuts, and the entry point into Settings (`YouScreen.js:1-11`).
WHAT IS ON IT:
- Header "You" via `ScreenHeader` (no wordmark override, so the Volyume wordmark renders on the right) (`YouScreen.js:81`, ScreenHeader.js:26-37).
- Profile card: circular avatar showing first letter of display name (`YouScreen.js:86-89`); display name (firstName → email local-part → "You") (`YouScreen.js:61-63,92`); `ProBadge size="sm"` shown only if Pro (`YouScreen.js:93`); training-age line "N yr(s) training" if `trainingAgeYears` set (`YouScreen.js:65-67,95`); completed-session count "N session(s)" once loaded (`YouScreen.js:96-98`).
- Free only: "Go Pro" NavRow → ProUpgrade, sub "Precision Coaching, nutrition targets and body metrics" (`YouScreen.js:103-112`).
- Pro only "Coaching" section (`YouScreen.js:115-149`): "Weekly check-in" → WeeklyCheckIn; "Precision Coaching™" → CoachOutput; "Update your plan" → ProGoalSetup; "Nutrition targets" → NutritionTargets; "Goal lock" → GoalLockConsent {editMode:true}.
- Free only: "How Precision Coaching works" NavRow → Methodology {source:'you_tab'} (`YouScreen.js:157-166`).
- "Preferences" section (`YouScreen.js:169-185`): "Wellbeing check" (Pro only) → WellbeingCheck; "Settings" → Settings (always).
- About footer: "Volyume", tagline "Less thinking. More lifting.", and app version string `Version X (build)` from expo-application, hidden if unavailable (`YouScreen.js:73-76,188-192`).
- Each NavRow: amber icon in 36×36 chip, label, optional sub, chevron-forward (`YouScreen.js:26-39`).
NAVIGATION: Route `You` in `ProfileStack` (`RootNavigator.js:372`, headerShown:false). `ProfileStack` is the `ProfileTab` (tab title "You") of `MainTabs` (`RootNavigator.js:449`). Reached by tapping the "You" tab. Leads to: ProUpgrade, WeeklyCheckIn, CoachOutput, ProGoalSetup, NutritionTargets, GoalLockConsent, Methodology, WellbeingCheck, Settings (all registered in ProfileStack, `RootNavigator.js:373-407`).
GATING: Free screen (the tab root). Internal sections gated on `isPro = tier === 'pro'` read from the store (`YouScreen.js:42-44,69`); the Coaching block + Wellbeing row render only when Pro, "Go Pro" + "How Precision Coaching works" only when Free. The destination Pro screens are independently `withProGuard`-wrapped at the navigator (e.g. `GatedWeeklyCheckIn`, `RootNavigator.js:149,387`).
CURRENT STRENGTHS: Clean card-and-row layout; the Pro/Free fork keeps free users from seeing dead Pro rows; subs explain each destination in plain coaching voice; all NavRows have `accessibilityLabel` (`YouScreen.js:28`).
CURRENT WEAKNESSES: For a Pro user the Coaching section is five stacked NavRows plus Preferences plus profile — a long scroll of similar cards with no visual differentiation between them. The avatar is a single letter, not a photo. The completed-session count is the only "data" on a screen that is otherwise pure navigation, and it appears late (after async load) which can cause a layout shift.
NEWBIE QUESTION: A first-timer (always Free here unless trialing) sees a short list: Go Pro, How Precision Coaching works, Settings. Understandable. The profile card with "0 sessions" is clear. The term "Precision Coaching™" is unexplained at this point but the adjacent "How it works" row addresses that.
ATHLETE QUESTION: An experienced Pro competitor gets fast access to check-in, coach output, plan update, nutrition targets and goal lock from one place — adequate. But there is no at-a-glance status (current block, phase, next check-in date); it is purely a launcher, so a competitor still has to tap in to see anything.
LOCATION QUESTION: Correct. This is the conventional "profile/account" tab location and it correctly hosts the Settings entry and the personal coaching shortcuts.
VISUAL + USABILITY:
  - Header title "You": `fontSize.xl (20)` bold (ScreenHeader.js:53-57, theme.js:263).
  - Avatar letter `avatarText`: `fontSize.xl (20)` bold, `colors.primary` (`YouScreen.js:212`).
  - `profileName`: `type.title` → `fontSize.lg (17)` semibold (`YouScreen.js:214`, theme.js:390-393).
  - `profileMeta` (training age): `type.caption` → `fontSize.xs (11)` (`YouScreen.js:215`).
  - `profileStat` (sessions): `type.num('caption')` → `fontSize.xs (11)` tabular (`YouScreen.js:216`).
  - `sectionLabel`: `type.label` → `fontSize.sm (13)` medium (`YouScreen.js:219-222`, theme.js:402-405).
  - `navRowLabel`: `type.bodyStrong` → `fontSize.md (16)` semibold (`YouScreen.js:234`).
  - `navRowSub`: `type.caption` → `fontSize.xs (11)` (`YouScreen.js:235`).
  - `aboutName`: `fontSize.sm (13)` bold (`YouScreen.js:238`); `aboutVersion`/`aboutBuild`: `type.caption` → `fontSize.xs (11)` (`YouScreen.js:239-240`).
  - Touch targets: NavRow is a full `PressableCard` of `padding: spacing.lg (16)` around a 36px icon ≈ 68px tall — ≥ 44px (`YouScreen.js:224-228,229-232`). Avatar 56×56 and navRowIcon 36×36 are fixed px (won't scale with larger-text) (`YouScreen.js:207-211,229-232`).
  - Information density: low-to-moderate; profile card + 1-5 sections of full-width cards. ScrollView with `paddingBottom: spacing.xxxl (48)` (`YouScreen.js:200`).
  - Clean/cluttered: clean for Free; for Pro the five-row Coaching list is repetitive but not cluttered.
  - Most important action prominence: for Free, "Go Pro" is the first section card after the profile — appropriately prominent. For Pro, no single action is emphasised over others (all equal-weight cards).
  - Device behaviour: full ScrollView so all sizes scroll. Avatar (56), navRowIcon (36), avatar radius 28 are hard-coded px and will not grow under the larger-text accessibility setting.

---

SCREEN: Settings (SettingsScreen)
WHAT IT IS: The Settings landing page — a list of category rows each opening a focused sub-page; replaced an older single ~1,500-line screen (`SettingsScreen.js:7-9`).
WHAT IS ON IT (all via `SettingRow` inside one `styles.section` card):
- "Account" → SettingsAccount, sub = `user.email` or "Volyume Pro"/"Free plan" (`SettingsScreen.js:17-22`).
- "Profile" → SettingsProfile, sub "Name and diet preference" (`SettingsScreen.js:23-28`).
- "Coaching" → SettingsCoaching, sub "Calmer mode, steps, cardio" (`SettingsScreen.js:29-34`).
- "Notifications" → SettingsNotifications, sub "Training and coaching reminders" (`SettingsScreen.js:35-40`).
- "Display and accessibility" → SettingsDisplay, sub "Text size, contrast, motion" (`SettingsScreen.js:41-46`).
- Health row, shown only when `isHealthAvailable()` — label = `getHealthProviderLabel()`, sub "Weight, steps and workouts" → SettingsHealth (`SettingsScreen.js:47-54`).
- "Your data" → SettingsData, sub "Sync, backup, import, export" (`SettingsScreen.js:55-60`).
- "Privacy and legal" → SettingsPrivacy, sub "Consent, data sharing, policy" (`SettingsScreen.js:61-66`).
- "Help and about" → SettingsAbout, sub "Feedback, rating, version" (`SettingsScreen.js:67-72`).
NAVIGATION: Route `Settings` in `ProfileStack` with stack header `title: 'Settings'` (`RootNavigator.js:373`). Reached from YouScreen "Settings" NavRow (`YouScreen.js:179-184`). Leads to the nine sub-pages above.
GATING: Free screen. The store read is `{ user, tier }` (`SettingsScreen.js:11`); only the Health row is conditionally rendered (capability check, not tier). All category rows show for every tier; the Pro/Free split happens inside each sub-page.
CURRENT STRENGTHS: Exactly the tidy hub the comment describes — one card, eight or nine self-describing rows, each with a one-line sub. Account sub doubles as a live status (email + plan).
CURRENT WEAKNESSES: All rows live in a single undivided card, so visually distinct domains (account vs accessibility vs legal) are not grouped — the only separator is the hairline border between rows. No section headers here (unlike SettingsAccount which does use them).
NEWBIE QUESTION: Yes — it is a conventional settings menu; labels are plain English and the subs remove ambiguity.
ATHLETE QUESTION: Yes for the role of a settings menu; nothing competitor-specific belongs here.
LOCATION QUESTION: Correct — one level under You, the standard place.
VISUAL + USABILITY:
  - All text via shared primitives: label `fontSize.md (16)`, sub `fontSize.xs (11)`, value `fontSize.sm (13)` (see shared reference; `SettingsPrimitives.js:97,98,105`).
  - Touch targets: each `SettingRow` is a `PressableCard` ≈ 66px tall (≥ 44px) (`SettingsPrimitives.js:80-87`).
  - Information density: moderate — up to nine rows in one scroll; no header chrome (stack header supplies the title).
  - Clean/cluttered: clean. Single undivided card is the one critique (grouping).
  - Most important action: no single "primary" — appropriate for a menu, though Account (identity) is sensibly first.
  - Device behaviour: `SettingsPage` is a ScrollView (`SettingsPrimitives.js:54-58`); content fits small screens with scroll. Icon chips are fixed 34px.

---

SCREEN: Account (SettingsAccountScreen)
WHAT IT IS: Identity, plan, subscription, upgrade/downgrade, and the two destructive account actions (sign out, delete) (`SettingsAccountScreen.js:8-9`).
WHAT IS ON IT:
- Section header "Plan" (`SettingsAccountScreen.js:18`).
- Identity row: label = `user.email` or "Signed in", sub = "Volyume Pro"/"Free plan", no arrow (`SettingsAccountScreen.js:20-25`).
- "Subscription" → Subscription screen, sub "Plan, billing, restore purchases" (`SettingsAccountScreen.js:26-31`).
- "Go Pro" (only when `tier !== 'pro'`) → ProUpgrade, sub "Precision Coaching™ and weekly check-ins" (`SettingsAccountScreen.js:32-39`).
- "Switch to Free" (only when Pro) → `appAlert` confirm "Switch to Free?" with Keep Pro / Switch to Free; on confirm `setTier('free', 'SettingsScreen.switchToFree')` (`SettingsAccountScreen.js:40-58`).
- Section header "Session" (`SettingsAccountScreen.js:63`).
- "Sign out" destructive row, label flips to "Signing out…" while in flight; `handleSignOut` (`SettingsAccountScreen.js:65-70`).
- "Delete account" destructive row, label flips to "Deleting account…"; `handleDeleteAccount` (`SettingsAccountScreen.js:71-76`).
NAVIGATION: Route `SettingsAccount`, stack header `title: 'Account'` (`RootNavigator.js:374`). From SettingsScreen "Account" row (`SettingsScreen.js:21`). Leads to Subscription and ProUpgrade.
GATING: Free screen (account management is universal). Tier read from store (`SettingsAccountScreen.js:11`); "Go Pro" vs "Switch to Free" forks on `tier === 'pro'`. Sign-out/delete via `useAccountActions` hook (`SettingsAccountScreen.js:14`).
CURRENT STRENGTHS: Destructive actions are isolated in their own "Session" card below the plan rows, deliberately so a destructive tap is never adjacent to a routine one (`SettingsAccountScreen.js:61-62`). Switch-to-Free has a clear, reassuring confirmation. In-flight labels give feedback.
CURRENT WEAKNESSES: "Subscription", "Go Pro" and the Switch-to-Free all touch the billing/plan story and partially overlap (Subscription screen also handles plan changes), which could confuse where to manage billing. The billing-touching "Switch to Free" lives here but is governed by CLAUDE.md's billing rules — note: this is tier state, not a Play Billing edit.
NEWBIE QUESTION: Mostly — email + "Free plan" is clear. A newbie may not distinguish "Subscription" from "Go Pro".
ATHLETE QUESTION: Yes — a paying competitor finds billing, restore purchases, and downgrade here as expected.
LOCATION QUESTION: Correct — account/identity/billing belong under Settings → Account.
VISUAL + USABILITY:
  - All rows use shared primitives (label `fontSize.md (16)`, sub `fontSize.xs (11)`). Destructive rows render label + icon in `colors.error` and icon chip in `colors.errorBg` (`SettingsPrimitives.js:25-29,96,99`).
  - Touch targets: `SettingRow` ≈ 66px (≥ 44px).
  - Information density: low — two small cards.
  - Clean/cluttered: clean; the Plan/Session split is good hierarchy.
  - Most important action: identity row is first (status), destructive actions correctly de-emphasised at the bottom.
  - Device behaviour: ScrollView; fits all sizes. Icon chips fixed 34px.

---

SCREEN: Profile (SettingsProfileScreen)
WHAT IT IS: The handful of things the user types/picks about themselves — first name and diet preference (`SettingsProfileScreen.js:15`).
WHAT IS ON IT:
- Name row: person icon + `TextInput` for first name, placeholder "Your first name", saves on blur via `saveLocalProfile` (`SettingsProfileScreen.js:31-50`).
- Diet block: nutrition icon, "Diet preference" label, sub "This filters the meals we suggest", and three selectable chips Omnivore / Vegetarian / Vegan; tapping sets local state and calls `setDietPreference` (`SettingsProfileScreen.js:56-82`, DIET_OPTIONS `:9-13`).
- Comment notes gym-weight/body-weight/bar-weight rows were removed at user request; defaults stay kg, body-weight units come from onboarding (`SettingsProfileScreen.js:51-55`).
NAVIGATION: Route `SettingsProfile`, stack header `title: 'Profile'` (`RootNavigator.js:375`). From SettingsScreen "Profile" row (`SettingsScreen.js:27`). No onward navigation.
GATING: Free screen. Store read `{ user, userProfile, saveLocalProfile, setDietPreference }` (`SettingsProfileScreen.js:17-24`); no tier guard. Diet preference drives meal suggestions (a Pro feature), but the setting itself is editable by all.
CURRENT STRENGTHS: Minimal and focused; inline save-on-blur with no explicit save button; chips have `accessibilityRole="button"` and `accessibilityState.selected` (`SettingsProfileScreen.js:74-75`).
CURRENT WEAKNESSES: Only two fields — feels sparse for a "Profile" page; a newbie might expect age/height/weight here but those live in onboarding/coaching. No visible confirmation that the name saved (silent onBlur write). Diet preference's effect (meal suggestions) is Pro-only, so a Free user editing it sees no consequence.
NEWBIE QUESTION: Yes — name field and three diet chips are self-evident.
ATHLETE QUESTION: Partially — a competitor may want stats (training age, bodyweight units) editable here; they are deliberately elsewhere, which could feel scattered.
LOCATION QUESTION: Reasonable, though the sparseness blurs the line between "Profile" here and the coaching/onboarding data captured elsewhere.
VISUAL + USABILITY:
  - `nameInput`: `type.body` → `fontSize.md (16)` (`SettingsProfileScreen.js:97-102`).
  - "Diet preference" label + sub via shared primitives (`settingsStyles.settingLabel` 16, `settingSub` 11) (`SettingsProfileScreen.js:62-63`).
  - `dietChipText`: `type.label` → `fontSize.sm (13)` medium; active → `colors.primary` semibold (`SettingsProfileScreen.js:131-138`).
  - Touch targets: diet chips are `flex:1` with only `paddingVertical: spacing.sm (8)` (`SettingsProfileScreen.js:118-126`) — chip text 13px + 2×8 padding ≈ 34px tall; FLAG: below the 44px minimum height (width is fine, full-row thirds). Name row `paddingVertical: spacing.sm (8)` around a 16px input ≈ 32px — but it is a text field, not a button.
  - Information density: very low.
  - Clean/cluttered: clean.
  - Most important action: name field first; appropriate.
  - Device behaviour: ScrollView; three equal-width chips will stay readable on a 5.4" screen. Icon chip in diet header is the fixed 34px primitive.

---

SCREEN: Your data (SettingsDataScreen)
WHAT IT IS: Cloud sync, import from other apps, backup/restore, snapshot restore, CSV export, and clear-history (`SettingsDataScreen.js:19-21`).
WHAT IS ON IT (one `styles.section` card of `SettingRow`s):
- "Cloud sync" / "Syncing…" — sub = `formatLastSynced(syncSnapshot)` or "Checking for changes."; tap runs `handleSyncNow` (manual resync through `syncAll`) (`SettingsDataScreen.js:162-168,41-66`).
- "Import from another app" → Import, sub "Bring sessions over from Hevy or Strong" (`SettingsDataScreen.js:169-174`).
- "Back up everything (JSON)" → `handleFullBackup` (export DB, share, size-in-KB alert) (`SettingsDataScreen.js:175-179,96-106`).
- "Restore from backup" → `handleRestoreBackup` (destructive confirm, file picker, count summary, restart prompt) (`SettingsDataScreen.js:180-184,108-133`).
- "Restore a snapshot" → Snapshots, sub "Automatic safety copies from before each app update" (`SettingsDataScreen.js:185-190`).
- "Export workout log (CSV)" → `exportData` (build CSV, share, empty-state alert) (`SettingsDataScreen.js:191-195,68-94`).
- "Clear workout history" destructive → `handleClearHistory` (confirm, deletes sessions + PRs) (`SettingsDataScreen.js:196-201,135-157`).
- Footer note: "Your data is always yours. Export or back up any time, no account required." (`SettingsDataScreen.js:203-205`).
NAVIGATION: Route `SettingsData`, stack header `title: 'Your data'` (`RootNavigator.js:380`). From SettingsScreen "Your data" row (`SettingsScreen.js:59`). Leads to Import and Snapshots; the rest are in-screen actions/alerts.
GATING: Free screen — data portability is universal (footer underscores "no account required"). Store read is `user` only (`SettingsDataScreen.js:24`); no tier guard. (Note: CSV export and backup include all logged data regardless of tier.)
CURRENT STRENGTHS: Strong GDPR/portability story — export, full backup, CSV, and snapshot restore all reachable; every destructive action has its own confirm dialog with plain-language consequences ("This cannot be undone"). Cloud sync status line is honest and the manual sync surfaces a toast.
CURRENT WEAKNESSES: Seven rows of similar-weight actions in one card — backup vs CSV export vs snapshot restore can blur for a non-technical user (three flavours of "save my data"). "(JSON)" and "(CSV)" jargon in labels. Restore requires a manual app restart (alert tells the user to reopen), which is clunky.
NEWBIE QUESTION: Partly — "Cloud sync" and "Export workout log" are clear; "Back up everything (JSON)" vs "Restore a snapshot" vs "Import from another app" is a lot of overlapping vocabulary for a beginner.
ATHLETE QUESTION: Yes — a serious user gets CSV export, full JSON backup for device migration, and Hevy/Strong import. This is competitor-grade portability.
LOCATION QUESTION: Correct — all data/sync/portability under Settings → Your data.
VISUAL + USABILITY:
  - Rows via shared primitives (label 16, sub 11).
  - `dataPrivacyNote` footer: `fontSize.xs (11)`, `colors.textMuted`, lineHeight 16 (`SettingsPrimitives.js:106-112`).
  - Touch targets: `SettingRow` ≈ 66px (≥ 44px).
  - Information density: moderate-high — seven action rows + footer.
  - Clean/cluttered: borderline cluttered given the overlap of backup/export/restore concepts.
  - Most important action: Cloud sync is first; reasonable. Destructive "Clear workout history" correctly last.
  - Device behaviour: ScrollView; fine on small screens. Icon chips fixed 34px.

---

SCREEN: Display & accessibility (SettingsDisplayScreen)
WHAT IT IS: Appearance (theme) plus the accessibility toggles — larger text, higher contrast, colour-blind palette, reduce motion (`SettingsDisplayScreen.js:45-47`).
WHAT IS ON IT:
- Appearance card: "Appearance" title, explanatory sub, and a three-segment control Dark / Light / Match phone (`THEME_OPTIONS`); selecting a non-active option writes `setAccessibilityPref('theme', …)` then `promptRestartForA11y('Appearance')` (`SettingsDisplayScreen.js:68-96,12-16`).
- Toggles card (`SettingRow` + `Switch`):
  - "Larger text" — sub explains it stacks with OS text size; on change saves then prompts reload (`SettingsDisplayScreen.js:99-118`).
  - "Higher contrast" — brightens secondary text / dividers; saves then prompts reload (`SettingsDisplayScreen.js:119-135`).
  - "Colour-blind safe palette" — swaps green/red for sky blue/reddish purple; saves then prompts reload (`SettingsDisplayScreen.js:136-152`).
  - "Reduce motion" — turns off PR particles / timer animations; takes effect immediately (no reload) (`SettingsDisplayScreen.js:153-166`).
  - Note: reduce-motion is immediate; the other three need a reopen, with a reload prompt (`SettingsDisplayScreen.js:167-169`).
- `promptRestartForA11y` shows "<label> saved" with Later / Reload now (`Updates.reloadAsync`), with a dev-client fallback alert (`SettingsDisplayScreen.js:23-43`).
NAVIGATION: Route `SettingsDisplay`, stack header `title: 'Display & accessibility'` (`RootNavigator.js:378`). From SettingsScreen "Display and accessibility" row (`SettingsScreen.js:45`). No onward navigation.
GATING: Free screen — explicitly FREE per the COMP-029 comment "appearance is a FREE display setting (never Pro-gated)" (`SettingsDisplayScreen.js:10-11`). Reads `accessibility` slice + actions (`SettingsDisplayScreen.js:48-55`); no tier guard.
CURRENT STRENGTHS: Each toggle has a thorough plain-language sub explaining what it does and who it helps. The reload-now flow is handled honestly (the tokens are baked at module-eval time, theme.js:1-7,270-273). Switch `accessibilityLabel` is lent from the row label by the primitive (`SettingsPrimitives.js:36-38`). The segmented control has `accessibilityRole="radiogroup"`/`"radio"` (`SettingsDisplayScreen.js:73,87`).
CURRENT WEAKNESSES: Three of four accessibility settings require an app reload to take effect — a real usability tax for the exact users (low-vision) who need them; the workaround (reload prompt) is the best available given the in-place token mutation architecture but is still a reopen. The Appearance title/sub sit inside `styles.section` (a card meant for rows) with locally-styled text, slightly off-pattern from the rest of Settings.
NEWBIE QUESTION: Yes — labels and subs are explicit. The "needs to reopen" prompt may briefly confuse but is explained.
ATHLETE QUESTION: Not competitor-specific; adequate for anyone.
LOCATION QUESTION: Correct — accessibility/appearance belong under Settings → Display.
VISUAL + USABILITY:
  - `local.title` "Appearance": `fontSize.md (16)` semibold (`SettingsDisplayScreen.js:176`).
  - `local.sub`: `fontSize.sm (13)`, `colors.textMuted`, lineHeight 18 (`SettingsDisplayScreen.js:177`).
  - `segText`: `fontSize.sm (13)` medium; active `segTextActive` → `colors.onPrimary` semibold on `primaryFill` (`SettingsDisplayScreen.js:187-188,186`).
  - Toggle rows via primitives (label 16, sub 11).
  - `a11yNote`: `fontSize.xs (11)` italic muted (`SettingsPrimitives.js:113-120`).
  - Touch targets: segmented `segBtn` is `flex:1` with `paddingVertical: spacing.sm (8)` → ≈ 13 + 16 ≈ 34px tall; FLAG: below 44px height (`SettingsDisplayScreen.js:185`). Toggle rows are full `SettingRow` height (≥ 44px); the `Switch` itself is the native control.
  - Information density: low-moderate — one appearance card + four toggle rows + a note.
  - Clean/cluttered: clean.
  - Most important action: Appearance (theme) first, then accessibility toggles; sensible order.
  - Device behaviour: ScrollView; subs are long and will wrap heavily on a 5.4", increasing row height (acceptable). Theme tokens are mutated at boot, not responsive to runtime changes (architectural — theme.js:1-7).

---

SCREEN: Health (SettingsHealthScreen)
WHAT IT IS: Per-scope read/write connections to the device health provider (Apple Health / Health Connect): morning weight read, daily steps read, workout write, plus sync-now and open-system-settings (`SettingsHealthScreen.js:17-19`).
WHAT IS ON IT (one `styles.section` card):
- "Read morning weight" toggle — sub reflects connected/disconnected; on enable requests weight permission and imports new weights with a toast; on disable opens system Health settings (`SettingsHealthScreen.js:176-194,60-92`).
- "Read daily steps" toggle — requests steps permission, reads today's steps immediately; same disable behaviour (`SettingsHealthScreen.js:195-213,94-124`).
- "Write workouts" toggle — requests workout-write permission (`SettingsHealthScreen.js:214-232,126-149`).
- "Sync weight now" row — shown only if weight granted; pulls new readings (`SettingsHealthScreen.js:233-241,151-171`).
- "Open Health settings" row — shown if weight OR workout granted; sub explains turning things off must be done inside the provider (`SettingsHealthScreen.js:242-249`).
- Footer note: "Volyume only touches what you switch on. Everything else stays on this device." (`SettingsHealthScreen.js:251-253`).
- `handleSdkUnavailable` offers a "Get Health Connect" Play-listing path when the SDK isn't ready (`SettingsHealthScreen.js:47-58`).
NAVIGATION: Route `SettingsHealth`, stack header `title: 'Health'` (`RootNavigator.js:379`). Reached only from the SettingsScreen Health row, which itself renders only when `isHealthAvailable()` (`SettingsScreen.js:47-54`). No onward in-app navigation (opens system settings / Play externally).
GATING: NOT DETERMINED IN CODE as a hard tier guard — this screen reads only `user` from the store (`SettingsHealthScreen.js:22`) and has no `withProGuard`/tier check. Its entry row is shown on a capability check (`isHealthAvailable()`), not a tier check. Per CLAUDE.md, "wearable integration" is a Pro feature, so the absence of a tier guard on this screen is a finding worth flagging to the next session (FLAG: no Pro guard on a wearable/health screen, vs CLAUDE.md FREE/PRO list).
CURRENT STRENGTHS: Genuinely per-scope (weight / steps / workouts independently), matching how Apple Health / Health Connect grant permissions; honest about the platform reality that the app cannot revoke (sends user to system settings); the sdk-unavailable branch gives a real next step instead of a dead "permission needed" toast. Toasts confirm imports with counts.
CURRENT WEAKNESSES: The toggles are slightly misleading as on/off switches because turning them OFF cannot revoke — it just opens system settings; a user may toggle off, see the switch snap back, and be confused. Switch state is derived from permission status, so it can disagree with the user's tap until they return from system settings. Five conditional rows make the visible content jump as permissions change.
NEWBIE QUESTION: Mostly — "Read morning weight" etc. are clear, but the "toggle off just opens settings" model is non-obvious.
ATHLETE QUESTION: Yes — a competitor wanting scale/wearable weight and step data into the coach is well served; per-scope control is a power-user nicety.
LOCATION QUESTION: Correct — health/wearable connections under Settings → Health (gating concern noted above).
VISUAL + USABILITY:
  - Rows via shared primitives (label 16, sub 11). Subs are long and state-dependent.
  - `dataPrivacyNote` footer 11px muted (`SettingsPrimitives.js:106-112`).
  - Switch `trackColor` true = `withAlpha(colors.primary, 0.502)`, thumb `colors.primary` when on (`SettingsHealthScreen.js:190-191`).
  - Touch targets: `SettingRow` ≈ 66px (≥ 44px); native Switch handles its own.
  - Information density: moderate, but variable (rows appear/disappear with permission state).
  - Clean/cluttered: clean when nothing granted; busier once Sync-now + Open-Health-settings appear.
  - Most important action: weight read is first (the main coaching input); reasonable.
  - Device behaviour: ScrollView; long subs wrap on small screens. Icon chips fixed 34px.

---

SCREEN: Notifications (SettingsNotificationsScreen)
WHAT IT IS: A short hub pointing at the reminder screens — training reminders for all tiers, coaching reminders for Pro (`SettingsNotificationsScreen.js:6-7`).
WHAT IS ON IT:
- "Training reminders" → NotificationSettings, sub "Set when Volyume nudges you to train" (`SettingsNotificationsScreen.js:14-19`).
- "Coaching reminders" (Pro only) → CoachingReminders, sub "Morning weight log and weekly check-in" (`SettingsNotificationsScreen.js:20-27`).
NAVIGATION: Route `SettingsNotifications`, stack header `title: 'Notifications'` (`RootNavigator.js:377`). From SettingsScreen "Notifications" row (`SettingsScreen.js:39`). Leads to NotificationSettings and (Pro) CoachingReminders.
GATING: Free screen; the Coaching-reminders row is Pro-only via `tier === 'pro'` (`SettingsNotificationsScreen.js:9,20`). Destination CoachingReminders is also `withProGuard` (`GatedCoachingReminders`, RootNavigator.js:155,398).
CURRENT STRENGTHS: Tiny, unambiguous; cleanly separates the universal training reminder from the Pro coaching reminders.
CURRENT WEAKNESSES: Two rows for a whole "Notifications" section feels thin and adds an extra tap before reaching the actual training-reminder controls; the hub could arguably be collapsed.
NEWBIE QUESTION: Yes — one row, plainly labelled.
ATHLETE QUESTION: Yes for Pro — coaching reminders are surfaced.
LOCATION QUESTION: Correct, though the extra hub layer is debatable.
VISUAL + USABILITY:
  - Rows via shared primitives (label 16, sub 11).
  - Touch targets: `SettingRow` ≈ 66px (≥ 44px).
  - Information density: very low (1-2 rows).
  - Clean/cluttered: clean.
  - Most important action: training reminders first; correct for the broader audience.
  - Device behaviour: ScrollView; trivially fits all sizes.

---

SCREEN: Privacy & legal (SettingsPrivacyScreen)
WHAT IT IS: Health-data consent withdrawal, two data-sharing toggles (Open Food Facts label sharing, anonymous usage data), and the privacy policy link (`SettingsPrivacyScreen.js:15-16`).
WHAT IS ON IT (one `styles.section` card):
- "Health-data consent" row — sub reflects Granted/Withdrawn/Not recorded; value chip "On"/"Off"/"-"; tappable to withdraw only when granted (`handleWithdrawConsent`) (`SettingsPrivacyScreen.js:43-54`).
- "Share scanned labels with Open Food Facts" toggle — sends confirmed macros + label photo; `getConsent`/`setConsent` from food/writeback (`SettingsPrivacyScreen.js:55-68,9-12,34-38`).
- "Share usage data" toggle — first-party telemetry; value is `!privacy.analyticsOptOut`; `setAnalyticsOptOut(!v)` (`SettingsPrivacyScreen.js:69-82`).
- "Privacy Policy" → PrivacyPolicy screen (`SettingsPrivacyScreen.js:83-87`).
NAVIGATION: Route `SettingsPrivacy`, stack header `title: 'Privacy & legal'` (`RootNavigator.js:382`). From SettingsScreen "Privacy and legal" row (`SettingsScreen.js:65`). Leads to PrivacyPolicy.
GATING: Free screen — consent and privacy controls are universal (GDPR). Reads `{ healthConsent, privacy, setAnalyticsOptOut }` (`SettingsPrivacyScreen.js:18-24`) + `useAccountActions` for withdrawal; no tier guard.
CURRENT STRENGTHS: This is the core GDPR consent surface and it is solid: explicit health-data consent withdrawal (with status + value), granular opt-outs for both OFF label sharing and usage telemetry, plain-language subs describing exactly what each share does and does not include ("Never your training, food, or body data"). Withdrawal is gated to only fire when consent is currently granted.
CURRENT WEAKNESSES: Three different consent/sharing mechanisms with different UI shapes (a tappable status row vs two switches) sit in one card without sub-headers, so the distinction between "withdraw health consent" (a serious legal action) and "share scanned labels" (a community nicety) is visually flat. The usage-data toggle's inverted logic (`!analyticsOptOut`) is correct but is the kind of double-negative that is easy to get wrong in future edits.
NEWBIE QUESTION: Largely — the subs carry it. "Health-data consent" with no prior context may puzzle a brand-new user, but the status line ("Granted"/"Not recorded yet") helps.
ATHLETE QUESTION: Yes — nothing competitor-specific; the controls are complete.
LOCATION QUESTION: Correct — consent/sharing/policy under Settings → Privacy & legal.
VISUAL + USABILITY:
  - Rows via shared primitives; `value` chip ("On"/"Off"/"-") at `fontSize.sm (13)` `textSecondary` (`SettingsPrimitives.js:105`).
  - Touch targets: `SettingRow` ≈ 66px (≥ 44px); native switches handle their own.
  - Information density: low-moderate — four rows.
  - Clean/cluttered: clean; the lack of sub-headers is the one critique given the mixed action severities.
  - Most important action: health-data consent first (most legally significant); appropriate.
  - Device behaviour: ScrollView; long subs wrap on small screens. Icon chips fixed 34px.

---

SCREEN: Help & about (SettingsAboutScreen)
WHAT IT IS: Feedback, store rating, credits, and the build footer; long-pressing the version opens the debug log (`SettingsAboutScreen.js:7-8`).
WHAT IS ON IT:
- "Send feedback" → opens the FeedbackSheet ({trigger:'settings'}), sub "Quick sentiment + optional note" (`SettingsAboutScreen.js:15-20`).
- "Rate Volyume" → in-app review via `expo-store-review`, with platform-specific store fallback (App Store deep link on iOS, market://+web on Android) (`SettingsAboutScreen.js:21-50`).
- "Credits" → Credits screen, sub "OpenFoodFacts, CoFID, USDA attribution" (`SettingsAboutScreen.js:51-56`).
- About footer: "Volyume" wordmark; tappable version string `vX (buildNumber/versionCode)` — tap shares a build identifier, long-press (600ms) → DebugLog; tagline "Less thinking. More lifting." (`SettingsAboutScreen.js:59-91`).
NAVIGATION: Route `SettingsAbout`, stack header `title: 'Help & about'` (`RootNavigator.js:383`). From SettingsScreen "Help and about" row (`SettingsScreen.js:71`). Leads to Credits and (hidden long-press) DebugLog.
GATING: Free screen. No store/tier read; pure utility. The DebugLog long-press is an undocumented hidden gesture, not tier-gated.
CURRENT STRENGTHS: Correct platform-aware rating flow (never opens a Play URL on iOS); the version string is both shareable (for bug reports) and the hidden door to debug logs; rich `accessibilityLabel` on the version touchable describing tap + long-press (`SettingsAboutScreen.js:80`).
CURRENT WEAKNESSES: A `betaBadge`/`betaBadgeText` style pair is defined but never rendered — dead style (`SettingsAboutScreen.js:105-116`) (mention-only per CLAUDE.md). The debug-log entry being a hidden long-press means a confused tester cannot find it without being told.
NEWBIE QUESTION: Yes — feedback / rate / credits are conventional and clear.
ATHLETE QUESTION: Yes — nothing role-specific needed here.
LOCATION QUESTION: Correct — help/about/version under Settings → Help & about.
VISUAL + USABILITY:
  - Rows via shared primitives (label 16, sub 11).
  - `appName`: `fontSize.xl (20)` black, letterSpacing 2 (`SettingsAboutScreen.js:103`).
  - `appVersion`: `fontSize.sm (13)` muted (`SettingsAboutScreen.js:117`).
  - `tagline`: `type.caption` → `fontSize.xs (11)` (`SettingsAboutScreen.js:118`).
  - Touch targets: `SettingRow` ≈ 66px (≥ 44px). The version `TouchableOpacity` wraps a single 13px text line with no padding/hitSlop (`SettingsAboutScreen.js:63-89`) → ≈ 16-20px tall; FLAG: below 44px, though it is a secondary/hidden affordance.
  - Information density: low — three rows + centred footer.
  - Clean/cluttered: clean.
  - Most important action: feedback first; reasonable. The footer is intentionally quiet.
  - Device behaviour: ScrollView; fits all sizes.

---

SCREEN: Training reminders (NotificationSettingsScreen)
WHAT IT IS: The training-reminder controls (toggle + time picker), plus a cross-link to the Pro Coaching-reminders screen and notification-permission messaging. (Despite the filename, the morning-weight + weekly-check-in toggles were moved out to CoachingRemindersScreen; this screen now owns only training reminders) (`NotificationSettingsScreen.js:103-109,456-462`).
WHAT IS ON IT:
- Subtitle: "Volyume uses local notifications only. No marketing, ever." (`NotificationSettingsScreen.js:436-440`).
- Permission banner (only when `permissionStatus === 'denied'`): warning icon + "Notifications are currently disabled…" (`NotificationSettingsScreen.js:447-454`).
- Cross-link card (Pro only): "Coaching reminders" → CoachingReminders, sub "Morning weight + weekly check-in schedule. Always on for Pro." (`NotificationSettingsScreen.js:463-482`).
- "Training reminders" section label (`NotificationSettingsScreen.js:486`).
- Card: "Remind me to train" toggle (`handleTrainingToggle`; blocks enable if permission not granted with an alert); when on, an expandable "Reminder time" picker row (preset times via `appAlert`); helper text about plans not having fixed weekdays (`NotificationSettingsScreen.js:487-529,386-429`).
- Bottom note reiterating local-only / no marketing (`NotificationSettingsScreen.js:532-536`).
- "Saving..." / "Saved" status text (`NotificationSettingsScreen.js:538-540`).
NAVIGATION: Route `NotificationSettings`, stack header `title: 'Notifications'` (`RootNavigator.js:396`). Reached from SettingsNotificationsScreen "Training reminders" row (`SettingsNotificationsScreen.js:18`). Leads to CoachingReminders (Pro cross-link).
GATING: Free screen — training reminders are universal. Pro-only cross-link gated on `isPro = tier === 'pro'` (`NotificationSettingsScreen.js:108-109,463`).
CURRENT STRENGTHS: Honest local-only / no-marketing messaging stated twice; the permission-denied banner is helpful; training reminder + time picker are straightforward; comments document why morning/check-in toggles were removed (they were non-optional coaching inputs).
CURRENT WEAKNESSES: Significant dead/orphaned code: `scheduleApply` and `applyNotifications` are retained but unreachable ("only reachable via handlers removed in a half-finished refactor", `NotificationSettingsScreen.js:315-333`); the `saving`/`saved` status text is therefore effectively never triggered by training-reminder edits (those use `persistTrainingPreference`, not the debounced `scheduleApply`). The screen title is "Notifications" but content is only training reminders; the helper text promises choosing "the days you want the nudge" but no day-picker is present on this screen (only a time picker), which is misleading (`NotificationSettingsScreen.js:525-527`). This is the only screen in the set NOT built on the shared Settings primitives, so its rows/cards are hand-styled and drift slightly. (Findings mentioned, not fixed, per CLAUDE.md.)
NEWBIE QUESTION: Mostly — "Remind me to train" + time is clear; but the helper text referencing day selection that isn't there would confuse.
ATHLETE QUESTION: Adequate; a competitor's serious reminders (check-in, morning weight) live on the Pro Coaching-reminders screen, cross-linked here.
LOCATION QUESTION: Reasonable as the training-reminder screen, but the "Notifications" title vs training-only content is a mismatch given SettingsNotifications already split the two.
VISUAL + USABILITY:
  - `subtitle`: `fontSize.sm (13)` `textSecondary`, lineHeight 18 (`NotificationSettingsScreen.js:557-561`).
  - `bannerText`: `fontSize.sm (13)` `colors.warning`, lineHeight 19 (`NotificationSettingsScreen.js:586-591`).
  - `sectionLabel`: `type.label` → `fontSize.sm (13)` medium (`NotificationSettingsScreen.js:594-600`).
  - `toggleLabel` / `timePickerLabel`: `fontSize.md (16)` medium (`NotificationSettingsScreen.js:627-632,669-674`).
  - `timePickerValue`: `type.num('bodyStrong')` → `fontSize.md (16)` semibold tabular, `colors.primary` (`NotificationSettingsScreen.js:675-678`).
  - `helperText` / `bottomNoteText`: `fontSize.sm (13)` muted (`NotificationSettingsScreen.js:654-659,685-690`).
  - `crossLinkTitle`: `type.bodyStrong` → `fontSize.md (16)`; `crossLinkSub`: `fontSize.xs (11)` (`NotificationSettingsScreen.js:709-718`).
  - `savingText`: `type.caption` → 11; `savedText`: `fontSize.xs (11)` semibold primary (`NotificationSettingsScreen.js:692-697,719-725`).
  - Touch targets: `toggleRow` `paddingVertical: spacing.lg (16)` around a 34px icon ≈ 66px (≥ 44px) (`NotificationSettingsScreen.js:612-618`); `timePickerRow` `paddingVertical: spacing.md (12)` around 16px text ≈ 40px; FLAG: marginally below 44px (`NotificationSettingsScreen.js:662-668`); `crossLink` `padding: spacing.md (12)` around 34px icon ≈ 58px (≥ 44px) (`NotificationSettingsScreen.js:698-708`).
  - Information density: low-moderate.
  - Clean/cluttered: clean visually; the dead code and the title/content mismatch are structural rather than visual.
  - Most important action: the train-reminder toggle is the focal card; appropriate.
  - Device behaviour: ScrollView (`showsVerticalScrollIndicator={false}`); fits all sizes. Icon wraps fixed 34px.

---

SCREEN: Privacy Policy (PrivacyPolicyScreen)
WHAT IT IS: The full in-app privacy policy, a scrollable document with a BackHeader (`PrivacyPolicyScreen.js:8-13`).
WHAT IS ON IT:
- BackHeader "Privacy Policy" (`PrivacyPolicyScreen.js:11`).
- "Last updated 22 May 2026" (`LAST_UPDATED` constant, `PrivacyPolicyScreen.js:6,14`).
- Sections (each a header + body paragraphs): What Volyume collects; How your data is stored (local + Supabase, HTTPS, secure token storage); Nutrition and training information (not medical advice); Body metrics and sensitive data; Usage data (first-party telemetry, pseudonymous id, legitimate interest, opt-out path); Your rights (export/delete, GDPR/EEA/UK rights, contact email); Children (<13); Changes to this policy; Contact (`PrivacyPolicyScreen.js:16-99`).
NAVIGATION: Route `PrivacyPolicy` registered in THREE places: `ProfileStack` (headerShown:false, `RootNavigator.js:400`), `Article9ConsentStack` (so the consent gate can show it in-app, `RootNavigator.js:494`), and reachable from the consent flow. From SettingsPrivacyScreen "Privacy Policy" row (`SettingsPrivacyScreen.js:86`). No onward navigation (uses its own `BackHeader`).
GATING: Free screen (legal text must be universally reachable, including pre-account during Article 9 consent). No store read at all.
CURRENT STRENGTHS: Comprehensive and GDPR-aware — explicitly covers EEA/UK rights, export/delete paths (with exact in-app locations), legitimate-interest basis for telemetry, sensitive-data handling, children, and a contact email; section titles have `accessibilityRole="header"` (`PrivacyPolicyScreen.js:110`). Uses its own BackHeader so it works inside the pre-account consent stack too.
CURRENT WEAKNESSES: `LAST_UPDATED` is a hard-coded string ("22 May 2026", `PrivacyPolicyScreen.js:6`) that must be manually kept in sync with policy edits — easy to forget. The body text at `fontSize.sm (13)` for a long legal document is on the small side. Contact email is the founder's personal Gmail rather than a role address (mention-only).
NEWBIE QUESTION: Yes for readability; legal density is inherent but the language is plain and the in-app pointers (where to export/delete) are genuinely helpful.
ATHLETE QUESTION: Not role-specific; satisfies anyone.
LOCATION QUESTION: Correct — reachable from Privacy & legal and from the consent gate.
VISUAL + USABILITY:
  - `updated`: `type.caption` → `fontSize.xs (11)` muted (`PrivacyPolicyScreen.js:124`).
  - `sectionTitle`: `type.label` → `fontSize.sm (13)` medium, `colors.textPrimary` (`PrivacyPolicyScreen.js:126-130`).
  - `body`: `fontSize.sm (13)`, `colors.textSecondary`, lineHeight 22 (`PrivacyPolicyScreen.js:131-136`).
  - BackHeader title: `fontSize.lg (17)` semibold (BackHeader.js:59-66); back chevron 24px with `hitSlop {12,12,12,12}` → effective ≥ 44px (BackHeader.js:25,40-41).
  - Touch targets: only interactive element is the back chevron (hitSlop-padded, OK).
  - Information density: high (long document) — but it is reading material, scrollable.
  - Clean/cluttered: clean; consistent section rhythm.
  - Most important "action": there is none; it is a document. Export/delete pointers are text, not buttons.
  - Device behaviour: ScrollView (`showsVerticalScrollIndicator={false}`); paddingBottom `spacing.xl*2 (48)`. 13px body will be tight on a 5.4" but scales with OS font scaling (RN default allowFontScaling).

---

SCREEN: Debug logs (DebugLogScreen)
WHAT IT IS: On-device viewer for the last buffered error/warn/info events plus the most recent fatal crash; share/clear/sync-diagnostics tools (`DebugLogScreen.js:12-16`).
WHAT IS ON IT:
- BackHeader "Debug logs" with a refresh action on the right (`DebugLogScreen.js:86-93`).
- Filter toolbar: chips all / error / warn / info, each showing a count; selected chip highlighted (`DebugLogScreen.js:95-114`).
- Actions row: Share (export errors as text via Share), Sync diag (`diagnoseSyncConflicts`, logs per-table buckets, summary alert), Clear (destructive confirm, clears errors + crash log) (`DebugLogScreen.js:116-129,33-79`).
- Crash card (if a fatal crash recorded): title, timestamp, message, truncated stack (selectable) (`DebugLogScreen.js:132-141`).
- Empty state (checkmark + "No entries") when filtered list empty (`DebugLogScreen.js:143-149`).
- Entry list: each entry shows level (colour-coded left border + label), scope, relative time, message (selectable), optional context, optional stack (6 lines, monospace) (`DebugLogScreen.js:151-164,178-187`).
NAVIGATION: Route `DebugLog` in `ProfileStack`, headerShown:false (uses own BackHeader) (`RootNavigator.js:401`). Reached ONLY by long-pressing (600ms) the version string on SettingsAboutScreen (`SettingsAboutScreen.js:76`). No onward navigation.
GATING: Free screen, but functionally a hidden developer/tester surface (no menu entry; reached via undocumented long-press). No tier guard. Reads `session.user.id` for the sync diagnostic (`DebugLogScreen.js:55`).
CURRENT STRENGTHS: Genuinely useful tester tooling — level filtering with counts, shareable export, crash capture, and a sync-conflict diagnostic that writes its findings back into the log for inspection; entries and stacks are `selectable` for copy; refresh + clear are present. Colour-coded severity borders (error/warn/neutral) aid scanning.
CURRENT WEAKNESSES: It is reachable only via a hidden long-press, so a tester who isn't told cannot find it (the SettingsAbout accessibilityLabel does mention "press and hold for debug logs", which is the only hint). The Sync-diag summary text and per-table buckets are very technical — fine for a tester, opaque to a normal user who stumbles in. No tier/role guard means a curious end user can reach internal diagnostics.
NEWBIE QUESTION: No — and it is not meant for newbies; it is developer-facing. A first-timer who found it would not understand "scope", "ctx:", stacks, or "foreign uids".
ATHLETE QUESTION: Not applicable — not a user-facing feature.
LOCATION QUESTION: Correct as a hidden tester surface behind the version long-press; appropriate to keep it out of the normal menu.
VISUAL + USABILITY:
  - `chipLabel`: `fontSize.xs (11)` medium (`DebugLogScreen.js:194`).
  - `actionLabel`: `type.label` → `fontSize.sm (13)` (`DebugLogScreen.js:199`).
  - `crashTitle`: `fontSize.sm (13)` bold error; `crashWhen`: `type.num('caption')` → 11; `crashMsg`: `type.label` → 13; `crashStack`: `fontSize.xs (11)` monospace (`DebugLogScreen.js:203-206`).
  - `emptyText`: `fontSize.md (16)` medium; `emptyHint`: `fontSize.sm (13)` (`DebugLogScreen.js:208-209`).
  - `entryLevel`: `fontSize.xs (11)` bold uppercase, minWidth 44; `entryScope`: `fontSize.xs (11)` medium; `entryWhen`: `type.num('caption')` → 11; `entryMessage`: `fontSize.sm (13)`; `entryContext`/`entryStack`: `fontSize.xs (11)` monospace (`DebugLogScreen.js:212-217`).
  - Touch targets: refresh button has `hitSlop {8,8,8,8}` around a 22px icon ≈ 38px; FLAG: marginally below 44px (`DebugLogScreen.js:89`). Filter chips `paddingVertical: spacing.xs (4)` around 11px text ≈ 19px; FLAG: well below 44px height (`DebugLogScreen.js:192`). Action buttons `paddingVertical: spacing.sm (8)` around 13px ≈ 29px; FLAG: below 44px (`DebugLogScreen.js:197`). (All acceptable for a tester-only surface but flagged per the format rules.)
  - Information density: high — toolbar + actions + (crash) + scrolling list of dense entries.
  - Clean/cluttered: dense but organised; appropriate for a log viewer.
  - Most important action: the log list itself is the content; Share/Clear/Diag are secondary controls up top.
  - Device behaviour: ScrollView for the entry list; toolbar/actions are fixed above it. Small fonts (11px monospace stacks) will be cramped on a 5.4" but this is a diagnostic surface.

---

## Notes on areas marked NOT DETERMINED / flagged

- SettingsHealthScreen GATING: there is **no tier guard in code** on the screen
  or its entry row (capability-gated via `isHealthAvailable()` only). CLAUDE.md
  lists wearable integration as Pro, so the lack of a Pro guard here is flagged
  for the next session, not asserted as intended behaviour.
- The `betaBadge`/`betaBadgeText` styles in SettingsAboutScreen are defined but
  never rendered (dead style).
- NotificationSettingsScreen contains retained-but-unreachable code
  (`scheduleApply`, `applyNotifications`) per its own in-file note, and its
  helper text references a day-picker that is not present on the screen.
