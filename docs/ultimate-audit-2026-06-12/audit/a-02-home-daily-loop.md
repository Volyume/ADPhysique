# Audit A-02 — Home & the Daily Loop

**Ultimate-app mandate · Phase 1 · Area 02. Code-verified internal audit.**
Branch `claude/admiring-bohr-2kb7pd`, repo `/home/user/ADPhysique`. Every claim
carries file:line evidence read against current source on 2026-06-12.

Scope: `HomeScreen` (the "Train" tab — `HomeTab`, `RootNavigator.js:445`) and
everything it surfaces — greeting, schedule-context line, the one-banner
priority stack, the session hero (+ first-run variant, meso chip, coach brief),
`TodayStrip`, the free no-plan on-ramp, the free weekly one-liner, the Pro
teaser, the last-session card, the coaching nudge, and the pre-workout
intent/readiness modal — plus the daily return loop: what brings a user back,
what Home answers in the first five seconds, and where every tile deep-links.

Personas held throughout: **Besa the Beginner** (nervous, mass-market, wants to
be told what to do) and **Eddie the Elite** (competitive, wants precision and
density fast).

> **What changed since the deep-audit doc (`int-04-progress-retention-gamification.md` §Home, same morning):**
> 1. **B2 free no-plan on-ramp is built** (`HomeScreen.js:1332–1360`): the old low-emphasis welcome + stacked builder cards are replaced by one calm `starterCard` — micro-quiz ("Find my plan" → `FreeStarter`) first, "Browse plans" second, blank-session as a quiet link below.
> 2. **Free weekly one-liner shipped** (founder decision 4c): `loadFreeCoachLine` + `buildFreeCoachLine`, lowest priority in the banner stack, free tier only (`HomeScreen.js:383–421, 1098–1122`).
> 3. **TodayStrip** (COMP-027 Part B) has replaced the three stacked utility cards (morning weight / steps / cardio) with one ~64pt three-cell row, Pro only (`TodayStrip.js`, mounted `HomeScreen.js:1421–1438`).
> 4. **First-run cue folded into the hero** (COMP-013): the standalone first-run row is retired; a "short session" variant now lives *inside* the hero card (`HomeScreen.js:1206–1247`).
> 5. **Device-walk fixes**: trial-end gate now fires independent of notification permission (`HomeScreen.js:112–135`); `getRelativeDay` uses local calendar dates not epoch deltas (`1826–1840`); `buildCoachBrief` no longer fires the below-MEV rule for zero-session users (`1789–1795`).
> Prior-audit findings F7 (no rest-day reason) and F6 (streak number invisible) remain **largely unaddressed on Home** — see §4.

---

## 1. WHAT — every element in render order, all states

### 1.0 Data load model (`HomeScreen.js:271–292`)
`loadData()` runs on focus (`useFocusEffect`, `231–245`), on cloud-sync version
bump (`250–255`), and on two safety-net timers at +3s/+10s after sign-in
(`263–269`). It fires a `Promise.all` of loaders; **tier branches the set**:
Pro adds `loadTodayWeight / loadLatestCoachOutput / loadFirstRunCue /
loadTrialBanner`; free adds only `loadFreeCoachLine` (`286–288`). `initialLoading`
clears in a `finally` so one rejected loader can't spin forever (`289–291`, HP-7).

### 1.1 Render order (top → bottom, `946–1570`)
1. **`ScreenHeader`** — title `"Train"`, subtitle = greeting (`956`).
2. **Schedule-context line** — only if a schedule exists (`959–970`).
3. **Banner priority stack** — at most one of {phase, coach, trial, deload, freeCoachLine} (`979–1122`; logic §1.4).
4. **Skeleton** — two `SkeletonCard`s (h160 + h64) while `initialLoading` (`1129–1136`).
5. **Primary workout area** — one of: active-session continue card / hero / no-plan section (`1145–1415`; §1.3).
6. **`TodayStrip`** — Pro only (`1421–1438`).
7. **Pro teaser** — free + `totalSessions >= 3` (`1442–1466`).
8. **Last-session card** — if any completed session (`1469–1530`).
9. **Coaching nudge** — Pro, one-time, check-in day (`1536–1566`).
10. Three modals: block-shape sheet (`1576–1602`), change-workout sheet (`1604–1662`), pre-workout intent+readiness (`1665–1740`).

