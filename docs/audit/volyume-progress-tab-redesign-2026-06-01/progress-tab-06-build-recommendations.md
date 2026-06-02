Status: COMPLETE | Timestamp: 2026-06-02 | Phase 6: Build recommendations

# Progress tab build recommendations

A staged build list derived from the proposal (doc 05). Ordered so the biggest
"patched together" wins land first with the least risk, and the one genuinely
new feature (photos) is sequenced after the consolidation it depends on. Nothing
here is built yet; this is the plan to approve.

Each item notes the surfaces and files it touches. The maths libraries
(`algorithms.js`, `liftProgress.js`, `strengthStandards.js`, `nutritionEngine.js`)
are not rewritten; the work is presentation, consolidation and one new feature.

## Stage A, consolidation (highest win, lowest risk)

These remove duplication and are mostly deletion plus moving existing components.

- **A1. One volume surface.** Make Volume Heatmap the only home for per-muscle
  volume. Remove the Analytics snapshot grid and the Coach Review volume table;
  replace each with a compact summary that navigates into the Heatmap.
  Files: `AnalyticsScreen.js`, `CoachReviewScreen.js`, `VolumeHeatmapScreen.js`.
- **A2. One Lifts surface.** Merge the PR Wall and Lift Progress into a single
  Lifts list led by e1RM trajectory, with PRs as markers on each lift. Point the
  Exercise Detail trend at the same computation. Reuse `buildLiftProgressRows`
  and `summariseStrengthStanding`.
  Files: new/renamed Lifts screen, `PRWallScreen.js`, `LiftProgressScreen.js`,
  `ExerciseDetailScreen.js`, `RootNavigator.js`.
- **A3. One consistency surface.** Fold the standalone calendar, frequency
  table, session-length trend, ACWR and mesocycle pulse into a single
  Consistency-and-recovery surface; fold Coach Review into its "this week"
  expansion. Frame consistency as a fact, no streak.
  Files: `AnalyticsScreen.js`, `CoachReviewScreen.js`, new surface.
- **A4. Standard windows and vocabulary.** Adopt the fixed window set (this
  week / 4 weeks / 6 months / all) and the fixed vocabulary (volume, tonnage,
  load, sets) across all surfaces. Replace the ad-hoc 2-week / 6-week /
  20-session windows.
  Files: all progress screens; consider a shared window constant.

Add tests alongside: the merged Lifts surface and the consolidated volume read
should each get a render/selection test, and the e1RM/PR fold-in should assert
one PR definition is used (no divergence between the old sparkline and per-lift
models).

## Stage B, the hub landing

- **B1. Headline.** Build the "where you stand" header: strength standing +
  4-week direction of travel, with the no-bodyweight fallback and the lbs/kg
  ratio guard preserved.
  Files: `AnalyticsScreen.js`, `strengthStandards.js` (read only).
- **B2. Four hub cards.** Replace the fourteen-card scroll with the headline,
  four lead-read cards (Lifts, Volume, Body, Consistency), recent sessions, a
  capped insight stack, and the Year of Lifts tile. The deload banner shows only
  when active, on the Consistency card.
  Files: `AnalyticsScreen.js`.
- **B3. One card language.** Apply a single card style (radius, padding, label
  weight) from `theme.js` across the tab, and one semantic colour system per
  surface (volume status keeps good/over colour; everything else neutral or
  amber).
  Files: progress screens, possibly a shared card component.

## Stage C, the new feature: progress photos

Sequenced after consolidation because it lands inside the Body surface and
should not be built on top of a moving target.

- **C0. Design note first.** Before any code, a short note covering: local
  storage location and size, the opt-in and privacy posture (same as Body
  Metrics, photos are sensitive), whether and how they sync (and the cost), and
  deletion on sign-out (the identity rules wipe local data on sign-out, so
  photos must follow that). Do not build until this is agreed.
- **C1. Photo timeline.** Front/side capture with consistent framing guidance,
  a timeline view, and a compare-two view. Stored under the Body Metrics opt-in.
  Files: `BodyMetricsScreen.js`, new photo store, schema/migration if synced.
- **C2. Trend weight as the Body lead.** Promote the EWMA trend to the hero of
  the Body surface, raw points faint behind it.
  Files: `BodyMetricsScreen.js`.

Photos touch a runtime-critical, privacy-sensitive area, so they follow the
stronger discipline: tests alongside, additive schema if synced, and the
sign-out wipe path verified.

## Stage D, plumbing and polish

- **D1. Finish landmark sync.** Promote custom MEV/MAV/MRV from AsyncStorage to
  a synced store so the setting survives a reinstall. Additive, client-local to
  start if a server table is not wanted yet, but it must survive the
  install/identity lifecycle.
  Files: `VolumeHeatmapScreen.js`, `database.js`, possible migration (track in
  `supabase/README.md` per the migration rule if it touches the server).
- **D2. Surface unused signal (optional).** Small trends for session difficulty
  and check-in energy/sleep on the Consistency surface, once data exists.
- **D3. Performance.** If long-term users lag on the landing, cache the
  computed reads or page the set loads rather than reloading all sets on every
  focus. Measure before optimising.

## Sequencing and risk

- Stage A is the bulk of the "patched together" fix and is low risk: it is
  mostly deletion and moving existing, tested components. Do it first.
- Stage B depends on A (the hub cards drill into the consolidated surfaces).
- Stage C is the only net-new feature and the only one needing a fresh design
  note and migration thought; it is sequenced last of the user-facing work and
  gated on C0.
- Stage D can run in parallel once A is done.

## Definition of done for the redesign

- Per-muscle volume is shown in exactly one place; lift trend in exactly one
  place; "days trained" in exactly one place.
- The landing leads with one read and is a hub, not a scroll.
- Windows and vocabulary are consistent across surfaces.
- Trend weight, not scale weight, leads the Body surface, and progress photos
  exist (or are explicitly deferred by the founder).
- No new gamification; all locked design and voice constraints intact.
- Tests added alongside each consolidation and the photo feature; full suite
  green before each push.

## Open questions (carried from doc 05)

1. Progress photos in this redesign or a fast follow?
2. Coach Review folded into Consistency, or kept distinct?
3. Pro gating line across the four surfaces?
4. Surface difficulty and sleep/energy trends now, or leave as engine inputs?
