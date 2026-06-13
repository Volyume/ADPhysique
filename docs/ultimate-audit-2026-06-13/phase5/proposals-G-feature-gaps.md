# Phase 5 proposals — CLUSTER G: New features (genuine gaps vs the market)

Source documents (read in full):
- `docs/ultimate-audit-2026-06-13/phase3/compare-12-feature-gaps.md` (the
  confirmed-absent features, with carried statuses).
- `docs/ultimate-audit-2026-06-13/ultimate-audit-00-navigation-psychology.md`
  (placement + confirms absence from the nav map).
- Phase-1 inventory fragments for implementation file:line:
  `phase1/01-workout-session.md`, `phase1/05-checkin-safety.md`,
  `phase1/09-progress-analytics.md`, `phase1/14-partner-cardio.md`,
  `phase1/08-food-logging.md`.

Scope note: this cluster is the "MISSING ENTIRELY (confirmed absent from the
nav-psychology map)" list (compare-12 :104–120) plus the white-space items
under WHERE WE LEAD / USER SENTIMENT. Every proposal that touches the
deterministic engine, the ED-safety system, gating, or billing is flagged
**FOUNDER-GATE** and is INPUT ONLY — not a build instruction. British English
throughout.

---

```
ID: U-G-1
AREA: Feature gaps — honest overreaching / deload warning
TITLE: Ship the "you're overreaching → take a lighter week" warning no consumer app ships
SUGGESTED TIER: 2 High
IMPACT (1-10): 9 — compare-12 names this the single clearest white-space in the
  whole market: "no consumer app was found shipping it; apps appear to fear
  telling paying users to train less" (USER SENTIMENT F1.1) and WHERE WE LEAD
  states the ED-safety stance + deterministic engine "uniquely position Volyume
  to ship the honest 'you're overreaching → deload' warning no consumer app
  ships". Beginner-protective and competitor-valued at once.
EFFORT (1-10): 6 — the surfacing primitives already exist (a deload banner with
  reason line + InfoTooltip on Consistency, ConsistencyScreen.js:54-70; a
  "Recovery week" banner on Active Workout, ActiveWorkoutScreen.js:1517-1534;
  FatigueTrendCard + WorkloadCard/ACWR on Consistency, ConsistencyScreen.js:
  97-114). The *decision* of when to fire is engine + ED-safety territory —
  FOUNDER-GATE — which is where the effort and the risk sit, not the UI.
CURRENT STATE: A `deloadAlert`-driven "Lighter week recommended" banner already
  renders on Consistency (moon icon, title, reason line, InfoTooltip)
  (ConsistencyScreen.js:54-70), and Active Workout shows a deload "Recovery
  week" banner with a "Skip" action (ActiveWorkoutScreen.js:1517-1534,
  styles 2621-2623). A `FatigueTrendCard` and a `WorkloadCard` labelled
  "Training load (ACWR)" already exist on Consistency (ConsistencyScreen.js:
  97-114). What is NOT DETERMINED IN CODE: whether `deloadAlert` is *fatigue/
  overreaching*-triggered or merely date/block-scheduled (compare-12 lists
  fatigue-TRIGGERED auto-deload as a LAG, F3.4), and what rule populates it.
THE PROBLEM: NEWBIE — a novice has no way to know they are doing too much too
  soon; compare-12 NEWBIE VERDICT flags "no readiness/overreaching warning to
  protect a novice from doing too much too soon (F1.1, F2.2)". ATHLETE — a
  competitor must currently time deloads by hand (compare-12 ATHLETE VERDICT:
  "a fitness-fatigue-form load curve to time deloads by fatigue rather than by
  hand (F2.1)"; "fatigue-triggered (not date-locked) auto-deload (F3.4)").
THE EVIDENCE: compare-12 MISSING/LEAD/SENTIMENT — F1.1 honest deload warning
  marked **NOT FOUND elsewhere = white-space**; F3.4 fatigue-triggered
  auto-deload **VERIFIED/PARTIAL**; F2.1 CTL/ATL/TSB load model **VERIFIED**.
BEST REFERENCE IMPLEMENTATION: Existence proofs for the *signal*: TrainingPeaks
  PMC (CTL 42-day EWMA, ATL 7-day EWMA, TSB = CTL − ATL), generalised to
  RPE-only by intervals.icu (compare-12 BEST IN CLASS F2.1,
  https://www.trainingpeaks.com/coach-blog/a-coachs-guide-to-atl-ctl-tsb/);
  auto-deload in a lifting app: Alpha Progression + Stronger by the Day (F3.4).
  No app ships the *honest warning* itself — that is the white-space Volyume
  would be first to fill (F1.1).
PROPOSED SOLUTION: A deterministic "back-off" recommendation that, when the
  engine's fatigue/load rule trips, surfaces a plain-English, non-alarming
  banner — "Your load has climbed faster than usual. A lighter week now will
  let it pay off." — with the rule stated as the rationale ("the rule is the
  rationale", compare-12 WHERE WE LEAD). It reuses the EXISTING deload banner on
  Consistency (ConsistencyScreen.js:54-70) and the Active-Workout recovery
  banner (ActiveWorkoutScreen.js:1517-1534); no new screen. The *trigger rule*
  is a deterministic engine output — no AI, no randomness — and must defer to
  the ED-safety floors (it can never push training UP, only down).
NEWBIE EXPERIENCE: Sees a gentle, opt-out banner ("Take a lighter week" + a
  one-line why + a "Tell me more" InfoTooltip in the existing pattern,
  ConsistencyScreen.js:62-66) instead of silently overreaching. Never shaming.
ATHLETE EXPERIENCE: Gets a fatigue-timed (not date-locked) deload prompt tied to
  the existing FatigueTrendCard/ACWR surface (ConsistencyScreen.js:97-114), with
  the numeric rationale on tap — replacing hand-timing.
IMPLEMENTATION BLUEPRINT:
  - Surface (no new nav): reuse the deload banner block on ConsistencyScreen.js:
    54-70 (moon icon, title, reason line, InfoTooltip) and the Active-Workout
    "Recovery week" banner at ActiveWorkoutScreen.js:1517-1534 (deloadBannerTitle
    style 2621, deloadBannerSub 2622, deloadSkip 2623). The "Skip" action already
    exists — keep it (the warning is advisory, never coercive).
  - Trigger rule: a deterministic engine signal. The fatigue/load inputs already
    rendered (FatigueTrendCard, WorkloadCard ratio !== null,
    ConsistencyScreen.js:110-114) imply a load model exists, but the rule that
    fires `deloadAlert` and whether it is fatigue- vs date-driven is **NOT
    DETERMINED IN CODE — confirm before building** (compare-12 holds F3.4 at
    VERIFIED/PARTIAL and Phase-1 did not read the engine).
  - Gating: the banner appears on Consistency (a FREE screen, no withProGuard,
    RootNavigator.js:349 per phase1/09 GATING) and Active Workout (FREE,
    phase1/01 GATING). Confirm against the FREE/PRO matrix whether a
    fatigue-warning counts as a "Precision Coaching adjustment" (Pro) before
    exposing it to free users.
  - States: loaded = banner present when rule trips; empty = banner absent
    (already self-hides "only when deloadAlert is set", ConsistencyScreen.js:54);
    error = no banner (fail-safe to silence, never a false alarm).
  - Edge cases: must NEVER fire during an active ED-safety hold or lower a
    floor; must never streak-shame (interacts with U-G-5).
VERIFICATION: FOUNDER-GATE (engine trigger rule + ED-safety boundary +
  free/Pro classification). UI primitives all VERIFIED in Phase-1. The trigger
  rule (fatigue- vs date-driven) and the FREE/PRO classification are NOT
  DETERMINED IN CODE — confirm before building.
```

