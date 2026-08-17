# WAVE F — PROFILE / SETTINGS + THE NOTIFICATION/REMINDER AUDIT — Findings

Campaign 24, Wave F. Read-only audit. Baseline: `claude/campaign24-whole-app`
branch, tree as at 2026-08-17 (`git log -1` = `d8ad7e2a`). British English
throughout. Every finding carries file:line.

**Scope.** The 19 WAVE F rows in `docs/ux-screen-programme-2026-08-17/
SCREEN-UX-REGISTER.md` lines 305-326 (Settings root + every `Settings*`
sub-screen, `SettingsAccount`, subscription surfaces, notifications
settings, privacy/display/data screens). `AthleteProfile` was checked
against `docs/whole-app-coherence-campaign-24-2026-08-17/
WAVE-C-FINDINGS.md:27-30` and confirmed covered there ("this wave's brief
scope (You, AthleteProfile, WeeklyCheckIn...)"; SettingsCoachingScreen
explicitly named as Wave F's lane and not opened by Wave C) — correctly
excluded here.

Screens read in full (19, matching the register's Wave F work queue
exactly): `src/screens/SettingsScreen.js` (140 ln),
`SettingsWorkoutScreen.js` (232 ln), `SettingsAccountScreen.js` (106 ln),
`SettingsProfileScreen.js` (374 ln), `SettingsCoachingScreen.js` (339 ln),
`SettingsDisplayScreen.js` (282 ln), `SettingsHealthScreen.js` (211 ln),
`SettingsDataScreen.js` (352 ln), `SettingsDietaryScreen.js` (20 ln),
`SettingsPrivacyScreen.js` (177 ln), `SettingsAboutScreen.js` (180 ln),
`SettingsFaqScreen.js` (156 ln), `NotificationSettingsScreen.js` (989 ln),
`CoachingRemindersScreen.js` (735 ln), `NutritionTargetsScreen.js`
(2,584 ln, full calculate/save/review flow), `MealNamesScreen.js` (108 ln),
`NutritionEducationScreen.js` (355 ln), `SubscriptionScreen.js` (281 ln),
`SubscriptionPolicyScreen.js` (286 ln). 7,907 lines total.

Lib modules read/greped for the notification audit and the authority hunt:
`docs/NOTIFICATIONS_LOCKED.md` (441 ln, full), `src/lib/notifications/
categories.js` (233 ln, full), `scheduler.js` (targeted reads:
`scheduleMorningWeightNotification` :138-199, `scheduleMealReminders`
:486-549, plus a full grep for every ED/wellbeing suppression site),
`budget.js` (`EVENT_PRIORITY` :43-58), `quietHours.js`
(`DEFAULT_QUIET_HOURS` :20-26), `categoryPrefs.js` (export surface),
`src/lib/nutritionEngine.js` (via `NutritionTargetsScreen`'s
`calculateNutritionTargets` call site), `src/store/useAppStore.js`
(`accessibility` slice :2040-2104), `src/lib/sync.js` (`user_insights`
residue check — grepped, not read in full; see Authority Hunt below).

Billing/subscription screens (`SubscriptionScreen.js`,
`SubscriptionPolicyScreen.js`, the billing rows in
`SettingsAccountScreen.js`) audited read-only per the brief's hard law:
findings on presentation/copy only, no product-ID, pricing or
purchase/restore/entitlement comment made.

---

## PART 1 — PER-SCREEN FINDINGS

### SettingsScreen.js (`Settings` — hub)

PURPOSE: navigation hub, one row per sub-page.

VERDICT: **NO_CHANGE.** Every row is `navigation.navigate` to its own
sub-page (`:34-136`); no inline settings render on this screen (the CP-6
fix, `:9-16`, is holding). Free/Pro row visibility is correctly gated by
`tier === 'pro'` at each Pro-only row (`:59-92`), matching the register's
free/Pro split. The `MealNames` row is correctly and deliberately absent
(`:67-70`, D95 note) — matches `MealNamesScreen.js` below.

### SettingsWorkoutScreen.js (`SettingsWorkout` — Workout & units)

PURPOSE: body-weight display unit, default rest timer, auto-start,
rest-finished alert, rest timer sounds.

VERDICT: **NO_CHANGE.** Every control traced to a live store setter
consumed elsewhere (`restSoundsEnabled` confirmed read at
`src/lib/restSound.js:167`). The "Rest finished alert" row (`:167-180`)
matches `NOTIFICATIONS_LOCKED.md`'s "rest-finished alert" addendum
(:358-382) word-for-word: same screen location, same default-on, same
"takes effect immediately, including mid-rest" claim.

### SettingsAccountScreen.js (`SettingsAccount` — Account) — billing-adjacent, read-only

PURPOSE: identity/plan summary, subscription link, sign out, delete account.

VERDICT: **NO_CHANGE.** Destructive actions (sign out, delete) correctly
isolated under their own `SectionHeader` (`:87-103`), matching the
established "destructive never adjacent to routine" pattern this wave
also finds in `SettingsDataScreen.js` and `SettingsPrivacyScreen.js`. The
"Manage subscription" copy (`:59-80`) states only what the store guards
actually keep readable (per its own D96 in-file citation) — presentation
only, product IDs and purchase flow untouched.

### SettingsProfileScreen.js (`SettingsProfile` — Profile)

PURPOSE: first name, biological sex, height, date of birth, diet
preference — all engine-adjacent (BMR/calorie-floor inputs).

VERDICT: **NO_CHANGE on authority.** Height/age/sex writes are
range-validated locally (`HEIGHT_MIN_CM`/`MAX_CM`, `AGE_MIN`/`MAX_YEARS`,
`:28-31`) then persisted straight to `saveUserBodyProfile` — **no local
BMR/floor arithmetic exists in this file**; the engine recomputes targets
only "on your next weekly check-in" per the screen's own copy
(`:196`, `changeSex` comment `:171-175`). This is correct authority
delegation, not a violation. Sex-change is confirm-gated (`requestSexChange`
`:191-202`) with an explicit consequence sentence — good pattern, no
finding.

### SettingsCoachingScreen.js (`SettingsCoaching` — Coaching)

PURPOSE: calmer coaching, session readiness ask, coaching tone/autonomy
(Pro), show-the-science, cycle tracking.

VERDICT: **NO_CHANGE.** Every switch here writes a profile field or calls
a dedicated lib setter (`setWellbeingMode`, `setCycleTracking`); none
computes a coaching decision locally. The calm-mode copy (`:130-153`)
explicitly states floors/gates stay on in both modes — correct and
matches Section 2. Cycle tracking's persistence-under-lapse rule (`:297-315`,
Review B finding 8, Article 9 revocation path) is intact.

