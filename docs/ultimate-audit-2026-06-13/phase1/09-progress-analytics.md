# Phase 1 — Progress & Analytics screens

Audit scope: src/screens/AnalyticsScreen.js, ConsistencyScreen.js,
LiftProgressScreen.js, VolumeHeatmapScreen.js, BodyMetricsScreen.js,
SnapshotsScreen.js, YearOfLiftsScreen.js. Tokens resolved against
src/styles/theme.js. Navigation cited against src/navigation/RootNavigator.js.

Token reference (theme.js): fontSize.micro 10 (theme.js:257), xs 11 (258),
sm 13 (259), md 16 (260), lg 17 (261), xl 20 (262), xxl 24 (263), xxxl 32 (264),
display 40 (265). type.label = fontSize.sm 13 medium (theme.js:402-405);
type.caption = fontSize.xs 11 (406-409); type.body = fontSize.md 16 (394-397);
type.bodyStrong = fontSize.md 16 semibold (398-401); type.title = fontSize.lg 17
semibold (390-393); type.h2 = fontSize.xxl 24 (382-385); type.h3 = fontSize.xl 20
(386-389). spacing: xxs 2, xs 4, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48
(theme.js:228-239). hitSlop default = 12 each side (theme.js:423). Tab icons 22px,
bar height 60 + bottom inset (RootNavigator.js:441,426).

---

```
SCREEN: Progress landing (AnalyticsScreen)
WHAT IT IS: The Progress tab's landing screen / hub. A scrollable stack that
  answers "am I on track?" at a glance and routes out to the deeper analytics
  screens. File: src/screens/AnalyticsScreen.js.
WHAT IS ON IT:
  - ScreenHeader titled "Progress" + Volyume wordmark on the right (AnalyticsScreen.js:171; ScreenHeader.js:26-37).
  - "This week" consistency strip (WeeklyStreakStrip) — renders only when weeklyStreak.render is true; self-hides for brand-new users and under a wellbeing flag (AnalyticsScreen.js:177-197). Optional milestone row beneath it: ribbon icon + milestone text (e.g. "4 weeks of showing up.") and, at >=12 weeks, a "Make a card" CTA (AnalyticsScreen.js:180-195, 27-32).
  - Empty state when no sets logged: EmptyChartIllustration (140px), heading "No data yet", body copy (AnalyticsScreen.js:200-208).
  - Ephemeral monthly recap nudge card (sparkles icon, "Your <Month> recap is ready · 45 seconds", close button) — shown days 1-7 of month after >=10 sessions (AnalyticsScreen.js:147,211-232).
  - "For you" insight stack: list of InsightRow items, each a severity icon (info/alert/warning), copy (max 3 lines), and a dismiss (close) button (AnalyticsScreen.js:235-242, 398-415).
  - "Your trend" weight-trend card (WeightTrendCard) — Pro only, self-hides until morning weights exist (AnalyticsScreen.js:247-254).
  - "Recent sessions": section label + "All sessions" link, then SessionCard rows (name, "EEE d MMM · Nm" meta, optional difficulty chip "N/10") (AnalyticsScreen.js:258-274, 517-539).
  - "This week's volume" summary strip with InfoTooltip; VolumeSummaryStrip shows count of muscles trained, flags for "N below target"/"N over max" or "All in range", chevron; taps through to VolumeHeatmap (AnalyticsScreen.js:277-291, 422-476).
  - "Cardio this week" CardioPlanCard — Pro only, when cardioEnabled !== false (AnalyticsScreen.js:295-304).
  - "New personal bests": PRSparkline with a day-window toggle chip ("Nd") (AnalyticsScreen.js:307-326, 478-515).
  - "Explore" nav-tile grid: Consistency, Lifts, Body Metrics, Partner, Full History, Recaps (locked until 10 sessions, shows "N sessions to go"), Year of Lifts (only appears after 365 days) (AnalyticsScreen.js:329-389).
NAVIGATION: Registered as route "Analytics" in ProgressStack, headerShown:false (RootNavigator.js:342). ProgressStack is the "ProgressTab" tab (RootNavigator.js:448, title "Progress"). Reached by tapping the Progress tab. Pushes to: ShareCard (98), RecapStory (215,370), WorkoutHistory (263,345), VolumeHeatmap (288), Consistency (332), LiftProgress (333), BodyMetrics (340), Partner (344), YearOfLifts (385), LogCardio (300), CardioHistory (301).
GATING: Free screen — route registered with the raw AnalyticsScreen component, no withProGuard (RootNavigator.js:342). Internally it conditionally hides Pro-only sections by reading tier: weight-trend card and cardio card behind `tier === 'pro'` (AnalyticsScreen.js:76,247,295).
CURRENT STRENGTHS: Clear hub structure with a one-glance "this week" answer at the top; Pro sections self-hide rather than teasing; empty state is explicit; volume summary collapses the heatmap into one glanceable line; locked tiles explain what unlocks them.
CURRENT WEAKNESSES: Very long stack — up to ~8 distinct sections plus a 7-tile grid, dense for a "landing". Two competing recap entry points (ephemeral card AND a Recaps tile) can both be visible at once. Section labels are all the same muted 13px treatment so visual hierarchy between sections is flat. The PR window toggle (AnalyticsScreen.js:313-322) is small.
NEWBIE QUESTION: Partially. "This week" sessions and "No data yet" are clear, but "This week's volume", "below target"/"over max", and "est. max" concepts assume training-volume literacy a first-timer won't have. The InfoTooltip on volume helps but the rest leans on jargon.
ATHLETE QUESTION: Largely yes — recent sessions, PR sparkline, per-muscle volume, weight trend and the deeper tiles give a competitor real signal. The flat hierarchy and the breadth (everything one tap deep) is reasonable for a power user.
LOCATION QUESTION: Yes. This is the Progress-tab root and acts as the documented hub routing to Consistency, Lifts, Body Metrics, Heatmap and recaps — the natural home for analytics.
VISUAL + USABILITY:
  - ScreenHeader title "Progress": fontSize.xl (20) bold (ScreenHeader.js:53-58 -> theme.js:262).
  - milestoneText / milestoneCta: fontSize.sm (13) semibold (AnalyticsScreen.js:587-588 -> theme.js:259).
  - sectionLabel / seeAll: type.label = fontSize.sm (13) (AnalyticsScreen.js:589-594 -> theme.js:402).
  - recapCardText / insightCopy: fontSize.sm (13) (AnalyticsScreen.js:611,618).
  - volSummaryCount: fontSize.xl (20) bold; volSummaryLabel sm (13); volSummaryFlagText / volSummaryClear: fontSize.micro (10) (AnalyticsScreen.js:625-629). 10px micro labels are below the body min.
  - windowToggleText: fontSize.xs (11) bold (AnalyticsScreen.js:640).
  - prTotal: type.num('caption') = fontSize.xs (11); prBarCount: fontSize.micro (10) (AnalyticsScreen.js:642,648).
  - sessionName: type.bodyStrong (16); sessionMeta: caption (11); diffText: fontSize.xs (11) (AnalyticsScreen.js:663-666).
  - navTileLabel: fontSize.xs (11) semibold; navTileSub: caption (11) (AnalyticsScreen.js:676-688).
  - emptyStateHeading: type.title (17); emptyStateBody: fontSize.sm (13) (AnalyticsScreen.js:697-707).
  - Touch targets: "Make a card", insight dismiss, recap dismiss, PR window toggle all use hitSlop 8-10px to extend small tap areas (AnalyticsScreen.js:189,225,316,406). The PR window toggle's visible body is paddingVertical 3 + paddingHorizontal sm(8) (AnalyticsScreen.js:637) — visually well under 44px but padded by hitSlop 8. NavTile padding spacing.lg(16) gives a tall tile, but "All sessions"/"see all" links (AnalyticsScreen.js:262-268) carry NO hitSlop and are sm(13) text — likely < 44px tap height.
  - Information density: high — multiple cards + a 2-column grid. ScrollView (AnalyticsScreen.js:159) so it scrolls on any size.
  - Clean/cluttered: tends cluttered when all optional sections render together (streak + recap card + insights + weight trend + sessions + volume + cardio + PRs + 7 tiles).
  - Most important action prominent? The "This week" strip is correctly first, but it competes with the recap nudge card directly below it.
  - Small/standard/large: ScrollView throughout; EmptyChartIllustration fixed at 140 (AnalyticsScreen.js:203); navGrid uses minWidth '45%' so it stays 2-up across sizes (AnalyticsScreen.js:671). No fixed full-height content; scales acceptably.
```

