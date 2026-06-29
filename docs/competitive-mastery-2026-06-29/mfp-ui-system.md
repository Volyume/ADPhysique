# MFP UI / Visual Design System — mastery audit

Date: 2026-06-29. Area: MyFitnessPal's visual system (palette, type, spacing,
card/list styling, calorie/macro hero, iconography, component patterns), and
the concrete token-level deltas vs VOLYUME's food surfaces.

## Evidence basis & honesty note

The MFP artifact is a **raw split-APK dump**, not a full apktool decode. Its
`res/values/` holds only the string-table-recovered `strings.xml`, `styles.xml`,
`public.xml`, `ids.xml`. There is **no `colors.xml`, `dimens.xml`,
`themes*.xml`** in the dump — those compile into the binary `resources.arsc`,
which is **not present/extracted**. Consequence:

- **Token NAMES are CONFIRMED** (recovered from the dex string table and
  `public.xml`): the colour token graph, the type ramp, the M3 surface/elevation
  ladder, component classes.
- **Exact HEX VALUES bound to brand tokens are NOT RECOVERABLE** from this
  artifact. The brand macro colours (`colorBrandCarb/Fat/Protein…`) are
  arsc-bound; no inline hex sits next to them in dex. **I have not fabricated
  any MFP brand hex.** The few literal `#RRGGBB` strings present in dex are
  charting/legacy values, flagged as such below.
- **Exact sp/dp type sizes are NOT RECOVERABLE** (compiled as constants; the
  dex string table does not carry them; the dp numbers it does carry are
  icon/spacing dimens, not the type ramp). Type scale is given by NAME/STRUCTURE
  only, marked INFERRED where I describe sizes.

Where a value is unrecoverable, it says so. MFP's diary/dashboard is Jetpack
**Compose** (confirmed by component classes), so almost nothing visual lives in
the XML layouts — those are legacy recipe/dialog remnants.

Sources used:
- `…/mfp/mfp_decoded/res/{values,layout,drawable}` (XML — sparse)
- `…/mfp/corpus/dex_strings_raw.txt` (token names + hex grep)
- `…/mfp/corpus/screens_components.txt` (Compose/databinding class names)
- `…/mfp/corpus/food_ui_copy.txt` (hero copy strings)

---

## 1. MFP's visual system (with evidence)

### 1a. Colour token graph — CONFIRMED (names), VALUES unrecoverable

MFP runs a full **named, semantic, light/dark-paired** colour system (Material-3
shaped). Token families recovered from dex (counts = name frequency in dex):

**Brand family** — `colorBrandPrimary`, `…Secondary`, `…Tertiary`,
`…Quaternary`, plus `…Premium` / `…PremiumPlus`, and `…Exercise`. Each carries
sub-variants: base, `…Text`, `…BG`, `…BGDark`, `…Gradient`, and `…Light`/`…Dark`
pairs. (CONFIRMED names; e.g. `colorBrandPrimaryBGLight`, `colorBrandFatGradient`.)

**Macro-specific brand colours** — this is the key one for food:
`colorBrandCarb` / `colorBrandCarbText` / `colorBrandCarbBG` (+ Light/Dark),
`colorBrandProtein` / `…Text` / `…BG`, `colorBrandFat` / `…Text` / `…BG` /
`…BGDark` / `…Gradient`. **CONFIRMED MFP gives carbs, protein and fat each their
OWN distinct hue, with a text-on tone, a fill tone, and a gradient.** (Hex values
unrecoverable — arsc-bound.) Publicly MFP's macro convention is teal carbs /
purple protein / orange-gold fat, but I cannot confirm the hexes from this
artifact, so I mark the *hues* INFERRED and only the *existence of per-macro
brand colours* CONFIRMED.

**Neutrals ladder** — 5 steps: `colorNeutralsPrimary` → `…Secondary` →
`…Tertiary` → `…Quaternary` → `…Quinary`, each with `…Light`/`…Dark`, plus
`colorNeutralsBackground`, `…Midground`, `…Inverse`, `…Black`/`…White`(+`Static`),
`…Ripple`. (CONFIRMED.)

