/**
 * The Diary's sheets as named components (D230 R4, 4.7; food level-up
 * 2026-10-16): DayToolsSheet, CopyFromDaySheet, DiaryMoveSheet and
 * SaveAsMealSheet, which DiaryScreen.js used to define inline.
 *
 * What this suite pins, and why each pin is written to fail:
 *  - R16: every sheet's title is a heading (accessibilityRole "header"). The
 *    inline sheets' titles were plain overline labels, so the screen-reader
 *    heading rotor had nothing to land on.
 *  - 4.1/R11/R19: Day tools is four house NavRows in this order: Trends, Copy
 *    from another day, Meals, Nutrition targets, each wired to its own
 *    handler, and the sheet carries no amber (R2).
 *  - The copy sheet's rows read "3 entries · 1850 kcal" (R15, one spaced
 *    middle dot, never " - "), hand the picked day back, and tap WITHOUT a
 *    haptic: copying a day writes the diary, and diary-marking moments keep
 *    the recorded no-haptic exception.
 *  - R15: the save sheet's line is "{n} entries saved together. Give the meal
 *    a name." (not the clipped "Name it."), and Save stays disabled until
 *    there is a name.
 *  - The move sheet still lists the day's meals and moves on a tap.
 */
import { create, act } from 'react-test-renderer';

const mockSelection = jest.fn();
jest.mock('../../../lib/haptics', () => ({
  selection: (...a) => mockSelection(...a),
  commit: jest.fn(),
  press: jest.fn(),
}));

import DayToolsSheet from '../DayToolsSheet';
import CopyFromDaySheet, { copyDayMeta } from '../CopyFromDaySheet';
import DiaryMoveSheet from '../DiaryMoveSheet';
import SaveAsMealSheet, { saveMealHint } from '../SaveAsMealSheet';
import { NavRow } from '../../NavRow';
import { colors } from '../../../styles/theme';

function render(element) {
  let tree;
  act(() => { tree = create(element); });
  return tree;
}

function instanceText(inst) {
  if (typeof inst === 'string') return inst;
  return (inst.children ?? []).map(instanceText).join('');
}
const headers = (tree) => tree.root.findAll(
  (n) => typeof n.type === 'string' && n.props?.accessibilityRole === 'header',
).map(instanceText);

const byLabel = (tree, label) => tree.root.findAll(
  (n) => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function',
  { deep: false },
);

beforeEach(() => { jest.clearAllMocks(); });

describe('DayToolsSheet', () => {
  test('its title is a heading and its rows are the four house NavRows, in order', () => {
    const handlers = {
      onTrends: jest.fn(), onCopyFromDay: jest.fn(), onMeals: jest.fn(), onNutritionTargets: jest.fn(),
    };
    const tree = render(<DayToolsSheet visible onClose={() => {}} {...handlers} />);
    expect(headers(tree)).toEqual(['Day tools']);
    const rows = tree.root.findAllByType(NavRow);
    expect(rows.map((r) => r.props.label)).toEqual(['Trends', 'Copy from another day', 'Meals', 'Nutrition targets']);
    act(() => { rows[0].props.onPress(); });
    act(() => { rows[1].props.onPress(); });
    act(() => { rows[2].props.onPress(); });
    act(() => { rows[3].props.onPress(); });
    expect(handlers.onTrends).toHaveBeenCalledTimes(1);
    expect(handlers.onCopyFromDay).toHaveBeenCalledTimes(1);
    expect(handlers.onMeals).toHaveBeenCalledTimes(1);
    expect(handlers.onNutritionTargets).toHaveBeenCalledTimes(1);
  });

  test('carries no amber: the doors are ink (R2)', () => {
    const tree = render(<DayToolsSheet visible onClose={() => {}} />);
    const txt = JSON.stringify(tree.toJSON());
    expect(txt).not.toContain(colors.primary);
    expect(txt).not.toContain(colors.primaryBg);
  });

  test('renders nothing while closed', () => {
    const tree = render(<DayToolsSheet visible={false} onClose={() => {}} />);
    expect(headers(tree)).toEqual([]);
  });
});

