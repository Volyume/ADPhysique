# VOLYUME - Whole-App Elite Failure Register (2026-07-04)

Synthesis of eight parallel dimension audits into one master defect register.
Purpose: give the founder a single, honest, exhaustive view of where the live app
is failing users or falling short of the elite bar, grouped so that build agents
can pick up safe work in worktree-isolated batches, with the small set of
engine/ED/pricing forks surfaced as explicit founder decisions rather than
pre-decided.

British English throughout. No em dashes. Evidence quoted as `file:line` from the
finders; nothing here has been softened or dropped to look tidy.

---

## 0. Blunt headline

VOLYUME is a well-architected, heavily-audited app with genuinely elite cores
(the theme-token system, the reader-side ED-safety posture, the log-a-set and
log-a-food accessibility, the pure logic modules), but it is NOT uniformly elite.
Fifty-two distinct defects surfaced across seven populated dimensions, twenty-five
of them major. The most serious are a consistent fail-OPEN residue in the
ED-safety wiring for notifications, calorie-banking, the weight-trend card, the
weekly share card, the partner writer and the widget snapshot: on a transient
local read error each of these reads a missing ED flag as "no flag" and shows or
sends the exact weight/food/share layer the flag exists to withhold, which
contradicts the fail-closed doctrine the UI screens already follow and brushes the
one inviolable line in the constitution. Alongside that sit real trust and
data-reachability failures: a Partners screen that shows a paying user the
new-user acquisition pitch whenever a load throws; the user's own data made
unreachable or uneditable (Full History silently capped at 50, no way to fix a
mis-logged weigh-in, no date jump in the Diary or Progress Photos, Cardio History
with no controls); a diary day-load race that can paint yesterday's calories under
today's date; and pervasive presentation drift (the single most common
filter/segment idiom drawn in three colour languages and two ambers, section
labels in six treatments, dozens of hand-rolled buttons/inputs/sheets) that stops
the app reading as one designer's work. None of this requires touching the
deterministic engine. The ED items are one-line fail-closed flips gated on founder
sign-off; almost everything else is mechanical migration onto primitives that
already exist.

---

## 1. Counts

| Severity | Count |
|---|---|
| Blocker | 0 |
| Major | 25 |
| Minor | 19 |
| Polish | 8 |
| **Total findings** | **52** |
| Items needing a founder decision | 10 |

By dimension (populated finders only; D7 "test" returned no findings):

| Dim | Area | Major | Minor | Polish | Total |
|---|---|---|---|---|---|
| VC (D1) | Visual consistency beyond headers | 4 | 3 | 2 | 9 |
| ST (D2) | State handling | 4 | 3 | 1 | 8 |
| NAV (D3) | Navigation, dead-ends, missing affordances | 7 | 2 | 0 | 9 |
| CP (D4) | Copy clarity and self-explanation | 0 | 3 | 2 | 5 |
| BUG (D5) | Correctness, crashes, bugs (non-engine) | 1 | 3 | 1 | 5 |
| AX (D6) | Accessibility | 4 | 2 | 2 | 8 |
| ED (D8) | ED-safety, privacy and trust seams | 5 | 3 | 0 | 8 |
| **All** | | **25** | **19** | **8** | **52** |

---

## 2. How to read this register

- **ID:** dimension prefix + number, e.g. `ED-1`, `NAV-4`. Stable references for the
  execution plan and for build agents.
- **Severity:** blocker / major / minor / polish, as returned by the finder. No
  finder reported a blocker; the worst are majors, and the ED-safety majors are
  ranked first because they touch the one inviolable constraint even though their
  individual probability is low.
- **Founder decision:** YES means the fix touches the deterministic engine,
  ED-safety wiring, pricing/gating, GDPR/consent representation, or a genuine scope
  fork, and MUST be answered by the founder before an agent builds it (per the
  no-silent-corner-cutting rule). NO means mechanical/presentational/state/copy/a11y
  work an agent can do against a clear spec.
- **Cross-cut:** where the same screen or the same root cause is hit from more than
  one dimension, it is noted so the founder sees the compounding and so two agents
  do not collide on one file. See section 11 for the full overlap map.

---

## 3. D1 - Visual consistency beyond headers (VC)

**Finder's honest summary.** The app has a genuinely good token system
(`theme.js`) and canonical primitives (Card, Button, Chip, SegmentedControl,
BottomSheet), and some layers are already elite: iconography is 100% Ionicons with
zero drift, food-domain sheets nearly all use the canonical BottomSheet, and about
half the screens route section labels through `type.label`. But adoption is patchy
and the same UI element is drawn multiple visibly-different ways across the roughly
80 screens, which is exactly the founder's "consistent in ALL areas, not just one
box" complaint. The worst offenders are element classes with no enforced single
form: the selected segment/filter pill appears in three colour languages and with
two different ambers on the identical control type; the small section label has
about six competing weight/spacing/colour/case combinations because no type role
exists for it; primary CTAs are hand-rolled at `radius.md` while the canonical
Button is `radius.lg`; text inputs use four background tokens and two border
weights with no canonical Input; and stat tiles vary in size, weight and even
whether they use the mandated tabular figures. Lower down, dividers use the heavy
control-edge token instead of the reserved hairline, several sheets are
hand-rolled, and gutters and radii split roughly evenly between two values. None of
this touches the engine or ED-safety; it is pure presentation, and fixing it is
mostly mechanical migration onto existing primitives plus two missing type roles,
but it spans 40-plus screens.

### VC-1 - The selected segment / filter pill exists in three colour languages and two different ambers on the identical control type
- **Severity:** major | **Founder decision:** YES (bounded: the amber hue and the
  single selected-state grammar are a design pick; the migration itself is safe)
- **Evidence:** `SegmentedControl.js:41` (bright `colors.primary` fill);
  `SettingsDisplayScreen.js:288` and `SettingsScreen.js:328` (`primaryFill`, deeper
  amber); `ProgressPhotosScreen.js:596` (`filterChipActive` = `primaryFill`);
  `Chip.js:63-65` (tint + border + primary text); `WindowChips.js:45`;
  `AnalyticsScreen.js:940`; `WorkoutHistoryScreen.js:728`.
- **Why it fails the elite bar:** the single most common interactive idiom in the
  app (pick-one segment / filter chip) has no enforced form. Selected state is
  drawn three fundamentally different ways (bright-amber solid fill, deep-amber
  solid fill, amber-tint outline) and the SAME control type is filled with two
  different golds depending on screen, so a user flipping between Settings and
  onboarding sees the identical control in two ambers. Track surface and radius also
  differ.
- **Fix direction:** pick one selected-state grammar and one amber, encode it once,
  route every filter/segment/toggle through SegmentedControl or Chip, and delete the
  hand-rolled `chartToggleBtn` / `segBtn` / `filterChip` / WorkoutHistory chip
  blocks. If a tint-outline is deliberately kept for multi-select, document that
  split in `styling.md`. The bright (`#F5A623`) vs deep (`#E08C0B`) amber choice is
  the founder call.
- **Cross-cut:** the Progress Photos filter chip here is the same screen as NAV-4
  (date navigation) and CP-1 (privacy disclaimer). See section 11.

### VC-2 - Section / eyebrow labels have about six competing treatments because no type role exists for an uppercase overline
- **Severity:** major | **Founder decision:** NO
- **Evidence:** plurality `type.label` + `textSecondary` at `PlansScreen.js:1097`,
  `ExerciseDetailScreen.js:963`, `VolumeHeatmapScreen.js:727`,
  `LiftProgressScreen.js:461`; divergent at `RoutineDetailScreen.js:843`,
  `ShareCardScreen.js:564`, `LogCardioScreen.js:273`, `FoodInsightsScreen.js:590`,
  `GoalChangeSummaryScreen.js:330`, `CoachingRemindersScreen.js:441`,
  `CoachOutputScreen.js:2630`, `NutritionEducationScreen.js:271`,
  `SubscriptionPolicyScreen.js:176`.
- **Why it fails the elite bar:** the small heading over a group of content is one
  of the most repeated text elements in the app, yet it appears with four
  letter-spacings (0.6/0.8/1/1.5), three weights (semibold/bold/black), two colours
  and inconsistent uppercase. Screens that sit next to each other in a flow present
  their section headers in visibly different type, so the app does not read as one
  designer's work.
- **Fix direction:** add a single `type.overline` role (`fontSize.xs`, semibold,
  `letterSpacing.label`, `textSecondary`, plus a documented textTransform decision)
  and migrate the ad-hoc section-label styles onto it. Keep the larger iconned
  `type.title` header as a separate documented role for education/marketing screens.

### VC-3 - Dozens of hand-rolled primary CTAs instead of Button, with corner radius drifting md vs lg even inside one screen
- **Severity:** major | **Founder decision:** NO
- **Evidence:** canonical `Button.js:229` uses `radius.lg`; hand-rolled primaries at
  `ActiveWorkoutScreen.js:3513` (lg) vs `:3577`, `:3587`, `:3597`, `:3604` (all md)
  in the SAME file; `AnalyticsScreen.js:1271` (md); `BuildWorkoutScreen.js:672`
  (md); `GoalLockConsentScreen.js:218` (md); `RoutineDetailScreen.js:773` (lg).
  Label size also drifts (`addFirstBtnText` `fontSize.lg` vs Button `fontSize.md`).
- **Why it fails the elite bar:** the amber primary button is the app's signature
  action and its corner radius visibly changes (16px vs 10px), sometimes both in one
  screen. Hand-rolled copies also silently drop the Button component's press haptic,
  disabled treatment, loading/success morph and width-lock, so behaviour drifts with
  the look.
- **Fix direction:** migrate hand-rolled primary/secondary/destructive buttons onto
  the Button primitive (variant + size props cover these cases). Where a bespoke
  layout genuinely cannot use Button, standardise on `radius.lg` and the
  `fontSize.md` bold label.

### VC-4 - Text inputs use four different background tokens and two border weights; the dedicated inputBg token is mostly ignored and there is no canonical Input
- **Severity:** major | **Founder decision:** NO
- **Evidence:** `ManualBuilderScreen.js:1161` and `AddCustomFoodScreen.js:361` use
  `colors.inputBg`; `FirstRunScreen.js:107` and `MealNamesScreen.js:87` use
  `surface2`; `RecipeBuilderScreen.js:413` and `ProOnboardingScreen.js:1752` use
  `surface` (ProOnboarding also `borderWidth 1.5`); `MyMealsScreen.js:264` uses
  `background`. The `inputBg` token appears in only 8 files app-wide.