**M3 surface/elevation ladder** — CONFIRMED full set:
`colorSurface`, `colorSurfaceDim`, `colorSurfaceBright`,
`colorSurfaceContainerLowest` → `…Low` → `colorSurfaceContainer` → `…High` →
`…Highest`, plus `colorSurfaceVariant`, `colorSurfaceInverse`. MFP separates
elevation by **surface-tint tier** (the M3 way) AND by shadow (see 1c).

**Background / semantic** — `colorBackgroundBlack`, `…DarkGray`, `…Floating`,
`…White`, `…Transparent(Static)`; `colorPrimary`, `colorPrimaryDark`,
`colorOnPrimary`, `colorOnSurface`, `colorAccent`. (CONFIRMED names; standard
AppCompat/M3 slots.)

**Literal hexes actually present in dex** (low-signal, mostly charts/legacy — do
NOT treat as the brand palette): `#FFFFFF`, `#000000`, `#333333`, `#171717`,
`#9B9B9B`, `#555555`; ARGB `#FF0073D5` (a known MFP blue, appears once),
`#FF3F85E7`, `#FF8BC368`/`#FF8BC367` (greens), `#FFCC3232` (red), `#FFA9B7FF`.
These read as nutrient-graph / progress-chart colours, not the design-system
tokens. CONFIRMED present; role INFERRED.

### 1b. Typography ramp — CONFIRMED (structure), sizes INFERRED

A complete semantic ramp, every role with weight variants
(`_TextRegular/_TextSemibold/_TextBold/_TextItalic`) — CONFIRMED names:

- `Mfp_Display1…Display6` (6 steps)
- `Mfp_Headline1…Headline5` (5)
- `Mfp_Body1…Body2`, `Mfp_Para1…Para2` (separate "body" vs "paragraph" ramps)
- `Mfp_Label1…Label4`
- `Mfp_Caption` (+ `_TextBold_Caps`)
- `Mfp_Button1…Button3` and component button styles
  (`Mfp_Button_ElevatedButton`, `…OutlinedButton`, `…UnelevatedButton`,
  `…TextButton`, `…ToggleButton`, each with `_Large` variants)

Takeaway: MFP's type system is **deeper and more role-specialised** than a
single 9-step scale — it splits Display/Headline/Body/Para/Label/Caption/Button
into separate ramps. Exact sp sizes UNRECOVERABLE. Font family UNRECOVERABLE
from this artifact (the "inter…" dex hits are the English word "internal" etc.,
not the Inter typeface — explicitly not confirmable).

### 1c. Card / list treatment — CONFIRMED elevation/shadow-led

MFP cards = Material `MaterialCardView` / Compose `Card`. Recovered usage:
`MaterialCardView` (42), `cardElevation`/`CardElevation` (41+37),
`shapeAppearance`/`shapeAppearanceOverlay` (224+87) for corner rounding, and
`strokeWidth`/`strokeColor` (65+65) as an **optional** outline. M3 elevation
tokens `elevation_level0`…`elevation_level5` are CONFIRMED present (6-step
shadow/tint ladder), plus `ElevationOverlay`/`ElevationOverlayColor`.

**Conclusion: MFP cards are shadow-/elevation-led with a rounded
`shapeAppearance`; the stroke is secondary/optional.** This is the opposite
emphasis to VOLYUME's dark cards (hard 1px border-led, no shadow). Corner radius
value itself is arsc-bound (unrecoverable as a number), but `RoundedCornerShape`
/ `CornerBasedShape` usage is heavy (CONFIRMED Compose rounded corners
everywhere).

Diary list rows are a classic **RecyclerView** (`DiaryAdapter`,
`DiaryLandscapeAdapter`, databinding `DiaryAdapter`) — not Compose. Recovered
list-item padding from XML (CONFIRMED, real dp): meal-type rows
`list_item_meal_type.xml` use `padding 25dp horizontal / 10dp vertical`; recipe
ingredient rows pad via dimen refs (names unresolved).

### 1d. Calorie / macro HERO — CONFIRMED component, layout INFERRED

