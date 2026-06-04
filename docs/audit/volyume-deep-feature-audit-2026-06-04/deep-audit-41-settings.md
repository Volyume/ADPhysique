# Deep Feature Audit — Item 40: Settings screen

**Document:** deep-audit-41-settings.md
**Item:** 40 of master inventory (screen #40 — `SettingsScreen`; settings hub)
**File:** `src/screens/SettingsScreen.js` (1548 lines), local `SettingRow` / `SectionHeader`
**Status:** IMPLEMENTED (approved 2026-06-04, "Go"). One `SettingRow` change now lends its row label to a `Switch` passed as `rightElement` (labels all 13 toggles at once and any future ones); added a role to the app-version control; removed one dead style (`comingSoon`); fixed an em dash in a comment. Attribute-only plus the dead-style/comment cleanup; no behaviour or user-copy change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The settings hub: account/subscription, coaching toggles (calmer experience, step
target, cardio, cycle tracking), reminders, accessibility prefs (larger text,
higher contrast, colour-blind palette, reduce motion), Apple/Google Health
permissions, data (import/backup/restore/CSV/clear), privacy/consent, feedback,
and app info. Built from a reusable `SettingRow`.

### Findings
1. **Well-built hub.** `SettingRow` already sets `accessibilityRole` (button when
   tappable) and a composed label, and the error toasts are now terse ("Could not
   connect. Try again in a moment.", "Couldn't sync. It retries automatically.")
   — the chatbot-shaped C2 toasts from the original audit were trimmed in Phase 3
   and have not regressed.
2. **A11y: the 13 `Switch`es were unlabelled.** Each is the `rightElement` of a
   `SettingRow` with a clear label, but the `Switch` itself carried no
   `accessibilityLabel`, so a screen reader announced only "switch, on/off" with no
   context. The app-version control had a good label (incl. its long-press hint)
   but no role.
3. **One dead style** (`comingSoon`) — `body` was a false positive (it is the
   `delete-account` request body, not a style). One **em dash in a code comment**
   (the no-em-dash rule covers comments).
4. **Copy note (kept).** The AUTH-5 sign-out Alert ("We couldn't sync your latest
   changes… Sign out anyway? Any changes since your last successful sync may be
   lost.") is longer than the terse norm, but it is a genuine data-loss warning
   before a destructive-ish action, so it stays.

### Design assessment (values cited)
- On-system: `surface` sections, `primary` row icons + switch track, `error` for
  destructive rows, scale tokens; switches use `withAlpha(primary, 0.5)` track.
  No fingerprints; no "coming soon" placeholders remain (the dead `comingSoon`
  style was the last trace).

### Flow / integration assessment
- `SettingRow` renders tappable rows as `PressableCard` and label+switch rows as a
  static `View` (the switch is the control). Health toggles call permission
  handlers; data actions use FileSystem/Sharing; sign-out has an offline escape
  hatch. Sound.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- A `Switch`/toggle needs an `accessibilityLabel` naming what it controls (a
  visible sibling label is not associated), plus its on/off state; this is the
  basis for the `SettingRow` injection. [React Native a11y; prior items]

---

## STEP C — COMPARISON

### Where Volyume leads
- A dense but well-structured hub with a reusable accessible row, terse error
  copy, and a genuine offline sign-out escape hatch.

### Where Volyume lags
- The toggles were unlabelled for screen readers (fixed in one place).

### Critical gaps
- None functional.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one
1. **`SettingRow` switch labelling.** When a `rightElement` has no
   `accessibilityLabel`, lend it the row `label` via `cloneElement` — labels all 13
   switches and any future ones in one place. [A11y — Low]
2. **App-version control.** `accessibilityRole="button"` (label already present).
   [A11y — Low]
3. **Remove the dead `comingSoon` style.** (`body` kept — it is the delete-account
   request body, not a style.) [Cleanup — Low]
4. **Em dash → colon** in the offline-sync comment. [Voice — Low]

### COPY CHANGES
None to user-facing copy. The AUTH-5 sign-out warning was reviewed and kept.

### What to keep (with evidence)
- The `SettingRow` pattern, terse error toasts, the sign-out escape hatch, and all
  copy. [React Native a11y]

### IMPACT / EFFORT
- **Impact: Low–Medium.** All 13 toggles now announce what they control; the fix
  is centralised in `SettingRow`.
- **Effort: Low.** One shared-row change plus small cleanups. eslint 0 problems;
  the Settings screen-mount variants (incl. random-tap fuzz) stay green.

### SOURCES
- React Native — Accessibility (label + state on controls):
  https://reactnative.dev/docs/accessibility
