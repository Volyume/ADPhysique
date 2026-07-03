# A2 — Volyume information architecture (complete map)

Research phase for the connection-corpus. READ-ONLY: no design, placement, pricing
or go/no-go call is made here. All claims below are [OBSERVED] directly in the
codebase at the paths and line numbers cited; nothing here is [DOCUMENTED] or
[INFERRED] since this task is a pure code map (no competitor claims). Line
numbers are accurate as of 2026-07-03 and will drift as the app changes — treat
them as pointers, re-grep before quoting in a future session.

Source root: `/home/user/ADPhysique`. Primary files walked in full:
`src/navigation/RootNavigator.js` (1,555 lines), `src/screens/HomeScreen.js`
(2,899 lines), `src/components/VolyumeTabBar.js` (153 lines),
`src/components/ActiveSessionMiniBar.js` (136 lines),
`src/screens/PartnerScreen.js` (631 lines), plus targeted reads of every tab
root screen, `src/hooks/usePartners.js`, `src/components/PartnerRow.js`,
`src/components/AttentionCard.js`, `src/components/TodayStrip.js`,
`src/components/WhatsNewSheet.js`, `src/navigation/navigateCrossTab.js`,
`src/screens/ShareCardScreen.js`, `src/screens/WorkoutSummaryScreen.js`,
`src/screens/AnalyticsScreen.js`, `src/screens/ConsistencyScreen.js`,
`src/screens/PlansScreen.js`, `src/screens/DiaryScreen.js`,
`src/screens/YouScreen.js`, `src/screens/SettingsScreen.js`,
`src/lib/notifications/partnerBeats.js`.

---

## 1. Top-level shape: what mounts before the tab bar exists

`RootNavigator.js:1352-1399` (`renderNavigator`) is the single routing
decision point, gated on store flags, in this priority order:

1. `!user` → **WelcomeStack** (`RootNavigator.js:554-565`): Welcome →
   QuizTraining → PlanPreview → Login. (Quiz-first pre-account screens,
   COMP-030, only reached if `ONBOARDING_QUIZ_FIRST` is on and the user picks
   Pro.)
2. Signed in, cloud-restore not yet resolved for a brand-new account →
   `SplashScreen` (blocking wait; `RootNavigator.js:1363-1378`).
3. Signed in + Article 9 health-data consent missing or unresolved for a new
   user → **Article9ConsentStack** (`RootNavigator.js:587-597`): a single
   un-skippable screen plus PrivacyPolicy (so the policy can be read in-app
   mid-consent without leaving to the system browser). This gate cannot be
   reordered or bypassed (`RootNavigator.js:1379-1394`; CLAUDE.md Article 9
   rule).
4. First-run not complete → **ProOnboardingStack** (Pro path,
   `RootNavigator.js:599-615`: ProOnboarding → PlanLibrary → PlanDetail →
   ActiveWorkout → ProSetupComplete → NutritionEducation → Methodology) or
   **FirstRunStack** (free path, `RootNavigator.js:567-581`: FirstRunBranch →
   FreeStarter → PlanLibrary → PlanDetail → ActiveWorkout).
5. Both resolved → **MainTabs** (`RootNavigator.js:498-552`), the 5-tab
   bottom-tab navigator this document maps in depth below.

A connection surface that wants to reach a user before MainTabs (e.g. an
onboarding nudge to add a partner) has to hook into step 4's stacks
specifically; nothing outside MainTabs currently references partners.

Deep-linking (`RootNavigator.js:617-672`) maps `volyume://` and
`https://volyume.app` paths onto exactly four MainTabs destinations today:
`workout/start` → HomeTab/BuildWorkout, `diary` → DiaryTab/Diary,
`routine/:planId` → PlansTab/PlanDetail, `progress` → ProgressTab/Analytics.
Partner invite links (`volyume://partner/<CODE>`) are handled separately, by
`PartnerScreen`'s own `route.params.code` read (`PartnerScreen.js:63-78`), not
through this `linking` config — confirmed by grep, `Partner` never appears in
the `linking.config.screens` object.

Screen count: RootNavigator's own audit comment records **82 screen files**
lazy-loaded (`RootNavigator.js:28-45`), each wrapped so evaluation is deferred
to first render.

---

## 2. MainTabs: the 5 tabs and what each owns

Defined at `RootNavigator.js:498-552`. Tab bar icons and titles:

| Route name | Tab bar title | Icon (focused/unfocused) | Stack function |
|---|---|---|---|
| `HomeTab` | Train | home / home-outline | `HomeStack` |
| `PlansTab` | Plans | list / list-outline | `PlansStack` |
| `DiaryTab` | Diary | restaurant / restaurant-outline | `DiaryStack` |
| `ProgressTab` | Progress | stats-chart / stats-chart-outline | `ProgressStack` |
| `ProfileTab` | You | person / person-outline | `ProfileStack` |