---

```
ID: U-G-2
AREA: Feature gaps — form-check video attached to a logged set/exercise
TITLE: Attach a form-check video to the exact exercise slot, with in-context per-exercise notes
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — the most-quoted competitor-communication ask in the research:
  "TrueCoach... upload the video directly to the exercise slot" (Jack Suljevic,
  VERIFIED) and "add videos/pictures to their workout comments... instead of
  having to navigate out... to the messenger" (Nick Cowell, VERIFIED)
  (compare-12 USER SENTIMENT). Beginner self-review and athlete cross-block form
  history both benefit.
EFFORT (1-10): 7 — there is NO video/media attachment surface anywhere in
  RootNavigator.js (compare-12 MISSING: "No video/media attachment screen
  anywhere in RootNavigator.js"); needs a new capture/attach affordance on a
  2625-line screen and offline-first local storage. Expo media capture is a
  native capability — confirm it is reachable via an Expo config plugin (managed
  workflow, CLAUDE.md ARCHITECTURE) before committing.
CURRENT STATE: Active Workout has a per-exercise overflow ("⋯") menu
  (ActiveWorkoutScreen.js:1464-1484, overflow sheet 2112-2122) and an optional
  per-set note TextInput (ActiveWorkoutScreen.js:1729-1741) and a "Note"
  secondary button (1882). There is no media attach. ExerciseDetail exists
  (RootNavigator.js:323,351) but per phase1 carries no attached-media surface
  (NOT DETERMINED beyond the nav map). Self-attach form-video is held PARTIAL
  (compare-12 F3.7).
THE PROBLEM: NEWBIE — cannot self-review technique against a demo in context
  (compare-12 NEWBIE VERDICT: "no form-video self-review/demos-in-context
  (F7.1, F4.1)", "no in-context per-exercise coaching notes (F5.5)"). ATHLETE —
  no durable form-video history tied to a lift across blocks (ATHLETE VERDICT,
  F4.1).
THE EVIDENCE: compare-12 MISSING ENTIRELY F3.7/F4.1/F5.5 — TrueCoach VERIFIED;
  self-attach PARTIAL. USER SENTIMENT quotes VERIFIED.
BEST REFERENCE IMPLEMENTATION: TrueCoach — video uploaded to the exercise slot,
  time-stamped comments + drawing tools; "the feature Trainerize users beg for,
  115 votes" (compare-12 BEST IN CLASS F4.1, https://truecoach.co/features/).
PROPOSED SOLUTION: Let a user attach a short self-recorded clip (and a text
  note) to a specific exercise within a logged session, stored locally
  (offline-first, device is source of truth — CLAUDE.md ARCHITECTURE), and
  re-view it from ExerciseDetail as a per-lift history. NO coaching/LLM analysis
  of the video — it is a self-review artefact only (respects the no-AI boundary).
NEWBIE EXPERIENCE: From the exercise "⋯" overflow during logging, "Add a form
  clip" → record/pick → it pins to that exercise; later, the demo + their own
  clip sit side by side in ExerciseDetail for self-comparison.
ATHLETE EXPERIENCE: Builds a durable clip history per lift across blocks,
  viewable in ExerciseDetail (RootNavigator.js:323,351); pairs with the existing
  per-set note (ActiveWorkoutScreen.js:1729-1741).
IMPLEMENTATION BLUEPRINT:
  - Attach entry point: add an item to the existing exercise overflow sheet
    (ActiveWorkoutScreen.js:2112-2122) — NOT a new top-level screen — so it sits
    beside the existing "Swap exercise" affordance.
  - Review surface: ExerciseDetail (ExerciseDetailScreen, RootNavigator.js:323
    PlansStack / :351 ProgressStack). Whether ExerciseDetail currently renders
    any media list is **NOT DETERMINED IN CODE — confirm before building**
    (Phase-1 nav map only; ExerciseDetailScreen.js not read in this cluster).
  - Storage: local-first; sync via the sync layer only, never a direct Supabase
    write from the component (CLAUDE.md ARCHITECTURE). "No PII to any external
    service" — a self-video must NOT be sent anywhere except EU Dublin via the
    sync target, and only if the user opts in. Exact storage path/table NOT
    DETERMINED IN CODE.
  - Native capability: media capture in Expo managed workflow requires an Expo
    config plugin (no eject — CLAUDE.md). Confirm the plugin + its licence as a
    dependency ask before installing (CLAUDE.md SACRED RULES — dependencies).
  - Gating: workout logging is FREE (phase1/01 GATING, no withProGuard on
    ActiveWorkout). Decide whether form-video is a FREE add or Pro — NOT
    DETERMINED; confirm against the FREE/PRO matrix.
  - States: empty = "No clips yet" in ExerciseDetail; loaded = clip thumbnails;
    error = capture/permission failure toast. Edge: large files on low storage;
    permission denied; offline (must still capture + store locally).
VERIFICATION: PARTIAL/evidence-thin on self-attach (compare-12 F3.7 PARTIAL).
  NOT DETERMINED IN CODE: ExerciseDetail media rendering, storage location, Expo
  media plugin availability, and FREE/PRO classification — all confirm before
  building. New dependency (media plugin) requires a founder yes.
```

