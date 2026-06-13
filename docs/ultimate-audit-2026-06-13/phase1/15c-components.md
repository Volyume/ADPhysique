# Phase 1 — Component Library audit (batch C)

Volyume Ultimate Audit, 2026-06-13. READ-ONLY inventory. Token values resolved
against `src/styles/theme.js`. Every claim cites `file:line`. British English.

Token reference (theme.js): `fontSize.micro`(10, L257) `fontSize.xs`(11, L258)
`fontSize.sm`(13, L259) `fontSize.md`(16, L260) `fontSize.lg`(17, L261)
`fontSize.xl`(20, L262) `fontSize.xxl`(24, L263) `fontSize.xxxl`(32, L264);
`spacing.xxs`(2, L230) `spacing.xs`(4, L231) `spacing.xs2`(6, L232)
`spacing.sm`(8, L233) `spacing.md`(12, L234) `spacing.lg`(16, L235)
`spacing.xl`(24, L236) `spacing.xxl`(32, L237); `radius.xs`(4, L242)
`radius.sm`(6, L243) `radius.md`(10, L244) `radius.lg`(14, L245)
`radius.xl`(20, L246) `radius.full`(999, L247); `iconSize.sm`(16, L502).
Type roles: `type.label`(fontSize.sm 13 / medium, L402-405),
`type.body`(fontSize.md 16 / regular, L394-397),
`type.caption`(fontSize.xs 11, L406-409), `type.num('h3')`(fontSize.xl 20 /
tabular, via num L417 + h3 L387). Min comfortable touch target = 44px.

---

COMPONENT: ScreenHeader
WHAT IT DOES: Unified top-of-screen header — page title on the left, the Volyume
wordmark (or a caller-supplied `right` node) on the right, with an optional
subtitle line below (ScreenHeader.js:26-37).
WHERE IT IS USED: `grep -rl` -> src/screens/HomeScreen.js, AnalyticsScreen.js,
DiaryScreen.js, PlansScreen.js, YouScreen.js, and src/components/BackHeader.js.
Sample import: HomeScreen.js:12 `import ScreenHeader from '../components/ScreenHeader';`.
VISUAL QUALITY: premium — title is `fontSize.xl` (20) bold (ScreenHeader.js:54-55),
subtitle `fontSize.sm` (13) textMuted (L68-70); airy `paddingBottom: spacing.xs`
(4, L43) and `minHeight: 32` title row (L51). The 6px optical paddingTop on the
wordmark (L66) is a hand-tuned magic number rather than a token, but it is
documented as user-driven optical alignment (L61-66).
CONSISTENCY: matches app tokens/patterns — colours/spacing all from theme;
`WORDMARK_HEIGHT = 22` (ScreenHeader.js:24) is a hardcoded constant, not a token,
but documented as a cap-height match for the 24pt title; acceptable deviation.
USABILITY: works for all users — title + optional subtitle is self-explanatory;
`numberOfLines={1}` on both (L30, L35) protects layout from overflow.

---

COMPONENT: SearchBar
WHAT IT DOES: Single shared search input — leading search glyph, text field,
trailing clear button that appears only when there is a value (SearchBar.js:27-53).
WHERE IT IS USED: `grep -rl` -> src/screens/LogCardioScreen.js,
PlanLibraryScreen.js, and src/components/__tests__/inputs.test.js. Sample import:
PlanLibraryScreen.js:13 `import SearchBar from '../components/SearchBar';`.
VISUAL QUALITY: premium — `radius.md` (10) rounded bar on `inputBg` with a
1px `border` (SearchBar.js:62-65); input font `Math.max(16, fontSize.md)` (L72)
deliberately floored at 16 to stop iOS zoom-on-focus (commented L71).
CONSISTENCY: matches app tokens/patterns — all colour/spacing/radius/icon tokens
from theme (SearchBar.js:15, 57-75).
USABILITY: works for all users — recognisable magnifier + clear affordance; clear
button has 10px hitSlop (SearchBar.js:46) and accessibilityLabel "Clear search"
(L48). The 16px close glyph hit area is ~16+20 ≈ 36px before hitSlop; with the
10px slop it clears the comfortable target. Placeholder + accessibilityLabel both
default to "Search" (L21, L40).

