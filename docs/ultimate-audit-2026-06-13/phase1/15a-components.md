# Phase 1 — Component Library audit (batch A)

Zero-fabrication rules per `_FORMAT.md`. Every claim cites `file:line`. Token
values resolved against `src/styles/theme.js`. Read-only; no code changed.

Theme reference values used below (all from `src/styles/theme.js`):
- `fontSize.micro` (10) :257, `xs` (11) :258, `sm` (13) :259, `md` (16) :260,
  `lg` (17) :261, `xl` (20) :262, `xxl` (24) :263, `xxxl` (32) :264,
  `display` (40) :265.
- `spacing.hair` (1) :229, `xxs` (2) :230, `xs` (4) :231, `xs2` (6) :232,
  `sm` (8) :233, `md` (12) :234, `lg` (16) :235, `xl` (24) :236, `xxl` (32) :237,
  `xxxl` (48) :238.
- `radius.xs` (4) :242, `sm` (6) :243, `md` (10) :244, `lg` (14) :245,
  `xl` (20) :246, `full` (999) :247.
- `type.body` => fontSize.md (16) :394; `type.bodyStrong` => fontSize.md (16)
  semibold :398.

---

COMPONENT: AnimatedEntrance
WHAT IT DOES: Reusable mount entrance wrapper. Fades child in and rises a few px
once on mount via Reanimated `FadeInDown` (AnimatedEntrance.js:38-40), staggered
by `index` (30ms step, capped at 8 items, :25-26,:35). Reduce-motion aware:
renders a plain `View` with no animation when `accessibility.reduceMotion` is set
(:29-33), and also falls back to a plain View if the layout-animation builder
throws (:41-45). No own styling — passes `style` straight through.
WHERE IT IS USED: WorkoutHistoryScreen.js, ConsistencyScreen.js,
LiftProgressScreen.js, ExerciseDetailScreen.js, DiaryScreen.js,
PlanDetailScreen.js, PlansScreen.js, src/components/ReadinessCards.js (plus
animatedEntrance.test.js). Sample import: WorkoutHistoryScreen.js:23
`import AnimatedEntrance from '../components/AnimatedEntrance';`.
VISUAL QUALITY: premium — duration tokenised to `motion.enter` (320ms,
theme.js:521) on the emphasized-decelerate intent the design audit calls for
(AnimatedEntrance.js:38-40); no hardcoded timing. It is a behaviour-only wrapper
so there is no surface styling to judge.
CONSISTENCY: matches app tokens/patterns — reads `motion.enter` from theme
(:22,:38) and the same `accessibility.reduceMotion` store selector the rest of
the app uses (:29). STAGGER_MS (30) and MAX_STAGGER_ITEMS (8) are local literals
not tokens (:25-26), but they are timing/count constants with no theme home.
USABILITY: works for all users — invisible chrome; reduce-motion users get a
static view (:29-33). No interactive target.

---

COMPONENT: AppAlert (exports `appAlert` + `<AppAlertHost />`)
WHAT IT DOES: Themed in-app replacement for RN `Alert.alert`, same call signature
(AppAlert.js:22-31). Module-level singleton queue (`_enqueue`/`_queue`, :19-31)
drained by a mounted host (:33-58) so it is callable from non-component code.
Renders a dark card Modal with title, message and 1..n buttons; row layout for
1-2 buttons, stacked when >2 (:79,:87). Button styles: primary (amber fill),
destructive (transparent, red text), cancel (transparent, muted text)
(:88-118,:167-173). Tap-outside dismiss honours `options.cancelable` and routes
to the cancel button (:71-76).
WHERE IT IS USED: very wide — 30+ screens including LoginScreen.js,
PaywallScreen.js, SettingsAccountScreen.js, ActiveWorkoutScreen.js,
WeeklyCheckInScreen.js, plus components food/FoodDetailSheet.js,
food/HeldDecisionCard.js. Sample import: LoginScreen.js:2
`import { appAlert } from '../components/AppAlert';`.
VISUAL QUALITY: premium — `colors.scrim` backdrop (AppAlert.js:129, theme.js:88),
`surfaceElevated` card with `radius.lg` (14) and a 1px `border` (:134-142),
`maxWidth: 420` so it does not stretch full-bleed on large devices (:136). Title
`fontSize.lg` (17) bold (:144-146); message `fontSize.md` (16) secondary (:150).
CONSISTENCY: mostly matches — one deviation: the message `lineHeight: 22` is a
raw literal (:152) rather than a `type`/`lineHeight` token (cf. theme.js:352-357),
and the button styling is hand-rolled here rather than using the `Button`
primitive (Button.js). The destructive/cancel buttons are transparent text-only
(:168-169), which differs from `Button`'s solid `destructive` variant
(Button.js:28) — an intentional dialog idiom but a visible divergence from the
button primitive.
USABILITY: works for all users — every button is `minHeight: 44` (:159), meeting
the 44px target, with `accessibilityRole="button"` and label (:95-96). Clear
title/message/action hierarchy.

