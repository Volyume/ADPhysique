# Progress Landing Page — Element Inventory
**Campaign 23 Phase 1 (Progress audit), Step 1: Mechanical Element Inventory**

Generated: 2026-08-17

---

## ROUTE MAP (ProgressStack registration)

From `src/navigation/RootNavigator.js` line 478–505 (`ProgressStack` function):

| Route name | Screen file | Component | Gating | Notes |
|---|---|---|---|---|
| Analytics | src/screens/AnalyticsScreen.js | AnalyticsScreen | none | Root of ProgressStack, the landing page under audit |
| WorkoutHistory | src/screens/WorkoutHistoryScreen.js | WorkoutHistoryScreen | none | Opened via "All sessions" button |
| WorkoutSummary | src/screens/WorkoutSummaryScreen.js | WorkoutSummaryScreen | none | Opened from session cards (read-only) |
| VolumeHeatmap | src/screens/VolumeHeatmapScreen.js | VolumeHeatmapScreen | none | "This week's volume" card drill-down |
| BodyMetrics | GatedBodyMetrics (withReadOnlyProGuard) | BodyMetricsScreen | Pro/read-only | Opened from "Body Metrics" nav tile |
| ProgressPhotos | GatedProgressPhotos (withReadOnlyProGuard) | ProgressPhotosScreen | Pro/read-only | Opened from "Progress photos" nav tile (promoted to main) |
| LiftProgress | src/screens/LiftProgressScreen.js | LiftProgressScreen | none | Opened from "Lifts" nav tile or "New PRs" spark card |
| Consistency | src/screens/ConsistencyScreen.js | ConsistencyScreen | none | Opened from "Consistency" nav tile or "Sessions" spark card |
| Partner | GatedPartner (withProGuard) | PartnerScreen | Pro | Opened from "Partners" nav tile |
| ExerciseDetail | src/screens/ExerciseDetailScreen.js | ExerciseDetailScreen (hero-zoom) | none | Reached from various detail screens |
| YearOfLifts | src/screens/YearOfLiftsScreen.js | YearOfLiftsScreen | conditional | Unlocks after 365 days of first workout |
| RecapStory | src/screens/YearOfLiftsScreen.js | YearOfLiftsScreen (as recap) | conditional | Opened from "Recaps" nav tile or recap card; unlocks at 10 sessions |
| ShareCard | src/screens/ShareCardScreen.js | ShareCardScreen | none | Milestone share image destination |
| ProUpgrade | src/screens/ProUpgradeScreen.js | ProUpgradeScreen | modal | Shown when free user taps Pro-gated feature |

---

## LOADER MAP

From `src/hooks/useProgressData.js` (lines 78–546):

| Loader function | Purpose | Reads from (lib function) | File:Line |
|---|---|---|---|
| `useProgressData()` | Main hook, coordinates all data loads | SQLite + cloud | 78–546 |
| `load()` async | Initial + refresh load orchestrator | Multiple | 134–192 |
| `loadMesocycle()` | Active training block, 4-week tonnage sparkline | getAllMesocycles, getActivePlan | 194–226 |
| `loadInsights()` | "For you" coaching insights, computed per user | runInsightsEngine | 256–261 |
| `loadVolumeSnapshot()` | This week's volume by muscle | calculateWeeklyVolume | 263–274 |
| `loadDeloadCheck()` | Deload alert logic (soreness, joint, volume, week count) | calculateWeeklyVolume, shouldDeload | 276–353 |
| `loadPRBars()` | Personal record count per week (30d or 90d window) | computePRsPerWeek | 355–363 |
| `loadCalendar()` | Workout activity calendar (84 days) | localDayKey | 365–387 |
| `loadRecentSessions()` | Latest 3 completed workouts | getAllWorkouts (filtered) | 389–396 |
| `loadSessionDurationTrend()` | 6-week session length trend | averages per week | 398–437 |
| `loadMuscleFrequency()` | Muscle group frequency (this week vs last week) | Set counts by muscle | 439–485 |
| `loadFatigueTrend()` | Recent workout feedback (last 6 sessions) | getRecentWorkoutFeedback | 228–235 |
| `loadBlockState()` | Current mesocycle week, planned muscle volume | getCurrentMesocycleWeek, getPlannedMuscleVolume | 237–254 |
| `computePRsPerWeek()` | Bins novel 1RM achievements per week | calculate1RM | 23–73 |

**Data persistence:** AsyncStorage (recap card dismiss key `@volyume_recap_card_${recapMonthKey}`, trends-start momentum dismiss key `@volyume_seen_trends_start`); SQLite for all workout/set/exercise reads via database.js.

---

## STRING DUMP

Every user-facing string rendered by AnalyticsScreen.js and its directly rendered components:

