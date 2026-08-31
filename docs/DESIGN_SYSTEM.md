# Volyume Design System

**Status:** Governing document — the single source of truth for visual
design. Aligned 2026-05-30 to the shipped theme and the premium design audit
(`docs/audit/volyume-design-premium-audit-2026-05-30/`). Where this document
and `src/styles/theme.js` ever disagree, the theme wins and this doc is
corrected.

> **History note.** An earlier version of this doc specified an electric-blue
> primary (`#2979FF`) and a `#0A0A0A` background. The app shipped amber on
> `#0D0D0D`, and `CLAUDE.md` treats amber as the brand. The 2026-05-30 audit
> resolved the contradiction in favour of amber (it is more distinctive than
> the ubiquitous blue-on-dark and fits the precision-instrument identity).
> This document now reflects that decision; the blue is retired.

---

## What Volyume Is Not

- Not a generic AI-generated fitness app
- Not a dark SaaS dashboard template
- Not a gym-bro hype product
- Not a wellness/lifestyle brand
- Not a social-first platform
- Not a supplement company aesthetic
- Not RP Hypertrophy with different colours

Volyume is a serious, private, precision instrument for people who treat
training as a craft. The reference feeling is Whoop / Linear / Stripe — a
calm, dense, exact tool — not Headspace/Calm softness or gym-bro hype.

---

## Product Feeling

| Quality | Expression |
|---|---|
| Elite | Nothing decorative that doesn't earn its place |
| Serious | No filler text, no emoji in UI copy, no celebrations for ordinary actions |
| Precise | Numbers are the hero — sized large, tabular, legible at a glance |
| Scientific | Explainable recommendations, not magic |
| Premium | Restraint over decoration |
| Fast | Performance is a design value — no heavy effects on mid-range Android |
| Minimalist but not bland | Hierarchy through contrast, not complexity |
| Bodybuilding-specific | Terminology, defaults, data models reflect the sport |
| Private and purposeful | No social feed, no leaderboard, no public profiles |

---

## Platform

**Android is the primary platform.** Volyume ships live on Google Play; iOS
goes out via TestFlight. One React Native codebase renders one design language
on both, so this is not an "adaptive" product that changes its idiom per OS.

Material 3 is therefore the structural rulebook: bottom navigation bar for
3-5 destinations, system Back always works, edge-to-edge with window insets,
tonal elevation rather than arbitrary shadows, and snackbar-shaped transient
feedback. Brand expresses through the tokens below, inside that structure.
iOS still owes its own hardware the OS guarantees on that device: safe-area
insets, Reduce Motion, and the edge-swipe back gesture.

Known gap against the Material reference, recorded not fixed: expanded-width
layout. The app is locked to portrait and ships the phone bottom bar unchanged
on a tablet, with no navigation rail or width-class branch anywhere in the
navigator. (Touch targets were the other gap; resolved, see Button style.)

---

## Colour Palette

All values are the live `theme.js` tokens. **Never hardcode hex in screen or
component files** — a CI lint guard enforces this (whitelist: `ShareCardScreen`
offline canvas, `theme.js` itself).

### Base surfaces — the elevation ladder

Depth is expressed by *lightening each layer* (the premium-dark technique),
not by shadows. The steps are widened and given a barely-perceptible warm
pull so layers read as distinct depths and tie subtly to the amber brand.

| Token | Value | Use |
|---|---|---|
| `background` | `#0D0D0D` | app base — near-black, not pure black (halation) |
| `surface` | `#191917` | cards, sheets (1st elevation) |
| `surfaceElevated` | `#222220` | a card nested inside another card |
| `surface2` | `#2A2A27` | inputs, chips, secondary cards |
| `surface3` | `#343431` | skeletons, fills, highest |
| `border` | `#6E6E6E` | the edge of a CONTROL that needs an identifiable boundary (WCAG 1.4.11): buttons, inputs, steppers, chips, selectable options |
| `borderSubtle` | `#2E2E2C` | every card/container edge, and hairline dividers inside one |

