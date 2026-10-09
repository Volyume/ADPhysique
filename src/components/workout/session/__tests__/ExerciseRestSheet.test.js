/**
 * ExerciseRestSheet (workout logger rebuild, lane B2, 12-BUILD-SPEC sections 3
 * and 4).
 *
 * Pins the rest length picker behind an exercise's rest control:
 *   - the length is shown as m:ss at display size between a -15 and a +15
 *     control, 30 to 600 seconds in 15 second steps, clamped at both ends,
 *     with the control at an end disabled;
 *   - a row of presets at 60, 90, 120 and 180 seconds (1:00, 1:30, 2:00, 3:00)
 *     built from the house Chip as a radio group, the one that equals the
 *     draft selected;
 *   - Save hands the whole seconds to onSave and THEN calls onClose; Cancel
 *     only closes and drops the draft;
 *   - the draft is seeded from `value` on every open: junk opens at the 90
 *     second default, out of range is clamped, a value between steps is kept
 *     as it is, a cancelled draft does not come back, and a `value` that
 *     changes while the sheet is open does not move the draft;
 *   - labels are spoken in words ("1 minute 30 seconds").
 *
 * Reduce motion is forced so the BottomSheet mounts synchronously.
 */
import { create, act } from 'react-test-renderer';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors, type } from '../../../../styles/theme';

const mockState = { accessibility: { reduceMotion: true } };
jest.mock('../../../../store/useAppStore', () => {
  const useAppStore = (selector) => selector(mockState);
  useAppStore.getState = () => mockState;
  return { __esModule: true, default: useAppStore };
});
jest.mock('../../../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

import * as haptics from '../../../../lib/haptics';
import ExerciseRestSheet from '../ExerciseRestSheet';


const hostText = (node) => node.children.map((c) => (typeof c === 'string' ? c : hostText(c))).join('');
const hosts = (tree, kind) => tree.root.findAll((n) => n.type === kind);
const allText = (tree) => hosts(tree, 'Text').map(hostText);
const byTestId = (tree, id) => tree.root.findAll(
  (n) => typeof n.type === 'string' && n.props.testID === id,
)[0];
// Deep flatten: PressableCard nests its caller's style array inside its own.
const flatten = (style) => (Array.isArray(style)
  ? style.reduce((acc, part) => ({ ...acc, ...flatten(part) }), {})
  : (style || {}));
const flat = (node) => flatten(node.props.style);
const readout = (tree) => hostText(byTestId(tree, 'volyume-exercise-rest-readout'));
const press = (tree, id) => act(() => byTestId(tree, id).props.onPress());
const stepBy = (tree, id, times) => { for (let i = 0; i < times; i += 1) press(tree, id); };

function sheet(props = {}) {
  return <ExerciseRestSheet visible value={90} onSave={jest.fn()} onClose={jest.fn()} {...props} />;
}

function render(props) {
  let tree;
  act(() => { tree = create(sheet(props)); });
  return tree;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ExerciseRestSheet, rendering', () => {
  test('renders nothing while it is closed', () => {
    expect(render({ visible: false }).toJSON()).toBeNull();
  });

  test('is the house BottomSheet, labelled for the screen reader', () => {
    const tree = render();
    expect(tree.root.findByType(BottomSheetModal).props.accessibilityLabel).toBe('Rest between sets');
  });

  test('shows a header, the length as m:ss, four presets, Cancel and Save', () => {
    const tree = render({ value: 90 });
    const text = allText(tree);
    expect(text).toContain('Rest between sets');
    expect(readout(tree)).toBe('1:30');
    expect(text).toEqual(expect.arrayContaining(['1:00', '1:30', '2:00', '3:00']));
    // D220 addendum 30 (audit D4): the steps read "15" beside a remove or add
    // glyph, the rest strip's grammar.
    expect(text).toEqual(expect.arrayContaining(['15', 'Cancel', 'Save']));
    expect(text.filter((x) => x === '15')).toHaveLength(2);
  });

  test('the title is a header for the screen reader', () => {
    const tree = render();
    const title = hosts(tree, 'Text').find((n) => hostText(n) === 'Rest between sets');
    expect(title.props.accessibilityRole).toBe('header');
  });

  test('the length reads at display size in tabular figures, and is spoken in words', () => {
    const tree = render({ value: 90 });
    const node = byTestId(tree, 'volyume-exercise-rest-readout');
    expect(flat(node)).toMatchObject({ ...type.num('display'), color: colors.textPrimary });
    expect(node.props.accessibilityLabel).toBe('Rest 1 minute 30 seconds');
    expect(readout(render({ value: 30 }))).toBe('0:30');
    expect(readout(render({ value: 600 }))).toBe('10:00');
    expect(byTestId(render({ value: 150 }), 'volyume-exercise-rest-readout').props.accessibilityLabel)
      .toBe('Rest 2 minutes 30 seconds');
  });

  test('the step controls are 48 dp glyph-and-label targets in the strip\'s grammar, no box, no amber (D220 addendum 30)', () => {
    const tree = render();
    const remove = byTestId(tree, 'volyume-exercise-rest-remove');
    const add = byTestId(tree, 'volyume-exercise-rest-add');
    expect(remove.props.accessibilityLabel).toBe('Remove 15 seconds');
    expect(add.props.accessibilityLabel).toBe('Add 15 seconds');
    for (const [node, icon] of [[remove, 'remove'], [add, 'add']]) {
      expect(node.props.accessibilityRole).toBe('button');
      expect(flat(node).borderWidth).toBeUndefined();
      expect(flat(node).backgroundColor).toBeUndefined();
      expect(flat(node).minHeight).toBeGreaterThanOrEqual(48);
      const glyph = node.findAll((n) => n.props && n.props.name === icon);
      expect(glyph.length).toBeGreaterThanOrEqual(1);
      expect(glyph[0].props.size).toBe(20);
      expect(glyph[0].props.color).toBe(colors.textPrimary);
      const label = node.findAll((n) => n.type === 'Text')[0];
      expect(flat(label).color).toBe(colors.textPrimary);
    }
  });

  test('Save and Cancel are buttons with their own labels', () => {
    const tree = render();
    const save = byTestId(tree, 'volyume-exercise-rest-save');
    const cancel = byTestId(tree, 'volyume-exercise-rest-cancel');
    expect(save.props.accessibilityRole).toBe('button');
    expect(save.props.accessibilityLabel).toBe('Save rest length');
    expect(cancel.props.accessibilityRole).toBe('button');
    expect(cancel.props.accessibilityLabel).toBe('Cancel rest length');
  });
});

