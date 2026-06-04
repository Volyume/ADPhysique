# Deep Feature Audit — Item 10: Progress tab (AnalyticsScreen)

**Document:** deep-audit-11-progress-tab.md
**Item:** 10 of master inventory (Group 2 — tab landings; `ProgressTab` / title "Progress")
**File:** `src/screens/AnalyticsScreen.js` (495 lines, presentational) + `src/hooks/useProgressData.js` (448 lines, data layer), components `CardioPlanCard`, `InfoTooltip`, `EmptyChartIllustration`, `ScreenHeader`
**Status:** IMPLEMENTED (approved 2026-06-04, "Approved"). Removed the header/pageTitle dead styles and the dead units store-read + prop pass; added accessibilityRole/Label to the All-sessions link, the PR window toggle, the insight dismiss and both volume-summary cards; dropped "Keep pushing." from the PR empty state (voice rule). No behaviour change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The Progress tab. `ScreenHeader` + a focus-aware scroll, with the data layer
factored out into `useProgressData` (shared with the Consistency surface). Top to
bottom: an empty state (when no sets), an "insight stack" (dismissible coaching
insights), "Recent sessions" (kept high so the first concrete thing is what you
actually did, with an "All sessions" link), "This week's volume" (a glanceable
summary strip that drills into the heatmap, the one volume home), a Pro cardio
card, a "New personal bests" PR sparkline with a 30/90-day window toggle, and an
"Explore" grid of nav tiles (Consistency, Lifts, Full History, Year of Lifts,
the last locked until 365 days of history with a day countdown).

### Findings
1. **Strong, deliberately de-cluttered landing.** Comments show conscious
   de-duplication ("the one volume home", recent sessions kept above the charts).
   It surfaces patterns (volume vs target, PR rate) and the user's own sessions
   rather than dumping every chart, which is exactly the research bar (Step B).
2. **Two dead styles.** `header` and `pageTitle` (`:379-380`) are orphaned, left
   from before the shared `ScreenHeader` (grep-verified 0 references).
3. **Dead `units` pass-through.** `units` is read from the store (`:28`) and
   passed to `SessionCard` (`:98`), but `SessionCard` ignores it (the prop was
   removed in the lint sweep; the card shows name + date + difficulty, no units).
   So the store read and the prop pass are now dead. Safe to drop both.
4. **A11y: roles missing on tappable controls.** The volume-summary card
   (`:232`, `:250`), the PR window toggle (`:140`), the "All sessions" see-all
   (`:93`), and the insight-row dismiss (`:212`) are `TouchableOpacity`s with no
   `accessibilityRole`/`accessibilityLabel`. (The `NavTile`s already carry role,
   label and disabled state, so the gap is the other controls.)
5. **Copy: one unearned-encouragement line.** The PR empty state reads "No new
   bests in the last N days. Keep pushing." (`:277`). CLAUDE.md's voice rules
   explicitly bar unasked encouragement ("Keep it up" is named as out); "Keep
   pushing" is the same class. The fact alone ("No new bests in the last N
   days.") is the on-voice version. Everything else is clean: no em dashes, no AI
   tells, British, terse.

### Design assessment (values cited)
- On-system: `surface`/`surface2`, amber accent, `gold` reserved for PR bars
  (a deliberate, earned highlight colour for personal bests), semantic
  `warning`/`error` only on insight severity and difficulty chips, scale tokens.
  The "Explore" 2x2 is four genuinely distinct nav destinations, not stat tiles
  arranged for symmetry, so it passes the grid test. The locked Year-of-Lifts
  tile with a concrete day countdown is a nice earned-progress touch.

### Flow / integration assessment
- `useProgressData` owns the loaders (workouts, sets, volume, PR bins, insights,
  recent sessions, workload, block state); the screen is a pure view over it.
  Nav tiles route within the Progress stack; the volume strip drills to the
  heatmap; PR window toggles in place. Clean separation, no data logic in the view.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- **PRs prominent + automatic flagging** is the motivation lever; surfacing
  personal bests and estimated 1RM is named best practice. Volyume has the PR
  sparkline and gold highlight; the engine auto-detects PRs. [Setgraph; Gymijet]
- **Volume broken down vs target, drill-in to muscle level.** Volyume's weekly
  volume summary (trained count + below/over flags) drilling into the per-muscle
  heatmap matches this "summary then expand" pattern. [LiftTrack]
- **Avoid overload; surface patterns, not day-to-day noise.** The most effective
  trackers focus on primary metrics and reveal stalls/trends rather than dumping
  charts. Volyume's de-duplicated landing follows this. [Setgraph; Gymijet]

---

## STEP C — COMPARISON

### Where Volyume leads
- A focused, pattern-surfacing Progress landing: the user's own recent sessions
  first, a volume-vs-target summary that drills to a full heatmap, an auto-
  detected PR rate, dismissible coaching insights, and an earned-progress locked
  tile. It resists the "wall of charts" most trackers fall into, matching the
  "avoid overload, surface patterns" bar. [Setgraph; LiftTrack]

### Where Volyume lags
- Two dead styles + a dead `units` pass-through (findings 2-3).
- Four tappable controls missing a11y roles (finding 4).
- One unearned-encouragement copy line (finding 5).

### Critical gaps
- None. Tidiness, a11y polish, and one voice-rule copy fix.

---

## STEP D — PROPOSAL

### Summary
Low-risk polish on a strong screen: drop the dead styles and the dead `units`
pass-through, add a11y roles to the four tappable controls, and fix the one
copy line that breaks the no-unearned-encouragement voice rule.

### Specific changes — one by one

**1. Remove the dead styles + dead `units` flow. [Cleanup — Low] — `:28`, `:98`,
`:379-380`, `:311`**
- What: delete `header` and `pageTitle` styles; remove the `units` store read
  (`:28`) and the `units={units}` prop pass (`:98`). `SessionCard` already
  ignores it, so this is behaviour-neutral.

**2. Add a11y roles to the tappable controls. [A11y — Low] — `:93`, `:140`,
`:212`, `:232`, `:250`**
- What: `accessibilityRole="button"` + concise labels on the "All sessions"
  link, the PR window toggle ("Change personal-bests window"), the insight
  dismiss ("Dismiss insight"), and the volume-summary card ("This week's volume,
  open the heatmap").

**3. Fix the unearned-encouragement copy. [Copy — Low] — `:277`**
- Current: "No new bests in the last {N} days. Keep pushing."
- Proposed: "No new bests in the last {N} days."
- Evidence: CLAUDE.md voice rule (no encouragement nobody asked for; "Keep it
  up" named as out).

### COPY CHANGES
- `:277` PR empty: drop "Keep pushing." (state the fact only).

### What to keep (with evidence)
- Recent-sessions-first, the volume summary drilling to the single heatmap home,
  the auto-detected PR sparkline + gold highlight, dismissible insights, and the
  earned-progress locked Year-of-Lifts tile. [Setgraph; LiftTrack; Gymijet]
- The `useProgressData` view/data separation.

### IMPACT / EFFORT
- **Impact: Low** (tidiness + a11y + one voice fix).
- **Effort: Low.** No behaviour, data, or navigation change; the only copy change
  removes two words.

### SOURCES
- LiftTrack — Progress tracking & analytics:
  https://lifttrackapp.com/features/progress-tracking/
- Setgraph — How to track workout progress:
  https://setgraph.app/ai-blog/how-to-track-workout-progress
- Gymijet — AI workout analysis, tracking strength & progress:
  https://gymijet.com/blogs/news/ai-workout-analysis-tracking-strength-progress-with-data