---

```
SCREEN: Consistency
WHAT IT IS: The "am I training often enough and is my body keeping up" screen —
  training block, recovery signals, training load, session length, frequency, and
  a 12-week calendar. File: src/screens/ConsistencyScreen.js.
WHAT IS ON IT:
  - "Your weeks" consistency streak section (StreakWeeksSection) (ConsistencyScreen.js:46).
  - Training partner status row (PartnerRow), opening the Partner screen (ConsistencyScreen.js:51).
  - "Lighter week recommended" deload banner (moon icon, title, reason line, InfoTooltip) — only when deloadAlert is set (ConsistencyScreen.js:54-70).
  - "Training block" section: label + InfoTooltip; BlockShapeCard ("Week N of M" dots, shown when plannedWeeks >= 2); MesocyclePulseCard (taps to MesocycleBuilder, build button to PlanLibrary); FatigueTrendCard; BlockProgressCard (ConsistencyScreen.js:73-104).
  - "Recovery signals" (ReadinessCards) (ConsistencyScreen.js:107).
  - "Training load (ACWR)" WorkloadCard — only when workloadData.ratio !== null (ConsistencyScreen.js:110-114).
  - "Session length trend" SessionDurationChart — only when enoughForTrends + bars (ConsistencyScreen.js:117-122).
  - "Training frequency" MuscleFrequencyTable + InfoTooltip, with show-all toggle (ConsistencyScreen.js:125-137).
  - "Training days (last 12 weeks)" TrainingCalendar (ConsistencyScreen.js:140-145).
NAVIGATION: Route "Consistency" in ProgressStack, header title "Consistency" (RootNavigator.js:349). Reached from the Progress landing's "Consistency" nav tile (AnalyticsScreen.js:332). Pushes to: Partner (51) and, via parent navigator, PlansTab -> MesocycleBuilder / PlanLibrary (ConsistencyScreen.js:98-99).
GATING: Free screen — registered with the raw ConsistencyScreen, no withProGuard (RootNavigator.js:349). It reads `tier` and passes it into PartnerRow and ReadinessCards (ConsistencyScreen.js:51,107), which decide their own gating; not determined in this file whether those sub-components gate.
CURRENT STRENGTHS: Tightly scoped to consistency/recovery; pulls this material off the Progress landing so the landing reads as a hub (per the file's own header comment, ConsistencyScreen.js:20-24). Most heavy cards self-hide until there's enough data, so a new user sees a short screen. Good explanatory InfoTooltips on deload and frequency.
CURRENT WEAKNESSES: A lot of distinct card types (block shape, pulse, fatigue, block progress, readiness, workload, duration, frequency, calendar) — once a user has data this is a long, varied wall. "ACWR" appears in a section title (ConsistencyScreen.js:111 label "Training load (ACWR)") — an acronym most users won't know. Heavy reliance on imported sub-components means the screen's own surface is thin but the rendered density is high.
NEWBIE QUESTION: No, not immediately. Mesocycle/deload/ACWR/fatigue-trend are advanced periodisation concepts. The tooltips translate some (the deload tooltip is plain-English) but the section labels themselves are coach-jargon.
ATHLETE QUESTION: Yes — this is exactly the recovery/periodisation dashboard a serious lifter wants (block arc, ACWR, fatigue, frequency, calendar). Strong fit for a competitor.
LOCATION QUESTION: Yes. One tap from the Progress hub under "Consistency", which matches its content.
VISUAL + USABILITY:
  - sectionLabel: type.label = fontSize.sm (13) (ConsistencyScreen.js:156 -> theme.js:402).
  - deloadTitle: type.bodyStrong = fontSize.md (16) semibold, coloured warning (ConsistencyScreen.js:163).
  - deloadSub: fontSize.sm (13) (ConsistencyScreen.js:164).
  - Most visible text lives inside imported components (StreakWeeksSection, *Card, ProgressSections) — NOT DETERMINED IN CODE here; would need those component files.
  - Touch targets: the only interactive elements declared in this file are PartnerRow (delegated) and the MuscleFrequencyTable toggle (delegated). No raw tap target sizes are set in this file.
  - Information density: high once populated; gated sections keep it low for new users.
  - Clean/cluttered: clean structurally (uniform section labels + gap spacing.md), but visually dense when full.
  - Most important action prominent? This is a read screen with little action; the streak + deload banner sit at top, appropriate.
  - Small/standard/large: ScrollView (ConsistencyScreen.js:39) with RefreshControl; no fixed-height blockers in this file; charts sized inside sub-components (NOT DETERMINED here).
```

