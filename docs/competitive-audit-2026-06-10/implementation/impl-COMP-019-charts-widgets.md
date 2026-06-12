# COMP-019 — Interactive charts (Skia) → widgets → re-enabled Live Activity

> Implementation blueprint, round 2 of the 2026-06-10 audit. Approved at
> I8/E7 (`../competitive-audit-04-final-action-list.md` row 19; spec seed in
> `../competitive-audit-03-master-proposals.md` COMP-019). Staged programme:
> the premium-feel lever (round 1 called static charts "the single largest
> distance from the leaders", `../competitive-audit-01-design-ux-research.md`
> §2.4) plus the app's first beyond-the-app surfaces. No code changes in this
> document — blueprint only.

**Staging decision (locked through this blueprint):**

| Stage | Ships | Native build needed? | OTA-patchable? |
|---|---|---|---|
| 1a | Window chips + recomputed takeaway line on the three hero charts (existing SVG renderer) | No | Yes |
| 1b | `VolyumeChart` on Skia: tap-and-hold tooltip, scrub with haptic ticks | No (Skia already shipped) | Yes |
| 2 | iOS + Android home-screen widgets: Next session, Weekly consistency | Yes (new extension targets) | **No** |
| 3 | Rest-timer Live Activity re-enabled with the corrected set indexing | Yes (same iOS target as Stage 2) | **No** |

Stage 1a is deliberately renderer-independent: the windowing + takeaway is
data work, not drawing work, so it ships fast and OTA. Stages 2 and 3 share
one iOS widget-extension target — build the native plumbing once.

---

## 1. Best-in-market bar

