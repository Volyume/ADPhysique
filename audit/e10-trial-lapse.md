# E10. Trial-lapse audit: day 15 for a non-converting, fully engaged user

Scenario: a user completed the 14-day Pro trial, logged food and trained daily for all
14 days, did not pay. Server pg_cron flips `pro_trial_active` to `cascade_expired`
within 15 minutes of `pro_trial_ends_at` (`supabase/migrate_031_cascade_workers.sql:1-70`,
14-day window per `supabase/migrate_065_trial_14_days.sql:83`). Offline, the client
enforces the same expiry itself on launch (`src/store/useAppStore.js:593-601`,
`checkTier`). Tier resolves via `_resolveTier('cascade_expired') = 'free'`
(`src/lib/proGate.js:39-53`). All findings below are from code as of this audit; nothing
was modified.

---

## 1. Every surface that changes at the pro to free flip

Enforcement is one HOC: `withProGuard` renders `ProLocked` when `tier !== 'pro'`
(`src/components/ProGate.js:229-235`), plus scattered inline `tier` checks.

### Route-guarded screens (full-screen lock, `src/navigation/RootNavigator.js:178-212`)
| Route | Guard label | Line |
|---|---|---|
| Diary tab root | 'Food diary' (+ static example-day teaser) | 196 |
| FoodSearch, AddCustomFood | 'Food diary' | 205-206 |
| ScanBarcode / ScanLabel | 'Barcode/Label scanning' | 207-208 |
| FoodInsights (the food CSV + PDF export) | 'Food insights' | 209 |
| MyRecipes, MyMeals, RecipeBuilder | 'Recipes'/'Saved meals' | 210-212 |
| MealPlan | 'Meal plan' | 204 |
| WeeklyCheckIn | 'Weekly check-in' | 178 |
| NutritionTargets, MealNames, PerDayTargets | | 179-181 |
| BodyMetrics, ProgressPhotos | | 182-183 |
| Partner | 'Training partner' | 187 |
| CoachOutput ('Your week'), ProGoalSetup, PlanUpdate, CoachingReminders | | 188-191 |
| LogCardio, CardioHistory | 'Cardio' | 197-198 |

The Diary tab stays visible in the tab bar (`RootNavigator.js:548`); tapping it lands on
the lock.

### Inline tier checks
- **Home** (`src/screens/HomeScreen.js`): one-time CascadeGate modal auto-opens on the
  first Home mount with `trialState === 'cascade_expired'` (lines 127-155); TodayStrip
  (weight quick-log, cardio, nutrition cell) removed entirely (1430); Pro coach banner
  gone (1111); Pro data loads skipped, free coach line loaded instead (328-333); free
  weekly one-liner card appears (1131, sessions + weight *direction* only, no figures,
  437-463); Pro teaser card after 3+ sessions (1723); free progression teaser (823);
  differential paywall badge, free tier + adherence-off only (659, 1134-1137); no-plan
  hero swaps from "Build my plan" to the FreeStarter quiz card (1608-1717).
- **Progress/Analytics** (`src/screens/AnalyticsScreen.js`): weight-trend card is
  Pro-only (86, 485); cardio week card Pro-only (534); Body Metrics and Partner tiles
  gain PRO badges but stay tappable into locks (594, 598).
- **Plans**: action cards switch set (`src/screens/PlansScreen.js:500`); "Update
  training" routes free users to ProUpgrade (645); PlanDetail manage actions become
  free-variant (`src/screens/PlanDetailScreen.js:348`).
- **In-session**: coach session adjustments and readiness tweaks disabled
  (`src/screens/ActiveWorkoutScreen.js:361,373`); ReadinessCards drop freshness and
  recovery-trend rows (`src/components/ReadinessCards.js:215,240`); WorkoutSummary
  drops its Pro/partner block (`src/screens/WorkoutSummaryScreen.js:810,95`).
- **You tab**: whole Coaching section (Weekly check-in, Precision Coaching, Update your
  plan, Nutrition targets, Goal lock) replaced by a single "Go Pro" row
  (`src/screens/YouScreen.js:104-150`).
