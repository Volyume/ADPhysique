# Phase 5 proposals — CLUSTER D: Progress tracking & retention / habit formation

> Drafted from already-produced, already-sourced documents (READ-ONLY, no new
> web research). British English. Dual-audience (newbie / athlete) stated
> separately. Every proposal traces to a finding in the comparison/research and
> every implementation detail traces to the Phase-1 inventory with file:line, or
> is explicitly marked NOT DETERMINED IN CODE.
>
> Sources read in full:
> - `phase3/compare-06-progress.md` (Progress tracking & visualisation)
> - `phase3/compare-09-retention.md` (Retention mechanics & habit formation)
> - `phase1/09-progress-analytics.md` (Progress & Analytics screens — file:line)
> - `phase1/03-home.md` (Home / FreeStarter screens — file:line)
>
> SACRED-constraint flags used: **FOUNDER-GATE** = touches ED-safety
> (`src/coaching/safety/`), deterministic-engine boundary, billing, or free/Pro
> gating; treated as INPUT ONLY, never an autonomous build.

---

```
ID: U-D-1
AREA: Progress tracking & visualisation
TITLE: Progress photos — a private, on-device visual progress log
SUGGESTED TIER: 2 High
IMPACT (1-10): 9 — compare-06 names this "the single largest absent feature for
  this area". Research rates photos as beating the scale for emotional
  reinforcement, the most legible early newbie win, and the recomp/contest-prep
  truth when scale weight is flat (2.2, 5.2 VERIFIED); a body-composition study
  found visual-progress trackers stayed more consistent than weight-only
  trackers (2.2 VERIFIED).
EFFORT (1-10): 6 — new capture/store/compare surface; must respect offline-first
  (local source of truth), EU residency, and no-PII-to-external rules. No
  existing photo component anywhere in the Phase-1 progress inventory, so this is
  net-new UI plus storage; the Body Metrics screen already owns the opt-in /
  calm-mode pattern this should reuse.
CURRENT STATE: No progress-photo capability appears anywhere in the Phase-1
  progress inventory (compare-06:142-148). The Body Metrics screen
  (src/screens/BodyMetricsScreen.js) is the nearest physique surface — it logs
  weight / body fat / 9 measurements behind a Pro guard + opt-in + calm-mode
  re-confirmation (09-progress-analytics.md:178-223; gating 09:196).
THE PROBLEM:
  - Newbie impact: the scale is the most demotivating early signal because body
    recomposition hides on it; photos are "the most legible early newbie win"
    and beat the scale for emotional reinforcement (2.2, 5.2 VERIFIED). Without
    photos, a beginner whose scale weight is flat sees no progress and is at the
    primary newbie churn point (compare-06:76-77).
  - Athlete impact: for recomp and contest prep, photos are "the truth when
    scale weight is flat" (5.2 VERIFIED) — a physique competitor currently has
    no in-app visual record alongside their measurements.
THE EVIDENCE: compare-06:142-148 (MISSING ENTIRELY, "single largest absent
  feature"); findings 2.2 and 5.2 — both VERIFIED (compare-06 VERIFICATION
  STATUS:192-195). No PARTIAL sub-claim is load-bearing.
BEST REFERENCE IMPLEMENTATION: The long tail of single-purpose App Store
  body-measurement / progress-photo trackers (#38–55) plus the general finding
  that visual-progress trackers out-retain weight-only trackers
  (compare-06:64-65, 2.2 VERIFIED). No single named best-in-class app for photos
  specifically in the fragment — the strength of the evidence is the category
  finding, not one exemplar.
PROPOSED SOLUTION: A private, on-device progress-photo log living inside the Body
  Metrics surface. Capture a photo (camera or gallery), store it locally with a
  date, optionally tag it to a measurement entry, and view a date-ordered grid
  plus a side-by-side two-photo compare. All images stay on device (offline-first
  + EU residency + no-PII rules); never uploaded to any external service. Neutral,
  non-valenced framing consistent with the existing Body Metrics safety handling.
NEWBIE EXPERIENCE: A "Photos" entry inside Body Metrics. First visit shows an
  encouragement-framed empty state ("Your first photo is your baseline") rather
  than a blank grid. One tap to capture; the photo appears dated in the grid. No
  jargon. Gives a beginner a visible win that the scale cannot.
ATHLETE EXPERIENCE: Date-tagged photos alongside the existing 9-site measurement
  grid and smoothed weight trend, with a side-by-side compare across any two
  dates — the contest-prep visual record that complements flat scale weight.
IMPLEMENTATION BLUEPRINT:
  - HOST SCREEN: src/screens/BodyMetricsScreen.js. Add a "Photos" section to the
    existing ScrollView (BodyMetricsScreen.js:725), placed after the
    Measurements snapshot block (currently BodyMetricsScreen.js:1000-1061) and
    before History (1063-1086), so the screen's visual-progress material sits
    together. Reuse the existing section-label treatment type.label/13
    (BodyMetricsScreen.js:1114-1116).
  - GATING: PRO. Body Metrics is wrapped `GatedBodyMetrics = withProGuard(
    BodyMetricsScreen, 'Body metrics')` (RootNavigator.js:151; registered
    347/386). Photos are physique-tracking and therefore Pro under the product's
    free/Pro split (CLAUDE.md: "check-ins" / physique are Pro). DO NOT expose to
    free users. Honour the in-screen opt-in (`PHYSIQUE_PREF_KEY`,
    BodyMetricsScreen.js:455-466) and the calm-mode re-confirmation
    (BodyMetricsScreen.js:684-712) — the same gates the rest of the screen uses.
  - EMPTY STATE: mirror EmptyBodyIllustration pattern already on this screen
    (BodyMetricsScreen.js:845-861, "Your progress starts here") with
    encouragement-framed copy; do NOT show a blank grid.
  - LOADED STATE: date-ordered grid of thumbnails; tap a thumbnail to view full;
    a "Compare" action picks two dates side-by-side.
  - ERROR STATES: camera/gallery permission denied → plain-English prompt, no
    crash; storage write failure → reuse the optimistic-save-with-rollback
    pattern already present (BodyMetricsScreen.js:633-663).
  - EDGE CASES: device-only storage and retention (mirror Snapshots' device-only
    framing, SnapshotsScreen.js:87-90); deletion must be possible; photos must be
    included in / excluded from the local snapshot+restore story
    (SnapshotsScreen.js) — confirm with founder which.
  - STORAGE MECHANISM, DB SCHEMA, AND IMAGE LIBRARY: NOT DETERMINED IN CODE —
    confirm before building. The Phase-1 inventory does not record any
    image-capture component, photo table, or file-store path. Adding an
    image-picker / camera dependency requires the CLAUDE.md "ask before adding a
    dependency" step (state package, purpose, licence; wait for yes).
VERIFICATION: Evidence all-VERIFIED (2.2, 5.2). Implementation host, placement,
  gating, opt-in/calm reuse and empty-state pattern are VERIFIED against
  Phase-1. NOT DETERMINED: photo storage mechanism, DB schema, image library,
  and snapshot inclusion — flagged above, confirm before building. Pro gating is
  a stated product rule, not a change; if any photo capability were proposed for
  free users that would be FOUNDER-GATE (free/Pro split) — not proposed here.
```

