# U3 — Navigation, IA & findability usability teardown (Volyume vs Hevy)

Scope: the 5-tab bottom bar and the speed/findability of the top user tasks.
Goal stated by the brief: **every key feature must be faster to reach than in
Hevy.** This file measures that honestly.

Sources:
- Volyume: `src/navigation/RootNavigator.js` (single navigator, 77 screens,
  `APPMAP.md:9`), `src/screens/HomeScreen.js`, `YouScreen.js`,
  `AnalyticsScreen.js`, `DiaryScreen.js`, `PlansScreen.js`.
- Hevy v3.1.0: Hermes-packed bundle (`corpus/bundle_strings.txt`,
  `screens_components.txt`, `events_keys.txt`), `corpus/AndroidManifest.xml`
  (intent-filters + widget receivers), `corpus/routes_hosts.txt`. Hermes mangles
  route names; tap counts for Hevy are inferred from its IA (launchpad Workout
  tab + paged feed + profile) and corroborated by user-facing strings. Inferred,
  not asserted, where the bundle can't prove exact slot order.

Volyume tab set (`RootNavigator.js:459-463`): **Train · Plans · Diary · Progress
· You**. Hevy tab set (`09-navigation-ia.md`, evidence there): **Feed ·
Exercises/Search · Workout (centre) · Coach · Profile**.

---

### Taps-to-task table

Cold start, app already open on its default/last tab; "tap" = one deliberate
press (a tab press counts as 1). Volyume paths are file-cited; Hevy paths are
reconstructed from its IA.

