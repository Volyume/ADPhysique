# Cardio QA - 06: Enhancement proposals

Status: COMPLETE. Timestamp: 2026-06-03. Each proposal is specific and
implementable, scored Impact (1-5) × Effort (1-5, lower cheaper), grouped by
priority. No code changed yet (awaiting checkpoint confirmation).

---

## Group A - Critical fixes (correctness)

**P1 - Tier-gate the Diary cardio row (CARDIO-BUG-1).** Impact 4 / Effort 1.
`DiaryScreen.js`: add `tier` to the `useShallow` selector (`tier: s.tier`) and
change line 538 to `{tier === 'pro' && cardioEnabled && userId ? (`. Matches
Train/Plans/Settings. Verify: free-tier Diary shows no cardio row; Pro unchanged.

## Group B - High impact (close the coaching loop)

**P2 - Feed cardio compliance into the coach (CI-1, CARDIO-BUG-2).**
Impact 5 / Effort 3. Runtime-critical → tests in the same commit.
- `CoachOutputScreen.js:~1027`: before `runWeeklyCoach(inputs)`, load the week's
  `cardio_log` (`getCardioLogRange` over the 7-day window) and the prior
  `userProfile.cardioTarget`; add to inputs:
  `cardioSessionsLogged: summariseWeekCardio(rows).sessions`,
  `currentCardioTarget: userProfile.cardioTarget`.
- `weeklyCoach.js` cardio block (~750): when `currentCardioTarget` exists, derive
  the next dose with `nextCardioTarget({ currentTarget, sessionsLogged,
  stillOffTrendInCut: phase.isCut && !onTarget && offTargetDirection > 0,
  poorRecovery })` instead of always `cutCardioTarget`. Keep `cutCardioTarget`
  as the first-time/no-prior path.
- Tests: extend `weeklyCoach.test.js` - hit+off-trend escalates, miss holds +
  explains, cap respected, poor recovery pauses.

**P3 - Surface the coach recovery flag (CI-2, CARDIO-BUG-3).**
Impact 4 / Effort 3. Pass `cardioWeekSummary` + a `recoveryTrendDown` boolean
(the coach already computes recovery trend) into `runWeeklyCoach`; call
`cardioRecoveryFlag(...)` and attach the non-null string to the output as a
coach note (rendered on `CoachOutputScreen` like the other one-line notes).
Tests: flag fires on high impact + trend down; silent otherwise.

## Group C - Native-integration fixes (consistency)

**P4 - `useShallow` selectors (CQ-1).** Impact 3 / Effort 1. Convert the bare
`useAppStore()` in `LogCardioScreen.js:41` and `CardioHistoryScreen.js:34` to
narrow `useShallow` selectors. Removes whole-store re-renders; matches the
codebase convention.

**P5 - Mount coverage for `CardioHistoryScreen`.** Impact 2 / Effort 1. Add it
to `src/__tests__/screen-mount.test.js` so it gets render + tap-stress coverage
like every other screen.

## Group D - Polish (elite feel)

**P6 - Per-activity last-used defaults (UX-1).** Impact 4 / Effort 2. In
`LogCardioScreen`, when an activity is picked, prefill duration + intensity from
the user's most recent `cardio_log` row for that `activity_id` (already loading
recents; read the latest matching row). Removes taps on the common case; every
activity-first app does this.

**P7 - Diary kcal clarity (UX-2).** Impact 2 / Effort 1. In the Diary `CardioRow`,
either drop the `~kcal` (show minutes only) or add the same "not added to your
target" micro-clarifier the log screen uses, so an MFP-trained user does not
read it as an add-back. Recommend: minutes only in the row; kcal stays on the
log + history.

**P8 - Activity glyphs (UX-3).** Impact 3 / Effort 2. Add a per-category Ionicon
to the activity rows in the `LogCardioScreen` picker (walk/bicycle/barbell/
heart, etc.) so the list scans visually. Standard in the best apps; cheap lift.

**P9 - Align the picker to the shared pattern (CQ-4).** Impact 2 / Effort 3.
Optional. Either reuse `ExercisePickerModal` or match its row height, search bar
and section-header styling so the cardio picker reads identically to the
exercise picker. Lower priority than P6/P8.

**P10 - Hide kcal when bodyweight unknown (CARDIO-BUG-6).** Impact 2 / Effort 1.
In `LogCardioScreen`, when `userProfile?.weightKg` is missing, hide the kcal row
rather than defaulting to 75 kg.

## Group E - Founder decision (not a bug)

**D1 - Cardio acknowledgement for non-cut users (CI-3).** The coach is cut-only
for cardio by the "available not allocated" decision. Options: (a) leave silent
(status quo), (b) a light, non-escalating acknowledgement in bulk/maintenance
("Nice, 2 cardio sessions logged this week" with no target). Needs a founder
call before building; do not assume.

---

## Recommended implementation order

1. **P1** (correctness, 1 line) →
2. **P4 + P5** (consistency + coverage, quick) →
3. **P2** (the big one: close the loop) →
4. **P3** (recovery flag) →
5. **P6 → P8 → P7 → P10** (polish) →
6. **P9** if wanted; **D1** only on founder confirmation.

Effort note: P1/P4/P5/P7/P10 are small. P2/P3 are the substantive,
runtime-critical changes and ship with tests. P6/P8 are contained UI work.
Nothing here requires a schema change (migration 064 still the only pending
DB item).
