# Deep Feature Audit — Item 13: Goal lock consent screen

**Document:** deep-audit-14-goal-lock-consent.md
**Item:** 13 of master inventory (screen #8 — `GoalLockConsentScreen`; onboarding + You-tab edit surface)
**File:** `src/screens/GoalLockConsentScreen.js` (203 lines)
**Status:** AWAITING APPROVAL
**Timestamp:** 2026-06-04

> Sensitive surface: this sets the eating-disorder-pattern detector threshold.
> "Advanced" raises it from 2 signals to 3 (the FFM floor still applies), so the
> safety check holds a cut less readily. Changes here are treated with care; the
> proposal is a11y-only and does not touch the threshold logic or copy.

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
Shown inside Pro onboarding when the chosen goal involves aggressive cuts
(physique competition / advanced recomp), and reachable from You → Goal lock as
an edit surface. A title ("A note about aggressive cuts"), a plain non-alarming
explanation that safety checks exist and will hold a cut when the body signals
trouble, then two radio options:
- **advanced** — "I have prior experience managing aggressive cuts safely, or
  I'm working with a coach." (raises the ED-pattern threshold 2 → 3)
- **standard** — "I'm new to this and want Volyume's standard safety checks to
  apply." (the protective default)
A note that it's changeable any time, and a Continue (onboarding) / Save (edit)
CTA. In edit mode it pre-loads the current value; in onboarding nothing is pre-
selected, so the user makes an active choice. On save it persists via
`setGoalLockAdvanced` and records `goal_lock_set`/`goal_lock_cleared` telemetry.

### Findings
1. **A model wellbeing-over-engagement safeguard.** This is exactly what the
   ED-safety research asks for (Step B): non-judgemental language ("That's
   fine"), informed choice rather than a buried toggle, no default-to-risky (the
   protective standard is the implicit baseline; advanced requires an explicit
   pick), and full reversibility. It is ahead of most trackers, which lean on
   guilt/red-visualisation/gamified-deficit patterns. The radios carry
   `accessibilityRole="radio"` + `accessibilityState`.
2. **CTA missing button role + disabled state.** The Continue/Save
   `TouchableOpacity` (`:118`) has no `accessibilityRole="button"` and no
   `accessibilityState={{ disabled }}`, so a screen reader doesn't announce it as
   a (disabled-until-chosen) button. The radios are labelled; the CTA is the gap.
3. **No `radiogroup` wrapper.** The two radio `Pressable`s are correct
   individually but aren't wrapped in a container with
   `accessibilityRole="radiogroup"`, so they aren't announced as one grouped
   choice. Minor.
4. **`React.useEffect` vs destructured import.** The file imports `React,
   { useState }` then calls `React.useEffect` (`:40`). Harmless, but inconsistent
   with the rest of the codebase (which destructures hooks). Trivial style nit.
5. **Copy is careful and on-voice.** Plain, non-alarming, non-judgemental, no em
   dashes, uses the same "You → Goal lock" arrow convention as other screens. For
   an ED-adjacent safety surface this is exemplary. Nothing to rewrite.

### Design assessment (values cited)
- On-system: `surface` radio cards, single amber accent on the selected radio +
  CTA, scale tokens. Calm, focused, no decoration. The radio-card pattern with an
  uppercase field label and an info note reads as a considered consent surface,
  matching the Article 9 screen's family. No dead styles (verified).

### Flow / integration assessment
- Dual-mode routing is clean: `route.params.onContinue` for the onboarding step,
  `navigation.goBack` for the edit surface; `editMode` flips the CTA label and
  pre-loads the stored value. Persists + records telemetry with a `source` tag.
  Busy-guarded. Solid.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- **Avoid guilt/shame and gamified-deficit patterns.** Research (BJPsych Open;
  NCHR) finds fitness apps drive ED behaviours via red "over budget"
  visualisations, gamified eat-less competition, and good/bad-food labels. The
  remedy is non-judgemental language and safeguards that prioritise wellbeing
  over engagement. This screen is the safeguard, and its copy follows the
  non-judgemental standard. [BJPsych Open; NCHR]
- **RED-S awareness + informed choice.** Responsible apps surface that safety
  monitoring exists and let the user make an informed choice rather than burying
  it. Volyume names the checks and asks for an explicit confirmation. [Equip;
  ANAD]

---

## STEP C — COMPARISON

### Where Volyume leads
- A dedicated, non-judgemental, reversible informed-choice gate around an ED-
  safety threshold, with the protective option as the baseline and a real audit
  trail. Most trackers have no such safeguard at all, and the ones that do rarely
  frame it this carefully. This is a genuine differentiator. [BJPsych Open; NCHR]

### Where Volyume lags
- Two minor a11y omissions on the CTA and the radio grouping (findings 2-3).
- A trivial `React.useEffect` style inconsistency (finding 4).

### Critical gaps
- None. The safety design is sound; the items are a11y polish.

---

## STEP D — PROPOSAL

### Summary
A11y-only polish on a sensitive, well-built safeguard. No change to the threshold
logic, the routing, or the copy.

### Specific changes — one by one

**1. Add button role + disabled state to the CTA. [A11y — Low] — `:118-124`**
- What: `accessibilityRole="button"` + `accessibilityState={{ disabled: !choice
  || busy }}` + an `accessibilityLabel` ("Save" / "Continue").

**2. Wrap the two radios in a radiogroup. [A11y — Low] — `:83-109`**
- What: a `View` around both `Pressable`s with `accessibilityRole="radiogroup"`
  and an `accessibilityLabel` ("Confirm your experience with aggressive cuts").

**3. (Optional, trivial) Destructure `useEffect`. [Consistency] — `:1`, `:40`**
- What: `import { useState, useEffect }` and use `useEffect` directly instead of
  `React.useEffect`. Drop the `React` default import (automatic JSX runtime). Skip
  if you'd rather not touch it.

### COPY CHANGES
None. The copy is careful and on-voice; I would not change a word of an ED-safety
surface without explicit sign-off, and none is needed.

### What to keep (with evidence)
- The non-judgemental framing, the protective-by-default informed choice, the
  reversibility note, the telemetry audit trail, and the dual-mode routing.
  [BJPsych Open; NCHR; Equip]

### IMPACT / EFFORT
- **Impact: Low** (a11y polish on an already-strong safety screen).
- **Effort: Low.** Attribute-only (1-2); a tiny import tidy (3). No logic or copy
  change.

### SOURCES
- BJPsych Open — Effects of diet/fitness apps on eating-disorder behaviours:
  https://www.cambridge.org/core/journals/bjpsych-open/article/effects-of-diet-and-fitness-apps-on-eating-disorder-behaviours-qualitative-study/2D1EE739D97AB3EFC6573835E4C527BD
- National Center for Health Research — Fitness tracking apps and eating disorders:
  https://www.center4research.org/fitness-tracking-apps-eating-disorders/
- Equip Health — Understanding RED-S and eating disorders:
  https://equip.health/articles/food-and-fitness/red-s-syndrome-relative-energy-deficiency-in-sport
