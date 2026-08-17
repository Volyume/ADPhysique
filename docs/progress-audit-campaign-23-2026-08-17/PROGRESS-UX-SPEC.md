# CAMPAIGN 23 — PROGRESS: PRODUCT, LOGIC, IA & PRESENTATION AUDIT + REDESIGN SPEC

**Phase 1 deliverable. Docs only — no production change. Fable lead over
four evidence traces (all in this folder): ELEMENT-INVENTORY.md,
FORYOU-AUTHORITY-TRACE.md, METRICS-AND-SHARE-TRACE.md,
PHOTO-SCAN-CHAIN-TRACE.md. Baseline: main `4aa39c6f`. Screenshot
evidence: the founder's transcription in the campaign brief (no image
files were supplied in this environment); nothing beyond that
transcription is claimed.**

---

## 1. EXECUTIVE VERDICT

Progress does not currently answer its own question. The landing page is
an activity dashboard with an advisory inbox in the middle: 30
containers, 25 tappable affordances and 21 conditional branches
(ELEMENT-INVENTORY.md, Final Counts), headlined by a workload number
that can rise without any strength change, with the app's genuinely
differentiated intelligence (the on-device progress scan) demoted to a
plain navigation tile visually equal to Partners.

The most serious finding is not visual. The "For You" feed is a live
SECOND PROGRESSION AND PROGRAMME AUTHORITY that predates Campaigns 20
and 21 and was never retired: three of its six message classes make
independent training decisions on their own thresholds
(FORYOU-AUTHORITY-TRACE.md, verdicts C, with two constructible
contradiction scenarios E), including instructing load increases during
weeks the authoritative resolver would refuse, and instructing manual
programme volume changes with zero deload awareness even though the
deload flag is fetched in the same screen load. Two of its classes also
carry warning-styled recovery/fatigue content with none of the ED/calm
suppression that 30+ other surfaces apply.

Second-order findings: "this week" means two different windows on the
same screen (rolling hero vs Monday-anchored volume section, verified at
source); the PR spark counts set-level events with no per-day dedup, so
"115 in 30 days" is an activity artefact, not evidence; the share system
puts two identical "Create share image" CTAs on one landing render of a
surface whose job is understanding, not broadcasting.

The redesign is therefore an information-architecture and authority
repair, not a re-skin. Final verdict: **B — Progress mostly locked,
specific founder rulings required** (§33: three genuine rulings; every
other decision follows from measured evidence, existing law, or the
delegated decision standard and is ruled inline with rationale).

## 2. CURRENT PRODUCTION ROUTE + COMPONENT MAP

The bottom tab "Progress" is `ProgressTab` → `ProgressStack`, whose root
route is **`Analytics` → `src/screens/AnalyticsScreen.js`** (1,237
lines) — not a file named "Progress". Child routes (14): WorkoutHistory,
WorkoutSummary, VolumeHeatmap, BodyMetrics (read-only Pro guard),
ProgressPhotos (read-only Pro guard), LiftProgress, Consistency, Partner
(Pro guard), ExerciseDetail, YearOfLifts, RecapStory (same component as
YearOfLifts, `variant: 'month'`), ShareCard, ProUpgrade (modal). Full
map with gating: ELEMENT-INVENTORY.md §Route Map.

Data flows through one hook, `src/hooks/useProgressData.js` (13
loaders), plus `runInsightsEngine` (src/lib/insightsEngine.js) for the
"For you" feed and `useWeightTrend` for the Pro trend card. Render
order today (condensed; full element records in ELEMENT-INVENTORY.md):
header → Training Load hero (chart + share CTA) → Sessions/New PRs
spark pair → tonnage-milestone row (raw text + share CTA, when a
threshold crosses) → load-error/empty/momentum states → recap banner →
"For you" feed (0–3 advisory cards) → Partners + Progress photos tile
pair → weight trend card (Pro) → Recent sessions (≤3 + "All sessions")
→ This week's volume strip → Lifetime totals panel → "More stats" tile
grid (Consistency, Lifts, Body Metrics, Full History, Recaps, Year of
Lifts).

## 3. CURRENT LANDING-PAGE PURPOSE TEST

For every section: what question does it answer, and does that question
belong on Progress? (Classifications: CORE ANSWER / CORE EVIDENCE /
USEFUL DRILLDOWN / SECONDARY UTILITY / WRONG SCREEN / DUPLICATE / STALE
AUTHORITY / REMOVE.)

