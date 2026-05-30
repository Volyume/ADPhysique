# 02 — Premium design research summary

Live web research, 2026, across three angles: per-app design teardowns
(17 apps), premium typography + dark-surface technique, and motion +
haptics + React Native implementation reality. Sources are linked inline.
Reliability is flagged honestly: some claims rest on official design blogs
or platform specs, others on third-party teardowns or reviews. Where a
value matters to the proposal, its source tier is stated.

The point of this file is not to admire other apps. It is to extract the
*specific, repeatable techniques* that separate premium from average, so
Phase 3 can turn them into Volyume values.

---

## A. What actually separates premium from average

Across every credible source, the same handful of levers recur. None of
them is "use nicer colours". They are:

1. **Numbers treated as a first-class type concern.** The single most
   consistent premium signal in data apps. Stripe puts tabular figures
   (`tnum`) in every cell that holds money — "the brand's quiet financial-
   data signal". Robinhood animates numerals (rolling, colour-shifting
   green/red before settling). Whoop renders the hero metric oversized
   (~72pt-equivalent) so it reads at arm's length. Tabular digits exist so
   columns align at the decimal and a changing value doesn't jitter
   left-right as digit widths change.
   Sources: Stripe analyses (getdesign.md, "Behind the Gradient"); Apple
   `monospacedDigitSystemFont`; useyourloaf.com/blog/monospace-digits;
   925studios Whoop breakdown (third-party).
   **Direct relevance:** Volyume's own design doc says "numbers are the
   hero" but tabular figures are applied only sporadically. This is a
   high-leverage, low-cost win.

