/**
 * ExerciseSection (12-BUILD-SPEC sections 1.3, 2, 2a, 2b and 3, register D220).
 * Pins: the three states (active mounts children, bests and footer; done shows
 * the green check and the count; upcoming is the header only), every callback,
 * the bests line text, its omissions, its numeric spans and its pressable row,
 * the history and rest buttons, the accessibility labels, and the token-only
 * source guard.
 */
import fs from 'fs';
import path from 'path';
import { Animated, Text } from 'react-native';
import { create, act } from 'react-test-renderer';
import { colors, type, iconSize, radius } from '../../../../styles/theme';
import { touchTarget } from '../../../../styles/layout';
import ExerciseSection from '../ExerciseSection';

// The footer's Add set is the house Button, which reaches expo-haptics
// through lib/haptics; the native module is not present under Jest.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const DOT = String.fromCharCode(0x00b7);
const TIMES = String.fromCharCode(0x00d7);
const BESTS = {
  lastDateLabel: '6 Oct',
  heaviest: { weight: 75, reps: 6 },
  atWeight: { weight: 70, reps: 8 },
};

function render(props, children) {
  let tree;
  act(() => {
    tree = create(
      <ExerciseSection index={2} name="Barbell Row (Bent Over)" state="active" doneSetCount={0} {...props}>
        {children === undefined ? <Text>TABLE_CHILD</Text> : children}
      </ExerciseSection>,
    );
  });
  return tree;
}
const hosts = (tree, pred) => tree.root.findAll((n) => typeof n.type === 'string' && pred(n.props || {}));
const byLabel = (tree, label) => hosts(tree, (p) => p.accessibilityLabel === label);
const one = (list) => { expect(list).toHaveLength(1); return list[0]; };
const press = (node) => act(() => { node.props.onPress(); });
const flat = (style) => Object.assign({}, ...[].concat(style).filter(Boolean).map((s) => (Array.isArray(s) ? flat(s) : s)));
function words(node) {
  if (node == null) return [];
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap(words);
  return words(node.children);
}
const joined = (tree) => words(tree.toJSON()).join('');
const textHost = (tree, content) => one(tree.root.findAll(
  (n) => n.type === 'Text' && words(n).join('') === content,
));
const bestsRow = (tree) => one(byLabel(tree, 'History and records'));