| String | Context | Component | File:Line |
|---|---|---|---|
| "Progress" | Screen header title | ScreenHeader | AnalyticsScreen.js:309 |
| "${formatTonnage(tonnageLandmark)} ${units === 'lbs' ? 'lbs' : 'kg'} lifted all-time. That's what showing up adds up to." | Milestone text | AnalyticsScreen.js body | 370 |
| "Create share image" | Tonnage CTA button title | Button | 377 |
| "Couldn't load your training trends" | Error state title | EmptyState | 409 |
| "Check your connection and try again. Your data is safe on this device." | Error state body | EmptyState | 410 |
| "Retry" | Error state action button | EmptyState | 411 |
| "No training trends yet" | Empty state title | EmptyState | 429 |
| "Training charts appear here once sessions are logged. Body metrics, progress photos and scans are still available below." | Empty state body (Pro) | EmptyState conditional | 431 |
| "Training charts appear here once sessions are logged. Your consistency, lifts and full history are still available below." | Empty state body (free) | EmptyState conditional | 432 |
| "Good start. A couple more sessions and your trends really take shape." | Near-empty momentum note | AnalyticsScreen.js | 443 |
| "Dismiss" | Momentum note close button a11y label | TouchableOpacity | 449 |
| "Your ${recentMonthRecapParams(earliestWorkoutAt).monthLabel.replace(' so far', '')} recap is ready - 45 seconds" | Recap card text | AnalyticsScreen.js | 467 |
| "Dismiss" | Recap card close button a11y label (duplicate) | TouchableOpacity | 473 |
| "For you" | Insights section label | SectionLabel | 483 |
| "Dismiss insight" | Insight row close button a11y label | TouchableOpacity (InsightRow) | 741 |
| "Partners" | Nav tile label | NavTile | 500 |
| "Progress photos" | Nav tile label (promoted) | NavTile | 515 |
| "Your trend" | Weight trend card label | WeightTrendCard | 91 |
| "Recent sessions" | Section label | SectionLabel | 539 |
| "All sessions" | Button title (see all sessions) | Button | 546 |
| "See all sessions" | Button a11y label | Button | 548 |
| "${name}" (session name or "Session") | Session card title | SessionCard | 972 |
| "${safeFormatDate(at, 'EEE d MMM')} - ${workout.durationMinutes}m" | Session card metadata (date + duration) | SessionCard | 974 |
| "${diff}/10" | Session difficulty chip | SessionCard | 981 |
| "View summary for ${name}" | Session card a11y label | Card | 969 |
| "This week's volume" | Section label | SectionLabel | 590 |
| "Working sets per muscle this week, measured against your targets.\n\nTap to see every muscle on the heatmap." | Volume info tooltip | InfoTooltip | 592–594 |
| "Nothing logged this week yet." | Volume empty state | VolumeSummaryStrip | 774 |
| "This week's volume. Open the heatmap." | Volume card a11y label (empty) | Card | 772 |
| "${trained.length}" (number) | Trained muscle count | VolumeSummaryStrip | 808 |
| "${trained.length === 1 ? 'muscle trained' : 'muscles trained'}" | Trained label | VolumeSummaryStrip | 810 |
| "All in range" | Volume status text (all in target) | VolumeSummaryStrip | 815 |
| "${f.n} ${f.label}" (e.g. "2 below target") | Volume flag text | VolumeSummaryStrip | 819 |
| "This week's volume by muscle. Open the heatmap." | Volume card a11y label (loaded) | Card | 804 |
| "Training load" | A5 hero eyebrow | TrainingLoadHero | 868 |
| "Training load. ${weekLabel}: ${formatNumber(active.value)} ${unit} lifted." | A5 hero a11y label | Card | 867 |
| "${formatNumber(active.value)} ${unit}" | A5 hero rolling number a11y label | RollingNumber | 873 |
| "${unit}" (kg or lbs) | A5 hero unit text | TrainingLoadHero | 875 |
| "${weekLabel} - weight lifted" | A5 hero subtext (e.g. "This week - weight lifted") | TrainingLoadHero | 877 |
| "${series.length - 1} weeks ago" | A5 hero chart axis label (left) | TrainingLoadHero | 896 |
| "this week" | A5 hero chart axis label (right) | TrainingLoadHero | 897 |
| "Create share image" | A5 training load CTA button (duplicate) | Button | 908 |
| "Create share image" | A5 training load CTA a11y label | Button | 910 |
| "Sessions" | Spark card label (sessions) | SparkCard | 333 |
| "${sessionSpark.total}" (number) | Spark card value | SparkCard | 334 |
| "Last 30 days" | Spark card sub-text | SparkCard | 335 |
| "Sessions. ${sessionSpark.total} in the last 30 days. Opens consistency." | Spark card a11y label | SparkCard | 338 |
| "New PRs" | Spark card label (PRs) | SparkCard | 341 |
| "${prSpark.total}" (number) | Spark card value (PR count) | SparkCard | 342 |
| "Last 30 days" | Spark card sub-text (duplicate) | SparkCard | 343 |
| "New personal records. ${prSpark.total} in the last 30 days. Opens lifts." | Spark card a11y label | SparkCard | 346 |
| "Lifetime totals" | Section label | SectionLabel | 620 |
| "${formatNumber(completedWorkoutCount)}" | Lifetime sessions value | AnalyticsScreen.js | 625 |
| "${completedWorkoutCount === 1 ? 'session' : 'sessions'}" | Lifetime sessions label | AnalyticsScreen.js | 627 |
| "${formatNumber(lifetimeTonnage)}" | Lifetime tonnage value | AnalyticsScreen.js | 633 |
| "${units === 'lbs' ? 'lbs lifted' : 'kg lifted'}" | Lifetime tonnage label | AnalyticsScreen.js | 635 |
| "${formatNumber(lifetimeReps)}" | Lifetime reps value | AnalyticsScreen.js | 639 |
| "${lifetimeReps === 1 ? 'rep' : 'reps'}" | Lifetime reps label | AnalyticsScreen.js | 641 |
| "More stats" | Section label (renamed from "Explore") | SectionLabel | 654 |
| "Consistency" | Nav tile label | NavTile | 656 |
| "Lifts" | Nav tile label | NavTile | 657 |
| "Body Metrics" | Nav tile label | NavTile | 664 |
| "Full History" | Nav tile label | NavTile | 667 |
| "Recaps" | Nav tile label | NavTile | 681 |
| "${toGo} session${toGo === 1 ? '' : 's'} to go" | Recaps locked subtitle (countdown) | NavTile | 683 |
| "Your first monthly recap is ready after ${RECAP_GATE} logged sessions. ${toGo} to go." | Recaps locked toast (info variant) | Toast | 690 |
| "Year of Lifts" | Nav tile label (conditional) | NavTile | 707 |

**Sheet/modal strings (InfoTooltip modal opened from info icon):**

- GLOSSARY.ewma (weight trend EWMA explanation) — from src/lib/coachGlossary.js, displayed in WeightTrendCard line 92

---

## CONTAINER COUNT

Bordered or backgrounded containers in render order (top to bottom):

1. SafeAreaView (full screen background) — line 296
2. ScrollView (content container) — line 297
3. A5 dashboard SkeletonCard (loading state, variable qty 3 cards) — line 320, 321, 322, 323
4. A5 dashboard AnimatedEntrance wrapper — line 328
5. A5 TrainingLoadHero Card — line 330
6. A5 SparkCard (Sessions) — line 332
7. A5 SparkCard (New PRs) — line 340
8. Tonnage milestone row (View container) — line 366
9. Tonnage milestone card (View container with flex row) — line 367
10. Load error EmptyState card — line 407
11. Empty state (no trends) EmptyState card — line 427
12. Momentum note row (View container, raw text + close) — line 441
13. Recap card (TouchableOpacity, full-width banner-style) — line 458
14. Insights section View — line 482
15. InsightRow Card (per insight, with left border accent) — line 732
16. Nav tile section View (Partners + ProgressPhotos) — line 495
17. NavTile (Partners) — line 497
18. NavTile (ProgressPhotos) — line 512
19. Weight trend section View — line 526
20. WeightTrendCard (Card, with sparkline chart) — line 530
21. Recent sessions section View — line 537
22. Recent sessions row header (View flex-row for label + CTA) — line 538
23. SessionCard (per recent session, variable qty ≤3) — line 565
24. Volume section View — line 588
25. Volume section header row (View with label + info icon) — line 589
26. VolumeSummaryStrip Card (empty or loaded state) — line 769 / 800
27. Lifetime totals section View — line 619
28. Lifetime totals Card (flex-row 3-cell panel) — line 623
29. More stats section View — line 653
30. Nav tile grid View (6 tiles) — line 655

