/**
 * volumeStatusColor resolver tests (A2-038).
 *
 * getVolumeStatus (algorithms.js) is pure and returns only a status string.
 * The body heatmap and volume bars resolve the colour through this helper, so
 * the colour-blind-safe and high-contrast palette swaps in applyAccessibility
 * must propagate. These tests lock that contract.
 */
import { getVolumeStatus } from '../../lib/algorithms';
import { volumeStatusColor, applyAccessibility, colors } from '../theme';

afterEach(() => {
  // Reset the in-place palette mutation so tests don't leak into each other.
  applyAccessibility({});
});

describe('volumeStatusColor', () => {
  test('covers every status getVolumeStatus can return', () => {
    // Drive the real statuses out of getVolumeStatus so the map can never
    // drift from the algorithm. chest landmarks: mev 6, mav 14, mrv 22.
    const statuses = new Set([
      getVolumeStatus(0, 'chest').status,    // below
      getVolumeStatus(7, 'chest').status,    // minimum (mev..mev+2)
      getVolumeStatus(12, 'chest').status,   // optimal
      getVolumeStatus(20, 'chest').status,   // near_mrv
      getVolumeStatus(30, 'chest').status,   // over_mrv
      getVolumeStatus(5, 'not_a_muscle').status, // unknown
    ]);
    for (const status of statuses) {
      const c = volumeStatusColor(status);
      expect(typeof c).toBe('string');
      expect(c.length).toBeGreaterThan(0);
    }
  });

  test('maps the key statuses to the semantic tokens', () => {
    expect(volumeStatusColor('optimal')).toBe(colors.success);
    expect(volumeStatusColor('over_mrv')).toBe(colors.error);
    expect(volumeStatusColor('minimum')).toBe(colors.warning);
    expect(volumeStatusColor('near_mrv')).toBe(colors.warning);
    expect(volumeStatusColor('below')).toBe(colors.textMuted);
    expect(volumeStatusColor('unknown')).toBe(colors.textMuted);
  });

  test('falls back to the muted token for an unrecognised status', () => {
    expect(volumeStatusColor('nonsense')).toBe(colors.textMuted);
    expect(volumeStatusColor(undefined)).toBe(colors.textMuted);
  });

  test('follows the colour-blind-safe palette swap (the actual A2-038 bug)', () => {
    const before = volumeStatusColor('optimal');
    applyAccessibility({ colorBlindSafe: true });
    const after = volumeStatusColor('optimal');
    expect(after).toBe(colors.success); // tracks the live token
    expect(after).not.toBe(before);     // and the token actually changed
  });
});
