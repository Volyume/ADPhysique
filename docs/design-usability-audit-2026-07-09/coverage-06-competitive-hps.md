# Coverage-06 — Competitive benchmarks: Home, Progress, Settings

Audit date: 2026-07-09. Read-only, no code changed. Part of the coverage-gap
lane ("competitive benchmarks for Home/Progress/Settings," master index
section 5, `00-MASTER-INDEX.md`) opened after the 8-lane design/usability
campaign closed its non-gated build backlog (see
`_CAMPAIGN-STATUS-AND-RESUME.md`, Batch 5).

## Scope and method

Benchmarked VOLYUME's Home tab (`HomeScreen.js`), Progress tab (`AnalyticsScreen.js`
plus `ConsistencyScreen.js`, `VolumeHeatmapScreen.js`, `YearOfLiftsScreen.js`,
`LiftProgressScreen.js`, `BodyMetricsScreen.js`, `ExerciseDetailScreen.js`) and
Settings (`SettingsScreen.js` + its nine sub-screens, `src/widgets/`) against
named-competitor patterns: Hevy, Strong (workout logging/history), MacroFactor,
Cronometer, MyFitnessPal (nutrition/trend), Whoop, Oura (glanceable dashboards,
wearable-style widgets, recovery framing).

**Read first, not duplicated.** Four existing documents already cover
Home/Progress/Settings competitively in depth and are treated as the source of
truth for what they already found — this lane only adds what they did not:
- `audit/04-competitive.md` — whole-app Hevy/Cronometer/MacroFactor scorecard
  (progress visualisation, coaching mechanics, paywall).
- `docs/hevy-teardown-2026-06-29/15-settings-customization.md` — a full
  Hevy-vs-Volyume Settings teardown (R1-R6: rest-timer defaults, warm-up
  calculator, plate config, first-day-of-week, RPE/RIR toggle). **Verified this
  session**: R1/R2 (default rest, auto-start, rest-end alert, body-weight unit,
  barbell weight) are now BUILT (`SettingsScreen.js:191-291`); rest-timer
  **sound choice**, the warm-up calculator, plate-inventory config and
  first-day-of-week remain open exactly as that doc describes — not
  re-flagged here.
- `docs/hevy-teardown-2026-06-29/_PARITY-SCORECARD-AND-BACKLOG.md` — confirmed
  the 5-lens ExerciseDetail metric switcher (its Tier-1 #4) is now built
  (`ExerciseDetailScreen.js:73-103`, `lib/liftProgress.js`) — not re-flagged.
- `docs/world-class-audit-2026-07-03/04a-progress-surfaces.md` — Progress-tab
  strengths/fixes (heatmap legend, streak system, YearOfLifts, weight-trend
  goal-band deferral) — not re-flagged.
- `00-MASTER-INDEX.md` lane 04 — already flags AnalyticsScreen's "13 stacked
  sections" density (L04 root-density finding) and the tappable-card-with-no-
  onPress bug (L04-1, since fixed). This lane's Home finding (CP-1) is a
  **different** claim: not information density, but hero-legibility — how many
  competing "read this first" banners can render before the single primary
  action, benchmarked against Whoop/Hevy's single-hero home screens.

Every finding below was verified against current source this session (not
inherited from an older doc) and cites exact file:line.

## Summary

| | Count |
|---|---|
| Findings (CP-1 .. CP-10) | 10 |
| Severity A | 0 |
| Severity B | 5 |
| Severity C | 5 |
| SAFE | 1 |
| JUDGEMENT | 8 |
| GATED | 1 |
| By area | Home 3 · Progress 2 · Settings 5 |

No severity-A (broken/regression) competitive gap was found — VOLYUME's
Home/Progress/Settings are materially more mature than the 2026-06-29/07-03
teardowns describe (see "Where VOLYUME meets or beats the benchmark" below).
The gaps found are real but B/C: below-competitor-par patterns, not defects.

---

## Findings

### Home

**CP-1 — Sev B, JUDGEMENT.** Up to seven independently-dismissible banner
types can stack above the primary Start-Workout hero, with no cap on how many
render at once: phase-mismatch (`HomeScreen.js:1348`), coach-review
(`:1374`), trial-countdown (`:1414`), recovery-week/deload (`:1431`), lift-
plateau (`:1465`), activation nudge (`:1491`), then the free/differential
`AttentionCard` (`:1524`), *then* the skeleton/TodayStrip/first-launch welcome
card (`:1559-1626`) *before* the hero/continue card itself renders
(`:1629-1647`). Each is individually well-designed (calm copy, dismissible,
self-hides) but there is no single point deciding "how many of these show
today" — a Pro-trial user mid-deload with a stalled lift and an unread coach
decision could see four-plus stacked cards before reaching "Start workout."
**Competitor pattern:** Whoop's home screen leads with exactly one hero (the
Recovery ring) and pushes everything else below or into a separate tab; Hevy
leads with exactly one hero (Start Workout CTA, no interstitial banner stack).
Both treat "one glanceable answer, then the action" as the home-screen
contract. VOLYUME's individual banners are good; the *stack* is not
benchmarked against a world-class single-hero home screen.
**Proposed:** Consolidate the optional/dismissible banners into one rotating
"Today" digest slot (single card, internally prioritised) rather than a
vertical list, or hard-cap simultaneous banners at one with a priority queue
(the differential-paywall detector already has a `pickAttentionVariant`
priority function at this exact spot — the pattern to extend, not invent).
**Why JUDGEMENT, not SAFE:** picking what collapses into what, and preserving
each banner's own GATED status where relevant (the trial/differential banners
are paywall-adjacent per master-index GATED item 12 and lane 08) is a design
call, not a mechanical fix.