Tabs are lazy (`RootNavigator.js:506-511`): a non-initial tab's stack does not
mount until first focus. `HomeTab` is the initial tab. Each stack has a
`tabPress`-on-already-focused listener that pops to root (`NAV-5` pattern,
repeated verbatim in every `*Stack` function, e.g.
`RootNavigator.js:276-284`).

### 2.1 HomeTab ("Train") — `HomeStack`, `RootNavigator.js:352-380`

Owns: the single daily entry point to start/continue a session, the coaching
brief, and (Pro only) the Today strip (weight/cardio/meal quick-actions).

Screens registered: `Home` (root) → `BuildWorkout`, `ActiveWorkout`,
`WorkoutSummary`, `WorkoutHistory`, `VolumeHeatmap`, `ShareCard`,
`CoachReview`, `LogCardio` (modal), `ProUpgrade` (modal), `FreeStarter`.
`ActiveWorkout` and `WorkoutSummary` use the hero-zoom card transition
(`RootNavigator.js:231-265`).

HomeScreen (`src/screens/HomeScreen.js`, 2,899 lines) is the single busiest
screen in the app: it owns 5 competing dismissible banner systems (mapped in
full in §4), the primary workout hero/CTA, the pre-workout intent+readiness
modal, the "change workout" picker sheet, the meso-block-shape sheet, and (Pro)
mounts `TodayStrip` for weight/cardio/meal.

### 2.2 PlansTab ("Plans") — `PlansStack`, `RootNavigator.js:382-407`

Owns: plan library, plan/routine/exercise CRUD, mesocycle/block building,
folders.

Screens: `Plans` (root) → `PlanUpdate`, `PlanDetail`, `RoutineDetail`,
`ExerciseDetail`, `ManualBuilder`, `PlanLibrary`, `MesocycleBuilder`,
`ProUpgrade` (modal), `FreeStarter`.

`PlansScreen.js` root layout top-to-bottom: block-advisor card (deload/heads-up
signals, `PlansScreen.js:592-697`) → active-plan card or free/no-plan starter
card (`PlansScreen.js:699-784`) → Folders section (`PlansScreen.js:793-934`,
a free feature, no Pro gate) → My plans → Workout templates.

### 2.3 DiaryTab ("Diary") — `DiaryStack`, `RootNavigator.js:275-350`

Owns: the entire food domain. This is the largest Pro-gated stack by screen
count: `Diary` (root, gated read-only-aware via `GatedDiary`) →
`MealPlan`, `FoodSearch` (modal), `AddCustomFood` (modal), `ScanBarcode`
(modal), `ScanLabel` (modal), `LogCardio` (modal — registered here too so
saving returns to Diary, not Home), `CardioHistory`, `FoodInsights`,
`MyRecipes` (modal), `MyMeals` (modal), `RecipeBuilder` (modal), `ProUpgrade`
(modal).

`DiaryScreen.js` root layout: `ScreenHeader "Diary"` → day-pager row (prev/next
day, jump-to-today, copy-a-day, insights icon — writes hidden in read-only/free
state, `DiaryScreen.js:966-1011`) → free-tier read-only banner
(`DiaryScreen.js:1013-1032`) → `MacroRings` hero with training/rest-day-split
and refeed-exit rows → meal-slot list (`buildMealSlots`,
`src/lib/food/mealSlots.js`).

### 2.4 ProgressTab ("Progress") — `ProgressStack`, `RootNavigator.js:409-442`

Owns: all analytics/history/body-metrics/lift-progress content, and is the
**current home of the training-partner feature** (§5).

Screens: `Analytics` (root) → `WorkoutHistory`, `WorkoutSummary`,
`VolumeHeatmap`, `CoachReview`, `BodyMetrics`, `ProgressPhotos`,
`LiftProgress`, `Consistency`, **`Partner`**, `ExerciseDetail`, `YearOfLifts`,
`RecapStory`, `ShareCard`, `LogCardio` (modal), `CardioHistory`, `ProUpgrade`
(modal). 16 destination screens plus the root — the biggest tab stack after
Profile.

`AnalyticsScreen.js` root layout, top to bottom (`AnalyticsScreen.js:300-658`):
`ScreenHeader "Progress"` → **Training-load hero** + two half-width sparkline
cards (Sessions, New bests) once there is enough data
(`AnalyticsScreen.js:331-355`) → **This week** streak strip + milestone rows
(`AnalyticsScreen.js:361-415`) → empty/near-empty states → ephemeral monthly
recap nudge card → **"For you"** insight stack (`AnalyticsScreen.js:486-494`)
→ **Your trend** (Pro weight-trend card, COMP-004, `:499-506`) → **Recent
sessions** (`:510-526`) → **This week's volume** heatmap-drilldown summary →
**Lifetime totals** panel (`:564-594`) → **Explore** nav-tile grid
(`:596-658`) — this grid is where `Partner` sits, alongside Consistency,
Lifts, Body Metrics, Full History, Recaps, Year of Lifts. It is the *last*
section of a long scrolling dashboard.