2. **Owning the typeface — or at least tuning the ramp hard.** Airbnb
   Cereal (Dalton Maag, 6 weights), Stripe Söhne (Klim), Headspace's custom
   Aperçu cut (Colophon), Monzo Sans. The fintech read is blunt: "running
   on Inter or Helvetica signals the brand hasn't yet invested in
   distinction". Custom commissions run $50K–$250K, so most premium-but-not-
   billion-dollar apps instead pick a strong screen face (Inter is "the #1
   UI typeface", SF Pro on iOS for free optical sizing) and tune tracking/
   line-height precisely rather than leave system defaults.
   Sources: Dezeen/AIGA (Cereal); Klim (Söhne); It's Nice That (Headspace);
   madegooddesigns.com/inter-font; fonts.google.com/specimen/Inter.

3. **A wider, lighter dark-elevation ladder — never pure black.** #000
   causes OLED smearing/halation and near-black "crush" that hides shadow
   detail; the cross-industry base is #0A0A0A–#121212 (Material's is
   #121212, Mercury's #1B1B1F). Crucially, premium dark apps build depth by
   *lightening each elevation layer*, because shadows barely read on dark.
   Material's documented white-overlay ladder: +5% white at 1dp, +7% at
   2dp, +8% 3dp, +9% 4dp, +11% 6dp, +12% 8dp, +14% 12dp, +16% 24dp. M3 has
   since moved to discrete "surface-container" tonal roles (lowest/low/
   default/high/highest). Accents are *desaturated* in dark mode (tone ~200,
   AA 4.5:1 on every surface) because saturated colour "optically vibrates"
   on dark.
   Sources: codelabs.developers.google.com/codelabs/design-material-darktheme;
   klwp.erikbucik.com/material/elevation; m3.material.io/blog/tone-based-
   surface-color-m3; design.google/library/material-design-dark-theme;
   us.ktcplay.com (near-black crush).
   **Direct relevance:** Volyume's ladder (#0D→#1A→#24→#2E) is in the right
   zone but compressed and pure-neutral, and it uses essentially no
   elevation differentiation. This is the cause of the "everything reads
   flat" finding in 01.

4. **Spring-physics motion, used with restraint.** The premium feel is
   velocity continuity — motion that "picks up right where the gesture
   ends" (Apple WWDC23). Linear easing is the tell of a cheap animation;
   natural deceleration (long out-ramp) is the tell of a premium one. And
   restraint is itself a premium signal: Apple HIG says *don't* animate
   frequent, standard interactions because the system already does, and
   over-animation adds latency. Linear's stated philosophy: "if most people
   don't immediately notice what changed, that's probably a good sign."
   Sources: developer.apple.com/videos/play/wwdc2023/10158; HIG motion;
   linear.app/now/behind-the-latest-design-refresh.

5. **One signature interaction that encodes a metaphor.** Things 3's Magic
   Plus button deforms as you drag it and becomes a heading at the margin;
   Arc's pinch-to-summarize maps a physical squeeze onto "make this
   shorter"; Apollo's tunable directional swipes with haptics; Headspace's
   breathing pacer (expanding circle, longer exhale to engage the
   parasympathetic system). The best apps each have *one* tactile moment
   that's theirs.
   Sources: culturedcode.com; arc.net/blog/arc-search; Wikipedia (Apollo);
   raw.studio (Headspace).

6. **Progressive disclosure on a calm canvas (the data-app pattern).**
   Whoop shows one number first, hides the biometric depth one layer down
   ("design must serve data, not aesthetics"), on an almost-black UI chosen
   functionally (data pops, less eye strain at 5am). Oura's redesign
   collapsed five metric-tabs into three intent-tabs (Today / Vitals / My
   Health). Levels turns a continuous glucose line into one comparable
   per-meal Zone Score.
   Sources: 925studios Whoop breakdown; ouraring.com/blog/new-oura-app-
   experience; App Store/review sources (Levels — review-tier).

---

## B. Typography — the specific values

**Recurring typefaces:** SF Pro (iOS system, free optical sizing + native
tabular-digit APIs), Inter (cross-platform default), Söhne-class grotesques
(design-led fintech), custom commissions at the top tier. General Sans and
Monument Grotesk recur as 2025 Inter alternatives.

**iOS Dynamic Type ramp (SF Pro, default size)** — the reference for a
native-feeling iOS app:

| Style | Size | Weight | Tracking | Line height |
|---|---|---|---|---|
| Large Title | 34 | Bold | −1.05px (≈−3%) | ~41 |
| Title 1 | 28 | Bold | −0.8px | ~34 |
| Body | 17 | Regular | −0.43px | ~22 (≈1.29) |
| Headline | 17 | Semibold | −0.43px | ~22 |
| Caption 1 | 12 | Regular | +0.12px | ~15 |

Apple's optical rule: **SF Pro Text ≤19pt, SF Pro Display ≥20pt.**
Source: gist.github.com/eonist (HIG table); codershigh.github.io.

**Material 3 ramp (Roboto, sp)** — the Android reference, abbreviated:
Display Large 57/64, tracking −0.25 (≈1.12 line-height); Headline Small
24/32; Title Medium 16/24 medium; Body Large 16/24 (1.5); Label Large 14/20
medium +0.1; Label Small 11/16 +0.5.
Source: github.com/material-components-android/Typography.md;
m3.material.io/styles/typography/applying-type.

**The conventions that matter, distilled:**
- Body size 16–17 (iOS 17, M3 16). Volyume's 15 is one notch tight.
- **Negative tracking on display** (−2% to −3% above ~28pt); neutral on
  body; **positive on small labels/captions** (+0.1 to +0.4). "Never apply
  negative tracking to body text." SF Pro does this automatically; a custom
  font must do it explicitly.
- **Line-height: ~1.1–1.2 on display, 1.4–1.5 on body.**
- **Tabular numerals** on anything that updates or stacks: iOS
  `.monospacedDigit()` / `monospacedDigitSystemFont`; CSS/RN
  `fontVariant: ['tabular-nums']`; Inter/IBM Plex/Roboto all expose them.
  Optionally a dedicated mono (DM Mono, JetBrains Mono) just for numbers.
Sources: learnui.design/blog/ios-font-size-guidelines; telerik.com (fintech
font strategies); numberanalytics.com (tabular figures).

---

## C. Dark surface & colour — the specific values

- **Base:** #0A0A0A–#121212. Never #000 (OLED smearing/halation, shadow
  crush). Volyume's #0D0D0D is correct.
- **Elevation by lightening, not shadow.** Either Material's white-overlay
  ladder (5/7/8/9/11/12/14/16% as above) or M3 discrete tonal surface-
  container roles. A premium ladder is background → surface → elevated, each
  ~5–16% lighter, often with a faint tint shift rather than pure neutral.
- **Accent discipline:** one accent, desaturated for dark (tone ~200),
  AA 4.5:1 on every surface it sits on.
