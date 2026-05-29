# 08 · System coherence (Phase 4)

Stepping back from individual components: does the full set feel designed
together, or assembled? This synthesises 01–07 across the six coherence
axes the brief names, then calls out the outliers and the components strong
enough to set the standard.

The one-line verdict: **Volyume has unusually strong individual components
sitting on top of a thin shared layer.** The primitives (PressableCard,
Toast, SetEntry, RestTimer, MacroRings, BodyDiagramHeatmap) are
best-in-class. But because there's no shared `Card`/`Button`/`Field`/
`BottomSheet`/chart-kit, each screen re-builds the basics, and small
inconsistencies accumulate into an "assembled, not authored" feel on the
seams. The fix is not redesign, it's *extraction and propagation*.

---

## Axis 1, Visual consistency

**State:** Mixed. The palette, the no-gradient flat-on-`#0D0D0D` rule, and
the amber accent are applied consistently, the app clearly has one look at
a distance. Up close, drift appears:

- **Cards:** base card shell re-declared in 83 files; radius (`lg` vs `xl`),
  border (1px vs borderless), and padding (`lg` vs `md`) vary card to card
  (03-layout L0).
- **Backdrops:** 9+ different scrim opacities (01-foundation; 05 F2).
- **Charts:** four libraries → four chart looks (06 D0).
- **Borders:** a fairly heavy 1px `#6E6E6E` border on most cards reads
  dated vs the modern surface-step approach (03).

**Verdict:** One brand, but the absence of `Card`/scrim/chart-kit lets
visual details drift. **High-leverage to fix** via extraction.

## Axis 2, Interaction consistency

**State:** Three press models coexist, `PressableCard` (spring, the good
one), ad-hoc `activeOpacity` (0.7/0.85/0.88, inconsistent), and raw
`TouchableOpacity` (no feedback, e.g. BackHeader chevron, InfoTooltip
trigger). Touch targets range from excellent (SetEntry 52, EntryRow 48,
FoodRow 56) to sub-44 (ExerciseCard add 36, PlateCalculator close 22,
unit chips). Tab-press always resets the stack (non-idiomatic, ×5
duplicated). Gestures like FoodRow's long-press preference cycle have no
visual feedback.

**Verdict:** **The biggest coherence gap after visuals.** Press feel should
be one model (PressableCard), targets ≥44, feedback on every gesture.

## Axis 3, Typographic consistency

**State:** Drifts because there's no type-role / lineHeight / letterSpacing
token (01). The same body size carries lineHeight 19 on one screen, 20/21
on another; headlines use default tracking where tighter reads better. Tab
labels and the splash bypass tokens entirely and don't scale with the
larger-text accessibility setting.

**Verdict:** **Inconsistent by construction.** A `type` role map fixes ~60
screens at once.

## Axis 4, Spacing & layout consistency

**State:** Best of the six axes, `spacing` is a real scale used widely.
Leaks: literal paddings (`SourceChip` 6, tab bar 4/60), no `<Grid>` wrapper
so gutters differ across the Explore/goal/weak-point grids, no `<Row>` so
list-row heights vary (48/56/64). Risk areas flagged in CLAUDE.md (2×2
stat grids for symmetry, three-card dashboards) need a spot-check on
AnalyticsScreen/Home.

**Verdict:** Good foundation, needs `Grid`/`Row` molecules and a symmetry
review.

## Axis 5, Colour & state consistency

**State:** Palette and semantic statuses are consistent and accessibility-
aware (the colour-blind/contrast swaps are genuinely ahead of the field).
But: disabled states differ (opacity 0.5 vs grey vs nothing), loading
states differ (skeleton vs spinner vs nothing), error states differ (Alert
vs Toast vs silent catch), and tints are built by fragile string-concat
(`+ '40'/'55'/'15'/'22'`). Chart/status colours sometimes hardcoded
instead of semantic tokens (SyncStatusBadge, BlockProgressCard).

**Verdict:** Base colour excellent; **state colour (disabled/loading/error)
is the inconsistent part**, driven by the missing Button + the
Alert-vs-Toast split.

## Axis 6, Motion & feedback consistency

**State:** The reduceMotion discipline is exemplary and uniform, nearly
every animated surface honours it via the store. But durations are inline
literals (90→650ms) rather than `motion` tokens, the hero-zoom transition
is on only 2 of ~60 routes (signal diluted), and haptics aren't obviously
systematic (present in RestTimer/PRCelebration; unclear on PeekMenu,
FoodRow cycle, button taps).

**Verdict:** Motion *gating* is best-in-class; motion *vocabulary* is
under-tokenised and unevenly applied. Define one haptic + duration
contract.

---

## Outliers to bring into line

- **Two header systems** (RN stack header + custom BackHeader/ScreenHeader)
  → sync badge present on some screens, absent on others; tint/title differ.
  *Unify.* (02, High.)
- **GradientCard** name (no gradient) → rename/fold into `<Card>`. (03.)
- **Four chart libraries** → converge on one kit. (06, High.)
- **Alert-driven errors + silent catches** → route through Toast. (05,
  High; safety-critical in HeldDecisionCard.)
- **Six bespoke bottom sheets** → one `<BottomSheet>`. (05 F2, High.)
- **Splash `#000000`** (vs brand `#0D0D0D`) → token the background. (02.)
- **ActiveWorkout / CoachOutput / Analytics** (2616/2062/1395 lines) →
  decompose; they concentrate re-render and maintenance risk. (07.)

## Components strong enough to set the standard

These are the references the rest of the system should be measured against.
Propagate their patterns rather than inventing new ones:

- **PressableCard**, the press model for *every* tappable surface.
- **Toast**, the channel for *every* confirmation/error.
- **SetEntry**, the bar for input density, targets, and a11y; its stepper
  should be extracted and reused.
- **RestTimer**, the bar for live-updating, accessible, motion-aware UI.
- **MacroRings + BodyDiagramHeatmap**, the bar for signature data
  visualisation (once given a11y + a Skia fallback).
- **The accessibility token system** (`applyAccessibility`, colour-blind/
  contrast/larger-text swaps, reduceMotion gating), already best-in-class;
  the rest of the app just needs to *use* the tokens it exposes (tab labels,
  splash, chart colours).

## The coherence thesis

Volyume reads as "assembled" only on the seams, and every seam traces back
to a *missing shared primitive*, not to a bad decision:

| Missing primitive | Seam it creates |
| --- | --- |
| `<Card>` | radius/border/padding drift (83 files) |
| `<Button>` | disabled/loading/press drift (14+ files) |
| `<Field>`/`<SearchBar>`/`<Chip>` | focus/error/selected drift |
| `<BottomSheet>` + scrim token | backdrop darkness drift (9+) |
| chart kit | four chart looks |
| type-role + lineHeight tokens | vertical-rhythm drift (~60 screens) |
| Toast-as-error rule | Alert vs Toast vs silent |
| skeleton rule | loading-state drift |

Build those eight, propagate them, and the app moves from "strong
components, assembled" to "best-in-class system, authored by one hand",
without touching the brand, the copy voice, or the feature set. That is the
through-line into 09-master-recommendations.
