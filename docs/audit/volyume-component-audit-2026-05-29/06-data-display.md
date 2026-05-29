# 06 · Data display, charts, stats, rings, badges, rows

Phase 3 assessment of the data-display layer: `MacroRings`,
`MacroBreakdownSheet`, `VolumeBars`, `BlockProgressCard`,
`BodyDiagramHeatmap`, `FatigueTrendCard`, `Sparkline`, `SvgBarSparkline`,
`SourceChip`, `EntryRow`, `FoodRow`, `ExerciseCard`, plus the in-screen
charts, and the headline finding: **four different charting libraries**.

## Phase 2, best-in-class references

- **Whoop:** one consistent chart language across recovery / strain /
  sleep, same axis treatment, same colour semantics, everything visual
  and digestible in a unified view. The discipline is *one* chart system.
- **Strava (2025):** auto-generated **muscle maps** per workout, progress
  summary charts, shareable milestones, body-diagram visualisation is now
  table stakes, and Volyume already has it (`BodyDiagramHeatmap`).
- **MacroFactor / Cronometer:** macro rings/bars with exact numbers and a
  clear target line; the visual never replaces the number.
- **Robinhood:** charts stripped to essentials, one accent colour, no axis
  clutter, closest to Volyume's intended aesthetic.

What separates best-in-class from average: a single chart vocabulary (one
library, one axis/grid/colour treatment), numbers always present alongside
the visual, and charts that are *accessible* (described to assistive tech,
not silent SVG).

---

## Finding D0 (systemic): four charting libraries

**Evidence:** `react-native-gifted-charts` in **7** files (Sparkline,
MesocycleBuilder BarChart, PRWall LineChart, etc.), custom
`react-native-svg` in **4** (SvgBarSparkline, BodyDiagramHeatmap,
Illustrations, ShareCard), `@shopify/react-native-skia` in **3**
(MacroRings + 2), `victory-native` in **2** (ExerciseDetail
CartesianChart). So a lifter sees a gifted-charts bar chart on one screen,
a victory-native line chart on another, a Skia ring on a third, and a
hand-rolled SVG bar on a fourth, each with different line weights, corner
treatments, axis styles, animation, and colour application.

**Why it matters:** Charts are the core of a progress app; four libraries
means there is *no* shared chart language, the bundle carries three
redundant charting engines (size + cold-start cost), and a change to "how
charts look" can't be made once. It also multiplies failure modes (Macro
Rings' Skia has no fallback for environments without it, inventory note).

**Improvement:** Pick one primary charting approach and converge. Given the
brand (flat, single-accent, minimal axes) and that the team already
maintains clean custom SVG (`SvgBarSparkline` is genuinely nice), the
lowest-risk target is **custom `react-native-svg` + a thin shared chart
kit** (`<BarChart>`, `<LineChart>`, `<Ring>`) with one axis/grid/colour
treatment, keeping Skia only where it earns its keep (MacroRings'
performance) behind a fallback. Migrate gifted-charts and victory-native
out over time. This is a medium engineering effort with large coherence +
bundle payoff.

**Priority:** High (coherence + bundle).

---

## Finding D1 (systemic): charts are not accessible

**Evidence:** Sparkline, VolumeBars, SvgBarSparkline, FatigueTrendCard,
BlockProgressCard, and BodyDiagramHeatmap's regions have **no a11y**,
they're silent SVG. MacroRings describes its centre number but not the
ring shapes. A VoiceOver user gets nothing from most of the app's data
visualisations.

**Why it matters:** For a data-centric app, the data being invisible to
assistive tech is a significant accessibility gap, and it's pervasive.

**Improvement:** Every chart gets an `accessibilityLabel` summarising the
data ("Chest volume 14 of 18 sets, optimal"), and tappable SVG regions get
`accessibilityRole='button'` + label (BodyDiagramHeatmap muscles). Bake
this into the shared chart kit (D0) so new charts are accessible by
default.

**Priority:** High.

---

## Component: MacroRings

**File:** `src/components/food/MacroRings.js`

**Current state:** Visually the signature data element, concentric Skia
rings (kcal centre + P/C/F outer) vs target, tappable to breakdown.
`bandColour()` centralises the amber-neutral colour decision (good).
role+label when tappable.

**Best-in-class reference:** Apple Activity rings / MacroFactor, rings
with the exact number always visible and a clear target read.

