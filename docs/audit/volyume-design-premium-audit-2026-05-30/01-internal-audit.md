# 01 — Internal design audit (from the code)

Everything here is derived from the actual repository on 2026-05-30, not
from assumption. Counts were produced by grep/rg over `src/` and verified
by hand where they drive a conclusion. Where a claim rests on a single
file, the file and line are cited so it can be checked.

The headline: **Volyume's design foundation is genuinely good. The gap to
"elite" is almost entirely one of *adoption and polish*, not of missing
infrastructure.** The theme already defines the things premium apps are
built on (semantic colour, a real type scale, motion tokens, elevation
tokens, a tuned spring-press primitive, an intent-named haptics
vocabulary). The problem is that the three highest-leverage parts of that
system are barely consumed by the 61 screens, and the parts that are
consumed are applied unevenly.

---

## 0. The single most important finding

The theme exports a semantic typography system — `type.display`, `type.h1`
… `type.caption` (`src/styles/theme.js:219-256`), each carrying the right
size, weight, line-height and letter-spacing together.

**It is imported and used in exactly zero screens and components.** Every
one of the 61 screens instead hand-assembles `{ fontSize: fontSize.md,
fontWeight: fontWeight.semibold }` pairs. There are 1,324 raw `fontSize.*`
references and 814 raw `fontWeight.*` references doing by hand what the
nine `type` roles were built to do once.

This one fact explains most of the "good but not elite" feeling. Premium
typography is not about the font — it is about *consistency of the type
ramp*: every heading the same tracking, every body the same line-height,
every caption the same colour-and-size pairing. Volyume defined that ramp
and then never plugged it in, so heading tracking, body line-height and
label spacing drift screen to screen even though the correct values exist
in the file.

The same shape repeats for motion and elevation (below). The work is not
"design a system". The work is "adopt the system you already built".

---

## 1. Design tokens — what exists and where

All tokens live in one file, `src/styles/theme.js` (310 lines). This is a
real strength: it is centralised, commented, and accessibility-aware
(`applyAccessibility()` swaps contrast/colour-blind/large-text variants at
boot). Inventory:

| Token group | Defined | Notes |
|---|---|---|
| `colors` | 38 values | semantic + raw, see §3 |
| `spacing` | xxs 2 → xxxl 48 (8 steps) | clean ramp, but no 1px/6px steps (see §5) |
| `radius` | sm 6, md 10, lg 14, xl 20, full 999 | tiered; no circle/decorative steps |
| `fontSize` | xs 11 → display 40 (8 steps) | sound modular-ish scale |
| `fontWeight` | regular 400 → black 900 (6) | well adopted (98.6%) |
| `lineHeight` | tight 1.2 → relaxed 1.6 | only consumed *inside* `type`, which nobody calls |
| `letterSpacing` | display -0.5 → caption 0.4 | only consumed inside `type` |
| `type` | 9 semantic roles | **0 usages** |
| `shadow` | sm / md / lg | **2 usages** total |
| `motion` | card 220, state 160, micro 90 | **~0 usages** (1 coincidental) |
| `volumeColors` | 4 status getters | used, good |
| `iconSize` | sm 16 → xl 32 | ~40% adoption |
| `withAlpha()` | helper | good, used to avoid hex-concat |

Centralisation grade: **A**. Adoption grade: **C+**, dragged down entirely
by `type`, `motion`, `shadow`, `iconSize`, and `radius` for non-standard
shapes.

---

## 2. Typography

- **Font:** the platform system font everywhere (San Francisco on iOS,
  Roboto on Android). No custom font is bundled — `app.json` has an empty
  fonts array and there are no `.ttf`/`.otf` assets in the repo. The only
  `fontFamily` overrides are `'monospace'` in `DebugLogScreen` and the
  crash screen. The locked `docs/DESIGN_SYSTEM.md` explicitly defers a
  custom font (`Inter` / `DM Mono`) to a "Stage 2 visual pass".
- **Scale:** `fontSize` xs 11 / sm 13 / md 15 / lg 17 / xl 20 / xxl 24 /
  xxxl 32 / display 40. A sensible ramp; body at 15 is one notch tighter
  than the 16-17 most premium apps use.