---

```
ID: U-D-2
AREA: Progress tracking & visualisation
TITLE: Live mid-session personal-best celebration moment
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — research calls live PR detection + an in-the-moment
  celebration "now table stakes" (4.2 VERIFIED; Hevy live PR, RepCount
  auto-confetti, FitPros recap cards). The upward strength signal is the single
  most-cited motivator that keeps users training (2.1, 6.3 VERIFIED).
EFFORT (1-10): 5 — PR detection logic and a PR concept already exist (static
  "PR" tag, landing PR sparkline, long-press share); the gap is an in-the-moment
  animated moment. The live trigger point is the active-workout screen, whose
  internals are NOT in this cluster's Phase-1 scope.
CURRENT STATE: Volyume surfaces PRs STATICALLY only — a "PR" tag on a lift row
  and a landing PR sparkline (09-progress-analytics.md:35, 110), and shares a PR
  via long-press PeekMenu → ShareCard (09:110, LiftProgressScreen.js:111-135).
  There is no in-the-moment celebration in the inventory (compare-06:122-126).
THE PROBLEM:
  - Newbie impact: a beginner setting an early PR gets no acknowledgement at the
    moment it happens; the celebratory feedback loop that builds the habit is
    absent (4.2 VERIFIED).
  - Athlete impact: competitors expect live PR detection + celebration as a
    baseline; its absence reads as a missing table-stakes feature (4.2 VERIFIED).
THE EVIDENCE: compare-06:122-126 (WHERE WE LAG, "no live mid-session PR
  celebration / confetti"); compare-06:149 (MISSING ENTIRELY). Finding 4.2 —
  VERIFIED (compare-06:192-195).
BEST REFERENCE IMPLEMENTATION: Hevy live PR notifications + RepCount auto-confetti
  + FitPros recap cards (compare-06:40-42, 124; "now table stakes"). Hevy's
  live-PR feature is the named exemplar (https://www.hevyapp.com/features/live-pr/
  — VERIFIED).
PROPOSED SOLUTION: When a logged set establishes a new personal best during an
  active session, show a brief, neutral-but-celebratory in-session moment (badge
  / lightweight animation) naming the lift and the new best, with an optional
  one-tap share that reuses the existing factual-stats-only share payload.
  Celebration must respect calm/ED flags (suppress or neutralise framing) exactly
  as the existing recap surfaces do.
NEWBIE EXPERIENCE: A first-timer who beats a previous best sees a clear,
  encouraging moment naming the achievement — the proven retention reward — with
  no jargon and no comparison to others.
ATHLETE EXPERIENCE: Live confirmation of a PR at the moment of the set, matching
  Hevy/RepCount, with one-tap share to the existing ShareCard.
IMPLEMENTATION BLUEPRINT:
  - TRIGGER LOCATION: the active-workout / set-logging screen. NOT DETERMINED IN
    CODE — the ActiveWorkout screen is referenced as a navigation target
    (HomeScreen.js:821,855,1148) but its file and set-logging internals are NOT
    in this cluster's Phase-1 scope (09-progress-analytics.md covers Progress
    screens only; 03-home.md covers Home). Confirm the active-workout file and
    where a set is committed before building.
  - PR DETECTION SOURCE: the existing estimated-1RM / "best" computation that
    already drives the "PR" tag and "est. max" on LiftProgress
    (LiftProgressScreen.js:244-294) — reuse it; do NOT introduce a second PR
    definition. Exact function/module NOT DETERMINED IN CODE; locate the existing
    e1RM/best calculation and call it from the live trigger.
  - SHARE PATH: reuse the existing factual-stats-only share payload + ShareCard
    navigation (YearOfLiftsScreen.js:425-471, LiftProgressScreen.js:123).
  - SAFETY FRAMING: neutralise/suppress under calm/ED flags exactly as recap and
    Body Metrics surfaces do (YearOfLiftsScreen.js:167,371-377;
    BodyMetricsScreen.js:757,1092-1108). Any new copy is user-facing string →
    British English. The celebration must NOT introduce comparison-to-others or
    loss-aversion mechanics (see U-D-8 founder note). Animation/celebration is
    presentation only; it must NOT touch `src/coaching/safety/` or the
    deterministic engine.
  - GATING: PRs and Lifts are FREE (LiftProgress registers with no withProGuard,
    RootNavigator.js:348; 09:113). Keep the celebration FREE to match.
VERIFICATION: Evidence all-VERIFIED (4.2, 2.1, 6.3). Share path, safety framing
  and free gating VERIFIED against Phase-1. NOT DETERMINED: the active-workout
  file/trigger point and the exact existing PR/e1RM function — both flagged,
  confirm before building.
```