| Surface | Question it answers today | Belongs? | Class |
|---|---|---|---|
| Training Load hero | "How much weight did I move this rolling week vs the last 8?" | Workload context, not progress | USEFUL DRILLDOWN (demoted; §6) |
| Sessions spark | "How often did I train in 30 days?" | Adherence context | SECONDARY UTILITY (§7) |
| New PRs spark | "How many set-level e1RM events fired?" | Activity count masquerading as progress | CORE EVIDENCE only after redefinition (§8) |
| Tonnage milestone row | "Have I crossed a lifetime threshold?" | A moment, not a state | SECONDARY UTILITY (occasional; §9) |
| "For you" feed | "What should I change?" | WRONG SCREEN and wrong authority | STALE AUTHORITY → RETIRE (§10–§13) |
| Recap banner | "Is my monthly recap ready?" | Fine as an occasional nudge | SECONDARY UTILITY |
| Partners tile | "How is my partner doing?" | Accountability utility, not my progress | SECONDARY UTILITY (demoted; §18) |
| Progress photos tile | "Where are my photos?" | Undersells the app's differentiator | CORE EVIDENCE (elevated; §16) |
| Weight trend card (Pro) | "Is my bodyweight moving appropriately?" | Yes — this is the page's job | CORE ANSWER / CORE EVIDENCE (§15) |
| Recent sessions | "What did my last sessions look like?" | Evidence trail | CORE EVIDENCE (slimmed; §19) |
| This week's volume strip | "Am I hitting my volume targets?" | Plan-adherence evidence | USEFUL DRILLDOWN (kept, one tap up from heatmap) |
| Lifetime totals panel | "What has it all added up to?" | Identity/retention, not current progress | SECONDARY UTILITY (§7) |
| More stats grid | "Where is everything else?" | Navigation utility | SECONDARY UTILITY |
| Two "Create share image" CTAs | "Broadcast this" | Sharing is secondary to understanding | DEMOTE (§9) |

The page has **no surface whose job is the primary question** ("am I
actually making progress?"). The closest is the Pro weight-trend card,
which sits tenth in render order. That inversion is the core defect.

## 4. SCREENSHOT / PHYSICAL DENSITY FINDINGS

From the founder transcription (our screenshot record) reconciled
against the current tree:

- The transcribed layout (large Training load card with "136,664 kg",
  Sessions card, "New bests 115 / Last 30 days", lifetime kg, multiple
  share CTAs, yellow For You cards mid-page, Partners/Progress photos
  as equal tiles, trend and recent sessions low on the page) matches
  the current render order; the label "New bests" has since been
  renamed "New PRs" in code (a stale comment at AnalyticsScreen.js:610
  still says "New bests"), and the "weeks running" / "N of M sessions"
  constructs are NOT on the current Progress tree at all — the streak
  construct was founder-removed from Consistency (COMP-018 comment,
  ConsistencyScreen.js:57-64) and such copy survives only on Home's
  glance line (now merged by Campaign 22), the Android widget, partner
  shared streak, and coach explain copy (METRICS-AND-SHARE-TRACE.md
  §2). The audit therefore treats "weeks running on Progress" as
  already resolved history, not a live surface — and makes NO new
  streak law beyond that existing ruling.
- Density as transcribed and as counted in code agree: the answer to
  "am I progressing" is not above the fold; a workload number is. Two
  identical outline share buttons compete with evidence. Raw text
  outside containers appears twice (tonnage milestone row, momentum
  note). The advisory feed renders in warning yellow between the
  dashboard and the navigation tiles, reading as notifications.

## 5. CURRENT INFORMATION HIERARCHY (AS BUILT)

As rendered today: P0 slot is occupied by Training Load (workload);
P1 by activity counts (Sessions/New PRs sparks); the genuine progress
evidence (weight trend, PR quality, visual change) sits at P2-and-below
positions 10–12; the app's differentiator (scan intelligence) is a P3
navigation tile; and an unbounded-feeling advisory feed occupies
prime mid-page space. Hierarchy is inverted relative to the page's job.

## 6. TRAINING-LOAD RULING

Evidence (METRICS-AND-SHARE-TRACE.md §1, verified at source by the
lead): `buildWeeklyLoadSeries` sums weight × reps over non-warm-up sets
(`progressSeries.js:44-58` → `calculateTonnage`, `algorithms.js`);
dropsets/myo-reps/rest-pause count fully; bodyweight/reps-only
self-exclude only via weight=0; no normalisation across exercise
selection or equipment; the hero's week is a ROLLING 7-day bin from
render time while the volume section on the same screen is
Monday-anchored (`useProgressData.js:270` vs `progressSeries.js:50`).

Factual answers to the brief's questions: yes, tonnage rises purely
from added volume; yes, exercise swaps distort it; no, schemas are not
comparable; it is a WORKLOAD metric, not a progress metric; and the
label "Training load" is semantically loose — what is computed is
weekly tonnage.

**Ruling (lead, D33):** DEMOTE from page hero to secondary evidence
inside the Training pillar's drilldown (§17/§20-landing keeps a single
compact tonnage line at most). Keep the 8-week chart in the drilldown —
it is honest workload history. RELABEL to plain English: "Weight
lifted" with the existing "This week" sublabel (the term "Training
load" is reserved in sports science for constructs we do not compute).
FIX the week boundary to Monday-anchored (dayKey.js) so one screen has
one definition of "this week" — this is also a recorded defect (§28,
IA-2). Its hero share CTA does not survive (§9). Not deleted: the
series builder, the chart, the milestone system all remain.

## 7. SESSIONS / ADHERENCE / RUN RULING