- **Weight:** the `fontWeight` token is well adopted — only 11 raw numeric
  weights remain (`CoachReviewScreen`, `AnalyticsScreen`,
  `SyncStatusBadge`). 98.6% compliant.
- **Tracking & line-height:** defined correctly (`letterSpacing.display
  -0.5`, `lineHeight.tight 1.2` for display, `1.5` for body) but **only
  applied through the `type` roles, which are never used.** So in practice
  almost no screen sets `letterSpacing` at all, and large headings render
  at the system default tracking (slightly loose) instead of the intended
  tight negative tracking. This is a real, visible premium gap.
- **Numerals:** `fontVariant: ['tabular-nums']` appears in a few data
  components (`Stepper.js:value`) but is not systematic. For an app whose
  own design doc says "numbers are the hero", tabular figures are not
  consistently applied to weights, reps, timers and set counts.
- **Raw `fontSize:` literals:** 68 across 28 files (chart labels, share
  card, a few badges). Minor next to the `type` gap.

---

## 3. Colour system

The palette is semantic and dark-mode-native. Base ladder (`theme.js:8-62`):

| Token | Value | Role |
|---|---|---|
| `background` | `#0D0D0D` | app base (deliberately not pure black — comment cites halation/astigmatism) |
| `surface` | `#1A1A1A` | cards, sheets |
| `surface2` | `#242424` | inputs, chips, secondary cards |
| `surface3` | `#2E2E2E` | skeletons, progress fills |
| `border` | `#6E6E6E` | 1px card/divider edges |
| `primary` | `#F59E0B` (amber) | the one accent |
| `success`/`warning`/`error` | green/amber/red | semantic states |
| text | `#FFFFFF` / `#9E9E9E` / `#9B9B9B` / `#727272` | 4-step hierarchy, all WCAG-checked |

Strengths: one accent, accessibility-verified contrast ratios baked into
comments, a single `scrim` token for every backdrop, a `withAlpha()`
helper that killed the fragile `colour + '55'` hex-concat pattern.

Two findings:

1. **The dark surface ladder is very compressed.** `background` → `surface`
   → `surface2` → `surface3` step by only `#0D → #1A → #24 → #2E` (about
   13, 10, 10 points of luminance). Premium dark apps separate elevation
   layers more legibly, usually with a slightly wider step *and* a faint
   warm/cool tint shift per layer rather than pure neutral greys. Right now
   a card on the background and a card-on-a-card read almost the same.
2. **There is a live conflict between the locked design doc and the
   shipped theme.** `docs/DESIGN_SYSTEM.md` (marked "approved direction")
   specifies primary = electric blue `#2979FF` and background `#0A0A0A`.
   The code ships amber `#F59E0B` on `#0D0D0D`, and `CLAUDE.md` repeatedly
   calls amber "the brand". The doc is stale; the amber is the real
   identity. **This must be resolved explicitly in the proposal** rather
   than left as two contradictory sources of truth.

**Dark mode:** there is only dark mode. No light theme exists. For this
product that is a defensible, even premium, choice (Whoop, Oura, Robinhood
after-hours all lead dark) — but the proposal should state it as a decision,
not an omission.

**Raw hex leakage:** 64 literal hex/rgba values across 16 files. Most are
contained and explainable (the `ShareCardScreen` builds an offline HTML
canvas that genuinely cannot read RN styles; that is ~31 of the 64). The
real offenders are a handful of `rgba()` banners in `HomeScreen`,
`NotificationSettingsScreen`, `ScanBarcodeScreen` that should use
`withAlpha(colors.*)` or the `scrim` token. There is **no CI rule**
actually enforcing "no hardcoded hex" despite the code comments implying
one — `eslint.config.js` has no such check.

---

## 4. Spacing and layout

An 8pt-ish system is clearly present and *well* adopted: 2,246 `spacing.*`
references vs 78 arbitrary pixel values across 30 files. The token ramp
(2/4/8/12/16/24/32/48) is sound.

The 78 violations cluster in two harmless-but-real places:
- **1px optical tweaks** (`marginTop: 1` appears 27+ times) — the ramp has
  no sub-2px step, so people hardcode it for baseline nudges.
- **Small gaps** (`gap: 3/5/6/10/14`) in dense data rows (`HomeScreen`,
  `ShareCardScreen`, `AnalyticsScreen`) where the 4→8→12 jumps feel too
  coarse.

