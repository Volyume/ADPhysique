Status: COMPLETE | Timestamp: 2026-06-02 | Phase 5: Redesign proposal

# Progress tab redesign proposal

A complete, specific redesign. It keeps the engine and the strong individual
surfaces (Volume Heatmap, strength standing, Body Metrics, Year of Lifts) and
rebuilds the organisation around the four questions a lifter actually asks. It
is subtractive: most of the work is consolidating three-into-one and giving the
landing a hierarchy. Nothing here is built in this pass; it is a specification.

Hard constraints honoured throughout: `#0D0D0D` background, no gradients, amber
`#F5A623` as the single accent, tiered radii, adherence-neutral colour, tabular
numerals, one footnote per surface, no gamification, plain no-cheerleading copy.
All tokens from `src/styles/theme.js`.

## The organising idea

A lifter opens Progress to answer one of four questions:

1. Am I getting stronger?
2. Am I training each muscle enough to grow?
3. Is my body actually changing?
4. Am I showing up and recovering?

The redesign is a hub with one glanceable headline, then four surfaces, one per
question. Each surface leads with a single read and keeps its depth one tap
down. Every duplicate is collapsed into the surface that owns the question.

## 0. The headline, "where you stand"

At the top of the Progress landing, above everything, one read that is true
every visit.

- **Primary line:** the overall strength standing already computed by
  `summariseStrengthStanding` (`strengthStandards.js`): the tier
  (Beginner..Elite) "across N main lifts", and the single nearest rank-up ("12
  kg from Advanced on Squat"). This is the one-glanceable-read for the whole
  tab.
- **Secondary line:** direction of travel over the last 4 weeks, one short
  factual clause: "Estimated maxes up on 4 of 6 main lifts" or "Holding steady".
  Derived from the e1RM trajectory the Lifts surface already computes.
- Behaviour: before a bodyweight is logged, the line falls back to the e1RM
  direction alone and a quiet prompt to add bodyweight (reuse the PR Wall
  prompt). No tier is shown without bodyweight, and the lbs/kg ratio bug guard
  at `PRWallScreen.js:158` is preserved.
- Copy: factual, no praise. "Intermediate across 5 lifts. 12 kg from Advanced on
  Squat." Not "Great work, you're crushing it."

This replaces the mesocycle-pulse card as the thing on top. The meso pulse moves
into surface 4 (it is a recovery/consistency concern, not the headline).

## 1. Surface: Lifts (am I getting stronger?)

One surface that owns every per-lift read. It absorbs Lift Progress, the PR
Wall, and the per-lift trend currently duplicated on Exercise Detail.

- **Lead read:** estimated 1RM trajectory. A list of lifts, most recent first,
  each row showing the lift, its current estimated max, the delta over the
  chosen window, and a sparkline. This is `buildLiftProgressRows`
  (`liftProgress.js`) as it already exists, promoted to the lead.
- **Window selector** shared with the rest of the tab (see §5 on the standard
  windows): 6 weeks / 6 months / all. Replaces the PR Wall's hard-coded
  "last 20 sessions" and the various ad-hoc windows.
- **Tap a lift** to open the per-lift detail: the full e1RM chart (trendline,
  faint raw points), heaviest weight and best set with dates, the relative
  strength ratio and tier for that lift, and the "last time you did this:
  weight x reps" read that the sentiment research says lifters want most. This
  is the merged content of PR Wall's per-exercise card and Exercise Detail.
- **PRs are folded in, not a separate wall.** A PR is a marker on the lift's own
  trajectory (a dot, or a small "PR" tag on the row), plus an optional "recent
  bests" filter at the top of the list. This removes the conceptual split
  between the PR Wall's per-exercise model and the Analytics sparkline's
  running-max model: there is one PR definition, shown on the lift it belongs
  to.
- **Share** stays available from a lift's detail (reuse the existing ShareCard
  path), via a long-press or an action in the detail, not a per-row icon (avoids
  decorative-icon creep).

Net effect: three trend surfaces become one, with the highest-signal metric
(e1RM trajectory) leading, and "did I beat last time" one tap away.

## 2. Surface: Volume (am I training each muscle enough?)

The Volume Heatmap is already the best surface in the tab and the product's
clearest point of view. Make it the single home for volume and delete the other
two.

- **Keep** the body diagram, the per-muscle bars with MEV/MAV/MRV ticks, the
  ghost bar for the previous window, last-trained recency, and the 4-week
  sparkline. This is genuinely differentiated and matches the RP model.
- **Remove** the Analytics snapshot grid and the Coach Review volume table.
  Their job (this-week volume per muscle) is done better here. The landing keeps
  only a compact summary card that drills in (see §6).
- **Standardise the window** to the shared set (this week / 4 weeks), keeping
  the selector.
- **Finish landmark sync.** Custom MEV/MAV/MRV are AsyncStorage-only today
  (`VolumeHeatmapScreen.js:68`). Promote them to a synced store so the setting
  survives a reinstall, which the identity rules make a normal event. This is
  the one piece of plumbing the redesign should not skip, because the surface is
  being promoted to the centrepiece.
- **One footnote**, explaining MEV/MAV/MRV in a sentence the first time, then
  not again.

## 3. Surface: Body (is my body changing?)

Keep Body Metrics broadly as-is (it is strong) and add the one missing piece.

- **Lead read:** trend weight. The EWMA line is already correct; make it the
  hero, with the raw points faint behind it and the weekly change in kg/week
  underneath. Lead with the trend, never the raw scale number (the MacroFactor
  principle the research backs).
