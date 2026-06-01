Status: COMPLETE | Timestamp: 2026-06-01 | Phase 4: weak-point composes with division split

# planEngine rebuild, phase 4: weak-point specialisation

The weak_point phase now keeps the division matrix split (it used to drop to
a generic upper/lower that lost division character and could even REDUCE an
already-emphasised muscle). The weak muscle is boosted toward its division-
aware MRV, delivered via extra weak-muscle sessions + a flexed per-session cap
(8 -> 12), and the boost respects MRV.

## Matrix divisions, glute weak-point (5-day advanced, library path)

| Division | split kept | glutes base -> WP | MRV |
|---|---|---|---|
| mens_physique | V-Taper | 3 -> 14 | 16 |
| classic_physique | X-Frame | 3 -> 14 | 16 |
| bikini | Glute Focus | 24 -> 24 | 30 |
| wellness | Lower Focus | 20 -> 22 | 30 |
| figure | X-Frame | 11 -> 15 | 16 |
| womens_physique | V-Taper | 6 -> 14 | 16 |

## What changed

- The weak_point phase uses the DIVISION_MATRIX (was excluded before).
- buildFromMatrix gives a weak-point muscle extra sessions so its boosted
  weekly target can be delivered at <= ~9 sets/session.
- buildSession flexes the per-session cap to 12 for a weak-point muscle.
- The weak-point overlay uses the division-aware MRV (Bikini/Wellness glutes
  30, not the generic 16) and never reduces a muscle. Boost raised to ~70% of
  the gap to MRV (a real specialisation, Helms).

## Known residual (pre-existing, non-matrix divisions)

General, Bodybuilding and Women's Bodybuilding are not in the matrix, so their
weak_point still uses the legacy upper_lower_wp (a dedicated weak-point day, a
tested split). That day is now clamped so the weak muscle stays at/near MRV,
but the base upper/lower can still push a glute weak-point slightly over the
generic MRV 16 (about 19). Pre-existing; not worsened. The clean fix is to
route these divisions through the matrix too, which also changes their non-
weak-point split label (the planEngine general->ppl test would move). Deferred.