1. **MacroFactor — the single best reference.** Version 1.5.3 added
   per-chart time-range selection with "dynamic summary information for the
   selected time range, such as average expenditure over the last 6 months
   [or] the difference in trend weight between now and 1 month ago", plus "a
   complimentary readout showing the difference between the first and last
   point... complementing the average readout users get when scrubbing"
   ([release notes](https://macrofactor.com/version-1-5-3/), search-extract —
   direct fetch blocked). The dashboard revamp added pinch/pan where
   "averages or other analytics displayed above the chart update as the
   viewing interval is changed" and tap-and-hold tooltips
   ([dashboard revamp](https://macrofactor.com/dashboard-revamp/),
   search-extract). Round-1 analysis confirms this is "the most concrete,
   copyable interactive-chart pattern found"
   (`../competitive-audit-01-progress-analytics-research.md` §2.3).
2. **Whoop.** Three-tier progressive disclosure — glanceable score → tap a
   tile for week-over-week trend → swipe deeper for raw biometrics; each tier
   on its own screen, dark UI built by Bureau Oberhaeuser
   ([925studios breakdown](https://www.925studios.co/blog/whoop-design-breakdown)).
   The lesson: the chart is the *second* tier, reached by tapping a number
   the user already trusts — exactly COMP-004's card tap-through shape.
3. **Oura.** "Precise exploratory views… often interactive"; the late-2025
   redesign surfaces *one* key metric and lets charts be the drill-down, not
   the landing ([round-1 design research §2.4; Medium comparison](https://medium.com/design-bootcamp/whoop-vs-apple-watch-vs-oura-the-health-app-war-is-no-longer-about-the-hardware-18b5b3c84a3b)).
4. **Gentler Streak — widget bar.** Ships an expanding family of Home Screen
   widgets (Feb 2025 added health-metric widgets) as a core part of its
   ADA-winning identity ([9to5Mac](https://9to5mac.com/2025/02/14/gentler-streak-new-widgets/)).
   Round 1: widgets were "the number one ask" for The Outsiders; Bevel
   markets "beautifully crafted widgets" (design research §2.7).
5. **Apple's own rest/workout Live Activities pattern.**
   `Text(timerInterval:)` renders a system-driven countdown that updates
   every second with **zero** app wake-ups — the canonical zero-budget
   ActivityKit pattern (already used in
   `modules/live-activity/ios/widget/VolyumeRestTimerLiveActivity.swift`).

**Haptics bar:** selection-style ticks while scrubbing are the canonical iOS
premium tell — "apps with good haptics feel more polished, more expensive,
more professional" (design research §2.4, citing
[Medium](https://medium.com/@chandra.welim/haptic-feedback-the-secret-to-apps-that-feel-premium-7463fdc1ccca) and
[HackerNoon](https://hackernoon.com/the-ios-guide-to-haptic-feedback)).

## 2. What fails

- **Scrubbing-first charts.** Round-1 evidence: users care about *windowing
  and comparing*, not free-form scrubbing — "no significant user demand was
  found for free-form scrubbing on lifting charts specifically"; priority
  order is window toggles → comparison → tap-to-inspect → pinch/pan
  (progress-analytics research §"Interactive charts — do users care?").
  Anti-pattern: shipping pinch/pan/zoom before the takeaway line.
- **Jefit: breadth without legibility.** Broadest metric coverage, yet users
  say the graphs "make no sense" (progress-analytics research §1, #10).
  Anti-pattern: more series/toggles instead of one recomputed sentence.
- **Widget sprawl.** Widget galleries with ten near-identical sizes dilute
  the two a user would actually keep. Ship two, watch placement telemetry,
  then extend.
- **Volyume's own disabled notification path** (the cautionary tale in our
  codebase): the lock-screen "Set N of M" label counted warm-ups into N but
  not into M, reading "Set 3 of 2" mid-set; it "added more friction than it
  removed, per user feedback during beta-prep"
  (`src/components/RestTimer.js:46-52`). A glanceable surface that is ever
  wrong is worse than none. Stage 3 exists to fix this *defect class*, not
  just the bug: every number on a system surface must be derived by the same
  function the in-app UI uses.
- **Evidence hygiene note:** a search hit claiming a "JMIR 18-month study,
  3.2× retention from streak dashboards" traces to a content-farm page
  (alibaba.com product-insights) and is **rejected** — not cited anywhere in
  this blueprint.

## 3. User psychology

- **Moment of need.** Charts: the user has just seen a number (weight card,
  e1RM on ExerciseDetail, volume row) and asks "compared to what?" — the
  window chip + takeaway answers in one glance, on the surface they are
  already on. Widgets: the decision moment is *before* the app opens — "is
  today a training day, what is it?" on the home screen. Live Activity:
  phone locked between sets; the answer ("how long left, which set is next")
  must not cost an unlock.
- **Habit loop.** Widget (cue: seeing tonight's session at lunchtime) →
  open app → log → streak/volume tick visibly updates on the widget within
  seconds of finishing (reward). The Live Activity closes the in-gym loop:
  log set → lock phone → island counts down → haptic "go".
- **Effort budget.** Stage 1 removes mental arithmetic (the takeaway line
  computes "average + change" so the user never reads point values off an
  axis). Widgets remove an app-open. The Live Activity removes unlocks
  (roughly 15–25 per session for a phone-locked lifter).
- **Emotional safety.** Takeaway copy states direction without judgement —
  no red numbers (charter rule). Weight-trend takeaways follow COMP-004's
  ED-flag behaviour (hide rate-of-change when a flag is open). The
  consistency widget inherits COMP-018's suppression rules wholesale.
- **Word-of-mouth surface.** A scrubbed e1RM chart with a takeaway like
  "Up 7.5 kg in 3 months" is the screenshot. The Dynamic Island countdown is
  the *in-gym tell* — the thing a gym friend physically sees on the
  user's phone.
- **Trust mechanics.** The takeaway recomputes visibly when the window
  changes — the user watches the maths respond (perceived adaptivity,
  round-1's "elite" tell).

## 4. The Volyume implementation

### Stage 1 — charts (1a windows + takeaway, then 1b Skia + scrub)

**The three hero charts first** (verified hosts):

| Chart | Host (exists) | Data source (exists) | Notes |
|---|---|---|---|
| Weight trend (EWMA over raw) | `src/screens/BodyMetricsScreen.js` `WeightTrendChart` (~line 123) | `getMorningWeights` (`src/lib/database.js:3734`), EWMA via `src/lib/nutritionEngine.js` | Also the tap-through destination of COMP-004's "Your trend" card — COMP-004 ships the card, COMP-019 makes its destination worth tapping |
| e1RM per exercise | `src/screens/ExerciseDetailScreen.js` "Strength trend" (~line 451; Max weight / Est. max toggle already exists) | per-session e1RM history already computed | `src/screens/LiftProgressScreen.js` sparkline rows already tap through here |
| Weekly volume | `src/screens/VolumeHeatmapScreen.js` "4-week trend" section (~line 319) | `getWeeklyVolumeByMuscle(userId, weeksBack)` (`src/lib/database.js:1651`) — already parameterised by weeks | Bar chart, not line; per-muscle rows gain the same window + takeaway |

**Critical data change:** every current chart slices the **last N entries**
(`slice(-8)`/`slice(-12)`), not a date window. Stage 1a replaces count-based
slicing with date-window selection so chips mean what they say.

**Interaction spec (Stage 1a):**

- Window chips: `1M · 3M · 6M · Y` (volume chart: `4W · 8W · 3M · 6M`),
  rendered with the existing chip pattern (`VolumeHeatmapScreen` window
  selector ~line 204 is the in-house precedent). Default 3M; selection
  persists per chart in AsyncStorage. 44pt touch targets;
  `accessibilityState={{ selected }}` as the ExerciseDetail toggle already
  does.
- Takeaway line, directly above the chart, recomputed per window
  (MacroFactor 1.5.3 anatomy: average + first-to-last delta):
  - Weight: "3 months: average 82.4 kg, down 1.8 kg." (EWMA endpoints, not
    raw — fading raw behind trend is already the house style in
    `BodyFatTrendChart`.)
  - e1RM: "6 months: best 142 kg, up 7.5 kg."
  - Volume: "8 weeks: average 14 sets a week, up 3."
  - House voice: plain, terse, no jargon, full stops, numerals are the hero
    (`tabularNums` token, `src/styles/theme.js:282`).
- Sparse/empty handling: window with <2 points shows the chart's existing
  empty hint plus "Not enough data in this window yet." and auto-selects the
  widest window that has ≥2 points (never a dead default). Windows whose
  span exceeds account age render what exists (a 3-week-old account's "Y"
  chip shows 3 weeks — chip label unchanged, takeaway states the real span:
  "All 3 weeks: …").
- Offline: all reads are local SQLite — nothing changes (offline-first by
  construction).

**Stage 1b — `VolyumeChart` on Skia + scrub:**

- **Library decision — two options, recommendation stated:**
  - *Option A (recommended): hand-rolled on `@shopify/react-native-skia`
    2.2.12 (already shipped) + `react-native-gesture-handler` 2.28 +
    `reanimated` 4.1 (already shipped).* Reuses the unit-tested maths in
    `src/lib/chartGeometry.js` unchanged (plotPoints/smoothPath/paddedDomain
    are renderer-agnostic on purpose — see its header comment). Zero new
    dependencies (CLAUDE.md: dependencies need explicit approval). Surface
    area needed is small: one line/area path, one bar variant, a crosshair +
    tooltip, a press gesture.
  - *Option B: victory-native (XL) — Skia + reanimated + d3, actively
    maintained by Nearform
    ([GitHub](https://github.com/FormidableLabs/victory-native-xl)).* Faster
    to a polished tooltip, but: new dependency requiring founder approval;
    its press-interaction hook has open defects on exactly our stack
    (Reanimated 4 / RN 0.81.5 — [issue #227](https://github.com/FormidableLabs/victory-native-xl/issues/227),
    [#637](https://github.com/FormidableLabs/victory-native-xl/issues/637),
    Nov 2025 crash report); and it would orphan `chartGeometry.js` + the
    single-engine look. **Take Option A unless the founder prefers B.**
- One component: `src/components/VolyumeChart.js` (Skia), API mirroring
  `SvgLineChart` (`data`, `data2`, `area`, `sections`, `min/max`) plus
  `windows`, `takeaway`, `onWindowChange`, `interactive`. Hosts migrate one
  at a time (BodyMetrics → ExerciseDetail → VolumeHeatmap); `SvgLineChart`
  stays for remaining static callers (Home strip, MesocycleBuilder,
  FatigueTrendCard) until each migrates; `Sparkline` stays SVG permanently
  (no interaction, 14 callsites, cheap).
- Scrub: long-press (300 ms) shows crosshair + tooltip (date, value, and for
  weight the raw reading vs trend); dragging snaps to nearest point with
  `selection()` tick per point **via `src/lib/haptics.js`** — which already
  no-ops under the user's Reduce Motion preference (`haptics.js:19-22`).
  That is the off-switch the proposal requires; no new setting needed.
  Tooltip values mirror to `accessibilityLabel`; scrub announced politely
  (RestTimer's `accessibilityLiveRegion="polite"` is the precedent).
- Performance: never mount more than one interactive Skia canvas above the
  fold; BodyMetricsScreen's three charts render the non-visible ones
  deferred (victory-native's own production guidance:
  [reactnativerelay](https://reactnativerelay.com/article/react-native-charts-victory-native-interactive-data-visualizations-expo)).
- No pinch/pan in v1 (evidence says windowing > scrubbing > pinch; revisit
  after telemetry).

### Stage 2 — widgets (the two worth shipping, then maybe a third)

**Ship exactly two first:**

1. **Next session** (small + medium): session name, planned day, week-in-
   block chip ("Week 3 of 5" — COMP-010's labels), tap → opens app to Train.
   Empty state: "No plan scheduled. Build one in Plans." Free tier (training
   is free — gating rule respected).
2. **Weekly consistency** (small): COMP-018's weekly streak — "2 of 3
   sessions this week" + streak count. Inherits COMP-018's rules: weekly not
   daily, never red, pause-aware, and **fully suppressed (widget renders the
   neutral next-session content) while a wellbeing/ED flag is open**. Free
   tier. *Sequencing: this widget ships only after COMP-018 itself.*

**Deferred third:** weekly volume ring. Attractive, but ring = daily-Apple-
visual-language with weekly data (confusing), and it triples the snapshot
surface. Revisit with placement telemetry.

**Why these two:** next-session is the established "Up Next" pattern
([MakeUseOf fitness lock-screen widgets](https://www.makeuseof.com/fitness-lock-screen-widgets-best-iphone/));
streak/consistency widgets are Gentler Streak's and Hevy's headline
glanceables ([9to5Mac](https://9to5mac.com/2025/02/14/gentler-streak-new-widgets/),
[Hevy consistency feature](https://www.hevyapp.com/features/gym-consistency/));
round 1 logged widgets as "the number one ask" for a comparable app (design
research §2.7).

**Data pipeline — widgets read a snapshot, never the DB:**

- New `src/lib/widgets/snapshot.js` builds a versioned JSON snapshot
  (`{ v: 1, nextSession, consistency, computedAt }`) from existing reads
  (active plan + `@volyume_schedule_v1`, `getCurrentMesocycleWeek`, COMP-018
  streak calc) and writes it to the shared store:
  - iOS: App Group `NSUserDefaults` via the target plugin's storage module,
    then reload widget timelines.
  - Android: `SharedPreferences`/provider per the chosen library, then
    request widget update.
- Refresh triggers (no background polling): workout finish, plan/schedule
  change, app foreground→background, and the existing
  `expo-background-fetch` task for the date rollover. Widgets are pure
  renderers of the snapshot — offline-first by construction, and **no PII
  leaves the device** (the snapshot lives in the app group, not any
  service). Widgets never show weight, calories or body data: the home
  screen is semi-public.

**Platform plugin choice (with risk notes):**

- **iOS — `@bacons/expo-apple-targets`** (recommended): config-plugin
  generation of a real WidgetKit target from a `/targets` folder, CNG-
  compatible, "codesigning is theoretically handled entirely by EAS Build";
  needs Expo SDK 53+ (we are on 54), Xcode 16; ships an `ExtensionStorage`
  App-Group module ([README](https://github.com/EvanBacon/expo-apple-targets),
  fetched 2026-06-10). Widget UI written in SwiftUI (static, two layouts —
  small Swift surface). *Risk:* plugin is explicitly experimental; signing
  needs a new App ID `app.volyume.widget` + profiles in EAS credentials
  (the existing `modules/live-activity/ios/widget/README.md` already
  documents this exact provisioning path).
  - *Alternative considered:* the new official `expo-widgets` SDK module —
    widgets and Live Activities authored in `expo/ui` SwiftUI components
    from TypeScript, iOS-only, dev-builds + CNG required
    ([Expo docs](https://docs.expo.dev/versions/latest/sdk/widgets/);
    summarised from the expo/expo repo source — direct docs fetch blocked).
    Genuinely promising, but brand-new and iOS-only; adopting it now risks
    a rewrite when it stabilises. Re-evaluate at the next SDK bump.
- **Android — `react-native-android-widget`** (recommended): mature library
  with first-class Expo config-plugin support; widget UI declared in JSX and
  rendered to native RemoteViews — no Kotlin to maintain
  ([docs](https://saleksovski.github.io/react-native-android-widget/)).
  *Risk:* RemoteViews styling limits; new dependency (founder approval
  required per CLAUDE.md). Glance-based experimental plugins exist
  ([expo-android-glance-widget](https://github.com/akshayjadhav4/expo-android-glance-widget))
  but are less proven.
- **OTA constraint (binding):** widget binaries are native — `expo-updates`
  cannot patch them. Every widget change is a store release. Keep widget
  code deliberately dumb (render a snapshot) so logic fixes ship OTA in the
  snapshot writer, not the widget.

### Stage 3 — Live Activity (iOS), re-enabled with the fix

**Ground truth on why it's off:** two separate facts. (1) The *notification*
path showed "N=current+1 against M=target, which read as 'Set 3 of 2'
mid-set" and was disabled (`RestTimer.js:46-52`). (2) The Live Activity
module itself never rendered in production because the widget-extension
target was never added to the Xcode project (`modules/live-activity/index.ts`
header; `ios/widget/README.md`). Stage 2's target work removes blocker (2);
this stage fixes (1) properly.

**Set-index fix spec** — derive exactly as the in-app counter does
(`countProgressSets`, `src/screens/ActiveWorkoutScreen.js:62-67`: warm-ups
and drop sets don't tick the target counter; the active-workout notification
already uses `countProgressSets(loggedSets) + 1` with the comment trail at
lines 474–478):

- `N = countProgressSets(loggedSets) + 1` (the set the user is resting
  *before*), `M = routineExercise.recommendedSets` (working target).
- Label: "Set N of M next" when `N ≤ M`; **"Extra set"** when `N > M`
  (never "Set 4 of 3"); "Warm-up" with no index when the just-logged set was
  a warm-up; existing "Rest in progress" fallback when `M` is null.
- One shared derivation: a pure helper (e.g. `restActivityContext()` beside
  `countProgressSets`, unit-tested) feeds **both** the Live Activity start
  call and any future lock-screen surface, so the label can never diverge
  from the in-app counter again.

**Lifecycle:** start on rest-timer start (set logged → `startRestActivity`
with the corrected context); `updateRestActivity` on ±15/±30 adjustments
(API exists; user is in-app when adjusting, so local updates only — no push
channel); end on Skip, timer-zero (end ~3 s after zero so the "go" moment is
visible on the island), workout finish, and sign-out; `endAllActivities()`
on app launch clears stale ones (already implemented). Single-activity
invariant already enforced in `modules/live-activity/index.ts:80-94`.

**Budget/constraints:** `Text(timerInterval:)` counts down with zero app
wake-ups (battery-free); content updates only on manual ±time changes —
nowhere near ActivityKit's throttle, and the 4 KB content cap and 8-hour
activity limit are irrelevant at rest-timer scale
([Apple ActivityKit](https://developer.apple.com/documentation/activitykit);
[Braze Live Activities guide](https://www.braze.com/docs/developer_guide/live_notifications/live_activities);
[canopas guide](https://canopas.com/integrating-live-activity-and-dynamic-island-in-i-os-a-complete-guide)).
`NSSupportsLiveActivities` is already in `app.json`;
`NSSupportsLiveActivitiesFrequentUpdates` is also set but unnecessary for
this design — leave as-is (harmless), note for review.

**Dynamic Island anatomy** (already built in
`VolyumeRestTimerLiveActivity.swift` — keep, amend only the bottom line):
compact = amber dumbbell + countdown; expanded = exercise/workout name
(leading), big countdown (trailing), corrected set line (bottom); minimal =
amber dumbbell; lock-screen card for non-island devices. Amber stays
hard-coded in Swift (matches `theme.js` primary #F59E0B) — note the pairing
in a comment both sides.

**Android:** no change — the shipped `rest-timer-live` chronometer
notification remains the Android lock-screen surface (zero-update
`Chronometer`, same philosophy).

**Free/Pro:** rest timer and logging are free; the Live Activity and both
widgets are free-tier surfaces. Nothing here gates or exposes anything
across the line.

## 5. Whole-package integration

- **COMP-004 (daily trend card):** its tap-through lands on the weight
  chart this blueprint upgrades — COMP-004 supplies the cue, COMP-019 the
  payoff. Shared ED-flag behaviour (hide rate-of-change takeaway when a flag
  is open; chart itself stays).
- **COMP-018 (streak):** the consistency widget is COMP-018's third surface
  (Progress, recap, home screen) and reuses its computation and suppression
  rules verbatim — no second streak logic.
- **COMP-010 (visible periodisation):** the next-session widget carries the
  same week-in-block chip language as Home.
- **COMP-001 (workout screen):** Live Activity is the session screen's
  off-screen extension; it renders store state and never adds anything to
  the screen itself (sacred-ground rule).
- **COMP-020 (watch):** the App-Group snapshot pipeline and the extension
  target are the watch app's future plumbing — Stage 2 derisks COMP-020.
- **COMP-005 (recaps) / ShareCard:** `VolyumeChart` becomes the renderer
  for recap charts; the takeaway line is the shareable sentence.
- **Duplication to avoid:** one chart engine direction (Skia `VolyumeChart`
  replaces `SvgLineChart` host-by-host; never two interactive chart kits);
  one set-context derivation (`countProgressSets`); one snapshot writer for
  all out-of-app surfaces.
- **Streamlining:** no new screens, no new tabs. Charts upgrade in place;
  widgets live on the OS home screen; the Live Activity replaces unlocks.
  Nothing lands on Home (COMP-027 hierarchy untouched).

## 6. Retention & word-of-mouth mechanics

- **Daily presence loop:** widget on home screen → cue before every gym day
  → app open → visible tick on the widget after the session. Lock-screen
  presence during every rest period makes the app's brand visible dozens of
  times per session — to the user *and to the gym floor*.
- **Interrogation loop:** number on card → tap → window chip → takeaway
  sentence that recomputes — the "it knows" feeling round 1 tied to the
  "elite" label.
- **Shareable moments:** the e1RM chart + "Up 7.5 kg in 3 months" takeaway
  (screenshot); the Dynamic Island countdown (physically seen by others —
  the only marketing surface that works with the phone face-up on a bench).

## 7. Beating the benchmark

MacroFactor's chart anatomy is the bar, but it serves nutrition data to
nutrition nerds; Volyume applies the same anatomy (windows, average +
first-to-last delta, scrub-with-tooltip) to *lifting* numbers and then goes
one step further: the takeaway is written in the coaching voice ("Up 7.5 kg
in 3 months."), not as a stats readout — chart-as-coach rather than
chart-as-spreadsheet. On glanceables, incumbents ship widgets *or* a Live
Activity; Volyume ships the full chain — widget before the session, Live
Activity during it, chart takeaway after it — on an offline-first store
where every surface renders local truth with zero network dependency, which
none of the cloud-first leaders can claim. And unlike its own first attempt,
every out-of-app number is derived by the same tested function as the
in-app UI: glanceable surfaces that are never wrong.

## 8. Measurement

(Existing telemetry pattern: local-first `track()` with allowlisted events,
`src/lib/telemetry/index.js` — extend the catalogue.)

1. `chart_window_changed` (chart_id, window) and `chart_scrubbed`
   (chart_id) — prove interaction happens; target: >40% of chart viewers
   change a window in week 1.
2. `widget_snapshot_rendered` proxy via widget deep-link opens
   (`widget_opened`, widget_id) — app opens attributed to widgets; target:
   widgets drive ≥5% of weekly opens for users who install one.
3. `live_activity_started` / `live_activity_ended` (reason) — adoption and
   defect watch (zero "wrong label" reports is the bar; one report
   re-disables it, see §9 risks).
4. Existing session-completion and D30 retention cuts, compared for
   widget-installers vs not (directional only — self-selection caveat).

## 9. Build notes

**Files/components touched (per stage):**

- 1a: `BodyMetricsScreen.js`, `ExerciseDetailScreen.js`,
  `VolumeHeatmapScreen.js` (chips + takeaway + date-window queries);
  possible small helpers in `src/lib/chartGeometry.js` (windowing stays in
  callers or a new `chartWindows.js`); no schema changes.
- 1b: new `src/components/VolyumeChart.js` (Skia); `haptics.js` reused as-is;
  hosts migrated one per PR.
- 2: new `/targets/widget` (iOS, via `@bacons/expo-apple-targets`) + Android
  widget config; new `src/lib/widgets/snapshot.js`; `app.json` plugin
  entries; EAS credentials for `app.volyume.widget`. **Two new dependencies
  (`@bacons/expo-apple-targets`, `react-native-android-widget`) — names,
  purposes and licences to be put to the founder for approval before
  install (CLAUDE.md rule).**
- 3: `modules/live-activity` (start-call context fix), new pure helper +
  unit tests beside `countProgressSets`, RestTimer/store wiring, removal of
  the disabling comment. The Swift files already exist and move into the
  Stage 2 target (the module's own README anticipated exactly this:
  "the bundle is ready to host them").

**Effort sanity-check vs approved E7:** Stage 1a ≈ 1.5, Stage 1b ≈ 2,
Stage 2 ≈ 2.5 (native targets, signing, two platforms, store-release-only
iteration), Stage 3 ≈ 1 (code exists; fix + QA). Total ≈ 7 — matches the
approved score, with the optionality that 1a alone delivers the
highest-value slice for ~20% of the budget.

**Risks (the one that matters first):**

1. **The widget-extension target destabilises the EAS release train** —
   experimental plugin + new provisioning profile + CNG interactions; and
   because widgets are not OTA-patchable, any defect needs a store release.
   Mitigation: land the target on a separate EAS build profile, dogfood on
   the internal track for a full release cycle before production; keep
   widgets snapshot-dumb so fixes live in OTA-patchable JS.
2. Live Activity label regression — mitigated by the single shared
   derivation + unit tests; rollback is one flag (the module already
   no-ops cleanly).
3. Skia canvas count on BodyMetrics — mitigated by deferred mounting.
4. victory-native temptation mid-build — decision recorded above; revisit
   only via a new founder decision.

**Sources flagged search-extract-only** (direct fetch 403): macrofactor.com
release notes/dashboard pages, docs.expo.dev, help.macrofactorapp.com.
Fetched directly: EvanBacon/expo-apple-targets README, expo/expo docs source
(raw GitHub). All accessed 2026-06-10.

---

## STAGE 2 — #175 SPIKE RESULT + BUILD RECIPE (session 7, 2026-06-11)

**#175 go/no-go: GO.** The spike researched `EvanBacon/expo-apple-targets`
issue #175 (web, 2026-06-11): it is a **watchOS** target-wiring bug (self-
dependency, missing "Embed Watch Content" phase, stale `watch.app` refs) with a
patch-package workaround — it affects **COMP-020 (the watch), NOT the widget**
extension target (a different product type/code path). Widget extensions build
on Expo SDK 54 (we are on 54.0.35) + EAS Build; there is an official
`expo-apple-widget-example`. Caveats: the npm package is **`@bacons/apple-targets`
v4.x** (not the repo name), codesigning is "tested mainly with one widget" and
may need a manual signing-tab pass per target, and widgets need iOS 18 to appear.

**Sequencing recommendation:** Android first (`react-native-android-widget`,
mature, JSX→RemoteViews, no Kotlin), then iOS (`@bacons/apple-targets`); apply
the #175 patch only when/if the watch target lands.

### SHIPPED this session (code-only, verifiable)
- **`src/lib/widgets/snapshot.js`** — the OTA "brains": pure `buildWidgetSnapshot`
  ({ v, nextSession, consistency, computedAt }) + `emptyWidgetSnapshot`. No PII
  (no weight/calories/macros — only a routine name + session counts); consistency
  is suppressed under an open ED flag (COMP-018 rule). 8 fixtures. This is the
  half the blueprint says must live in JS so content fixes ship OTA.

### FOUNDER / EAS BUILD RECIPE (the native shell — cannot be built or verified in the cloud container)
1. **Deps (approved §14):** `npm i react-native-android-widget @bacons/apple-targets`.
2. **Storage bridge + writer:** add `writeWidgetSnapshot(userId)` that gathers
   inputs from the existing reads (active plan + `@volyume_schedule_v1`,
   `getCurrentMesocycleWeek` for the week-in-block chip, the COMP-018 streak
   calc + `getOpenEdPatternFlag` for `edFlagOpen`), calls `buildWidgetSnapshot`,
   and persists to the shared store: iOS App Group via `@bacons/apple-targets`
   `ExtensionStorage`, Android via `react-native-android-widget`'s storage; then
   request a timeline/widget reload. Triggers (no polling): workout finish,
   plan/schedule change, foreground→background, and the existing
   `expo-background-fetch` date-rollover task.
3. **iOS target:** `/targets/widget` SwiftUI (two static layouts: small + medium
   Next session; small Weekly consistency) reading the App-Group snapshot; new
   App ID `app.volyume.widget` + profiles in EAS credentials (the existing
   `modules/live-activity/ios/widget/README.md` documents this path).
4. **Android target:** widget JSX via `react-native-android-widget` (RemoteViews).
5. **app.json:** add the two config plugins. Widgets are native — every change is
   a store release; keep the widget UI dumb (render the snapshot), logic stays in
   `snapshot.js` (OTA).
6. **Verify on a real build:** iOS 18 device + an OLED Android; tap-through opens
   the app to Train; ED-flag → consistency widget shows neutral next-session.
