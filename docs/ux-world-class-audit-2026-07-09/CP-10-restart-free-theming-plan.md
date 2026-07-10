# CP-10 — Restart-free theming: investigation + build plan

**Authority.** D16 (`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md:193-198`):
"CP-10 restart-free theming: BUILD. Full architectural change so the theme
becomes a live, reactive value across all screens. Proceeds via a plan-first
investigation (blast radius, options, risk, staged rollout) before the build
itself; the investigation is a step of the approved build, not a gate to
re-ask." **The build itself is pre-approved.** This document is that
investigation. It ends with a small number of genuinely open sub-decisions
(section 8) that D16's wording does not resolve — everything else here is
ready to execute on founder "go" for stage 1.

**Source finding.** `docs/design-usability-audit-2026-07-09/coverage-06-competitive-hps.md:237-254`
(CP-10): Appearance, Larger text, Higher contrast and Colour-blind-safe
palette all require a full app reload; `SettingsDisplayScreen.js:28-53`
documents why in its own comment; every toggle calls `promptRestartForA11y`
(`:33-53,92-98,210-216,230-236,247-253`). Reduce-motion is the one toggle
that already applies instantly (`:258-269`).

---

## 1. Current-state map (how it actually works today)

### 1.1 The token module: mutable objects, mutated once at boot

`src/styles/theme.js:1-9` states the mechanism in its own header comment:
`colors` and `fontSize` are exported as **mutable objects** so
`applyAccessibility()` can swap their values in place, but only if that
happens *before* any screen module's `StyleSheet.create()` runs. After that,
"the values are effectively frozen (RN's StyleSheet.create copies primitives
at creation time)."

- `colors` (`theme.js:175`) — spread from `baseColors`, then
  `Object.assign`-mutated by `applyAccessibility` (`theme.js:400-445`):
  reset to `baseColors` (`:402`), then light-palette override (`:413-418`),
  then higher-contrast (`:421-423`), then colour-blind-safe (`:427-429`).
- `fontSize` (`theme.js:375`) — same pattern; larger-text multiplies every
  step ×1.2 (`:432-444`).
- `resolvedTheme` (`theme.js:285`) — a **module-level `let`**, not an
  object; reassigned wholesale each `applyAccessibility` call (`:411`).
- `shadow.sm/md/lg` opacity (`theme.js:404-406, 415-417`) — also mutated
  in place per call, same freeze-at-`StyleSheet.create`-time exposure.
- `type.*` (`theme.js:488-556`), `stateColors`, `volumeColors` (`:660-675`)
  are **getters**, not baked values — but a getter accessed *inside* a
  `StyleSheet.create()` call still only fires once, at that call's
  evaluation time, because `StyleSheet.create` executes at module load.
  The getter pattern only pays off for call sites that re-evaluate it later
  (inline JSX, function bodies) — see 1.4.

### 1.2 Who calls `applyAccessibility`, and when

Exactly one call site drives the token mutation in the running app:
`App.js:128-141` (`bootstrapAccessibility`), invoked from
`bootstrapVisualSystem` (`App.js:143-147`), invoked from the
`useEffect` at `App.js:412-416`. The sequencing is deliberate and load-bearing:

