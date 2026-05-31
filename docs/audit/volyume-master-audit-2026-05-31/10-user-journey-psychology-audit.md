# 10 — User Journey & Psychology Audit

Status: **COMPLETE**
Date: 2026-05-31
Method: traced the live journeys from the Phase 2/3 screen + navigation reads
and from safety-system files read this session (`edPatternDetector.js`,
`wellbeing.js`, `dailyNarrative.js`, `stepsLaunchPrompt.js`, `planSwitch.js`,
`feedback.js`). Measured against the CLAUDE.md psychology rules: report facts,
no unasked-for encouragement, sit alongside coaches not above them, and the
hard ED/RED-S safety constraints. Every claim cites a file.

---

## 1. First run & account (the front door)

- **No anonymous mode, every user has a real account** (identity lock,
  CLAUDE.md). The journey is sign-in-first; sign-out wipes local SQLite. This
  is a deliberate, locked decision — psychologically it sets the expectation
  that data is owned and portable, which is the right side of the Phase 8
  "history held hostage" complaint.
- **Live first-run is `FirstRunScreen`** (`firstRunComplete` gate in
  RootNavigator). **`OnboardingScreen` is legacy/likely-dead** (N3-002 /
  A2-067) — a journey-relevant cleanup so there is one front door, not two.
- **Wellbeing mode is asked once during first run** ('calm' / 'normal' /
  'unspecified' default), changeable in Settings, stored in AsyncStorage
  (`wellbeing.js:1-30`). Asking about body-image/ED history **before** the
  app starts coaching is the correct ordering: the softer experience is set
  up before any number is shown.

**Read:** the front door is calm and ownership-first. The one fix is removing
the dead onboarding path so the journey is unambiguous.

---

## 2. The ED / RED-S safety system — the strongest psychological design

This is where Volyume most clearly differs from every Phase 8 competitor, and
it is built with real care:

- **Multi-signal ED-pattern detector** (`edPatternDetector.js`, locked in
  `MOVE_2_ED_PATTERN_DETECTION.md`): four independent signals (rapid loss
  ≤ -1.5%/wk, low energy ≤2 for ≥2wk, sustained under-adherence, weight-only
  check-ins) that only fire **when they stack** (≥2 signals, or ≥3 when goal-
  lock-advanced). A pure function — no single normal behaviour trips it. This
  is harm-prevention done with statistical restraint, not a nag.
- **FFM energy floor is a separate, non-overridable guardrail**
  (nutritionEngine) — "never affected by goal_lock_advanced". A second
  independent safety net means a user can't configure their way under the
  floor.
- **Beat helpline is built in** (`WELLBEING_HELPLINE`: Beat Eating Disorders
  UK 0808 801 0677, free/confidential, `wellbeing.js`). A real-world referral,
  not a generic disclaimer.
- **Adherence-neutral, tier-blind coaching** (referenced across
  nutritionEngine, weeklyCoach, whyThisTemplates, edPatternDetector): the
  coaching colours and language don't punish "under" adherence. This aligns
  with the Phase 8 finding that forgiving check-ins (MacroFactor) retain
  better and judgemental ones (Carbon's "expects strict adherence") alienate —
  and here it's a safety choice, not just a retention one.

**Verdict:** this system is a genuine, defensible differentiator and is
engineered conservatively (stacked signals, independent floor, real
helpline). No safety findings. Phase 11 should treat it as a thing to
**protect** under Rule 5 — any change here needs tests alongside.

---

## 3. Logging a workout (the core loop)

- **ActiveWorkoutScreen** (2,560 LOC) is the hot path. Phase 2/6 confirmed:
  functional `set()` for add-set/add-exercise (documented double-tap fix),
  `finishingRef`/`saving` guards against rapid taps, rest-timer fields
  excluded from selectors so the per-second tick doesn't re-render the tree
  (A2-044), elapsed timer with AppState resync.
- **Offline-first** means the loop never blocks on network (Phase 7) — the
  category's #1 complaint (lost sets on a bad connection) is designed out.
- **Friction point (A2-043, HIGH product bug):** gym weight is stored raw in
  the display unit with no conversion; lbs is label-only. A lifter who logs in
  lbs and later reads kg-centric progression/plates/history hits silent
  inconsistency. This is the most user-visible journey defect found — it
  erodes trust in the numbers, which for a data app is the worst place to
  lose it. Low-risk fix (units.js helpers exist, unused for gym weight).

---

## 4. Coaching feedback loops & motivation

- **Weekly check-in → coach output** is the reflective loop
  (WeeklyCheckInScreen, CoachReviewScreen, CoachOutputScreen,
  BlockReflectionScreen). The engine commits to a block (mesocycle MESO_SCHEDULE,
  A2-046) rather than emitting "random good workouts" — the Phase 8
  Fitbod/Juggernaut complaint.
- **`whyThisTemplates`** gives plain-language reasons for coach decisions.
  Against the Phase 8 "black-box AI" and "steep learning curve" complaints,
  explaining the *why* is the right psychological move and matches the
  CLAUDE.md "sit alongside coaches, not above" stance.
- **Thin-data restraint:** the coach returns a `data_hold` card rather than
  acting on noise (Phase 7) — it doesn't fabricate confidence early, which
  protects trust.
- **P10-001 (low, borderline against the no-encouragement rule):**
  `dailyNarrative.js:57-59` fires a streak headline at ≥3 training days:
  *"{n} days on the trot. Consistency is doing the heavy lifting."* This is
  mostly a fact (the streak count) with a light editorial tail. It sits right
  on the line of the CLAUDE.md "no encouragement nobody asked for / no 'keep
  it up'" rule. Not a violation of the letter (it's reporting a streak, not
  praising the user), but the "doing the heavy lifting" clause is the kind of
  warmth the rule is wary of. Flag for the founder's voice call — keep the
  fact, consider trimming the editorial.

