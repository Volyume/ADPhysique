# Design and UX consistency audit — 2026-08-06

Founder order: "audit all pages for design inconsistency issues... ensure
every page on the app has a consistent design." The first attempt at this
(one grep-driven lens inside the comprehension-trust audit) under-delivered
and is superseded by this document.

Method: 9 read-only Sonnet auditors, every screen and chrome-bearing
component read IN FULL against the canon (docs/rules/styling.md,
docs/DESIGN_SYSTEM.md, src/styles/theme.js), each filling a fixed
per-screen matrix (header / loading idiom / empty idiom / casing) plus
file:line deviations. 89 surfaces matrixed, 113 deviations recorded.
Lint-enforced classes (raw hex/rgba, raw fontSize/fontWeight/letterSpacing,
em dashes) are provably clean and were excluded. A lead mechanical sweep
separately verified: zero raw Alert.alert, zero raw expo-haptics imports,
headers/empty-state/spinner inventories (matching the fleet's findings).

## Lead rulings (D33, recorded as part of D89's remediation)

- **Headers**: ProgressScanTrend and BeforeAfterShareSheet hand-roll modal
  headers -> ModalHeader. WeeklyCheckInScreen's seven hand-rolled headers
  were already ruled (O34) and are landing in lane C. FIX.
- **First loads**: YearOfLiftsScreen and SnapshotsScreen bare-spinner first
  loads -> Skeleton in real slots; RoutineDetailScreen returns null (a
  blank screen) while loading -> Skeleton. FIX.
- **Bespoke empty states** -> shared EmptyState primitive: HomeScreen
  noPlanHero, YouScreen load-error card, PlansScreen (both states),
  ExerciseDetailScreen history empty, CoachOutputScreen LoadErrorView, and
  the remaining bespoke-DRIFT matrix rows. FIX. ONE recorded exception:
  ActiveWorkoutScreen's EmptyExerciseView stays — it deliberately twins the
  live-session chrome byte-for-byte so the empty and populated session
  never look like different screens; converting it would break that pairing
  (exception documented here, revisit only with a session-chrome redesign).
- **Casing**: sentence case everywhere per canon — "Working Sets",
  "Save as Workout Template" (x2 sites), " - Drop Set" and the other
  mixed-DRIFT matrix rows. FIX.
- **LogCardioScreen "Burned about N kcal"** ignores the kJ preference the
  Diary honours — same class as O14. Route through toEnergy/
  energyUnitLabel. FIX (this is a trust item, not just design).
- **Local clones of shared primitives**: SettingsCoachingScreen tone chips
  and SettingsWorkoutScreen segment buttons re-implement Chip/
  SegmentedControl -> use the shared primitives (verify radio roles
  survive). BuildWorkoutScreen's local picker Modal vs the shared
  ExercisePickerModal: investigate; convert if the shared modal supports
  the flow, else STOP and report (do not force it). FIX/investigate.
- **Switch treatment**: one trackColor/thumbColor token pattern app-wide,
  using named alpha stops (0.502 literals become alpha.half). FIX.
- **Token-level lows** (fontSize.micro outside chart axes, off-scale
  spacing literals, hand-assembled type-role twins, unnamed withAlpha
  stops, the one hand-computed circle, sub-48dp hitSlops, missing
  accessibility roles): FIX mechanically, per the list below.
- Previously recorded exceptions stand: NotificationSettingsScreen layout
  (O33) and the CVD info-hue follow-up.

Fix lanes: D1 (screens A-M + components) and D2 (screens N-Z + settings),
dispatched sequentially after lane C lands; WorkoutHistoryScreen,
ProSetupCompleteScreen and WeeklyCheckInScreen belong to lane C and are
excluded from D lanes.

---

## Per-screen matrix (coverage proof)

| file | header | loading | empty | casing |
|---|---|---|---|---|
| screens/HomeScreen.js | ScreenHeader | skeleton | bespoke-DRIFT | sentence |
| screens/YouScreen.js | ScreenHeader | none | bespoke-DRIFT | sentence |
| screens/AnalyticsScreen.js | ScreenHeader | skeleton | EmptyState | sentence |
| screens/ActiveWorkoutScreen.js | custom-justified | n/a | bespoke-DRIFT | sentence |
| screens/WorkoutSummaryScreen.js | custom-justified | n/a | n/a | mixed-DRIFT, quoted: label="Working Sets |
| screens/ExerciseDetailScreen.js | BackHeader | skeleton | bespoke-DRIFT | mixed-DRIFT, quoted: history row set-typ |
| screens/WorkoutHistoryScreen.js | BackHeader | skeleton | EmptyState | sentence |
| screens/PlansScreen.js | ScreenHeader | skeleton | bespoke-DRIFT | sentence |
| screens/PlanLibraryScreen.js | BackHeader | skeleton | EmptyState | sentence |
| screens/PlanDetailScreen.js | BackHeader | skeleton | inline-caption-ok | sentence |
| screens/PlanPreviewScreen.js | custom-justified | n/a | n/a | sentence |
| screens/PlanUpdateScreen.js | BackHeader | n/a | n/a | mixed-DRIFT |
| screens/RoutineDetailScreen.js | BackHeader | none | inline-caption-ok | sentence |
| screens/BuildWorkoutScreen.js | BackHeader | n/a | bespoke-DRIFT | sentence |
| screens/ManualBuilderScreen.js | BackHeader | skeleton | n/a | mixed-DRIFT |
| screens/MesocycleBuilderScreen.js | BackHeader | skeleton | EmptyState | sentence |
| screens/QuizScreen.js | custom-justified | n/a | n/a | sentence |
| screens/MethodologyScreen.js | BackHeader | n/a | n/a | sentence |
| screens/FreeStarterScreen.js | custom-justified | n/a | n/a | sentence |
| screens/LiftProgressScreen.js | BackHeader | none | EmptyState | sentence, header "Lifts", tabs "All lift |
| screens/ConsistencyScreen.js | BackHeader | skeleton | EmptyState | sentence, header "Consistency", sections |
| screens/VolumeHeatmapScreen.js | BackHeader | skeleton | EmptyState | sentence, header "Volume heatmap", secti |
| screens/YearOfLiftsScreen.js | custom-justified | spinner-firstload-DRIFT | EmptyState | sentence, e.g. "Your year of lifts", "Yo |
| screens/SnapshotsScreen.js | SettingsPage | spinner-firstload-DRIFT | EmptyState | sentence, header "Restore a snapshot" |
| screens/WeeklyStoryScreen.js | BackHeader | skeleton | n/a | sentence, header "Your week" |
| screens/ProgressPhotosScreen.js | BackHeader | skeleton | EmptyState | mixed-DRIFT: header title="Progress Phot |
| screens/BodyMetricsScreen.js | BackHeader | none | EmptyState | sentence, header "Body metrics", section |
| screens/AthleteProfileScreen.js | BackHeader | skeleton | EmptyState | sentence, header "Athlete profile", sect |
| components/ProgressSections.js | n/a | n/a | inline-caption-ok | mostly sentence |
| components/ProgressScanTrend.js | custom-UNJUSTIFIED | n/a | EmptyState-like bespoke placeholder | sentence |
| components/WeightTrendCard.js | n/a | n/a | n/a | sentence |
| components/BodyDiagramHeatmap.js | n/a | n/a | n/a | sentence/overline |
| screens/DiaryScreen.js | ScreenHeader | skeleton | EmptyState | sentence |
| screens/FoodSearchScreen.js | ModalHeader | skeleton | EmptyState | sentence |
| screens/AddCustomFoodScreen.js | ModalHeader | n/a | n/a | sentence |
| screens/ScanBarcodeScreen.js | ModalHeader | spinner-inaction | n/a | sentence |
| screens/ScanLabelScreen.js | ModalHeader | spinner-inaction | n/a | sentence |
| screens/MealPlanScreen.js | BackHeader | skeleton | EmptyState | sentence |
| screens/MealNamesScreen.js | BackHeader | n/a | n/a | sentence |
| screens/MyMealsScreen.js | BackHeader | skeleton | EmptyState | sentence |
| screens/MyRecipesScreen.js | BackHeader | skeleton | EmptyState | sentence |
| screens/RecipeBuilderScreen.js | ModalHeader | skeleton | EmptyState | sentence |
| screens/FoodInsightsScreen.js | BackHeader | skeleton | EmptyState | sentence |
| screens/NutritionTargetsScreen.js | BackHeader | n/a | n/a | sentence, EXCEPT the activity-level Pill |
| screens/NutritionEducationScreen.js | BackHeader | n/a | n/a | sentence |
| screens/PerDayTargetsScreen.js | BackHeader | n/a | n/a | sentence |
| screens/WeeklyCheckInScreen.js | custom-UNJUSTIFIED | skeleton | n/a | sentence |
| screens/CoachOutputScreen.js | BackHeader | skeleton | bespoke-DRIFT | sentence |
| screens/CoachReviewScreen.js | BackHeader | skeleton | EmptyState | sentence |
| screens/CoachHeldHistoryScreen.js | BackHeader | skeleton | EmptyState | sentence |
| screens/GoalChangeSummaryScreen.js | custom-justified | n/a | n/a | sentence |
| screens/ProGoalSetupScreen.js | BackHeader | n/a | n/a | mixed-DRIFT: section labels sentence cas |
| screens/GoalLockConsentScreen.js | BackHeader | n/a | n/a | sentence |
| screens/BlockReflectionScreen.js | BackHeader | skeleton | EmptyState | sentence |
| screens/WellbeingCheckScreen.js | BackHeader | n/a | n/a | sentence |
| screens/LogCardioScreen.js | ModalHeader | none | bespoke-DRIFT | sentence |
| screens/CardioHistoryScreen.js | BackHeader | skeleton | EmptyState | sentence |
| screens/PartnerScreen.js | BackHeader | skeleton | bespoke-DRIFT | sentence |
| screens/ShareCardScreen.js | BackHeader | spinner-inaction | n/a | sentence |
| components/BeforeAfterShareSheet.js | custom-UNJUSTIFIED | spinner-inaction | inline-caption-ok | sentence |
| components/CardioPlanCard.js | n/a | none | inline-caption-ok | sentence |
| components/PartnerPrivacyReceipt.js | n/a | n/a | n/a | mixed-DRIFT: "What your partner can see" |
| screens/WelcomeScreen.js | custom-justified | n/a | n/a | sentence |
| screens/LoginScreen.js | custom-justified | none | n/a | sentence |
| screens/FirstRunScreen.js | custom-justified | none | n/a | sentence |
| screens/ProOnboardingScreen.js | custom-justified | spinner-inaction | n/a | sentence |
| screens/ProSetupCompleteScreen.js | custom-justified | n/a | n/a | sentence |
| screens/Article9ConsentScreen.js | custom-justified | none | n/a | sentence |
| screens/ImportScreen.js | BackHeader | spinner-inaction | n/a | sentence |
| screens/SettingsScreen.js | SettingsPage | n/a | n/a | sentence |
| screens/SettingsAccountScreen.js | SettingsPage | n/a | n/a | sentence |
| screens/SettingsPrivacyScreen.js | SettingsPage | n/a | n/a | sentence |
| screens/SettingsProfileScreen.js | SettingsPage | n/a | n/a | sentence |
| screens/SettingsDietaryScreen.js | SettingsPage | n/a | n/a | sentence |
| screens/SettingsDisplayScreen.js | SettingsPage | n/a | n/a | sentence |
| screens/SettingsDataScreen.js | SettingsPage | none | n/a | sentence |
| screens/SettingsHealthScreen.js | SettingsPage | none | n/a | sentence |
| screens/SettingsAboutScreen.js | SettingsPage | n/a | n/a | sentence |
| screens/SettingsWorkoutScreen.js | SettingsPage | n/a | n/a | sentence |
| screens/SettingsFaqScreen.js | SettingsPage | n/a | n/a | sentence |
| screens/SettingsCoachingScreen.js | SettingsPage | n/a | n/a | sentence |
| screens/NotificationSettingsScreen.js | BackHeader | none | n/a | sentence |
| screens/ProUpgradeScreen.js | ModalHeader | n/a | n/a | sentence |
| screens/SubscriptionScreen.js | BackHeader | none | n/a | sentence |
| screens/SubscriptionPolicyScreen.js | BackHeader | n/a | n/a | sentence |
| screens/CascadeGateScreen.js | ModalHeader | n/a | n/a | sentence |
| screens/PrivacyPolicyScreen.js | BackHeader | n/a | n/a | Title Case-DRIFT |
| screens/CreditsScreen.js | BackHeader | n/a | n/a | sentence |
| screens/DebugLogScreen.js | BackHeader | none | bespoke-DRIFT | sentence |

---

## Deviations (all 113, severity-ordered)

**DD1 [high] src/components/BeforeAfterShareSheet.js:484**
RULE: Header trio: 'no fourth hand-rolled header shape' / ModalHeader is mandatory for full-screen modals presented over a tab (docs/rules/styling.md, docs/DESIGN_SYSTEM.md "Header components")
EVIDENCE: <View style={styles.header}>
  <View style={styles.headerCopy}>
    <Text style={[styles.title, live.title]}>Private share image</Text>
    <Text style={[styles.subtitle, live.subtitle]}>One composed image. No raw photo files. You choose share or save.</Text>
  </View>
  <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
    <Ionicons name="close" size={26} color={t.colors.textPrimary} />
FIX: Replace the hand-rolled header View with <ModalHeader title="Private share image" onClose={onClose} />, matching every other full-screen modal (LogCardioScreen, ShareCardScreen's push-modal peers). If the subtitle line is load-bearing, render it as a second line inside the ScrollView content just below the header (as other screens do for secondary context), not inside the chrome. Drop the raw size={26} close icon in favour of iconSize.lg (24), matching PartnerScreen's InviteJourney close icon and ModalHeader's own icon size.

**DD2 [high] src/components/BodyDiagramHeatmap.js:442**
RULE: Shared primitives / one consistent visual language for a repeated idiom (styling.md COMPONENTS section; DESIGN_SYSTEM.md 'Distinctive product principles' on consistency)
EVIDENCE: swatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
FIX: Use borderRadius: circle(10) (the app's existing helper for perfect circles) so this legend swatch matches the round dot shape used for the identical idiom in VolumeHeatmapScreen.js's own LegendItem (circle(10)) and WeightTrendCard.js's state dot (circle(6)); this component's legend and VolumeHeatmapScreen's own legend cards render on the same screen, so the shape mismatch is directly visible to the user in one scroll.

**DD3 [high] src/components/ProgressScanTrend.js:57**
RULE: Header trio: ModalHeader for full-screen modals presented over a tab (styling.md COMPONENTS 'Header trio'; DESIGN_SYSTEM.md 'Header components')
EVIDENCE: function renderHeader() {
    return (
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, live.title]}>Score trend</Text>
            ...
          </View>
          <Text style={[styles.subtitle, live.subtitle]}>...</Text>
        </View>
        <TouchableOpacity onPress={onClose} ... accessibilityLabel="Close score trend">
FIX: Route this modal's chrome through the shared ModalHeader (title centred, close X via closePosition), moving the subtitle line into the body below the header, matching the ModalHeader shape used by every other full-screen modal (scanners, paywalls, add/edit sheets). If a subtitle-under-title header is genuinely needed here, extend ModalHeader with an optional subtitle prop rather than hand-rolling a fourth header shape, and document the exception inline per styling.md's rule.

**DD4 [high] src/screens/BuildWorkoutScreen.js:463**
RULE: styling.md COMPONENTS — shared primitives over local clones
EVIDENCE: <Modal visible={showPicker} animationType={...} onRequestClose={...}>\n  <SafeAreaProvider><SafeAreaView>...<SearchBar .../><TouchableOpacity onPress={() => setShowPicker(false)}>...</TouchableOpacity><FlashList .../>...
FIX: Replace the hand-rolled Modal/SearchBar/close-button/FlashList block with the shared <ExercisePickerModal visible={showPicker} onClose={...} onSelect={addExercise} saveLabel="Add to workout" />, the same component RoutineDetailScreen.js and ManualBuilderScreen.js both already import and use, which also brings equipment/muscle filter chips and inline custom-exercise creation this local clone lacks.

**DD5 [high] src/screens/CoachOutputScreen.js:898**
RULE: Shared primitives over local clones: EmptyState is the primitive for a retryable/empty state
EVIDENCE: function LoadErrorView renders Card > Ionicons cloud-offline-outline, Text 'Couldn't load your coach.', Text body, Button 'Try again', TouchableOpacity 'Close' -- a full hand-built empty/error layout
FIX: Replace with the EmptyState primitive (icon+title+text+actionLabel), exactly as CoachReviewScreen.js:491-506 and BlockReflectionScreen.js:175-184 already do for the identical 'transient load failure, your data is safe' case.

**DD6 [high] src/screens/LogCardioScreen.js:231**
RULE: Number/unit formatting consistency (energy unit must respect the user's kcal/kJ preference, as CardioHistoryScreen.js already does for the same estKcal field)
EVIDENCE: <Text style={[styles.kcalText, live.kcalText]}>Burned about {estKcal} kcal</Text>
FIX: Read energyUnit from the store (as CardioHistoryScreen.js does: `s.accessibility?.energyUnit ?? 'kcal'`) and render `toEnergy(estKcal, energyUnit)` with `energyUnitLabel(energyUnit)` from src/lib/format.js instead of the hardcoded 'kcal' literal, so a kJ user sees the same unit and magnitude here as in their cardio history.

**DD7 [high] src/screens/NotificationSettingsScreen.js:652**
RULE: One press feel / one control treatment app-wide; withAlpha named stops only (styling.md "Tints" + "Components")
EVIDENCE: trackColor={{ false: t.colors.surface2, true: t.colors.primaryDim }}
FIX: Use the same Switch treatment as every other Settings screen: trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, alpha.half) }}, thumbColor unchanged (t.colors.primary / t.colors.textMuted).

**DD8 [high] src/screens/PlansScreen.js:793**
RULE: styling.md COMPONENTS — "Use the shared primitives before writing a local one… EmptyState… local chip/section-header clones are exactly the drift the audits flagged"
EVIDENCE: <Card style={[styles.noPlanCard, live.noPlanCard]}>\n  <View style={styles.noPlanCardHeader}>...icon wrap...<Text>Couldn't load your plans</Text></View>\n  <Text>...body...</Text>\n  <View style={styles.noPlanCardActions}><Button title="Retry" .../></View>\n</Card>  (and the near-identical 'No active plan yet' block at lines 861-888: icon wrap + title + body + two Buttons)
FIX: Replace both bespoke Card blocks with <EmptyState icon=... title=... text=... actionLabel=... onAction=... secondaryLabel=... onSecondary=.../>, exactly as sibling screen PlanLibraryScreen.js already does for its own load-failure and no-plans-found states.

**DD9 [high] src/screens/RoutineDetailScreen.js:408**
RULE: styling.md LOADING STATES: SKELETON VS SPINNER — "A screen's first load of its main content is a Skeleton case, full stop… that is drift"
EVIDENCE: if (!routine) return null;
FIX: Render a Skeleton/SkeletonCard stack mirroring the loaded layout (start button, muscle-tag row, a couple of exercise rows) while `!routine`, the same way PlanDetailScreen.js's own `!plan` branch does (Skeleton width+height plus a SkeletonCard section) for the equivalent pushed-detail screen in this same group.

**DD10 [high] src/screens/SettingsCoachingScreen.js:206**
RULE: "Use the shared primitives before writing a local one ... local chip/section-header clones are exactly the drift the audits flagged." (styling.md, COMPONENTS)
EVIDENCE: <TouchableOpacity key={key} style={[styles.toneChip, liveText.toneChip, sel && [styles.toneChipOn, liveText.toneChipOn]]} onPress={() => setTone(key)} accessibilityRole="radio" ...>
FIX: Replace styles.toneChip (used for both Coaching tone and Autonomy) with the shared Chip component. This is a THIRD distinct visual treatment for the same 'pick one of a few' interaction in the same Settings family (Chip pills vs SettingsWorkoutScreen's solid segmented buttons vs this tinted rounded-rect), which is precisely what a user moving between sibling Settings pages would notice.

**DD11 [high] src/screens/SettingsWorkoutScreen.js:108**
RULE: "Use the shared primitives before writing a local one ... local chip/section-header clones are exactly the drift the audits flagged." (styling.md, COMPONENTS)
EVIDENCE: <TouchableOpacity key={opt.value} style={[local.segBtn, active && [local.segBtnActive, liveLocal.segBtnActive]]} onPress={...} accessibilityRole="radio" ...>
FIX: Replace the hand-rolled segmented control (local.segment/segBtn/segBtnActive) with the shared Chip component in a row, exactly as SettingsDisplayScreen.js does for THEME_OPTIONS/ENERGY_OPTIONS and SettingsProfileScreen.js does for sex/diet, so 'pick one of a few' looks identical everywhere in Settings.

**DD12 [high] src/screens/WeeklyCheckInScreen.js:1390**
RULE: Header trio: BackHeader is the canonical shape for any pushed screen; no fourth hand-rolled shape
EVIDENCE: View style={styles.gateHeader}, TouchableOpacity onPress={() => navigation.goBack()} with Ionicons chevron-back, Text 'Weekly check-in', View width:24 spacer -- repeated near-identically at lines 1432, 1468, 1504, 1540, 1582
FIX: Replace all six hand-rolled gate headers and the main wizard headerBar with BackHeader (passing StepBar as BackHeader's right slot for the wizard state, or documenting a wizard exception inline per canon).

**DD13 [high] src/screens/WorkoutSummaryScreen.js:1516**
RULE: Title and button-label casing consistency (app convention is sentence case)
EVIDENCE: title="Save as Workout Template" (line 1516, secondary-action Button) and <Text style={[styles.templateModalTitle, live.templateModalTitle]}>Save as Workout Template</Text> (line 1593, the same flow's BottomSheet title) versus accessibilityLabel="Save as workout template" for the identical action on lines 1522 and 1591
FIX: Change both visible strings to sentence case: "Save as workout template", matching the accessibilityLabel already used for the same action and the app-wide sentence-case convention (e.g. sibling buttons on this same screen: "Close", "Share", "Cancel", "Save").

**DD14 [medium] src/components/ConsistencyEcho.js:110**
RULE: COLOUR: 'Tints: use withAlpha(colour, alpha.X) with the named stops... Do not invent new alpha values.'
EVIDENCE: explainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: withAlpha(colors.primary, 0.08), ... }
FIX: Use the named stop alpha.ghost (0.08 exactly) instead of the raw literal 0.08: withAlpha(colors.primary, alpha.ghost). Mirror in the live twin at line 36 (withAlpha(t.colors.primary, 0.08)).

**DD15 [medium] src/components/HomeLastSessionCard.js:89**
RULE: COMPONENTS/TYPOGRAPHY: 'Use the type roles, never hand-assemble { fontSize, fontWeight }'; type.captionStrong exists exactly for this xs+semibold micro-label combination
EVIDENCE: lastSessionLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
FIX: Replace with `...type.captionStrong` (the named xs/600 role for small non-uppercase labels) plus the colour override, matching how equivalent labels elsewhere in this screen group (e.g. NavTileLabel) were already fixed onto captionStrong.

**DD16 [medium] src/components/HomeWelcomeCard.js:112**
RULE: TYPOGRAPHY: 'bodySm... use this instead of fontSize.sm + a raw lineHeight'; type roles never hand-rolled size/lineHeight pairs
EVIDENCE: welcomeStepBody: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2, lineHeight: fontSize.sm + 5 }
FIX: Replace with `...type.bodySm` (13/20 already covers this multi-line-copy case) plus the colour override; drop the hand-rolled fontSize.sm+5 lineHeight arithmetic. Mirror the fix in the live twin at line 34 (lineHeight: t.fontSize.sm + 5).

**DD17 [medium] src/components/PartnerPrivacyReceipt.js:123**
RULE: Shared primitives over local clones: 'local chip/section-header clones are exactly the drift the audits flagged' (docs/rules/styling.md COMPONENTS); letterSpacing.overline is 'the one sanctioned value for every uppercase section/eyebrow label' (theme.js, D3)
EVIDENCE: colHeader: {
    ...type.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.caption,
  },
// usage: <Text style={[styles.colHeader, live.colHeader]}>THEY WILL SEE</Text>
FIX: Replace the hand-rolled colHeader Text with <SectionLabel>They will see</SectionLabel> / <SectionLabel>They never see</SectionLabel> (the default variant="overline" already gives uppercase + letterSpacing.overline + medium weight), matching every other eyebrow label in this review group (PartnerScreen's own SectionLabel tone="primary" usage, LogCardioScreen's Section titles). Write the source strings in sentence case and let the component's textTransform uppercase them, rather than hand-typing ALL-CAPS.

**DD18 [medium] src/components/ReadinessCards.js:332**
RULE: fontSize.micro (10) is for chart axes ONLY (styling.md Typography)
EVIDENCE: gaugeLabel: { fontSize: fontSize.micro, color: colors.textMuted, textAlign: 'center' }, gaugeScale: { fontSize: fontSize.micro, ... } directly below it, plus mfChipLabel at line 362
FIX: Use type.caption for the recovery gauge's label/scale text; this card renders inline on the Progress tab, not a chart axis.

**DD19 [medium] src/components/coachOutput/CoachOutputCards.js:195**
RULE: Typography: use the type roles, never hand-rolled size/lineHeight pairs
EVIDENCE: whyText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 21, fontStyle: 'italic' } and rapidLossBody: { fontSize: fontSize.sm, color: colors.textPrimary, lineHeight: 21 } at line 237
FIX: Use type.bodySm for both instead of hand-rolling fontSize.sm plus a raw 21px line-height twice in the same file.

**DD20 [medium] src/screens/ActiveWorkoutScreen.js:4313**
RULE: Type roles never hand-rolled size/lineHeight pairs
EVIDENCE: infoNotes: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22 },
FIX: Use ...type.bodySm (13/regular/lineHeight 20) or, if 22 is genuinely needed for this longer coaching-notes block, name a new role rather than a one-off hand-rolled pair local to this screen.

