// Skia is a native dep; stub it so we can import the pure bandColour
// helper without pulling the canvas renderer into the node test env.
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Path: 'Path',
  Skia: { Path: { Make: () => ({ moveTo() {}, lineTo() {}, close() {} }) } },
}));

import { bandColour } from '../MacroRings';
import { colors } from '../../../styles/theme';

describe('bandColour (adherence-neutral, founder decision 2026-05-29)', () => {
  test('always the brand amber, regardless of under or over target', () => {
    expect(bandColour(0, 100)).toBe(colors.primary);
    expect(bandColour(80, 100)).toBe(colors.primary);
    expect(bandColour(100, 100)).toBe(colors.primary);
    expect(bandColour(150, 100)).toBe(colors.primary);
  });

  test('no target also resolves to the brand amber', () => {
    expect(bandColour(100, null)).toBe(colors.primary);
    expect(bandColour(0, undefined)).toBe(colors.primary);
    expect(bandColour()).toBe(colors.primary);
  });

  test('never signals success-green or warning-amber (no colour judgement)', () => {
    for (const [v, t] of [[0, 100], [95, 100], [100, 100], [106, 100], [200, 100]]) {
      const c = bandColour(v, t);
      expect(c).not.toBe(colors.success);
      expect(c).not.toBe(colors.warning);
      expect(c).not.toBe(colors.error);
    }
  });
});
