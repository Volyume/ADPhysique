# Phase 1 — Component Library audit (batch B)

Volyume Ultimate Audit, 2026-06-13. READ-ONLY inventory. Every claim cites
`file:line`; theme tokens resolved against `src/styles/theme.js`. British English.
Where a fact is not in the code it is marked **NOT DETERMINED IN CODE**.

Token reference used below (theme.js):
fontSize.micro 10 (256/257), xs 11 (258), sm 13 (259), md 16 (260), lg 17 (261),
xl 20 (262), xxl 24 (263), xxxl 32 (264), display 40 (265). spacing.xs 4 (231),
sm 8 (234), md 12 (235), lg 16 (236), xl 24 (237), xxl 32 (238). radius.sm 6 (243),
md 10 (244), lg 14 (245), xl 20 (246), full 999 (247). type.body resolves to
fontSize.md 16 (395), type.title to fontSize.lg 17 (391), type.label to fontSize.sm 13
(403), type.caption to fontSize.xs 11 (407). colors.border is #6E6E6E and is a
**card-edge** token (theme.js:23); borderSubtle #2E2E2C is the intended hairline
INSIDE a card (theme.js:25).

---

COMPONENT: ExercisePickerModal
WHAT IT DOES: Full-screen slide-up modal to search the local exercise library and
pick an exercise, with an inline "create custom exercise" sub-form (name + muscle
chips + equipment chips) that writes `isCustom:1` to the exercises table
(ExercisePickerModal.js:57-84). Two screens in one Modal: search list, or create form.
WHERE IT IS USED: ManualBuilderScreen.js, ActiveWorkoutScreen.js, RoutineDetailScreen.js
(`grep -rl`). Sample: `src/screens/ManualBuilderScreen.js:9` — `import ExercisePickerModal from '../components/ExercisePickerModal';`
VISUAL QUALITY: premium — token-driven throughout; search input uses `type.body`
(16px) on inputBg with a border (styles 237-241); chips use radius.full pills with
primaryBg active state (267-273); rows are 16-resolved `fontSize.md` names with a
capitalised muted muscle caption (246-247). Clean header/search/list hierarchy.
CONSISTENCY: matches app tokens/patterns — colours, spacing and `type.*` roles all
from theme. One minor deviation: list row separator uses `colors.border` (#6E6E6E,
the card-EDGE token) as an in-list hairline (styles:250) and the header bottom border
likewise (235), where `borderSubtle` is the documented inside-card hairline
(theme.js:25); same pattern repeats in several batch-B files (see below).
USABILITY: works for all users — plain "Search exercises…" placeholder, an always-
present "Create a custom exercise" footer so the option is never hidden behind an
empty result (comment 204-206), and a clear empty state (216-221). Create button
label is caller-supplied (saveLabel/actionLabel, 26-28).

---

COMPONENT: FatigueTrendCard
WHAT IT DOES: Recent-session fatigue trend card. Renders the last N sessions as a
bar sparkline (SvgBarSparkline) with weekday labels plus a one-line coaching read;
returns null until at least two sessions exist (FatigueTrendCard.js:29-30).
WHERE IT IS USED: ConsistencyScreen.js only (`grep -rl`). Sample:
`src/screens/ConsistencyScreen.js:7` — `import FatigueTrendCard from '../components/FatigueTrendCard';`
VISUAL QUALITY: acceptable — standard surface card, radius.lg, border, gap.sm
(styles 66-73). Title is `fontSize.sm` (13) semibold textSecondary (74-78); coach
line `fontSize.xs` (11) textMuted with a hard-coded `lineHeight: 16` (83-87). Chart
is centred (79-82). Restrained and consistent, not a hero surface.
CONSISTENCY: inconsistent (minor) — the sparkline is given a fixed `width={240}`,
`barWidth={22}`, `barGap={8}` (FatigueTrendCard.js:50-53), i.e. hard pixel values
not from spacing tokens; same fixed-240 pattern as ProgressSections sparklines so it
is at least self-consistent. `fatigueBarColor` maps levels directly to
colors.success/warning/error (7-12) rather than the `stateColors` grammar
(theme.js:459) — the first two branches both return success (8-9), so level 1 and 2
are identical (dead branch).
USABILITY: works for all users — explicit accessibilityLabel reads the whole trend
oldest-to-newest (54-57); coaching line translates the number into an action
("Push your next session" / "Consider a lighter day", 18-21).