The dashboard hero is Compose: `dashboard/ui/loggingprogress/LoggingProgressCard`
+ `LoggingProgressCardViewModel`, `GoalCardBaseViewModel`, `WeeklyHabitsCard`.
Hero chart primitives CONFIRMED in dex: **`MfpPieChart`/`MfpPieChartKt`**,
**`MfpCircularProgressBar`/Kt**, **`MfpLinearProgressBar`/Kt**. The legacy macro
display is a custom `PercentageDailyGoalsView` + `macro_wheel_and_details` id
(CONFIRMED in `public.xml`).

So MFP's calorie hero = a **circular progress ring/donut** (Calories) with the
big remaining number centred, and macros shown as **linear progress bars**
and/or a **pie wheel**, each in its **own macro brand colour** (carb/protein/fat
hues). The classic MFP framing `Goal − Food + Exercise = Remaining` is the
hero's mental model (goal/remaining copy CONFIRMED in `food_ui_copy.txt`:
`DailyGoal`, `EditGoals`, `$goalText`, `remaining`).

### 1e. Component patterns — CONFIRMED present

- **Bottom sheets**: extremely heavy — `BottomSheet`(1039), `BottomSheetScaffold`,
  `BottomSheetDialogFragment`, `BottomSheetContent`, `ModalBottomSheet` pattern.
  CONFIRMED MFP's add-food / pickers are sheet-led.
- **FAB**: `FloatingActionButton`(728) + **`ExtendedFloatingActionButton`**(459).
  CONFIRMED MFP uses both a round FAB and a label+icon **extended** FAB.
- **Chips**: `FilterChip`(35) and `mtrl_choice_chip` / `mtrl_chip_*` Material
  chip styles. CONFIRMED chip-based selection.
- Dialogs: `MfpAlertDialog`, one-button/two-button builders (CONFIRMED).

### 1f. Light/dark theming — CONFIRMED systematic

Every brand/neutral token has explicit `…Light` and `…Dark` variants
(`colorBrandPrimaryLight`/`…Dark`, `colorNeutralsSecondaryLight`/`…Dark`, etc.),
and there are `…Static` neutrals (theme-invariant). CONFIRMED MFP ships a
fully-paired, token-derived light/dark system — same architectural choice
VOLYUME made.

---

## 2. VOLYUME's visual system today (file-referenced)

Source: `src/styles/theme.js`, `src/components/food/{MacroRings,FoodRow,
FoodDetailSheet,MealSection,EntryRow}.js`, `src/screens/DiaryScreen.js`.

**Palette (dark, `theme.js:8–97`)** — deliberate, accessibility-first:
- `background #0D0D0D` (charcoal, not pure black — astigmatism/halation; AAA on text).
- **Elevation ladder** `surface #191917` → `surfaceElevated #222220` →
  `surface2 #2A2A27` → `surface3 #343431` (warm pull; PRIMARY dark depth cue, not shadow).
- `border #6E6E6E` (3.81:1, WCAG 1.4.11) — hard card edge; `borderSubtle #2E2E2C` hairline-in-card.
- Accent **amber**: `primary #F5A623`, `primaryFill #E08C0B`, `primaryBg rgba(245,166,35,.12)`; `onPrimary #0D0D0D`.
- Semantic: `success #4CAF50`, `warning #F0E442` (Okabe-Ito), `error #F44336` — but see §4: NOT used as macro good/bad.
- Text: `textPrimary #FFFFFF` (19.44:1), `textSecondary #9E9E9E`, `textMuted #9B9B9B`, `textDisabled #727272`.
- Paired **light** palette (`theme.js:109–144`) + **HC** and **CVD** modifier
  tables (`151–176`), applied at boot by `applyAccessibility` (`301–346`).

**Type (`theme.js:264–418`)** — one 10-step size scale
`micro 10 / xs 11 / sm 13 / md 16 (body) / lg 17 / xl 20 / xxl 24 / xxxl 32 /
display 40`, mapped to semantic roles `display/h1/h2/h3/title/body/bodyStrong/
label/caption` with line-height + letter-spacing tokens; `num()` adds
tabular-nums for data. Weights `400–900`.

