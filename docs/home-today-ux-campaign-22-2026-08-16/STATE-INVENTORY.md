# HOME/TODAY SURFACE — MECHANICAL INVENTORY
**Campaign 22 Phase 1**  
**Date:** 2026-08-16  
**Source:** `/home/user/ADPhysique/src/screens/HomeScreen.js` (3,054 lines) + component tree

---

## 1. SECTION MAP
Every visually distinct section, top to bottom, with gating conditions and component files.

### 1.1 Screen Header
**Component:** `ScreenHeader` (`src/components/ScreenHeader.js`)  
**Visible:** Always  
**Props:**
- `title`: "Today" (hardcoded)
- `subtitle`: Result of `getGreeting(userProfile?.firstName)` (5 variants: Up early, Morning, Afternoon, Evening, Late night)

**TestID:** None defined in source

**Content:**
- Title: "Today"
- Subtitle: greeting (dynamically computed by hour and first name)
- Right side: Volyume V brand mark

---

### 1.2 Coach Review Banner
**Component:** Inline `TouchableOpacity` (`HomeScreen.js:1885-1920`)  
**Visible If:**
- `tier === 'pro'` AND
- `latestCoachOutput` exists (non-null) AND
- `latestCoachDecisionComplete === true` (checked via `isCompletedCoachDecision(out, outCheckin)`) AND
- `!coachBannerDismissed` AND
- Latest output within 7 days

**Conditions (verbatim from code, line 1740-1742):**
```javascript
const showCoachBanner = tier === 'pro' && !!latestCoachOutput && latestCoachDecisionComplete
  && !coachBannerDismissed
  && (Date.now() - (latestCoachOutput.weekStart ?? 0) < 7 * 86400000);
```

**State Source:** HomeScreen state (`latestCoachOutput`, `latestCoachDecisionComplete`, `coachBannerDismissed`)

**User-Visible Strings:**
- Icon: "pulse-outline" (Ionicons)
- Title: `"Coach - this week's decision"`
- Body (conditional):
  - If `latestCoachOutput.adjustments?.calories?.applied`: `"Calories adjusted to ${latestCoachOutput.adjustments.calories.newKcal} kcal. Tap to see why."`
  - Else: `"Tap to see what changed and why."`
- Dismiss button: "close" icon (Ionicons)

**Accessibility:**
- `accessibilityLabel`: `"This week's coaching review. Tap to open."`
- `accessibilityLabel` (dismiss): `"Dismiss coaching review banner"`

**Actions:**
- Tap banner: Navigates to ProfileTab > CoachOutput screen with `weekStart` param
- Tap close: Sets `coachBannerDismissed = true`, writes to AsyncStorage key `@volyume_coach_banner_dismissed_${latestCoachOutput.weekStart}`

**Banner Priority:** Rank 1 (highest)

---

### 1.3 Trial Value Banner / Attention Card (Trial Variant)
**Component:** `AttentionCard` variant='trial' (`src/components/AttentionCard.js:64-116`)  
**Visible If:**
- `tier === 'pro'` AND
- `stageOf(userProfile) === 'pro_trial'` AND
- `trialStart` computable from `userProfile.proTrialEndsAt` AND
- `trialDay` >= 0 and <= `TRIAL_LENGTH_DAYS` (14) AND
- No completed coach decision exists for the same week AND
- `!trialBannerDismissed` AND
- `!showCoachingNudge` (suppressed by coaching nudge same-screen rule)

**Conditions (verbatim from code, line 1757):**
```javascript
const trialBannerEligible = !!trialBanner && !trialBannerDismissed && !showCoachingNudge;
```

**State Source:** `trialBanner` object {line, variant} built by `loadTrialBanner()` (line 513-613)

**User-Visible Strings:**
- Icon: "checkmark-done-outline" (Ionicons)
- Body: `trialBanner.line` (computed by `trialBannerLine()` with variant selection)
  - Variants include session counts, weigh-in counts, unlock dates, and ED-flag fallback (neutral copy)
  - Appended: Trial end date label from `trialEndsLabel()`: `"Your free trial runs to ${endsLabel}."`
- Button: "How Precision Coaching works" with "information-circle-outline" icon
- Dismiss: "close" icon

**Accessibility:**
- Wrapper: `accessibilityLabel`: `trialBanner.line` (the line itself)
- Dismiss: `accessibilityLabel`: `"Dismiss trial banner"`

**Actions:**
- Tap banner: Calls `onTrialPress()` (if variant === 'S3' and active plan exists: `handleStartNextWorkout(false)`; else navigates to WeeklyCheckIn)
- Tap button: Navigates to Methodology page via `navigateCrossTab()`
- Tap dismiss: Sets `trialBannerDismissed = true`, writes to AsyncStorage key `@volyume_trial_value_banner_dismissed_${user.id}`

**Banner Priority:** Rank 2 (after coach banner)

---

### 1.4 Deload/Recovery Week Banner
**Component:** Inline `TouchableOpacity` (`HomeScreen.js:1945-1977`)  
**Visible If:**
- `deloadSuggestion` exists (non-null, result of `shouldDeload()`) AND
- `!deloadDismissed` AND
- NOT in scheduled recovery (`!currentMesoWeek?.isDeload && !currentMesoWeek?.awaitingDecision`)

**Conditions (verbatim from code, line 1768):**
```javascript
const inScheduledRecovery = !!currentMesoWeek?.isDeload || !!currentMesoWeek?.awaitingDecision;
const deloadBannerEligible = !!deloadSuggestion && !deloadDismissed && !inScheduledRecovery;
```

**State Source:** `deloadSuggestion` from `loadWeekStats()` (line 1143)

**User-Visible Strings:**
- Icon: "battery-charging-outline" (Ionicons)
- Title: `"Recovery week suggested"`
- Body (conditional):
  - `deloadSuggestion.reasons?.[0]` (first reason string) OR `"Your recent training signals it is time for a lighter week."`
  - If `scheduledRecoveryAhead`: Appends `" Your block already has a recovery week scheduled at week ${scheduledRecoveryWeekIndex}, and you are in week ${currentMesoWeek.weekIndex}."`
- Dismiss: "close" icon

**Accessibility:**
- `accessibilityLabel`: `"Recovery week suggested. Tap to review."`
- Dismiss: `accessibilityLabel`: `"Dismiss recovery week banner"`

**Actions:**
- Tap banner: Navigates to CoachReview screen
- Tap dismiss: Sets `deloadDismissed = true`

**Banner Priority:** Rank 3

---

### 1.5 Nutrition Phase Sync Banner
**Component:** Inline `View` (`HomeScreen.js:1980-2004`)  
**Visible If:**
- `userProfile?.trainingPhase` exists AND
- Nutrition targets stored AND
- Current training phase differs from saved nutrition goal

**Conditions (verbatim from code, line 1786):**
```javascript
const phaseBannerEligible = !!phaseMismatch && !phaseBannerDismissed;
```

**State Source:** `phaseMismatch` object {currentPhase, savedPhaseLabel} from `loadPhaseBanner()` (line 712-752)

**User-Visible Strings:**
- Icon: "information-circle-outline" (Ionicons)
- Body: `"Your nutrition targets are set for ${phaseMismatch.savedPhaseLabel}. Update them in Coach to reflect your current plan."`
- Navigate button: "chevron-forward" (Ionicons)
- Dismiss: "close" icon

**Accessibility:**
- Arrow button: `accessibilityLabel`: `"Go to nutrition targets"`
- Dismiss: `accessibilityLabel`: `"Dismiss nutrition phase banner"`

**Actions:**
- Tap arrow: Navigates to ProfileTab > NutritionTargets
- Tap close: Calls `dismissPhaseBanner()`, writes to AsyncStorage key `@volyume_phase_banner_dismissed_v1`

**Banner Priority:** Rank 4

---

### 1.6 Lift Plateau Banner
**Component:** Inline `TouchableOpacity` (`HomeScreen.js:2010-2032`)  
**Visible If:**
- `plateauBanner` exists (non-null) AND
- `!plateauBannerDismissed`

**Conditions (verbatim from code, line 1789):**
```javascript
const plateauBannerEligible = !!plateauBanner && !plateauBannerDismissed;
```