---

```
ID: U-G-3
AREA: Feature gaps — RPE/RIR trend to catch creeping fatigue
TITLE: An RPE/RIR trend graph so creeping fatigue is visible
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 7 — compare-12 WHERE WE LAG: "No RPE/RIR trend surfaced to detect
  creeping fatigue (logging exists everywhere; trend graph does not — F3.3)";
  ATHLETE VERDICT flags "an RPE/RIR trend graph to catch creeping fatigue
  (F3.3) — note the nav map shows no RPE-trend screen". Primarily an athlete
  feature.
EFFORT (1-10): 7 — a complication flagged in Phase-1: RPE is HARD-DISABLED in
  logging (`rpe:null` at ActiveWorkoutScreen.js:791,811) and RIR is "no longer
  asked per set" (SetEntry.js:135-138 comment) (phase1/01 ATHLETE QUESTION). So
  there is currently NO per-set RPE/RIR data to trend — capturing it again is a
  prerequisite, which touches the highest-frequency logging screen and likely
  the engine's autoregulation inputs.
CURRENT STATE: RPE is hard-disabled (`rpe:null`, ActiveWorkoutScreen.js:791,
  811); RIR no longer asked per set (SetEntry.js:135-138 comment). The
  Consistency screen surfaces fatigue via FatigueTrendCard (ConsistencyScreen.js:
  97-104) and ACWR (WorkloadCard :110-114) but no RPE/RIR trend. No RPE-trend
  screen anywhere in the nav map (compare-12 WHERE WE LAG / ATHLETE VERDICT).
THE PROBLEM: ATHLETE — cannot see whether effort-at-load is creeping up week to
  week (early fatigue), the F3.3 gap. NEWBIE — low relevance (RPE/RIR is athlete
  vocabulary; compare-12 places it in the ATHLETE column).
THE EVIDENCE: compare-12 WHERE WE LAG F3.3 — logging VERIFIED / trend PARTIAL.
  Phase-1 confirms RPE/RIR capture is currently OFF (ActiveWorkoutScreen.js:791,
  811; SetEntry.js:135-138).
BEST REFERENCE IMPLEMENTATION: intervals.icu RPE-only load curve (compare-12
  F2.1, generalises TrainingPeaks PMC to RPE). No single named RPE-trend graph
  app cited; held at the F3.3 PARTIAL.
PROPOSED SOLUTION: Re-enable optional per-set RPE/RIR capture and add a
  deterministic RPE/RIR-over-time line to the Consistency recovery section, beside
  the existing FatigueTrendCard. No AI; a plain rolling chart of logged effort.
NEWBIE EXPERIENCE: Off by default; an advanced toggle (Settings → Coaching,
  SettingsCoachingScreen RootNavigator.js:376) keeps the beginner logging path at
  1-3 taps (phase1/01 EXTRA ANSWER 3) unchanged.
ATHLETE EXPERIENCE: Sees an RPE/RIR trend line in the Consistency "Recovery
  signals" area (ConsistencyScreen.js:107) — the natural home next to fatigue/ACWR.
IMPLEMENTATION BLUEPRINT:
  - Prerequisite (FOUNDER-GATE): re-enabling RPE/RIR capture touches
    ActiveWorkoutScreen.js:791,811 and SetEntry.js:135-138 and likely the engine's
    autoregulation path. Whether the engine consumes RPE/RIR is NOT DETERMINED IN
    CODE — confirm before building (no-AI boundary: the trend is descriptive, not
    a coaching adjustment, unless founder says otherwise).
  - Surface: add a card in the Consistency recovery section
    (ConsistencyScreen.js:107 ReadinessCards / :97-104 FatigueTrendCard area) — no
    new nav route. Consistency is FREE (RootNavigator.js:349, phase1/09).
  - Gating: if RPE/RIR feeds Precision Coaching it is Pro; if purely descriptive
    it may be FREE — NOT DETERMINED, confirm against the FREE/PRO matrix.
  - States: empty = "Log a few sessions with effort on to see your trend";
    loaded = line chart; error = hide. Edge: sparse/irregular logging; mixed
    sessions with effort on/off.
VERIFICATION: FOUNDER-GATE (re-enabling capture touches the logging contract and
  possibly the engine). Evidence PARTIAL (F3.3). Engine consumption of RPE/RIR
  and FREE/PRO classification NOT DETERMINED IN CODE — confirm before building.
```