**DD21 [medium] src/screens/Article9ConsentScreen.js:334**
RULE: Typography — 'Use the type roles, never hand-rolled size/lineHeight pairs' (styling.md TYPOGRAPHY); the exact pattern the bodySm role exists to absorb
EVIDENCE: body: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
FIX: Use `...type.body` (fontSize.md/lineHeight round(16*1.5)=24) or `...type.bodySm` if the tighter measure is intentional, instead of pairing fontSize.md with a hand-picked lineHeight:22 that matches neither role.

**DD22 [medium] src/screens/Article9ConsentScreen.js:352**
RULE: Typography — 'Use the type roles, never hand-rolled size/lineHeight pairs' (styling.md TYPOGRAPHY)
EVIDENCE: bulletText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 22,
  },
FIX: Use `...type.bodySm` (fontSize.sm/lineHeight 20) — the role styling.md names specifically for this multi-line-small-copy case — instead of fontSize.sm + a raw lineHeight:22.

**DD23 [medium] src/screens/AthleteProfileScreen.js:465**
RULE: Skeleton applied consistently across a screen's known first-load content, not partially (styling.md LOADING STATES section)
EVIDENCE: {loading ? (
              <Skeleton width={120} height={12} />
            ) : (
            <Text style={[styles.heroSub, live.heroSub]}>
                {summary.sessions ?? 0} session{summary.sessions === 1 ? '' : 's'} logged
              </Text>
            )}
