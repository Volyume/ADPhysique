# Visual Design Consistency Audit — 2026-07-09

Status: **read-only audit, no source changed.** Scope: `src/screens/` (82 screen
files) and `src/components/` (shared primitives + domain subfolders), swept
against `src/styles/theme.js`, `docs/rules/styling.md` and
`docs/DESIGN_SYSTEM.md`.

## 0. Method and what this audit does NOT re-report

Standards read in full before sweeping: `src/styles/theme.js`,
`docs/rules/styling.md`, `docs/DESIGN_SYSTEM.md`,
`docs/volyume-elite-audit/APP-CONSISTENCY-SPEC-2026-07-04.md` (header/scaffold
enforcement spec), `docs/hevy-teardown-2026-06-29/D3-design-consistency.md`
(primitive-adoption audit) and a scan of
`docs/volyume-elite-audit/WHOLE-APP-FAILURE-REGISTER-2026-07-04.md`.

**Important finding before any new issue: the app has moved substantially
since those two source audits, and most of their headline items are now
fixed.** This audit verified each claim against current code rather than
trusting the docs' 2026-06-29/07-04 counts. Concretely, since D3
(2026-06-29) and the consistency spec (2026-07-04):

| Metric (source) | Then | Now (verified 2026-07-09) |
|---|---|---|
| Screens importing `BackHeader`/`ScreenHeader` (D3 G5) | 19 | **60** (55 BackHeader + 5 ScreenHeader), plus 8 more on the newer `ModalHeader` |
| Screens importing `Card` (D3 G1) | 13/79 | **38/82** |
| Screens importing `Button` (D3 G2) | 19/79 | **47/82** |
| Screens importing `EmptyState` (D3 G4) | 1 | **20** |
| Hand-rolled `backgroundColor: colors.surface` card blocks (D3 G1) | 187 in 52 screens | **155 in 43 screens** |
| Raw hex/rgba/fontSize/fontWeight literals in screens/components | 151 hex (D3 G8), 66 raw fontSize (D3 G5) | **~0** — an ESLint `no-restricted-syntax` bank (`eslint.config.js:195-291`) now bans hex, `rgba()`, hex-alpha concat, raw `fontSize`, raw `fontWeight` in screens/components, and `npm run lint` is clean |
| Native React Navigation headers (APP-CONSISTENCY-SPEC's "4 header regimes") | ~24 pushed screens on the native stack header | **0** — every `Stack.Screen` registration in `RootNavigator.js` now sets `headerShown:false` explicitly or inherits it from the enclosing navigator's `screenOptions` |
| Settings-family batch (spec §2.3, 14 screens gated on a founder GO) | not started | **done** — `SettingsPrimitives.js`'s `SettingsPage` now takes a `title` prop that renders `BackHeader`; every Settings screen passes one |
| Onboarding chevron drift (22px/`textSecondary` vs 24px/`textPrimary`, spec §1.3) | present | **fixed** — Quiz, ProOnboarding, FreeStarter, WeeklyCheckIn all now `chevron-back` size 24 / `colors.textPrimary` |
| `ImportScreen`/`NutritionTargetsScreen` duplicate title (native + in-body) | present | **fixed** — both single-header now |
| `WorkoutSummaryScreen` dual-role duplicate header (spec §4.5) | open decision | **resolved**: `headerShown:false` always, `BackHeader` only when `readOnly`, in-body celebration title otherwise |
| `ProUpgradeScreen`/`AddCustomFoodScreen`/`CascadeGate`/`Paywall`/`LogCardio`/`ScanBarcode`/`ScanLabel`/`GoalChangeSummary` modal header | divergent hand-rolled variants | **unified** on a new shared `src/components/ModalHeader.js` (not yet documented in styling.md — see B-12) |
| `CascadeGate`/`Paywall` divider token (`colors.tabBarBorder`) | flagged | **fixed** — no more `tabBarBorder` references in either file |
| `ProgressPhotosScreen` persistent privacy Card (spec §3.9, founder-flagged) | present on every visit | **removed/redesigned** — no "Private to this device" card left in the file |

None of the items in the table above are re-reported below except where a
residual, narrower issue remains (called out explicitly). Everything below is
either genuinely new or a documented-but-still-open item from the prior
audits, re-verified against current line numbers.

---

## 1. Severity A — visibly inconsistent to a user

### A-1. Card corner radius: two competing radii on the app's single most common surface
`src/components/Card.js:47` — the shared `Card` primitive defaults
`radius: radiusKey = 'md'` (**10px**, `radius.md`), not `radius.lg`
(**16px**) as `docs/DESIGN_SYSTEM.md:178` and `docs/rules/styling.md:75`
both document as "the card radius". Of the 129 `<Card` usages in
`src/screens/`, only 16 pass an explicit `radius` prop (13 `"md"`, 3
`"xl"|"xl"`); the other **113 render at 10px** by default. Meanwhile the 155
surviving hand-rolled `colors.surface` card blocks overwhelmingly use
`radius.lg` (16px) directly, e.g. `src/screens/PlansScreen.js:1107`
(`backgroundColor: colors.surface, borderRadius: radius.lg`),
`src/screens/HomeScreen.js:2583,2720,2857,2962` (`borderRadius: radius.lg`).
**`PlansScreen.js` alone mixes both**: bare `<Card>` at lines 518, 591, 699,
749, 774, 860, 914, 947, 976 (10px) sitting beside the hand-rolled
`radius.lg` card at line 1107 (16px) on the same screen. This is the
single most visible "why do these two cards look slightly different"
regression in the app and it is silent — no lint catches a wrong `radius`
key. Fix direction: change `Card`'s default to `'lg'` (matching the
documented standard) and audit the 16 explicit overrides for intent, or
formally re-decide the card radius token and update both docs and the 155
hand-rolled sites to match.

