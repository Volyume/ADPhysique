# Deep Feature Audit — Item 19: Coach Review screen

**Document:** deep-audit-20-coach-review.md
**Item:** 19 of master inventory (screen #15 — `CoachReviewScreen`; Progress stack, "Weekly Review")
**File:** `src/screens/CoachReviewScreen.js` (802 lines), libs `algorithms` (volume + deload + lagging-muscle detection), `SkeletonCard`
**Status:** IMPLEMENTED (approved 2026-06-04, "Ok"). Removed the two dead styles (loadingWrap, statusDot). No other change -- a read-only screen with no interactive controls and exemplary copy. Attribute-free cleanup.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The read-only weekly review, reached from the Train/Progress recovery banners. It
loads this week's completed workouts + sets + recent check-ins, then renders:
a header with the week range; a "Sessions this week" stat card (sessions / total
sets / most-trained); a "Volume this week" per-muscle list (status dot + label);
"What went well" (optimal muscles + progressive-overload wins detected by
comparing this week's top sets to prior); "What to watch" (over/near/below-volume
muscles, a deload suggestion, a joint-discomfort flag); and "What to focus on next
week" (up to 3 plain-English recommendations from volume, deload, lagging muscles,
energy/sleep, and joint signals). Skeleton cards on load; a no-data state.

### Findings
1. **A model coaching-feedback screen.** Its structure is the research bar almost
   verbatim (Step B): lead with "what went well", then "what to watch", then
   actionable next steps; behavioural (not personality) observations; scannable
   section headers; concrete recommendations. The copy is genuinely excellent and
   non-judgemental ("Your body will come back stronger afterwards", "Recovery is
   where the adaptation happens"). The recommendation engine draws on volume,
   deload, lagging-muscle, recovery and joint signals with sensible precedence and
   a 3-item cap. **0 em dashes.**
2. **Read-only, so no interactive-control a11y gaps.** The screen has no
   TouchableOpacity / Pressable / TextInput (verified 0). Status is conveyed by a
   colour dot AND a text label per row, so colour is never the sole channel
   (WCAG-safe).
3. **Two dead styles.** `loadingWrap` and `statusDot` are orphaned (single
   StyleSheet, grep-verified 0 refs). `statusDot` is dead because the `StatusDot`
   component that used it was removed during this audit's lint sweep;
   `volumeDot` is the live dot style now. `loadingWrap` is unused (the loading
   state renders SkeletonCards in a ScrollView).
4. **Copy is on-voice.** Plain, British, no AI tells, no unearned praise (the
   "what went well" items are factual: "training is in a good range"). Nothing to
   rewrite.

### Design assessment (values cited)
- On-system: `surface` cards, semantic status colours via `statusDotColor`
  (success/warning/error/muted) used consistently with text labels, scale
  spacing/radii, `SkeletonCard` load. The card-per-section layout with uppercase
  card titles + section headings is calm and scannable. No fingerprints.

### Flow / integration assessment
- Pure read: aggregates workouts/sets/check-ins, computes weekly volume, deload
  (`shouldDeload` over 4 weekly buckets), lagging muscles (`detectLaggingMuscles`
  over the same history), and progression wins; all derived in `loadData` +
  memo-free derived consts. No writes, no navigation actions. Self-contained.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- **Lead with "what went well".** Starting with strengths boosts receptiveness to
  improvement points — Volyume's first section is exactly this. [iccs; PMC]
- **Sandwich structure + actionable next steps.** Acknowledge wins, address
  development areas, end on concrete actions — Volyume's three sections map onto
  this precisely, with a capped, prioritised recommendation list. [iccs; AmplifAI]
- **Behavioural observations, scannable sections, key actions above the fold.**
  Volyume uses behavioural framing (volume/recovery, not the person), card
  sections with headers, and puts the stat summary + wins up top. [iccs; AmplifAI]

---

## STEP C — COMPARISON

### Where Volyume leads
- A structured, science-grounded weekly review that follows coaching-feedback
  best practice to the letter (wins → watch → act), driven by real volume/
  deload/lagging/recovery signals with non-judgemental plain-language copy. Most
  trackers offer no weekly synthesis at all. [iccs; PMC]

### Where Volyume lags
- Two dead styles (finding 3). Nothing else.

### Critical gaps
- None. This is among the strongest screens audited; the only action is removing
  two orphaned styles.

---

## STEP D — PROPOSAL

### Summary
Trivial cleanup only — remove the two dead styles. Everything else is exemplary
and stays. No a11y work needed (read-only, WCAG-safe), no copy change.

### Specific changes — one by one

**1. Remove the two dead style keys. [Cleanup — Low, zero behaviour risk] —
`loadingWrap`, `statusDot`**
- What: delete both (grep-verified 0 refs; `statusDot` was orphaned when the
  `StatusDot` component was removed in the lint sweep).

### COPY CHANGES
None. The coaching copy is exemplary.

### What to keep (with evidence)
- The wins → watch → next-week structure, the prioritised capped recommendation
  engine, the colour-dot-plus-label volume rows (WCAG-safe), the non-judgemental
  copy, and the skeleton/no-data states. [iccs; PMC; AmplifAI]

### IMPACT / EFFORT
- **Impact: Low** (housekeeping on an already-exemplary screen).
- **Effort: Low.** Two style deletions; no behaviour, copy, or layout change.

### SOURCES
- ICCS — Effective feedback in coaching (start with what went well; sandwich):
  https://iccs.co/feedback-in-coaching-supervision/
- NIH PMC — Feedback and coaching:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC8821048/
- AmplifAI — Coaching feedback best practices (actionable next steps):
  https://www.amplifai.com/blog/call-center-coaching-feedback-everything-you-need-to-know