### 2.5 ProfileTab ("You") — `ProfileStack`, `RootNavigator.js:444-496`

Owns: identity, all Settings sub-screens, Pro coaching management, billing,
legal. The single largest stack: **37 registered screens** (see full list
below), because every Settings/legal/billing/coaching-history destination in
the app lives here, reachable from every other tab only via
`navigateCrossTab`.

Screens: `You` (root) → `Settings`, `SettingsAccount`, `SettingsProfile`,
`SettingsCoaching`, `SettingsDisplay`, `SettingsHealth`, `SettingsData`,
`Snapshots`, `SettingsPrivacy`, `SettingsAbout`, `NutritionTargets`,
`MealNames`, `PerDayTargets`, `NutritionEducation`, `BodyMetrics`,
`ProgressPhotos`, `WeeklyCheckIn`, `CoachOutput`, `Methodology`, `ShareCard`,
`CoachHeldHistory`, `BlockReflection`, `ProGoalSetup`, `GoalChangeSummary`,
`GoalLockConsent`, `NotificationSettings`, `Import`, `CoachingReminders`,
`WellbeingCheck`, `PrivacyPolicy`, `DebugLog`, `SubscriptionPolicy`,
`Subscription`, `CascadeGate` (modal), `Paywall` (modal), `Credits`,
`ProUpgrade` (modal).

`YouScreen.js` root layout (267 lines, the smallest tab root — a pure
navigation hub, no data-heavy content): profile card (avatar initial, name,
session count) → **Go Pro** row (free only) + conditional **Coaching
history** row (E10 read-only lapse view) → **Coaching** section (Pro only:
Weekly check-in, Precision Coaching™, Update your plan, Nutrition targets,
Goal lock) → **How Precision Coaching works** row (free only) → **Preferences**
section (Wellbeing check [Pro], Settings) → About footer.

`SettingsScreen.js` (`SettingsScreen.js:86-197`) is itself a flat hub of rows
into 10 further screens (Account, Profile, Coaching, Nutrition targets/Meal
names/Per-day targets [Pro-conditional shortcuts co-located here, not nested
under SettingsCoaching], Notifications, Coaching reminders [Pro], Display and
accessibility, [Health, Android-conditional], Your data, Privacy and legal,
Help and about). No further nesting — every Settings destination is exactly
one tap from `Settings`, i.e. two taps from the `You` tab root.

### 2.6 Screens registered in more than one stack (by design, not duplication)

Cross-registered so "back" always returns to the tab you launched from
(comment pattern repeated at each site, e.g. `RootNavigator.js:372-374`,
`:435-438`):
- `WorkoutSummary`: HomeStack + ProgressStack
- `VolumeHeatmap`: HomeStack + ProgressStack
- `ShareCard`: HomeStack + ProgressStack + ProfileStack
- `LogCardio` (modal): HomeStack + DiaryStack + ProgressStack
- `CardioHistory`: DiaryStack + ProgressStack
- `ExerciseDetail`: PlansStack + ProgressStack
- `BodyMetrics`, `ProgressPhotos`: ProgressStack + ProfileStack
- `FreeStarter`: HomeStack + PlansStack (+ FirstRunStack pre-tabs)
- `ProUpgrade` (modal): every single stack, including `DiaryStack` where a
  code comment explicitly notes React Navigation *silently drops* a
  `navigate()` to an unregistered route, so every Pro-gated stack must
  register its own upgrade modal (`RootNavigator.js:343-347`).

---

## 3. The custom bottom band: tab bar + Active Session mini-bar

Both built together as the "E15" pairing (`VolyumeTabBar.js:1-24`,
`ActiveSessionMiniBar.js:1-23`), greenlit 2026-07-02.

### 3.1 `VolyumeTabBar` (`src/components/VolyumeTabBar.js`)

Replaces the stock bottom-tabs `tabBar` prop entirely
(`RootNavigator.js:523-530`). Mechanics:
- A sliding amber pill (56×26px) behind the focused tab's icon, animated with
  a UI-thread spring keyed to `state.index` (`VolyumeTabBar.js:65-71`).
- Each icon does a settle-scale micro-bounce on gaining focus
  (`VolyumeTabBar.js:45-56`), paired with the existing M1 selection haptic
  fired from `RootNavigator.js:517-522`'s `screenListeners.tabPress`.