**State Source:** `plateauBanner` object {exerciseId, line} from `loadPlateauBanner()` (line 766-799)

**User-Visible Strings:**
- Icon: "analytics-outline" (Ionicons)
- Body: `plateauBanner.line` (result of `plateauBannerLine(ex.name, picked.weeks, picked.sessions, picked.selectedFrom)`)
  - Example format: "Bench Press stalled for 4 sessions across 3 weeks."
- Navigate: "chevron-forward" (Ionicons)
- Dismiss: "close" icon

**Accessibility:**
- `accessibilityLabel`: `plateauBanner.line`
- Dismiss: `accessibilityLabel`: `"Dismiss plateau banner"`

**Actions:**
- Tap banner: Navigates to ProgressTab > ExerciseDetail with `exerciseId` param
- Tap dismiss: Calls `dismissPlateauBanner()`, writes to AsyncStorage key `@volyume_plateau_banner_dismissed_${user.id}_${plateauBanner.exerciseId}_${localWeekStartMs()}`

**Banner Priority:** Rank 5

---

### 1.7 Recovery State Card
**Component:** `RecoveryStateCard` (`src/components/RecoveryStateCard.js`)  
**Visible If:**
- `gatedRecoveryState` exists (non-null result of `recoveryStateCard()`)

**Conditions (verbatim from code, line 1191):**
```javascript
const gatedRecoveryState = programmePosition?.recoveryState ?? currentMesoWeek?.recoveryState ?? null;
```

**State Source:** Resolved from programme position or current meso week

**Content (Conditional on expanded state):**
- Expanded (`expanded === true`):
  - Title: `card.title` (full, e.g., "Recovery week")
  - Body: `card.body` (detailed explanation)
  - Next: `card.next` (what happens next)
  - Action text: "Tap to collapse"
- Collapsed (`expanded === false`):
  - Title: `card.compactTitle` (single line, e.g., "Recovery week")
  - Action text: `card.action` (e.g., "Tap to expand")

**Icon:** Conditional
- If `card.state === RECOVERY_STATE.PLANNED_BLOCK_RECOVERY`: "moon-outline"
- Else: "pulse-outline"

**Accessibility:**
- `accessibilityLabel`: Full text when expanded: `"${card.title}. ${card.body} ${card.next}"`
- `accessibilityLabel`: Compact when collapsed: `"${card.compactTitle}. ${card.action}"`
- `accessibilityState`: `{expanded: !!expanded}`

**Actions:**
- Tap card: Toggles `expanded` state, persists to AsyncStorage key `@volyume_recovery_read_${user.id}_${currentMesoWeek.mesocycleId}_${gatedRecoveryState.state}`

**Banner Priority:** Always shown when state exists (not part of cap)

---

### 1.8 Activation Nudge Banner
**Component:** Inline `TouchableOpacity` (`HomeScreen.js:2047-2075`)  
**Visible If:**
- `activationNudge` exists (non-null) AND
- `activationNudge.stage !== NUDGE_STAGE.COLD_START` AND
- `!activationNudgeDismissed`

**Conditions (verbatim from code, line 1795-1796):**
```javascript
const activationBannerEligible = !!activationNudge && activationNudge.stage !== NUDGE_STAGE.COLD_START
  && !activationNudgeDismissed;
```

**State Source:** `activationNudge` from `loadActivationNudge()` (line 892-929)

**User-Visible Strings:**
- Icon: "barbell-outline" (Ionicons)
- Title: Result of `activationBannerLine(activationNudge.stage)?.title`
  - Varies by stage (STALLED_1D, STALLED_7D, etc.)
- Body: Result of `activationBannerLine(activationNudge.stage)?.body`
- Dismiss: "close" icon

**Accessibility:**
- `accessibilityLabel`: Title from `activationBannerLine()`
- Dismiss: `accessibilityLabel`: `"Dismiss"`

**Actions:**
- Tap banner: Calls `handleStartNextWorkout(false)`
- Tap dismiss: Calls `dismissActivationNudge()`, writes to AsyncStorage key `@volyume_home_activation_nudge_dismissed_${user.id}_${activationNudge.stage}`

**Banner Priority:** Rank 6

---

### 1.9 Attention Card (Free Line or Differential Badge)
**Component:** `AttentionCard` variants 'free_line' or 'differential' (`src/components/AttentionCard.js:119-150`)  
**Visible If:**
- (Free line eligible: `tier === 'free' && !!freeCoachLine && !freeCoachLineDismissed`) OR
- (Differential eligible: `tier === 'free' && !!differentialBanner?.shown && !differentialDismissed`)
- Both are shown in the SAME slot; pickAttentionVariant() decides which

**Conditions (verbatim from code, line 1800-1827):**
```javascript
const freeCoachLineEligible = tier === 'free' && !!freeCoachLine && !freeCoachLineDismissed;
const differentialBadgeEligible = tier === 'free' && !!differentialBanner?.shown && !differentialDismissed;
const showFreeCoachLine = freeCoachLineEligible && showAttentionSlot;
const showDifferentialBadge = differentialBadgeEligible && !freeCoachLineEligible && showAttentionSlot;
```

**Variant A: Free Coach Line**
- Icon: "pulse-outline" (Ionicons)
- Body: `freeCoachLine` (string from `buildFreeCoachLine()`)
  - Built from: sessions this week, morning weights direction, ED flag open, calm mode
  - If ED flag open or calm mode: Training-only line (no weight/nutrition data)
- Button: "Pro reads the full story" with "lock-open-outline" icon
- Dismiss: "close" icon

**Variant B: Differential Paywall Badge**
- Component: `DifferentialBadge` (separate, renders based on differential.trigger)
- Variants: 'move_adherence', 'stalled_lift', 'deload_suggested', etc.

**Accessibility:**
- Free line dismiss: `accessibilityLabel`: `"Dismiss this week's summary"`
- Free line button: `accessibilityLabel`: `"Pro reads the full story. Learn about Pro coaching."`

**Actions:**
- Free line dismiss: Calls `dismissFreeCoachLine()`, writes to AsyncStorage key `@volyume_free_coach_line_dismissed_${user.id}_${localWeekStartMs()}`
- Free line button: Navigates to ProUpgrade screen
- Differential actions: Calls `onDifferentialCta()` with action type ('shown', 'pay', 'dismiss')

**Banner Priority:** Rank 7 (lowest)

---

### 1.10 Skeleton Loading State
**Component:** Inline `View` with `SkeletonCard` (`HomeScreen.js:2120-2127`)  
**Visible If:** `initialLoading === true`

**Conditions (verbatim from code, line 2120):**
```javascript
{initialLoading && (
  <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
    <SkeletonCard height={160} />
    <SkeletonCard height={64} />
  </View>
)}
```

**Content:**
- Two skeleton cards: 160px (hero shape) + 64px (strip shape)

**Actions:** None (read-only loading placeholder)

---

### 1.11 Today Strip (Morning Weight Card)
**Component:** `TodayStrip` (`src/components/TodayStrip.js`)  
**Visible If:** `tier === 'pro' && user?.id`

**State:** 
- `todayWeight`: Logged weight for today (null if not logged)
- `lastWeightKg`: Last known weight for prefill
- `editing`: Whether in edit mode
- Weight input draft state

**Visible Content (3 states):**

**A. Logged State (todayWeight != null):**
- Label: "Morning weight"
- Value: `formatBodyWeightShort(todayWeight, bwu)` (e.g., "84.0 kg")
- Pill: "Logged" with checkmark icon
- Icon: "scale-outline" (Ionicons)
- Accessibility: `"Weight ${weight} logged today. Tap to see your trend, long press to edit."`

**B. Not Logged State (todayWeight == null):**
- Label: "Morning weight"
- Prompt: "Not logged yet"
- Why: "Before food, after the bathroom. It feeds your weight trend, and several mornings go by before anything changes."
- Button: "Log" (secondary variant)
- Icon: "scale-outline" (Ionicons)
- Accessibility: `"Log morning weight"`

**C. Editing State (editing === true):**
- Header: "Morning weight" label + icon
- Input fields (unit-dependent):
  - If `bwu === 'st'`: Two fields "12st" and "7lb"
  - Else: One field with unit suffix (kg/lbs)
