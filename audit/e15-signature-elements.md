# E15 — Signature Interface Elements (PROPOSAL, greenlight per element)

Date 2026-07-02. Author: design lead. Status: **PROPOSAL — nothing is built.**
Greenlight is per element; I will not start any element without your yes on it.

Evidence base: `docs/signature-elements-evidence-2026-07-02.md` (verified at
HEAD `ee2d19d`, not assumed). Hard gates that bind every element below, stated
once so each section can be read against them:

- **Tokens only.** Durations, springs and easings come from `theme.js:600-640`
  (`motion.micro/state/enter/exit/hero`, `motion.springs.press/release/settle`).
  No magic-number timings.
- **Reduce Motion flattens everything.** The store flag
  (`accessibility.reduceMotion`) collapses every animation to an instant state
  change, matching the shipped `AnimatedRow`/`PressableCard` pattern.
- **Calm/ED variants are specified up front**, never bolted on. Where an element
  could carry celebration or a body-weight number, its calm/ED behaviour is part
  of the design, not an afterthought.
- **No JS-thread animation in new work.** Everything here is Reanimated 4 UI
  thread or static. The two existing JS-thread count-ups are a separate frozen
  allowlist (fit rule 4); this proposal does not add to it.
- **The mini-bar and the tab bar are profiled together on a mid-range Android
  device before either is approved for merge** — they occupy the same bottom
  band and render on every frame. This is a build-gate, called out again in §1
  and §2.

The through-line: **these are the persistent premium furniture, not
celebrations.** Restraint elsewhere is what lets them read as signature. Two of
the six (mini-bar, tab bar) are the flagship pair; two (CTA glow, rolling
numbers) are tightly-scoped accents; two (charts, materials) are a
quality-check and a written policy.

---

## 1. Active-session mini-bar — THE FLAGSHIP · Effort **M** · greenlight ☐

### What exists today (verified)
There is **no persistent affordance** for a live workout once you leave
ActiveWorkout. The only way back is the green "Session in Progress" Continue
card, and it lives **only on the Home screen** (`HomeScreen.js:1488-1504`);
navigate to Diary, Plans, Progress or You mid-session and the live workout
vanishes from view entirely. No tab-bar badge, no floating indicator exists
(grep-confirmed). The store already holds everything a mini-bar needs:
`activeWorkout`, `workoutExercises`, `currentExerciseIndex`, and the wall-clock
rest anchor `restTimerEndsAt`/`restTimerRemaining` (`useAppStore.js:1066-1414`),
all crash-restored on Home mount (`restoreActiveWorkout`, `:1306-1358`).

### Proposed design
A **docked bar pinned directly above the tab bar**, present on every tab
whenever `activeWorkout` is truthy (the exact `hasActiveWorkout` predicate Home
already uses, `HomeScreen.js:1071`), absent otherwise. It is a remote display of
the session store — it owns no session state of its own.

Layout (single row, 44pt tall + safe-area, full width, `surfaceElevated` fill +
`borderSubtle` hairline top, `shadow.sm`):
- **Left:** a small pulsing "live" dot (`colors.success`) + the current
  exercise name (`workoutExercises[currentExerciseIndex]`, `numberOfLines={1}`,
  ellipsised).
- **Centre-right:** when `restTimerActive`, a **ticking rest countdown**
  (`mm:ss`, tabular-nums) driven by the same self-subscribing pattern the
  in-workout `HeaderRestChip` already uses (`ActiveWorkoutScreen.js:148-165`) —
  only the countdown re-renders per tick, never the bar. When rest is not
  running, this slot shows set progress ("Set 3 of 4" from the session store),
  never a timer at 00:00.
- **Right:** a chevron/return affordance; the whole bar is one
  `PressableCard` → `navigation.navigate('ActiveWorkout')` (the existing route,
  `heroZoomTransition` gives the tap-card-expands feel already on record,
  `RootNavigator.js:236-260`).