**Spacing (`236–247`)** `hair1/xxs2/xs4/xs2 6/sm8/md12/lg16/xl24/xxl32/xxxl48`.
**Radius (`249–256`)** `xs4/sm6/md10/lg14/xl20/full999`. Food cards use `lg(14)`.
**Shadow (`433–455`)** sm/md/lg; in DARK these barely read (by design) — the
ladder carries depth; in LIGHT shadow opacities rise (`182`) to become the cue.

**Food components:**
- `MacroRings.js`: ONE amber Skia **calorie ring** (132px, 14px stroke,
  `bandColour()=primary` always), big centred kcal numeral (`fontSize 34`,
  `:328`), "remaining/over" beside it. Macros are **horizontal bars**
  (`macroTrack` h6, `macroFill backgroundColor: colors.primary` — amber for
  EVERY macro), protein is the primary bar (weight emphasis only, never colour).
  Card = `surface` + 1px `border` + `radius.lg`.
- `MealSection.js`: one meal = one bordered card (`surface`, `border`,
  `radius.lg`, `overflow hidden`); header `mealName` (bodyStrong) + subtotal
  `kcal · g P`; in-card flush entry rows; quiet "Add food" row (amber `+`) with
  hairline divider.
- `FoodRow.js`: list row `minHeight 56`, `borderBottom border`, name
  `md/semibold`, meta `sm/textMuted`, amber `add-circle` (26/22).
- `FoodDetailSheet.js`: `BottomSheet`; unit toggle + `+/−` stepper (48px);
  4 `MacroPill`s (kcal/P/C/F) all `surface2` neutral; amber "Add to diary".
- `DiaryScreen.js`: round **FAB 56px** amber with `shadow.lg` (`:1086`); meal
  cards `surface`/`border`/`radius.lg`.

---

## 3. Concrete visual deltas (where MFP reads easier / more premium)

Each tagged **[SAFE]** (token-level, preserves elevation-ladder +
adherence-neutral + WCAG 1.4.11 + CVD rules) or **[CONFLICTS]** (needs a founder
decision because it touches a VOLYUME rule).

**D1. Card depth: MFP elevation/shadow-led + larger radius vs VOLYUME hard 1px
border, radius 14.** MFP's `MaterialCardView` leans on `cardElevation` +
`shapeAppearance` (rounded, often ~12–16dp) with stroke optional; this reads
"softer/more premium". VOLYUME's `border #6E6E6E` 1px edge at `radius.lg(14)` is
crisper but flatter.
→ **[SAFE]** Nudge food-card radius `lg 14 → 16` (still one token; trivially
distinct from `md 10`). Do **not** drop the border or swap to shadow in dark —
that is the WCAG-1.4.11 card edge and the ladder is the intended dark depth cue.
The premium "soft" feel is already legitimately delivered by the elevation
ladder; the radius bump is the only safe part of this delta.

**D2. Macro colour: MFP gives carbs/protein/fat distinct hues; VOLYUME is
mono-amber by deliberate policy.** MFP's per-macro brand colours make the four
numbers instantly separable and feel "designed".
→ **[CONFLICTS — founder decision]** VOLYUME's adherence-NEUTRAL,
single-amber-for-every-macro is an explicit ED-safety/brand decision
(`MacroRings.js:78–85`, founder 2026-05-29). Per-macro hues are NOT a safe
change. *If* differentiation is ever wanted, the only rule-preserving lever is
**non-colour** (weight/position/label — already used for protein), or a single
CVD-safe neutral tint applied identically to all four (no good/bad encoding).
Surface as a decision; do not build.

