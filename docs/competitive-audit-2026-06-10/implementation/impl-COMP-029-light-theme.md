# COMP-029 — Token-derived light theme (opt-in) — implementation blueprint

> Round-2 blueprint per `impl-00-shared-brief.md`. Approved spec seed:
> `../competitive-audit-03-master-proposals.md` COMP-029 (Impact 6 ·
> Effort 6 · **[FOUNDER SIGN-OFF — brand decision]**). Code ground truth
> verified against source on 2026-06-10. **No code changes in this
> document — blueprint only.**

---

## 1. Best-in-market bar

1. **Linear (the method).** Rebuilt theming on the **LCH colour space**
   because it is perceptually uniform: instead of hand-defining **98
   variables per theme they define three — base, accent, contrast — and
   derive everything else**, including the surface-elevation steps, and
   get "super high-contrast themes for users who need it" for free
   ([Linear — How we redesigned the Linear UI, part II, Mar 2024](https://linear.app/now/how-we-redesigned-the-linear-ui);
   summary verified via search extract, direct fetch blocked 403).
   The lesson is not "adopt LCH at runtime" — it is *derive, don't
   hand-paint*: every light token below is computed from the dark
   token's documented role and contrast target, not eyeballed.
2. **Material 3 tonal surfaces (the mapping discipline).** M3 derives
   light/dark from the same tonal palettes; every colour role has a
   guaranteed-contrast **`on-`** partner ("any color roles starting
   with 'on-' are guaranteed to have sufficient contrast with the
   corresponding color role"), and surface emphasis **inverts
   direction**: in dark, higher emphasis = lighter; in light, higher
   emphasis = darker greys under a near-white surface
   ([M3 color roles](https://m3.material.io/styles/color/roles);
   [Tone-based surfaces](https://m3.material.io/blog/tone-based-surface-color-m3)).
   Volyume's missing `on-` token is the single biggest code finding (§4d).
3. **Radix Colors (the amber answer).** Radix's 12-step scales pair
   light/dark by *role per step*, and document that for **Yellow and
   Amber, the solid step 9 takes dark foreground text** — most hues take
   white, amber does not
   ([Radix — Understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)).
   This is independent confirmation of the design below: bright amber
   stays as the fill in both themes; the ink on it is always dark.
4. **MacroFactor (the fitness proof).** Ships **System / Light / Dark**
   as a simple three-way choice under More → Theme; System follows the
   phone ([MacroFactor help centre](https://help.macrofactorapp.com/en/articles/73-switch-between-dark-and-light-mode);
   extract via search, direct fetch 403). The category's
   most data-dense nutrition app proves charts and macro rings survive
   both modes.
5. **Strava (the cost lesson, in reverse).** Dark mode was "one of the
   most requested" features for years; CEO Michael Martin said **"all
   the UI elements had to be changed or altered to ensure Dark Mode
   doesn't feel clunky"** — thousands of assets, because the original
   palette was hard-coded with no token system
   ([Strava press, Jun 2024](https://press.strava.com/articles/available-today-strava-releases-dark-mode);
   [TechRadar](https://www.techradar.com/health-fitness/fitness-apps/strava-is-finally-adding-dark-mod-ai-leaderboards-family-plans-and-more)).
   Volyume is the mirror image: near-total token discipline (§4d) means
   the second theme costs days, not quarters. Doing it *now*, while the
   surface area is ~60 screens, is the whole point.

**The single best:** Linear — because it makes the theme a *derivation*
from documented roles and contrast targets, which is exactly what
Volyume's WCAG-annotated token table already is on dark.

## 2. What fails

- **Whoop: dark-only as a paid-user grievance.** Multiple long-running
  community threads: "easier on the eyes during daytime", eye-strain
  complaints, "why is there no light mode option for an app that costs
  almost $400 per year?"
  ([Whoop Community 1034](https://www.community.whoop.com/t/light-dark-mode/1034),
  [13924](https://www.community.whoop.com/t/light-mode-dark-mode-eye-strain/13924),
  [6711](https://www.community.whoop.com/t/light-mode-dark-mode/6711) —
  latest activity Feb 2026). The complaint channel scales with the
  paying base. Volyume's round-1 verdict stands: slow-burn, predictable,
  cheap to pre-empt.
- **Strava: waiting until it costs a rebuild.** See §1.5 — the
  anti-pattern is not "no light mode", it is *letting non-token colour
  accrete* until a second theme means repainting thousands of assets.
- **Naive palette inversion.** The classic flop: flipping luminance and
  shipping brand colours that fail contrast on white. **Volyume's brand
  amber `#F5A623` on white is 2.03:1 — fails WCAG AA for text (4.5:1)
  and even the 3:1 non-text bar** (computed, WCAG 2.x relative-luminance
  formula; all ratios in this document computed the same way). Any light
  theme that keeps bright amber as a text/icon colour is dead on
  arrival. Same trap for status colours: `#4CAF50` green is 2.78:1 on
  white, `#FFC107` warning is 1.63:1, `gold #FFD700` is 1.40:1.
- **Auto-following the system without an explicit choice.** NN/g-cited
  survey data: roughly a third of users run light, a third dark, a third
  switch contextually ([forms.app dark-mode statistics round-up, 2026](https://forms.app/en/blog/dark-mode-statistics);
  [Increditools](https://increditools.com/dark-mode-usage-statistics/)).
  System-only removes the choice from users whose phone theme doesn't
  match their gym preference; choice-only ignores the contextual third.
  Ship all three (MacroFactor pattern).

## 3. User psychology

- **Moment of need:** daylight. The diary is used outdoors and in bright
  kitchens at midday; the session screen is used in a gym, often at high
  screen brightness. The user who wants light mode discovers the need
  *outside the app* (squinting), then goes hunting in Settings — which
  is the one feature category where Settings IS the right placement
  (appearance is a set-once preference, not a flow). Placement: the
  existing **You → Settings → Display** page, top section, above the
  accessibility toggles it mechanically shares.
- **Habit loop:** none to build — this is friction removal. The reward
  is instant and visible (the whole app re-skins after reload).
- **Effort budget:** one row, three options, one reload prompt. Zero new
  surfaces.
- **Emotional safety:** colour-only change; no interaction with ED/
  wellbeing flags, no copy changes, no red-number risk. Status hues keep
  their meaning in both themes (same hue families, darkened for light).
- **Word-of-mouth surface:** modest but real — "it even has a proper
  light mode" is a review line, and the *absence* is a complaint line
  (Whoop). The stronger effect is review-defence: removing a predictable
  1-star theme ("dark hurts my eyes in daylight") before it appears.
- **Trust mechanics:** the reload prompt is honest about what happens
  ("Volyume needs to reopen to apply this") — the existing
  `promptRestartForA11y` copy already nails the house voice.
- **Why dark stays the default:** the gym context argues for it — harsh
  lighting pushes brightness up, where OLED dark mode saves 39–47%
  battery at 100% brightness (Purdue, MobiSys 2021:
  [ScienceDaily](https://www.sciencedaily.com/releases/2021/07/210729122156.htm));
  dark is the category norm for data-dense fitness (Whoop, Apple
  Fitness — round-1 §4); and amber-on-charcoal is the brand. **Light is
  opt-in. No existing user's appearance changes. Default = Dark.**

## 4. The Volyume implementation

### 4a. Token mapping — every `baseColors` token's light counterpart

Derivation rules (the "three variables", Linear-style): **base** = warm
near-white `#FAFAF7` (keeps the dark ladder's warm pull — blue channel a
few points under red/green — and avoids pure-white glare, mirroring the
`#0D0D0D`-not-`#000000` halation rationale); **accent** = amber, bright
for fills / darkened to `#8A5200` for ink; **contrast targets** = the
same WCAG bars the dark table documents per token role. All ratios below
are computed (WCAG 2.x), against light `background #FAFAF7` and
`surface #FFFFFF` unless stated.

**Surface ladder — the inversion.** Dark elevation lightens upwards. On
light, per M3 tone-based surfaces, cards rise to white and *inset*
emphasis darkens ([M3 tone-based surfaces](https://m3.material.io/blog/tone-based-surface-color-m3)).
Elevation on light is carried by **real shadows + the existing hairline
border role**, not by surface lightness.

| Token | Dark (current) | Light (proposed) | Computed ratios / notes |
|---|---|---|---|
| `background` | `#0D0D0D` | `#FAFAF7` | Warm near-white; not `#FFFFFF` (glare; lets white cards register) |
| `surface` | `#191917` | `#FFFFFF` | Cards/sheets; separated by `shadow.sm` + `borderSubtle` |
| `surfaceElevated` | `#222220` | `#F6F6F1` | Nested cards inside a white card (inset darkens) |
| `surface2` | `#2A2A27` | `#EFEFEA` | Inputs, chips |
| `surface3` | `#343431` | `#E7E7E1` | Skeletons, fills, highest emphasis |
| `border` | `#6E6E6E` | `#8F8F8B` | 3.25:1 on surface, 3.10:1 on bg — meets WCAG 1.4.11 (3:1), mirrors dark's 3.81 |
| `borderLight` | `#7A7A7A` | `#767672` | 4.56:1 / 4.36:1 (dark: 4.53) |
| `borderSubtle` | `#2E2E2C` | `#E4E4DF` | Hairline inside cards, low-contrast by role (1.28:1, intentional) |
| `primary` | `#F5A623` | `#8A5200` | Amber ink. 6.39:1 white, 6.11:1 bg, 5.64:1 surface2, **5.24:1 surface3 — ≥4.5 on every surface**, same full-ladder discipline as dark `textMuted`. (Warmer candidate `#9A5B06` = 5.42:1 white but 4.45:1 on surface3 — fails by a hair; founder may still prefer it if `primary`-as-text never sits on skeletons. Recommend `#8A5200`.) |
| `primaryFill` | `#E08C0B` | `#F5A623` | Neat symmetry: bright amber vibrates on dark (hence `#E08C0B` there) but not on light — light gets the full brand amber as the button fill, with **`onPrimary` ink** (see new token). Fill itself is 2.03:1 vs white — acceptable because the 8.6:1+ label, not the fill boundary, identifies the control; Radix ships amber step 9 exactly this way ([Radix scale doc](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)) |
| **`onPrimary` (NEW)** | `#0D0D0D` | `#0D0D0D` | Theme-invariant ink on amber fills. 9.59:1 on `#F5A623`, 7.34:1 on `#E08C0B`. Replaces the 122 `color: colors.background` foreground sites (§4d) — in dark it is value-identical to today, so the migration is a zero-visual-diff PR |
| `primaryDim` | `#B45309` | `#B45309` | Already mid-scale; works both sides (5.02:1 on white). Pressed-state fill on light |
| `primaryBg` | `rgba(245,166,35,0.12)` | `rgba(245,166,35,0.18)` | Tint; cream on white. No contrast requirement (background role) |
| `success` | `#4CAF50` | `#2E7D32` | 5.13:1 white / 4.90:1 bg (current green = 2.78:1 on white, fails) |
| `successBg` | `rgba(76,175,80,0.15)` | `rgba(46,125,50,0.12)` | Tint of the light hue |
| `warning` | `#FFC107` | `#946500` | 5.10:1 white (bright `#FFC107` = 1.63:1, unusable as ink on light) |
| `warningBg` | `rgba(255,193,7,0.15)` | `rgba(255,193,7,0.18)` | Bright tint stays (background role) |
| `error` | `#F44336` | `#C62828` | 5.62:1 white / 5.38:1 bg (current red = 3.68:1, fails AA text) |
| `errorBg` | `rgba(244,67,54,0.15)` | `rgba(198,40,40,0.10)` | |
| `textPrimary` | `#FFFFFF` | `#1A1A18` | Warm ink, 17.43:1 white / 16.67:1 bg (AAA; mirrors not-pure-black rationale) |
| `textSecondary` | `#9E9E9E` | `#555553` | 7.47:1 white / 7.15:1 bg — mirrors dark's 7.25:1 AAA claim |
| `textMuted` | `#9B9B9B` | `#5C5C5A` | 6.70:1 white; **≥5.50:1 on every surface** (dark discipline: ≥4.89 everywhere) |
| `textDisabled` | `#727272` | `#8E8E8B` | 3.29:1 — disabled-only role, no WCAG body bar (dark: 4.04) |
| `tabBar` | `#111111` | `#FFFFFF` | |
| `tabBarBorder` | `#222222` | `#E4E4DF` | |
| `inputBg` | `#1E1E1E` | `#EFEFEA` | = `surface2`, as in dark it sits near `surface2` |
| `gold` | `#FFD700` | `#8A6D00` | Trophy ink. 4.92:1 white (bright gold = 1.40:1, invisible). Where gold is a *fill* (badges), keep bright gold with `onPrimary` ink |
| `silver` | `#C0C0C0` | `#6E6E6E` | 5.10:1 white |
| `bronze` | `#CD7F32` | `#8C5318` | 6.24:1 white (bright bronze = 3.14:1) |
| `appleBtnBg`/`appleBtnText` | `#000000`/`#FFFFFF` | **unchanged** | Apple's brand-locked spec for light backgrounds is the black button — correct as-is |
| `chartLine` | `#F59E0B` | `#B45309` | 5.02:1 white — clears the 3:1 non-text graphical bar with margin (bright `#F59E0B` = 2.15:1, fails) |
| `chartFill` | `rgba(245,158,11,0.08)` | `rgba(180,83,9,0.10)` | Area tint of the light line hue |
| `scrim` | `rgba(0,0,0,0.55)` | `rgba(0,0,0,0.45)` | Scrims stay black in both modes (M3 practice); slightly lighter so a bright page doesn't slam to grey |

**Shadows become real.** Dark elevation is ladder-carried; the `shadow`
tokens (`opacity 0.3/0.4/0.5`) exist but barely read on charcoal. On
light they are the primary elevation cue: same offsets/radii/`elevation`
values, **opacities re-tokened to `0.10 / 0.14 / 0.18`**, `shadowColor`
stays `#000`. Mechanically: `shadow.sm/md/lg` are exported objects whose
properties are read at `StyleSheet.create` time, so the same boot-time
mutate-in-place pattern works (`Object.assign(shadow.sm, …)` inside the
apply function). Android `elevation` values unchanged (the platform
renders them correctly on light automatically).

### 4b. Accessibility-mode composition (the order spec)

`applyAccessibility` already uses **reset-then-apply** ("Reset to
defaults first so consecutive applies don't compound" —
`src/styles/theme.js:170-207`). The theme becomes the *first* layer of
the same pipeline, and the two colour-modifier tables become
theme-keyed. Spec order:

1. **Reset**: `Object.assign(colors, baseColors)`,
   `Object.assign(fontSize, baseFontSize)`, reset `shadow` opacities to
   dark defaults.
2. **Resolve theme**: `prefs.theme` ∈ `dark | light | system`
   (absent → `dark`); `system` resolves via `Appearance.getColorScheme()
   ?? 'dark'` at boot.
3. **If light**: `Object.assign(colors, lightColors)`; apply light
   shadow opacities. Light is a *base palette*, not a modifier — it must
   land before modifiers.
4. **If `higherContrast`**: apply the resolved theme's HC table.
   Light HC (computed): `textSecondary #3D3D3B` (10.4:1 bg),
   `textMuted #4A4A48` (8.5:1), `textDisabled #6E6E6B` (4.9:1),
   `border #5C5C5A` (6.4:1), `borderLight #4A4A48` (8.5:1) — same
   proportional lift as the dark HC table's 13.6/12.3/5.4/6.4/7.7.
5. **If `colorBlindSafe`**: apply the resolved theme's CVD table, same
   Okabe–Ito hue families darkened for light:
   `success #0072B2` (the canonical Okabe–Ito blue, 5.19:1 white —
   the dark table's sky `#56B4E9` is only 2.31:1 on white, unusable),
   `successBg rgba(0,114,178,0.10)`, `error #9C4D76` (darkened
   reddish-purple, hue-faithful to `#CC79A7` which is 3.06:1 and fails;
   5.62:1 white), `errorBg rgba(156,77,118,0.10)`. Amber primary and the
   light `warning #946500` remain CVD-distinguishable (amber kept, as in
   dark).
6. **`largerText`**: unchanged, theme-independent.

Every combination (light × HC × CVD × larger text) is then a pure
function of prefs, idempotent, and testable by direct assertion — see
§4f for the contrast-ratio unit tests that lock all 2×2×2 colour combos.

### 4c. The mechanism

- **Storage**: add `theme: 'dark' | 'light' | 'system'` to the existing
  prefs blob under `A11Y_PREFS_KEY` (`src/lib/accessibilityPrefs.js`) —
  it inherits load-at-boot (`bootstrapAccessibility`, `App.js:123-126`),
  the store slice (`useAppStore.js` `accessibility`/`setAccessibilityPref`,
  which already syncs cross-device via `pushPrefSoon`), and the reload
  flow. Default absent → `dark`: **no existing user changes appearance.**
- **Boot**: `bootstrapAccessibility` already runs before the navigator
  is lazy-required (`App.js:346-348`, requires at `:744`), so the light
  palette lands in every `StyleSheet.create` exactly like HC/CVD today.
- **Reload prompt**: reuse `promptRestartForA11y` in
  `SettingsDisplayScreen.js` verbatim pattern ("Appearance saved —
  Volyume needs to reopen to apply this. Your data and current screen
  are safe.").
- **Settings UI**: new "Appearance" group at the top of
  `SettingsDisplayScreen`, one `SettingRow` with a three-option control
  (Dark / Light / Match phone), reusing the segmented-choice styling
  precedent from `ProOnboardingScreen` (`segmentTextActive` et al.).
  Appearance is a **free** feature (display setting — never Pro-gated).
- **Theme-aware chrome (the three hardwired spots)**:
  `App.js:759` `<StatusBar style="light" backgroundColor="#0D0D0D">` →
  driven by the resolved theme (export `resolvedTheme` from theme.js,
  set during apply); `RootNavigator.js:1067-1077` NavigationContainer
  `theme={{ dark: true, … }}` → `dark: resolvedTheme === 'dark'` (the
  colour values already read tokens); `App.js:737` pre-theme placeholder
  stays `#0D0D0D` by design (a sub-second dark flash on a light boot is
  acceptable; the Android window background in `app.json` is `#0D0D0D`
  and changing it is not worth a build risk in v1 — note and accept).
- **Native-surface coherence**: `app.json` currently locks
  `"userInterfaceStyle": "dark"`, which pins keyboards, native pickers
  and OS alerts dark. Change to `"automatic"` and call
  `Appearance.setColorScheme(resolved)` (RN ≥0.72) during bootstrap so
  native surfaces follow the *in-app* choice; Android additionally
  requires `expo-system-ui`
  ([Expo color-themes docs](https://docs.expo.dev/develop/user-interface/color-themes/)).
  **Two flags for the founder**: (1) `expo-system-ui` is a new
  dependency — name/purpose/licence (Expo SDK package, MIT) to be
  approved per house rules before install; (2) the `app.json` change
  requires a **native rebuild**, so COMP-029 ships with a store release,
  not OTA-only.
- **System-follow at runtime**: resolve at boot. If the OS theme flips
  mid-session, `Appearance.addChangeListener` fires → show the same
  non-blocking reload prompt, **suppressed while a workout session is
  active** (store `activeWorkout` guard — never interrupt the sacred
  screen); re-resolves silently at next cold start regardless.

### 4d. Audit-and-fix pass — how clean is the token discipline really?

Grep of `src/` for `#hex` literals and `rgba(` outside `theme.js`
(2026-06-10) finds **only four product files** with non-token colour —
the discipline is genuinely excellent:

| File | What | Disposition |
|---|---|---|
| `src/screens/ShareCardScreen.js` (palette at 53-60, HTML exports at 929-984, gradient 1169, 527-528, 1521) | Self-contained locked brand palette mirroring theme.js | **Exempt by design** — export surface, stays dark-brand (§4e). Add a "theme-exempt: brand export surface" comment |
| `src/screens/ScanLabelScreen.js:294,321,353,359` | Camera chrome: `#000` wrap/shutter, white reticle | **Exempt** (a camera feed is inherently dark) — annotate, or tokenise as `cameraBg`/`cameraReticle` for the absolutism |
| `src/components/PlateCalculator.js:36-50` | Real-world plate colour code (IPF/lb standards) | Exempt (physical-object colours) — **but the white 5 kg/5 lb plate needs a `borderSubtle` stroke on light** or it vanishes on white cards |
| `src/components/PRCelebration.js:28` | Two extra confetti hues | Decorative, exempt |

Plus boot chrome: `App.js:737` placeholder and `:759` StatusBar
(handled in §4c); `theme.js` `shadowColor:'#000'` is correct for both
modes; tests reference hexes legitimately.

**The real offender is role drift, not literals: 122 style sites use
`color: colors.background` and ~40 more pass `color={colors.background}`
to icons — all meaning "dark ink on an amber/coloured fill"** (e.g.
`ActiveWorkoutScreen.js:2179` `completeBtnText`, `HomeScreen.js:1758`,
`ProGate.js`, ~45 files). Under a light palette every one becomes
near-white-on-amber at 2.0:1 — unreadable primary buttons across the
app. Fix: the new **`onPrimary` token (§4a)**, migrated in a **Phase 0
hygiene PR** that is value-identical in dark (`#0D0D0D`), i.e. zero
visual change, verifiable by the existing mount tests plus snapshots.
This PR is a hard gate before any light palette lands. (Adjacent
finding, mention-not-fix: `docs/rules/styling.md` is stale against
current `theme.js` values and bans white backgrounds — it needs a
founder-approved amendment when COMP-029 ships.)

### 4e. Charts, share cards, recaps

- **Charts**: `chartLine`/`chartFill` swap per §4a;
  `volumeColors`/`volumeStatusColor` are already lazy getters over
  `colors.*` so the heatmap and volume bars re-theme for free —
  status hues on light pass via the §4a status mapping. Axis/grid
  colours already use text/border tokens.
- **ShareCard stays dark-brand always.** Exported 1080×1920 assets are
  **brand surfaces consumed by non-users** on Instagram/WhatsApp — the
  amber-on-charcoal card *is* the recognisable artefact, exactly as
  Spotify Wrapped and Strava share overlays are brand-fixed regardless
  of app theme. `ShareCardScreen`'s palette is already deliberately
  self-contained and "locked" in-code. Screen chrome (buttons around
  the preview) themes normally; the canvas does not. Same rule for the
  **Year of Lifts story renderer** and the monthly/block recap
  (COMP-005): story/export surfaces render dark-brand in v1.
- **Diary macro rings / Skia work (COMP-019)**: consume tokens only;
  no special casing needed beyond QA.

### 4f. QA matrix and staging

- **Mount tests**: extend the existing harness
  (`src/__tests__/screen-mount.test.js`, ~400 cases, plus
  `tier-screens-mount.test.js`) with a second Jest project whose setup
  file calls `applyAccessibility({ theme: 'light' })` before screens are
  required — every screen mounts under light, catching render throws.
- **Contrast as unit tests (the standout move)**: extend
  `src/styles/__tests__/theme.test.js` with a computed WCAG-ratio
  assertion for **every text-role token × every surface token × both
  themes × HC/CVD combos** (the 2×2×2 of §4b). The dark table's
  documented ratios become executable; the light table can never drift
  below its bars. This out-Linears Linear: their derivation guarantees
  contrast at generation time, ours re-proves it on every CI run.
- **Snapshots**: targeted snapshot tests for the six highest-traffic
  surfaces (Home, ActiveWorkout, Diary, Progress/Analytics, CoachOutput,
  Paywall) under six combos (dark, light, dark+HC, light+HC, dark+CVD,
  light+CVD).
- **Manual sweep**: checklist of all ~60 screens on light on one OLED
  Android + one iPhone, eyes on: amber fills/inks, skeletons, scrims,
  empty states, PlateCalculator, OAuth buttons, keyboard appearance,
  status bar, tab bar, modals/sheets.
- **Staging**: no feature-flag infra exists — gate the Settings row
  behind `__DEV__` first, then a build-time constant on the **Play
  internal testing track** for a 1–2 week soak, then public opt-in.
  Rollback is trivial (hide the row; pref defaults dark).

Copy direction (house voice):
- Row: "Appearance" · sub "Dark is the Volyume default. Light is easier
  to read in daylight. Match phone follows your system setting."
- Options: "Dark" / "Light" / "Match phone"
- Prompt: "Appearance saved — Volyume needs to reopen to apply this.
  Your data and current screen are safe." (existing pattern verbatim)

## 5. Whole-package integration

- **COMP-027 (colour grammar + Home order)**: sequencing matters — the
  new semantic state hues must be defined as *token pairs* (dark+light
  values, plus HC/CVD variants) from day one. Whichever lands first,
  the rule is: **no new colour enters `theme.js` without a light
  counterpart and computed ratios.** COMP-029's table format is the
  template.
- **COMP-019 (charts/widgets)**: Skia charts must consume tokens at
  render time; widgets follow system theme natively (Material You /
  iOS) — MacroFactor precedent
  ([widgets announcement](https://macrofactor.com/widgets-announcement/)).
- **COMP-001 (workout screen)**: the redesign's do-not-regress list
  applies; light QA of ActiveWorkout happens against the *post-COMP-001*
  layout, and the `onPrimary` migration touches its styles — coordinate
  the Phase 0 PR with that branch to avoid conflicts.
- **Streamlining**: zero new surfaces; one new Settings row on an
  existing page. ED/wellbeing flags: not applicable (visual-only);
  calmer-mode suppression unaffected.
- **Duplication avoided**: no second theme file, no context provider, no
  re-render machinery — the existing boot-time mutate +
  `StyleSheet.create` freeze is kept exactly, with its known reload
  trade-off, because it is already user-explained and battle-tested for
  HC/CVD/larger-text.

## 6. Retention & word-of-mouth mechanics

Defensive retention: removes a predictable churn-and-complain vector
before the paying base scales (Whoop's threads are the counterfactual).
~33% of users prefer light consistently and ~a third switch by context
([NN/g via forms.app round-up](https://forms.app/en/blog/dark-mode-statistics));
today every one of them experiences daylight friction with the Pro
diary — the exact Pro surface used outdoors. The tellable moment is
small but real: "they did light mode properly — even the colour-blind
palette adapts."

## 7. Beating the benchmark

MacroFactor ships three themes; Linear ships derived themes; nobody in
fitness ships **derived themes with per-token WCAG ratios asserted in
CI across both palettes and both accessibility modifier sets**. Because
Volyume's dark table already documents a contrast target per token, the
light theme is a re-derivation, not a redesign — and the composition
spec (§4b) means light × higher-contrast × colour-blind-safe ×
larger-text all work on day one, which none of the fitness comparators
documented in round 1 can claim. Strava needed a multi-quarter asset
repaint; Volyume's grep shows four exempt files. That is the audit's
token discipline paying out.

## 8. Measurement

1. `theme_changed` telemetry event (panel 1; payload `{theme}` only, no
   PII) — **requires a telemetry allowlist extension**
   (`src/lib/telemetry/events.js` `TELEMETRY_EVENTS`), founder approval
   per the locked catalogue. Target signal: % of MAU opting into
   light/system within 60 days (expect 10–25% based on §6 splits).
2. Reload-prompt acceptance rate after theme change (proxy via
   `app_cold_start` adjacency if the event extension is declined).
3. Review/complaint channel: zero "dark mode hurts my eyes" 1-stars
   post-launch (the Whoop counterfactual).
4. No regression in crash-free rate on light (observability layer
   already tracks cold-start crashes).

## 9. Build notes

**Files touched** (blueprint estimate): `src/styles/theme.js`
(light/HC-light/CVD-light tables, `onPrimary`, shadow mutate,
`resolvedTheme` export); `src/lib/accessibilityPrefs.js` (no change —
blob absorbs the key); `src/store/useAppStore.js` (default `theme:
'dark'` in the slice); `App.js` (StatusBar, `Appearance.setColorScheme`,
change listener); `src/navigation/RootNavigator.js:1068`;
`src/screens/SettingsDisplayScreen.js` (Appearance row);
`app.json` (`userInterfaceStyle: "automatic"` — native rebuild);
**Phase 0**: ~160 `colors.background`-as-ink edits across ~45 files →
`colors.onPrimary`; `src/components/PlateCalculator.js` (light stroke);
tests: `theme.test.js` ratio matrix, light mount-test project, six
snapshot suites. New dependency: `expo-system-ui` (ask first). DB: none.

**Phasing**: Phase 0 hygiene PR (onPrimary, zero visual diff) → Phase 1
palette + mechanism + tests (`__DEV__`-gated) → Phase 2 internal-track
soak → Phase 3 public opt-in row (store release, founder brand sign-off
on the light palette screenshots before Phase 3).

**Effort sanity-check vs approved E6**: Phase 0 ≈ 1–1.5 days
(mechanical, eyeball-reviewed); palette + mechanism + unit tests ≈ 2
days; Settings UI + chrome ≈ 1 day; manual sweep + long-tail fixes ≈
3–5 days; release/QA overhead ≈ 1 day. **Total ≈ 8–10 dev-days plus a
native rebuild — consistent with E6.** The honest risk margin: the
manual sweep historically uncovers a +2–3 day tail of
"looked-right-by-coincidence" dark assumptions; still inside E6, but do
not schedule it as an E4.

**Risks**: (1) *the* failure mode — shipping light with any
`colors.background`-as-ink survivor: unreadable amber buttons (Phase 0
is a hard gate; the CI ratio tests and light mount run are the net);
(2) `app.json` `userInterfaceStyle` flip changes native-surface
behaviour for existing dark users if `Appearance.setColorScheme` isn't
called early enough — test keyboard/picker appearance in dark on both
platforms before release; (3) founder brand risk: the darkened amber
ink (`#8A5200`) reads brown out of brand context — sign-off on real
screens, not swatches; (4) mid-session OS theme flips prompting during
a workout — suppressed by the active-session guard.
