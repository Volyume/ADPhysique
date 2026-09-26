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
  `chartLine/chartFill`, `scrim` (every backdrop), `camera`. Three groups of
  role were DELETED in D173 and must not come back;
  `src/lib/__tests__/rewardProps.guard.test.js` fails if any of them does.
  - `gold` / `silver` / `bronze` (T1). A trophy tier is a game mechanic, and
    amber discipline 3 forbids a medal colour alongside the accent.
  - `celebrationEmber` / `celebrationViolet` (T4). The confetti palette. Their
    only consumers were PRCelebration's particle builders, deleted with the
    burst; law 5 forbids the animation they existed for.
  - `shadow.glow` and its `theme.js` exception note (D174). Both consumers were
    dead or unreachable, the Home Start-button glow the exception reserved was
    never built, and the founder's design law says "No glow".

Tints: use `withAlpha(colour, alpha.X)` with the **named stops** —
`alpha.ghost .08 · tint .12 · soft .19 · edge .25 · mid .33 · strong .40 ·
half .50`. Do not invent new alpha values.

---

## TYPOGRAPHY

**Inter, shipped with the app — NOT system fonts.** This line said "System
fonts" until 2026-09-14 and was simply wrong: `src/styles/fonts.js` registers
seven real TTFs (Inter Regular/Medium/SemiBold/Bold/ExtraBold plus InterDisplay
Bold/ExtraBold) and `installTextDefaults()` makes Inter-Regular the RN default.
Weights come from the FACE, never from `fontWeight` alone: on a font registered
face-by-face, a bare `fontWeight` either does nothing or synthesises a faux
bold. Use `type.w(role, weight)` when you need a role at another weight.

Use the `type` roles, never hand-rolled size/lineHeight pairs:

`hero` 56/InterDisplay-ExtraBold · `display` 40/InterDisplay-Bold ·
`h1` 32/InterDisplay-Bold · `h2` 24/semibold · `h3` 20/medium ·
`title` 17/medium · `body` 16/regular · `bodyStrong` 16/medium ·
`bodySm` 13/20 regular (multi-line small copy — use this instead of
fontSize.sm + a raw lineHeight) · `label` 13/medium (single-line labels) ·
`caption` 11 · `captionTight` 11/16 (two-line captions).

(The h2/h3/title weights above also said bold/semibold/semibold and did not
match the code, which ships SemiBold/Medium/Medium. Corrected at the same time.)

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
- **Reduce Motion is law**, and law 5 below states it precisely: motion is
  REPLACED by a cross-fade, not removed. This bullet used to say "every
  animation collapses ... the stack transitions show the pattern", which named
  the exact behaviour law 5 forbids, and the stack transitions were indeed
  doing it -- `animationEnabled: false`, feedback deleted rather than replaced.
  Corrected 2026-09-15 (D182) when the stage 4 transition lane found the
  contradiction and the code behind it. AnimatedEntrance and Skeleton collapse
  correctly (there is nothing to cross-fade TO in an entrance); a stack
  transition cross-fades. Haptics run through `src/lib/haptics.js` -- never raw
  `expo-haptics` -- so the setting silences them too.
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

---

## THE SEVEN LAWS (design direction D, "Ledger, dark") - HISTORY, NOT LIVE

> STATUS (added 2026-09-26): the redesign this section describes was
> REVERTED on the founder's order of 2026-09-18 (commit `35fbdfeb`, app
> code restored to `c58aab3d`; register D193 records the verdict). The
> laws below, the direction-D guard they cite (deleted in the revert) and
> the "migrated-primitive" components named under "Writing a new
> component" (`BigNumber.js`, `WeekRibbon.js`, `LedgerRow.js`, all gone)
> are history. The LIVE style is the sections above this one plus the
> shipped primitives (`Card`, `Button`, `Chip`, `SectionLabel`,
> `InfoTooltip`, the header trio) and the frozen-plus-live
> `buildLiveStyles` pattern the tree carries. A lane that builds to the
> laws below builds the wrong app.

Ruled by the founder 2026-09-14 (**D165**, with **D164** behind it and
**D166** carrying their ED-safety answers and three corrections to the lead's
plan). Full plan and evidence:
`docs/design-redesign-2026-09-14/20-DIRECTION-AND-PLAN.md`. Guarded by
`src/__tests__/designDirectionD.guard.test.js`.

