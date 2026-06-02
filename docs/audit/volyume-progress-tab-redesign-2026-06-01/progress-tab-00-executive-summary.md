Status: COMPLETE | Timestamp: 2026-06-02 | Phase 0: Executive summary

# Progress tab redesign, executive summary

The Progress tab is not short of capability. It already computes almost every
metric a serious hypertrophy app would want: estimated 1RM per lift, per-muscle
weekly volume against MEV/MAV/MRV landmarks, tonnage, PR detection, a relative
strength standing, smoothed bodyweight trend, an adaptive daily-burn estimate,
deload signals, training-load (ACWR), frequency and a year-in-review. The engine
is strong.

The problem is not the metrics, it is the arrangement. The tab grew by
accumulation: pieces of the retired Athlete Hub dashboard, a late-fixed Lift
Progress tile, a strength-standing headline and a weight-trend chart all landed
here across separate sessions, and nothing was taken away when something new
arrived. The result is what the founder described: mismatched, a bit messy,
patched together.

Three things make it read that way.

1. **The same answer is given three times.** Per-muscle volume is shown on the
   Analytics landing, again on the Volume Heatmap, and again on the Coach
   Review. Lift trend (estimated 1RM over sessions) is shown on Lift Progress,
   again on the PR Wall, and again on Exercise Detail. "Days trained" is shown
   as a 12-week calendar, a frequency table and a history calendar. A user
   cannot tell which surface is the real one.

2. **The landing is a long scroll of roughly fourteen cards.** AnalyticsScreen
   stacks mesocycle pulse, fatigue trend, block progress, readiness cards, a
   deload banner, an insight stack, recent sessions, a volume grid, ACWR,
   session-length trend, a frequency table, a PR sparkline, a 12-week calendar
   and a tile grid. Each card is defensible alone. Together they have no
   hierarchy, so nothing leads.

3. **Windows and terms drift.** "This week" is hard-coded in some places and
   selectable in others. "Volume" means working sets in one card and tonnage in
   the next. Time windows run 7 days, 2 weeks, 4 weeks, 6 weeks, 12 weeks, 20
   sessions and 365 days with no shared rhythm.

There are also real gaps. There are no progress photos, which the research
calls the single most honest physique record and which every physique-tracking
competitor ships. Session difficulty and check-in energy/sleep are logged but
never trended. The single high-signal strength metric, estimated 1RM
trajectory, is buried rather than led with.

## The proposed shape

Redesign subtractively, around the four questions a lifter actually asks, with
one glanceable headline above them:

- **Headline, "where you stand":** the existing strength standing plus the
  direction of travel. One read, at the top, every visit.
- **Are you getting stronger?** One unified Lifts surface. Estimated 1RM
  trajectory per lift, PRs folded in. Replaces the three separate trend views.
- **Are you training each muscle enough?** One Volume surface, the heatmap with
  its window selector and landmarks. This is Volyume's genuine differentiator
  (MEV/MAV/MRV framing) and almost no competitor has it. Remove the duplicate
  grids elsewhere.
- **Is your body changing?** Body Metrics, kept, with trend weight done
  properly and progress photos added.
- **Are you showing up and recovering?** One consistency-and-recovery surface:
  a single training calendar, frequency, and the deload/readiness read, framed
  as facts not streaks (the house rule is no gamification).

Year of Lifts stays as the annual artefact. The weekly Coach Review folds into
the recovery surface as the "this week" read rather than a parallel screen.

## Highest-impact bets

1. Collapse the three volume views into one and the three lift-trend views into
   one. This removes most of the "patched together" feel on its own.
2. Rebuild the landing as a hub: headline plus four cards that each drill into
   one of the four areas, instead of a fourteen-card scroll.
3. Lead with estimated 1RM trajectory, the research's highest-signal progress
   metric, and with the strength standing that is already computed.
4. Add progress photos. It is the clearest missing piece for a physique user.

Nothing here is built in this pass. Docs 01 to 04 are the audit and research,
05 is the design specification, 06 is the staged build list. All of it honours
the locked constraints: `#0D0D0D`, amber accent, no gradients, tiered radii,
adherence-neutral colour, plain copy, no gamification, no AI fingerprint.
