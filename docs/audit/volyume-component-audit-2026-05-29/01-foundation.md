# 01 · Foundation, colour, type, spacing, shape, motion, primitives

Phase 2 research + Phase 3 assessment for the foundation layer:
`src/styles/theme.js` (read in full) and the foundation-class primitives
(`PressableCard`, `Skeleton`, `BrandMark`, `Illustrations`, `InfoTooltip`).

The foundation is the highest-leverage layer in the whole audit: a token
gap here repeats in every screen. Two systemic gaps found below
(no overlay token, no lineHeight/letterSpacing scale) each touch 9+
surfaces, so they lead the Phase 5 systemic list.

## Phase 2, best-in-class references for a token layer

- **USWDS (U.S. Web Design System)** publishes the clearest public token
  contract for the two things Volyume is missing: a normalised
  **line-height** token set (6 steps) and a **letter-spacing** token set
  that scales with size (looser at micro sizes, tighter at display
  sizes). Volyume has neither.
- **Atlassian Design** spacing: a single named spatial scale used by every
  component, with the explicit rule "space is a token, never a literal".
  Volyume has the scale (`spacing`) but still leaks literals (`padding: 6`,
  FAB shadows, tab label sizes).
- **Stripe / Linear** (product craft references, established behaviour):
  one motion contract (a small set of durations + a shared easing) applied
  uniformly; tinted surfaces derived from a base colour through a defined
  alpha ramp, not ad-hoc hex concatenation. Volyume has `motion` tokens
  but inlines durations, and tints colours by string concat (`+ '40'`).
- **Material 3 / Apple HIG** elevation + scrim: a named **scrim/overlay**
  token (one opacity for modal backdrops) so every dimmed surface matches.
  This is exactly the token Volyume lacks.

What separates best-in-class from average here: tokens are *semantic*
(`text.body`, `surface.scrim`) not just primitive (`#9E9E9E`), every
visual literal in a screen resolves to a token, and there is one motion
and one elevation story. Volyume is ~70% of the way there: the primitive
layer is unusually strong (WCAG ratios documented inline, accessibility-
mutable colours, lazy volume-band getters), but the semantic layer and a
few token categories are missing.

---

## Component: Colour palette (`colors`)

**File:** `src/styles/theme.js:8-60`, `volumeColors:191-196`,
`applyAccessibility:115-151`

**Current state:** Strong. Dark palette anchored on `#0D0D0D` (chosen over
pure black to avoid astigmatism halation, documented l.9-11). Every text
colour carries its measured contrast ratio in a comment (textPrimary
19.44:1, textSecondary 7.25:1, etc.). `colors` is a mutable copy of
`baseColors` so `applyAccessibility()` can swap in higher-contrast,
colour-blind-safe (Okabe–Ito), and larger-text variants at boot.
`volumeColors` uses getters so band colours follow the swaps without
re-import. Semantic statuses (success/warning/error + *Bg variants) and
brand-locked OAuth colours are present.

**Best-in-class reference:** Material 3 colour roles / Apple HIG semantic
colours, colours referenced by *role* (`surface.scrim`,
`border.subtle`) so usage intent is encoded, and surface tints derived
through a defined alpha function.

**Gap:**
1. **No scrim/overlay token.** Modal backdrops are hardcoded across 9+
   files at 0.4–0.65 opacity (InfoTooltip, ProGate, PeekMenu,
   WhatsNewSheet, FeedbackSheet, SyncStatusBadge, MacroBreakdownSheet,
   FoodDetailSheet, QuickAddSheet, PRCelebration, splash `#000000`).
   Backdrop darkness visibly varies sheet to sheet.
2. **No tinted-surface helper.** Components build tints by string concat
   (`accent + '55'`, `tint + '22'`, `colors.gold + '15'`,
   `colors.primary + '40'`). This is fragile (assumes 6-digit hex; breaks
   for the `rgba()` primaries like `primaryBg`) and inconsistent.
3. Two near-identical greys (`textSecondary #9E9E9E` 7.25:1 vs `textMuted
   #9B9B9B` 6.99:1) sit 0.26:1 apart, effectively the same colour with
   two names, inviting inconsistent usage.

**Improvement:** Add `colors.scrim` (one value, e.g.
`rgba(0,0,0,0.55)`) and route every backdrop through it. Add a
`withAlpha(token, a)` helper (or pre-baked `tint.primary10/20`,
`tint.warning15`) that accepts both hex and rgba primaries, and replace
all string-concat alphas. Consider collapsing `textMuted` into
`textSecondary` unless a measured reason to keep both exists. Result:
every dimmed surface matches, tints survive a palette change, one fewer
ambiguous grey.