- Reduce Motion: pill jumps instantly, no icon scale (`VolyumeTabBar.js:69`,
  `:48`).
- **No centre action button** — deliberately: "the log-food candidate is
  Pro-gated, and a paywalled centre button violates the free/pro exposure
  rule" (`VolyumeTabBar.js:22-23`). This is a hard design precedent any
  connection-surface entry point must respect: a 5-tab flat bar, no FAB, no
  6th slot.
- **Anchored, not floating**: blur/floating dock is explicitly banned by an
  "Android-first material rule" (`VolyumeTabBar.js:6-7`).
- Renders `<ActiveSessionMiniBar>` as its own first child, i.e. the mini-bar
  is *part of* the tab-bar component tree, always positioned directly above
  the tab row (`VolyumeTabBar.js:80-84`).
- The whole band (`VolyumeTabBar` returns `null`) disappears when the
  currently-focused nested route is `ActiveWorkout` — the logging screen owns
  the full height (`VolyumeTabBar.js:73-77`).

### 3.2 `ActiveSessionMiniBar` (`src/components/ActiveSessionMiniBar.js`)

A 44px-tall docked bar, pinned above the tab bar on every tab while a workout
is live (i.e. visible when the user leaves ActiveWorkout for any other tab
mid-session). Mechanics:
- Pure remote display of `useAppStore` session state — "it owns no session
  state, writes nothing" (`ActiveSessionMiniBar.js:6-11`).
- Self-subscribing `MiniBarStatus` child isolates the per-second rest-timer
  re-render so only that slot re-renders each tick, never the whole app shell
  (`ActiveSessionMiniBar.js:13-16`, `:42-69`).
- Shows: pulsing live-dot, current exercise name, rest countdown OR "Set X of
  Y" / "N sets done" (never "Set 3 of 2" past the recommended count), a
  chevron-up. Tapping anywhere returns to `ActiveWorkout`
  (`ActiveSessionMiniBar.js:100-113`), cross-tab via
  `navigation.navigate('HomeTab', { screen: 'ActiveWorkout', initial: false })`
  since ActiveWorkout is only registered in HomeStack.
- Calm/ED note in the file's own header comment: "exercise name + timer only,
  nothing celebratory, no weight/food-adjacent number, so no suppression
  applies" (`ActiveSessionMiniBar.js:19-22`) — i.e. this surface was
  deliberately built to never need ED-gating because it carries no
  weight/food content. Any connection surface riding alongside it (e.g. "your
  partner is also mid-session") would need the same audit.

This bottom band is the **only screen-real-estate that is present on every
tab simultaneously** — the one obvious anchor point for an always-visible,
non-intrusive connection affordance, alongside the tab bar itself. Nothing
else in the IA is global; everything else is scoped to one tab's stack.

---

## 4. HomeScreen banner precedence chain — full enumeration

HomeScreen is the one screen with a deliberate **one-banner-at-a-time
invariant**: the code comment states it outright — "keep the primary 'Start'
action prominent by showing at most one of the ... attention banners at once"
(`HomeScreen.js:1176-1180`). This is the most important structural precedent
for a connection surface: Volyume already has *five* systems competing for
one slot and has settled on strict, commented priority order rather than
stacking them. A connection nudge would need to either slot into this same
chain (competing with commercial/coaching banners) or find a different
never-before-used slot (e.g. bottom band, or its own card position).

### 4.1 The banner types (in descending priority; each `showX` gate literally
negates every banner above it in the JSX, `HomeScreen.js:1187-1225`)

1. **Coach banner** (`showCoachBanner`, `HomeScreen.js:1187-1189`,
   rendered `:1292-1327`) — Pro only, "this week's review" from
   `latestCoachOutput`, only shown once the coach actually had enough data
   (`hasEnoughData`), auto-expires after 7 days from `weekStart`. Dismissible,
   dismissal keyed per `weekStart`.
2. **Trial countdown banner** (`showTrialCountdownBanner`,
   `:1190-1194`, rendered via `<AttentionCard variant="trial">` at
   `:1332-1346`) — the day-3 trial value ledger (COMP-023), Pro-trial users
   only, suppressed by the coaching nudge. Carries a live "ledger" of
   check-in/weigh-in progress toward the first review.
3. **Deload/recovery banner** (`showDeloadBanner`, `:1195-1196`, rendered
   `:1349-1377`) — "Recovery week suggested", from the deterministic
   `shouldDeload` engine call, amber-primary not warning-red by design
   (Class C, COMP-027: "recovery is rest-positive... not a hazard").
