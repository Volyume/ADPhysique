/**
 * CalorieBankSheet, "Plan a higher-calorie day" (D230 food level-up, R3, R4,
 * R15, R16, 4.9).
 *
 * What this suite pins, and why:
 *  - The day chips are the HOUSE Chip, single-select, role "radio", and each
 *    is at least 48 dp tall (the platform minimum), because they are the
 *    sheet's one-tap control and were about 34 dp hand-rolled "buttons".
 *  - The amount is the HOUSE Stepper: it steps by BUMP_STEP, never goes below
 *    BUMP_STEP, never above the day's real headroom (stepMax), and shows the
 *    value as "+150". The ceiling is the safety-adjacent part: a stepper that
 *    could pass stepMax would preview an amount the engine would refuse.
 *  - "Plan it" is the HOUSE Button, disabled when the plan is not ok, and
 *    when it is ok it hands back exactly the payload the Diary persists
 *    (weekStartKey, bigDayKey, perDayDeltaKcal, appliedAt). The payload and the
 *    floors are R24: this redesign moves chrome, never the maths.
 *  - Explanation is on demand (R3): the four BANK_RULES lines are hidden until
 *    "How this works" is pressed, and are the unchanged calorieBank lines.
 *  - The title is a screen-reader heading, and no string in the file speaks in
 *    the collaborative "we".
 *
 * Rendered with react-test-renderer against the real house parts (the
 * @gorhom/bottom-sheet and Reanimated manual mocks are global).
 */
// The house Button reaches the haptics vocabulary (expo-haptics, a native
// module) at import time; stub it as the other component suites do.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import CalorieBankSheet from '../CalorieBankSheet';
import { BANK_RULES } from '../../../lib/food/calorieBank';

const WEEK = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'];
const LABELS = { '2026-10-12': 'Mon', '2026-10-13': 'Tue', '2026-10-14': 'Wed', '2026-10-15': 'Thu', '2026-10-16': 'Fri', '2026-10-17': 'Sat', '2026-10-18': 'Sun' };
const dayLabel = (d) => LABELS[d] ?? d;

// Headroom for the default week below: base 2400, band cap 2640, so the big day
// can rise by at most 240 and the stepper's ceiling is the largest 50 step at
// or below that, 200.
const ROOMY = { baseTargetKcal: 2400, floorKcal: 1500, bandMaxKcal: 2640 };
// A base below the safe minimum: planCalorieBank refuses ('floor').
const BELOW_FLOOR = { baseTargetKcal: 1400, floorKcal: 1500, bandMaxKcal: 1540 };

function mount(props = {}) {
  const onApply = jest.fn();
  let tree;
  act(() => {
    tree = create(
      <CalorieBankSheet
        visible
        onClose={() => {}}
        weekDates={WEEK}
        defaultBigDay="2026-10-16"
        {...ROOMY}
        onApply={onApply}
        dayLabel={dayLabel}
        {...props}
      />,
    );
  });
  return { tree, onApply };
}

// Host-level text (the house Text renders a host 'Text').
function allText(tree) {
  const out = [];
  tree.root.findAll((n) => {
    if (n.type === 'Text') {
      const kids = [].concat(n.props.children ?? []);
      const s = kids.filter((k) => typeof k === 'string' || typeof k === 'number').join('');
      if (s) out.push(s);
    }
    return false;
  });
  return out;
}

const joined = (tree) => allText(tree).join(' | ');

// react-native's StyleSheet.flatten is a shallow stub in this repo's jest
// mock, and the house parts pass nested style arrays, so merge them here.
function flatStyle(style) {
  if (Array.isArray(style)) return style.reduce((acc, s) => ({ ...acc, ...flatStyle(s) }), {});
  return style && typeof style === 'object' ? style : {};
}

// The pressable nodes for a label. The house parts forward the props through
// several wrapper layers, so the same control appears once per layer; they are
// returned outermost first, and `deepest` gives the host node that carries the
// final role, state and style.
function pressables(tree, label) {
  return tree.root.findAll((n) => n.props?.accessibilityLabel === label && typeof n.props.onPress === 'function');
}
const deepest = (nodes) => nodes[nodes.length - 1];