FIX: Either skeleton the whole known first-load shape (hero line, the 4-tile stat grid, and the strength-baselines/keep-profile-current rows), the same way ConsistencyScreen/VolumeHeatmapScreen skeleton their full first-load layout, or drop this single Skeleton and rely on the summary defaults everywhere for a consistent (if less ideal) treatment; the current half-and-half mix reads as unfinished.

**DD24 [medium] src/screens/BlockReflectionScreen.js:362**
RULE: Tints: use withAlpha(colour, alpha.X) with the named stops only; do not invent new alpha values
EVIDENCE: borderColor: withAlpha(colors.primary, 0.188) -- also mirrored in buildLiveStyles line 399
FIX: Use alpha.tint (0.12) or alpha.soft (0.19) instead of the invented 0.188.

**DD25 [medium] src/screens/BlockReflectionScreen.js:335**
RULE: Typography: use the type roles, never hand-rolled size/lineHeight pairs
EVIDENCE: narrativeLine: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 23 } and nextBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 21 } at line 376
FIX: Use type.body (16/24) for narrativeLine and type.bodySm for nextBody instead of the raw 23px/21px line-heights.

**DD26 [medium] src/screens/BodyMetricsScreen.js:1051**
RULE: Skeleton for a known-layout first load (styling.md LOADING STATES section)
EVIDENCE: {history.length > 0 ? (
          <Card style={styles.snapshotCard}>
            ...
        ) : historyLoadError ? (
          <EmptyState icon="cloud-offline-outline" title="Couldn't load body metrics" ... />
        ) : (
          <EmptyState icon="body-outline" title="No body metrics yet" ... />
        )}
