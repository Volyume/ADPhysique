Status: COMPLETE | Timestamp: 2026-06-01 | Phase 4: weak-point investigation (findings, no code shipped)

# planEngine rebuild, phase 4: weak-point autoregulation investigation

Phase 4's plan-generation-relevant piece is weak-point cap-flexing (the spec's
section B: a weak-point muscle gets "a 3rd session OR a raised per-session cap
to 10-12"). This is the investigation result. Two candidate changes were built,
MEASURED to be inert, and reverted. The real lever was found and is recorded for
a focused next session. Nothing was shipped, because nothing measurably improved
output, and inert code is not shipped.

## What was tried and why it was inert

1. Per-session cap-flex (8 -> 12 for weak-point muscles, spec section B).
   MEASURED: across every division and day count, a weak-point muscle's
   per-session sets max out at 6-7, never above 8. The engine already uses the
   spec's OTHER option, it gives the weak muscle a 3rd session, so the 8-cap
   never binds. The flex changed no output. Reverted.

2. Weak-point overlay division-aware MRV. The overlay capped the weak-point
   bonus at the generic landmark MRV (glutes 16), so weak-pointing Bikini glutes
   (target ~28) clamped to 16. Fixing it to use the division-aware cap (30) is
   correct at the TARGET level, but DELIVERED Bikini weak-point glutes stayed at
   19 either way. Inert in delivered terms. Reverted.

## The real lever (for the next session)

Weak-point DELIVERED volume is bound by the SPLIT, not by the overlay target or
the per-session cap. Specifically: the `weak_point` phase BYPASSES the
DIVISION_MATRIX (`matrixCell` is computed only when `phase !== 'weak_point'`),
so a weak-point plan falls back to a legacy split and loses its division-
specific structure. Measured consequence: a 5-day Bikini base plan (glute-focus
matrix) delivers glutes 23; the same plan in weak-point phase delivers glutes 19,
LOWER, because it no longer uses the glute-led matrix split.

So the weak-point work that would actually change output is architectural:
- Route the `weak_point` phase THROUGH the division matrix so it keeps the
  division split, then layer the weak-point boost and extra weak-muscle session
  on top. Today the two systems do not compose.
- Once the split is right, the overlay division-aware MRV fix (item 2 above)
  becomes meaningful and should be re-applied (it is a real latent correctness
  bug: a weak-pointed Bikini glute should reach ~30, not 16).

## What is genuinely fine already

- At 5+ days the weak-point boost lands the weak muscle at a strong level
  (MP/Classic glutes 13-19, biceps 13) via the 3rd-session mechanism.
- The weak-point overlay correctly offsets the added volume against the
  lowest-priority muscles (systemic stress held) and keeps division character
  (coachDivisions weak-point test passes: shoulders stay dominant for MP).
- 3-day weak-points are inherently limited (the weak muscle gets 1 session);
  that is a day-count constraint, not a bug.

## Other Phase 4 items (out of planEngine scope)

Double-progression tracking, mesocycle accessory rotation and deload triggers
are RUNTIME concerns (workout logging, multi-week state), not single-plan
generation. They live in the app's session/tracking layer, not planEngine.js.
