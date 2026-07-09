# Facts: Workout logging

Raw fact-extraction report, saved verbatim from a read-only subagent
(model: claude-sonnet-5) run on 2026-07-09. Evidence base for `ASSESSMENT.md`.
Facts only; all judgement lives in the assessment.

---

# UX Audit Facts — Workout Logging, Rest Timer, Cardio, History

## 1. LOGGING LOOP
Set entry (`src/components/SetEntry.js`): weight/reps fields are stepper+TextInput combos (`±weightStepKg` per exercise, default 2.5kg; reps ±1). Long-press repeats the step every 200ms. Weight input accepts decimals via regex `/^\d{0,3}\.?\d{0,2}$/`, capped 500; reps capped [1,200]. Reps field's `Done` key directly calls `onSubmitComplete` (logs the set) — "keyboard-completes-the-set" (SetEntry.js:356-360). No RPE/RIR UI: a comment at SetEntry.js:381-384 says the "Effort picker removed, was rarely used in practice. RIR still gets recorded internally" — `rir` defaults to 2 and is stored (`ActiveWorkoutScreen.js:1200`) but never surfaced to the user.

Previous performance: `getLastNWorkoutSets` loads the last 2 sessions; the current set pre-fills from the **actual weight/reps last performed** at that set position (`getBestAnchorSet`), not the computed progression target — deliberately, per comment "the target felt random to users" (ActiveWorkoutScreen.js:999-1010). A muted "ghost" pre-fill (`isGhost`) shows when no per-position history exists, sourced from the prior session's set.

Plate maths: `src/lib/plateMath.js` exports a fully-implemented `calculatePlates()` (greedy per-side plate breakdown, quarter-kg-safe), covered by `plateMath.test.js`, but grep confirms it is **called nowhere in production UI** — only `DEFAULT_BAR_KG` is imported by ActiveWorkoutScreen, for the warm-up-ramp calculator (line 2907), not a plate display.

Superset/dropset: 6 set types (Working, Warm-up, Drop set, Myo-reps, Rest-pause, AMRAP) via `SET_TYPE_OPTIONS` (line 75-82). Myo-rep/rest-pause "cluster" sets accumulate mini-sets locally and commit as one row on finish (`finishCluster`, line 1619). Supersets pair two adjacent exercises (`supersetGroupId`); logging the earlier half auto-jumps to the paired exercise without starting rest; only after the later half does rest start (line 1327-1340). Swap (`handleConfirmSwap`) and reorder (`handleMoveExercise`, added under L07-F9) are both supported mid-session; reorder is blocked when either exercise is in a superset pair. Notes: a single free-text note field attaches to the *next* logged set (`noteText`), not a running session note.

## 2. REST TIMER
`src/components/RestTimer.js`: auto-starts on set completion if `autoStartRestTimer` pref is on, honouring per-exercise `restSeconds` else `defaultRestSeconds` else 90s. Adjustable via ±15s buttons only (the −30/+30 pair was removed as redundant with long-press-repeat, line 48-53). Background/lock-screen: two tiers — Android uses a native "shortService chronometer" foreground service (`modules/rest-timer-live`) when the rest fits its OS window (~3 min cap `REST_FOREGROUND_MAX_MS`), falling back to a static sticky notification; iOS uses ActivityKit Live Activities (`modules/live-activity`) but the comment at live-activity/index.ts:34-37 states the Xcode widget-extension target is **not yet wired**, so `Activity.request()` throws and Live Activities never actually appear yet — Android's chronometer "remains the lock-screen surface in the meantime." Countdown escalates haptic+audio at 3/2/1/0s (660Hz→1100Hz "GO" tone). A one-time exact-alarm permission ask fires on Android.

## 3. COPY (verbatim)
- "Workout complete" / "Your first workout is done, and that's the hard part over." (WorkoutSummaryScreen.js:485,867)
- "PERSONAL RECORD" / "Tap to continue" (PRCelebration.js:275,290)
- "First lift logged" / "{weight}{units} x {reps} logged as your starting point" (ActiveWorkoutScreen.js:1288)
- "+{pct}% over your previous best" (PRCelebration.js:286)
- "Strongest workout in 4 weeks" / "On pace with your last {n} sessions" (WorkoutSummaryScreen.js:921,933)
- "Discard workout? This will delete the current workout session. Your plan will not advance." (ActiveWorkoutScreen.js:3286-3288)
- "Couldn't save set / Your set wasn't saved. Tap {action} to try again." (ActiveWorkoutScreen.js:1401-1404)
- "Your workouts will appear here / Completed workouts appear here, saved automatically when you finish." (WorkoutHistoryScreen.js:803-806)
- "No cardio yet / Sessions you log show up here." (CardioHistoryScreen.js:187-192)
- "Burned about {n} kcal / Already counted. This isn't added to your calorie target, your weight trend includes everything you burn." (LogCardioScreen.js:225,228)
- "Enter your working weight first, then come back for warm-up sets." (ActiveWorkoutScreen.js:2900)
- "Delete this workout? The session and all its sets are removed from your history, and your stats recalculate. This cannot be undone." (WorkoutHistoryScreen.js:210-211)