describe('ExerciseSection states', () => {
  test('active: header, children and the footer; Swap only when onSwap is given', () => {
    const tree = render({});
    expect(joined(tree)).toContain('TABLE_CHILD');
    expect(words(tree.toJSON())).toEqual(expect.arrayContaining(['2', 'Barbell Row (Bent Over)', 'Add set']));
    one(byLabel(tree, 'Add set'));
    expect(byLabel(tree, 'Swap exercise')).toHaveLength(0);
    one(byLabel(tree, 'More options for this exercise'));
    const withSwap = render({ onSwap: jest.fn() });
    expect(words(withSwap.toJSON())).toContain('Swap');
    one(byLabel(withSwap, 'Swap exercise'));
  });

  test('done: green check and the count, nothing else', () => {
    const tree = render({ state: 'done', doneSetCount: 3 });
    expect(joined(tree)).not.toContain('TABLE_CHILD');
    expect(words(tree.toJSON())).toContain('3 sets');
    // The app's "done" mark: the filled success check, as the plan detail.
    const glyph = tree.root.findAll((n) => n.type === 'Ionicons' && n.props.name === 'checkmark-circle');
    expect(glyph).toHaveLength(1);
    expect(glyph[0].props.color).toBe(colors.success);
    expect(byLabel(tree, 'Add set')).toHaveLength(0);
    expect(byLabel(tree, 'Rest length for Barbell Row (Bent Over)')).toHaveLength(0);
    expect(byLabel(tree, '3 sets done')).toHaveLength(1);
  });

  test('done: one set is singular', () => {
    expect(words(render({ state: 'done', doneSetCount: 1 }).toJSON())).toContain('1 set');
  });

  test('upcoming: the header and its two small buttons only', () => {
    const tree = render({ state: 'upcoming', bests: BESTS, onRestLength: jest.fn(), onHistory: jest.fn() });
    expect(joined(tree)).not.toContain('TABLE_CHILD');
    expect(byLabel(tree, 'Add set')).toHaveLength(0);
    expect(byLabel(tree, 'History and records')).toHaveLength(0);
    one(byLabel(tree, 'Rest length for Barbell Row (Bent Over)'));
    one(byLabel(tree, 'History and records for Barbell Row (Bent Over)'));
  });

  test('a square well renders only when its callback is given (no dead control before its sheet is wired)', () => {
    const none = render({ state: 'upcoming' });
    expect(byLabel(none, 'Rest length for Barbell Row (Bent Over)')).toHaveLength(0);
    expect(byLabel(none, 'History and records for Barbell Row (Bent Over)')).toHaveLength(0);
    const restOnly = render({ state: 'upcoming', onRestLength: jest.fn() });
    one(byLabel(restOnly, 'Rest length for Barbell Row (Bent Over)'));
    expect(byLabel(restOnly, 'History and records for Barbell Row (Bent Over)')).toHaveLength(0);
  });

  test('groupLabel is a caption under the name and in the spoken label', () => {
    const tree = render({ state: 'upcoming', groupLabel: 'Superset' });
    textHost(tree, 'Superset');
    one(byLabel(tree, 'Exercise 2, Barbell Row (Bent Over), superset'));
  });

  test('skipped: muted name, "Left out" in the count slot, no wells, still tappable', () => {
    const onPressHeader = jest.fn();
    const tree = render({ state: 'upcoming', skipped: true, onPressHeader, onRestLength: jest.fn() });
    textHost(tree, 'Left out');
    expect(byLabel(tree, 'Rest length for Barbell Row (Bent Over)')).toHaveLength(0);
    const title = one(byLabel(tree, 'Exercise 2, Barbell Row (Bent Over), left out for time'));
    press(title);
    expect(onPressHeader).toHaveBeenCalledTimes(1);
    const name = textHost(tree, 'Barbell Row (Bent Over)');
    expect(flat(name.props.style).color).toBe(colors.textMuted);
  });

  test('moreHint: the word sits beside the overflow glyph in amber and the label says what is behind it', () => {
    const tree = render({ moreHint: 'Help' });
    textHost(tree, 'Help');
    one(byLabel(tree, 'More options for this exercise, including how logging works'));
    expect(byLabel(render({}), 'More options for this exercise')).toHaveLength(1);
  });

  test('state defaults to upcoming', () => {
    expect(joined(render({ state: undefined }))).not.toContain('TABLE_CHILD');
  });
});