---

```
ID: U-D-3
AREA: Progress tracking & visualisation
TITLE: Plain-English glossary / inline explanations for training jargon
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — the jargon-heavy newbie experience is named as a direct
  collision with the research's sub-30-second-first-value and
  result-surfaced-and-interpreted standards (3.1, 3.3, F1.4, F9.1 VERIFIED).
  First-week activation is decisive (3.2 VERIFIED).
EFFORT (1-10): 4 — Volyume already has the right primitive (InfoTooltip) deployed
  on some surfaces; the work is extending plain-English explanation to the terms
  that currently lack it. No new architecture.
CURRENT STATE: Jargon appears across the progress and home surfaces, partly
  unexplained:
  - Landing: "This week's volume", "below target"/"over max", "est. max"
    (09-progress-analytics.md:41); the InfoTooltip on volume helps but the rest
    leans on jargon (09:41).
  - Consistency: "ACWR" in a section title, plus Mesocycle/deload/fatigue-trend
    (09:82-83); deload + frequency tooltips exist but section labels are
    coach-jargon (09:83).
  - Lifts: "est. max"/"estimated 1RM" is unexplained on the row itself (only
    relative-strength has a tooltip); level taxonomy Beginner→Elite has no in-row
    threshold explanation (09:115).
  - Volume: MEV/MAV/MRV, "working sets", ghost fills — the densest screen; legend
    is plain-English but the underlying model is not (09:156).
  - Body Metrics: "EWMA", "Estimated daily burn / adaptive TDEE", confidence
    tiers (09:199).
  - Home: "Deload week", "stop R short of failure" (RIR), "Recovery week
    suggested" unexplained at a glance (03-home.md:52).
THE PROBLEM:
  - Newbie impact: the empty/early experience is "a blank jargon canvas" against
    the standard of sub-30s first value and interpreted (not raw) results (3.1,
    3.3, F1.4 VERIFIED); this is the primary newbie churn point (compare-06:76).
  - Athlete impact: minimal — these terms are signal for a competitor (athlete
    verdict Strong, compare-06:83-86). The change must not dilute athlete depth.
THE EVIDENCE: compare-06:73-81 (NEWBIE VERDICT), compare-06:128-131 (WHERE WE
  LAG, jargon-heavy newbie experience); compare-09:96-101 (NEWBIE VERDICT,
  "newbies need the result surfaced and interpreted, not raw jargon"). Findings
  3.1, 3.2, 3.3, F1.4, F9.1 — all VERIFIED.
BEST REFERENCE IMPLEMENTATION: The research's interpreted-result standard
  generally; on the Volyume side the LiftProgress relative-strength InfoTooltip
  is called "genuinely educational" (09:114) — extend that same pattern.
PROPOSED SOLUTION: Add inline InfoTooltip explanations (the existing primitive)
  to the currently-unexplained terms, in plain British English, without removing
  the terms themselves (athletes keep their vocabulary; newbies get the
  translation on tap). Specifically: "est. max"/estimated-1RM on the Lifts row;
  the level-badge thresholds; "ACWR" / "Training load"; the MEV/MAV/MRV model and
  "working sets"; "EWMA" and "Estimated daily burn"; and the Home meso-chip
  terms ("Deload", "stop R short of failure"/RIR).
NEWBIE EXPERIENCE: Every advanced term carries a tap-for-plain-English tooltip;
  the first-timer can decode any number on screen in seconds. Reduces the "blank
  jargon canvas" friction without hiding capability.
ATHLETE EXPERIENCE: Unchanged surface; the depth and the terms remain. Tooltips
  are opt-in (tap), so a competitor is not slowed down.
IMPLEMENTATION BLUEPRINT:
  - PRIMITIVE: reuse the existing InfoTooltip already used on the landing volume
    strip (AnalyticsScreen.js:277-291), Consistency deload + frequency
    (ConsistencyScreen.js:54-70, 125-137), Lifts relative-strength
    (LiftProgressScreen.js:170-192), and Volume legend
    (VolumeHeatmapScreen.js:275-288). Do NOT introduce a new tooltip component.
  - EXACT PLACEMENTS (add InfoTooltip beside each):
    * Lifts "est. max" stat label — LiftProgressScreen.js:404-416 row
      (statValue/statLabel at :414-415); plus a level-threshold tooltip on the
      level badge (LiftProgressScreen.js:357-360).
    * Consistency "Training load (ACWR)" section label —
      ConsistencyScreen.js:110-114 (label at :111).
    * Volume MEV/MAV/MRV + "working sets": extend the existing legend tooltip
      (VolumeHeatmapScreen.js:275-288) to define the landmark model in plain
      English.
    * Body Metrics "Weight trend"/EWMA card (BodyMetricsScreen.js:766-797) and
      "Estimated daily burn" card (BodyMetricsScreen.js:799-825) — add tooltips
      to the section labels.
    * Home meso-chip terms (HomeScreen.js:1180-1202) and deload banner
      (HomeScreen.js:1068-1096) — add a tap-for-plain-English explanation.
  - COPY: plain British English (colour, behaviour, etc.); newbie-legible, one or
    two short lines each.
  - STATES: tooltip is presentation only; no empty/error states beyond the
    existing InfoTooltip behaviour. Touch target: ensure any new tap glyph carries
    hitSlop to clear 44px (the file already uses hitSlop 8–10 on small targets,
    AnalyticsScreen.js:189,225,316).
  - DO NOT: remove or rename any term, change a calculation, or alter the engine /
    safety code. This is additive explanation only.
  - EXACT TOOLTIP COPY STRINGS: NOT DETERMINED IN CODE — must be written to spec
    and reviewed; the inventory gives the terms, not approved definitions.
VERIFICATION: Evidence all-VERIFIED. Primitive and every placement VERIFIED
  against Phase-1 file:line. NOT DETERMINED: the approved plain-English wording
  for each term — flagged, write to spec and confirm.
```