---

```
ID: U-G-4
AREA: Feature gaps — readiness traffic-light gating daily volume
TITLE: A readiness (green/amber/red) signal from sleep + RPE + bodyweight trend
SUGGESTED TIER: 2 High
IMPACT (1-10): 7 — compare-12 WHERE WE LAG: "No readiness/recovery traffic-light
  gating daily volume from sleep + RPE + bodyweight trend (F2.2)"; NEWBIE VERDICT
  ties it to protecting a novice from doing too much (F1.1/F2.2). Both audiences.
EFFORT (1-10): 7 — a `ReadinessCards` component already renders in the
  Consistency "Recovery signals" section (ConsistencyScreen.js:107), and the
  inputs are already captured weekly (energy/motivation, stress, sleep hours,
  soreness — WeeklyCheckInScreen.js:685-726, 919-930) and daily (morning weight
  trend, WeeklyCheckInScreen.js:739-763; EWMA weight on BodyMetrics,
  BodyMetricsScreen.js:766-797). The scoring rule (deterministic) and any
  daily-volume *gating* is the engine + ED-safety risk.
CURRENT STATE: `ReadinessCards` exists on Consistency (ConsistencyScreen.js:107)
  — its internal content is NOT DETERMINED IN CODE (sub-component not read).
  Weekly check-in captures energy/stress/sleep/soreness/joint-pain
  (WeeklyCheckInScreen.js:685-726, 919-976); BodyMetrics has an EWMA weight trend
  (BodyMetricsScreen.js:766-797). No traffic-light readiness screen in the nav map
  (compare-12 WHERE WE LAG).
THE PROBLEM: NEWBIE — no daily "are you recovered enough?" guard. ATHLETE —
  cannot gate prescribed volume by recovery state.
THE EVIDENCE: compare-12 WHERE WE LAG F2.2 — VERIFIED/PARTIAL (Oura baseline
  held PARTIAL). Inputs VERIFIED present in Phase-1.
BEST REFERENCE IMPLEMENTATION: Whoop (green/amber/red recovery) + Oura
  (personal-baseline scoring, PARTIAL) gating daily strain/volume (compare-12
  BEST IN CLASS F2.2).
PROPOSED SOLUTION: A deterministic readiness score (green/amber/red) computed
  from already-captured inputs (sleep, soreness, energy/stress, bodyweight EWMA
  trend), surfaced in the existing `ReadinessCards` slot on Consistency, with the
  rule stated as the rationale. NO HRV/wearable dependency in v1 (Oura/Whoop
  inputs are PARTIAL and wearable integration is a separate Pro line —
  CLAUDE.md FREE vs PRO).
NEWBIE EXPERIENCE: A single plain card — "Recovery looks good / mixed / low" with
  a one-line why — no jargon, no required wearable.
ATHLETE EXPERIENCE: An amber/red day can suggest backing volume off (advisory,
  ties to U-G-1); pairs with FatigueTrendCard/ACWR already present.
IMPLEMENTATION BLUEPRINT:
  - Surface: populate the EXISTING `ReadinessCards` on ConsistencyScreen.js:107
    (no new route). Consistency is FREE (RootNavigator.js:349, phase1/09).
  - Inputs (all already captured): sleep hours (WeeklyCheckInScreen.js:715-726),
    soreness (WeeklyCheckInScreen.js:919-930), energy/stress
    (WeeklyCheckInScreen.js:685-711), morning-weight trend
    (WeeklyCheckInScreen.js:739-763), EWMA weight (BodyMetricsScreen.js:766-797).
  - Scoring rule: deterministic, no AI/randomness (CLAUDE.md SACRED). The rule is
    NOT DETERMINED IN CODE and is engine-adjacent — define under founder sign-off.
  - ED-safety: readiness can only ever advise REDUCING volume, never increasing
    it, and must defer to the ED-safety system (CLAUDE.md SAFETY). FOUNDER-GATE.
  - Gating: readiness is Precision-Coaching-adjacent → likely Pro (compare-12
    confirms readiness sits in the Pro coaching domain). Confirm against the
    FREE/PRO matrix; the inputs (BodyMetrics, WeeklyCheckIn) are already Pro
    (phase1/05, phase1/09 GATING), so the score likely should be too.
  - States: empty = "Check in this week to see your readiness"; loaded =
    coloured card + reason; error = hide. Edge: missing sleep input (optional,
    WeeklyCheckInScreen.js:715); too little data to score.
VERIFICATION: FOUNDER-GATE (deterministic scoring rule + ED-safety boundary +
  Pro gating). Evidence VERIFIED/PARTIAL (F2.2). `ReadinessCards` current
  content, the scoring rule, and FREE/PRO classification NOT DETERMINED IN CODE
  — confirm before building.
```

---