1. `App.js` imports `RootNavigator` and `PRCelebration` **lazily**
   (`require(...)` inside the render body, `App.js:908-920`), specifically so
   their (and every screen's) `StyleSheet.create()` calls do not run at
   top-level `import` time.
2. `themeReady` (`App.js:397`) gates the entire UI: until the
   `bootstrapVisualSystem().finally(() => setThemeReady(true))` effect
   resolves, `App()` renders only a hard-coded placeholder View
   (`App.js:898-902`, deliberately not using theme tokens, "so the
   transition is invisible").
3. Once `themeReady` flips, `RootNavigator`/`PRCelebration`/`Toast`/
   `FeedbackSheet`/`AppAlert`/`PostLapseSheet` are `require()`-d for the
   first time (`App.js:909-920`), which is the moment every downstream
   screen and component module evaluates its `StyleSheet.create()` — by
   then `colors`/`fontSize`/`shadow` already carry the user's saved
   preference.

Test-only theme test suite exists (`src/styles/__tests__/theme.test.js`),
asserting `applyAccessibility` produces the right palette/contrast ratios;
`theme.js:342-350` (referenced) is where `resolvedTheme` itself is asserted.

`SettingsDisplayScreen.js` calls `setAccessibilityPref` (Zustand,
persisted to AsyncStorage — see 1.4), **not** `applyAccessibility`
directly — the token mutation only happens again on the next cold boot,
via `bootstrapAccessibility`'s `loadA11yPrefs()` read
(`src/lib/accessibilityPrefs.js`).

### 1.3 Why Reduce Motion is already instant — and why that is a different mechanism, not proof the others are a small fix

Reduce Motion does **not** go through `theme.js` at all. It is a genuinely
separate architecture:

- Persisted the same way as the other four (`accessibility.reduceMotion` in
  the Zustand `useAppStore` slice, `store/useAppStore.js:1796-1827`,
  `setAccessibilityPref` is a generic setter for any key on that object).
- But **consumed** via a direct Zustand hook subscription in every
  motion-driving component, e.g. `Toast.js:54`
  (`useAppStore(s => s.accessibility?.reduceMotion)`), `RootNavigator.js`
  `SplashScreen` (`:1513`), `App.js:391` (feeds `PRCelebration`'s `subdued`
  prop, `:940`). Each of those components **re-renders** when the flag
  flips, because it is a live Zustand selector, not a static import.
- The static `motion.*` **duration numbers themselves are never mutated** —
  `Toast.js` branches at each call site instead: `duration: reduceMotion ? 0
  : motion.state` (`:119,125,164,170,181`). The reactivity lives in
  per-call-site conditional logic in application code, not in the token
  module.

**Conclusion for the plan:** "one toggle escaped the pattern" is true in
outcome, but the escape route was a parallel, purpose-built plumbing
(store subscription + runtime branch at every consuming call site), not a
generic fix to `theme.js`. Reduce Motion cannot simply be copied onto
`colors`/`fontSize` — its shape (a single boolean, ~10 call sites) is far
smaller than the colour/type surface (see section 2). It is, however, good
evidence that Option (a) below (full reactive read pattern) is exactly the
right shape of fix, since it is what Reduce Motion already does per-toggle.

### 1.4 Read patterns already in the codebase, ranked by how "live" they already are

Not all `colors.*`/`fontSize.*` reads are equally frozen. Measured by
scanning every file that imports `styles/theme` (script in section 2):

1. **Frozen forever** (until reload): any token read that occurs textually
   inside a module-scope `StyleSheet.create({...})` call. This is the
   majority case (180 files).
2. **Frozen but NOT via `StyleSheet.create`**: module-scope `const X = {
   ...colors.foo }` object literals evaluated once at import — the same
   freeze mechanism, different syntax. 18 such objects found (list in
   section 2.3), e.g. `Card.js:22-29` (`TONES`/`SURFACES`), `Toast.js:39-48`
   (`DEFAULTS`, bakes `colors.success/error/warning/primary`).
3. **Already reactive-shaped, but not wired to anything that re-renders**:
   function **default-parameter values**, e.g.
   `VolyumeChart.js:53-69` (`color = theme.primary`, `axisColor =
   theme.border`, …). JS re-evaluates a default parameter expression on
   every call where the arg is omitted, so these already read the current
   `colors` object value on every render **once something forces that
   component to re-render**. Same for inline JSX props like
   `MacroRings.js:317-323` (`tint={colors.macroProtein}`) and
   `RootNavigator.js:1495-1505`'s `NavigationContainer theme={{ ...
   colors.primary ...}}` object — it is rebuilt fresh on every render of
   `RootNavigator`'s function body, because it is inline JSX, not a
   module-scope constant.
4. **Fully live today**: `reduceMotion` only (section 1.3).

Class 3 is the important nuance: a large amount of the app's colour surface
is **already** re-evaluated at call time. The reason nothing visibly changes
today without a reload is that **nothing currently triggers a re-render**
after `applyAccessibility` mutates `colors` — there is no store field or
context tied to "theme changed" that any component subscribes to. This
also means a **latent bug exists today**: 153 of 193 theme-consuming files
(section 2) mix class-1/2 frozen reads and class-3 live reads of the *same*
mutable `colors` object. If anything ever causes ONE such component to
re-render after boot for an unrelated reason (e.g. a screen focus event) its
class-3 reads would already reflect new values while its class-1/2 (baked
background/border colours) would not — a partial, per-component "tear" that
is possible today, just not observed because no code path currently forces
such a re-render before the user reloads anyway.

### 1.5 The one place that already branches on `resolvedTheme`

`docs/design-usability-audit-2026-07-09/coverage-01-light-theme.md:187-188`
records: "Zero components or screens in the whole app branch on
`resolvedTheme`" except one. `Card.js:19,136` is that one file: its base
style spreads `shadow.card` only `resolvedTheme === 'light'`
(Materials Policy, `theme.js:617-630`, LT-3). `Card.test.js` is the only
test file using an `isolateModules` + `applyAccessibility(theme)` +
re-`require` pattern to test both theme branches in isolation
(`Card.test.js:19-34`) — see section 4.3 for why this generalises.

---

## 2. Blast radius — measured, not guessed

All counts below exclude `__tests__` files and were produced by grepping
`src/` on 2026-07-10.

| Metric | Count |
|---|---|
| Non-test `.js` files under `src/` | 487 |
| Files importing `styles/theme` | 193 |
| Files calling `StyleSheet.create` | 181 |
| …of which also import `styles/theme` | 180 |
| Top-level screen files (`src/screens/*.js`) | 85 |
| Direct component files (`src/components/**/*.js`, non-test) | 109 |
| Total `colors.*` token references in `src/` | 4,883 |
| Total `fontSize.*` token references | 651 |
| Total `...type.*` role spreads | 1,214 |

### 2.1 Freeze-class breakdown (per file, script-measured)

Classifying every theme-importing file by whether its `colors`/`fontSize`/
`type`/`resolvedTheme`/`shadow`/`stateColors`/`volumeColors` references sit
textually inside a `StyleSheet.create(...)` call or outside it:

| Class | Files | Meaning |
|---|---|---|
| Tokens used **only** inside `StyleSheet.create` | 35 | Fully frozen; nothing to salvage without editing |
| Tokens used **both** inside and outside `StyleSheet.create` | 153 | Mixed — the majority; migrating means finding and converting the baked half without breaking the already-live half |
| Theme imported, but for non-colour tokens only (`spacing`/`radius`/`withAlpha` etc. with no direct token match) | 5 | Low risk, likely just spacing/radius, still needs the pass |
| Theme imported, **zero** `StyleSheet.create` calls at all (already call/render-time only) | 13 | Already migration-shaped: `AnimatedEntrance.js`, `AnimatedRow.js`, `GradientCard.js`, `Illustrations.js`, `PressableCard.js`, `RollingNumber.js`, `Sparkline.js`, `SvgBarSparkline.js`, `hooks/useProgressData.js`, `lib/notifications/trainingReminders.js`, `screens/SettingsDataScreen.js`, `screens/SettingsHealthScreen.js`, `screens/SettingsPrivacyScreen.js` |

**193 = 35 + 153 + 5**, and the 13 are a subset already counted inside those
(they still import theme; they just have no `StyleSheet.create` to migrate).

### 2.2 Special cases confirmed by direct inspection

- **Card's light-only shadow** (`Card.js:19,131-137`) — the one
  `resolvedTheme` branch in the app; must move from "read at import" to
  "read reactively" for Light Mode to flip live. Already has a dedicated
  test (`Card.test.js`) that generalises (section 4.3).
- **Navigation theme** — `RootNavigator.js:1480-1508`: the
  `NavigationContainer`'s `theme={{ dark: resolvedTheme !== 'light',
  colors: { primary: colors.primary, ... } }}` prop is inline JSX inside a
  function component body, so it is **already** re-built on every
  `RootNavigator` render (class 3, section 1.4). It only needs
  `RootNavigator` itself to re-render on a theme change — it is not a
  `StyleSheet.create` site.
- **StatusBar** — `App.js:926-929`: same shape, inline JSX reading
  `resolvedTheme` directly in `App()`'s render body. Already re-render-ready
  once `App()` itself re-renders on a theme change (it currently does not,
  because `resolvedTheme` is a plain module `let`, not store/context state).
- **Charts (`VolyumeChart.js`)** — explicitly **not** Skia today: its own
  comment (`:16-20`) records the chart is SVG-based and "swappable to Skia
  later" only if a static-during-scrub case ever needs it; the "one Skia
  glow" policy in `theme.js:20-22` is about the Home Start button, a
  separate surface. `VolyumeChart.js` mixes class 3 (default-parameter
  colour props, `:53-69`, already reactive-shaped) with a frozen
  `StyleSheet.create` block for its tooltip chrome (`:327-335`, baked
  `backgroundColor`/`borderColor`/text colours).
- **Skia consumers that DO exist**: `ShareCardScreen.js`, `MacroRings.js`
  (food macro donut rings), `ProgressPhotoCompare.js`,
  `BeforeAfterShareSheet.js`, `src/lib/shareCard/drawShareCard.js`.
  `MacroRings.js` follows the same mixed pattern as `VolyumeChart.js`
  (class-3 inline tint props at `:317-323`, plus a frozen
  `StyleSheet.create` block at `:338+`).
- **`drawShareCard.js` is out of scope** — it does not import `theme.js` at
  all. It defines its own fixed literal dark palette
  (`drawShareCard.js:32-36`, `bg0/bg1/bg2/surface/accent/gold/text...`),
  documented as a deliberate exception in `docs/rules/styling.md:18`
  ("Skia canvas, documented palette"). Share/progress cards are meant to
  render in the brand's dark palette regardless of the user's in-app theme
  choice (export/screenshot consistency) — CP-10 must not touch this file.
- **Native widgets are out of scope, structurally** — `src/widgets/widgets.js`
  (Android `RemoteViews`, `react-native-android-widget`) is a second
  documented styling.md exception (`:16-17`): its header comment
  (`widgets.js:22-30`) states it is a **literal manual copy** of
  `theme.js` values ("Widgets render outside the app's theme pipeline
  (RemoteViews)... keep in step manually"). These widgets render in a
  separate OS process/surface the RN JS runtime does not control; they
  cannot be made live-reactive by any in-app theming change. Same applies
  to `modules/live-activity` (iOS Live Activity Swift,
  `VolyumeRestTimerLiveActivity.swift`) and `modules/rest-timer-live`
  (Android foreground-service Kotlin) — separate native UI, own design
  system, no path to JS-driven reactivity without native code changes that
  are outside this JS-architecture change.
- **Toast** (`Toast.js`) — already has the store-subscription plumbing
  pattern for `reduceMotion` (`:54`) that section 4 proposes reusing for
  colour; but its `DEFAULTS` tint map (`:39-48`) and its
  `StyleSheet.create` block (`:245-289`) are both frozen today.
- **18 module-scope const object maps** baking `colors.*` outside
  `StyleSheet.create` (class 2, section 1.4), found across:
  `Card.js` (`TONES`, `SURFACES`), `Toast.js` (`DEFAULTS`), `Button.js`
  (`VARIANTS`), `TextField.js` (`SURFACES`), `RootNavigator.js`
  (`stackOptions`), `NutritionTargetsScreen.js` (`CONFIDENCE_ICONS`,
  `CONFIDENCE_COLORS`), `CardioHistoryScreen.js` (`INTENSITY_LABEL`,
  `CARDIO_SOURCE_LABEL`), `HomeScreen.js` (`READINESS_ICON`),
  `ManualBuilderScreen.js` (`STATUS_COLOR`), `AnalyticsScreen.js`
  (`SEVERITY_STYLE`), `ProgressPhotoCompare.js` (`POSE_LABEL`),
  `StreakWeeksSection.js` (`GLYPH`), `CoachBriefCard.js` (`BRIEF_ICON`,
  `BRIEF_BORDER`). These are invisible to a migration that only greps for
  `StyleSheet.create` — each needs converting to a function or getter.
- **No existing `useTheme`/`ThemeContext`/`ThemeProvider`** anywhere in the
  codebase (`grep -r "useTheme|ThemeContext|ThemeProvider"` → no
  application-code hits). Option (a) below is a genuinely new primitive,
  not a partially-built one.
- **Reanimated 4.1 / Skia 2.2.12 / New Architecture (Fabric) is enabled**
  (`app.json:19` `newArchEnabled: true`; `package.json`:
  `react-native-reanimated ~4.1.1`, `@shopify/react-native-skia 2.2.12`,
  `react-native 0.81.5`, `react 19.1.0`). Relevant to section 5.

---

## 3. Options

### (a) Full reactive theming — `useTheme()` hook / context + themed-style factories

**Mechanism.** Promote `resolvedTheme` (and, by extension, the resolved
`colors`/`fontSize`/`shadow` tables) from a module-level mutable
singleton into a piece of state a React subscriber can react to — either
React Context (a `ThemeProvider` at the `App.js` root wrapping
`RootNavigator`) or a Zustand slice (`useAppStore`'s existing
`accessibility` object already holds the four raw preference booleans/
strings — a derived `theme`/`resolvedColors` selector could sit alongside
it). Every `StyleSheet.create({...})` site that currently bakes tokens at
module scope is rewritten to a hook call inside the component
(`const t = useTheme()`) building the style object at render time
(`StyleSheet.create` can still be used for the **static shape**, e.g.
`useMemo(() => StyleSheet.create({...}), [t.resolvedTheme, t.higherContrast,
...])`, or dropped in favour of plain memoized objects — see section 5).

**Cost.** Touches all 180 `StyleSheet.create` files plus the 18 module-scope
const maps plus the Card/nav/chart special cases — i.e. effectively the
whole blast radius in section 2. Every touched file needs its style
derivation moved from module scope into the component body (or a
themed-style factory called from the component body), and ideally a
per-theme regression test (section 4.3). This is the D16-approved end
state and the only option that satisfies "a live, reactive value across all
screens" literally.

**Risk.** Large surface area, but mechanical and low-judgement per file
once the primitive exists (a Sonnet-tier migration once Stage 0's
architecture is hands-on-built — see section 6). The main risk is
inconsistent execution across ~180 files without disciplined tooling
(codemod + lint rule) and per-file test coverage (see risk register #5, #9).

### (b) Remount-based pseudo-instant: force a top-level re-mount / re-evaluate modules

**Mechanism as specified.** Keep `StyleSheet.create` baked as today, but on
toggle, force the whole app to unmount and remount (e.g. bump a `key` prop
on the top-level tree) so that module-scope code re-executes and re-bakes
against the new tokens.

**This does not work as described, and must be said plainly.** Changing a
`key` prop on a React element forces React to unmount and remount that
**component instance** — it does **not** cause Node's/Metro's/Hermes'
module registry to re-evaluate the **module** a second time. `require()`
(and static `import`) caches a module's exports after first evaluation for
the lifetime of the JS engine instance; a `StyleSheet.create({...})` call
sitting at module top level runs exactly once per process, and a React
remount re-invokes the component **function**, not the **module file**. So
a `key`-bump remount would re-run every screen's component function (cheap)
but would **not** re-run any top-level `StyleSheet.create(...)` call — the
`styles` constant each file closes over is still the frozen one from first
import. The only way to force actual re-evaluation of module-scope code in
RN today is a genuine JS-engine reload — which is exactly what
`Updates.reloadAsync()` (the mechanism `promptRestartForA11y` already uses,
`SettingsDisplayScreen.js:43`) does. **Option (b), taken literally, is not
a lighter version of (a); it is the status quo with extra complexity and
no benefit** — it should not be pursued.

### (c) Hybrid: live token objects mutated in place + one forced top-level re-render

**Mechanism.** Keep `colors`/`fontSize` as the same mutable objects they are
today (no new primitive needed for storage), but (1) additionally promote
`resolvedTheme`-changed into something a subscriber can react to (a
Zustand field bumped alongside `applyAccessibility`), and (2) force one
top-level re-render (e.g. re-mounting `RootNavigator`'s subtree via a `key`
prop tied to a "theme epoch" counter) after mutating the objects in place.

**Which reads survive this, measured:**
- **Survive (need no per-file edit):** class-3 reads (section 1.4) —
  default-parameter colour props, inline JSX object/prop reads, the
  `type.*`/`stateColors`/`volumeColors` getters **when accessed inline, not
  inside `StyleSheet.create`**. These are already live once *some* ancestor
  re-renders; a forced top-level remount re-invokes every component
  function underneath, so all 153 "mixed" files' class-3 halves would
  update correctly on the forced remount.
- **Do NOT survive (still frozen, need the same per-file edit as option a):**
  every `StyleSheet.create({...})` call (180 files) and every module-scope
  `const X = { ...colors.foo }` (18 objects, section 2.2) — because a
  forced remount re-runs component **functions**, not the **module body**
  that defined `styles`/`TONES`/`DEFAULTS` at import time. `colors.primary`
  being mutated in place does not change what `styles.title.color` already
  equals — RN's `StyleSheet.create` captures the *string value* at call
  time, not a live reference back into `colors`.

**Conclusion.** Because the frozen class (`StyleSheet.create` + module
consts) is where the bulk of the app's actual colour/background/border
surface lives (every card background, every screen background, every
border), option (c) converges to needing almost the same per-file edit set
as option (a) anyway — it does not meaningfully shrink the blast radius, it
only changes how the *coordination* ("has the theme changed") is signalled.
Its only genuine saving versus (a) is that `colors`/`fontSize` do not need
a new storage primitive (they can keep being mutated in place) — the
migration work per `StyleSheet.create` site is the same either way (move
the read to render time). It is a smaller, riskier fix that still requires
the full per-file pass, so it buys little.

---

## 4. Recommendation

**Option (a), full reactive theming, done as a staged migration onto a new
`useTheme()` primitive.** Reasoning:

1. Option (b) does not work as specified (module-scope code cannot be
   re-evaluated without an actual engine reload) — it is not a real
   alternative.
2. Option (c) does not reduce the per-file work versus (a): the expensive
   part (rewriting ~180 `StyleSheet.create` call sites and 18 module
   constants) is identical either way, because that is where the frozen
   surface actually lives. Its only advertised saving (no new storage
   primitive) is real but small, and it leaves `colors`/`fontSize` as an
   ambient mutable global with no single subscribable "did the theme
   change" signal — which is architecturally worse to build screens
   against going forward, and harder to unit-test than a hook return value.
3. (a) is literally what D16 asked for ("a live, reactive value across all
   screens") and is the only option with a clean testing story: a hook
   return value can be asserted directly; a mutated-in-place global cannot
   be asserted for "did this component actually pick up the change"
   without forcing and inspecting a re-render anyway.
4. It reuses a pattern already proven in this codebase for Reduce Motion
   (component subscribes to reactive state, branches at render/call time)
   — just generalised from one boolean to the full token set, and unified
   into one hook instead of ad hoc `useAppStore` selectors scattered per
   file.

The new primitive: a `useTheme()` hook (in `src/styles/` or a new
`src/hooks/useTheme.js`) backed by a Zustand slice (fits the existing
"one store" convention, `CLAUDE.md` section 1) holding the four raw
preferences (mirroring `accessibility.theme/largerText/higherContrast/
colorBlindSafe`, which already live in `useAppStore` — see
`store/useAppStore.js:1796-1827`) plus a memoized derived
`{ colors, fontSize, shadow, resolvedTheme, type }` object recomputed only
when one of those four preferences changes (i.e. `applyAccessibility`'s
existing pure resolution logic, called from a selector/`useMemo` instead of
mutating a module singleton). `theme.js`'s token **tables** (base/light
palettes, HC/CVD modifier tables, base font sizes) stay exactly as they are
today — only the **read mechanism** changes.

---

## 5. Staged rollout

Each stage lists: scope, what coexists mid-migration, verification, and
degradation behaviour of the reload prompt.

### Stage 0 — Build the `useTheme()` primitive (hands-on, architecture-level)

- Add the Zustand-backed theme slice + `useTheme()` hook. Pure addition:
  `theme.js`'s existing mutable exports (`colors`, `fontSize`,
  `resolvedTheme`, `applyAccessibility`) stay untouched and continue to
  work exactly as today for every file not yet migrated — this is the
  coexistence mechanism for every later stage.
- `App.js`'s boot sequence keeps calling `applyAccessibility` for the
  *unmigrated* half of the app (so the reload-then-bake path keeps
  working); it additionally seeds the new hook's initial state from the
  same `loadA11yPrefs()` read, so both systems start in sync at boot.
- Verification: new unit tests for the hook/slice (derives the same
  palette `theme.test.js` already asserts, for all four preference
  combinations); no visual change yet (nothing consumes it).
- This stage is architecture-level and safety-adjacent to nothing
  ED/consent/billing-related — but per `CLAUDE.md`'s agent tier rule, this
  is exactly the kind of spine work Claude does hands-on, not a subagent
  dispatch.

### Stage 1 — Primitives first

Migrate, in order: `Card.js` (resolve the `resolvedTheme` shadow branch
live — the one existing special case), `Button.js` (`VARIANTS` const),
`TextField.js` (`SURFACES` const), `Toast.js` (`DEFAULTS` const +
`StyleSheet.create`, reusing its existing store-subscription pattern from
`reduceMotion`), `Chip.js`, `SettingsPrimitives.js`, `BottomSheet.js`,
`Skeleton.js`, `PressableCard.js` (already class-3 only — cheap),
`ScreenHeader`/`BackHeader`/`ModalHeader` (per `docs/rules/styling.md:140-155`
these are the only three sanctioned screen chrome shapes, so this covers
navigation-adjacent chrome for every screen at once).

- Coexistence: primitives render inside screens that have **not** migrated
  yet. A migrated `Card` inside an unmigrated screen is safe — `Card`'s own
  background/border go live, the screen's own background stays frozen
  until *that* screen migrates. This is a visually-contained mix (a card
  updates, its screen background does not), which is a materially smaller
  "tear" than the worst case in the risk register (#1) and is acceptable
  as a mid-migration state, not a shipped end state.
- Verification: extend the `Card.test.js` per-theme `isolateModules`
  pattern to each migrated primitive (dark/light/HC/CVD/largerText
  snapshot assertions). Full `npm run lint && npm test` after each file.
- Reload-prompt degradation: no change yet — `promptRestartForA11y` still
  fires for all four toggles; primitives going live has no user-visible
  effect until a screen that uses them is also migrated (Stage 2+).

### Stage 2 — Root chrome

`App.js` (StatusBar + the `themeReady` gate — replace the one-shot
`resolvedTheme` module read with the hook so status-bar style/colour flips
live) and `RootNavigator.js` (`NavigationContainer theme={{...}}`, already
class-3/inline — needs the hook wired in so `RootNavigator` itself
re-renders on a theme change; `stackOptions` const, section 2.2, also
migrates here since it lives in this file).

- **This stage must ship resolvedTheme and colour together** — see risk
  register #7. Splitting them (colour goes live before `resolvedTheme`
  itself is reactive) would let card backgrounds flip while the status bar
  and native nav chrome stay on the old scheme.
- Verification: manual on-device check (device-only testing rule,
  `CLAUDE.md` workflow section) — toggle Appearance and confirm status bar
  + tab bar + header all flip together, not staggered.

### Stage 3 — Screens by traffic

85 screens, batched roughly 10-15 per pass, highest-traffic first: Home,
Diary/food logging, workout logger (`ActiveWorkoutScreen`, `BuildWorkout`,
`ManualBuilderScreen`), Progress, Settings family, then the remainder.
Each screen's `StyleSheet.create` moves to a render-time factory; each
screen's own module-scope const maps (`NutritionTargetsScreen`
`CONFIDENCE_ICONS/COLORS`, `CardioHistoryScreen` labels, `HomeScreen`
`READINESS_ICON`, `ManualBuilderScreen` `STATUS_COLOR`, `AnalyticsScreen`
`SEVERITY_STYLE`, `ProgressPhotoCompare` `POSE_LABEL`, `StreakWeeksSection`
`GLYPH`, `CoachBriefCard` `BRIEF_ICON/BORDER`) get the same fix as the
primitives in Stage 1.

- Coexistence: a migrated screen sitting in the same tab stack as an
  unmigrated one is fine — navigation is between whole screens, so there is
  no partial-screen tear, only a whole-screen one (migrated screen flips
  live, unmigrated screen still needs reload) until the batch finishes.
- **ED-safety / consent exclusion (risk register #10):** any screen
  importing `wellbeing.js`, `edPatternDetector.js`, or touching the
  Article-9 consent gate gets a manual-review checkpoint in addition to the
  standard test pass — the diff for those screens must be visually
  mechanical only (no logic touched), verified by a second read of the
  diff before merge.
- Verification per batch: `npm run lint && npm test`, plus the per-theme
  snapshot pattern for any screen with a genuine visual branch (most will
  not have one — `Card` absorbed the one existing branch already).
- Reload-prompt degradation (see Stage 5): once *every* screen a given
  toggle can affect has migrated, that toggle's `promptRestartForA11y` call
  is removed. Larger text's dependency set is `fontSize`-consuming files
  only (a strict subset of all `colors`-consuming files, since some screens
  use no direct `fontSize.*`, only `type.*` roles which route through
  `fontSize` anyway) — in practice Larger text and Appearance/HC/CVD share
  almost the same file set, so no meaningful independent early win exists
  here; see the founder decision in section 8.1 for whether to invest in
  proving it out per-toggle regardless.

### Stage 4 — Skia/chart consumers

`VolyumeChart.js`, `MacroRings.js`, `ProgressPhotoCompare.js`,
`BeforeAfterShareSheet.js`. Dedicated stage because Skia `Paint` objects
are a **fourth** potential freeze class not yet measured (section 5.3):
a `useMemo(() => Skia.Paint(...), [])` with an empty dependency array would
freeze a paint's colour independent of the RN style system entirely. This
stage's first task is an audit (grep for `useMemo` within these four files
and inspect dependency arrays) before any fix, since the current
investigation did not exhaustively verify memoization behaviour inside
these Skia call sites.

- `drawShareCard.js` is explicitly **excluded** — confirmed out of scope
  (section 2.2), no changes.
- Verification: visual on-device check of the macro rings and progress-
  photo compare screen in both themes, plus toggling mid-session if the
  new architecture allows it by this stage.

### Stage 5 — Retire the reload prompt

Once Stage 3+4 cover every screen a toggle's dependency set touches,
remove that toggle's `promptRestartForA11y` call in
`SettingsDisplayScreen.js` and update the note text (`:275-277`). Given the
near-total overlap between the four toggles' file sets (previous stage),
in practice this is likely a single cutover removing all four calls
together, rather than four independent removals — see section 8.1.

### Stage 6 — Full regression pass

Extend `src/__tests__/screen-mount.test.js` (currently mounts ~74 screens
once) to mount under all four theme/preference combinations (dark, light,
dark+HC, dark+CVD, light+HC, +largerText permutations as feasible) instead
of once under the default. This is the generalisation of the
`Card.test.js` `isolateModules` pattern (section 1.5) to app-wide scale —
reset the module registry, call `applyAccessibility`/set the new hook's
seed state for that combination, then mount, per combination, per screen.

---

## 5.1 Performance and memory

- **`StyleSheet.create` vs plain objects under Fabric/New Architecture**
  (`app.json:19` confirms New Arch is on). RN's `StyleSheet.create` no
  longer serves the same "generate a numeric ID for the bridge" purpose it
  did under the old bridge architecture — under Fabric, style resolution
  happens via the C++ shadow tree regardless of whether the JS object came
  from `StyleSheet.create` or a plain literal; both are flattened per
  render. The main remaining benefit of `StyleSheet.create` is **object
  identity stability** across renders (so `React.memo`/`shouldComponentUpdate`
  comparisons on `style` props short-circuit) — which is exactly what a
  themed-style factory must preserve via `useMemo` keyed on the resolved
  theme identity, not recomputed on every unrelated re-render.
- **Re-render cost of a theme flip.** With Option (a), a flip touches every
  mounted component that calls `useTheme()` — in the worst case (every
  screen migrated) this is a full-tree re-render, comparable to a
  navigation-stack remount. On a mid-range Android device (the app's
  documented target, `CLAUDE.md` "Android-first rule") this is a one-off
  cost paid only when the user opens Settings and flips a toggle — not a
  hot path, not per-frame, not per-scroll. The risk is not the flip itself
  but **unmemoized themed-style factories being recomputed on unrelated
  re-renders** (e.g. every keystroke in a form re-deriving a whole
  screen's style object) — this must be a `useMemo` with the theme
  identity (or the four raw preference values) as the only dependency.
- **Reanimated interaction.** `react-native-reanimated ~4.1.1` worklets
  that close over `colors.primary` (or any token) at worklet-creation time
  run on the UI thread and do **not** automatically observe a JS-thread
  object mutation or a JS-thread re-render — colours consumed inside
  `useAnimatedStyle`/spring configs must be pushed across the bridge as
  `useSharedValue`s kept in sync with the resolved theme (a `useEffect`
  syncing the shared value whenever `useTheme()`'s output changes), not
  read directly from `colors.*` inside a worklet. This is a genuine, not
  yet inventoried, sub-surface: any spring/animated colour interpolation
  (press states, gesture-driven surfaces) needs this bridge pattern
  specifically, distinct from the plain-JS render-time fix used everywhere
  else. No exhaustive count of Reanimated-driven colour usages was taken in
  this pass; flag for Stage 1/3 file-by-file discovery (any file importing
  both `react-native-reanimated` and `styles/theme` warrants a specific
  check).
- **Skia interaction.** Covered in section 5, Stage 4 — Skia `Paint`
  objects must be recreated (not memoized past the theme's lifetime) on a
  theme change; this is architecturally the same shared-value/dependency-
  array concern as Reanimated, applied to canvas paints instead of animated
  styles.

---

## 6. Risk register

1. **Half-migrated screen looks torn mid-flip.** A screen with some
   migrated primitives (live background) and its own unmigrated
   `StyleSheet.create` (frozen background) shows two different theme
   generations simultaneously the instant a flip is forced. *Mitigation:*
   migrate whole screens atomically (never leave one screen half-frozen
   across a release), and keep `promptRestartForA11y` active for any
   toggle whose dependency set is not 100% migrated (Stage 5 gate).
2. **List/FlatList re-render storms.** A theme flip re-rendering every
   mounted component at once could jank a long, already-mounted list
   (Diary rows, Exercise Library, Plan history) if list rows are not
   memoized. *Mitigation:* `React.memo` row components with the theme
   identity passed as a single stable prop, not spread token-by-token.
3. **Reanimated stale colour on the UI thread.** Worklets closing over a
   token value at creation time never observe a later change.
   *Mitigation:* the shared-value bridge pattern (section 5.1); explicit
   file-by-file check for any Reanimated + theme co-import (not yet
   inventoried, flagged as Stage 1/3/4 discovery work).
4. **Skia `Paint` memoization freezing colour independent of RN's style
   system entirely.** A `useMemo(() => ..., [])` inside a Skia canvas
   component is invisible to a `StyleSheet.create`-focused migration audit.
   *Mitigation:* Stage 4's dedicated audit before any fix in those four
   files.
5. **Module-scope const maps are invisible to a naive "find
   `StyleSheet.create`" migration.** 18 identified (section 2.2); a
   migration that only handles the 180 `StyleSheet.create` files ships a
   half-fix where, e.g., Toast's tint colour (`DEFAULTS`) stays on the old
   theme after a flip even though its background/border go live.
   *Mitigation:* the file list in section 2.2 is the explicit checklist;
   each is in scope for the primitive/screen stage that owns its file.
6. **Native surfaces can never be live from JS, and the migration must not
   silently misrepresent that.** Android RemoteViews widgets, iOS Live
   Activity, the rest-timer foreground service — a user flipping theme
   mid-session will still see these on their previous fixed palette
   (already true today; `widgets.js` is manually kept in sync separately).
   *Mitigation:* this document explicitly scopes them out (section 2.2);
   any future claim that CP-10 delivers "live theming everywhere" must
   carry this documented exception, not silently omit it.
7. **`resolvedTheme` and colour must migrate together, not colour alone.**
   If Stage 2 (root chrome) lags behind colour going live in screens, the
   status bar/native nav chrome could show the old scheme while card
   backgrounds show the new one. *Mitigation:* Stage 2 is sequenced
   immediately after Stage 1 (primitives), before any screen-level
   migration (Stage 3), specifically to prevent this.
8. **Unmemoized themed-style factories regress performance on low-end
   Android** (the app's documented primary platform). Recomputing a
   screen's full style object on every unrelated re-render (e.g. every
   keystroke) is a real risk if the codemod is purely mechanical without a
   memoization discipline. *Mitigation:* the `useMemo`-keyed-on-theme
   pattern is mandatory per file, enforced by code review/lint, not
   optional per author judgement.
9. **Test blind spot: only `Card.test.js` currently tests both theme
   branches.** The other ~179 `StyleSheet.create`-consuming files have zero
   light/HC/CVD-theme test coverage today. A mechanical migration without
   new per-file tests could silently break Light Mode (or HC/CVD) on a
   screen nobody re-checks, regressing only for the minority of users on
   those settings. *Mitigation:* Stage 6's extension of
   `screen-mount.test.js` to all four combinations is a **hard exit
   criterion** for calling the migration done, not an optional nice-to-
   have; individual high-traffic screens additionally get the
   `Card.test.js`-style per-theme snapshot in their own stage.
10. **Accidental logic drift on ED-safety/consent-adjacent screens under
    cover of "just restyling."** `wellbeing.js`/`edPatternDetector.js`-
    touching screens are INVIOLABLE per `CLAUDE.md` section 2; a
    theming-only diff must not touch their logic. *Mitigation:* explicit
    manual-review checkpoint for any screen importing those modules (Stage
    3), diff must be visual-only, verified by a second read before merge —
    same rule as any other change to those files.

---

## 7. Effort estimate (agent-task-sized chunks)

| Stage | Scope | Est. chunks | Notes |
|---|---|---|---|
| 0 | `useTheme()` primitive + slice + tests | 1 (hands-on, architecture-level — not delegated per the agent-tier rule) | Blocks every later stage |
| 1 | ~13 primitives (Card, Button, TextField, Toast, Chip, SettingsPrimitives, BottomSheet, Skeleton, PressableCard, 3× header components, + generalised Card.test.js pattern) | 2-3 | Sonnet-tier, well-specified once Stage 0 exists |
| 2 | App.js root chrome + RootNavigator nav theme + stackOptions | 1 | Hands-on given root-level/blast-radius sensitivity |
| 3 | 85 screens in ~7 batches of 10-15, incl. the 8 remaining module-scope const maps | 7 | Sonnet-tier mechanical per batch; ED-safety-touching screens get an extra manual-review pass, not extra chunks |
| 4 | Skia/chart audit + fix (4 files) | 1 | Starts with the memoization audit named above |
| 5 | Retire reload prompt(s) in SettingsDisplayScreen | 1 (small) | Gated on Stage 3+4 completion |
| 6 | Full regression: extend screen-mount.test.js to all theme combinations | 1-2 | Hard exit criterion, not optional |
| **Total** | | **~14-16 chunks** | Plus the manual-review pass over ED/consent-adjacent screens folded into Stage 3, and on-device verification passes per `CLAUDE.md`'s testing rule at Stages 2, 3 (sample), and 6 |

---

## 8. Founder decision points (not already answered by D16)

D16 approves the build and the investigation-then-build sequencing; it does
not resolve these:

**8.1 — Toggle cutover shape.** Given the near-total file-set overlap
between the four toggles (section "Stage 5"), should the reload prompt be
removed for all four toggles in a single cutover once Stage 3+4 finish
(simpler, avoids ever shipping "some toggles instant, some still prompt,"
which itself is a confusing intermediate UX), or is it worth the extra
tracking overhead to prove out an independent early win for one toggle
(e.g. Larger text, if its dependency set can be shown to be strictly
smaller) even though this investigation found the overlap to be nearly
total? Recommend: single cutover, but this is a genuine product-feel
choice, not a technical constraint.

**8.2 — Scope boundary on "all screens."** D16's language is "a live,
reactive value across all screens." This plan reads that as "all
RN-rendered screens" and explicitly excludes native-process surfaces
(Android home-screen widgets, iOS Live Activity, the rest-timer foreground
service) and the dark-locked share-card renderer, on the grounds that (a)
they structurally cannot be live from the JS thread, and (b) two of them
are pre-existing, documented styling.md exceptions. Confirm this scope
reading is what "all screens" was meant to cover, since it is the kind of
boundary that should be an explicit call rather than an assumed one.

**8.3 — `StyleSheet.create` retained for layout, dropped for colour, or
dropped everywhere.** The migration as staged keeps `StyleSheet.create`
for static layout properties (flex, padding shape, position) and only
moves colour/type-size-dependent values to a render-time themed factory,
to preserve the object-identity-stability performance benefit noted in
section 5.1. An alternative, more invasive approach would drop
`StyleSheet.create` entirely in favour of inline style arrays everywhere.
The staged plan assumes the former (smaller diff per file, preserves an
existing convention); flag in case there is an appetite for the larger
rewrite instead.

---

## Evidence index (files read in full or in relevant part during this investigation)

- `src/styles/theme.js` (full)
- `App.js` (full)
- `src/screens/SettingsDisplayScreen.js` (full)
- `src/components/Card.js` (full)
- `src/components/__tests__/Card.test.js` (full)
- `src/components/Toast.js` (full)
- `src/lib/shareCard/drawShareCard.js` (header + colour constants)
- `src/widgets/widgets.js` (header)
- `src/lib/widgets/writer.js` (partial)
- `src/navigation/RootNavigator.js` (theme-relevant sections)
- `src/store/useAppStore.js` (accessibility slice)
- `src/components/VolyumeChart.js` (theme-relevant sections)
- `src/components/food/MacroRings.js` (theme-relevant sections)
- `docs/design-usability-audit-2026-07-09/coverage-06-competitive-hps.md:200-278`
- `docs/design-usability-audit-2026-07-09/coverage-01-light-theme.md:180-230` (referenced)
- `docs/rules/styling.md` (full)
- `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md:193-208`
- `package.json` / `app.json` (dependency + New Architecture flag versions)
