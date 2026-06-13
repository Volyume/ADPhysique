# Phase 3 comparison — Check-in, weekly review & coach communication (2026-06-13)

Sources reconciled:
- VOLYUME CURRENT — `docs/ultimate-audit-2026-06-13/phase1/05-checkin-safety.md` (WeeklyCheckIn, WellbeingCheck, BlockReflection, GoalLockConsent, GoalChangeSummary) + `phase1/04-coaching.md` (CoachOutput, CoachReview, CoachHeldHistory, Methodology, CoachingReminders, SettingsCoaching).
- MARKET — `docs/ultimate-audit-2026-06-13/phase2/research-14-checkin.md`.

---

```
AREA: Check-in, weekly review & coach communication

VOLYUME CURRENT:
  - Weekly check-in: a four-step wizard (feeling/energy/stress/sleep → this-week's
    data → recovery & issues → training performance) PLUS a condensed "fast" card
    when fastEligible, which auto-reads training, nutrition, steps, cardio and weight
    and reduces most weeks to confirming two ratings (WeeklyCheckInScreen.js:219, fast
    card :1071, auto-derivation :1114–1123). Gate states fail closed on load error
    (:520–527, load_error state) and enforce data minima before opening
    (FIRST_CHECKIN_MIN_DAYS, MIN_WEIGH_INS; too_soon/need_weights :1217–1258). Pro,
    via withProGuard (RootNavigator.js:149).
  - Coach output (Pro): the deterministic weekly Precision Coaching engine renders a
    week headline, coach lead acknowledgement+interpretation, week-over-week trend
    chips, "what's working"/"what was off", confirm-then-apply training & nutrition
    adjustments (every suggestion has an explicit Apply button + "Applied" chip, never
    auto-written), a "Why this week" block, a focus cue, safety blocks (rapid-loss,
    diet-break, ED held-decisions) and a methodology link (CoachOutputScreen.js:1208,
    cards :1561–1809; confirm-then-apply 1341–1345; load-error vs insufficient-data
    split 1448–1463). Up to ~14 cards can stack in one scroll (weakness, 04:48).
  - Coach review (Free): training-only weekly review, fully local/offline; per-muscle
    volume status, progression wins, deload/lagging signals, up to three plain-English
    recommendations; no nutrition, no Pro engine (CoachReviewScreen.js:95, recs 87–164;
    free, no guard 04:106).
  - Transparency surfaces: CoachHeldHistory (every decision/hold + why, plus EngineLog,
    04:139), Methodology (offline accordion explaining the engine, copy tied to engine
    source lines, 04:181), GoalChangeSummary (diff of what changed with a plain-language
    reason per change, GoalChangeSummaryScreen.js:126).
  - Coaching tone register exists: SettingsCoaching exposes Automatic / Supportive /
    Precise tone chips + a "show the science" toggle (Pro) (SettingsCoachingScreen.js
    tone block, 04:277, science toggle 217–232).
  - ED self-screen: WellbeingCheck (SCOFF-style five-question screener, score>=2 shows
    supportive GP/dietitian signposting; device-only, WellbeingCheckScreen.js:22,46).
  - Reminders: CoachingReminders schedules morning-weight + weekly-check-in prompts
    (toggles deliberately removed so the loop can't be broken) plus an optional
    missed-check-in follow-up (CoachingRemindersScreen, 04:222).
  - Block-end recap: BlockReflection (mesocycle summary: stats, narrative, PRs, best
    session, "start next block", BlockReflectionScreen.js:77).

BEST IN CLASS:
  - MacroFactor — conditional, explained check-in: surfaces only the modules this
    week's data triggers, introduces and explains WHY each appeared, then recommends a
    calorie/macro change based on what the user actually did (not the prescription),
    and is openly transparent about its own algorithm's limits to build trust.
    https://help.macrofactorapp.com/en/articles/247-introduction-to-check-ins-and-coaching-modules (VERIFIED)
  - Carbon Diet Coach — minimum-friction check-in: exactly three questions, adherence-
    gated, non-blaming language ("stick closer next week"; moves calories up "to align
    with what's working for you").
    https://help.joincarbon.com/en/articles/6004812-weekly-check-in (VERIFIED)
  - Spotify Wrapped — data-made-personal benchmark: narrative framing + one or two hero
    numbers + low cognitive load + felt ownership (SDT "feel seen", peak/nostalgia,
    playful stats).
    https://medium.com/design-bootcamp/why-were-hooked-on-spotify-wrapped-the-perfect-blend-of-ux-and-psychology-b4aa06c9b81f (VERIFIED)
  - JuggernautAI / RP Hypertrophy — athlete-native decision comms: decisions delivered
    AS the prescription change in the athlete's own units (RPE, %1RM, sets, soreness/
    joint/workload feedback).
    https://www.juggernautai.app/ ; https://hypertrophy.zendesk.com/hc/en-us/articles/14605661323671 (VERIFIED)
  - Caliber / Future — human accountability: weekly asynchronous video check-ins
    repeatedly named the favourite feature; "addressed to you by someone" raises
    perceived value sharply.
    https://www.garagegymreviews.com/caliber-app-review ; https://onbetterliving.com/future-app/ (VERIFIED)

TOP 50 RANGE:
  - Top end (VERIFIED): conditional, explained, adherence-honest, short check-ins
    (MacroFactor, Carbon); athlete-native autoregulation in the user's own units
    (JuggernautAI, RP Hypertrophy/RP Diet); human/async-video accountability (Caliber,
    Future, Ladder); polished week-over-week summaries (WHOOP Weekly Performance
    Assessment every Monday with 5+ days data; Strava Recap; Oura's three scores + trends;
    MyFitnessPal Weekly Digest).
  - Middle: rigid or one-tone systems that alienate part of the audience — RP Diet Coach
    "won't work for those who only give 50% effort because it'll feel like the app is
    punishing you" (PARTIAL/VERIFIED); RP Hypertrophy/JuggernautAI "not beginner-friendly"
    / "not for casual gymgoers" (VERIFIED). Fitbod gives per-muscle recovery 0–100% but
    suggestions can read as repetitive (VERIFIED).
  - Bottom end (PARTIAL): loggers and pre-set programs with no real weekly review/check-in
    surfaced — Hevy (logger not coach), BoostCamp, Centr, Freeletics, Cronometer ("Diet
    Coach AI" only a feature request, not shipped). All PARTIAL.

NEWBIE VERDICT:
  - Strong on the spine but heavy on the full path. The fast card (two-tap confirm,
    :1071) matches the market floor (Carbon's three fields, F1.1 VERIFIED) and the free
    CoachReview softens language ("more sets than you can comfortably recover from",
    04:117). But the full wizard introduces "working sets", "training volume up X%",
    deload-adjacent and "prescribed cardio" framing (Phase-1 NEWBIE note 05:130–133), and
    CoachOutput stacks up to ~14 cards with multiple equal-weight Apply buttons, which a
    first-timer is "likely to overwhelm" (04:52). Market evidence says this costs churn:
    every extra field is paid in churn (F1.4 VERIFIED, 71% abandon by month 3) and a
    review should be 1–2 numbers + one action (F2.2 VERIFIED).

ATHLETE VERDICT:
  - Well served on substance. The check-in captures energy/stress/sleep, soreness by
    muscle, joint/tendon pain, cycle, calorie/step/cardio adherence and a training verdict
    derived from real sessions/PRs/volume (05:134–137); CoachOutput gives weekly volume
    signal, deload, MATADOR-cited diet break, carb cycling, refeed, steps+cardio and
    explicit "why" with confirm-then-apply respecting autonomy (04:53). This aligns with
    the athlete-native pattern (F3.3 VERIFIED). Gap noted in Phase-1: per-muscle set
    targets are summarised rather than shown per-muscle on the coach screen (04:53).

WHERE WE LEAD:
  - Confirm-then-apply transparency: every engine suggestion is an explicit, reversible
    suggestion, never auto-written (CoachOutputScreen.js:1341–1345). Matches and arguably
    exceeds the market trust pattern of being transparent about the decision (F3.5
    VERIFIED — MacroFactor publishes its "secret recipe").
  - Decision audit trail: CoachHeldHistory logs every change AND every hold with reasons
    (04:139), and Methodology explains the engine offline with copy tied to engine source
    lines (04:181). This is the "be transparent about how the decision was reached"
    advantage both audiences reward (F3.5 VERIFIED).
  - Narrate-then-number is already present: GoalChangeSummary shows prev→next plus a
    plain-language reason per change (GoalChangeSummaryScreen.js:126), and the coach lead
    gives acknowledgement+interpretation before adjustments — the pattern non-experts
    respond to (F3.1, F3.2 VERIFIED).
  - Adherence-honest by design: the engine reads what the user actually logged
    (auto-derived nutrition/steps/cardio/training in the check-in, :1114–1123), aligning
    with the non-blaming, "what you actually did" pattern (F1.3, F5.3 VERIFIED).
  - Offline-first free review: CoachReview computes entirely locally (04:108), which the
    market does not emphasise.
  - Tone register already exists (Automatic/Supportive/Precise + "show the science",
    04:277), the foundation for the dual-audience translation layer the research argues
    for (F3.3/F3.4 VERIFIED; INTERPRETATION in §5).

WHERE WE LAG:
  - Length / single-focus: the full wizard and the ~14-card CoachOutput run against the
    market's clearest converging signal — 1–2 numbers + one action, "if everything is a
    priority, nothing is" (F2.2 VERIFIED). Phase-1 itself flags very high information
    density and no single emphasised primary action (04:48–49, 05:128).
  - Conditional surfacing: MacroFactor shows a module ONLY if triggered (F2.1 VERIFIED/
    PARTIAL); Volyume's wizard step 1 can still stack weight/cycle/nutrition/steps/cardio
    into a long scroll (05:128), and CoachOutput renders many cards at once rather than
    only the triggered ones.
  - "Story" / personal framing: the top-of-CoachOutput restates week status three ways
    (headline, lead, trend chips) before any decision (04:50) rather than a single hero-
    number narrative; the research holds Spotify Wrapped's narrative + hero-number model
    as the benchmark for feeling personal (F5.1 VERIFIED).
  - Athlete-native units: the engine summarises rather than showing per-muscle set
    targets / RPE-style detail on the coach screen (04:53) where athlete-native apps speak
    fully in the user's units (F3.3 VERIFIED).

MISSING ENTIRELY:
  - Human or human-feeling accountability addressed to the user (Caliber/Future async
    video/text, F4.3 VERIFIED). Volyume's engine is deterministic/no-AI by rule, so this
    can only ever come from copy/personalisation, not a coach — a structural constraint,
    not a bug (research §5 item 8).
  - Progress photos / photo-cadence handling: no photo check-in surfaced in Phase-1; the
    market treats weekly photos as contest-prep-only and phase-aware to avoid "photo
    fatigue" (F1.2 VERIFIED). Volyume has no photo flow to make phase-aware.
  - An explicit "athlete mode" toggle that switches the decision presentation into native
    units; the tone register exists but is a copy/tone lever, not a units/prescription
    presentation switch (INTERPRETATION in research §5 — labelled, not a finding).

USER SENTIMENT (what users want that no app fully provides — from the fragment):
  - A weekly review that earns the first glance: even valued summaries get "quickly
    scanned" ("I usually just quickly scan this but don't really find it useful." — WHOOP,
    F2.3 PARTIAL, single reviewer).
  - Decisions that feel like collaboration with their own data, not a verdict ("By knowing
    that the app will auto adjust my calories and macros during check in is motivating and
    helpful." — MacroFactor, F5.2 VERIFIED; partner to F6.1/F6.2 that ~1/3 of feedback
    interventions backfire when attention shifts to the self — VERIFIED).
  - Comparative week-over-week framing is explicitly demanded (F4.2 VERIFIED).
  - Forgiveness for an imperfect week without feeling punished (F1.3 VERIFIED).
  - SAFETY-CRITICAL sentiment: high-frequency self-monitoring is net-safe for most but
    carries an anxiety/disordered-eating tail for vulnerable users; cadence should be
    tunable/capped and review framing task-focused not body-judgemental (F6.4 VERIFIED).
    Directly supports the existing `src/coaching/safety/` system — RESEARCH INPUT ONLY,
    no recommendation to alter floors or signposting (per CLAUDE.md do-not-touch).

VERIFICATION STATUS:
  - The lead market claims this block leans on are VERIFIED: MacroFactor conditional/
    explained/transparent (F1.3, F2.1, F3.1, F3.5, F5.2), Carbon three-question adherence-
    gated (F1.1, F3.2), 1–2-numbers single-action review (F2.2, F4.4), comparative framing
    (F4.2), athlete-native comms (F3.3, F3.4), Spotify-Wrapped personalisation (F5.1),
    feedback-backfire / task-focus (F6.1, F6.2), abandonment economics (F1.4), and the
    safety-critical over-tracking tail (F6.4).
  - PARTIAL / NOT-FOUND items relied on:
    * "TOP 50 RANGE" bottom end (Hevy, BoostCamp, Centr, Freeletics, Cronometer) is built
      on PARTIAL entries (no weekly-review feature found / not shipped).
    * "USER SENTIMENT" first-glance point rests on F2.3 (PARTIAL — single WHOOP reviewer).
    * RP "punishing" quote is VERIFIED-app / PARTIAL-source (noobgains page 404, sourced
      via corroborating snippet, F1.3).
    * F2.1 conditional-module timing: app behaviour VERIFIED, but the NUMERIC "too long"
      time limit is NOT FOUND in the research (no app/study publishes one); the "length"
      argument in WHERE WE LAG therefore rests on the productivity-science 1–2-number
      principle (F2.2 VERIFIED) plus this NOT-FOUND time threshold, not on a published
      number.
    * F5.3 (decision based on what the user did) is PARTIAL on the review source but
      consistent with MacroFactor's VERIFIED first-party philosophy.
    * The "one engine + two presentation layers / athlete mode" framing under MISSING
      ENTIRELY is INTERPRETATION (research §5), explicitly labelled in the fragment as an
      inference, not a finding — carried as such, not upgraded.
```