Neither breaks the grid, but they signal the ramp could use one or two
intermediate steps for dense data UI.

Screen edge margins are generally `spacing.lg` (16). Safe-area handling
uses `react-native-safe-area-context` consistently.

---

## 5. Surfaces and depth

Depth is expressed **almost entirely flat**: layered background tokens +
1px borders, essentially no shadows. The `shadow` token (sm/md/lg) is used
in **2 places total** (`DiaryScreen` FAB + modal header). Everywhere else
that wants float either hand-rolls an inline shadow (`Toast`, `WelcomeScreen`,
`ProUpgradeScreen`, onboarding — 9 inline definitions, several hardcoding
`'#000'`) or uses no elevation at all.

This is partly deliberate — `DESIGN_SYSTEM.md` says "no drop shadows, depth
comes from layered backgrounds" and "no background blur (performance cost on
mid-range Android)". That is a legitimate position. But combined with the
compressed surface ladder (§3.1), the result is that the app reads as *very
flat* — cards, sheets and the background occupy nearly the same plane. The
premium-dark reference apps that go shadowless (Linear, Things) compensate
with a *wider, tinted* elevation ladder; Volyume currently has neither
shadows nor a wide ladder, so it lands flatter than intended.

**Gradient/blur availability:** `expo-linear-gradient` is installed but used
in exactly one screen (`ShareCardScreen`, the export image). `expo-blur` is
**not installed**. `@shopify/react-native-skia` is installed and used in one
place (`MacroRings`). So the toolkit for richer depth is mostly present
(gradient, Skia) but unused, and glass/blur is unavailable without adding a
dependency.

**Radius reality:** the radius token is well-tiered (modal 20 ≠ card 14 ≠
button — though Button actually uses `radius.lg` 14, same as cards) but 91
arbitrary `borderRadius` numbers appear across 44 files. Almost all are
either computed circles (`borderRadius: 18` for a 36px avatar) or tiny
decorative radii (1-5px for chart dots/bars) the token simply doesn't
cover. The fix is to extend the token (add `circle`, add a 2-4px step), not
to police call sites.

---

## 6. Motion and transitions

Motion is **craft-rich but built on the wrong engine and not tokenised.**

- **Engine:** `react-native-reanimated@3.10` is installed but has **zero
  runtime call sites** — every animation in the app uses the legacy RN
  `Animated` core API. This matters for the roadmap: the premium motion
  techniques (layout animations, shared-element transitions, gesture-driven
  springs at 120fps on the UI thread) are exactly what Reanimated exists to
  provide, and it is sitting unused.
- **What is animated, and well:** a custom `heroZoomTransition`
  (opacity + scale 0.92→1, 280/200ms) on the workout-entry screens
  (`RootNavigator.js:125-149`); a genuinely lavish 40-particle spring
  confetti on PR (`PRCelebration.js`); a multi-element staggered splash;
  `BottomSheet`/`Toast`/`PeekMenu` slide+fade with tuned cubic easing;
  a skeleton shimmer loop; an animated rest-timer bar.
- **Reduce-motion:** pervasively and correctly handled — every one of the
  ~15 animated surfaces guards on `accessibility.reduceMotion`. This is
  first-class and should be preserved through any rework.
- **The gaps:**
  - The `motion` token (card 220 / state 160 / micro 90) is **not used** —
    durations are hardcoded across 8 files (480, 320, 360, 280, 700, 750…),
    so timing is inconsistent screen to screen.
  - `heroZoomTransition` is the *only* custom screen transition; every other
    navigation push uses the platform default. There is no systematic
    entrance choreography for the everyday screens.
  - No list-item stagger, no shared-element transitions anywhere outside the
    one hero zoom.

So: the *peaks* of motion (PR celebration, splash) are excellent; the
*everyday* motion (screen-to-screen, list loads, state changes) is plain
and untokenised.

---

## 7. Iconography

- **Set:** `@expo/vector-icons` Ionicons, used exclusively (72+ files). One
  set, consistent — good.
- **Sizing:** the `iconSize` token (16/20/24/32) exists but only ~40% of
  icon usages reference it; the rest hardcode 14/16/18/20/24/40 ad hoc.
  Chip icons are 14, Toast 18, EmptyState 40 — a loose band, not a system.
