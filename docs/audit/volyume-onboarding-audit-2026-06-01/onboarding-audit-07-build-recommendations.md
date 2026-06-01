Status: REFRESHED (post-rebuild) | Original 2026-06-01 (commit e7c3f01) | Refreshed 2026-06-01 (engine at 6cf8642)

REFRESH NOTE. Engine line references updated. The division-specific system is now
fully built (matrix, pools, division-aware MRV, weak-point composes with the
split), so the "division judging note / division-specific sets" items connect to
real infrastructure. The ONLY runtime-critical engine change still outstanding is
the always-on bias; everything else is UI/data wiring on the unchanged flow code.

IMPLEMENTATION STATUS (current): only the weak-point selector in onboarding is
built (commit 4928a04, the critical item below). Everything else, the copy pass,
the format/style standardisation, days/protein parity, the always-on bias, is
NOT built and awaits an approved screen-by-screen plan. Do not implement further
without explicit go-ahead.

# Prioritised build recommendations

Scored Impact x Effort. Impact is plan correctness and parity first, premium
feel second. Effort is relative engineering size. Runtime-critical items (the
engine change) carry the Rule 5 and Rule 7 obligations: tests in the same
commit, additive change, verified end to end.

## Critical (correctness and the brief's core requirement)

| Unit | Impact | Effort | Files / notes |
|---|---|---|---|
| Weak-point selection in onboarding | High | Med | Remove `planWeakPoints: []` (`ProOnboardingScreen.js:519`), mount the shared selector, pass the value into `planProfile` (`:512-521`). The handoff already exists in the engine |
| Always-on weak-point bias in the engine | High | Med | `applyGoalOverlay` (`planEngine.js:127`, weak-point block `:173`): apply a smaller additive bonus off the `weak_point` phase, full bonus on it, inside the existing 110% MRV clamp (`:205`), systemic cap (`:226-232`) and the rebuild's delivered-volume clamp. Runtime-critical: tests alongside, covering both phase magnitudes, the trim-offset, and that the caps still hold |
| Division-specific weak-point option sets | High | Low-Med | Add `WEAK_POINT_SETS` per goal in `coachingGoals.js`, reuse `WEAK_POINT_MAP`. Pure data, easy to test |
| Weak-point copy that matches behaviour | High | Low | Rewrite `ProGoalSetupScreen.js:351-353` and the new onboarding intro for the always-on model. No promise that is false on any phase |

## High (parity and structure)

| Unit | Impact | Effort | Files / notes |
|---|---|---|---|
| Shared `WeakPointSelector` component | High | Med | One component, both flows. Region grouping, max-3 with existing toast, "Not sure" state, re-scope and prune on division change |
| Training days per week in onboarding | High | Low-Med | Add a chip row (3 to 6, default 4) to step 3; pass `daysPerWeek` instead of the hard-coded `DEFAULT_DAYS_PER_WEEK` (`ProOnboardingScreen.js:425,456,514`). Recompute nutrition activity level from it |
| Protein approach in onboarding | Med-High | Low-Med | Mirror the builder's protein section (`ProGoalSetupScreen.js:521-560`), default to the suggested approach for the division |
| Division judging note at selection time | Med-High | Low | Surface each goal's `coachingNote` (`coachingGoals.js`) on division change in both flows. Data exists, just unused |
| Standardise shared controls on one language | Med-High | Med | Move onboarding's phase/experience/equipment/recovery to the builder's card pattern, days/session to the chip pattern. Resolves the cross-flow design inconsistency |
| Shared option strings | Med | Low | One constant per concept (equipment, experience, recovery, phase, days) so both flows read identically |

## Polish

| Unit | Impact | Effort | Files / notes |
|---|---|---|---|
| Reflect weak-point change on `GoalChangeSummaryScreen` | Med | Low-Med | Add weak-point before/after to the summary so a returning user sees the edit landed |
| One-line Diary/coaching feature note in onboarding | Med | Low | Step 4, one line that logged food and weight feed the check-in. No tutorial |
| Move recovery into the training step | Low-Med | Low | Grouping only |
| Single per-step time estimate | Low | Low | Settle the "two minutes" vs "30 seconds" mismatch or drop estimates |
| Division card icons monochrome | Low | Low | Keep amber as the only selection signal |

## Suggested sequence

1. Data and engine first: `WEAK_POINT_SETS`, then the always-on bias in
   `applyGoalOverlay` with tests. These are independently shippable and unblock
   both flows. Apply the Rule 5 and Rule 7 discipline here: this is the
   runtime-critical core.
2. Shared `WeakPointSelector`, then wire it into the builder (replacing the flat
   grid) and into onboarding (closing the omission). Add the division judging
   note in the same pass.
3. Onboarding parity: training days, protein approach, control standardisation,
   shared strings.
4. Polish: summary screen, Diary note, grouping, estimates, icons.

## Risk notes

- The engine change is the only runtime-critical item. It is additive (a second
  bias magnitude on an existing code path) and keeps both safety clamps, so it
  is frozen-build-safe and recovery-safe by construction. It must not refactor
  the surrounding overlay logic; add the smaller-magnitude branch and test both.
- No migration is required: weak points already persist in the profile and sync
  today; this work changes which muscles are offered and when the bias applies,
  not the storage shape.
- Division-specific sets must keep `WEAK_POINT_MAP` as the single resolver so a
  muscle dropped from a division's UI set still maps correctly if it arrives in
  older saved data.