**Card edges use `borderSubtle`, not `border`.** This table previously said
the opposite, and the app followed it: sections, list rows and hand-rolled
cards drew bright grey outlines that read as a wireframe. `border` is the
WCAG 1.4.11 edge for a control the user must be able to identify; a container
is identified by its contents. `Card` has always used `borderSubtle`; the rest
of the app was aligned to it in the premium UI pass.

### Accent — amber

| Token | Value | Use |
|---|---|---|
| `primary` | `#F5A623` | the one accent: small marks, icons, key data values, text-on-dark |
| `primaryFill` | `#E08C0B` | large filled buttons (deepened so it doesn't optically vibrate on dark) |
| `primaryDim` | `#B45309` | pressed / disabled amber |
| `primaryBg` | `rgba(245,166,35,0.12)` | soft accent fills, active chips |

### Semantic

| Token | Value | Use |
|---|---|---|
| `success` | `#4CAF50` | completion, PRs, optimal volume, Finish Workout |
| `warning` | `#F0E442` | near-MRV, caution (Okabe-Ito yellow; retuned off the amber axis by COMP-027 so a 'watch' mark and an amber chip stay distinguishable) |
| `error` | `#F44336` | over-MRV, destructive, crash |

Each has a soft `…Bg` fill and a colour-blind-safe swap (`applyAccessibility`).

### Text

| Token | Value | Use |
|---|---|---|
| `textPrimary` | `#FFFFFF` | headlines, data values |
| `textSecondary` | `#9E9E9E` | labels, metadata |
| `textMuted` | `#9C9C9C` | placeholders, timestamps |
| `textDisabled` | `#727272` | disabled only |

### Accent discipline

Amber is the **only** non-achromatic colour outside the semantic states. Use
it only on: primary actions, active navigation, and key data values (PR
highlight, volume progress, the amber affordance). Every other surface is
achromatic. One accent, used sparingly. Do not amber-colour decorative icons
— it dilutes the affordance.

**No decorative gradients, orbs, or glows.** Gradient is permitted only as a
*functional data encoding* (e.g. a volume bar MEV→MAV→MRV green→amber→red).
The audit confirms flat near-black + tonal elevation beats decorative
gradient as the premium-dark position.

### Dark mode

Dark is the default and the designed-for scheme (Whoop/Oura/Robinhood-after-
hours precedent; functional for early-morning / gym-lighting use). A full
light palette now ships alongside it (COMP-029, `lightColors` in `theme.js`),
selectable as dark / light / system; its hues still await the founder's
on-device brand sign-off. The accessibility contrast / colour-blind /
larger-text swaps apply to both. Dark carries elevation through the surface
ladder; light uses shadow as the primary elevation cue.

---

## Typography

### Approach

**Inter is bundled and shipped** (`assets/fonts`, registered face-by-face in
`src/styles/fonts.js`), with InterDisplay on the two largest roles. This
section previously said the app used the platform system font and called Inter
"a deferred, optional upgrade"; that stopped being true when the faces landed.

Because each face is registered under its own family name, **`fontWeight`
alone does not select a heavier face.** A style that sets `fontWeight` without
naming a `fontFamily` asks a single-face family for a weight it does not
contain, and the renderer either ignores the request or synthesises a smeared
faux bold. 347 style blocks did exactly that before the premium UI pass.

**Use the `type` roles. Never hand-assemble `{ fontSize, fontWeight }`.** When
a role does not carry the weight you need, use the weight axis
**`type.w(role, weight)`**, which returns that role with the matching Inter
face AND the numeric weight set. It composes with `num()`:
`type.w(type.num('h2'), 'bold')`. The role table deliberately carries one
weight per size; `w()` is how you leave it.

A CI guard flags raw `fontSize:`/`fontWeight:` literals in screens and
components, and a second guard fails on any `type.*` role that does not exist
(a phantom role spreads as `undefined` and silently drops family, size and
line height).

### The type scale (`type.*` roles in `theme.js`)

Tracking is **0 on every role** except `overline` (+0.5) and the `wordmark`
(+2). The negative display tracking this table used to specify was removed by
the 2026-07-09 decision after it read as blocky on device; do not reintroduce
it without a device walk.

| Role | Size | Face | Line-height | Use |
|---|---|---|---|---|
| `display` | 40 | InterDisplay-Bold | 1.2 | the one hero number on a screen |
| `h1` | 32 | InterDisplay-Bold | 1.2 | screen title (the five tab roots use it) |
| `h2` | 24 | SemiBold | 1.35 | section headers |
| `h3` | 20 | Medium | 1.35 | card titles |
| `title` | 17 | Medium | 1.35 | list-row titles, exercise names |
| `body` | 16 | Regular | 1.5 | running copy |
| `bodyStrong` | 16 | Medium | 1.5 | emphasised body, primary data labels |
| `bodySm` | 13 | Regular | 1.5 | small multi-line body copy |
| `label` | 13 | Medium | 1.35 | metadata, captions-with-weight |
| `overline` | 11 | Medium | 1.35 | uppercase eyebrow/section labels (the one tracked role) |
| `caption` | 11 | Regular | 1.35 | timestamps, finest print |
| `captionTight` | 11 | Regular | 1.45 | two-line caption copy |
| `captionStrong` | 11 | SemiBold | 1.35 | emphasised micro-label: form-field labels, chip/badge text |
| `micro` | 10 | Regular | 1.35 | dense chart-axis and data micro-labels |

Rules: one `display` element per screen, max. Emphasis by weight and colour,
never italic or underline. Every size above is multiplied by 1.2 under the
larger-text accessibility setting, so a layout must survive that.

### Numbers are content — use tabular figures

Any number the user reads as data (weight, reps, sets, %, kcal, timer, table
date) uses **`type.num(role)`** (tabular figures) so columns align at the
decimal and a changing value doesn't jitter. This is the single highest-craft
typography rule. A lifter glancing between the bar and their phone must read
`120kg × 8` in under a second.

### Weight discipline

Named by Inter face, because the face is what actually renders. The numeric
weight is set alongside it by `type.w()` for accessibility services.

| Face | Usage |
|---|---|
| `heavy` (ExtraBold) | the one hero number only |
| `bold` | section headers, button labels, exercise names |
| `semibold` | card titles, primary data points |
| `medium` | secondary labels, navigation |
| `regular` | body copy, metadata |

---

## Surface and card style

- Use the `Card` primitive. Don't hand-roll `backgroundColor: colors.surface`
  blocks.
- Background `surface`; nested card `elevated` (`surfaceElevated`).
- Border `1px` `borderSubtle` (the card edge AND in-card dividers). `border`
  is for controls, not containers.
- Radius `radius.lg` (16) for cards; tiers below.
- **Depth from the tonal ladder, not shadows.** Only floating, temporary,
  above-everything surfaces (Toast, FAB, menus) carry a shadow, and it must
  come from the `shadow` token — no inline `'#000'` shadow blocks.
- **No background blur** as a system material (Android perf + can't blur
  behind a Modal). One optional exception: a single backdrop-blur "moment"
  on the active-workout controls, which must degrade to a solid translucent
  fill on Android.
- Pressed state: the `PressableCard` spring (scale 0.97 + opacity dip), not a
  flat opacity change. One press feel app-wide.

### Border radius tiers (`radius.*`)

| Token | Value | Use |
|---|---|---|
| `xs` | 4 | chart dots, tiny chips, micro-UI |
| `sm` | 6 | tags, small controls |
| `md` | 10 | inputs, search, chips, toast |
| `lg` | 16 | cards, buttons |
| `xl` | 20 | modal / sheet top corners only |
| `full` | 999 | pills |
| `circle(size)` | helper | avatars, FABs, round icon buttons |

---

## Button style

Use the `Button` primitive (one press model, one disabled/loading treatment).

| Type | Style |
|---|---|
| **Primary** | `primaryFill` amber, dark bold label, `radius.lg` |
| **Completion** | `success` fill, dark bold label — Finish Workout, Complete Set |
| **Destructive** | `error` fill, light label |
| **Secondary** | `surface2` fill, light label, 1px `border` |
| **Tertiary / ghost** | no fill, amber label |

**COMPLETE SET is always the largest button on the active-workout screen**,
with the deepest press and a `setLogged()` haptic. All other buttons are
visually subordinate.

**Minimum touch target: 48dp**, from `touchTarget.minimum` in
`src/styles/layout.js`. Material 3's floor, and it also clears iOS's 44pt, so
one number serves both platforms; `touchTarget.android` is kept as an explicit
alias and a test asserts the two agree, so the old two-number split cannot
return. Read the token; never hard-code the number.

Resolved 2026-08-31. It had been 44 (the iOS figure) with `android: 48`
unreferenced by any app code, and 78 further sites hard-coding 44 outright.
Those were consolidated onto the token first (zero visual change), then the
token was raised. Sixteen literal 44s remain and are correct: they are
decorative dimensions -- a text column, an avatar, an icon circle, a container
whose children are the real targets -- and must not reference a touch-target
token.

One deliberate exception stands: `workoutLoggerSize.setEntryStepperButton` is
36 and is pinned BELOW the minimum with its own recorded reason, reaching a
full target through `hitSlop` instead.

---

## Header components

Three canonical headers cover every screen; every `Stack.Screen` in
`RootNavigator.js` renders `headerShown: false` and one of these (or a
documented justified custom header, e.g. a wizard step or the full-bleed
Year-of-Lifts story deck) instead of the native React Navigation header.
Never hand-roll a fourth header shape.

| Component | Use for | Shape |
|---|---|---|
| `ScreenHeader` | Top-level tab screens (Today, Train, Eat, Progress, Coach) | Page title left, compact Volyume V (or a passed `right` node) on the right, optional `subtitle` line |
| `BackHeader` | Any screen you navigate INTO (pushed detail/list/settings screens) | Back chevron (24px, `textPrimary`) left, title centred, optional `right` action; a fixed-width spacer keeps the title optically centred when `right` is absent |
| `ModalHeader` | Full-screen modals presented over a tab (scanners, paywalls, add/edit sheets) | Close X on `closePosition` side (default right), title centred, optional `rightAccessory` on the opposite side (e.g. a Save button) |

`SettingsPage` (in `SettingsPrimitives.js`) wraps `BackHeader` for the whole
Settings family, so Settings screens pass a `title` prop rather than
rendering `BackHeader` directly.

---

## Motion

Tokens in `theme.js` (`motion.*`). New everyday motion is built on
react-native-reanimated; **reduce-motion gates every animation** (mandatory).

| Token | Value | Curve | Use |
|---|---|---|---|
| `micro` | 120ms | standard | taps, toggles, opacity dips |
| `state` | 200ms | standard | state changes, colour/size shifts |
| `enter` | 320ms | emphasized-decelerate | sheets, cards, screen content entering |
| `exit` | 220ms | emphasized-accelerate | leaving |
| `hero` | 440ms | emphasized | the one important moment per screen |
| `spring` | stiffness 150, damping 18, mass 1 | — | press, drag-release (≈ iOS 0.8 damping) |

Must exist: one unified press feel; a once-on-focus screen-content entrance;
staggered list entrance on the main data lists; restrained hero-number
transitions. Must never animate: frequent standard controls beyond the press
feel; the hero number's *position* (it may cross-fade its value, never
bounce); anything under reduce-motion; background/decoration (there is none).