---

```
SCREEN: Lifts (LiftProgress)
WHAT IT IS: The single home for "am I getting stronger" — overall strength
  standing, relative strength per lift, and a list of every trained lift by its
  estimated-1RM trajectory. File: src/screens/LiftProgressScreen.js.
WHAT IS ON IT:
  - Header card (when bodyweight + strength levels exist): big overall standing label, "overall across N main lifts" sub, "X units from <level> on <lift>" next-target line (or top-of-standards line) (LiftProgressScreen.js:153-169).
  - "Relative strength" label + InfoTooltip explaining bodyweight multiples; "Based on N units bodyweight"; per-lift rows: lift name, narrative ("1.50× your bodyweight" or "80% of your bodyweight"), level badge (Beginner/Novice/Intermediate/Advanced/Elite) (LiftProgressScreen.js:170-192, 28-37).
  - Bodyweight prompt card (when no bodyweight but lifts exist): body icon, "Add your body weight", explainer, chevron; taps to BodyMetrics (LiftProgressScreen.js:194-211).
  - Filter tabs: "All lifts" / "Recent bests" (LiftProgressScreen.js:213-230).
  - Lift list rows (FlatList): name + optional "PR" tag, "<muscle> · N sessions · last <MMM d>", "<bestE1rm><units> est. max" with optional "+N%" delta, a Sparkline trend, chevron. Long-press opens a PeekMenu (View exercise detail / Share this PR) (LiftProgressScreen.js:244-294, 111-135).
  - Empty state: barbell icon, "No lifts logged yet"/"No recent bests", explainer (LiftProgressScreen.js:295-308).
NAVIGATION: Route "LiftProgress" in ProgressStack, header title "Lifts" (RootNavigator.js:348). Reached from the Progress landing "Lifts" nav tile (AnalyticsScreen.js:333). Pushes to: ExerciseDetail (LiftProgressScreen.js:116,253), ShareCard (123), BodyMetrics (197).
GATING: Free screen — registered with the raw LiftProgressScreen, no withProGuard (RootNavigator.js:348). No tier read in this file; all content is available to free users.
CURRENT STRENGTHS: Clear single-purpose screen leading with where you stand, then per-lift trajectories. Relative-strength tooltip is genuinely educational. Recent-best PR markers and the filter make the list scannable. Bodyweight prompt is a smart way to unlock the standing card. Sparkline per row gives instant trend read.
CURRENT WEAKNESSES: "est. max" / "estimated 1RM" is unexplained on the row itself (only relative-strength has a tooltip). The standing headline label colour is amber primary at 32px (LiftProgressScreen.js:338-343) — visually dominant, which is good, but the next-target line in 13px below it is easy to miss. The level taxonomy (Beginner..Elite) has no in-row explanation of thresholds.
NEWBIE QUESTION: Partially. "Add your body weight" and the level badges are approachable, but "est. max", "1.50× your bodyweight" and percentage deltas assume some lifting knowledge. A first-timer with one session sees the empty state, which is clear.
ATHLETE QUESTION: Yes, strongly. Strength standards, relative-to-bodyweight ratios, e1RM trends and shareable PRs are exactly what a competitor tracks. The lbs/kg conversion fix note (LiftProgressScreen.js:72-78) shows care about correctness.
LOCATION QUESTION: Yes. One tap from the Progress hub under "Lifts"; correct home for strength progression.
VISUAL + USABILITY:
  - standingLabel: fontSize.xxxl (32) heavy, lineHeight 36, primary colour (LiftProgressScreen.js:338-343 -> theme.js:264).
  - standingSub: type.caption (11); standingNext: type.label (13) (LiftProgressScreen.js:345-346).
  - sectionLabel: type.label (13); sectionSub: type.caption (11) (LiftProgressScreen.js:347-348).
  - strengthName: type.label (13); strengthNarrative: type.num('caption') (11); levelBadgeText: fontSize.xs (11) semibold (LiftProgressScreen.js:357-360).
  - bwPromptTitle: type.bodyStrong (16); bwPromptText: fontSize.xs (11) (LiftProgressScreen.js:373-374).
  - filterTabText: type.label (13) (LiftProgressScreen.js:388).
  - card name: type.bodyStrong (16); prTagText: fontSize.micro (10) bold; meta: type.caption (11) (LiftProgressScreen.js:404-412).
  - statValue: fontSize.lg (17) heavy; statLabel: caption (11); delta: type.num('label') (13) (LiftProgressScreen.js:414-416).
  - emptyTitle: type.title (17); emptyText: fontSize.sm (13) (LiftProgressScreen.js:419-420).
  - Touch targets: filterTab is paddingVertical sm(8) — likely < 44px tall (LiftProgressScreen.js:378-380); flag. Lift card padding spacing.lg(16) gives a tall, comfortable target. bwPromptCard padding lg(16) — fine.
  - Information density: header card is dense (standing + ratio list); list rows are medium. Manageable via FlatList.
  - Clean/cluttered: clean; consistent surface cards with border.
  - Most important action prominent? The standing headline (32px primary) is the most prominent element, appropriate; the primary navigational action (tap a lift) is the full-width card.
  - Small/standard/large: FlatList (LiftProgressScreen.js:236) scrolls; Sparkline fixed width 84 / height 34 (LiftProgressScreen.js:288) — fixed, won't scale but small. Level badge has flexShrink:0 (LiftProgressScreen.js:359) so on a small screen a long lift name truncates rather than crushing the badge. Generally responsive.
```