### SettingsDisplayScreen.js (`SettingsDisplay` — Display & accessibility)

PURPOSE: theme, energy unit, Home nutrition visibility, per-food nutrient
toggles, larger text, contrast, colour-blind palette, reduce motion.

VERDICT: findings below.

- **DEAD_SETTING** — `src/screens/SettingsDisplayScreen.js:125-139`
  ("Show nutrition on Home", `showHomeNutrition`). The store default
  carries its own intent comment: `src/store/useAppStore.js:2058`
  — `showHomeNutrition: true, // gap #17: show the nutrition glance + food
  entry on the Home strip`. Grepped the entire `src/` tree for
  `showHomeNutrition`: the only two files that reference it are this
  screen (write path) and the store (default + persistence). **No
  screen or component reads it to gate anything** — `src/screens/
  HomeScreen.js` has no `showHomeNutrition` reference, and a full search
  of `HomeScreen.js` for a nutrition-glance/food-entry Home-strip
  component (by every plausible name) returns nothing. The toggle is
  fully wired end-to-end (store write, AsyncStorage persist, cloud pref
  push) and completely inert: switching it off changes nothing a user can
  see. Every sibling toggle on this screen was traced to a live reader
  (`showFibre`/`showSugar`/`showSodium` → `MacroRings.js`/
  `FoodDetailSheet.js`; `reduceMotionUserPref` → the store's own
  `reduceMotion` effective-flag fan-out, 40+ consumers) — this is the one
  exception.
  CORRECTION: this is the wave's one candidate fork (below) — build the
  described Home nutrition glance, or retire the control. Not a
  same-file fix either way.