## 4. STATE COVERAGE
Crash recovery: an in-progress (typed, not logged) set is persisted to AsyncStorage debounced 250ms and flushed instantly on `AppState` background/inactive (ActiveWorkoutScreen.js:1113-1140), keyed by workout+exercise+set-position so it restores only onto the matching slot. A stale-session check fires a modal if `lastActivityAt` is >4h old. Offline: everything writes to local SQLite first; cloud push is fire-and-forget with `enqueueSyncOp` retry queues for deletes. Accidental-exit: hardware back button routes through `handleCancelWorkout`; a genuinely empty session (no sets, nothing typed) discards silently, otherwise a confirm modal fires; `hasInProgressSetEntry()` widens the gate to cover an unlogged typed set, an in-progress cluster, or an unsaved note (line 664-669). Finish has a double-tap guard (`finishingRef`) and names any unlogged set explicitly in the confirm copy.

## 5. SUMMARY & CELEBRATION
WorkoutSummaryScreen shows: hero "Total lifted" tonnage (RollingNumber count-up) fused with a 4-week same-routine comparison verdict (best/up/down/on_pace), stat row (exercises/working sets/duration), milestone card (session-count ladder), block-arc strip, per-exercise set list, PR count row, weekly muscle-volume status (green/yellow/red/grey), partner "cheer" beat, and an optional feedback sheet (fires after session 1 and 10). PR detection (`detectPR`) runs at log time against local+session history; a first-ever set for an exercise is deliberately **not** badged as a PR ("beats nothing" — shows a quiet "first lift" toast instead). Big milestone rungs (50/100 sessions) get a gold `MilestoneBurst` particle animation + escalated haptic; smaller rungs get a quiet haptic only. Share is free (not Pro-gated) via `ShareCard` for both PRs and milestones. All celebratory surfaces are suppressed under calm mode or an open ED flag (fail-closed: a wellbeing-read failure is treated as calm).

## 6. ACCESSIBILITY + PERFORMANCE
Set inputs carry explicit `accessibilityLabel`s ("Weight in {units}", "Number of reps", decrease/increase with "Hold to keep adjusting" hints). Weight uses `keyboardType="decimal-pad"`, reps `"number-pad"` — no `inputAccessoryView`. TalkBack gets spoken announcements at set-log, PR, and rest-timer edges via `AccessibilityInfo.announceForAccessibility` rather than a live region (deliberately, "a per-second label spoke the whole rest aloud" — RestTimer.js:374-379). List perf: the in-session "This workout" logged-set list is a plain `.map()` (not virtualized) but each row is `React.memo`'d with a stable `onEdit` callback so per-second timer re-renders skip it; the exercise-swap candidate list and cardio/workout history lists use `FlashList`. `ActiveWorkoutScreen` uses `useShallow` selectors throughout specifically to avoid re-rendering a "2000-line tree" on every rest-timer tick.

## 7. STANDOUT
**Strong:** (1) draft auto-save + instant background-flush makes an app-kill mid-set nearly lossless; (2) honest PR/first-lift distinction avoids a false "record" on session one; (3) superset-aware auto-jump + deferred rest timing; (4) calm/ED-safe suppression is threaded through every celebratory surface, fail-closed; (5) 4-week tonnage comparison fused into the hero stat rather than a separate chart.

**Rough edges:** (1) `calculatePlates()` is fully built and tested but has zero UI call sites — no actual plate-loading display exists despite the underlying math; (2) RPE/RIR capture UI was removed entirely, so autoregulation only ever gets a hardcoded default (rir:2); (3) iOS Live Activities code path exists but is inert (missing Xcode widget target), silently falling short of the advertised Dynamic Island experience; (4) the live logged-set list isn't virtualized (fine at typical set counts, but not list-perf-hardened for a very long session); (5) notes are single-field-per-next-set, not a persistent per-exercise/session note.