---

COMPONENT: FeedbackSheet
WHAT IT DOES: Bottom slide-up sheet for one-tap sentiment feedback (5 chips) plus an
optional free-text line; submits via `submitFeedback`. Also exports
`FeedbackProvider`/`useFeedback` (context + singleton mount) and a shake-to-report
accelerometer handler (FeedbackSheet.js:64-121). Auto-dismisses after 12s if untouched
(174-179). Has a "done" success state (247-252).
WHERE IT IS USED: WorkoutSummaryScreen.js, SettingsAboutScreen.js (via `useFeedback`).
Sample: `src/screens/SettingsAboutScreen.js:4` — `import { useFeedback } from '../components/FeedbackSheet';`
VISUAL QUALITY: premium — proper modal sheet: scrim backdrop (348-352), 36×4 handle
pill (365-371), radius.xl top corners (357-358), animated translateY + backdrop with
reduce-motion collapse to 0 (155-166). Title `fontSize.lg` (17) bold (372-377), sub
`fontSize.sm` (13) (378-382), chips pill-shaped with primaryBg selected (390-413).
CONSISTENCY: inconsistent (minor) — backdrop sets `backgroundColor: colors.scrim`
AND an extra `opacity: 0.55` on the style (349-351); scrim already encodes 0.55 alpha
(theme.js:88), and the backdrop opacity is also animated 0→1 (158-160), so the static
0.55 is redundant/compounding. Sheet/handle/chip borders use `colors.border` not
`borderSubtle`. submitBtn `flex: 1.5` vs cancel `flex: 1` correctly weights the
primary action (449,434).
USABILITY: works for all users — copy adapts to trigger ("What's wrong?" on shake vs
"How was that?", 255-262), one-tap chips with selected state and a11y labels (278-280),
and an explicit privacy line stating what is attached and that body measurements/names
are stripped (336-339), honouring the no-PII rule.

---

COMPONENT: GradientCard
WHAT IT DOES: Compatibility shim. Despite the name there is NO gradient (locked rule:
flat background); it forwards to `Card` with a `tone` accent border, optionally
honouring an explicit `tint` hex as the border colour via `withAlpha(tint, 0.33)`
(GradientCard.js:14-38). The legacy `intensity` prop is accepted and ignored (22,28).
WHERE IT IS USED: YearOfLiftsScreen.js (`grep -rl`; other hits are Card.js and a test).
Sample: `src/screens/YearOfLiftsScreen.js:30` — `import GradientCard from '../components/GradientCard';`
VISUAL QUALITY: premium — inherits Card entirely; nothing rendered here beyond prop
mapping. The doc comment (1-12) records that the audit found it identical to Card and
consolidated the implementation.
CONSISTENCY: matches app tokens/patterns — uses `withAlpha` (theme.js:204) instead of
the banned hex-concat; deprecates itself in favour of `<Card tone="primary">` (10).
USABILITY: NOT APPLICABLE (non-visual wrapper). The lingering "Gradient" name is
misleading to a developer reading call sites, but has no user-facing effect.

---

COMPONENT: Illustrations
WHAT IT DOES: Five hand-tuned empty-state SVG illustrations built on react-native-svg:
EmptyWorkoutsIllustration (barbell), EmptyPlanIllustration (calendar),
EmptyPRsIllustration (trophy), EmptyChartIllustration (chart), EmptyBodyIllustration
(scale). All gold-accent + muted-stroke line art, default 140px (Illustrations.js:22-166).
WHERE IT IS USED: BodyMetricsScreen.js, WorkoutHistoryScreen.js, AnalyticsScreen.js
(`grep -rl`). Sample: `src/screens/WorkoutHistoryScreen.js:14` —
`import { EmptyWorkoutsIllustration } from '../components/Illustrations';`
VISUAL QUALITY: premium — consistent visual language (ACCENT = colors.primary, MUTED =
colors.textMuted, STROKE 2.5, 11-21), subtle sparkle/pulse accents, no external image
assets, scalable. A clear lift above generic Ionicons.
CONSISTENCY: matches app tokens/patterns — colours pulled from theme (16-20). One note:
the `viewBox` is fixed at "0 0 140 140" while `size` is variable (25), which is correct
SVG scaling; stroke/dot pixel values are intrinsic to the artwork, not layout tokens, so
the literals are appropriate here.
USABILITY: works for all users — purely decorative empty-state art; the headline/body
copy that accompanies them lives on the consuming screens (doc 6-8). No interactive
element, no a11y label on the SVGs themselves (decorative, acceptable).