The founder's own statement of the direction, recorded verbatim because it
supersedes any paraphrase: *"Volyume should not look like a fitness app. It
should look like a premium personal performance system. No gamification. No
decorative fitness iconography. No gradients. No glow. No gratuitous cards. No
neon. No motivational bullshit. Use typography, spacing, hierarchy and data to
create visual interest. Amber means now / action / meaningful change. Large
typography establishes what matters. Rows establish information. Cards are
reserved for genuine objects. Every screen should have one obvious thing that
matters most. The interface should tell the user what happened, why it happened
and what to do next."*

**Law 1 — One loud thing per screen.** Exactly one element at `type.hero`,
always the thing the screen is FOR. The hierarchy, in the founder's words, is
*what am I doing → what do I need to know → what do I do*, and the first of
those is the loud one. A screen that wants two has not decided what it is
about. (Measured starting point: 73.9% of all typed text at 11 or 13 px, and
only two sites in 106 screens above 24 px through a type role.)

**Law 2 — Rows on the canvas; a card means an object.** Content sits on the
background, separated by space and a `borderSubtle` hairline. The founder's
correction is the rule: *"don't put everything in a card. A card should mean:
this thing is an object."* The test is objecthood. A workout, a plan, a person,
a photo are objects. A set is not, a macro number is not, a trend is not
necessarily, a button definitely is not.

**Law 3 — Geometry carries meaning.** `radius.control` (10) is anything you
press; `radius.lg` (16) is a card; `radius.full` is a pill; `circle(size)` is a
circle. Raw literals are a lint error, exempting `0`. Before this split one
token was the card, the button, the empty state, the tooltip and the tab pill
at once, so a button and a card were the same shape.

**Law 4 — Depth, not glass.** Surface-lightness steps and hairlines, each
asserted by the contrast suite. No blur, no glow, no depicted material. Both
platform owners shipped a user-level kill switch for their own glass within
twelve months of introducing it; `expo-blur` is not installed and adding it is
a founder-gated dependency.

**Law 5 — Motion with a ceiling.** Feedback starts inside 100 ms and settles
inside 400, decelerating in and accelerating out. Reduce Motion replaces motion
with a cross-fade rather than removing the feedback. No celebratory animation
and no reward haptics: that is the ED-safety rule, and it is also what keeps
the product from reading as a game.

**Law 6 — Amber means one thing: now.** Today's ribbon cell, the set you are
on, the one committing button, a personal best. Four disciplines: scarcity; no
warm ground; no co-occurring tells (never beside a flame, trophy, medal colour
or glow, all of which are being removed); and colour earned by data, never
applied because a row needs visual interest.

**Law 7 — A number states what it is.** The founder's addition, on a bare
"9,240" under a workout: *"You don't want the minimalist design to become
cryptic. That's an important distinction."* Every figure carries its unit, in
the user's own preference (`formatWithUnit(formatNumber(n), units)`), and its
name where the unit alone is not enough. Restraint is never bought with
ambiguity. Note the one naming trap: session tonnage is **"Total lifted"**,
never "Volume" — Volume means a muscle's weekly hard sets app-wide, and this
lens was renamed once already because colliding the two misled users.

### Writing a new component

Use the migrated-primitive pattern (`Card.js`, `Button.js`, `BigNumber.js`,
`WeekRibbon.js`, `LedgerRow.js`), NOT the frozen-plus-live double-write that
153 older files still carry. A frozen `StyleSheet.create` block holds only
palette-invariant properties — layout, `spacing.*`, `radius.*`, `borderWidth`,
`fontFamily.*`, `opacity`. Everything that changes between dark, light,
higher-contrast and colour-blind-safe (every `colors.*`, every `type.*` spread,
every `fontSize.*`, every `shadow.sm|md|lg`) is read from `useTheme()` in the
component body, memoized on `[t]`, and passed as the second element of the
style array. There is then no `buildLiveStyles`, because there is nothing left
in the frozen block to mirror.

Why this matters beyond tidiness: the double-write puts the same colour in two
places tens of lines apart with nothing comparing them. `LoggedSetRow`'s two
halves disagreed about a border colour — frozen `borderSubtle`, live `border` —
and the live half won, so the in-place set editor drew the bright "wireframe"
edge against its own stated intent, unnoticed.