FIX: Track a `historyLoading` state (loadHistory() currently has no loading flag at all) and render a SkeletonCard in the snapshotCard's place while it is true, so the screen never flashes 'No body metrics yet' before the real history has had a chance to load, matching ConsistencyScreen/VolumeHeatmapScreen's SkeletonCard-gated first loads.

**DD27 [medium] src/screens/BuildWorkoutScreen.js:498**
RULE: styling.md COMPONENTS — EmptyState over bespoke empty markup
EVIDENCE: <View style={styles.pickerEmpty}><Ionicons name="search-outline".../><Text>No matching exercises</Text><Text>Try a shorter search...</Text><Button title="Clear search" variant="outline" .../></View>
FIX: Use <EmptyState icon="search-outline" title="No matching exercises" text="Try a shorter search, or clear it and browse the full library." actionLabel="Clear search" onAction={() => setQuery('')} /> instead of hand-rolling the identical icon/title/text/action shape.

**DD28 [medium] src/screens/CascadeGateScreen.js:426**
RULE: "Use the type roles, never hand-rolled size/lineHeight pairs." (styling.md, TYPOGRAPHY); type ramp weight discipline (DESIGN_SYSTEM.md "Weight discipline")
EVIDENCE: title: { color: colors.textPrimary, fontSize: fontSize.xxl, fontWeight: fontWeight.semibold, marginBottom: spacing.md }
FIX: Use type.h2 (24/bold) for the screen title instead of hand-assembling fontSize.xxl+fontWeight.semibold, which silently uses a different weight (600) than the app's own h2 role (700) at the same 24px size. Same pattern repeats in ProUpgradeScreen.js (title/successTitle: fontSize.xxxl+fontWeight.black, matching neither h1 nor display), SubscriptionScreen.js (cardValue: fontSize.xxl+fontWeight.semibold), TierComparisonStrip.js (colHeader/colPrice) and BillingPeriodSelector.js (label/price) - the whole paywall/subscription screen family hand-assembles type instead of using roles, while every Settings* sub-page (via SettingRow/SettingsPrimitives) consistently uses type roles.

**DD29 [medium] src/screens/CoachHeldHistoryScreen.js:329**
RULE: Tints: use withAlpha(colour, alpha.X) with the named stops only; do not invent new alpha values
EVIDENCE: appliedPill: { backgroundColor: withAlpha(colors.success, 0.15), ... } -- also mirrored in buildLiveStyles line 370
FIX: Use alpha.tint (0.12) or alpha.soft (0.19) instead of the invented 0.15.

**DD30 [medium] src/screens/CoachOutputScreen.js:2791**
RULE: Tints: use withAlpha(colour, alpha.X) with the named stops only; do not invent new alpha values
EVIDENCE: backgroundColor: withAlpha(colors.success, 0.125) -- also withAlpha(colors.primary, 0.251) at line 2936 and withAlpha(colors.success ?? colors.primary, 0.314) at line 2992, each mirrored again in buildLiveStyles at lines 3396, 3414, 3422
FIX: Replace 0.125 with alpha.tint (0.12), 0.251 with alpha.edge (0.25), and 0.314 with alpha.mid (0.33), the nearest named stops, in both the frozen styles block and buildLiveStyles.

**DD31 [medium] src/screens/CoachOutputScreen.js:2995**
RULE: fontSize.micro (10) is for chart axes ONLY (styling.md Typography)
EVIDENCE: appliedChipText: { fontSize: fontSize.micro, fontWeight: fontWeight.bold, color: colors.success ?? colors.primary }
FIX: Use type.caption or type.captionStrong for the 'Applied' chip label; fontSize.micro is reserved for chart-axis micro-labels, not UI chip text.

**DD32 [medium] src/screens/ExerciseDetailScreen.js:865**
RULE: Title and button-label casing consistency across sibling screens (item 4)
EVIDENCE: {s.set_type === 'dropset' || s.setType === 'dropset' ? ' - Drop Set' : ''}
FIX: Use 'Drop set' (sentence case) to match ActiveWorkoutScreen.js's own SET_TYPE_OPTIONS label for the identical set type ({ value: 'dropset', label: 'Drop set', ... }, line 128), so the same concept reads the same way in both the logger and the history view.

**DD33 [medium] src/screens/ExerciseDetailScreen.js:879**
RULE: Bespoke re-implementations of shared primitives (item 5) / EmptyState usage
EVIDENCE: <Card radius="md" style={styles.historyEmpty}> ... <Ionicons name="time-outline" .../> <Text ...>You haven't logged this exercise yet...</Text> <Button title="Start workout" .../> </Card>
FIX: Replace with the shared <EmptyState compact icon="time-outline" title=... text=... actionLabel="Start workout" onAction={...} /> primitive (already used this way by WorkoutHistoryScreen.js), instead of hand-rolling the same icon+text+button shape locally.

**DD34 [medium] src/screens/GoalChangeSummaryScreen.js:211**
RULE: Header trio: BackHeader for any pushed screen, ModalHeader only for screens presented as a native modal over a tab
EVIDENCE: ModalHeader title="Here's what changed" onClose={handleDone} -- RootNavigator.js:571 registers this route with headerShown:false only, no presentation:'modal', the same plain-push registration GoalLockConsentScreen and BlockReflectionScreen use with BackHeader
FIX: Switch to BackHeader(onBack={handleDone}) to match its plain-push registration and its sibling screens, or add an inline comment documenting the X-close as a deliberate exception since navigation.replace leaves nothing to go back to.

**DD35 [medium] src/screens/GoalChangeSummaryScreen.js:341**
RULE: fontSize.micro (10) is for chart axes ONLY (styling.md Typography)
EVIDENCE: unchangedTag: { fontSize: fontSize.micro, color: colors.textMuted, fontStyle: 'italic' }
FIX: Use type.caption (11px) for the 'unchanged' tag instead of the chart-only micro size.

**DD36 [medium] src/screens/HomeScreen.js:2261**
RULE: COLOUR: withAlpha named stops only (alpha.ghost .08 / tint .12 / soft .19 / edge .25 / mid .33 / strong .40 / half .50)
EVIDENCE: continueSub: { ...type.caption, color: withAlpha(colors.onPrimary, 0.8), marginTop: spacing.xxs },
FIX: 0.8 matches no named stop (nearest is alpha.half at 0.5); use a sanctioned stop or, if a genuinely new value is needed, add it to the named-stop table rather than inlining. Mirror in the live twin at line 150.

**DD37 [medium] src/screens/HomeScreen.js:1788**
RULE: COLOUR: withAlpha named stops only; ICONS: iconSize scale is 16/20/24/32, no other literal
EVIDENCE: <Ionicons name="chevron-forward" size={18} color={withAlpha(t.colors.onPrimary, 0.8)} />
FIX: Use iconSize.md (20) or iconSize.sm (16) instead of the raw 18, and a named alpha stop instead of raw 0.8 (this is the live call site paired with the finding at line 2261).

**DD38 [medium] src/screens/HomeScreen.js:1617**
RULE: Accessibility: accessibilityRole/State/Label on every interactive element -- sibling dismiss (X) controls on this same screen (coach/deload/plateau/activation banners) all carry accessibilityRole="button"
EVIDENCE: <TouchableOpacity
              onPress={dismissPhaseBanner}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Dismiss nutrition phase banner"
            >
FIX: Add accessibilityRole="button" to match every other banner-dismiss control on this screen (coachBanner/deloadBanner/plateauBanner/activationBanner dismiss buttons all set it).

**DD39 [medium] src/screens/HomeScreen.js:2044**
RULE: Accessibility: accessibilityRole/State/Label on every interactive element -- sibling dismiss (X) controls elsewhere on this screen carry accessibilityRole="button"
EVIDENCE: <TouchableOpacity
              onPress={dismissCoachingNudge}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Dismiss coaching nudge"
            >
FIX: Add accessibilityRole="button", matching the coach/deload/plateau/activation banner dismiss buttons on the same screen.

**DD40 [medium] src/screens/HomeScreen.js:1863**
RULE: COMPONENTS: 'Use the shared primitives before writing a local one... EmptyState'
EVIDENCE: <View style={styles.noPlanHero}>
                  <View style={[styles.noPlanIconWrap, live.noPlanIconWrap]}>
                    <Ionicons name="barbell-outline" size={28} color={t.colors.primary} />
                  </View>
                  <Text style={[styles.noPlanTitle, live.noPlanTitle]}>No active plan yet</Text>
                  <Text style={[styles.noPlanSub, live.noPlanSub]}>...
FIX: This icon-circle + title + subtitle + action(s) shape is exactly what EmptyState already renders (including two CTAs via actionLabel/secondaryLabel). Route both the Pro and Free no-plan branches through EmptyState instead of the hand-rolled noPlanHero/noPlanIconWrap/noPlanTitle/noPlanSub/starterCard styles, or extend EmptyState with whatever variant this needs rather than forking a local clone.