---

COMPONENT: InfoTooltip
WHAT IT DOES: An info "(i)" icon button that opens a centred fade-in modal card showing
explanatory text; tap the scrim or card to dismiss (InfoTooltip.js:6-33).
WHERE IT IS USED: widely — NutritionTargetsScreen, MesocycleBuilderScreen,
WorkoutSummaryScreen, VolumeHeatmapScreen, ConsistencyScreen, LiftProgressScreen,
ExerciseDetailScreen, AnalyticsScreen, and internally ProgressSections.js &
ReadinessCards.js (`grep -rl`). Sample: `src/screens/AnalyticsScreen.js:13` —
`import InfoTooltip from '../components/InfoTooltip';`
VISUAL QUALITY: acceptable — minimal: muted icon trigger (17), centred surface card
radius.lg with border, maxWidth 320 (45-52), body `fontSize.sm` (13) textSecondary with
hard-coded `lineHeight: 20` (53-57). Functional rather than premium; no handle/title,
no animated scale (only the Modal `animationType="fade"`, 19).
CONSISTENCY: inconsistent (minor) — default icon `size = 14` (6) is below the
`iconSize.sm` (16) token (theme.js:502); card border uses `colors.border`. Uses
`colors.scrim` correctly for the overlay (40).
USABILITY: works for all users — trigger has hitSlop 8 (12) but the icon is 14px so the
effective target is ~30px, **below the 44px guideline** flagged by _FORMAT (the 8px
hitSlop does not reach 44). Trigger has accessibilityRole/Label "More information"
(14-15) and the card is marked accessible text (27). The any-tap-to-close is forgiving.

---

COMPONENT: OptionCard
WHAT IT DOES: Full-width selectable card — icon + label + one-line detail + checkmark
when active; accessibilityRole "radio" (OptionCard.js:9-29). Intended (per comment) for
the onboarding wizard and coached builder choice screens (5-8).
WHERE IT IS USED: **NO production importer found.** `grep -rl` over src/screens and
src/components returns only `src/components/__tests__/selectionControls.test.js`; a
repo-wide `grep -rl "OptionCard" src` confirms the only non-self reference is that test.
The doc comment claims onboarding/coached-builder use, but no screen imports it as of
2026-06-13. **NOT DETERMINED IN CODE** whether it was retired or never wired.
VISUAL QUALITY: premium (as written) — surface card radius.lg, 40×40 icon well in
surface2 (39-43), `type.bodyStrong` label (45), primaryBg active state (38). Consistent
with OnboardingScreen's own option styling.
CONSISTENCY: matches app tokens/patterns — all theme-driven; detail uses `fontSize.sm`
(13) with hard-coded `lineHeight: 18` (47); card border `colors.border`.
USABILITY: works for all users (if rendered) — radio semantics, selected state, large
tappable card with `activeOpacity 0.75`. Not currently reachable by users.

---