Evidence: the Sessions spark counts sessions in 30 days
(`buildWeeklySessionCounts`); Consistency owns frequency detail; the
streak construct was already founder-removed from Consistency
(COMP-018); lifetime totals panel shows sessions/kg/reps; the milestone
row's copy is "…lifted all-time. That's what showing up adds up to."

Rulings (lead, D33), by the brief's own questions:
- "N weeks running" tells the athlete they ATTENDED, not that they
  progressed. It is not on Progress today and does not return. (No new
  global streak law — this restates the existing COMP-018 ruling for
  this screen only, per the interpretation law.)
- "N of M sessions this week" is adherence. Adherence is legitimate
  CONTEXT (it explains WHY evidence is thin or strong) but not a
  primary progress metric. Target architecture carries adherence as one
  quiet context line inside the Training pillar ("3 sessions this
  week"), never a headline card. The Sessions spark card is retired
  from the landing; Consistency (the detail screen) remains its home.
- Lifetime totals are identity/retention content, not current progress.
  They move off the landing summary into the Recaps/Year-of-Lifts
  family (their natural narrative home); the occasional
  tonnage-milestone MOMENT may still surface (it is transient and
  share-worthy by design) but as a quiet contained row, and it counts
  against the landing's advisory budget (§24).

## 8. "NEW BESTS" RULING

Evidence (METRICS-AND-SHARE-TRACE.md §3): `computePRsPerWeek`
(`useProgressData.js:23-73`) counts SET-LEVEL events — every non-baseline
set whose e1RM beats the running per-exercise max, weight_reps type
only, no per-exercise-per-day dedup — so one session can fire many
events and a new user legitimately accumulates 100+ in 30 days. "115"
is therefore uninterpretable as progress: it mixes novelty inflation
with genuine strength change and gives no idea WHAT improved.

**Ruling (lead, D33):** the landing stops showing a bare count. The
Training pillar's evidence line shows QUALITY, not quantity: up to the
2–3 most recent meaningful bests, named ("Bench press 80 kg × 5 — new
best"), derived from the same e1RM data, with the count and full
history one tap away in LiftProgress. A trend statement ("strength up
across N lifts in the last month") is permissible because it is
factual aggregation of the same evidence — NOT a coaching judgement.
Definitional note recorded for Phase 2: a per-exercise-per-day dedup is
required for any surfaced count so repeated small record events within
one session cannot inflate it (defect IA-3, §28).

## 9. SHARE-SYSTEM RULING

Evidence (METRICS-AND-SHARE-TRACE.md §4): exactly two identical
"Create share image" CTAs render on one landing draw (tonnage milestone
+ hero); ShareCardScreen supports four card types whose payloads
structurally exclude body data; the one bodyweight exception (before/
after photo card) is founder-approved and fail-closed under
calm/ED (usePhotoSuppression); WorkoutSummary's share button is already
hidden when entered read-only from Progress.

**Ruling (lead, D33), per the brief's law that sharing is secondary to
understanding:**
- KEEP (contextual): the tonnage-MILESTONE row's share CTA — a genuine
  achievement moment, transient by design.
- REMOVE from landing: the Training Load hero's standing share CTA. A
  permanent broadcast button on an evidence chart competes with the
  hierarchy every single day. Sharing weekly load remains available
  from the training drilldown.
- KEEP (where they already are, one tap deep): LiftProgress per-PR
  share, YearOfLifts/Recap share, before/after photo card (unchanged
  law).
- Net landing rule: at most ONE share affordance visible per landing
  render, and only inside a transient achievement moment — never as
  standing chrome. No new share surfaces, no social expansion.

## 10. "FOR YOU" PRODUCTION TRACE (SUMMARY)

Full trace: FORYOU-AUTHORITY-TRACE.md. Facts: the feed is generated by
`src/lib/insightsEngine.js`, called once per Progress load, capped by a
SQL `LIMIT 3`, persisted in an `insights` DB table (synced), each row
dismissible (DB delete) with no expiry semantics beyond dismissal. Six
classes: `peaked_lift`, `stalled_lift`, `under_mev_muscle`,
`recovery_warn`, `deload_due`, `gentle_rhythm`. The `actionPayload`
field (exerciseId/muscle) is generated and synced but never read by any
UI — dead. The ranking function `rankAndCapInsights` is dead code. The
engine has ZERO ED-flag/calm-mode gating (grep-verified: no isCalm/
edFlag/wellbeing references in the file) while carrying severity-2
warning-styled soreness/fatigue content. The screenshot grammar error
("Your traps hasn't…") is the literal template at its source (singular
verb against plural muscle display names).

## 11. CAMPAIGN-20 PROGRESSION-AUTHORITY COLLISION RESULT

**Confirmed: verdict C (legacy independent decision) for both
load-progression classes, with a constructible E.**
- `peaked_lift` ("…Time to add a little weight next session.") decides
  from static `defaultRepMax` + its own RIR≥1 rule
  (insightsEngine.js:132-148) — none of the resolver's evidence packet,
  ±2 noise floor, once-only overshoot, or provenance exists here. It
  can instruct a load ADD during deload/re-entry easing/readiness
  reduction — states in which the resolver's founder-ordered hard gate
  (Ruling 2, Campaign 20) refuses adjustStronger outright. That is a
  direct contradiction of a founder order, live in production.
- `stalled_lift` nags the athlete about a situation the resolver
  already handles automatically (rep-target escalation), on its own
  4-session same-top-set heuristic.
**MATERIAL DEFECT (§28, SA-1): Progress is an active second progression
engine. These classes are retired, not restyled.** Any future
progression-adjacent line on Progress may only DISPLAY the resolver's
own decision/provenance (verdict-B shape), never compute one.

## 12. PROGRAMME/VOLUME-AUTHORITY COLLISION RESULT

**Confirmed: verdict C with constructible E.** `under_mev_muscle`
("Adding a set or two this week will get it growing again.") observes
low weekly sets vs MEV and then PRESCRIBES a manual programme edit. It
has zero deload/recovery awareness — `currentMesoWeek.isDeload` is
fetched in the same `load()` (useProgressData.js:173) and never
threaded through — so it can tell an athlete to add sets during a
coach-scheduled recovery week (E scenario constructed in the trace).
`deload_due` runs its own deload thresholds, distinct from
weeklyCoach's, and can announce a lighter week while one is already
active. **MATERIAL DEFECT (§28, SA-2/SA-3): retired.** If Volyume
believes programme volume should change, weeklyCoach/planEngine owns
that decision and the Today/Coach surfaces deliver it (Campaign 22's
Today line rank 3 is the delivery slot that already exists).

## 13. NOTIFICATION / FEED SEMANTIC RULING

What the yellow cards ARE today: persisted, dismissible,
warning-styled, mid-page PRESCRIPTIONS AND FORECASTS — i.e. they borrow
alert semantics for content that is neither timely nor owned by this
surface, accumulate until manually dismissed, and hide anything
actionable halfway down a stats page. The semantic contract going
forward (one contract, per the brief):

- Progress renders NO advisory feed. There is no "For You" section.
- ACTIONABLE coaching (anything the athlete should do) is delivered
  exclusively by the authoritative engines through their existing
  surfaces: the Today line (P1, ranked, Campaign 22) and Coach outputs.
- OBSERVATIONS earn a place on Progress only as quiet, non-warning
  evidence lines INSIDE the pillar they describe (e.g. a training
  observation lives in the Training pillar), are generated fresh from
  authoritative data at render (no persisted advisory rows, no
  dismissal machinery), and never use alert styling for non-alerts.
- `gentle_rhythm` (pure observation, no authority overlap) is the only
  current class whose CONTENT could survive in that form; it does so as
  an evidence line, not a card in a feed.
- The `insights` table stops being written/read by this surface;
  cleanup approach is Phase-2 scope under additive-schema law (stop
  writing/reading; no destructive migration required).

## 14. COACHING-LOCATION RULING

The brief's candidate law is adopted, tightened, and made testable:

**PROGRESS MAY DESCRIBE EVIDENCE. TODAY/TRAIN/COACH DELIVER DECISIONS.**

- Legitimate on Progress: "Lateral raise performance is up across your
  last 3 exposures." / "Direct trap work has been lower these 3 weeks."
  (Factual, sourced from authoritative data, no instruction.)
- Illegitimate on Progress: "Add 2.5 kg next session." / "Add two sets
  this week." (Instructions — they belong to the resolver and the
  coach, delivered where action happens.)
- Boundary rule for Phase 2 guards: a Progress string may not contain
  an imperative directed at future training/nutrition behaviour.
  Displaying an authoritative decision's EXISTENCE with a tap-through
  to its owner (verdict-B shape, e.g. "Your coach adjusted this week's
  volume — see why") is permitted but belongs to the Today line first;
  Progress carries it only when Today has already surfaced it and the
  athlete navigates here for evidence.

## 15. BODYWEIGHT / TREND RULING

Evidence: the Pro weight-trend card (WeightTrendCard.js) renders EWMA
current weight, weekly rate, insight sentence, maintenance estimate
(with "building" immature state), EWMA glossary tooltip; it self-hides
below 2 logged weights; units flow through formatBodyWeight. It is the
one current surface that already answers a pillar of the primary
question with authoritative data (same EWMA family as the coach, C21
day-collapse fixes apply).

**Ruling (lead, D33):** PROMOTE to one of the three P0/P1 pillar
positions (Body pillar), directly below the landing answer block —
without growing it. Landing shows: trend direction vs goal band, current
EWMA weight, weekly rate; maintenance estimate and chart detail remain
one tap away in BodyMetrics. Units stay single-system (user's chosen
bodyweight units; no mixed kg/lb on one surface). The estimate-maturity
copy stays exactly as built (honest immaturity is on-law). Duplication
check: Home's R4 weight row is capture + today's state; Progress's Body
pillar is trend-over-time evidence — different jobs, no collision, and
neither computes independently of the shared EWMA authority.

## 16. PROGRESS-PHOTO / SCAN RULING

[HELD FOR WAVE 3 — filled from PHOTO-SCAN-CHAIN-TRACE.md when the
production-chain proof lands. The ruling will fix the landing
treatment of visual intelligence and its privacy constraints.]

## 17. PHOTO → COACH PRODUCTION-CHAIN RESULT

[HELD FOR WAVE 3 — the A/B/C/D chain classification with evidence, and
the product-gap record + contract design if warranted.]

## 18. PARTNERS RULING

Evidence: Partners renders as one of two equal top navigation tiles
beside Progress photos; its content is accountability (partner shared
streak deliberately retained per its own earlier ruling); tap fires
telemetry + navigates.

**Ruling (lead, D33):** Partner accountability is a valued feature but
it is not evidence of MY progress. It does not justify visual parity
with the app's differentiator. DEMOTE to the utilities grid ("More"
family) alongside Consistency/History. Feature untouched; placement
honest. (The brief's parity concern is upheld in the opposite
direction: Progress photos rise, Partners settles.)

## 19. RECENT-SESSIONS RULING

Evidence: ≤3 SessionCards (name, date, duration, difficulty chip) +
"All sessions" → WorkoutHistory; read-only summaries; duplication with
Train history is entry-point duplication only (same underlying screen).

**Ruling (lead, D33):** KEEP as core evidence, slimmed and placed
inside/below the Training pillar: the recent-session trail is the raw
evidence behind "training is progressing". Rank: directly after the
pillar summaries. Density: the row communicates name + when + one
signal; deeper stats live in WorkoutSummary. "All sessions" stays (it
is the honest route to the archive). No duplication defect: Progress
reaches the same WorkoutHistory as Train rather than a parallel list.

## 20. LANDING VS DETAIL / ANALYTICS RULING

Existing legitimate detail destinations already cover every drilldown
the landing needs: BodyMetrics (body evidence detail), LiftProgress
(strength/PR detail), VolumeHeatmap (volume detail), Consistency
(adherence detail), WorkoutHistory/WorkoutSummary (session evidence),
ProgressPhotos (visual evidence + comparisons), Recaps/YearOfLifts
(narrative/lifetime), Partner. **Ruling:** the landing page is SUMMARY
ONLY — every chart other than the Body pillar's compact trend line and
the Training pillar's compact evidence line lives one tap away in
those existing screens. No new detail screens are built. The Training
Load 8-week chart relocates into the training drilldown path
(LiftProgress or VolumeHeatmap family — Phase 2 picks the seam;
default: a "Training" detail header section on LiftProgress).

## 21. TARGET INFORMATION HIERARCHY

- **P0 — CORE ANSWER (one region):** the three-pillar answer block —
  Training / Body / Visual, each one line of state + one line of
  evidence, computed ONLY from authoritative sources (e1RM history,
  EWMA trend, scan outputs). This is the five-things answer: three
  pillars + the evidence trail + the utilities row.
- **P1 — CORE EVIDENCE:** recent bests (named), recent sessions trail,
  weight trend figures, latest scan signal/comparison status.
- **P2 — USEFUL EXPLORATION:** volume-vs-targets strip, weekly tonnage
  line + 8-week chart (drilldown), Consistency, full PR history.
- **P3 — SECONDARY UTILITY:** utilities grid (Body Metrics, Lifts,
  Consistency, Full History, Recaps, Year of Lifts, Partners), recap
  banner (occasional), tonnage milestone moment (occasional, with the
  page's single permitted share CTA).
- **P4 — REHOME/REMOVE/RETIRE:** "For You" feed (retire), Training
  Load hero as headline (demote), Sessions/New PRs spark cards
  (retire in count form), lifetime totals panel (rehome to
  Recaps/YearOfLifts family), standing hero share CTA (remove),
  Partners' top-slot parity (demote).

## 22. EXACT TARGET PROGRESS ARCHITECTURE

Top-to-bottom. Regions marked (always) render every load; (cond)
render on their stated condition.

**R1 — HEADER (always).** "Progress". No actions. Unchanged idiom from
the app's other headers.

**R2 — THE ANSWER BLOCK (always).** Purpose: answer "am I actually
making progress?" in one glance. Content: three compact pillar rows
(NOT three bordered cards — one contained block, three rows, per §26
restraint):
- TRAINING — state line from e1RM evidence over the trailing month
  (e.g. "Strength up on 4 of 6 main lifts") + newest named best as the
  evidence line. Tap → training evidence detail (LiftProgress).
- BODY (Pro; Free sees the pillar with its honest locked affordance
  per existing read-only-guard law) — EWMA trend vs goal band + weekly
  rate. Tap → BodyMetrics.
- VISUAL (Pro, suppression-gated) — latest scan signal/comparison
  status per §16's ruling [finalised with Wave 3]. Tap →
  ProgressPhotos.
Insufficient-data states per pillar show the honest immature line and
the single most useful next action (§23 states F/G/L). Max copy: two
lines per pillar. When a pillar is suppressed (calm/ED), it renders
nothing — the block never explains a suppression.
Visual weight: the page's single hero region. No share CTA. No
imperative copy — evidence statements only (§14 law).

**R3 — EVIDENCE TRAIL (cond: any sessions exist).** "Recent sessions"
slim rows (≤3) + "All sessions". One adherence context line above them
("3 sessions this week") — quiet text, not a card. Absorbs: recent
sessions section, Sessions spark's job. Excludes: difficulty
histograms, any coaching commentary.

**R4 — PLAN EVIDENCE (cond: Pro with active plan and any sets this
Monday-anchored week).** The volume-vs-targets strip exactly as built
(muscles trained, in-range/below/over flags, stacked bar), tap →
VolumeHeatmap. Absorbs: this week's volume section unchanged. Excludes:
any "add sets" advice (retired with the feed).

**R5 — MOMENTS (cond: at most one at a time; priority order recap >
milestone).** The monthly recap banner OR the tonnage-milestone row
(with the page's single share CTA). Both remain transient and
dismissible exactly as built. Excludes: any persistent advisory
content.

**R6 — UTILITIES (always).** One grid: Body Metrics, Lifts,
Consistency, Full History, Recaps (with its existing lock/count),
Year of Lifts (conditional), Partners. Absorbs: More stats grid +
Partners tile + (as plain grid entry) nothing else. Excludes: Progress
photos tile (now the Visual pillar's tap target; the grid does not
duplicate it).

**Retired outright from the landing:** For You feed; Training Load
hero position + its share CTA; Sessions and New PRs spark cards;
lifetime totals panel (rehomed); Partners' premium slot.

## 23. STATE MATRIX (A–P)

For each brief-named state, the landing behaviour under §22:
- A (established Pro, all progressing, photos current): R2 shows three
  positive evidence states; R3–R6 full.
- B (training up, weight stalled): Training pillar positive; Body
  pillar states the flat trend factually vs goal band (no instruction;
  the coach's decision, if any, arrives via Today/Coach).
- C (weight moving, training stalled): mirror of B; Training pillar
  states "holding" evidence (e.g. "no new bests this month — holding
  steady"), still no instruction.
- D (both progressing): as A without photo recency.
- E (neither clearly): both pillars state neutral evidence honestly;
  no manufactured positivity, no advice.
- F (insufficient data): pillars show immature-state lines with the
  single next action each (log sessions / log weigh-ins / take first
  scan). No fake intelligence.
- G (no photo history): Visual pillar shows the honest empty state +
  one action ("Take your first scan"), suppression-gated.
- H (new scan/change available): Visual pillar leads with the new
  comparison status [exact copy per §16].
- I (recovery week): R2 pillars unchanged (evidence is evidence);
  R4 volume strip renders against recovery-week targets exactly as the
  underlying data provides; NO deload advisory appears (retired).
- J (recent programme adjustment): no Progress banner; the decision
  lives on Today/Coach. Evidence lines simply reflect the data.
- K (Free): Training pillar + R3 + utilities fully live; Body/Visual
  pillars render their honest locked affordances (read-only-guard law
  unchanged); no Pro card teasing beyond the existing gate idioms.
- L (new user): F's shape with welcome-free copy (no marketing voice on
  an evidence page).
- M (large legacy For You backlog): feed no longer renders; Phase 2
  stops reads/writes — backlog rows become inert (cleanup per §30).
- N (multiple PR/progression events): Training pillar names the best
  2–3; the rest are counted only inside LiftProgress.
- O (lb user): every weight figure through the existing unit
  formatters; no mixed units on one surface (guarded).
- P (no recent sessions): R3 collapses; Training pillar states the gap
  factually ("No sessions in the last N days") with no shame copy and
  no instruction (re-entry is Today's job under C22 rank 6).

## 24. PROGRESS LANDING DENSITY BUDGET

Grounded in the founder transcription (a real large-phone layout that
still buried the answer) and the current counts (30 containers/25
CTAs):
- Above the fold on a representative large phone: header + the FULL
  answer block (all three pillars) + the start of the evidence trail.
  THE ANSWER FITS ABOVE THE FOLD — that is the budget's one absolute.
- Max primary bordered containers above the fold: 2 (answer block +
  first evidence card).
- Max bordered containers on the whole landing: 7.
- Max primary CTAs above the fold: 0 standing CTAs (pillar rows are
  tappable but render as rows, not buttons).
- Max share CTAs per render: 1, and only inside a Moment (R5).
- Max advisory/moment items per render: 1 (R5's own rule).
- Max copy per pillar: 2 lines; per evidence row: 1 line + metadata.
- Scroll depth to reach ALL of body/visual/training evidence: zero
  scrolls for the summary (R2); one screen-height for R3/R4.

## 25. COPY FINDINGS

(Logic-first; retired surfaces' copy dies with them.)
- "Your traps hasn't had much work…" — grammar defect at the template
  (singular verb vs plural display name); moot on retirement, recorded
  so the pattern (verb agreement against MUSCLE_DISPLAY_NAMES) is not
  recreated in pillar copy.
- "Time to add a little weight next session." / "Adding a set or two
  this week…" — prescription leakage; retired under §11/§12.
- "Training load" — semantically loose label for tonnage; renamed
  "Weight lifted" (§6).
- "New PRs / 115 / Last 30 days" — unexplained metric + false
  precision-of-meaning; replaced by named bests (§8).
- "That's what showing up adds up to." — motivational filler on an
  evidence surface; acceptable ONLY inside the transient milestone
  moment (it is share-voice), never as standing copy.
- "For you" — vague label; section retired.
- Timeframe language must name its window wherever a figure appears
  ("Last 30 days", "This week (Mon–Sun)") — one week definition
  page-wide (§6 defect fix).
- The evidence-line voice for pillars: calm, factual, no imperatives,
  no shame, British English, no em dash — per existing voice law.

## 26. STYLE / FORMAT FINDINGS

(Presentation assessed after logic, per the brief.)
- Warning-yellow is currently spent on non-alerts (advisory feed) —
  after retirement, yellow returns to meaning something.
- Two raw-text runs float outside containers (milestone row, momentum
  note); under §22 the milestone becomes a contained Moment row and the
  momentum note's job (early-data encouragement) is absorbed by pillar
  immature states.
- Repeated identical outline buttons ("Create share image" ×2) —
  resolved by §9.
- The answer block is ONE container with internal rows — the page must
  not become 3 more hero cards; "why does this need a box?" applies:
  section labels + spacing carry R3/R6; cards are reserved for the
  answer block, session rows, volume strip, and Moments.
- Charts: the landing keeps at most the Body pillar's compact spark;
  all full charts live in drilldowns (existing chart components
  reused — no new chart idioms).
- Number formatting: existing formatNumber/formatBodyWeight/
  formatTonnage everywhere; no new precision anywhere (no decimals on
  tonnage; rate precision as WeightTrendCard already renders).
- Tiles/rows/buttons follow the existing theme tokens and the Home
  (C22) interaction idioms: quiet tinted rows for tappable lines, one
  accent per element.

## 27. KEEP / DEMOTE / MERGE / REHOME / REMOVE / RETIRE TABLE

| Current surface | Verdict |
|---|---|
| Training Load hero (position + label) | DEMOTE to drilldown; relabel "Weight lifted"; Monday-anchored |
| Training Load 8-week chart | KEEP (drilldown) |
| Hero "Create share image" CTA | REMOVE |
| Sessions spark card | RETIRE (job → R3 context line + Consistency) |
| New PRs spark card | RETIRE (job → named bests in Training pillar + LiftProgress) |
| Tonnage milestone row + its share CTA | KEEP as Moment (R5), contained |
| Load-error / empty / momentum states | KEEP; momentum note MERGE into pillar immature states |
| Recap banner | KEEP as Moment (R5) |
| "For you" feed (all 6 classes) | RETIRE (SA defects §28; `gentle_rhythm` content may re-enter as a pillar evidence line) |
| Partners tile (top slot) | DEMOTE to utilities grid; feature KEEP |
| Progress photos tile | MERGE into Visual pillar (elevated; §16) |
| Weight trend card | KEEP, PROMOTE to Body pillar (compact) |
| Recent sessions + All sessions | KEEP (R3, slimmed) |
| This week's volume strip | KEEP (R4, unchanged) |
| Lifetime totals panel | REHOME to Recaps/YearOfLifts family |
| More stats grid | KEEP (R6, absorbs Partners; drops Progress photos duplicate) |
| Recaps / Year of Lifts tiles | KEEP (R6, unchanged gates) |
| ShareCardScreen + card types | KEEP (unchanged; call sites per §9) |
| insights DB table + engine | RETIRE from this surface (Phase-2 cleanup per §30) |

## 28. SUSPECTED PRODUCT DEFECTS

**Stale-authority defects (most serious):**
- SA-1: `peaked_lift`/`stalled_lift` — live second progression
  authority; can contradict the C20 resolver's founder-ordered senior
  gate (FORYOU-AUTHORITY-TRACE.md M1/M3).
- SA-2: `under_mev_muscle` — manual programme prescription with zero
  deload awareness despite isDeload being fetched in the same load
  (M4).
- SA-3: `deload_due` — parallel deload thresholds that can disagree
  with weeklyCoach's own deload state.
- SA-4: severity-2 recovery/fatigue advisory content with NO ED/calm
  suppression, against the app-wide gating pattern (M5). This one is
  also safety-adjacent: Phase 2 retires the feed, which resolves it;
  if any interim ship happens before retirement, suppression parity
  must be added first.
**Information-architecture defects:**
- IA-1: hierarchy inversion — workload headline, answer buried (§3/§5).
- IA-2: two "this week" definitions on one screen (rolling vs
  Monday-anchored) — verified at source (§6).
- IA-3: PR count without per-day dedup inflates on new users (§8).
- IA-4: `actionPayload` generated/synced but never read — dead field
  (M2); `rankAndCapInsights` dead code.
- IA-5: stale comment "New bests" (AnalyticsScreen.js:610) after
  rename.
**Visual defects:** raw text outside containers ×2; duplicate share
CTAs; warning styling on non-alerts (§26).
**Coaching/engine gap:** [photo→coach chain — held for §17/Wave 3].

## 29. PRESERVATION CONTRACT (BINDING ON PHASE 2)

Unchanged and untouchable in the redesign: Campaign 20 resolver and
Campaign 21 coach graph (no Progress code may compute training or
nutrition decisions); EWMA weight-trend derivations and effective-
maintenance logic; session/PR/volume history data and their detail
screens; photo privacy law (raw photos local; no body-fat claims; no
scan-derived calories; no Katch-McArdle; no cloud photo inference);
scan quality/confidence logic; share-card GDPR law incl. the single
before/after exception and its calm/ED withholding; usePhotoSuppression
fail-closed behaviour; tier gates (withProGuard/withReadOnlyProGuard
semantics); free/pro feature boundaries (no new paywall strategy);
navigation destinations (every current child screen remains reachable);
existing telemetry truth (no metric redefinition without a rename);
accessibility labels' information content; analytics data itself — UI
simplification deletes NO underlying evidence, only re-surfaces it.

## 30. IMPLEMENTATION PLAN (NO CODE — Phase 2 map)

Likely-affected files: `src/screens/AnalyticsScreen.js` (landing
restructure to R1–R6); `src/hooks/useProgressData.js` (pillar
summary derivations from existing data; Monday-anchored load series
option; PR dedup for any surfaced count); `src/lib/progressSeries.js`
(week-boundary parameter); NEW `src/components/progress/`
(AnswerBlock/pillar rows, evidence rows) following the C22 component
pattern; `src/components/TrainingLoadHero.js` (relocate into training
drilldown surface, likely LiftProgressScreen section); retirement
seams: `src/lib/insightsEngine.js` (stop generation),
`AnalyticsScreen` feed render, insights table reads/writes (additive:
stop-use, no destructive migration; sync registry entry handling per
supabase rules doc); `src/screens/LiftProgressScreen.js` (named-bests
source + relocated chart); ShareCard call-site removal (hero);
YouScreen/Recaps (lifetime totals rehome); tests per §31. Progress
scan landing integration per §16/§17 outcome. Staged like C22: Stage 1
answer block + retirements, Stage 2 pillar detail + rehomes, Stage 3
guards/state matrix/gates/merge.

## 31. TEST PLAN (Phase 2)

- Authority guards (source-level, the C22 convention): no imperative
  training/nutrition copy on Progress (regex guard over the landing
  tree); no insightsEngine import on any screen; no second computation
  of load progression outside livePrescription (grep guard).
- Week-boundary guard: one week definition on the landing (all series
  Monday-anchored via dayKey).
- Pillar derivation unit tests against fixed fixtures (strength-up,
  holding, insufficient); PR dedup property test (one session cannot
  produce >1 counted best per exercise per day).
- Suppression: Visual/Body pillar silence under open ED flag + calm
  mode (fail-closed loader tests, mirroring firstReviewLine's pins).
- State-matrix mounted suite (A–P states, screen-mount conventions,
  as C22's stateMatrix suite).
- Share budget guard: ≤1 share affordance per landing render.
- Tier guards: Free renders Training pillar + utilities; Body/Visual
  locked affordances; no Pro leak.
- Preservation re-pins with rationale for every retired/moved guard
  (existing suites: rollingNumber guard, recap gates, tile tests).

## 32. MASTER SCREEN UX REGISTER

Created (first version, lead-corrected):
`docs/ux-screen-programme-2026-08-17/SCREEN-UX-REGISTER.md` — 80
production screens across 8 groups with routes, entry points, tier
gates, dual-use notes and the Global Screen Completion Law verbatim.
Statuses: Home IMPLEMENTED (device validation pending), Analytics
IN_AUDIT, all else UNREVIEWED (ActiveWorkout explicitly returned to
UNREVIEWED at lead review — its C20 logic landing is not screen
completion). **Recommended next screen after Progress: `ActiveWorkout`
(Live Workout).** Rationale: highest user-impact surface in the app
(every training minute lives there), carries fresh C20 logic whose
presentation was never UX-audited, and its founder device retest is
already queued — one campaign can close both. Risk-adjacent
alternative: WeeklyCheckIn (coach front door). Not started, per the
brief.

## 33. GENUINE FOUNDER RULINGS

[HELD — finalised after Wave 3 so the photo rulings carry the chain
evidence. Expected set (§16/§17 dependent): R1 visual-intelligence
landing treatment; R2 photo→coach evidence contract go/no-go; R3 (only
if Wave 3 evidence makes it genuine) scan-signal copy exposure level.
Every other decision in this spec is ruled inline under D33 with
rationale and alternatives recorded.]

## 34. FINAL VERDICT

**B. PROGRESS MOSTLY LOCKED — SPECIFIC FOUNDER RULINGS REQUIRED.**
The architecture, hierarchy, authority repairs, density budget, state
matrix and preservation contract are locked and internally consistent;
the founder rulings in §33 (photo-intelligence surface + photo→coach
contract) gate only the Visual pillar's final shape, not the rest of
the implementation plan.
