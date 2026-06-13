AREA: Progress tracking & visualisation

VOLYUME CURRENT: A Progress tab built as a hub-and-spoke set of dedicated
  analytics screens. The landing (AnalyticsScreen) answers "am I on track?" at a
  glance — a "This week" consistency strip with milestone rows, a "For you"
  insight stack, a Pro-only weight-trend card, recent sessions, a one-line volume
  summary, a PR sparkline, and a 7-tile "Explore" grid routing to the deeper
  screens (09-progress-analytics.md:21-39). The deeper screens are:
  - Consistency — streak weeks, deload banner, training-block cards (mesocycle
    pulse, fatigue, block progress), recovery/readiness, training load (ACWR),
    session-length trend, muscle-frequency table, and a 12-week training calendar
    (09:65-96).
  - Lifts (LiftProgress) — overall strength standing, relative-strength-per-lift
    with Beginner→Elite level badges, and a per-lift list with estimated-1RM
    "est. max", "+N%" deltas and a per-row Sparkline; long-press to share a PR
    (09:100-134).
  - Volume (VolumeHeatmap) — anatomical body heatmap tied to per-muscle weekly
    working-set bars against MEV/MAV/MRV landmarks, a week-over-week "ghost" fill,
    last-trained recency chips, a volume-trend section, and editable custom
    targets (09:138-173).
  - Body Metrics — PRO-gated, opt-in, calm-mode re-confirmed. Logs weight / body
    fat / 9 measurements; smoothed WeightTrendChart with window chips, an EWMA
    "Weight trend" card, an adaptive-TDEE "Estimated daily burn" card with
    confidence tiers, body-fat trend, measurement grid + trend, and 12-row
    history (09:178-223).
  - Year of Lifts / Recaps (YearOfLiftsScreen) — a full-screen Spotify-Wrapped-
    style swipeable story in three variants (year / month / block); factual
    training stats only, neutral framing under calm/ED flags, shareable
    (09:260-298).
  - Snapshots — a data-safety restore utility, not a training surface (09:228-255).
  Notably: charts are FREE (Lifts, Volume, Consistency all register with no
  withProGuard — 09:113,153,80); only Body Metrics and the landing's weight-trend
  + cardio cards are Pro (09:196,38). A weight-trend smoother (EWMA + robust
  smoother) and adaptive TDEE already exist, behind the Pro Body Metrics gate
  (09:186-188,197).