**Coherence impact:** High positive, fixes the single most visible
cross-screen inconsistency (backdrop darkness) and removes a fragile
pattern from ~6 components at once.

**Priority:** Critical (scrim token), High (tint helper).

---

## Component: Typography scale (`fontSize`, `fontWeight`)

**File:** `src/styles/theme.js:81-92, 153-160`; larger-text branch
`139-150`

**Current state:** `fontSize` xs(11)→display(40), eight steps, mutable for
the larger-text ×1.2 accessibility multiplier. `fontWeight` regular→black.
System font only (no `fontFamily` token). No `lineHeight` or
`letterSpacing` tokens.

**Best-in-class reference:** USWDS typesetting tokens, line-height and
letter-spacing are first-class tokens bound to size; ~1.5× body
line-height baseline, tighter tracking on large display type, looser on
micro. Linear/Stripe pair every size with a line-height in one type
ramp.

**Gap:** Line-height is hardcoded as raw integers in nearly every
StyleSheet (`lineHeight: 19/20/21/23/38` seen across ProSetupComplete,
PlanDetail, NutritionEducation, Welcome, founder card, etc.). The same
body size gets 19 on one screen and 20/21 on another, so vertical rhythm
drifts. No letter-spacing scale, so display headlines (32–40) are left at
default tracking where tighter reads better, and micro labels (11) at
default where looser reads better. No type "role", every screen
re-derives `{fontSize, fontWeight, lineHeight, color}` by hand, which is
why drift happens.

**Improvement:** Add a `lineHeight` token set (e.g. tight 1.2 / snug 1.35
/ normal 1.5 / relaxed 1.6 as multipliers, or per-size absolute values)
and a `letterSpacing` set (display -0.5, heading -0.25, body 0, label
+0.2, micro +0.4). Then add a small `type` role map
(`type.display`, `type.h1`, `type.body`, `type.label`, `type.caption`)
that bundles size+weight+lineHeight+letterSpacing, and migrate screens to
spread `...type.body` instead of hand-setting four properties. This is the
single highest-leverage typography change.

**Coherence impact:** High positive, converts ~60 screens' worth of
ad-hoc type into one ramp; vertical rhythm becomes uniform.

**Priority:** High.

---

## Component: Spacing scale (`spacing`)

**File:** `src/styles/theme.js:62-71`

**Current state:** Good. xxs(2)→xxxl(48), eight steps, used pervasively.
Close to an 8-pt grid with half-steps (2/4/8/12/16/24/32/48).

**Best-in-class reference:** Atlassian spacing, one scale, zero literals.

**Gap:** Minor leakage of literals where the scale would do: `SourceChip`
`padding: 6` (l.35), tab-bar `paddingBottom: 4 + insets` and `height: 60`
(RootNavigator l.327-328), various FAB sizes (56), reticle/frame camera
dims. None are wrong visually; they just bypass the token, so a future
rescale misses them.

**Improvement:** Sweep literal paddings/margins to the nearest token; for
genuinely fixed device dims (camera reticle, FAB diameter) introduce a
small `size`/`control` token group rather than bare numbers.

**Coherence impact:** Medium positive, tightens an already-good system.

**Priority:** Low.

---

## Component: Shape / radius (`radius`)

**File:** `src/styles/theme.js:73-79`

**Current state:** Good and intentional. sm(6)→xl(20)+full(999), tiered.
The CLAUDE.md design rules call out "modal corner is not a button corner"
and the tiers support that.

**Best-in-class reference:** Material 3 shape scale, radius tiers mapped
to component classes (chips/buttons small, cards medium, sheets large).

**Gap:** No documented mapping of which tier belongs to which component
class, so usage is by habit not by rule. Spot-check shows mostly
consistent use (buttons `lg`, cards `lg`/`xl`, chips `full`), but nothing
prevents drift.

**Improvement:** Document the tier→component mapping in a short comment
block in theme.js (button=lg, card=xl, sheet=xl, chip/pill=full,
input=md). No code change required beyond the note; it makes the existing
discipline enforceable in review.

**Coherence impact:** Medium positive.

**Priority:** Low.

---

## Component: Motion tokens (`motion`)