**CP-2 — Sev B, JUDGEMENT.** No iOS home-screen or lock-screen widget exists.
Android ships two `react-native-android-widget` widgets — `NextSessionWidget`
and `WeeklyConsistencyWidget` (`src/widgets/widgets.js:54-116`) — and the
Settings row that explains them is gated `Platform.OS === 'android'`
(`SettingsScreen.js:151-162`). iOS's only native at-a-glance surface is the
rest-timer Live Activity (`modules/live-activity/`), which exists only during
an active session and disappears the rest of the time. **Competitor pattern:**
Whoop, Oura, Hevy and Strong all ship iOS WidgetKit home/lock-screen widgets
(recovery ring, next workout, streak) as a named retention feature — glanceable
without opening the app, precisely the use case Android already gets here.
Since VOLYUME ships to TestFlight/iOS as a first-class target (CLAUDE.md
"Live production app... Android; iOS via TestFlight"), this is a genuine
cross-platform parity gap, not a nice-to-have.
**Proposed:** An iOS WidgetKit extension mirroring the two existing widget
snapshots (`src/lib/widgets/snapshot.js`), following the exact native-module-
via-config-plugin precedent `modules/live-activity` + `plugins/withVolyumeWidget.js`
already established.
**Why JUDGEMENT, not GATED:** no new external dependency is required (same
pattern as the already-approved Live Activity), but it is a sizeable new
native-extension build, so it needs an explicit go-ahead like any other
multi-day feature, not a silent decision.

**CP-3 — Sev C, JUDGEMENT.** The only "week at a glance" card on Home
(`styles.glanceCard`, "Your progress at a glance," `HomeScreen.js:1779-1796`,
showing sessions-this-week + last-session-day) renders **only** in the edge
case of a user with training history but no active plan
(`lastSession != null` inside the no-active-plan branch). The common
plan-following user never sees a persistent week-glance strip on Home itself —
the nearest equivalent (`TrainingCalendar`, `WeeklyStreakStrip`) lives one tap
away on the Progress tab. **Competitor pattern:** Whoop and Oura both keep a
persistent 7-day glance strip directly on the primary dashboard, not gated to
an edge case. **Proposed:** Promote a compact week-glance element (sessions
done / planned this week) into the always-rendered hero area for
plan-following users too, not only the plan-less fallback. Low priority
relative to CP-1/CP-2; noted for completeness of the Home benchmark.