**Total: 30 major container nodes.**

---

## CTA COUNT

Every tappable affordance on the landing page (in render order):

| # | Label | Component | File:Line | Action | Route/handler |
|---|---|---|---|---|---|
| 1 | "Create share image" (tonnage) | Button variant="outline" | AnalyticsScreen.js:373 | makeTonnageCard() | navigates('ShareCard', { milestoneData: { ... } }) — line 131 |
| 2 | "Sessions" spark card | SparkCard (Card onPress) | AnalyticsScreen.js:332 | onPress | navigates('Consistency') — line 337 |
| 3 | "New PRs" spark card | SparkCard (Card onPress) | AnalyticsScreen.js:340 | onPress | navigates('LiftProgress') — line 345 |
| 4 | "Retry" (error state) | EmptyState actionLabel + onAction | AnalyticsScreen.js:412 | onAction={handleRefresh} | handleRefresh() — calls load() — line 498 |
| 5 | Momentum note close | TouchableOpacity (close icon) | AnalyticsScreen.js:445 | dismissTrendsStart() | AsyncStorage.setItem('@volyume_seen_trends_start', 'dismissed') — line 272 |
| 6 | Recap card (main area tap) | TouchableOpacity entire card | AnalyticsScreen.js:458 | onPress | dismissRecapCard() + navigates('RecapStory', recentMonthRecapParams()) — line 461 |
| 7 | Recap card close | TouchableOpacity (close icon) | AnalyticsScreen.js:469 | dismissRecapCard() | AsyncStorage.setItem(`@volyume_recap_card_${recapMonthKey}`, 'dismissed') — line 256 |
| 8 | Insight row (each insight) | InsightRow Card onPress | InsightRow:732 | TRACE-NEEDED (no onPress observed; card renders but tap action unclear) | TRACE-NEEDED |
| 9 | Insight close button (each insight) | TouchableOpacity (close icon) | InsightRow:735 | handleDismiss(ins.id) | dismissInsight(insightId) — line 488 |
| 10 | "Partners" nav tile | NavTile TouchableOpacity | AnalyticsScreen.js:497 | onPress | trackPartnerSurfaceView('progress_tile') + navigates('Partner', { source: 'progress_tile' }) — line 503 |
| 11 | "Progress photos" nav tile | NavTile TouchableOpacity | AnalyticsScreen.js:512 | onPress | navigates('ProgressPhotos') — line 517 |
| 12 | Weight trend card info icon | InfoTooltip trigger | WeightTrendCard.js:92 | setVisible(true) | Opens modal with GLOSSARY.ewma text — line 54 |
| 13 | Weight trend card (card itself) | Card (no onPress) | WeightTrendCard.js:85 | TRACE-NEEDED | No navigation observed |
| 14 | "All sessions" button | Button variant="outline" | AnalyticsScreen.js:541 | onPress | navigates('WorkoutHistory') — line 547 |
| 15 | Session card (each of ≤3) | SessionCard Card onPress | AnalyticsScreen.js:565 | onPress | navigates('WorkoutSummary', { workoutId, ... readOnly: true }) — line 568 |
| 16 | "This week's volume" card | VolumeSummaryStrip Card onPress | AnalyticsScreen.js:596 | onPress | navigates('VolumeHeatmap') — line 600 |
| 17 | "Consistency" nav tile | NavTile TouchableOpacity | AnalyticsScreen.js:656 | onPress | navigates('Consistency') — line 656 |
| 18 | "Lifts" nav tile | NavTile TouchableOpacity | AnalyticsScreen.js:657 | onPress | navigates('LiftProgress') — line 657 |
| 19 | "Body Metrics" nav tile | NavTile TouchableOpacity | AnalyticsScreen.js:664 | onPress | navigates('BodyMetrics') — line 664 |
| 20 | "Full History" nav tile | NavTile TouchableOpacity | AnalyticsScreen.js:667 | onPress | navigates('WorkoutHistory') — line 667 |
| 21 | "Recaps" nav tile (unlocked) | NavTile TouchableOpacity | AnalyticsScreen.js:678 | onPress (if recapUnlocked) | navigates('RecapStory', recentMonthRecapParams(earliestWorkoutAt)) — line 693 |
| 22 | "Recaps" nav tile (locked) | NavTile TouchableOpacity | AnalyticsScreen.js:678 | onPress (if !recapUnlocked) | toast.show(...) info toast, no navigation — line 690 |
| 23 | "Year of Lifts" nav tile | NavTile TouchableOpacity | AnalyticsScreen.js:704 | onPress | navigates('YearOfLifts') — line 708 |
| 24 | Training load hero chart | VolyumeChart (interactive, scrub) | TrainingLoadHero.js:883 | onScrubIndex={setScrubIdx} | Updates displayed week number in hero (no navigation) — line 890 |
| 25 | "Create share image" (training load) | Button variant="outline" | TrainingLoadHero.js:904 | onPress={onMakeCard} | makeTrainingLoadCard() — navigates('ShareCard', { milestoneData: { ... } }) — line 199 |
| 26 | RefreshControl (scroll-to-refresh) | RefreshControl onRefresh | AnalyticsScreen.js:303 | handleRefresh | load() async refresh — line 498 |
| 27 | Tab press (re-tap Progress tab) | Navigation tabPress listener | AnalyticsScreen.js:148 | tabPress event | scrollRef.current?.scrollTo({ y: 0, animated: true }) — line 149 |

**Total: 27 tappable affordances** (excluding RefreshControl + tab press which are chrome, count **25 primary CTAs** for user-initiated navigation/action).

---

## CONDITIONAL BRANCHES

Every branch that changes rendered content (quoted exact code):