### A-2. Amber "glow" shadows outside the one sanctioned glow surface
`theme.js:11-23` states the Materials Policy explicitly: *"ONE surface in
the app may carry a Skia glow (the Home Start button, E15 element 3); no
other glow, gradient orb or bloom is permitted."* Three screens carry a
colour-tinted `shadowColor: colors.primary` glow on a card/circle, each with
different opacity/radius/offset (i.e. drifting from each other as well as
from the policy):
- `src/screens/WelcomeScreen.js:214-218` — `proCard`:
  `shadowColor: colors.primary, shadowOpacity: 0.18, shadowRadius: 16,
  shadowOffset: {0,4}, elevation: 8`.
- `src/screens/ProOnboardingScreen.js:2120-2121` — `offerCard`:
  `shadowColor: colors.primary, shadowOpacity: 0.15, shadowRadius: 12,
  shadowOffset: {0,4}, elevation: 8`.
- `src/screens/ProUpgradeScreen.js:581-582` — `successCircle`:
  `shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 20,
  shadowOffset: {0,6}, elevation: 12`.

All three also bypass the `shadow.sm/md/lg` tokens (`theme.js:532-554`),
which is exactly what `docs/DESIGN_SYSTEM.md:180-181` warns against
("no inline `'#000'` shadow blocks" — here it's a coloured block, which the
Materials Policy singles out as the more serious violation since colour
implies a second glow surface). Founder decision needed: are these three
sanctioned as a second "Pro moment" glow family, or should they collapse to
the flat `shadow.*` tokens like every other card?

