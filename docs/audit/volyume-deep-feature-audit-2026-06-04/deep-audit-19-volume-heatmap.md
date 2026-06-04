# Deep Feature Audit — Item 18: Volume Heatmap screen

**Document:** deep-audit-19-volume-heatmap.md
**Item:** 18 of master inventory (screen #14 — `VolumeHeatmapScreen`; Progress + Train stacks)
**File:** `src/screens/VolumeHeatmapScreen.js` (654 lines), component `BodyDiagramHeatmap`, libs `algorithms` (VOLUME_LANDMARKS), `sync`
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve"). Added accessibilityRole/Label/selected-state to the window-selector buttons, Edit/Reset/Cancel/Save, and accessibilityLabel to the landmark inputs. The 4 heuristic-flagged styles were trendStyles members (false positive), left intact. Attribute-only.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The per-muscle weekly-volume view. An anatomical `BodyDiagramHeatmap` (tap a
muscle to scroll to its bar), a rolling-window selector (1 / 2 / 4 weeks), a
legend + tooltip, then a per-muscle bar list: each bar shows this window's
working sets vs the muscle's MRV ceiling, with MEV/MAV tick marks, a faint ghost
bar for the previous window, the set count, and a "last trained" chip. Below: a
4-week trend sparkline per trained muscle, and an editable custom-landmarks panel
(Min/Target/Max per muscle) that persists to AsyncStorage and syncs to cloud via
`syncUserPref` (survives reinstall/sign-out).

### Findings
1. **Strong and science-grounded.** This is a faithful MEV/MAV/MRV volume-
   landmark visualiser (the RP / Israetel framework, Step B), with per-muscle
   customisable landmarks, cloud-synced, a previous-window ghost comparison, a
   4-week trend, and a tappable body diagram. That is ahead of most trackers,
   which show raw set counts with no landmark context. eslint clean.
2. **No dead styles (a heuristic false positive corrected).** The dead-style
   sweep flagged `row`, `sparkContainer`, `sparkBar`, `currentCount`, but these
   are members of a SECOND StyleSheet (`trendStyles`) used via `trendStyles.X`,
   not `styles.X`. They are live; nothing to remove. (Verified the other audited
   screens each have a single StyleSheet, so prior removals were unaffected.)
3. **A11y: the interactive controls have no roles (0 across the screen).** The
   window-selector buttons (`:207`, no selected state), the Edit Volume Targets
   (`:370`) and Reset to Defaults (`:373`) buttons, the Cancel/Save buttons in
   edit mode (`:360`, `:363`), and the landmark `TextInput`s (`:344`, no label)
   are all unlabelled to a screen reader. The body diagram handles its own tap
   semantics inside `BodyDiagramHeatmap`.
4. **Copy is on-voice.** The legend ("Below minimum / Optimal / Getting close /
   Too much"), the window note, the edit subtitle ("Weekly sets per muscle ·
   Minimum / Target / Ceiling"), and the tooltip are plain and jargon-free
   (MEV/MAV/MRV are translated into plain language). No em dashes. Nothing to
   rewrite.

### Design assessment (values cited)
- On-system: `surface` cards, `volumeStatusColor` (semantic green/amber/warning/
  error for the bands), amber active window button, scale tokens. The bar with
  MEV/MAV ticks + MRV end + ghost previous-window is a dense but legible,
  information-rich treatment that earns its complexity. No fingerprints.

### Flow / integration assessment
- Reloads on focus + window change; computes current + previous window volume
  from completed sets; custom landmarks round-trip through AsyncStorage +
  `syncUserPref` with an empty-string sentinel for "reset to defaults" so a stale
  cloud copy can't resurrect old targets. Body diagram tap → row scroll via
  measured offsets. Well-built and cloud-durable.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- **MEV/MAV/MRV volume landmarks** are the science-based framework (RP /
  Israetel) for how much a muscle needs, thrives on, and can recover from.
  Volyume implements all three as bar ticks + ceiling. [RP Strength; MyLiftingCoach]
- **Heatmap visualisers of weekly sets vs landmarks** are a recognised tool
  category; Volyume's body-diagram + per-muscle bars is exactly this, plus
  per-muscle customisation most tools don't offer. [Fitness Volt; Arvo]

---

## STEP C — COMPARISON

### Where Volyume leads
- A science-grounded, customisable, cloud-synced volume-landmark heatmap with a
  body diagram, previous-window ghost comparison, and a 4-week trend — well
  beyond the raw set-count lists most trackers ship, and grounded in the same
  framework the research describes. [RP Strength; Fitness Volt]

### Where Volyume lags
- The interactive controls (window selector, edit/reset/save, landmark inputs)
  have no a11y roles/labels (finding 3). That's the only gap.

### Critical gaps
- None. Clean, sophisticated screen; a11y polish only.

---

## STEP D — PROPOSAL

### Summary
A11y-only polish: give the window selector, the edit/reset/cancel/save buttons,
and the landmark inputs proper roles, labels and (for the window buttons)
selected state. No behaviour, copy, or layout change.

### Specific changes — one by one

**1. Add roles/labels/state to the controls. [A11y — Low]**
- What: `accessibilityRole="button"` + label + `accessibilityState={{ selected }}`
  on the window-selector buttons; role + label on Edit Volume Targets, Reset to
  Defaults, Cancel, Save; an `accessibilityLabel` on each landmark `TextInput`
  (e.g. "{muscle} minimum" / "target" / "maximum").

### COPY CHANGES
None.

### What to keep (with evidence)
- The MEV/MAV/MRV bar treatment, the body diagram, per-muscle customisable
  landmarks + cloud sync (with the reset sentinel), the previous-window ghost,
  and the 4-week trend. [RP Strength; Fitness Volt]

### IMPACT / EFFORT
- **Impact: Low** (a11y polish on a clean, sophisticated screen).
- **Effort: Low.** Attribute-only; no behaviour, copy, or layout change.

### SOURCES
- RP Strength — Training volume landmarks for muscle growth:
  https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth
- MyLiftingCoach — Volume landmarks explained (MEV/MAV/MRV):
  https://myliftingcoach.com/blog/understanding-volume-landmarks
- Fitness Volt — Volume landmarks tracker:
  https://fitnessvolt.com/rpe-training/volume-tracker/