---

```
SCREEN: Volume (VolumeHeatmap)
WHAT IT IS: The single "volume home" — an anatomical body heatmap plus per-muscle
  weekly working-set bars against MEV/MAV/MRV landmarks, a rolling window selector,
  a volume trend section, and an editor for custom volume targets.
  File: src/screens/VolumeHeatmapScreen.js.
WHAT IS ON IT:
  - BodyDiagramHeatmap (anatomical diagram; tapping a region scrolls to that muscle's bar) (VolumeHeatmapScreen.js:231-234, 207-212).
  - Rolling window selector: "1 week" / "2 weeks" / "4 weeks" buttons (VolumeHeatmapScreen.js:237-266, 24-28).
  - Window note line with clock icon ("Showing sets from the last week", etc.) (VolumeHeatmapScreen.js:269-272, 214-219).
  - Legend: "Below minimum" / "Optimal" / "Getting close" / "Too much" + InfoTooltip explaining the ticks (VolumeHeatmapScreen.js:275-288).
  - Per-muscle rows: muscle name, a bar track with current fill (status colour), a faint "ghost" fill for the previous window, two landmark ticks (MEV/MAV), "<sets>" coloured count, "/<mrv>" label, and a "last trained" chip ("Today"/"Yesterday"/"Nd ago") (VolumeHeatmapScreen.js:299-351, 221-225).
  - "Volume trend" section (hidden if no trained muscles): title, WindowChips (4W/8W/3M/6M), a takeaway line, and per-muscle MuscleTrendRow mini bar charts with scrub (VolumeHeatmapScreen.js:354-370, 437-490).
  - Edit mode: "Edit Volume Targets" with Min/Target/Max number inputs per muscle, Cancel/Save; otherwise an action row "Edit Volume Targets" + "Reset to Defaults" (VolumeHeatmapScreen.js:372-418).
NAVIGATION: Route "VolumeHeatmap" registered in THREE stacks: ProgressStack (title "Volume Heatmap", RootNavigator.js:345), HomeStack (title "Volume", RootNavigator.js:298). Reached from the Progress landing volume summary strip (AnalyticsScreen.js:288) and other volume entry points. The screen itself does not call navigation.navigate (no outbound pushes in this file).
GATING: Free screen — registered with the raw VolumeHeatmapScreen, no withProGuard in any stack (RootNavigator.js:298,345). No tier read in this file.
CURRENT STRENGTHS: A genuinely premium centrepiece — anatomical diagram tied to scrollable bars, week-over-week ghost fill, MEV/MAV/MRV landmark ticks, last-trained recency chips, and editable targets that sync to cloud. The legend + InfoTooltip explain the model. Trend section has its own window control.
CURRENT WEAKNESSES: Conceptually the densest screen in the set — MEV/MAV/MRV, ghost fills, landmark ticks and "working sets" are a lot to parse. The per-muscle row packs name + bar + count + /mrv + recency chip into one line (VolumeHeatmapScreen.js:311-349); on a small phone that is tight. The edit form is a long per-muscle list of 3 inputs each — heavy. Reset button is error-coloured (red) which reads as dangerous for a benign reset (VolumeHeatmapScreen.js:649-651).
NEWBIE QUESTION: No. "Below minimum/Optimal/Getting close/Too much" is a decent plain-English legend, but the underlying MEV/MAV/MRV volume-landmark model, "working sets", and editing per-muscle ceilings are advanced. A beginner will not know what numbers to aim for.
ATHLETE QUESTION: Yes, very much — this is the kind of evidence-based volume tracking (Renaissance-Periodization-style landmarks) a competitor or advanced lifter wants, including customisable targets.
LOCATION QUESTION: Yes, but slightly diffuse: it is registered in both Progress and Home stacks (and titled differently — "Volume" vs "Volume Heatmap", RootNavigator.js:298 vs 345). The Progress hub's volume summary is the natural door; the dual registration/title is a minor inconsistency.
VISUAL + USABILITY:
  - windowBtnText: type.label = fontSize.sm (13) (VolumeHeatmapScreen.js:532-534 -> theme.js:402).
  - windowNoteText: fontSize.xs (11) (VolumeHeatmapScreen.js:540-545).
  - Legend item label: fontSize.micro (10) (VolumeHeatmapScreen.js:428).
  - muscleName (bar row): type.label (13); setsCount: fontSize.sm (13) bold; mrvLabel: type.num('caption') (11); lastTrainedChip: fontSize.xs (11) (VolumeHeatmapScreen.js:569-613).
  - trendTakeaway: fontSize.sm (13); sectionTitle: type.label (13) (VolumeHeatmapScreen.js:622-627).
  - trend-row muscleName: type.caption (11), width 80; currentCount: fontSize.xs (11) bold (VolumeHeatmapScreen.js:499-515).
  - editTitle: type.title (17); editSubtitle: fontSize.sm (13); editMuscleName: type.label (13); editInputLabel: type.caption (11); editInput text: fontSize.md (16) bold (VolumeHeatmapScreen.js:660-682).
  - editBtnText/resetBtnText: type.label (13); cancelBtnText: type.body (16); saveBtnText: fontSize.md (16) bold (VolumeHeatmapScreen.js:641-699).
  - Touch targets: window buttons paddingVertical sm(8) — likely < 44px tall, no hitSlop (VolumeHeatmapScreen.js:526-530); flag. Edit/Reset/Cancel/Save buttons paddingVertical md(12) — closer but still likely < 44px (VolumeHeatmapScreen.js:636-697); flag. editInput paddingVertical sm(8) — small for a number field (VolumeHeatmapScreen.js:675). Bar-track height is only 8px (VolumeHeatmapScreen.js:575) but the row tap is handled via the diagram, not the bar.
  - Information density: very high in the per-muscle bar list and the edit form.
  - Clean/cluttered: borderline cluttered on the bar rows (5 elements per line); the trend section and editor are clean.
  - Most important action prominent? The body diagram + bars (the read) are the hero; the Edit/Reset actions are de-emphasised at the bottom, appropriate.
  - Small/standard/large: ScrollView (VolumeHeatmapScreen.js:229). Trend rows use fixed bar width 8 / gap 2 / height 24 and a fixed 80px name column + 20px count column (VolumeHeatmapScreen.js:433-435,500,510) — fixed sizes that won't scale; on a small screen the chart area (flex) just narrows. muscleName bar column fixed at width 90 (VolumeHeatmapScreen.js:571). BodyDiagramHeatmap sizing NOT DETERMINED here.
```