**DD41 [medium] src/screens/LogCardioScreen.js:171**
RULE: Empty states: a search/filter with zero results needs feedback (EmptyState or at minimum an inline caption), not silence
EVIDENCE: {filtered ? (
            <ActivityList items={filtered} onPick={pickActivity} />
          ) : (
FIX: When `filtered` is a non-null empty array, render a compact EmptyState or inline caption (e.g. 'No matches for "{query}"') instead of letting ActivityList render an empty <View> with no feedback -- matches how FoodSearchScreen (the canon's own reference for this idiom) handles a no-results search.

**DD42 [medium] src/screens/ManualBuilderScreen.js:42**
RULE: docs/rules/styling.md microcopy convention — sentence-case UI copy
EVIDENCE: { key: 'hypertrophy', label: 'Build Muscle' }, { key: 'balanced', label: 'Balanced Bodybuilding' }, { key: 'aesthetic', label: 'Aesthetic Focus' }, { key: 'strength', label: 'Strength-Biased' }, { key: 'recomp', label: 'Lose Fat, Keep Muscle' }
FIX: Sentence-case: 'Build muscle', 'Balanced bodybuilding', 'Aesthetic focus', 'Strength-biased', 'Lose fat, keep muscle' — matching the goal-option casing used by QuizScreen.js and FreeStarterScreen.js's own goal chips in this same group.

**DD43 [medium] src/screens/ManualBuilderScreen.js:998**
RULE: styling.md SPACING, RADIUS, ICONS — "every interactive element ≥48dp effective"
EVIDENCE: <TouchableOpacity onPress={() => handleDuplicateDay(dayIdx)} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }} ...><Ionicons name="copy-outline" size={18} .../></TouchableOpacity>
FIX: Widen the horizontal hitSlop (or use the shared `hitSlop` token) so the 18px duplicate/remove-day icons clear 48dp effective width; currently ~34px.

**DD44 [medium] src/screens/NutritionTargetsScreen.js:46**
RULE: Title and button-label casing consistency - app convention is sentence case
EVIDENCE: { key: 'very_active',  label: 'Very Active' },
FIX: Change to 'Very active' to match the app's sentence-case convention and its sibling single-word options in the same ACTIVITY_OPTIONS array (Sedentary, Light, Moderate, Active).

**DD45 [medium] src/screens/PartnerScreen.js:2083**
RULE: Bespoke re-implementation of a shared primitive: the whole-screen empty state duplicates EmptyState's icon-circle/title/text shape by hand instead of composing it, and its visual treatment diverges from EmptyState (no border ring, different background tint, body copy at type.body instead of EmptyState's type.bodySm) even though EmptyState is imported and used in this very file for the p.error case
EVIDENCE: emptyIconCircle: {
    alignSelf: 'center',
    padding: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: withAlpha(colors.primary, alpha.tint),
  },
  emptyTitle: { ...type.title, color: colors.textPrimary, textAlign: 'center' },
  emptyBody: { ...type.body, color: colors.textSecondary, textAlign: 'center' },
FIX: Keep the custom content (PartnerPrivacyReceipt, code entry, incoming-share notice) that EmptyState genuinely can't hold, but align the icon-circle and title/body treatment with EmptyState's own tokens: add the border (borderWidth:1, borderColor: withAlpha(colors.primary, alpha.edge)) and use colors.primaryBg for the fill (matching EmptyState's iconWrap exactly), and drop emptyBody to type.bodySm so it reads the same size as every other empty-state body copy in the app (e.g. CardioHistoryScreen's EmptyState in this same group).

**DD46 [medium] src/screens/PlanUpdateScreen.js:47**
RULE: docs/rules/styling.md microcopy convention — British English sentence-case UI copy (see DESIGN_SYSTEM.md Microcopy tone table)
EVIDENCE: { value: 'full_gym', label: 'Full Gym', ... }, { value: 'machines_cables', label: 'Machines & Cables', ... }, { value: 'dumbbells_only', label: 'Dumbbells Only', ... }, { value: 'barbell_plates', label: 'Barbell & Plates', ... }, { value: 'home_gym', label: 'Home Gym', ... }
FIX: Sentence-case the labels ('Full gym', 'Machines and cables', 'Dumbbells only', 'Barbell and plates', 'Home gym'), matching QuizScreen.js's EQUIPMENT array ('Full gym', 'Home gym', 'Bodyweight') and FreeStarterScreen's equipment step for the exact same concept in this screen group.

**DD47 [medium] src/screens/PrivacyPolicyScreen.js:167**
RULE: "Numbers the user reads as data..." / type roles discipline; direct sibling comparison to CreditsScreen.js (styling.md TYPOGRAPHY: "never hand-rolled size/lineHeight pairs")
EVIDENCE: body: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.sm }
FIX: Use the type.bodySm role (13/20) as CreditsScreen.js does for the identical 'paragraph body copy in a legal/attribution static page' role: body: { ...type.bodySm, color: colors.textSecondary, marginBottom: spacing.sm }.

**DD48 [medium] src/screens/ProGoalSetupScreen.js:684**
RULE: fontSize.micro (10) is for chart axes ONLY (styling.md Typography)
EVIDENCE: suggestedBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.bold, color: colors.primary }
FIX: Use type.captionStrong for the 'Suggested' badge label instead of fontSize.micro.

**DD49 [medium] src/screens/ProOnboardingScreen.js:2237**
RULE: Components — 'Use the shared primitives before writing a local one... local chip/section-header clones are exactly the drift the audits flagged' (styling.md COMPONENTS); DESIGN_SYSTEM.md 'Interaction feedback': one press feel / one control per role app-wide
EVIDENCE: toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.surface3, justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn: { backgroundColor: colors.primaryFill },
  toggleThumb: { width: 20, height: 20, borderRadius: radius.md, backgroundColor: colors.textMuted },
  toggleThumbOn: { backgroundColor: colors.background, alignSelf: 'flex-end' }  // rendered at 1932-1941 as TouchableOpacity+View, accessibilityRole="switch"
FIX: Replace the hand-rolled TouchableOpacity/View pill with the native RN Switch (trackColor/thumbColor from theme tokens), matching every Settings toggle e.g. SettingsCoachingScreen.js:134-139 (`<Switch value={calmEnabled} onValueChange={toggleCalmMode} trackColor={{false: t.colors.surface3, true: withAlpha(t.colors.primary, 0.502)}} thumbColor={...} />`), so a user sees one toggle affordance app-wide instead of a different control shape in onboarding vs Settings.

**DD50 [medium] src/screens/ProOnboardingScreen.js:1994**
RULE: Typography — 'Use the type roles, never hand-rolled size/lineHeight pairs' (styling.md TYPOGRAPHY)
EVIDENCE: stepTitle: {
    fontSize: fontSize.xxl, fontWeight: fontWeight.bold,
    color: colors.textPrimary, marginBottom: spacing.sm, lineHeight: 30,
  },
FIX: Use `...type.h2` (fontSize.xxl/bold/lineHeight round(24*1.35)=32) for the wizard step title instead of a hand-assembled fontSize.xxl + fontWeight.bold + lineHeight:30.

**DD51 [medium] src/screens/ProOnboardingScreen.js:2106**
RULE: Typography — the 'fourth, unnamed micro-label combination' theme.js's own comment (buildTypeRoles, captionStrong) names as drift: fontSize.xs + an independently hand-picked fontWeight instead of a type role
EVIDENCE: fieldLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted, marginBottom: spacing.sm,
  },
  fieldHint: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18, marginBottom: spacing.sm },
FIX: fieldLabel matches type.captionStrong (fontSize.xs/semibold/lineHeight 15) almost exactly; fieldHint matches type.captionTight (fontSize.xs/lineHeight 16) closely. Adopt the named roles instead of hand-rolling — this pattern repeats at wpLabel (2143), wpHint (2147), timeLabel (2246), provisionalKcal (2112-2113) in the same file.

**DD52 [medium] src/screens/ProgressPhotosScreen.js:1699**
RULE: Title casing convention: sentence case for screen titles (evidenced by every sibling BackHeader title in this group)
EVIDENCE: <BackHeader
        title="Progress Photos"
        onBack={() => navigation.goBack()}
      />
FIX: Change to sentence case, "Progress photos", matching every sibling pushed-screen title in this group (Lifts, Consistency, Volume heatmap, Your week, Body metrics, Athlete profile). Also update the matching hero eyebrow Text at line 1460 ("Progress Photos") for the same reason.

**DD53 [medium] src/screens/RoutineDetailScreen.js:583**
RULE: styling.md SPACING, RADIUS, ICONS — "every interactive element ≥48dp effective—gym, sweaty hands"
EVIDENCE: <TouchableOpacity onPress={() => openEdit(...)} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }} ...><Ionicons name="create-outline" size={20} .../></TouchableOpacity>  (repeated for swap-horizontal and trash-outline in the same cardActions row, lines 567-590)
FIX: Use the shared `hitSlop` token (top/bottom/left/right: 12) from theme.js, or increase the horizontal hitSlop to 14, so the 20px icon clears the mandated 48dp effective touch width (currently ~36px).

**DD54 [medium] src/screens/SettingsDisplayScreen.js:135**
RULE: "Tints: use withAlpha(colour, alpha.X) with the named stops ... Do not invent new alpha values." (styling.md, COLOUR)
EVIDENCE: trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, 0.502) }}
FIX: Replace the raw 0.502 literal with the named alpha.half stop (0.5): withAlpha(t.colors.primary, alpha.half). Same fix applies to the other 18 occurrences across SettingsDataScreen.js, SettingsHealthScreen.js, SettingsWorkoutScreen.js and SettingsCoachingScreen.js.

**DD55 [medium] src/screens/SnapshotsScreen.js:104**
RULE: Skeleton for a known-layout first load, never a bare loading label (styling.md LOADING STATES section)
EVIDENCE: {snapshots === null ? (
          <Text style={[localStyles.note, liveText.note]}>Loading…</Text>
        ) : loadError ? (
FIX: Replace the bare 'Loading…' text with a small SkeletonRow stack (2-3 rows) inside the section, matching the SettingRow shape the real list will render into, the same idiom ConsistencyScreen/VolumeHeatmapScreen/WeeklyStoryScreen/ProgressPhotosScreen already use for their first loads.

**DD56 [medium] src/screens/WellbeingCheckScreen.js:179**
RULE: Typography: use the type roles, never hand-rolled size/lineHeight pairs
EVIDENCE: intro: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22 } and question: { fontSize: fontSize.sm, color: colors.textPrimary, lineHeight: 22 } at line 196, plus saveHint/privacy: { fontSize: fontSize.xs, ..., lineHeight: 18 } at lines 226 and 232
FIX: Use type.bodySm or type.body for the intro/question copy and type.caption/captionTight for the hint/privacy lines instead of hand-assembling fontSize plus a raw lineHeight four separate times on one screen.

**DD57 [medium] src/screens/WorkoutSummaryScreen.js:1102**
RULE: Title and button-label casing consistency (item 4)
EVIDENCE: label="Working Sets"
FIX: Lower-case to "Working sets", matching the sentence-case sibling stat directly above it (label="Total lifted", line 1053) in the same statsGrid row.

**DD58 [low] src/components/BeforeAfterShareSheet.js:746**
RULE: Spacing scale: off-scale computed literal (duplicate of the ShareCardScreen.js instance)
EVIDENCE: segment: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm + 1, borderRadius: radius.sm,
  },
