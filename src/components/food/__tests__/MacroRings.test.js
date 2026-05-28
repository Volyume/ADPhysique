// Skia is a native dep; stub it so we can import the pure bandColour
// helper without pulling the canvas renderer into the node test env.
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Path: 'Path',
  Skia: { Path: { Make: () => ({ moveTo() {}, lineTo() {}, close() {} }) } },
}));

import { bandColour } from '../MacroRings';
import { colors } from '../../../styles/theme';

describe('bandColour (GAP row 8 three-band)', () => {
  test('no target → neutral brand amber', () => {
    expect(bandColour(100, null)).toBe(colors.primary);
    expect(bandColour(100, 0)).toBe(colors.primary);
    expect(bandColour(0, undefined)).toBe(colors.primary);
  });

  test('under target (below 95%) → brand amber', () => {
    expect(bandColour(0, 100)).toBe(colors.primary);
    expect(bandColour(80, 100)).toBe(colors.primary);
    expect(bandColour(94, 100)).toBe(colors.primary);
  });

  test('within 5% of target → success green', () => {
    expect(bandColour(95, 100)).toBe(colors.success);
    expect(bandColour(100, 100)).toBe(colors.success);
    expect(bandColour(105, 100)).toBe(colors.success);
  });

  test('over target (above 105%) → warning amber', () => {
    expect(bandColour(106, 100)).toBe(colors.warning);
    expect(bandColour(150, 100)).toBe(colors.warning);
  });

  test('the over band is amber, not red', () => {
    // Founder chose amber (#FFC107) for over target, deliberately not
    // red, to keep an over-target day a gentle signal. Locks the hex so
    // a future palette change to red fails CI and gets a second look.
    expect(colors.warning).toBe('#FFC107');
  });
});