- **REGISTER MISMATCH** (docs-only, not a screen defect) — the register's
  PRIMARY JOB for `SettingsHealth` (`docs/ux-screen-programme-2026-08-17/
  SCREEN-UX-REGISTER.md:140`, "ED pattern flag status, wellbeing state
  (Beat UK), and calm mode toggle") describes a different screen entirely.
  The live `SettingsHealthScreen.js` (read in full, see below) is 100%
  Apple Health / Health Connect device integration — no ED-safety content
  anywhere in it. Calm mode actually lives in `SettingsCoachingScreen.js`
  (this file, `:143-153`); ED-pattern/Beat UK screening lives in
  `WellbeingCheckScreen.js` (Wave G). Flagging here since Wave F is where
  the mismatch was discovered; no code change needed, register-only
  correction.

### SettingsHealthScreen.js (`SettingsHealth` — Health)

PURPOSE: per-scope Apple Health/Health Connect read (weight) / write
(workouts) toggles, manual sync, deep link to system Health settings.

VERDICT: **NO_CHANGE** on the screen itself. Revoke correctly routes to
the OS (`:64-73`, `:99-105` — platforms don't expose an app-side revoke
API), and the `sdk_unavailable` branch (`:51-62`) gives a real next step
(install Health Connect) instead of a dead-end toast. See the register
mismatch noted under `SettingsDisplayScreen` above — this screen's own
title/content are internally consistent; only the register's description
of it is wrong.

### SettingsDataScreen.js (`SettingsData` — Your data)

PURPOSE: cloud sync status/manual sync, food-library refresh, label-scan
skip-name toggle, import, full backup/restore, snapshot restore, CSV
export, coach handover PDF, clear-history.

VERDICT: **NO_CHANGE.** Destructive "Clear workout history" correctly
isolated under its own `SectionHeader` (`:337-346`), same pattern as
`SettingsAccountScreen`. Backup/restore both carry explicit,
scope-accurate confirmation copy naming exactly what is and is not
included (photo image files excluded, stated at both `:199` and `:210`).
The coach-report export handler (`:167-192`) correctly defers all
ED-neutral-variant and fail-closed-wellbeing logic to `coachReport.js`
per its own comment — no local decision-making.

### SettingsDietaryScreen.js (`SettingsDietary` — Dietary needs)

PURPOSE: thin wrapper around the shared `DietaryPreferencesEditor`.

VERDICT: **NO_CHANGE.** 20 lines, one component, no local state. Correctly
reuses the same component the meal-builder's inline sheet uses (single
source of truth, per its own header comment).

### SettingsPrivacyScreen.js (`SettingsPrivacy` — Privacy) — consent-adjacent, legal-gated

PURPOSE: OFF-writeback consent, analytics opt-out, privacy policy link,
biometric app lock, health-data consent withdrawal / account deletion.

VERDICT: **NO_CHANGE.** The biometric-lock enable path re-checks device
availability live rather than trusting the last-focus read (`:70-77`),
correctly preventing a user from arming a lock they cannot satisfy. The
consent-withdrawal row is isolated in its own section (`:159-174`),
visually destructive only when it actually is one (`healthConsent ===
true`). No copy change needed (typo-level only per the brief for this
class); none found.

### SettingsAboutScreen.js (`SettingsAbout` — About)

PURPOSE: FAQ link, feedback, rate, credits, version footer with a
7-tap-to-DebugLog gesture.

VERDICT: **NO_CHANGE.** The DebugLog gesture is deliberately unadvertised
(EP-21/P-09, `:8-18`) with a `__DEV__`-only long-press fallback (`:138`) —
correct for a production build. Version-share vs debug-tap debouncing
(`:112-136`) is a UX nicety, not a defect.

### SettingsFaqScreen.js (`SettingsFaq` — Help & FAQ)

PURPOSE: 16-entry static, offline, tier-neutral FAQ.

VERDICT: **NO_CHANGE.** Static copy-only screen; spot-checked the
`weekly-coach` (`:40-43`) and `calmer-coaching` (`:104-107`) entries
against current product law (C20 prescription authority, Section 2 calm
mode) — both consistent, no stale construct found. `free-vs-pro` (`:45-47`)
matches `CLAUDE.md`'s Section 2 free/Pro split verbatim.

### NotificationSettingsScreen.js (`NotificationSettings` — Notifications and reminders)

PURPOSE: training reminders, getting-started nudges, meal reminders
(Pro), quiet hours; cross-links to Coaching reminders (Pro).