### Progress

**CP-4 — Sev C, JUDGEMENT.** "Recent sessions" cards on the Progress hub show
only workout name, date, duration and an optional difficulty chip
(`SessionCard`, `AnalyticsScreen.js:998-1026`) — no visual workout-type/split
tag (push/pull/legs, or muscle-group colour) and no top-exercises glance
without tapping through to `WorkoutSummary`. **Competitor pattern:** Hevy's
history rows carry a coloured split tag and the top few exercises directly in
the list, so a user scanning history can tell *what kind* of session each row
was without opening it. **Proposed:** Add a small split/muscle-group tag
(reusing the existing `MUSCLE_DISPLAY_NAMES`/colour grammar already used by
`VolumeSummaryStrip` two sections below on the same screen) and/or the first
1-2 exercise names as a subline.

**CP-5 — Sev C, JUDGEMENT.** The per-exercise strength trend chart
(`ExerciseDetailScreen.js:687-712`, via `VolyumeChart`) has no visual marker
for the point(s) where a PR was set — `VolyumeChart`'s line variant supports
`showDots` (every point, uniform) but nothing highlights the PR point
specifically; the bar variant supports per-bar `color` (used elsewhere for
red/green-free muscle-status colouring) but that capability isn't exposed on
the line variant used here. A PR is only discoverable by scrubbing to the
right point or reading the separate PR badge elsewhere on the screen.
**Competitor pattern:** Hevy and Strong both mark PR points directly on the
per-exercise trend line (a star or filled dot distinct from the rest of the
series) so the achievement is visible on the chart itself, not just in a
separate list. **Proposed:** Extend `VolyumeChart`'s line variant with an
optional `highlightIndices` prop (mirroring the bar variant's existing
per-point colour capability) and pass the already-computed PR session
indices from `ExerciseDetailScreen`'s existing PR-detection logic
(`calculate1RM` calls at `:267,412,731`).

### Settings

**CP-6 — Sev C, SAFE.** `SettingsScreen.js`'s own header comment states its
IA contract plainly: "A short list of categories, each opening its own
focused sub-page" (`:29-31`). Every one of the fourteen rows honours that
(tap → sub-screen). The "Workout & units" block (`:191-291`) breaks the
pattern: it renders its controls (body-weight-unit segmented control,
default-rest stepper, auto-start switch, rest-alert switch) **inline on the
landing screen itself**, with no row/arrow, immediately below the otherwise
uniform list. A user scanning the screen hits fourteen identical "tap for
more" rows then an unexplained shift to inline toggles with no visual seam.
**Competitor pattern:** MFP, Cronometer and Hevy all keep the settings root a
pure navigation list; detail controls live one level in, never mixed onto the
root. **Proposed:** Move the block into its own "Workout & units" sub-screen
(exactly what the source `hevy-teardown-2026-06-29/15-settings-customization.md`
R1 originally specified) reached via a normal row, restoring the screen's own
stated contract. **Why SAFE:** mechanical — the same `SettingsPage`/`SettingRow`
primitives already used by every other category, no new design decision.

**CP-7 — Sev B, GATED.** No biometric app-lock (Face ID/fingerprint
re-authentication) exists anywhere in the app — confirmed by an empty grep
for `biometric`/`LocalAuthentication`/`expo-local-authentication` across
`src/` and `package.json`. VOLYUME already encrypts the local database at
rest (SQLCipher, `src/lib/dbCrypto.js`) but has no in-app gate against casual
shoulder-surfing on an already-unlocked, shared, or borrowed phone — a
meaningful privacy surface given the app holds body weight, nutrition,
progress photos and (per `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`
context) SCOFF/ED-adjacent check-in answers. **Competitor pattern:**
MyFitnessPal and Cronometer both offer an optional biometric app-lock given
the sensitivity of health data on a shared device. **Proposed:** An optional
Face ID/fingerprint gate in Settings > Privacy, off by default, using
`expo-local-authentication`. **Why GATED:** a new dependency
(`expo-local-authentication`) — per CLAUDE.md "Never add dependencies without
asking," this needs name/purpose/licence sign-off before any code is written,
regardless of how small the feature is.

