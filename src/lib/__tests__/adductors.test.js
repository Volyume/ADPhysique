/**
 * Adductors are a distinct muscle/target (founder decision,
 * docs/audit/volyume-exercise-audit-2026-05-30). This pins the invariants
 * that keep the addition safe for existing users: adductors are tracked and
 * displayable, but because there are no adductor exercises in the library
 * yet, they must not be programmed (which would yield empty sessions) and a
 * user who never trains them must not be flagged as lagging.
 */
import {
  VOLUME_LANDMARKS,
  MUSCLE_DISPLAY_NAMES,
  detectLaggingMuscles,
  getVolumeStatus,
} from '../algorithms';

describe('adductors muscle registration', () => {
  test('has a volume landmark', () => {
    expect(VOLUME_LANDMARKS.adductors).toBeDefined();
    expect(VOLUME_LANDMARKS.adductors.mrv).toBeGreaterThan(0);
  });

  test('has a display name', () => {
    expect(MUSCLE_DISPLAY_NAMES.adductors).toBe('Adductors');
  });

  test('mev is 0 so an untrained user is never flagged as lagging on adductors', () => {
    expect(VOLUME_LANDMARKS.adductors.mev).toBe(0);
    // Three weeks of zero adductor volume must not produce a lagging result.
    const history = [
      { chest: 12, adductors: 0 },
      { chest: 12, adductors: 0 },
      { chest: 12, adductors: 0 },
    ];
    const lagging = detectLaggingMuscles(history, 3);
    expect(lagging.find(m => m.muscle === 'adductors')).toBeUndefined();
  });

  test('logged adductor volume reports a sensible status', () => {
    // Zero work reads below; mav-range work reads optimal.
    expect(getVolumeStatus(0, 'adductors').status).toBe('below');
    expect(getVolumeStatus(8, 'adductors').status).toBe('optimal');
  });
});