The greeting is time-of-day bucketed and name-personalised (`getGreeting`,
`49–57`): "Up early" / "Morning" / "Afternoon" / "Evening" / "Late night",
suffixed `, {firstName}` when known.

The schedule line (`loadScheduleContext`, `461–489`) reads
`@volyume_schedule_v1`, finds the next scheduled weekday within 7 days, and
renders "Today is a training day" (highlighted primary, `962`), "Next session:
tomorrow", or "Next session: {DayName}". **Null (no line at all)** when no
schedule is stored — the mass-market default.

### 1.2 Banner stack — verbatim priority logic (`924–944`)
One-banner-at-a-time invariant, computed top of render:

```
showCoachBanner          = tier==='pro' && latestCoachOutput && !coachBannerDismissed
                           && (now - weekStart < 7d)                                  // (929–930)
showTrialCountdownBanner = trialBanner && !trialBannerDismissed
                           && !showCoachBanner && !showCoachingNudge                  // (934–935)
showDeloadBanner         = deloadSuggestion && !deloadDismissed
                           && !showCoachBanner && !showTrialCountdownBanner           // (936–937)
showPhaseBanner          = phaseMismatch && !phaseBannerDismissed
                           && !showCoachBanner && !showTrialCountdownBanner
                           && !showDeloadBanner                                       // (938–939)
showFreeCoachLine        = tier==='free' && freeCoachLine && !freeCoachLineDismissed
                           && !showCoachBanner && !showTrialCountdownBanner
                           && !showDeloadBanner && !showPhaseBanner                   // (943–944)
```

Effective priority: **coach review > trial countdown > deload > phase >
free one-liner.** Coach/trial are Pro-exclusive by data; freeCoachLine is
free-exclusive by guard; deload + phase can show for either tier. The trial
banner is also suppressed by the day-of coaching nudge (`showCoachingNudge`,
`935`) "so two voices never say the same thing". **Render order in JSX differs
from priority order** (phase is rendered first at `979`, coach at `1005`), but
the mutually-exclusive booleans guarantee only one is ever true.

### 1.3 Primary workout area states (`1145–1415`)
- **Active session** (`hasActiveWorkout`, `901`): green "Session in Progress"
  card → `ActiveWorkout` (`1145–1161`). Rehydrated after a kill via
  `restoreActiveWorkout` (`96–106`, WK-1).
- **Plan + next workout** → **hero card** (`1162–1301`):
  - eyebrow `Day {idx+1} of {total}` (`planProgress`, `903–905`);
  - workout name (xxl black, `1167–1169`); exercise count (`1170–1174`);
  - **meso chip** (`1180–1202`): "Week N of M · stop R short of failure", or
    "Deload week · pull effort back" when `isDeload`; taps open the block-shape
    sheet (COMP-010);
  - **coach brief** (`1203–1205`, `CoachBriefCard`): shown only when
    `activePlan && !hasActiveWorkout && lastWorkoutDaysAgo !== 0 && !briefDismissed`
    (`913`); deterministic rule ladder in `buildCoachBrief` (`1751–1824`):
    recover (deload) > caution (fatigue ≥3.5) > "back" (gap ≥5d) > below-MEV (≥2
    muscles, only if trained) > "looking good" (fatigue ≤2) > default "Ready when
    you are";
  - **first-run variant** (`1210–1247`, COMP-013): Pro + `totalSessions===0` +
    not dismissed → "First session: a short one… About 15 minutes" with a
    "Start short session" (starter=true) primary, an "or start the full session"
    link, and a dismiss ×. Else the standard start row (`1248–1278`): "Start
    workout" + "View" (→ `RoutineDetail`);
  - secondary row (`1279–1300`): "Change workout" (sheet) + "Blank session"
    (→ `BuildWorkout`).
