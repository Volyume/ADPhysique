# Cardio QA - 01: Stress test findings

Status: COMPLETE. Timestamp: 2026-06-03. Method: traced each path in the
committed code; ran the cardio/sync/coach suites (84 passing) and the
screen-mount sweep (435 passing). Findings are code-grounded; clean results are
recorded as well as bugs. No code changed.

---

## Test matrix outcomes

| Area | Test | Result |
|---|---|---|
| Onboarding | opt in → `cardioEnabled` saved | PASS (`ProOnboardingScreen` save ~503) |
| Onboarding | opt out → cardio hidden | PARTIAL - hidden on Train/Plans/Settings, **shown in Diary** (BUG-1) |
| Onboarding | opt out then enable in Settings | PASS (`SettingsScreen` writes `cardioEnabled`; gates re-show) |
| Onboarding | interrupted mid-setup | PASS - `cardioEnabled` only written at finish; undefined reads as on (default) |
| Library | browse all | PASS - 36 activities, grouped by category in `LogCardioScreen` |
| Library | search | PASS - case-insensitive name filter |
| Library | favourites store/retrieve | PASS - `cardioFavourites` profile blob; star toggles |
| Library | log every activity type | PASS - all 36 flow through `insertCardioLog` |
| Library | minimum inputs | PASS - duration stepper floors at 5 min, intensity always defaulted |
| Library | maximum inputs | PASS - duration capped 300 (stepper) / 1440 (insert clamp) |
| MET/kcal | low/high bodyweight, 1 min, 3h, low/high intensity | PASS - `MET×kg×h`; returns null on non-positive, no crash |
| MET/kcal | bodyweight not set | PARTIAL - defaults to 75 kg silently (BUG-6) |
| Diary | calorie adjustment on log | BY DESIGN - kcal is feedback, never added to target |
| Diary | delete reverses | PASS - `CardioRow` re-reads on focus; no target to reverse |
| Diary | multiple sessions same day | PASS - `summariseWeekCardio` sums the day's rows |
| Plan | opted-in plan view | PASS - `CardioPlanCard` at foot of Plans |
| Plan | opted-out plan view | PASS - card gated on `tier==='pro' && cardioEnabled !== false` |
| Plan | ad-hoc cardio | PASS - log with no target saves + shows |
| Plan | 3/4/5/6-day plans | PASS - card is a weekly block, independent of day count |
| Check-in | all sessions done → compliance | PARTIAL - prefill verdict correct, but coach does not escalate from it (BUG-2) |
| Check-in | no cardio done | PARTIAL - prefill 'missed'; coach holds via trend, not compliance (BUG-2) |
| Check-in | over-prescribed | PASS - `cardioComplianceFromLog` returns 'hit' for >= target |
| Check-in | non-cardio user | PASS - question gated on `hasCardioPrescription` |
| Recovery | high-intensity flag | PARTIAL - ReadinessCards note fires at high load; coach-side flag not wired (BUG-3) |
| Recovery | low-impact avoids warning | PASS - `cardioFatigueContribution('low')`=0.3, load stays 'low' |
| Recovery | no cardio = identical | PASS - `computeRecoveryEMAs` untouched; load 0 → no note |
| Nav | every path / back / modal | PASS - `LogCardio` modal + `CardioHistory` push; back returns; no dead ends |
| Nav | rapid taps on Save | PASS - `saving` guard |
| Nav | rapid taps on "Log cardio" | LOW RISK - `navigation.navigate` dedupes same route (BUG-7, minor) |
| Persistence | log, reopen | PASS - SQLite row persists |
| Persistence | preferences persist | PASS - profile blob persists |
| Persistence | offline log | PASS - local write succeeds; sync queued (pending migration 064) |

---

## Bugs