4. **Nutrition phase-sync banner** (`showPhaseBanner`, `:1197-1198`,
   rendered `:1266-1289`) — flags a mismatch between the training phase and
   saved nutrition-target phase.
5. **Lift plateau banner** (`showPlateauBanner`, `:1199-1203`, rendered
   `:1383-1405`) — B3, training-data-only detection (no ED suppression
   needed, `:613-616`), taps through to the exercise's plateau protocol.
6. **Activation nudge banner** (`showActivationBanner`, `:1204-1213`,
   rendered `:1409-1437`) — S6, tier-blind, only the two "stall" stages (not
   the cold-start stage, which `welcomeCard` owns instead), fail-closed on any
   ED flag/wellbeing read error or open flag/calm mode
   (`:733-739`).
7. **Free-tier weekly one-liner** (`showFreeCoachLine`, `:1214-1219`,
   rendered via `<AttentionCard variant="free_line">` at `:1442-1470`) — free
   tier only, one read-only sentence built from training + weight direction
   only, dismissible per week.
8. **Differential paywall badge** (`showDifferentialBadge`, `:1220-1225`,
   same `AttentionCard` slot, `variant="differential"`) — free tier only,
   lowest priority of all, the NAV-4 "worth your attention" monetisation
   surface. ED-safety fails CLOSED here specifically (a food/weight-adjacent
   monetisation surface must not show over a *failed* ED-flag read, not just
   a confirmed-open one, `:672-682`).

`AttentionCard` (`src/components/AttentionCard.js:1-40`) further consolidates
banners 2/7/8 into one component class with its own internal priority
(`pickAttentionVariant`, header comment `:11-20`): trial > free_line >
differential. Banners 1/3/4/5/6 stay as distinct HomeScreen-owned JSX blocks
because "each has its own action" (`AttentionCard.js:7-9`).

### 4.2 Banners/cards NOT in the one-banner chain (separate slots, own rules)

- **Welcome card** (`totalSessions === 0 && !welcomeDismissed`,
  `HomeScreen.js:1522-1557`) — brand-new-user orientation, two numbered
  instruction steps, no weight/calorie content, self-retires after first
  logged session.
- **Coaching discovery nudge** (`showCoachingNudge`,
  `HomeScreen.js:1877-1908`) — one-time, Pro, only on the user's actual
  check-in day, "Your weekly check-in is ready".
- **Pro teaser card** (`tier === 'free' && totalSessions >= 3`,
  `:1795-1821`) — a persistent (non-dismissible) upsell row below the hero,
  distinct from the differential/free-line badges above.
- **WhatsNewSheet** (`<WhatsNewSheet />` at `HomeScreen.js:2106`) — a
  `BottomSheet` modal, not an inline banner; shown once per version bump,
  never on first install (`WhatsNewSheet.js:1-12, 42-50`).
- **Skeleton cards** during `initialLoading` (`:1477-1484`) — layout
  placeholders, not content.

### 4.3 Render order top-to-bottom on HomeScreen (full JSX walk,
`HomeScreen.js:1227-1912`)

`ScreenHeader "Train"` → schedule-context line → [phase banner] → [coach
banner] → [trial `AttentionCard`] → [deload banner] → [plateau banner] →
[activation banner] → [free-line/differential `AttentionCard`] → skeleton
(cold load) → **Today strip** (Pro only, weight/cardio/meal quick actions,
`TodayStrip.js`) → welcome card (new user) → **primary workout
hero/CTA** (Continue-session / plan hero / no-plan starter, the screen's one
owned visual) → Pro teaser (free, 3+ sessions) → last-session slim row
(Repeat action) → coaching discovery nudge → (end of scroll) → 3 modals
(block-shape sheet, change-workout sheet, pre-workout intent+readiness
prompt) → `WhatsNewSheet`.