- **No plan** (`1302–1415`): tier-split.
  - **Pro** (`1304–1330`): `noPlanHero` "No active plan on this device" + a
    cloud-pull reassurance + "Build my plan" (`generateAndSavePlan`). Plus a
    `quickStartCard` "Start your first session" (blank) at `1386–1401`.
  - **Free** (`1331–1360`, B2 `starterCard`): title swaps on history —
    "Not sure where to start?" (no history) vs "Put a plan behind your training"
    (has history); "Find my plan" → `FreeStarter`, "Browse plans" →
    `PlanLibrary`. Below it a `glanceCard` (`1364–1381`, only if history) and a
    quiet "Just want to log? Start a blank session" link (`1403–1413`).

### 1.4 TodayStrip states (`TodayStrip.js`)
Pro-only (parent gates, `HomeScreen.js:1421`). Degradation ladder 3→2→1 cells:
- **WEIGHT** (load-bearing): logged-state shows value + green tick + sparkline
  (`238–261`); empty shows "Log" prompt (`263–278`); morning window
  (before 11:00, no log, no active session — `46, 96–98`) auto-expands the input
  inline. Stone/lbs/kg input owned here; data + persistence owned by HomeScreen
  (`handleLogWeight`, optimistic, `574–590`). Under `edFlagOpen` the sparkline is
  dropped (value only, `255`).
- **STEPS** (glance-only, self-hides without data, `175, 280–290`): polls every
  30s while active (`158–165`).
- **CARDIO** ("+ Log" entry → `LogCardio`, `292–311`): hidden when cardio off.
- Large-font (scale ≥1.3) stacks the cells instead of truncating (`177, 349–357`).

### 1.5 Persona × state matrix (what each user sees)
- **Besa, free, first run, no plan, no history**: greeting + (usually no schedule
  line) + B2 `starterCard` "Not sure where to start?" + quiet blank-session link.
  No streak, no TodayStrip, no teaser. The single answer is the micro-quiz.
- **Besa, free, has trained, no plan**: starterCard "Put a plan behind your
  training" + `glanceCard` (sessions-this-week + last-session) + last-session card
  + (after 3 sessions) the Pro teaser + (weekly) the free one-liner.
- **Eddie, Pro, day 100, plan active, training day**: schedule line "Today is a
  training day" + (maybe) coach-review banner + hero (Day N of M, meso chip, coach
  brief) + TodayStrip + last-session card. Dense, action-first.
- **Eddie, Pro, trial day 3, plan, low activity**: trial value banner
  (`trialBannerLine`, variant S1/S2/S3 by sessions+weigh-ins, `352–357`) above the
  hero; the banner self-retires once a real coach output exists (`339`).
- **Either, deload week**: meso chip flips to "Deload week"; deload banner may
  show (→ `CoachReview`); coach brief headline "Recovery week".

---

## 2. WHERE — deep-links, reachability, dead ends