---
ID: CARDIO-BUG-1
FILE: src/screens/DiaryScreen.js
LINE: 538
SEVERITY: Medium
TYPE: UX Error / inconsistent gating
DESCRIPTION: The Diary cardio row is gated only on `cardioEnabled && userId`,
with no `tier === 'pro'` check. Train (`HomeScreen.js:952`), Plans
(`PlansScreen.js:794`) and the Settings toggle (`SettingsScreen.js:959` block)
all gate on `tier === 'pro'`. Because `cardioEnabled` defaults to on (undefined
reads as on) and a free user never sees the Pro onboarding toggle, a free-tier
user sees a "Cardio / Add" row in the Diary and nowhere else.
STEPS TO REPRODUCE: Sign in as a free-tier user (never went through Pro
onboarding) → open Diary → a Cardio row appears at the foot, beside water.
ACTUAL BEHAVIOUR: Free users see and can open the cardio log from the Diary,
though cardio is a Pro feature everywhere else.
EXPECTED BEHAVIOUR: Cardio surfaces only for Pro users, consistently.
FIX: Add `tier === 'pro'` to the Diary gate. Read `tier` from the store
(`s.tier`) in the same `useShallow` selector and change line 538 to
`{tier === 'pro' && cardioEnabled && userId ? (`.
---
ID: CARDIO-BUG-2
FILE: src/lib/weeklyCoach.js
LINE: 750
SEVERITY: High
TYPE: Incorrect Behaviour / integration gap
DESCRIPTION: `nextCardioTarget` (the compliance-driven escalation in
`cardioEngine.js:125`) is tested but never called in production. The coach's
cut cardio lever calls `cutCardioTarget(consecutiveOffTargetWeeks, goalPhase)`,
which escalates only off the weight-trend stall counter, not off how much
cardio the user actually logged. So "hit your cardio and still off target → add
a session" and "missed it → hold and say so" do not happen. Cardio compliance
(`cardioAdherence`, and the new log-based count) is captured but not acted on.
STEPS TO REPRODUCE: As a cut user with an applied cardio target, log 0 of 3
sessions one week, then run the next coach output. The cardio note does not
acknowledge the miss; it re-derives from the weight trend.
ACTUAL BEHAVIOUR: Cardio dose ignores logged compliance.
EXPECTED BEHAVIOUR: Next week's cardio target reflects compliance via
`nextCardioTarget` (escalate on hit+still-off-trend, hold+explain on miss,
capped at `MAX_CARDIO_SESSIONS`, pause on poor recovery).
FIX: In `weeklyCoach`, when a prior `cardioTarget` exists, compute the next
target with `nextCardioTarget({ currentTarget, sessionsLogged, stillOffTrendInCut,
poorRecovery })`, threading the week's logged session count (from
`summariseWeekCardio` on the week's `cardio_log`) into the coach inputs.
---
ID: CARDIO-BUG-3
FILE: src/lib/weeklyCoach.js
LINE: 727-757
SEVERITY: Medium
TYPE: Incorrect Behaviour / integration gap
DESCRIPTION: `cardioRecoveryFlag` (`cardioEngine.js:160`) is tested but never
called. The recovery angle is partly delivered by the ReadinessCards load note
(`ReadinessCards.js:196`), but the coach output itself emits no flag when hard
cardio stacks against training, and there is no leg-day-collision nudge. The
coach's only cardio-recovery behaviour is the existing poor-recovery pause.
STEPS TO REPRODUCE: Log several high-impact sessions in a week with recovery
trending down; the coach output carries no cardio caution.
ACTUAL BEHAVIOUR: Coach output silent on cardio load.
EXPECTED BEHAVIOUR: A one-line advisory when cardio load is high vs training
(per Phase 6 §8 of the integration audit).
FIX: Feed the week's `summariseWeekCardio` + recovery-trend signal into the
coach and surface `cardioRecoveryFlag(...)` as a coach note when non-null.
---
ID: CARDIO-BUG-6
FILE: src/screens/LogCardioScreen.js
LINE: 43
SEVERITY: Low
TYPE: Incorrect Calculation (silent default)
DESCRIPTION: `bodyweightKg = Number(userProfile?.weightKg) > 0 ? ... : 75`. If
the profile has no weight, the kcal estimate silently uses 75 kg with no
indication, so the figure can be materially wrong for a light or heavy user.
STEPS TO REPRODUCE: Profile with no `weightKg` → log cardio → kcal computed at
75 kg.
ACTUAL BEHAVIOUR: A plausible-looking but wrong kcal feedback figure.
EXPECTED BEHAVIOUR: Either hide the kcal chip when bodyweight is unknown, or
note it is approximate. (Low because kcal is feedback only, never a target.)
FIX: When `userProfile?.weightKg` is missing, hide the kcal row rather than
defaulting to 75, or label it "approx.".
---
ID: CARDIO-BUG-7
FILE: src/components/CardioCard.js / src/screens/DiaryScreen.js
LINE: onPress handlers
SEVERITY: Low
TYPE: UX Error (minor)
DESCRIPTION: Rapid double-tap on "Log cardio" fires `navigation.navigate('LogCardio')`
twice. React Navigation dedupes identical routes, so in practice one modal
opens, but this relies on navigator behaviour rather than an explicit guard.
STEPS TO REPRODUCE: Double-tap the Train CardioCard fast.
ACTUAL BEHAVIOUR: One modal (navigator dedupe).
EXPECTED BEHAVIOUR: Same; acceptable. Logged for completeness.
FIX: None required; optional `navigation.navigate` is already idempotent here.
---

## Coverage gap (not a runtime bug)

- `CardioHistoryScreen` is not in `src/__tests__/screen-mount.test.js`, so it has
  no automated render coverage. It lints clean and follows standard patterns,
  but a mount entry would catch a future regression. See BUG-1 sibling in
  cardio-qa-02 (coverage).