BEST IN CLASS:
  - Strength-trend visualisation: Hevy — clear FREE per-exercise graphs, volume
    trends, 1RM estimates, live PR notifications and a Year-in-Review recap; the
    long upward strength line is the single most-cited motivator and "the thing
    that had kept me in the gym this year." https://www.hevyapp.com/features/gym-progress/ ,
    https://www.hevyapp.com/features/live-pr/ — VERIFIED.
  - Weight trend / anti-noise: MacroFactor (smoothing + adaptive TDEE that re-
    derives expenditure and adjusts targets when the trend stalls) and Happy Scale
    (smoothing + forecast "to keep your spirits up… on a smooth curve").
    https://macrofactor.com/expenditure-v3/ , https://happyscale.com/ — VERIFIED.
  - Supportive-without-patronising design: Gentler Streak — rest days don't break
    the streak; nudges toward recovery; sick/injured/off statuses; Apple Watch App
    of the Year 2022. https://developer.apple.com/news/?id=3m0ht22s — VERIFIED.
  - Celebration recap: Strava Year in Sport / Hevy Year in Review — Spotify-Wrapped
    for fitness; but ship to ALL users (Strava's 2025 $80 paywall "roiled" users).
    https://www.hevyapp.com/features/year-in-review/ — VERIFIED.
  - Per-exercise history depth: Setgraph — complete movement history regardless of
    routine ("every time you train an exercise, you see your complete history").
    https://setgraph.app/ai-blog/best-app-to-log-workout-tested-by-lifters — VERIFIED.

TOP 50 RANGE: 55 apps recorded, 25 VERIFIED with substantive detail, 30 PARTIAL
  (research-06-progress.md:75-77). The spectrum runs from full-suite trackers
  (Hevy, Strong, JEFIT, Fitbod) through trend-weight specialists (MacroFactor,
  Happy Scale, Libra), wearable readiness platforms (WHOOP, Garmin, Oura, Apple
  Fitness, Fitbit), celebration/gamification apps (PR Workout Tracker with XP
  Beginner→Legend, RepCount auto-confetti, FitPros recap cards, Duolingo as the
  cross-domain streak exemplar), self-compassion design (Gentler Streak), down to
  a long tail of single-purpose App Store body-measurement and progress-photo
  trackers (#38–55, mostly PARTIAL) (research-06:17-77). Quality divides on three
  axes: whether trend charts are free or paywalled (6.3), whether weight is shown
  smoothed or raw (2.3), and whether celebration mechanics respect rest or punish
  it (5.4).

NEWBIE VERDICT: Mixed. Volyume's safety-aware self-hiding helps — Pro sections
  hide rather than tease, the landing shows an explicit "No data yet" empty state,
  and heavy Consistency cards stay hidden until there is data (09:39,81). But the
  jargon density works against beginners: "This week's volume", "below target /
  over max", "est. max", MEV/MAV/MRV, ACWR, EWMA and "adaptive TDEE" all assume a
  training literacy a first-timer lacks (09:41,83,116,156,199). This collides with
  the research: the empty state is the primary newbie churn point and best practice
  is sub-30-second first value, not a blank jargon canvas (3.1 VERIFIED); first-week
  activation is decisive (3.2 VERIFIED); near-empty charts must be encouragement-
  framed (3.3 VERIFIED). The YearOfLifts story is the one screen rated fully legible
  for a first-timer (09:282) — but it is data-gated until 10 sessions / 365 days
  (09:279).

ATHLETE VERDICT: Strong. Per-muscle volume against RP-style MEV/MAV/MRV landmarks
  with editable targets, e1RM trends, relative-strength ratios, ACWR/fatigue/block
  periodisation, st/lbs/kg support, 9-site measurements, smoothed trends and a
  reverse-engineered TDEE are exactly what a competitor tracks (09:157,200,84,117).
  This maps to the research's athlete profile: the long strength curve is the
  reason experienced users stay (2.1 VERIFIED); they want explicit smoothing they
  can read (1.1, 2.3 VERIFIED); and slice-by-exercise/period depth is required
  (3.3 VERIFIED). The gap for athletes is cold-start data portability — fast
  history import/backfill so the long graph appears at once — which the research
  flags as their distinct friction (3.1, 3.2 VERIFIED) and which the Phase-1
  inventory does not mention anywhere.

WHERE WE LEAD:
  - Charts are FREE. Lifts, Volume and Consistency register with no Pro guard
    (09:113,153,80). This directly beats Strong, which paywalls "any of the
    progress charts over time," and matches Hevy's praised free charts — users
    "expect to see their own data" (6.3 VERIFIED).
  - Recap shipped without a hard paywall. YearOfLifts/Recaps register as free
    routes, data-gated upstream, not Pro-gated (09:279). This is exactly the
    pattern the research endorses after Strava's paywall backfired (4.3, 6.3
    VERIFIED).
  - Smoothed trend weight already implemented (EWMA + robust smoother, neutral
    non-valenced delta badges, rate-of-change suppression under ED flag —
    09:186-188,197). This is the single least-patronising plateau tool and the
    safe way to show daily weight (2.3, 5.1, 7.3 VERIFIED) — the MacroFactor/Happy
    Scale best-in-class behaviour.
  - Adaptive TDEE that responds to the trend already exists (09:188) — the
    MacroFactor "plateau triggers an action, not a platitude" behaviour (5.1
    VERIFIED).
  - Self-compassionate, ED-aware framing is built in: calm-mode re-confirmation,
    neutral deltas, deload banners, factual-only share payloads, neutral recap
    framing under calm/ED flags (09:196-197,72,280). This aligns with the proven
    Gentler-Streak model and directly answers the research's safety-adjacent
    caution about goal-gradient/loss-aversion compulsion (5.4, 7.2 VERIFIED;
    7.2's ED-study figures are PARTIAL).
  - Combined gym + volume + body-composition + recap on one progress surface —
    the unmet "one place not three apps" want (6.2 VERIFIED).

WHERE WE LAG:
  - No live mid-session PR celebration / confetti. The research calls live PR
    detection + confetti "now table stakes" (Hevy live PR, RepCount auto-confetti,
    FitPros recap cards — 4.2 VERIFIED). Volyume surfaces PRs statically (a "PR"
    tag and a landing PR sparkline, 09:35,110) and shares a PR via long-press, but
    there is no in-the-moment celebration moment in the inventory.
  - Jargon-heavy newbie experience vs the research's sub-30s-first-value and
    encouragement-framed-empty-chart standard (3.1, 3.3 VERIFIED). The landing is
    "tends cluttered when all optional sections render together" (09:57) against
    the explicit finding that a cluttered dashboard is a top complaint (6.1
    VERIFIED).
  - The motivating smoothed weight curve sits behind the Pro Body Metrics gate
    (09:196) while the research frames the smoothed trend as the difference between
    a newbie quitting and continuing (2.3 VERIFIED) — a tension with the free-chart
    advantage above (note: this is a gating-policy observation, not a recommendation;
    weight tracking is a Pro feature under the product's own free/Pro split).
  - No fast history import/backfill for experienced users — the cold-start the
    research names as the athlete's churn risk (3.1, 3.2 VERIFIED); absent from the
    Phase-1 inventory.

MISSING ENTIRELY:
  - Progress photos. No progress-photo capability appears anywhere in the Phase-1
    progress inventory. The research rates photos as beating the scale for
    emotional reinforcement, the most legible early newbie win, and the
    recomp/contest-prep truth when scale weight is flat (2.2, 5.2 VERIFIED), and
    a body-composition study found visual-progress trackers stayed more consistent
    than weight-only trackers (2.2 VERIFIED). This is the single largest absent
    feature for this area.
  - Live PR confetti / animated achievement moment (4.2 VERIFIED) — see WHERE WE LAG.
  - XP / level-up progression systems (PR Workout Tracker Beginner→Legend, 4.2
    VERIFIED). Volyume has strength-standing LEVEL BADGES (Beginner→Elite,
    09:107) but these describe relative strength, not a gamified XP economy — and
    the research's own safety caution (7.2) argues against importing the
    compulsion-driving version.
  - Wearable readiness/recovery daily scores of the WHOOP/Oura/Apple kind (1.4
    VERIFIED). Volyume has its own ReadinessCards and ACWR (09:74,110) but no
    device-readiness-score integration is in this inventory (wearable integration
    is a separate Pro surface per project gating, outside this area's files).

USER SENTIMENT (what users want that no app fully nails):
  - The upward strength line over months is what users say keeps them training,
    and they churn when it's absent or paywalled — "the thing that had kept me in
    the gym this year" (2.1, 6.3 VERIFIED; verbatim research-06:385-388).
  - Don't strip tracking depth or clutter the dashboard in redesigns — a top
    repeated complaint, with Fitbit's redesign cited (6.1 VERIFIED; rep/rest-removal
    sub-claim PARTIAL).
  - One combined progress view across gym + cardio + bodyweight + composition,
    not three siloed apps (6.2 VERIFIED).
  - Support framed as company, never condescension — Noom's "what would Michael
    Jordan say?" weigh-in nudge and traffic-light system were called condescending
    (5.3 VERIFIED).
  - A loud minority want OUT of compulsive metrics entirely: named users quit the
    Apple Watch — "This is not healthy. This is something I'm consumed by" — and
    moderate ring use was protective while obsessive use was harmful (7.2 VERIFIED;
    the 2017/2023 ED-study figures and one AOL quote are PARTIAL).

VERIFICATION STATUS: This block leans predominantly on VERIFIED findings. The
  following supporting claims are PARTIAL or carry a PARTIAL sub-claim and must not
  be read as fully verified:
  - The "cluttered dashboard / removed rep + rest tracking" complaint: the
    dashboard-clutter claim is VERIFIED, but the rep/rest-removal sub-claim is
    PARTIAL (single secondary source) (6.1 / research-06:312).
  - The goal-gradient/loss-aversion COMPULSION evidence (7.2): the qualitative
    quotes and the protective-vs-harmful framing are VERIFIED, but the 2017
    *Eating Behaviors* and 2023 step-count study figures are relayed second-hand
    via Fortune and are PARTIAL; one AOL user quote 404'd and is PARTIAL
    (research-06:362-364,398).
  - The Forrester "35% lower 30-day churn" streak stat (4.1) is PARTIAL (second-
    hand) — not relied on in this block but noted for completeness.
  - Q1.5 micronutrient/measurement-frequency "NEVER" inference is PARTIAL +
    INTERPRETATION (research-06:125-129) — not load-bearing here.
  All BEST IN CLASS entries, the free-charts gap (6.3), photos (2.2/5.2), smoothed
  trend (2.3/5.1/7.3), live PR table-stakes (4.2), recap/paywall (4.3), Gentler-
  Streak compassion model (5.4), empty-state/first-week churn (3.1/3.2/3.3) and
  combined-view want (6.2) are VERIFIED.
