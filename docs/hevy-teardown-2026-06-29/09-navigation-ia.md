# Hevy teardown — Navigation & information architecture

Hevy v3.1.0 (React Native / Hermes). Evidence is from the Hermes-packed
bundle, so route names appear as mangled token salads; every claim below is
corroborated by at least two independent strings (a route/component token plus
an analytics event key or a user-facing label). Sources:

- `corpus/screens_components.txt` — component/modal frequency inventory
- `corpus/bundle_strings.txt` — grep of user-facing strings
- `corpus/events_keys.txt` — analytics event keys
- Raw bundle: `xapk/_b/assets/index.android.bundle`

We are learning from Hevy's IA, never copying its code/assets.

## Navigation & IA — Hevy vs Volyume

Both apps use a 5-slot bottom tab bar. The decisive difference is **what the
tabs are for**: Hevy spends two of its five tabs on a social graph (Feed +
Profile/Search) and centres the bar on a single "Workout" launchpad. Volyume
spends all five tabs on the training/nutrition/coaching loop and has no social
surface at all. Hevy is a logger with a community wrapper; Volyume is a
coaching system with a community-shaped hole.

### Hevy's IA (reconstructed, evidence)

**Bottom tab bar (5 tabs).** Tokenised route names recovered from the bundle:

- `workoutTab` / `WorkoutTab` — appears 11× across `bundle_strings.txt`
  (`workoutTab` ×7, `WorkoutTab` ×4) and as `…workoutTabNavBarProButton…`
  and `…isWorkoutTab`. This is the centre/primary tab.
- `coachTab` / `CoachTab` — `bundle_strings.txt`; corroborated by 29× "Hevy
  Trainer", 41× "coach", and event token `…trainer_workout` /
  `trainer_pressedhevy`.
- `ProfileTab` — `screens_components.txt` + `bundle_strings.txt`; corroborated
  by `profile_following_press`, `profile_measurements_press`, `profile_media`,
  `exercise_profile_presscompare` event tokens.
- `DiscoverFeedTab` — `DiscoverFeedTabActionstreak`,
  `DiscoverFeedPagedStoregisterBottomTabPressedListener`,
  `WeightDecimalChangetDiscoverFeedPagedStoregisterBottomTab`,
  `OfDiscoverFeedTab`. Corroborated by `feed` (23), `feed_suggested`,
  `feed_hevy`, `report_feed`.
- A **search/users** surface — `SearchTabScreen…SearchUsersTabNavigator`,
  `StateChangesStartSearchContactsTab`, `ContactsScreen` (4),
  `UsersFromContactsViewModel`, `ContactsOnHevyScreen`. Search-users is part
  of the social/discovery half of the bar.

So the bar reads roughly: **Feed · (Exercises/Search) · Workout (centre) ·
Coach · Profile** — two social tabs, one launch tab, one paid-coach tab, one
profile. Exact slot order can't be proven from a packed bundle, but the tab
*set* is solid.

**The Workout tab is a launchpad, not a dashboard.** Its content is action-
first: `"Start Workout"`, `"Start Empty Workout"`, `"My Routines"`
(`bundle_strings.txt`), plus `FolderScreen` (8) / `RoutineFolderActionSheet`
for organising saved routines into folders, and `ProgramModal` (10) /
`ShowAllProgramsPress` for structured programmes. There is no daily coaching
brief — you arrive, you pick a routine (or empty), you log.

**Feed tab = the social graph.** A paged discover feed
(`DiscoverFeedPagedStore`) with `Following` (27) vs `Discover`/`For You`/
`Explore`/`Suggested` sub-tabs (a `MaterialTopTab` pattern —
`Ts1FactorycreateMaterialTopTab`, `MaterialTopTabBarIndicator`). Workouts are
social objects: `workout_comment`, `workout_comment_likes`, `report_feed`,
`MutualFollowersViewModel`, `OtherUserLikesPress`.

**Profile tab = the user's public page** (followers, measurements, media,
shareable stats), not a settings drawer. Settings (80× "settings") is a
section reached from Profile, plus heavy share infrastructure
(`ShareAssetStack`, `ShareExerciseModal`, `YearInReviewModal`,
`SpiderGraph`/`PolarChartWidget`).

**Coach tab = the paid "Hevy Trainer" surface** (`ToHevyTrainerScreen`,
`TrainerProgram…`, `TrainerExerciseModal`, `CoachQuestionsScreen`,
`TrainerRatingModal`) — a coach-marketplace/programme tab, gated by a Pro
button on the workout tab nav bar.

**Beyond the bar:** dedicated home-screen **Android widgets** (not in-app):
`WeeklyStatsWidgetConfigScreen`, `QuickAccessWidgetConfigScreen`,
`DayRoutineWidgetConfigScreen`, `ChartWidgetConfigScreen`,
`LastRoutinesWidgetConfigScreen` — Hevy pushes its stats/quick-start onto the
OS home screen. Volyume has none.

### Volyume's IA today (file:line)

Single navigator: `src/navigation/RootNavigator.js`.

- 5 bottom tabs (`MainTabs`, `RootNavigator.js:426-465`):
  - `HomeTab` titled **"Train"** → `HomeStack` (`:459`, `:299-323`)
  - `PlansTab` **"Plans"** → `PlansStack` (`:460`, `:325-346`)
  - `DiaryTab` **"Diary"** → `DiaryStack`, entire stack Pro-gated (`:461`,
    `:231-297`, gate `:160`)
  - `ProgressTab` **"Progress"** → `ProgressStack` (`:462`, `:348-376`)
  - `ProfileTab` **"You"** → `ProfileStack` (`:463`, `:378-424`)
  - Icons: home / list / restaurant / stats-chart / person (`:448-454`)