- Button: "Log" (primary variant, disabled if no draft)

**Actions:**
- Logged state tap: Opens editing mode OR navigates to weight trend (if onOpenTrend provided)
- Logged state long press: Opens editing mode
- Not logged tap/button: Opens editing mode
- Log button (editing): Submits weight, triggers `onLogWeight(kg)`, clears draft

---

### 1.12 Active Workout Continue Card
**Component:** Inline `PressableCard` (`HomeScreen.js:2168-2184`)  
**Visible If:** `hasActiveWorkout === true` (i.e., `!!activeWorkout && !isStartingWorkout`)

**User-Visible Strings:**
- Icon: "play" (Ionicons)
- Title: "Workout in progress"
- Subtitle: "Tap to return to your workout"
- Chevron: "chevron-forward" (Ionicons)

**Accessibility:**
- `accessibilityLabel`: `"Continue active workout"`

**Actions:**
- Tap card: Navigates to ActiveWorkout screen

---

### 1.13 Hero Workout Card (Plan Active, No Active Workout)
**Component:** `Card` surface="surfaceElevated" (`HomeScreen.js:2185-2290`)  
**Visible If:** `activePlan && nextWorkout && !hasActiveWorkout`

**Sub-sections within Hero Card:**

**A. Eyebrow (Section Label)**
- Content (conditional):
  - If `recoveryLabel`: `"${recoveryLabel} · ${planProgress}"`
  - Else: `planProgress`
- planProgress: Result of `activePlanLine(planHeadingName(activePlan?.name), displayWorkout?.idx ?? 0, nextWorkout?.total ?? 1)`
  - Example: "Day 1 of 4"
- recoveryLabel: Result of `nextWorkoutRecoveryLabel(gatedRecoveryState)`
  - Examples: "Recovery week", "Deload week", "Adaptive reduction"

**B. Workout Name**
- Content: `sessionDisplayName(programmePosition?.nextSession || {name: displayWorkout?.routine?.name, order: 0}, programmePosition?.sessions ?? [])` OR `displayWorkout?.routine?.name`
- Example: "Day 2: Back Width & Thickness" (qualified by position if name repeats in week)

**C. Exercise Count**
- Visible if: `exerciseCounts[displayWorkout?.routine?.id]` exists
- Content: `"${exerciseCounts[displayWorkout.routine.id]} exercises"`

**D. Readiness Summary Chip**
- Visible if: `readinessSummary` (non-null)
- Content (conditional):
  - If `currentMesoWeek?.awaitingDecision`: `{tone: 'go', line: 'Block finished. Targets hold at recovery-week volume until you choose what comes next.'}`
  - Else: Built by `buildReadinessSummary()` from fatigue history, deload suggestion, soreness/sleep/energy, current meso week
- Icon (tone-dependent): "trending-up-outline" (go), "alert-circle-outline" (caution), "bed-outline" (recover)
- Chip text: `readinessSummary.line` (e.g., "Early in your block, feeling sharp")
- Accessibility: `"See the shape of your training block and what the effort target means"`
- Action: Tap opens block shape sheet

**E. Coaching Brief Card**
- Visible if: `coachBrief` (result of `buildCoachBrief()` filtered for real signals)
- Rendered as: `CoachBriefCard` component
- Content: headline + body (e.g., "Light session. Your recent soreness suggests staying controlled.")
- Dismiss button: Closes brief, writes to AsyncStorage `@volyume_brief_dismissed_date`

**F. Start Actions**
- Primary button: "Start workout" (or "Starting..." if isStartingWorkout)
  - Action: Calls `handleStartNextWorkout(false)`, opens intent prompt
- Options button: "Options" (ellipsis icon)
  - Action: Sets `showChangeWorkout = true`, opens sheet

**G. Skip This Workout Link**
- Visible if: `programmePosition?.nextSession?.routineId === displayWorkout?.routine?.id`
- Text: "Skip this workout this time"
- Accessibility: `"Skip ${sessionDisplayName(...)} this time"`
- Action: Calls `handleSkipThisWorkout()`, shows confirmation alert

---

### 1.14 No Plan / Empty State
**Component:** `View` (`HomeScreen.js:2291-2390`)  
**Visible If:** `!activePlan || !nextWorkout`

**A. Empty State Card (Conditional by Tier)**

**Pro Tier:**
- Component: `EmptyState`
- Icon: "barbell-outline"
- Title: "No active plan yet"
- Text: "If you just signed in, we may still be pulling your data from the cloud. If nothing arrives, start with a plan and we'll rebuild it from your profile. [BLOCK_START_SENTENCE]"
- Action: "Start with a plan" → Calls `generateAndSavePlan()`

**Free Tier:**
- Component: `EmptyState`
- Icon: "compass-outline"
- Title: "No active plan yet"
- Text (conditional):
  - If `lastSession == null`: "Answer three quick questions and we'll suggest a starter plan. You can also browse the library."
  - Else: "You've been training without a set plan. Answer three quick questions and we'll suggest a starter plan, or browse the library."
- Action: "Start with a plan" → Navigates to FreeStarter
- Secondary: "Browse plans" → Navigates to PlansTab > PlanLibrary

**B. Progress at a Glance Card**
- Visible if: `lastSession != null` (has history)
- Title: "Your progress at a glance"
- Stats row:
  - Left: `weekStats.sessions` sessions this week
  - Divider
  - Right: `getRelativeDay(lastSession.startedAt)` (e.g., "Yesterday")

**C. Quick Start Card (Pro Only)**
- Component: `PressableCard`
- Icon: "barbell-outline"
- Title: "Start your first workout"
- Subtitle: "Log sets as you go. No plan needed to start. Your profile builds as you train."
- Chevron: "chevron-forward"
- Action: Calls `startBlankSession()`

**D. Blank Workout Link (Free Only)**
- Component: `Button` variant="secondary"
- Title: "Just want to log? Start a blank workout"
- Icon: "play-outline"
- Action: Calls `startBlankSession()`

---

### 1.15 Pro Teaser Card
**Component:** `HomeProTeaserCard` (`src/components/HomeProTeaserCard.js`)  
**Visible If:**
- `tier === 'free' && totalSessions >= 3 && !dismissed`

**Conditions (verbatim from code, line 2407):**
```javascript
{tier === 'free' && totalSessions >= 3 && (
  <HomeProTeaserCard
    totalSessions={totalSessions}
    teaserInsight={teaserInsight}
    onPress={goToProUpgrade}
  />
)}
```

**Per-week dismissal** (keyed `@volyume_pro_teaser_dismissed_${userId}_${localWeekStartMs()}`)

**Content (Conditional):**
- Icon: "barbell-outline"
- Title:
  - If `teaserInsight?.progressed && teaserInsight?.stalled`: `"${progressed} added weight. ${stalled} stayed at the same top weight. Pro tells you what to do next."`
  - Else if `teaserInsight?.progressed`: `"${progressed} added weight last session. Pro builds on it."`
  - Else if `totalSessions >= 10`: `"${totalSessions} sessions logged. Pro coaching uses all of it."`
  - Else: `"Add a coach that adjusts your plan each week."`
- Chevron: "chevron-forward"
- Dismiss: "close" icon

**Accessibility:**
- `accessibilityLabel`: `"Learn about Pro coaching"`
- Dismiss: `accessibilityLabel`: `"Dismiss the Pro suggestion"`

**Actions:**
- Tap card: Navigates to ProUpgrade screen with source='home'
- Tap dismiss: Sets `dismissed = true`, writes to AsyncStorage

---

### 1.16 Last Session Card
**Component:** `HomeLastSessionCard` (`src/components/HomeLastSessionCard.js`)  
**Visible If:** `lastSession` (non-null)

**Content:**
- Label: `"Last session - ${relativeDay}"` (e.g., "Last session - Yesterday")
  - relativeDay: Result of `getRelativeDay(lastSession.startedAt)` (Today, Yesterday, N days ago, date)
