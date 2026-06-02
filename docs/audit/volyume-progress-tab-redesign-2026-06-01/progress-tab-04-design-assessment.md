Status: COMPLETE | Timestamp: 2026-06-02 | Phase 4: Design assessment

# Progress tab design assessment

How the current tab reads against the locked design and voice constraints
(CLAUDE.md, `src/styles/theme.js`). The token discipline is largely good; the
problems are composition and hierarchy.

## What is already right

- **Background and accent.** The locked `#0D0D0D` and the single amber accent
  are held. No gradients, no orbs, no glow.
- **Adherence-neutral colour where it counts.** Body Metrics delta badges are
  neutral, not green-up / red-down. This is the correct, hard-won choice for a
  sensitive metric, keep it and extend it.
- **Tabular numerals** are applied on the PR Wall and Analytics, so figures do
  not jitter as they update.
- **Empty-state restraint on the landing.** Holding multi-session charts back
  until three sessions exist is the right instinct, a fresh account does not see
  a wall of empty grids.

## Where the design slips

### 1. No hierarchy on the landing

Fourteen cards of near-equal visual weight is the core design failure. There is
no hero, no clear "read this first". The eye has nowhere to land. This is the
opposite of the one-glanceable-read principle the Diary redesign already adopted
for the calorie ring.

### 2. Status colour carries two different meanings

`getVolumeStatus` uses green for optimal volume and red for over-MRV. The
strength-level scale uses green for Intermediate and blue for Advanced. So green
means "good" in one place and "middle tier" in another, and the user has to
re-learn the colour on each card. The redesign should pick one semantic system
per surface and not reuse a colour for a different idea on the same screen.

### 3. Three volume visualisations, three visual languages

The Analytics snapshot grid (dots + counts), the Heatmap (body diagram + bars +
landmarks) and the Coach Review table (badges) all show this-week volume in
three different visual idioms. Even if they were not redundant in data, they are
redundant in concept and inconsistent in form.

### 4. Card-shape drift

Cards across the tab vary in radius, padding and internal rhythm because they
arrived from different screens at different times (the Athlete Hub readiness
cards especially). One card language should govern the whole tab, the way the
Diary proposal sets one reference card.

### 5. Decorative-icon and footnote creep risk

The quick-nav tile grid and several cards lean on Ionicons as row decoration,
which the house rules warn dilutes the amber affordance. And coaching lines
under charts ("Sessions getting shorter") are useful once but multiply into
footnote creep across fourteen cards. One footnote per surface, at most.

### 6. Year of Lifts is the one place gamification is acceptable, and it earns it

The Wrapped-style story is celebratory but it is an annual artefact, opt-in by
its nature, and not a daily streak mechanic. It does not breach the
no-gamification rule and should be left alone. The line to hold is elsewhere:
do not turn the consistency calendar into a streak the user is nudged to defend.

## Design principles for the redesign

1. **One read per surface, on top.** Hero numeral or single chart, then depth
   below.
2. **One card language** for the whole tab: shared radius, padding, label
   weight, drawn from `theme.js`.
3. **One semantic colour system per surface.** Volume status is the only place
   that should map colour to good/over; everything else stays neutral or amber.
4. **Subtractive.** Removing the duplicate surfaces is itself the biggest design
   win; fewer, better cards.
5. **Hold the lines:** `#0D0D0D`, amber only, no gradients, tiered radii,
   neutral deltas, tabular numerals, one footnote per surface, no streaks, plain
   copy with no cheerleading.