---

## 5. Retention surfaces — calm by design

- **Feedback prompts are heavily suppressed** (`feedback.js`): never twice in
  14 days per trigger, never within 2 min of a crash banner, never during an
  active workout, never on the same screen twice per session, in-session
  memory set. This is the opposite of nag-driven retention. ✔
- **Steps launch prompt fires at most once per install**, flips its flag
  before showing (force-quit-safe), "Not now" routes to Settings later
  (`stepsLaunchPrompt.js:104-139`). Calm, no-nag. ✔
- **Plan-switch confirm** only interrupts when there's real block progress
  (week >1, status active) and keeps history/PRs (`planSwitch.js:32-52`) —
  respects the user's investment rather than silently resetting it.
- **PRCelebration** is an earned, event-driven moment (a real PR), not
  manufactured praise. Reduce-motion aware (Phase 6). Appropriate.
- **Notifications** (Phase 4/5, runtime-critical) are the retention lever most
  prone to nagging; Phase 2 found scheduling with suppression logic. Any change
  here is Rule 5 territory (tests alongside).

**Read:** retention is built on *not* badgering — suppression windows
everywhere. This is consistent with the brand and is the right long-term
psychology. It also means growth/retention levers are intentionally soft,
which is a product-strategy choice for the founder, not a defect.

---

## 6. Monetisation journey

- Four distinct screens (Paywall / CascadeGate / ProUpgrade / Subscription —
  A2-068 confirmed distinct, not redundant) plus `differentialPaywall.js`,
  `proGate.js`. Tier is **server-authoritative** (Play Billing RTDN webhook,
  Phase 5) — a user can't unlock by tampering, and the app degrades to local
  rather than breaking.
- **Psychological exposure (Phase 8 lesson):** the loudest paywall complaints
  in the category are *paywalling once-free basics* (MyFitnessPal's barcode
  scanner) and *no trial* (Carbon). Phase 11 should confirm where Volyume's
  gates sit — specifically whether anything safety-relevant or basic-logging
  (barcode, manual food entry, core workout logging) is behind a gate. Gating
  a *safety* surface would be both an ethical and a trust problem. This needs
  the founder's pricing intent to assess; the code supports gating, the
  question is placement.

---

## 7. Journey/psychology findings summary

| ID | Finding | Severity | Action |
|---|---|---|---|
| A2-043 | lbs is label-only; numbers silently kg-centric (core-loop trust) | **High (product)** | Wire units.js into gym weight (Phase 12) |
| N3-002 / A2-067 | dead legacy OnboardingScreen alongside live FirstRun | Low | Remove for one clear front door |
| P10-001 | streak headline editorial borders the no-encouragement rule | Low | Founder voice call |
| (open) | paywall gate placement vs safety/basic-logging surfaces | needs founder intent | Confirm in Phase 11 |

---

## Verdict
The psychology of the app is **calm, fact-first, and ownership-led**, exactly
the brief: suppression-based retention, earned celebration, plain-language
coach reasoning, and a conservatively-engineered ED/RED-S safety system that
is the standout differentiator versus every Phase 8 competitor. The journeys
are sound. The one journey defect that genuinely matters is **A2-043** (units
trust in the core logging loop). The rest are a dead front-door path, a
borderline copy line, and a pricing-placement question that only the founder
can resolve. Nothing here contradicts a Phase 2 finding; it explains which
ones touch the user's trust most directly.
