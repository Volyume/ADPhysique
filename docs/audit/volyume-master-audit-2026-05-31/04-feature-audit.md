# 04 — Feature Audit

Status: **COMPLETE**
Date: 2026-05-31
Method: catalogued from the code actually read in Phase 2 (227 files) +
the navigation trace (Phase 3). Each feature's implementation quality and
edge-case handling is stated from the verified code, not assumed. Where a
feature's completeness depends on a finding, it cross-refs the A2/N3 id.

---

## Feature inventory (by domain, with verified status)

### A. Training / logging — **fully implemented**
- **Workout logging** (ActiveWorkoutScreen): set entry with weight/reps/
  set-type/RIR, rest timer, supersets, cluster sets (myo-rep/rest-pause),
  unilateral logging, ghost/target prefill, live e1RM. Drift-free elapsed
  timer, clean teardown (A2-044). **Works fully.**
  - Edge: empty weight blocked for non-bodyweight (validation); rapid-tap
    guarded (`finishingRef`, functional `set()` forms). Lock-screen status
    notification is **inert** (A2-059) — calls fire into a no-op.
- **Exercise library** (~280 canonical exercises, seedExercises): search,
  filter (equipment/muscle), detail, substitutes, custom exercises. Derived
  metadata, deterministic IDs. **Works fully.**
- **Plans / routines / mesocycles**: library plans (curated), manual
  builder, plan detail, routine detail, mesocycle builder + the live 5/6-week
  progression schedule (`mesocycle.js`). Block advisor, mid-block-switch
  confirm. **Works fully.** (Dead code: planEngine's unused dual progression
  output A2-046 — never reaches the UI.)
- **Workout history** (list + calendar), **PR Wall**, **Volume heatmap**,
  **Lift progress**, **Year of Lifts** recap. **Work fully.**
- **Travel mode** (bodyweight/dumbbell/hotel 1-week plan). **Works.**
- **Import from Hevy/Strong** (CSV → preview → confirm, idempotent).
  **Works fully.**

### B. Coaching engine ("Precision Coaching") — **fully implemented, the crown jewel**
- **Weekly coach** (`runWeeklyCoach`): EWMA weight trend, data-confidence
  gating, autoregulation matrix, calorie/steps/cardio levers, deload + diet-
  break, FFM floor, ED-pattern detector, rapid-loss override. Confirm-then-
  apply (`coachApply`, nothing auto-executes). **Works fully**, heavily
  tested (51 cases).
- **Plan generation** (`generatePlan`/`planAutoGen`): split selection,
  goal/phase overlays, equipment filtering, time-trim, supersets. **Works.**
- **Insights engine** (6 deterministic rules), **adaptive landmarks**,
  **block advisor**, **swap engine** (incl. joint-discomfort auto-swap).
  **Work fully.**
- Edge: new-user gating throughout (3-week base for volume nudges, ≥2
  check-ins for deload) so no premature/false coaching.

### C. Nutrition / food — **fully implemented**
- **Food diary** (DiaryScreen): meal sections, macro rings (adherence-
  neutral), date pager, swipe-delete, copy-yesterday, quick-add.
- **Food search waterfall** (local→OFF→USDA, 250ms debounce, cache
  promotion), **barcode + label scan** (vision-camera + on-device MLKit),
  **custom foods** (sanity-checked), **recipes**, **saved meals**,
  **meal suggestions** (rule-based), **CSV export**, **OFF write-back**
  (consent-gated). **All work.**
- **Nutrition targets** (BMR/TDEE/macros, adaptive TDEE, FFM floor, diet
  break/refeed). **Works fully.**
- Edge: USDA key client-bundled (A2-037, low); food layer fully
  parameterised (no SQLi).

### D. Body / health — **implemented**
- **Morning weight** (kg-canonical, st/lb/kg display), **body metrics**
  (measurements + body-fat), **Apple Health / Health Connect** sync (weight
  in, steps aggregate, workout write-out). **Work.**
- Edge: a genuine 0-step morning reads as "no data" (A2-064, low).

### E. Accounts / sync / monetisation — **implemented, server-authoritative**
- **Auth** (email + Google + Apple-via-browser), **cloud sync** (legacy +
  registry, offline queue, watermark delta, conflict resolution),
  **local backup** export/import, **delete-account** (server Edge Function +
  local wipe). **Work.**
- **Tiers / cascade / paywall** (Play Billing, server-verified receipts,
  RTDN webhook source of truth, trial cascade, differential paywall).
  **Works** (beta: everyone Pro).
- Edge: lbs gym-weight is label-only (**A2-043, the main product bug**);
  Apple Sign-In compliance risk (A2-016); sync redundancy on foreground
  (A2-001, idempotent).

### F. Notifications — **partially live**
- **Local scheduled** (morning weight, weekly check-in, coach-ready, cascade
  gate, year-of-lifts) with quiet hours + smart suppression. **Work.**
- **Remote push** — **inert** (no EAS `projectId`, A2-056): the only remote
  use case (subscription-payment-failure push) silently does nothing.
- Lock-screen active-workout notification + foreground-service rest timer —
  **disabled** (A2-059).

### G. Safety / wellbeing — **fully implemented (differentiator)**
- **ED/RED-S system**: SCOFF screening (WellbeingCheck), FFM energy floor,
  ED-pattern detector, goal-lock threshold calibration, adherence-neutral
  macro colours, Beat helpline, tier-blind safety (free users protected),
  ED/FFM events in-app-only (never push). **Works fully, end to end.**
- **Accessibility**: reduce-motion (live), larger-text/contrast/colour-blind
  (apply-on-reload, A2-026), broad a11y labelling. Reduce-motion fully wired;
  the others need a restart (the one real a11y weakness).
- **GDPR**: Article 9 consent gate (never-stranded), consent log, privacy
  policy, cycle-tracking opt-in, data export/delete.

---

## Promised-but-inert / dead surfaces (feature-completeness gaps)

| ID | Feature | State |
|---|---|---|
| A2-059 | Lock-screen workout notification | calls fire into a no-op; effects still run |
| A2-056 | Remote push (payment-failure) | inert — no EAS projectId |
| A2-043 | lbs gym-weight | label-only; math is kg |
| A2-046 | planEngine dual progression output | computed, never consumed (dead) |
| A2-048 | RestTimer progress-bar animation | driven every rest, renders nothing (dead) |
| A2-003 | WhatsNewSheet | shipped behind `{false &&}` (intentional dormant) |
| N3-002 | generic OnboardingScreen | likely-dead legacy route |
| A2-010 | deep-link to content | entitlements declared, no in-app routing |

**No "Coming soon" placeholders or greyed-out future features found** (which
the CLAUDE.md design rules forbid) — the inert items above are either
disabled-with-reason or dead code, not user-visible teasers.

---

## Integration points (verified connected)
- Logging → coach: workout feedback → adaptation events → weekly coach. ✔
- Food → coach: 7-day intake rollup → FFM floor → calorie holds. ✔
- Health → app: weight import → morning log → check-in trend. ✔
- Goal change → plan + nutrition regen (planAutoGen) + summary screen. ✔
- Payments → tier → ProGate → feature access (server-authoritative). ✔

**Verdict:** the feature set is **broad and genuinely complete** for the
core loops (train, coach, eat, track, sync, monetise, stay safe). The gaps
are a small set of inert/dead surfaces (notifications, lbs, deep links,
dead code) — all carried to Phase 11, none a user-visible "coming soon".