```
ID: U-G-5
AREA: Feature gaps — gentle, safe streak gamification
TITLE: A non-coercive consistency streak with a "streak freeze", and a consistency/PR partner leaderboard
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — compare-12 MISSING ENTIRELY: "Streak + streak-freeze
  gamification; closure-ring targets; consistency/PR partner leaderboard
  (Duolingo/Apple Fitness/Strava/Finch; F6.1/F6.4/F2.7/F6.3, mostly VERIFIED).
  No streak, ring, badge or leaderboard surface in the map." Retention driver;
  social-proof maps onto the existing Partner surface (WHERE WE LEAD).
EFFORT (1-10): 5 — consistency surfaces already exist: a `WeeklyStreakStrip` on
  the Progress landing (AnalyticsScreen.js:177-197) with milestone copy
  ("4 weeks of showing up.", :180-195) and a "Make a card" CTA at >=12 weeks;
  `StreakWeeksSection` on Consistency (ConsistencyScreen.js:46); a shared-streak
  chip + toggle on Partner (PartnerScreen.js:100-102, 201-208). A "streak
  freeze" and a leaderboard are net-new additions on these surfaces.
CURRENT STATE: WeeklyStreakStrip (AnalyticsScreen.js:177-197) and milestone row;
  StreakWeeksSection (ConsistencyScreen.js:46); Partner shared-streak chip
  (PartnerScreen.js:100-102) + "Share a consistency streak" toggle
  (PartnerScreen.js:201-208). Partner explicitly shares "Ticks only, like 3 of 4"
  and NEVER weights/sets/reps (PartnerScreen.js:34, 39-40). No streak-freeze, no
  closure ring, no leaderboard.
THE PROBLEM: NEWBIE — a missed week breaks the streak with no humane recovery,
  risking the exact "you missed a session, here's what to do" gap compare-12
  flags (NEWBIE VERDICT F7.5). ATHLETE — no social-proof leaderboard on the
  existing Partner surface.
THE EVIDENCE: compare-12 MISSING F6.1/F6.4/F2.7/F6.3 — "mostly VERIFIED"; Strava
  leagues decomposition source held PARTIAL (VERIFICATION). ED-safety caveat
  carried: "no coercive ratcheting, never streak-shame a deload" (compare-12
  MISSING caveat + research §5).
BEST REFERENCE IMPLEMENTATION: Finch (bird never dies) + Duolingo streak freeze
  (compare-12 BEST IN CLASS F6.1/F6.4); Strava kudos as the social-proof driver
  (WHERE WE LEAD, F6.2 VERIFIED academic).
PROPOSED SOLUTION: (a) A "streak freeze" so a planned light/recovery week or a
  single miss does NOT break the consistency streak — implemented on the existing
  WeeklyStreakStrip/StreakWeeksSection; (b) an optional consistency/PR leaderboard
  limited to the Partner surface's existing privacy model (ticks/PRs only, never
  weights). All gentle: the streak never shames, and a deload week must auto-apply
  a freeze (interacts with U-G-1).
NEWBIE EXPERIENCE: A missed week shows "Streak protected — life happens" rather
  than a reset, reusing the supportive milestone copy pattern
  (AnalyticsScreen.js:180-195).
ATHLETE EXPERIENCE: An opt-in consistency/PR leaderboard within an existing
  partnership (PartnerScreen.js), respecting the SEES/NEVER_SEES contract
  (PartnerScreen.js:33-45).
IMPLEMENTATION BLUEPRINT:
  - Streak-freeze surface: WeeklyStreakStrip (AnalyticsScreen.js:177-197) and
    StreakWeeksSection (ConsistencyScreen.js:46) — no new route. Progress is
    FREE (RootNavigator.js:342, phase1/09).
  - Leaderboard surface: extend PartnerScreen.js within its privacy model — it
    already shares a streak chip (PartnerScreen.js:100-102) and "ticks only"
    (PartnerScreen.js:34). It must NOT expose weights/sets/reps/body/food
    (PartnerScreen.js:39-45). Partner is FREE for 1 partner / Pro for up to 3
    (PartnerScreen.js:14,210-212).
  - ED-safety (FOUNDER-GATE): streak logic must never coercively ratchet and must
    never streak-shame a deload (compare-12 caveat). A deload/recovery week
    (U-G-1) must auto-freeze, not break, the streak. The streak-break rule is NOT
    DETERMINED IN CODE.
  - Closure-ring targets (F2.7): lower priority; not specified here (no existing
    ring surface in the nav map) — mark NOT DETERMINED and treat as a later add.
  - States: empty = no streak yet; loaded = streak + freeze count; error = hide.
    Edge: timezone/week-boundary for "a week"; a deload week; a paused account.
VERIFICATION: FOUNDER-GATE (ED-safety: no coercive ratcheting, no deload-shaming).
  Evidence mostly VERIFIED; Strava-leagues source PARTIAL. Streak-break rule and
  closure-ring surface NOT DETERMINED IN CODE — confirm before building.
```

---