---

COMPONENT: SegmentedControl
WHAT IT DOES: Equal-width segmented (radio-group) control; a bordered track of
pill segments, the selected one filled amber (SegmentedControl.js:9-30).
WHERE IT IS USED: `grep -rl` -> src/screens/ProGoalSetupScreen.js,
PlanUpdateScreen.js, ProOnboardingScreen.js, LogCardioScreen.js, and
src/components/__tests__/selectionControls.test.js. Sample import:
ProGoalSetupScreen.js:11 `import SegmentedControl from '../components/SegmentedControl';`.
VISUAL QUALITY: premium — `borderWidth: 1.5` track (SegmentedControl.js:35),
active fill `colors.primary` with `onPrimary` ink (L41, L43); label uses
`type.label` (fontSize.sm 13, L42).
CONSISTENCY: matches app tokens/patterns — proper `accessibilityRole="radiogroup"`
/ `"radio"` + selected state (L11, L20-21). One deviation: `borderRadius: radius.sm - 2`
(SegmentedControl.js:39) hand-computes a 4px corner rather than using `radius.xs`
(4); resolves to the same value but bypasses the token.
USABILITY: works for all users — segment height is `paddingVertical: spacing.sm + 2`
(10) plus label line height (SegmentedControl.js:38); total cell is roughly 34-36px,
**below the 44px comfortable target** for the tap zone, though wide horizontally.
Flag: short option labels only (no truncation handling); long labels could clip.

---

COMPONENT: SetEntry
WHAT IT DOES: The per-set Weight + Reps editor for an active workout — labelled
rows each with a − stepper, a numeric TextInput, and a + stepper; shows a live
estimated-1RM hint beside Reps for non-warmup sets (SetEntry.js:7-145).
WHERE IT IS USED: `grep -rl` -> src/screens/ActiveWorkoutScreen.js (Stepper.js
also names "SetEntry" only in a comment). Sample import: ActiveWorkoutScreen.js:10
`import SetEntry from '../components/SetEntry';`.
VISUAL QUALITY: premium — value inputs are `fontSize.xl` (20) bold tabular-nums
(SetEntry.js:223-227); stepper buttons are a generous 52x52 (SetEntry.js:208-209)
with `fontSize.xxl` (24) +/− glyphs (L215). Ghost (pre-fill) state dims to
textMuted (L229-231).
CONSISTENCY: matches app tokens/patterns — colours/spacing from theme; weight step
fixed at 2.5kg, "Gym weights are kg-only" (SetEntry.js:13-15). Note: this is the
ONE place using raw `Haptics.selectionAsync()` from expo-haptics directly
(SetEntry.js:3, 12) rather than the app's `lib/haptics` wrapper that the streak/
chart components use — inconsistent haptics path. Several declared styles
(`fieldLabelRow`, `plateBtn`, `perSideHint`, `rirRow`/`rirBtn*`, L157-256) are dead
— their JSX was removed (effort picker / set-type row, commented L135-143).
USABILITY: works for all users — clear labels, large targets, decimal entry handled
carefully (preserves a trailing "." so 21.25kg plates can be typed, L62-72).
The "Est. max ≈" 1RM hint (SetEntry.js:96) is jargon a newbie may not parse, but
it is supplementary, not blocking.

---

