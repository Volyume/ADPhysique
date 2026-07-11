# DEFECT-MAP — R2-R8 current-state recon

_Read-only recon for the R campaign (`docs/TASKBOARD.md` section R, founder
order 2026-07-11, second device walk). Every claim below is file:line +
quoted source. No source file was edited to produce this map._

---

## R2 — Logger CTA under the Android nav bar

**Finding: the code already carries the exact fix the founder is describing,
landed 2026-07-03 and re-affirmed today. This item may be stale, or the
regression is happening somewhere this fix does not reach.**

The bottom-pinned "Log set" bar in `src/screens/ActiveWorkoutScreen.js`:

```
3094  {(cluster || perSide) ? null : (
3095    <View style={[styles.bottomBar, live.bottomBar, { paddingBottom: Math.max(spacing.md, insets.bottom + spacing.sm) }]}>
```

`insets` comes from `useSafeAreaInsets()` (`ActiveWorkoutScreen.js:399`). The
comment directly above (`ActiveWorkoutScreen.js:3087-3093`) states this was a
founder-reported bug on 2026-07-03, fixed by widening the padding once
`VolyumeTabBar` (the tab band) was changed to hide on this screen:

> `insets.bottom IS required here: E15's VolyumeTabBar returns null while
> ActiveWorkout is focused (VolyumeTabBar.js), so nothing else absorbs the
> system inset and a flat spacing.md left Log set half behind the Android
> gesture pill (founder screenshot 2026-07-03).`

Confirmed: `src/components/VolyumeTabBar.js:108` — `if (nested ===
'ActiveWorkout') return null;` — the tab band is genuinely absent on this
screen, so `insets.bottom` is not double-counted.

This exact contract is pinned by a regression test,
`src/__tests__/bottomBarInset.guard.test.js:14-25`, titled "Issue 1a (founder
defect pass 2026-07-03)" — same bug, same fix, already guarded. `git blame`
confirms the current line is untouched since the 2026-07-03 fix
(`a30086f6`), i.e. no later commit weakened it.

The identical `Math.max(token, insets.bottom + token)` pattern is used
elsewhere for the same reason: `src/screens/FoodSearchScreen.js:1024`
(`plateBar`) and `src/screens/MealPlanScreen.js:279-280`. So the logger's
main CTA is NOT structurally different from the Food standard here.

**Where a gap could still exist:** the bar is suppressed entirely
(`(cluster || perSide) ? null`) while a cluster or per-side set is in
progress — see R4. There the only control is the `WorkoutBottomSheet`/
cluster banner, also inset-aware (`bottomPadding = Math.max(spacing.xxl +
spacing.md, insets.bottom + spacing.lg)`, `src/components/BottomSheet.js:
103`). No path was found with a flat, non-inset-aware bottom padding.

**Recommendation:** re-verify on a fresh EAS build; source contradicts the
"still broken" framing everywhere checked. If it reproduces, capture which
exact screen state (normal set vs cluster vs per-side) it happened in.

---

## R3 — Dead set-completion overlay ("greys out, slide-up ~1cm, does nothing, tap to dismiss")

**Best-evidenced candidate: `PRCelebration` (`src/components/PRCelebration.js`),
mounted once at the app root and triggered from the set-completion path in
`ActiveWorkoutScreen.js`. The literal "slide-up" does not exist in this
component's code — flagging that contradiction rather than forcing the fit.**

`handleCompleteSet` (the function that runs every time a set is logged)
calls `showPRCelebration(...)` in two places:

```
1489  showPRCelebration({
1490    type: 'first_lift',
...
1499  } else if (prs.length > 0) {
       showPRCelebration({ ...prs[0], exerciseName: exercise.name });
```

`first_lift` fires whenever `prHistory.length === 0` for that exercise (i.e.
the very first logged set of that exercise, ever, for that user) —
`ActiveWorkoutScreen.js:1481-1497`. A real PR (`prs.length > 0`, some history
exists) fires the full celebration.

`PRCelebration` is mounted globally in `App.js:997-1005`, above
`RootNavigator`, so it renders over WHATEVER screen is active, not scoped to
ActiveWorkoutScreen:

```
997   {prCelebration && (
998     <PRCelebration
999       pr={prCelebration}
1000      onDismiss={hidePRCelebration}
1004      subdued={calm || reduceMotion}
1005    />
1006  )}
```

Two render branches in `PRCelebration.js`:

- **Full mode** (a real PR, not calm/reduce-motion): `styles.overlay` is
  `StyleSheet.absoluteFillObject` with `backgroundColor: colors.background`,
  animated to `opacity: 0.85` (`PRCelebration.js:197-198, 331-335`) — this is
  the "greys out the screen". The card itself is CENTERED and SCALES up
  (`cardScale` 0.5 -> 1, anchored at `top: screenHeight / 2 - 160`,
  `PRCelebration.js:299-304`) — it does not translate/slide from the top; it
  grows in place.
- **Subdued mode** (`isFirstLift` — ALWAYS true for `first_lift` regardless
  of settings, or calm/reduce-motion): only a small toast renders, anchored
  near the TOP of the screen —
  `toastWrap: { position: 'absolute', top: spacing.xxl, left: spacing.lg,
  right: spacing.lg }` (`PRCelebration.js:393-398`) — with only an OPACITY
  fade (`cardOpacity`, `PRCelebration.js:189, 254`), no `translateY`
  whatsoever, and NO grey backdrop at all in this branch.

Both branches wrap their content in a `TouchableOpacity` whose `onPress`
is `onDismiss` and nothing else (`PRCelebration.js:249-253, 266-269`) — this
is the exact "tap to dismiss, does nothing" behaviour: the card/toast has no
functional purpose beyond acknowledging the PR, and tapping it just closes
it early (it also auto-dismisses on a timer: 2200ms subdued,
`PRCelebration.js:190`, 3000ms full, `PRCelebration.js:225`).

**Contradiction to flag:** neither branch alone produces "greys out the
screen AND slides up ~1cm from the top" — full mode greys but doesn't slide
(scales in place, centred); subdued mode is top-anchored but doesn't grey
and doesn't slide (fade only). Most plausible read: the founder's session
kept hitting the `first_lift` subdued toast (fires once per exercise ever
logged, so repeatedly on a fresh test account) and is describing its top-
anchored fade as a stunted "slide", and/or reading its own opaque card as a
partial grey-out. Either way it is the only element on the set-completion
path that is an overlay at all, appears on (some) every-set completions,
does nothing but acknowledge, and dismisses on tap — everything else on
that path (`autoAdvanceRow`, the amber border flash, the rest timer) is
inline content, not an overlay.

No other overlay/Modal in `ActiveWorkoutScreen.js` fires unconditionally on
set completion (`showStaleModal` is inactivity-gated; `showDiscardModal`/
`showSwapModal` are explicit user actions; `supersetHeadsUp` fires on
landing on a grouped exercise, not per-set; `showSetTypePicker` is a manual
tap). `src/components/Toast.js`, the app's generic snackbar, slides from the
BOTTOM (`translateY` starts at 40, `host: { bottom: 80 }`, `Toast.js:71,
281-289`) and is not wired to `handleCompleteSet`.

---

## R4 — Unilateral (per-side) logging flow

**Root cause of the "buttons touch the text above/below" complaint found:
the per-side sheet's content sits in a bare `<>...</>` fragment with no
spacing container, unlike every other banner on this screen.**

### Tap-by-tap flow (exercise already marked per-side; one-time ask already
answered)

1. Tap the bottom bar's primary button, labelled "Log set"
   (`ActiveWorkoutScreen.js:3111-3127`) -> `handleCompleteSetPress`
   (`1883-1896`): `if (uni) return startPerSide();` (`1892-1893`).
   `startPerSide()` (`1960-1979`) validates reps/weight then opens the
   guided sheet at `phase: 'side1'`. **No set is logged on this tap** — it
   only opens the sheet.
2. Sheet shows "Side one" + "Do your first side, then confirm below." + a
   "Side one done" button (`3453-3473`). Tap -> `advancePerSideToSideTwo()`
   (`1986-1992`): flips `phase` to `side2`, starts the between-sides rest
   timer for a compound (`perSideRestPlan`, halved rest) or nothing for
   isolation (switch-sides prompt instead).
3. Sheet shows "Side two" + "Side two done" (`3482-3491`). Tap ->
   `finishPerSide()` (`1997-2010`): calls the SAME `handleCompleteSet` every
   normal set uses, exactly once, then closes the sheet (`setPerSide(null)`).