**D3. Calorie hero "remaining" emphasis.** MFP centres the **remaining** number
as the hero inside the ring; VOLYUME centres **eaten kcal** and puts remaining in
a smaller side block (`MacroRings.js:261–282`). MFP's framing reads as "how much
left" at a glance.
→ **[SAFE]** Pure layout/weight reallocation within `MacroRings` (no token, no
colour, no rule touched) — optionally enlarge the remaining figure to match the
centre numeral. Adherence-neutral preserved (it's a factual value/target).
Low-risk, but it is a behavioural/IA change, not strictly "token-level" — flag
to founder as design, not styling.

**D4. Type ramp depth.** MFP has Display(6)/Headline(5)/Body/Para/Label(4)/
Caption/Button ramps; VOLYUME has one 9-role scale. MFP's finer steps give more
typographic "air" on dense screens.
→ **[SAFE but low-leverage]** VOLYUME's scale is sufficient and intentionally
lean; no change recommended beyond optionally adding a `display` letterSpacing
already present. Not a real premium gap.

**D5. Numerals as hero.** MFP's hero kcal uses a large Display weight. VOLYUME
already does tabular-nums + `fontSize 34` centre numeral.
→ **[SAFE]** Optional: route the kcal centre numeral through `type.num('display')`
sizing logic so it scales with Larger-Text accessibility (currently a hardcoded
34 with an eslint exception, `MacroRings.js:330–334`). Small correctness/polish
win; preserves all rules.

**D6. Chip/affordance polish.** MFP uses Material `FilterChip`/choice-chip with
tonal fills. VOLYUME's unit/meal selectors are bordered `surface2` buttons that
go `borderColor: primary` + `surface` on active (`FoodDetailSheet.js:293,338`).
→ **[SAFE]** Active chip could fill `primaryBg` (already a token,
`rgba(245,166,35,.12)`) for a clearer selected state, keeping the amber border
for the WCAG edge. One existing token; no rule touched.

**D7. Spacing rhythm.** MFP meal rows pad 25/10dp (CONFIRMED); VOLYUME rows pad
`lg16/md12` with `minHeight 48–56`. Comparable; no premium gap. No change.

---

## 4. Where VOLYUME is already BETTER

- **Adherence-neutral, no-shame palette.** VOLYUME never colours a macro/calorie
  as good/bad (mono-amber, factual value/target — `MacroRings.js:10–19,78–85`).
  MFP's per-macro hues + goal framing implicitly encode adherence. For the
  at-risk subgroup, VOLYUME's choice is materially safer. **Keep.**
- **Accessibility depth.** VOLYUME ships boot-applied **Higher-Contrast** and
  **CVD-safe (Okabe-Ito)** palettes, Larger-Text scaling, and computed-and-tested
  WCAG ratios (`theme.test.js`). No evidence MFP exposes equivalent in-app modes.
- **Charcoal-not-black + warm elevation ladder.** `#0D0D0D` + the
  `#191917→#343431` ladder is a deliberate astigmatism/halation mitigation and a
  genuine premium dark-depth system that doesn't rely on shadows reading on
  charcoal. MFP's `colorBackgroundBlack` is a plain black/dark-gray surface set.
- **WCAG 1.4.11 hard card edge.** VOLYUME's `border #6E6E6E` (3.81:1) guarantees
  card separation independent of shadow; MFP's elevation-led cards can lose edge
  contrast in some surfaces.
- **Tabular numerals everywhere data is read** (`num()`), so columns don't jitter
  — a premium data-UI detail MFP applies inconsistently.

---

## 5. Single highest-leverage SAFE visual change for the food surfaces

**Soften the food-card shell to MFP-grade roundness WITHOUT losing the dark
depth/edge rules: bump the food-card corner radius `radius.lg 14 → 16` and pair
the active selector chips with the existing `primaryBg` tonal fill (D1 + D6).**

Why this one: it is purely token-level (`theme.js:253` plus two `backgroundColor`
swaps to an existing token in `FoodDetailSheet.js`), touches every food card and
selector at once (`MacroRings`, `MealSection`, `FoodDetailSheet`, `DiaryScreen`),
and closes the biggest "feels flatter/less premium than MFP" gap — card softness
and selected-state clarity — while fully preserving the elevation ladder (still
the dark depth cue), the hard `#6E6E6E` WCAG-1.4.11 border (kept), the
adherence-neutral mono-amber macro policy (untouched), and CVD/HC modes (no
semantic colour added). It is reversible and asserts cleanly against
`theme.test.js`.

Explicitly NOT recommended as "safe": per-macro colour (D2) and the remaining-as-
hero reframe (D3) — both are real MFP advantages but collide with VOLYUME's
no-shame palette / IA decisions and must go to the founder as decisions, not be
built.
