# Volyume check-in / coach / training / nutrition audit — status (2026-06-08)

Hand back to Codex. Covers the check-in / Precision Coaching / training /
nutrition audit. Base: `main`. Every claim below was verified in code before
acting.

Founder decisions taken on this pass:
- Implement all code findings now.
- Treat macros-unused (PIPE-007), sleep_quality-unused (DEAD-002) and the
  `stepsAdherence` fallback (PIPE-004) as **intentional** — documented, not
  changed.

Checks after: tsc strict 0, lint 0 errors, full suite **191 suites / 3067
passed / 3 skipped / 0 fail**.

## One correction to feed back
**TEST-001 (and every "could not run the suite" note) does not reproduce on a
properly installed tree.** It is the same `react-native-worklets/plugin` false
positive as BUG-001/QA-001 from the earlier report: it only happens on a
checkout without `npm ci`. The founder verification suites run clean here. Not
a repo defect.

## Data pipeline + algorithm findings — fixed
| ID | Status | Where / how |
|---|---|---|
| PIPE-001 / DEAD-003 | **Fixed** | `weeklyCoach.getRecoveryScore` now takes `stressScore`; high stress (≥4 on the 1–5 scale) can only worsen recovery toward a hold, never improve it. |
| PIPE-002 / DEAD-004 | **Fixed** | `weeklyCoach` reads `checkin.jointPain` and applies a safety cap: a flagged joint-pain week holds volume, drops any push, sets `recoveryFlag='concerned'`, and adds a load/substitution caution. It only caps an increase, never lifts a planned reduce/deload. |
| PIPE-003 / DEAD-005 | **Fixed** | New `parseNoteFlags()` lifts travel/illness/injury/missed-logging/menstrual tags from the free text (word-boundary matching). The `hasUnusualEvent` confidence hold stays; illness/injury now also trigger the safety cap. Flags exposed on the output as `noteFlags`. |
| ALGO-001 | **Fixed** | `getWeeklyVolumeByMuscle` takes an `anchorMs`; the weekly check-in passes `weekStartMs + 7d`, so the week-over-week comparison uses the Monday-anchored check-in week, not a `Date.now()` rolling window. Heatmap callers unchanged (default `Date.now()`). |
| ALGO-002 | **Fixed** | `getWeeklySessionStats` derives planned sessions from the active plan's training-day count (`getActivePlan` + `getRoutinesForPlan`), falling back to the trailing-4-week average only when there is no active plan. |
| ALGO-003 | **Fixed** | `getWeeklyPRCount` now counts an exercise as a PR when its best Epley e1RM (`weight × (1 + reps/30)`) beats its prior best e1RM, so same-weight higher-rep sets and rep PRs count, not just heavier loads. Warm-ups excluded. |
| ALGO-004 | **Fixed** | The calorie-answer mapping is now one exported helper, `mapCalsAdherence()` in `weeklyCoach.js`, used by the coach screen at load, the history builder, and tests. The inline duplicate in `CoachOutputScreen` is gone. |
| ALGO-005 | **Fixed** | `lastCalAdjustmentWeeksAgo` is real elapsed weeks now, not binary 1/99. Each saved coach output carries `lastCalAdjustmentWeekStart` (carried forward across holds); the cooldown counts actual weeks since the last change. |
| ALGO-006 | **Fixed** | Covered by PIPE-001 + PIPE-002: stress and joint pain now feed the recovery/hold path. |
| PIPE-005 | **Fixed** | `recentWeeklyHistory` now reads each past week's own trailing-7-day intake (`getRecentIntakeSummary` at the week-ending day-key) and maps `no` into under/over, so multi-week calorie logic keeps direction. Older weeks judged against the current target (documented approximation). |
| PIPE-006 | **Fixed** | The weekly check-in loader no longer fails *open*. A load failure now shows a recoverable `load_error` state with a Try-again retry, instead of opening the form against missing data. |

## Intentional — documented, not changed (founder call)
| ID | Decision |
|---|---|
| PIPE-007 | Weekly coaching runs off total calories + weight trend; macros inform only the carb cycle. Protein sufficiency is set at plan time, not policed weekly. Comment added in `weeklyCoach.js`. |
| DEAD-002 | `sleep_quality` (written by workout-summary paths) stays analytics-only; `sleepHours` already feeds the deload trigger. |
| PIPE-004 / DEAD-001 | `stepsAdherence` is kept as an explicit legacy fallback for old check-in rows; modern rows use `stepsAvg`. Comment added. |

## Passes (confirmations only, no change)
CALC-001 (shared nutrition builder), CALC-002 (plan update doesn't recalc
nutrition), TRAIN-001 (floors/caps present), TRAIN-002 (archived plans
retained by design). NutritionTargetsScreen still uses the manual calculator
path by design (caution noted in the audit, no change).

## Deferred — needs your design sign-off
**CHECKIN-001 + UX Proposals 1–4** (closed-state "coach is watching" summary,
making derived intelligence visible, override-copy cleanup, coach-output
structure). These are presentation changes to design-sensitive screens. The
CLAUDE.md no-AI-fingerprint design rules are a hard constraint (no balance
cards, no filler), so I did not add UI to the check-in/coach screens
unilaterally. The data they would read is already loaded. Say the word and I'll
build CHECKIN-001 to a layout you approve.

## Tests added
`src/lib/__tests__/weeklyCoach.signals.audit.test.js` — stress→recovery,
joint-pain hold, note-flag hold, `parseNoteFlags` false-positive guard, and the
`mapCalsAdherence` vocabulary. Existing weeklyCoach/coach/database suites stay
green.