---

## Icon style

`@expo/vector-icons` Ionicons, exclusively. Sizes from the `iconSize` token
(16/20/24/32): inline-with-text 16, standard action 20, primary/nav 24,
feature 32. **Outline = available/inactive, filled = active/done/selected.**
Utility icons `textSecondary`/`textMuted`; amber only for active/affordance
icons.

**Disclosure chevron (design-consistency sweep 2026-07-09, AC-1).** The
trailing `chevron-forward` that means "this row opens/navigates somewhere" is
always `iconSize.sm` (16) / `colors.textMuted`. `colors.primary` is reserved
strictly for a chevron on a singular, amber-tinted CTA banner where the tinted
element itself is the whole action (e.g. `AttentionCard`'s trial banner, and
Home's phase-sync/plateau banners); every nested "learn more" link, list row
or in-card action chevron uses the muted default even when its neighbouring
text is amber. Excluded from this rule (different role, left as-is): back
chevrons, expand/collapse disclosure toggles, paired date/month stepper
controls, and a chevron acting as a row's own primary action icon (e.g.
alternating with `add-circle` in the same slot).

---

## Interaction feedback & haptics

One press feel: route tappables through `PressableCard`/`Button` (spring 0.97,
deeper 0.96 for the hero CTA, 0.94 for small targets). Disabled = opacity 0.5,
no animation, no haptic.