---

COMPONENT: BackHeader
WHAT IT DOES: Standard header for pushed/modal screens: back chevron left, centred
title, optional right node (BackHeader.js:38-46). `onBack` defaults to
`navigation.goBack()` with a try/guard so it degrades to a no-op outside a
navigator instead of crashing (:32-37). Renders a fixed `minWidth: 24` right
spacer when no `right` is passed so the title stays optically centred (:44,:68).
WHERE IT IS USED: PrivacyPolicyScreen.js, SubscriptionScreen.js,
ProGoalSetupScreen.js, PlanUpdateScreen.js, SubscriptionPolicyScreen.js,
BlockReflectionScreen.js, Article9ConsentScreen.js, CoachHeldHistoryScreen.js,
MyRecipesScreen.js, ManualBuilderScreen.js, CreditsScreen.js, MyMealsScreen.js,
DebugLogScreen.js, MealPlanScreen.js, NutritionEducationScreen.js. Sample import:
PrivacyPolicyScreen.js:4 `import BackHeader from '../components/BackHeader';`.
VISUAL QUALITY: premium — single definition replacing ~16 drifted hand-rolled
headers (header comment :10-12). Title `fontSize.lg` (17) semibold
(BackHeader.js:62-64); 24px chevron (:41). `borderBottomColor: colors.border`
hairline (:57). `numberOfLines={1}` prevents wrap (:43).
CONSISTENCY: matches app tokens/patterns — uses spacing/fontSize/fontWeight
tokens throughout (:50-68). Minor: defines a local `HIT` constant (:25) instead
of importing the theme `hitSlop` (theme.js:423) which has the identical values;
duplicated value, not a visual deviation.
USABILITY: works for all users — chevron has `hitSlop` 12px each side plus the
24px glyph (:25,:40), giving an effective target ≥44px, with
`accessibilityRole="button"` and `accessibilityLabel="Go back"` (:40). The right
node target depends on whatever the caller passes (not controlled here).

---

COMPONENT: BlockProgressCard
WHAT IT DOES: "This week's plan" card — planned vs actual weekly set count per
muscle for the active mesocycle (BlockProgressCard.js:13-52). Header shows week
N/total and either "Recovery week" or "Effort {5-rirTarget}" (:18-28). Each muscle
row renders a label, a progress bar, and "actual/planned" sets (:35-48). Bar fill
colour: amber at >=100%, warning yellow at >=70%, dim amber below (:31-34).
Returns null when there is no data (:14).
WHERE IT IS USED: ConsistencyScreen.js (sole consumer). Sample import:
ConsistencyScreen.js:8 `import BlockProgressCard from '../components/BlockProgressCard';`.
VISUAL QUALITY: acceptable — clean card (`surface`, `radius.lg`, 1px border,
:55-61). However the type is small: title is `fontSize.sm` (13) (:69-72), week,
muscle label and sets are all `fontSize.xs` (11) (:74-77,:83-88,:100-105). For a
data card on the Progress tab this is on the small side; the muscle column is a
fixed `width: 88` (:84) which can truncate longer labels (`numberOfLines={1}`,
:42). Bar height 6px (:90-91).
CONSISTENCY: mostly matches — uses `withAlpha` (:34) and tokens. Two deviations:
(1) bar `borderRadius: 3` is a raw literal (:91,:97) not a `radius` token (closest
is `radius.xs` 4, theme.js:242); (2) the fill thresholds use `colors.primary` and
`colors.warning` directly (:32-33) rather than the `stateColors`/`volumeColors`
grammar (theme.js:459-474) that the rest of the volume surfaces use — a parallel
colour mapping the COMP-027 grammar was meant to retire.
USABILITY: works for all users for the bar, but the "Effort {5 - rirTarget}"
label (:25) is jargon — a 0-5 effort number with no scale shown will not be
self-explanatory to a newcomer; the row has an `accessibilityLabel`
"{label}: {actual} of {planned} sets" (:40) which is clear for screen readers.

---