- **Add progress photos.** This is the single biggest content gap and the only
  place the physique apps clearly beat Volyume. A photo timeline (front / side,
  same framing, every few weeks), stored locally with the same opt-in and
  privacy posture as the rest of Body Metrics, optionally synced. Photos are the
  spine a physique user hangs the numbers off. This is the headline new feature
  of the redesign. (Privacy, storage and sync need their own short design note
  before build; flagged in doc 06.)
- **Keep** measurements (nine sites), body fat trend, the adaptive daily-burn
  estimate, phase chip and history table. Keep delta badges neutral.
- **Cadence cue:** a quiet "last logged N days ago" rather than any nudge to log
  daily; the research is clear that 2 to 4 weeks is the right rhythm and daily
  measurement is discouraging noise.

## 4. Surface: Consistency and recovery (am I showing up and recovering?)

One surface that absorbs the three "days trained" visualisations and the
readiness/coaching signals, framed as facts.

- **Lead read:** one training calendar (the 12-week grid is fine) with a single
  factual line: "Trained N days in the last 12 weeks, about X a week." No
  streak, no flame, no nudge to protect it.
- **Frequency:** sessions per muscle this week vs last, kept (it is useful and
  not duplicated elsewhere once the volume grids are gone).
- **Recovery read:** the deload/lighter-week recommendation
  (`shouldDeload`) and the readiness signals, stated plainly with their one
  reason. ACWR stays here as a single line ("Training load: optimal"), not a
  multi-figure card, because the ratio matters more than the raw tonnages.
- **This week's review folds in here.** The weekly Coach Review (wins,
  recommendations) becomes the "this week" expansion of this surface rather than
  a separate screen, so there is one place for "how was this week".
- **Surface the unused signal, lightly.** Session difficulty over time, and
  check-in energy/sleep, can each become a small trend here once there is data,
  rather than being logged and never shown. Optional, low priority, but it is
  signal already collected.
- **Mesocycle pulse** (name, week, % complete, tonnage sparkline) lives here as
  the "where am I in the block" read.

## 5. Standard windows and vocabulary

Pin down the rhythm so cards can be compared.

- **Standard windows:** this week (Mon to Sun), 4 weeks, 6 months, all time.
  Surfaces pick from this set; no more 2-week, 6-week, 20-session one-offs.
  Recency reads (last trained) stay relative.
- **Vocabulary, fixed:** "Volume" = working sets per muscle per week. "Tonnage"
  = weight x reps. "Load" = ACWR only. "Sets" = working sets unless a card says
  otherwise. Use these consistently in copy and labels.

## 6. The landing, rebuilt as a hub

Replace the fourteen-card scroll with:

1. **The headline** (§0): strength standing + direction of travel.
2. **Four cards**, one per surface, each showing its single lead read and
   drilling in on tap:
   - Lifts: "5 lifts trending up" + the top mover.
   - Volume: a compact per-muscle status strip ("3 muscles below target this
     week") drilling into the Heatmap.
   - Body: trend-weight direction ("Up 0.3 kg/week") drilling into Body Metrics,
     or the opt-in prompt if physique tracking is off.
   - Consistency and recovery: "Trained 4x this week. Load optimal." with the
     deload banner promoted to the top of this card only when it fires.
3. **Recent sessions** (last 3) kept, it is the natural "what did I just do".
4. **Insight stack** kept but capped (it is the one place a written, coach-style
   note belongs), and the deload banner shown here only when active.
5. **Year of Lifts** as a tile, unlocking at 365 days, unchanged.

Everything else on the current landing (the standalone volume grid, ACWR card,
session-length trend, frequency table, PR sparkline, standalone calendar) moves
into the four surfaces above. The landing becomes a map, not a dump.

## 7. What gets cut or merged, explicitly

- **Cut:** Analytics volume snapshot grid (→ Volume surface), Analytics PR
  sparkline (→ Lifts, as PR markers), Analytics standalone calendar and
  frequency table and session-length and ACWR cards (→ Consistency surface).
- **Merge:** PR Wall + Lift Progress + Exercise Detail trend → one Lifts
  surface. Coach Review → the "this week" expansion of the Consistency surface.
- **Keep, promoted:** Volume Heatmap (centrepiece), strength standing
  (headline), Body Metrics (+ photos), Year of Lifts, Workout History (the log).
- **Keep, demoted:** mesocycle pulse (→ Consistency surface), insight stack
  (→ landing, capped).

## 8. What this is not

It is not a rewrite of the maths. `algorithms.js`, `liftProgress.js`,
`strengthStandards.js`, `nutritionEngine.js` and the database functions are
sound and stay. It is not a new visual style; it uses the existing tokens. It
does not add gamification. The new build work is: the photo feature, the hub
landing, the merged Lifts surface, and landmark sync. Everything else is moving
and deleting cards that already exist.

## 9. Open questions for the founder (before build)

1. **Progress photos:** in scope for this redesign, or a fast follow? It is the
   biggest new piece and needs its own privacy/storage/sync note.
2. **Coach Review:** fold into the Consistency surface as proposed, or keep it
   as a distinct weekly screen the user opens deliberately?
3. **Pro gating:** which of these surfaces, if any, sit behind Pro? Body Metrics
   is opt-in/Pro today; the redesign should decide the line deliberately rather
   than inherit it.
4. **Depth of the unused signal:** surface difficulty and sleep/energy trends
   now, or leave them as engine inputs only?