---

```
ID: U-D-4
AREA: Progress tracking & visualisation
TITLE: Encouragement-framed empty and near-empty progress states
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 7 — best practice is sub-30-second first value and
  encouragement-framed (not blank) near-empty charts; the empty state is the
  primary newbie churn point and first-week activation is decisive (3.1, 3.2,
  3.3 VERIFIED).
EFFORT (1-10): 3 — empty states already exist on several screens; the work is
  making them encouragement-framed and consistent, and handling the
  near-empty-chart case. Small, copy-and-presentation scoped.
CURRENT STATE: Empty states exist but are factual rather than encouragement-framed
  in places:
  - Landing: EmptyChartIllustration + "No data yet" + body copy
    (AnalyticsScreen.js:200-208) — explicit but neutral/flat (09:39, 76).
  - Lifts: "No lifts logged yet"/"No recent bests" + explainer
    (LiftProgressScreen.js:295-308).
  - Body Metrics: EmptyBodyIllustration + "Your progress starts here" +
    onboarding-weight-aware copy (BodyMetricsScreen.js:845-861) — this one IS
    encouragement-framed already and is the model.
  - Year of Lifts: legible but data-gated until 10 sessions / 365 days
    (09:279-280); rated the one fully newbie-legible screen (09:282).
THE PROBLEM:
  - Newbie impact: a first-timer most often meets an empty or near-empty chart;
    "No data yet" is accurate but does not encourage the next action, against the
    encouragement-framed standard (3.3 VERIFIED) at the decisive first-week
    moment (3.2 VERIFIED).
  - Athlete impact: minimal — athletes rarely sit on empty states, and the
    cold-start-import need is handled separately (U-D-5).
THE EVIDENCE: compare-06:76-81 (NEWBIE VERDICT, empty state = primary churn
  point, near-empty charts must be encouragement-framed). Findings 3.1, 3.2, 3.3
  — all VERIFIED (compare-06:192-195).
BEST REFERENCE IMPLEMENTATION: Hevy's near-empty encouragement framing and the
  Volyume Body Metrics empty state itself ("Your progress starts here",
  BodyMetricsScreen.js:845-861) — the in-app exemplar to copy across.
PROPOSED SOLUTION: Bring the landing and Lifts empty states up to the
  encouragement-framed standard set by Body Metrics, and add an
  encouragement-framed near-empty state for charts with 1–2 data points (frame
  the first logged session as progress rather than showing a near-blank chart).
NEWBIE EXPERIENCE: After one logged session the progress screens say something
  encouraging and point to the next action, instead of a flat "No data yet". The
  first week feels like momentum.
ATHLETE EXPERIENCE: Unchanged once populated; near-empty framing only appears in
  the first one or two sessions.
IMPLEMENTATION BLUEPRINT:
  - LANDING: AnalyticsScreen.js:200-208 — revise empty-state body copy to
    encouragement framing matching BodyMetricsScreen.js:845-861. Keep the
    EmptyChartIllustration (140px, AnalyticsScreen.js:203).
  - LIFTS: LiftProgressScreen.js:295-308 — encouragement-framed copy for both the
    "No lifts logged yet" and "No recent bests" variants.
  - NEAR-EMPTY: for charts/sparklines with 1–2 points, show an encouragement line
    rather than a near-flat chart. Sparkline lives per-row (LiftProgressScreen.js:
    288) and the landing PRSparkline (AnalyticsScreen.js:307-326); decide a
    minimum-points threshold below which the encouragement line shows.
  - SAFETY: copy must stay neutral / non-valenced consistent with the ED-aware
    framing already in place (no weight-loss or appearance framing); British
    English.
  - DO NOT change gating, calculations, or the data-gating thresholds for Year of
    Lifts / Recaps (those are separate, U-D-7 touches the cold-start window).
  - EXACT COPY: NOT DETERMINED IN CODE — write to spec; the inventory gives the
    current strings and the standard, not the approved replacements.
VERIFICATION: Evidence all-VERIFIED (3.1, 3.2, 3.3). In-app exemplar and exact
  edit locations VERIFIED against Phase-1. NOT DETERMINED: replacement copy and
  the near-empty threshold — flagged, write to spec.
```