**Gap:** Skia Canvas with **no fallback** for environments without it (a
crash/blank risk). Ring shapes not described to a11y (numbers help). It's
the one Skia surface in the food layer, so it carries Skia as a dependency
largely alone.

**Improvement:** Add a graceful fallback (the existing SVG bar/ring
approach) when Skia is unavailable; add a full a11y summary ("1,840 of
2,100 kcal; protein 120 of 160g…"). Keep Skia if it measurably beats SVG
for the ring animation.

**Coherence impact:** High (signature element).

**Priority:** High (fallback + a11y).

---

## Component: BodyDiagramHeatmap

**File:** `src/components/BodyDiagramHeatmap.js`

**Current state:** A real strength, front/back muscle map, colour-coded
volume, tappable regions + legend. This is exactly the Strava-2025
muscle-map pattern, and Volyume already has it.

**Gap:** SVG regions have `onPress` but **no `accessibilityRole`** (l.47),
so the map is unusable by screen readers and the tap affordance is
undiscoverable to them. Colour-only encoding of volume status (no
secondary cue) is a CVD risk, though the colour-blind-safe palette swap
mitigates it globally.

**Improvement:** Add role+label per region ("Chest: over MAV, tap for
detail"); ensure the legend remains legible under the colour-blind palette;
consider a subtle pattern/intensity cue in addition to colour.

**Coherence impact:** High, it's a hero data surface.

**Priority:** High (a11y).

---

## Component: VolumeBars

**File:** `src/components/VolumeBars.js`

**Current state:** Good and information-dense, weekly working-sets-vs-MRV
bars per muscle with MEV/MAV landmark ticks, data-driven fills via
`volumeColors` (so it tracks the colour-blind swap). No a11y.

**Best-in-class reference:** RP Hypertrophy / Boostcamp volume landmarks,
clear MEV/MAV/MRV banding with the number.

**Gap:** No a11y label per bar. Landmark ticks + band colours are good but
rely on the user knowing what MEV/MAV/MRV mean (a tooltip/legend question,
not a chart bug).

**Improvement:** Per-bar a11y label; ensure one accessible legend explains
the landmarks (one footnote per surface, per CLAUDE.md).

**Coherence impact:** Medium positive.

**Priority:** Medium.

---

## Component: BlockProgressCard

**File:** `src/components/BlockProgressCard.js`

**Current state:** Planned-vs-actual sets per muscle. Sub-70% bar colour
hardcoded `rgba(245,158,11,0.25)` (l.35), off-token. No a11y.

**Gap:** Off-token colour (should be a `tint.primary25` via the alpha
helper); no a11y; visually close to VolumeBars but not sharing its bar
rendering (two bar implementations for similar data).

**Improvement:** Token the colour; add a11y; share the bar primitive with
VolumeBars once the chart kit exists.

**Priority:** Medium.

---

## Component: FatigueTrendCard

**File:** `src/components/FatigueTrendCard.js`

**Current state:** Recent-session fatigue as a bar sparkline (via
SvgBarSparkline) + a coaching read line. Clean. No a11y.

**Gap:** No a11y summary of the trend; the coaching read is informational
text only (good, on-voice). Depends on SvgBarSparkline (the chart to
standardise on).

**Improvement:** a11y summary ("Fatigue trending up over last 5
sessions"); promote SvgBarSparkline as the standard bar renderer.

**Priority:** Medium.

---

## Component: Sparkline vs SvgBarSparkline

**Files:** `src/components/Sparkline.js` (gifted-charts),
`src/components/SvgBarSparkline.js` (custom SVG)

**Current state:** Two inline-trend components from two different
libraries. Sparkline (gifted-charts line, null-filtering, <2pt
placeholder) and SvgBarSparkline (custom SVG bars, labels/colours). Both
fine individually.

**Gap:** This is D0 in microcosm, two sparkline components, two libraries,
for the same job (tiny inline trend). Neither has a11y.

**Improvement:** Standardise on the custom SVG one (lighter, no extra lib,
already on-brand); reimplement the line variant in the same kit; add a11y.
Retire the gifted-charts dependency where SvgBarSparkline can cover it.

**Coherence impact:** High positive (kills a library).

**Priority:** High (part of D0).

---

## Component: SourceChip

**File:** `src/components/food/SourceChip.js`

**Current state:** Good small badge (OFF/USDA/CoFID/Custom/OCR),
tabular-nums, a11y label. `padding: 6` literal (l.35).

**Gap:** Off-token padding only. It's a clean badge; could be the base for
a shared `<Badge>`/`<Tag>` (none exists, strength-level badges in PRWall,
featured/active badges in PlanDetail, tier badges all re-implement the
pill).

**Improvement:** Token the padding; consider extracting `<Badge tone>` from
it and adopting in PRWall / PlanDetail / ProBadge so all pills match.

**Priority:** Low–Medium.

---

## Component: EntryRow

**File:** `src/components/food/EntryRow.js`

**Current state:** Strong diary row, name/brand/qty/kcal/macros,
swipe-delete, checkbox multi-select, long-press. a11y both modes, minHeight
48. Checkbox check colour hardcoded `#000` (l.41).

**Gap:** One off-token colour. Otherwise a model list row, but it's a
food-specific row, not the shared `<Row>` proposed in 03-layout; the macro
numbers are well laid out and could inform the generic Row's trailing-metric
slot.

**Improvement:** Token the check colour; use as a reference when building
the shared `<Row>`.

**Priority:** Low.

---

## Component: FoodRow

**File:** `src/components/food/FoodRow.js`

**Current state:** Good search/browse row, name/brand/serving/kcal/source
+ fav/dislike icon, long-press cycles preference, a11y with preference
state, minHeight 56.

**Gap:** The long-press preference cycle has **no visual feedback** (the
a11y label describes it but a sighted user gets no animation/toast on
cycle), so it's a hidden gesture. The recently-fixed 100g-basis serving
display lives here (good).

**Improvement:** Add a brief visual confirmation on preference cycle (icon
pulse + toast "Added to favourites"); surface the gesture's existence
somewhere discoverable.

**Priority:** Medium.

---

## Component: ExerciseCard

**File:** `src/components/ExerciseCard.js`

**Current state:** Good, name/muscles/equipment/custom-tag/last-logged +
add button (36×36), a11y on the outer card, wrapped in PressableCard (so it
gets the good press model, a positive example of primitive reuse).

**Gap:** Add button 36×36 is below the 44px target min. Otherwise solid and
a good example of using PressableCard.

**Improvement:** Bump the add target to 44px (or add hitSlop). Hold this up
as the template for how other cards should adopt PressableCard.

**Priority:** Low–Medium.

---

## In-screen charts

**Files:** ExerciseDetail (victory-native CartesianChart, custom date
parsing l.23-50), MesocycleBuilder (gifted-charts BarChart, hardcoded
layout), PRWall (gifted-charts LineChart), AnalyticsScreen (mixed).

**Gap:** These are the main D0 offenders, three libraries across four
screens, each with bespoke axis/colour/layout. ExerciseDetail even carries
its own date-parsing helper because the chart lib needs a specific format.

**Improvement:** Migrate onto the shared chart kit (D0); centralise the
date/x-axis formatting.

**Priority:** High (part of D0).

---

## Data-display summary

| Item | Gap | Priority |
| --- | --- | --- |
| Four charting libraries | no chart language; bundle bloat | High |
| Charts not accessible (silent SVG) | pervasive a11y gap on core data | High |
| MacroRings no Skia fallback | crash/blank risk on signature element | High |
| BodyDiagramHeatmap regions no a11y role | hero map unusable by screen readers | High |
| Two sparkline components/libs | redundancy | High (part of D0) |
| No shared `<Badge>` | pill styles drift (PRWall/PlanDetail/tier) | Low–Medium |
| Off-token colours (BlockProgress, EntryRow check) | tint helper | Medium |
| Small targets (ExerciseCard add 36) | 44px | Low–Medium |

Top data-display move: **converge on one chart kit (custom SVG-based) with
a11y baked in**, retiring gifted-charts and victory-native. It fixes the
single biggest coherence gap in the part of the app that matters most for a
progress product, shrinks the bundle, and makes every chart accessible at
once. Volyume already owns two of its best data surfaces, the muscle map
and the macro rings, so the raw capability is there; it just isn't unified.

Sources:
- [Strava, muscle maps & strength experience (Whoop press)](https://www.whoop.com/us/en/press-center/strava-overhauls-strength-experience-with-expanded-partner-ecosystem-new-workout-log-and-muscle-maps/)
- [What's new on Strava, muscle maps & training tools](https://stories.strava.com/articles/whats-new-on-strava-muscle-maps-new-sports-and-expanded-training-tools)
- [Strava, progress summary chart](https://support.strava.com/hc/en-us/articles/28437860016141-Progress-Summary-Chart)