### 2.1 Deep-link inventory (every Home exit; `navigation.*` grep `127–1550`)
| From | Target | Call | Stack-resolved? |
|---|---|---|---|
| Trial-end gate (auto) | `ProfileTab → CascadeGate` | `127` | ✅ cross-tab `getParent` |
| Phase banner | `ProfileTab → NutritionTargets` | `987` | ✅ |
| **Coach banner** | `CoachOutput` | `1008` | ⚠️ **see §2.3 — NOT in HomeStack** |
| Trial banner (S3) | scroll-to-top (self) | `1044` | n/a |
| Trial banner (S1/S2) | `ProfileTab → WeeklyCheckIn` | `1046` | ✅ |
| Deload banner | `CoachReview` | `1071` | ✅ in HomeStack (`RootNavigator.js:300`) |
| Free one-liner footer | `ProUpgrade` | `1114` | ✅ in HomeStack (`304`) |
| Hero "Start"/intent | `ActiveWorkout` | `821, 855` | ✅ (`295`) |
| Hero "View" | `PlansTab → RoutineDetail` | `1266` | ✅ |
| Hero "Blank session" | `BuildWorkout` | `1292` | ✅ (`294`) |
| Free "Find my plan" | `FreeStarter` | `1350` | ✅ (`306`) |
| Free "Browse plans" | `PlansTab → PlanLibrary` | `1356` | ✅ |
| TodayStrip cardio | `LogCardio` | `1435` | ✅ (`303`) |
| TodayStrip trend door | `ProgressTab → Analytics (focusWeightTrend)` | `1436` | ✅ |
| Pro teaser | `ProUpgrade` | `1445` | ✅ |
| Last-session card | `WorkoutHistory` | `1472` | ✅ (`297`) — but **generic**, not the specific session (§2.4) |
| Coaching nudge | `ProfileTab → WeeklyCheckIn` | `1550` | ✅ |
| Meso chip | block-shape **modal** (in-screen) | `1183` | n/a |

### 2.2 Reachable ONLY via Home (vs also via tabs)
- **Pre-workout intent + readiness capture** (`1665–1740`, COMP-008): the only
  surface that writes `intent / soreness24hBefore / sleepQuality / energyScore`
  onto a workout row. There is no tab equivalent.
- **First-run short-session starter** (COMP-013, `1210–1247`): the 15-minute
  Day-1 subset is reachable only from the hero first-run variant.
- **Repeat last session** (`handleRepeatLastSession`, `862–899`): the Repeat
  button on the last-session card is the only one-tap repeat in the app.
- **Free B2 micro-quiz on-ramp**: reachable from Home *and* Plans (`FreeStarter`
  registered in both stacks, `RootNavigator.js:306, 329`).
- **Block-shape sheet** (`BlockShapeCard` in a modal): only via the meso chip on
  Home's hero.
- TodayStrip weigh-in: the morning ritual entry; also reachable via BodyMetrics,
  but Home is the daily-glance surface.

### 2.3 Dead end / latent bug — coach banner target not in HomeStack
`HomeScreen.js:1008` calls `navigation.navigate('CoachOutput', …)` with a
**bare** name. `CoachOutput` is registered **only in ProfileStack**
(`RootNavigator.js:388`, as `GatedCoachOutput`); it is **absent from HomeStack**
(`285–308`). Every other cross-tab jump on Home uses the
`navigation.getParent()?.navigate('ProfileTab', { screen: … })` pattern
(e.g. `127, 987, 1046, 1550`). This one does not. The fresh-coach-review banner
is the **single highest-priority banner** in the whole stack and its primary tap
target does not resolve from the Home navigator. (The deload banner just below it
targets `CoachReview`, which *is* in HomeStack, so the contrast is stark.)
**Friction point #1.** Needs runtime confirmation, but static routing shows no
HomeStack route named `CoachOutput`.

### 2.4 Last-session card under-links
The last-session card (`1469–1530`) deep-links to the **generic**
`WorkoutHistory` list (`1472`), not to that session's detail/summary. A user who
taps their last session expecting to see *that* session lands on the whole
history. The card also shows tonnage in raw kg (`1517, 1524`) with no plain
takeaway — the F4 jargon gap from the prior audit, still present on Home.

### 2.5 "What do I do today?" answer path per persona
- **Besa free, no plan**: B2 starterCard → "Find my plan" (`FreeStarter`). Clear,
  single answer. ✅ (the prior F-state where free users were dumped is fixed.)
- **Eddie Pro, plan, training day**: hero "Start workout" — one tap, name +
  meso context visible. ✅ Best-in-class here.