---

```
ID: U-D-5
AREA: Progress tracking & visualisation / cold-start
TITLE: Fast training-history import / backfill so the long graph appears at once
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 7 — the long upward strength line over months is the reason
  experienced users stay (2.1 VERIFIED); the athlete's distinct churn risk is
  cold-start data portability — getting the long graph to appear immediately
  (3.1, 3.2 VERIFIED). compare-06 flags this and notes it is "absent from the
  Phase-1 inventory".
EFFORT (1-10): 7 — net-new import/parse/validate pipeline that must write through
  the local DB (offline-first source of truth) and the sync layer only; no
  evidenced import surface for training history in this cluster's scope.
CURRENT STATE: No fast history import/backfill for experienced users is in the
  Phase-1 progress inventory (compare-06:137-139). An `Import` screen is named in
  navigation (compare-09:113 → ultimate-audit-00-navigation-psychology.md:148)
  but its scope (whether it imports training history, and in what format) is NOT
  DETERMINED IN CODE.
THE PROBLEM:
  - Athlete impact: a competitor switching apps starts with an empty long graph —
    the very thing that retains them — and may churn before their history
    accrues (3.1, 3.2 VERIFIED; "the cold-start the research names as the
    athlete's churn risk").
  - Newbie impact: low — a beginner has no prior history to import.
THE EVIDENCE: compare-06:90-93 (ATHLETE VERDICT, cold-start data portability),
  compare-06:137-139 (WHERE WE LAG). Findings 2.1, 3.1, 3.2 — all VERIFIED.
BEST REFERENCE IMPLEMENTATION: Setgraph — complete movement history regardless of
  routine ("every time you train an exercise, you see your complete history",
  compare-06:53-55, VERIFIED). Hevy/Strong-style history portability is the
  athlete expectation.
PROPOSED SOLUTION: An import flow that ingests prior training history (e.g. a
  CSV/standard export from a competitor app) and backfills the local DB so the
  Lifts e1RM trend, Volume, and Consistency screens immediately show the full
  history. Must validate/normalise units (the lbs/kg correctness care already
  shown at LiftProgressScreen.js:72-78 applies) and respect offline-first +
  sync-layer-only writes.
NEWBIE EXPERIENCE: Not targeted; offered but skippable. A first-timer ignores it.
ATHLETE EXPERIENCE: On first run (or from the Import screen), bring across months
  of history so the upward strength line — the retention anchor — is present from
  day one rather than after months of re-logging.
IMPLEMENTATION BLUEPRINT:
  - ENTRY: the existing `Import` route (ultimate-audit-00-navigation-psychology.md
    :148) is the candidate home, but its current scope is NOT DETERMINED IN CODE —
    confirm whether it already handles training history or only something else
    before extending vs adding.
  - WRITE PATH: import must write to the LOCAL DB (source of truth on device) and
    propagate via the sync layer only — components never write Supabase directly
    (CLAUDE.md ARCHITECTURE). The exact local-DB write API and the sync entry
    point are NOT DETERMINED IN CODE in this cluster's scope — confirm.
  - DOWNSTREAM: once backfilled, the Lifts list/e1RM (LiftProgressScreen.js:
    244-294), Volume bars (VolumeHeatmapScreen.js:299-351) and Consistency
    calendar (ConsistencyScreen.js:140-145) should reflect history with no extra
    work if they read from the same store — VERIFY they read local store, not a
    session-scoped cache.
  - FORMAT(S) TO SUPPORT, UNIT-NORMALISATION RULES, AND DEDUP/CONFLICT HANDLING:
    NOT DETERMINED IN CODE — must be specified before building.
  - GATING: history import is a free-tier-relevant data-portability feature
    (logging + progress stats are free per CLAUDE.md); confirm tier with founder —
    if placed behind Pro that is a free/Pro decision (FOUNDER-GATE).
VERIFICATION: Evidence VERIFIED on the market side (2.1, 3.1, 3.2). EVIDENCE-THIN
  on the Volyume side: the gap rests on a NOT-FOUND-in-inventory observation
  (compare-06:139, compare-09:113) — the `Import` screen exists but its scope is
  unknown. NOT DETERMINED: Import-screen scope, local-DB write API, sync entry
  point, supported formats, unit/dedup rules, and tier — all flagged, confirm
  before building. Mark this proposal evidence-thin on implementation facts.
```

---

