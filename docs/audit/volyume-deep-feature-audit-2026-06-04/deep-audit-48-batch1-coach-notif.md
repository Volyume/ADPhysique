# Deep Feature Audit — Batch 1 (items 47–51): coach-engine + notification surfaces

**Document:** deep-audit-48-batch1-coach-notif.md
**Items:** 47 `ProGoalSetupScreen` 🔒, 48 `GoalChangeSummaryScreen`, 49 `CoachingRemindersScreen` 🔒, 50 `WellbeingCheckScreen`, 51 `NotificationSettingsScreen`
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve all" — grouped review at founder request to speed the pass). Attribute-only a11y across the five, plus one verified 14-key dead-style removal on NotificationSettings. No behaviour or copy change. Full 455-test mount sweep green.
**Timestamp:** 2026-06-04

---

## Why batched
The per-screen findings had become formulaic (control roles/labels + the
occasional verified dead-style removal), so from item 47 the founder asked to
group screens to cut approval round-trips. Each batch is one consolidated audit
doc + one approval + per-screen commits, with the **full mount sweep** as the
safety net. All five screens here are clean on copy (no em dashes) and dates.

---

## Per-screen

### #47 ProGoalSetupScreen (655 lines)
- **A11y:** goal cards and protein-approach cards → `role="button"` +
  `accessibilityState={{ selected }}` + label; "Rebuild my plan" save → role +
  disabled state. The filter `Chip` already had a radio role.
- **Dead styles:** none. The scan flagged `next`/`previous`, but those are object
  keys (lines 280/289), not styles — left in place (verified `styles.next`/
  `styles.previous` = 0, not StyleSheet definitions).
- **Date note:** `goalStartDate = new Date().toISOString()` is a correct instant
  (not a constructed local-midnight), so no TZ issue.

### #48 GoalChangeSummaryScreen (345 lines)
- **A11y:** close X → role + "Close"; "Got it" button → role. No dead styles.

### #49 CoachingRemindersScreen (339 lines)
- Already accessible (the reminder selectors carry radio roles + labels). No
  change needed; the "Saved" confirmation is text. No dead styles.

### #50 WellbeingCheckScreen (176 lines, ED/RED-S adjacent — sensitive)
- **A11y:** the per-question Yes/No buttons → role + `accessibilityState={{ selected }}`
  + label; the "Save answers" action uses the shared accessible `Button`.
- **Copy left entirely untouched** given the sensitivity.
- No dead styles.

### #51 NotificationSettingsScreen (811 → 736 lines)
- **A11y:** the Coaching-reminders cross-link → role + label. The training-reminder
  switch and the time-pick button were already labelled.
- **Dead styles — 14 removed (verified):** a removed header block (`header`,
  `backButton`, `headerText`, `title`) and a removed chip/schedule cluster
  (`pickerLabel`, `chipContainer`, `chipContainerDisabled`, `chipRow`, `chip`,
  `chipSelected`, `chipText`, `chipTextSelected`, `scheduleText`,
  `scheduleSubText`). Single StyleSheet, no `styles` destructuring, each defined
  once / used zero.

---

## Verification
- eslint 0 problems across all five.
- NotificationSettings: all 14 dead styles confirmed gone.
- **Full screen-mount sweep green (455/455)** — covers all five screens.

## Sources (a11y patterns, carried from prior items)
- React Native — Accessibility (role / state / label): https://reactnative.dev/docs/accessibility
- W3C WAI — selectable controls and labels: https://www.w3.org/WAI/tutorials/forms/
