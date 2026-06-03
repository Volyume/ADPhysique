# Cardio QA - Executive summary

Status: COMPLETE (assessment). Timestamp: 2026-06-03. No code changed; awaiting
confirmation before Phase 7. Full detail in `cardio-qa-01` … `-06`.

## Verdict
The cardio feature is solid and visually native (Train card = StepsCard, Diary
row = WaterRow, Plans card matches Plans). No crashes, no data loss, no
double-counted calories. The calorie model is correct (feedback only, never
added). But there is one important integration gap: **the coach does not yet use
the cardio the user logs.**

## Critical bugs found
- **None that crash or lose data.** The most material is **CARDIO-BUG-1
  (Medium):** the Diary cardio row is not tier-gated (`DiaryScreen.js:538`), so
  free-tier users see it though cardio is Pro-only everywhere else. One-line fix.
- Lower: kcal silently defaults to 75 kg when bodyweight is unknown (BUG-6);
  `CardioHistoryScreen` has no mount-test coverage.

## Single biggest coaching-integration weakness
**CI-1 (High): cardio compliance is captured but ignored by the coach.** The
check-in question is even pre-answered from the log, but `weeklyCoach` reads no
`cardioAdherence`, no prior `cardioTarget`, and no session count (grep-verified),
and the tested `nextCardioTarget` is never called. The coach re-derives the
cardio dose from the weight trend alone. The loop flows out to the user but not
back into coaching. The engine to close it is already built and tested; it needs
wiring (thread the week's `cardio_log` summary into `runWeeklyCoach`,
`CoachOutputScreen.js:1027`).

## Top 5 UX / quality gaps
1. **Coach blind to logged cardio** (CI-1) - behavioural bolt-on, the headline.
2. **Recovery load shows the user a note but does not affect coach training
   advice** (CI-2); `cardioRecoveryFlag` never called.
3. **Bare `useAppStore()`** in the two cardio screens vs the `useShallow`
   convention (CQ-1) - re-render cost + bolt-on signal.
4. **No per-activity last-used defaults** (UX-1) - every activity-first app
   remembers duration/intensity; Volyume always defaults to 30 min.
5. **Diary kcal has no "not added" clarifier** (UX-2) and the activity list is
   text-only with no glyphs (UX-3).

## Recommended implementation order (after confirmation)
1. P1 tier-gate the Diary row (1 line). 2. P4/P5 `useShallow` + mount coverage.
3. **P2 close the coaching loop** (compliance → `nextCardioTarget`, with tests) -
   the highest-value change. 4. P3 coach recovery flag. 5. Polish: P6
   per-activity defaults → P8 glyphs → P7 Diary kcal → P10 hide kcal w/o weight.
6. Founder decision D1: acknowledge cardio for non-cut users, or stay silent.

Nothing needs a schema change; migration 064 remains the only pending DB item.