---

```
SCREEN: Body Metrics
WHAT IT IS: Body-weight + measurement tracking: log weight/body-fat/measurements,
  smoothed weight + body-fat + measurement trend charts, an EWMA weight-trend
  card, an estimated-daily-burn (adaptive TDEE) card, and history. Behind an opt-in
  gate and a calm-mode re-confirmation. File: src/screens/BodyMetricsScreen.js.
WHAT IS ON IT:
  - Opt-in gate (when not enabled): lock icon, "Physique Tracking" title, explainer ("All data stays on your device"), "Enable Physique Tracking" button (BodyMetricsScreen.js:368-383, 673-681).
  - Calm-mode re-confirmation (once per session): leaf icon, "A gentle check-in", body, Continue button, wellbeing helpline (BodyMetricsScreen.js:684-712).
  - Weight snapshot card: "Weight · <date>" title + phase chip (Gaining/Losing weight/Maintaining), big current weight value + DeltaBadge, WeightTrendChart with WindowChips + takeaway, "log 3+ times" hint (BodyMetricsScreen.js:732-763, 103-126, 134-236).
  - EWMA card: "Weight trend" label, smoothed value in kg, weekly change, explainer, optional average-intake line (BodyMetricsScreen.js:766-797).
  - "Estimated daily burn" card: cold-start copy until ~2 weeks, else adjusted TDEE value, insight, confidence line (BodyMetricsScreen.js:799-825).
  - Body-fat block: "Body fat" + value + neutral DeltaBadge, BodyFatTrendChart (smoothed + faint raw line) (BodyMetricsScreen.js:830-843, 240-301).
  - Empty state: EmptyBodyIllustration (140px), "Your progress starts here", onboarding-weight-aware copy (BodyMetricsScreen.js:845-861).
  - "Log Weight" button (toggles the form) (BodyMetricsScreen.js:864-873).
  - Log form: Date, Body weight (st+lbs OR single unit), Body fat %, collapsible Measurements (9 fields), Notes, "Save Entry" (BodyMetricsScreen.js:876-998).
  - Measurements snapshot: grid of measurement cells (value + label + delta), horizontal measurement tab row, MeasurementTrendChart (BodyMetricsScreen.js:1000-1061, 305-356).
  - History: last 12 rows (date + weight + up to 2 measurements) (BodyMetricsScreen.js:1063-1086).
NAVIGATION: Route "BodyMetrics" registered as GatedBodyMetrics in ProgressStack (title "Body Metrics", RootNavigator.js:347) AND ProfileStack (title "Body Metrics", RootNavigator.js:386). Reached from the Progress landing "Body Metrics" nav tile (AnalyticsScreen.js:340) and the Lifts bodyweight prompt (LiftProgressScreen.js:197). No outbound navigation in this file.
GATING: PRO — wrapped via `GatedBodyMetrics = withProGuard(BodyMetricsScreen, 'Body metrics')` (RootNavigator.js:151) and registered under that guard in both stacks (RootNavigator.js:347,386). In addition to the Pro guard there is a separate in-screen opt-in (`PHYSIQUE_PREF_KEY`, auto-enabled for Pro, BodyMetricsScreen.js:455-466) and a calm-mode re-confirmation (BodyMetricsScreen.js:684-712).
CURRENT STRENGTHS: Careful safety/sensitivity handling: opt-in gate, calm-mode re-confirmation, neutral (non-valenced) delta badges, ED-flag suppression of rate-of-change (BodyMetricsScreen.js:757,1092-1108). Rich analytics (EWMA, robust smoother, adaptive TDEE with confidence tiers). Optimistic save with rollback (BodyMetricsScreen.js:633-663). Onboarding-weight auto-seed avoids a blank first screen.
CURRENT WEAKNESSES: This is the longest, densest screen of the set — snapshot + EWMA + burn + body-fat + log form + measurement grid + measurement tabs + history all on one ScrollView. Date entry is a free-text "YYYY-MM-DD" TextInput (BodyMetricsScreen.js:881-888) rather than a date picker — error-prone. formLabel column fixed at width 140 (BodyMetricsScreen.js:1204) can crowd inputs on small screens. Two overlapping ways to pick a measurement (grid cells AND tab row) (BodyMetricsScreen.js:1004-1050).
NEWBIE QUESTION: Mostly yes for the basics (log weight, see trend), helped by plain copy. But "EWMA", "Estimated daily burn / adaptive TDEE", body-fat % and the confidence tiers are advanced; a first-timer won't need or understand them. The opt-in/calm gates are clearly worded though.
ATHLETE QUESTION: Yes — st/lbs/kg support, body fat, 9 site measurements, smoothed trends, weekly-change rate and reverse-engineered TDEE are exactly what a physique competitor tracks during a prep.
LOCATION QUESTION: Yes — reachable from both the Progress hub and the You/Profile stack, which suits a metrics screen that's both analytics and a settings-adjacent log.
VISUAL + USABILITY:
  - optInTitle: fontSize.xxl (24) black; optInBody: fontSize.sm (13) (BodyMetricsScreen.js:1122-1125 -> theme.js:263).
  - confirmTitle: type.h3 (20); confirmBody: fontSize.sm (13); confirmHelpline: fontSize.xs (11) (BodyMetricsScreen.js:1136-1143).
  - sectionTitle: type.label (13) (BodyMetricsScreen.js:1114-1116).
  - weightValue: fontSize.xxxl (32) black (BodyMetricsScreen.js:1167).
  - phaseLabel: fontSize.xs (11) bold; trendHint: type.caption (11) italic (BodyMetricsScreen.js:1165,1168).
  - bodyFatValue: type.num('h3') (20) (BodyMetricsScreen.js:1172).
  - measureValue: type.num('bodyStrong') (16); measureLabel: type.caption (11); measureTabText: fontSize.xs (11) (BodyMetricsScreen.js:1179-1190).
  - logBtnText: type.title (17) (BodyMetricsScreen.js:1197).
  - formTitle: type.title (17); formLabel: fontSize.sm (13); formInput text: type.body (16) (BodyMetricsScreen.js:1202-1209).
  - measureToggleText: fontSize.sm (13); saveBtnText: type.bodyStrong (16) (BodyMetricsScreen.js:1216,1222).
  - historyDate: fontSize.sm (13); historyWeight: type.num('bodyStrong') (16); historyMeasure: type.num('caption') (11) (BodyMetricsScreen.js:1229-1232).
  - ewmaValue: type.num('h3') (20); ewmaLabel/ewmaMuted: type.caption (11); ewmaWeekly: fontSize.sm (13) (BodyMetricsScreen.js:1238-1242).
  - burnValue: type.num('h2') (24); burnLabel/burnMuted/burnConfidence: type.caption (11) / sm (BodyMetricsScreen.js:1247-1252).
  - DeltaBadge text: 10 (small) or fontSize.xs (11) (BodyMetricsScreen.js:1103).
  - Chart takeaway: fontSize.sm (13); emptyHintText: type.caption (11) italic (chartStyles, BodyMetricsScreen.js:360-362).
  - Touch targets: logBtn paddingVertical lg(16) — comfortable. saveBtn / optInBtn / confirmBtn paddingVertical md/lg — closer to 44px. measureToggle / measureTab / measureCell have NO hitSlop; measureTab paddingVertical xs(4) is very small (BodyMetricsScreen.js:1185) — flag, < 44px. formInput paddingVertical sm(8) — small for a tap-to-edit field; flag.
  - Information density: very high once populated (the densest screen audited).
  - Clean/cluttered: cluttered when full — many stacked cards of similar surface treatment with limited hierarchy beyond the section labels.
  - Most important action prominent? The big weight value (32px) is the visual hero; the primary action "Log Weight" is a full-width primary-filled button (BodyMetricsScreen.js:864-873), appropriately prominent.
  - Small/standard/large: ScrollView (BodyMetricsScreen.js:725). SCREEN_W captured once at module load (BodyMetricsScreen.js:99) and chart widths derived as SCREEN_W - 64 (e.g. BodyMetricsScreen.js:177,275,334) — fixed at first launch, won't react to rotation but tracks device width. Charts fixed heights 100-120. formLabel fixed 140 (BodyMetricsScreen.js:1204) and measureCell minWidth '30%' (BodyMetricsScreen.js:1175) — on a 5.4" device the 140px label leaves a narrow input.
```