| Branch | Condition | Renders | File:Line |
|---|---|---|---|
| A5 dashboard state | `loading && (...)` | SkeletonCards × 3 | 318–326 |
| A5 dashboard content | `!loading && enoughForTrends && (...)` | TrainingLoadHero + SparkRow | 327–351 |
| Tonnage milestone card | `tonnageLandmark ? (...) : null` | Milestone row with "Create share image" CTA | 365–383 |
| Skeletons below hero | `loading && (...)` | SkeletonCards for insights | 390–396 |
| Load error state | `!loading && loadError && allSets.length === 0` | EmptyState "Couldn't load..." | 406–415 |
| Empty state (no data) | `!loading && !loadError && allSets.length === 0` | EmptyState "No training trends yet" (tier-conditional text) | 426–434 |
| Empty state text (tier) | `tier === 'pro' ? ... : ...` | Conditional copy (Pro: "Body metrics, progress photos and scans"; free: "Your consistency, lifts and full history") | 430–432 |
| Momentum note | `!loading && !trendsStartHidden && allSets.length > 0 && completedWorkoutCount > 0 && completedWorkoutCount < 3` | "Good start" text row with close button | 440–454 |
| Recap card | `!recapCardHidden && (...)` | Recap nudge banner (dismissable) | 457–478 |
| Insight stack | `insights.length > 0 && (...)` | "For you" section with insight rows | 481–488 |
| Partners + ProgressPhotos tiles | Always renders | NavTile × 2 (Partners, ProgressPhotos) | 495–520 |
| Weight trend card (Pro-gated) | `tier === 'pro' && weightTrend.render && (...)` | WeightTrendCard (self-hides until data exists via `weightTrend.render`) | 525–532 |
| Recent sessions section | `recentSessions.length > 0 && (...)` | "Recent sessions" section with SessionCards × ≤3 | 536–584 |
| Volume section | `hasData && (...)` | "This week's volume" section with VolumeSummaryStrip | 587–603 |
| Volume empty (while loading) | `trained.length === 0 && loading` | null (no render) | 767 |
| Volume empty (loaded, no sets) | `trained.length === 0 && !loading` | Card "Nothing logged this week yet." | 769–776 |
| Volume loaded | `trained.length > 0` | VolumeSummaryStrip with muscle count, flags, stacked bar | 799–834 |
| Lifetime totals section | `hasData && completedWorkoutCount > 0 && (...)` | "Lifetime totals" panel (3 cells: sessions, tonnage, reps) | 618–646 |
| Recaps tile (locked) | `!recapUnlocked` | NavTile with dimmed look, "sessions to go" subtitle, toast on tap | 678–697 |
| Recaps tile (unlocked) | `recapUnlocked` | NavTile open, navigates to RecapStory | 684–694 |
| Year of Lifts tile | `unlocked` (365 days from first workout) | NavTile rendered (conditional return null if unlocked === false) | 698–712 |
| Insight severity icon/color | `buildSeverityStyle(t.colors)[insight.severity ?? 0]` | Icon + color per severity (0=info, 1=alert, 2=warning) | 729, 733 |
| Session difficulty chip | `diff != null` | Chip showing "diff/10" (else null) | 978–984 |
| NavTile locked state | `locked && styles.navTileLocked` | Dimmed opacity, time-outline icon, countdown sub-text | 1010, 1019, 1028 |
| NavTile Pro badge | `pro ? <ProBadge size="sm" /> : null` | ProBadge shown when pro={true} | 1025 |
| WeightTrendCard sparkline | `hasSparkline && lineData.length >= 2` | VolyumeChart line + raw sparkle | 95–111 |
| WeightTrendCard stat row | `state >= 2 && ewmaNow != null` | EWMA value + weekly rate text | 115–120 |
| WeightTrendCard insight | Always renders if vm.insight | Insight sentence + state dot | 124–129 |
| WeightTrendCard maintenance | `maintenance && (...)` | Either "building..." or maintenance estimate block | 131–144 |
| WeightTrendCard step trend | `stepTrendLine && ...` | Step-trend italic footnote (if modifier flag set) | 148 |
| Spark chart render | `chartW > 0 && (...)` | VolyumeChart after onLayout measures width | 882–893 (TrainingLoadHero), 940–948 (SparkCard) |

**Total: 21 distinct conditional branches affecting layout/visibility.**

---

## ELEMENT-BY-ELEMENT INVENTORY

### Section 1: Header & A5 Dashboard

| ELEMENT_ID | VISIBLE COPY | COMPONENT | SOURCE FILE(S) | DATA AUTHORITY | WHEN VISIBLE | TIER | ACTION | DESTINATION | DISMISSAL | PERSISTENCE | USER CAN ACT? | VOLYUME ACTS? | VISUAL WEIGHT | SCREEN POSITION | PRODUCT PURPOSE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| screen-header | "Progress" | ScreenHeader | AnalyticsScreen.js:309 / ScreenHeader.js | Hard-coded title; brand mark from VolyumeIcon | Always | both | None on header itself; tap brand → none | N/A | N/A | N/A | No | No | Full-width header band | Position 1 (topmost) | Screen identity and navigation context |
| training-load-hero | "Training load\n${weekLabel} - weight lifted\n${formatNumber(active.value)} ${unit}" (e.g. "This week - weight lifted\n1,248 kg") | TrainingLoadHero (Card) | AnalyticsScreen.js:330 / TrainingLoadHero.js:846 | buildWeeklyLoadSeries(allSets, exerciseTypeById) — src/lib/progressSeries.js; current week taken from series[lastIdx].value | `!loading && enoughForTrends && (...)` (≥3 workout sessions) | both | Scrub interactive chart OR tap "Create share image" | ShareCard (training load milestone data) | N/A | Derived each load from allSets; chart state (scrubIdx) local to component | Yes (chart scrub, CTA) | Yes (tracks milestones internally via fireLandmarkOnce for training load, but founder removed COMP-018 strip) | Large bordered card (~176px height) with chart area | Position 2 | Shows training volume trend over 8 rolling weeks, this week highlighted |
| sessions-spark | "Sessions\n${sessionSpark.total}\nLast 30 days" (e.g. "Sessions\n12\nLast 30 days") | SparkCard (Card) | AnalyticsScreen.js:332 / SparkCard.js:923 | buildWeeklySessionCounts(allSets) binned into 30-day weekly bars — src/lib/progressSeries.js | `!loading && enoughForTrends && (...)` | both | Tap card | navigates('Consistency') | N/A | Series rebuilt on each load via useMemo | Yes | Yes (shows sparkline bars, no action initiated) | Half-width card (~116px height) | Position 3a (left, SparkRow) | Session frequency over last 30 days in weekly buckets |
| new-prs-spark | "New PRs\n${prSpark.total}\nLast 30 days" (e.g. "New PRs\n5\nLast 30 days") | SparkCard (Card) | AnalyticsScreen.js:340 / SparkCard.js:923 | computePRsPerWeek(allSets, exerciseMap, 30) bins novel 1RM records per week — src/hooks/useProgressData.js:23–73 | `!loading && enoughForTrends && (...)` | both | Tap card | navigates('LiftProgress') | N/A | Series rebuilt on each load | Yes | Yes (shows sparkline bars with gold colour for PR weeks) | Half-width card (~116px height) | Position 3b (right, SparkRow) | Personal record count over last 30 days in weekly buckets |

