# Deep Feature Audit — Progress / Resume Marker

Single source of truth for where the audit stands. Update on each session end.

## Status as of 2026-06-04 (checkpoint)

Branch `main`, 0/0 with origin, working tree clean, repo eslint **0 problems**,
full suite green (174 suites, 2820 passing).

### Done (24 items + the lint sweep), each: audited → researched → proposed →
### approved → implemented → pushed. Doc per item in this folder.

| # | Item | Screen | Doc |
|---|------|--------|-----|
| 1 | Welcome | WelcomeScreen | deep-audit-02 |
| 2 | Login | LoginScreen | deep-audit-03 |
| 3 | Article 9 consent | Article9ConsentScreen | deep-audit-04 |
| 4 | Pro onboarding wizard | ProOnboardingScreen | deep-audit-05 |
| 5 | Pro setup complete | ProSetupCompleteScreen | deep-audit-06 |
| 6 | First-run (Free) | FirstRunScreen | deep-audit-07 |
| 7 | Train tab | HomeScreen | deep-audit-08 |
| 8 | Plans tab | PlansScreen | deep-audit-09 |
| 9 | Diary tab | DiaryScreen | deep-audit-10 |
| 10 | Progress tab | AnalyticsScreen | deep-audit-11 |
| 11 | You tab | YouScreen | deep-audit-12 |
| 12 | Splash | RootNavigator (inline) | deep-audit-13 |
| 13 | Goal lock consent | GoalLockConsentScreen | deep-audit-14 |
| 14 | Build Workout | BuildWorkoutScreen | deep-audit-15 |
| 15 | Active Workout | ActiveWorkoutScreen | deep-audit-16 |
| 16 | Workout Summary | WorkoutSummaryScreen | deep-audit-17 |
| 17 | Workout History | WorkoutHistoryScreen | deep-audit-18 |
| 18 | Volume Heatmap | VolumeHeatmapScreen | deep-audit-19 |
| 19 | Coach Review | CoachReviewScreen | deep-audit-20 |
| 20 | Plan Detail | PlanDetailScreen | deep-audit-21 |
| 21 | Routine Detail | RoutineDetailScreen | deep-audit-22 |
| 22 | Exercise Detail | ExerciseDetailScreen | deep-audit-23 |
| 23 | Manual Builder | ManualBuilderScreen | deep-audit-24 |
| 24 | Plan Library | PlanLibraryScreen | deep-audit-25 |

Plus: the full lint sweep (779 → 0 warnings, 0 errors) across commits
e518807 / 16cbad7 / e345a06 / d2f797f, and the `__mocks__/expo-application.js`
test mock.

### Running logs
- `deep-audit-00-approved-proposals.md` — what was approved per item.
- `deep-audit-00-implementation-log.md` — what was implemented + verification.

## NEXT (resume here)

Inventory order, next un-audited screen: **#22 `MesocycleBuilderScreen`**
(Plans sub-stack), then the A4 Diary sub-stack (#24 FoodSearch onward), and the
A6 You sub-stack incl. the coach-engine surfaces (CoachOutput, WeeklyCheckIn,
ProGoalSetup, etc.). Master list: `deep-audit-01-master-inventory.md`.

### Carry-over flags raised but not actioned (for the founder)
- Article 9 (#3): Art 7(3) withdrawal wording + the server `_consent_version`
  column want legal/server sign-off.
- NotificationSettings: an orphaned debounced-save path (`scheduleApply` +
  `applyNotifications`, which schedules the morning/check-in reminders) is only
  reachable via removed handlers — retained with a documented eslint-disable, not
  deleted. Worth a proper look at that screen's save path.
- Diary (#9): per-user water target + photo/voice quick-log (roadmap).

### Cadence (locked by founder direction this session)
Per item: full read → live web research → proposal in the prescribed format →
STOP for approval → implement only on approval → verify (eslint + tests, FULL
suite for runtime-critical) → commit + push to `main`. Present, then await
approval; do not code first. Fresh audit: prior audit docs are not binding.
Propose freely (incl. copy); flag legal only where genuinely warranted.