Motion: the bar **slides up** on session start and **slides down** on
end/discard over `motion.state` with `springs.settle`, on the UI thread
(Reanimated). The live dot pulse is the existing `Skeleton`-style opacity loop
on `motion.pulse`. Entering/leaving never animates the tab bar itself — they are
independent siblings in a shared bottom container.

Truth & safety:
- Reads the store as the single source of truth; **rides the WK-1
  draft/snapshot machinery** by construction (it renders restored state, writes
  nothing). A set is never logged from the bar in v1 — tapping returns you to
  ActiveWorkout, where the existing draft/interruption machinery owns logging.
- **Collapses gracefully when the session ends**: on `finishWorkout`/discard the
  `activeWorkout` clear removes the bar in one slide-down; no orphaned timer.
- **Reduce Motion:** the bar appears/disappears instantly, the dot is static,
  the countdown still ticks (a countdown is information, not decoration — same
  reasoning as the M4 success hold).
- **Calm/ED:** nothing here is celebratory or weight/food-adjacent, so no
  suppression applies; the bar shows exercise + timer only, never a number that
  could pressure.

### Android-honest performance note
This bar renders on **every frame of every screen** while a session is live, so
the countdown MUST be isolated in its own self-subscribing child (the
`HeaderRestChip` pattern) or it re-renders the whole app shell each tick. The
pulse is a single opacity worklet. **Build-gate: profile the mini-bar + tab bar
together on a mid-range device (systrace / JS FPS during a rest countdown while
scrolling a long list) before merge.** If the countdown can't hold 60fps
isolated, fall back to a static "Resting" label + elapsed, no per-second tick.

### Why it's the flagship
This single element makes the entire app usable mid-workout — the Spotify
now-playing translation you named. It is the highest signature-to-effort ratio
in the set.

---

## 2. Tab bar elevation · Effort **M** · greenlight ☐

