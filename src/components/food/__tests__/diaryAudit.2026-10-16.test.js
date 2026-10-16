/**
 * diaryAudit.2026-10-16.test.js
 *
 * The food Diary audit of 2026-10-16 (lead's brief, items 3, 6, 7, 9, 11, 12
 * and 13), at the component level. Each test was written to fail on the code
 * before its fix:
 *   3   a meal card's subtotal leaves planned rows out (it agrees with the
 *       breakdown sheet), and the planned line counts foods;
 *   6   the edit sheet's Remove, when the write fails, says so and stays open
 *       (it used to swallow the failure and close);
 *   7   the meal chips follow the meals the caller shows (or the person's
 *       meals per day), keep an old meal name visible, and wrap;
 *   9   the breakdown sheet shows ONE energy figure per meal (the stored one),
 *       no "31x4 + 98x4 + 19x9" formula, every number grouped, and its Done
 *       is the house Button;
 *   11  a planned row reads differently (a "Planned" label, said too);
 *   12  R15 number grammar: "138 of 170 g", "32 g to go", "of 2,650 kcal",
 *       "1 gram of protein", "265 calories";
 *   13  a food name gets two lines; the ring's "+157 planned" takes the
 *       ring's text cap; the Note label is the house SectionLabel; the
 *       quick-add sheet scrolls.
 * ED safety: none of these surfaces reads a safety state; nothing here
 * changes a colour, a gate or a figure the ring shows.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

let mockState;
const mockToastShow = jest.fn();

jest.mock('../../../store/useAppStore', () => {
  const fn = (selector) => selector(mockState);
  return { __esModule: true, default: fn };
});
jest.mock('../../Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn(), press: jest.fn() }));
jest.mock('../../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../../lib/food/waterfall', () => ({ refetchStaleFood: jest.fn(() => Promise.resolve()) }));
jest.mock('react-native-gesture-handler/Swipeable', () => {
  const React = require('react');
  return { __esModule: true, default: (props) => React.createElement('Swipeable', props, props.children) };
});
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas', Path: 'Path', Skia: { Path: { Make: () => ({ moveTo: () => {}, lineTo: () => {}, close: () => {} }) } },
}));

import MealSection, { plannedLine, usualPortion } from '../MealSection';
import EntryRow from '../EntryRow';
import MacroRings from '../MacroRings';
import MacroBreakdownSheet from '../MacroBreakdownSheet';
import FoodDetailSheet from '../FoodDetailSheet';
import QuickAddSheet from '../QuickAddSheet';
import { mealSlotChoices } from '../useMealSlotChoices';
import { refetchStaleFood } from '../../../lib/food/waterfall';
import { setMealLabelOverrides, buildMealSlots } from '../../../lib/food/mealSlots';
import { isoDate } from '../../../lib/food/diaryDates';

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

function textOf(node) {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.children);
}
const allText = (tree) => textOf(tree.toJSON()).replace(/ /g, ' ');
const pressables = (tree, pred) => tree.root.findAll(
  (n) => typeof n.props?.accessibilityLabel === 'string' && pred(n.props.accessibilityLabel)
    && typeof n.props?.onPress === 'function',
);
const mount = (el) => { let tree; act(() => { tree = create(el); }); return tree; };
const flush = () => act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); });

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  setMealLabelOverrides({});
  mockState = {
    user: { id: 'u1' },
    userProfile: {},
    accessibility: { reduceMotion: true, energyUnit: 'kcal' },
  };
});

const row = (over = {}) => ({
  id: 'r', user_id: 'u1', entry_date: isoDate(new Date()), meal_slot: 'breakfast',
  food_ref: 'global:oats', _name: 'Porridge oats', quantity_g: 70, kcal: 265,
  protein_g: 9, carbs_g: 47, fat_g: 5, fibre_g: null, is_planned: 0, ...over,
});

describe('item 3: planned rows are not in the meal subtotal', () => {
  const slot = { key: 'breakfast', label: 'Breakfast' };

  test('the subtotal counts eaten rows only, as the breakdown sheet does', () => {
    const entries = [
      row({ id: 'a', kcal: 520, protein_g: 16 }),
      row({ id: 'b', kcal: 157, protein_g: 15, is_planned: 1, _name: 'Whole eggs' }),
    ];
    const tree = mount(<MealSection slot={slot} entries={entries} onAdd={() => {}} onEdit={() => {}} onConfirmPlanned={() => {}} />);
    const text = allText(tree);
    expect(text).toContain('520 kcal · 16 g protein');
    expect(text).not.toContain('677 kcal');
    // The breakdown sheet's figure for the same meal.
    const sheet = mount(<MacroBreakdownSheet visible entries={entries} onClose={() => {}} />);
    expect(allText(sheet)).toContain('520 kcal');
  });

  test('a meal holding only planned food shows no subtotal', () => {
    const tree = mount(<MealSection slot={slot} entries={[row({ is_planned: 1 })]} onAdd={() => {}} onEdit={() => {}} />);
    expect(allText(tree)).not.toMatch(/kcal · \d+ g protein/);
  });

  test('the planned line counts foods', () => {
    expect(plannedLine(1, 3)).toBe('1 food planned in this meal.');
    expect(plannedLine(2, 3)).toBe('2 foods planned in this meal.');
    expect(plannedLine(3, 3)).toBe('All 3 foods in this meal are planned.');
    expect(plannedLine(1, 1)).toBe('This meal is planned.');
    expect(plannedLine(0, 3)).toBeNull();
  });

  test('the card says "1 food planned in this meal." beside eaten food', () => {
    const entries = [row({ id: 'a' }), row({ id: 'b', is_planned: 1 })];
    const tree = mount(<MealSection slot={slot} entries={entries} onAdd={() => {}} onEdit={() => {}} onConfirmPlanned={() => {}} />);
    expect(allText(tree)).toContain('1 food planned in this meal.');
  });

  test('the header wraps at large text (name and subtotal can share or split the line)', () => {
    const src = read('MealSection.js');
    expect(src).toMatch(/header: \{\s*flexDirection: 'row', flexWrap: 'wrap'/);
  });
});

describe('items 11, 12 and 13: the diary row', () => {
  const label = (entry) => {
    const tree = mount(<EntryRow entry={entry} onEdit={() => {}} />);
    return pressables(tree, () => true)[0].props.accessibilityLabel;
  };

  test('spoken: "1 gram of protein" and "265 calories"', () => {
    expect(label(row({ protein_g: 1 }))).toBe('Porridge oats, 265 calories, 1 gram of protein, 47 carbs, 5 fat. Tap to edit.');
    expect(label(row({ protein_g: 9 }))).toContain('9 grams of protein');
  });

  test('kJ is said as kilojoules', () => {
    mockState.accessibility.energyUnit = 'kj';
    expect(label(row())).toContain('1,109 kilojoules');
  });

  test('a big figure is grouped', () => {
    const tree = mount(<EntryRow entry={row({ kcal: 1250 })} onEdit={() => {}} />);
    expect(allText(tree)).toContain('1,250 kcal');
  });

  test('a planned row carries a quiet "Planned" label and says it', () => {
    const tree = mount(<EntryRow entry={row({ is_planned: 1 })} onEdit={() => {}} />);
    expect(tree.root.findAll((n) => n.props?.testID === 'entry-planned-tag' && typeof n.type === 'string')).toHaveLength(1);
    expect(allText(tree)).toContain('Planned');
    expect(label(row({ is_planned: 1 }))).toContain('Planned, not eaten yet.');
    const eaten = mount(<EntryRow entry={row()} onEdit={() => {}} />);
    expect(eaten.root.findAll((n) => n.props?.testID === 'entry-planned-tag')).toHaveLength(0);
  });

  test('a food name gets two lines', () => {
    const tree = mount(<EntryRow entry={row({ _name: 'Grandma\'s homemade wholemeal seeded sourdough loaf' })} onEdit={() => {}} />);
    const name = tree.root.findAll((n) => n.type === 'Text' && textOf(n.props.children) === 'Grandma\'s homemade wholemeal seeded sourdough loaf')
      .find((n) => n.props.numberOfLines != null);
    expect(name.props.numberOfLines).toBe(2);
  });
});

describe('item 12: the ring and bars in R15 number grammar', () => {
  const rollup = { kcal_total: 2246, protein_g: 138, carbs_g: 286, fat_g: 63, fibre_g: 4 };
  const targets = { targetKcal: 2650, proteinG: 170, carbsG: 313, fatG: 80 };
  const planned = { kcal: 157, protein_g: 15, carbs_g: 1, fat_g: 11 };

  test('"138 of 170 g", "32 g to go", "of 2,650 kcal", "4 g"', () => {
    const text = allText(mount(<MacroRings rollup={rollup} targets={targets} planned={planned} />));
    expect(text).toContain('138 of 170 g');
    expect(text).toContain('32 g to go');
    expect(text).toContain('of 2,650 kcal');
    expect(text).toContain('Fibre4 g');
    expect(text).not.toMatch(/\d+g to go|\d+g over| \/ \d/);
  });

  test('"+157 planned" sits beside the ring (with a target), never cut inside it', () => {
    const tree = mount(<MacroRings rollup={rollup} targets={targets} planned={planned} />);
    const nodes = tree.root.findAll((n) => n.type === 'Text' && textOf(n.props.children) === '+157 planned'
      && n.props.numberOfLines !== undefined);
    expect(nodes).toHaveLength(0); // not the one-line, clipped in-ring text
    expect(allText(tree)).toContain('of 2,650 kcal+157 planned');
  });

  test('with no target the line stays in the ring at the ring\'s own text cap', () => {
    const tree = mount(<MacroRings rollup={rollup} targets={null} planned={planned} />);
    const node = tree.root.findAll((n) => n.type === 'Text' && textOf(n.props.children) === '+157 planned')
      .find((n) => n.props.maxFontSizeMultiplier != null);
    expect(node.props.maxFontSizeMultiplier).toBe(1.3);
  });

  test('"over" reads with a space: "5 g over"', () => {
    const text = allText(mount(<MacroRings rollup={{ ...rollup, fat_g: 85 }} targets={targets} />));
    expect(text).toContain('5 g over');
  });
});

describe('item 9: the breakdown sheet, one figure per meal', () => {
  const entries = [
    row({ id: 'a', meal_slot: 'breakfast', kcal: 677, protein_g: 31, carbs_g: 98, fat_g: 19 }),
    row({ id: 'b', meal_slot: 'lunch', kcal: 1569, protein_g: 107, carbs_g: 188, fat_g: 44 }),
  ];

  test('the stored energy is the meal\'s figure; no Atwater formula; the total is grouped', () => {
    const text = allText(mount(<MacroBreakdownSheet visible entries={entries} onClose={() => {}} />));
    expect(text).toContain('677 kcal · 31 P · 98 C · 19 F');
    expect(text).toContain('1,569 kcal');
    expect(text).toContain('2,246 kcal');
    expect(text).not.toMatch(/x4|x9|687/);
  });

  test('Done is the house Button, not a bold line that reads as a heading', () => {
    const src = read('MacroBreakdownSheet.js');
    expect(src).toMatch(/<Button\s+title="Done"\s+variant="secondary"/);
    expect(src).not.toMatch(/styles\.doneText/);
    // Every meal of a full day at the largest text size can exceed the
    // window, so the sheet scrolls (D230 R4) and Done is always reachable.
    expect(src).toMatch(/<BottomSheet visible=\{visible\} onClose=\{onClose\} scroll /);
  });
});

describe('items 6, 7 and 13: the edit sheet', () => {
  const food = {
    name: 'Porridge oats', brand: null, source: 'off', food_ref: 'off:1', fetched_at: 1,
    kcal_100g: 379, protein_100g: 13, carbs_100g: 60, fat_100g: 8, serving_g: null, serving_label: null,
  };
  const sheet = (props = {}) => mount(
    <FoodDetailSheet
      visible mode="edit" food={food} initialQuantityG={70} initialMealSlot="meal_1"
      initialEntryDate={isoDate(new Date())} onSave={jest.fn(async () => {})} onClose={jest.fn()}
      {...props}
    />,
  );
  const mealChips = (tree) => [...new Set(pressables(tree, (l) => l.startsWith('Meal: ')).map((n) => n.props.accessibilityLabel))];

  test('6: a failed Remove says so and the sheet stays open', async () => {
    const onClose = jest.fn();
    const onDelete = jest.fn(() => Promise.reject(new Error('disk')));
    const spy = jest.spyOn(require('../../AppAlert'), 'appAlert').mockImplementation(() => {});
    const tree = sheet({ onClose, onDelete });
    await act(async () => { pressables(tree, (l) => l === 'Remove entry')[0].props.onPress(); });
    const buttons = spy.mock.calls[0][2];
    await act(async () => { await buttons.find((b) => b.text === 'Remove').onPress(); });
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith('That entry was not removed. Try again in a moment.', { variant: 'error' });
    spy.mockRestore();
  });

  test('6: a Remove that lands closes the sheet', async () => {
    const onClose = jest.fn();
    const spy = jest.spyOn(require('../../AppAlert'), 'appAlert').mockImplementation(() => {});
    const tree = sheet({ onClose, onDelete: jest.fn(async () => {}) });
    await act(async () => { pressables(tree, (l) => l === 'Remove entry')[0].props.onPress(); });
    await act(async () => { await spy.mock.calls[0][2].find((b) => b.text === 'Remove').onPress(); });
    expect(onClose).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  test('7: the chips are the meals the caller shows (six meals, one named)', () => {
    setMealLabelOverrides({ meal_3: 'Afternoon protein shake' }); // 23 characters
    const slots = buildMealSlots([], 6);
    const tree = sheet({ mealSlots: slots });
    expect(mealChips(tree)).toEqual([
      'Meal: Meal 1', 'Meal: Meal 2', 'Meal: Afternoon protein shake', 'Meal: Meal 4', 'Meal: Meal 5', 'Meal: Meal 6',
    ]);
  });

  test('7: an entry under an old meal name keeps its meal as a chip', () => {
    const tree = sheet({ initialMealSlot: 'breakfast', mealSlots: buildMealSlots([], 2) });
    expect(mealChips(tree)).toEqual(['Meal: Breakfast', 'Meal: Meal 1', 'Meal: Meal 2']);
  });

  test('7: without a list, the chips follow the person\'s meals per day', async () => {
    await AsyncStorage.setItem('@volyume_meals_per_day', '3');
    const tree = sheet();
    await flush();
    expect(mealChips(tree)).toEqual(['Meal: Meal 1', 'Meal: Meal 2', 'Meal: Meal 3']);
  });

  test('7: the chip rows wrap (no clipping at the largest text size)', () => {
    expect(read('FoodDetailSheet.js')).toMatch(/mealRow: \{ flexDirection: 'row', flexWrap: 'wrap'/);
    expect(read('QuickAddSheet.js')).toMatch(/mealRow: \{ flexDirection: 'row', flexWrap: 'wrap'/);
  });

  test('1: the edit sheet does not refresh the food (it works from the entry); add still does', async () => {
    sheet();
    await flush();
    expect(refetchStaleFood).not.toHaveBeenCalled();
    mount(<FoodDetailSheet visible mode="add" food={food} initialMealSlot="meal_1" initialEntryDate={isoDate(new Date())} onSave={jest.fn()} onClose={jest.fn()} />);
    await flush();
    expect(refetchStaleFood).toHaveBeenCalledTimes(1);
  });

  test('13: the Note label is the house SectionLabel, as Meal and Eaten at are', () => {
    const src = read('FoodDetailSheet.js');
    expect(src).toMatch(/<SectionLabel>Note<\/SectionLabel>\s*<TextField/);
    expect(src).not.toMatch(/label="Note"/);
  });
});

describe('items 7 and 13: the quick-add sheet', () => {
  test('7: its chips follow the person\'s meals per day', async () => {
    await AsyncStorage.setItem('@volyume_meals_per_day', '5');
    const tree = mount(<QuickAddSheet visible initialMealSlot="meal_2" onSave={jest.fn()} onClose={jest.fn()} />);
    await flush();
    const chips = tree.root.findAll((n) => n.props?.accessibilityRole === 'radio' && typeof n.props?.onPress === 'function')
      .map((n) => n.props.accessibilityLabel);
    expect([...new Set(chips)]).toEqual(['Meal 1', 'Meal 2', 'Meal 3', 'Meal 4', 'Meal 5']);
  });

  test('13: it is a scrolling sheet, as the add sheet is', () => {
    expect(read('QuickAddSheet.js')).toMatch(/<BottomSheet visible=\{visible\} onClose=\{handleClose\} keyboardAvoiding scroll/);
  });

  test('mealSlotChoices keeps the current meal and orders it', () => {
    expect(mealSlotChoices({ current: 'snack', slots: buildMealSlots([], 2) }).map((s) => s.key))
      .toEqual(['meal_1', 'meal_2', 'snack']);
    expect(mealSlotChoices({ current: 'meal_1', mealsPerDay: 3 }).map((s) => s.key))
      .toEqual(['meal_1', 'meal_2', 'meal_3']);
  });
});

// Review finding 2 (2026-10-16, founder ruling "Add cooked weight"): a recipe
// logged in servings only never shows grams on its usual chip.
describe('a servings-only recipe usual', () => {
  test('reads in servings, never grams', () => {
    expect(usualPortion({ servings_only: true, serving_g: 375, serving_label: 'serving', last_quantity_g: 300 }).text).toBe('0.8 servings');
    expect(usualPortion({ servings_only: true, serving_g: 375, serving_label: 'serving', last_quantity_g: 375 }).text).toBe('1 serving');
  });
});

// Food audit 2026-10-16 (A11Y): the unit chip's figure never breaks inside
// itself ("65 / g") at a large text size: a no-break space joins it.
test('the unit chip joins its figure and unit with a no-break space', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'FoodDetailSheet.js'), 'utf8');
  expect(src).toMatch(/\$\{u\.label\} \(\$\{Math\.round\(u\.grams\)\}\$\{NBSP\}g\)/);
});