**CP-8 — Sev B, JUDGEMENT.** Height and date-of-birth are editable in exactly
one place in the entire app: the prefill form inside `NutritionTargetsScreen.js`
(`:317-354`, feeding `heightCm`/`dateOfBirth` into recalculated macro
targets), which is Pro-only (`SettingsScreen.js:107-114` only shows the
"Nutrition targets" row when `tier === 'pro'`). `SettingsProfileScreen.js`
(the plain "Profile" settings page, free-tier-reachable) only exposes name,
diet preference and biological sex (`:14-37`) — no height or date-of-birth
field. A free-tier user (or a Pro user who wants to fix a mistyped height/DOB
without touching their nutrition targets) has **no direct edit path**
anywhere in Settings. **Competitor pattern:** MFP, Cronometer and MacroFactor
all keep basic biometric profile facts (height, birth date, sex) on a single
"Personal details"/"Body info" settings page, editable independent of any
premium-tier feature. **Proposed:** Add height and date-of-birth as editable
rows on `SettingsProfileScreen.js` (mirroring the existing `changeSex`
confirm-and-persist pattern at `:44-56`), independent of nutrition-targets
recalculation; Pro's engine re-reads the corrected value at the next weekly
check-in exactly as the existing sex-change comment already documents.
**Why JUDGEMENT, not SAFE:** deciding whether/how a mid-cycle height/DOB
correction should retroactively touch already-computed Pro targets is a
product decision, even though the UI wiring itself is mechanical.

**CP-9 — Sev C, JUDGEMENT.** `SettingsAboutScreen.js` offers exactly three
rows: "Send feedback" (a sentiment sheet), "Rate Volyume," and "Credits"
(`:14-56`) — no FAQ, no Help Centre, no contact-support email, and no
changelog/what's-new link (confirmed by an empty grep for
`FAQ|Help Center|support@|contact@` across Settings and `FeedbackSheet.js`;
the existing `WhatsNewSheet` component isn't linked from Settings at all).
**Competitor pattern:** Hevy, MyFitnessPal and Cronometer all carry a
Help-Centre/FAQ link and a support-contact path distinct from generic
in-app feedback, plus a visible changelog. **Proposed:** Add a "Help &
FAQ" row (even a simple web link) and surface `WhatsNewSheet`'s content
from Settings > About as a "What's new" row. **Why JUDGEMENT:** writing FAQ
content and picking a support-contact channel (email vs in-app only) is a
product/ops decision, not a mechanical UI fix.