COMPONENT: SettingsPrimitives (SettingRow, SectionHeader, SettingsPage, settingsStyles)
WHAT IT DOES: Shared building blocks for the Settings landing page and sub-pages —
a tappable icon+label+value/arrow row, a section header, and a SafeAreaView+ScrollView
page wrapper (SettingsPrimitives.js:13-59).
WHERE IT IS USED: `grep -rl` -> 11 screens incl. SettingsScreen.js,
SettingsAccountScreen.js, SettingsPrivacyScreen.js, SettingsProfileScreen.js,
SnapshotsScreen.js, SettingsDisplayScreen.js, SettingsDataScreen.js,
SettingsNotificationsScreen.js, SettingsCoachingScreen.js, SettingsHealthScreen.js,
SettingsAboutScreen.js. Sample import: SettingsScreen.js:5
`import { SettingsPage, SettingRow, settingsStyles as styles } from '../components/SettingsPrimitives';`.
VISUAL QUALITY: premium — rows are `padding: spacing.lg` (16) with a 34x34 amber-bg
icon tile (SettingsPrimitives.js:88-95); label uses `type.body` (16), sub
`fontSize.xs` (11) (L97-98). Destructive variant swaps to error tint (L96, L99).
CONSISTENCY: matches app tokens/patterns — uses `PressableCard` for the one shared
press feel (L6, L17); a Switch passed as `rightElement` is auto-given the row label
for screen readers (L36-38). Minor: `settingIcon` uses `borderRadius: 9`
(SettingsPrimitives.js:91) — a hardcoded value, no matching token (radius.sm is 6,
radius.md is 10).
USABILITY: works for all users — row height ≈ 34 icon + 16+16 padding ≈ 66px, well
above target; accessibilityLabel combines label+value (L23). Clear chevron affordance.

---

COMPONENT: Skeleton (Skeleton, SkeletonCard, SkeletonRow)
WHAT IT DOES: Animated grey-block loading placeholders that mirror real content
shape; the shimmer pulses unless Reduce Motion is on (Skeleton.js:23-84).
WHERE IT IS USED: `grep -rl` -> 16 screens incl. HomeScreen.js,
WorkoutHistoryScreen.js, FoodSearchScreen.js, PlanLibraryScreen.js,
ExerciseDetailScreen.js, RecipeBuilderScreen.js etc. Sample import:
HomeScreen.js:16 `import { SkeletonCard } from '../components/Skeleton';`.
VISUAL QUALITY: premium — uses `surface3` fill (Skeleton.js:87), opacity pulse
0.45->0.85 over 750ms each way (L31-43), correctly collapsed to a static 0.6
opacity under reduceMotion (L24, L28, L55).
CONSISTENCY: matches app tokens/patterns — reads `reduceMotion` from the store
(Skeleton.js:21, 24), `accessibilityRole="progressbar"` + label "Loading" (L51-52).
Minor: the `radius` default `r = 6` (Skeleton.js:23) and several inline px
(width/height/marginTop 10/11, L67-80) are literal numbers rather than tokens,
expected for a layout-matching primitive.
USABILITY: works for all users — non-interactive; correctly announced as loading.

---

COMPONENT: Sparkline
WHAT IT DOES: Tiny inline SVG trend curve (no axes/labels/interaction); filters
non-finite values and renders a flat placeholder line when under 2 points
(Sparkline.js:21-63).
WHERE IT IS USED: `grep -rl` -> src/screens/MesocycleBuilderScreen.js,
LiftProgressScreen.js, AnalyticsScreen.js; src/components/ProgressSections.js,
FatigueTrendCard.js, WeightTrendCard.js, TodayStrip.js (SvgBarSparkline.js names it
only in a doc comment). Sample import: LiftProgressScreen.js:19
`import Sparkline from '../components/Sparkline';`.
VISUAL QUALITY: premium — smoothed path at `strokeWidth={1.5}` (Sparkline.js:57),
default colour `colors.primary` (L26); 0.3-opacity placeholder line keeps layout
stable before data (L44-51).
CONSISTENCY: matches app tokens/patterns — shares the chartGeometry maths with the
full chart (Sparkline.js:19); `pointerEvents="none"` (L55). Default `width`/`height`
(100/28) are literals, expected for a sizing primitive.
USABILITY: works for all users — `accessibilityLabel` is NOT set on the Svg here,
so a standalone Sparkline reads as nothing to a screen reader; in practice hosts
(TodayStrip, WeightTrendCard) wrap it in a labelled card, but a bare Sparkline is
not independently accessible. Flag for the experienced/AT user.

---

