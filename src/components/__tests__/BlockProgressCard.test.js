/**
 * BlockProgressCard: "This week's plan" (planned vs actual sets per muscle).
 *
 * Progress-tab product-coherence ruling (lead brief, earlier campaign): the
 * card's header no longer restates "Week N/M", and with `onPress` it renders
 * through the shared PressableCard as a button that opens the volume heatmap;
 * without it, a plain View. Those two behaviours are unchanged and still pinned
 * (the last describe).
 *
 * RE-ANCHORED under D214 (Consistency elevation, lane 4; plan
 * `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` section 7.3 item 5, CS-7 to CS-10):
 *   - the header said "This week's plan" with "Effort 3/5" or "Recovery week"
 *     beside it; it now says what the rows COUNT and when, "Sets done so far
 *     this plan week", with "2 of 4 sessions done" beside it when a plan
 *     position exists and an (i) saying a plan week starts on the day the block
 *     started (CS-8). The effort line moved to the block card (CS-7), and "a
 *     recovery week" is named in one place only, the gated one, so this card
 *     can no longer call an adaptive adjustment a recovery week;
 *   - a row reads "5 of 12", not "5/12";
 *   - the fill is ink (`textSecondary`) at every level: the yellow at 70 to 99%
 *     and the amber at 100% contradicted the heatmap one tap away (CS-10).
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { Text, StyleSheet } from 'react-native';
import BlockProgressCard from '../BlockProgressCard';
import { colors } from '../../styles/theme';

const BLOCK_PROGRESS = [
  { muscle: 'chest', label: 'Chest', actual: 8, planned: 12 },
  { muscle: 'back', label: 'Back', actual: 12, planned: 12 },
  { muscle: 'quads', label: 'Quads', actual: 3, planned: 10 },
  { muscle: 'calves', label: 'Calves', actual: 0, planned: 6 },
];

function texts(tree) {
  return tree.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));
}

function render(props) {
  let tree;
  act(() => { tree = create(<BlockProgressCard blockProgress={BLOCK_PROGRESS} {...props} />); });
  return tree;
}

describe('the header names what the rows count and when (CS-8)', () => {
  test('with a plan position: "Sets done so far this plan week · 2 of 4 sessions done"', () => {
    const all = texts(render({ currentMesoWeek: { weekIndex: 2, plannedWeeks: 6 }, planWeek: { done: 2, required: 4 } }));
    expect(all).toContain('Sets done so far this plan week · 2 of 4 sessions done');
  });

  test('a single required session is singular; none done is "0 of 1 session done"', () => {
    expect(texts(render({ planWeek: { done: 0, required: 1 } }))).toContain('Sets done so far this plan week · 0 of 1 session done');
  });

  test('with no readable plan the sessions clause is left out, never guessed', () => {
    for (const planWeek of [null, undefined, { done: 2, required: null }, { done: 2, required: 0 }]) {
      const all = texts(render({ planWeek }));
      expect(all).toContain('Sets done so far this plan week');
      expect(all.join(' | ')).not.toMatch(/sessions? done/);
    }
  });

  test('the (i) says a plan week starts on the day the block started (CS-8)', () => {
    const tree = render({ planWeek: { done: 2, required: 4 } });
    const tip = tree.root.findAll((n) => typeof n.props.text === 'string')[0];
    // RE-ANCHORED D214 addendum 6 (lane 4 review S4): the (i) says the rows count
    // this plan week (not since the block began) and carries the credit rule.
    expect(tip.props.text).toContain('Plan weeks run for seven days from the day your block started');
    expect(tip.props.text).toContain('since this plan week began');
    expect(tip.props.text).toContain('A set counts once for the muscle it works most and half for each muscle that helps');
    expect(tip.props.text).not.toMatch(/Monday to Sunday only|easier|consider|should/i);
  });

  test('awaitingDecision -> "Block finished" (unchanged reading)', () => {
    const all = texts(render({ currentMesoWeek: { weekIndex: 5, plannedWeeks: 5, awaitingDecision: true } }));
    expect(all).toContain('Block finished');
  });

  test('the old header states are gone: no effort, no "Recovery week", no "Week N/M", no "This week\'s plan" title', () => {
    for (const currentMesoWeek of [
      { weekIndex: 5, plannedWeeks: 5, isDeload: true, rirTarget: 4 },
      { weekIndex: 2, plannedWeeks: 5, isDeload: false, rirTarget: 2 },
    ]) {
      const joined = texts(render({ currentMesoWeek })).join(' | ');
      expect(joined).not.toMatch(/Effort|Recovery week|Week \d+\/\d+|This week's plan/);
    }
  });
});

describe('rows read "5 of 12" with an ink fill at every level (CS-10)', () => {
  test('each row prints "<actual> of <planned>" as one string, never "<actual>/<planned>"', () => {
    const all = texts(render({}));
    expect(all).toEqual(expect.arrayContaining(['8 of 12', '12 of 12', '3 of 10', '0 of 6']));
    expect(all.join(' | ')).not.toMatch(/\d+\/\d+/);
  });

  test('the spoken label says "so far" and uses "of"', () => {
    const rows = render({}).root.findAll((n) => n.props.accessibilityRole === 'text');
    expect(rows.map((n) => n.props.accessibilityLabel)).toContain('Chest: 8 of 12 sets so far');
  });

  test('the fill is textSecondary at 0%, below 70%, 70 to 99% and 100%: never yellow, never amber', () => {
    const tree = render({});
    const fills = tree.root.findAll((n) => {
      const flat = StyleSheet.flatten(n.props.style);
      return n.type === 'View' && flat && typeof flat.width === 'string' && flat.width.endsWith('%') && flat.height === '100%';
    });
    expect(fills).toHaveLength(4);
    const widths = fills.map((n) => StyleSheet.flatten(n.props.style).width);
    expect(widths).toEqual(['67%', '100%', '30%', '0%']); // 8/12, 12/12, 3/10, 0/6
    for (const f of fills) {
      const bg = StyleSheet.flatten(f.props.style).backgroundColor;
      expect(bg).toBe(colors.textSecondary);
      expect(bg).not.toBe(colors.warning);
      expect(bg).not.toBe(colors.primary);
    }
  });

  test('source guard: no warning, amber or alpha-tinted fill is left in the card', () => {
    const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'BlockProgressCard.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    expect(SRC).not.toMatch(/colors\.(warning|primary|primaryFill|success|error|gold)\b/);
    expect(SRC).not.toMatch(/withAlpha|alpha\./);
    expect(SRC).toMatch(/barFill: \{ backgroundColor: t\.colors\.textSecondary \}/);
    // The live twin of the card edge is the card's own hairline (CS-19), not the bright border.
    expect(SRC).toMatch(/card: \{ backgroundColor: t\.colors\.surface, borderColor: t\.colors\.borderSubtle \}/);
  });

  test('nothing to show renders nothing', () => {
    expect(create(<BlockProgressCard blockProgress={[]} />).toJSON()).toBeNull();
    expect(create(<BlockProgressCard blockProgress={null} />).toJSON()).toBeNull();
  });
});

describe('BlockProgressCard onPress (pressable when supplied, plain otherwise)', () => {
  test('with onPress: renders a pressable button that calls onPress when pressed', () => {
    const onPress = jest.fn();
    const tree = render({ currentMesoWeek: { weekIndex: 2, plannedWeeks: 5, rirTarget: 2 }, onPress });
    // RE-ANCHORED D214 addendum 6 (lane 4 review S5): the header and its (i)
    // render OUTSIDE the pressable card, so the (i) is its own button; the
    // card is the button carrying the hint, named by the header's sentence.
    const button = tree.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityHint === 'Opens weekly volume by muscle')[0];
    expect(button).toBeTruthy();
    expect(button.props.accessibilityLabel).toMatch(/^Sets done so far this plan week/);
    const tip = tree.root.findAll((n) => n.type === 'InfoTooltip' || n.type?.name === 'InfoTooltip')[0];
    if (tip) {
      let p = tip.parent; let insidePressable = false;
      while (p) { if (p.props?.accessibilityHint === 'Opens weekly volume by muscle') insidePressable = true; p = p.parent; }
      expect(insidePressable).toBe(false);
    }
    act(() => { button.props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('without onPress: the card itself carries no button role (plain View, unchanged)', () => {
    const tree = render({ currentMesoWeek: { weekIndex: 2, plannedWeeks: 5, rirTarget: 2 } });
    // The outermost rendered host element is a plain View, not a Pressable.
    expect(tree.toJSON().type).toBe('View');
    // No element anywhere carries the onPress-only hint (InfoTooltip's own
    // internal Close button is unrelated and still renders regardless).
    const hinted = tree.root.findAll((n) => n.props.accessibilityHint === 'Opens weekly volume by muscle');
    expect(hinted.length).toBe(0);
  });
});