- **Home = "Train" is a coaching dashboard**, not a launchpad
  (`src/screens/HomeScreen.js`): greeting (`:50`, `:964`), continue-active-
  workout hero (`:1177`), next-session hero card (`:1194`), coach brief
  (`:1235`), weekly volume stats (`:593`), block-progress shape
  (`:1600`), morning-weight log (`:551`), trial/coach nudges. Many cards,
  one screen — the inverse of Hevy's spartan launchpad.
- **You tab** (`src/screens/YouScreen.js`) is a profile-card + settings/
  coaching nav list (`:86`, `:122-183`) — private, not a public page.
- **Progress tab** (`src/screens/AnalyticsScreen.js`) is the stats home:
  weight trend, recent sessions, volume heatmap, cardio, and a NavTile grid
  (Consistency / Lifts / Body Metrics / Partner / Full History, `:459-472`).
- 77 screens total, one navigator file (`APPMAP.md:9`).

### Gaps

1. **No social / community surface at all.** Hevy gives two of five tabs to a
   following-feed + public profiles + comments/likes + find-friends. Volyume
   has zero — `PartnerScreen` (a single 1:1 training partner) is the closest
   thing, buried as a NavTile inside Progress. For a retention-driven fitness
   app this is the single biggest IA delta. (Note: this is a strategy
   decision, not just a build task — Volyume is offline-first / no-PII / EU-
   residency, so any feed is a major architectural commitment. Flagged, not
   assumed.)

2. **Volyume's Home ("Train") tries to be both a launchpad and a dashboard,
   and is card-heavy.** Hevy's separation is cleaner: the Workout tab is a
   fast "pick routine → start" launchpad; reflection/stats live elsewhere
   (Profile, widgets). Volyume's Train screen stacks continue-hero + next-
   session + coach brief + weekly stats + block shape + weight log + nudges,
   which buries the one job a returning user has (start today's session).

3. **No on-device home-screen widgets.** Hevy invests in 5 configurable OS
   widgets (quick-start, weekly stats, day's routine, charts). Volyume has
   none, so re-entry always costs a full app open. Lower-priority but a real
   engagement gap, and well-suited to Volyume's offline-first model (widgets
   read local DB).

4. **Routine organisation is flatter.** Hevy has routine **folders**
   (`FolderScreen`, `RoutineFolderActionSheet`) and **programs**
   (`ProgramModal`, "Show all programs"). Volyume's Plans tab has Plans →
   PlanDetail → RoutineDetail and a MesocycleBuilder, but no user-facing
   foldering of saved routines — fine at low routine counts, friction as a
   library grows.

### Recommendations (adopt / adapt, S/M/L, P1/P2/P3, why)

| # | Recommendation | Size | Prio | Adopt/Adapt | Why |
|---|---|---|---|---|---|
| R1 | **Split Train into a clear "start" zone above the fold.** Promote continue-active + today's-session into a single decisive launch block at the very top; demote stats/weight/nudges below it (collapsible or a "today vs progress" toggle). | M | **P1** | Adapt | Hevy proves a returning user wants one tap to start; Volyume's value-add (coach brief, readiness) can stay but must not bury the primary action. Pure IA/layout, no engine change. |
| R2 | **Routine folders on the Plans tab.** Add user folders/grouping for saved routines + plans (mirror `FolderScreen`/program grouping conceptually, our own UI). | M | **P2** | Adapt | Direct, low-risk parity win that scales the library; no social/PII implications. |
| R3 | **Decide the social question explicitly (founder gate, do not build silently).** Options: (a) stay solo, lean harder into coaching as the moat; (b) lightweight *private* sharing only (share-card export already exists via `ShareCardScreen`); (c) a real opt-in feed. (c) collides with offline-first + no-PII + EU-residency. | L | **P1 (decision) / P3 (build)** | Adapt, never copy | This is the defining IA fork vs Hevy. Per CLAUDE.md, surface as a structured founder decision; do not pick silently. |
| R4 | **Android home-screen widgets (quick-start + weekly stats + today's routine).** Read local DB only, no network. | M | **P2** | Adopt (own impl) | Cheap re-engagement, fits offline-first perfectly; Hevy ships 5, we could ship 2-3. Expo config-plugin / native module — check the "no eject / native via config plugins only" rule and the add-dependency gate first. |
| R5 | **Keep the 5-tab count; do not add a 6th.** If a community surface is ever approved, fold it into an existing tab or replace one, not expand the bar. | S | **P3** | Adapt | Hevy stays at 5; bar bloat hurts clarity. Documenting the constraint now prevents drift. |

### Quick wins

- **QW1 (S, P1):** Reorder the Train screen so the start-session action is the
  first interactive element below the header; move coach-brief / weekly-stats /
  weight-log beneath it. Layout-only change in `HomeScreen.js` (`:1177-1600`).
- **QW2 (S, P2):** Add a "Start empty workout" affordance on Train mirroring
  Hevy's `Start Empty Workout` — Volyume has `BuildWorkout`/blank-session
  (`HomeScreen.js:851 startBlankSession`) but it isn't a first-class top-level
  CTA the way Hevy's is.
- **QW3 (S, P2):** Surface routine grouping cheaply — even a section header
  split (e.g. "This plan" vs "All routines") on Plans before full folders.
- **QW4 (S, P3):** Reuse existing `ShareCardScreen` to add a one-tap "share
  this session" on `WorkoutSummary`, capturing Hevy's share-loop value without
  building any social graph or sending PII.