- **Settings**: Nutrition targets / Meal names / Per-day targets rows hidden
  (`src/screens/SettingsScreen.js:88-111`); coaching-reminders row hidden
  (`src/screens/SettingsNotificationsScreen.js:20`); SettingsCoaching Pro block hidden
  (`src/screens/SettingsCoachingScreen.js:127`); Account shows "Go Pro" instead of the
  subscription row (`src/screens/SettingsAccountScreen.js:32,40`).
- **Notifications**: missed-check-in follow-ups and planned-meal confirm self-cancel on
  next lay for non-Pro (`src/lib/notifications/scheduler.js:742,850`); trial day-3 and
  cascade pushes no-op once `stageOf(profile) !== 'pro_trial'` (546, 1078). BUT see
  finding F4: morning/evening weigh-in and weekly check-in reminders are NOT tier-gated.
- **Widgets**: unaffected; both are free-tier training widgets
  (`src/lib/widgets/snapshot.js:10-11`).
- **Partner**: screen locked behind the guard; free cap is 1 partner
  (`src/lib/partners/signals.js:61-66`).

No code deletes any data at the flip. Local SQLite rows and the cloud rows persist;
this is a loss of sight, not of storage.

---

## 2. The data question: what can they still SEE, EXPORT, or act on?

### Food diary (14 days of `food_entries`) - SEE: NO. EXPORT: NO. VERDICT: CRITICAL
- The locked Diary shows `TodaysPlateTeaser`, which is by design "a PERMANENT, static
  preview built from a fixed sample target (NOT the user's data)" with `seed: 7` and a
  hard-coded 2,200 kcal sample (`src/components/food/TodaysPlateTeaser.js:7-9,25-38`;
  rendered by `ProLocked` only for the 'Food diary' label, `src/components/ProGate.js:138,180-184`).
  Their own 14 logged days are rendered nowhere.
- The only food export (CSV + PDF) lives on FoodInsights, which is route-guarded
  (`RootNavigator.js:209`).
- The free "Full JSON backup" does NOT cover food: `BACKUP_TABLES`
  (`src/lib/database.js:3991-4013`) omits `food_entries`, `custom_foods`, `saved_meals`,
  `recipes`, `recipe_ingredients`, `daily_water`, `food_favourites` and `meal_plans`,
  all of which exist in the same database (`src/lib/database.js:834-1409`). The free
  workout CSV export is workouts only.
- Net: a lapsed user has NO in-app way to view or export the food they logged during
  the trial. Beyond UX, this is a GDPR Article 20 (portability) exposure for Article 9
  health data captured during the trial: the app offers no self-service path to it.

### Weigh-ins (`morning_weights`) - SEE: NO (in numbers). EXPORT: YES (raw JSON only)
- Every viewing surface is Pro: TodayStrip (`HomeScreen.js:1430`), BodyMetrics
  (`RootNavigator.js:182`), the Analytics weight-trend card (`AnalyticsScreen.js:86,485`:
  "Pro-only weight-trend read... the card never appears for free users").
- The only free echo is the weekly one-liner's weight *direction*, deliberately without
  figures (`HomeScreen.js:437-441`).
- `morning_weights` IS in `BACKUP_TABLES` (`database.js:4010`), so the free
  Settings > Your data JSON backup contains the raw rows, but that file is a
  machine-readable restore artefact, not a readable history.

### Check-ins and coach output history - SEE: NO. EXPORT: raw JSON only
- `weekly_checkins` and `coach_outputs` are in the JSON backup (`database.js:4011-4012`)
  but every viewer is locked: WeeklyCheckIn and CoachOutput are guarded
  (`RootNavigator.js:178,188`); CoachHeldHistory is registered ungated
  (`RootNavigator.js:473`) but its only navigation entry is inside the guarded
  CoachOutput (`src/screens/CoachOutputScreen.js:2316`), so it is unreachable for a
  free user in practice. CoachReview ('Weekly Review') stays free and ungated
  (`RootNavigator.js:366,420`) but reads training volume, not check-ins.

### What they can still act on (free tier, intact)
Workout logging, plans, exercise history/PRs, Consistency/Lifts/Heatmap/History/Recaps,
share cards, workout CSV, JSON backup + restore, snapshots, Hevy/Strong import
(dossier C16/C22; guards absent in `RootNavigator.js` for those routes). Progress
photos are locked despite being device-local only (`RootNavigator.js:183`), so photos
they took during the trial are also out of sight.

**Verdict on data visibility: FAIL for the trial's headline domains.** The user's food
diary is invisible and unexportable; their weigh-ins, check-ins and coach history are
visible only as raw JSON inside a backup file. The gate copy promises otherwise (F3).

---

## 3. Cascade and win-back flow (code truth)

- **Timing.** One real gate. The trial is 14 days (`migrate_065_trial_14_days.sql:83`).
  `CascadeGateScreen` treats 'day14' as canonical; 'day21'/'day28' are legacy synonyms
  (`src/screens/CascadeGateScreen.js:39-42,62-64`). The "day-14/28" framing in older
  docs is the retired 3-tier model (`cascade.js:370-379` stubs `skipToPro`).
- **Pushes.** Two local one-shots derived from `proTrialEndsAt`: trial-end minus 2 days
  and trial-end day, both 10:00 local, quiet-hours shifted, top budget priority
  (`scheduler.js:463-512`; identifiers still named `_day19`/`_day21`, actually day 12
  and 14 - stale naming, noted at `scheduler.js:1066-1069`). Tap routes to
  CascadeGate (`src/lib/notifications/notificationRoute.js:31-34`).
- **In-app.** First Home mount after `cascade_expired` auto-opens CascadeGate once per
  user (`HomeScreen.js:127-155`).
- **Copy vs calm voice.** Day-12 push: "Your free Pro trial ends in two days / Hope
  you've been enjoying it. Have a look at your options whenever you're ready."
  (`scheduler.js:443-446`). Gate: "Your Pro trial is winding down", CTAs "Stay on Pro" /
  "Drop to Free", close = decide later (`CascadeGateScreen.js:66-74,110-112`). Tone is
  calm, no shame, no countdown pressure, no em dashes: compliant. BUT two lines
  over-promise: the gate subtitle "Free keeps your data and safety checks, but some
  features become read-only" (`CascadeGateScreen.js:53,67`) and the lapse push
  "Everything you've logged is safe and waiting" (`scheduler.js:447-450`). Nothing
  food-related becomes read-only; it becomes invisible (section 2). Safety checks
  genuinely stay tier-blind (`proGate.js:22-24`).
- **Decline path.** "Drop to Free" calls `cascade.skipToFree` (`CascadeGateScreen.js:171-185`
  → `cascade.js:359-368`, reason `user_skip`); X dismisses with no state change.
- **Win-back.** The PostLapseSheet + 30-day win-back push are PAID-churn only by
  design: `lapseDetect` explicitly excludes trial auto-downgrades
  (`src/lib/payments/lapseDetect.js:17-18`), and `reconcilePaidEntitlement` only runs
  for `paid_pro` (`cascade.js:281-282`). A day-15 trial lapser therefore gets exactly
  one lapse push (the 10:00 "back on the free plan" one-shot) and the one-time gate
  modal; after that, only passive Home teasers. The 30/75/60-day stated-return maths in
  `winbackState.js:41-47` never applies to them.

---

## 4. Re-subscribe path (tap counts from lapsed Home)

`canStillTrial` is false for `cascade_expired` (`cascade.js:463-466`), so every CTA is
a purchase, correctly not a second trial; `completeUpgrade` falls through to
`subscribePro()` (`src/screens/ProUpgradeScreen.js:167,213-214`).

| Path | In-app taps to the Play sheet |
|---|---|
| Day-15 first open: CascadeGate auto-modal → "Stay on Pro" | **1** (+ Play sheet) |
| Home Pro-teaser card (3+ sessions) → ProUpgrade → "Subscribe to Pro" | **2** |
| Diary tab → lock "Upgrade to Pro" → "Subscribe to Pro" | **3** |
| You tab → "Go Pro" → "Subscribe to Pro" | **3** (from Home: +1 for the tab) |

Post-purchase: optimistic in-memory unlock (`cascade.js:175-190` `payAt` →
`setOptimisticPaid`), awaited server verify (`confirmPurchase`, `cascade.js:216-247`),
reconcile via `refreshTierFromCloud`. Restore purchases is offered on every lock
(`ProGate.js:208-218`). Minor inconsistency: the gate defaults to monthly
(`CascadeGateScreen.js:98`) while ProUpgrade defaults to annual (`ProUpgradeScreen.js:88`).

---

## 5. Ranked findings

**F1 - CRITICAL. 14 days of logged food become invisible AND unexportable at the flip.**
Locked Diary shows a static sample day, never their data (`TodaysPlateTeaser.js:7-25`);
FoodInsights export is guarded (`RootNavigator.js:209`); every food table is missing
from `BACKUP_TABLES` (`database.js:3991-4013` vs tables at 834-1409). The user's own
Article 9 health records have no self-service view or portability path. Fix options:
(a) add the food tables to `BACKUP_TABLES` (additive, one array edit, restores
portability); (b) a read-only "your last logged days" view on the Diary lock, matching
the "read-only" promise already in the gate copy.

**F2 - CRITICAL. Weigh-in, check-in and coach-decision history lose every human-readable
surface.** BodyMetrics guarded (`RootNavigator.js:182`), Analytics trend Pro-only
(`AnalyticsScreen.js:86,485`), TodayStrip Pro-only (`HomeScreen.js:1430`), CoachOutput
guarded with CoachHeldHistory reachable only through it (`CoachOutputScreen.js:2316`).
Raw rows survive in the JSON backup (`database.js:4005-4012`) but that is not a view.
Fix: a read-only trend/history state for lapsed users (view yes, log no), or at minimum
a free CSV of `morning_weights` alongside the existing workout CSV.

**F3 - HIGH. The gate and lapse copy promise what the product does not do.** "Some
features become read-only" (`CascadeGateScreen.js:53,67`) and "Everything you've logged
is safe and waiting" (`scheduler.js:448-449`) describe a read-only downgrade; the
implementation is a hard lock with a static teaser. Either build the read-only state
(F1/F2) or reword; a paying-then-lapsing user who rereads that line next to a locked
diary has been misled. Voice itself is compliant.

**F4 - HIGH. Coaching notifications keep firing at locked doors, with no off switch in
the UI.** `restoreNotifications` re-lays the morning weigh-in (sound ON), the evening
backstop and the weekly check-in reminder from saved prefs with no tier check
(`scheduler.js:1039-1063`; contrast the tier guards at 742 and 850). The check-in
reminder's tap route is the guarded WeeklyCheckIn (`notificationRoute.js:22-23`), i.e.
a paywall; the weigh-in prompts have no tap route at all (`notificationRoute.js:70-71`)
and the user has no free surface to log the weight they are being asked for (F2). The
management screen is hidden for free users (`NotificationSettingsScreen.js:522`) and
CoachingReminders is guarded (`RootNavigator.js:191`), so the lapsed user cannot turn
these off short of OS settings. ED-adjacent concern: a daily, audible weigh-in prompt
aimed at someone who cannot act on it is exactly the pressure pattern the ED rules
exist to avoid (the ED-flag gate at `scheduler.js:108,219` still applies, but only for
flagged users). Fix: tier-gate the three legacy re-lays in `restoreNotifications` the
same way lines 742/850 already do.

**F5 - MEDIUM. Progress photos lock despite being device-local and free of any coaching
function.** (`RootNavigator.js:183`; photos never sync, C17.) Their own photos become
unviewable and there is no export. Same read-only-view remedy as F2, or unlock viewing.

**F6 - LOW. Stale naming and defaults.** Cascade push identifiers `_day19`/`_day21`
fire on days 12/14 (`scheduler.js:440-441,1066-1069`); gate defaults monthly while
ProUpgrade defaults annual (`CascadeGateScreen.js:98` vs `ProUpgradeScreen.js:88`);
CascadeGateScreen header comment still describes day-21/28 3-tier variants
(`CascadeGateScreen.js:4-6`). Cosmetic, but each is a future misread.

**Positive findings.** Safety guardrails are genuinely tier-blind (`proGate.js:22-24`);
no data is deleted at the flip; the decline path is one calm tap with no dark pattern;
the trial cannot be re-farmed (`ProUpgradeScreen.js:185-199` fails toward the honest
purchase); win-back frequency is conservatively capped for paid churn
(`winbackState.js:38-41`); training surfaces and widgets survive intact.