**Three taps total**: Log set (opens guide) -> Side one done -> Side two
done. Matches the TASKBOARD founder note verbatim ("log set then a second
'side one done' tap") — the first tap is labelled "Log set" but logs
nothing, which reads as the flow "doing nothing" on the first tap. A
`Cancel` link sits under both phases (`3494-3496`, `cancelPerSide()` at
`2012-2014`, just `setPerSide(null)`).

### The spacing bug ("side-one button touches the text above, cancel
touches it below")

The sheet's whole body is rendered as a bare fragment, not a `gap`-bearing
container:

```
3451  {perSide ? (
3452    <>
3453      <Text ... style={[styles.sheetTitle, ...]}>...</Text>
3456      <Text ... style={[styles.sheetExplainer, ...]}>...</Text>
3459      {perSide.phase === 'side1' ? (
3460        <>
3461          <Text ... style={[styles.sheetOptionDesc, ...]}>
3462            Do your first side, then confirm below.
3463          </Text>
3464          <Button ... style={[styles.completeBtn, ...]} ...>
...
3472          <Text ...>Side one done</Text>
3473        </Button>
3474        </>
...
3494      <TouchableOpacity onPress={cancelPerSide} style={[styles.clusterCancel, ...]} ...>
3495        <Text ...>Cancel</Text>
3496      </TouchableOpacity>
3497    </>
3498  )}
```

The relevant styles:

```
4393  sheetTitle: { ...type.title, color: colors.textPrimary, marginBottom: spacing.sm },
4394  sheetExplainer: { ...type.bodySm, color: colors.textSecondary, marginBottom: spacing.lg },
4403  sheetOptionDesc: { ...type.caption, color: colors.textMuted },
```

`sheetOptionDesc` ("Do your first side, then confirm below." /
"Resting, then do the same reps..." / "Switch sides when you're ready...")
has **no `marginBottom`/`marginTop` at all**. `completeBtn`
(`ActiveWorkoutScreen.js:4285`) has no `marginTop`. `clusterCancel`
(`ActiveWorkoutScreen.js:4364`) — reused here for the per-side cancel link —
also has no `marginTop`. The fragment they sit in has no `gap`. The
component that renders this fragment, `WorkoutBottomSheet`
(`ActiveWorkoutScreen.js:151-167`), wraps it in `WorkoutSheetScroll`, a plain
`ScrollView` whose `contentContainerStyle` is
`sheetScrollBody: { paddingBottom: spacing.xs }`
(`ActiveWorkoutScreen.js:4396`) — no `gap` either.

Contrast with the cluster banner immediately above in the same file, which
has the exact same shape (title, description, input row, primary button,
cancel link) but IS spaced correctly, because its container carries `gap`:

```
4341  clusterBanner: {
4342    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.502), borderRadius: radius.lg,
4343    backgroundColor: colors.primaryBg, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.sm,
4344  },
```

This is the direct, mechanical cause of "the side-one button touches the
text above it, and cancel touches it below": the per-side sheet is the ONE
banner on this screen missing a spacing container.

### D9 storage shape

Contrary to a "leftReps/rightReps" assumption: **new per-side sets never
write those columns.** `createWorkoutSet` is always called with
`leftReps: null, rightReps: null` (`ActiveWorkoutScreen.js:1412-1413,
1426-1427`, and again from `finishPerSide` via `handleCompleteSet`). The
pair commits as ONE `workout_sets` row with `actualReps: perSide.reps` (the
single prescribed count used for both sides — `ActiveWorkoutScreen.js:2006`)
and no `notes` breakdown either (unlike the myo-rep/cluster path). The
module doc in `src/lib/unilateral.js:1-42` explains this is a deliberate
reversal: the ORIGINAL (2026-07-09) D9 design asked for two independently
typed rep counts and stored the lower one via `lowerSideReps`; the founder
reversed that on 2026-07-11 as ED-adverse (asking a user to log one side
weaker than the other), and `left_reps`/`right_reps` (migration 054) are
legacy READ-only columns now, kept alive only via `formatPerSide` for
historic rows (`src/components/workout/LoggedSetRow.js`, confirmed by
`ActiveWorkoutScreen.unilateral.guard.test.js:147-155`).

### Pinned tests

`src/screens/__tests__/ActiveWorkoutScreen.unilateral.guard.test.js` (203
lines) is a full source-level regression guard, rewritten 2026-07-11 for
this exact reversal. It pins: laterality gating never forces bilateral
exercises (lines 65-82); rest-class behaviour derivation (84-110); the
one-row/one-prescribed-reps storage invariant, explicitly asserting
`lowerSideReps` and any per-side rep TextInput are GONE (112-156); the
two-phase state machine (158-181); and the once-ever walkthrough gating
(183-202). Any redesign of this flow needs to either keep these pins true or
get them explicitly rewritten alongside the new design — they are the
founder's own reversal ruling, not incidental scaffolding.

---

## R5 — Logger header + style inventory

### Header row (`ActiveWorkoutScreen.js:2440-2479`)

Three controls, three different visual treatments:

| Element | Source | Style |
|---|---|---|
| Close (X) | `2442-2450` | Bare `Ionicons name="close"` size 22, `color: t.colors.textSecondary`, no background/border/chrome, sits in a transparent 44pt tap target (`headerTapTarget`, `4123`) |
| Elapsed timer | `2453` | `Text` with `timerText: { ...type.num('title'), color: colors.primary }` (`4136`) — a bare numeral, brand-primary colour, no chrome, no border |
| Finish | `2467-2476` | The design-system `Button` component, `variant="secondary" size="sm"`, PLUS a bespoke override `headerFinishButton` (`4125-4134`): `flexDirection: row, gap: xxs, minWidth: finishButtonMinWidth, paddingHorizontal: sm, borderRadius: sm, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border` — a bordered chip/pill, visually unlike either sibling |

So the row reads as: plain icon, bare coloured numeral, bordered button chip
— three distinct visual languages for three header controls, none sharing a
radius/border/background treatment with either of the others.

### Style-cluster inventory (radius / padding / type / colour actually used)

| Cluster | Source | radius | padding | type role | colour |
|---|---|---|---|---|---|
| Exercise nav pill (`navTab`) | `4160` | `full` | `md`/`xs` | `type.label` | `surface2` / `primaryBg` active |
| Status chip (StatusStrip) | `StatusStrip.js:70-79` | `full` | `sm`/`xs` | `type.label` | `surface`, `borderSubtle` border |
| Now card (set-entry `Card`) | `Card.js:39,43` default | `lg` (16px) | `spacing.lg` | n/a (container) | `surface` |
| Orientation line | `4257-4258` | none (no card) | `paddingVertical: xxs` | `type.label` | `textSecondary` |
| Beat line cue (`beatLineCue`) | `4266-4277` | `sm` | `paddingHorizontal: xs`, `minHeight: 26` | `beatLineLabel` uses raw `fontSize.sm`, not a named role; `beatLineValue: type.bodyStrong` | `surface2`, `border` border |
| Cluster mini-set input | `4348`, live override `4614` | no radius token in frozen block | n/a | `type.body` (live only) | `background`, `border` border |
| Rest timer container | `RestTimer.js:472-479` | `md` | `md`/`sm` | ad hoc `fontSize: 26` numeral, explicitly `eslint-disable ... -- hero numeral` (`RestTimer.js:496-497`) | `surface2` |
| Logged set row | `LoggedSetRow.js:187` | `xs` | `xxs`/`sm` | per-field text styles, not grepped | `surface`, `border` border |
| Bottom CTA button (`completeBtn`) | `4285` | `md` | `paddingVertical: xs` | `completeBtnText` (sibling) | `primaryFill` |
| Header Finish button | `4125-4134` | `sm` | `paddingHorizontal: sm` | Button `size="sm"` default | `surface2` |

**Radius alone spans four tokens** (`full`, `lg`, `md`, `sm`, `xs`) across
functionally similar chip/row surfaces with no apparent rule: `navTab` and
the StatusStrip chip correctly share `radius.full`, but `beatLineCue` and
the header Finish button use `sm` while the visually similar `loggedSetRow`
drops to `xs`. This is the "style mish-mash" the founder flagged; the Food
standard doc (`docs/remediation-2026-07-11/FOOD-DESIGN-STANDARD.md`) is the
reconciliation target.

---

## R6 — Workout summary bar dead space between Close and Share

**This exact bar was already under founder review TODAY (2026-07-11, build
2608) per an in-source comment — flagging so this isn't re-litigated from
scratch.**

The bar (`WorkoutSummaryScreen.js:1514-1549`):

```
1514  <View
1515    style={[styles.stickyFooter, live.stickyFooter, { paddingBottom: spacing.lg }]}
1516    onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
1517  >
1518    {saveError ? ( ... ) : null}
1519    <View style={styles.footerRow}>
1520      <Button title={saving ? 'Saving' : 'Close'} ... style={[styles.doneBtn, ...]} />
1524      {!readOnly && (
1525        <Button title="Share" ... style={[styles.shareFooterBtn, ...]} />
1526      )}
1527    </View>
1528  </View>
```

```
1931  stickyFooter: { borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.md, paddingTop: spacing.sm, minHeight: 68, backgroundColor: colors.background },
1952  footerRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
1959  doneBtn: { flex: 1, minHeight: 44, ... },
1974  shareFooterBtn: { ..., minWidth: 108, minHeight: 44, ... },
```

There is no missing third element and no `justifyContent` gap in
`footerRow` — it is a two-child row, `doneBtn` takes `flex: 1`,
`shareFooterBtn` is fixed-width, separated by a plain `gap: spacing.md`
(12px). The one place unexplained vertical space could sit is above the
button row, in `stickyFooter`'s own `paddingTop: spacing.sm` (8px) — when
`saveError` is falsy (the normal case) nothing else renders there.

The comment directly above this block (`WorkoutSummaryScreen.js:1501-1513`)
is dated to TODAY and references this exact founder defect:

> `2026-07-11 (founder defect, build 2608) LEAD RULING at review: this
> flat-token + edges=['top','bottom'] design is frame-relative ... and
> therefore context-adaptive, so it stays. The founder's photo defect was
> the SCROLL CLEARANCE, fixed below via the measured footerHeight; the
> bottom-strip observation goes to the device checklist with both
> hypotheses rather than reversing founder-evidenced inset behaviour blind.`

A related complaint from the SAME device-walk build already went through
lead review today; the fix applied was to the scroll content's
`paddingBottom` (measured `footerHeight`,
`src/__tests__/bottomBarInset.guard.test.js:44-50`), NOT to any gap inside
the bar. The "bottom-strip observation" (reads as the same report as this
R6 item) was explicitly left open for the device checklist, not fixed. R6
should continue that thread, not start fresh.

---

## R7 — Progress: section below Training Load only 2 of a claimed 3-4 cells

**The row is hard-coded to exactly two children in source — there is no
data-driven cell count and no conditional third/fourth slot to find.**

`AnalyticsScreen.js:411-435`, directly under `TrainingLoadHero`:

```
415  <View style={styles.sparkRow}>
416    <SparkCard label="Sessions" ... />
424    <SparkCard label="New bests" ... />
432  </View>
```

```
1216  sparkRow:  { flexDirection: 'row', gap: spacing.md },
1217  sparkCard: { flex: 1 },
```

Exactly two `SparkCard` elements are written in JSX, both `flex: 1`, filling
the row edge to edge with a fixed 12px gap — no reserved-but-empty third/
fourth column, no `.map()` over a data array that could drop entries, no
`justifyContent` gap if fewer items rendered than expected.

This matches the OLDER founder-list item 4 (`docs/TASKBOARD.md:103-109`),
independently checked and marked VERIFIED: "AnalyticsScreen spark row is
already two-up flex with no third slot ... already correct in source." R7
is the founder re-reporting a similar complaint on the SAME screen after
that verification. Since the code shows no rendering bug, the likely honest
reading is VISUAL DENSITY, not a missing cell: each `SparkCard`'s content is
short (label, numeral, a 32px sparkline, one caption line —
`AnalyticsScreen.js:1039-1055`) versus the much taller `TrainingLoadHero`
above it (64px chart plus more copy, `975-1018`), and each card is stretched
to half the screen width by `flex: 1` — on a wide phone that reads as two
large, mostly-empty boxes without any card being missing. Needs a
screenshot to confirm before any redesign; source contradicts a literal
missing-cell bug.

---

## R8 — Coach page duplication with Weekly check-in

Coach tab = `YouScreen.js` (`src/navigation/RootNavigator.js:645`,
`ProfileTab` -> title "Coach" -> `You` screen). Section order, top to
bottom: (1) `ScreenHeader` "Coach"/"Weekly coaching from your logs." +
settings gear (`301-315`); (2) load-error card, conditional (`317-332`);
(3) **profile card** — avatar, name, Pro badge, "N completed sessions",
profile focus line (`341-365`); (4) **coach status card** (`statusCard`,
`367-390`); (5) **"This week"** section, Pro only (`392-415`); (6) "Setup",
Pro only (`437-458`); (7) "Support" -> Partners (`461-470`); (8) "Safety
checks", Pro only (`472-488`).

The status card (4) is icon + `SectionLabel` "Coach" + a title that is one
of: Pro+review -> `"Weekly coach update: {date}"`; Pro+no review ->
`"Getting to know you"` (`378`, the string TASKBOARD flags as "added no
value"); Free -> `"Coach is available on Pro"`. Its body, for the
Pro/no-review case:

> `"Your coach reads your logs, applies safety limits, and explains
> every decision. The weekly check-in below has your current status and
> next date."` (`387`)

The "This week" section (5) has three `NavRow`s: "Weekly check-in",
"Coaching decision", "Your week". The Weekly check-in row's `sub`:

```
398  sub={latestReview
399    ? "Answer this week's questions so the coach has context."
400    : `${pendingCoachCopy.title}. ${pendingCoachCopy.body}`}
```

`pendingCoachCopy` (`buildPendingCoachCopy`, `123-167`) produces the FULL,
specific status — e.g. `"First check-in not open yet. Log your morning
weight and train as normal. Volyume will open the check-in once the
baseline is ready."`

**The duplication**: the status card's body line (step 4) is a vague
pointer ("the weekly check-in below has your current status and next
date") sitting DIRECTLY ABOVE a `NavRow` (step 5) whose `sub` text is the
FULL, specific version of that same status — driven from overlapping but
SEPARATE readiness computations: `YouScreen.js` builds its own
`buildCoachLedger({ weighIns7d, completedSessions, firstWeightAt,
checkinDay, edFlagOpen })` (`YouScreen.js:245-252`, `src/lib/coachLedger.js`)
purely to derive `pendingCoachCopy` for the NavRow sub-text, while
`WeeklyCheckInScreen.js` (the NavRow's destination) has its OWN readiness
constants, `FIRST_CHECKIN_MIN_DAYS`/`MIN_WEIGH_INS`/`firstReviewUnlockDate`
from `src/lib/trialActivation.js` (`WeeklyCheckInScreen.js:58`). Two
parallel "is the check-in ready" computations feeding two adjacent pieces
of UI describing the same thing is both a duplicated-content problem (what
the founder describes) and a duplicated-logic risk (they can drift). A real
merge picks ONE readiness source and ONE place that states it, and lets the
NavRow purely navigate.

Side-by-side overlap:

| Coach page (`YouScreen.js`) | Weekly check-in surfaces |
|---|---|
| Status title: "Getting to know you" / "Weekly coach update: {date}" | Same fact restated in the NavRow's own sub-copy one card down |
| Status body: generic pointer to "the weekly check-in below" | NavRow "Weekly check-in" sub: the FULL specific readiness message (`pendingCoachCopy`) |
| Profile card: "{N} completed sessions" | `WeeklyCheckInScreen.js` separately reads `getWeeklySessionStats` for its own count |
| "Coaching decision" NavRow: "See what changed, what stayed the same, and why" | Status body already says almost the same thing when a review exists ("Open it to see what changed, what was held...", `YouScreen.js:386`) |

---

## Bonus: other defects noticed while reading (max 5)

1. **R2 and R7 both show a "verified/fixed in source, still reported"
   pattern.** Source-level evidence says the exact defect was already fixed
   (R2, with a pinned regression test) or never existed as described (R7).
   Worth a fast device re-check on a CURRENT build before spending more
   code effort on either.
2. **Per-side sheet spacing bug is isolated, not systemic** — the sibling
   cluster banner (same shape: title/description/button/cancel) is
   correctly spaced via its own `gap: spacing.sm`
   (`ActiveWorkoutScreen.js:4341-4344`). Only the per-side content, a bare
   fragment inside `WorkoutBottomSheet` with no `gap`-bearing wrapper, is
   missing it. Wrapping that fragment in a `View` with `gap: spacing.sm`
   would likely fix R4's spacing complaint on its own, separate from
   whatever bigger one-tap redesign R4 also calls for.
3. **`PRCelebration`'s subdued/first-lift toast has no motion beyond
   opacity** — worth deciding, as part of R3's fix, whether it should gain
   a real slide-in (`Toast.js`'s `translateY` pattern) or drop the "slide"
   framing and just be a clean fade.
4. **`WorkoutSummaryScreen.js`'s sticky-footer comment (`1501-1513`) is
   dated TODAY** and records a LEAD RULING already made on this exact bar
   for the same device-walk build (2608) — R6 should read it before
   proposing a different fix; it already left the remaining question open
   for the device checklist.
5. **Radius token drift is not limited to the logger** — `beatLineCue` and
   the header Finish button share `radius.sm` by coincidence, but
   `loggedSetRow` (`radius.xs`) and `completeBtn`/`inlineActionPill`
   (`radius.md`) diverge for visually comparable "chip" surfaces — see the
   R5 table for the full four-token spread.