COMPONENT: PRCelebration
WHAT IT DOES: Full-screen personal-record celebration overlay: 40 confetti particles,
spring-scaled card with trophy icon, PR label/value and "+X% over previous best",
plus escalating success haptics; auto-dismisses after 3s, tap to dismiss
(PRCelebration.js:33-186). Has a `subdued` toast variant (no particles, 2.2s, 106-122).
WHERE IT IS USED: **Rendered from App.js, not from a screen.** Screens trigger it via
the store action `showPRCelebration(...)` (`src/screens/ActiveWorkoutScreen.js:841`),
and the actual component is lazy-required and mounted in `App.js:804` /
`<PRCelebration ... onDismiss={hidePRCelebration}>` at App.js:827-829.
WorkoutSummaryScreen only references it in comments (it deliberately does NOT render it,
WorkoutSummaryScreen.js:122,397). So: yes, it IS rendered — once, app-globally, in App.js.
VISUAL QUALITY: premium — full overlay (background base + animated opacity to 0.85,
58-63,189-193), spring card (radius.xl, gold-tinted border via withAlpha 0.376, 199-210),
88px gold icon well (211-219), `prBadge` `fontSize.xs` (11) black with letterSpacing 2
(220-226), `prType` `fontSize.lg` (17) bold (227-233). The one "hero moment" of the app.
CONSISTENCY: mostly matches — uses withAlpha for gold tints (209,215). Documented
deviation: confetti palette deliberately adds two non-token hexes (`#FF6B35`, `#9C27B0`)
with an eslint-disable and a comment that they sit outside the UI palette for a one-off
burst (26-28). Card top is hard-positioned `SCREEN_HEIGHT/2 - 160` (201) — a fixed offset
that will not adapt to font scaling (see size note).
USABILITY: works for all users — large unmissable card, "Tap to continue" hint (182),
reduced-but-present `subdued` mode. Small concern: the only dismiss is tapping anywhere
(125-129) and a 3s auto-timeout; no explicit button, but the hint covers it. On the
smallest screens the fixed `-160` top offset and `padding: spacing.xxl` (32) card could
crowd; **NOT DETERMINED IN CODE** at what device height it clips (no compact branch here).

---

COMPONENT: PartnerRow
WHAT IT DOES: Slim single-line training-partner status row for ConsistencyScreen; reads
derived signals from `usePartners` and shows where the pair stands (active ticks /
resting / pending / "Train with a partner"), opening PartnerScreen on tap; shows a small
"cheer received" hand icon when applicable (PartnerRow.js:13-43). Returns null while
loading (15).
WHERE IT IS USED: ConsistencyScreen.js (`grep -rl`; other hit is its test). Sample:
`src/screens/ConsistencyScreen.js:17` — `import PartnerRow from '../components/PartnerRow';`
VISUAL QUALITY: premium — surface row, radius.lg, border, `minHeight: 56` (styles 47-51);
people icon, `type.label` title + `fontSize.sm` (13) semibold line with marginTop:1
optical nudge (53-54), chevron affordance, 24px cheer dot in primaryBg (55-58).
CONSISTENCY: matches app tokens/patterns — theme-driven; minHeight 56 comfortably clears
44px. Row border uses `colors.border` (card edge — correct here, it IS a card).
USABILITY: works for all users — accessibilityLabel reads "Training partner. {line}"
(28-29), copy is plain and a resting partner explicitly never reads as a failure (doc 5,
line 20). Newcomer sees "Train with a partner" invite when none exists (22).

---

COMPONENT: PeekMenu
WHAT IT DOES: Imperative long-press context menu (Edit/Delete/Duplicate/Share style):
slide-up sheet with optional title/subtitle, a list of icon+label action rows (destructive
rows in error colour) and a Cancel button; opened via a ref `open({title, items})`
(PeekMenu.js:43-161). Honours reduce-motion (snap vs slide, 46,77).
WHERE IT IS USED: LiftProgressScreen.js, PlansScreen.js, and internally BottomSheet.js &
FeedbackSheet.js (`grep -rl`). Sample: `src/screens/PlansScreen.js:15` —
`import PeekMenu from '../components/PeekMenu';`
VISUAL QUALITY: premium — same sheet grammar as FeedbackSheet: scrim backdrop (166-170),
36×4 handle (183-189), radius.xl top corners, medium-impact haptic on open (52). Title
`fontSize.md` (16) bold (190-194), item text `fontSize.md` (16) semibold (209-213),
pressed rows tint to surface2 (128-129).
CONSISTENCY: matches app tokens/patterns — identical backdrop/sheet/handle pattern to
FeedbackSheet (good consistency); destructive items resolve to colors.error (137,142).
Sheet/handle borders use `colors.border`.
USABILITY: works for all users — each row has accessibilityRole button + label (131-132),
item rows are `paddingVertical: spacing.md` (12) inside radius.md (201-207) giving a
generous target, explicit Cancel (150-157). Guard: `open` no-ops if no items (51).

---