- **Gradient/glass:** premium only when it grounds content in a real
  backdrop and is used on a *few* surfaces (visionOS materials adjust blur/
  vibrancy to the wallpaper; Apple's 2025 Liquid Glass refracts the
  background). Cheap when applied to every panel (perf/battery, contrast
  loss). Decorative gradients/orbs/soft-glow are explicitly the low-effort
  filler pattern in dark UIs — flat near-black + tonal elevation beats them.
Sources: as in §A.3 plus nngroup.com/articles/glassmorphism;
blog.logrocket.com (glassmorphism); en.wikipedia.org/Liquid_Glass.

This validates Volyume's existing "no decorative gradients, no orbs" rule
(in both `CLAUDE.md` and `DESIGN_SYSTEM.md`) as genuinely premium, not
limiting.

---

## D. Motion — the specific values

**Material 3 easing (cubic-bezier):**
- Emphasized decelerate `cubic-bezier(0.05, 0.7, 0.1, 1)` — entrances.
- Emphasized accelerate `cubic-bezier(0.3, 0, 0.8, 0.15)` — exits.
- Standard `cubic-bezier(0.2, 0, 0, 1)` — on-screen changes.

**Material 3 durations (ms):** short 50–200, medium 250–400, long 450–600,
extra-long 700–1000. Duration scales with distance/area travelled.

**iOS spring defaults (the premium baseline):** classic `.spring()` =
response 0.55, dampingFraction **0.825**, blendDuration 0. The 0.825 damping
is a balanced, barely-perceptible settle. Toward 0.5 = bouncy/playful;
0.95+ = smooth, no visible bounce. iOS 17 presets: `.smooth` (no bounce),
`.snappy` (slight) — the premium picks for a serious tool; `.bouncy` reads
playful.

**Reanimated `withSpring` equivalents:** defaults stiffness 100, damping 10,
mass 1. For premium feel, raise damping to 15–20 to kill visible
oscillation while keeping stiffness ~100–150; or use duration + dampingRatio
~0.8 to mirror iOS. (Physics props and duration props are mutually
exclusive.)

**Practical mapping for a dark utility app:**
- Taps/toggles/state: 100–200ms standard easing.
- Sheet/screen entrances: 300–400ms emphasized-decelerate.
- The one "important moment" transition per screen: emphasized 400–500ms.
- Reserve spring + emphasized for the important moment; standard fade for
  everything routine.
- **Do not animate** frequent standard controls; gate all scale/spin/
  parallax behind reduce-motion.
Sources: github.com/material-components-android/Motion.md;
m3.material.io/styles/motion; developer.apple.com (WWDC23 spring,
SwiftUI Animation.spring); docs.swmansion.com/react-native-reanimated.

---

## E. Haptics — the specific map

iOS generators and Apple's intended use:
- **Impact** (match to visual weight): Light = small elements; Medium =
  primary buttons / moderate elements; Heavy = large/heavy; Soft = mushy/
  elastic; Rigid = sharp quick tap.
- **Selection**: the discrete "tick" on a value moving between options
  (toggle, segment, slider detent, picker) — not for one-shot confirmation.
- **Notification**: Success (task completed), Warning (problematic
  condition / destructive guard), Error (operation failed).

Premium mapping: toggle/segment/detent → Selection; button tap/snap →
Impact (weight-matched); save/submit success → Notification Success;
validation/destructive → Warning; failure → Error; pull-to-refresh armed →
one Impact (not a stream).

**Over-use is the anti-pattern.** Apple: "avoid overuse on minor or frequent
actions"; haptic fatigue diminishes effectiveness. Never use a haptic as the
*sole* confirmation: the Taptic Engine is silent in Low Power Mode, when the
user disabled haptics, during Camera/dictation.
Sources: developer.apple.com/design/human-interface-guidelines/playing-
haptics; docs.expo.dev/versions/latest/sdk/haptics.

**Direct relevance:** Volyume's `haptics.js` already implements almost
exactly this map (intent-named, reduce-motion-gated, weight-matched, layered
PR/finish sequences). It is genuinely best-in-class for the category. The
only gap is reach — it's wired into ~8 files.

---

## F. React Native implementation reality (what's achievable, what bites)

What's available and good:
- **react-native-reanimated v3** — animations + gesture callbacks on the UI
  thread via worklets → jank-free 60/120fps; built-in layout animations
  (entering/exiting) and layout transitions cover staggered list entrances
  and shared-layout moves declaratively. *Installed in Volyume, currently
  unused.*
- **react-native-gesture-handler v2** — UI-thread gesture recognition,
  auto-workletized with Reanimated; bundled with Expo SDK 50+. *Installed.*
