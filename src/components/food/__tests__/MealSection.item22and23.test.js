/**
 * MealSection.item22and23.test.js
 *
 * Pins two diary meal-card rules (proposals batch H2, owner answers
 * 2026-10-20):
 *  - Item 23: the "Optional extras" seasoning tip shows only while the meal
 *    holds PLANNED (is_planned) rows. Marked eaten, or logged straight from
 *    the curated sheet, it is gone. Wording is the curated sheet's own
 *    ADDITIONS_INTRO.
 *  - Item 22: a row stored under an old meal name is drawn in the numbered
 *    card with its old name as a sub-line under the card title; rows in the card's own slot
 *    have none. Nothing about the row itself changes.
 */
import { create } from 'react-test-renderer';

jest.mock('react-native-gesture-handler/Swipeable', () => {
  const React = require('react');
  return function MockSwipeable(props) {
    return React.createElement('Swipeable', props, props.children);
  };
});
jest.mock('../../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

import MealSection from '../MealSection';
import { ADDITIONS_INTRO } from '../../../lib/food/mealAdditions';

const slot = { key: 'meal_1', label: 'Meal 1' };
const row = (id, ref, extra = {}) => ({
  id, _name: ref, kcal: 100, protein_g: 10, carbs_g: 5, fat_g: 2, quantity_g: 100,
  food_ref: ref, meal_slot: 'meal_1', is_planned: 0, ...extra,
});
const chickenRice = (extra) => [
  row('a', 'curated:chicken_breast', extra), row('b', 'curated:white_rice', extra),
  row('c', 'curated:broccoli', extra), row('d', 'curated:olive_oil', extra),
];
const texts = (tree) => JSON.stringify(tree.toJSON());
const mount = (entries) => create(
  <MealSection slot={slot} entries={entries} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} onConfirmPlanned={() => {}} />,
);

describe('item 23: seasoning tip only on planned, not-yet-eaten rows', () => {
  test('shows on a planned curated meal, with the curated sheet wording', () => {
    expect(texts(mount(chickenRice({ is_planned: 1 })))).toContain(ADDITIONS_INTRO);
  });
  test('gone once the meal is eaten', () => {
    expect(texts(mount(chickenRice({ is_planned: 0 })))).not.toContain('Optional extras');
  });
  test('gone for a curated meal logged straight to the diary (eaten rows)', () => {
    expect(texts(mount(chickenRice()))).not.toContain('Optional extras');
  });
  test('a half-eaten meal reads only its planned rows (too few left to match)', () => {
    const mixed = [row('a', 'curated:chicken_breast', { is_planned: 1 }), ...chickenRice().slice(1)];
    expect(texts(mount(mixed))).not.toContain('Optional extras');
  });
});

describe('item 22: old-named rows drawn inside the numbered card', () => {
  test("a Breakfast row adds an Includes sub-line under the title", () => {
    const t = texts(mount([row('a', 'curated:oats', { meal_slot: 'breakfast' }), row('b', 'curated:eggs')]));
    expect(t).toContain('Includes Breakfast');
  });
  test('no label when every row is in the card\'s own slot', () => {
    expect(texts(mount([row('b', 'curated:eggs')]))).not.toContain('Breakfast');
  });
  test('the old name is shown once, for a group of rows', () => {
    const t = texts(mount([
      row('a', 'curated:oats', { meal_slot: 'breakfast' }), row('b', 'curated:eggs', { meal_slot: 'breakfast' }),
    ]));
    expect(t.split('Breakfast').length - 1).toBe(1);
    expect(t).toContain('Includes Breakfast');
  });
});
