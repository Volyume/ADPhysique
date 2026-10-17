/**
 * spokenEnergy.test.js - food audit follow-up 2026-10-16, item 4.
 *
 * Screen-reader labels in the food surfaces must SAY "calories" (or
 * "kilojoules" when the energy unit is kJ), never "kcal" or "kilocalories",
 * while the visible text keeps its unit label. EntryRow set the pattern
 * (its energyWord); FoodRow, the Diary meal subtotal and the add screen's
 * plate and suggestion lines followed it here. The rendered checks run the
 * REAL components; the source guard pins FoodSearchScreen, which is too heavy
 * to mount here, to the shared spokenEnergy helper.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';

jest.mock('../../AppAlert', () => ({ appAlert: jest.fn(), AppAlertHost: () => null }));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));
jest.mock('react-native-gesture-handler/Swipeable', () => {
  const React = require('react');
  return function MockSwipeable(props) {
    return React.createElement('Swipeable', props, props.children);
  };
});

import MealSection from '../MealSection';
import { EntryRow } from '../EntryRow';
import FoodRow from '../FoodRow';
import useAppStore from '../../../store/useAppStore';

const bread = {
  food_ref: 'off:abc', name: 'Wholemeal bread', brand: 'Hovis', serving_g: 36, serving_label: 'slice',
  kcal_100g: 247, protein_100g: 9, carbs_100g: 47, fat_100g: 3, source: 'off',
};
const slot = { key: 'breakfast', label: 'Breakfast' };
const entries = [
  { id: 'a', _name: 'Oats', kcal: 200, protein_g: 7, carbs_g: 30, fat_g: 4, quantity_g: 50, food_ref: 'off:1' },
  { id: 'b', _name: 'Banana', kcal: 105, protein_g: 1, carbs_g: 27, fat_g: 0, quantity_g: 120, food_ref: 'off:2' },
];

function setUnit(energyUnit) {
  act(() => { useAppStore.setState({ accessibility: { ...(useAppStore.getState().accessibility || {}), energyUnit } }); });
}
function labels(tree) {
  return tree.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string')
    .map((n) => n.props.accessibilityLabel);
}
const SPOKEN_LETTERS = /\bkcal\b|\bkJ\b|kilocalor/i;

afterEach(() => setUnit('kcal'));

describe('spoken energy, kcal', () => {
  beforeEach(() => setUnit('kcal'));

  test('FoodRow speaks calories while its visible line keeps kcal', () => {
    const tree = create(<FoodRow food={bread} onPress={() => {}} onAdd={() => {}} />);
    const row = labels(tree).find((l) => l.startsWith('Wholemeal bread'));
    expect(row).toContain('89 calories');
    expect(row).not.toMatch(SPOKEN_LETTERS);
    expect(JSON.stringify(tree.toJSON())).toContain('89 kcal');
  });

  test('the Diary meal subtotal speaks calories and grams of protein; the visible text keeps kcal', () => {
    const tree = create(<MealSection slot={slot} entries={entries} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} />);
    expect(labels(tree)).toContain('305 calories, 8 grams of protein');
    expect(JSON.stringify(tree.toJSON())).toContain('kcal');
  });

  test('EntryRow (the pattern) speaks calories', () => {
    const entry = { id: 'a', _name: 'Oats', kcal: 200, protein_g: 7, carbs_g: 30, fat_g: 4, quantity_g: 50, food_ref: 'off:1' };
    const tree = create(<EntryRow entry={entry} onEdit={() => {}} onDelete={() => {}} />);
    const row = labels(tree).find((l) => l.startsWith('Oats'));
    expect(row).toContain('200 calories');
    expect(row).not.toMatch(SPOKEN_LETTERS);
  });
});

describe('spoken energy, kJ', () => {
  beforeEach(() => setUnit('kj'));

  test('FoodRow and the meal subtotal speak kilojoules, never kJ', () => {
    const rowTree = create(<FoodRow food={bread} onPress={() => {}} onAdd={() => {}} />);
    const row = labels(rowTree).find((l) => l.startsWith('Wholemeal bread'));
    expect(row).toContain('372 kilojoules');
    expect(row).not.toMatch(SPOKEN_LETTERS);
    const mealTree = create(<MealSection slot={slot} entries={entries} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} />);
    const sub = labels(mealTree).find((l) => l.endsWith('of protein'));
    expect(sub).toMatch(/^1,276 kilojoules, 8 grams of protein$/);
  });
});

describe('FoodSearchScreen speaks energy through spokenEnergy', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../../screens/FoodSearchScreen.js'), 'utf8');

  test('the plate bar, plate rows and the sized-for-this-meal line carry spoken labels', () => {
    expect(src).toMatch(/accessibilityLabel=\{`Review selected foods, about \$\{spokenEnergy\(plateKcal, energyUnit\)\}`\}/);
    expect(src).toMatch(/accessibilityLabel=\{`\$\{formatNumber\(Math\.round\(it\.quantityG\)\)\} grams, \$\{spokenEnergy\(it\.kcal, energyUnit\)\}`\}/);
    expect(src).toMatch(/Sized for this meal: around \$\{Math\.round\(suggestMeta\.perMeal\.protein\)\} grams of protein, \$\{spokenEnergy\(suggestMeta\.perMeal\.kcal, energyUnit\)\}/);
  });

  test('no accessibilityLabel or hint in the four food files names the unit letters', () => {
    const files = [
      '../../../screens/FoodSearchScreen.js', '../FoodRow.js', '../MealSection.js', '../EntryRow.js',
    ];
    for (const f of files) {
      const text = fs.readFileSync(path.join(__dirname, f), 'utf8');
      const spoken = text.split('\n').filter((l) => /accessibility(Label|Hint)/.test(l));
      // Judge the words, not the variable names: drop every ${...} first.
      for (const line of spoken) expect(line.replace(/\$\{[^}]*\}/g, '')).not.toMatch(/kcal|kilocalor|energyUnitLabel/i);
      for (const line of spoken) expect(line).not.toMatch(/energyUnitLabel/);
    }
  });
});