```
ID: U-G-6
AREA: Feature gaps — injury / pain logging with auto-rotation
TITLE: Log a joint/tendon pain flag and rotate the plan around it
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — compare-12 MISSING ENTIRELY: "Injury / pain / joint logging
  with auto-rotation around it (F3.6 PARTIAL). Absent." ATHLETE VERDICT lists
  "injury/pain logging with auto-rotation (F3.6)". Mainly athlete; protective for
  beginners too.
EFFORT (1-10): 6 — the *capture* half already exists: the weekly check-in asks
  "Any joint or tendon pain? No / Yes" (WeeklyCheckInScreen.js:966-976) and
  per-muscle soreness with a muscle grid (WeeklyCheckInScreen.js:919-964). The
  missing half is the deterministic *auto-rotation* of exercises around a flagged
  joint — engine territory (substitution), and the exercise-swap UI already
  exists (ActiveWorkoutScreen.js:2112-2122 overflow → swap).
CURRENT STATE: Weekly check-in captures joint/tendon pain (Yes/No,
  WeeklyCheckInScreen.js:966-976) and muscle soreness with a 10-muscle grid
  (WeeklyCheckInScreen.js:933-964). Active Workout has a "Swap" affordance
  (ActiveWorkoutScreen.js:1454-1463 and overflow 2112-2122). No pain-driven
  auto-rotation; compare-12 confirms absent. Equipment-aware/deterministic
  substitution is held PARTIAL (compare-12 VERIFICATION F1.5).
THE PROBLEM: ATHLETE — must manually work around a niggle; no auto-rotation.
  NEWBIE — no protective rotation away from a painful movement.
THE EVIDENCE: compare-12 MISSING F3.6 — **PARTIAL**. Capture VERIFIED present in
  Phase-1 (WeeklyCheckInScreen.js:966-976).
BEST REFERENCE IMPLEMENTATION: compare-12 cites F3.6 as PARTIAL with no single
  named exemplar; substitution is the deterministic-substitution gap (F1.5,
  PARTIAL). Treat as evidence-thin.
PROPOSED SOLUTION: When a user flags joint/tendon pain (the existing check-in
  question, WeeklyCheckInScreen.js:966-976) or flags it inline, the deterministic
  engine offers a pain-aware substitution for affected movements via the existing
  swap surface — advisory, opt-in, no AI.
NEWBIE EXPERIENCE: "You flagged knee pain — want a knee-friendly swap for these?"
  with a one-tap accept reusing the existing swap flow.
ATHLETE EXPERIENCE: Pain flag persists and the plan rotates affected lifts until
  cleared, surfaced where swaps already live.
IMPLEMENTATION BLUEPRINT:
  - Capture: reuse the joint/tendon question (WeeklyCheckInScreen.js:966-976);
    optionally add an inline flag during logging (NOT DETERMINED — needs a new
    affordance on ActiveWorkout).
  - Rotation: deterministic substitution is engine work and is held PARTIAL
    (F1.5) — the substitution rule is NOT DETERMINED IN CODE. FOUNDER-GATE
    (engine + no-AI boundary).
  - Surface: the existing exercise swap (ActiveWorkoutScreen.js:1454-1463,
    overflow 2112-2122). Active Workout is FREE; WeeklyCheckIn is Pro
    (phase1/05 GATING). Confirm whether pain-aware rotation is Pro (Precision
    Coaching) before exposing on the FREE logging screen.
  - States: empty = no pain flagged; loaded = swap suggestion; error = hide. Edge:
    conflicting flags; cleared pain; an exercise with no safe substitute.
VERIFICATION: FOUNDER-GATE (engine substitution rule + no-AI boundary + gating).
  Evidence PARTIAL/evidence-thin (F3.6, F1.5). Substitution rule and any inline
  flag UI NOT DETERMINED IN CODE — confirm before building.
```

---

```
ID: U-G-7
AREA: Feature gaps — menstrual-cycle phase effect on lifts
TITLE: Phase-tagged strength trends (cycle-aware) for female users
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 5 — compare-12 MISSING ENTIRELY: "Menstrual-cycle phase effect on
  lifts / phase-tagged strength trends (Drop It, Lunaletics, Wild.AI; F3.8
  VERIFIED). Absent." Audience is female competitors specifically (ATHLETE
  VERDICT, "for female competitors").
EFFORT (1-10): 5 — a cycle question already exists in the weekly check-in
  ("Affecting the scale / Not this week", WeeklyCheckInScreen.js:769-785,
  shouldShowCycleQuestion), so the data hook is partly present; the new work is
  phase tagging on the Lifts strength trend (LiftProgressScreen sparklines,
  LiftProgressScreen.js:244-294).
CURRENT STATE: Weekly check-in has a cycle question gated by
  `shouldShowCycleQuestion` (WeeklyCheckInScreen.js:769-785). Lifts shows per-lift
  e1RM sparklines (LiftProgressScreen.js:244-294, 288). No phase tagging of
  strength trends; compare-12 confirms absent.
THE PROBLEM: ATHLETE (female) — cannot see strength variation by cycle phase.
  NEWBIE — low relevance; advanced.
THE EVIDENCE: compare-12 MISSING F3.8 — **VERIFIED**. Gate caveat carried:
  "Precision-Coaching-adjacent → likely Pro; confirm against FREE/PRO matrix
  before any build" (compare-12 MISSING note, research §5).
BEST REFERENCE IMPLEMENTATION: Drop It / Lunaletics / Wild.AI (cycle-synced)
  (compare-12 BEST IN CLASS / MISSING F3.8).
PROPOSED SOLUTION: Optionally tag the e1RM trend on the Lifts screen by cycle
  phase for users who track a cycle, so phase-related strength variation is
  legible. Descriptive only — no AI, no programme adjustment in v1.
NEWBIE EXPERIENCE: Hidden unless cycle tracking is on; no added complexity.
ATHLETE EXPERIENCE (female): Lift sparklines (LiftProgressScreen.js:288)
  optionally banded by phase.
IMPLEMENTATION BLUEPRINT:
  - Data: extend the existing cycle capture (WeeklyCheckInScreen.js:769-785). A
    phase model (vs the current binary "affecting the scale") is NOT DETERMINED
    IN CODE — confirm what cycle data is actually stored before building.
  - Surface: Lifts (LiftProgressScreen, FREE per phase1/09 GATING,
    RootNavigator.js:348) — sparkline rows (LiftProgressScreen.js:244-294).
  - Gating (FOUNDER-GATE): compare-12 explicitly says cycle-aware is
    Precision-Coaching-adjacent → likely Pro; the cycle question itself lives in
    the Pro WeeklyCheckIn (phase1/05). Confirm against the FREE/PRO matrix before
    any build (compare-12 MISSING note).
  - Privacy: cycle data is health data — EU Dublin residency, no PII to external
    services, local-first (CLAUDE.md ARCHITECTURE; Article 9 consent flow exists,
    RootNavigator.js:1134-1136).
  - States: empty = cycle tracking off (feature hidden); loaded = banded trend;
    error = fall back to un-banded. Edge: irregular/absent cycle data.
VERIFICATION: FOUNDER-GATE (Pro classification + Article 9 health data + no-AI
  boundary). Evidence VERIFIED (F3.8). Stored cycle data model and FREE/PRO
  classification NOT DETERMINED IN CODE — confirm before building.
```