Every dismissible banner above follows the same defensive pattern: the
dismissal-flag `AsyncStorage` read happens **before** the banner is revealed,
so a previously-dismissed banner cannot flash for one frame
(`HomeScreen.js:430-436` etc, called out explicitly as "the trial-banner
pattern" and reused verbatim seven times). Any new connection banner should
follow this same read-before-reveal idiom to avoid a dismissed-state flash.

---

## 5. Where the training-partner (connection) feature sits today

### 5.1 Entry points — as currently wired

1. **Progress tab → Explore grid → "Partner" NavTile**
   (`AnalyticsScreen.js:609-612`): `<NavTile icon="people" ... label="Partner"
   pro={tier !== 'pro'} onPress={() => navigation.navigate('Partner')} />`.
   This is the *only* always-available entry point, and it sits in the last
   section of a long scrolling Progress dashboard (after the training-load
   hero, week streak, insight stack, weight trend, recent sessions, volume
   summary, and lifetime totals — see §2.4). Tab-depth: 1 tap once on the
   Progress tab (see §6 for full tap-depth accounting including the tab
   switch + scroll cost).
2. **Post-workout "partner beat"** on `WorkoutSummaryScreen`
   (`WorkoutSummaryScreen.js:807-838`) — shown only when
   `!readOnly && !calmSuppressed && tier === 'pro'` and the user already has
   an active or resting partnership. Sits after the stats grid
   (exercises/working-sets/duration) and before the block-arc strip. Lets the
   user see the partner's week-tick count and send a cheer inline, without
   leaving the summary screen. This is the one place the feature reaches a
   user who did not go looking for it — but only for users who already have a
   partner.
3. **Deep link redemption**: `volyume://partner/<CODE>` and
   `https://volyume.app/partner/<CODE>` are handled inside `PartnerScreen`
   itself via `route.params.code` (`PartnerScreen.js:63-78`), auto-redeeming
   on open unless already paired. This is a separate mechanism from the
   `linking` config in `RootNavigator.js` (which does not list `Partner` at
   all) — confirmed by grep across `RootNavigator.js`.

### 5.2 A wired-but-dead surface — orphaned component (OBSERVED finding)

`src/components/PartnerRow.js` is a fully built "slim training-partner status
row" whose own header comment says it is "the slim training-partner status
row on ConsistencyScreen" (`PartnerRow.js:2-6`), and its own test file is
titled `describe('PartnerRow (Consistency slim row)', ...)`
(`src/components/__tests__/PartnerSurfaces.test.js:56`). **It is not
imported or rendered anywhere in `src/screens/ConsistencyScreen.js`, or in
any other screen** — confirmed by grepping the whole `src/` tree: the only
two files that reference `PartnerRow` are the component itself and its test.
`ConsistencyScreen.js` (164 lines) has no `Partner` reference at all. This
means the app currently has exactly ONE user-facing entry surface for a
never-paired user (the Progress-tab Explore grid tile), not two as the
in-repo documentation implies. Flagging this discrepancy for the synthesis
session: if a connection redesign assumes "Consistency already surfaces
partner status", that assumption is false today.

### 5.3 Partner data model and privacy properties (as built, `PartnerScreen.js`,
`usePartners.js`, `partnerBeats.js`)

- **Free/Pro cap**: free = 1 partner, Pro = up to 3
  (`PartnerScreen.js:14`, `canAddPartner` in `usePartners.js:52`). The whole
  feature is Pro-gated at the route level (`GatedPartner =
  withProGuard(...)`, `RootNavigator.js:192`).
- **Row states**: `empty`, `pending` (invite sent, awaiting acceptance),
  `active`, `resting` (a rest/quiet week; never counts against either side,
  never breaks the streak), `ended`. Derived by `partnerRowState()`
  (`src/lib/partners/signals.js`).
- **What each side sees** (`PartnerScreen.js:37-43`, the in-app "privacy
  receipt" copy shown before pairing): whether each trained this week as a
  simple count ("three of four", never the numbers behind it); a shared
  streak counted in weeks; a rest week shown plainly as "Resting" (never a
  fail, never breaks streak); one cheer per local day; if a shared training
  block is adopted, only the block's *name*.
- **What neither side ever sees** (`PartnerScreen.js:44-50`): weights/sets/
  reps or any session content; body weight, measurements or photos; food or
  diary data; check-ins or anything told to the coach; location.
- **Deletion on unpair**: either side can end the partnership at any time;
  "sharing will stop right away and everything you shared will be deleted"
  (`PartnerScreen.js:203-227`), and `usePartners.js:114-122` calls
  `deleteLocalPairSharedData(pairId)` on the local mirror immediately after a
  successful unpair RPC, rather than waiting for the next sync pull — an
  explicit anti-lingering-data design choice (referenced as "Partner BLOCKER
  #1" in the project's own task history).
- **Invite channels**: generic OS share sheet, or direct-to-app SMS/WhatsApp/
  email deep links with a share-sheet fallback if the target app is
  unavailable (`PartnerScreen.js:96-137`), or a typed invite code
  (`PartnerScreen.js:139-149`).
- **Shared training block** (Wave 5 C5): either side can "suggest" one of
  their own programmes by name; the other side can adopt or decline; only the
  block's name crosses the privacy boundary, never its contents
  (`PartnerScreen.js:156-193, 293-386`).
- **Push notifications** (`src/lib/notifications/partnerBeats.js`): exactly
  two partner-triggered push types — "X cheered you on" (fresh cheers only,
  48h freshness window, `:19-28`) and "N weeks running, together" for a kept
  shared streak (`:31-38`). Copy rule stated explicitly in the file header:
  "no shame framing exists anywhere in the partner system by design, and none
  is introduced here" (`:10-13`). Scheduling (quiet hours, push budget
  category `CATEGORY.PARTNER_CHEER`, ED-flag suppression) lives in
  `src/lib/notifications/scheduler.js`, outside this file.
- **Online-only exception**: per `usePartners.js:1-9`, every read is the
  local SQLite mirror (offline-first, as CLAUDE.md mandates everywhere else),
  but create/redeem/cheer/unpair/block/proposeBlock/adoptBlock/leaveBlock are
  the deliberate online-required exceptions — "pairing is 'the one
  online-required step'".

### 5.4 What this means for placement research (observation, not a
recommendation — reserved for synthesis)