FIX: Same as ShareCardScreen.js:674 -- replace `spacing.sm + 1` with a named step (spacing.sm or spacing.md).

**DD59 [low] src/components/BlockProgressCard.js:112**
RULE: RADIUS: scale is hair2/xs4/sm6/md10/lg16/xl20/full999; 3 matches no token
EVIDENCE: barBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
FIX: Use radius.xs (4) instead of the off-scale 3; the matching barFill at line 118 has the same borderRadius:3 and should be fixed together.

**DD60 [low] src/components/ProgressSections.js:57**
RULE: British English/plain sentence-case copy convention, evidenced by sibling copy in the same card
EVIDENCE: <Text style={[styles.mesoName, live.mesoName]} numberOfLines={1}>{meso.name ?? 'Training Block'}</Text>
FIX: Change the fallback string to sentence case, "Training block" (also update the accessibilityLabel fallback at line 52), matching the sentence-case convention used everywhere else in this same card ("No plan running yet", "Browse the plan library...", "Weekly load").

**DD61 [low] src/screens/ActiveWorkoutScreen.js:2452**
RULE: Empty state primitive (a whole-screen bespoke empty is drift)
EVIDENCE: <EmptyExerciseView onAdd={openAddExercisePicker} onFinish={handleFinishWorkout} onCancel={handleCancelWorkout} ... />
FIX: Lower priority given the polish and header-twinning already in place, but consider composing the shared EmptyState primitive for the icon/title/subtitle/button block inside EmptyExerciseView (keeping the bespoke header above it), rather than a fully local icon+title+subtitle+Button implementation.

**DD62 [low] src/screens/ActiveWorkoutScreen.js:4068**
RULE: Spacing scale - off-scale literals are drift
EVIDENCE: swapItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, ... minHeight: 62, ...
FIX: Use an on-scale/token value (e.g. workoutLoggerSize.primaryActionMinHeight, already used elsewhere in this same file for row min-heights) instead of the raw 62.

**DD63 [low] src/screens/ActiveWorkoutScreen.js:4085**
RULE: Spacing scale - off-scale literals are drift
EVIDENCE: swapBrowseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.md, minHeight: 44, ...
FIX: Use workoutLoggerSize.primaryActionMinHeight (the same 48dp-class token this file already uses for every other action row) instead of the raw 44.

**DD64 [low] src/screens/AnalyticsScreen.js:1331**
RULE: TYPOGRAPHY: hand-rolled fontSize+lineHeight pair instead of type.bodySm
EVIDENCE: momentumText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },
FIX: Replace fontSize.sm + lineHeight:22 with `...type.bodySm` (13/20), the named role for exactly this multi-line-copy case.

**DD65 [low] src/screens/AnalyticsScreen.js:1282**
RULE: SPACING: off-scale literal
EVIDENCE: diffChip:     { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 3 },
FIX: Use spacing.xxs (2) or spacing.xs (4) instead of the raw 3 for paddingVertical.

**DD66 [low] src/screens/BuildWorkoutScreen.js:552**
RULE: DESIGN_SYSTEM.md Border radius tiers — "circle(size) helper, avatars… round icon buttons" + sibling consistency
EVIDENCE: indexBadge: { width: 28, height: 28, borderRadius: radius.lg, backgroundColor: colors.surface2, ... }
FIX: Match the 32x32 circle(32) numbered-index badge already used for the identical concept in RoutineDetailScreen.js's orderBadge and PlanDetailScreen.js's workoutIndex, rather than a differently-sized, non-circle()-helper badge.

**DD67 [low] src/screens/CoachHeldHistoryScreen.js:296**
RULE: Shared primitives / type roles: don't hand-assemble a role that already exists (type.captionStrong)
EVIDENCE: weekLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, marginBottom: spacing.xs }
FIX: This is type.captionStrong's box (11px/semibold) rebuilt by hand; spread ...type.captionStrong instead.

**DD68 [low] src/screens/CoachOutputScreen.js:2940**
RULE: Shared primitives / type roles: don't hand-assemble a role that already exists (type.overline)
EVIDENCE: focusLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary, letterSpacing: letterSpacing.overline, textTransform: 'uppercase' }
FIX: This reconstructs type.overline (fontSize.xs, letterSpacing.overline, uppercase) by hand with a different weight (bold vs the role's medium). Spread ...type.overline and layer only the colour override.

**DD69 [low] src/screens/CoachOutputScreen.js:2988**
RULE: Spacing scale: off-scale literals (3, 5, 10, 14...) are drift
EVIDENCE: appliedChip: { flexDirection: 'row', alignItems: 'center', gap: 3, ... } -- same pattern at src/components/ReadinessCards.js:359, mfChip: { ..., gap: 5, ... }
FIX: Use spacing.xs2 (6), the nearest scale step, instead of the raw 3 (or 5 in ReadinessCards.js).

**DD70 [low] src/screens/CoachReviewScreen.js:728**
RULE: Shared primitives / type roles: don't hand-assemble a role that already exists (type.overline)
EVIDENCE: cardTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: letterSpacing.overline, textTransform: 'uppercase', marginBottom: spacing.md }
FIX: Spread ...type.overline instead of re-listing fontSize/letterSpacing/textTransform by hand.

**DD71 [low] src/screens/DebugLogScreen.js:150**
RULE: "Use the shared primitives before writing a local one" (styling.md COMPONENTS); Loading states doc: "Skeleton for a known layout's first load ... a screen's first load of its main content is a Skeleton case, full stop"
EVIDENCE: {!loading && filtered.length === 0 && (
  <View style={styles.empty}>
    <Ionicons name="checkmark-circle-outline" size={36} color={t.colors.success} />
    <Text style={[styles.emptyText, live.emptyText]}>No {filter === 'all' ? '' : filter + ' '}entries.</Text>
    <Text style={[styles.emptyHint, live.emptyHint]}>Errors caught by handlers will appear here.</Text>
  </View>
)}
FIX: Use the shared EmptyState primitive (compact variant) instead of hand-rolled styles.empty/emptyText/emptyHint. Separately, the `loading` state set in load() is never rendered anywhere in JSX, so the first paint of this screen shows neither a Skeleton nor a spinner while getRecentErrors()/getCrashLog() resolve - add a SkeletonRow stack (list of unknown length, known row shape) or at minimum an ActivityIndicator while loading is true.

**DD72 [low] src/screens/DebugLogScreen.js:103**
RULE: "Use the shared primitives before writing a local one ... local chip/section-header clones are exactly the drift the audits flagged." (styling.md, COMPONENTS)
EVIDENCE: <TouchableOpacity key={level} style={[styles.chip, live.chip, on && [styles.chipOn, live.chipOn]]} onPress={() => setFilter(level)} accessibilityRole="button" accessibilityState={{ selected: on }} ...>
FIX: Use the shared Chip component (with accessibilityRole="radio" since only one filter is active at a time) instead of local styles.chip/chipOn/chipLabel - this is a fourth local reimplementation of the same pill-select pattern found in SettingsWorkoutScreen.js and SettingsCoachingScreen.js.

**DD73 [low] src/screens/DiaryScreen.js:2389**
RULE: Type roles never hand-rolled size/lineHeight pairs (styling.md TYPOGRAPHY)
EVIDENCE: buildPlanSub: { ...type.caption, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
FIX: Drop the raw lineHeight: 18 override and let type.caption's own line-height (round(11*1.35)=15) stand, or switch to type.bodySm/type.captionTight if more vertical room is genuinely needed.

**DD74 [low] src/screens/ExerciseDetailScreen.js:1117**
RULE: Type roles never hand-rolled size/lineHeight pairs; use the type role or extend it
EVIDENCE: chartLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },
FIX: Use ...type.captionStrong (11/semibold, the exact same size+weight pair already named in theme.js) instead of hand-assembling it.

**DD75 [low] src/screens/ExerciseDetailScreen.js:1277**
RULE: Spacing scale (1,2,4,6,8,12,16,24,32,48) - off-scale literals are drift
EVIDENCE: plateauBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, ...
FIX: Use spacing.sm (8) or spacing.md (12) in place of the raw 10.

**DD76 [low] src/screens/FoodInsightsScreen.js:726**
RULE: Spacing/radius rule: 'Never hard-code a colour, size, spacing, radius or duration. Use tokens' (styling.md THE ONE RULE); radius.xs = 4
EVIDENCE: adherenceTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surface2, overflow: 'hidden', marginHorizontal: spacing.sm },
  adherenceFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
FIX: Replace the raw 4 with radius.xs, matching barTrack/barFill (lines 714-720 in the same file) which use radius.sm for the visually equivalent progress-bar track/fill.

**DD77 [low] src/screens/FoodSearchScreen.js:1197**
RULE: Spacing scale - off-scale literal
EVIDENCE: suggestMacros: { ...type.caption, color: colors.textSecondary, marginTop: 3 },
FIX: Replace marginTop: 3 with spacing.xxs (2) or spacing.xs (4).

**DD78 [low] src/screens/FoodSearchScreen.js:1150**
RULE: 'Use the type roles. Never hand-assemble { fontSize, fontWeight }' (DESIGN_SYSTEM.md Typography); type roles never hand-rolled size/lineHeight pairs (styling.md)
EVIDENCE: tabLabel: {
    color: colors.textMuted, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
    lineHeight: fontSize.sm + 6,
    paddingBottom: spacing.sm,
  },
