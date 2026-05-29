// Skia is a native dep; stub it so we can import the pure bandColour
// helper without pulling the canvas renderer into the node test env.
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Path: 'Path',
  Skia: { Path: { Make: () => ({ moveTo() {}, lineTo() {}, close() {} }) } },
}));

import React from 'react';
import { create } from 'react-test-renderer';
import MacroRings, { bandColour } from '../MacroRings';
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

describe('MacroRings accessibility summary', () => {
  const rollup = { kcal_total: 1840, protein_g: 120, carbs_g: 180, fat_g: 60 };
  const targets = { targetKcal: 2100, proteinG: 160, carbsG: 220, fatG: 70 };

  test('spoken label summarises kcal + every macro with its target', () => {
    const tree = create(<MacroRings rollup={rollup} targets={targets} />);
    const node = tree.root.findByProps({ accessible: true });
    const label = node.props.accessibilityLabel;
    expect(label).toContain('1840 of 2100 calories');
    expect(label).toContain('protein 120 of 160 grams');
    expect(label).toContain('carbs 180 of 220 grams');
    expect(label).toContain('fat 60 of 70 grams');
  });

  test('adds the tap hint and a button role only when onPress is provided', () => {
    const withTap = create(<MacroRings rollup={rollup} targets={targets} onPress={() => {}} />);
    const tapNode = withTap.root.findByProps({ accessible: true });
    expect(tapNode.props.accessibilityRole).toBe('button');
    expect(tapNode.props.accessibilityLabel).toContain('Tap for the breakdown by meal.');

    const noTap = create(<MacroRings rollup={rollup} targets={targets} />);
    const node = noTap.root.findByProps({ accessible: true });
    expect(node.props.accessibilityRole).toBe('summary');
    expect(node.props.accessibilityLabel).not.toContain('Tap for');
  });

  test('omits "of target" when no targets are set', () => {
    const tree = create(<MacroRings rollup={rollup} targets={null} />);
    const label = tree.root.findByProps({ accessible: true }).props.accessibilityLabel;
    expect(label).toContain('1840 calories');
    expect(label).not.toContain('of 2100');
  });
});