**File:** `src/styles/theme.js:206-214`

**Current state:** Tokens exist: card 220 / state 160 / micro 90 +
easeOut/easeInOut. The intent ("collapse to 0 under Reduce Motion at call
sites") is documented. PressableCard, Toast, Skeleton, RestTimer,
FeedbackSheet, the splash, and ProSetupComplete all gate animation on the
store's `reduceMotion` flag, that part is genuinely best-in-class.

**Best-in-class reference:** Stripe/Linear single motion contract, a tiny
set of durations + one easing applied everywhere, no inline literals.

**Gap:** The tokens are under-used. Many animated surfaces inline their
own durations rather than referencing `motion`: RootNavigator heroZoom
open 280 / close 200 (l.145-147), SplashScreen 550/650/320/280/300
(l.958-1002), PRCelebration, FeedbackSheet. So the "single motion
contract" exists as tokens but not in practice; durations vary widely
(90→650ms) with no documented rationale for the long ones.

**Improvement:** Add a couple more named durations if the splash genuinely
needs them (`entrance` ~550, `reveal` ~320), then migrate inline literals
to tokens. Where a long bespoke duration is deliberate (splash hero),
keep it but pull from a named token so it reads as a decision, not a
magic number.

**Coherence impact:** Medium positive, motion starts to feel authored by
one hand.

**Priority:** Medium.

---

## Component: Elevation / shadow (`shadow`)

**File:** `src/styles/theme.js:164-186`

**Current state:** Three tiers (sm/md/lg) with shadowColor/offset/opacity/
radius + Android elevation. Reasonable.

**Best-in-class reference:** Material 3 elevation, elevation tier maps to
surface role (resting card vs raised sheet vs FAB), and on dark themes
elevation often pairs with a subtle surface-tint lift, not just a drop
shadow (drop shadows read weakly on `#0D0D0D`).

**Gap:** DiaryScreen FABs hardcode their own shadow (l.650) instead of
`shadow.md`. On a near-black background, dark drop shadows are nearly
invisible, so the elevation hierarchy is carried mostly by surface
steps (`surface`/`surface2`/`surface3`), which is fine, but means
`shadow` is doing little work and is applied unevenly.

**Improvement:** Either commit to surface-step elevation (and drop most
shadows on dark) or define a consistent shadow-per-role rule and route the
FABs through `shadow.lg`. Pick one elevation story.

**Coherence impact:** Medium positive.

**Priority:** Low–Medium.

---

## Component: PressableCard (interaction primitive)

**File:** `src/components/PressableCard.js`

**Current state:** Excellent. Press-in spring (scale 0.97 + opacity dip),
fully reduceMotion-aware, default `accessibilityRole='button'`,
configurable scale/hitSlop, no hardcoded colours. This is the reference
for how every tappable surface should feel.

**Best-in-class reference:** iOS context-card press / Linear row press,
one tactile press model used for every interactive surface.

**Gap:** Not the component's fault, but it is *not used everywhere*.
EmptyState, many cards, and most buttons use `activeOpacity` or raw
TouchableOpacity instead, so the good press feel is islanded.

**Improvement:** Adopt PressableCard (or a `Pressable` variant built on the
same spring) as the default for all tappable cards/rows; reserve raw
opacity only for text links. Tracked in detail in 04-input.md and
08-coherence.md.

**Coherence impact:** High positive when propagated, unifies press feel
app-wide.

**Priority:** High (propagation, not the component itself).

---

## Component: Skeleton (loading primitive)

**File:** `src/components/Skeleton.js`

**Current state:** Good. Shimmer pulse, `SkeletonCard`/`SkeletonRow`
presets, `accessibilityRole='progressbar'`+label, pauses under
reduceMotion. One off-token fallback colour `#1F2024` (l.87).

**Best-in-class reference:** Linear / iOS skeletons, skeletons mirror the
exact final layout (same row heights/positions) so the swap to real
content is imperceptible.

**Gap:** The primitive is fine; adoption is the issue (used on Home,
BlockReflection, but Plans/PlanLibrary/Mesocycle/PlanDetail show nothing
while loading). Fallback colour off-token.

**Improvement:** Token the fallback colour (`surface2`); establish a
house rule "any screen that fetches on focus shows a skeleton that mirrors
its loaded layout". Detailed in 05-feedback.md.

**Coherence impact:** High positive when adopted.

**Priority:** Medium (the primitive), High (the loading-state rule).

---

## Component: BrandMark

**File:** `src/components/BrandMark.js`

**Current state:** Solid. `VolyumeMark`/`VolyumeIcon`, expo-image with RN
Image fallback, accessibilityLabel, no interaction states (correct).

**Best-in-class reference:** Monzo / Robinhood brand-mark usage, one
wordmark, consistent optical sizing across headers/splash.

**Gap:** ScreenHeader hardcodes `WORDMARK_HEIGHT = 22` + paddingTop to
optically align the mark with the title (ScreenHeader l.25,67); the splash
sizes it by a separate `HERO_ASPECT` math. Optical alignment lives in
consumers, not the mark.

**Improvement:** Expose a couple of named sizes on the mark
(`size="header" | "splash"`) that bake in the optical offset, so consumers
stop re-deriving alignment.

**Coherence impact:** Low–Medium positive.

**Priority:** Low.

---

## Component: Illustrations

**File:** `src/components/Illustrations.js`

**Current state:** Hand-tuned SVG empty-state art (barbell/calendar/
trophy/chart/scale), `size` prop, theme-token fills. Hardcoded stroke
widths; no a11y beyond structure.

**Best-in-class reference:** Duolingo / Headspace empty states, a small,
cohesive illustration set with one line weight and one palette, reused so
empty states feel like one family.

**Gap:** Stroke widths are per-illustration literals, so weights can drift
between drawings. No `accessibilityRole='image'`+label, so screen readers
get nothing from the empty state's main visual.

**Improvement:** Define a shared stroke-width constant and a single accent
rule; add an `accessibilityLabel` per illustration (decorative ones can be
`accessibilityElementsHidden`). Confirm all five share one visual weight.

**Coherence impact:** Medium positive, empty states are a brand surface.

**Priority:** Low–Medium.

---

## Component: InfoTooltip

**File:** `src/components/InfoTooltip.js`

**Current state:** Info-icon → modal with explanatory text. Backdrop
hardcoded `rgba(0,0,0,0.65)` (l.32); no accessibilityLabel on the trigger
icon.

**Best-in-class reference:** Stripe docs / iOS popovers, a tooltip that
points at its source (anchored popover) rather than a full-screen modal
for one sentence, and a clearly labelled "more info" affordance.

**Gap:** A full-screen modal for a one-line explanation is heavier than
needed and breaks the "one footnote per surface" rule in CLAUDE.md if
overused. Backdrop off-token. Trigger has no a11y label, so VoiceOver
users can't tell what the "i" explains.

**Improvement:** Route backdrop through the new scrim token; add
`accessibilityLabel="More information"` + `accessibilityRole="button"` to
the trigger. Optionally downgrade from modal to an anchored popover for
short text. Audit call sites against the one-footnote rule.

**Coherence impact:** Medium positive.

**Priority:** Medium (a11y + scrim), Low (popover redesign).

---

## Foundation summary

Volyume's foundation is genuinely above average at the primitive layer:
documented WCAG ratios, accessibility-mutable colours, reduceMotion-aware
motion, and a true reference interaction primitive (PressableCard). It
falls short of best-in-class on the *semantic* layer:

| Gap | Surfaces hit | Priority |
| --- | --- | --- |
| No scrim/overlay token | 9+ sheets/modals + splash | Critical |
| No lineHeight/letterSpacing/type-role tokens | ~60 screens | High |
| Tint-by-string-concat (no alpha helper) | 6+ components | High |
| Motion tokens under-used (inline durations) | 4+ animated surfaces | Medium |
| Spacing/elevation literals leak | several | Low–Medium |
| Primitive adoption (PressableCard/Skeleton not universal) | app-wide | High (propagation) |

The first three are the leverage points: fixing them is small token work
that lifts most other categories. They carry into 05-feedback (scrim),
04-input (press model), and 08-coherence (type rhythm).

Sources:
- [USWDS, Line height tokens](https://designsystem.digital.gov/design-tokens/typesetting/line-height/)
- [USWDS, Letter spacing tokens](https://designsystem.digital.gov/design-tokens/typesetting/letterspacing/)
- [Atlassian Design, Spacing](https://atlassian.design/foundations/spacing)
- [Design Systems, Typography guides](https://www.designsystems.com/typography-guides/)
- [Mastering typography in design systems (UX Collective)](https://uxdesign.cc/mastering-typography-in-design-systems-with-semantic-tokens-and-responsive-scaling-6ccd598d9f21)