describe('ExerciseRestSheet, stepping', () => {
  test('+15 and -15 move the length by fifteen seconds with a selection haptic', () => {
    const tree = render({ value: 90 });
    press(tree, 'volyume-exercise-rest-add');
    expect(readout(tree)).toBe('1:45');
    press(tree, 'volyume-exercise-rest-add');
    expect(readout(tree)).toBe('2:00');
    press(tree, 'volyume-exercise-rest-remove');
    expect(readout(tree)).toBe('1:45');
    expect(haptics.selection).toHaveBeenCalledTimes(3);
  });

  test('the length stops at 0:30 and the minus control is disabled there', () => {
    const tree = render({ value: 60 });
    stepBy(tree, 'volyume-exercise-rest-remove', 2);
    expect(readout(tree)).toBe('0:30');
    const remove = byTestId(tree, 'volyume-exercise-rest-remove');
    expect(remove.props.disabled).toBe(true);
    expect(remove.props.accessibilityState).toMatchObject({ disabled: true });
    expect(byTestId(tree, 'volyume-exercise-rest-add').props.disabled).toBe(false);
    press(tree, 'volyume-exercise-rest-remove');
    expect(readout(tree)).toBe('0:30');
  });

  test('the length stops at 10:00 and the plus control is disabled there', () => {
    const tree = render({ value: 570 });
    stepBy(tree, 'volyume-exercise-rest-add', 2);
    expect(readout(tree)).toBe('10:00');
    const add = byTestId(tree, 'volyume-exercise-rest-add');
    expect(add.props.disabled).toBe(true);
    expect(add.props.accessibilityState).toMatchObject({ disabled: true });
    expect(byTestId(tree, 'volyume-exercise-rest-remove').props.disabled).toBe(false);
    press(tree, 'volyume-exercise-rest-add');
    expect(readout(tree)).toBe('10:00');
  });

  test('the whole range is thirty-nine steps wide', () => {
    const tree = render({ value: 30 });
    stepBy(tree, 'volyume-exercise-rest-add', 38);
    expect(readout(tree)).toBe('10:00');
  });
});