COMPONENT: Stepper
WHAT IT DOES: Reusable numeric +/- control (clamped to [min,max], steps by `step`,
optional unit/formatValue), extracted from the SetEntry pattern (Stepper.js:18-59).
WHERE IT IS USED: `grep -rl` -> ONLY src/components/__tests__/inputs.test.js. **No
screen or non-test component imports it** (the doc comment claims set counts /
reminder hours / recipe servings as intended consumers, Stepper.js:6-7, but none
wire it up). Effectively unused production code. Sample import (test):
inputs.test.js:10 `import Stepper from '../Stepper';`.
VISUAL QUALITY: premium — 44x44 buttons (Stepper.js:64-65) on `surface2` with
border; value `fontSize.lg` (17) bold tabular-nums, `minWidth: 56` (L74-81);
disabled at min/max dims to 0.5 with textDisabled glyph (L45, L55, L73).
CONSISTENCY: matches app tokens/patterns — `PressableCard`, theme tokens,
accessibilityRole/Label per button (Stepper.js:38-56).
USABILITY: works for all users — exactly 44px targets, clear +/- icons, value
spoken via accessibilityLabel (L47). Caveat: it is dead code, so it currently
serves no user; flag as unused.

---

COMPONENT: StreakWeeksSection
WHAT IT DOES: "Your weeks" — the deep consistency view: a headline run line, a
12-week CVD-safe glyph strip, an optional repaired-week line, longest run, a
plan-less weekly-goal chip editor, and a Pause control with a modal sheet
(StreakWeeksSection.js:42-174). Hidden under ED/wellbeing suppression (L47).
WHERE IT IS USED: `grep -rl` -> ONLY src/screens/ConsistencyScreen.js. Sample
import: ConsistencyScreen.js:16 `import StreakWeeksSection from '../components/StreakWeeksSection';`.
VISUAL QUALITY: premium — card uses `surface`/`radius.lg`/border (StreakWeeksSection.js:177-184);
shape-carries-meaning glyphs (no colour-only state, no red) at size 16 (L106);
goal chips 40x40 (L199); pause button and sheet options enforce `minHeight: 44`/`48`
(L208, L220).
CONSISTENCY: matches app tokens/patterns — uses `lib/haptics`, `withAlpha`, type
roles (L15, 19, 84, 92); state colours pulled from semantic tokens. One deviation:
`glyph` uses `marginRight: 2` raw px (StreakWeeksSection.js:189) instead of a token;
the modal uses a hand-rolled `withAlpha(colors.background, 0.6)` overlay (L211)
rather than the shared `colors.scrim` token (theme.js:88) — minor scrim drift.
USABILITY: works for all users — copy is plainly worded and forgiving; goal chips
have selected state + labels (L132-135). The glyph strip's meaning (kept/recovery/
covered/paused) is opaque without a legend on screen — the screen-reader summary
(L77) is clearer than the visual for a first-time user. No on-screen key for the glyphs.

---

COMPONENT: SvgBarSparkline
WHAT IT DOES: Pure-SVG bar mini-chart with optional per-bar colour and under-bar
labels, right-align option, and a generated accessibility summary
(SvgBarSparkline.js:31-99).
WHERE IT IS USED: `grep -rl` -> src/screens/MesocycleBuilderScreen.js;
src/components/ProgressSections.js, FatigueTrendCard.js. Sample import:
FatigueTrendCard.js:3 `import SvgBarSparkline from './SvgBarSparkline';`.
VISUAL QUALITY: acceptable — bars at 0.9 opacity, `rx={4}` corners
(SvgBarSparkline.js:78-80); default colour `colors.primary` / label `textMuted`
(L40-42). Bar label font is a hardcoded `fontSize={9}` (SvgBarSparkline.js:86) —
below even `fontSize.micro` (10); fine for axis micro-labels but does NOT scale
with the larger-text accessibility setting (SVG text ignores fontSize tokens).
CONSISTENCY: inconsistent (minor) — `barWidth`/`barGap`/`height` defaults and the
`rx={4}`, label `y` offsets, and `fontSize={9}` are all raw literals; the sibling
VolyumeChart uses the same raw `fontSize={9}` for its SVG labels (VolyumeChart.js:237,
273), so they agree with each other but neither uses theme tokens (SVG limitation).
USABILITY: works for all users — has an `accessibilityRole="image"` + generated or
caller summary (SvgBarSparkline.js:47-50, 62); the 9px labels are tiny but
supplementary. Self-hides on empty data (L45).

---