---

```
ID: U-G-8
AREA: Feature gaps — audio coaching during the set
TITLE: Optional audio cues during a working set
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 5 — compare-12 MISSING ENTIRELY: "Audio coaching during the set
  (Freeletics/Aaptiv/Peloton; F7.2 VERIFIED). No audio-cue surface." NEWBIE
  VERDICT lists "no audio coaching during the set (F7.2)". Mainly beginner-facing.
EFFORT (1-10): 4 — an audio primitive already exists: the RestTimer "escalates
  haptics + audio 3-2-1" (RestTimer.js:90-110, phase1/01 CURRENT STRENGTHS), so
  audio playback during a session is already wired; extending it to set cues is
  incremental, not net-new infrastructure.
CURRENT STATE: RestTimer plays an escalating audio 3-2-1 countdown
  (RestTimer.js:90-110). No coaching audio during the working set itself;
  compare-12 confirms no audio-cue surface.
THE PROBLEM: NEWBIE — no eyes-free guidance during a set (form/pace prompts).
  ATHLETE — lower relevance.
THE EVIDENCE: compare-12 MISSING F7.2 — **VERIFIED**.
BEST REFERENCE IMPLEMENTATION: Freeletics / Aaptiv / Peloton audio coaching
  (compare-12 BEST IN CLASS / MISSING F7.2).
PROPOSED SOLUTION: Optional, pre-recorded/deterministic audio cues (e.g. tempo
  count, "last rep", rest start) during a working set, reusing the RestTimer
  audio pipeline. NO generated/AI speech — fixed clips or deterministic
  tone/haptic cues only (no-AI boundary).
NEWBIE EXPERIENCE: Toggle on; hears simple cues so they needn't watch the screen
  mid-effort (complements the wet-hands failure points in phase1/01).
ATHLETE EXPERIENCE: Optional tempo cues for tempo work; off by default.
IMPLEMENTATION BLUEPRINT:
  - Pipeline: extend the existing RestTimer audio (RestTimer.js:90-110) to the
    set phase on ActiveWorkout (RootNavigator.js:295). Active Workout is FREE
    (phase1/01 GATING).
  - Setting: a toggle under Settings → Display & accessibility
    (SettingsDisplayScreen, RootNavigator.js:378) or Coaching
    (SettingsCoachingScreen, RootNavigator.js:376) — exact home NOT DETERMINED.
  - Content: fixed audio assets, no AI/TTS generation (no-AI boundary). The set
    of cues and their triggers is NOT DETERMINED IN CODE.
  - Gating: likely FREE (logging is FREE); confirm against the FREE/PRO matrix.
  - States: off (default), on; error = silent fallback. Edge: silent mode / OS
    volume; headphones; cue overlap with the rest-timer countdown.
VERIFICATION: Evidence VERIFIED (F7.2). No-AI boundary respected (fixed clips).
  Cue set, settings home, and FREE/PRO classification NOT DETERMINED IN CODE —
  confirm before building.
```

---

```
ID: U-G-9
AREA: Feature gaps — bar velocity (VBT) and tempo tracking
TITLE: Bar-speed / velocity and tempo capture
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 4 — compare-12 MISSING ENTIRELY: "Bar speed / velocity (VBT) and
  tempo tracking (Metric; F3.5 VERIFIED). Absent." Niche athlete feature;
  compare-12 treats Metric as "a gap-confirming existence proof" (BEST IN CLASS
  F3.5), i.e. a hardware-class capability.
EFFORT (1-10): 8 — VBT typically needs device sensors/hardware; there is no
  capture surface and no plate-maths helper even exists in render (the `plateBtn`
  style is defined but unused, SetEntry.js:173, phase1/01 ATHLETE QUESTION).
  This is the heaviest, most uncertain item in the cluster.
CURRENT STATE: No velocity/tempo capture anywhere; compare-12 confirms absent.
  An unused `plateBtn` style hints plate-maths was scoped but not built
  (SetEntry.js:173). Per-set logging is weight/reps only (SetEntry.js:42-133).
THE PROBLEM: ATHLETE — no VBT/tempo for velocity-based training. NEWBIE — not
  relevant.
THE EVIDENCE: compare-12 MISSING F3.5 — VERIFIED as a "gap-confirming existence
  proof" (i.e. the gap is real; the implementation class is hardware).
BEST REFERENCE IMPLEMENTATION: Metric — auto-measures bar speed/ROM/path →
  estimated 1RM (compare-12 BEST IN CLASS F3.5, https://metric.coach/).
PROPOSED SOLUTION: Defer hardware VBT; v1 could at most add manual tempo
  capture (e.g. a tempo field per exercise) without sensors. Full VBT is a
  hardware/native-sensor capability that conflicts with the
  managed-workflow/no-eject constraint unless via an Expo config plugin.
NEWBIE EXPERIENCE: None (hidden / not applicable).
ATHLETE EXPERIENCE: At most a manual tempo notation per set; true bar-velocity
  is out of scope without hardware.
IMPLEMENTATION BLUEPRINT:
  - Capture: a tempo field would extend SetEntry (SetEntry.js:42-133) — NOT
    DETERMINED whether a tempo field exists; none seen.
  - VBT proper: requires native sensor access (camera/accelerometer) → Expo
    config plugin, no eject (CLAUDE.md ARCHITECTURE), and likely a new dependency
    (founder yes required). Strongly evidence-thin / scope-heavy — recommend
    parking pending a dedicated decision.
  - Gating: NOT DETERMINED.
VERIFICATION: Evidence VERIFIED that the GAP exists (F3.5) but the
  implementation is hardware-class and EFFORT is high; mark **evidence-thin for
  a buildable v1**. Tempo field, VBT pipeline, dependency, and gating all NOT
  DETERMINED IN CODE — confirm/scope before building.
```

