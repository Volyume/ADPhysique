# Campaign 4 — Phase 30 quality gates and censuses (2026-08-10)

Closing verification for the whole-product coherence / legacy-cleanup /
product-boundary campaign. Branch `claude/campaign4-coherence`, base
`92b9644e`, final campaign commit at the close of this file's landing.

## Gates (all run over the settled tree at close)

| Gate | Result |
| --- | --- |
| `npm run lint` | CLEAN (`eslint . --max-warnings 0`, no output) |
| Full suite `npx jest` | 811/812 suites passed, 1 env-gated skip (`PROGRESS_SCAN_BODYM_SMOKE`); 9,626/9,636 tests passed, 10 skipped |
| Campaign 1 integrity | PASS (within the 141-test campaign-suite run) |
| Campaign 2 comprehension | PASS |
| Campaign 3 discoverability | PASS |
| Campaign 4 boundaries (`campaign4.boundaries.test.js`) | PASS |
| Jargon blocklist (`jargonBlocklist.test.js`) | PASS (27 tests) |
| Identity invariant (`scripts/check-identity-invariant.sh`) | CLEAN, exit 0 |
| No production migration run | VERIFIED - only text/header edits under `supabase/`; 132-135 unapplied; 049 HELD |
| No EAS / release build | NONE run |
| No billing product changes | VERIFIED (Review A Q10: payments/proGate/ED diff empty; one navigation-only paywall fix) |
| No ED threshold / propagation changes | VERIFIED (Review A Q10; floors pinned in the boundary suite) |
| No automatic block transitions | PINNED (`campaign4.boundaries.test.js` BLOCKS section) |
| No feature-scope expansion | VERIFIED (Review B Q10: every change is a removal, a truth fix, or an inert-control repair) |

## Route census — before vs after

Method identical to AUDIT-ROUTES §2-3 (registrations counted from
`RootNavigator.js` Stack/Tab.Screen tags; reachability resolved per
stack; dead taps = navigate/push/replace whose target is missing from a
registering stack).

| Measure | Before | After |
| --- | --- | --- |
| Navigator functions | 10 | 10 |
| Route registrations | 116 | 105 |
| Unique route names | 89 | 87 |
| Screen files (excl. the `paywallExcerpts` data module) | 83 | 81 |
| LIVE screens | 57 | 58 (BlockReflection regained its source) |
| LIVE-CONDITIONAL (guard renders) | 21 | 21 |
| ROLLBACK / dark intentional | 2 (QuizTraining, PlanPreview) | 2 |
| LEGACY-retained, documented | 1 (MealNames) | 1 (now with an in-file retention note) |
| SOURCELESS routes | 1 (BlockReflection) | 0 |
| PRODUCT-BOUNDARY remnants | 2 (LogCardio, CardioHistory) | 0 |
| DEAD registrations (route+stack pairs) | 10 | 0 |
| Cross-stack dead-tap sites | 16 | 0 (resolution scan over every screen: zero unresolved) |

Registration delta: -5 cardio, -2 duplicate (HomeStack VolumeHeatmap,
ProgressStack CoachReview), -6 unreachable onboarding-stack
registrations, +2 deliberate onboarding registrations
(NotificationSettings + its transitive CoachingReminders).

## Settings census — before vs after

Before (Campaign 3 + AUDIT-DEFERRED-TELEMETRY): a Pro cardio toggle, a
dead `setBarWeight` runtime setter, an unreachable `applyNotifications`
save path with a phantom "Saving/Saved" indicator, five comments
mislabelling cloud-synced prefs LOCAL-ONLY, and the S/T/P3
classification (2 A, 1 C, 3 D, 6 F, 1 G, 4 I).

After: every Settings row leads somewhere real (Review A Q8, walked all
13 settings screens); all six F items and the G item executed; every
D/I retention documented in place; zero dead settings surfaced. The
notification-pref dual-family architecture is recorded as FR-C4-2, the
check-in reminders' missing off switch as FR-C4-8.

## Dead-code census — before vs after

Before (AUDIT-DEAD-FUNCTIONS + AUDIT-MODULES-FLAGS): 20 classified
engine/copy symbols (15 F, 1 G, kept 4 C/D/I), 6 dead modules
(diaryTimeline, diaryDaySummary, stepsSummary, progressScanCopy,
links, plateMath), the whole `lib/cardio/` directory live-but-boundary,
duplicate implementations (epleyE1rm, 3× muscleDisplayName).

After: every F/G deletion executed with its invariant moved to live
code first (verified law-by-law in Review A Q6; the one miss - the
stepsTarget pin - was restored at remediation); duplicates consolidated
with equivalence tests; zero-caller survivals are exactly the
documented retentions: `getCurrentMesoWeek` (D, DST oracle),
`getMesoSchedule` (C), `checkJargonScienceOn` (I),
`getProgressionSuggestion` (I, FR-C4-4), `activitySteps.js` + the
engine steps lever (FR-C4-11, retained-dormant, honestly labelled),
retained cardio accessors (H1/H3), peak-week storage (Class A LIVE).

## Phase 29 — Campaign 3 founder rulings, evidence pass

Carried unchanged; recommendations updated only where this campaign
produced new evidence. Nothing implemented.

- **FR-1 (calculator Sex/Age/Height)**: no new evidence. Unchanged.
- **FR-2 (dormant meal-plan prefs)**: evidence sharpened - the
  LOCAL-ONLY comment corrections proved these prefs DO reach the cloud
  inside the profile blob, and MealPlanScreen renders controls for only
  two of the four pref families (periWorkout and fatConvention have
  readers but no UI writer). The question is now precisely "surface or
  retire the two writer-less prefs", not "wire up local-only state".
- **FR-3 (hide-exact control)**: strengthened by FR-C4-7 - the
  progress-photo gallery renders capture weight without the per-item
  gate the four scan-stat sites now carry (the weight-privacy law was
  re-anchored to those four live sites this campaign). A single ruling
  could settle both.
- **FR-4 (rest-beep mute)**: no new evidence. Unchanged.
- **FR-5 (unsubscribe controls)**: materially strengthened -
  NOTIFICATIONS_LOCKED now records all 23 live categories (13 were
  never on the locked ledger), and FR-C4-8 documents that the two
  check-in reminders ship with no off switch despite the locked row
  saying "User can disable: Yes". FR-5's ruling should cover the
  whole 23-category ledger, not just win-back.