COMPONENT: TierComparisonStrip
WHAT IT DOES: Free vs Pro pricing-comparison strip (paywall / subscription) — two
columns, Pro highlighted, three feature-difference rows, live Play Store price
(TierComparisonStrip.js:27-84).
WHERE IT IS USED: `grep -rl` -> src/screens/PaywallScreen.js, CascadeGateScreen.js.
Sample import: PaywallScreen.js:26 `import TierComparisonStrip from '../components/TierComparisonStrip';`.
VISUAL QUALITY: premium — `borderWidth: 2` columns, highlighted column gets amber
border + `primaryBg` (TierComparisonStrip.js:96-103); price `fontSize.xxl` (24)
semibold (L110-114), header `fontSize.lg` (17, L104-108), rows `fontSize.sm` (13,
L120-124). Empty-cadence spacer keeps Free aligned with Pro (L46-48).
CONSISTENCY: matches app tokens/patterns — all theme tokens; price never hardcoded,
shows "…" until Google Play responds (TierComparisonStrip.js:67); cadence suffix
prevents annual/monthly misreads (L69). Aligns with billing rules (live price).
USABILITY: works for all users — clear two-column scan; Pro column Pressable only
when `onPickPro` provided (L58-59) with `disabled` otherwise. No per-row
accessibilityLabel grouping, but text is literal. Newbie-readable.

---

COMPONENT: Toast (ToastProvider, useToast)
WHAT IT DOES: App-wide ephemeral snackbar system — FIFO queue, one visible at a
time, slide+fade in from bottom, tap-to-dismiss, optional action button, and an
undo/onTimeout pattern for destructive actions (Toast.js:50-195).
WHERE IT IS USED: `grep -rl` -> ~37 screens + components (HomeScreen.js,
DiaryScreen.js, SubscriptionScreen.js, food sheets, ExercisePickerModal etc.).
Sample import: HomeScreen.js:18 `import { useToast } from '../components/Toast';`.
VISUAL QUALITY: premium — floats above the tab bar (`bottom: 80`, Toast.js:202)
with `shadow.lg` (L222); coloured left border per variant (L161, 215), icon at
size 18 (L170), text `fontSize.sm` (13) medium (L226-229), uppercase action label
(L240). Respects reduceMotion (durations -> 0, L99-108, 135-146).
CONSISTENCY: matches app tokens/patterns — all theme tokens; variant tints map to
semantic colours (success/error/warning/primary, Toast.js:40-47);
`accessibilityRole="alert"` + polite live region (L162-163).
USABILITY: works for all users — auto-dismiss 2.5s (errors 4s, undo 8s, Toast.js:40-47)
gives reading time; tap-anywhere dismiss; action button labelled (L183). The
`bottom: 80` is a hardcoded assumption about tab-bar height (L202) — could overlap
content on a screen without a tab bar, but consistent app-wide.

---

COMPONENT: TodayStrip (Pro-only)
WHAT IT DOES: Glanceable Home row under the session hero — up to three cells
(Weight one-tap log, Steps glance, Cardio "+Log"); expands to a morning weigh-in
input during the morning window; stacks under large font scale
(TodayStrip.js:52-366). Parent mounts it for Pro only (L13).
WHERE IT IS USED: `grep -rl` -> src/screens/HomeScreen.js, AnalyticsScreen.js, and
src/components/__tests__/TodayStrip.test.js. Sample import: HomeScreen.js:17
`import TodayStrip from '../components/TodayStrip';`.
VISUAL QUALITY: premium — `surface`/`radius.md`/border card (TodayStrip.js:369-377);
cell labels `fontSize.xs` (11) semibold tracked, values `fontSize.md` (16) semibold
tabular (L399-410); divided cells via 1px borders (L386-397). Logged tick uses the
single allowed state colour (`success`, L254) per the Class B colour rule (L20-23).
CONSISTENCY: matches app tokens/patterns — theme tokens throughout; sparkline is
identity amber not a state colour (L256); weight sparkline hidden under ED flag
(L255). Gating respected (Pro-only mount). Two small literals: `cellInner` uses
`gap: 2`/`minHeight: 40` (L398) and icon sizes 14/15 (L254, 273, 305) as raw px.
USABILITY: works for all users — strong morning-ritual affordance; rich
accessibilityLabels incl. tap/long-press hints (TodayStrip.js:247-249); stacks
rather than truncates at fontScale >= 1.3 (L177, 349-357). The logged cell's
dual tap(open trend)/long-press(edit) gesture (L243-244) is discoverable only via
the spoken hint; a sighted newbie may not know long-press edits.