describe('ExerciseSection header', () => {
  test('exercise name: bodyStrong in primary ink, up to two lines; the index in the plan detail\'s 32 dp order badge', () => {
    // The plan detail's exercise row (RoutineDetailScreen exerciseCard): the
    // name is text ink, not amber; amber is spent on the set you are on.
    const tree = render({});
    const name = textHost(tree, 'Barbell Row (Bent Over)');
    const s = flat(name.props.style);
    expect(s.color).toBe(colors.textPrimary);
    // Two lines, as the plan detail wraps a long name; never a clipped name.
    expect(name.props.numberOfLines).toBe(2);
    expect(s.fontFamily).toBe(type.bodyStrong.fontFamily);
    expect(s.fontSize).toBe(type.bodyStrong.fontSize);
    const indexText = textHost(tree, '2');
    const index = flat(indexText.props.style);
    expect(index.color).toBe(colors.textSecondary);
    expect(index.fontVariant).toEqual(['tabular-nums']);
    expect(index.fontSize).toBe(type.label.fontSize);
    expect(index.fontFamily).toBe(type.w(type.label, 'bold').fontFamily);
    const badge = flat(one(hosts(tree, (p) => flat(p.style).borderRadius === 16 && flat(p.style).width === 32)).props.style);
    expect(badge.width).toBe(32);
    expect(badge.height).toBe(32);
    expect(badge.borderRadius).toBe(16);
    expect(badge.backgroundColor).toBe(colors.surface2);
  });

  test('chevron is the app\'s 16 dp muted disclosure glyph', () => {
    const tree = render({});
    const chevron = tree.root.findAll((n) => n.type === 'Ionicons' && n.props.name === 'chevron-forward')[0];
    expect(chevron.props.size).toBe(16);
    expect(chevron.props.color).toBe(colors.textMuted);
  });

  test('title button names the exercise, carries the accordion state and a hint when inactive', () => {
    const active = one(byLabel(render({}), 'Exercise 2, Barbell Row (Bent Over)'));
    expect(active.props.accessibilityState).toEqual({ expanded: true });
    expect(active.props.accessibilityHint).toBeUndefined();
    const upcoming = one(byLabel(render({ state: 'upcoming' }), 'Exercise 2, Barbell Row (Bent Over)'));
    expect(upcoming.props.accessibilityState).toEqual({ expanded: false });
    expect(upcoming.props.accessibilityHint).toBe('Makes this the current exercise');
  });

  test('onPressHeader fires from the title and from the empty space; the spacer is hidden from TalkBack', () => {
    const onPressHeader = jest.fn();
    const tree = render({ state: 'upcoming', onPressHeader });
    press(one(byLabel(tree, 'Exercise 2, Barbell Row (Bent Over)')));
    const fill = hosts(tree, (p) => p.accessible === false && p.onPress === onPressHeader);
    expect(fill).toHaveLength(1);
    expect(fill[0].props.importantForAccessibility).toBe('no');
    press(fill[0]);
    expect(onPressHeader).toHaveBeenCalledTimes(2);
  });

  test('onDetails fires from the chevron only', () => {
    const onDetails = jest.fn();
    const onPressHeader = jest.fn();
    const tree = render({ onDetails, onPressHeader });
    press(one(byLabel(tree, 'Details for Barbell Row (Bent Over)')));
    expect(onDetails).toHaveBeenCalledTimes(1);
    expect(onPressHeader).not.toHaveBeenCalled();
  });

  test('rest and history buttons are chromeless 48 dp glyph targets in secondary ink; onRestLength and onHistory fire', () => {
    // As the header's X and Finish and the "..." overflow on this screen: a
    // glyph on the surface, no well, no border (founder order 2026-08-18).
    const onRestLength = jest.fn();
    const onHistory = jest.fn();
    const tree = render({ onRestLength, onHistory });
    const rest = one(byLabel(tree, 'Rest length for Barbell Row (Bent Over)'));
    const history = one(byLabel(tree, 'History and records for Barbell Row (Bent Over)'));
    [rest, history].forEach((node) => {
      const s = flat(node.props.style);
      expect(s.width).toBe(touchTarget.minimum);
      expect(s.height).toBe(touchTarget.minimum);
      expect(s.backgroundColor).toBeUndefined();
      expect(s.borderWidth).toBeUndefined();
      expect(s.borderColor).toBeUndefined();
    });
    const timer = tree.root.findAll((n) => n.type === 'Ionicons' && n.props.name === 'timer-outline');
    expect(timer).toHaveLength(1);
    expect(timer[0].props.color).toBe(colors.textSecondary);
    const stats = tree.root.findAll((n) => n.type === 'Ionicons' && n.props.name === 'stats-chart-outline');
    expect(stats).toHaveLength(1);
    expect(stats[0].props.size).toBe(iconSize.md);
    expect(stats[0].props.color).toBe(colors.textSecondary);
    press(rest);
    press(history);
    expect(onRestLength).toHaveBeenCalledTimes(1);
    expect(onHistory).toHaveBeenCalledTimes(1);
  });
});