- Name: `lastSession.routineName || lastSession.name || 'Session'` (e.g., "Day 2: Back Width & Thickness")
- Meta: Inline stats
  - `"${durationMinutes}m"` (if exists)
  - `"${setCount} sets"` (if exists)
  - `"${totalVolume} kg lifted"` (if exists, else falls back to `lastSessionTonnage`)
  - Joined by " - "
  - Example: "45m - 18 sets - 8,400 kg lifted"
- Button: "Repeat" with "refresh-outline" icon

**Accessibility:**
- Card: `accessibilityLabel`: `"Open workout history"`
- Button: `accessibilityLabel`: `"Repeat last session"`

**Actions:**
- Tap card: Navigates to WorkoutHistory screen
- Tap Repeat button: Calls `handleRepeatLastSession()`, opens intent prompt for that routine

---

### 1.17 Coaching Discovery Nudge
**Component:** Inline `View` (`HomeScreen.js:2433-2471`)  
**Visible If:**
- `showCoachingNudge === true` (computed in `loadWeekStats()` line 1060-1062)
  - Visible when:
    - `tier === 'pro'` AND
    - `totalSessions >= 3` AND
    - User hasn't dismissed coaching nudge (flag `@volyume_seen_coaching_nudge`) AND
    - Today is the scheduled check-in day (default day 0, stored in prefs) AND
    - User has >= FIRST_CHECKIN_MIN_DAYS days of weight history AND
    - >= MIN_WEIGH_INS distinct morning weigh-ins in trailing week

**Content:**
- Icon: "pulse-outline" (Ionicons)
- Title: "Your weekly check-in is ready"
- Body: "It's your check-in day. See how your week went and what to adjust."
- Scan subline (conditional, if `!photoScanSuppressed`): "If you like, add a progress scan first for extra visual context. Skipping it is fine."
- Button: "Open check-in" with "chevron-forward" icon

**Accessibility:**
- Dismiss: `accessibilityLabel`: `"Dismiss coaching nudge"`
- Button: `accessibilityLabel`: `"Open check-in"`

**Actions:**
- Tap button: Calls `dismissCoachingNudge()`, navigates to ProfileTab > WeeklyCheckIn
- Tap dismiss: Calls `dismissCoachingNudge()`, writes to AsyncStorage `@volyume_seen_coaching_nudge`

---

### 1.18 Intent Prompt (Bottom Sheet Modal)
**Component:** `BottomSheet` (`HomeScreen.js:2521-2633`)  
**Visible If:** `showIntentPrompt === true`

**Content:**

**A. Header**
- Title: "How are you feeling today?"
- Subtitle: "Takes a second. When coaching is active, poor sleep or heavy soreness can ease today's session. Answering well never makes it harder than planned."

**B. Readiness Section (Optional)**
- Label: "Readiness (optional)"
- Three rows (each one line):
  - **Soreness** (label: "Soreness coming in", short: "Soreness")
    - Chips: Fresh (1), Mild (2), Sore (3)
  - **Sleep** (label: "Sleep last night", short: "Sleep")
    - Chips: Poor (2), OK (3), Good (4)
  - **Energy** (label: "Energy today", short: "Energy")
    - Chips: Low (2), OK (3), High (4)

**C. Intent Options (3 cards)**
1. **Sharp**
   - Icon: "flash-outline"
   - Label: "Sharp"
   - Sub: "Energised and ready"
   - Action: Calls `confirmStart('sharp')`

2. **Average**
   - Icon: "remove-outline"
   - Label: "Average"
   - Sub: "Normal day, feeling fine"
   - Action: Calls `confirmStart('average')`

3. **Below Par**
   - Icon: "arrow-down-outline"
   - Label: "Below par"
   - Sub: "Tired, stressed, or off"
   - Action: Calls `confirmStart('below_par')`

**D. Skip Link**
- Text: "Skip"
- Action: Calls `confirmStart(null, {soreness24hBefore: null, sleepQuality: null, energyScore: null})`

**E. Opt-Out Control**
- Text: "Don't ask before each session"
- Sub: "Without it, sessions are not adjusted to how you're feeling, and your next block's set targets stay where they are rather than moving on what this block showed. Turn it back on any time in Settings, Coaching."
- Action: Calls `require('../lib/sync').setUserPref()` to persist `@volyume_intent_prompt_off = 'true'`, then starts session

**Accessibility:**
- Sheet: `accessibilityLabel`: `"How are you feeling today"`
- Each readiness row: `accessibilityRole="radiogroup"` with label
- Each chip: `accessibilityRole="radio"` with label
- Each intent card: `accessibilityLabel`: `"${label}. ${sub}. Starts the workout."`
- Skip: `accessibilityLabel`: `"Skip and start without answering"`
- Opt-out: `accessibilityLabel`: `"Don't ask before each session"`

**Actions:**
- Tapping any intent card or Skip: Closes prompt, calls `confirmStart()`, navigates to ActiveWorkout
- Tapping opt-out: Persists preference, starts session
- Tapping readiness chip: Toggles selection (tap selected to deselect), plays haptic
- Sheet close: Dismisses without starting

---

### 1.19 Block Shape Sheet (Modal)
**Component:** `HomeBlockShapeSheet` (`src/components/HomeBlockShapeSheet.js`)  
**Visible If:** `showBlockShape === true`

**Content:**
- Block structure visualization
- Meso week info
- Training volume targets
- Block start lines (seed lines from `buildBlockStartLines()`)

**Actions:**
- Tap close: Sets `showBlockShape = false`
- Tap "Choose next": Navigates to PlansTab > Plans

---

### 1.20 Change Workout Sheet (Modal)
**Component:** `HomeChangeWorkoutSheet` (`src/components/HomeChangeWorkoutSheet.js`)  
**Visible If:** `showChangeWorkout === true`

**Content:**
- List of all workouts in active plan
- Exercise counts per workout
- Currently selected workout highlighted
- Option to select different workout from plan

**Actions:**
- Select workout: Sets `selectedWorkoutOverride = routineId`
- Close: Sets `showChangeWorkout = false`

---

### 1.21 What's New Sheet (Modal)
**Component:** `WhatsNewSheet` (imported, location not inspected)  
**Visible If:** Determined by internal WhatsNewSheet logic

**Content:** Dismissible one-time-per-update feature announcement

---

## 2. STATE AXES
Every boolean, enum, or derived state that changes what renders on HOME/TODAY surface.