### Section 2: Tonnage Milestone & Load States

| ELEMENT_ID | VISIBLE COPY | COMPONENT | SOURCE FILE(S) | DATA AUTHORITY | WHEN VISIBLE | TIER | ACTION | DESTINATION | DISMISSAL | PERSISTENCE | USER CAN ACT? | VOLYUME ACTS? | VISUAL WEIGHT | SCREEN POSITION | PRODUCT PURPOSE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tonnage-landmark | "${formatTonnage(tonnageLandmark)} ${units === 'lbs' ? 'lbs' : 'kg'} lifted all-time. That's what showing up adds up to." (e.g. "5,000 kg lifted all-time. That's what showing up adds up to.") | Text (milestoneText) + Button "Create share image" | AnalyticsScreen.js:369–381 | getLifetimeTonnage(user.id); pendingTonnageMilestone(tonnage, seen) computes next milestone threshold — src/lib/tonnageMilestone.js | `tonnageLandmark ? (...) : null` (when a new lifetime tonnage milestone threshold is crossed) | both (free-safe, tonnage only) | Tap "Create share image" button | ShareCard with milestoneData: { eyebrow: 'Lifetime total', title: 'Total weight lifted', heroValue: formatTonnage(tonnageLandmark), heroUnit: '${u} lifted', caption: 'Every working set...', stats: [] } | N/A | Tonnage milestone state tracked in useState(tonnageLandmark); markTonnageMilestoneSeen(user.id, milestone) saves to DB on CTA tap | Yes (CTA) | Yes (fires telemetry once per threshold via fireLandmarkOnce('tn:${pending}', ...)) | Row container (flex, icon + text + button) | Position 4 (after dashboard, if milestone triggered) | Reflects accumulated training volume achievement since user start |
| load-error-state | "Couldn't load your training trends\nCheck your connection and try again. Your data is safe on this device.\n[Retry button]" | EmptyState | AnalyticsScreen.js:407–415 | useProgressData().loadError (set to true if load() catch block fires and allSets.length === 0) | `!loading && loadError && allSets.length === 0` | both | Tap "Retry" → handleRefresh() → load() | N/A (retry re-runs same screen data) | N/A | loadError cleared on successful re-fetch; AsyncStorage offline caches workout data (not displayed in error state) | Yes (Retry CTA) | Yes (initiates full data refresh) | Full-width card, centered, icon + headline + subtext + button | Position 5 (if data fetch fails on app load) | Network/data availability diagnostic |
| empty-state-no-trends | "No training trends yet\n${tier === 'pro' ? 'Training charts appear here once sessions are logged. Body metrics, progress photos and scans are still available below.' : 'Training charts appear here once sessions are logged. Your consistency, lifts and full history are still available below.'}" | EmptyState | AnalyticsScreen.js:426–434 | allSets.length === 0 (no workouts logged yet) | `!loading && !loadError && allSets.length === 0` | both (text branches on tier) | None (no CTA on this empty state) | N/A | N/A | None (permanent while user has 0 workouts) | No | No | Full-width card, centered, icon + headline + subtext | Position 6 (if user has never logged a session) | Onboarding scaffold; encourages first workout |
| momentum-note | "Good start. A couple more sessions and your trends really take shape.\n[close button]" | Text (momentumText) + TouchableOpacity close | AnalyticsScreen.js:440–454 | completedWorkoutCount (1–2 sessions, first 7 days of month) | `!loading && !trendsStartHidden && allSets.length > 0 && completedWorkoutCount > 0 && completedWorkoutCount < 3` | both | Tap close → dismissTrendsStart() | N/A | AsyncStorage.setItem('@volyume_seen_trends_start', 'dismissed'); once dismissed, trendsStartHidden stays true for session | Yes (close button) | Yes (AsyncStorage flag prevents re-render after dismiss) | Row container (flex, text + close icon on right) | Position 7 (between empty-state and insights if user in early ramp-up phase) | Encouragement milestone at near-empty state |

### Section 3: Recap Card & Insights

| ELEMENT_ID | VISIBLE COPY | COMPONENT | SOURCE FILE(S) | DATA AUTHORITY | WHEN VISIBLE | TIER | ACTION | DESTINATION | DISMISSAL | PERSISTENCE | USER CAN ACT? | VOLYUME ACTS? | VISUAL WEIGHT | SCREEN POSITION | PRODUCT PURPOSE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| recap-card | "🗞️ Your ${recentMonthRecapParams(earliestWorkoutAt).monthLabel.replace(' so far', '')} recap is ready - 45 seconds\n[close button]" (e.g. "🗞️ Your June recap is ready - 45 seconds") | TouchableOpacity + Text + close TouchableOpacity | AnalyticsScreen.js:457–478 | recentMonthRecapParams(earliestWorkoutAt) computes based on earliest session date; completedWorkoutCount ≥ 10 | `!recapCardHidden && (...) && new Date().getDate() <= 7 && completedWorkoutCount >= 10` (first 7 days of calendar month, after 10 sessions logged) | both | Tap card → dismissRecapCard() + navigate('RecapStory', recentMonthRecapParams(...)) | RecapStory (YearOfLiftsScreen as recap variant) | Tap close button OR open card; AsyncStorage.setItem(`@volyume_recap_card_${recapMonthKey}`, 'dismissed') | AsyncStorage key per calendar month `@volyume_recap_card_yyyy-MM`; dismissed state checked on mount | Yes (tap anywhere OR close button) | Yes (fires dismissRecapCard on tap, which sets AsyncStorage flag + local state) | Full-width banner-style card (flex row, icon + text + close) | Position 8 (if within date window and session gate met) | Monthly recap nudge; time-bounded, ephemeral |
| insights-header | "For you" | SectionLabel | AnalyticsScreen.js:483 | Hard-coded label | `insights.length > 0` | both | None (label only) | N/A | N/A | N/A | No | No | Section overline/label (small type) | Position 9 (section marker) | Groups coaching insights |
| insight-row | "${insight.copy}" (dynamic per insight engine output; e.g. "Your training volume is trending over your targets this week. Consider deloading next week.") + severity icon | InsightRow (Card + icon + dismiss) | AnalyticsScreen.js:484–486 / InsightRow.js:725–747 | runInsightsEngine(user.id) — src/lib/database.js; returned insight.copy, .id, .severity | `insights.length > 0 && insights.map(ins => ...)` (renders once per insight, variable qty) | both | Tap close button → handleDismiss(ins.id) | N/A (dismisses from list locally) | Database; dismissInsight(insightId) deletes from insights table; local state updates immediately | Yes (close button) | Yes (fires dismissInsight on close, removes from DB) | Card with left-border accent (coloured by severity: primary/warning/error) | Position 10+ (repeated per insight, under "For you" header) | Contextual coaching signals based on training data |

