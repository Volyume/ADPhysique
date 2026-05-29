# 03 · Layout, cards, sections, lists, grids, containers

Phase 3 assessment of the layout layer: the card surfaces (`GradientCard`
read in full; `MealSection`, `TierComparisonStrip`), the list/section
patterns used across screens, and, the headline finding, the **absence
of a shared base Card primitive**.

## Phase 2, best-in-class references

- **Stripe app components:** a prebuilt, propertied component set so every
  card/list/divider is the same molecule everywhere. The point: layout
  primitives are *components*, not copy-pasted styles.
- **Airbnb cards:** content-first cards where the card recedes and the
  content stands out; consistent corner radius and spacing across the
  whole grid.
- **Borderless / low-divider trend (2025):** best-in-class dark UIs lean on
  *surface elevation steps* and generous spacing to separate content, and
  reduce literal borders and divider lines. Volyume currently does the
  opposite in places, a fairly heavy 1px `#6E6E6E` border on most cards.
- **Atomic structure:** dividers, rows, and cards are "molecular" shared
  widgets. Volyume has these conceptually but not as components.

What separates best-in-class: one card molecule, one row molecule, one
divider, used everywhere, so a single change restyles the whole app, and
nothing drifts.

---

## Finding L0 (systemic): no base Card primitive

**Evidence:** `grep` finds **83 files** with inline
`backgroundColor: colors.surface` card blocks, and **16 screens** define
their own local `card:` style key. The only generic card component is
`GradientCard`, which is scoped by name and intent to *hero* cards. The
base card shell (`surface` bg + `radius.lg` + 1px `border` + `padding.lg`)
is re-declared by hand across the app. `PressableCard` covers the *press
behaviour* but not the *visual shell*, so the two concerns are split and
each screen reinvents the shell.

**Why it matters:** This is the layout equivalent of the foundation's
missing tokens. Because there's no `<Card>`, corner radius, border colour,
border presence, and padding drift card to card (some use `radius.lg`,
some `radius.xl`; some 1px border, some borderless; padding `lg` vs `md`).
It's also why the "borderless modern" restyle can't be done centrally
today, you'd have to touch 83 files.