COMPONENT: BlockShapeCard
WHAT IT DOES: (COMP-010) Visualises the training block as a row of week dots with
a jargon-free effort arc: Ease in -> Build -> Push -> Recover
(BlockShapeCard.js:18-23). Phase per week derived structurally, no engine
dependency (:18-23 header). Current dot filled amber with a ring, past dots muted,
future outlined, recovery a soft amber tint (:80-95). A sentence below frames the
recovery week as a destination, e.g. "Recovery week in N" (:34-41). `compact`
hides per-dot labels (:61-65). Returns null for <2 planned weeks (:26-27).
WHERE IT IS USED: WorkoutSummaryScreen.js, ConsistencyScreen.js, HomeScreen.js.
Sample import: HomeScreen.js:13 `import BlockShapeCard from '../components/BlockShapeCard';`.
VISUAL QUALITY: premium — considered dot states (:80-95), current dot enlarged
14->16px with amber ring (:88-91), recovery dot uses `withAlpha(colors.primary,
0.22/0.45)` (:92). Explanatory line uses `type.body` overridden to `fontSize.sm`
(13) with `lineHeight: 19` literal (:95). Dot labels `fontSize.micro` (10) (:93),
which is theme.js:257's "below body min" micro size — acceptable as dot captions.
CONSISTENCY: mostly matches — uses tokens and `withAlpha`. Deviations: dot
dimensions and radii are raw literals (`width:14,height:14,borderRadius:7`, :81;
`16/16/8`, :90) rather than tokens (no circle helper used though theme.js:252
provides `circle()`); `lineHeight: 19` on the line is a literal (:95) not a
`lineHeight` token.
USABILITY: works for all users — copy is deliberately plain ("Ease in", "Build",
"Push", "Recover") and the whole card carries an `accessibilityLabel` of the full
sentence (:44). This is one of the more newcomer-friendly components in the batch.

---

