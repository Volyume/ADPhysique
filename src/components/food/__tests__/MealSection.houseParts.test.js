/**
 * MealSection on the house parts (D230 R3, R4, R15 and R16; 4.2), food
 * level-up 2026-10-16.
 *
 * What this suite pins, and why each pin is written to fail:
 *  - R4: the meal card is the house Card; the usual, "Yesterday's <meal>"
 *    and suggestion chips are the house Chip, role "button" (each performs
 *    an action), at a 48 dp minimum height (the hand-rolled chips were about
 *    26 dp); "Add food" is the house Button in its ink variant with the
 *    search glyph.
 *  - R2: no chip glyph is amber.
 *  - R16: the meal name is a header.
 *  - R15: the subtotal reads "420 kcal · 32 g protein" (not "420 kcal -
 *    32g P"), and the per-meal confirm reads "Mark as eaten", the banner's
 *    own words.
 *  - R3: the two standing lines ("Your usual foods are below..." and "A meal
 *    that fits what's left of your day...") are gone; the chip's hint still
 *    says how to change the portion first.
 */
import { create } from 'react-test-renderer';

jest.mock('react-native-gesture-handler/Swipeable', () => {
  const React = require('react');
  return function MockSwipeable(props) {
    return React.createElement('Swipeable', props, props.children);
  };
});
jest.mock('../../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn(), press: jest.fn() }));

import MealSection from '../MealSection';
import Card from '../../Card';
import Chip from '../../Chip';
import Button from '../../Button';
import PressableCard from '../../PressableCard';
import { colors } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';

const SLOT = { key: 'meal_1', label: 'Breakfast' };
const oats = {
  food_ref: 'global:oats', name: 'Porridge oats',
  kcal_100g: 379, protein_100g: 13, carbs_100g: 60, fat_100g: 8,
  last_quantity_g: 60, serving_g: null, serving_label: null,
};

function flattenStyle(style) {
  if (!style) return {};
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return typeof style === 'object' ? style : {};
}
function instanceText(inst) {
  if (typeof inst === 'string') return inst;
  return (inst.children ?? []).map(instanceText).join('');
}

function render(props = {}) {
  return create(
    <MealSection slot={SLOT} entries={[]} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} {...props} />,
  );
}

describe('the card, the chips and the add button are house parts', () => {
  test('the meal card is the house Card', () => {
    const tree = render();
    expect(tree.root.findAllByType(Card)).toHaveLength(1);
  });

  test('every chip is the house Chip, role "button", at a 48 dp minimum, with an ink glyph', () => {
    const empties = [
      render({ usuals: [oats], onLogUsual: () => {}, onEditUsual: () => {} }),
      render({ yesterdayCopy: { label: "Yesterday's Breakfast", count: 2 }, onCopyYesterday: () => {} }),
      render({ mealSuggestion: { id: 'm1', name: 'Greek yoghurt bowl' }, onLogMealSuggestion: () => {} }),
    ];
    empties.forEach((tree) => {
      const chips = tree.root.findAllByType(Chip);
      expect(chips).toHaveLength(1);
      const chip = chips[0];
      expect(chip.props.accessibilityRole).toBe('button');
      const pressable = chip.findByType(PressableCard);
      expect(flattenStyle(pressable.props.style).minHeight).toBeGreaterThanOrEqual(touchTarget.minimum);
      const glyph = chip.findAll((n) => n.type === 'Ionicons')[0];
      expect(glyph.props.color).not.toBe(colors.primary);
    });
  });

  test('the suggestion chip logs the suggestion, and the usual chip still holds to edit', () => {
    const onLogMealSuggestion = jest.fn();
    const suggestion = { id: 'm1', name: 'Greek yoghurt bowl' };
    const s = render({ mealSuggestion: suggestion, onLogMealSuggestion });
    s.root.findByType(Chip).props.onPress();
    expect(onLogMealSuggestion).toHaveBeenCalledWith(suggestion);
    const onEditUsual = jest.fn();
    const u = render({ usuals: [oats], onLogUsual: () => {}, onEditUsual });
    u.root.findByType(Chip).props.onLongPress();
    expect(onEditUsual).toHaveBeenCalledWith(oats);
  });

  test('"Add food" is the house Button, ink variant, search glyph, full width at 48 dp', () => {
    const onAdd = jest.fn();
    const tree = render({ onAdd });
    const buttons = tree.root.findAllByType(Button);
    expect(buttons).toHaveLength(1);
    const add = buttons[0];
    expect(add.props.title).toBe('Add food');
    expect(add.props.variant).toBe('secondary');
    expect(add.props.icon).toBe('search-outline');
    expect(add.props.accessibilityLabel).toBe('Add food to Breakfast');
    expect(add.props.fullWidth).not.toBe(false);
    expect(flattenStyle(add.props.style).minHeight).toBe(touchTarget.minimum);
    add.props.onPress();
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});

describe('headings and copy', () => {
  const entries = [
    { id: 'a', _name: 'Oats', kcal: 300, protein_g: 20, carbs_g: 30, fat_g: 4, quantity_g: 80, food_ref: 'off:1', meal_slot: 'meal_1' },
    { id: 'b', _name: 'Milk', kcal: 120, protein_g: 12, carbs_g: 10, fat_g: 4, quantity_g: 200, food_ref: 'off:2', meal_slot: 'meal_1' },
  ];

  test('the meal name is a header', () => {
    const tree = render();
    const headers = tree.root.findAll((n) => typeof n.type === 'string' && n.props?.accessibilityRole === 'header');
    expect(headers.map(instanceText)).toEqual(['Breakfast']);
  });

  test('the subtotal reads "420 kcal · 32 g protein"', () => {
    const tree = render({ entries });
    const subtotal = tree.root.findAll((n) => typeof n.type === 'string' && /Text/.test(n.type)
      && instanceText(n) === '420 kcal · 32 g protein');
    expect(subtotal.length).toBeGreaterThan(0);
  });

  test('the per-meal confirm reads "Mark as eaten"', () => {
    const planned = entries.map((e) => ({ ...e, is_planned: 1 }));
    const tree = render({ entries: planned, onConfirmPlanned: () => {} });
    const txt = JSON.stringify(tree.toJSON());
    expect(txt).toContain('Mark as eaten');
    expect(txt).not.toContain('"Mark eaten"');
  });

  test('no standing explanation sits over the chips (R3); the hint is on the chip', () => {
    const usual = render({ usuals: [oats], onLogUsual: () => {} });
    const suggestion = render({ mealSuggestion: { id: 'm1', name: 'Bowl' }, onLogMealSuggestion: () => {} });
    const both = JSON.stringify(usual.toJSON()) + JSON.stringify(suggestion.toJSON());
    expect(both).not.toContain('Your usual foods are below');
    expect(both).not.toContain("A meal that fits what's left of your day");
    expect(usual.root.findByType(Chip).props.accessibilityHint).toBe('Hold to change the portion first');
  });
});
