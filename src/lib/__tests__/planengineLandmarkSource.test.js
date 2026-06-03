/**
 * The generator's floor/cap landmarks (SPEC_LANDMARKS) are derived from the
 * tracker's VOLUME_LANDMARKS plus explicit, spec-cited overrides, so the two
 * are one source of truth instead of two literals that can silently drift.
 *
 * This locks the exact resolved table to the deliberate plan-engine
 * rebuild-spec figures (planengine-rebuild-01-phase1-tests.md). It is zero
 * change from the original standalone SPEC_LANDMARKS literal: if a future edit
 * to VOLUME_LANDMARKS or to the override list moves a generator landmark, this
 * test fails and forces a conscious decision rather than a silent plan change.
 */
import { SPEC_LANDMARKS } from '../planEngine';

describe('SPEC_LANDMARKS single source of truth', () => {
  test('resolves to the deliberate rebuild-spec values', () => {
    expect(SPEC_LANDMARKS).toEqual({
      chest:       { MV: 4, MEV: 6,  MRV: 22 },
      back:        { MV: 8, MEV: 10, MRV: 25 },
      side_delts:  { MV: 6, MEV: 8,  MRV: 20 },
      rear_delts:  { MV: 0, MEV: 0,  MRV: 14 },
      front_delts: { MV: 0, MEV: 0,  MRV: 12 },
      biceps:      { MV: 5, MEV: 8,  MRV: 20 },
      triceps:     { MV: 4, MEV: 6,  MRV: 18 },
      quads:       { MV: 6, MEV: 8,  MRV: 20 },
      hamstrings:  { MV: 4, MEV: 6,  MRV: 20 },
      glutes:      { MV: 4, MEV: 6,  MRV: 16 },
      calves:      { MV: 6, MEV: 8,  MRV: 20 },
      abs:         { MV: 0, MEV: 6,  MRV: 25 },
      traps:       { MV: 0, MEV: 0,  MRV: 26 },
      forearms:    { MV: 0, MEV: 0,  MRV: 16 },
      adductors:   { MV: 0, MEV: 0,  MRV: 12 },
    });
  });

  test('does not program tracker-only muscles (neck, tibialis)', () => {
    expect(SPEC_LANDMARKS.neck).toBeUndefined();
    expect(SPEC_LANDMARKS.tibialis).toBeUndefined();
  });
});