FIX: Replace with ...type.label (or type.bodySm) plus colour override, instead of hand-assembling fontSize/fontWeight/lineHeight from tokens piecemeal.

**DD79 [low] src/screens/GoalChangeSummaryScreen.js:369**
RULE: Spacing scale: off-scale literals (3, 5, 10, 14...) are drift
EVIDENCE: bullet: { marginTop: 7 }
FIX: Use spacing.xs2 (6) or spacing.sm (8), the nearest scale steps, instead of the raw 7.

**DD80 [low] src/screens/GoalLockConsentScreen.js:147**
RULE: Components: use the shared primitives before writing a local one (Button)
EVIDENCE: TouchableOpacity onPress={save} disabled={!choice || busy} style={[styles.cta, ...]} accessibilityRole="button" ... Text 'Save'/'Continue' -- a hand-built primary CTA
FIX: Replace with the shared Button primitive (as GoalChangeSummaryScreen.js:317, BlockReflectionScreen.js:295-301 and WellbeingCheckScreen.js:149-155 all do for their equivalent primary CTA in this same coaching flow), including its loading state for the async save.

**DD81 [low] src/screens/HomeScreen.js:2640**
RULE: RADIUS: 'Perfect circles use the circle(size) helper, never hand-computed width / 2.'
EVIDENCE: quickStartIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
FIX: Use circle(48) instead of the hand-computed 24.

**DD82 [low] src/screens/HomeScreen.js:2627**
RULE: SPACING: scale is hair1/xxs2/xs4/xs2-6/sm8/md12/lg16/xl24/xxl32/xxxl48; 'Off-scale literals (3, 5, 10, 14…) are drift'
EVIDENCE: quickStartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
FIX: Use spacing.md (12) or spacing.lg (16) instead of the off-scale 14.

**DD83 [low] src/screens/HomeScreen.js:2648**
RULE: SPACING: off-scale literal (spacing scale has no 3)
EVIDENCE: quickStartTitle: {
    ...type.bodyStrong,
    color: colors.textPrimary,
    marginBottom: 3,
  },
FIX: Use spacing.xs (4) or spacing.xxs (2) instead of the raw 3.

**DD84 [low] src/screens/HomeScreen.js:2282**
RULE: SPACING: 'Never hard-code... spacing... Use tokens.' -- value matches spacing.xs2 (6) but is written as a raw literal
EVIDENCE: mesoBriefChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
FIX: Use spacing.xs2 (already the token for this exact 6px dense-row gap) instead of the raw literal.

**DD85 [low] src/screens/HomeScreen.js:2559**
RULE: TYPOGRAPHY: hand-rolled fontSize+lineHeight pair instead of a type role
EVIDENCE: coachBannerBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 17 },
FIX: Use `...type.bodySm` (13/20) rather than fontSize.sm + a hand-picked lineHeight:17; the sibling deloadBannerBody at line 2568 has the identical issue and should be fixed together.

**DD86 [low] src/screens/HomeScreen.js:1622**
RULE: ICONS: iconSize scale is 16/20/24/32; sibling banner dismiss icons on this screen (coach/deload/plateau/activation) all use size 16
EVIDENCE: <Ionicons name="close" size={15} color={t.colors.textMuted} />
FIX: Use iconSize.sm (16) to match every other banner-dismiss close icon on this screen (coachBanner/deloadBanner/plateauBanner/activationBanner all use size={16}).

**DD87 [low] src/screens/ImportScreen.js:482**
RULE: DESIGN_SYSTEM.md Typography — 'Emphasis by weight and colour, never italic or underline'
EVIDENCE: unmappedHint: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
FIX: Drop fontStyle:'italic'; if the hint needs to stand apart, use a weight or colour shift within the existing caption role instead.

**DD88 [low] src/screens/LiftProgressScreen.js:314**
RULE: withAlpha named stops only, do not invent new alpha values (styling.md COLOUR section)
EVIDENCE: <View style={[styles.levelBadge, { backgroundColor: withAlpha(resolveLevelColor(lvl.label), 0.133) }]}>
FIX: Use one of the named alpha stops (alpha.tint = 0.12 is the closest) instead of the raw 0.133 literal; also fix the sibling raw alphas at line 595/695 (0.267, nearest alpha.edge = 0.25) and line 646/708 (0.16, between alpha.tint 0.12 and alpha.soft 0.19 -- pick one).

**DD89 [low] src/screens/LogCardioScreen.js:204**
RULE: Tokenised touch targets: theme.js exports a single `hitSlop` token specifically so touch-target expansion is consistent app-wide, not ad hoc per call site
EVIDENCE: <TouchableOpacity onPress={toggleFavourite} hitSlop={10} accessibilityRole="button" accessibilityState={{ selected: isFavourite }} accessibilityLabel={isFavourite ? 'Remove from your cardio' : 'Add to your cardio'}>
FIX: Import and use the shared `hitSlop` token (12 on every side) instead of the raw literal 10, matching PartnerScreen.js's consistent `hitSlop={hitSlop}` usage throughout. Same fix applies to CardioPlanCard.js:48 (hitSlop={8}) and BeforeAfterShareSheet.js:490 (hitSlop={12}, which happens to match the token's value but isn't importing it).

**DD90 [low] src/screens/ManualBuilderScreen.js:1463**
RULE: Sibling-screen consistency — identical up/down reorder control sized differently across the group
EVIDENCE: reorderBtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.surface2 }
FIX: Match the 32x32 reorderBtn already used for the same up/down chevron control on RoutineDetailScreen.js and PlanDetailScreen.js.

**DD91 [low] src/screens/MealPlanScreen.js:1619**
RULE: Spacing scale: hair 1 - xxs 2 - xs 4 - xs2 6 - sm 8 ... 'Off-scale literals (3, 5, 10, 14…) are drift'
EVIDENCE: seasonWrap: {
    marginTop: spacing.sm, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border, gap: 3,
  },
FIX: Replace gap: 3 with spacing.xxs (2) or spacing.xs (4).

**DD92 [low] src/screens/MealPlanScreen.js:1669**
RULE: Spacing tokens - 'All spacing from tokens, no arbitrary pixels'
EVIDENCE: preferencesHint: { ...type.caption, color: colors.textMuted, lineHeight: 17, marginLeft: 34 + spacing.sm },
FIX: Replace the magic number 34 with a named constant tied to preferencesIcon's width (34, defined a few lines above) so the two can never drift apart, and drop the raw lineHeight:17 override (see next finding).

**DD93 [low] src/screens/MyRecipesScreen.js:320**
RULE: Radius tokens: 'radius: ... full 999' - use tokens, never raw literals
EVIDENCE: logPill: {
    minHeight: 40,
    ...
    borderRadius: 999,
    backgroundColor: colors.primaryBg,
FIX: Replace 999 with radius.full.

**DD94 [low] src/screens/MyRecipesScreen.js:337**
RULE: 'Perfect circles use the circle(size) helper, never hand-computed width / 2' (styling.md SPACING, RADIUS, ICONS)
EVIDENCE: actionBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
FIX: Replace borderRadius: 20 with circle(40) as required by the canon rule.

**DD95 [low] src/screens/NutritionEducationScreen.js:291**
RULE: 'Use the type roles. Never hand-assemble { fontSize, fontWeight }' (DESIGN_SYSTEM.md Typography)
EVIDENCE: intro: { color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 22 },
FIX: Replace with ...type.body plus colour override (body's own lineHeight is 24, close to the hand-picked 22). Same pattern at line 299 (body: fontSize.sm/lineHeight:21, should be ...type.bodySm).

**DD96 [low] src/screens/PartnerScreen.js:1714**
RULE: Typography: 'type roles never hand-rolled size/lineHeight pairs' -- a dedicated role (captionTight, ~16 computed) already exists for exactly this 'caption with a roomier multi-line line-height' case
EVIDENCE: localReadNoticeText: { ...type.caption, color: colors.textSecondary, lineHeight: 18 },
FIX: Use type.captionTight (which already gives ~16px line-height for two-line caption copy) instead of manually overriding type.caption's lineHeight to a hand-picked 18 on every one of the ~14 occurrences in this file (localReadNoticeText, redeemSyncText, supportPlanPrivacy, partnerWinDetail, blockStatusCopy, shareWinPreviewIntroText, shareWinReceiptBody, shareWinPrivacyText, shareWinExampleDetail, shareWinExampleConsent, shareWinFooter, pendingHint, pendingCheckLine, blockFooter). If 18 is genuinely the desired value, extend the type system with a named role rather than repeating the raw override at every call site.

**DD97 [low] src/screens/PlanDetailScreen.js:618**
RULE: styling.md SPACING — off-scale literal
EVIDENCE: whyBullet: { width: 6, height: 6, borderRadius: circle(6), backgroundColor: colors.primary, marginTop: 7 }
FIX: Use spacing.xs2 (6) or spacing.sm (8) instead of the raw literal 7.

**DD98 [low] src/screens/PlanDetailScreen.js:326**
RULE: DESIGN_SYSTEM.md Icon style — sizes from the iconSize token (16/20/24/32)
EVIDENCE: <Ionicons name="star" size={9} color={t.colors.onPrimary} />
FIX: Use iconSize.sm (16) or otherwise a tokenised value inside the featured badge rather than the raw literal 9, which sits well below the smallest scale step.

**DD99 [low] src/screens/PlansScreen.js:1312**
RULE: styling.md SPACING — "Off-scale literals (3, 5, 10, 14…) are drift — pick a step"
EVIDENCE: activeBadge: { backgroundColor: colors.primaryBg, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3, borderWidth: 1, ... }
FIX: Use spacing.xxs (2) or spacing.xs (4) instead of the raw literal 3.

**DD100 [low] src/screens/PlansScreen.js:1380**
RULE: styling.md SPACING — off-scale literal
EVIDENCE: actionCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 3 }
FIX: Use spacing.xxs (2) or spacing.xs (4) instead of the raw literal 3.

**DD101 [low] src/screens/PrivacyPolicyScreen.js:18**
RULE: British-English sentence-case app convention for header/section titles (implicit app-wide convention; every sibling BackHeader in this group uses sentence case)
EVIDENCE: <BackHeader title="Privacy Policy" />
FIX: Use sentence case to match every sibling screen in the group ("Your data", "Display & accessibility", "Dietary needs", "Debug logs", "Credits"): title="Privacy policy".

**DD102 [low] src/screens/ProGoalSetupScreen.js:641**
RULE: Spacing scale: hair1/xxs2/xs4/xs2-6/sm8/md12/lg16/xl24/xxl32/xxxl48; off-scale literals are drift
EVIDENCE: showDateInput: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2, fontSize: fontSize.md }
FIX: spacing.md + 2 computes to 14, not a step on the scale. Use spacing.md (12) or spacing.lg (16) directly, matching every other TextField on this screen.

