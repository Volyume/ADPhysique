# Deep Feature Audit — Item 30: Log Cardio screen

**Document:** deep-audit-31-log-cardio.md
**Item:** 30 of master inventory (screen #28 — `LogCardioScreen` 🔒 Pro-gated; Diary/Train/Progress modal)
**File:** `src/screens/LogCardioScreen.js` (301 lines), local `Section` / `ActivityList`, components `SegmentedControl`, `SearchBar`, `Button`, libs `cardio/cardioActivities`, `cardio/cardioMath`, `database` (`insertCardioLog`, `getRecentCardioLog`)
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve"). Added `accessibilityRole="button"` to the header close, the change-activity row, the favourite star (with a `selected` state), the duration −/+ steppers, and the activity rows; labels were already present. Attribute-only; no behaviour, layout, or copy change. The optional adjustable-stepper upgrade and dropping the per-row category icons were not taken (left to founder).
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
A fast, user-led cardio logger. An activity picker (your favourites → recents →
the category-grouped library, plus search), last-used duration/intensity prefill
per activity, a duration stepper, an intensity `SegmentedControl`, a MET-based
kcal estimate shown as feedback **only when bodyweight is known** (P10: no silent
default), a favourite toggle, and one footnote explaining the estimate is not
added to the food target (the energy-balance model accounts for cardio through
the weight trend). Save writes the log and returns.

### Findings
1. **Well-built and honest.** The favourites/recents-first picker with last-used
   prefill is the fast-logging pattern; "no estimate without a real bodyweight" is
   a good honesty call. Clean: **no dead styles, no em dashes, tokens throughout.**
   `entryDate` defaults to the **UK-local** day key (`activityDayKey` → `localDayKey`),
   so the cardio nav fix (registering the modal in the Home/Progress stacks)
   logs to the correct day from any tab. `SegmentedControl` (radiogroup/radio with
   state) and `Button` are already fully accessible.
2. **A11y: labels present, roles missing.** Every interactive control already had
   an `accessibilityLabel`, but the plain `TouchableOpacity`s lacked
   `accessibilityRole="button"` — header close, change-activity row, favourite
   star, duration −/+ steppers, and activity rows. A screen reader announced the
   label but not that it was a button.
3. **Design note (left to founder).** Each activity row carries a per-category
   Ionicon, which brushes the "decorative icons on every list item" fingerprint.
   But in the mixed lists (search, favourites, recents) the rows are not grouped
   by category, so the icon aids scanning there. Kept.
4. **Copy clean and on-voice.** Short, factual; the single footnote is justified.
   Nothing to reword.

### Design assessment (values cited)
- On-system: `surface2`/`surface3` stepper and chosen-activity surfaces, amber
  `primary` for the favourite star / stepper glyphs / category icons, scale
  tokens, tabular-nums on the numeric value + kcal. No fingerprints beyond the
  per-row icon note.

### Flow / integration assessment
- Recents + last-used map come from `getRecentCardioLog`; picking an activity
  prefills its last duration/intensity. The estimate is gated on a known
  bodyweight. Save denormalises the MET + estimate into the log row. Sound.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- Calorie-burn estimation from **activity type + duration + bodyweight** (the MET
  method Volyume uses) is the standard for a tracker without a heart-rate feed;
  apps using time or steps alone are less accurate. [Fitbudd]
- A fast logging flow (favourites/recents, minimal taps, prefill) keeps people
  from abandoning mid-session; Volyume's picker matches this. [Setgraph]

---

## STEP C — COMPARISON

### Where Volyume leads
- Fast picker + last-used prefill + the honest "no bodyweight, no estimate" + the
  one footnote that stops users double-counting cardio against their food target.

### Where Volyume lags
- Control roles (now fixed); the per-row icons are borderline.

### Critical gaps
- None functional.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one
1. **`accessibilityRole="button"`** on the header close, the change-activity row,
   the favourite star (plus `accessibilityState={{ selected: isFavourite }}`), the
   duration −/+ steppers, and the activity rows. Labels were already present.
   [A11y — Low]

### Not taken (left to founder)
- The **adjustable-stepper** upgrade (`accessibilityRole="adjustable"` + value +
  increment/decrement actions) so the new minutes announce on change — slightly
  more than attribute-only, so deferred unless wanted.
- **Dropping the per-row category icons** — kept, since they aid scanning in the
  mixed picker lists.

### COPY CHANGES
None.

### What to keep (with evidence)
- The picker flow, last-used prefill, the MET estimate gating, the single
  footnote, and all copy. [Fitbudd; Setgraph]

### IMPACT / EFFORT
- **Impact: Low.** The screen was already labelled; this adds the missing "button"
  announcement and a favourite toggle state.
- **Effort: Low.** Attribute-only. eslint 0 problems; all LogCardio screen-mount
  variants pass (incl. the a11y and rapid-tap fuzz), cardio suites 50/50.

### SOURCES
- Fitbudd — workout monitor apps (calorie estimation inputs):
  https://www.fitbudd.com/post/the-best-workout-monitor-apps-to-track-every-rep-heartbeat-calorie
- Setgraph — apps for tracking workouts 2025 (logging-flow UX):
  https://setgraph.app/ai-blog/app-for-tracking-workouts-best-choices-2025