- **Why it fails the elite bar:** a text field is a field and should look the same
  everywhere. Instead the fill is one of four tokens and the onboarding field carries
  a heavier 1.5px border, and the purpose-built `inputBg` token is ignored by most
  inputs.
- **Fix direction:** create a canonical Input component (or a shared input style)
  fixing background (one token), border colour, border width (1), radius (md) and
  padding, and migrate the form screens onto it. Decide whether `inputBg` or
  `surface2` is the field fill and delete the loser.

### VC-5 - Stat tiles vary in size, weight, colour, and half ignore the theme's tabular-figures mandate
- **Severity:** minor | **Founder decision:** NO
- **Evidence:** `WorkoutSummaryScreen.js:1512` `type.num('h3')` (tabular);
  `ImportScreen.js:401` `type.num('h2')`; `CoachReviewScreen.js:701`
  (`fontSize.xl`/heavy, no `fontVariant`); `BlockReflectionScreen.js:259`
  (`fontSize.lg`/black, none); `LiftProgressScreen.js:543` (`fontSize.lg`/heavy,
  none). `theme.js:491` `num()` mandates tabular figures for any number read as data.
- **Why it fails the elite bar:** the number-over-label tile renders at 17/20/24px
  across screens in four weights, and only some use tabular figures, so numbers on
  Coach Review and Lift Progress jitter and misalign against the theme's own rule.
- **Fix direction:** add a `type.stat` role (or a small Stat/Metric component)
  wrapping `num()` at one size and weight with a fixed label colour, and migrate the
  `statValue`/`statLabel` blocks onto it.

### VC-6 - Internal card/row dividers use the heavy control-edge token instead of the reserved hairline, via four different tokens
- **Severity:** minor | **Founder decision:** NO
- **Evidence:** `borderBottomColor: colors.border` appears 43 times and
  `borderTopColor: colors.border` 33 times; `borderSubtle` used as a divider only
  about 9 times; LiftProgress uses `borderLight` and one site uses `colors.surface`.
  `theme.js:43` defines `borderSubtle` for hairline dividers inside a card and
  `border` as the WCAG control-edge, so current usage is backwards in most places.
- **Why it fails the elite bar:** dividers between rows inside a card should be quiet
  hairlines, but about 76 sites draw them with the strong control-edge token, so
  lists look heavier and more boxed-in than intended, inconsistently. This is the
  exact "borders look different in different places" failure in the brief.
- **Fix direction:** sweep internal dividers to `borderSubtle`, reserve
  `colors.border` for outer card/control edges, and add a small Divider component or
  lint note so future rows cannot reach for the wrong token.

### VC-7 - Several bottom sheets are hand-rolled and diverge from the canonical BottomSheet chrome, including two different sheets in one file
- **Severity:** minor | **Founder decision:** NO
- **Evidence:** `BottomSheet.js:127-137` defines canonical chrome (top border,
  `paddingHorizontal lg`, `radius.xl` top corners); hand-rolled and divergent at
  `ActiveWorkoutScreen.js:3516` (no top border, padding xl) vs `:3562` (border,
  padding xl) in one file; `RoutineDetailScreen.js:750`, `HomeScreen.js:2634` and
  `:2716`, `ExerciseDetailScreen.js:1222`, `FoodSearchScreen.js:1226`,
  `PlanLibraryScreen.js:823`, `ScanLabelScreen.js:419`.
- **Why it fails the elite bar:** sheets over the same app should share one chrome,
  but border presence and horizontal padding vary, and ActiveWorkout ships two
  inconsistent sheets itself. The food domain already proves the canonical sheet
  works.
- **Fix direction:** migrate the remaining hand-rolled sheets onto BottomSheet
  (which already handles scrim, slide, handle, insets, reduce-motion). Where a full
  migration is risky (ActiveWorkout), at least match the border and
  `paddingHorizontal`.
- **Cross-cut:** the `FoodSearchScreen` plate modal chrome overlaps AX-3
  (accessibility of that same hand-rolled modal).

### VC-8 - Screen content gutter and card corner radius each split roughly evenly between two values
- **Severity:** polish | **Founder decision:** NO
- **Evidence:** screen/container padding tallies `spacing.lg` x140, `spacing.md` x58,
  `spacing.xl` x31; card radius `radius.md` in 54 files vs `radius.lg` in 41
  (`Card.js` defaults to `radius.lg`). Direct PressableCard use bypassing Card in
  WorkoutHistory, Import, LiftProgress, Home, Plans, You.
- **Why it fails the elite bar:** the outer gutter is 16px on most screens but 12px
  or 24px on a large minority, and card corners are 10px on roughly as many surfaces
  as 16px, so the content edge and card roundness visibly jump between top-level
  screens.
- **Fix direction:** standardise the top-level gutter on `spacing.lg` and card radius
  on `radius.lg` (allow `radius.md` only for genuinely small controls/inputs,
  documented); move the six PressableCard-direct screens onto Card.

### VC-9 - Control and card border width drifts between 1, 1.5 and 2px for the same class of edge
- **Severity:** polish | **Founder decision:** NO
- **Evidence:** `borderWidth` tallies 1 x387, 1.5 x21, 2 x12 (plus legitimate 4/13
  camera rings). `SegmentedControl.js:35` uses 1.5 on its track; inputs at
  `ProOnboardingScreen.js:1753` use 1.5 while others use 1.
- **Why it fails the elite bar:** edge weight is a constant a premium app holds
  steady; here the same kind of edge is 1px in most places, 1.5px in a scattered few
  and 2px in others with no semantic reason.
- **Fix direction:** fix a single 1px hairline weight for card and control edges in
  the tokens/primitives, reserve thicker widths for the documented camera ring, and
  sweep the stray 1.5/2 values on inputs/tracks back to 1.

---

## 4. D2 - State handling (ST)

**Finder's honest summary.** The app has a genuinely strong core: a per-screen
error boundary (ScreenBoundary), a Skeleton system, and several exemplary screens
(Analytics, BodyMetrics, PlanLibrary, WorkoutHistory, CoachOutput, WeeklyCheckIn)
that each handle loading, error+retry and an illustrated first-run empty. But the
pattern is not applied consistently and a handful of surfaces have real
dead/misleading states. The worst is that the Partners hook collapses ANY load
failure into the new-user acquisition pitch, so a paying user with an active
partner can be shown "Train with a partner" as if they never connected, with no
error or retry. Barcode scanning fails silently on a lookup/network error. The
Consistency tab ignores the very loading and empty flags its own data hook
exposes. VolumeHeatmap uses a bare full-screen spinner with no error state and no
zero-data guidance. Beneath those, the shared EmptyState component is used on
exactly one screen, "not enough data yet" is phrased about ten different ways, and
loading is variously a Skeleton, a bare ActivityIndicator, or a plain "Loading"
line. Offline is only detected on one screen (ScanLabel). None of these touch the
engine or ED-safety.

### ST-1 - Partners: any load failure is shown as the "no partner" acquisition pitch (error masquerades as empty, no retry)
- **Severity:** major | **Founder decision:** NO
- **Evidence:** `usePartners.js:196-197` (catch sets `{...EMPTY, loading:false}`);
  `EMPTY` has `rowState 'empty'` (`usePartners.js:36`); `enrichPair` does an
  unguarded `Promise.all` of about 12 getters with no internal try/catch
  (`usePartners.js:62-88`) awaited inside the same try (`:174`); `PartnerScreen.js`
  renders only loading/connected/pending/empty with NO error branch
  (`PartnerScreen.js:660-716`).
- **Why it fails the elite bar:** a single failing getter for a real partnership
  rejects `enrichPair`, rejects the outer `Promise.all`, and collapses the screen to
  EMPTY. A paying Pro user who actually has a partner then sees the first-run pitch
  "Train with a partner" as if they never connected, with no error copy and no
  retry, and no way to distinguish a genuine no-partner state from a failed load.
  For a trust-and-accountability feature this is the most damaging possible
  misrepresentation.
- **Fix direction:** add an `error` field to the hook state and set it in the catch
  (keep prior pairs if any); wrap `enrichPair`'s body in try/catch so one bad pair
  degrades to a minimal card; give PartnerScreen an explicit error branch
  (cloud-offline icon + "Couldn't load your partners" + Try again). Only show the
  acquisition pitch when the load succeeded and there are genuinely zero
  partnerships.

### ST-2 - Barcode scan fails silently on lookup/network error: no toast, no message, camera just resets
- **Severity:** major | **Founder decision:** NO
- **Evidence:** `ScanBarcodeScreen.js:129-133` (catch logs, sets `scanLock=false`
  and `setResolving(false)`, no user feedback); network lookups can throw
  (`food/waterfall.js:220-235`). Contrast `ScanLabelScreen.js:98-103, 390-394` which
  detects and explains offline.
- **Why it fails the elite bar:** a user scans, sees "Looking it up", then the badge
  disappears and it returns to "Point at a barcode" with zero feedback, so
  (especially offline in a supermarket) they re-scan into the void with no idea why.
