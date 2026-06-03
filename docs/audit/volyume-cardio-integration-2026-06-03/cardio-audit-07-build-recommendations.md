# Cardio integration audit - Phase 7: Prioritised build recommendations

Status: COMPLETE. Timestamp: 2026-06-03. Scope: cardio only.
Scoring: Impact (1-5, user/coach value) × Effort (1-5, build cost; lower is
cheaper). Priority = Impact / Effort, highest first. Dependencies and audit
alignment noted per item.

---

## Tier 0 - Foundation (must come first)

| # | Item | Impact | Effort | I/E | Depends on | Notes |
|---|---|---|---|---|---|---|
| F1 | `cardio_activities` table + `cardioMetadata.js` deriver + ~38-row seed (MET verified vs Compendium) | 5 | 2 | 2.5 | - | Mirrors `seedExercises`/`exerciseMetadata` discipline (Phase 5 §1). Pure + seed, fully testable. |
| F2 | `cardio_log` table + sync registry entry + cloud migration (mirror `migrate_056` daily_steps) | 5 | 3 | 1.7 | F1 | `PK(user_id,id)`, LWW + soft-delete. Additive, frozen-AAB safe. Runtime-critical (sync) → tests mandatory per CLAUDE Rule 5/7. |
| F3 | `cardioEnabled` / `cardioFavourites` profile fields + clean opt-out gating everywhere | 5 | 2 | 2.5 | - | The "invisible unless opted in" guarantee. No migration (profile blob). |

Tier 0 is the spine: a library, a place to log, and an opt-in switch. Nothing
user-facing ships until F1-F3 exist and the non-cardio path is provably empty.

---

## Tier 1 - Core experience (the usable product)

| # | Item | Impact | Effort | I/E | Depends on | Notes |
|---|---|---|---|---|---|---|
| C1 | Cardio library picker (browse/search/filter/favourites), modelled on `ExercisePickerModal` | 5 | 3 | 1.7 | F1, F3 | User-led selection (Phase 2/5). |
| C2 | Quick-log (activity → duration → intensity) + MET feedback, `LogCardioScreen`/sheet | 5 | 2 | 2.5 | F1, F2, C1 | 3-tap. `est_kcal` shown, never added (Phase 6 §6). |
| C3 | Onboarding opt-in + favourite picker (one wizard step, default off) | 4 | 2 | 2.0 | F1, F3 | Respects onboarding-audit "no bloat". |
| C4 | Coach target as structured dose (extend `cardioAdjustment`) + non-cut health mode | 5 | 3 | 1.7 | F1 | Beyond-cuts availability (Phase 4 §5). Coach engine is runtime-critical → tests. |
| C5 | Plans "Cardio this week" target block + progress count (`CardioCard`) | 4 | 2 | 2.0 | F2, C4 | Weekly-flexible, invisible when off (Phase 6 §4). |
| C6 | Diary cardio line + the one calorie footnote | 3 | 1 | 3.0 | C2 | Quiet info line; energy-balance message once. |

Tier 1 delivers the whole user-led loop: opt in, pick activities, log fast, see
the coach's dose in Plans, see the session in Diary. Highest I/E quick win is C6.

---

## Tier 2 - Check-in and Coach integration (closes the loop)

| # | Item | Impact | Effort | I/E | Depends on | Notes |
|---|---|---|---|---|---|---|
| K1 | Check-in cardio compliance auto-prefilled from `cardio_log` vs target | 4 | 2 | 2.0 | F2, C4 | Reuses the shipped adherence question (migration 050). |
| K2 | Coach target adjustment from compliance (escalate in cut, hold/health elsewhere) | 4 | 3 | 1.3 | C4, K1 | Mirrors steps adherence logic. Tests. |

---

## Tier 3 - Recovery layer

| # | Item | Impact | Effort | I/E | Depends on | Notes |
|---|---|---|---|---|---|---|
| R1 | Per-session fatigue input to `recoveryEMA` from `recovery_impact`/`impact_type` | 4 | 3 | 1.3 | F1, F2 | HIIT vs LISS treated differently (Phase 2 §5). |
| R2 | Coach flags: high cardio load vs training; low-impact steer; off-leg-day nudge | 3 | 3 | 1.0 | R1, C4 | One-line, advisory (Phase 6 §8). |

---

## Tier 4 - Enhancements (later, optional)

| # | Item | Impact | Effort | I/E | Depends on | Notes |
|---|---|---|---|---|---|---|
| E1 | Wearable / Health import of cardio sessions (HealthKit/Health Connect workouts) | 3 | 4 | 0.75 | F2 | Carve-out today (`BACKLOG.md:19`); auto-fill duration/HR. Never required. |
| E2 | HR-based calorie estimate when avg HR present | 2 | 4 | 0.5 | E1 | Refines the MET figure; still feedback only. |
| E3 | Cardio history surface in Progress | 2 | 2 | 1.0 | F2 | Nice-to-have list/sparkline. |

---

## Recommended build order

F1 → F3 → F2 → C1 → C2 → C6 → C3 → C4 → C5 → K1 → K2 → R1 → R2 → (E1, E2, E3
when wearable scope opens).

Rationale: stand up the spine (F), ship the user-led log loop (C1-C3, C6) which
is valuable on its own even before the coach uses it, then wire the coach
target + Plans (C4-C5), close the check-in loop (K), add the recovery layer (R),
and leave wearables (E) for when that scope opens.

---

## Dependencies and alignment with existing audits

- **Builds directly on shipped work:** the steps NEAT lever
  (`weeklyCoach.js`, `stepsSummary.js`), confirm-then-apply (`coachApply.js`,
  `CoachOutputScreen.js`), the adherence column (migration 050), the
  daily_steps table pattern (migration 056), and the exercise-library
  discipline (`seedExercises.js`, `exerciseMetadata.js`). Nothing here is
  greenfield architecture.
- **Coach-plan audit (`volyume-coach-plan-audit-2026-06-01/`):** C4/K2 extend
  the `weeklyCoach` cardio lever that audit covers; no conflict, a natural
  continuation.
- **Onboarding audit (`volyume-onboarding-audit-2026-06-01/`):** C3 adds one
  optional, default-off step; consistent with its "short, no bloat" finding.
- **Release freeze (CLAUDE / 2026-05-24):** every data-model change is additive
  and frozen-AAB safe (Phase 6 §10); cloud migrations may be applied now.
- **Runtime-critical (CLAUDE Rule 5/7):** F2 (sync), C4/K2 (coach engine), R1
  (recovery model) are runtime-critical; each ships with tests in the same
  commit, no "tests later".

---

## Cost summary

- **Smallest shippable slice that delivers value:** F1 + F3 + F2 + C1 + C2 + C6
  (a user-led, opt-in cardio log with MET feedback, fully invisible to non-
  cardio users). The coach can keep using its existing generic cardio line
  until C4 lands.
- **Full coach-integrated cardio:** add C3-C5 + K1-K2.
- **Best-in-class (ahead of RP/Hevy/Strong/Caliber on recovery):** add R1-R2.
- Wearables (E) are explicitly out of current scope and not on the critical
  path.
