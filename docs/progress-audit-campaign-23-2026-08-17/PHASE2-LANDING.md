# CAMPAIGN 23 PHASE 2 — IMPLEMENTATION LANDING (2026-08-17)

Progress redesign implemented in full against PROGRESS-UX-SPEC.md (all
34 sections binding) and the two locked founder rulings
(FOUNDER-RULINGS-PHASE2.md: R1 derived signal only; R2 connect the
bounded corroboration), recorded as D99 with the privacy-law amendment
D99-3.

## What landed (branch `claude/campaign23-progress-impl`, merged to main)

- **Stage 1** (`1c84531c`, lead-built hands-on): the R2 photo→coach
  connection. `buildPhotoCorroborationBasis` reduces the scan summary
  to a coarse `{eligible, scanDirection}` (never a score/band/
  estimate/id); `runWeeklyCoach` resolves the supports direction
  against ITS OWN emitted trend via the one shared classification and
  applies the existing one-step rule under the senior blocked-set (ED
  hold, FFM floor, rapid-loss, safety hold, SCOFF, calm). The emitted
  confidence is the one recorded, synced and displayed value; the D18
  render-time overlay and its photo-derived flags are retired; the
  data-hold path is unreachable by corroboration by construction.
- **Stage 2** (`b8347c55`): the six-region landing. Answer Block (one
  card, three pillar rows: Training with named dedup'd bests; Body on
  the existing trend derivation; Visual per R1 as derived signal only,
  hidden entirely for every tier under calm/ED/failed reads); For You
  feed retired (insightsEngine + user_insights left dead, no schema
  change); Training Load hero demoted to Lifts as "Weight lifted",
  Monday-anchored (DST-safe); single share CTA in the transient
  Moment slot (recap outranks milestone); lifetime totals rehomed to
  Year of Lifts; Partners demoted into the utilities grid.
- **Stage 3** (this commit): the §23 A-P mounted state matrix +
  presentation guards (suppression seniority, single-CTA budget,
  week unification, For You absence even with legacy DB rows, the §24
  density ceiling of 7 primary containers). The matrix surfaced one
  genuine defect — the Body pillar's hard-coded kg/week rate for
  lbs/stone users — FIXED at the lead review via the new
  `formatBodyWeightRate` (units.js) and re-pinned.

Lead amendments/rulings across the campaign: the Visual pillar's false
"since <month>" anchor removed (cites the comparable-scan count — the
baseline date is not carried); volume strip stays Free-visible (the
CLAUDE.md free list is senior); lifetime totals as a Year story card;
the new-user double empty state kept spec-literal; D98-style flagged
calls all recorded in commit bodies.

Known records for later sessions: WeightTrendCard.js's sibling
hard-coded "kg this week" literal (BodyMetrics detail surface);
`user_insights` still in the legacy sync registry though nothing
writes it; `prBars`/`computePRsPerWeek` and `buildWeeklySessionCounts`
now production-unreferenced in useProgressData (candidates for a
future dead-code sweep, NOT removed this campaign); the widget-storage
full-run flake (long-standing, needs its own session).

## Founder device checklist (Android, EAS build from main)

Steps 9-11 are the ED/calm safety cases.

1. Open Progress (Pro, training + weight + scan history). Expected
   top-to-bottom: header, ONE Answer Block card with Training / Body /
   Visual rows (each a state line + an evidence line, no charts, no
   commands), then sessions-this-week + Recent sessions, then This
   week's volume (only if something is logged this week), then at most
   ONE Moment, then one utilities grid. No yellow advisory cards
   anywhere, no "Time to add weight", no "add a set or two".
2. Tap the Training row. Expected: Lifts opens with the "Weight
   lifted" hero (the old Training-load chart, renamed), scrubbable,
   with its own Create share image button. Back on the landing there
   is no chart and at most one share button (inside the Moment only).
3. Tap the Body row. Expected: Body Metrics opens with the full trend
   chart. On the landing, the Body row reads weight AND weekly rate in
   YOUR display units (stone/lbs users see lbs/week, never kg/week).
4. Tap the Visual row. Expected: Progress Photos opens. On the
   landing the row shows only derived words (e.g. "Visible change /
   Leaner across your last 4 comparable scans, moderate confidence")
   — never a photo, never a percentage.
5. With fewer than 3 comparable scans: the Visual row reads the
   honest building state with the real remaining count.
6. Free account: Training row fully live; Body and Visual rows show
   the Part of Pro affordance; volume strip, sessions, consistency and
   history all still present; page reads coherently with no dead ends.
7. Cross a lifetime tonnage milestone (or in the first 7 days of a
   month with 10+ sessions): exactly one Moment shows (recap wins over
   milestone), with the page's only Create share image button.
8. Partners: now the last tile inside More stats — no longer a
   promoted row beside Progress photos (that tile is gone; the Visual
   row is the way in).
9. ED/calm: with calm mode ON, the Visual row disappears entirely (no
   locked state, no empty state) for Pro AND Free; everything else
   stays. Same with an open ED flag.
10. During a recovery week: the Progress landing shows NO recovery or
    deload advisory of any kind (that voice now lives only with the
    coach on Today/Coach surfaces).
11. Weekly check-in with a fresh eligible supporting scan: the coach
    receipt's confidence caption may read one step higher than the
    weigh-in data alone would give, and the SAME value appears if you
    reopen the decision later or on another device (recorded =
    displayed). Under calm/ED/any safety hold, no raise ever.
12. Year of Lifts (unlocked): the story now ends with a lifetime
    sessions / weight / reps card before the outro.