describe('ExerciseSection footer', () => {
  test('Add set, Swap and the overflow call their callbacks', () => {
    const cb = { onAddSet: jest.fn(), onSwap: jest.fn(), onMore: jest.fn() };
    const tree = render(cb);
    press(one(byLabel(tree, 'Add set')));
    press(one(byLabel(tree, 'Swap exercise')));
    press(one(byLabel(tree, 'More options for this exercise')));
    Object.values(cb).forEach((fn) => expect(fn).toHaveBeenCalledTimes(1));
  });

  test('Add set and Swap are the house Button (secondary, small, leading glyph); the overflow stays a chromeless glyph', () => {
    // Button secondary: surface fill, 1 px border, textSecondary label and
    // glyph; the sm size carries a 16 dp glyph. Never a second primary (D8).
    const tree = render({ onSwap: jest.fn() });
    const add = one(hosts(tree, (p) => p.testID === 'volyume-btn-extra-set'));
    const addStyle = flat(add.props.style);
    expect(addStyle.backgroundColor).toBe(colors.surface);
    expect(addStyle.borderColor).toBe(colors.border);
    expect(addStyle.borderWidth).toBe(1);
    const addGlyph = add.findAll((n) => n.type === 'Ionicons' && n.props.name === 'add');
    expect(addGlyph).toHaveLength(1);
    expect(addGlyph[0].props.size).toBe(16);
    expect(addGlyph[0].props.color).toBe(colors.textSecondary);
    const label = flat(textHost(tree, 'Add set').props.style);
    expect(label.color).toBe(colors.textSecondary);
    expect(label.fontFamily).toBe(type.w(type.label, 'semibold').fontFamily);
    const swap = one(byLabel(tree, 'Swap exercise'));
    expect(swap.findAll((n) => n.type === 'Ionicons' && n.props.name === 'swap-horizontal')).toHaveLength(1);
    const more = one(hosts(tree, (p) => p.testID === 'volyume-section-more'));
    const moreStyle = flat(more.props.style);
    expect(moreStyle.backgroundColor).toBeUndefined();
    expect(moreStyle.borderWidth).toBeUndefined();
    expect(moreStyle.height).toBe(touchTarget.minimum);
  });
});