```
ID: U-D-6
AREA: Retention mechanics / data portability
TITLE: Data export of accumulated training history
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — athletes stay because of exportable history (it is part of the
  switching-cost / ownership anchor); F1.4, F9.1 VERIFIED on the market side.
EFFORT (1-10): 5 — read the local history and serialise to a file; offline-first
  read, no external upload of PII.
CURRENT STATE: Export is NOT DETERMINED IN CODE. compare-09 states an `Import`
  screen exists (ultimate-audit-00-navigation-psychology.md:148) but "export
  status NOT DETERMINED IN CODE" (compare-09:111-113, 152, 205). No export
  surface appears in the Phase-1 progress inventory either.
THE PROBLEM:
  - Athlete impact: experienced lifters want to own and move their data; absence
    of export weakens the ownership story (F1.4, F9.1 VERIFIED). It is also the
    reciprocal of U-D-5 — portability in both directions.
  - Newbie impact: low.
THE EVIDENCE: compare-09:150-152 (WHERE WE LAG, "Progress is interpreted but
  possibly not exportable"), compare-09:159-160 (MISSING ENTIRELY, "Data
  export"). Findings F1.4, F9.1 VERIFIED; the Setgraph reference is PARTIAL.
BEST REFERENCE IMPLEMENTATION: Strava (open API / export) and Setgraph
  (compare-09:159-160). Setgraph is PARTIAL; Strava's export/API is the VERIFIED
  anchor (F9.1).
PROPOSED SOLUTION: An export action that serialises the user's accumulated
  training history (sessions, sets, e1RM-relevant data, optionally body metrics)
  to a standard on-device file the user can share/save. No upload to any external
  service (no-PII rule); export is a local file the user controls.
NEWBIE EXPERIENCE: Not targeted; harmless if ignored. Reassures that data is
  theirs.
ATHLETE EXPERIENCE: One action produces a portable file of their full history —
  the ownership/switching-cost anchor.
IMPLEMENTATION BLUEPRINT:
  - PLACEMENT: the You/Settings "Your data" area is the natural home — the same
    region that hosts Snapshots ("Settings, Your data", RootNavigator.js:859;
    Snapshots route RootNavigator.js:381). Confirm exact settings location.
  - READ PATH: read from the LOCAL DB (source of truth) only; never from Supabase
    directly (CLAUDE.md ARCHITECTURE). Exact local-DB read API NOT DETERMINED IN
    CODE in this cluster's scope — confirm.
  - FORMAT: NOT DETERMINED — specify (CSV / JSON) before building; ideally a format
    symmetric with the U-D-5 import.
  - PRIVACY: file stays on device / user-shared only; no analytics, no external
    send (no-PII rule).
  - GATING: NOT DETERMINED — data-export tier is a free/Pro decision (FOUNDER-GATE
    if gated); export of one's own data is arguably a free/ownership feature,
    confirm with founder.
  - EDGE CASES: empty history → disabled/explained action; large history →
    progress indication.
VERIFICATION: Evidence VERIFIED on market side (F1.4, F9.1); Setgraph reference is
  PARTIAL (named only as breadth colour, not load-bearing). EVIDENCE-THIN on the
  Volyume side (rests on "export NOT DETERMINED IN CODE", compare-09:152,205).
  NOT DETERMINED: existing export presence, settings location, local-DB read API,
  format, and tier — all flagged. Mark evidence-thin on implementation facts.
```

---

```
ID: U-D-7
AREA: Retention mechanics / cold-start scaffolding
TITLE: Bridge the ~7–15 session personalisation window after the trial banners end
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 7 — the cold-start / cliff is where the cliff bites hardest;
  personalisation-payoff apps retain only if the user survives the ~7–15 session
  window (Fitbod "struggles to retain beyond the first seven"); trial banners
  stop at day 7 leaving a gap (F3.2, F7.2 VERIFIED).
EFFORT (1-10): 4 — reuses the existing typed-notification + Home-banner machinery;
  no new architecture, primarily a new trigger/condition and copy.
CURRENT STATE: Trial value-countdown banner runs Pro trial days 2–7 when no coach
  output exists (03-home.md:21, HomeScreen.js:1039-1065); `trial_day3` notification
  routes to WeeklyCheckIn/Home (ultimate-audit-00-navigation-psychology.md:236);
  `winback` handles +30-day lapse (:240). No evidenced mechanic bridges the
  ~7–15-session gap between trial-banner end and personalisation payoff
  (compare-09:146-149).
THE PROBLEM:
  - Newbie impact: the cliff (days/sessions 1–15) is where beginners quit; once
    the day-7 trial banner stops, nothing scaffolds the user to the point the
    progress data and coaching become rewarding (F3.2, F7.2 VERIFIED).
  - Athlete impact: low — an athlete with imported history (U-D-5) already has a
    rich graph; this is a beginner-retention bridge.
THE EVIDENCE: compare-09:146-149 (WHERE WE LAG, "Cold-start / cliff scaffolding
  stops early"). Findings F3.2, F7.2 — VERIFIED (compare-09:193-195).
BEST REFERENCE IMPLEMENTATION: Fitbod's missing piece is named as exactly this
  gap (compare-09:82-83, 164-165); the fix is graded structure + interpreted
  reward (Zombies Run / C25K / NTC carry beginners past the cliff, F8/F9.2
  VERIFIED).
PROPOSED SOLUTION: Extend the existing Home banner / typed-notification scaffolding
  so that between roughly session ~3 and ~15 the user receives an interpreted
  progress moment (e.g. surfacing "you've logged N sessions — here's what's
  improving"), reusing the free weekly coach one-liner mechanism rather than a new
  engine. NON-AI, deterministic, built from logged data only.
NEWBIE EXPERIENCE: After the day-7 trial banner ends, the free user keeps getting
  a short, interpreted "here's your progress" nudge through the cliff window,
  pointing back at the visible progress that retains them.
ATHLETE EXPERIENCE: Largely irrelevant / suppressible once enough history exists.
IMPLEMENTATION BLUEPRINT:
  - REUSE: the free weekly coach one-liner (`showFreeCoachLine` /
    `buildFreeCoachLine` / `loadFreeCoachLine`, HomeScreen.js:383-411, 943-944,
    1099-1122) is the existing deterministic, data-derived interpreted line —
    extend its trigger to cover the ~3–15-session window, OR add a parallel
    cold-start line using the same builder. DO NOT introduce AI/LLM or randomness
    (CLAUDE.md SACRED: deterministic engine).
  - NOTIFICATION: reuse the typed/deep-linked notification system
    (ultimate-audit-00-navigation-psychology.md:166-176, notificationRoute.js:
    20-65) if a push is wanted; respect the per-category notification controls
    (RootNavigator.js:377,396). Content must VARY (see U-D-9) — repetition drives
    fatigue (F6.3 VERIFIED).
  - DATA SOURCE: sessions-this-week + existing progress signals already used by
    the free coach line (HomeScreen.js:383-411). No new data needed.
  - ONE-BANNER INVARIANT: respect it (HomeScreen.js:924-944) — this must slot into
    the existing priority order, not stack a new always-on banner.
  - SAFETY: any copy touching nutrition/weight is safety-adjacent and must respect
    calorie floors / rapid-loss threshold / Beat UK signposting — keep this nudge
    to training-progress framing to stay clear (see FOUNDER note on U-D-9). British
    English.
  - GATING: free-tier cold-start bridge (the free coach line is free,
    HomeScreen.js:943). Keep free.
  - EXACT TRIGGER THRESHOLDS (session counts) AND COPY: NOT DETERMINED IN CODE —
    specify before building.
VERIFICATION: Evidence all-VERIFIED (F3.2, F7.2, F8/F9.2). Reuse machinery and
  one-banner constraint VERIFIED against Phase-1. NOT DETERMINED: exact
  session-count thresholds and copy — flagged. NOTE: if the bridge copy ever
  frames weight/calories, that is safety-adjacent → FOUNDER-GATE; this proposal
  scopes it to training-progress framing to avoid that.
```