- **Fix direction:** in the catch, show a calm toast ("Couldn't look that up. Check
  your connection and try again, or enter it by hand.") and offer the manual/label
  fallback the same way a clean miss does; optionally mirror ScanLabel's NetInfo
  check to say "You're offline" specifically.
- **Cross-cut:** same screen as AX-2 (unlabelled scanner exit).

### ST-3 - Consistency tab has no loading state and no first-run empty state (ignores flags its own hook exposes)
- **Severity:** major | **Founder decision:** NO
- **Evidence:** `ConsistencyScreen.js:30-36` destructures `useProgressData` but omits
  `loading` and `hasData`, which the hook DOES expose (`useProgressData.js:445`,
  `:435`). AnalyticsScreen consumes the same hook and renders SkeletonCards
  (`AnalyticsScreen.js:402-410, 536-542`) plus an illustrated empty (`:544-559`).
- **Why it fails the elite bar:** on cold load the Consistency surface (a core Pro
  tab) renders every section against empty defaults and pops them in as reads land
  (layout shift, no skeleton), and a brand-new Pro user gets a scattering of
  half-empty cards with no cohesive first-run state, while the sibling built on the
  identical source does both.
- **Fix direction:** consume `loading` and `hasData`; show a Skeleton block during
  cold load and an illustrated first-run empty (matching AnalyticsScreen's pattern)
  when `hasData` is false.

### ST-4 - Volume heatmap: bare full-screen spinner, no error state, no zero-data empty
- **Severity:** major | **Founder decision:** NO
- **Evidence:** `VolumeHeatmapScreen.js:288-294` renders a lone centred
  ActivityIndicator; the load catch only calls `setLoading(false)` with no error UI
  (`:171-174`); only the trend section self-hides for new users (`:458`), the body
  diagram and per-muscle bars always render.
- **Why it fails the elite bar:** three gaps at once - the spinner is inconsistent
  with the Skeleton language used everywhere else; a thrown load silently shows a
  partial heatmap with no retry; and a brand-new user sees a full anatomical diagram
  reading "below minimum" everywhere with no "log a session and this fills in"
  guidance, which reads as failure rather than first-run.
- **Fix direction:** swap the spinner for Skeleton placeholders shaped like the
  diagram + bars, add an error branch with retry, and add a zero-data empty state
  when there are no sets in the window.
- **Cross-cut:** the spinner is one of the four "loading dialects" catalogued in
  ST-7.

### ST-5 - Food Insights conflates loading with not-enough-data
- **Severity:** minor | **Founder decision:** NO
- **Evidence:** `FoodInsightsScreen.js` has no top-level loading state; cards render
  their own not-enough-data copy during the initial read (`:378-380`, `:488-490`,
  `:518`); the only spinner is inside the export button (`:533`).
- **Why it fails the elite bar:** before the reads resolve, a returning user with
  weeks of logged food is momentarily told "Log a couple of days" across every card,
  then real charts pop in. Telling an established user they have no data, even for a
  beat, is a jarring, not-elite flash.
- **Fix direction:** add a loading flag; render Skeletons in the card slots during
  cold load and only fall through to the "log a few days" copy once loading is done
  and the data is genuinely sparse.

### ST-6 - Empty-state treatment is fragmented: the shared EmptyState component is used on exactly one screen; about ten "not enough data" phrasings coexist
- **Severity:** minor | **Founder decision:** NO
- **Evidence:** `EmptyState.js` imported only by `CardioHistoryScreen.js:19,172`; the
  reference screens hand-roll their own (`BodyMetricsScreen.js:974-988`,
  `AnalyticsScreen.js:544-559`); copy variants coexist ("Log weight at least twice",
  "Log weight 3 or more times", "Log a couple of days", "Log a few days", "Log a few
  sessions", "Not enough data in this window yet", and others).
- **Why it fails the elite bar:** this is the exact "inconsistent screen to screen"
  class the founder keeps flagging - full-screen empties range from illustrated
  icon+title+body+CTA to a single muted line, and the not-enough-data wording is
  bespoke per site with no shared voice or threshold vocabulary, while a good pattern
  exists that almost nothing adopts.
- **Fix direction:** adopt EmptyState (or a small sanctioned set: full-screen
  illustrated, inline-card, inline-line) across screens, and centralise the
  not-enough-data phrasings into a tiny copy helper keyed by domain so "twice",
  "3 times", "a couple of days" read as one system.
- **Cross-cut:** the copy half of this overlaps D4's clarity remit; captured once
  here as a state+copy item.

### ST-7 - Loading language is inconsistent: Skeleton vs bare ActivityIndicator vs plain "Loading" text vs blank list
- **Severity:** minor | **Founder decision:** NO
- **Evidence:** Skeletons on about 20 screens; bare spinners at
  `VolumeHeatmapScreen.js:291`, `PartnerScreen.js:665`, `MealPlanScreen.js:458`,
  `MyRecipesScreen.js:167`; a plain "Loading" line at `SnapshotsScreen.js:68`;
  `LiftProgressScreen.js:394-409` shows a blank list during cold load because its
  ListEmptyComponent is gated on `!loading`.
- **Why it fails the elite bar:** the app speaks three or four loading dialects, so a
  user moving between tabs sees a skeleton, then a spinner, then a text line, then a
  blank flash, reading as several apps stitched together.
- **Fix direction:** standardise on the Skeleton system for content-bearing screens
  (shape placeholders to the real layout); reserve bare spinners for genuinely
  indeterminate in-place actions; give LiftProgress a skeleton list during cold load.

### ST-8 - Latent forever-spinner if user.id is momentarily null on focus
- **Severity:** polish | **Founder decision:** NO
- **Evidence:** `useProgressData.js:97-98` early-returns on `if (!user?.id) return;`
  WITHOUT `setLoading(false)`, while `loading` initialises true (`:70`);
  AnalyticsScreen renders skeletons keyed on that loading; recovery relies on the
  focus-effect dep `[user?.id]` re-firing. Contrast `LiftProgressScreen.js:89` and
  `VolumeHeatmapScreen.js:99` which correctly `setLoading(false)` on the null-user
  return.
- **Why it fails the elite bar:** if `user.id` is transiently null when the Progress
  tab focuses (a re-auth race), `load()` bails with loading stuck true and Analytics
  shows skeletons indefinitely until re-focus. Low likelihood (RootNavigator gates
  auth) but a real never-resolves path.
- **Fix direction:** in `useProgressData.load()`, on the `!user?.id` early return
  also `setLoading(false)`, matching the other screens.

---

## 5. D3 - Navigation, flow dead-ends and missing affordances (NAV)

**Finder's honest summary.** The core navigation graph is sound: tabs
re-tap-to-root, cross-tab routing is guarded, deep links resolve, and most screens
have thoughtful empty states. The failures are almost all MISSING AFFORDANCES on
history/log/list surfaces, and they cluster on exactly the pattern the founder
already flagged on Progress Photos: a screen shows a filtered slice of the user's
own data with no way to reach the rest of it. Workout History silently caps at 50
sessions behind a tile labelled "Full History", with no pagination or search and an
under-reporting calendar/count. The Diary, the most date-centric screen, has weaker
date navigation than Workout History. Body Metrics has no way to edit or delete a
mis-logged weigh-in. Progress Photos, Cardio History, My Meals and Coach History all
lack sort/search/date controls a paying user expects, and action placement is
inconsistent screen-to-screen. None of this is a crash, but collectively it is the
difference between "acceptable" and "elite" and it fails discerning users the moment
their data outgrows the first screenful.

### NAV-1 - "Full History" is silently capped at 50 sessions, no pagination, no search
- **Severity:** major | **Founder decision:** NO
- **Evidence:** `WorkoutHistoryScreen.js:71` `const page = mine.slice(0, 50)`; top
  bar count is `workouts.length` (`:573`); calendar `trainedDatesSet` built from the
  same 50 (`:286`). Reached via the "Full History" NavTile
  (`AnalyticsScreen.js:757`) and "All sessions" (`:661`).
- **Why it fails the elite bar:** a committed user with more than 50 sessions can
  never see, search or open older workouts; the tile promises "Full History" but
  delivers the most recent 50; the header count reads "50 sessions" for someone who
  has done 300; and the calendar shows earlier trained months as untrained. Data
  that exists is unreachable, the classic "where else are we failing users" trap.
- **Fix direction:** add windowed pagination (load-more or FlashList
  `onEndReached`) or raise/remove the 50 cap for the list, and derive the calendar's
  trained-days set and the session count from the full completed-workout set, not the
  rendered page; add a search box. Keep the per-page set fetch so only visible rows
  load their sets.

### NAV-2 - Body Metrics has no way to view, edit or delete an individual logged weigh-in
- **Severity:** major | **Founder decision:** YES (weight-data write; must inherit
  the screen's read-only-lapse and calm-mode/ED suppression guards, add no cadence
  framing; scope is a founder call)
- **Evidence:** `BodyMetricsScreen.js:1195-1217` renders `history.slice(0,12)` as
  inert Cards (no onPress/edit/delete); no `deleteBodyMetric`/`updateBodyMetric`
  exists; history capped at `getBodyMetricLog(user.id,50)` (`:584`) with only 12
  shown and no "see all".
- **Why it fails the elite bar:** a fat-fingered weight (8.25 st typed as 82.5) is
  permanent - it cannot be edited or removed and it skews every downstream trend,
  EWMA, phase detection and adaptive-TDEE estimate. Progress Photos already offer
  per-item delete, so a user expects the same here and finds a dead read-only list;
  the log also only ever shows the last 12 with no route to the rest.
- **Fix direction:** give each history row tap-to-edit / long-press-to-delete via
  additive delete/update paths, plus a "see all". Any new write MUST inherit the
  existing read-only-lapse (`tier !== pro`) and calm-mode/ED suppression guards and
  add no cadence framing; hence a founder decision on scope.

### NAV-3 - Diary has no calendar / date-jump; only single-day chevrons for the whole history
- **Severity:** major | **Founder decision:** NO
- **Evidence:** `DiaryScreen.js:582-584` `gotoYesterday`/`gotoTomorrow` shift by one
  day; the pager row (`:971-1012`) offers only chevrons + a "Today" pill; the only
  multi-day tool is `openCopyPicker` limited to `getRecentLoggedDays(...,14)`
  (`:947`). No date picker anywhere.
- **Why it fails the elite bar:** the diary is the most date-centric surface yet has
  weaker date navigation than Workout History (which has a full month calendar). To
  correct food from three weeks ago a user taps the back chevron about 21 times;
  there is no jump-to-date, and "copy a previous day" only reaches 14 days back. The
  forward chevron is also unbounded into empty future days.
- **Fix direction:** add a tappable date/calendar affordance on the day-pager row (a
  month calendar sheet or date picker), optionally marking days with logged food;
  reuse the WorkoutHistory calendar pattern for consistency.
- **Cross-cut:** same screen as BUG-1 (day-load race) and ED-2 (calorie-banking
  fail-open). Three separate defects on DiaryScreen; sequence the agents so they do
  not collide on the file (see section 12).

### NAV-4 - Progress Photos: pose filter only, no date sort/filter/jump and no before-after order
- **Severity:** major | **Founder decision:** NO (viewing affordances only; the
  calm-mode/ED suppression on compare/share must stay untouched)
- **Evidence:** `ProgressPhotosScreen.js:42-47` POSES chips are the only filter;
  filtered memo (`:277-280`) always sorts `b.takenAt - a.takenAt` (newest-first,
  hardcoded); `buildTimeline` groups by month with no month jump, date range or
  oldest-first toggle.
- **Why it fails the elite bar:** the exact class the founder already called out.
  With a year of photos the only way to an old shot is to scroll the whole timeline;
  there is no jump-to-month, no date filter, and no oldest-first order (the natural
  way to read a before/after). Pose is filterable but time, the primary axis of a
  progress gallery, is not.
- **Fix direction:** add a date axis control (newest/oldest toggle plus a month
  jumper). Keep these free of cadence/streak framing and leave the calm-mode/ED
  suppression on compare/share untouched.
- **Cross-cut:** same screen as CP-1 (privacy disclaimer leads) and VC-1 (filter
  chip amber).

### NAV-5 - Cardio History has no filter, sort, search or date-jump and caps at 200
- **Severity:** major | **Founder decision:** NO
- **Evidence:** `CardioHistoryScreen.js:126` `getRecentCardioLog(userId, 200)`; a
  fixed reverse-chronological day-grouped list (`:131-207`); the only per-row
  affordance is delete (`:200-202`). No filter chips, activity/intensity filter,
  search or date-jump, unlike WorkoutHistory.
- **Why it fails the elite bar:** a Pro user who does a lot of cardio gets an
  ever-growing flat scroll with no way to narrow by activity, intensity or date, and
  anything past 200 sessions is silently unreachable. Beside Workout History it
  reads as a second-class history screen.
- **Fix direction:** add at least an activity/intensity filter and a date-jump (or
  the same month-calendar toggle as Workout History), and paginate beyond 200; keep
  the inline delete.

### NAV-6 - Workout History Upper/Lower/Full filters silently match nothing and the empty state misreads as data loss
- **Severity:** major | **Founder decision:** NO
- **Evidence:** `WorkoutHistoryScreen.js:30-36` FILTERS + `:246-267` match on
  name/exercise substrings "upper"/"lower"/"full"; ListEmptyComponent (`:660-680`)
  always shows "Your sessions will appear here" regardless of the active filter.
- **Why it fails the elite bar:** users who name sessions Push/Pull/Legs, Day 1/2/3,
  or by plan name tap "Upper", get zero results, and see copy that reads as if their
  history vanished. A filter that silently returns nothing for the most common naming
  schemes, with a misleading empty state, is worse than no filter.
- **Fix direction:** either derive body-region filters from exercise muscle groups
  (not name substrings) so they work, or drop the region chips for a reliable control
  (search / date). When a filter yields nothing, show a filter-specific empty message
  ("No sessions match this filter") distinct from the true no-data state.

### NAV-7 - My Meals cannot be created, viewed, or edited from its own screen
- **Severity:** major | **Founder decision:** NO
- **Evidence:** `MyMealsScreen.js` header has no create action (`:183`); create only
  happens via Diary multi-select "Save as meal"; the row long-press menu offers only
  Rename/Delete (`:109-143`), never "view contents" or "edit items"; no search box.
  Contrast `MyRecipesScreen.js:177-182, 156-165` (header "+" and pencil edit).
- **Why it fails the elite bar:** a saved meal is opaque and immutable - you cannot
  see which foods are in it, cannot add/remove an item, and there is no on-screen way
  to create one. This is inconsistent with the sibling My Recipes on the same tab,
  and at scale there is no search.
- **Fix direction:** add a header "+" routing into a meal builder (mirror My
  Recipes), let a row expand/tap to show its foods and edit items, and add a search
  box; align create/edit affordances with My Recipes.

### NAV-8 - Inconsistent placement of the primary action across list/log screens
- **Severity:** minor | **Founder decision:** NO
- **Evidence:** add/create lives in the header on some screens
  (`FoodSearchScreen.js:890-907`, `ProgressPhotosScreen.js:395-399`,
  `MyRecipesScreen.js:177-182`), in a secondary pager row on Diary
  (`DiaryScreen.js:993-1008`), and nowhere on others (My Meals has no create; Cardio
  History only inline delete). Body Metrics logs via a full-width button mid-scroll
  (`BodyMetricsScreen.js:993-1004`).
- **Why it fails the elite bar:** a user learns "add is top-right" on one screen then
  cannot find it on the next because the same class of action is in the header, a
  sub-row, mid-page, or absent, making the app feel assembled from separate parts.
- **Fix direction:** pick one convention for the primary create/add action on list
  screens (header right-slot is most common here) and apply it uniformly; where it
  genuinely cannot live in the header, keep placement consistent across peer screens.

### NAV-9 - No way to edit a past workout's logged sets from history
- **Severity:** minor | **Founder decision:** NO
- **Evidence:** `WorkoutHistoryScreen.js` offers View Details (read-only summary,
  `:404` `readOnly:true`), Repeat (`:105-146`) and Delete (`:153-185`) but no edit;
  expanded exercise rows only deep-link to ExerciseDetail (`:372`).
- **Why it fails the elite bar:** in-session set editing is a shipped flagship, so a
  user who spots a wrong weight a day later expects to fix it and finds only
  view/repeat/delete; their only recourse is to delete and re-log the whole session,
  losing the timestamp.
- **Fix direction:** allow opening a past session's summary in an editable mode
  (reuse the in-session set editor), or at minimum a per-exercise correct-a-set path.

---

## 6. D4 - Copy clarity and self-explanation (CP)

**Finder's honest summary.** Copy clarity is one of VOLYUME's strongest
dimensions, not a weak one. Systematic checks came back essentially clean: no em
dashes in user-facing copy, no US spellings leaking to strings, no
shame/urgency/clipped-command voice, and no raw engine tokens (e1RM, tonnage,
adherence, MEV/MRV) rendered as JSX on the workout/analytics surfaces. The app
carries a deliberate jargon-translation layer: a single authored GLOSSARY surfaced
via InfoTooltip, a Pro "Show the science" toggle, "Set it for me", "How was this
calculated?" expanders, and "Why these numbers for you?" cards. Every
SettingsCoaching toggle carries an on/off explainer. The Progress-photos empty
state the founder originally flagged has been rebuilt with a proper guide. The
remaining copy gaps are genuinely minor/polish, not blockers: a persistent
privacy-disclaimer still leading the populated Progress-photos screen, the word
"adherence" surfacing as a header, one un-glossed "Refeed day" card, a ">" math
symbol used as prose, and the low-contrast discoverability of the (i) tooltip that
the whole jargon layer depends on. Severity was not manufactured; this dimension is
close to the elite bar already.

### CP-1 - Progress-photos still leads every visit with a privacy disclaimer, not the content or a guide
- **Severity:** minor | **Founder decision:** NO
- **Evidence:** `ProgressPhotosScreen.js:404-421` (the `infoCard` renders
  unconditionally, above the pose filter row and the photo grid).
- **Why it fails the elite bar:** the residue of the exact pattern the founder
  flagged. The empty state is now well handled, but for a returning Pro user with
  dozens of photos the first copy on every visit is a legal-style reassurance
  ("Private to this device. We never upload or sync your photos") rather than their
  photos or how to use the screen.
- **Fix direction:** collapse the privacy note to a single tappable line (or fold it
  into the existing "How it works" sheet) once photos exist, so a returning user
  leads with their timeline; keep the full reassurance only in the empty/first-use
  state.
- **Cross-cut:** same screen as NAV-4 and VC-1.

### CP-2 - "Adherence" (coach/engine vocabulary) surfaces as a user-facing header without a plain gloss
- **Severity:** minor | **Founder decision:** NO
- **Evidence:** `FoodInsightsScreen.js:471` (section header "MACRO ADHERENCE"); also
  `NutritionEducationScreen.js:138` ("5. Adherence beats perfection").
- **Why it fails the elite bar:** "adherence" is internal coaching terminology (the
  engine's own field name). On FoodInsights it is a bare uppercase header with no
  tooltip and no plain equivalent at the point of use, so a new user must infer it;
  it leaks in at least two places, in an app that otherwise works hard to avoid this.
- **Fix direction:** rename the FoodInsights header to plain language ("Days on
  target" or "How often you hit each target"); keep "adherence" only where the
  education screen introduces and defines it.

### CP-3 - "Refeed day" coach card renders with no gloss, breaking the app's own jargon-tooltip standard
- **Severity:** polish | **Founder decision:** NO
- **Evidence:** `CoachOutputScreen.js:675` (SectionHeader "Refeed day") and `:685`
  ("Refeed target"); a `GLOSSARY.refeed` gloss already exists
  (`coachGlossary.js:19`) but is not wired here.
- **Why it fails the elite bar:** "refeed" is niche physique jargon; every other
  coach surface glosses its terms via InfoTooltip and a definition is already
  authored, yet this card exposes it with only mechanics and no plain definition.
- **Fix direction:** add `InfoTooltip text={GLOSSARY.refeed}` beside the "Refeed
  day" SectionHeader, matching the other coach cards. Pure copy/wiring; no engine or
  scheduling behaviour changes.

### CP-4 - ">" math operator used as prose shorthand on the plain-language teaching screen
- **Severity:** polish | **Founder decision:** NO
- **Evidence:** `NutritionEducationScreen.js:44` renders "Trend over weeks >
  perfection on any day."
- **Why it fails the elite bar:** on a screen whose whole job is to teach beginners
  in plain English, the greater-than symbol reads as informal notation rather than a
  sentence, inconsistent with the calm plain-prose voice, and it is the only instance
  app-wide so it stands out.
- **Fix direction:** spell it out, e.g. "A steady trend over weeks matters more than
  a perfect single day."

### CP-5 - The jargon-explanation layer hangs on a low-contrast (i) glyph many users will never tap
- **Severity:** minor | **Founder decision:** NO
- **Evidence:** `InfoTooltip.js:19` (icon `information-circle-outline` in
  `colors.textMuted` at 13-14px); it is the sole disclosure for load-bearing terms
  such as "Relative strength" (`LiftProgressScreen.js:224-228`), "Recomposition"
  (`BodyMetricsScreen.js:1261`), volume bands and freshness
  (`VolumeHeatmapScreen.js:351,368`).
- **Why it fails the elite bar:** the app's entire strategy for keeping jargon out of
  the main copy is progressive disclosure behind a faint muted-grey glyph; a term the
  user cannot decode without a discovery they may never make is effectively
  unexplained.
- **Fix direction:** for the highest-value first-encounter terms, raise the glyph's
  contrast (`textSecondary` not `textMuted`) or show a one-line inline caption on
  first view; keep the tooltip for depth. No engine change.
- **Cross-cut:** overlaps AX (the same faint glyph is a small-target a11y concern),
  but captured here as the copy/discoverability owner.

---

## 7. D5 - Correctness, crashes and bugs, non-engine (BUG)

**Finder's honest summary.** A heavily-audited codebase, and it shows: the pure
logic modules (units, dayKey, food/macros, chartGeometry, food/calorieBank,
plateMath, streak, contestCountdown, sync/conflict, sync/watermark) each handle
empty/flat/NaN/single-point inputs explicitly, and the food rollup is recomputed on
every mutation so it never desyncs. No unguarded crash on empty data and no silent
data-corruption path in the core write flows. The real defects are two async
stale-result races on the most-used nutrition surfaces (the diary day-load and the
live food search) that have NO in-flight/cancellation guard, so an out-of-order
resolution transiently paints the wrong day's calories or the wrong query's
results, plus a cluster of minor date/age-precision bugs (year-only age
subtraction, UTC parsing of local day-keys) that skew a displayed number by a day
or a year at boundaries. None touch the engine or an ED-safety gate; all fixes are
ordinary UI/date hygiene. Honest bottom line: for the elite bar the two races are
the ones worth fixing - a discerning user CAN see yesterday's calories briefly
under today's date.

### BUG-1 - DiaryScreen day-load has no in-flight guard - rapid date navigation can paint the wrong day's calories/entries
- **Severity:** major | **Founder decision:** NO
- **Evidence:** `DiaryScreen.js:127-183` (`load = useCallback`, no cancelled/reqId
  token) and its two triggers at `:388` `useFocusEffect(load)` + `:389`
  `useEffect(load)`.
- **Why it fails the elite bar:** `load()` fires a `Promise.all` of about 10 reads
  keyed to the `selectedDate` in its closure, then unconditionally sets
  entries/rollup/water/targets with no cancellation or request id. Tapping between
  dates (or a date change landing while a focus-triggered load is in flight) puts two
  loads for different dates in flight and whichever resolves last wins, so a slower
  earlier-date read overwrites the newer view - the user briefly sees the wrong day's
  food list and calorie/macro totals on a paying nutrition surface. The duplicate
  load trigger doubles concurrency and makes the interleave easier to hit.
- **Fix direction:** capture the target date (or a monotonic request id) at the top
  of `load()` and, before every setState, bail if it no longer matches the current
  `selectedDate`/latest id; collapse the redundant `:388`/`:389` double-trigger into
  one effect.
- **Cross-cut:** same screen as NAV-3 and ED-2.

### BUG-2 - FoodSearch live-search resolves out of order - a slow earlier query can overwrite a newer query's results
- **Severity:** minor | **Founder decision:** NO
- **Evidence:** `FoodSearchScreen.js:298-318` (debounced effect; the timer body
  awaits `searchFoods` then `setResults(rows)` with no request-token guard; cleanup
  only clears the timeout, not the in-flight fetch).
- **Why it fails the elite bar:** the 250ms debounce only cancels a pending timer;
  once it fires, the network waterfall has variable latency, so a later query can
  fire while an earlier one is still in flight and the earlier (slower) call resolves
  afterwards, painting results for a query the box no longer holds.
- **Fix direction:** guard the async body with a request token (or the trimmed query
  captured at fire time): after `await`, only `setResults` if the captured query
  still equals the current query/latest id. Same pattern as BUG-1.

### BUG-3 - Age prefilled for the TDEE recalculator is year-only subtraction (off by up to a year) and parses DOB as UTC
- **Severity:** minor | **Founder decision:** NO
- **Evidence:** `NutritionTargetsScreen.js:300`
  `const ageNum = new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear();`
- **Why it fails the elite bar:** age is computed by subtracting birth year from
  current year, ignoring month/day, so anyone whose birthday has not occurred yet
  this year is prefilled one year too old, and that age feeds the manual BMR/TDEE
  recompute this Pro screen writes as the user's targets; additionally `new
  Date('YYYY-MM-DD')` parses the stored DOB as UTC midnight, which the project's own
  `dayKey.js` warns against (`parseLocalDay` exists for this). A user-editable
  prefill, but the seeded number is wrong at the boundary and can carry through.
- **Fix direction:** compute age properly from DOB (parse with `parseLocalDay`, then
  subtract years and decrement if month/day has not been reached this year); reuse a
  single shared `ageFromDob` helper so onboarding and this screen agree.

### BUG-4 - BodyMetrics trend/phase parse stored day-keys with new Date(metric_date) (UTC) - points can shift a day at TZ/DST edges
- **Severity:** minor | **Founder decision:** NO
- **Evidence:** `BodyMetricsScreen.js:138`
  `const weightDateOf = (e) => new Date(e.metric_date).getTime();` and `detectPhase`
  sorting/plotting off the same `metric_date` strings (`:114-120`).
- **Why it fails the elite bar:** `metric_date` is a local `YYYY-MM-DD` day-key but
  `new Date(str)` interprets it as UTC midnight; `parseLocalDay()` exists precisely
  to avoid this. For a user west of UTC or at a DST edge the chart x-position and the
  windowed slice can attribute a weigh-in to the adjacent calendar day, mis-aligning
  the trend line. Display-only (does not corrupt stored data or the engine), benign
  for UK/BST users, but an inconsistency with the app's own dayKey rules on a
  body-weight surface.
- **Fix direction:** use `parseLocalDay(e.metric_date)` instead of `new
  Date(e.metric_date)` everywhere a stored day-key becomes a Date on this screen.

### BUG-5 - Onboarding stores DOB via toISOString() so BST/eastern users get a date one day early
- **Severity:** polish | **Founder decision:** NO
- **Evidence:** `ProOnboardingScreen.js:726`
  `dateOfBirth: ageNum ? new Date(new Date().getFullYear() - ageNum, 6, 1).toISOString().slice(0,10) : null`
- **Why it fails the elite bar:** `new Date(year,6,1)` builds local July-1 midnight,
  then `.toISOString()` converts to UTC before slicing; under BST that is
  `2026-06-30T23:00Z`, so the stored key becomes `...-06-30`, one day earlier than
  intended. Harmless to the derived age but a latent local-vs-UTC slip in a stored
  date, and it means the DOB will not round-trip cleanly.
- **Fix direction:** build the day-key from the local Date's
  `getFullYear/getMonth/getDate` (or reuse `localDayKey`) rather than
  `toISOString().slice(0,10)`.

---

## 8. D6 - Accessibility (AX)

**Finder's honest summary.** The core of the app clears a genuinely high
accessibility bar and, in the highest-traffic flows, is close to elite. Log-a-set
(SetEntry, RestTimer, ActiveWorkout) labels every stepper/field, uses 52px targets
and hitSlop, and announces set logs via `AccessibilityInfo`. Log-a-food is strongly
labelled, with a polite live region on the diary totals and a custom action for
swipe-to-delete. Colour-only signalling is deliberately avoided, `allowFontScaling`
is never disabled anywhere, and the canonical primitives all carry correct
role/state/label. That said, the app is NOT uniformly elite: two secondary-but-core
controls are fully unlabelled icon buttons (the exercise-picker close/back and the
barcode-scanner exit); the app-wide confirmation dialog (AppAlert) has no focus
management and an unlabelled full-screen backdrop that traps first focus; a long
tail of about 40 raw touchables carry a label but no role so TalkBack never
announces them as actionable; and a few hand-rolled disclosures/sheets skip the
expanded/modal semantics the canonical components get right. None touch the engine
or ED-safety; all are pure UI a11y fixes.

### AX-1 - Exercise picker: unlabelled close/back icon buttons and roleless exercise rows in the add-exercise (log-a-set) path
- **Severity:** major | **Founder decision:** NO
- **Evidence:** `ExercisePickerModal.js:119` (back arrow), `:127` and `:190`
  (close X), `:250` (exercise list rows).
- **Why it fails the elite bar:** this modal adds an exercise mid-workout and while
  building/editing a plan. The back arrow and both close X buttons have neither role
  nor label, so TalkBack lands on an unnamed control and announces nothing; the
  result rows have no role, so a row reads as flat text with no cue that tapping
  selects it. It sits inside the very log-a-set flow the TalkBack pass was supposed
  to harden.
- **Fix direction:** add `accessibilityRole='button'` + labels ("Back", "Close
  exercise picker") to the three icon buttons; give each row
  `accessibilityRole='button'` and a combined label ("Add {name}, {muscle}").

### AX-2 - Barcode scanner exit (X) is a fully unlabelled icon button
- **Severity:** major | **Founder decision:** NO
- **Evidence:** `ScanBarcodeScreen.js:204` (TouchableOpacity wrapping a close glyph,
  no role, no label); the torch toggle beside it IS fully labelled with role +
  state.
- **Why it fails the elite bar:** the only in-screen way out of the barcode scanner
  (a Pro food-logging surface) has no announced control; a TalkBack user has no way
  to leave it except the OS back gesture.
- **Fix direction:** add `accessibilityRole='button'` and
  `accessibilityLabel='Close'`, matching the labelled torch button on the same row.
- **Cross-cut:** same screen as ST-2 (silent scan failure).

### AX-3 - App-wide confirmation dialogs (AppAlert) have no focus management and an unlabelled full-screen backdrop
- **Severity:** major | **Founder decision:** NO
- **Evidence:** `AppAlert.js:82-84` (backdrop TouchableOpacity + inner card, no
  label/role/`accessible=false`); contrast `DiaryScreen.js:1362` (labelled "Close"
  backdrop + inner `accessible={false}`).
- **Why it fails the elite bar:** AppAlert is the shared dialog behind every
  high-stakes confirmation (delete workout, unpair partner, cancel subscription,
  discard changes). Its scrim is an unlabelled TouchableOpacity, so it becomes the
  first focusable element TalkBack lands on, reads as an empty control, and a
  double-tap silently dismisses the dialog (firing cancel) with no spoken warning;
  the dialog is never auto-focused and the title has no header role. The worst
  experience at the moments that matter most, and DiaryScreen already solves exactly
  this.
- **Fix direction:** give the backdrop `accessibilityRole='button'` +
  `accessibilityLabel='Close'` (or `accessibilityElementsHidden`); mark the card
  `accessible` and move initial focus to it
  (`setAccessibilityFocus`/`accessibilityViewIsModal`); give the title
  `accessibilityRole='header'`. Apply the same to the hand-rolled plate modal in
  `FoodSearchScreen.js:1015` (bare View backdrop, no dismiss/label).
- **Cross-cut:** the FoodSearch plate modal chrome also appears in VC-7 (hand-rolled
  sheet divergence).

### AX-4 - Long tail (about 40) of raw touchables carry a label but no accessibilityRole, so TalkBack never announces them as actionable
- **Severity:** major | **Founder decision:** NO
- **Evidence:** `HomeScreen.js:1350`, `:1985`, `:2326` (banner/nudge dismissals);
  `PlansScreen.js:970` ("Training Blocks" nav row); `ProOnboardingScreen.js:1147`,
  `:1637` (Continue CTAs); plus about 30 more found by static scan (about 51 raw
  touchables missing a role in total).
- **Why it fails the elite bar:** many have a label so the text is read, but without
  `role='button'` TalkBack does not announce them as actionable or offer
  "double-tap to activate", so the user cannot tell a dismissible banner, a nav row
  or the onboarding Continue button apart from static text. The a11y lint rule
  (`has-valid-accessibility-role`) only validates roles that are present, so a
  missing role never trips CI - the backlog is invisible.
- **Fix direction:** sweep raw touchables to add `accessibilityRole='button'` (or
  link/tab as appropriate), prioritising the banner dismissals, Plans nav rows and
  the mandatory onboarding Continue CTAs (which should also expose
  `accessibilityState.disabled` while a required field is unset); consider a
  source-level regression guard since the lint rule cannot catch a missing role.

### AX-5 - "How was this calculated?" disclosure on Nutrition Targets skips expand/collapse semantics
- **Severity:** minor | **Founder decision:** NO
- **Evidence:** `NutritionTargetsScreen.js:1340` (hand-rolled `expandHeader`: no
  role, no `accessibilityState.expanded`) vs canonical
  `CollapsibleSection.js:16-18` which sets both.
- **Why it fails the elite bar:** a Pro user auditing how their targets were derived
  taps a chevron disclosure that TalkBack announces as static text with no role and
  no collapsed/expanded state; a correct CollapsibleSection exists and is even used
  elsewhere in the same file. The same missing-expanded pattern appears in
  WorkoutHistory, ManualBuilder, PhotoDetailsSheet and EngineLog.
- **Fix direction:** replace the hand-rolled expander with CollapsibleSection, or add
  `accessibilityRole='button'` + `accessibilityState={{ expanded }}`; audit the other
  disclosures for the same fix.

### AX-6 - One-tap-log Undo toast auto-dismisses in about 8s with no extended window for screen-reader users
- **Severity:** minor | **Founder decision:** NO
- **Evidence:** `Toast.js:174-208` (fixed-duration toast, `role='alert'`); undo
  toasts raised from `FoodSearchScreen.js:388` (`quickLogRelog`) and the diary/set
  delete paths.
- **Why it fails the elite bar:** one-tap re-log and set/food delete rely on the Undo
  toast as the only safety net; it is announced and the Undo button is reachable, but
  it auto-dismisses on a fixed timer, so a TalkBack user must hear the alert, swipe to
  Undo and double-tap before it vanishes - a tighter window than sighted users
  effectively get. If missed, the only recourse is manual deletion.
- **Fix direction:** when `AccessibilityInfo.isScreenReaderEnabled()`, extend or
  disable the auto-dismiss for undo-variant toasts (require an explicit dismiss),
  and/or expose Undo as an `accessibilityAction` on the just-created row.

### AX-7 - Recovery gauges and readiness chips fragment into multiple swipe stops with a silent colour dot
- **Severity:** polish | **Founder decision:** NO
- **Evidence:** `ReadinessCards.js:272-279` (RecoveryGauge: separate dot View + value
  + label + scaleNote), `:228-234` (muscle-freshness chips).
- **Why it fails the elite bar:** each gauge reads as three separate stops ("3.2",
  "Soreness", "Elevated") and the colour dot is silent; meaning is preserved (the
  scaleNote carries the state, so this is NOT a colour-only failure) but the
  experience is verbose and fragmented versus a single grouped announcement, repeated
  across three gauges plus every muscle chip.
- **Fix direction:** wrap each gauge/chip in `accessible={true}` with a single label
  ("Soreness, 3.2 out of 5, elevated") and mark the decorative dot
  `importantForAccessibility='no'`.

### AX-8 - Toast body dismiss region has no role or hint
- **Severity:** polish | **Founder decision:** NO
- **Evidence:** `Toast.js:184` (message-row TouchableOpacity that dismisses on tap,
  no role/label/hint).
- **Why it fails the elite bar:** the whole toast row is tappable to dismiss but has
  no `role='button'` and no hint; low impact because the alert is announced and Undo
  is labelled, but the dismiss affordance is invisible to assistive tech and the
  decorative variant icon is unlabelled.
- **Fix direction:** add `accessibilityRole='button'` + a "Dismiss" hint to the
  message row; keep the variant icon `importantForAccessibility='no'`.

---

## 9. D8 - ED-safety, privacy and trust seams (ED)

**Finder's honest summary.** The reader-side safety posture is genuinely strong:
the new high-risk progress-photo surfaces (viewer weight line, compare, before/after
share) all route through `usePhotoSuppression`, which fails CLOSED; the
partner-moments reader, coach report, weekly streak, differential banner, contest
countdown and five swept screens all read the ED-pattern flag and wellbeing key
fail-closed (`.catch(() => 'read_failed')`), pinned by guard tests. Share cards and
exports carry no banned PII; the Sentry scrubber is thorough; telemetry is
feature-keys-only; progress-photo metadata is device-local and never synced; and
the Article 9 consent gate fails closed for new users. The real seam is a CONSISTENT
RESIDUE of the same fail-open pattern the GO-sweep (task #121) and its guard test
only partially covered: several ED-pattern-flag reads on weight/food/notification/
share surfaces still use `.catch(() => null)` (or `catch -> return false`), which
reads a transient local-SQLite read error as "no flag" and shows the
numeric/weight/food/share layer the flag is designed to withhold. Each is
individually low-probability (needs a transient read failure) but every one
contradicts the codebase's own stated fail-closed doctrine, and their fail-closed
siblings prove the intended direction. Plus one consent-accuracy gap: the Article 9
screen states health data is in "encrypted local storage" unconditionally while a
coded plaintext DB fallback exists and its status is never surfaced. Every fix below
strengthens safety and is a one-line direction change; because they touch ED-safety
wiring they are founder-decision items.

> **Constitution note.** CLAUDE.md marks the ED-safety system inviolable and
> instructs STOP-and-ask before any change to `nutritionEngine.js`,
> `edPatternDetector.js`, `wellbeing.js`, `weeklyCoach.js`, `coachApply.js`, and the
> "weight/food/notification suppression under an open ED flag" rule. Every item
> below only STRENGTHENS suppression (flips a fail-open read to fail-closed) and adds
> no engine behaviour, but each still requires an explicit founder answer before an
> agent touches it.

### ED-1 - Weight/food notification suppression fails OPEN on a flag-read error (both schedule and delivery) - the named harm pattern
- **Severity:** major | **Founder decision:** YES
- **Evidence:** `notifications/handler.js:126-135` (`_edFlagOpen`: catch -> return
  false); `notifications/scheduler.js:184-196` (`weighInEdFlagOpen`: catch -> return
  false, gating the evening weigh-in at `:220`); `scheduler.js:982-983`
  (planned-meal food push: `getOpenEdPatternFlag(uid).catch(() => null)`); also
  `:565, :653, :890, :1368`.
- **Why it fails the elite bar (and the constitution):** the ED flag is supposed to
  silence weight/food pushes, and the code itself calls such a push "the harm
  pattern" (`handler.js:30-33`, `scheduler.js:978`), but every ED read in the
  notification layer returns false/null on a read error, i.e. NOT suppressed. On a
  transient DB read failure the morning/evening "log your weight" prompt (schedule
  gate `scheduler.js:220` AND delivery gate `handler.js:34`) and the planned-meal
  food push fire at a user with an open ED flag - the exact behaviour the inviolable
  rule forbids. The UI surfaces were swept fail-closed; the notification layer was
  not.
- **Fix direction:** make the flag-read failure suppress: in `_edFlagOpen` /
  `weighInEdFlagOpen` return true on catch (treat a read error as "assume flag
  open"), and change the per-notification `.catch(() => null)` guards on weight/food
  pushes to a suppressing sentinel so `if (edFlag) cancel/return` also triggers on
  read failure. Add a guard test mirroring `wellbeingFailClosed.guard.test`.
  Strengthens suppression only.

### ED-2 - Diary calorie-banking re-enables itself on a flag-read error (food carve-out fails open)
- **Severity:** major | **Founder decision:** YES
- **Evidence:** `DiaryScreen.js:136`
  `getOpenEdPatternFlag(userId).catch(() => null)` -> `setEdFlagOpen(!!edFlag)`;
  consumed at `:300-301` (`bankingAvailable`) and `:319-323` (persisted bank
  display); the carve-out comment at `:114` and `:295-299`.
- **Why it fails the elite bar:** an open ED flag is a safety carve-out that DISABLES
  calorie banking and blocks a persisted bank from displaying. Because the read fails
  open, a transient local-DB error sets `edFlagOpen=false`, so `bankingAvailable`
  becomes true and the "Plan a higher-calorie day" control plus any stale banked
  delta re-appear for a flagged user, reactivating a food-manipulation feature the
  safety system deliberately withholds. The sibling reads on NutritionTargets and
  BodyMetrics were swept fail-closed; this food surface was missed.
- **Fix direction:** change to `.catch(() => 'read_failed')` (truthy) and treat the
  sentinel as flag-open so `edFlagOpen` becomes true on a read error, keeping banking
  disabled. Matches the swept-screen pattern.
- **Cross-cut:** same screen as BUG-1 and NAV-3.

### ED-3 - "Your trend" weight card shows rate + maintenance numbers on a flag-read error
- **Severity:** major | **Founder decision:** YES
- **Evidence:** `useWeightTrend.js:37`
  `getOpenEdPatternFlag(userId).catch(() => null)` -> `edFlagOpen: !!edFlag` passed
  to `deriveWeightTrend` (`:64-69`); carve-out comment at `:57-59`.
- **Why it fails the elite bar:** `deriveWeightTrend` is built to suppress the weekly
  weight-change rate, the adaptive-maintenance estimate and the step-trend line under
  an open ED flag. The `.catch(() => null)` makes only that read fail open
  (`getMorningWeights` has no catch, so it alone would trigger the safe EMPTY state;
  the flag read does not), so a transient DB error renders the full numeric
  weight-trend card to a flagged user. Its weight-surface siblings (YearOfLifts,
  BodyMetrics) were hardened; this hook was not in the swept set.
- **Fix direction:** read the flag `.catch(() => 'read_failed')` and pass
  `edFlagOpen = !!edFlag || edFlag === 'read_failed'`. One-line, suppress-only.

### ED-4 - Weekly "Share your week" card can carry the real weight number on a flag-read error
- **Severity:** major | **Founder decision:** YES
- **Evidence:** `CoachOutputScreen.js:1572-1573`
  `const openFlag = await getOpenEdPatternFlag(user.id).catch(() => null); const edPatternOpen = !!openFlag;`
  feeding the share navigation at `:2004-2008` `suppress: edPatternOpen || calmMode`.
- **Why it fails the elite bar:** the recap builder drops the weight-lost hero and all
  progress language only when `suppress` is true; `suppress = edPatternOpen ||
  calmMode`, and `calmMode` here is read fail-closed (`:1451`) but the primary
  `edPatternOpen` (`:1572`) is read fail-open. On a transient failure
  `edPatternOpen=false`, so a flagged user whose current coach week is otherwise
  clean is offered a shareable card naming the actual kg lost and "right on target"
  copy. The SAME file reads the contest-countdown flag fail-closed at `:1075`, so the
  inconsistency is internal.
- **Fix direction:** change `:1572` to `.catch(() => 'read_failed')` and set
  `edPatternOpen = !!openFlag || openFlag === 'read_failed'`, matching the file's own
  contest-countdown read. Suppress-only.

### ED-5 - Article 9 consent screen states "encrypted local storage" unconditionally while a plaintext DB fallback exists and is never surfaced
- **Severity:** major | **Founder decision:** YES (GDPR/consent representation)
- **Evidence:** `Article9ConsentScreen.js:204` ("On your phone, in encrypted local
  storage"); `dbCrypto.js:13,55,256-260` (coded plaintext fallback);
  `database.js:16-19` `isLocalDbEncrypted()` exported "Read by privacy/consent
  surfaces" but no screen consumes it (only the definition + the `plaintextFallback`
  logWarn use it).
- **Why it fails the elite bar:** the Article 9 screen is the legal consent
  representation for special-category health data, and it asserts as fact that the
  data lives in encrypted local storage. `dbCrypto.js` has a real, deliberate
  fallback to an unencrypted SQLite handle when the SQLCipher key cannot be persisted
  or migration fails; the team anticipated this (database.js F-002 comment: "must not
  be silent - the consent screen tells users their data is in encrypted local
  storage") and exported `isLocalDbEncrypted()` for consent surfaces, but nothing in
  the UI reads it. So in the fallback state the consent copy is false and the user is
  never told - a trust and GDPR-accuracy seam. Probability is low (fallback only on
  SQLCipher failure) but the statement is load-bearing for consent.
- **Fix direction (founder decision):** either (a) wire `isLocalDbEncrypted()` into
  the Article 9 "Where it lives" bullet / Settings so the plaintext-fallback state is
  disclosed, or (b) soften the copy to a conditional ("in encrypted local storage
  where your device supports it") and surface a warning banner when unencrypted. Do
  NOT weaken the encryption itself.

### ED-6 - Home trial-value banner + coach ledger leak weigh-in counts on a flag-read error
- **Severity:** minor | **Founder decision:** YES
- **Evidence:** `HomeScreen.js:409`
  `getOpenEdPatternFlag(user.id).catch(() => null)` feeding `trialBannerLine`
  (`:428`) and `buildCoachLedger` (`:435`) with `edFlagOpen: !!edFlag`.
- **Why it fails the elite bar:** under an open ED flag the trial banner and the
  "what your coach is reading" ledger are meant to show a neutral variant with NO
  weigh-in counts; this read fails open, so a transient error surfaces the
  weigh-in-count copy to a flagged user. The same screen's differential banner
  (`:738-741`) and activation nudge (`:795-798`) read the flag fail-closed with
  `.catch(() => 'read_failed')`, so this is an internal inconsistency in one file.
- **Fix direction:** change `:409` to `.catch(() => 'read_failed')` and pass
  `edFlagOpen = !!edFlag || edFlag === 'read_failed'`, matching `:738`/`:795`.

### ED-7 - Partner week-signal WRITER can push a flagged user's live ticks/PB moment on a flag-read error, while the reader side fails closed
- **Severity:** minor | **Founder decision:** YES
- **Evidence:** `partners/weekSignalWriter.js:73`
  `getOpenEdPatternFlag(userId).catch(() => null)` -> `edSuppressed = !!edFlag ||
  scoff>=2` (`:85`); contrast the reader `partners/moments.js:93` which uses
  `.catch(() => 'read_failed')`.
- **Why it fails the elite bar:** the module header promises the safety system "never
  leaks into the pair surface" by freezing the outbound signal to "resting" (and
  forcing completedBlock/hitPb false) under an open flag. On a transient flag-read
  failure with SCOFF < 2, `edSuppressed=false`, so the user's live planned/done state
  AND a "completed a block"/"set a PB" milestone moment are pushed to the partner
  despite the open flag - a celebratory moment escaping the wellbeing hold,
  cross-user. The reader fails closed, so the two halves of the same safety promise
  disagree.
- **Fix direction:** read the flag `.catch(() => 'read_failed')` and OR the sentinel
  into `edSuppressed`, mirroring `moments.js`.

### ED-8 - Home/lock-screen widget consistency snapshot not suppressed on a flag-read error
- **Severity:** minor | **Founder decision:** YES
- **Evidence:** `widgets/writer.js:72`
  `getOpenEdPatternFlag(userId).catch(() => null)` -> `edFlagOpen: !!edFlag` in the
  persisted widget snapshot.
- **Why it fails the elite bar:** the widget snapshot carries an `edFlagOpen` bit the
  layout uses to neutralise its consistency surface; a transient read error writes
  `edFlagOpen=false` into the persisted snapshot, so the widget renders its normal
  consistency state for a flagged user until the next successful write. Lower stakes
  than the weight/food cases (the widget carries session counts + plan name, never
  body data) but the same fail-open pattern on a surface meant to reflect the flag,
  and it persists across launches.
- **Fix direction:** change to `.catch(() => 'read_failed')` and set `edFlagOpen`
  truthy on the sentinel, so a read error writes the suppressed snapshot.

---

## 10. D7 - Tests

The eighth finder ("test") returned an empty findings array and a placeholder
summary. No test-dimension defects were reported. Recorded here for completeness so
the register accounts for all eight inputs; the ED-safety items (ED-1..ED-4, ED-6,
ED-7, ED-8) each call for a new fail-closed guard test as part of their fix, which is
the main test-coverage debt surfaced by this audit.

---

## 11. Cross-cutting overlaps and deduplication

No two findings are the same defect, so nothing was merged away. What the audit
surfaces instead is a set of screens and root causes hit from several dimensions at
once. These are the compounding hotspots, and they matter for scheduling (two agents
must not edit one file at the same time):

- **Progress Photos screen** - hit three ways: VC-1 (filter chip amber drift),
  NAV-4 (no date sort/jump/before-after), CP-1 (privacy disclaimer leads every
  visit). All presentation/navigation/copy, none ED. A single agent should own this
  screen and land all three together.
- **Diary screen** - hit three ways: BUG-1 (day-load race), NAV-3 (no date-jump),
  ED-2 (calorie-banking fail-open). ED-2 is a founder-gated one-liner; BUG-1 and
  NAV-3 are safe. Because all three touch `DiaryScreen.js`, they MUST be sequenced on
  one worktree, not parallelised.
- **Barcode scan screen** - hit two ways: ST-2 (silent failure, no feedback) and
  AX-2 (unlabelled exit). Both safe, same file, one agent.
- **FoodSearch plate modal** - hit two ways: VC-7 (hand-rolled sheet chrome) and
  AX-3 (no a11y semantics on the same modal). One agent should reconcile both.
- **Empty-state / not-enough-data copy** - ST-6 is deliberately logged once as a
  combined state+copy item; the D4 copy finder did not separately flag the phrasing
  sprawl, so there is no duplicate to merge, but the fix touches both a component
  (EmptyState adoption) and a copy helper (threshold vocabulary).
- **InfoTooltip glyph** - CP-5 (discoverability/contrast) is the copy owner; it also
  has an accessibility flavour (small faint target), but no AX finding duplicates it,
  so it stays a single item under CP.
- **Loading dialects** - ST-7 catalogues the pattern; the specific spinners it names
  in Volume Heatmap (ST-4) and Partners (ST-1) are logged as their own screen-level
  defects. Fix ST-1/ST-4 first (they carry error/empty gaps too), then ST-7 mops up
  the remaining dialects.
- **BodyMetrics screen** - NAV-2 (no edit/delete, founder-gated) and BUG-4 (UTC
  day-key parse, safe) both touch `BodyMetricsScreen.js`. Sequence on one worktree.

---

## 12. Prioritised execution plan

Two tracks. Track A is safe-to-build work needing no founder decision, grouped into
batches that touch disjoint files so build agents can run in parallel
worktree-isolated. Track B is the small set of founder decisions that must be
answered before the gated items build. Per the agent-tier rule, dispatch these as
Sonnet for well-specified mechanical batches and Opus for the design-judgement ones
(VC token roles); nothing here is Fable-only.

### Track A - Safe batches (no founder decision)

Ordering within Track A is worst-user-impact first. Batches are file-disjoint unless
a note says otherwise.

**Batch A1 - Trust/data-reachability functional fixes (highest impact, mostly
independent files).** Run these first; they are the ones a paying user actually hits.
- ST-1 Partners error branch + per-pair try/catch (`usePartners.js`,
  `PartnerScreen.js`).
- NAV-1 Full History pagination + full-set count/calendar (`WorkoutHistoryScreen.js`
  - also owns NAV-6 and NAV-9 below; keep on one worktree).
- NAV-6 Region filters that work + filter-specific empty (`WorkoutHistoryScreen.js`).
- NAV-9 Editable past-session sets (`WorkoutHistoryScreen.js`).
- ST-2 Barcode error toast + offline detection (`ScanBarcodeScreen.js` - also owns
  AX-2; one worktree).
- ST-3 Consistency loading + first-run empty (`ConsistencyScreen.js`).
- ST-4 Volume heatmap skeleton + error + zero-data empty
  (`VolumeHeatmapScreen.js`).
- NAV-7 My Meals create/view/edit + search (`MyMealsScreen.js`, new meal-builder
  route).
- NAV-5 Cardio History filter/sort/date-jump + pagination
  (`CardioHistoryScreen.js`).

**Batch A2 - Diary screen (single worktree, sequenced).** BUG-1 then NAV-3, both on
`DiaryScreen.js`. Do NOT parallelise with the ED-2 fix on the same file; ED-2 lands
after founder sign-off, rebased on top.
- BUG-1 day-load in-flight guard + collapse double trigger.
- NAV-3 calendar/date-jump affordance.

**Batch A3 - Progress Photos (single worktree).** VC-1 (this screen's filter chip),
NAV-4 (date axis), CP-1 (collapse privacy note). One agent, all three.

**Batch A4 - Other correctness/date hygiene (independent files).**
- BUG-2 FoodSearch request-token guard (`FoodSearchScreen.js` - also owns the AX
  plate-modal work in A6; sequence).
- BUG-3 shared `ageFromDob` helper + use on `NutritionTargetsScreen.js`.
- BUG-4 `parseLocalDay` on `BodyMetricsScreen.js` (also owns nothing else in A;
  independent).
- BUG-5 local day-key for DOB at onboarding (`ProOnboardingScreen.js`).

**Batch A5 - State polish (independent files).**
- ST-5 Food Insights loading flag + skeletons (`FoodInsightsScreen.js`).
- ST-7 standardise loading onto Skeleton (`SnapshotsScreen.js`,
  `MealPlanScreen.js`, `MyRecipesScreen.js`, `LiftProgressScreen.js`, plus the
  Partner/Heatmap spinners after A1 lands them).
- ST-8 `setLoading(false)` on null-user return (`useProgressData.js`).
- ST-6 EmptyState adoption + not-enough-data copy helper (cross-screen; run after A1
  so it does not collide with the empty states A1 adds - schedule last in the state
  track).

**Batch A6 - Accessibility sweep (mostly independent; two shared-file notes).**
- AX-1 exercise picker labels/roles (`ExercisePickerModal.js`).
- AX-2 barcode exit label (`ScanBarcodeScreen.js` - land with ST-2 in A1's
  worktree).
- AX-3 AppAlert focus/backdrop/header (`AppAlert.js`) + FoodSearch plate modal
  (`FoodSearchScreen.js` - sequence with BUG-2 and VC-7).
- AX-4 roleless-touchable sweep + optional source-level regression guard
  (many files: `HomeScreen.js`, `PlansScreen.js`, `ProOnboardingScreen.js`, about 30
  more). Large surface; split by file group so it does not block other batches.
- AX-5 CollapsibleSection / expanded-state on hand-rolled disclosures
  (`NutritionTargetsScreen.js`, `WorkoutHistoryScreen.js`, `ManualBuilderScreen.js`,
  `PhotoDetailsSheet`, `EngineLog` - sequence WorkoutHistory with A1).
- AX-6 screen-reader-aware undo toast (`Toast.js` - also owns AX-8; one worktree).
- AX-7 grouped recovery-gauge labels (`ReadinessCards.js`).
- AX-8 toast dismiss role/hint (`Toast.js` - land with AX-6).

**Batch A7 - Copy polish (independent files).**
- CP-2 rename "MACRO ADHERENCE" header (`FoodInsightsScreen.js` - sequence with
  ST-5).
- CP-3 wire `GLOSSARY.refeed` tooltip (`CoachOutputScreen.js` - note ED-4 also
  touches this file; sequence after ED-4 lands or on a shared worktree).
- CP-4 spell out ">" (`NutritionEducationScreen.js`).
- CP-5 raise InfoTooltip contrast / first-view caption (`InfoTooltip.js`).

**Batch A8 - Visual-system migration (design judgement; Opus). Largest surface,
lowest user-harm, but the founder's core "one-app" complaint.** Introduce the two
missing type roles first, then migrate.
- VC-2 add `type.overline` role + migrate about a dozen section-label sites.
- VC-5 add `type.stat` role (or Stat component) + migrate stat tiles.
- VC-3 migrate hand-rolled CTAs onto Button (many screens; split by file group).
- VC-4 canonical Input component + migrate form screens.
- VC-6 divider token sweep to `borderSubtle` + Divider component.
- VC-7 migrate remaining hand-rolled sheets onto BottomSheet (sequence FoodSearch
  plate modal with AX-3/BUG-2).
- VC-8 standardise screen gutter + card radius; move PressableCard-direct screens
  onto Card.
- VC-9 fix 1px hairline weight; sweep stray 1.5/2 values.
- (VC-1 selected-state migration is safe and lives in A3 for Progress Photos and here
  for the shared SegmentedControl/Chip route; the specific amber is the one founder
  micro-decision noted in Track B.)

### Track B - Founder decisions (must be answered before the gated items build)

1. **ED fail-closed sweep (covers ED-1, ED-2, ED-3, ED-4, ED-6, ED-7, ED-8).** One
   pattern, seven sites: flip each fail-open `.catch(() => null)` / `catch -> return
   false` on an ED-flag read to a suppressing sentinel so a transient read error
   assumes the flag is OPEN and withholds the weight/food/notification/share/partner/
   widget layer. Every change strengthens suppression and adds a fail-closed guard
   test. Because it touches ED-safety wiring the constitution requires explicit
   founder sign-off. Decision: approve the sweep as one batch, or triage a subset. No
   lighter option is being recommended; the finders judge all seven worth doing.
2. **ED-5 Article 9 consent copy accuracy.** Choose (a) wire `isLocalDbEncrypted()`
   into the consent bullet / Settings so the plaintext-fallback state is disclosed,
   or (b) soften the copy to a conditional plus a warning banner when unencrypted.
   Either way the encryption itself is not weakened. This is a GDPR/consent
   representation call, hence founder-owned.
3. **NAV-2 Body Metrics edit/delete scope.** Approve additive edit/update/delete
   paths on logged weigh-ins that inherit the screen's existing read-only-lapse
   (`tier !== pro`) and calm-mode/ED suppression guards and add no cadence framing.
   The fork is scope (edit-only vs edit+delete+see-all) and the ED-adjacency of a new
   weight write, so it is founder-owned before build.
4. **VC-1 selected-state grammar and amber hue.** The migration onto one primitive is
   safe (Track A8/A3), but two design choices are the founder's: which
   selected-state grammar is canonical (solid-fill-with-onPrimary-ink is the finder's
   strongest read, but not recommended over the alternative here) and which amber the
   selected fill uses (bright `#F5A623` vs deep `#E08C0B`). Answer these two and the
   migration proceeds.

---

## 13. Appendix - full worst-first ranking

All 52 items, ordered by user harm and trust impact within severity (ED-safety and
data-loss/misrepresentation ranked above pure presentation). "FD" marks a
founder-decision item.

1. ED-1 (major, FD) - weight/food notification suppression fails open
2. ED-2 (major, FD) - diary calorie-banking re-enables on flag-read error
3. ED-3 (major, FD) - weight-trend card shows numbers on flag-read error
4. ED-4 (major, FD) - weekly share card can carry real weight on flag-read error
5. ST-1 (major) - Partners load failure shown as the new-user pitch
6. ED-5 (major, FD) - Article 9 "encrypted local storage" while plaintext fallback exists
7. NAV-1 (major) - "Full History" silently capped at 50, no pagination/search
8. NAV-2 (major, FD) - Body Metrics cannot edit/delete a mis-logged weigh-in
9. BUG-1 (major) - Diary day-load race paints the wrong day's calories
10. ST-2 (major) - barcode scan fails silently, no feedback
11. NAV-6 (major) - Workout History filters match nothing, empty reads as data loss
12. AX-3 (major) - AppAlert no focus management, unlabelled backdrop dismisses
13. NAV-7 (major) - My Meals cannot be created/viewed/edited
14. NAV-3 (major) - Diary has no calendar/date-jump
15. NAV-4 (major) - Progress Photos has no date sort/jump/before-after order
16. NAV-5 (major) - Cardio History has no filter/sort/search, caps at 200
17. VC-1 (major, FD design) - selected pill in three colour languages and two ambers
18. ST-3 (major) - Consistency tab has no loading/first-run state
19. ST-4 (major) - Volume heatmap bare spinner, no error/zero-data state
20. VC-2 (major) - section labels in about six treatments, no overline role
21. VC-3 (major) - dozens of hand-rolled CTAs, radius drifts md vs lg
22. VC-4 (major) - inputs use four background tokens, no canonical Input
23. AX-1 (major) - exercise picker unlabelled close/back and roleless rows
24. AX-2 (major) - barcode scanner exit is an unlabelled icon button
25. AX-4 (major) - about 40 roleless touchables, invisible to CI
26. ED-6 (minor, FD) - Home trial banner/ledger leak weigh-in counts on flag-read error
27. ED-7 (minor, FD) - partner week-signal writer pushes flagged user's ticks/PB
28. ED-8 (minor, FD) - widget consistency snapshot not suppressed on flag-read error
29. ST-5 (minor) - Food Insights conflates loading with not-enough-data
30. ST-6 (minor) - fragmented empty states, about ten "not enough data" phrasings
31. ST-7 (minor) - inconsistent loading dialects
32. BUG-2 (minor) - FoodSearch results resolve out of order
33. BUG-3 (minor) - year-only age prefill, UTC DOB parse
34. BUG-4 (minor) - BodyMetrics parses day-keys as UTC
35. NAV-8 (minor) - inconsistent primary-action placement across list screens
36. CP-1 (minor) - Progress Photos leads every visit with a privacy disclaimer
37. CP-2 (minor) - "adherence" surfaces as a header without a gloss
38. CP-5 (minor) - jargon layer hangs on a low-contrast (i) glyph
39. AX-5 (minor) - "How was this calculated?" disclosure skips expand/collapse semantics
40. AX-6 (minor) - undo toast auto-dismisses too fast for screen-reader users
41. VC-5 (minor) - stat tiles vary in size/weight, half ignore tabular figures
42. VC-6 (minor) - internal dividers use the heavy control-edge token
43. VC-7 (minor) - hand-rolled bottom sheets diverge from canonical chrome
44. CP-3 (polish) - "Refeed day" card renders with no gloss
45. CP-4 (polish) - ">" used as prose on the teaching screen
46. BUG-5 (polish) - onboarding stores DOB via toISOString (one day early under BST)
47. ST-8 (polish) - latent forever-spinner if user.id momentarily null
48. AX-7 (polish) - recovery gauges fragment into multiple swipe stops
49. AX-8 (polish) - toast body dismiss region has no role/hint
50. VC-8 (polish) - screen gutter and card radius split between two values
51. VC-9 (polish) - border width drifts between 1, 1.5 and 2px
52. (D7 tests) - no findings returned; the ED fixes each add a fail-closed guard test

---

*End of register. Nothing was parked, softened, or deferred. The four founder
decisions in Track B are surfaced for an explicit answer before their items build,
per the no-silent-corner-cutting rule; everything in Track A is safe to schedule
now.*
