# Cardio QA - change log (Phase 7 implementation)

Status: COMPLETE. Timestamp: 2026-06-03. All confirmed proposals (P1-P10 + D1
"light acknowledgement") implemented in the agreed order, each its own commit,
no unrelated bundling. Full suite green at the end (2795 passing, +25 new
tests), 0 lint errors.

Founder decisions applied: **implement everything (P1-P10)**; **D1 = light
acknowledgement** for non-cut cardio.

---

## Commits (in order)

1. `26c709d` **P1 + P4 + P5** - fix(cardio): tier-gate Diary row, useShallow
   selectors, mount coverage.
   - P1 (CARDIO-BUG-1): Diary cardio row now gated on `tier === 'pro'` too;
     free users no longer see it (`DiaryScreen.js`).
   - P4 (CQ-1): `LogCardioScreen` + `CardioHistoryScreen` use narrow
     `useShallow` selectors instead of bare `useAppStore()`.
   - P5: both screens added to `screen-mount.test.js` (render, a11y,
     tap-stress, 20-tap chains).

2. `183de79` **P2 + P3 + D1** - feat(cardio): close the coaching loop.
   - P2 (CI-1): `CoachOutputScreen` threads the week's `cardio_log` summary +
     applied `cardioTarget` into `runWeeklyCoach`; the cut cardio dose now comes
     from `nextCardioTarget` (escalate on hit + still off-trend, hold + explain
     on miss, capped, pause on poor recovery) when a prior target exists.
   - P3 (CI-2): coach surfaces `cardioRecoveryFlag` as a one-line caution.
   - D1: outside a cut, a non-escalating acknowledgement of cardio logged, no
     target. Both render as quiet no-Apply notes on `CoachOutputScreen`.
   - 5 new `weeklyCoach.test.js` tests (escalate / hold / flag / ack / no-ack).

3. `ba2194a` **P6 + P8 + P10** - feat(cardio): log-screen polish.
   - P6 (UX-1): picking an activity prefills duration + intensity from the
     user's last log of that activity.
   - P8 (UX-3): per-category glyph on each activity row.
   - P10 (CARDIO-BUG-6): kcal only estimated/shown when bodyweight is known; no
     silent 75 kg default; the estimate footnote hides with the figure.

4. `1d02d63` **P7 + P9** - feat(cardio): Diary minutes-only + shared SearchBar.
   - P7 (UX-2): Diary cardio row shows minutes (+ session count), not kcal, so
     it cannot be misread as an MFP-style add-back; kcal stays on the log +
     history where the "not added" footnote is.
   - P9 (CQ-4): the picker uses the shared `SearchBar` component; row padding
     already matched the exercise picker.

---

## Not changed (with reason)

- **CARDIO-BUG-7** (rapid double-tap on Log): no change; `navigation.navigate`
  is idempotent for the same route, so there is no real double-submission. Left
  as logged-for-completeness.
- **CQ-5** (`summariseWeekCardio` used per-day): left as-is; it sums correctly
  and renaming touches multiple call sites for no behavioural gain. Cosmetic.
- **Wearable import (E1/E2)**: out of scope per the integration audit and
  `BACKLOG.md:19`; not part of this QA.

---

## Regression evidence (actual output)

- `weeklyCoach.test.js` + `src/lib/cardio/` : 81 passing (incl. 5 new P2/P3/D1).
- `screen-mount.test.js`: all sweep cases pass, including the newly added
  `CardioHistoryScreen` + `LogCardioScreen` entries and `CoachOutputScreen`,
  `DiaryScreen`, `PlansScreen`, `SettingsScreen`.
- Full suite: **2795 passed, 3 skipped, 0 failed** (was 2770 before this QA).
- eslint: **0 errors** (798 pre-existing warnings, unchanged baseline).

## State

`main` at the P7/P9 commit + this change log, pushed. No schema change in this
QA; migration 064 remains the only pending DB item for the cardio feature.