describe('CopyFromDaySheet', () => {
  const days = [
    { entry_date: '2026-10-15', count: 3, kcal: 1850.4 },
    { entry_date: '2026-10-14', count: 1, kcal: 420 },
  ];

  test('its title is a heading, and each row reads "n entries · kcal" with a middle dot', () => {
    const tree = render(<CopyFromDaySheet days={days} onClose={() => {}} onPick={() => {}} />);
    expect(headers(tree)).toEqual(['Copy from another day']);
    const rows = tree.root.findAllByType(NavRow);
    expect(rows.map((r) => r.props.sub)).toEqual(['3 entries · 1850 kcal', '1 entry · 420 kcal']);
    expect(copyDayMeta({ count: 2, kcal: 1000 }, 'kj')).toBe('2 entries · 4184 kJ');
    expect(JSON.stringify(tree.toJSON())).not.toMatch(/ - \d/);
  });

  test('a tap hands the day back, with no haptic: it writes the diary', () => {
    const onPick = jest.fn();
    const tree = render(<CopyFromDaySheet days={days} onClose={() => {}} onPick={onPick} />);
    const rows = tree.root.findAllByType(NavRow);
    expect(rows.every((r) => r.props.haptic === false)).toBe(true);
    const pressable = byLabel(tree, `${rows[0].props.label}. 3 entries · 1850 kcal`);
    expect(pressable).toHaveLength(1);
    act(() => { pressable[0].props.onPress(); });
    expect(onPick).toHaveBeenCalledWith('2026-10-15');
    expect(mockSelection).not.toHaveBeenCalled();
  });

  test('no earlier days says so; a null list keeps the sheet closed', () => {
    const empty = render(<CopyFromDaySheet days={[]} onClose={() => {}} onPick={() => {}} />);
    expect(JSON.stringify(empty.toJSON())).toContain('No earlier days with food logged yet.');
    const closed = render(<CopyFromDaySheet days={null} onClose={() => {}} onPick={() => {}} />);
    expect(headers(closed)).toEqual([]);
  });
});

describe('DiaryMoveSheet', () => {
  test('its title is a heading, and a tap moves the selection to that meal', () => {
    const onMove = jest.fn();
    const slots = [{ key: 'meal_1', label: 'Breakfast' }, { key: 'meal_2', label: 'Meal 2' }];
    const tree = render(<DiaryMoveSheet visible onClose={() => {}} mealSlots={slots} onMove={onMove} />);
    expect(headers(tree)).toEqual(['Move to']);
    const row = byLabel(tree, 'Move to Breakfast');
    expect(row).toHaveLength(1);
    act(() => { row[0].props.onPress(); });
    expect(onMove).toHaveBeenCalledWith('meal_1');
  });
});

describe('SaveAsMealSheet', () => {
  test('its title is a heading and its line is a full sentence (R15)', () => {
    const tree = render(<SaveAsMealSheet visible count={2} name="" onChangeName={() => {}} onClose={() => {}} onSave={() => {}} />);
    expect(headers(tree)).toEqual(['Save as meal']);
    const txt = JSON.stringify(tree.toJSON());
    expect(txt).toContain('2 entries saved together. Give the meal a name.');
    expect(txt).not.toContain('Name it.');
    expect(saveMealHint(1)).toBe('1 entry saved together. Give the meal a name.');
  });

  test('Save is disabled until there is a name, and then saves', () => {
    const onSave = jest.fn();
    const blank = render(<SaveAsMealSheet visible count={2} name="  " onChangeName={() => {}} onClose={() => {}} onSave={onSave} />);
    const disabled = blank.root.findAll((n) => n.props?.accessibilityLabel === 'Save meal' && n.props?.disabled === true);
    expect(disabled.length).toBeGreaterThan(0);
    const named = render(<SaveAsMealSheet visible count={2} name="Breakfast" onChangeName={() => {}} onClose={() => {}} onSave={onSave} />);
    const save = byLabel(named, 'Save meal');
    act(() => { save[0].props.onPress(); });
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
