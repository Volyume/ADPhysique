Status: COMPLETE | Timestamp: 2026-06-01 | Phase 3: Design and presentation

# Design and presentation audit

Assessed against the locked design rules: `#0D0D0D` background, no gradients,
amber as the single accent, tiered radii, no AI-template patterns (no three-
card filler, no decorative icon on every row, no centred carousels). Both
flows respect the locked constraints. The problem is that they do not look like
the same flow.

## The core finding: two visual languages for one job

Onboarding and the builder collect almost the same answers with completely
different controls.

- Onboarding (`ProOnboardingScreen.js`): inline expanding dropdowns
  (`Dropdown`, `:87-130`) for experience, equipment, phase and division;
  segment rows for sex, session length, units. Progress bar with "Step N of 4"
  (`:545-575`). Header with brand mark and a PRO badge.
- Builder (`ProGoalSetupScreen.js`): full-width selectable cards
  (`phaseCard`, `:657-675`) for phase, experience, equipment, recovery and
  protein; a two-column card grid for division (`goalGrid`, `:607-623`); pill
  chips for weak points (`weakPointChip`, `:635-655`) and for days and session
  length (`scheduleChip`, `:707-725`); horizontal filter tabs for division
  groups.

A user who onboards through dropdowns and later opens the builder meets a
different-looking screen for the same decisions. Neither is wrong on its own.
The inconsistency is the defect.

Recommendation: pick one selection language for the shared questions and use it
in both flows. The builder's card/chip language is the stronger of the two: it
shows the option subtitles inline, has larger touch targets, and reads as more
considered. Onboarding's dropdowns hide the subtitles behind a tap and make
the division choice (the app's differentiator) easy to skip. Move onboarding's
phase, experience, equipment and recovery questions to the same card pattern
the builder uses, and use the same chip row for days and session length.

## Within onboarding

- Hierarchy is clear and the progress bar is honest about length. Good.
- Step 3 puts the optional division question last and behind a dropdown, which
  de-emphasises the one choice that makes the plan feel specialist. For a
- competitive user this is the moment the app proves itself; it should not be
  the least prominent control on the screen.
- Step 4 mixes a plan input (recovery) with notification and steps setup in one
  screen. It works, but recovery belongs with the training questions, not with
  reminders. Consider grouping recovery into the training step.

## Within the builder

- The single long scroll is dense: nine sections in one screen. For a returning
  user who only wants to change one thing it is a lot to scroll past. It is
  defensible (one screen, everything visible) but a light grouping with section
  rules would help.
- Weak-point chips are a flat 16-item wrap with no grouping (`weakPointGrid`,
  `:629-634`). Sixteen muscles in one undifferentiated block is hard to scan.
  When this becomes division-specific (Phase 6) the list per division is
  shorter and can be grouped (for example upper, lower) which fixes the scan
  problem at the same time.
- The division grid uses generic Ionicons per goal (`body-outline`,
  `barbell-outline`, etc., `coachingGoals.js`). Per the design rules,
  decorative icons on every row dilute the amber affordance. Here they carry a
  little meaning (they differentiate the cards) so they are borderline; the
  selected state already uses amber, so the icons could go monochrome to keep
  amber as the selection signal.

## Weak-point selector, proposed shared design

One component used by both flows, so they are visually identical and only the
intro copy differs.

- A titled section "Weak points" with the optional tag inline (as the builder
  has it today, `:348-350`).
- The option set is division-specific (Phase 6). Render it as chips grouped by
  region with a small group label, so a 6 to 9 item division list scans
  cleanly rather than a flat 16.
- A clear "Not sure" affordance that deselects all and is itself a valid state
  (research, Phase 5, on the "I don't know my weak points" path). Selecting
  nothing must be a first-class outcome, not an error.
- Selected chips use the existing amber `weakPointChipSelected` treatment
  (`:643-646`). Max 3 retained, with the existing toast on the fourth tap
  (`:96-98`).
- Reuse theme tokens only (surface2 chip, amber selected, radius.full). No new
  colours, no gradient.

## Reveal screens

- `ProSetupCompleteScreen` is well designed: four numbered routine cards, a
  collapsible split, an adherence-neutral nutrition block, a founder note. The
  "Why this plan, for you" list (`:239-249`) already has a `weakPoints` slot,
  so once weak points are collected in onboarding the reveal will explain them
  with no further work.
- `GoalChangeSummaryScreen` (builder reveal) shows before/after. It should also
  reflect weak-point changes so a returning user sees that part of their edit
  landed. Confirm in Phase 4.

## Touch targets, motion, empty states

- Touch targets meet size on both flows (cards and 44px chips). Good.
- Motion respects `reduceMotion` (`WelcomeScreen.js:28-39`,
  `ProSetupCompleteScreen.js:33-54`). Keep this for any new screen.
- No "coming soon" placeholders, no greyed future features, no carousels. Clean.

## Summary

The locked rules are honoured. The single real design problem is cross-flow
inconsistency: two control languages for the same questions. Standardising on
the builder's card/chip language, plus a shared division-specific weak-point
component, resolves both the consistency problem and the weak-point scan
problem in one move.