---

COMPONENT: VolumeBars
WHAT IT DOES: Per-muscle weekly working-set bars with MEV/MAV landmark ticks and a
status-coloured fill + count, driven by `getVolumeStatus` (VolumeBars.js:5-41).
WHERE IT IS USED: `grep -rl "VolumeBars" src` and a repo-wide grep return **only its
own file** — no screen or component imports it. **Dead/unused code.** No sample
import exists.
VISUAL QUALITY: acceptable — 8px bar track (VolumeBars.js:58-65), `radius.full`
fill with `minWidth: 2` (L66-70), landmark ticks 2x12px in `border` colour
(L71-78); muscle name `fontSize.sm` (13, L52-57), count `fontSize.sm` bold
state-coloured (L79-84).
CONSISTENCY: matches app tokens/patterns — uses `volumeStatusColor` from theme
(VolumeBars.js:2, 14) and the algorithms landmarks; well token-aligned. Cannot be
judged against live layout because it is unmounted.
USABILITY: only makes sense to experienced users — MEV/MAV landmark ticks have no
on-screen legend; the rows have `accessibilityLabel` (L23) but the two unlabelled
landmark lines are meaningless to a newbie. Moot in practice since it is unused.

---

COMPONENT: VolyumeChart
WHAT IT DOES: The app's single line/area (and bar-variant) chart engine —
react-native-svg render plus an optional long-press scrub with crosshair, tooltip,
per-point selection haptic, and accessibility announce (VolyumeChart.js:46-293).
WHERE IT IS USED: `grep -rl` -> src/screens/BodyMetricsScreen.js,
VolumeHeatmapScreen.js, ExerciseDetailScreen.js; src/components/WeightTrendCard.js
(Sparkline.js references it only in a doc comment). Sample import:
BodyMetricsScreen.js:25 `import VolyumeChart from '../components/VolyumeChart';`.
VISUAL QUALITY: premium — area gradient via withAlpha (VolyumeChart.js:205-206,
223-228), dashed grid rules at 0.5 opacity (L235-236), scrub crosshair + ringed
active point (L261-267); tooltip card on `surface`/`radius.md`/border (L296-305)
with `fontSize.sm`/`fontSize.xs` text (L306-307). Defaults `interactive={false}`
to a clean static chart (L69).
CONSISTENCY: matches app tokens/patterns — colours from theme aliases, withAlpha,
spacing/radius/font tokens (VolyumeChart.js:35); shares chartGeometry with Sparkline/
SvgBarSparkline; haptics via `lib/haptics` (no-op under Reduce Motion, L8, 137).
SVG axis/label text is raw `fontSize={9}` (L237, 273) — does not scale with the
larger-text setting (RN-SVG limitation, same as SvgBarSparkline).
USABILITY: works for all users (static); the scrub adds a labelled hint
("Touch and hold... drag to read each point", L219) and announces values, but the
hold-then-drag interaction is advanced and undiscoverable without the AT hint —
acceptable as a progressive enhancement over a readable static chart.

---