function press(tree, label) {
  const [node] = pressables(tree, label);
  expect(node).toBeDefined();
  act(() => { node.props.onPress(); });
}

function radios(tree) {
  // One node per chip: the deepest layer that carries role + checked state.
  // (The Chip element itself carries `label`, not the spoken label, so it is skipped.)
  const all = tree.root.findAll((n) => n.props?.accessibilityRole === 'radio' && typeof n.props.onPress === 'function' && n.props.accessibilityLabel != null);
  const byLabel = new Map();
  for (const n of all) byLabel.set(n.props.accessibilityLabel, n);
  return [...byLabel.values()];
}

describe('day chips are the house Chip: radio, single-select, 48 dp', () => {
  test('one radio chip per day, role radio, none left as a plain button', () => {
    const { tree } = mount();
    const chips = radios(tree);
    expect(chips).toHaveLength(WEEK.length);
    expect(chips.map((c) => c.props.accessibilityLabel)).toEqual(WEEK.map(dayLabel));
  });

  test('exactly the chosen day is checked, and pressing another day moves it', () => {
    const { tree } = mount();
    const checked = () => radios(tree).filter((c) => c.props.accessibilityState?.checked).map((c) => c.props.accessibilityLabel);
    expect(checked()).toEqual(['Fri']);
    act(() => { radios(tree).find((c) => c.props.accessibilityLabel === 'Sun').props.onPress(); });
    expect(checked()).toEqual(['Sun']);
  });

  test('every chip is at least 48 dp tall', () => {
    const { tree } = mount();
    for (const c of radios(tree)) {
      const h = flatStyle(c.props.style).minHeight;
      expect(h).toBeGreaterThanOrEqual(48);
    }
  });

  test('the chips sit in a radio group', () => {
    const { tree } = mount();
    const group = tree.root.findAll((n) => n.props?.accessibilityRole === 'radiogroup');
    expect(group.length).toBeGreaterThan(0);
  });
});

describe('the amount is the house Stepper, clamped to BUMP_STEP and stepMax', () => {
  const value = (tree) => allText(tree).filter((s) => /^\+\d+$/.test(s));

  test('starts at +150 and shows the value with a plus', () => {
    const { tree } = mount();
    expect(value(tree)).toEqual(['+150']);
  });

  test('More stops at the day\'s headroom (200 here), never beyond', () => {
    const { tree } = mount();
    press(tree, 'More');
    expect(value(tree)).toEqual(['+200']);
    // At the ceiling the control is disabled; pressing it again changes nothing.
    const more = deepest(pressables(tree, 'More'));
    expect(more.props.disabled).toBe(true);
    act(() => { more.props.onPress(); });
    expect(value(tree)).toEqual(['+200']);
  });

  test('Less stops at BUMP_STEP (50), never below', () => {
    const { tree } = mount();
    press(tree, 'Less'); // 100
    press(tree, 'Less'); // 50
    expect(value(tree)).toEqual(['+50']);
    const less = deepest(pressables(tree, 'Less'));
    expect(less.props.disabled).toBe(true);
    act(() => { less.props.onPress(); });
    expect(value(tree)).toEqual(['+50']);
  });

  test('the preview follows the stepper (the plan is recomputed from the clamped value)', () => {
    const { tree } = mount();
    press(tree, 'More'); // 200: Friday 2600
    expect(joined(tree)).toMatch(/Fri: 2600 kcal/);
  });
});

