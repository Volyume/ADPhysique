# Deep Feature Audit — Item 16: Workout Summary screen

**Document:** deep-audit-17-workout-summary.md
**Item:** 16 of master inventory (screen #12 — `WorkoutSummaryScreen`; post-session recap + feedback, in the Train and Progress stacks)
**File:** `src/screens/WorkoutSummaryScreen.js` (1327 lines), components `FeedbackSheet`, `InfoTooltip`, libs `algorithms`, `mesocycle`, `feedback`, `storeReview`, `health`
**Status:** AWAITING APPROVAL
**Timestamp:** 2026-06-04

> Runtime-critical: this screen writes session feedback, saves a weekly check-in,
> writes per-muscle adaptation events (the coach's in-session record), syncs to
> cloud, and writes to Apple Health / Health Connect. Change 1 below touches the
> feedback effect + a loader, so it is proposed with care and full-suite verified.

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The post-session screen. Animated stat grid (exercises / working sets /
duration / total kg), a 4-week comparison vs the same routine (best / up / down /
on-pace), a per-exercise set list, a PR row, "This week's volume" with per-muscle
status + tap-to-expand "why this status" coaching, an optional 7-row session-
feedback block (difficulty, pump, soreness, fatigue, joint, energy, sleep) +
notes, a "notes for next time" field, save-as-template, and a Close / Share
footer. On Close it writes feedback, saves a weekly check-in (energy/sleep/
soreness), writes per-muscle **adaptation events** from `adaptiveDecisions`, syncs
to cloud, and writes the session to the health store. Reveal animations stagger
the sections in.

### Findings
1. **Strong, and the live coach loop is exactly the research bar.** Post-session
   feedback feeding plan individualisation (here: feedback → `runAdaptiveEngine`
   → `createAdaptationEvent`) and a visual comparison for the achievement signal
   are both named best practice (Step B). The volume "why this status" bodies are
   genuinely good plain-language coaching.
2. **Dead per-session coach compute/IO from superseded predictions (the
   meaningful finding).** Four state values are computed but never rendered
   (verified read-count 1 = declaration only):
   - `_autoRegSuggestions` (`getAutoRegSuggestion`), `_mesoAdvice`
     (`evaluateAutoReg` + `getMesoSchedule` + `getAutoRegMessage`), and
     `_deloadPrediction` (`predictDeloadWeek` + `getDeloadPredictionMessage`) all
     recompute in the feedback effect on **every rating change** but feed nothing.
   - `_deloadRecommendation` is fed by `evaluateDeloadTriggers(events)` where
     `events = await getRecentAdaptationEvents(...)` — a **DB read in the loader**
     whose only consumer is dead state.
   The founder note at `:419-424` explains why: the weekly coach now owns next-
   week volume, so the per-session engine is "in-session only" — these per-session
   prediction displays were removed, leaving the computation. The LIVE
   `adaptiveDecisions` → `createAdaptationEvent` path is separate and stays. 8
   imports become unused after removal (`getAutoRegSuggestion`,
   `evaluateDeloadTriggers`, `evaluateAutoReg`, `predictDeloadWeek`,
   `getMesoSchedule`, `getDeloadPredictionMessage`, `getAutoRegMessage`,
   `getRecentAdaptationEvents`; `runAdaptiveEngine` stays).
3. **27 dead style keys** — the removed display surfaces for the dead state
   (`suggestionRow`, `mesoAdviceCard*`, `deloadPredictionCard*`, `adaptiveCard*`,
   `deloadCard*`, plus `completionGreeting`, `completionSub`, `muscleSetCount`,
   `limitedCard`, `limitedText`). All grep-verified at 0 references.
4. **A11y: the rating-row buttons are the gap.** `RatingRow`'s 0–5 chips
   (`:56-67`) are `TouchableOpacity`s with no role/label/selected-state — the core
   feedback input, and a screen reader can't tell which value is chosen. The
   volume "why" toggle DOES have role + label. Also missing roles: the feedback
   expand toggle (`:769`), save-as-template (`:809`), the Close + Share footer
   buttons (`:840`, `:848`), and the template-modal buttons (`:880`, `:886`).
5. **Copy is excellent.** The volume insights/why bodies, the comparison verdicts
   ("Don't chase yesterday's volume; trust the trend."), and the tooltips are
   plain, specific, non-judgemental. No em dashes. Nothing to rewrite.

### Design assessment (values cited)
- On-system: `surface` cards, amber accent, `gold` for the best-session verdict,
  semantic volume-status colours via `volumeStatusColor`, scale tokens. Staggered
  reveal animations are tasteful and (per the component) reduce-motion-aware. The
  stat grid + comparison + volume + optional feedback is a considered recap, not a
  trophy dump.

### Flow / integration assessment
- On Close: feedback write + weekly check-in + adaptation events (from the live
  `adaptiveDecisions`) + cloud sync + health write + store-review prompt after 5
  sessions, all guarded. Plan advance fires once on mount for routine sessions.
  The 4-week comparison and read-only history grouping are handled. Solid.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- **Post-workout RPE/feedback surveys individualise the plan.** Prompting for
  effort/feel after a session and feeding it into adjustments is named best
  practice; Volyume's feedback → adaptive engine → adaptation events is exactly
  this. [Trainerize; TrainerRoad]
- **Visual comparison/recap drives the achievement signal.** Graphs/trend
  comparisons and seeing "how you felt" build the return habit; Volyume's 4-week
  comparison + PR row + volume status deliver it. [Zfort; TrainerRoad]
- **Reduce cognitive load on the recap.** Clear, focused layout over complexity —
  which is also why removing the dead per-session prediction compute is the right
  call. [Zfort]

---

## STEP C — COMPARISON

### Where Volyume leads
- A recap that closes the coach loop (feedback → real per-muscle adaptation
  events), with a 4-week same-routine comparison, per-muscle volume status +
  plain-language "why", and a share card. Most trackers stop at a stat dump;
  Volyume turns the recap into the coaching input. [TrainerRoad; Zfort]

### Where Volyume lags
- Dead per-session coach compute on every rating change + one dead loader DB read
  (finding 2), 27 dead styles (finding 3), and the rating-row a11y gap (finding 4).

### Critical gaps
- None functional. The live coach loop is intact; the items are a hot-path tidy
  (verified), dead-style removal, and a11y on the feedback input.

---

## STEP D — PROPOSAL

### Summary
Same shape as the Active Workout pass: reclaim the dead per-session compute/IO
(carefully, full-suite verified), remove the dead styles, and give the rating
input proper a11y. The live feedback→adaptation-event loop and all copy are
untouched.

### Specific changes — one by one

**1. Reclaim the dead coach compute/IO. [Perf — Medium, runtime-critical →
verified]**
- What: remove `_autoRegSuggestions`/`_mesoAdvice`/`_deloadPrediction`/
  `_deloadRecommendation` state; delete the autoReg-suggestion, meso-advice and
  deload-prediction blocks from the feedback effect (keeping the `muscleFeedback`
  build + `runAdaptiveEngine` + `setAdaptiveDecisions`); delete the
  `getRecentAdaptationEvents` + `evaluateDeloadTriggers` block from
  `loadVolumeAndHistory`; remove the 8 now-unused imports.
- Care: the live `adaptiveDecisions` → `createAdaptationEvent` write and the
  weekly-check-in save are preserved verbatim; full suite (incl. coach/engine
  tests) verified. Recommendation: remove (these per-session predictions are
  deprecated per the `:419` note); the alternative is to restore their display —
  your call.

**2. Remove the 27 dead style keys. [Cleanup — Low, zero behaviour risk]**

**3. A11y on the feedback input + secondary controls. [A11y — Low]**
- What: give `RatingRow` chips `accessibilityRole="radio"` +
  `accessibilityState={{ selected }}` within a labelled `radiogroup` row (the
  label = the rating name + current value word); add `accessibilityRole="button"`
  + labels to the feedback toggle, save-as-template, Close, Share, and the
  template-modal buttons.

### COPY CHANGES
None. The recap copy is exemplary.

### What to keep (with evidence)
- The animated stat grid, 4-week comparison, per-muscle volume + "why this
  status", the optional feedback → adaptive-engine → adaptation-events loop, the
  weekly check-in save, share card, save-as-template, and the health write.
  [TrainerRoad; Zfort]

### IMPACT / EFFORT
- **Impact:** Medium (1, removes per-rating-change compute + a loader DB read) /
  Low (2, tidy) / Low (3, a11y on the core input).
- **Effort:** Medium (1, careful + full-suite verify) / Low (2, 3).

### SOURCES
- Trainerize — RPE workout rating feature:
  https://help.trainerize.com/hc/en-us/articles/360033937932-How-to-Use-the-RPE-Workout-Rating-Feature-in-your-Training
- TrainerRoad — Post-workout surveys:
  https://support.trainerroad.com/hc/en-us/articles/4404884465563-Post-Workout-Surveys
- Zfort — Fitness app UX/UI for engagement & retention:
  https://www.zfort.com/blog/How-to-Design-a-Fitness-App-UX-UI-Best-Practices-for-Engagement-and-Retention