COMPONENT: WeeklyStreakStrip
WHAT IT DOES: "This week" Progress strip — sessions-this-week count on the left,
the run state on the right; no-shame by construction (no "streak" word, no red,
withheld under suppression) (WeeklyStreakStrip.js:18-57).
WHERE IT IS USED: `grep -rl` -> ONLY src/screens/AnalyticsScreen.js. Sample import:
AnalyticsScreen.js:20 `import WeeklyStreakStrip from '../components/WeeklyStreakStrip';`.
VISUAL QUALITY: premium — `surface`/`radius.md`/border card, `minHeight: 56`
(WeeklyStreakStrip.js:60-72); count uses `type.num('h3')` (fontSize.xl 20 tabular,
L74), sub + run `fontSize.sm` (13, L75-76).
CONSISTENCY: matches app tokens/patterns — theme tokens + type roles only; whole
card `accessible` with a composed label (WeeklyStreakStrip.js:49); reads the same
view-model the deep section uses (per its and StreakWeeksSection's comments).
USABILITY: works for all users — plain "3 of 4 sessions this week" + "N weeks
running"; no jargon, no glyph legend needed. Newbie-clear.

---

COMPONENT: WeightTrendCard (Pro)
WHAT IT DOES: "Your trend" card — smoothed weight line over faint raw weights,
current EWMA value, weekly rate, one plain-English insight with a state dot, and
the adaptive maintenance-kcal estimate; presentation-only off a pre-derived `vm`
(WeightTrendCard.js:28-122).
WHERE IT IS USED: `grep -rl` -> src/screens/AnalyticsScreen.js, DiaryScreen.js.
Sample import: AnalyticsScreen.js:18 `import WeightTrendCard from '../components/WeightTrendCard';`.
VISUAL QUALITY: premium — `surface`/`radius.md`/border card (WeightTrendCard.js:125-132);
uppercase `type.caption` label (L133), EWMA value `type.num('h3')` (fontSize.xl 20
tabular, L136) always textPrimary (never a state colour, per Class B), 88px chart
(L75). 6px state dot is decorative + a11y-hidden (L97, 139).
CONSISTENCY: matches app tokens/patterns — theme tokens + type roles + stateColors
(WeightTrendCard.js:3, 22-26); whole card `accessible` with a composed label
(L54-63); dot caps at watch (no red) per the comment (L16-18).
USABILITY: works for all users — the insight sentence carries the meaning so the dot
is redundant-by-design; "maintenance kcal" and "EWMA"-derived value are presented in
plain words ("estimated maintenance", building-state copy L104-106). Suitable for
both newbie and athlete.

---

COMPONENT: WindowChips
WHAT IT DOES: Shared time-window chip row (e.g. 4w / 12w / 1y) for the hero charts
so windowing looks identical across weight/e1RM/volume (WindowChips.js:10-31).
WHERE IT IS USED: `grep -rl` -> src/screens/BodyMetricsScreen.js,
VolumeHeatmapScreen.js, ExerciseDetailScreen.js. Sample import:
BodyMetricsScreen.js:31 `import WindowChips from '../components/WindowChips';`.
VISUAL QUALITY: premium — equal-flex chips, `radius.md`, active = amber border +
`withAlpha(primary,0.12)` fill / amber text (WindowChips.js:35-47); label uses
`type.label` (fontSize.sm 13).
CONSISTENCY: matches app tokens/patterns — theme tokens + withAlpha + type role
(WindowChips.js:8). Note: `accessibilityRole="tablist"` on the row (L12) but each
chip is `accessibilityRole="button"` (L21) rather than `"tab"` — a tablist normally
contains tabs; minor a11y-role mismatch.
USABILITY: works for all users — explicit `minHeight: 44` touch target (WindowChips.js:42,
commented), selected state + accessibilityLabel with a prefix (L22-23). Clear, scannable.

---

## Cross-cutting findings
- **Dead/unused production code:** `VolumeBars.js` (no importers anywhere) and
  `Stepper.js` (imported only by a test, never by a screen/component) — both are
  fully built and token-clean but currently serve no user. (Mention only, no fix,
  per CLAUDE.md.)
- **Dead styles inside SetEntry.js** (`fieldLabelRow`, `plateBtn*`, `perSideHint`,
  `rirRow`/`rirBtn*`, lines 157-256) left after the effort-picker / set-type row
  removal (SetEntry.js:135-143).
- **SVG text never scales with larger-text:** SvgBarSparkline.js:86 and
  VolyumeChart.js:237,273 hardcode `fontSize={9}` (below `fontSize.micro` 10); an
  RN-SVG limitation, but it does not respond to the in-app larger-text toggle.
- **Bare Sparkline has no accessibility label** (Sparkline.js) — relies on the host
  card to provide context.
- **Haptics path inconsistency:** SetEntry.js uses `expo-haptics` directly
  (SetEntry.js:3) while StreakWeeksSection / VolyumeChart use the `lib/haptics`
  wrapper.
- **Scrim drift:** StreakWeeksSection.js:211 rolls its own
  `withAlpha(colors.background, 0.6)` modal overlay instead of `colors.scrim`
  (theme.js:88).