COMPONENT: BodyDiagramHeatmap
WHAT IT DOES: Stylised front+back muscle map drawn from SVG primitives inside a
360x320 viewBox (BodyDiagramHeatmap.js:12-15,:62-69). Each muscle region is a
tappable shape filled with its volume-status colour from `volumeByMuscle`
(:27-31,:52-60); tapping calls `onMuscleTap(muscle)` (:43-46). Spoken labels
combine muscle name + status for screen readers (:36-41). Below: Front/Back
labels and a 5-item colour legend (Below target / Optimal / Near limit / Over
limit / No data) (:255-268).
WHERE IT IS USED: VolumeHeatmapScreen.js (sole consumer). Sample import:
VolumeHeatmapScreen.js:9 `import BodyDiagramHeatmap from '../components/BodyDiagramHeatmap';`.
VISUAL QUALITY: acceptable — distinctive bespoke illustration, card chrome uses
tokens (`surface`, `radius.lg`, border, :288-296). Concerns: the SVG has a FIXED
`height={FIGURE_HEIGHT}` of 320 (:67, const :13) so it does not scale down on a
small (5.4") device — only the width is "100%"; on small screens the figures
keep their pixel height and may dominate the viewport. Legend swatches are 10x10
with `borderRadius: 2` literal (:322-326). Region/figure labels are `fontSize.xs`
(11) (:302-308,:327-330).
CONSISTENCY: mostly matches the card pattern, but two deviations: (1) the legend
draws raw semantic tokens `colors.success`/`colors.warning`/`colors.error`
(:263-267) instead of the `volumeColors`/`stateColors` grammar (theme.js:469-492)
that getFill consumes via `entry.color` — so the legend and the actual fills
resolve through different code paths and could drift; (2) several SVG literals
(`borderRadius: 2`, `letterSpacing: 0.5`, swatch 10x10) are hardcoded
(:306,:322-326). The "Near limit" legend uses `colors.warning` which post-COMP-027
is Okabe-Ito yellow (theme.js:53), matching the watch state.
USABILITY: only fully makes sense to experienced users — the muscle map plus
a four-band volume legend assumes the user understands per-muscle weekly volume
targets (MAV/MRV concepts). Each region is `accessibilityRole="button"` with a
status-bearing label (:57-59), which is good, but a newcomer will not know what
"Over limit" means without education elsewhere. Region tap targets are the small
ellipse/rect shapes themselves (e.g. biceps rx8 ry16, :132) with no hitSlop, so
some regions are well under a 44px touch target.

---

COMPONENT: BottomSheet
WHAT IT DOES: One shared sheet chrome: scrim backdrop, slide-up panel, drag
handle, tap-outside and hardware-back dismiss, reduce-motion aware,
`accessibilityViewIsModal` (BottomSheet.js:1-14,:80-111). Controlled by
`visible`+`onClose`; keeps the Modal mounted through the exit animation via local
`mounted` state (:46-71). Options: `showHandle`, `keyboardAvoiding`, `sheetStyle`,
`accessibilityLabel` (:30-41). Animations use RN `Animated` with literal durations
(open 260 / close 200 / backdrop 200/160ms, :24-27).
WHERE IT IS USED: MealPlanScreen.js, components food/FoodDetailSheet.js,
food/QuickAddSheet.js, food/MacroBreakdownSheet.js, CancelReasonSheet.js,
PostLapseSheet.js (plus bottomsheet.test.js). Sample import:
food/QuickAddSheet.js:6 `import BottomSheet from '../BottomSheet';`.
VISUAL QUALITY: premium — `colors.scrim` backdrop (:115, theme.js:88),
`radius.xl` (20) top corners, 1px top border, generous `paddingBottom:
spacing.xxl + spacing.md` (32+12=44) for the home indicator (:117-127). Handle
36x4 `borderRadius: 2` (:128-135).
CONSISTENCY: mostly matches — uses spacing/radius/colors tokens. Deviation: all
motion durations are local literals (OPEN_MS 260, CLOSE_MS 200, etc., :24-27)
rather than the `motion` tokens (theme.js:517-537, e.g. enter 320 / exit 220);
the easing is `Easing.out/in(Easing.cubic)` (:57,:67) not the tokenised
`motion.ease*` curves. Handle radius 2 is a literal (:133). It uses RN `Animated`
whereas AnimatedEntrance uses Reanimated — two animation systems in the batch.
USABILITY: works for all users — backdrop Pressable has
`accessibilityRole="button"` label "Close" (:89-94), panel is
`accessibilityViewIsModal` (:103), reduce-motion shows it instantly (:43,:52-53,
:62-63). Keyboard handling for input sheets (:96-99).

---

COMPONENT: BrandMark (exports VolyumeMark / VolyumeIcon / VolyumeWordmark /
BrandTag)
WHAT IT DOES: Renders the Volyume brand assets as PNGs. `VolyumeMark` = full
wordmark (V + lettering), for hero placements (BrandMark.js:32-44).
`VolyumeIcon` = the V only, for compact inline use (:52-64). Width derives from
the asset aspect ratio so letterforms stay proportioned (:20-22,:33-34,:53-54).
Prefers `expo-image` (disk cache) and falls back to RN `Image` if not installed
(:7-12). `VolyumeWordmark` (:71-73) and `BrandTag` (:80-82) are
backwards-compat aliases.
WHERE IT IS USED: VolyumeMark — LoginScreen.js, components/ScreenHeader.js;
VolyumeIcon — ProOnboardingScreen.js, ProSetupCompleteScreen.js; BrandTag — only
re-defined here (no external consumer found via grep). Sample import:
LoginScreen.js:7 `import { VolyumeMark } from '../components/BrandMark';`.
VISUAL QUALITY: premium — asset-driven brand mark, aspect-correct at any size,
`contentFit="contain"` (:39-40). `accessibilityLabel="Volyume"` on both
(:41,:61). No theme tokens needed (image asset).
CONSISTENCY: matches — `size` drives height consistently across both marks. Minor
dead surface: `VolyumeWordmark` and `BrandTag` forward `color`/`accent` props
(:71-73,:80-82) that the underlying components do not accept (VolyumeMark/Icon
only take `size`/`style`, :32,:52), so those props are silently ignored. Not a
visual defect, but stale API.
USABILITY: works for all users — decorative brand image with an accessible label;
no interaction.

---

COMPONENT: Button
WHAT IT DOES: The single button primitive (Button.js:1-17). Four variants —
primary (amber fill, dark text), secondary (raised surface + border), tertiary
(text-only amber), destructive (error fill) (:24-29). Three sizes sm/md/lg with
tokenised padding/font/icon/gap (:31-35). Supports `loading` (inline spinner,
auto-disables), `disabled`, leading `icon`, `trailingIcon`, `fullWidth`,
`children` (:37-93). Built on `PressableCard` so it shares the app press spring
(:21,:58).
WHERE IT IS USED: very wide — HomeScreen.js, LoginScreen.js, PaywallScreen.js,
DiaryScreen.js, ActiveWorkoutScreen.js, CancelReasonSheet.js, ProGate.js,
ExerciseCard usage etc. (20+ screens/components). Sample import: HomeScreen.js:14
`import Button from '../components/Button';`.
VISUAL QUALITY: premium — one press model, one disabled treatment (opacity 0.5,
:104-105), `radius.lg` (14) corners (:102). Labels bold (:106). Sizes tokenised
(:31-35). Spinner colour matches the variant foreground (:80).
CONSISTENCY: matches mostly, ONE notable token deviation: primary and destructive
variants set `fg: colors.background` (Button.js:25,:28) for the on-fill text
colour, but theme.js introduced `onPrimary` (theme.js:42) specifically to replace
"dark ink on a coloured fill" sites (theme.js:36-42 calls out the ~124-site
migration). In dark mode `background` and `onPrimary` are value-identical
(#0D0D0D) so there is no visual diff today, but in the light theme `background`
becomes #FAFAF7 (theme.js:102) while the amber fill stays bright — so on light
this primary button would render near-white text on amber instead of the intended
near-black `onPrimary` ink. This is a latent light-theme contrast bug; flagging
per audit (do not fix).
USABILITY: works for all users — `accessibilityRole="button"`, label defaults to
title (:61-62), disabled state covers loading (:55). Touch target is driven by
padding; md = `pv: spacing.md` (12) + `fontSize.md` (16) text ~= 40px tall, lg =
`pv: spacing.lg` (16) ~= 48px (:33-34). The sm size (`pv: spacing.sm` 8 + 13px
font ~= 29px, :32) is below the 44px target if used alone.

---

COMPONENT: CancelReasonSheet
WHAT IT DOES: (COMP-025-A Moment 1) One optional question on the cancellation path,
then a clean handoff to the store's own cancel UI (CancelReasonSheet.js:1-17).
Built on `BottomSheet` + `ReasonPicker` + `Button` (:22-24,:79-148). The store
handoff CTA is ALWAYS enabled and never gated on answering (anti-dark-pattern,
:8-9,:137-142). For `temporary_break` it reveals a break-window chip group
(:96-129) and on Android a pause hint (:122-127). Captures reason via
`captureCancelReason` and persists a local stated-return window (:64-72).
WHERE IT IS USED: SubscriptionScreen.js (plus CancelReasonSheet.test.js). Sample
import: SubscriptionScreen.js:21 `import CancelReasonSheet from '../components/CancelReasonSheet';`.
VISUAL QUALITY: premium — sheet chrome reused, title `fontSize.lg` (17) bold
(:153-156), clear primary ("Continue to {store}", lg) + secondary ("Keep my
subscription") button pair (:138-147). Disclosure copy in `fontSize.sm` (13)
secondary with `lineHeight: 18` literal (:162-166).
CONSISTENCY: mostly matches — uses Button primitive and tokens. Deviation: the
break-window chips are hand-rolled `Pressable`s with their own chip styles
(:103-118,:180-200) instead of the shared `Chip` primitive (Chip.js), duplicating
the selected/unselected pill treatment; `lineHeight` values 18/16 are literals
(:165,:204). The chip selected state here uses `primaryBg`+`primary` border
(:188-191) which does match Chip's selected treatment (Chip.js:63-66), so the look
is consistent even though the code is duplicated.
USABILITY: works for all users — strong consent ethics (CTA never gated,
:137-142), plain question copy ("what's the main reason?", :86), Android pause
hint (:122-127). Chips have `accessibilityRole="button"` + `accessibilityState`
(:111-113). Chip vertical padding `spacing.sm` (8) + 13px text ~= 29px tall
(:181-182), under the 44px target.

---

COMPONENT: Card
WHAT IT DOES: The single base card surface (Card.js:1-14). `surface` background,
`radius.lg`, 1px `border`, token padding (default `lg`) (:76-82). `tone` draws an
accent border (primary/success/warning/error/gold/neutral) at 0.33 alpha for hero
cards (:20-27,:43,:51). `elevated` sits it on `surfaceElevated` (:30-32,:83).
`borderless` removes the border (:84). Passing `onPress`/`onLongPress` routes
through `PressableCard` for the shared press spring (:55-67).
WHERE IT IS USED: very wide — NutritionTargetsScreen.js, SubscriptionScreen.js,
PaywallScreen.js, HomeScreen.js, DiaryScreen.js, CoachOutputScreen.js, and ~35
more screens/components. Sample import: SubscriptionScreen.js:20
`import Card from '../components/Card';`.
VISUAL QUALITY: premium — single restylable card surface replacing ~83 inline
blocks (header :4-6), tokenised throughout, `withAlpha` for the accent border
(:51). Clean default.
CONSISTENCY: matches app tokens/patterns — `radius`, `spacing`, `colors`,
`withAlpha`, and a TONES map keyed to semantic tokens (:20-27). No literals found.
This is a model-consistent primitive.
USABILITY: works for all users — when pressable it carries `accessibilityRole`
default 'button' + label (:60-62); as a static surface it forwards
`accessibilityLabel`/`accessibilityRole` (:69-71). Touch target depends on the
card's own content size (a card is large by nature).

---

COMPONENT: CardioPlanCard
WHAT IT DOES: "Cardio this week" card (CardioPlanCard.js:9-16). Self-contained:
loads its own 7-day cardio summary on focus via `getCardioLogRange` +
`summariseWeekCardio` (:17-27). Shows sessions done vs optional coach target, a
"Log cardio" button, an optional "History" link (only when there is logged
cardio), and a footnote that cardio is already counted in the calorie target
(also only when there is data) (:37-60). `est_kcal` is deliberately never shown
(:13-16 header).
WHERE IT IS USED: AnalyticsScreen.js (sole consumer). Sample import:
AnalyticsScreen.js:14 `import CardioPlanCard from '../components/CardioPlanCard';`.
VISUAL QUALITY: acceptable — uses `radius.md` (10) here (:65-67) where most cards
in the batch use `radius.lg` (14) (cf. Card.js:79, EngineLog.js:145), a slightly
tighter card than the app's base Card. Title uses `type.bodyStrong` (16) (:70),
sub/links `fontSize.sm` (13) (:71-72), footnote `fontSize.xs` (11) (:79). The
"Log cardio" button is a small `primaryBg` pill (:73-77).
CONSISTENCY: mostly matches — uses tokens and `type`. Deviations: it does NOT use
the shared `Card` surface (hand-rolled `cardioCard`, :65-68) and the "Log cardio"
button is a hand-rolled `TouchableOpacity` (:49-52,:73-78) rather than the
`Button`/`Chip` primitive; radius is `md` not the base-card `lg`.
USABILITY: works for all users — copy is plain and reassuring ("Your choice of
activity", "Log any cardio you do", :31-35) and the double-count footnote
pre-empts a common confusion (:55-59). Targets: "Log cardio" `paddingVertical:
spacing.xs` (4) + 13px text ~= 21px tall (:74-76) — well under 44px; "History"
link relies on `hitSlop={8}` + ~18px text ~= 34px (:43) — still under 44px.

---

COMPONENT: Chip
WHAT IT DOES: A single selectable pill with one selected treatment (amber fill +
border) for pick-one/pick-some choices (Chip.js:1-9). `selected`+`onPress`,
optional leading `icon`, `disabled`, configurable `accessibilityRole` ('button'
default, 'radio' for single-select groups) (:16-48). Built on `PressableCard`
(:13,:29).
WHERE IT IS USED: NOT FOUND in any screen or component as the `Chip` primitive.
The only real import is its own test (src/components/__tests__/inputs.test.js:9
`import Chip from '../Chip';`). The many "Chip" matches across screens are
substrings of other names (WindowChips, SourceChip, local `chip`/`chipRow`
styles), not this component. **So the Chip primitive appears to be effectively
unused by the app today** (NOT DETERMINED whether a non-`Chip`-named re-export
consumes it — none found).
VISUAL QUALITY: premium (in isolation) — `surface2` base, `primaryBg`+`primary`
border when selected, `radius.full` pill, icon recolours with state (:51-71).
Tokenised throughout.
CONSISTENCY: matches the app's chip look (its selected treatment is identical to
the hand-rolled chips in CancelReasonSheet.js:188-191), but the irony is that
several screens hand-roll their own chips instead of importing this primitive —
so the codebase is INCONSISTENT in that the shared primitive exists yet is bypassed.
USABILITY: works for all users — `accessibilityRole`/`accessibilityState`
{selected,disabled} (:33-34), label passed through. Touch target: `paddingVertical:
spacing.sm` (8) + `fontSize.sm` (13) text ~= 29px tall (:60-61,:69) — under the
44px target.

---

COMPONENT: DifferentialBadge
WHAT IT DOES: Inline paywall card surfaced below the weekly coach output when the
differential trigger fires (DifferentialBadge.js:1-12). Pure presentation: reads
`differential.shown`, `with_food_data_message`, `paywall_cta` and renders "With
Pro" header, the locked message, a buy/try CTA and a "Not now" dismiss
(:46-71). Fires a `'shown'` impression ping once per mount via `onTapCta('shown')`
(:27-32). CTA label is "Try Pro free for 7 days" for the trial id, else "Get Pro
for {price}" or price-free "Get Pro" — no hardcoded price fallback (:42-44).
WHERE IT IS USED: PaywallScreen.js, CoachOutputScreen.js. Sample import:
CoachOutputScreen.js:39 `import DifferentialBadge from '../components/DifferentialBadge';`.
VISUAL QUALITY: premium — `surface` card with a full `colors.primary` 1px border
(brand amber affordance, :75-82), header `fontSize.sm` (13) semibold primary with
icon (:48-51,:89-94), body `fontSize.md` (16) primary with `lineHeight: 22`
literal (:95-100), solid amber CTA with `onPrimary` ink (:101-110).
CONSISTENCY: mostly matches — uses tokens and `onPrimary` correctly (:108, unlike
Button). Deviations: the CTA is a hand-rolled `TouchableOpacity` (:55-62,:101-106)
rather than the `Button` primitive (which would give the standard primary look and
press spring); `lineHeight: 22` is a literal (:98) not a token; `letterSpacing:
0.5` literal on the header (:93).
USABILITY: works for all users — clear With-Pro framing, explicit CTA and a
low-friction "Not now" (:63-69). Both buttons have `accessibilityRole="button"`
(:58,:66). CTA `paddingVertical: spacing.md` (12) + 16px text ~= 40px (:102-104) —
just under 44px; dismiss `paddingVertical: spacing.sm` (8) ~= 29px (:112-114),
under 44px (acceptable for a tertiary dismiss).

---

COMPONENT: Dropdown
WHAT IT DOES: Inline dropdown that expands in place (no modal) — shared by the Pro
onboarding wizard and the change-goal screen for experience/equipment/focus/
recovery picks (Dropdown.js:5-11). Optional `label` + `hint`, a trigger showing the
selected label or placeholder, and an expanding list of options (each `{value,
label, sub?}`) with a checkmark on the chosen row (:14-58). Trigger border shifts:
neutral -> amber-tinted when filled -> amber when open (:18-19,:74-75).
WHERE IT IS USED: ProGoalSetupScreen.js, PlanUpdateScreen.js,
ProOnboardingScreen.js. Sample import: ProGoalSetupScreen.js:10
`import Dropdown from '../components/Dropdown';`.
VISUAL QUALITY: premium — considered trigger states, `borderWidth: 1.5` (:71),
the open list visually fused to the trigger (top radius squared off, shared amber
border, :75,:78-83). Value text `fontSize.md` (16) (:76), item label via
`type.body` (16) (:90), sub `fontSize.xs` (11) (:92), field label `fontSize.xs`
(11) (:63-65).
CONSISTENCY: mostly matches — tokens + `withAlpha`. Deviations: `borderWidth: 1.5`
and `paddingVertical: spacing.md + 2` (:71-72) and `withAlpha(colors.primary,
0.376)` (:74) use raw numeric literals; field label `letterSpacing: 0.3` literal
(:65); `marginBottom: 1` literal on item label (:90). The trigger is a
`TouchableOpacity` (`activeOpacity`) not `PressableCard`, so it lacks the app
press spring the primitives share.
USABILITY: works for all users — trigger has `accessibilityRole="button"`,
`accessibilityState.expanded`, and items announce `selected` (:22-24,:43-44).
Trigger height = `spacing.md+2` (14) pv + 16px text ~= 44px (:72) — meets target.
List item rows = `spacing.md` (12) pv + 16px ~= 40px (:86) — marginally under 44px.
The chevron has no separate target (whole trigger is tappable, fine).

---

COMPONENT: EmptyState
WHAT IT DOES: Shared empty-state card (EmptyState.js:5-18). Adherence-neutral, no
shame copy. Icon (default sparkles), title, explanatory text, optional primary and
secondary CTAs (:19-77). `ghost` mode renders a faint dashed "your data will look
like this" preview with an optional dismiss control (:39-48,:92-97). `compact`
tightens padding (:91).
WHERE IT IS USED: CardioHistoryScreen.js (sole consumer found). Sample import:
CardioHistoryScreen.js:18 `import EmptyState from '../components/EmptyState';`.
VISUAL QUALITY: premium — centred icon (40px, or 32 compact, :50-54), title
`fontSize.lg` (17) bold (:99-104), text `fontSize.sm` (13) muted with
`lineHeight: 20` literal (:106-111), dashed border for ghost (:92-97). Note the
title colour is `textSecondary` not `textPrimary` (:102) — a deliberately quieter
empty state.
CONSISTENCY: mostly matches — uses `onPrimary` correctly on the primary button
(:119). Deviations: the primary/secondary CTAs are hand-rolled `TouchableOpacity`
(:66-74,:113-127) instead of the `Button` primitive; `lineHeight: 20` literal
(:110). Otherwise tokenised.
USABILITY: works for all users — directional, no-shame copy by design (:6-7),
dismiss has `hitSlop` 10px + 16px icon (:43,:46) ~= 36px (acceptable for a corner
close). The CTA buttons (`paddingVertical: spacing.md` 12 + 13px text ~= 37px,
:116-118,:122-124) are under the 44px target. NOTE: the CTA touchables have no
`accessibilityRole="button"` (:66,:71) — they read as plain text to assistive tech.

---

COMPONENT: EngineLog
WHAT IT DOES: Collapsible coaching-decision log on the You tab (EngineLog.js:1-10).
Loads recent adaptation events + computes rep-regression warnings on focus
(:62-78). `detectRepRegressions` flags exercises with a >=2 rep average drop two
weeks running (:22-55). Collapsed header shows a pulse icon, "Engine Log" and a
count of recent decisions (:84-95); expanded body lists rep-regression rows
(warning colour) and adaptation rows with per-decision icon/colour, muscle, set
delta, reason and date (:97-138). Returns null when there is nothing to show
(:80).
WHERE IT IS USED: CoachHeldHistoryScreen.js (sole consumer). Sample import:
CoachHeldHistoryScreen.js:7 `import EngineLog from '../components/EngineLog';`.
VISUAL QUALITY: acceptable — clean card (`surface`, `radius.lg`, border, :144-147),
36x36 `primaryBg` icon chip (:150-153), header label `fontSize.md` (16) semibold
(:154), header sub `fontSize.xs` (11) (:155), row muscle `fontSize.sm` (13)
semibold (:158), reason/date `fontSize.xs` (11) (:159-160). Information-dense once
expanded but well structured with leading status icons.
CONSISTENCY: mostly matches — tokens used throughout; decision colours map to
`colors.primary`/`colors.error`/`colors.textMuted` and warnings to
`colors.warning` (:101-118). Deviation: those status colours are raw semantic
tokens rather than the `stateColors` action grammar (theme.js:459-464) — a
"warning"/"error" mapping that COMP-027 intended to express as watch/act. Icon
chip `width/height: 36` are literals (:151) though `borderRadius: radius.md` is a
token.
USABILITY: only fully makes sense to experienced users — "Engine Log", "Rep
regression", "+1 set", deload/rotation decisions are coaching-literate concepts;
a newcomer will not parse "Avg reps: x -> y -> z over 3 weeks" (:50) without
training context. The reason copy is helpful for those who understand it. The
collapsible header `TouchableOpacity` has no `accessibilityRole` (:84) and the
expand chevron is the only affordance. Header tap target is the full row
(comfortable). NOTE: header lacks `accessibilityState.expanded`.

---

COMPONENT: ExerciseCard
WHAT IT DOES: List card for an exercise (ExerciseCard.js:7). Shows the exercise
name, a primary-muscle tag, optional equipment tag, optional "Custom" tag, and an
optional "Last: {weight}{units} × {reps} reps · {n}d ago" line (:13-39). Trailing:
an optional round add button and a forward chevron (:40-51). Built on
`PressableCard` (:5,:14).
WHERE IT IS USED: **NOT FOUND** — grep across all of `src` returns only
`src/components/ExerciseCard.js` itself; no screen or component imports it. This
component appears to be dead code (note: the exercise library / picker uses
`ExercisePickerModal.js`, which is a separate component). NOT DETERMINED whether a
dynamic/string require exists, but none was found.
VISUAL QUALITY: acceptable — `surface` card, `radius.md` (10) (:60), name
`fontSize.md` (16) semibold (:74-77), tags `fontSize.xs` (11) in `primaryBg`/
`surface2` pills (:84-99), last-logged `fontSize.xs` (11) muted (:107-109). Clean
two-column layout.
CONSISTENCY: mostly matches — tokens used. Deviations: does NOT use the base
`Card` primitive (hand-rolled `surface` card, :58-65) and uses `radius.md` rather
than the base-card `radius.lg`; the round add button uses literal `width/height:
36`, `borderRadius: 18` (:116-119) instead of the `circle()` helper
(theme.js:252); the muscle/equipment tags duplicate `Chip`-like styling without
using `Chip`.
USABILITY: works for all users — plain "Last: 60kg × 8 reps · 3d ago" line is
clear (:34-36). NOTE: the add-button `TouchableOpacity` has `hitSlop` 8px around a
36px button (~52px effective, :42-45) — meets target — but has NO
`accessibilityRole`/`accessibilityLabel` (:42-46), so screen-reader users get an
unlabelled control; the card itself is labelled with the exercise name (:14).

---

## Cross-cutting observations (evidence-backed)

1. Two components in this batch appear UNUSED by the app: `Chip` (only its own
   test imports it; screens hand-roll chips instead — Chip.js vs
   CancelReasonSheet.js:180-200) and `ExerciseCard` (no importer anywhere in
   `src`). NOT DETERMINED if intentional; flagged for the build session.
2. Several components hand-roll buttons/chips instead of using the `Button`/`Chip`
   primitives: AppAlert.js:158-173, CancelReasonSheet.js:180-200,
   CardioPlanCard.js:73-78, DifferentialBadge.js:101-114, EmptyState.js:113-127.
   The primitives exist (Button.js, Chip.js) specifically to retire these.
3. `Button` primary/destructive use `colors.background` as the on-fill text colour
   (Button.js:25,:28) instead of `onPrimary` (theme.js:42). Identical in dark, but
   a latent near-white-on-amber contrast issue under the light theme
   (theme.js:102). `DifferentialBadge` and `EmptyState` use `onPrimary` correctly.
4. Volume/coaching colour grammar is applied inconsistently: BlockProgressCard
   (:31-34), BodyDiagramHeatmap legend (:263-267) and EngineLog (:101-118) use raw
   semantic tokens rather than the `stateColors`/`volumeColors` grammar the theme
   defines (theme.js:459-492).
5. Two animation systems coexist: AnimatedEntrance uses Reanimated
   (AnimatedEntrance.js:20), BottomSheet uses RN `Animated` with literal durations
   (BottomSheet.js:18,:24-27) rather than the `motion` tokens (theme.js:517-537).
6. Touch targets under 44px on interactive elements: Chip (~29px, Chip.js:60-61),
   CancelReasonSheet break chips (~29px, :181-182), CardioPlanCard "Log cardio"
   (~21px, :74-76) and "History" (~34px, :43), DifferentialBadge CTA (~40px,
   :102-104), EmptyState CTAs (~37px, :116-124), Button `sm` size (~29px,
   Button.js:32), Dropdown list rows (~40px, :86). BodyDiagramHeatmap muscle
   regions are small SVG shapes with no hitSlop.
7. Missing accessibility roles/labels: EmptyState CTAs (no `accessibilityRole`,
   :66,:71), EngineLog header (no role/`expanded` state, :84), ExerciseCard add
   button (no role/label, :42-46).