| **State Variable** | **Source** | **Type** | **Range/Values** | **Effect on Rendering** |
|---|---|---|---|---|
| `user?.id` | Supabase auth (store) | string \| null | Any user ID \| null | Gate: almost everything requires user |
| `tier` | App store (`userProfile.tier`) | enum | 'free' \| 'pro' | Tier-gates entire features (TodayStrip, coaching nudge, teaser, etc.) |
| `userProfile?.firstName` | Supabase profile | string \| null | Any name \| null | Affects greeting subtitle |
| `bodyWeightUnits` | Store/profile | enum | 'st' \| 'kg' \| 'lbs' | Controls weight input format in TodayStrip |
| `userProfile?.trainingPhase` | Profile (build/cut/maintain) | enum | 'bulk' \| 'cut' \| 'maintain' \| null | Feeds phase mismatch detection |
| `activeWorkout` (store) | Persisted in memory/store | object \| null | Workout object \| null | Gates "Continue workout" vs hero card |
| `activePlan` | DB query `getActivePlan()` | object \| null | Plan object \| null | Gates hero card vs empty state |
| `nextWorkout` | DB query, resolved position | object \| null | {routine, idx, total} \| null | Controls workout display name, exercise count |
| `programmePosition` | `resolveProgrammePosition()` | object \| null | Position with nextSession, sessions[] | Controls next-session display, recovery state, skip visibility |
| `currentMesoWeek` | `getCurrentMesocycleWeek()` | object \| null | Meso week object \| null | Controls readiness summary, recovery state, block decision state |
| `gatedRecoveryState` | Derived from position \| meso week | enum \| null | RECOVERY_STATE values \| null | Controls RecoveryStateCard visibility/content |
| `recoveryRead` | AsyncStorage | boolean | true \| false | Controls RecoveryStateCard expanded/collapsed state |
| `latestCoachOutput` | `getLatestCoachOutput()` | object \| null | Coach output object \| null | Gates coach banner visibility |
| `latestCoachDecisionComplete` | Derived from output + checkin | boolean | true \| false | Refines coach banner visibility (must be completed decision) |
| `coachBannerDismissed` | AsyncStorage | boolean | true \| false | Controls coach banner dismissal (per week) |
| `showCoachingNudge` | Derived in loadWeekStats | boolean | true \| false | Gates coaching nudge card + suppresses trial banner |
| `trialBanner` | `loadTrialBanner()` result | object \| null | {line, variant} \| null | Gates trial banner visibility + content |
| `trialBannerDismissed` | AsyncStorage | boolean | true \| false | Controls trial banner dismissal (per trial per user) |
| `weekStats` | `loadWeekStats()` result | object | {sessions, sets, volume, deloadSuggested} | Feeds deload detection, week progress display |
| `deloadSuggestion` | `shouldDeload()` result | object \| null | Deload reason object \| null | Gates deload banner |
| `deloadDismissed` | State (resets per load) | boolean | true \| false | Controls deload banner dismissal |
| `currentMesoWeek?.isDeload` | DB (meso week flag) | boolean | true \| false | Suppresses deload banner if already in deload |
| `currentMesoWeek?.awaitingDecision` | DB (meso week state) | boolean | true \| false | Changes readiness summary, suppresses deload banner |
| `phaseMismatch` | `loadPhaseBanner()` result | object \| null | {currentPhase, savedPhaseLabel} \| null | Gates phase mismatch banner |
| `phaseBannerDismissed` | AsyncStorage | boolean | true \| false | Controls phase banner dismissal |
| `plateauBanner` | `loadPlateauBanner()` result | object \| null | {exerciseId, line} \| null | Gates plateau banner |
| `plateauBannerDismissed` | AsyncStorage | boolean | true \| false | Controls plateau banner dismissal (per exercise, per week) |
| `differentialBanner` | `detectDifferentialTrigger()` result | object \| null | {shown, trigger, ...} \| null | Gates differential paywall badge |
| `differentialDismissed` | AsyncStorage | boolean | true \| false | Controls differential banner dismissal (per week) |
| `activationNudge` | `resolveActivationNudge()` result | object \| null | {stage, ...} \| null | Gates activation nudge banner |
| `activationNudgeDismissed` | AsyncStorage | boolean | true \| false | Controls activation nudge dismissal (per stage) |
| `freeCoachLine` | `buildFreeCoachLine()` result | string \| null | Coach line \| null | Gates free weekly one-liner |
| `freeCoachLineDismissed` | AsyncStorage | boolean | true \| false | Controls free coach line dismissal (per week) |
| `todayWeight` | `getMorningWeightToday()` | number \| null | kg value \| null | Gates TodayStrip state (logged vs not logged) |
| `recentWeights` | `getMorningWeights(14)` | number[] | Array of kg values | Prefill for weight input in TodayStrip |
| `lastSession` | `getAllWorkouts()` sorted | object \| null | Workout object \| null | Gates last-session card, teaser insight lookup |
| `lastSessionTonnage` | `calculateTonnage()` | number \| null | kg lifted \| null | Fallback for last session meta |
| `totalSessions` | Count from `getAllWorkouts()` | number | >= 0 | Gates pro teaser card (>= 3), welcome card (=== 0) |
| `welcomeDismissed` | AsyncStorage | boolean | true \| false | Controls welcome card dismissal |
| `teaserInsight` | `getProgressionTeaser()` | object \| null | {progressed, stalled} \| null | Feeds pro teaser copy variants |
| `blockProgress` | `calculateWeeklyVolume()` result | object[] | Planned vs actual per muscle | Feeds coaching brief, readiness summary |
| `fatigueSessions` | `getRecentWorkoutFeedback()` | object[] | Feedback rows (newest-first) | Feeds coaching brief, readiness summary |
| `blockSeedLines` | `buildBlockStartLines()` result | string[] | Block explanation lines | Feeds block shape sheet |
| `initialLoading` | State (set false after loadData) | boolean | true \| false | Gates skeleton placeholders |
| `showIntentPrompt` | State | boolean | true \| false | Gates intent prompt BottomSheet |
| `readiness` | State (intent form) | object | {soreness24hBefore, sleepQuality, energyScore} | Readiness chip state in intent prompt |
| `isStartingWorkout` | State | boolean | true \| false | Controls "Starting..." button state, gates continue card |
| `showChangeWorkout` | State | boolean | true \| false | Gates change workout sheet |
| `showBlockShape` | State | boolean | true \| false | Gates block shape sheet |
| `refreshing` | State (pull-to-refresh) | boolean | true \| false | Controls RefreshControl spinner |
| `selectedWorkoutOverride` | State | object \| null | Routine object \| null | Overrides nextWorkout display when user picks alternative |
| `cloudSyncVersion` | Store version counter | number | >= 0 | Triggers re-load when cloud pull completes |
| `photoScanSuppressed` | `usePhotoSuppression()` hook | boolean | true \| false | Controls coaching nudge scan subline visibility |
| Open ED flag | `getOpenEdPatternFlag()` | 'read_failed' \| boolean | Truthy if open/read failed | Suppresses weight/nutrition content, fail-closed |
| Calm mode | `AsyncStorage` (WELLBEING_KEY) | string | 'unspecified' \| 'calm' \| 'read_failed' | Suppresses weight/nutrition/activation nudge content |
| Re-entry asked | State | boolean | true \| false | Gates re-entry check prompt (one-time per Home load) |
| ProgrammePosition state | `resolveProgrammePosition()` | enum | 'outstanding' \| 'complete' per session | Controls skip visibility (show only if outstanding) |

---

## 3. USER-VISIBLE STRING CATALOGUE
Every literal, computed, or helper-derived user-facing string on the surface.

### 3.1 Always-Present Strings

**ScreenHeader**
- Title: `"Today"` (hardcoded)
- Subtitle (5 variants by `getGreeting(firstName)`, line 99-107):
  - If hour < 5: `"Up early${name}."`
  - If hour < 12: `"Morning${name}."`
  - If hour < 17: `"Afternoon${name}."`
  - If hour < 21: `"Evening${name}."`
  - Else: `"Late night${name}."`
  - `${name}` = `, ${firstName}` if firstName exists, else empty string

---

### 3.2 Coach Review Banner (Tier: Pro, Conditional)

**Visible Strings:**
- Title: `"Coach - this week's decision"`
- Body (2 variants):
  - If calories adjusted: `"Calories adjusted to ${latestCoachOutput.adjustments.calories.newKcal} kcal. Tap to see why."`
  - Else: `"Tap to see what changed and why."`

---

### 3.3 Trial Value Banner (Tier: Pro Trial, Conditional)

**Visible String:**
- Body: `trialBanner.line` (computed by `trialBannerLine()`, line 585-588)
  - Built from trial variant, sessions, weigh-ins, unlock date
  - Appended: `"Your free trial runs to ${endsLabel}."`
- Button: `"How Precision Coaching works"`

**Helper:** `trialBannerLine()` in `/src/lib/trialActivation.js` (not inspected, but called with variant, counts, day name, edFlagOpen)

---

### 3.4 Deload/Recovery Week Banner (Conditional)

**Visible Strings:**
- Title: `"Recovery week suggested"`
- Body (2 parts):
  - Part A: `deloadSuggestion.reasons?.[0]` OR `"Your recent training signals it is time for a lighter week."`
  - Part B (if `scheduledRecoveryAhead`): `" Your block already has a recovery week scheduled at week ${scheduledRecoveryWeekIndex}, and you are in week ${currentMesoWeek.weekIndex}."`

**Helper:** `deloadSuggestion` reasons built by `shouldDeload()` in `/src/lib/algorithms.js` (not inspected)

---

### 3.5 Nutrition Phase Sync Banner (Conditional)

**Visible String:**
- Body: `"Your nutrition targets are set for ${phaseMismatch.savedPhaseLabel}. Update them in Coach to reflect your current plan."`

**Helper:** `phaseMismatch.savedPhaseLabel` from TRAINING_PHASES lookup

---

### 3.6 Lift Plateau Banner (Conditional)

**Visible String:**
- Body: `plateauBanner.line`