---

```
ID: U-G-10
AREA: Feature gaps — mood ↔ activity correlation
TITLE: A Daylio-style mood/activity correlation output with a confidence label
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 5 — compare-12 MISSING ENTIRELY: "Daylio-style mood↔activity
  correlation engine with a confidence label (F2.4 VERIFIED). WellbeingCheck
  (:399) captures wellbeing but the map shows no correlation-output surface —
  correlation engine NOT DETERMINED present (treat as missing pending Phase-1
  per-screen brief)." Cross-category insight; modest pull.
EFFORT (1-10): 5 — wellbeing capture exists (WellbeingCheck SCOFF screen,
  WellbeingCheckScreen.js; energy/stress/sleep in WeeklyCheckIn,
  WeeklyCheckInScreen.js:685-726) and an "insight" surface exists on the Progress
  landing (InsightRow stack, AnalyticsScreen.js:235-242, 398-415). The new work
  is the deterministic correlation output + a confidence label.
CURRENT STATE: WellbeingCheck captures a SCOFF self-screen (private, device-only,
  WellbeingCheckScreen.js:76-120); WeeklyCheckIn captures energy/stress/sleep
  (WeeklyCheckInScreen.js:685-726). The Progress landing renders an InsightRow
  stack with severity icons + copy (AnalyticsScreen.js:235-242, 398-415). NO
  correlation-output surface — compare-12 explicitly treats it as missing /
  NOT DETERMINED.
THE PROBLEM: NEWBIE/ATHLETE — captured wellbeing data is never turned into a
  "training seems to lift your mood (medium confidence)"-style insight.
THE EVIDENCE: compare-12 MISSING F2.4 — **VERIFIED** (the correlation feature
  exists in Daylio); the *Volyume* correlation engine is **NOT DETERMINED**
  present (compare-12 nav-map caveat + VERIFICATION).
BEST REFERENCE IMPLEMENTATION: Daylio mood↔activity correlation with a
  confidence label (compare-12 BEST IN CLASS / MISSING F2.4).
PROPOSED SOLUTION: A deterministic correlation between logged training/activity
  and captured wellbeing (energy/mood/sleep), surfaced as an InsightRow on the
  Progress landing with an explicit confidence label and the rule as rationale.
  No AI — a transparent statistical readout, never a claim beyond the data.
NEWBIE EXPERIENCE: A plain insight card ("Weeks you trained 3+ times, your energy
  was higher — low confidence so far") that grows in confidence with data.
ATHLETE EXPERIENCE: Same surface; useful for spotting wellbeing/volume links.
IMPLEMENTATION BLUEPRINT:
  - Surface: the existing InsightRow stack on AnalyticsScreen.js:235-242 (render
    398-415) — no new route. Progress landing is FREE (RootNavigator.js:342).
  - Inputs: WellbeingCheck (WellbeingCheckScreen.js) is device-only and private
    (WellbeingCheckScreen.js:118-120) — do NOT surface SCOFF answers; use only
    non-clinical wellbeing (energy/mood/sleep from WeeklyCheckInScreen.js:
    685-726) for any visible correlation. Whether a correlation engine already
    exists is NOT DETERMINED IN CODE (compare-12 caveat).
  - Confidence: a deterministic confidence label is required (compare-12 F2.4) —
    the statistic + threshold rule is NOT DETERMINED IN CODE.
  - Gating: WeeklyCheckIn inputs are Pro (phase1/05); the Progress landing
    self-hides Pro sections by tier (AnalyticsScreen.js:76). Confirm FREE/PRO
    classification for the correlation output.
  - No-AI: deterministic statistics only; never an LLM-generated narrative.
  - States: empty = "Not enough data yet"; loaded = insight + confidence; error =
    hide. Edge: spurious correlation on tiny n (the confidence label must guard
    against this); never imply causation.
VERIFICATION: Evidence VERIFIED for the market feature (F2.4); Volyume presence
  NOT DETERMINED (compare-12 nav-map caveat) → **evidence-thin** on absence.
  No-AI boundary respected. Correlation engine presence, confidence rule, and
  FREE/PRO classification NOT DETERMINED IN CODE — confirm before building.
```

---

## Cluster summary

10 proposals (U-G-1 … U-G-10), traced to the compare-12 "MISSING ENTIRELY",
"WHERE WE LAG" and "USER SENTIMENT/WHERE WE LEAD" findings, with implementation
detail cited to Phase-1 fragments 01/05/08/09/14.

FOUNDER-GATE (engine / ED-safety / gating boundary, input only): U-G-1, U-G-3,
U-G-4, U-G-5, U-G-6, U-G-7. Evidence-thin: U-G-2 (self-attach PARTIAL, F3.7),
U-G-6 (F3.6/F1.5 PARTIAL), U-G-9 (hardware-class, buildable v1 thin),
U-G-10 (Volyume presence NOT DETERMINED, F2.4).

Recurring NOT-DETERMINED-IN-CODE facts to confirm before building: the
deload/fatigue trigger rule (U-G-1); ExerciseDetail media rendering + storage
path + Expo media plugin (U-G-2); engine consumption of re-enabled RPE/RIR
(U-G-3); the `ReadinessCards` content + readiness scoring rule (U-G-4); the
streak-break rule + closure-ring surface (U-G-5); the deterministic
substitution rule + any inline pain-flag UI (U-G-6); the stored cycle-data
model (U-G-7); the audio-cue set + settings home (U-G-8); a tempo field / VBT
pipeline + dependency (U-G-9); the correlation-engine presence + confidence
rule (U-G-10). Plus the FREE/PRO classification on nearly every proposal.