### Section 4: Navigation Tiles & Pro Gating

| ELEMENT_ID | VISIBLE COPY | COMPONENT | SOURCE FILE(S) | DATA AUTHORITY | WHEN VISIBLE | TIER | ACTION | DESTINATION | DISMISSAL | PERSISTENCE | USER CAN ACT? | VOLYUME ACTS? | VISUAL WEIGHT | SCREEN POSITION | PRODUCT PURPOSE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| partners-tile | "👥 Partners" + ProBadge (if free) | NavTile | AnalyticsScreen.js:497–506 | tier check from useAppStore | Always (always visible, gated by route) | free: shows lock badge; pro: open | Tap tile → trackPartnerSurfaceView('progress_tile') + navigate('Partner', { source: 'progress_tile' }) | Partner (if pro) OR ProUpgrade (if free, via route-level guard) | N/A | tier state from store | Yes | Yes (calls trackPartnerSurfaceView telemetry on tap) | Grid tile, icon + label + badge | Position 11a (Partners + ProgressPhotos in 2-column row) | Destination tile for partner co-training feature (Pro-only) |
| progress-photos-tile | "📷 Progress photos" + ProBadge (if free) | NavTile | AnalyticsScreen.js:512–518 | tier check from useAppStore | Always (promoted from Body Metrics grid as of audit 2026-07-03) | free: shows lock badge; pro: open | Tap tile → navigate('ProgressPhotos') | ProgressPhotos (if pro, read-only view available for users with data) OR ProUpgrade (if free) | N/A | tier state from store | Yes | No (no telemetry on tap observed) | Grid tile, icon + label + badge | Position 11b (right of Partners tile) | Destination tile for progress photo logging (Pro-only) |

### Section 5: Weight Trend (Pro Feature)

| ELEMENT_ID | VISIBLE COPY | COMPONENT | SOURCE FILE(S) | DATA AUTHORITY | WHEN VISIBLE | TIER | ACTION | DESTINATION | DISMISSAL | PERSISTENCE | USER CAN ACT? | VOLYUME ACTS? | VISUAL WEIGHT | SCREEN POSITION | PRODUCT PURPOSE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| weight-trend-card | "Your trend\n${formatBodyWeight(ewmaNow, bodyWeightUnits)}\n${showRate ? rateText : ''}\n${insight}\n${maintenance ? (building ? 'Your coach is building...' : '~${formatWithUnit(maintenance.kcal)} kcal/day estimated maintenance...') : ''}" (multi-line, complex structure) | WeightTrendCard (Card) | AnalyticsScreen.js:525–532 / WeightTrendCard.js:44–151 | useWeightTrend(tier === 'pro' ? user?.id : null) hook; derives EWMA smoothing + weekly rate from body weight logs | `tier === 'pro' && weightTrend.render` (self-hides until ≥2 logged weights exist; Pro-only) | pro only | Tap info icon → opens InfoTooltip modal with GLOSSARY.ewma text | N/A (info modal only) | Chart sparkline state internal to component; EWMA data persisted in body_metrics table | Yes (info tooltip tap) | Yes (renders EWMA chart, calculates maintenance estimate) | Full-width card with sparkline chart, multi-row layout | Position 12 (if Pro tier and weight logs exist) | Smooth weight trend + maintenance estimate read-only view |

### Section 6: Recent Sessions

| ELEMENT_ID | VISIBLE COPY | COMPONENT | SOURCE FILE(S) | DATA AUTHORITY | WHEN VISIBLE | TIER | ACTION | DESTINATION | DISMISSAL | PERSISTENCE | USER CAN ACT? | VOLYUME ACTS? | VISUAL WEIGHT | SCREEN POSITION | PRODUCT PURPOSE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| recent-sessions-header | "Recent sessions\n[All sessions button]" (section label + CTA row) | SectionLabel + Button | AnalyticsScreen.js:538–550 | recentSessions = latest 3 completed workouts (loaded via loadRecentSessions()) | `recentSessions.length > 0` | both | "All sessions" button → navigate('WorkoutHistory') | WorkoutHistory (full session list screen) | N/A | recentSessions array built on each data load from DB | Yes (All sessions CTA) | No (label only) | Section label row (flex between label + button) | Position 13 (section marker) | Gateway to recent session review |
| session-card | "${name}\n${safeFormatDate(at, 'EEE d MMM')} ${durationMinutes}m\n${diff != null ? `${diff}/10` : ''}" (e.g. "Upper Body\nWed 15 Aug 45m\n7/10") | SessionCard (Card) | AnalyticsScreen.js:551–582 / SessionCard.js:958–988 | Workout name, startedAt/createdAt, durationMinutes, sessionDifficulty from getAllWorkouts(); exercise list computed from mySets = allSets.filter(s => s.workoutId === w.id) | `recentSessions.map(w => ...)` (variable qty, typically ≤3) | both | Tap card → navigate('WorkoutSummary', { workoutId, ..., readOnly: true, ... }) | WorkoutSummary (read-only session detail view) | N/A | Workout history persisted in workouts table; summary computed on each screen render | Yes (tap card) | Yes (computes exercise count, set count, tonnage for WorkoutSummary params) | Card, flex row (name + date on left, difficulty chip on right, chevron) | Position 14+ (repeated per recent session, ≤3 cards) | Quick access to latest session details |