---

```
ID: U-D-8
AREA: Retention mechanics / habit formation
TITLE: Lenient consistency reward (weekly "showing up" recognition) — RESEARCH INPUT ONLY
SUGGESTED TIER: 4 Enhancement (FOUNDER-GATE — do not build autonomously)
IMPACT (1-10): 8 (claimed) — lenient streaks (freezes, grace, "X sessions/week")
  are reported to raise commitment ~60% and cut at-risk churn ~21% (F5.1, F5.2
  VERIFIED). Impact is contingent on the founder accepting the ED-safety trade.
EFFORT (1-10): 5 — Volyume already has the lenient WEEKLY shape (WeeklyStreakStrip
  + Consistency StreakWeeksSection); the question is whether to add any reward
  emphasis, not architecture.
CURRENT STATE: Volyume has the SAFE shape already: a "This week" consistency strip
  (WeeklyStreakStrip) that self-hides for brand-new users and under a wellbeing
  flag (AnalyticsScreen.js:177-197), a Consistency "Your weeks" StreakWeeksSection
  (ConsistencyScreen.js:46), milestone rows ("4 weeks of showing up.",
  AnalyticsScreen.js:180-195), and "sessions this week" framing (03-home.md:31).
  A DAILY streak counter / streak-freeze / unbroken-chain mechanic is NOT
  DETERMINED IN CODE (compare-09:51-56) — i.e. not evidenced, treated as
  not-evidenced rather than confirmed-absent.
THE PROBLEM:
  - Newbie impact: no explicit streak/consistency REWARD scaffolds the habit
    through days 1–3 and the cold-start window (F7.2 VERIFIED) — but the research
    ALSO documents the harm (guilt/shame, compulsion) and the ED-risk literature
    (F4.4, F5.3, 7.2).
  - Athlete impact: a strict DAILY streak is "actively harmful for an athlete
    whose programme includes rest days" (F5.3 VERIFIED) — the existing
    weekly/Consistency framing is the correct shape for them (compare-09:115-117).
THE EVIDENCE: compare-09:137-141 (WHERE WE LAG, with the explicit "See ED-safety
  note — research-input only"), compare-09:155-156 (MISSING), and the **ED-SAFETY
  NOTE at compare-09:180-190** which states: "Strict daily streaks conflict with
  rest days AND with the ED-safety boundary… streak adoption [is] STOP-and-ask
  territory given the ED rules… Any streak/consistency reward is a founder
  decision, not an autonomous build." Findings F5.1, F5.2, F5.3, F4.4, 7.2 —
  VERIFIED (the 2017/2023 ED-study FIGURES are PARTIAL, compare-06:184-187).
BEST REFERENCE IMPLEMENTATION: Duolingo's lenient streak (Streak Freeze / grace;
  leniency raised DAU, Streak Freeze cut at-risk churn ~21%, F5.2 VERIFIED) and
  Gentler Streak (rest days don't break the streak; sick/injured/off statuses;
  Apple Watch App of the Year 2022, compare-06:47-49 VERIFIED) — the
  supportive-not-punitive model.
PROPOSED SOLUTION (INPUT ONLY — NOT TO IMPLEMENT WITHOUT FOUNDER SIGN-OFF): If the
  founder chooses to add any reward emphasis, it must be the LENIENT WEEKLY model
  only — never a daily chain, never loss-aversion / shame framing, with rest days
  and a grace/"life happens" allowance built in (Gentler Streak model), respecting
  `src/coaching/safety/` untouched and the wellbeing-flag self-hide already present.
  Options for the founder: (a) leave as-is (the existing weekly strip is already
  the safe shape); (b) add a gentle, non-punitive weekly recognition; (c) do
  nothing on streaks and invest the retention effort in U-D-3/U-D-4/U-D-7 instead.
NEWBIE EXPERIENCE: (if chosen) gentle weekly "you showed up" recognition that
  never guilts a missed day. (if not) unchanged — the existing milestone rows
  already provide light recognition.
ATHLETE EXPERIENCE: must remain weekly/rest-day-aware; a daily streak would be
  harmful and is explicitly out (F5.3 VERIFIED).
IMPLEMENTATION BLUEPRINT (for the founder's decision, NOT a build order):
  - Surfaces that already exist and must be reused, not replaced:
    WeeklyStreakStrip (AnalyticsScreen.js:177-197), milestone rows
    (AnalyticsScreen.js:180-195), Consistency StreakWeeksSection
    (ConsistencyScreen.js:46). The wellbeing-flag self-hide
    (AnalyticsScreen.js:177-197) and ED-aware neutral framing must remain.
  - HARD CONSTRAINTS (CLAUDE.md SACRED): never modify/disable/work around
    `src/coaching/safety/`; never introduce daily-streak loss-aversion pressure;
    any nutrition/weight-adjacent notification respects calorie floors, the
    1.5%/week rapid-loss threshold, and Beat UK signposting.
  - The internals of WeeklyStreakStrip / StreakWeeksSection are NOT DETERMINED IN
    CODE (sub-component files not in this cluster's scope).
VERIFICATION: FOUNDER-GATE — explicitly research-input-only per compare-09:180-190
  and the dispatch brief. Market findings VERIFIED; the ED-harm STUDY FIGURES are
  PARTIAL (compare-06:184-187) — do not present as fully verified. Volyume daily-
  streak absence is NOT DETERMINED IN CODE (not asserted absent). DO NOT BUILD
  without explicit founder "proceed".
```