The existing partner feature already embodies several of the governing-lens
constraints the later design phase must inherit: no numbers, no ranking, a
rest week that never reads as a fail, one cheer per day (anti-spam), full
data deletion on end, and calm copy. It is a working existence proof that a
comparison-free connection mechanic is buildable inside these constraints.
Its main structural weakness, purely as an IA fact: its only entry point sits
at the bottom of the least-visited-first tab-scroll position, and the
documentation implies a second entry point (Consistency) that does not
actually exist in the shipped code.

---

## 6. Tab-depth: taps from root for every key action

Depth counted as: 0 = tapping the destination tab itself lands you here (tab
root); 1 = one further tap from that tab's root; each further screen push
adds 1. Where `navigateCrossTab` is used, the action reaches a screen in a
*different* tab's stack in a single tap from wherever the user currently is
(no manual tab-switch required) — these are marked "cross-tab, 1 tap from
anywhere".

| Action | Path | Depth |
|---|---|---|
| Start next planned workout | Home root → "Start workout" | 0 (already the hero on Home root) |
| Start a blank/unplanned session | Home root → "Blank session" secondary button | 0 |
| Continue an in-progress session from any tab | tap the `ActiveSessionMiniBar` (present on every tab) | 0, cross-tab by construction |
| Repeat last session | Home root → last-session row → "Repeat" chip | 0 |
| Browse plan library | Plans root → "Browse plans"/"Browse the library" button (free) or PlansTab tile | 0-1 |
| Build a plan from scratch | Plans root → "Build one" / ManualBuilder | 1 |
| View / edit a specific routine | Plans root → plan card → RoutineDetail | 1-2 |
| Log a meal (Pro) from Home | Home root → TodayStrip meal chip → cross-tab to `DiaryTab/FoodSearch` | 1, cross-tab |
| Log a meal from Diary directly | Diary root → tap a meal-slot row → FoodSearch | 1 |
| Scan a barcode | Diary root → meal slot → ScanBarcode (modal) | 1-2 |
| View 7-day food insights / export | Diary root → insights icon in day-pager row | 1 |
| Weekly check-in (Pro) | You root → "Weekly check-in" row **or** Home trial-banner tap (cross-tab) | 1 |
| Precision Coaching™ output | You root → "Precision Coaching™" row **or** Home coach-banner tap (cross-tab) | 1 |
| Update training goal/phase | You root → "Update your plan" row | 1 |
| Nutrition targets | You root → "Nutrition targets" row **or** Settings → "Nutrition targets" | 1 (direct) or 2 (via Settings) |
| Body metrics | Progress root → Explore grid → "Body Metrics" tile | 1 |
| Progress photos | Progress root (via BodyMetrics) or Explore grid | 1-2 |
| **Training partner (add/manage)** | Progress root → Explore grid → "Partner" tile (last grid, after 6+ scrolled sections) | **1 tap, but deep scroll** |
| Send a partner cheer post-workout | WorkoutSummary (reached after any completed session) → inline cheer button | 0 (inline on the screen the user is already on) |
| Settings root | You root → "Settings" row | 1 |
| Any individual Settings sub-screen (Account, Notifications, Display, Privacy, Data, About, Coaching, Health) | You root → Settings → row | 2 |
| Share a workout/PR/milestone card | WorkoutSummary/Analytics/CoachOutput → "Share" action → ShareCardScreen | 1 (from whichever screen exposes the share entry) |
| Consistency / streak view | Progress root → Explore grid → "Consistency" tile | 1 |
| Year-end recap ("Year of Lifts") | Progress root → Explore grid → tile (only visible once unlocked at 1 year) | 1 |
| Monthly recap (unlocks at 10 sessions) | Progress root → Explore grid → "Recaps" tile, or the ephemeral recap-nudge card higher up | 0-1 |
| Sign out / delete account | You root → Settings → SettingsAccount | 2 |
| Upgrade to Pro | Any of ~9 different banner/row taps across every tab (ProUpgrade is registered in every stack) | 0-1 from wherever the trigger fires |