describe('ExerciseSection bests line (2a, 2b)', () => {
  test('the full line, with the numbers as their own spans', () => {
    const tree = render({ bests: BESTS });
    const row = bestsRow(tree);
    expect(words(row).join('')).toBe(`Last session 6 Oct ${DOT} Best 75 kg ${TIMES} 6 ${DOT} at 70 kg: 8 reps`);
    const nums = row.findAll((n) => n.type === 'Text' && flat(n.props.style).color === colors.textPrimary);
    expect(nums.flatMap((n) => words(n))).toEqual(['75', '6', '70', '8']);
    const s = flat(nums[0].props.style);
    expect(s.fontVariant).toEqual(['tabular-nums']);
    expect(s.fontSize).toBe(type.label.fontSize);
  });

  test('the line is label role in secondary ink and may wrap', () => {
    const row = bestsRow(render({ bests: BESTS }));
    const line = row.findAll((n) => n.type === 'Text' && flat(n.props.style).color === colors.textSecondary)[0];
    const s = flat(line.props.style);
    expect(s.fontSize).toBe(type.label.fontSize);
    expect(line.props.numberOfLines).toBeUndefined();
  });

  test('null parts are left out with their separator', () => {
    expect(words(bestsRow(render({ bests: { ...BESTS, heaviest: null } }))).join(''))
      .toBe(`Last session 6 Oct ${DOT} at 70 kg: 8 reps`);
    expect(words(bestsRow(render({ bests: { ...BESTS, atWeight: null } }))).join(''))
      .toBe(`Last session 6 Oct ${DOT} Best 75 kg ${TIMES} 6`);
    expect(words(bestsRow(render({ bests: { lastDateLabel: null, heaviest: BESTS.heaviest, atWeight: BESTS.atWeight } }))).join(''))
      .toBe(`Best 75 kg ${TIMES} 6 ${DOT} at 70 kg: 8 reps`);
    expect(words(bestsRow(render({ bests: { lastDateLabel: '6 Oct', heaviest: null, atWeight: null } }))).join(''))
      .toBe('Last session 6 Oct');
  });

  test('no parts, or bests null or absent: no line', () => {
    expect(byLabel(render({ bests: { lastDateLabel: '', heaviest: null, atWeight: null } }), 'History and records')).toHaveLength(0);
    expect(byLabel(render({ bests: null }), 'History and records')).toHaveLength(0);
    expect(byLabel(render({}), 'History and records')).toHaveLength(0);
  });

  test('one rep is singular; a unit can be supplied', () => {
    const row = bestsRow(render({ bests: { lastDateLabel: '6 Oct', heaviest: null, atWeight: { weight: 100, reps: 1 }, unit: 'lb' } }));
    expect(words(row).join('')).toContain('at 100 lb: 1 rep');
    expect(words(row).join('')).not.toContain('1 reps');
  });

  test('a pressable 48 dp row: History and records, spoken value, trailing muted chevron, calls onHistory', () => {
    const onHistory = jest.fn();
    const row = bestsRow(render({ bests: BESTS, onHistory }));
    expect(row.props.accessibilityRole).toBe('button');
    expect(flat(row.props.style).minHeight).toBe(48);
    expect(row.props.accessibilityValue.text).toBe(
      'Last session 6 Oct. Best 75 kilograms for 6 reps. At 70 kilograms, 8 reps.',
    );
    const chevron = row.findAll((n) => n.type === 'Ionicons');
    expect(chevron).toHaveLength(1);
    expect(chevron[0].props.name).toBe('chevron-forward');
    expect(chevron[0].props.color).toBe(colors.textMuted);
    expect(chevron[0].props.size).toBe(iconSize.sm);
    act(() => { row.props.onPress(); });
    expect(onHistory).toHaveBeenCalledTimes(1);
  });

  test('sits under the header and before the children', () => {
    const text = joined(render({ bests: BESTS }));
    expect(text.indexOf('Barbell Row')).toBeLessThan(text.indexOf('Last session'));
    expect(text.indexOf('Last session')).toBeLessThan(text.indexOf('TABLE_CHILD'));
  });

  test('done sections do not show it', () => {
    expect(byLabel(render({ state: 'done', bests: BESTS }), 'History and records')).toHaveLength(0);
  });
});

describe('ExerciseSection surface', () => {
  test('the house card: surface fill, radius.lg, 1 px borderSubtle, no band of its own', () => {
    // Card.js geometry, so the section sits in the page gap like every other
    // card in the app rather than a full-bleed band of its own.
    const root = render({}).toJSON();
    const s = flat(root.props.style);
    expect(s.backgroundColor).toBe(colors.surface);
    expect(s.borderRadius).toBe(radius.lg);
    expect(s.borderWidth).toBe(1);
    expect(s.borderColor).toBe(colors.borderSubtle);
    expect(s.overflow).toBe('hidden');
    expect(s.marginTop).toBeUndefined();
  });
});

