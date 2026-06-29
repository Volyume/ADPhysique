// Skia is a native dep; stub it so we can import the pure bandColour
// helper without pulling the canvas renderer into the node test env.
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Path: 'Path',
  Skia: { Path: { Make: () => ({ moveTo() {}, lineTo() {}, close() {} }) } },
}));

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

// Per-macro CATEGORY colours (founder decision 2026-06-29). The bars are tinted
// by WHICH macro they are, never by adherence; the safety line is that (a) a macro
// tint is never a traffic-light state colour, and (b) the overall calorie ring
// stays neutral amber (bandColour, above) so calorie hit/miss is never colour-judged.
describe('per-macro category colours', () => {
  const rollup = { kcal_total: 1840, protein_g: 120, carbs_g: 180, fat_g: 60, fibre_g: 12 };
  const targets = { targetKcal: 2100, proteinG: 160, carbsG: 220, fatG: 70, fibreG: 30 };

  // Collect every backgroundColor applied anywhere in the tree (bar fills carry
  // an inline { backgroundColor: tint }).
  function bgColours(tree) {
    const out = [];
    tree.root.findAll((n) => {
      const s = n.props?.style;
      const arr = Array.isArray(s) ? s : [s];
      for (const o of arr) if (o && typeof o === 'object' && o.backgroundColor) out.push(o.backgroundColor);
      return false;
    });
    return out;
  }

  test('carbs and fat bars use their distinct category hues, protein stays brand amber', () => {
    const bg = bgColours(create(<MacroRings rollup={rollup} targets={targets} />));
    expect(bg).toContain(colors.macroCarb);
    expect(bg).toContain(colors.macroFat);
    expect(bg).toContain(colors.macroProtein); // == colors.primary (brand amber)
  });

  test('no macro tint is a traffic-light state colour (never reads as good/bad)', () => {
    for (const tint of [colors.macroProtein, colors.macroCarb, colors.macroFat, colors.macroFibre]) {
      expect(tint).not.toBe(colors.success);
      expect(tint).not.toBe(colors.warning);
      expect(tint).not.toBe(colors.error);
    }
  });
});

describe('remaining-as-hero (founder decision 2026-06-29)', () => {
  test('the ring centre shows calories LEFT, with eaten/target as the quiet reference', () => {
    const rollup = { kcal_total: 1840, protein_g: 120, carbs_g: 180, fat_g: 60 };
    const targets = { targetKcal: 2100, proteinG: 160, carbsG: 220, fatG: 70 };
    const tree = create(<MacroRings rollup={rollup} targets={targets} />);
    const texts = tree.root.findAll((n) => n.type === 'Text' && typeof n.props.children !== 'object')
      .map((n) => n.props.children);
    // 2100 - 1840 = 260 left
    expect(texts).toContain(260);
    expect(texts).toContain('left');
    expect(texts).toContain('of 2100 eaten');
  });

  test('over target reads "over" with the magnitude, never a separate alarm', () => {
    const rollup = { kcal_total: 2300, protein_g: 120, carbs_g: 180, fat_g: 60 };
    const targets = { targetKcal: 2100, proteinG: 160, carbsG: 220, fatG: 70 };
    const tree = create(<MacroRings rollup={rollup} targets={targets} />);
    const texts = tree.root.findAll((n) => n.type === 'Text' && typeof n.props.children !== 'object')
      .map((n) => n.props.children);
    expect(texts).toContain(200); // |2100 - 2300|
    expect(texts).toContain('over');
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

  // Food audit F-7: the summary is a polite live region so a screen reader
  // re-announces the new totals when intake changes.
  test('is a polite live region for live total updates', () => {
    const tree = create(<MacroRings rollup={rollup} targets={targets} />);
    const node = tree.root.findByProps({ accessible: true });
    expect(node.props.accessibilityLiveRegion).toBe('polite');
  });
});
