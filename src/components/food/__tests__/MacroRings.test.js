// Skia is a native dep; stub it so we can import the pure bandColour
// helper without pulling the canvas renderer into the node test env.
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Path: 'Path',
  Skia: { Path: { Make: () => ({ moveTo() {}, lineTo() {}, close() {} }) } },
}));

import { create } from 'react-test-renderer';
import MacroRings, { bandColour, buildBandColour } from '../MacroRings';
import { colors, resolveTheme } from '../../../styles/theme';

describe('bandColour (adherence-neutral, founder decision 2026-05-29)', () => {
  // Light-theme coverage audit LT-2/D7 (2026-07-09): the ring is a Skia
  // STROKE, so it takes the bright fill token (`primaryFill`), not the
  // muted text-ink token (`primary`) - see MacroRings.js's bandColour comment.
  test('always the brand amber fill, regardless of under or over target', () => {
    expect(bandColour(0, 100)).toBe(colors.primaryFill);
    expect(bandColour(80, 100)).toBe(colors.primaryFill);
    expect(bandColour(100, 100)).toBe(colors.primaryFill);
    expect(bandColour(150, 100)).toBe(colors.primaryFill);
  });

  test('no target also resolves to the brand amber fill', () => {
    expect(bandColour(100, null)).toBe(colors.primaryFill);
    expect(bandColour(0, undefined)).toBe(colors.primaryFill);
    expect(bandColour()).toBe(colors.primaryFill);
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

// CP-10 stage 4 (theming, Skia/chart consumers, 2026-07-10): buildBandColour
// is the live-theme variant of bandColour() above (same "build" pattern as
// theme.js's buildVolumeStatusColor) -- MacroRings.js's calorie ring now
// calls `buildBandColour(t.colors)` (from useTheme()) instead of the frozen
// bandColour(), so the ring tint stays in step with a live theme flip.
// bandColour() itself is untouched, still frozen-singleton, still covered
// by the describe block above.
describe('buildBandColour (CP-10 stage 4, live-theme variant)', () => {
  test('resolves the same primaryFill token as the legacy singleton, for the current (dark) palette', () => {
    expect(buildBandColour(colors)).toBe(bandColour());
  });

  test('reads off the PASSED-IN colour table, not the frozen singleton -- tracks a live theme flip', () => {
    const darkColors = resolveTheme({ theme: 'dark' }).colors;
    const lightColors = resolveTheme({ theme: 'light' }).colors;
    expect(buildBandColour(darkColors)).toBe(darkColors.primaryFill);
    expect(buildBandColour(lightColors)).toBe(lightColors.primaryFill);
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
    // E15-4: the hero numeral rides RollingNumber (a non-editable TextInput
    // host in tests); its resting text is defaultValue.
    const numerals = tree.root.findAll((n) => n.props?.defaultValue != null)
      .map((n) => n.props.defaultValue);
    // 2100 - 1840 = 260 left; eaten reference shows "1840" + "of 2100 kcal"
    expect(numerals).toContain('260');
    expect(numerals).toContain('1,840');
    expect(texts).toContain('left');
    expect(texts).toContain('of 2,100 kcal'); // R15 grouping (food Diary audit 2026-10-16, item 12)
  });

  test('over target reads "over" with the magnitude, never a separate alarm', () => {
    const rollup = { kcal_total: 2300, protein_g: 120, carbs_g: 180, fat_g: 60 };
    const targets = { targetKcal: 2100, proteinG: 160, carbsG: 220, fatG: 70 };
    const tree = create(<MacroRings rollup={rollup} targets={targets} />);
    const texts = tree.root.findAll((n) => n.type === 'Text' && typeof n.props.children !== 'object')
      .map((n) => n.props.children);
    const numerals = tree.root.findAll((n) => n.props?.defaultValue != null)
      .map((n) => n.props.defaultValue);
    expect(numerals).toContain('200'); // |2100 - 2300|
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
    expect(label).toContain('1,840 of 2,100 calories');
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
    expect(label).toContain('1,840 calories');
    expect(label).not.toContain('of 2,100');
  });

  // Food audit F-7: the summary is a polite live region so a screen reader
  // re-announces the new totals when intake changes.
  test('is a polite live region for live total updates', () => {
    const tree = create(<MacroRings rollup={rollup} targets={targets} />);
    const node = tree.root.findByProps({ accessible: true });
    expect(node.props.accessibilityLiveRegion).toBe('polite');
  });
});

// ---------------------------------------------------------------------------
// D230 food level-up, Wave 1 lane 1B (R2, R3, R15): chrome on the rings card.
//
// What this block pins, and why:
//  - "+N planned" in the ring centre is a FACT, not an action, so it is drawn
//    in ink (textSecondary) and not the brand amber (R2: one amber per screen,
//    and it is the scan button). The ring's own tint and the bar tints are
//    chart marks and are pinned unchanged by the suites above.
//  - The standing line "Planned means added ahead..." is gone from the card
//    (R3: explanation is on demand; its on-demand home is the breakdown sheet,
//    pinned in MacroBreakdownSheet.planned.test.js).
//  - The macro split reads in words ("30% protein · 40% carbs · 30% fat" plus
//    the "of calories" caption) and speaks the same words (R15).
//  - NOTHING safety-adjacent moved: the hero's left/over wording and ink and
//    the summary's planned sentence are re-asserted here (R24, inventory 3.1
//    item 8 is a presentation law).
// ---------------------------------------------------------------------------
describe('MacroRings chrome (D230 R2, R3, R15)', () => {
  const rollup = { kcal_total: 1740, protein_g: 120, carbs_g: 180, fat_g: 60 };
  const targets = { targetKcal: 2100, proteinG: 160, carbsG: 220, fatG: 70 };
  const planned = { kcal: 400, protein_g: 30, carbs_g: 40, fat_g: 10 };
  const fs = require('fs');
  const path = require('path');

  // react-native's StyleSheet.flatten is a shallow stub in this repo's jest
  // mock, and the house Text passes nested arrays, so merge them here.
  function flatStyle(style) {
    if (Array.isArray(style)) return style.reduce((acc, s) => ({ ...acc, ...flatStyle(s) }), {});
    return style && typeof style === 'object' ? style : {};
  }

  function hostTexts(tree) {
    return tree.root.findAll((n) => n.type === 'Text');
  }

  function textOf(node) {
    return [].concat(node.props.children ?? []).map((k) => (typeof k === 'string' || typeof k === 'number' ? String(k) : '')).join('');
  }

  test('"+N planned" in the ring centre is ink (textSecondary), never the brand amber', () => {
    const tree = create(<MacroRings rollup={rollup} targets={targets} planned={planned} />);
    // The ring-centre fragment is "+400 planned" (the bars carry "+30 planned" etc).
    const node = hostTexts(tree).find((n) => textOf(n) === '+400 planned');
    expect(node).toBeDefined();
    const colour = flatStyle(node.props.style).color;
    expect(colour).toBe(colors.textSecondary);
    expect(colour).not.toBe(colors.primary);
    expect(colour).not.toBe(colors.primaryFill);
  });

  test('the frozen and the live style blocks both name the ink token (the live block wins at render)', () => {
    // buildLiveStyles overrides the frozen colour at render, so a lone edit to
    // the frozen block would leave the amber on screen. Both must say ink.
    const src = fs.readFileSync(path.resolve(__dirname, '../MacroRings.js'), 'utf8');
    expect(src).toMatch(/kcalPlanned: \{\s*color: colors\.textSecondary/);
    expect(src).toMatch(/kcalPlanned: \{ color: t\.colors\.textSecondary/);
  });

  test('the standing "Planned means added ahead" line is absent, with or without planned food', () => {
    for (const p of [planned, null]) {
      const tree = create(<MacroRings rollup={rollup} targets={targets} planned={p} />);
      const all = hostTexts(tree).map(textOf).join(' | ');
      expect(all).not.toMatch(/Planned means/);
      expect(all).not.toMatch(/mark it eaten/);
    }
    const src = fs.readFileSync(path.resolve(__dirname, '../MacroRings.js'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/Planned means|plannedHint/);
  });

  test('the macro split reads in words: 28% protein · 41% carbs · 31% fat, with "of calories"', () => {
    // 120 g P = 480 kcal, 180 g C = 720 kcal, 60 g F = 540 kcal; total 1740.
    const tree = create(<MacroRings rollup={rollup} targets={targets} />);
    const split = hostTexts(tree).find((n) => /protein ·/.test(textOf(n)));
    expect(split).toBeDefined();
    expect(textOf(split)).toBe('28% protein · 41% carbs · 31% fat');
    const caption = hostTexts(tree).find((n) => textOf(n) === ' of calories');
    expect(caption).toBeDefined();
    // The old letters grammar is gone.
    expect(hostTexts(tree).map(textOf).join(' | ')).not.toMatch(/P \d+% - C/);
  });

  test('the split line speaks the same words', () => {
    const tree = create(<MacroRings rollup={rollup} targets={targets} />);
    const split = hostTexts(tree).find((n) => /protein ·/.test(textOf(n)));
    expect(split.props.accessibilityLabel).toBe('28% protein, 41% carbs, 31% fat of calories');
  });

  test('no split line when nothing is eaten yet', () => {
    const tree = create(<MacroRings rollup={{ kcal_total: 0 }} targets={targets} />);
    expect(hostTexts(tree).map(textOf).join(' | ')).not.toMatch(/% protein/);
  });

  test('R24 still holds: the hero says left / over in the same ink, and the summary keeps its planned sentence', () => {
    const over = create(<MacroRings rollup={{ ...rollup, kcal_total: 2300 }} targets={targets} planned={planned} />);
    const overLabel = hostTexts(over).find((n) => textOf(n) === 'over');
    const left = create(<MacroRings rollup={rollup} targets={targets} planned={planned} />);
    const leftLabel = hostTexts(left).find((n) => textOf(n) === 'left');
    expect(flatStyle(overLabel.props.style).color).toBe(flatStyle(leftLabel.props.style).color);
    const summary = left.root.findByProps({ accessible: true }).props.accessibilityLabel;
    expect(summary).toContain('400 calories planned but not yet confirmed eaten');
    expect(left.root.findByProps({ accessible: true }).props.accessibilityLiveRegion).toBe('polite');
  });
});

// Founder decision 2026-10-20 ("Open the diary"): before coaching is set up
// the diary shows the day's totals only. Pins: no ring canvas, no bar track,
// no "of N", no left/over, no per-kg line; calories, protein, carbs, fat read
// as plain numbers.
describe('totalsOnly (diary before coaching is set up)', () => {
  const rollup = { kcal_total: 1840, protein_g: 120, carbs_g: 180, fat_g: 60 };

  test('shows eaten totals as plain numbers with no ring, no target or remaining figure', () => {
    const tree = create(<MacroRings rollup={rollup} targets={null} totalsOnly />);
    expect(tree.root.findAll((n) => n.type === 'Canvas')).toHaveLength(0);
    const numerals = tree.root.findAll((n) => n.props?.defaultValue != null).map((n) => n.props.defaultValue);
    expect(numerals).toContain('1,840');
    const texts = tree.root.findAll((n) => n.type === 'Text')
      .map((n) => [].concat(n.props.children ?? []).map((k) => (typeof k === 'string' || typeof k === 'number' ? String(k) : '')).join(''))
      .join(' | ');
    expect(texts).toContain('120');
    expect(texts).toContain('180');
    expect(texts).toContain('60');
    expect(texts).not.toMatch(/\bof [\d,]+/);
    expect(texts).not.toMatch(/\b(left|over|to go)\b/);
    expect(texts).not.toContain('g/kg');
    const label = tree.root.findByProps({ accessible: true }).props.accessibilityLabel;
    expect(label).toContain('1,840 calories');
    expect(label).not.toMatch(/ of [\d,]+/);
  });

  test('default (not totalsOnly) still draws the ring', () => {
    const tree = create(<MacroRings rollup={rollup} targets={null} />);
    expect(tree.root.findAll((n) => n.type === 'Canvas').length).toBeGreaterThan(0);
  });
});