**Helper:** `plateauBannerLine(exerciseName, weeks, sessions, selectedFrom)` from `/src/lib/plateauSurfacing.js` (not inspected, example: "Bench Press stalled for 4 sessions across 3 weeks.")

---

### 3.7 Recovery State Card (Conditional)

**Visible Strings (from `recoveryStateCard()` helper):**
- Expanded title: `card.title` (e.g., "Recovery week")
- Expanded body: `card.body` (coaching explanation)
- Expanded next: `card.next` (what comes next)
- Compact title: `card.compactTitle` (e.g., "Recovery week")
- Compact action: `card.action` (e.g., "Tap to expand")

**Helper:** `recoveryStateCard()` in `/src/lib/recoveryState.js` (not inspected)

---

### 3.8 Activation Nudge Banner (Conditional, Free/Pro)

**Visible Strings:**
- Title: `activationBannerLine(activationNudge.stage)?.title`
- Body: `activationBannerLine(activationNudge.stage)?.body`

**Helper:** `activationBannerLine()` in `/src/lib/activationNudge.js` (not inspected)

---

### 3.9 Free Coach Line (Tier: Free, Conditional)

**Visible String:**
- Body: `freeCoachLine` (computed by `buildFreeCoachLine()`, line 646-651)
  - Built from sessions this week + weight direction
  - If ED flag open or calm mode: training-only line (no weight mention)
  - Button: `"Pro reads the full story"`

**Helper:** `buildFreeCoachLine()` in `/src/lib/coachResponse.js` (not inspected)

---

### 3.10 Differential Paywall Badge (Tier: Free, Conditional)

**Visible Strings:**
- Rendered by `DifferentialBadge` component (not inspected)
- Content varies by trigger (move_adherence, stalled_lift, deload_suggested, etc.)

---

### 3.11 TodayStrip / Morning Weight (Tier: Pro)

**Logged State:**
- Label: `"Morning weight"`
- Value: `formatBodyWeightShort(todayWeight, bwu)` (e.g., "84.0 kg", "13st 5lb")
- Pill: `"Logged"`

**Not Logged State:**
- Label: `"Morning weight"`
- Prompt: `"Not logged yet"`
- Why: `"Before food, after the bathroom. It feeds your weight trend, and several mornings go by before anything changes."`
- Button: `"Log"`

**Editing State:**
- Label: `"Morning weight"`
- Input placeholders:
  - St: `"12st"`, `"7lb"`
  - Kg/Lbs: `${bwu}`
- Button: `"Log"`

**Helpers:**
- `formatBodyWeightShort()` in `/src/lib/units.js`
- Unit conversions via `kgToStoneLbsStrings()`, `parseBodyWeightToKg()`, etc.

---

### 3.12 Active Workout Continue Card (Conditional)

**Visible Strings:**
- Title: `"Workout in progress"`
- Subtitle: `"Tap to return to your workout"`

---

### 3.13 Hero Workout Card (Conditional)

**Eyebrow Section Label:**
- Conditional: `"${recoveryLabel} · ${planProgress}"` OR just `planProgress`

**Helper:** `nextWorkoutRecoveryLabel()` in `/src/lib/recoveryState.js`, `activePlanLine()` in `/src/lib/planDisplay.js` (not inspected)

**Workout Name:**
- `sessionDisplayName(nextSession, sessionsList)` OR `displayWorkout?.routine?.name`

**Helper:** `sessionDisplayName()` in `/src/lib/blockProgression.js` (not inspected)

**Exercise Count:**
- `"${count} exercises"`

**Readiness Chip:**
- Icon + `readinessSummary.line` (e.g., "Early in your block, feeling sharp")
- Special case: `"Block finished. Targets hold at recovery-week volume until you choose what comes next."` if awaitingDecision

**Helper:** `buildReadinessSummary()` in `/src/lib/readinessSummary.js` (not inspected)

**Coaching Brief Card:**
- Headline: `brief.headline` (e.g., "Light session")
- Body: `brief.body` (e.g., "Your recent soreness suggests staying controlled.")

**Helper:** `buildCoachBrief()` in `/src/lib/homeCoachBrief.js` (not inspected)

**Start Buttons:**
- Primary: `"Start workout"` OR `"Starting..."`
- Options: `"Options"`

**Skip Link:**
- `"Skip this workout this time"`

---

### 3.14 Empty State (No Plan)

**Pro Tier:**
- Title: `"No active plan yet"`
- Text: `"If you just signed in, we may still be pulling your data from the cloud. If nothing arrives, start with a plan and we'll rebuild it from your profile. ${BLOCK_START_SENTENCE}"`
- Action: `"Start with a plan"`

**Free Tier:**
- Title: `"No active plan yet"`
- Text (2 variants):
  - No history: `"Answer three quick questions and we'll suggest a starter plan. You can also browse the library."`
  - Has history: `"You've been training without a set plan. Answer three quick questions and we'll suggest a starter plan, or browse the library."`
- Action: `"Start with a plan"`
- Secondary: `"Browse plans"`

**Progress at a Glance:**
- Title: `"Your progress at a glance"`
- Label A: `"Sessions this week"`
- Label B: `"Last session"`

**Quick Start (Pro):**
- Title: `"Start your first workout"`
- Subtitle: `"Log sets as you go. No plan needed to start. Your profile builds as you train."`

**Blank Session (Free):**
- Title: `"Just want to log? Start a blank workout"`

**Helper:** `BLOCK_START_SENTENCE` from `/src/lib/blockExplain.js` (not inspected)

---

### 3.15 Pro Teaser Card (Tier: Free, 3+ Sessions)

**Content (4 variants by `teaserInsight` + `totalSessions`):**
1. If both progressed and stalled: `"${progressed} added weight. ${stalled} stayed at the same top weight. Pro tells you what to do next."`
2. If only progressed: `"${progressed} added weight last session. Pro builds on it."`
3. If >= 10 sessions: `"${totalSessions} sessions logged. Pro coaching uses all of it."`
4. Else: `"Add a coach that adjusts your plan each week."`

**Helper:** `teaserInsight` from `getProgressionTeaser()` in `/src/lib/database.js` (not inspected)

---

### 3.16 Last Session Card (Conditional)

**Visible Strings:**
- Label: `"Last session - ${relativeDay}"`
  - `relativeDay` (5 variants by `getRelativeDay()`, line 2644-2657):
    - Today: `"Today"`
    - Yesterday: `"Yesterday"`
    - < 7 days: `"${dayDiff} days ago"`
    - >= 7 days: `format(then, 'd MMM')` (e.g., "25 Aug")
- Name: `lastSession.routineName || lastSession.name || 'Session'`
- Meta (comma-separated, if exists):
  - Duration: `"${durationMinutes}m"`
  - Sets: `"${setCount} sets"`
  - Volume: `"${Math.round(totalVolume).toLocaleString('en-GB')} kg lifted"` (British locale, thousands separator)
- Button: `"Repeat"`

---

### 3.17 Coaching Discovery Nudge (Tier: Pro, Conditional)

**Visible Strings:**
- Title: `"Your weekly check-in is ready"`
- Body: `"It's your check-in day. See how your week went and what to adjust."`
- Scan subline (if `!photoScanSuppressed`): `"If you like, add a progress scan first for extra visual context. Skipping it is fine."`
- Button: `"Open check-in"`

---

### 3.18 Welcome Card (First Launch, 0 Sessions)

**Visible Strings:**
- Title: `"Welcome to Volyume"`
- Step 1:
  - Num: `"1"`
  - Title: `"Start a session below"`
  - Body: `"Begin from your plan, or just log freely. Tap Start workout and log each set as you go."`
- Step 2:
  - Num: `"2"`
  - Title (Pro): `"Your coach learns as you train"`
  - Title (Free): `"Your progress builds as you train"`
  - Body (Pro): `"Every session you log sharpens your plan. There is nothing to set up."`
  - Body (Free): `"Every session you log builds your history, your records and your weekly volume. There is nothing to set up."`

---

### 3.19 Intent Prompt / How Are You Feeling (Bottom Sheet)