---

```
SCREEN: Snapshots (Restore a snapshot)
WHAT IT IS: Lists automatic local database safety-copies (taken before app
  updates / account switches) and offers a two-tap destructive restore.
  File: src/screens/SnapshotsScreen.js.
WHAT IS ON IT:
  - SettingsPage container (SnapshotsScreen.js:65).
  - "Loading…" while listing (SnapshotsScreen.js:67-68).
  - Empty note when none: explains snapshots appear after the next update (SnapshotsScreen.js:69-73).
  - One SettingRow per snapshot: time icon, label, size sub ("X MB"/"X KB"), destructive styling; tapping fires a confirm dialog (SnapshotsScreen.js:75-85, 20-24).
  - Confirm dialog (appAlert): "Restore this snapshot?" warning that it replaces ALL data and cannot be undone, Cancel / Restore (destructive). On confirm: closes the DB, restores the file, then prompts a full relaunch (SnapshotsScreen.js:35-62).
  - Footer explainer: snapshots are automatic, device-only, most-recent-few retained (SnapshotsScreen.js:87-90).
NAVIGATION: Route "Snapshots" in ProfileStack, header title "Restore a snapshot" (RootNavigator.js:381). Reached from the You/Profile (Settings) flow — NOT from the Progress hub. The cross-account-switch alert in RootNavigator points users to "Settings, Your data" to restore (RootNavigator.js:859). No outbound navigation in this file.
GATING: Free / not Pro-gated — registered with the raw SnapshotsScreen, no withProGuard (RootNavigator.js:381). No tier read.
CURRENT STRENGTHS: Minimal, focused, and appropriately cautious: explicit two-step destructive confirm, plain-English "cannot be undone", DB handle closed before overwrite, manual-relaunch prompt to avoid SQLite corruption. Good empty-state explanation. Reuses Settings primitives for visual consistency.
CURRENT WEAKNESSES: Restore requires the user to manually fully close and reopen the app (SnapshotsScreen.js:51-53) — a clunky final step with no in-app reload. Snapshot labels come from dbSnapshot (NOT DETERMINED here) so list rows may be terse. No way to delete or name a snapshot from this screen.
NEWBIE QUESTION: Adequately — the copy is plain ("automatic safety copy", "replaces ALL current data"). A newbie is unlikely to ever need it, and the footer explains what it is. The relaunch instruction is clear.
ATHLETE QUESTION: Yes — it's a data-safety utility, not a training surface; an athlete needs nothing more from it. It does what it says.
LOCATION QUESTION: Yes. It belongs in the You/Settings "Your data" area (where it lives), not in Progress. Correct placement; it is out of scope of the Progress hub by design.
VISUAL + USABILITY:
  - Empty/loading note: fontSize.sm (13), padding lg, lineHeight 20 (SnapshotsScreen.js:96 -> theme.js:259).
  - Footer: fontSize.xs (11) (SnapshotsScreen.js:97 -> theme.js:258).
  - SettingRow label/sub fonts: defined in SettingsPrimitives — NOT DETERMINED IN CODE here.
  - Touch targets: rows are SettingRow components (SnapshotsScreen.js:76-83); their tap height is set in SettingsPrimitives — NOT DETERMINED here.
  - Information density: very low — a short list + two notes. Clean by construction.
  - Clean/cluttered: clean.
  - Most important action prominent? The destructive restore is gated behind a tap + confirm, which is the right priority for a dangerous action (it should not be one-tap prominent).
  - Small/standard/large: SettingsPage handles scrolling (NOT DETERMINED here); content is short so all sizes are fine. localStyles use token spacing, no fixed pixel widths.
```

