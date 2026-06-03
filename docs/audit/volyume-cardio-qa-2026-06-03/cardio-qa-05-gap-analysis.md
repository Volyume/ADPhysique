# Cardio QA — 05: Gap analysis

Status: COMPLETE. Timestamp: 2026-06-03. Consolidates Phases 1-4. No code changed.

---

## 1. Bugs and errors (by severity)

| ID | Sev | Summary | File:line |
|---|---|---|---|
| CARDIO-BUG-1 | Medium | Diary cardio row not tier-gated → free users see it | `DiaryScreen.js:538` |
| CARDIO-BUG-6 | Low | kcal silently defaults to 75 kg when bodyweight unknown | `LogCardioScreen.js:43` |
| CARDIO-BUG-7 | Low | rapid double-tap on Log relies on navigator dedupe | `CardioCard.js` / `DiaryScreen` |
| CQ-1 | Medium | bare `useAppStore()` (whole-store re-render) | `LogCardioScreen.js:41`, `CardioHistoryScreen.js:34` |
| CQ-4 | Medium | bespoke activity picker, not the shared `ExercisePickerModal` pattern | `LogCardioScreen.js` |
| Coverage | Low | `CardioHistoryScreen` absent from the mount sweep | `src/__tests__/screen-mount.test.js` |
| CQ-2/CQ-5 | Low | magic `75`; `summariseWeekCardio` used per-day (naming) | `cardioMath`/`cardioEngine` callers |

No crashes or data-loss bugs found. Calculations are correct across the tested
input range. The MET kcal is never double-counted into the target (verified).

## 2. Coaching integration gaps (the important ones)

| ID | Sev | Gap |
|---|---|---|
| CI-1 | **High** | Cardio compliance is captured (check-in + log prefill) but the coach ignores it: `weeklyCoach` reads no `cardioAdherence`/`cardioTarget`/session count, and `nextCardioTarget` is never called. The return leg of the loop is missing. |
| CI-2 | Medium | Cardio recovery load reaches the readiness card but not the coach's training decision; `cardioRecoveryFlag` is never called. |
| CI-3 | Medium (partly by design) | Coach is cut-only for cardio; a bulk/maintenance user gets no cardio acknowledgement. Matches "available not allocated"; needs a founder call on light acknowledgement. |

## 3. Design / UX gaps vs the best (Phase 4)

| ID | Gap | Best-in-class does | Change |
|---|---|---|---|
| UX-1 | No per-activity remembered defaults (duration always 30, intensity = activity default) | Strava/Apple remember last duration + intensity per activity | Prefill duration/intensity from the user's last log of that activity (read `cardio_log`) |
| UX-2 | Diary kcal "~320 kcal" has no "not added" clarifier (the log screen does) | n/a (Volyume-specific clarity) | One subtle note or omit kcal in the Diary row to avoid MFP-trained add-back assumption |
| UX-3 | Activity list is text-only | Strava/Apple show a glyph per activity so the list scans | Add a per-category icon to the activity rows (low effort, big "premium" lift) |

## 4. Integration gaps (bolt-on vs native)

- **Visual: native.** Train card = `StepsCard`, Diary row = `WaterRow`, Plans
  card matches Plans cards. No visual bolt-on found.
- **Behavioural: bolt-on.** The coach not reasoning about logged cardio (CI-1/2)
  is the real "added on top" signal. This is the dominant integration gap.
- **State convention: bolt-on.** Bare `useAppStore()` in two screens breaks the
  `useShallow` convention (CQ-1).
- **Pattern: mild bolt-on.** Bespoke picker vs the shared exercise picker (CQ-4).
- **Copy:** consistent and on-voice (plain, no em dashes, no encouragement);
  no terminology drift found.
- **Tier gating: inconsistent** (CARDIO-BUG-1) — the one place the gating
  convention is broken.

## 5. Missing features (evidence-backed, not a wish list)

- **Per-activity last-used defaults** (UX-1): every activity-first app does it;
  cheap, removes taps. High value / low effort.
- **Activity glyphs** (UX-3): standard in the best apps; makes the list feel
  premium. Low effort.
- Not recommended now: wearable import (E1/E2) stays out of scope per the audit
  and `BACKLOG.md:19`; no evidence it is needed before the rest is polished.

## 6. Priority read

The headline is **CI-1: close the coaching loop** (compliance → coach). That is
the difference between cardio being a logger and being a coaching lever, and the
engine for it is already built and tested. After that, the tier-gating bug
(BUG-1) and the store-selector consistency (CQ-1) are quick correctness/native
fixes, then the polish (per-activity defaults, glyphs, Diary kcal clarity).