**Improvement:** Introduce a single `<Card>` primitive that composes the
shell + (optionally) the PressableCard press model:
`<Card>`, `<Card.Pressable onPress>`, with props for `tone`/`elevation`/
`padding`/`borderless`. Fold `GradientCard` into it as `<Card tone=...>`
(keep the export as an alias so call sites don't break). Migrate
incrementally, highest-traffic screens first (Home, Diary, Plans). After
migration, the "reduce borders, lean on surface steps" decision becomes a
one-file change.

**Priority:** High (highest-leverage layout move).

---

## Component: GradientCard

**File:** `src/components/GradientCard.js` (read in full)

**Current state:** Good and honestly documented, it's a *flat* accent-
border hero card; the name is legacy and the file comment says so
(l.4-9), explicitly tying to the no-gradient locked rule. Tones
(primary/success/warning/error/gold/neutral), `tint` override, `borderless`
mode, optional accessibilityLabel. Base = `surface` + `radius.lg` + 1px
border + `padding.lg`.

**Best-in-class reference:** Stripe component card, one card, configurable
emphasis.

**Gap:**
1. The misleading name (`GradientCard` for a non-gradient card) is a
   readability tax on every call site; new contributors will expect a
   gradient.
2. Accent border via `accent + '55'` string concat (l.38), the fragile
   alpha-concat pattern flagged in 01-foundation; breaks if a tone is ever
   an `rgba()` value.
3. It's a *hero* card only; it doesn't (and shouldn't, as named) serve as
   the base card, which is why 83 files bypass it.

**Improvement:** Rename to `AccentCard` (alias `GradientCard` for
back-compat) or fold into the new `<Card tone>`. Replace the alpha concat
with the `withAlpha()` helper / pre-baked tint token. Keep the excellent
documentation.

**Coherence impact:** High positive when it becomes part of one Card
system.

**Priority:** High (as part of L0), Medium (rename + alpha fix
standalone).

---

## Component: MealSection

**File:** `src/components/food/MealSection.js`

**Current state:** Good section molecule: uppercase slot header + summed
kcal + dashed "Add food" row + swipeable entry rows. Theme tokens, a11y
label on add, minHeight 48 touch target.

**Best-in-class reference:** MacroFactor / Cronometer diary sections, a
clean meal group with an unobtrusive add affordance and a clear running
total.

**Gap:** The dashed-border add row is a slightly dated affordance (dashed
borders read as "placeholder/upload zone"). No loading state when `onAdd`
fires (taps feel unacknowledged on slow nav). This is one of the few real
section components, its pattern (header + total + rows + add) should be
the template other grouped lists copy, but it isn't generalised.

**Improvement:** Reconsider the dashed border (a quiet ghost row or a
trailing "+ Add" text button reads more current). Generalise the
header+total+rows shape into a `<SectionList>`-style layout molecule that
PlansScreen / WorkoutHistory grouped sections can reuse.

**Coherence impact:** Medium positive.

**Priority:** Medium.

---

## Component: TierComparisonStrip

**File:** `src/components/TierComparisonStrip.js`

**Current state:** Two-column Pro/Complete pricing compare with 3 locked
difference rows; tokens; tappable columns when handlers passed.

**Best-in-class reference:** Notion / Stripe pricing tables, a scannable
comparison where the recommended column is clearly (but not garishly)
elevated, and rows align on a baseline grid.

**Gap:** Comparison copy hardcoded in `COMPARISON_ROWS` (l.22-26), fine
for 3 locked rows, but couples copy to the component. As a *layout* piece
it's solid; the main risk is it being a bespoke two-column grid that
doesn't share a column/row primitive with anything else (so its alignment
rules live only here).

**Improvement:** Low-urgency. If a generic two-column compare is needed
elsewhere (e.g. before/after stats), extract the column grid; otherwise
leave it. Ensure the highlighted column uses the accent-border Card once
`<Card>` exists, for visual consistency with other emphasised surfaces.

**Coherence impact:** Low–Medium.

**Priority:** Low.

---

## Pattern: lists & grids across screens

**Files:** FlatList in BuildWorkout, RoutineDetail, PlanLibrary,
ExerciseLibrary (with useMemo), MyMeals, MyRecipes; `map`-in-ScrollView in
PlansScreen and ActiveWorkout's exercise carousel; mixed grids in
AnalyticsScreen (Explore grid), ProGoalSetup (goal/weak-point grids).

**Current state:** Mostly FlatList where it matters, which is good. Grids
are hand-laid with flexWrap + width math per screen.

**Best-in-class reference:** One list row molecule + one grid wrapper, so
spacing/gutters are identical across screens.

**Gap:**
1. **Virtualisation inconsistency:** ActiveWorkout exercise carousel
   (l.477) and the Plans page render lists via `map` inside a ScrollView.
   ActiveWorkout in particular can hold many exercises × many sets, `map`
   means every row mounts at once (perf + memory during a long session,
   the worst time for jank). The CLAUDE.md design rules also warn against
   "stat tiles in a 2×2 just because there are four numbers", relevant to
   the hand-laid grids.
2. **No grid wrapper:** each grid re-derives gutters/widths, so the Explore
   grid, goal grid, and weak-point grid don't share spacing.
3. **No standard list row:** rows are re-built per screen (MyMeals row,
   MyRecipes row, plan card, exercise card) with slightly different
   heights (48/56/64) and press models.

**Improvement:** Convert the ActiveWorkout carousel and Plans lists to
FlatList (or `FlashList`), Critical for ActiveWorkout given session
length. Add a `<Grid columns gap>` wrapper and a `<Row>` molecule
(leading icon / title+subtitle / trailing) that the settings, meals,
recipes, and plan lists adopt. Standardise row height to a small set
(e.g. 56 default, 64 for two-line).

**Coherence impact:** High positive, rows and grids are everywhere.

**Priority:** Critical (ActiveWorkout virtualisation), High (Row/Grid
molecules).

---

## Layout summary

| Item | Gap | Priority |
| --- | --- | --- |
| No base `<Card>` primitive (83 inline card blocks) | radius/border/padding drift; can't restyle centrally | High |
| ActiveWorkout/Plans use `map` not FlatList | perf/memory during long sessions | Critical |
| No `<Row>` / `<Grid>` molecules | row heights + grid gutters drift | High |
| GradientCard misnamed + alpha-concat | readability + fragile tint | Medium |
| MealSection dashed add + no onAdd feedback | dated affordance | Medium |
| Heavy 1px borders vs modern surface-step elevation | dated look on dark | Medium (decide via `<Card>`) |

Top layout move: **create the `<Card>` + `<Row>` + `<Grid>` molecules** and
migrate the high-traffic screens. It unlocks central restyling and kills
the biggest source of layout drift. Then **virtualise ActiveWorkout**
(correctness/perf, not just polish).

Sources:
- [Stripe apps, UI components](https://docs.stripe.com/stripe-apps/components)
- [Stripe apps, Design your app](https://docs.stripe.com/stripe-apps/design)
- [Card UI examples & best practices (Eleken)](https://www.eleken.co/blog-posts/card-ui-examples-and-best-practices-for-product-owners)
- [Card UI design fundamentals (Justinmind)](https://www.justinmind.com/ui-design/cards)