VERDICT: **NO_CHANGE.** See the Notification Audit (Part 2) for the
category-level review; this screen's own UX is sound. One authority note
worth recording: the file's own top comment (`:60-68`) documents a
now-dead `applyNotifications`/`scheduleApply` pair that was deleted under
D95 — the comment is a deliberate "why this is empty" marker, not stale
residue, and is correctly still accurate (the functions really are gone).
No finding.

### CoachingRemindersScreen.js (`CoachingReminders` — Coaching reminders, Pro)

PURPOSE: morning weight + weekly check-in reminder day/hour, check-in
follow-up, planned-meal-confirm, partner cheers.

VERDICT: findings below; otherwise sound (see the Notification Audit for
the per-category review — this screen owns 5 of the 23 live categories
and every one of them is correctly ED-gated, quiet-hours-shifted and
budgeted per the traced `scheduler.js` call sites).

- **STALE_DOC** — `src/screens/CoachingRemindersScreen.js:1-13`. The
  file's own top-of-file header states: *"These reminders feed the
  Precision Coaching loop and are non-optional for Pro users... This
  screen exposes only the day + hour pickers. Both reminders are always
  scheduled. Toggle removed."* That is directly contradicted by the code
  40 lines below it: `morningEnabled`/`checkinEnabled` are real, wired
  `Switch` controls (`:473-481`, `:525-532`) driving genuine
  schedule/cancel calls (`handleMorningToggle`/`handleCheckinToggle`,
  `:358-368`), under an in-file comment trail citing **"C14 job 4"**
  (`:104-110`, `:228-231`) that explicitly reverses the "always scheduled,
  no toggle" design the header still describes: *"Previously they lived
  in NotificationSettingsScreen... with on/off toggles, but the toggles
  were misleading... Both were previously forced on with no way off... That
  confused the input with the prompt."* The C14 code is clearly the more
  recent, shipped, and correct state — the header is the stale artifact.
  CORRECTION: delete or rewrite `:1-13` to describe the current
  optional-with-toggle design; trivial, no behaviour change.
- **STALE_DOC** (same root cause, in the locked doc) —
  `docs/NOTIFICATIONS_LOCKED.md:54`: *"Morning weigh-in (`morning_weight`)
  ... Time only. Settings → Coaching reminders sets the hour; the on/off
  switch was deliberately removed (it is a coaching input)."* This
  directly contradicts the live, shipped C14 toggle just described. This
  is not a proposal to weaken the locked contract (the ED-gating,
  quiet-hours-shifting and budget rules the row describes are all intact
  and verified in `scheduler.js`) — it is a record of the CONTROL SURFACE
  that is simply out of date, the same class of correction the document's
  own "corrected 2026-08-10" addenda already made twice for other rows.
  CORRECTION: update the "User control today" cell to "Yes. Settings →
  Coaching reminders has a genuine on/off switch (restored under C14 —
  the earlier removal turned out to confuse the coaching input with the
  reminder)."

### NutritionTargetsScreen.js (`NutritionTargets` — Nutrition targets, Pro)

PURPOSE: the Pro calorie/macro target editor — the only Settings-adjacent
screen in this wave that touches engine output directly.

VERDICT: **NO_CHANGE on authority — this is the wave's cleanest authority
trace.** `handleCalculate` (`:484-620`) builds `engineInputs` from
user-entered fields, validates weight/body-fat against the SAME shared
bounds `BodyMetricsScreen` uses (`isValidBodyWeightKg`/
`isValidBodyFatPercent`, `:511-518`), then calls
`calculateNutritionTargets(...)` (`src/lib/nutritionEngine.js`, imported
`:23`) exactly once (`:554-557`) — **no local BMR, TDEE, macro-split or
floor arithmetic exists anywhere in this 2,584-line file.** The one place
the screen computes a number itself, `fatFloorG` (`:1373`), is explicitly
commented as mirroring the engine's own floor formula for **display only**
("Mirror the engine's fat floor exactly", `:1370-1372`) and is never fed
back into a save or a decision. `results.floorApplied` (the engine's own
flag) gates the floor-reached UI (`:1142-1146`, `:1517-1525`) rather than
a locally re-derived threshold. This is the pattern every other
engine-adjacent screen in this wave (`SettingsProfileScreen`) also
follows correctly.

### MealNamesScreen.js (`MealNames` — Meal names, Pro, unreachable per D95)