describe('ExerciseRestSheet, presets', () => {
  test('are 60, 90, 120 and 180 seconds, radios spoken in words', () => {
    const tree = render();
    const expected = [
      [60, 'Set rest to 1 minute'],
      [90, 'Set rest to 1 minute 30 seconds'],
      [120, 'Set rest to 2 minutes'],
      [180, 'Set rest to 3 minutes'],
    ];
    for (const [seconds, label] of expected) {
      const chip = byTestId(tree, `volyume-exercise-rest-preset-${seconds}`);
      expect(chip.props.accessibilityRole).toBe('radio');
      expect(chip.props.accessibilityLabel).toBe(label);
    }
    expect(hosts(tree, 'View').some((n) => n.props.accessibilityRole === 'radiogroup')).toBe(true);
  });

  test('the preset that equals the length is the one selected', () => {
    const checked = (tree) => [60, 90, 120, 180].filter(
      (s) => byTestId(tree, `volyume-exercise-rest-preset-${s}`).props.accessibilityState.checked,
    );
    const tree = render({ value: 90 });
    expect(checked(tree)).toEqual([90]);
    press(tree, 'volyume-exercise-rest-add');
    expect(checked(tree)).toEqual([]);
    press(tree, 'volyume-exercise-rest-add');
    expect(checked(tree)).toEqual([120]);
  });

  test('tapping a preset sets the length and gives a selection haptic', () => {
    const tree = render({ value: 90 });
    press(tree, 'volyume-exercise-rest-preset-180');
    expect(readout(tree)).toBe('3:00');
    press(tree, 'volyume-exercise-rest-preset-60');
    expect(readout(tree)).toBe('1:00');
    expect(haptics.selection).toHaveBeenCalledTimes(2);
  });
});

describe('ExerciseRestSheet, Save and Cancel', () => {
  test('Save hands over the whole seconds, then closes', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const tree = render({ value: 90, onSave, onClose });
    stepBy(tree, 'volyume-exercise-rest-add', 3);
    press(tree, 'volyume-exercise-rest-save');
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(135);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0]);
  });

  test('Save after a preset hands over the preset', () => {
    const onSave = jest.fn();
    const tree = render({ value: 90, onSave });
    press(tree, 'volyume-exercise-rest-preset-120');
    press(tree, 'volyume-exercise-rest-save');
    expect(onSave).toHaveBeenCalledWith(120);
  });

  test('Save with nothing changed hands over the value it opened with', () => {
    const onSave = jest.fn();
    const tree = render({ value: 150, onSave });
    press(tree, 'volyume-exercise-rest-save');
    expect(onSave).toHaveBeenCalledWith(150);
  });

  test('Cancel only closes: it never saves', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const tree = render({ value: 90, onSave, onClose });
    press(tree, 'volyume-exercise-rest-add');
    press(tree, 'volyume-exercise-rest-cancel');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('ExerciseRestSheet, the value it opens with', () => {
  test('junk opens at the 90 second default', () => {
    for (const junk of [null, undefined, 'abc', NaN, 0, -30, Infinity]) {
      expect(readout(render({ value: junk }))).toBe('1:30');
    }
  });

  test('out of range is clamped to the nearest end', () => {
    expect(readout(render({ value: 10 }))).toBe('0:30');
    expect(readout(render({ value: 29 }))).toBe('0:30');
    expect(readout(render({ value: 601 }))).toBe('10:00');
    expect(readout(render({ value: 99999 }))).toBe('10:00');
  });

  test('a number as a string and a fraction are read as seconds', () => {
    expect(readout(render({ value: '120' }))).toBe('2:00');
    expect(readout(render({ value: 89.6 }))).toBe('1:30');
  });

  test('a value between steps opens as it is and is not snapped to the grid', () => {
    const onSave = jest.fn();
    const tree = render({ value: 100, onSave });
    expect(readout(tree)).toBe('1:40');
    press(tree, 'volyume-exercise-rest-save');
    expect(onSave).toHaveBeenCalledWith(100);
  });
});

describe('ExerciseRestSheet, the draft across opens', () => {
  test('a cancelled draft does not come back: the next open shows the saved length', () => {
    let tree;
    act(() => { tree = create(sheet({ value: 90 })); });
    stepBy(tree, 'volyume-exercise-rest-add', 4);
    expect(readout(tree)).toBe('2:30');
    act(() => tree.update(sheet({ value: 90, visible: false })));
    expect(tree.toJSON()).toBeNull();
    act(() => tree.update(sheet({ value: 90, visible: true })));
    expect(readout(tree)).toBe('1:30');
  });

  test('a length changed while the sheet was closed is what opens', () => {
    let tree;
    act(() => { tree = create(sheet({ value: 90, visible: false })); });
    act(() => tree.update(sheet({ value: 150, visible: false })));
    act(() => tree.update(sheet({ value: 150, visible: true })));
    expect(readout(tree)).toBe('2:30');
  });

  test('a value that changes while the sheet is open does not move the draft', () => {
    let tree;
    act(() => { tree = create(sheet({ value: 90 })); });
    press(tree, 'volyume-exercise-rest-add');
    act(() => tree.update(sheet({ value: 300 })));
    expect(readout(tree)).toBe('1:45');
  });
});
