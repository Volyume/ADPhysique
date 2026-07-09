/**
 * FirstFoodPrompt (design-usability audit 2026-07-09, finding L05-D2):
 * the calm, simple top-of-day DiaryScreen shows a brand-new account instead
 * of the full MacroRings, until it has logged its first food anywhere.
 *
 * Pins: the exact calm copy, that it shows at most one number (no rings,
 * no macro bars, no percentage split), and that it carries no colour
 * judgement (no success/warning/error tint anywhere in its tree).
 */
import { create } from 'react-test-renderer';
import FirstFoodPrompt from '../FirstFoodPrompt';
import { colors } from '../../../styles/theme';

describe('FirstFoodPrompt', () => {
  test('shows the calm invitation copy', () => {
    const tree = create(<FirstFoodPrompt targetKcal={2100} energyUnit="kcal" />);
    const texts = tree.root.findAll((n) => n.type === 'Text').map((n) => n.props.children);
    expect(texts.flat().join(' ')).toContain('Log your first food to see your day take shape.');
  });

  test('shows the day\'s target as a single plain factual line, kcal', () => {
    const tree = create(<FirstFoodPrompt targetKcal={2100} energyUnit="kcal" />);
    const texts = tree.root.findAll((n) => n.type === 'Text').map((n) => n.props.children);
    expect(texts.flat().join(' ')).toContain("Today's target is 2100 kcal.");
  });

  test('converts the target to kJ when that is the display unit (display-only, same as MacroRings)', () => {
    const tree = create(<FirstFoodPrompt targetKcal={2000} energyUnit="kj" />);
    const texts = tree.root.findAll((n) => n.type === 'Text').map((n) => n.props.children);
    // 2000 kcal * 4.184 = 8368 kJ
    expect(texts.flat().join(' ')).toContain("Today's target is 8368 kJ.");
  });

  test('omits the target line entirely when there is no target yet', () => {
    const tree = create(<FirstFoodPrompt targetKcal={null} energyUnit="kcal" />);
    const texts = tree.root.findAll((n) => n.type === 'Text').map((n) => n.props.children);
    expect(texts.flat().join(' ')).not.toContain('target');
  });

  test('renders no more than one number-bearing line (no dense grid of numbers)', () => {
    const tree = create(<FirstFoodPrompt targetKcal={2100} energyUnit="kcal" />);
    const texts = tree.root.findAll((n) => n.type === 'Text').map((n) => n.props.children.toString());
    const numberLines = texts.filter((t) => /\d/.test(t));
    expect(numberLines.length).toBe(1);
  });

  test('never carries a success/warning/error colour judgement (ED-safety: adherence-neutral)', () => {
    const tree = create(<FirstFoodPrompt targetKcal={2100} energyUnit="kcal" />);
    const colourValues = [];
    tree.root.findAll((n) => {
      const s = n.props?.style;
      const arr = Array.isArray(s) ? s : [s];
      for (const o of arr) {
        if (o && typeof o === 'object') {
          if (o.color) colourValues.push(o.color);
          if (o.backgroundColor) colourValues.push(o.backgroundColor);
        }
      }
      return false;
    });
    for (const c of colourValues) {
      expect(c).not.toBe(colors.success);
      expect(c).not.toBe(colors.warning);
      expect(c).not.toBe(colors.error);
    }
  });

  test('renders as an accessible summary, not an alert or a button', () => {
    const tree = create(<FirstFoodPrompt targetKcal={2100} energyUnit="kcal" />);
    const node = tree.root.findByProps({ accessibilityRole: 'summary' });
    expect(node).toBeTruthy();
  });
});