---

```
SCREEN: Year of Lifts / Recaps (YearOfLiftsScreen)
WHAT IT IS: A full-screen, swipeable "story" (Spotify-Wrapped style) summarising a
  period of training. One renderer, three variants: 'year' (Year of Lifts),
  'month' (monthly Recap), and 'block' (block reflection).
  File: src/screens/YearOfLiftsScreen.js.
WHAT IS ON IT:
  - Top progress pips (one per card), a Share button, and a Close (X) button (YearOfLiftsScreen.js:478-509).
  - Loading line ("Building your year…/recap…/block story…") (YearOfLiftsScreen.js:511-515).
  - Empty state: barbell icon, "No sessions yet", body, "Done" button (YearOfLiftsScreen.js:517-533).
  - Horizontal paging FlatList of StoryCards (YearOfLiftsScreen.js:537-550). Card types:
      * intro/outro: icon + big headline (44px) + subline (YearOfLiftsScreen.js:322-327, 651-662).
      * stat: icon + huge value (96px, auto-shrink) + unit + caption (YearOfLiftsScreen.js:312-320, 632-648).
      * list: icon + headline + subline + ranked top-5 rows (rank, primary name, secondary value) (YearOfLiftsScreen.js:329-343, 664-697).
  - Year deck content: intro, sessions, kg moved, sets, busiest month, top lifts, personal bests, outro (YearOfLiftsScreen.js:49-154).
  - Month deck content: intro, sessions (with month-vs-month delta unless neutral), tonnage, top lifts, PRs, best session, outro; neutral framing under calm/ED flag (YearOfLiftsScreen.js:167-249).
  - Block deck content: intro, weekly-volume climb %, PRs, sessions+sets+tonnage, outro (YearOfLiftsScreen.js:253-294).
  - Tap zones: a narrow band under the pips — left=previous, right=next (YearOfLiftsScreen.js:562-565, 703-711).
  - Share: builds a milestone card (factual training stats only) and navigates to ShareCard (YearOfLiftsScreen.js:425-471).
NAVIGATION: Registered TWICE in ProgressStack — route "YearOfLifts" and route "RecapStory", both -> YearOfLiftsScreen, both headerShown:false (RootNavigator.js:352-353). Reached from the Progress landing: "Year of Lifts" tile -> YearOfLifts (AnalyticsScreen.js:385); the ephemeral recap card and "Recaps" tile -> RecapStory with month params (AnalyticsScreen.js:215,370). Pushes to: ShareCard (YearOfLiftsScreen.js:470); otherwise navigation.goBack() to dismiss (YearOfLiftsScreen.js:413,502).
GATING: Free / not Pro-gated — both routes register the raw YearOfLiftsScreen, no withProGuard (RootNavigator.js:352-353). No tier read. (Access is data-gated upstream on the landing: Recaps unlock after 10 sessions, Year of Lifts after 365 days — AnalyticsScreen.js:352-388.)
CURRENT STRENGTHS: A delightful, on-brand moment — full-bleed gradient story cards, a 96px hero stat, tap/swipe navigation with pips, shareable. Smart safety: empty/zero cards are dropped so the deck stays tight (YearOfLiftsScreen.js:63-151); neutral framing under calm/ED flags removes comparison pressure (YearOfLiftsScreen.js:167,371-377); share payload is explicitly factual-stats-only, no bodyweight (YearOfLiftsScreen.js:424-471). The tap-zone-band fix (YearOfLiftsScreen.js:552-565) addresses a real Android swipe bug.
CURRENT WEAKNESSES: The tap zones are a narrow 56px band at fixed top:50 (YearOfLiftsScreen.js:703-708) — tap-to-advance is discoverable only by trial; most of the card is swipe-only. Two routes (YearOfLifts + RecapStory) point at the same component, a slight registration redundancy. Auto-shrinking the 96px hero (adjustsFontSizeToFit, YearOfLiftsScreen.js:314) can make long numbers small with no minimum floor stated.
NEWBIE QUESTION: Yes — this is the most universally legible screen of the set. Big numbers, plain captions ("Roughly 3 a week. That's consistency."), familiar story UX. A first-timer immediately gets it (and is gated out until they have data anyway).
ATHLETE QUESTION: Yes for delight/sharing; it's a celebration surface, not an analysis tool. A competitor gets a shareable highlight reel (sessions, tonnage, PRs, block climb). It doesn't replace the analytical screens, nor is it meant to.
LOCATION QUESTION: Yes. Lives in the Progress stack and is launched from the Progress hub's Recaps / Year-of-Lifts tiles and the ephemeral nudge — the right home for a periodic celebration.
VISUAL + USABILITY:
  - statValue: fixed 96px black, lineHeight 100, letterSpacing -2 (YearOfLiftsScreen.js:632-639) — by-design hero, eslint-disabled.
  - statUnit: type.h3 (20); statCaption: type.body (16) (YearOfLiftsScreen.js:640-648).
  - heroHeadline: fixed 44px black (YearOfLiftsScreen.js:651-658); heroSubline: type.body (16) (YearOfLiftsScreen.js:659-662).
  - listHeadline: fontSize.xxl (24) black; listSubline: fontSize.sm (13) (YearOfLiftsScreen.js:666-675).
  - listRank: fontSize.lg (17) black primary; listPrimary: type.bodyStrong (16); listSecondary: fontSize.sm (13) (YearOfLiftsScreen.js:682-697).
  - loadingText: fontSize.sm (13); emptyTitle: type.bodyStrong (16); emptyBody: fontSize.sm (13) (YearOfLiftsScreen.js:604-606).
  - doneBtnText: type.bodyStrong (16) (YearOfLiftsScreen.js:721-724).
  - Touch targets: Share + Close buttons are 30x30 with hitSlop 10 each side -> ~50px effective (YearOfLiftsScreen.js:493,503,591-598) — OK via hitSlop, but visible glyph area is < 44px. Tap zones are a 56px-tall band (YearOfLiftsScreen.js:705) — tall enough but narrow vertically and positioned only under the pips. doneBtn padding md(12)/xl(24) — comfortable.
  - Information density: low per card (one idea per card) — the opposite of the other screens; appropriate for a story.
  - Clean/cluttered: very clean / premium.
  - Most important action prominent? The hero stat is the whole card; advancing is the implicit primary action via tap/swipe. Close (X) and Share are top-right, secondary, appropriate.
  - Small/standard/large: cardWrap width = SCREEN_W and getItemLayout uses SCREEN_W (YearOfLiftsScreen.js:610,549,545) — paging is correct per device width but SCREEN_W is captured once at module load (YearOfLiftsScreen.js:32) so rotation isn't handled. statValue 96px / heroHeadline 44px are fixed; statValue auto-shrinks to fit, heroHeadline does NOT (could overflow on a 5.4" with a long headline). card minHeight '100%' so it always fills the screen on every size.
```