describe('ExerciseSection countdown line', () => {
  const line = (tree) => hosts(tree, (p) => p.testID === 'volyume-countdown-line');
  const fill = (tree) => one(line(tree)).findAll((n) => typeof n.type === 'string')[1];

  test('nothing is drawn without a countdown, or while it is not active', () => {
    expect(line(render({}))).toHaveLength(0);
    expect(line(render({ countdown: null }))).toHaveLength(0);
    expect(line(render({ countdown: { active: false, ms: 1800, reduceMotion: false } }))).toHaveLength(0);
  });

  test('active: a 2 dp amber line along the top edge of the footer, hidden from the accessibility tree', () => {
    const tree = render({ countdown: { active: true, ms: 1800, reduceMotion: false } });
    const track = one(line(tree));
    const s = flat(track.props.style);
    expect(s.height).toBe(2);
    expect(s.position).toBe('absolute');
    expect(s.top).toBe(0);
    expect(s.left).toBe(0);
    expect(s.right).toBe(0);
    expect(track.props.accessibilityElementsHidden).toBe(true);
    expect(track.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(flat(fill(tree).props.style).backgroundColor).toBe(colors.primary);
    expect(flat(fill(tree).props.style).height).toBe(2);
  });

  test('the line sits inside the footer, so its top edge is the footer\'s', () => {
    const tree = render({ countdown: { active: true, ms: 1800, reduceMotion: false } });
    const footer = one(hosts(tree, (p) => flat(p.style).minHeight === 52));
    expect(footer.findAll((n) => n.props && n.props.testID === 'volyume-countdown-line').length).toBeGreaterThan(0);
  });

  test('it fills over ms with the width animation, and every fresh arming restarts it', () => {
    const timing = jest.spyOn(Animated, 'timing');
    try {
      const section = (countdown) => (
        <ExerciseSection index={2} name="Row" state="active" countdown={countdown}><Text>x</Text></ExerciseSection>
      );
      const tree = render({ countdown: { active: true, ms: 1000, reduceMotion: false } });
      expect(timing).toHaveBeenCalledTimes(1);
      expect(timing.mock.calls[0][1]).toEqual({ toValue: 1, duration: 1000, useNativeDriver: false });
      act(() => { tree.update(section({ active: false, ms: 1000, reduceMotion: false })); });
      expect(line(tree)).toHaveLength(0);
      act(() => { tree.update(section({ active: true, ms: 1800, reduceMotion: false })); });
      expect(timing).toHaveBeenCalledTimes(2);
      expect(timing.mock.calls[1][1]).toEqual({ toValue: 1, duration: 1800, useNativeDriver: false });
    } finally {
      timing.mockRestore();
    }
  });

  test('reduceMotion draws the full line at once and runs no animation', () => {
    const timing = jest.spyOn(Animated, 'timing');
    try {
      const tree = render({ countdown: { active: true, ms: 1800, reduceMotion: true } });
      expect(flat(fill(tree).props.style).width).toBe('100%');
      expect(flat(fill(tree).props.style).height).toBe(2);
      expect(flat(fill(tree).props.style).backgroundColor).toBe(colors.primary);
      expect(timing).not.toHaveBeenCalled();
    } finally {
      timing.mockRestore();
    }
  });

  test('it is not a control and does not take a press', () => {
    const tree = render({ countdown: { active: true, ms: 1800, reduceMotion: false } });
    expect(one(line(tree)).props.pointerEvents).toBe('none');
  });
});

describe('ExerciseSection footer test ids', () => {
  test('Add set is volyume-btn-extra-set and the overflow is volyume-section-more', () => {
    const tree = render({});
    expect(one(byLabel(tree, 'Add set')).props.testID).toBe('volyume-btn-extra-set');
    expect(one(byLabel(tree, 'More options for this exercise')).props.testID).toBe('volyume-section-more');
  });

  test('neither id exists outside the active state', () => {
    const tree = render({ state: 'upcoming' });
    expect(hosts(tree, (p) => p.testID === 'volyume-btn-extra-set' || p.testID === 'volyume-section-more')).toHaveLength(0);
  });
});

describe('ExerciseSection source guard (tokens only)', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'ExerciseSection.js'), 'utf8');
  test('no hex or rgb literal', () => {
    expect(SRC).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(SRC).not.toMatch(/rgba?\(/);
  });
  test('no fontSize or fontWeight literal', () => {
    expect(SRC).not.toMatch(/fontSize\s*:/);
    expect(SRC).not.toMatch(/fontWeight\s*:/);
  });
  test('no em dash', () => {
    expect(SRC).not.toContain(String.fromCharCode(0x2014));
  });
  test('no estimated max, plate readout, RPE or RIR', () => {
    expect(SRC).not.toMatch(/\b(e1rm|1rm|est\.? ?max|plate|rpe|rir)\b/i);
  });
});