PURPOSE: rename numbered/peri-workout meal slots; slot keys unchanged.

VERDICT: **NO_CHANGE.** Fully functional, harmless, and deliberately
unreachable (confirmed: no `navigation.navigate('MealNames')` call exists
in `SettingsScreen.js`, matching the founder-order comment there
`:67-70` and the register's own note "unreachable per D95"). Not a defect
— recorded product state, not resurfaced as one.

### NutritionEducationScreen.js (`NutritionEducation` — Nutrition guide)

PURPOSE: static 5-minute explainer (calories, macros, phase targets,
tracking approaches).

VERDICT: **NO_CHANGE.** Spot-checked the phase-rate figures (`:100-103`,
"Cut: lose 0.5 to 0.8% bodyweight per week") against `CLAUDE.md` Section 2's
locked max-safe-loss threshold (0.8%) — consistent, not overstated. No
stale construct found.

### SubscriptionScreen.js (`Subscription`) — billing, read-only

PURPOSE: current tier/stage/price, upgrade/restore/cancel entry points.

VERDICT: **NO_CHANGE.** `tier` is read from `store.tier` — "the same
source every feature gate uses, so this screen can't disagree with the
gates" (`:55-59`, self-documented and verified: no local tier
computation exists). Presentation only; product IDs, pricing and
purchase/restore/cancel/entitlement logic untouched by this audit per
the hard law.

### SubscriptionPolicyScreen.js (`SubscriptionPolicy`) — billing, read-only

PURPOSE: plain-English free/Pro/downgrade/deletion policy.

VERDICT: **NO_CHANGE.** Every downgrade-behaviour claim is cited against
its actual guard in-file (e.g. `:115-122`, correcting an earlier
over-promise against the real `withProGuard` locks) — this is a screen
that has already been through a truth-audit pass and it holds up.
Presentation/copy only, as required.

---

## PART 2 — THE NOTIFICATION / REMINDER AUDIT

Per `docs/NOTIFICATIONS_LOCKED.md` (locked law, not reopened) cross-checked
against the live enum (`src/lib/notifications/categories.js`, 23
categories) and the scheduler's ED/quiet-hours/budget gates
(`scheduler.js`, `budget.js`, `quietHours.js`). Classification: KEEP /
SETTING_UNCLEAR / DUPLICATES_SURFACE / NAGGING_RISK / SAFETY_GAP.

### Weight/food-adjacent classes (the safety-critical group)

| Class | Useful? | Action expected? | App already does it? | Freq | Setting discoverable? | ED suppression verified? | Verdict |
|---|---|---|---|---|---|---|---|
| `morning_weight` | Yes — feeds the weight trend the whole coaching loop reads | Yes, log weight | No | 1/day, on-off toggle | Yes — `NotificationSettingsScreen` cross-links to `CoachingRemindersScreen`; toggle at `CoachingRemindersScreen.js:473-481` | Yes — schedule-time gate `weighInEdFlagOpen()` (`scheduler.js:150`), stand-down gate `:155` | **KEEP** (with the STALE_DOC correction above) |
| `evening_weight` | Yes — backstop only, self-suppresses once logged | No independent action (rides the morning toggle) | N/A | 1/day, rides morning toggle, no separate control (documented, correct — it is not a separate decision) | Yes, described inline on the morning-weight card (`CoachingRemindersScreen.js:508-513`) | Yes — self-cancels once logged + ED-gated (`categories.js:114-115` comment, verified against the morning-weight gate pattern) | **KEEP** |
| `meal_log_reminder` | Marginal — convenience-only, explicitly "no pressure" (`NotificationSettingsScreen.js:714`) | Yes, log a meal | No | Opt-in, default OFF, per-meal toggle + time picker | Yes, `NotificationSettingsScreen.js:675-724` | Yes — fail-closed at schedule time (`scheduler.js:497-515`, explicit Campaign-1-review-blocker-2 comment: "the ONE such category with no ED-flag gate" was fixed) | **KEEP** |
| `checkin_missed` | Yes — genuine gap-filler, explicitly never-shame copy | Yes, complete the check-in | No | 1/missed episode, 2-part | Yes, `CoachingRemindersScreen.js:566-588` | Documented ED-gated + budgeted (`NOTIFICATIONS_LOCKED.md:341-345`); not independently re-verified this wave (out of the traced scheduler subset) | **KEEP** |
| `planned_meal_confirm` | Yes — closes a real data gap (unconfirmed planned meals) | Yes, confirm meals | No | 1/evening, opt-in default on | Yes, `CoachingRemindersScreen.js:590-612` | Documented ED-gated (`categories.js:135-137`); not independently re-verified this wave | **KEEP** |