**Header:**
- Title: `"How are you feeling today?"`
- Subtitle: `"Takes a second. When coaching is active, poor sleep or heavy soreness can ease today's session. Answering well never makes it harder than planned."`

**Readiness Group:**
- Label: `"Readiness (optional)"`
- Row 1 (Soreness):
  - Label: `"Soreness coming in"`, short: `"Soreness"`
  - Chips: `"Fresh"` (1), `"Mild"` (2), `"Sore"` (3)
- Row 2 (Sleep):
  - Label: `"Sleep last night"`, short: `"Sleep"`
  - Chips: `"Poor"` (2), `"OK"` (3), `"Good"` (4)
- Row 3 (Energy):
  - Label: `"Energy today"`, short: `"Energy"`
  - Chips: `"Low"` (2), `"OK"` (3), `"High"` (4)

**Intent Options (3 cards):**
1. Sharp: `"Energised and ready"`
2. Average: `"Normal day, feeling fine"`
3. Below par: `"Tired, stressed, or off"`

**Bottom Controls:**
- Skip: `"Skip"`
- Opt-out title: `"Don't ask before each session"`
- Opt-out body: `"Without it, sessions are not adjusted to how you're feeling, and your next block's set targets stay where they are rather than moving on what this block showed. Turn it back on any time in Settings, Coaching."`

**Helper:** `READINESS_ROWS` constant (line 121-140)

---

### 3.20 Block Shape Sheet (Modal)
(Content not fully inspected; renders from `HomeBlockShapeSheet` component)

---

### 3.21 Change Workout Sheet (Modal)
(Content not fully inspected; renders from `HomeChangeWorkoutSheet` component)

---

## 4. ACTION INVENTORY
Every tappable element and its effect (navigation or state change).

| **Element** | **Section** | **Action** | **Destination / Effect** | **State Changed** | **Side Effects** |
|---|---|---|---|---|---|
| Coach banner | Coach Review | Tap banner | ProfileTab > CoachOutput (weekStart param) | — | Haptic.selection(), navigateCrossTab |
| Coach banner close | Coach Review | Tap close | — | `coachBannerDismissed = true` | AsyncStorage write key |
| Trial banner card | Trial Value | Tap (if variant S3 + plan) | Start next workout | `showIntentPrompt = true` | Calls `handleStartNextWorkout(false)` |
| Trial banner card | Trial Value | Tap (else) | ProfileTab > WeeklyCheckIn | — | navigateCrossTab |
| Trial methodology button | Trial Value | Tap button | ProfileTab > Methodology (source='trial_banner') | — | navigateCrossTab |
| Trial banner close | Trial Value | Tap close | — | `trialBannerDismissed = true` | AsyncStorage write key |
| Deload banner | Recovery Week | Tap banner | CoachReview screen | — | Haptic.selection(), navigation.navigate |
| Deload banner close | Recovery Week | Tap close | — | `deloadDismissed = true` | Local state only (no persistence) |
| Phase banner arrow | Phase Sync | Tap arrow | ProfileTab > NutritionTargets | — | Haptic.selection(), navigateCrossTab |
| Phase banner close | Phase Sync | Tap close | — | `phaseBannerDismissed = true` | AsyncStorage write key |
| Plateau banner | Plateau | Tap banner | ProgressTab > ExerciseDetail (exerciseId param) | — | Haptic.selection(), navigateCrossTab |
| Plateau banner close | Plateau | Tap close | — | `plateauBannerDismissed = true` | AsyncStorage write key |
| Recovery state card | Recovery State | Tap card | — | `recoveryRead = !recoveryRead` | AsyncStorage write (toggle read state) |
| Activation nudge banner | Activation | Tap banner | Start next workout | `showIntentPrompt = true` | Calls `handleStartNextWorkout(false)`, haptic |
| Activation nudge close | Activation | Tap close | — | `activationNudgeDismissed = true` | AsyncStorage write key |
| Free coach line close | Attention (Free) | Tap close | — | `freeCoachLineDismissed = true` | AsyncStorage write key, per week |
| Free coach line button | Attention (Free) | Tap button | ProUpgrade screen (source='home_attention_card') | — | navigation.navigate |
| Differential badge | Attention (Diff) | Varies | Depends on DifferentialBadge variant | — | Calls `onDifferentialCta()` with action |
| Weight logged card | TodayStrip | Tap card (has trend) | ProgressTab > Analytics (focusWeightTrend=true) | — | Navigates, navigateCrossTab |
| Weight logged card | TodayStrip | Tap card (no trend) | — | `editing = true` | Opens weight input |
| Weight logged card | TodayStrip | Long press | — | `editing = true` | Opens weight input |
| Weight not logged | TodayStrip | Tap card or button | — | `editing = true` | Opens weight input |
| Weight input Log button | TodayStrip | Tap | — | `todayWeight = kg`, `editing = false` | Calls `onLogWeight(kg)`, optimistic update, async write |
| Continue workout card | Active Workout | Tap card | Navigate to ActiveWorkout screen | `isStartingWorkout = false` | — |
| Readiness chip | Hero Card | Tap chip | — | `showBlockShape = true` | Opens block shape sheet, haptic |
| Start workout button | Hero Card | Tap button | — | `showIntentPrompt = true` | Calls `handleStartNextWorkout(false)`, haptic, ref guard |
| Options button | Hero Card | Tap button | — | `showChangeWorkout = true` | Opens change workout sheet |
| Skip link | Hero Card | Tap link | — | — | Calls `handleSkipThisWorkout()`, shows alert |
| Skip confirmation | Alert (Skip) | Tap confirm | — | — | Calls `recordSessionResolution()` with 'skipped_by_user', refreshes plan data |
| Pro empty state button | Empty State (Pro) | Tap button | — | — | Calls `generateAndSavePlan()`, reloads data |
| Free starter button | Empty State (Free) | Tap button | FreeStarter screen | — | navigation.navigate |
| Free browse button | Empty State (Free) | Tap secondary | PlansTab > PlanLibrary | — | navigation.navigate |
| Quick start card | Empty State (Pro) | Tap card | — | — | Calls `startBlankSession()`, navigates to ActiveWorkout |
| Blank session link | Empty State (Free) | Tap link | — | — | Calls `startBlankSession()`, navigates to ActiveWorkout |
| Pro teaser card | Pro Teaser | Tap card | ProUpgrade screen (source='home') | — | Calls `goToProUpgrade()`, navigation.navigate |
| Pro teaser close | Pro Teaser | Tap close | — | `dismissed = true` | AsyncStorage write key per week |
| Last session card | Last Session | Tap card | Navigate to WorkoutHistory | — | Calls `goToWorkoutHistory()`, navigation.navigate |
| Last session Repeat | Last Session | Tap button | — | `showIntentPrompt = true` | Calls `handleRepeatLastSession()`, haptic |
| Coaching nudge button | Coaching Nudge | Tap button | ProfileTab > WeeklyCheckIn | — | Calls `dismissCoachingNudge()`, navigates |
| Coaching nudge close | Coaching Nudge | Tap close | — | `showCoachingNudge = false` | AsyncStorage write `@volyume_seen_coaching_nudge` |
| Readiness chip (intent) | Intent Prompt | Tap chip | — | `readiness[key] = value OR null` (toggle) | Haptic.selection |
| Intent option card (Sharp) | Intent Prompt | Tap option | Closes sheet, starts ActiveWorkout | — | Calls `confirmStart('sharp', readiness)` |
| Intent option card (Average) | Intent Prompt | Tap option | Closes sheet, starts ActiveWorkout | — | Calls `confirmStart('average', readiness)` |
| Intent option card (Below Par) | Intent Prompt | Tap option | Closes sheet, starts ActiveWorkout | — | Calls `confirmStart('below_par', readiness)` |
| Skip button (Intent) | Intent Prompt | Tap Skip | Closes sheet, starts ActiveWorkout | — | Calls `confirmStart(null, nullReadiness)` |
| Opt-out control | Intent Prompt | Tap opt-out | Closes sheet, starts ActiveWorkout | — | Calls `require('../lib/sync').setUserPref()`, persists `@volyume_intent_prompt_off = 'true'` |
| Block shape sheet | Modal | Tap "Choose next" | PlansTab > Plans | — | navigateCrossTab |
| Block shape sheet | Modal | Tap close | — | `showBlockShape = false` | — |
| Change workout sheet | Modal | Select workout | — | `selectedWorkoutOverride = routineId` | Updates hero card display |
| Change workout sheet | Modal | Tap close | — | `showChangeWorkout = false` | — |