### Section 7: Volume Summary & Lifetime Totals

| ELEMENT_ID | VISIBLE COPY | COMPONENT | SOURCE FILE(S) | DATA AUTHORITY | WHEN VISIBLE | TIER | ACTION | DESTINATION | DISMISSAL | PERSISTENCE | USER CAN ACT? | VOLYUME ACTS? | VISUAL WEIGHT | SCREEN POSITION | PRODUCT PURPOSE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| volume-section-header | "This week's volume\n[info tooltip icon]" | SectionLabel + InfoTooltip | AnalyticsScreen.js:589–595 | weeklyVolume (calculateWeeklyVolume over sets since localWeekStartMs()) | `hasData && (...)` (if any sets logged) | both | Info icon → opens InfoTooltip modal "Working sets per muscle this week, measured against your targets. Tap to see every muscle on the heatmap." | N/A (info modal only) | N/A | N/A | Yes (info icon tap) | No (label only, but component below has data) | Section label row (flex, label + small info icon) | Position 15 (section marker) | Groups volume summary card |
| volume-summary-card-empty | "Nothing logged this week yet." | VolumeSummaryStrip Card | AnalyticsScreen.js:769–776 | weeklyVolume (empty object or all muscles have 0 workingSets) | `hasData && trained.length === 0 && !loading` | both | Tap card → navigate('VolumeHeatmap') | VolumeHeatmap (full muscle matrix view) | N/A | Derived fresh each load from allSets | Yes (card tap) | No (renders empty state, no data) | Card, minimal height | Position 16a (if no volume logged this week) | Empty-state scaffold |
| volume-summary-card-loaded | "${trained.length} muscle${trained.length === 1 ? '' : 's'} trained\n${flags.length === 0 ? 'All in range' : flags.map(f => '${f.n} ${f.label}')}\n[stacked bar chart by muscle]" (e.g. "4 muscles trained\n1 over max\n[coloured bar segments]") | VolumeSummaryStrip Card | AnalyticsScreen.js:793–834 | calculateWeeklyVolume(sets since localWeekStartMs(), exMap); buildVolumeStatusColor(t.colors) resolves muscle status (below MEV, in range, over MRV) | `hasData && trained.length > 0` (if sets logged this week + at least one muscle with working sets) | both | Tap card OR any segment of bar → navigate('VolumeHeatmap') | VolumeHeatmap | N/A | Derived fresh each load; muscle order (widest first) computed in-component | Yes (card tap) | Yes (renders inline stacked bar chart, calculates below/over flags) | Card with bar chart section, two-tier layout (top: count + flags, bottom: bar) | Position 16b (if volume logged this week) | Weekly per-muscle training load snapshot |
| lifetime-header | "Lifetime totals" | SectionLabel | AnalyticsScreen.js:620 | completedWorkoutCount (derived from getAllWorkouts().filter(w => w.isCompleted)) | `hasData && completedWorkoutCount > 0` | both | None (label only) | N/A | N/A | N/A | No | No | Section overline/label | Position 17 (section marker) | Groups lifetime stats |
| lifetime-panel | "${formatNumber(completedWorkoutCount)}\n${completedWorkoutCount === 1 ? 'session' : 'sessions'}\n|\n${formatNumber(lifetimeTonnage)}\n${units === 'lbs' ? 'lbs lifted' : 'kg lifted'}\n|\n${formatNumber(lifetimeReps)}\n${lifetimeReps === 1 ? 'rep' : 'reps'}" (e.g. "42\nsessions\n|\n12,500\nkg lifted\n|\n8,947\nreps") | Card (flex-row 3-cell) | AnalyticsScreen.js:623–644 | completedWorkoutCount, lifetimeTonnage = getLifetimeTonnage(user.id), lifetimeReps = summed from allSets (warmups excluded, weight > 0 && reps > 0) | `hasData && completedWorkoutCount > 0` | both | None (tap-through not implemented; read-only panel) | N/A | lifetimeTonnage and lifetimeReps recomputed on each load from allSets; values memoized | No | Yes (displays read-only lifetime aggregates) | Full-width card, 3 equal-width cells separated by dividers | Position 18 | All-time session, tonnage, and rep totals |

### Section 8: More Stats (Navigation Grid)

| ELEMENT_ID | VISIBLE COPY | COMPONENT | SOURCE FILE(S) | DATA AUTHORITY | WHEN VISIBLE | TIER | ACTION | DESTINATION | DISMISSAL | PERSISTENCE | USER CAN ACT? | VOLYUME ACTS? | VISUAL WEIGHT | SCREEN POSITION | PRODUCT PURPOSE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| more-stats-header | "More stats" | SectionLabel | AnalyticsScreen.js:654 | Hard-coded label | Always (always rendered; grid below is the real condition) | both | None (label only) | N/A | N/A | N/A | No | No | Section overline/label | Position 19 (section marker) | Groups remaining nav tiles |
| consistency-tile | "📊 Consistency" | NavTile | AnalyticsScreen.js:656 | tier check (free-safe feature) | Always | both | Tap tile → navigate('Consistency') | Consistency (session frequency dashboard) | N/A | tier state | Yes | No (no telemetry observed) | Grid tile, icon + label | Position 20a (grid row 1, col 1) | Daily/weekly workout frequency view |
| lifts-tile | "🏋️ Lifts" | NavTile | AnalyticsScreen.js:657 | tier check (free-safe feature) | Always | both | Tap tile → navigate('LiftProgress') | LiftProgress (personal record detail screen) | N/A | tier state | Yes | No | Grid tile, icon + label | Position 20b (grid row 1, col 2) | Exercise-level 1RM tracking |
| body-metrics-tile | "⚖️ Body Metrics" + ProBadge (if free) | NavTile | AnalyticsScreen.js:664 | tier check; `pro={tier !== 'pro'}` | Always (always visible, gated by route) | free: shows lock badge; pro: open | Tap tile → navigate('BodyMetrics') | BodyMetrics (if pro, read-only for users without data) OR ProUpgrade (if free) | N/A | tier state | Yes | No | Grid tile, icon + label + badge | Position 20c (grid row 2, col 1) | Weight + measurement logging (Pro-only) |
| full-history-tile | "📅 Full History" | NavTile | AnalyticsScreen.js:667 | tier check (free-safe feature) | Always | both | Tap tile → navigate('WorkoutHistory') | WorkoutHistory (all sessions) | N/A | tier state | Yes | No | Grid tile, icon + label | Position 20d (grid row 2, col 2) | Complete session archive |
| recaps-tile-locked | "📰 Recaps\n${toGo} session${toGo === 1 ? '' : 's'} to go" (e.g. "📰 Recaps\n3 sessions to go") + dimmed icon + dimmed styling | NavTile (locked variant) | AnalyticsScreen.js:668–696 | RECAP_GATE = 10; completedWorkoutCount < RECAP_GATE | `!recapUnlocked` (completedWorkoutCount < 10) | both | Tap tile → toast.show("Your first monthly recap is ready after 10 logged sessions. ${toGo} to go.", { variant: 'info' }) | N/A (toast only, no navigation) | completedWorkoutCount persisted in DB | Yes (tap for info toast) | Yes (computes and displays countdown; toast fires on tap) | Grid tile, dimmed, icon (time-outline instead of newspaper), label + subtitle | Position 21a (if completedWorkoutCount < 10) | Locked feature until 10 sessions logged |
| recaps-tile-unlocked | "📰 Recaps" | NavTile (unlocked variant) | AnalyticsScreen.js:684–693 | RECAP_GATE = 10; completedWorkoutCount >= 10 | `recapUnlocked` (completedWorkoutCount >= 10) | both | Tap tile → navigate('RecapStory', recentMonthRecapParams(earliestWorkoutAt)) | RecapStory (YearOfLiftsScreen as recap variant) | N/A | completedWorkoutCount, earliestWorkoutAt persisted | Yes | Yes (routes to recap with month params) | Grid tile, open, icon, label | Position 21b (if completedWorkoutCount >= 10) | Monthly recap view (unlocked feature) |
| year-of-lifts-tile | "👑 Year of Lifts" | NavTile (conditional render) | AnalyticsScreen.js:698–711 | YEAR_MS = 365 * 86400000; unlocked = earliestWorkoutAt && (Date.now() - earliestWorkoutAt) >= YEAR_MS | `unlocked` (365+ days since first workout; else returns null, not rendered) | both | Tap tile → navigate('YearOfLifts') | YearOfLifts (annual crown screen) | N/A | earliestWorkoutAt persisted in DB | Yes | No | Grid tile, icon + label | Position 22 (if unlocked) | Anniversary milestone screen (1 year anniversary) |