- **expo-haptics** — `impactAsync` / `notificationAsync` / `selectionAsync`
  map directly to the iOS generators. *Installed and well-used.*
- **expo-linear-gradient** — linear multi-colour gradients (native view).
  *Installed, used in one screen.*
- **@shopify/react-native-skia** — GPU gradients (linear/radial/conical/
  **mesh** via shaders), blur image filters, **backdrop-filter blur** (e.g.
  blur behind a bottom sheet), masks, custom shaders. *Installed, used in
  one component (MacroRings).*
- **expo-font** config plugin embeds fonts at build time (avoids first-frame
  font flash) — the right path for a shipping custom font.

What bites (the constraints that must shape the standard):
- **expo-blur on Android is the weak link.** Native blur is experimental;
  historically caused perf drops, flicker, glitches during screen
  transitions. The improved "BlurView V3" path only helps on **Android 12 /
  SDK 31+** and **requires wrapping content in a `BlurTarget`**; below that
  it falls back to the slow method. **Hard limit:** inside an RN `Modal`,
  Android can't blur content outside the modal (separate native window) — so
  glass-over-content behind a modal does not work on Android. `expo-blur`
  is **not currently installed** in Volyume.
  → *Standard must say: any blur degrades to a solid translucent fill on
  Android.*
- **Shadows are not cross-platform.** Only `shadowColor` is shared;
  `shadowOffset/Opacity/Radius` are iOS-only; Android has `elevation` (few
  presets, no blur-radius control) and `shadowColor` needs API 28+. Soft
  custom shadows everywhere degrade on mid-range Android.
  → *This validates Volyume's flat/shadowless leaning — but means the
  depth must come from the tonal ladder, not shadows.*
- **Mesh gradients need Skia** (expo-linear-gradient is linear-only). Skia
  linear gradients can band (dithering is a known concern).
- **120fps is not free.** Requires `CADisableMinimumFrameDurationOnPhone =
  true` in Info.plist; even then both Reanimated and Skia have open reports
  of 120→60 drops on ProMotion under load. Treat 120fps as something to
  measure on-device.
- **Android mid-range:** keep heavy animation on the UI thread (Reanimated/
  GH worklets); reserve Skia/shader effects for *moments*, not continuous
  scroll surfaces.
Sources: docs.swmansion.com (Reanimated, Gesture Handler);
docs.expo.dev/versions/latest/sdk/{haptics,blur-view,linear-gradient,font};
github.com/expo/expo issues 23239/44165; shopify.github.io/react-native-
skia; reactnative.dev/docs/shadow-props; github.com/facebook/react-native
issue 32703.

**Net implementation posture for Volyume:** Reanimated v3 + Gesture Handler
for all everyday motion (emphasized-decelerate entrances, ~0.8 damping
springs); Moti only where declarative brevity helps; expo-haptics kept tight
to the existing intent map; Skia for any gradient beyond linear / for a
single backdrop-blur moment if wanted; expo-blur avoided unless the Android
12+ `BlurTarget` + solid-fill-fallback cost is accepted; expo-font config
plugin for the custom face; `CADisableMinimumFrameDurationOnPhone` set with
on-device 120fps verification. Depth comes from the tonal ladder, not
shadows, which is both the premium-dark technique *and* the Android-safe one.

---

## Reliability flags (honest sourcing)

- **Strongest (official / design-publication / platform spec):** Linear,
  Airbnb, Stripe, Headspace, Robinhood, Things 3, Gentler Streak, Apollo,
  Whoop; all Material/Apple/Expo/Reanimated/Skia values.
- **Mixed (third-party teardown / press):** Monzo, Notion (web-biased),
  Arc (reviews + SwiftUI repros), Oura (official blog unfetchable), the
  Whoop "72pt" figure and Linear's exact px tracking (third-party excerpts).
- **Weak (review-only, design specifics unverified):** Calm, Letterboxd,
  Future, Levels. Their *product* ideas (atmosphere-over-UI, the tri-dot
  mark, coach-chat-as-product, the Zone Score) are usable; their typographic/
  motion specifics are not citable and are not relied on in Phase 3.
- A few Apple HIG / Google Design / m3 pages returned 403 to the fetcher;
  their values were corroborated via the Material Components Android repo,
  Compose/Flutter source, and the LearnUI/eonist HIG tables.
