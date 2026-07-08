/**
 * MealSection.markEaten.test.js
 *
 * Pins the food audit item 1 UI ("mark planned meal eaten", one tap):
 * a meal card shows a "Mark eaten" button ONLY when its own entries hold
 * planned-but-unconfirmed rows (is_planned=1, staged by the meal plan),
 * and never in selection mode or when the parent has withheld the
 * confirm handler (read-only diary, a future day). Tapping it calls the
 * SAME onConfirmPlanned the parent wired to the real intake write path
 * (db.confirmPlannedDay), so this pins wiring only, not a cosmetic state
 * flip. No score/streak/colour-judgement copy is introduced anywhere in
 * this card (constitution ban, CLAUDE.md sec.2).
 *
 * Same render harness as foodComponents.test.js (Swipeable mocked; no
 * native module needed for a plain meal card).
 */
import { create } from 'react-test-renderer';

jest.mock('react-native-gesture-handler/Swipeable', () => {
  const React = require('react');
  return function MockSwipeable(props) {
    return React.createElement('Swipeable', props, props.children);
  };
});

import MealSection from '../MealSection';

const slot = { key: 'meal_1', label: 'Meal 1' };

describe('MealSection "Mark eaten" (food audit item 1)', () => {
  const plannedEntries = [
    { id: 'p1', _name: 'Chicken breast', kcal: 250, protein_g: 40, carbs_g: 0, fat_g: 8, quantity_g: 150, food_ref: 'off:1', meal_slot: 'meal_1', is_planned: 1 },
    { id: 'p2', _name: 'White rice', kcal: 200, protein_g: 4, carbs_g: 45, fat_g: 1, quantity_g: 150, food_ref: 'off:2', meal_slot: 'meal_1', is_planned: 1 },
  ];
  const eatenEntries = [
    { id: 'e1', _name: 'Oats', kcal: 200, protein_g: 7, carbs_g: 30, fat_g: 4, quantity_g: 50, food_ref: 'off:3', meal_slot: 'meal_1', is_planned: 0 },
  ];

  test('shows "Mark eaten" when the slot holds planned rows and a confirm handler is supplied', () => {
    const onConfirmPlanned = jest.fn();
    const tree = create(
      <MealSection
        slot={slot}
        entries={plannedEntries}
        onAdd={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onConfirmPlanned={onConfirmPlanned}
      />,
    );
    const btn = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Mark Meal 1 as eaten')[0];
    expect(btn).toBeDefined();
    btn.props.onPress();
    expect(onConfirmPlanned).toHaveBeenCalledTimes(1);
  });

  test('never shows "Mark eaten" for a slot with no planned rows', () => {
    const tree = create(
      <MealSection
        slot={slot}
        entries={eatenEntries}
        onAdd={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onConfirmPlanned={jest.fn()}
      />,
    );
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel === 'Mark Meal 1 as eaten')).toHaveLength(0);
  });

  test('never shows "Mark eaten" when the parent withheld the handler (read-only / future day)', () => {
    const tree = create(
      <MealSection
        slot={slot}
        entries={plannedEntries}
        onAdd={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        // onConfirmPlanned intentionally omitted, as DiaryScreen does for
        // read-only or a future day.
      />,
    );
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel === 'Mark Meal 1 as eaten')).toHaveLength(0);
  });

  test('never shows "Mark eaten" during multi-select (the card is a selection target then)', () => {
    const tree = create(
      <MealSection
        slot={slot}
        entries={plannedEntries}
        onAdd={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onConfirmPlanned={jest.fn()}
        selectionMode
      />,
    );
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel === 'Mark Meal 1 as eaten')).toHaveLength(0);
  });

  test('carries no score, streak, or pass/fail colour-judgement copy (constitution ban)', () => {
    const tree = create(
      <MealSection
        slot={slot}
        entries={plannedEntries}
        onAdd={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onConfirmPlanned={jest.fn()}
      />,
    ).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).not.toMatch(/streak/i);
    expect(txt).not.toMatch(/score/i);
    expect(txt).not.toMatch(/adherence/i);
  });
});