Haptics via `haptics.js` (intent-named, reduce-motion gated). Map: set logged
→ Light; warm-up → Selection; PR → Success+Heavy; workout complete →
Success+Heavy×2; rest done → Medium+Heavy; toggle/segment/picker → Selection;
primary press → Light; commit/undo → Medium; error → Warning. Never the sole
confirmation; no haptics on frequent navigation taps.

---

## Loading, empty & error states

- **Loading:** every screen that fetches data shows a content-shaped
  `Skeleton`, never a bare spinner (a spinner is only for a sub-second inline
  action via `Button` `loading`).
- **Empty:** `EmptyState` + the hand-built SVG `Illustrations` for first-run
  hero empties; `compact` `EmptyState` for inline; `ghost` for previews. Copy
  is direct and data-first, no motivational filler, no emoji.
- **Error:** transient → `Toast` `error` + `haptics.error()`, plain copy
  ("Set not saved. Try again."); inline field errors below the field; the
  crash screen uses `background` + `type` roles + brand mark + one `Button`.

---

## Spacing tokens (`spacing.*`)

All spacing from tokens, no arbitrary pixels.

| Token | Value | Use |
|---|---|---|
| `hair` | 1 | optical baseline nudge |
| `xxs` | 2 | hairline gaps |
| `xs` | 4 | tight gaps, icon-to-text |
| `xs2` | 6 | dense data-row gaps |
| `sm` | 8 | between related items |
| `md` | 12 | default gap, within-card sections |
| `lg` | 16 | card padding, screen edge margin |
| `xl` | 24 | between sections |
| `xxl` | 32 | major section breaks, scroll bottom-pad |
| `xxxl` | 48 | hero spacing |