COMPONENT: PlateCalculator
WHAT IT DOES: Plate-loading calculator: target + bar weight inputs, computed total/per-
side, a visual bar with colour-coded plates (real-world equipment colours by weight),
and a per-plate count list; unit-aware (kg vs lbs plate sets) (PlateCalculator.js:8-143).
WHERE IT IS USED: **NOT RENDERED ANYWHERE.** `grep -rln "PlateCalculator"` across src
(and the whole repo excluding node_modules) returns ONLY `src/components/PlateCalculator.js`
itself — no importer in any screen, component, or test. It is dead/unwired code as of
2026-06-13. (Mentioned per the brief's specific ask: PlateCalculator is NOT rendered.)
VISUAL QUALITY: premium (as written) — surface container radius.xl, padding.xl (146-150);
result total is `fontSize.xxl` (24) black primary (192-196); centred bar visual with
scaled plate heights/widths (98-121); plate legend dots + counts (127-140). The plate
colours are intentional physical-standard literals with an eslint-disable + comment
(32-52).
CONSISTENCY: mostly matches — proper use of useAppStore for barWeight/units (9-10), guards
calculatePlates output (25-28). Deviations: plate text rotated 90° at `fontSize.micro`
(10) (225-233) is very small; bar/plate/collar use hand-rolled `borderRadius: 3` and fixed
widths (209-240) rather than radius tokens (intrinsic to the diagram, defensible).
USABILITY: only makes sense to experienced users — assumes the user understands bar weight,
per-side loading and plate denominations; "Each side" framing (95) and the colour legend
help, but a first-timer would need context. Inputs are decimal-pad with selectTextOnFocus
(74-77) and a11y labels (77,88). Moot until it is wired in.

---

COMPONENT: PostLapseSheet
WHAT IT DOES: One-time bottom sheet shown on first app open after a Pro lapse: states
plainly that all logged data is saved and what stays free, and optionally asks the single
churn-reason question (via ReasonPicker) when none was captured this episode; "Done"/"Got it"
dismisses either way (PostLapseSheet.js:31-79). Also exports `PostLapseSheetHost` which
watches tier/foreground and surfaces it once per episode (87-120).
WHERE IT IS USED: App.js (Host mounted at app root; `grep -rln` returns App.js). Also wired
to ReasonPicker (component import 22). **NOT DETERMINED IN CODE** here which App.js line
mounts the Host (Host is exported from this file; mount confirmed only as App.js per grep).
VISUAL QUALITY: acceptable — relies on the shared `BottomSheet` primitive for chrome (20,
51-56); content is just title `fontSize.lg` (17) bold (123-127), body `fontSize.sm` (13)
textSecondary lineHeight 20 (128-132), optional sub textMuted (133-137), and a `Button`
size="lg" (72-76). Plain and transactional by design (doc 8-9), not a hero surface.
CONSISTENCY: matches app tokens/patterns — defers all sheet styling to BottomSheet and the
primary CTA to Button (good reuse); uses captureCancelReason/winbackState helpers (24-27).
This is a billing/winback-adjacent surface — audited read-only only, not modified.
USABILITY: works for all users — reassurance-first copy ("Everything you logged is saved…
Training, plans and progress stay free", 29), reason question is explicitly optional (62),
single dismiss button. Calm, non-nagging (shown once per episode, doc 5-6).

---

COMPONENT: PressableCard
WHAT IT DOES: Drop-in TouchableOpacity replacement that adds a press-in spring scale
(default 0.97) + slight opacity dip for a tactile feel; flat behaviour under reduce-motion;
forwards onPress/onLongPress and a11y props (PressableCard.js:22-87).
WHERE IT IS USED: very widely — WorkoutHistoryScreen, ImportScreen, LiftProgressScreen,
HomeScreen, PlansScreen, YouScreen, and inside PeekMenu/Chip/Stepper/Button/ExerciseCard/
SettingsPrimitives/Card (`grep -rl`). Sample: `src/screens/HomeScreen.js:15` —
`import PressableCard from '../components/PressableCard';`
VISUAL QUALITY: premium — no styling of its own (caller passes `style`); the value is the
interaction: spring press-in speed 30 / press-out speed 18 bounciness 6 (43-58), opacity
interpolated scale→1 to 0.92→1 (61-66). Documented as matching Apple/Linear/Whoop/Spotify
press feel (5-7).
CONSISTENCY: matches app tokens/patterns — reads the same `accessibility.reduceMotion` store
guard the rest of the app uses (38), defaults accessibilityRole 'button' (28). A foundation
primitive used by other primitives, so it sets the pattern.
USABILITY: works for all users — full a11y prop passthrough (role/label/hint/state, 77-80),
reduce-motion users get a static control automatically (42,52), disabled supported (74).

---

COMPONENT: ProGate (+ ProLocked, withProGuard, ProBadge)
WHAT IT DOES: The Pro gating surface. `ProGate` wraps Pro content: Pro users see it,
free users see it dimmed (0.35) under a tappable lock chip that opens an upgrade sheet
routing to ProUpgrade (ProGate.js:22-85). `ProLocked` is the full-screen locked state
(with a food-diary "show-then-sell" plate teaser, 91-127). `withProGuard` is the route HOC
(134-140). `ProBadge` is the inline PRO pill (145-153).
WHERE IT IS USED: YouScreen.js (imports `ProBadge`, sample
`src/screens/YouScreen.js:21`); `withProGuard` is used in `src/navigation/RootNavigator.js`
(the route-level guard, per `grep -rl`).
VISUAL QUALITY: premium — upgrade sheet has scrim backdrop, radius.xl sheet, 60px sparkles
icon well, title `fontSize.xl` (20) black, sparkles CTA (155-199); ProLocked is a centred
held-seat with reassurance copy (104-112). Lock chip is amber primary with onPrimary ink
(162-167).
CONSISTENCY: matches app tokens/patterns — subscribes to only `s.tier` to avoid re-rendering
every gated subtree on each store tick (comment 23-26,134-138); badge uses onPrimary ink on
amber fill correctly. Minor: badge radii are hand-rolled `borderRadius: 4` (238) and lockChip
paddings use literal 10/5 (165) rather than tokens. This is the GATING-CRITICAL component
(CLAUDE.md "GATING IS ABSOLUTE") — audited read-only; the guard logic (`tier === 'pro'`,
32/137) is the single enforcement point.
USABILITY: works for all users — free users get a clear lock affordance and a "held seat, not
a wall" message stating data is intact (108-112); "Maybe later"/"Not now" escapes (77-79,
121-123). Copy explains what Pro is (weekly coaching, food diary, body metrics, 68-70).

---

COMPONENT: ProgressSections (MesocyclePulseCard, TrainingCalendar, SessionDurationChart,
MuscleFrequencyTable, WorkloadCard)
WHAT IT DOES: Five shared Progress-tab section cards lifted out of AnalyticsScreen so the
landing and Consistency surfaces render from one place (ProgressSections.js:9-12):
mesocycle/plan pulse with progress bar + weekly-load sparkline (16-92), 84-day training
heatmap calendar (94-139), session-duration bar chart with a fatigue coaching line (141-187),
this-week-vs-last muscle frequency table with show-all toggle (189-230), and the ACWR
training-load card with InfoTooltip (232-282).
WHERE IT IS USED: ConsistencyScreen.js (`grep -rl`). Sample:
`src/screens/ConsistencyScreen.js:12` — `MesocyclePulseCard, WorkloadCard, SessionDurationChart,`
(named imports).
VISUAL QUALITY: premium — consistent surface/radius.lg/border card grammar (285-291), good
use of `type.*` roles (bodyStrong, caption, num('title'), num('caption'), 297-317), tabular
nums on data values (313,317,430). Mesocycle empty state has a clear CTA (20-29).
CONSISTENCY: mostly matches — strong token discipline. Deviations: calendar grid gaps are
hard-coded `gap: 3` and square size computed `(SCREEN_W - 90)/14` with a literal 90 (99,
326-327); SessionDurationChart uses fixed `BAR_MAX_H 40`, `BAR_W 20` and `height: 72`
(142-143,340); freq row hairline uses `withAlpha(colors.border, 0.376)` (368) — a card-edge
token faded, where borderSubtle is the documented inside-card divider; `durationCoach`/
`workloadStatus` use literal lineHeight 17 (356,439). Colours in WorkloadCard map straight to
success/warning/error (237-248) rather than `stateColors`.
USABILITY: works for all users — calendar has a Rest/Trained legend + count (130-136), each
card carries a plain coaching sentence (e.g. "Load is in the optimal training zone", 247),
and WorkloadCard's ACWR ratio is explained in an InfoTooltip (257). The ACWR "Ratio 1.32"
value (266) leans athlete-facing, but the tooltip + status sentence translate it.

---

COMPONENT: ReadinessCards (+ exported computeRecoveryTrendInsight, internal RecoveryGauge)
WHAT IT DOES: The readiness half of the Progress tab: session milestones with a progress bar,
a Recovery card (soreness/fatigue/joint 1-5 gauges + scale note + optional cardio-load note),
Pro-only muscle-readiness chips, and a Pro-only recovery-trend insight line; self-loads from
local SQLite by userId/tier (ReadinessCards.js:98-253). Muscle readiness & trend insight are
gated to `tier === 'pro'` (139,215,240).
WHERE IT IS USED: ConsistencyScreen.js (`grep -rl`; other hit is its test). Sample:
`src/screens/ConsistencyScreen.js:10` — `import ReadinessCards from '../components/ReadinessCards';`
VISUAL QUALITY: premium — surface/radius.lg cards (289-303), milestone gold accent (174,295),
gauge dots colour-coded by score (255-280), muscle chips as alpha-tinted pills
(`withAlpha(color, 0.267/0.071)`, 229), trend insight in success/warning-tinted card (323-329).
Gauge value `fontSize.lg` (17) bold tabular (312); labels/scale at `fontSize.micro` (10) (313-314).
CONSISTENCY: mostly matches — good withAlpha use and an InfoTooltip on each section (181,197).
Deviations: recovery/cardio dividers use `colors.border` as inside-card hairlines (307-308,
319) where borderSubtle is documented; `trendInsightGood` falls back `colors.successBg ??
colors.primaryBg` (327) — a defensive `??` on a token that always exists (theme.js:52).
Recovery colours map straight to success/warning/error (46-49,264-268) not via stateColors.
The `mfCard` style block (331-334) is defined but unused (the header/grid were inlined into
recoveryCard) — dead style, noted not fixed.
USABILITY: works for all users (free + Pro tiers differ) — the 1-5 scale and "lower is better"
direction are stated in copy and tooltip (197,205); milestone tooltip explains why consistency
matters (181). The two-decimal-free gauge `value.toFixed(1)` (257) and "N/A" empty handling
(256-257,261) are clear. Muscle-readiness labels (Just trained/Recovering/Nearly ready/Ready)
are plain English (43-50). Pro-gated depth is hidden, not teased, on free.

---

COMPONENT: ReasonPicker
WHAT IT DOES: Presentational, controlled single-select list of churn-cancellation reasons
(radio rows) plus a conditional free-text field shown only for reasons in `FREE_TEXT_REASONS`;
parent owns `reason`/`text` + handlers (ReasonPicker.js:18-69). Shared by CancelReasonSheet
and PostLapseSheet so the rows behave identically (doc 4-9).
WHERE IT IS USED: CancelReasonSheet.js and PostLapseSheet.js (`grep -rl`). Sample:
`src/components/PostLapseSheet.js:22` — `import ReasonPicker from './ReasonPicker';`
(CancelReasonSheet.js references it in a comment at :11 and imports it in code.)
VISUAL QUALITY: acceptable — radio rows in surface2 with border, primaryBg selected state
(75-90); 20px radio with 10px dot (91-108); free-text input surface2 radius.md minHeight 56
(119-130). Clean, utilitarian; not a hero surface (appropriate for a churn form).
CONSISTENCY: matches app tokens/patterns — uses `lib/haptics` selection on pick (15,23), row
text `fontSize.md` (16) (109-114), input `fontSize.sm` (13) (119-128). Row border uses
`colors.border`. Reasons/prompts sourced from `lib/cancelReason` (16).
USABILITY: works for all users — radio rows are `minHeight: 44` exactly meeting the target
(79), proper accessibilityRole "radio" + checked state + label (40-42), free-text only appears
when relevant (19,55). This is a billing/winback-adjacent surface — audited read-only.

---

COMPONENT: RestTimer
WHAT IT DOES: In-workout rest countdown card (single row): timer icon, mm:ss or big countdown
numeral, ±15s buttons (long-press to repeat at 200ms), and Skip; escalating 3-2-1-GO beeps +
haptics; foreground wall-clock re-sync; "Start next set" done state; self-hides when inactive
(RestTimer.js:26-225). Compact variant on screens < 700px tall (17,154).
WHERE IT IS USED: ActiveWorkoutScreen.js (`grep -rl`). Mounted at
`src/screens/ActiveWorkoutScreen.js:1551` — `<RestTimer />`; import at
`src/screens/ActiveWorkoutScreen.js:11`.
VISUAL QUALITY: premium — surface2 card radius.md border (228-234); `row` minHeight 64
(243), compact 56 (253); time numeral is a deliberate hero literal `fontSize: 28` (compact 24)
with eslint-disable + comment "rest-timer countdown is a hero numeral" (246-247,254-255),
tabular nums + negative letterSpacing (250-251); 3-2-1 countdown numeral `fontSize.xxxl` (32)
in warning colour (257-264). ±15 buttons use `withAlpha(colors.primary, 0.314)` border on
primaryBg (282-291).
CONSISTENCY: mostly matches — strong selector discipline (useShallow + per-field selectors to
avoid re-rendering every second, comments 26-40), reads remaining off the store inside repeat
to dodge a stale closure (131-134). Deviations are documented hero-numeral literals (28/24) and
hitSlop 6/2 on the ±15 buttons (205) which is below the standard hitSlop token (theme.js:423).
USABILITY: works for all users — Skip and ±15 are `minHeight: 44` (273-275,282-284); the row is
accessibilityLiveRegion="polite" announcing each tick + a clear label (180-186); ±15 buttons have
explicit "Add/Remove 15 seconds" labels (207). The ±15 buttons' tight `left:2/right:2` hitSlop
(205) means horizontal touch tolerance is small, though the 44px min height holds. Audio+haptic
escalation lets the user feel the countdown without looking (doc 84-89).

---

## Cross-cutting findings

- **Two components are not rendered to users:**
  - **PlateCalculator** — `grep -rln "PlateCalculator"` over the repo (excl. node_modules)
    returns only the file itself. No importer anywhere. Dead/unwired.
  - **OptionCard** — only referenced by `selectionControls.test.js`; no screen imports it,
    despite a doc comment claiming onboarding/coached-builder use.
- **PRCelebration IS rendered**, but app-globally from `App.js:827` (lazy-required at
  App.js:804), driven by the `showPRCelebration` store action that screens call
  (ActiveWorkoutScreen.js:841). WorkoutSummaryScreen references it only in comments.
- **Recurring token deviation:** several cards use `colors.border` (#6E6E6E, the documented
  card-EDGE token, theme.js:23) — sometimes faded via withAlpha — for hairlines INSIDE a card,
  where `borderSubtle` #2E2E2C (theme.js:25) is the documented inside-card divider. Seen in
  ExercisePickerModal (separator/header), FeedbackSheet/PeekMenu (sheet/handle), ProgressSections
  (freq row 368), ReadinessCards (dividers 307/319). Consistent with each other, but off-spec
  vs the theme comment. Not a defect per se; flagged for the build phase.
- **Sub-44px touch target:** InfoTooltip trigger is a 14px icon with 8px hitSlop (~30px
  effective), below the 44px guideline (_FORMAT rule). It is the only batch-B interactive
  element clearly under target; RestTimer ±15 and Skip, PartnerRow, ReasonPicker rows all meet 44.
- **Colour grammar:** FatigueTrendCard, WorkloadCard and ReadinessCards map states directly to
  success/warning/error rather than the `stateColors` grammar (theme.js:459). Resolves to the
  same colours today, but bypasses the single vocabulary.
- **Dead style:** ReadinessCards `mfCard` style (331-334) is defined but unused.
- **Billing/winback-adjacent surfaces** (ProGate, PostLapseSheet, ReasonPicker) audited
  READ-ONLY per CLAUDE.md; no logic changed.

## NOT DETERMINED IN CODE
- Exact App.js line mounting `PostLapseSheetHost` (Host is exported from PostLapseSheet.js;
  grep confirms App.js references it, line not pinpointed in this read).
- Device-height threshold at which PRCelebration's fixed `SCREEN_HEIGHT/2 - 160` card offset
  would clip (no compact branch in the component).
- Whether OptionCard was retired or never wired (no production importer found).
