# VOLYUME Pulse — Home steps tile + recovery-driver fix (2026-07-14)

Source-of-truth spec for the first, minimal slice of the WHOOP-style UI request
(founder, 2026-07-14: "active steps for the day on the home page and things like
that") plus the follow-up correctness fix the accuracy review surfaced. Code
edits under `src/` quote the normative lines here via `.claude/edit-gate`.

This is deliberately a small first step. The broader multi-screen WHOOP restyle
is NOT in scope here and awaits the founder's explicit direction on how far to go
and how closely to mirror WHOOP's exact look.

## Change A — Today's steps on the Home screen (`src/screens/HomeScreen.tsx`)

**Rationale.** WHOOP's overview surfaces the day's step count. Pulse already
decodes and stores today's steps (`steps` in the store) but the Home screen does
not show them.

**Spec (normative):**

- The Home screen shows today's step count as a tappable WHOOP-style tile that
  opens the existing steps detail (`metric` route, key `steps`).
- The steps tile reads the live store step total, shows an em dash when no step
  total has been decoded yet, and never invents a value.
- The tile uses the app's own step colour and footsteps icon; it does not copy
  WHOOP's exact colours or branding.

## Change B — Recovery driver insight respects the active weight profile (`src/screens/RecoveryScreen.tsx`)

**Rationale.** After recovery became HRV-dominant, sleep and skin temperature
carry zero weight in the default score, but the driver insight could still
announce "Sleep is dragging recovery". Attribution must match the score.

**Spec (normative):**

- The recovery driver insight only considers signals that carry weight in the
  active recovery profile, taken from the computed contributor list, so a
  zero-weight signal is never named as dragging or supporting recovery.
- When no weighted contributors are available the insight falls back to its
  previous signal list, so older stored rows still produce an insight.

## Verification

- `npm run typecheck`.
- Manual read-through; these are presentational changes with no unit-test
  surface. British English; commit messages carry no attribution.