**CP-10 — Sev B, JUDGEMENT.** Changing Appearance (dark/light/match-phone),
Larger text, Higher contrast or the Colour-blind-safe palette all require a
full app reload to take effect — `SettingsDisplayScreen.js:28-53` explains
why in its own comment ("mutate theme tokens that `StyleSheet.create` has
already baked at module-evaluation time") and every toggle calls
`promptRestartForA11y`, which pops an alert asking the user to close and
reopen the app (`:33-53,92-98,210-216,230-236,247-253`). **Competitor
pattern:** iOS/Android system settings and effectively every modern
competitor app (Hevy, MFP, Cronometer, Whoop) apply a theme or text-size
change instantly, with no reload prompt. Reduce-motion is the one exception
here that already applies instantly (`:258-269`), proving the pattern is
achievable for at least one of the five toggles. **Proposed:** Re-architect
the theme/accessibility tokens to read from a live store value at render time
(context or a themed-styles hook) rather than `StyleSheet.create`-time
constants, removing the reload requirement for all five toggles. **Why
JUDGEMENT, not SAFE:** this is a themeing-architecture change touching every
screen's style computation, not a one-file fix — sizeable enough to need an
explicit go/no-go given the "no drive-by refactors" workflow rule.

---

## SAFE quick wins

- **CP-6** — move "Workout & units" off the Settings landing screen into its
  own sub-page, matching every sibling category. One file, existing
  primitives, no design decision.

## Needs a decision

- **CP-1** (JUDGEMENT) — how to consolidate/cap Home's banner stack; must
  preserve the paywall/trial banners' existing GATED status from lane 08.
- **CP-2** (JUDGEMENT) — approve the iOS WidgetKit build (sizeable, no new
  dependency, same pattern as the already-shipped Live Activity).
- **CP-3** (JUDGEMENT) — promote the week-glance card out of its current
  plan-less-only edge case.
- **CP-4** (JUDGEMENT) — add a split/muscle-group tag to Recent-sessions rows.
- **CP-5** (JUDGEMENT) — add a PR-highlight capability to `VolyumeChart`'s
  line variant.
- **CP-7** (GATED) — new dependency (`expo-local-authentication`) for an
  optional biometric app-lock; name/purpose/licence sign-off required first.
- **CP-8** (JUDGEMENT) — add height/DOB editing to `SettingsProfileScreen.js`
  independent of the Pro-gated nutrition-targets flow; decide the
  recalculation-timing rule.
- **CP-9** (JUDGEMENT) — FAQ/Help-Centre content and support-contact channel.
- **CP-10** (JUDGEMENT) — theme/accessibility re-architecture to drop the
  reload requirement.

---

## Where VOLYUME meets or beats the benchmark

Recording these so a future pass doesn't re-flag them as gaps:

- **Progress hub's single-hero discipline.** `AnalyticsScreen.js:383-407`
  leads with exactly one `TrainingLoadHero`, then two half-width sparkline
  cards — the same "one glanceable answer, then detail" contract Whoop/Hevy
  use, and the contrast that makes CP-1's Home finding legible (Progress got
  this right; Home did not).
- **`VolyumeChart`** (`src/components/VolyumeChart.js`) — a single chart
  engine app-wide with tap-and-hold scrub, per-point haptics, a live
  accessibility announcement on scrub, and a bar variant with per-point
  colour — genuinely at or above Hevy/MacroFactor's chart interaction quality
  in one unified component rather than several bespoke ones.
- **Own-standing strength levels.** `LiftProgressScreen.js:35-51`
  (`getStrengthLevel`/`summariseStrengthStanding`) already ships the
  ED-safe alternative to a percentile/leaderboard strength comparison the
  earlier Hevy-parity doc explicitly kept GATED — built the safe way, not
  skipped.
- **Readiness captured without a numeric score.** `HomeScreen.js:91-107`'s
  soreness/sleep/energy chips plus `buildReadinessSummary`'s single calm line
  (`:1242,1667-1680`) deliver Whoop-style pre-session readiness input without
  a Whoop-style numeric score — the safety-appropriate version of the same
  idea, not an omission.
- **`SettingsDataScreen.js`** — full JSON backup/restore, automatic
  pre-update snapshots, CSV workout export, and a coach-handover PDF report
  (`:126-341`) is a materially deeper data-portability story than
  MyFitnessPal or Cronometer offer at any tier, several of them usually
  paywalled elsewhere in the category.
- **`SettingsDisplayScreen.js`** accessibility depth (larger text, higher
  contrast, colour-blind-safe palette, reduce motion, all free-tier) exceeds
  what Hevy, MFP or Cronometer expose as user-facing accessibility controls,
  reload requirement (CP-10) aside.
- **`ConsistencyScreen.js`** — ACWR/workload, 12-week training calendar,
  muscle-frequency table, mesocycle pulse and fatigue trend combined on one
  screen exceed any single competitor's consistency/recovery surface (Whoop
  does recovery, Hevy does consistency streaks; nobody combines both with
  training-load science the way this screen does).
- **YearOfLifts / Recaps** — already identified in
  `docs/world-class-audit-2026-07-03/04a-progress-surfaces.md` as the
  strongest surface in the app; re-confirmed, not re-audited here.
- **`SettingsScreen.js`'s "Workout & units" content** (if not its placement,
  per CP-6) already closed most of the Hevy-teardown's R1/R2 gap: default
  rest timer, auto-start, rest-end alert, body-weight unit and barbell
  weight are all live, editable settings that didn't exist in the 06-29
  teardown.