---

## TRACE-NEEDED ITEMS

1. **InsightRow tap action** (line 485): `<InsightRow key={ins.id} insight={ins} onDismiss={() => handleDismiss(ins.id)} />` — The Card wraps the insight text but no `onPress` handler is wired. The close button has `onPress={() => { haptics.selection(); onDismiss(); }}` (line 737), but tapping the insight text itself produces no observed action. Verify: does the insight row card have a hidden tap-through, or is it read-only?

2. **VOLYUME_ACTS behavior for insights** (line 485): `runInsightsEngine(user.id)` is called once per load (line 258), generating coaching signals, but the criteria that trigger insight generation, re-order them, and update their copy are not observable from AnalyticsScreen alone. The engine lives in src/lib/database.js (reference: line 256, loadInsights). Trace to confirm: what triggers a new insight, how often do they update, and does the user's actions (e.g. logging a session) immediately refresh them or require a full page load?

3. **Weight trend card touch behavior** (line 530): WeightTrendCard renders as a Card with no `onPress` prop; only the info tooltip fires actions. Verify: is the trend card read-only, or does a future version support editing/interaction?

4. **Volume stacked bar chart segments** (line 826–831): Each segment is a View with no onPress, yet the overall card navigates to VolumeHeatmap on tap. Confirm: are individual segments meant to drill into a single muscle, or is the whole card one tap target?

5. **Recap card route params** (line 461): `recentMonthRecapParams(earliestWorkoutAt)` returns `{ variant: 'month', startMs, endMs, monthLabel }`, but the RecapStory screen is `YearOfLiftsScreen` (line 501). Verify: does YearOfLiftsScreen handle both recap (monthly) and year-of-lifts (annual) renders via route.params.variant, or is there a separate RecapScreen?

---

## FINAL COUNTS

| Metric | Count |
|---|---|
| **Total visible elements (ELEMENT_ID rows, excluding sub-text)** | **32** |
| **Total CTAs (tappable affordances, primary navigation)** | **25** (excluding RefreshControl, tab press) |
| **Total containers (bordered/backgrounded layout nodes)** | **30** |
| **Total conditional branches (if/ternary affecting render)** | **21** |
| **Total user-facing strings (verbatim, quoted)** | **68** |
| **Trace-needed items** | **5** |

---

## NOTES FOR LEAD REVIEW

- **Tier gating:** "Body Metrics", "Progress photos", and "Partners" tiles show `ProBadge` for free users. The badge is a visual lock indicator (see ProGate.js:25 `<ProBadge size="sm" />`), not a separate button. Routes are guarded by `withProGuard` and `withReadOnlyProGuard` wrappers in RootNavigator.js.
- **Recap/Year-of-Lifts logic:** Both use YearOfLiftsScreen (line 501) but differ in route params (`variant: 'month'` vs `variant: 'year'`). RecapStory is reached from the recap card (line 461) or "Recaps" tile (line 693), not from a dedicated screen file.
- **Empty state text (tier-conditional):** Lines 430–432 fork copy based on `tier === 'pro'`, warning: verify this branch is tested under free-tier audit (C5-P35-01, CLAUDE.md reference line 419).
- **Volume landmarks:** Volume summary uses `landmarkResolution?.table` (line 598) from `getEffectiveLandmarks(user.id, { tier })` (line 117), allowing manual landmarks to override research defaults. This table is passed to VolumeSummaryStrip and every muscle's status resolution (line 796).
- **Lifetime tonnage vs milestone:** Two separate computations: `lifetimeTonnage` (useState line 125, all-time total in kcal or lbs) vs `tonnageLandmark` (useState line 110, next pending milestone threshold). The landmark fires telemetry once per session if a new threshold is crossed (line 289).
- **Pro-only features on Progress landing:** Weight trend card (line 525–532), Body Metrics tile, Progress photos tile, Partners tile all require `tier === 'pro'`. Free users see either a lock badge or a hard gate (withProGuard route).
- **Skeleton loading pattern:** Lines 318–326 show placeholders while `loading === true`. Once data arrives, sections render in their proper state (empty, data, or error). No shimmer visible per useProgressData (Skeleton component has pulse animation in Skeleton.js:31–51, but is paused under reduceMotion).