Screen edge margin `lg` (16); `md` (12) permitted on dense data screens, one
per screen. Volyume is deliberately denser than a wellness app, never
cramped: a primary number always has ≥ `md` of clear space.

---

## Microcopy tone

**Direct. Precise. No fluff.**

| Avoid | Use instead |
|---|---|
| "You did it! 🎉 Wrap up your session" | "Finish Workout" |
| "Oops! Something went wrong." | "Set not saved — try again" |
| "Great job today!" | (nothing — let the data speak) |
| "Three Sets for 8 to 12 Repetitions" | "3 sets · 8–12 reps" |

Data before description; no motivational filler; errors state the problem
plainly; celebrations reserved for genuine PRs; no emoji in functional UI
copy. No em dashes in copy (full stop, comma, or colon instead).

---

## App icon & wordmark

- **Icon:** rounded square (iOS) / adaptive (Android). A single strong `V`
  letterform or a minimal controlled-load glyph. Background `#0D0D0D`, mark
  in amber. Swiss-style precision (Bloomberg terminal, not MyFitnessPal). No
  dumbbells, flames, lightning, muscle silhouettes, or gradients.
- **Wordmark:** `VOLYUME`, geometric sans, slightly wide tracking, all caps.
  Amber or white on dark. No tagline on the mark, no gradient, no shadow.

---

## Distinctive product principles

1. **Data density without clutter** — more visible at a glance than
   competitors, nothing wasted.
2. **Numbers are the hero** — the interface frames data; tabular figures
   everywhere data appears.
3. **No gamification noise** — no streaks on fire, no XP, no confetti on
   every set. Celebrations reserved for genuine PRs, executed precisely.
4. **Precision-tool feeling** — closer to a heart-rate monitor than a social
   app.
5. **Silence is deliberate** — whitespace, muted secondary text, minimal
   colour make primary data legible instantly.

---

## Implementation rules

1. All colours from theme tokens. Never hardcode hex (CI-enforced).
2. All spacing from `spacing` tokens. No arbitrary pixels.
3. All typography from the `type` roles. Never raw `fontSize`/`fontWeight`
   literals (CI-enforced).
4. Cards via `Card`; buttons via `Button`; presses via `PressableCard`.
5. Check this document before adding any new UI. Resolve conflicts at design
   level before writing code.
6. No exceptions for "temporary" styles — they become permanent.