### A-3. First-content-load screens still using a bare spinner, not `Skeleton`
`docs/rules/styling.md:97-120` (dated 2026-07-08, one day before this audit)
states the rule in terms that name this exact failure mode: *"A screen's
first load of its main content is a Skeleton case, full stop, even if today
it happens to render a bare `ActivityIndicator`... that is drift."* Two
screens still violate it on their primary (not sub-action) load path:
- `src/screens/PartnerScreen.js:971-979` — the `p.loading` branch (the
  screen's only content before any Partner data exists) renders
  `<BackHeader title="Partners" />` then a bare
  `<ActivityIndicator size="large" color={colors.primary} />` in
  `styles.loadingWrap`. This is a known content shape (a list of
  partner/phase cards) and belongs on `SkeletonCard`/`SkeletonRow`.
- `src/screens/MealPlanScreen.js:618-620` — `{loading ? <View
  style={styles.centre}><ActivityIndicator color={colors.primary}
  accessibilityLabel="Loading meal plan" /></View> : ...}` — the screen's
  first paint of the meal plan, same fix.

All other `ActivityIndicator` uses found in the sweep (`FoodSearchScreen.js:922`,
`ImportScreen.js:190,262`, `ShareCardScreen.js:416`,
`ProOnboardingScreen.js:1022,1627`, `MyRecipesScreen.js:161`,
`ScanBarcodeScreen.js:170,254`, `ScanLabelScreen.js:235,345`,
`PartnerScreen.js:1133,1269,1429,1445,1608`) are genuine indeterminate
sub-actions (a row mid-save, an OAuth button mid-submit, a camera warming
up, a file import running) and correctly use `ActivityIndicator` per the
rule — these are NOT findings.

### A-4. Two hand-rolled food/recipe modal headers not on the new `ModalHeader`
The app now has a real shared `src/components/ModalHeader.js`, adopted by 8
screens (`AddCustomFoodScreen`, `PaywallScreen`, `CascadeGateScreen`,
`ScanBarcodeScreen`, `ProUpgradeScreen`, `GoalChangeSummaryScreen`,
`LogCardioScreen`, `ScanLabelScreen`) — this resolves most of
APP-CONSISTENCY-SPEC §4.2/§4.5. Two of the five originally-named
"needs-decision" food modals were not converted and still hand-roll their
own close-X header, each slightly differently built:
- `src/screens/FoodSearchScreen.js:932-948` — own `styles.header` /
  `styles.headerSide` (two `width:48` spacer views either side of the title
  block) with close icon at line 942 (`Ionicons "close"` size 24,
  `colors.textPrimary`) — visually matches `ModalHeader`'s spec but is a
  second, independent implementation (`styles.header` block at line 1134).
- `src/screens/RecipeBuilderScreen.js:291-306` — a plain `flexDirection:'row'`
  with close icon (line 294, same 24/`textPrimary`) on the left and a
  `Button` "Save" on the right; because the two end elements are different
  widths, **the title is not guaranteed optically centred** the way
  `ModalHeader` centres it — a real, visible divergence from its siblings
  (`AddCustomFoodScreen` etc.) whenever the "Save" button's rendered width
  differs from the close icon's hit area.

Fix direction: convert both to `ModalHeader`, wrapping RecipeBuilder's Save
button as the header's `right` slot the way the spec anticipated.

### A-5. Systemic raw `letterSpacing` literals contradicting the documented "neutral tracking" decision
`theme.js:425-433` states the design law plainly: *"Letter-spacing stays
neutral on Android. Negative tracking and loose micro-copy made the default
system font look blocky on real devices"* — and every named
`letterSpacing.*` token (`display`, `heading`, `body`, `label`, `caption`)
is `0`. Despite that, **87 raw numeric `letterSpacing:` literals survive
across 49 files** (not lint-enforced — the `no-restricted-syntax` bank bans
`fontSize`/`fontWeight` literals but not `letterSpacing`). 47 of the 87 are
harmlessly `letterSpacing: 0` (still a token bypass, but value-identical to
the token). The other **40 are non-zero and actively contradict the "stays
neutral" rule**, producing inconsistent tracking on what is visually the
same role (uppercase eyebrow/section labels) from screen to screen:

| Value | Count | Example sites |
|---|---|---|
| 0.3 | 12 | `WeeklyCheckInScreen.js:1910,1915`, `LoginScreen.js:129`, `ManualBuilderScreen.js:1275,1497`, `BillingPeriodSelector.js:80` |
| 0.5 | 10 | `CoachOutputScreen.js:2889,2966`, `PlanUpdateScreen.js:443`, `ImportScreen.js:425`, `CoachHeldHistoryScreen.js:295`, `GoalLockConsentScreen.js:176`, `Toast.js:286`, `DifferentialBadge.js:108` |
| 1 | 6 | `MesocycleBuilderScreen.js:459,473`, `ImportScreen.js:382`, `CardioHistoryScreen.js:233`, `PlanPreviewScreen.js:53`, `SettingsAboutScreen.js:115` |
| 0.2 | 5 | `CoachingRemindersScreen.js:466`, `WeeklyStoryScreen.js:171`, `CoachHeldHistoryScreen.js:295` region, `PlansScreen.js:1316` |
| 0.4 | 4 | `MicronutrientPanel.js:180`, `CoachOutputScreen.js:2530,2657`, `Toast.js:286` region |
| 2 | 2 | `SettingsAboutScreen.js:103` (`appName`), `PRCelebration.js:331` |
| 0.6 | 2 | `RestTimer.js:494`, `CoachOutputScreen.js:2607` |

Section labels are the visible casualty: e.g. `CardioHistoryScreen.js:233`
(`letterSpacing:1, textTransform:'uppercase'`) versus
`RecipeBuilderScreen.js:529` (`macrosTitle`, `letterSpacing:0,
textTransform:'uppercase'`) versus `WeightTrendCard.js:133`
(`letterSpacing:0.5, textTransform:'uppercase'`) — three uppercase labels,
three different tracking values, no visual reason for the difference. Fix
direction: since the token table is intentionally all-zero, either (a)
delete all non-zero literals as drift, or (b) if some tracking is
genuinely wanted on uppercase labels, add it as a real token
(`letterSpacing.overline` or similar) and route every uppercase-label site
through one value — not 7 different ad-hoc numbers.

---

## 2. Severity B — token bypass, visually similar but still drift

### B-1. `<Card>` primitive adoption still partial: 155 hand-rolled `colors.surface` blocks remain in 43 screens
Down from D3's 187/52 but still the largest single component-pattern gap.
Heaviest remaining offenders (hand-rolled block count):
`NutritionTargetsScreen.js` (12), `ActiveWorkoutScreen.js` (12),
`WorkoutSummaryScreen.js` (10), `ExerciseDetailScreen.js` (10),
`ProOnboardingScreen.js` (8), `DiaryScreen.js` (8), `PlansScreen.js` (7),
`PartnerScreen.js` (7), `MealPlanScreen.js` (6), `HomeScreen.js` (6). Note
`ActiveWorkoutScreen.js` and `WorkoutSummaryScreen.js` import zero `Card`
usages at all (0 in the `card_import` sweep) — every card-like surface on
those two screens is still hand-rolled.

### B-2. `<Button>` primitive still bypassed by ~840 raw touchables (`TouchableOpacity`/`Pressable`) across the screen layer
Heaviest: `ActiveWorkoutScreen.js` (52 `<TouchableOpacity`/`<Pressable`),
`HomeScreen.js` (32), `DiaryScreen.js` (31), `PlansScreen.js` (22),
`WeeklyCheckInScreen.js` (19), `PartnerScreen.js` (19),
`NutritionTargetsScreen.js` (15), `FoodSearchScreen.js` (14),
`ProgressPhotosScreen.js` (13), `MealPlanScreen.js` (13),
`CoachOutputScreen.js` (13). Not every one of these is a CTA (many are list
rows), but every hand-rolled *primary/secondary/destructive action* among
them is a press-feel and visual regression versus `Button`'s one press
model. Improved from D3's "1001 across 62 screens" but the shape of the
problem (a handful of dense screens carrying most of the debt) is
unchanged.

### B-3. Off-scale `borderRadius` literals (not `radius.*` tokens): 27 sites across 18 files
Screens (16 sites):
`MesocycleBuilderScreen.js:484` (`4`), `:509` (`3`);
`SubscriptionPolicyScreen.js:185` (`2.5`);
`VolumeHeatmapScreen.js:795` (`1`);
`FoodSearchScreen.js:1181` (`1`);
`FoodInsightsScreen.js:656` (`4`), `:661` (`4`);
`ProOnboardingScreen.js:1840` (`4`), `:2093` (`14`), `:2127` (`4`);
`NotificationSettingsScreen.js:886` (`9`);
`MyRecipesScreen.js:291` (`999`, should be `radius.full`), `:308` (`20`,
should be `radius.xl`);
`HomeScreen.js:2993` (`24`);
`ManualBuilderScreen.js:1248` (`0`, likely intentional square corner — low
priority);
`ProSetupCompleteScreen.js:470` (`4`).

Components (11 sites): `ProgressSections.js:124` (`2`), `:335` (`2`),
`:352` (`3`); `BlockProgressCard.js:92,98` (`3`); `Stepper.js:119` (`0`,
likely intentional); `food/FoodRow.js:122` (`999`, should be `radius.full`);
`ProGate.js:424` (`4`); `BodyDiagramHeatmap.js:410` (`2`);
`ProgressScanTrend.js:177` (`7`); `SettingsPrimitives.js:93` (`9`).

Several small values (1-4px on chart dots/progress bars) are legitimate
per-theme.js's `radius.xs`/`radius.hair` micro-UI carve-out and just need
the token swapped in; the `999`/`20`/`24`/`14` values on `MyRecipesScreen`,
`HomeScreen` and `ProOnboardingScreen` are the more visible ones (badge
pills and a hero circle not matching `radius.full`/`circle()`).

### B-4. Off-scale `padding*`/`margin*` literals: 10 clearly off-scale sites (of 69 raw padding/margin literals swept)
`LiftProgressScreen.js:500` (`paddingVertical: 3`);
`ProOnboardingScreen.js:1841` (`paddingHorizontal: 7`), `:2094`
(`paddingHorizontal: 3`), `:2127` (`paddingVertical: 3`);
`HomeScreen.js:2542` (`paddingVertical: 14`), `:3001` (`marginBottom: 3`);
`ProgressPhotosScreen.js:2146` (`padding: 3`), `:2426` (`marginTop: 7`);
`ProSetupCompleteScreen.js:470` (`paddingHorizontal: 7`);
`PlansScreen.js:1165` (`paddingVertical: 3`). None of these round to a
`spacing.*` step (`1·2·4·6·8·12·16·24·32·48`); `docs/rules/styling.md:74`
names exactly this pattern ("Off-scale literals (3, 5, 10, 14…) are
drift").

### B-5. Uppercase section-label treatment still fragmented — APP-CONSISTENCY-SPEC §3.2 item not yet actioned
25 inline `textTransform: 'uppercase'` sites remain across 17 screens
(`AthleteProfileScreen`, `CoachReviewScreen`, `CoachOutputScreen`,
`PlanUpdateScreen`, `WeeklyStoryScreen`, `RecipeBuilderScreen`,
`ImportScreen`, `CardioHistoryScreen`, `ExerciseDetailScreen`, `HomeScreen`,
`DiaryScreen`, `ProSetupCompleteScreen`, `DebugLogScreen`, `PartnerScreen`,
`MealPlanScreen`, `YouScreen`, `GoalLockConsentScreen`), each paired with
its own hand-picked `fontSize`/`fontWeight`/`letterSpacing` combination (see
A-5) rather than one shared `type.label`/`SectionHeader` role. This is the
same finding D3 G5 and the consistency spec §3.2 already named as a ranked
follow-up ("collapse all to one role") — it is still open, re-verified with
current line numbers because the prior docs only had counts, not sites.

### B-6. Remaining bespoke empty-state UI, `EmptyState` not adopted
`EmptyState` adoption is now 20 screens (up from D3's 1) but 6 screens still
hand-roll their own "no data" block instead of adopting it:
`WorkoutHistoryScreen.js`, `MesocycleBuilderScreen.js`,
`FoodSearchScreen.js`, `YearOfLiftsScreen.js`, `ProgressPhotosScreen.js`,
`ActiveWorkoutScreen.js`.

### B-7. `WellbeingCheckScreen`/`CoachOutputScreen`/`CoachReviewScreen` header conversions landed — confirm chrome-only, out of audit scope
These three carried ED-safety-adjacent content per the consistency spec's
scope note. This audit confirms only chrome moved (all three now use
`BackHeader` with the ED-safety content blocks untouched) — noted here for
completeness, not a finding; per CLAUDE.md this area is otherwise
hands-off.

### B-8. `FoodInsightsScreen.js` has an off-scale `borderRadius: 2` at two adherence-bar sites (line 656, 661) sitting beside its own `BackHeader` conversion
Minor, but worth bundling with B-3 since it's the same screen, same commit
opportunity.

### B-9. `ScanBarcodeScreen` title string still inconsistent between states
The old spec (§1.3) flagged "Scan" vs "Scan barcode" title-string
inconsistency between the live camera header and its fallback states; this
was not part of the header-*component* migration and was not verified as
fixed — `ScanBarcodeScreen.js` is now on `ModalHeader` (component-consistent)
but the two title strings were not independently re-checked for wording
convergence in this pass. Flag for a follow-up text check, not a structural
finding.

### B-10. `ActiveWorkoutScreen.js` and `WorkoutSummaryScreen.js` carry the largest hand-rolled-surface debt of any screens (see B-1) while also being two of the highest-traffic screens in the app (every logged set, every finished session)
Calling this out separately from B-1 because of user-facing weight: these
two screens are seen on essentially every gym session, so their card/button
drift is proportionally more visible than the same drift on a
rarely-opened settings sub-page.

### B-11. `RecipeBuilderScreen.js` does not import `EmptyState` for its `loadError` branch
`RecipeBuilderScreen.js:311-315` — the `loadError` return **does** import
and use `EmptyState` (confirmed present), but the screen's header (A-4)
does not match its siblings; noted together for one fix pass.

### B-12. `ModalHeader.js` is a real, working shared component but is undocumented in `docs/rules/styling.md` and `docs/DESIGN_SYSTEM.md`
Both documents list the canonical primitives as "`Button`, `Card`, `Chip`,
`EmptyState`, `BottomSheet`, `SettingsPrimitives`, `Toast`,
`AnimatedEntrance`, `Skeleton`" (`docs/rules/styling.md:124-129`) and never
mention `BackHeader`, `ScreenHeader` or `ModalHeader` at all, despite all
three being the actual canonical header system per the 2026-07-04 spec.
This is a documentation gap, not a code defect, but per D3's own G7 finding
("a contributor following the doc will hardcode wrong ... a *source* of
future inconsistency") it will cause exactly the kind of new drift this
audit is meant to prevent. Recommend adding the header trio and
`ModalHeader` to both docs' component lists.

---

## 3. Severity C — polish

### C-1. `WeeklyCheckInScreen.js` renders its own chevron-back five separate times (lines 1298, 1340, 1376, 1412, 1454, 1501 — one per wizard step) rather than one shared header component for the wizard shell
Each copy is token-correct (24/`textPrimary`) so there is no visible
inconsistency today, but five independent copies of the same 6-line JSX
block is a maintenance risk that will eventually drift (the classic way
these regressions start).

### C-2. `SettingsAboutScreen.js:103` `appName` style: `letterSpacing: 2` is the single widest tracking value in the app, on brand wordmark text
Not wrong in isolation (brand wordmark tracking is a legitimate design
choice per `docs/DESIGN_SYSTEM.md:327-328`) but it is a hand-rolled literal,
not a token, and is 4x the next-widest value found (`0.5`). Worth a named
`letterSpacing.wordmark` token if the value is intentional, so it cannot
silently drift.

### C-3. `PRCelebration.js:331` `letterSpacing: 2` — same pattern as C-2, different file, no shared token between the two "wide tracking" use sites
If both are deliberate "hero moment" tracking, they should share one named
token rather than two independent `2`s that could diverge later.

### C-4. Icon family and iconography: confirmed fully consistent — no finding
All icon imports across `src/screens/` and `src/components/` are
`@expo/vector-icons` `Ionicons`; no `MaterialIcons`, `FontAwesome`,
`Feather`, `AntDesign`, `Entypo`, `MaterialCommunityIcons` or
`react-native-vector-icons` imports found. Matches D3's finding and remains
true.

### C-5. No decorative gradients/orbs found outside the sanctioned chart engine
`LinearGradient` is imported in exactly one file app-wide,
`src/components/VolyumeChart.js` — consistent with the "VolyumeChart is the
app's one chart engine" decision (`theme.js:24-26`) and the Materials
Policy's gradient ban. No finding, but flagged as the positive control that
makes A-2 (the three amber glow shadows) stand out as the actual outlier.

### C-6. No decorative emoji found in UI code
Swept `src/screens/` and `src/components/` for common emoji ranges — zero
matches. Matches `docs/DESIGN_SYSTEM.md`'s "no emoji in UI copy" rule and
D3's clean bill on this point.

### C-7. `PlateCalculator.js` and `PRCelebration.js` raw-hex findings from D3 G8 are now fully tokenised
`PlateCalculator.js` has zero raw hex/rgba literals (was 13 in D3);
`PRCelebration.js:22-23` now consumes `colors.celebrationEmber` /
`colors.celebrationViolet` tokens exactly as `theme.js:115-119` documents
they were added for. `ScanLabelScreen.js`'s pure-black `'#000'` (D3 G8) is
also gone — the file now uses `colors.camera` and its one remaining
`rgba(255,255,255,0.9)` capture-ring border (line 441) carries a scoped
`eslint-disable-next-line` with a documented rationale (camera-UI
convention), so it is a sanctioned exception, not silent drift.

---

## 4. Per-screen summary table

Header column: which canonical header the screen uses (`BackHeader` /
`ScreenHeader` / `ModalHeader` / `none` = hand-rolled or justified
no-header case per the consistency spec). Card/Btn/Empty columns: whether
the screen imports the shared primitive (1) or not (0). Touch = raw
`<TouchableOpacity>`/`<Pressable>` count. Surf = hand-rolled
`colors.surface` card-block count. Rad = off-token `borderRadius:` literal
count. LS = raw `letterSpacing:` literal count.

| Screen | Header | Card | Btn | Empty | Touch | Surf | Rad | LS |
|---|---|---|---|---|---|---|---|---|
| ActiveWorkoutScreen | none (in-session control bar, justified) | 0 | 0 | 0 | 52 | 12 | 0 | 7 |
| AddCustomFoodScreen | ModalHeader | 0 | 1 | 0 | 0 | 1 | 0 | 0 |
| AnalyticsScreen | ScreenHeader (tab) | 1 | 0 | 1 | 10 | 1 | 0 | 0 |
| Article9ConsentScreen | none (compliance-locked, no back) | 0 | 0 | 0 | 5 | 3 | 0 | 0 |
| AthleteProfileScreen | BackHeader | 1 | 0 | 1 | 4 | 1 | 0 | 0 |
| BlockReflectionScreen | BackHeader | 0 | 1 | 1 | 1 | 4 | 0 | 0 |
| BodyMetricsScreen | BackHeader | 1 | 1 | 1 | 8 | 4 | 0 | 0 |
| BuildWorkoutScreen | BackHeader | 0 | 1 | 0 | 6 | 3 | 0 | 0 |
| CardioHistoryScreen | BackHeader | 0 | 0 | 1 | 1 | 0 | 0 | 1 |
| CascadeGateScreen | ModalHeader | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| CoachHeldHistoryScreen | BackHeader | 0 | 0 | 1 | 0 | 1 | 0 | 1 |
| CoachOutputScreen | BackHeader | 1 | 1 | 0 | 13 | 3 | 0 | 8 |
| CoachReviewScreen | BackHeader | 1 | 0 | 1 | 0 | 0 | 0 | 1 |
| CoachingRemindersScreen | BackHeader | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| ConsistencyScreen | BackHeader | 1 | 0 | 1 | 0 | 0 | 0 | 0 |
| CreditsScreen | BackHeader | 1 | 0 | 0 | 3 | 0 | 0 | 0 |
| DebugLogScreen | BackHeader | 0 | 0 | 0 | 5 | 3 | 0 | 0 |
| DiaryScreen | ScreenHeader (tab) | 1 | 1 | 0 | 31 | 8 | 0 | 1 |
| ExerciseDetailScreen | BackHeader | 0 | 1 | 0 | 7 | 10 | 0 | 3 |
| FirstRunScreen | none (onboarding, justified) | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| FoodInsightsScreen | BackHeader | 1 | 1 | 1 | 1 | 1 | 2 | 0 |
| FoodSearchScreen | none — see A-4 | 0 | 0 | 0 | 14 | 2 | 1 | 0 |
| FreeStarterScreen | none (onboarding, justified) | 1 | 1 | 0 | 4 | 0 | 0 | 1 |
| GoalChangeSummaryScreen | ModalHeader | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| GoalLockConsentScreen | BackHeader | 0 | 0 | 0 | 3 | 1 | 0 | 1 |
| HomeScreen | ScreenHeader (tab) | 1 | 1 | 0 | 32 | 6 | 1 | 4 |
| ImportScreen | BackHeader | 1 | 1 | 0 | 0 | 0 | 0 | 2 |
| LiftProgressScreen | BackHeader | 0 | 0 | 1 | 3 | 5 | 0 | 0 |
| LogCardioScreen | ModalHeader | 1 | 1 | 0 | 2 | 0 | 0 | 0 |
| LoginScreen | none (no back, justified) | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| ManualBuilderScreen | BackHeader | 1 | 1 | 0 | 9 | 1 | 1 | 2 |
| MealNamesScreen | BackHeader | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| MealPlanScreen | BackHeader | 1 | 1 | 1 | 13 | 6 | 0 | 3 |
| MesocycleBuilderScreen | BackHeader | 0 | 0 | 0 | 1 | 3 | 2 | 2 |
| MethodologyScreen | BackHeader | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| MyMealsScreen | BackHeader | 0 | 1 | 1 | 2 | 0 | 0 | 0 |
| MyRecipesScreen | BackHeader | 0 | 1 | 1 | 4 | 0 | 2 | 0 |
| NotificationSettingsScreen | BackHeader | 1 | 0 | 0 | 5 | 0 | 1 | 0 |
| NutritionEducationScreen | BackHeader | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| NutritionTargetsScreen | BackHeader | 0 | 0 | 0 | 15 | 12 | 0 | 3 |
| PartnerScreen | BackHeader | 1 | 1 | 1 | 19 | 7 | 0 | 0 |
| PaywallScreen | ModalHeader | 0 | 1 | 0 | 3 | 1 | 0 | 0 |
| PerDayTargetsScreen | BackHeader | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| PlanDetailScreen | BackHeader | 1 | 1 | 0 | 5 | 0 | 0 | 0 |
| PlanLibraryScreen | BackHeader | 1 | 0 | 1 | 10 | 3 | 0 | 1 |
| PlanPreviewScreen | none (pre-account reveal, justified) | 1 | 0 | 0 | 1 | 0 | 0 | 1 |
| PlanUpdateScreen | BackHeader | 0 | 1 | 0 | 0 | 0 | 0 | 1 |
| PlansScreen | ScreenHeader (tab) | 1 | 1 | 0 | 22 | 7 | 0 | 3 |
| PrivacyPolicyScreen | BackHeader | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ProGoalSetupScreen | BackHeader | 0 | 1 | 0 | 1 | 1 | 0 | 0 |
| ProOnboardingScreen | none (wizard, justified) | 0 | 1 | 0 | 7 | 8 | 3 | 5 |
| ProSetupCompleteScreen | none (final beat, justified) | 1 | 1 | 0 | 4 | 2 | 1 | 2 |
| ProUpgradeScreen | ModalHeader | 0 | 1 | 0 | 2 | 1 | 0 | 1 |
| ProgressPhotosScreen | BackHeader | 1 | 1 | 0 | 13 | 5 | 0 | 0 |
| QuizScreen | none (wizard, justified) | 0 | 0 | 0 | 2 | 0 | 0 | 0 |
| RecipeBuilderScreen | none — see A-4 | 0 | 1 | 1 | 3 | 1 | 0 | 1 |
| RoutineDetailScreen | BackHeader | 1 | 1 | 0 | 12 | 2 | 0 | 0 |
| ScanBarcodeScreen | ModalHeader | 0 | 0 | 0 | 3 | 0 | 0 | 0 |
| ScanLabelScreen | ModalHeader | 0 | 1 | 0 | 5 | 1 | 0 | 0 |
| SettingsAboutScreen | BackHeader (via SettingsPage) | 0 | 0 | 0 | 1 | 0 | 0 | 2 |
| SettingsAccountScreen | BackHeader (via SettingsPage) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| SettingsCoachingScreen | BackHeader (via SettingsPage) | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| SettingsDataScreen | BackHeader (via SettingsPage) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| SettingsDisplayScreen | BackHeader (via SettingsPage) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| SettingsHealthScreen | BackHeader (via SettingsPage) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| SettingsPrivacyScreen | BackHeader (via SettingsPage) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| SettingsProfileScreen | BackHeader (via SettingsPage) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| SettingsScreen | BackHeader (via SettingsPage) | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| ShareCardScreen | BackHeader | 0 | 1 | 0 | 2 | 4 | 0 | 0 |
| SnapshotsScreen | BackHeader (via SettingsPage) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| SubscriptionPolicyScreen | BackHeader | 0 | 0 | 0 | 0 | 1 | 1 | 0 |
| SubscriptionScreen | BackHeader | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| VolumeHeatmapScreen | BackHeader | 1 | 1 | 1 | 1 | 2 | 1 | 0 |
| WeeklyCheckInScreen | none (wizard, justified — see C-1) | 0 | 1 | 0 | 19 | 4 | 0 | 2 |
| WeeklyStoryScreen | BackHeader | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| WelcomeScreen | none (no back, justified — see A-2) | 1 | 0 | 0 | 1 | 0 | 0 | 2 |
| WellbeingCheckScreen | BackHeader | 0 | 1 | 0 | 2 | 1 | 0 | 0 |
| WorkoutHistoryScreen | BackHeader | 1 | 1 | 0 | 10 | 1 | 0 | 0 |
| WorkoutSummaryScreen | BackHeader (readOnly only, by design) | 0 | 1 | 0 | 11 | 10 | 0 | 0 |
| YearOfLiftsScreen | none (full-bleed story deck, justified) | 0 | 0 | 0 | 5 | 1 | 0 | 2 |
| YouScreen | ScreenHeader (tab) | 1 | 0 | 0 | 1 | 0 | 0 | 0 |

---

## 5. Top 10 most user-visible inconsistencies

1. **Card corner radius drift (A-1)** — `Card` primitive defaults to 10px,
   hand-rolled cards use 16px; both patterns coexist on the same screens
   (`PlansScreen.js`, `HomeScreen.js`, `DiaryScreen.js`). The single biggest
   "these two boxes don't quite match" tell in the app.
2. **Amber glow shadows on 3 screens outside the one sanctioned glow surface
   (A-2)** — `WelcomeScreen.js`, `ProOnboardingScreen.js`,
   `ProUpgradeScreen.js`, each with a different opacity/radius, directly
   contradicting the documented Materials Policy.
3. **`ActiveWorkoutScreen`/`WorkoutSummaryScreen` hand-rolled surface debt
   (B-1/B-10)** — the two screens every user sees on every gym session
   have zero `Card` adoption and the two highest hand-rolled-card counts
   (12 and 10) in the app.
4. **840 raw touchables still bypassing `Button` (B-2)**, concentrated on
   `ActiveWorkoutScreen` (52), `HomeScreen` (32), `DiaryScreen` (31) — press
   feel and CTA sizing drift on the app's busiest screens.
5. **`FoodSearchScreen`/`RecipeBuilderScreen` still hand-roll their modal
   header (A-4)** while 8 sibling modals now share `ModalHeader` —
   `RecipeBuilderScreen`'s title is not reliably centred because its two
   header end-elements are different widths.
6. **Two full-content-load screens still spin instead of skeleton
   (A-3)** — `PartnerScreen.js` and `MealPlanScreen.js`, against a rule the
   founder set the day before this audit.
7. **87 raw `letterSpacing` literals, 40 non-zero, contradicting the
   documented "tracking stays neutral" decision (A-5)** — visible as
   inconsistent tracking on uppercase section labels app-wide.
8. **25 independently-styled uppercase section labels across 17 screens
   (B-5)** — same visual role, different `fontSize`/`fontWeight`/
   `letterSpacing` combination per screen; a previously-identified
   follow-up (spec §3.2) still open.
9. **155 hand-rolled `colors.surface` card blocks across 43 screens
   (B-1)** — down from 187/52 but still the largest primitive-adoption gap;
   `NutritionTargetsScreen` (12) and `ExerciseDetailScreen` (10) are the
   worst single-screen offenders.
10. **27 off-scale `borderRadius` literals across 18 files (B-3)**,
    including two `999`-style pill radii that should be `radius.full` on
    `MyRecipesScreen.js:291` and `food/FoodRow.js:122`.

---

## 6. What is genuinely clean (verified, not assumed)

- **Zero raw hex/rgba/fontSize/fontWeight literals** in `src/screens/` and
  `src/components/` outside documented, `eslint-disable`d exceptions;
  `npm run lint` passes with `--max-warnings 0`.
- **Iconography**: `Ionicons` exclusively, no mixed icon families.
- **Emoji**: none found in UI code.
- **Gradients**: `LinearGradient` used in exactly one file
  (`VolyumeChart.js`), matching the "one chart engine, no decorative
  gradients" policy.
- **Header regime**: the app-wide native-vs-custom header split
  (APP-CONSISTENCY-SPEC's core complaint) is fully resolved — every
  `Stack.Screen` in `RootNavigator.js` renders `headerShown:false` and a
  canonical component (`BackHeader`/`ScreenHeader`/`ModalHeader`) or a
  justified custom header.
- **Onboarding chevron tokens**: unified at 24px/`textPrimary` across
  Quiz/ProOnboarding/FreeStarter/WeeklyCheckIn.
- **Known duplicate-title bugs** (`ImportScreen`, `NutritionTargetsScreen`,
  `WorkoutSummaryScreen`, `CoachReviewScreen`) are fixed.