---

```
ID: U-D-9
AREA: Retention mechanics / notifications
TITLE: Vary notification content so reminders don't become noise — SAFETY-ADJACENT
SUGGESTED TIER: 4 Enhancement (FOUNDER-GATE for any nutrition/weight-framed copy)
IMPACT (1-10): 6 — "content repetition, not frequency, drives fatigue"; users
  want reminders that vary and aren't noise (F6.3 VERIFIED). Disciplined typed
  notifications already align with the recommended envelope (F6.2/F6.3 VERIFIED).
EFFORT (1-10): 3 — the typed-notification system + per-category controls already
  exist; the work is content variation, not new plumbing.
CURRENT STATE: Volyume runs a typed push-notification system with deep-link
  routing per type (`weekly_checkin`, `year_of_lifts_unlock`, `monthly_recap`,
  `cascade_gate`, `weekly_coach_ready`, `winback`, `partner_cheer`,
  `checkin_missed`, `trial_day3` — ultimate-audit-00-navigation-psychology.md:
  166-176, notificationRoute.js:20-65) with per-category controls
  (SettingsNotifications RootNavigator.js:377; NotificationSettings :396;
  CoachingReminders GATED :398). This already beats single on/off toggles
  (compare-09:124-127). Whether copy VARIES per send is NOT DETERMINED IN CODE.
THE PROBLEM:
  - Newbie + athlete impact: repeated identical reminder copy drives opt-out;
    users explicitly want "something different" each time (F6.3 VERIFIED). The
    delivery system is good; the content-variation discipline is the gap.
THE EVIDENCE: compare-09:171-173 (USER SENTIMENT, "Reminders that vary and aren't
  noise"), compare-09:124-127 (WHERE WE LEAD on delivery design). Finding F6.3 —
  VERIFIED.
BEST REFERENCE IMPLEMENTATION: The research's varied-content standard generally
  (F6.3 VERIFIED); Volyume's own typed/deep-linked system is the right delivery
  envelope to layer variation onto (compare-09:124-127).
PROPOSED SOLUTION (INPUT — copy that touches nutrition/weight is FOUNDER-GATE):
  Maintain a small set of varied, deterministic copy variants per notification
  type so successive sends of the same type differ. NO AI / no generation
  (deterministic engine boundary) — a curated rotation only. Any variant that
  references calories/weight-loss is safety-adjacent and must respect the calorie
  floors, the 1.5%/week rapid-loss threshold and Beat UK signposting.
NEWBIE EXPERIENCE: reminders feel fresh, not nagging — supports habit formation
  without the chore/guilt cycle (F4.2/F4.4 VERIFIED).
ATHLETE EXPERIENCE: same; less likely to mute notifications.
IMPLEMENTATION BLUEPRINT:
  - REUSE: the existing typed notification system and route helper
    (notificationRoute.js:20-65, ultimate-audit-00-navigation-psychology.md:
    166-176); add curated copy variants per type, selected deterministically (no
    randomness — CLAUDE.md). Per-category controls already exist
    (RootNavigator.js:377,396,398) — do not change them.
  - SAFETY (FOUNDER-GATE): any nutrition/weight-framed variant is safety-adjacent
    (compare-09 ED-SAFETY NOTE:188-190) — respect calorie floors (1,200 women /
    1,500 men), the 1.5%/week rapid-loss threshold, and Beat UK signposting; do
    NOT touch `src/coaching/safety/`. Training-only variants are not safety-gated.
  - LANGUAGE: all variants British English.
  - WHERE NOTIFICATION COPY CURRENTLY LIVES / whether it already varies: NOT
    DETERMINED IN CODE — locate the copy source before adding variants.
VERIFICATION: Evidence VERIFIED (F6.3, F6.2, F4.2/F4.4). FOUNDER-GATE for any
  nutrition/weight-framed copy (safety-adjacent, compare-09:188-190). NOT
  DETERMINED: current notification copy location and whether variation already
  exists — flagged, confirm before building. Training-only copy variation is not
  gated; nutrition/weight copy requires founder sign-off.
```