---

## 5. STATE-COMBINATION COUNT

**Estimation of distinct screen configurations:**

This surface has **~7 binary banner slots** (cap to 1 shown, so 8 possible states: none or one of 7), **2 main content areas** (hero vs empty), **4-5 sub-state branches** within each, and **~15 gating axes** that compound visibility.

**Major axis combinations:**

1. **Auth state:** logged in vs logged out (affects ~everything)
2. **Tier:** free (1 state) vs pro (1 state) → 2 branches, 60% code split
3. **Plan state:** active (hero) vs none (empty) → 2 branches
4. **Active workout:** in-progress (continue card) vs none → changes hero
5. **Banner cap:** 8 possible (none + 7 ranked) → 8 states
6. **Weight state (Pro):** logged, not-logged, editing → 3 states
7. **Welcome:** shown, dismissed, hidden by sessions → 3 states
8. **Teaser (Free, 3+):** shown, dismissed, hidden → 3 states
9. **Recovery state:** none, expanded, collapsed → 3 states
10. **Readiness:** null (no block), various tone values → ~4 states
11. **Coaching nudge (Pro):** shown, dismissed → 2 states
12. **Intent prompt:** shown, hidden → 2 states (not counted as "on screen" but overlaid)

**Conservative estimate (main visible sections only, tier-gated):**
- Auth gate: 2 branches (not logged in doesn't render, so 1 is Home)
- Tier: 2 branches → 2 top-level versions
- Banner: 8 states per tier → **2 × 8 = 16 base**
- Weight (Pro): 3 states
- Welcome (first load): 3 states → **16 × 3 × 3 = 144 for Pro alone**
- Hero vs empty: 2 states → **144 × 2 = 288**
- Teaser (Free, 3+): 3 states → 288 for free side
- Recovery expanded/collapsed: 3 states → affects both → **288 × 3 = 864**

**Realistic upper bound (accounting for overlaps, gating constraints, real-world data):**
- A user at a given app session has **fixed tier, fixed user, fixed auth**
- Within that session, visible sections are gated by data availability and onboarding state
- Most combinations are **mutually exclusive** (can't be in welcome AND have 100 sessions; can't have active workout AND be viewing empty state)

**Reasonable estimate: 150–400 distinct layouts** across the full user base lifecycle, depending on how strictly you count minor UI state changes (e.g., "expanded" vs "collapsed" recovery card with identical sections) vs distinct configurations.

**For practical testing:**
- **Free tier, day 0:** welcome card, no plan, no sessions → 1 config
- **Free tier, day 1+, 3+ sessions:** teaser card, last session card, empty state or plan hero → ~10 configs (with banner variations)
- **Pro tier, day 0:** TodayStrip, no plan, no sessions → 1 config
- **Pro tier, active plan:** TodayStrip, hero card, coaching nudge, last session, coaching output (if ready) → ~20 configs (with banner + readiness + recovery variations)
- **Pro trial (week 1):** trial banner, TodayStrip, empty state or plan hero → ~10 configs

**Total tested configs in a thorough audit: ~50–80 snapshots** covering tier, onboarding, weight state, banner priority, recovery state, and plan presence.

---

## SUMMARY

| **Metric** | **Count** |
|---|---|
| **Top-level sections** | 21 (header + 20 content sections) |
| **State axes** | ~47 (tier, user, plan, weight, welcome, teaser, recovery, banner priority, ED flag, calm mode, etc.) |
| **User-visible strings** | ~120 (hardcoded literals + computed helpers) |
| **Tappable actions** | ~65 |
| **Gating conditions** | ~80+ (per-section visibility checks) |
| **Estimated distinct layouts** | 150–400 (realistic); 50–80 (well-tested coverage) |

---

## UNTRACEABLE ELEMENTS

1. **`HomeBlockShapeSheet` component** (`src/components/HomeBlockShapeSheet.js`)
   - Not read (modal sheet, content not fully inspected)
   - Renders block structure, meso info, seed lines
   - Buttons: "Choose next" → PlansTab, close → state

2. **`HomeChangeWorkoutSheet` component** (`src/components/HomeChangeWorkoutSheet.js`)
   - Not read (modal sheet, content not fully inspected)
   - Renders list of plan workouts with exercise counts
   - Selection updates `selectedWorkoutOverride`

3. **`DifferentialBadge` component** (imported in AttentionCard)
   - Not read; content varies by `differential.trigger`
   - Requires separate inspection for full variant strings

4. **`WhatsNewSheet` component** (imported, modal)
   - Not read; one-time-per-update feature sheet
   - Content dynamic (per app version)

5. **Helper Functions (Computed Strings):**
   - `buildCoachBrief()` in `/src/lib/homeCoachBrief.js` — coaching brief headline + body variants
   - `buildReadinessSummary()` in `/src/lib/readinessSummary.js` — readiness line + tone
   - `trialBannerLine()` in `/src/lib/trialActivation.js` — trial value line variants
   - `buildFreeCoachLine()` in `/src/lib/coachResponse.js` — free weekly one-liner
   - `activationBannerLine()` in `/src/lib/activationNudge.js` — activation nudge title + body
   - `plateauBannerLine()` in `/src/lib/plateauSurfacing.js` — plateau detection sentence
   - `recoveryStateCard()` in `/src/lib/recoveryState.js` — recovery state title, body, next, action
   - `nextWorkoutRecoveryLabel()` in `/src/lib/recoveryState.js` — recovery state label
   - `activePlanLine()` in `/src/lib/planDisplay.js` — "Day N of M" line
   - `planHeadingName()` in `/src/lib/planDisplay.js` — plan name formatting
   - `sessionDisplayName()` in `/src/lib/blockProgression.js` — workout name with position qualifier
   - `getProgressionTeaser()` in `/src/lib/database.js` — progression insight (exercise + direction)
   - `shouldDeload()` in `/src/lib/algorithms.js` — deload detection + reasons
   - `getRelativeDay()` in HomeScreen.js (line 2644-2657) — "Today" / "Yesterday" / "N days ago" / date
   - `getGreeting()` in HomeScreen.js (line 99-107) — time-of-day greeting
   - `formatBodyWeightShort()` in `/src/lib/units.js` — weight value formatting

   **Why not traced:** Helpers live in separate files, some require database reads or complex deterministic logic. The strings depend on live data (workout counts, week boundaries, error flags). Full tracing would require reading 10+ lib modules.

6. **Database Queries (Data-Dependent Rendering):**
   - `getActivePlan()` — returns plan object or null
   - `getAllWorkouts()` — returns array (affects session count, last session, etc.)
   - `getCurrentMesocycleWeek()` — returns meso week or null
   - `getLatestCoachOutput()` — returns coach output or null
   - `getMorningWeightToday()` — returns weight entry or null
   - `getProgressionTeaser()` — returns comparison insight or null
   - `shouldDeload()` — returns deload verdict with reasons

   **Why not traced:** These queries execute in `loadData()` and related loaders. Their result shapes drive visibility and content, but the query logic itself is in database.js and separate domain modules.

---

## NOTES FOR FUTURE WORK

- **Brand identity:** "Today" header + "Volyume" V mark are consistent across all app screens
- **Theme:** Live theme hook (`useTheme()`) applied to every component; dark/light mode support is dynamic
- **Localisation:** British English (colour, behaviour, optimise) per CLAUDE.md; British locale for number formatting (1,000 sep)
- **Accessibility:** All interactive elements have `accessibilityLabel`, `accessibilityRole`, and state (`accessibilityState`)
- **Haptic feedback:** Selection beat on all primary actions (`haptics.selection()`)
- **Ed-safety:** ED flag and calm mode suppress weight/nutrition/activation content (fail-closed on read errors)
- **One-banner cap:** Only ONE attention banner shown at a time; priority order in BANNER_PRIORITY array (coach > trial > deload > phase > plateau > activation > free/differential)
