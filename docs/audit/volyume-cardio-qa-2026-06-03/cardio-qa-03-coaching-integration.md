# Cardio QA - 03: Coaching integration assessment

Status: COMPLETE. Timestamp: 2026-06-03. Method: traced the full loop in code,
grepped the coach for every cardio signal. No code changed.

---

## 1. The loop, traced step by step

| Step | Wired? | Evidence |
|---|---|---|
| Onboarding preference → `cardioEnabled` | YES | `ProOnboardingScreen` save ~503 |
| Coach sets a cardio target (cut only) | YES | `weeklyCoach.js:750` `cutCardioTarget(...)` |
| Apply → `userProfile.cardioTarget` + `cardioPrescription` | YES | `CoachOutputScreen.handleApplyCardio` ~821 |
| Plans shows the target + progress | YES | `CardioPlanCard` reads `cardioTarget` + week's log |
| User logs cardio → `cardio_log` | YES | `LogCardioScreen` → `insertCardioLog` |
| Check-in captures compliance | YES | `WeeklyCheckInScreen` adherence question, prefilled from log (~228) |
| **Coach adjusts next week from compliance** | **NO** | `weeklyCoach` does not read `cardioAdherence`, `cardioTarget`, or any cardio session count (grep empty) |

**The loop is broken at the final, most important step.** Compliance is
captured and even pre-computed accurately from the log, then it goes nowhere:
the coach re-derives the cardio dose purely from the weight-trend stall counter
(`consecutiveOffTargetWeeks`) every week. This is the single biggest
coaching-integration weakness.

## 2. Specific breaks

**CI-1 (High). Cardio compliance is captured but unused.** `weeklyCoach` never
references `cardioAdherence` (grep empty) and is passed no cardio target or
session data. The check-in's cardio question and its log-based prefill therefore
feed a dead end. The tested `nextCardioTarget` (escalate on hit + still
off-trend, hold + explain on miss, cap, pause on poor recovery) is never called.
Effect: a user who hits their cardio and is still losing too slowly is not given
more; a user who ignores cardio is not told to hit the current dose first. The
coach cannot "see" cardio adherence at all.

**CI-2 (Medium). Recovery load does not reach the coach's training decision.**
`cardioRecoveryLoad` is surfaced on the readiness card (`ReadinessCards.js:196`)
but the coach's hold/push training logic does not consider it, and
`cardioRecoveryFlag` is never called. So high cardio load shows the user a note
but does not actually make the coach more conservative with training volume the
way the audit (Phase 6 §8) intended. The only coach-side cardio-recovery
behaviour is the pre-existing poor-recovery pause of the cardio prescription.

**CI-3 (Medium, partly by design). Cardio is cut-only for the coach.** The coach
only sets a cardio target in a cut (`weeklyCoach.js:735` gating). For a
bulk/maintenance/general-fitness user with cardio enabled who logs cardio, the
coach never sets a target, so `hasCardioPrescription` is false, the check-in
asks nothing, and the coach never acknowledges the cardio. This matches the
founder's "available, not allocated" decision, so it is largely intentional, but
it means a maintaining user gets zero coaching feedback on cardio they are
doing. Worth a founder decision: a light, opt-in acknowledgement vs silence.

## 3. What works well

- **Calorie philosophy is correct and consistent.** kcal is feedback only, never
  added to the target; the Diary budget stays food-only; the adaptive TDEE
  absorbs cardio via the weight trend. This is the right, evidence-based model
  and is implemented cleanly. No double-count anywhere (verified: no cardio
  est_kcal is added to `nutrition_targets`).
- **The check-in prefill is genuinely good UX** in isolation: it reads the log
  and pre-answers the compliance question. The only problem is the answer is not
  consumed downstream (CI-1).
- **Target communication is plain-language** ("Aim for 3 cardio sessions this
  week, 20 to 30 min at an easy pace. Your choice of activity.") and respects
  user-led choice. Reads like a coach, not a machine.
- **Recovery direction is right** (additive load, HIIT > LISS) and the
  user-facing note is well-judged; it just needs to reach the coach (CI-2).

## 4. Net

The plumbing of the loop exists end to end except the return leg: **cardio data
flows out to the user (targets, Plans, Diary, recovery note) but does not flow
back into the coach's decisions.** Closing CI-1 (feed compliance +
`nextCardioTarget`) and CI-2 (feed load + `cardioRecoveryFlag`) into `weeklyCoach`
turns cardio from a parallel feature into a real coaching lever. Both are
contained changes that thread the week's `cardio_log` summary into the coach
inputs and call functions that already exist and are tested.
