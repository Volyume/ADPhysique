# CAMPAIGN 24 — FINDINGS LEDGER

One line per finding, extracted from `WAVE-A-FINDINGS.md` through
`WAVE-G-FINDINGS.md`. NO_CHANGE verdicts (the majority of screens read)
are not listed — this indexes only findings that carry a class label and
either a recorded correction or an action taken. "ACTIONED" means this
landing (Waves F+G implementation, 2026-08-17) applied the fix; everything
else is recorded/specified but not yet applied, per each wave's own
change-plan risk ordering. Full evidence (file:line, reasoning) lives in
the source wave file — this table is an index, not a replacement for it.

| Wave | Screen / file | Class | Action taken / recorded |
|---|---|---|---|
| A | RoutineDetailScreen.js | STATE_DEFECT | Recorded — silent no-op on invalid sets/reps save; correction specified (change plan item 4), not yet applied |
| A | MesocycleBuilderScreen.js | AUTHORITY_DEFECT (Class C) | Recorded — duplicate deload judgement (`evaluateAutoReg`/`predictDeloadWeek` vs `blockAdvisor`); correction specified, not yet applied |
| A | MesocycleBuilderScreen.js | AUTHORITY_DEFECT | Recorded — same duplicate banner also leaks free/pro gating (no tier check); not yet applied |
| A | MesocycleBuilderScreen.js | STATE_DEFECT | Recorded — silent load failure paints an empty account; correction specified, not yet applied |
| A | PlanLibraryScreen.js / freeStarter.js | DUPLICATION | Recorded — two independent plan-recommendation quiz engines; correction specified, not yet applied |
| A | WorkoutSummaryScreen.js | UNIT_DEFECT | FIXED on this branch (confirmed by Wave D re-read; fix-marker comment present) |
| A | WorkoutSummaryScreen.js | COPY_DEFECT | FIXED on this branch (confirmed by Wave D re-read) |
| A | BlockReflectionScreen.js | UNIT_DEFECT (x3 sites) | Recorded — tonnage hardcodes kg at 3 sites; correction specified, not yet applied |
| B | MealPlanScreen.js | COPY_DEFECT | Recorded — ambiguous "Meals per day" label collides with NutritionTargets' distinct setting; correction specified, not yet applied |
| B | ScanLabelScreen.js | PRESENTATION_DEFECT | Recorded — missing torch-toggle haptic (sibling ScanBarcodeScreen has one); correction specified, not yet applied |
| B | MyRecipesScreen.js | IA_DEFECT | Recorded — no read-only "view contents" entry point (sibling MyMealsScreen has one); correction specified, not yet applied |
| B | DiaryScreen.js / EmptyDiary.js | COPY_DEFECT (minor) | Noted only, no action recommended — two accurate strings for the same entry point, not worth a dedicated fix |
| C | YouScreen.js | STATE_DEFECT (minor) | Recorded — trial-banner Methodology deep-link omits `source` param, undercounts telemetry; correction specified, not yet applied |
| C | CoachReviewScreen.js | AUTHORITY_DEFECT (Class C) | FOUNDER FORK recorded — third independent deload judgement, tier-blind; three resolution options presented, not yet decided |
| C | MethodologyScreen.js | DEAD-STALE_SURFACE | Recorded — 3 of 7 `SOURCE_SECTION` keys unused; correction specified, lowest priority, not yet applied |
| C | weeklyStory.js | DUPLICATION | Recorded — independent 5% adherence band vs checkinDerive's 10% band on the same week; correction specified, not yet applied |
| D | WeightTrendCard.js | UNIT_DEFECT (mandatory) | Recorded — hardcoded kg weekly-rate string; correction specified, not yet applied |
| D | BodyMetricsScreen.js | UNIT_DEFECT (x3 sites) | Recorded — EWMA/weekly-change/delta-badge all hardcode kg; correction specified, not yet applied |
| D | BodyMetricsScreen.js | LOGIC_DEFECT (ED-safety-adjacent) | FOUNDER FORK recorded — rate/maintenance display not suppressed under calm/ED flag, unlike the Progress root; three options presented, not yet decided |
| D | ProgressPhotosScreen.js | UNIT_DEFECT | Recorded — photo-timeline weight readout hardcodes kg; correction specified, not yet applied |
| D | ConsistencyScreen.js / useProgressData.js | DUPLICATION | Recorded — 3 hand-rolled deload-bucket pipelines around one scorer; flagged as a global-cohesion-pass item, not yet applied |
| D | WorkoutSummaryScreen.js (readOnly) | IA_DEFECT | Recorded — past sessions have no share affordance; founder decision needed on intent, correction specified either way |
| D | YearOfLiftsScreen.js | UNIT_DEFECT (x7 sites) | Recorded — all four story-deck builders hardcode kg tonnage labels; correction specified, not yet applied |
| D | usePartners.js / PartnerScreen.js | DEAD-STALE_SURFACE | Recorded — unreachable free-tier partner cap sits behind a route guard; optional cosmetic fix, not yet applied |
| E | RootNavigator.js | STARTUP-FLASH (critical) | Recorded — 8s auth-latch failsafe assumes signed-out, can flash Welcome/Login to a signed-in user on a slow network; correction fully specified, not yet applied |
| E | ProUpgradeScreen.js | DEAD-STYLE | Recorded — 6 unreferenced style keys from the removed email/password upgrade path; fold into next touch, not yet applied |
| F | SettingsDisplayScreen.js / useAppStore.js | DEAD_SETTING | ACTIONED — `showHomeNutrition` toggle retired (LEAD RULING D33): row removed, store default field removed, persisted value tolerated silently, guard test added |
| F | SCREEN-UX-REGISTER.md row 140 (SettingsHealth) | REGISTER_MISMATCH | ACTIONED — PRIMARY JOB corrected to the screen's real Apple Health/Health Connect content |
| F | docs/NOTIFICATIONS_LOCKED.md:54 | STALE_DOC | ACTIONED — morning-weight "switch was deliberately removed" corrected to reflect the live C14 on/off toggle |
| F | docs/NOTIFICATIONS_LOCKED.md:31 | STALE_DOC (phantom category) | ACTIONED — `daily_checkin_reminder` row struck with a dated note; live enum count corrected 23 to 22 |
| F | docs/NOTIFICATIONS_LOCKED.md:311-320 | STALE_DOC | ACTIONED — 8-item collision-priority list refreshed to the live 10-item `EVENT_PRIORITY` (added `activation_nudge`, `planned_meal_confirm`) |
| F | src/screens/CoachingRemindersScreen.js:1-13 | STALE_DOC | ACTIONED — header rewritten to describe the current optional/toggle design (comment only, no behaviour change) |
| F | src/lib/notifications/categories.js:18,103 | Phantom category (zero-implementation) | ACTIONED — `DAILY_CHECKIN_REMINDER` declaration and channel-map entry removed; two dependent tests re-pinned |
| G | SCREEN-UX-REGISTER.md row 166 (GoalChangeSummary) | REGISTER_ACCURACY | ACTIONED — ENTRY POINTS corrected to `ProGoalSetupScreen save action only` |
| G | SCREEN-UX-REGISTER.md row 167 (GoalLockConsent) | REGISTER_ACCURACY | ACTIONED — ENTRY POINTS corrected to `YouScreen Safety checks section only` |
| G | SCREEN-UX-REGISTER.md row 151 (WellbeingCheck) | REGISTER_ACCURACY | ACTIONED — PRIMARY JOB corrected (drops "calm mode management"), ENTRY POINTS corrected to YouScreen only |
| G | SCREEN-UX-REGISTER.md row 156 (Import) | REGISTER_ACCURACY | ACTIONED — PRIMARY JOB corrected, drops the false Fitbod claim (main table and work-queue line 333) |
| G | SCREEN-UX-REGISTER.md row 157 (Credits) | REGISTER_ACCURACY | ACTIONED — PRIMARY JOB corrected, drops the false music/fonts claim (main table and work-queue line 336) |
| G | SCREEN-UX-REGISTER.md (summary + wave headers) | REGISTER_ACCURACY | ACTIONED — UNREVIEWED count corrected 76 to 78; WAVE E header 10 to 11 screens, WAVE F header 18 to 19 screens |
| G | MISSED_COVERAGE — Wave F | Scheduling gap | RESOLVED — Wave F has now run (this landing); the 19 previously-unreviewed rows are covered by `WAVE-F-FINDINGS.md` |
| G | SCREEN-UX-REGISTER.md row 59 (PlanLibrary) | REGISTER_ACCURACY (malformed cell) | Recorded, not actioned this landing — outside this task's authorised scope; Wave A territory |
| G | useProgressData.js (PR-window returns) | Residue (unused hook returns) | Recorded, no intersection with Wave G; ownership flagged to whichever wave/pass owns the hook's consumers (per Wave D's own fork) |
| G | progressSeries.js (`buildWeeklySessionCounts`) | Residue (no production caller) | Recorded, no intersection with Wave G; ownership unresolved |
| G | `user_insights` sync registration | Residue (unclaimed) | Recorded, no intersection with any wave A-G; flagged for a dedicated sync-layer pass |