| Task | Volyume | Hevy | Faster |
|---|---|---|---|
| **Start today's planned workout** | **1** — Train hero "Start" button is on the landing tab (`HomeScreen.js:1283` / first-run split `:1249`,`:1271`) | 2 — Workout tab → tap routine's *Start* (`"Start Workout"`/`"My Routines"`, `bundle_strings.txt`) | **Volyume** |
| **Start an empty / blank workout** | 1–2 — Train no-plan CTA `startBlankSession` (`HomeScreen.js:1420,1437`); if a plan is active the blank affordance is *not* a top-level CTA (QW2 gap) | 2 — Workout tab → `"Start Empty Workout"` (always a first-class button) | tie / Hevy when a plan is active |
| **Edit an existing routine** | **3** — Plans tab → tap routine → action sheet **"Edit"** → `RoutineDetail` (`PlansScreen.js:323`) | 2–3 — Workout tab → routine → edit (routine is the tab's primary object) | tie / Hevy |
| **View a progress chart (a lift / weight trend)** | 2 — Progress tab → `Lifts` NavTile (`AnalyticsScreen.js:460`); weight trend ~2 (Progress tab, trend is on-screen) | 2–3 — Profile tab → stats/measurements section, OR an OS **chart widget** = 1 from home screen | tie (Hevy wins via widget) |
| **Log food** | 2 — Diary tab → meal section `+` → `FoodSearch` (`DiaryScreen.js:341`) | n/a — Hevy has **no food diary** | **Volyume (feature Hevy lacks)** |
| **Weekly check-in** | **1** when ready (Train coaching nudge → `ProfileTab/WeeklyCheckIn`, `HomeScreen.js:1558`); **2** otherwise (You tab → "Weekly check-in", `YouScreen.js:122`) | n/a — no equivalent (Hevy Coach is a paid human-trainer marketplace, not a self-serve weekly engine) | **Volyume (feature Hevy lacks)** |
| **Open Settings** | 2 — You tab → "Settings" row (`YouScreen.js:181`) | 2 — Profile tab → Settings section (`80×` "settings", reached from Profile) | tie |
| **Re-open the app to "what's next"** | full app open (no widgets / no shortcuts) | **0–1** — OS home-screen widgets (quick-access, day-routine, weekly-stats) + Wear `workout-started` intent | **Hevy** |
| **Open a shared routine/program from a link** | not possible — no `linking` config exists | **1** — `hevy://`, `hevyapp.app.link`, `/routine` `/program` `/folder` deep links (`AndroidManifest.xml`) | **Hevy** |

Net: Volyume already **wins or ties the in-app primary tasks** (start workout,
log food, check-in) and owns two tasks Hevy can't do at all. Hevy wins **re-entry
and cross-app reach** — widgets, deep links, Wear — which are off-bar surfaces,
not tab IA.

---

### Findability problems in Volyume (file:line)

1. **Weekly check-in lives on the wrong tab.** It is a coaching action but it is
   registered under the **You/Profile** stack (`RootNavigator.js:401`) and listed
   on `YouScreen.js:122`. A user who isn't shown the Home "ready" nudge
   (`HomeScreen.js:1550-1558`) has to hunt for it under a *settings-shaped* tab
   ("You" = profile + settings, `YouScreen.js:181`). The coaching domain is split
   across Train (brief/nudge), You (check-in, Precision Coaching, Update plan,
   Nutrition targets, Goal lock — `YouScreen.js:115-148`) and Progress. No single
   "Coaching" home.

2. **Nutrition targets are buried under You, away from the Diary.** `NutritionTargets`
   is reached from `YouScreen.js:138` (You → Nutrition targets) and registered in
   the **Profile** stack (`RootNavigator.js:398`), not the Diary stack — yet it is
   the number the Diary's rings are measured against. A Pro user editing their
   targets must leave the food domain entirely (Diary → You → Nutrition targets).

3. **Cardio has three entry points and an ambiguous home.** `LogCardio` is
   registered in the **Home**, **Progress** and **Diary** stacks
   (`RootNavigator.js:317, 371, 267`) with guards at each because it is
   "registered in the Home and Progress stacks" (`:159-162`). Powerful, but the
   user has no single predictable place cardio "lives".

4. **Diary's "Plan day" (meal plan) is discoverable only inside the empty/section
   state.** `MealPlan` is launched from `DiaryScreen.js:729,793` — a secondary
   affordance — so the smart-meal-suggestion surface (a headline Pro feature) is
   easy to miss behind the day's logging UI.

5. **Progress is a NavTile maze.** Six destinations (Consistency, Lifts, Body
   Metrics, Partner, Full History, Recaps/Year-of-Lifts) sit behind a 2-tap grid
   under an **"Explore"** header (`AnalyticsScreen.js:457-516`). "Explore" is a
   weak, generic label; `Partner` (the closest thing to social) is a tile here,
   not a destination a new user would ever guess (`AnalyticsScreen.js:471`).

6. **No deep-link / app-shortcut surface at all.** There is no React-Navigation
   `linking` config in the codebase (only notification-tap routing,
   `RootNavigator.js:587-606`). Nothing in Volyume is reachable from a URL, a
   long-press app shortcut, or an OS widget — so every re-entry is a full cold
   open to the last tab.

7. **Tab-label clarity: "Plans" vs "Train" overlap.** Both tabs are about
   training; a new user can't tell from the labels that *today's session* is on
   **Train** and *routine/plan editing* is on **Plans**. Icons (home vs list,
   `RootNavigator.js:449-450`) don't disambiguate the split either.

---

### Where Hevy's IA is better

- **Off-bar re-entry.** Hevy ships **10 home-screen widget receivers**
  (`com.hevy.widgets.{quickaccess,dayroutine,weeklystats,calendarstats,chart,streak,rest,lastroutines,lastworkouts,calendar}`,
  `AndroidManifest.xml`). Volyume ships zero. This is the single biggest
  navigability gap: Hevy can get a user into "start today's routine" or "see my
  streak" in **0–1 taps from the OS home screen**; Volyume always needs a full
  app open.
- **Deep-link coverage.** Hevy registers `hevy://`, `hevyapp.app.link`/`hevy.go.link`
  (Branch), and path prefixes `/routine` `/program` `/folder` `/workout` `/user`
  `/coach/accept-invite` `/deeplink` (`AndroidManifest.xml`,
  `routes_hosts.txt`). Shared content opens straight to the object. Volyume has no
  linking layer.
- **Tab labels map 1:1 to objects.** Workout / Feed / Profile / Coach each name a
  single noun-object the user already understands. Volyume's Train+Plans overlap
  and "You"/"Progress"/"Explore" are vaguer.
- **Workout tab is a pure launchpad.** "Start Workout / Start Empty Workout / My
  Routines" with nothing else competing (`09-navigation-ia.md:52-57`). Empty-start
  is always first-class — Volyume's empty-start drops below the fold once a plan
  is active.
- **Routine organisation scales** — folders + programs (`/folder`, `/program`
  deep links; `FolderScreen`, `ProgramModal`). Volyume's Plans list is flat.

### Where Volyume's IA is better

- **One tap to start today's planned session** (Train hero, `HomeScreen.js:1283`)
  vs Hevy's 2 (tab → pick routine). Volyume's coaching dashboard pre-answers
  "what do I do today", so the primary action is on the landing tab.
- **A coaching brief at the point of action.** Mesocycle context chip + coach
  brief sit on the Train hero (`HomeScreen.js:1211-1236`) — Hevy's launchpad has
  no daily guidance; its coaching is a separate paid tab.
- **Two whole task-domains Hevy doesn't have on-bar:** food diary (Diary tab) and
  a self-serve weekly check-in/Precision-Coaching loop. For its target user these
  are reachable in 1–2 taps.
- **Cross-tab "ready" nudges** route the user to the next coaching action
  (`HomeScreen.js:1054,1558`) — a pull model Hevy lacks.
- **Back-stack hygiene is sound.** Every tab stack resets to its root on tab-press
  (`popToTop`, `RootNavigator.js:233,301,327,349,379`), so re-tapping a tab is
  always predictable; no dead screens or orphan routes were found (every
  registered screen has an in-app entry point; `LogCardio`/`CardioHistory`/food
  sub-screens are guarded at each entry, `:159-176`).

---

### Recommendations (S/M/L, P1–P3)

| # | Recommendation | Size | Prio | Why / evidence |
|---|---|---|---|---|
| **R1** | **Add Android home-screen widgets** (start-today's-session, weekly-stats, today's-readiness). Read local DB only, no network — fits offline-first. | M | **P1** | Closes the biggest navigability gap: Hevy ships 10 widget receivers, Volyume 0; re-entry is the one task where Hevy beats us on every metric. Expo config-plugin / native module — clear the "no eject / native via config plugin only" + add-dependency gates first. |
| **R2** | **Add an `androidShortcuts` / app-shortcut for "Start workout" + "Log food"** (long-press launcher). Cheaper than widgets, no native module if done via `expo-quick-actions` config. | S | **P1** | One-tap re-entry to the two primary tasks without a full cold open; partial parity with Hevy's quick-access widget. (Add-dependency gate applies.) |
| **R3** | **Make empty-start a first-class CTA on Train even when a plan is active** (mirror Hevy's always-present "Start Empty Workout"). Volyume has the action (`startBlankSession`, `HomeScreen.js:851`) but it drops below the fold with an active plan. | S | **P2** | Removes the one in-app task where Hevy is faster. Layout-only. |
| **R4** | **Pull the coaching actions into one predictable home.** Either retitle the You tab's coaching block as a clear "Coaching" section at top, or move Weekly check-in + Nutrition targets adjacency so the food-domain target isn't two tabs from the Diary (`YouScreen.js:122,138`; `RootNavigator.js:398,401`). | M | **P2** | Fixes findability problems #1, #2 — the coaching/nutrition domain is currently scattered across Train, You and Progress. |
| **R5** | **Add a `linking` config** mapping a `volyume://` scheme (and HTTPS app-links) to existing routes (routine, plan, workout-summary, check-in). | M | **P2** | No deep-link layer exists; this unblocks share-back, notification robustness, and future widget/shortcut targeting in one place. |
| **R6** | **Rename "Explore" and surface key Progress destinations.** "Explore" (`AnalyticsScreen.js:457`) is generic; promote Lifts/Body-metrics; give Partner a clearer entry than a buried tile (#5). | S | **P3** | Tightens the Progress maze; pure copy/layout. |
| **R7** | **Clarify the Train/Plans split in-label or via a "Routines" affordance on Train.** Consider a one-line "Edit routines →" link on Train so editing is 2 taps and the Plans tab's purpose is obvious (#7). | S | **P3** | Resolves the Train/Plans label overlap; keeps the 5-tab count (do NOT add a 6th). |
| **R8** | **Routine folders on Plans** (carries over from `09-navigation-ia.md` R2). | M | **P3** | Library-scaling parity with Hevy's `/folder`; no PII/social implications. |

Constraint to record (per `09-navigation-ia.md:147`): **keep the bar at 5 tabs.**
None of the above adds a tab; widgets/shortcuts/deep-links are all off-bar.