**DD103 [low] src/screens/ProGoalSetupScreen.js:63**
RULE: Title and button-label casing consistency: the app convention is sentence case
EVIDENCE: EQUIPMENT_OPTIONS labels: 'Full Gym', 'Machines & Cables', 'Dumbbells Only', 'Barbell & Plates', 'Home Gym', 'Bodyweight'
FIX: Lower-case these to match the rest of the screen's sentence-case labels, e.g. 'Full gym', 'Machines and cables', 'Barbell and plates', 'Home gym'.

**DD104 [low] src/screens/ProOnboardingScreen.js:2152**
RULE: Spacing — 'Off-scale literals (3, 5, 10, 14…) are drift, pick a step' (styling.md SPACING); spacing scale is hair 1 · xxs 2 · xs 4 · xs2 6 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · xxxl 48
EVIDENCE: input: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: fontSize.md,
  },  // also fieldInput:2163 (spacing.md + 2) and primaryBtn:2283 (spacing.lg + 2)
FIX: Pick a scale step directly (spacing.md=12 or introduce nothing new) rather than computing an off-scale 14/18 via `spacing.X + 2`; three separate sites in this file do this same arithmetic.

**DD105 [low] src/screens/ProgressPhotosScreen.js:2212**
RULE: Spacing scale: 1,2,4,6,8,12,16,24,32,48 -- off-scale literals are drift (styling.md SPACING section)
EVIDENCE: segmentTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 3,
    ...
  },
  segment: {
    ...
    borderRadius: radius.sm - 1,
  },
FIX: Replace `gap: 2` with `spacing.xxs`, and replace `padding: 3` with `spacing.xxs` (2) or `spacing.xs` (4) rather than the off-scale 3; replace the computed `radius.sm - 1` with a named radius token (radius.xs is the nearest sanctioned step) instead of arithmetic off a token.

**DD106 [low] src/screens/ScanBarcodeScreen.js:450**
RULE: 'Use the type roles. Never hand-assemble { fontSize, fontWeight }' (DESIGN_SYSTEM.md Typography)
EVIDENCE: permissionBody: {
    color: colors.textMuted, fontSize: fontSize.md, textAlign: 'center',
    marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 22,
  },
FIX: Replace with ...type.body (fontSize.md/lineHeight 24) or type.bodySm, plus colour/alignment override. Same pattern repeats identically in the sibling ScanLabelScreen.js fallbackBody (lines 478-480) - fix both together.

**DD107 [low] src/screens/SettingsFaqScreen.js:138**
RULE: "Use the type roles, never hand-rolled size/lineHeight pairs." (styling.md, TYPOGRAPHY)
EVIDENCE: intro: { ...type.body, color: colors.textPrimary, lineHeight: 22, marginBottom: spacing.md }
FIX: Drop the raw lineHeight: 22 override; type.body already carries lineHeight 24 (16*1.5). If the tighter leading is deliberate, use type.bodySm instead of overriding type.body's lineHeight by hand.

**DD108 [low] src/screens/ShareCardScreen.js:674**
RULE: Spacing scale: 'Off-scale literals (3, 5, 10, 14...) are drift -- pick a step' (docs/rules/styling.md SPACING)
EVIDENCE: segment: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm + 1, borderRadius: radius.sm,
  },
FIX: Use spacing.sm (8) directly, or spacing.md (12) if the extra height is intentional; `spacing.sm + 1` (9px) is an off-scale computed literal. Same fix applies to the identical line in src/components/BeforeAfterShareSheet.js:746.

**DD109 [low] src/screens/ShareCardScreen.js:629**
RULE: Accessibility: 'accessibilityRole/State/Label on every interactive element' (docs/rules/styling.md HARD RULES)
EVIDENCE: function SegmentBtn({ label, active, onPress, icon }) {
  ...
  return (
    <TouchableOpacity accessibilityRole="button"
      style={[styles.segment, active && [styles.segmentActive, live.segmentActive]]}
      onPress={onPress}
      accessibilityState={{ selected: active }}
    >
FIX: Add accessibilityLabel={label} to this TouchableOpacity, matching the near-identical SegmentBtn in src/components/BeforeAfterShareSheet.js:686 which already sets `accessibilityLabel={label}` on the same control shape.

**DD110 [low] src/screens/SubscriptionPolicyScreen.js:152**
RULE: "Tints: use withAlpha(colour, alpha.X) with the named stops ... Do not invent new alpha values." (styling.md, COLOUR)
EVIDENCE: <View style={[styles.sectionIconWrap, { backgroundColor: withAlpha(tint, 0.125) }]}>
FIX: Use the nearest named stop, alpha.tint (0.12), instead of the raw 0.125 literal: withAlpha(tint, alpha.tint).

**DD111 [low] src/screens/WorkoutHistoryScreen.js:477**
RULE: Skeleton for known-layout first load vs plain text/spinner
EVIDENCE: <Text style={[styles.loadingText, live.loadingText]}>Loading exercises…</Text>
FIX: Low priority (brief, per-row sub-fetch, and an inline caption is explicitly permitted for a minor sub-list), but for full consistency with this screen's own SkeletonRow usage one section above, a couple of SkeletonRow placeholders in exerciseBreakdown's slot would read as one system rather than two different loading idioms on one screen.

**DD112 [low] src/screens/WorkoutSummaryScreen.js:1766**
RULE: Spacing scale - off-scale literals are drift
EVIDENCE: milestoneBody: { ...type.captionTight, color: colors.textSecondary, marginTop: 3 },
FIX: Use spacing.xs2 (6) or spacing.xxs (2), whichever is visually closer, instead of the raw 3.

**DD113 [low] src/screens/YouScreen.js:337**
RULE: COMPONENTS: prefer the shared EmptyState primitive over a bespoke local re-implementation for the same class of state; AnalyticsScreen.js:548-557 handles the identical 'load failed, offer retry' case via EmptyState
EVIDENCE: <Card
            style={[styles.loadErrorCard, live.loadErrorCard]}
            onPress={() => setReloadKey((n) => n + 1)}
            accessibilityLabel="Try loading coach data again"
          >
            <View style={[styles.loadErrorIcon, live.loadErrorIcon]}>
              <Ionicons name="warning-outline" size={18} color={t.colors.warning} />
            </View>
FIX: Consider EmptyState's compact variant (icon/title/text/actionLabel="Retry") for consistency with AnalyticsScreen's identical failure case, or document why this screen's inline degrade-in-place banner needs to stay bespoke (it sits above still-rendering content, unlike Analytics' blocking empty state) -- but the visual language should still match a sibling screen's equivalent state where possible.

---

## Matrix notes worth keeping (from the auditors)

Reference-quality screens to match against: AnalyticsScreen,
WorkoutHistoryScreen, PlanLibraryScreen (correct header + Skeleton +
EmptyState). WorkoutSummaryScreen's headerless live path and
ActiveWorkoutScreen's custom chrome are justified and documented in-file.

---

## ADDENDUM — founder device report 2026-08-06: the check-in results screen

Founder: "Did you check the weekly check in results? As it has very random
look and feel. Text only links and things like that nothing like the rest
of the app. I fear you didn't look nearly well enough."

The founder was right, and the miss is instructive: CoachOutputScreen
carried SIX coexisting tappable treatments (shared Button, two hand-rolled
quiet pills, a success-tinted share chrome, and three bare text-only links:
"See all weeks", "Coaching history", "Done"). Each instance passed the
per-item canon checks because each carried an in-code justification (the
one-amber rule, "quiet link" comments) - the audit judged items against
rules, and nobody judged the PAGE as a whole. Screen-level gestalt is now a
named check class for any future design audit.

FIXED (lead, hands-on): every quiet action on CoachOutputScreen now renders
the shared Button outline variant (amber remains exclusive to the hero
Apply). The success-tinted share entry stays as the documented great-week
framing; the ED-lockout CTA pair is untouched (Section 2). The CO-2 guard
suite re-anchored to the new shared treatment, contract unchanged.
App-wide sweep of the same class: most "link"-named styles are already the
contained pill idiom; NutritionTargetsScreen's bare "Fine-tune these
numbers" converted; ExerciseDetail's goal links were already converted in
lane D1. Underlined links INSIDE running sentences (FoodInsights,
PerDayTargets footnotes) are a legitimate inline-text idiom and stay.

FOUNDER QUESTION (billing-adjacent, not landed): ProUpgradeScreen's quiet
restore/policy caption links are standalone text links too, but they sit on
the paywall where visual weight is conversion-sensitive and platform
convention keeps legal/restore links quiet. Options: (a) leave as the
paywall convention (recorded exception), (b) convert to Button outline sm
like everywhere else. Not pre-decided.
