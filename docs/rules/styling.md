# VOLYUME — STYLING AND VISUAL RULES

Read this when building or modifying any screen or component.
**The single source of truth is `src/styles/theme.js`.** This document
describes that system; if the two ever disagree, theme.js wins and this file
must be updated (it drifted badly once — rewritten 2026-07-01, D0).

---

## THE ONE RULE

**Never hard-code a colour, size, spacing, radius or duration. Use tokens.**
An ESLint rule bans raw hex in styles. The only sanctioned literals live in
theme.js itself (`appleBtnBg` — Apple brand-locked; `camera` — true black
behind a live viewfinder) and in the two theme-independent render contexts
that cannot import the theme: `src/widgets/widgets.js` (Android RemoteViews;
keep its constants byte-identical to theme.js manually) and
`src/lib/shareCard/drawShareCard.js` (Skia canvas, documented palette).

---

## COLOUR

Four palettes, all in theme.js: **dark (default)**, **light (COMP-029)**,
plus **higher-contrast** and **colour-blind-safe (Okabe-Ito)** modifier
tables per theme. `applyAccessibility()` swaps values in place at boot —
which is why styles must read tokens, never copies.

Key roles (dark values shown; light/HC/CVD differ — never assume the hex):
- Backgrounds: `background` #0D0D0D (never pure black — halation), then the
  elevation ladder `surface` #191917 → `surfaceElevated` #222220 →
  `surface2` #2A2A27 → `surface3` #343431. **In dark, the surface ladder IS
  elevation**; `shadow.sm/md/lg` exist primarily as the light theme's cue.
- Brand: `primary` #F5A623 (small marks, text, icons), `primaryFill`
  (large filled buttons), `primaryDim`, `primaryBg` (tint), `onPrimary`
  (ink on amber fills). Amber signals "the thing to do" — do not spend it
  on static decoration.