### What exists today (verified)
Stock `createBottomTabNavigator`, opaque `colors.tabBar` (#111111) fill,
hairline `tabBarBorder` top, height 60 + inset. The **only** active indicator is
the filled/outline Ionicons swap (`RootNavigator.js:534-543`). Wave 6 M1's
selection haptic on tab change already landed (`:510-520`); the M8 custom tabBar
has not. 03b §3.3a already specced this direction.

### One direction, with reasoning
**Anchored, not floating.** A floating dock only reads with blur or heavy
translucency; `expo-blur` is banned by the Android-first material rule (03b), and
a floating bar steals the list height the edge-to-edge inset work reclaimed. So:
keep the anchored bar on **translucent `surfaceElevated` fill + `borderSubtle`
hairline top**, and earn the elevation through **motion and material, not
position**:
- Replace the icon-swap indicator with a **custom `tabBar` component** carrying a
  **sliding amber pill** behind the active icon, driven by
  `withSpring(motion.springs.settle)` keyed to `state.index` (UI thread).
- **Icon micro-response on select:** settle-scale 1 → 1.06 → 1 on focus
  (`springs.press`/`release`), pairing with the M1 selection haptic already
  firing.
- **Under Reduce Motion the pill jumps instantly** (mirrors
  `useStackMotionOverride`), no scale.
- **Hide-on-scroll: no** (jittery on mid-range Android, unpredictable mid-set).
  Instead **hide the whole bar while ActiveWorkout is focused** —
  `setOptions({ tabBarStyle: { display: 'none' } })` on focus, restored on blur
  — so logging gets the full screen. **This is the natural companion to the
  mini-bar:** during a session the tab bar hides *and* the mini-bar is the
  docked furniture; leave the session and the tab bar returns, mini-bar gone.
- **Centre action button: no** (the log-food candidate is wholly Pro behind the
  Diary gate; a paywalled centre button violates the free/pro exposure rule).

Designed **together with the mini-bar**: they share the bottom band. When
ActiveWorkout is focused, tab bar `display:none` + mini-bar absent (you're on the
screen itself); on any other tab during a session, tab bar visible + mini-bar
docked directly above it. The two never both animate in the same frame.

### Android-honest performance note
A custom `tabBar` re-renders on every navigation; the pill spring must be a
worklet keyed to `state.index`, not a JS `Animated` value. **Same build-gate as
§1: profile the two together.** The `tabBarStyle` display toggle on ActiveWorkout
focus/blur is free (no animation).

---

## 3. Primary CTA glow tier · Effort **S** · greenlight ☐

### What exists today (verified)
No button carries a glow, gradient or shadow (`Button.js` — five flat variants +
the M4 state morph). Home's "Start workout" is a raw `TouchableOpacity`
`primaryBtn` inside the sole-elevated hero (`HomeScreen.js:1553-1566`). Skia is
already product code (MacroRings, share-card) but there is no glow/bloom anywhere.
03b sanctions **exactly one** Skia-glow CTA class: the Home hero Start button —
Log set and the Paywall CTA explicitly excluded. Two anti-glow precedents are on
record (GradientCard, ProSetupComplete "no glowing orb").

### Proposed treatment
**Exactly one button earns it: the Home hero "Start workout".** Not the coach
Apply action — the A1 one-amber rule already makes Apply the single amber fill on
its screen, and a glow there would compete with the "decisions land calm"
posture (§ and the CoachOutput design brief both want restraint on that screen).
Start Session is the app's front-door verb and the design audit's named "sole
filled-amber element" — it is the right and only home for glow.

Treatment (tokenised):
- A **soft Skia radial bloom** behind the Start button, amber
  (`colors.primary`), rendered on a small offscreen-free `Canvas` sized to the
  button + ~24px halo. Static by default; an optional **very slow 4–6s breathe**
  (opacity 0.6 ↔ 1.0 on a `motion`-derived long loop) — one glowing object in the
  entire app.
- **Reduce Motion:** static bloom, no breathe.
- **Calm/ED variant:** the bloom is **suppressed entirely** under calm mode or an
  open ED flag — the button falls back to the standard flat amber fill. Rationale:
  calm mode's whole point is a quieter surface; a breathing glow is the opposite
  register. (This is stricter than strictly necessary since Start isn't
  weight/food-adjacent, but it keeps calm mode coherent app-wide.)

Everything else stays on the standard `Button`. This is deliberately the
smallest element in the set — one surface, one glow, and a hard stop.

### Android-honest performance note
A static Skia bloom is one draw pass, cheap. The breathe is a single opacity
animation on a small canvas — trivial. The only risk is over-adoption; the guard
is a source-level pin (like the `springs.expressive` guard) that the glow
component has **exactly one importer**.

---

## 4. Rolling number tickers · Effort **M** · greenlight ☐

### What exists today (verified)
Two count-ups exist, both **JS-thread** (the frozen fit-rule-4 allowlist):
WorkoutSummary's `StatBox` rAF counter and MacroRings' `Animated.Value` listener
(`useNativeDriver:false`). The **Diary remaining-kcal hero already ticks** via
that MacroRings listener. Body-weight sites (`WeightTrendCard`, `TodayStrip`) are
**static** and 03b's hard ED rule says they must stay that way. `<RollingNumber>`
does not exist.

### Proposed design
Build one shared **`<RollingNumber>`** on Reanimated 4 (shared value +
`withTiming(motion.enter)` count-up in the theme's tabular `type.num()` style) —
a **count-up interpolation, not a per-digit slot machine** (digit columns
multiply animated nodes for no legibility gain). Under Reduce Motion it renders
the final value instantly.

**Exact surfaces that get it (and nothing else):**
- **WorkoutSummary tonnage** — retires the rAF counter (a fit-rule-4 win, moves
  it off the JS thread).
- **Diary remaining-kcal hero** — replaces the MacroRings JS-thread listener
  count-up (the second fit-rule-4 win).
- **Analytics weekly-volume numeral** — currently static; gains the tick on
  window change.

**Hard ED rule, built in as a test:** the **body-weight number never ticks.**
`WeightTrendCard`, `BodyMetrics` and `TodayStrip` weight cells render static
**always** — not merely under a flag. This ships as a source guard (03b §4 step
6) so no future edit can wire a RollingNumber into a body-weight site.

**Calm/ED:** the tick is neutral motion on non-weight numbers; it is not
celebratory, so no suppression beyond Reduce Motion. The body-weight exclusion is
absolute regardless of flag state.

### Android-honest performance note
A single interpolated numeral on the UI thread is cheap and is a **net win** — it
removes two JS-thread count-ups from the hot Diary and Summary paths. No new
per-frame JS work.

---

## 5. Chart quality check · Effort **S** (verdict) / **M** (if uplift) · greenlight ☐

### What exists today (verified) — and the verdict
`VolyumeChart` (308 lines) is **already close to the elite standard.** It has:
long-press-then-drag scrubbing with snap-to-point, per-point haptic and an a11y
announcement; an SVG gradient area fill; y-ticks, dashed rules, x-labels; a
smoothed-over-raw secondary series; and a stale-closure-safe latest-ref pattern.
The competitive audit already rates the trend surface **"PAR with MacroFactor"**
(`04-competitive.md:34`). There is an in-file decision that Skia buys nothing for
scrubbing because the chart is static during a scrub — only the crosshair moves.

**My verdict: it is already close — do not rebuild it, and do not adopt Victory
Native XL** (a second chart engine against an explicit in-file decision, whose
headline win — UI-thread data updates during gestures — buys nothing for a
static-during-scrub chart). Two *small, optional* uplifts are the only things
worth doing, and only if you want them:
1. A **once-per-mount entering draw-in** on the Analytics focal chart (path-trim
   via `strokeDasharray` interpolation over `motion.hero`, skipped under Reduce
   Motion) — the one place a chart entrance adds polish.
2. The **dashed goal-band overlay** the WeightTrendCard blueprint already
   deferred (`WeightTrendCard.js:19-20`) — a static enhancement, no motion.

Neither is required for "elite"; the chart is there. **Recommendation: take the
verdict (no rebuild) and treat the two uplifts as optional S-effort follow-ups.**

### Android-honest performance note
The draw-in is a one-shot path-trim, cheap. Staying on SVG (not adding Victory)
avoids a second render engine and a new dependency.

---

## 6. Materials policy · Effort **S** · greenlight ☐

A short written policy added to `theme.js` documentation so future work inherits
it. Proposed text (drawn from the tokens and 03b that already exist):

> **Volyume materials policy.** Elevation is communicated by the **surface
> ladder** (background → surface → surfaceElevated → surface2 → surface3), not by
> shadow, in the dark theme; the light theme uses shadows as the primary
> elevation cue. **Borders** are the hairline definition: `borderSubtle` inside
> cards, `border` where a control needs a WCAG-contrast edge. **Translucency +
> hairline border is the signature material** for docked/floating furniture (the
> mini-bar, the tab bar). **Blur is not used on Android and is not installed**
> (`expo-blur` declined, Android-first rule); on iOS, blur may be introduced only
> per-surface and only after profiling on a mid-range device — never as a default.
> One surface in the app may carry a **Skia glow** (the Home Start button, §3);
> no other glow, gradient orb or bloom is permitted (GradientCard/ProSetupComplete
> precedents). All surface motion uses the `motion.*` tokens; Reduce Motion
> flattens it.

This is documentation only — no runtime change — so it is the safest element to
greenlight and it locks the rules the other five inherit.

---

## Suggested greenlight order

1. **Materials policy** (§6) — zero risk, locks the rules the rest inherit.
2. **Mini-bar (§1) + Tab bar (§2) as a profiled pair** — the flagship; approve
   together, profile together, build together.
3. **Rolling numbers (§4)** — retires two JS-thread count-ups (net perf win).
4. **CTA glow (§3)** — the one accent; smallest, most self-contained.
5. **Charts (§5)** — take the "already close" verdict; the two uplifts optional.

Nothing here is built until you greenlight it. Elements 1+2 additionally do not
merge until the shared mid-range-device profile passes.