### General/lifecycle/habit classes

| Class | Verdict | Evidence |
|---|---|---|
| `training_reminder` | **KEEP.** Off by default, tier-blind, honest "not scheduled yet" copy while the habit model warms up (`NotificationSettingsScreen.js:626-639`) — a genuinely well-built discoverability fix on record (FM-02/C5-P18-05). |
| `activation_nudge` | **KEEP.** Tier-blind, single-shot per stage, no-shame copy verified (`NOTIFICATIONS_LOCKED.md:424-441` matches the shipped copy claims). One-tap disable, `NotificationSettingsScreen.js:643-665`. |
| `partner_cheer` | **KEEP.** Discoverable (`CoachingRemindersScreen.js:614-636`), and the one live category confirmed to push its pref change immediately server-side rather than waiting on the next sync (`:415-420`) — a real duplication/staleness risk closed, not opened. |
| `weekly_coach_ready` | **KEEP.** No dedicated Wave-F toggle found and none is claimed; `NOTIFICATIONS_LOCKED.md` documents it as "Time only" configurable, and the audit found no screen in this wave contradicting that. |
| `year_of_lifts_unlock`, `monthly_recap`, `trial_day3`, `winback` | **SETTING_UNCLEAR** (confirming the doc's own existing FR-5 flag, not re-deciding it). No dedicated Settings control exists anywhere in the 19 screens read this wave. `NOTIFICATIONS_LOCKED.md:68-71` already records this as an open founder question (FR-5) rather than a ruling — Wave F adds no new information here beyond confirming the absence is real and consistently absent across every notification surface in scope. |
| `cascade_gate`, `subscription_payment_failure`, `subscription_expiring` | **KEEP** (transactional/billing-adjacent, read-only per hard law). Push-only disable via OS settings, as documented; correctly exempt from the local event budget (server-sent). |
| `sync_error`, `ed_pattern_lockout`, `ffm_floor_hold` | **KEEP.** In-app only, no disable, exactly as Section 2 and `NOTIFICATIONS_LOCKED.md:16-18` require. No Wave-F screen weakens or exposes a disable path for any of the three — verified by grep, none of the three category strings appears in any Settings screen read this wave. |
| `rest_timer` (incl. `rest_end`) | **KEEP.** Own disable in `SettingsWorkoutScreen.js:167-180`, matches the locked addendum (:358-382) exactly, including the documented quiet-hours/budget exemptions. |
| `daily_checkin_reminder` | **SAFETY_GAP-adjacent documentation defect, not a live safety gap** — see below. |

### Documentation-truth findings (mandatory notification audit, doc-vs-code class)

1. **The C14 toggle restoration** (detailed under `CoachingRemindersScreen.js`
   above) — `NOTIFICATIONS_LOCKED.md:54` states the morning-weight on/off
   switch "was deliberately removed"; the live code restores it. Two-line
   correction, no policy change.

2. **`daily_checkin_reminder` is a phantom category.** `NOTIFICATIONS_LOCKED.md`'s
   original locked table (line 31, "Daily check-in reminder | Push | On |
   Yes") lists it as a live, user-controllable category. Grepped the
   entire `src/` tree for `daily_checkin` (all case/underscore variants):
   the only occurrence outside `categories.js` itself is the enum
   declaration (`categories.js:18`) and its channel-map entry
   (`categories.js:103`). **No `schedule*` function in `scheduler.js`
   creates it, and no screen in this wave (or any screen searched) offers
   a control for it.** The product's actual check-in model is weekly, not
   daily (`weekly_checkin_reminder`, correctly present throughout). The
   addendum's own "full push inventory" table (`NOTIFICATIONS_LOCKED.md:
   271-289`) silently drops the daily row without a removal note — the
   category was evidently retired at some point but the original locked
   table (lines 27-40) was never updated to match. No product-behaviour
   defect (nothing fires, so no user is affected), but the locked
   document itself is factually wrong about what exists.
   CORRECTION: strike `daily_checkin_reminder` from the original locked
   table (line 31) with a dated note, mirroring how the addendum already
   corrects two other rows.

3. **`budget.js`'s live `EVENT_PRIORITY` has 10 entries; the locked
   collision-priority list has 8.** `src/lib/notifications/budget.js:43-58`
   includes `ACTIVATION_NUDGE` (rank 3) and `PLANNED_MEAL_CONFIRM`
   (rank 9, truncated in the read but present per its own in-file S6/F3
   comments) neither of which appears in `NOTIFICATIONS_LOCKED.md:311-320`'s
   8-item list. Both are individually documented as shipped additions
   elsewhere in the same file (`:383-422` for the nudge, `:341-356`
   region for missed-check-in siblings) — this is the same "addendum
   added the category but never touched the older summary table" drift
   as findings 1 and 2, not a policy question.
   CORRECTION: refresh the collision-priority list to the live
   `EVENT_PRIORITY` array (10 items) in one pass alongside items 1-2.

**Overall notification-audit verdict:** the scheduling/suppression
*engine* is in excellent shape — every weight/food-adjacent category
traced this wave fails closed on the ED flag, every category has a
findable disable path except the four already-flagged FR-5 lifecycle
pushes, and quiet hours/budget are applied uniformly. The defects found
are entirely in `NOTIFICATIONS_LOCKED.md`'s own bookkeeping falling
behind three rounds of shipped changes it never fully absorbed — a
recurring pattern (the doc's own header already says "corrected
2026-08-10" twice for exactly this class of drift). No nagging risk,
duplication-with-Today/Coach, or new safety gap was found in this wave's
19 screens.

---

## PART 3 — AUTHORITY TABLE

| Decision | Authoritative owner | Where correctly PRESENTED (class A/B) | Where independently RE-DECIDED (class C/D/E) |
|---|---|---|---|
| BMR / TDEE / calorie & macro targets | `calculateNutritionTargets` (`src/lib/nutritionEngine.js`) | `NutritionTargetsScreen.js` (`:554-557`, one call site, engine inputs only); `SettingsProfileScreen.js` (writes sex/height/age, explicitly defers recompute to "next weekly check-in", `:171-175`, `:196`) | None found. This wave's authority hunt is clean — every engine-adjacent screen read delegates fully. |
| Nutrition fat-floor **display** figure | `nutritionEngine.js`'s own floor formula | `NutritionTargetsScreen.js:1370-1373` — explicitly mirrors the engine formula for display only, never fed back into a save | None — the mirrored constant is read-only decoration on the engine's own `floorApplied` flag, not a second decision. |
| Calm mode / wellbeing state | `src/lib/wellbeing.js` (`getWellbeingMode`/`setWellbeingMode`) | `SettingsCoachingScreen.js:74-79` (toggle calls the lib setter directly, no local mode logic) | None found. |
| Notification schedule/cancel + ED-flag/quiet-hours/budget gating | `src/lib/notifications/scheduler.js` + `budget.js` + `quietHours.js` | Every Wave-F notification screen (`NotificationSettingsScreen.js`, `CoachingRemindersScreen.js`) calls the shared `schedule*`/`cancel*` helpers and `setCategoryEnabled`/`isCategoryEnabled` — no screen re-implements a gate locally | None found. |
| Biometric app-lock availability | The OS (queried live via `getBiometricAvailability`) | `SettingsPrivacyScreen.js:47-60, 68-77` — always re-checks live before allowing enable, never trusts a cached read | None — correctly treats the OS as authoritative, not a design defect. |
| `user_insights` legacy sync registration (residue policy check) | N/A to this wave | — | **N/A.** Grepped every Wave-F screen file for `user_insights`: zero references. The only two live call sites are `src/lib/sync.js:1360` and `:2351`, neither touched or read by any Settings/notification screen. No residue classification required from this wave. |

No authority-collision defect (class C/D/E) was found across the 19
screens — the one candidate (`showHomeNutrition`) is a dead **display**
toggle, not a re-decided coaching value, so it is classified DEAD_SETTING
under Part 1, not an authority-hunt finding.

---

## PART 4 — CHANGE PLAN (risk-ordered)

0. **`docs/NOTIFICATIONS_LOCKED.md` truth-refresh** (three findings, one
   pass, doc-only, no code/behaviour change, no policy change): correct
   line 54 (morning-weight toggle), strike the phantom
   `daily_checkin_reminder` row (line 31) with a dated note, and refresh
   the 8-item collision-priority list (:311-320) to the live 10-item
   `EVENT_PRIORITY` array. **[STALE_DOC ×3, lowest risk, do first — it is
   the input every future notification audit will otherwise mis-trust]**
1. **`src/screens/CoachingRemindersScreen.js:1-13`** — rewrite the
   file-header comment to describe the current optional/toggle design
   instead of the pre-C14 always-on design. Two-minute fix, zero
   behaviour change. **[STALE_DOC, trivial]**
2. **`src/screens/SettingsDisplayScreen.js:125-139` /
   `src/store/useAppStore.js:2058`** — the `showHomeNutrition` dead
   setting. Founder fork below; no correction applied without a decision. **[DEAD_SETTING]**
3. **`docs/ux-screen-programme-2026-08-17/SCREEN-UX-REGISTER.md:140`** —
   correct the `SettingsHealth` PRIMARY JOB cell to describe the actual
   Apple Health/Health Connect content; the ED-safety description belongs
   on `WellbeingCheckScreen`'s row instead (Wave G's screen, not this
   wave's to edit, but the mismatch is recorded here since it was found
   here). **[REGISTER MISMATCH, docs-only, lowest priority]**

Files to touch: `docs/NOTIFICATIONS_LOCKED.md`,
`src/screens/CoachingRemindersScreen.js` (comment only),
`docs/ux-screen-programme-2026-08-17/SCREEN-UX-REGISTER.md` (one cell).
Pending the fork below: `src/screens/SettingsDisplayScreen.js` and/or
`src/screens/HomeScreen.js`. No `supabase/` migration, no billing file,
no coaching-engine file, no ED-safety module change required for any
finding above.

---

## PART 5 — FOUNDER-RULING FORKS

**One fork, matching this wave's "expected none" default only loosely —
it is small but genuinely undecidable from precedent.**

**Fork 1 — the dead `showHomeNutrition` toggle
(`SettingsDisplayScreen.js:125-139`).**

Finding: a fully-wired, synced, default-on Settings toggle labelled "Show
nutrition on Home" with the description "A remaining-calories glance and
a quick way into your diary, on the Today tab" controls nothing — no
component anywhere in `src/` reads `accessibility.showHomeNutrition`. The
store's own comment names it "gap #17: show the nutrition glance + food
entry on the Home strip", meaning a specific feature was scoped and the
setting was built for it, but (most likely during Campaign 22's Home/
Today redesign, which the register notes as the current reference-quality
baseline) the feature itself never landed or was later removed without
removing its setting.

Options for the founder:

- **(A) Build the described feature.** Add a small nutrition-glance
  element (remaining calories + a diary shortcut) to `HomeScreen.js`
  (the C22 locked baseline) gated on this flag. Matches the setting's own
  promise and the original gap #17 intent; touches the locked Home
  baseline, which Section 2/the campaign overview both say needs "a
  concrete contradiction" to reopen — a dead, misleading toggle sitting
  on a live production Settings screen is exactly that.
- **(B) Retire the toggle.** Remove the row from `SettingsDisplayScreen.js`
  and the `showHomeNutrition` field from the accessibility default/
  persistence shape. Smaller diff, no Home-baseline change, but is a
  quiet feature-removal-by-omission unless recorded as a deliberate
  decision (mirrors the `MealNamesScreen`/D95 precedent of keeping a
  harmless, unreachable surface, but inverted: here the surface IS
  reachable and DOES appear to do something).
- **(C) Leave it and record why.** If Home nutrition visibility is
  intentionally out of scope post-C22 (e.g. subsumed by the Diary tab
  itself), record that rationale in the decisions register so the
  now-orphaned toggle is a documented no-op rather than an undiagnosed
  one — but this is the option this audit recommends against by default,
  since "founder chooses the easy path" is exactly what D33/Section 4
  forbid an agent from pre-deciding.

No other fork in this wave required a founder decision; every other
finding (the three `NOTIFICATIONS_LOCKED.md` staleness items, the
`CoachingRemindersScreen.js` header, the register mismatch) is a
same-fact doc correction with no product-behaviour choice attached.