- Status: `success` / `warning` (Okabe-Ito yellow #F0E442) / `error` + `Bg`
  variants — consumed via the `stateColors` grammar (onTrack / watch / act /
  neutral). Body-weight trends are Class B: never red/green.
- Text: `textPrimary` / `textSecondary` / `textMuted` / `textDisabled` —
  WCAG ratios documented in theme.js and asserted in theme.test.js.
- Data: `macroProtein/Carb/Fat/Fibre` (category hues, never adherence),
  `chartLine/chartFill`, `gold/silver/bronze`, `celebrationEmber/Violet`
  (confetti only), `scrim` (every backdrop), `camera`.

Tints: use `withAlpha(colour, alpha.X)` with the **named stops** —
`alpha.ghost .08 · tint .12 · soft .19 · edge .25 · mid .33 · strong .40 ·
half .50`. Do not invent new alpha values.

---

## TYPOGRAPHY

System fonts. Use the `type` roles, never hand-rolled size/lineHeight pairs:

`display` 40/black · `h1` 32/bold · `h2` 24/bold · `h3` 20/semibold ·
`title` 17/semibold · `body` 16/regular · `bodyStrong` 16/semibold ·
`bodySm` 13/20 regular (multi-line small copy — use this instead of
fontSize.sm + a raw lineHeight) · `label` 13/medium (single-line labels) ·
`caption` 11 · `captionTight` 11/16 (two-line captions).

Numbers the user reads as data (weights, reps, kcal, timers) use
`type.num(role)` for tabular figures. `fontSize.micro` (10) is for chart
axes ONLY. All sizes scale ×1.2 under the larger-text setting — another
reason raw values are banned. 11px is a caption size, not a body size: if
copy runs to sentences, it wears `bodySm` or larger.

**Letter-spacing stays neutral (2026-07-09, D3).** Every `letterSpacing.*`
role is 0 except two named exceptions: `letterSpacing.overline` (0.5) for
uppercase section/eyebrow micro-labels, and `letterSpacing.wordmark` (2) for
the two brand-wordmark sites (SettingsAbout app name, PRCelebration hero).
No other non-zero value is permitted; a raw numeric `letterSpacing` literal
in `src/screens/` or `src/components/` fails lint (same `no-restricted-syntax`
bank as `fontSize`/`fontWeight`). Omit the property entirely for the neutral
case (0 is the React Native default).

---

## SPACING, RADIUS, ICONS

- `spacing`: hair 1 · xxs 2 · xs 4 · xs2 6 · sm 8 · md 12 · lg 16 · xl 24 ·
  xxl 32 · xxxl 48. Off-scale literals (3, 5, 10, 14…) are drift — pick a step.
- `radius`: hair 2 (thin-bar caps) · xs 4 · sm 6 · md 10 · lg 16 (cards) ·
  xl 20 · full 999. Perfect circles use the `circle(size)` helper, never
  hand-computed `width / 2`.
- `iconSize`: sm 16 · md 20 · lg 24 · xl 32. `hitSlop` export for small
  targets; every interactive element ≥48dp effective — gym, sweaty hands.

---

## MOTION & FEEDBACK

- Durations/easings from `motion` (`micro 120 · state 200 · sheet 260 ·
  enter 320 · exit 220 · hero 440`; Material-3 bezier curves; `motion.spring`
  for press/drag). One `hero` moment per screen, maximum.
- **Reduce Motion is law**: every animation collapses (AnimatedEntrance,
  Skeleton, PRCelebration and the stack transitions show the pattern), and
  haptics run through `src/lib/haptics.js` — never raw `expo-haptics` — so
  the setting silences them too.
- Loading states use the `Skeleton` primitives in the real layout slots, not
  bare spinners. Press feedback: `PressableCard` for card-shaped touchables.

---

## LOADING STATES: SKELETON VS SPINNER

**Rule (2026-07-08, ultimate audit item 9): Skeleton for a known layout's
first load, `ActivityIndicator` only for an indeterminate in-place action.**
The two idioms exist for different jobs; do not mix them up.

- **Use `Skeleton`/`SkeletonCard`/`SkeletonRow`** when a screen's first
  paint is waiting on data for a layout you already know the shape of
  (a card, a list row, a hero). Render the placeholder in the exact slot the
  real content will occupy so nothing jumps when it arrives. This is what
  `HomeScreen.js` (`initialLoading` → `SkeletonCard` stack), `CoachOutputScreen.js`
  (`LoadingView` → `SkeletonCard` stack) and `DiaryScreen.js`/
  `FoodSearchScreen.js` (list rows → `SkeletonRow`) already do; treat them as
  the reference implementations.
- **Use `ActivityIndicator`** only for an indeterminate action with no
  content shape to preview: a button mid-submit, a single list row mid-action
  (e.g. `FoodSearchScreen.js` swaps one row's trailing icon for a small
  `ActivityIndicator` while that one item logs), or any spot where you do not
  yet know what the finished state will look like.
- A screen's **first load of its main content** is a Skeleton case, full
  stop, even if today it happens to render a bare `ActivityIndicator` — that
  is drift, not a legitimate spinner use, and reads as if two different apps
  built the loading states. Fix it in place using the shared `Skeleton`
  primitives; do not invent a new placeholder component per screen.

## COMPONENTS

Use the shared primitives before writing a local one: `Button` (variants
primary/secondary/tertiary/destructive), `Card` (tone/elevated/padding),
`Chip` (single-select pills — role `radio`), `EmptyState`, `BottomSheet`,
`SettingsPrimitives`, `Toast`, `AnimatedEntrance`, `Skeleton`. If a shared
primitive is missing a variant, extend it — do not fork a local copy; local
chip/section-header clones are exactly the drift the audits flagged.

**Header trio.** Every screen chrome is one of three canonical headers (no
fourth hand-rolled shape, no native React Navigation header — every
`Stack.Screen` sets `headerShown: false`):
- `ScreenHeader` — top-level tab screens (Today, Train, Eat, Progress, Coach):
  title left, compact Volyume V (or a passed `right` node) on the right.
- `BackHeader` — any pushed/detail/settings screen you navigate INTO: back
  chevron left, title centred, optional `right` action. `SettingsPage` wraps
  this for the whole Settings family.
- `ModalHeader` — full-screen modals presented over a tab (scanners,
  paywalls, add/edit sheets): close X on `closePosition` side (default
  `'right'`), title centred, optional `rightAccessory` on the opposite side
  (e.g. a Save button — pass `closePosition="left"` so the accessory renders
  on the right).
Justified exceptions (wizards, pre-account reveals, full-bleed story decks)
are documented inline where they occur; see `docs/DESIGN_SYSTEM.md`'s
"Header components" section for the full table.

---

## HARD RULES

- No raw hex/rgba in screens or components (exceptions above only).
- No em dash (—) in user-facing copy — lint-enforced; full stop, comma or colon.
- British English in all user-facing strings.
- Light mode EXISTS (user-selectable). Never assume dark values; never
  invert manually — the palette swap handles it.
- ED-safety presentation is design law: weight-adjacent surfaces respect the
  open-flag/calm-mode suppressions; celebrations are effort-framed, never
  weight-framed; body-weight trends are never coloured as good/bad.
- Accessibility: `accessibilityRole`/`State`/`Label` on every interactive
  element; single-select chips are `radio`; text must survive largerText ×1.2.