- **Outline vs filled:** the documented convention (outline = available,
  filled = active/done) is *mostly* followed but not enforced; there are
  mixed cases.

Iconography is fine, not a premium liability. Tightening to the token and
the outline/filled rule is low-effort cleanup.

---

## 8. Press states and interaction feedback

This is the clearest "great primitive, partial adoption" story in the app.

- **The good primitive:** `PressableCard.js` implements exactly the press
  model premium apps use — spring scale to 0.97 on press-in (speed 30,
  bounciness 0), spring back with a 6-point overshoot on release, plus a
  subtle opacity dip to 0.92, all reduce-motion aware. Its own header
  comment name-checks "Apple, Linear, Whoop, Spotify". `Button` and
  (optionally) `Card` build on it. This is genuinely elite-grade.
- **The adoption gap:** `PressableCard` appears in **12 files**.
  `TouchableOpacity` appears in **72 files**, with `activeOpacity` scattered
  across **eight different values** (0.7, 0.75, 0.8, 0.82, 0.85, 0.88, 0.9,
  1 — counted: 30×0.85, 22×0.75, 19×0.8, 16×0.7, 11×0.88…). So most of the
  app gives a flat, inconsistent opacity-dip on press while a minority gives
  the crafted spring. Two different "feels" coexist, and the worse one is
  more common.

Closing this — routing the common tappables through one press primitive
with one feel — is one of the highest perceived-quality-per-effort changes
available.

---

## 9. Loading, empty, and error states

- **Skeletons:** `Skeleton.js` is well made (shimmer pulse 0.45↔0.85 over
  1.5s, reduce-motion static, `SkeletonCard`/`SkeletonRow` presets,
  `accessibilityRole="progressbar"`). Used on 12 data-heavy screens
  (Home, Plans, Coaching, Analytics-adjacent).
- **The tier gap:** 14 screens still show a bare `ActivityIndicator`
  spinner instead of a content-shaped skeleton (Food search, Food insights,
  My recipes, Exercise detail, Share card, Import). A spinner reads as
  "generic app"; a skeleton reads as "premium app". This is a clear,
  enumerable upgrade list.
- **Empty states:** `EmptyState.js` is strong (icon, title, text, primary +
  secondary CTA, a "ghost" preview variant) and backed by hand-built SVG
  illustrations (`Illustrations.js`: empty workouts/plans/PRs/chart). This
  is already premium-quality and just needs consistent use.
- **Error states:** mostly handled via `Toast` (variant `error`, 4s,
  left-accent bar) and inline messages. The Toast itself is well designed
  and is, notably, the one component that *does* float with a real shadow.
  There is a global crash screen (`App.js`) that is functional but visually
  plain (monospace stack on a flat background).

Loading/empty/error are **partially crafted**: the components are good, the
coverage is uneven.

---

## 10. Overall assessment

**Where the design language is strongest**
- One centralised, accessibility-aware token file.
- A semantic, contrast-verified, single-accent dark palette.
- An elite press primitive and an elite haptics vocabulary
  (`haptics.js`: intent-named, reduce-motion-gated, layered PR/finish
  sequences — genuinely best-in-class for the category).
- Excellent empty-state and skeleton *components*.
- First-class reduce-motion discipline throughout.

**Where it reads as unfinished / below the bar**
1. **Typography ramp not adopted** (`type` = 0 uses) → drifting tracking
   and line-height, the biggest single premium gap.
2. **Compressed, untinted, shadowless surface ladder** → the whole app
   reads flatter and less layered than premium dark references.
3. **Two press feels coexist** (spring in 12 files, scattered opacity in
   72) → inconsistent tactile quality on the most-touched elements.
4. **Motion untokenised and on the legacy engine** → inconsistent
   durations, no everyday-screen choreography, Reanimated unused.
5. **Loading tier split** → spinners on a third of data screens.
6. **System font, default tracking** → competent but not distinctive; no
   typographic signature.
7. **Stale design doc** contradicting the shipped identity (blue vs amber).

The encouraging read: items 1, 3, 4 and 5 are *adoption* problems with the
infrastructure already in the repo. The proposal's job is less "invent a
design system" and more "finish wiring in the one that's already here, then
add the few genuinely missing pieces (custom font, a tinted elevation
ladder, Reanimated-driven everyday motion)."