Observation for the synthesis session: **every existing "social-adjacent"
touchpoint in the app (Partner tile, partner cheer, share card) is at least
one tap away and none live in the always-visible bottom band** except the
`ActiveSessionMiniBar`, which is solo-session-only and carries no partner
data today.

---

## 7. `navigateCrossTab` — the one sanctioned cross-tab mechanism

`src/navigation/navigateCrossTab.js` (31 lines) is the single sanctioned way
to jump from a screen in one tab's stack into a screen in a different tab's
stack. A plain `navigation.navigate('Screen')` silently no-ops if the target
lives in a different stack (documented as the "F4 dead-tap bug class,
already bitten once in production" — `navigateCrossTab.js:1-8`). A source
guard test (`navigationTargets.guard.test.js`, referenced in the file header)
bans hand-rolled `getParent()?.navigate()` calls outside this file. Any
connection surface that needs to jump tabs (e.g. a Home banner opening
PartnerScreen, which lives in ProgressStack) must route through this helper
with `initial: false`, or the navigation will silently fail. This is
already exercised throughout HomeScreen for exactly this kind of jump (coach
banner → ProfileTab/CoachOutput, phase banner → ProfileTab/NutritionTargets,
plateau banner → ProgressTab/ExerciseDetail, weekly check-in nudge →
ProfileTab/WeeklyCheckIn).

---

## 8. Share-card derived-only field list (Article 9 precedent)

`ShareCardScreen.js` is the one existing "leaves the app" surface and is the
concrete precedent for what "derived-only sharing" already means in this
codebase. Its own on-screen copy (`ShareCardScreen.js:476-480`), shown under
the "What to include" toggle list, states the hard floor:

- Session cards: "Name, bodyweight, measurements and private notes are never
  included."
- Weekly recap cards: "Only this week's progress, lifts and sessions are
  shown. Your measurements and private notes are never included."

User-togglable fields (opt-in, default varies by card type,
`ShareCardScreen.js:451-475`): Date; for session cards — Plan name, Total
weight lifted, Exercise names; for PR cards — PR weight, Previous best; for
weekly recap cards — Weight progress, Best lift of the week (each suppressible
independently, and the whole progress section is force-stripped when an
ED-pattern flag is open or calm mode is active, `suppress` prop threaded in
from `CoachOutputScreen`, `ShareCardScreen.js:65-67`).

This is the field-list precedent any future connection surface's data
exposure (e.g. what a partner or a public share sees) should be measured
against: name/bodyweight/measurements/private notes are the categorical
never-list; everything else is opt-in and independently toggleable, with a
force-suppress path for ED-safety that already exists and is wired from the
coaching screen.

---

## 9. Notable IA anomalies to carry into synthesis

1. **Orphaned `PartnerRow` component** (§5.2) — built, tested, documented as
   living on Consistency, not actually wired anywhere. If the connection
   redesign wants a lightweight status row on a screen users visit more
   often than Progress's Explore grid, this component already exists and
   already matches the calm, non-comparative copy pattern — it would need
   wiring, not building.
2. **The Explore grid is the only home for Partner**, and it is the last
   section of the single longest-to-scroll tab root in the app
   (`AnalyticsScreen.js`, ~660 lines of JSX with 8 preceding sections). Any
   argument for a more prominent placement runs into the existing "no centre
   FAB, no 6th tab, Pro-locked features can't sit in the un-gated bottom
   band" constraints already established for the tab bar (§3.1).
3. **HomeScreen already runs a strict one-banner arbitration system** across
   5 distinct sources plus 2 more absorbed into a shared `AttentionCard`
   component. A connection nudge competing for this same slot would be the
   9th claimant on one piece of real estate that the codebase's own commit
   history shows was already being simplified down (AttentionCard's own
   header describes consolidating three prior separate state machines into
   one class, `AttentionCard.js:1-9`) — the precedent argues against adding
   a 6th independent banner state machine to Home, and for either reusing
   `AttentionCard`'s pattern or finding a different surface entirely.
4. **The post-workout summary screen already hosts one connection touchpoint
   inline** (the partner cheer beat, §5.1.2) and is reached after every
   single completed session — structurally, this is the highest-frequency
   moment already proven for connection content in this app, more frequent
   than any Home-tab visit pattern (a user only finishes one workout at a
   time but may open Home many times without training).
5. **Nothing in the bottom band (tab bar + mini-bar) currently carries any
   partner/social signal.** The mini-bar's own header comment argues its
   calm/ED safety by construction ("no weight/food-adjacent number, so no
   suppression applies", `ActiveSessionMiniBar.js:19-22`) — any future
   content added to this always-visible strip would need the same audit
   repeated, since it currently earns its ED-safety exemption specifically
   by carrying no such content.