describe('"Plan it" is the house Button, disabled when the plan is not ok', () => {
  test('enabled with a roomy week: pressing it hands back the unchanged payload', () => {
    const { tree, onApply } = mount();
    const btn = deepest(pressables(tree, 'Apply the higher-calorie day'));
    expect(btn.props.accessibilityState?.disabled).toBe(false);
    press(tree, 'Apply the higher-calorie day');
    expect(onApply).toHaveBeenCalledTimes(1);
    const payload = onApply.mock.calls[0][0];
    expect(Object.keys(payload).sort()).toEqual(['appliedAt', 'bigDayKey', 'perDayDeltaKcal', 'weekStartKey']);
    expect(payload.bigDayKey).toBe('2026-10-16');
    expect(payload.weekStartKey).toBe('2026-10-12');
    expect(payload.perDayDeltaKcal['2026-10-16']).toBe(150);
    // Weekly total unchanged: the deltas sum to zero.
    expect(Object.values(payload.perDayDeltaKcal).reduce((a, n) => a + n, 0)).toBe(0);
  });

  test('a base below the safe minimum: the plan is refused, the button is disabled and does nothing', () => {
    const { tree, onApply } = mount(BELOW_FLOOR);
    expect(joined(tree)).toMatch(/safe minimum/);
    const nodes = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Apply the higher-calorie day');
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.some((n) => n.props.accessibilityState?.disabled === true)).toBe(true);
    for (const n of nodes) {
      if (typeof n.props.onPress === 'function') act(() => { n.props.onPress(); });
    }
    expect(onApply).not.toHaveBeenCalled();
  });

  test('the button reads "Plan it"', () => {
    const { tree } = mount();
    expect(allText(tree)).toContain('Plan it');
  });
});

describe('explanation is on demand: the four rules sit under "How this works"', () => {
  test('hidden at open', () => {
    const { tree } = mount();
    for (const line of BANK_RULES) expect(joined(tree)).not.toContain(line);
    expect(allText(tree)).toContain('How this works');
  });

  test('pressing "How this works" shows all four unchanged lines, pressing again hides them', () => {
    const { tree } = mount();
    expect(BANK_RULES).toHaveLength(4);
    press(tree, 'How this works');
    for (const line of BANK_RULES) expect(allText(tree)).toContain(line);
    const toggle = deepest(pressables(tree, 'How this works'));
    expect(toggle.props.accessibilityState?.expanded).toBe(true);
    press(tree, 'How this works');
    for (const line of BANK_RULES) expect(joined(tree)).not.toContain(line);
  });

  test('the disclosure row is at least 48 dp', () => {
    const { tree } = mount();
    const row = deepest(pressables(tree, 'How this works'));
    expect(flatStyle(row.props.style).minHeight).toBeGreaterThanOrEqual(48);
  });

  test('the rules collapse again when the sheet is reopened', () => {
    const { tree } = mount();
    press(tree, 'How this works');
    act(() => {
      tree.update(
        <CalorieBankSheet
          visible={false}
          onClose={() => {}}
          weekDates={WEEK}
          defaultBigDay="2026-10-16"
          {...ROOMY}
          dayLabel={dayLabel}
        />,
      );
    });
    act(() => {
      tree.update(
        <CalorieBankSheet
          visible
          onClose={() => {}}
          weekDates={WEEK}
          defaultBigDay="2026-10-16"
          {...ROOMY}
          dayLabel={dayLabel}
        />,
      );
    });
    for (const line of BANK_RULES) expect(joined(tree)).not.toContain(line);
  });
});

describe('title and voice', () => {
  test('the title is a heading', () => {
    const { tree } = mount();
    const heads = tree.root.findAll((n) => n.props?.accessibilityRole === 'header' && n.type === 'Text');
    expect(heads.map((h) => [].concat(h.props.children).join(''))).toContain('Plan a higher-calorie day');
  });

  test('the intro is the one sentence', () => {
    const { tree } = mount();
    expect(allText(tree)).toContain('Pick a day to eat more on, and the rest of the week makes room for it.');
    expect(joined(tree)).not.toMatch(/Got a meal out/);
  });

  test('no collaborative "we" anywhere the person can read, including the refusal copy', () => {
    const { tree } = mount({ weekDates: [] }); // plan.reason === 'invalid_input'
    expect(joined(tree)).toContain('That day could not be planned. Try a different day.');
    press(tree, 'How this works');
    expect(joined(tree)).not.toMatch(/\bwe\b/i);

    const src = fs.readFileSync(path.resolve(__dirname, '../CalorieBankSheet.js'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/\bwe\b/i);
  });

  test('the safety maths is untouched: the sheet still calls the engine, and keeps the band and floor inputs', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../CalorieBankSheet.js'), 'utf8');
    expect(src).toMatch(/planCalorieBank\(\{/);
    expect(src).toMatch(/maxApplicableBumpKcal\(\{/);
    expect(src).toMatch(/floorKcal, bandMaxKcal/);
    expect(src).toMatch(/const BUMP_STEP = 50/);
  });
});