- **Pro, plan, rest day**: hero still shows the *next* workout (no rest-day state
  — see §4 F-A). The schedule line may say "Next session: Thursday", but the hero
  contradicts it by inviting a start. Mixed signal.
- **Free, has trained, no plan, rest day**: glanceCard + last-session + teaser —
  static. No daily reason to return (§4 F-A).

---

## 3. FEEL — density, tone, first-five-seconds

### 3.1 Information density top-to-bottom
Top is deliberately light: header + greeting + one optional schedule line + at
most one banner. The **hero is the visual anchor** (xxl black workout name,
`1936–1941`), exactly the COMP-027 "one big thing" intent. Density then climbs:
TodayStrip (3 cells), teaser, last-session pills (duration/sets/kg). For Eddie
this is a good gradient — glance answer up top, depth below. For Besa the lower
half (tonnage in kg, "Week N of M · stop R short of failure" meso copy) is
jargon she can't price, but it sits *below* the action so it doesn't block her.

### 3.2 Copy tone
Warm-but-economical, British English, no em dashes (enforced in
`coachResponse.clean`, `40–51`). Greeting is human ("Up early.", "Late night.").
The free starterCard is reassuring ("Answer three quick questions and we'll set
you up…", `1344`). The Pro no-plan copy is honest about cloud-pull latency
("If you just signed in we may still be pulling your data… give it a moment",
`1311–1313`) — credibility over polish. Coach-brief lines are supportive without
filler ("Ease in. Don't try to catch up in one workout.", `1779`). The trial and
free one-liner copy is data-mirrored, never hype (`trialActivation.js:143–159`;
`coachResponse.js:406–444`).

### 3.3 What Besa sees first vs Eddie
- **Besa** (free, fresh): a calm compass icon, "Not sure where to start?", two
  buttons. Zero numbers, zero jargon. The screen *tells her what to do*. Strong.
- **Eddie** (Pro, established): schedule line + (maybe) a coach banner with a
  concrete number ("Calories adjusted to 2,450 kcal. Tap to see why.", `1019`) +
  the hero with meso context. Precision and credibility immediately. Strong.

The split is well-judged. The weak seam is the **in-between**: a free user who
*has* trained a few weeks gets a static, slightly cluttered mid-screen (glance +
teaser + last-session) with no forward pull.

### 3.4 Loading / empty / error states
- **Loading**: skeleton (hero-shaped + strip-shaped) on cold load (`1129–1136`),
  teaching the hierarchy before data lands. Good.
- **Empty (no plan)**: handled richly per tier (§1.3) — not a blank.
- **Error**: loaders swallow errors individually (`catch (_) {}` throughout) and
  `loadData` clears the spinner in `finally` (HP-7). Weight-log failure reverts
  optimistically + toasts (`583–588`). Plan-build failure toasts (`1322`). No
  global error surface — a failed loader just yields an empty section silently,
  which is safe but invisible (a returning user on a fresh device sees the Pro
  "No active plan… give it a moment" reassurance, the deliberate substitute).

---

## 4. GAPS / FRICTION (observed in code only)

**F-1 (HIGH) — Coach-review banner's tap target may not resolve from Home.**
`navigation.navigate('CoachOutput')` (`1008`) targets a route registered only in
ProfileStack (`RootNavigator.js:388`), not HomeStack. The top-priority banner's
primary action breaks the cross-tab pattern every other Home jump uses. See §2.3.

**F-2 (MEDIUM-HIGH) — No rest-day / daily-glance reason for the return loop.**
The hero always shows the *next* workout even on a scheduled rest day; there is
no "Rest day. Back tomorrow." state and **no streak / "X of Y this week" on
Home** (the streak strip lives on Progress per `int-04`). Free users get nothing
daily; Pro get the TodayStrip weigh-in ritual. Prior-audit F6/F7 remain
unaddressed on Home. The schedule line and the hero can also *contradict* on a
rest day (line says "Next session: Thursday", hero invites a start now).

**F-3 (MEDIUM) — Last-session card under-links + leaks jargon.**
Taps go to the generic `WorkoutHistory` list, not the session (`1472`); tonnage
shows as raw kg with no plain takeaway (`1517`). Besa can't tell if "12,400 kg"
is good. (Mirrors prior F4.)

**F-4 (MEDIUM) — `buildCoachBrief` runs on stale/zeroed inputs.**
`loadWeekStats`'s deload computation passes hard-coded placeholders
(`weeksSinceLastDeload: 99`, `avgJointDiscomfort: 0`, `hasOverMRV: false`,
`avgSoreness: 0` — `671–675`) "not tracked in local DB", so `shouldDeload` only
ever fires on the rep-fatigue signal. The coach brief's recover/caution branches
therefore lean on a partial picture. Functionally safe (conservative), but the
brief can claim "Recovery week" or stay silent on incomplete data, and the dual
deload paths (this approximation vs the real engine elsewhere) can disagree.

**F-5 (LOW-MEDIUM) — Banner JSX render order ≠ priority order; correctness rests
entirely on the boolean guards.** Phase renders first in JSX (`979`) though it is
lowest of the Pro-relevant banners; coach renders fourth though highest. The
mutually-exclusive `!showX` chain (`929–944`) keeps it correct today, but it is
fragile: any future banner added without threading the full `!showX` exclusion
list (as the free one-liner correctly does, `943–944`) breaks the
one-banner invariant. The free one-liner and Pro teaser can also *both* render on
the same screen (one is a banner, one is a card below the hero), so a free user
can see two Pro nudges at once (one-liner footer "Pro reads the full story" +
teaser "Add a coach…"), which slightly over-sells.

Additional smaller observations (noted, not fixed per CLAUDE.md):
- The +3s/+10s safety-net reloads (`263–269`) plus focus + cloud-version effects
  mean `loadData` can run 4–5× in the first 10s after sign-in; cheap but
  redundant SQLite churn.
- `loadTrialBanner` re-schedules the day-3 notification as a side effect of a
  render-data loader (`320–323`) — a loader doing scheduling work.
- The Pro no-plan "Build my plan" button (`1316`) has no in-flight disabled state;
  a double-tap could call `generateAndSavePlan` twice.

---

## 5. Surface inventory

**Screen files (1):**
- `src/screens/HomeScreen.js` (2,486 lines) — the screen, its sub-components
  (`CoachBriefCard` `1858`), helpers (`getGreeting` `49`, `buildCoachBrief`
  `1751`, `getRelativeDay` `1826`), and all styles.

**Components surfaced by Home (6):**
- `src/components/TodayStrip.js` (weight/steps/cardio strip, Pro)
- `src/components/BlockShapeCard.js` (block-shape modal)
- `src/components/ScreenHeader.js`, `Button.js`, `PressableCard.js`,
  `Skeleton.js` (`SkeletonCard`), `Sparkline.js` (via TodayStrip), `Toast.js`
  (`useToast`).

**Lib modules consumed (≈18):**
- `lib/database` (≈20 queries — workouts, sets, plan, routines, mesocycle,
  morning weight, coach output, feedback, ED flag)
- `lib/payments/cascade` (`stageOf`), `lib/trialActivation` (banner + unlock
  maths), `lib/coachResponse` (`buildFreeCoachLine`), `lib/sessionAdjustments`,
  `lib/dayKey` (`localWeekStartMs`), `lib/wellbeing` (`getWellbeingMode`,
  `isCalm`), `lib/planAutoGen` (`generateAndSavePlan`), `lib/algorithms`
  (`calculateTonnage`, `calculateWeeklyVolume`, `shouldDeload`,
  `VOLUME_LANDMARKS`, `MUSCLE_DISPLAY_NAMES`), `lib/seedRoutines`, `lib/errorLog`,
  `lib/sync` (`pullFromCloud`, lazy), `lib/notifications`
  (`scheduleTrialDay3Notification`, lazy), `lib/engineTelemetry` (lazy),
  `lib/activitySteps` + `lib/cardio/cardioEngine` (via TodayStrip), `lib/units`
  (via TodayStrip), `store/useAppStore`.

**Flags / gates:**
- Tier gate `tier === 'pro' | 'free'` throughout (TodayStrip Pro-only, teaser
  free-only, coach/trial banners Pro by data, free one-liner free by guard).
- `stageOf(userProfile) === 'pro_trial'` (trial banner, `313`).
- ED/calm suppression: `getOpenEdPatternFlag`, `getWellbeingMode`/`isCalm`
  threaded into trial banner, free one-liner, TodayStrip sparkline.

**AsyncStorage keys (dismissals / flags):** `@volyume_trial_end_gate_shown_{uid}`
(`120`), `@volyume_coach_banner_dismissed_{weekStart}` (`298`),
`@volyume_trial_value_banner_dismissed_{uid}` (`361`),
`@volyume_free_coach_line_dismissed_{uid}_{weekStartMs}` (`387`),
`@volyume_brief_dismissed_date` (`425`), `@volyume_home_firstrun_cue_{uid}`
(`444`), `@volyume_schedule_v1` (`463`),
`@volyume_phase_banner_dismissed_v1` (`497`), `@volyume_seen_coaching_nudge`
(`228, 621`), `@volyume_notification_prefs` (`348, 623`),
`@volyume_nutrition_targets` (`511`).

**Telemetry events fired from Home (1):**
- `first_session_choice` `{ choice: 'short' | 'full' }` via
  `engineTelemetry.track` (`HomeScreen.js:777`, fired `1218, 1240`).
- (Indirect: `lib/sessionAdjustments`, `lib/notifications`,
  `lib/activitySteps` emit their own telemetry when invoked from Home.)

---

### Render-order map (compact)
```
ScreenHeader("Train" + greeting)
  → schedule line (optional)
  → [ONE banner: phase | coach | trial | deload | freeLine]   (mutually exclusive)
  → skeleton (cold load only)
  → PRIMARY: continue-card | hero(meso chip, coach brief, first-run variant) | no-plan(Pro recover / free B2 starter + glance)
  → TodayStrip (Pro: weight·steps·cardio)
  → Pro teaser (free, ≥3 sessions)
  → last-session card (+ Repeat)
  → coaching nudge (Pro, check-in day)
  → modals: block-shape · change-workout · intent+readiness
```

### Five biggest friction points
1. **Coach-review banner target (`CoachOutput`) not registered in HomeStack** — the highest-priority banner's primary tap may not resolve from Home (§2.3 / F-1).
2. **No rest-day / daily-glance state** — hero always pushes the next session; no streak or "week so far" on Home; free users have no daily return reason; schedule line can contradict the hero (F-2).
3. **Last-session card under-links to the generic history list, not the session, and leaks raw-kg tonnage with no takeaway** (F-3).
4. **`buildCoachBrief` / deload signal runs on hard-coded placeholder inputs** (joint/soreness/MRV/since-deload all faked), giving a partial-picture brief that can disagree with the real engine (F-4).
5. **Banner JSX render order ≠ priority order; the invariant depends entirely on a hand-maintained `!showX` guard chain, and a free user can still see two Pro nudges at once** (one-liner + teaser) (F-5).

### Surface count
1 screen · 8 components (TodayStrip, BlockShapeCard, ScreenHeader, Button,
PressableCard, Skeleton, Sparkline, Toast) · ≈18 lib modules · 1 first-party
telemetry event · 11 AsyncStorage keys · 18 deep-link/navigation exits
(17 cross-screen + 1 in-screen modal).

*No code changed. All findings are code-verified observation for the founder;
F-1 (the `CoachOutput` route) is the one item warranting a runtime check.*
