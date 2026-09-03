/**
 * D138 item 1 + item 2: the empty meal card's chip row.
 *
 * What this suite pins, and why:
 *
 *  1. A usual chip DISCLOSES the portion it will write, in the label itself
 *     ("Porridge oats · 60 g") and in its accessibility label ("Log porridge
 *     oats, 60 grams"). A one-tap log that does not state its own amount
 *     would be a silent write of the user's diary, which the diary must
 *     never do.
 *  2. Tapping the chip calls onLogUsual (the diary's real log path) with the
 *     food carrying its remembered portion; HOLDING it calls onEditUsual (the
 *     old search/detail path) so the portion can still be changed first.
 *  3. The "Yesterday's <meal>" chip leads the row, is offered only on an
 *     EMPTY slot, and calls onCopyYesterday.
 *  4. None of the above ever appears on a slot with food, in selection mode,
 *     or on a read-only view: the chips are a write surface.
 */
import { create } from 'react-test-renderer';

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

import MealSection, {
  usualPortion, usualPortionText, usualChipLabel, usualChipAccessibilityLabel,
} from '../MealSection';

const SLOT = { key: 'meal_1', label: 'Breakfast' };

const oats = {
  food_ref: 'global:oats', name: 'Porridge oats',
  kcal_100g: 379, protein_100g: 13, carbs_100g: 60, fat_100g: 8,
  last_quantity_g: 60, serving_g: null, serving_label: null,
};

const bread = {
  food_ref: 'global:bread', name: 'Seeded bread',
  kcal_100g: 250, protein_100g: 10, carbs_100g: 40, fat_100g: 5,
  last_quantity_g: 80, serving_g: 40, serving_label: 'slice',
};

function render(props = {}) {
  return create(
    <MealSection
      slot={SLOT}
      entries={[]}
      onAdd={() => {}}
      onEdit={() => {}}
      onDelete={() => {}}
      {...props}
    />,
  );
}

// { deep: false } so a TouchableOpacity and the host View it renders (which
// carries the same props) count as ONE chip, not two.
const chipsByLabel = (tree, label) => tree.root.findAll(
  (n) => n.props?.accessibilityRole === 'button' && n.props?.accessibilityLabel === label,
  { deep: false },
);

describe('usual chip portion disclosure', () => {
  test('grams portion reads on the chip and is spoken in full', () => {
    expect(usualChipLabel(oats)).toBe('Porridge oats · 60 g');
    // The food's own stored name is used verbatim; only the portion is added.
    expect(usualChipAccessibilityLabel(oats, 'Breakfast')).toBe('Log Porridge oats, 60 grams');
    expect(usualPortionText(oats)).toBe('60 g');
  });

  test('a household serving is used when the remembered grams divide cleanly', () => {
    expect(usualChipLabel(bread)).toBe('Seeded bread · 2 slices');
    expect(usualChipLabel({ ...bread, last_quantity_g: 40 })).toBe('Seeded bread · 1 slice');
    // Half servings count as clean; a third of one does not.
    expect(usualChipLabel({ ...bread, last_quantity_g: 60 })).toBe('Seeded bread · 1.5 slices');
    expect(usualChipLabel({ ...bread, last_quantity_g: 55 })).toBe('Seeded bread · 55 g');
  });

  test('a serving size with no label stays in grams (never an unnamed "2")', () => {
    expect(usualChipLabel({ ...bread, serving_label: null })).toBe('Seeded bread · 80 g');
  });

  test('no remembered portion means no portion claim at all', () => {
    expect(usualPortion({ ...oats, last_quantity_g: 0 })).toBeNull();
    expect(usualChipLabel({ ...oats, last_quantity_g: null })).toBe('Porridge oats');
    expect(usualChipAccessibilityLabel({ ...oats, last_quantity_g: null }, 'Breakfast'))
      .toBe('Log Porridge oats to Breakfast');
  });
});

describe('one-tap usual', () => {
  test('the chip renders the portion and logs the remembered food on tap', () => {
    const onLogUsual = jest.fn();
    const tree = render({ usuals: [oats], onLogUsual });
    const chip = chipsByLabel(tree, 'Log Porridge oats, 60 grams');
    expect(chip).toHaveLength(1);
    expect(JSON.stringify(tree.toJSON())).toContain('Porridge oats · 60 g');
    chip[0].props.onPress();
    expect(onLogUsual).toHaveBeenCalledWith(oats);
  });

  test('holding the chip opens the portion-editing path instead of logging', () => {
    const onLogUsual = jest.fn();
    const onEditUsual = jest.fn();
    const tree = render({ usuals: [oats], onLogUsual, onEditUsual });
    const chip = chipsByLabel(tree, 'Log Porridge oats, 60 grams')[0];
    expect(chip.props.accessibilityHint).toBe('Hold to change the portion first');
    chip.props.onLongPress();
    expect(onEditUsual).toHaveBeenCalledWith(oats);
    expect(onLogUsual).not.toHaveBeenCalled();
  });

  test('a slot with food logged offers no usual chips at all', () => {
    const entry = {
      id: 'e1', meal_slot: 'meal_1', food_ref: 'global:oats', quantity_g: 60,
      kcal: 227, protein_g: 8, carbs_g: 36, fat_g: 5, _name: 'Porridge oats',
    };
    const tree = render({ entries: [entry], usuals: [oats], onLogUsual: () => {} });
    expect(chipsByLabel(tree, 'Log Porridge oats, 60 grams')).toHaveLength(0);
  });

  test('selection mode and read-only views never offer the write', () => {
    const sel = render({ usuals: [oats], onLogUsual: () => {}, selectionMode: true, selectedIds: new Set() });
    expect(chipsByLabel(sel, 'Log Porridge oats, 60 grams')).toHaveLength(0);
    const ro = render({ usuals: [oats], onLogUsual: () => {}, readOnly: true });
    expect(chipsByLabel(ro, 'Log Porridge oats, 60 grams')).toHaveLength(0);
  });
});

describe("per-meal copy from yesterday", () => {
  const yesterdayCopy = { label: "Yesterday's Breakfast", count: 3 };
  const COPY_LABEL = "Yesterday's Breakfast, copy 3 entries into Breakfast";

  test('the copy chip leads the row and calls back on tap', () => {
    const onCopyYesterday = jest.fn();
    const tree = render({ usuals: [oats], onLogUsual: () => {}, yesterdayCopy, onCopyYesterday });
    const chip = chipsByLabel(tree, COPY_LABEL);
    expect(chip).toHaveLength(1);
    chip[0].props.onPress();
    expect(onCopyYesterday).toHaveBeenCalled();

    // First position: the copy chip is rendered before the usuals.
    const txt = JSON.stringify(tree.toJSON());
    expect(txt.indexOf("Yesterday's Breakfast")).toBeLessThan(txt.indexOf('Porridge oats · 60 g'));
  });

  test('it renders on a slot with no usuals to offer', () => {
    const tree = render({ usuals: null, yesterdayCopy, onCopyYesterday: () => {} });
    expect(chipsByLabel(tree, COPY_LABEL)).toHaveLength(1);
  });

  test('a single entry is announced in the singular', () => {
    const tree = render({
      yesterdayCopy: { label: "Yesterday's Breakfast", count: 1 },
      onCopyYesterday: () => {},
    });
    expect(chipsByLabel(tree, "Yesterday's Breakfast, copy 1 entry into Breakfast")).toHaveLength(1);
  });

  test('never on a slot that already has food, in selection mode, or read-only', () => {
    const entry = { id: 'e1', meal_slot: 'meal_1', food_ref: 'global:oats', quantity_g: 60, kcal: 227 };
    expect(chipsByLabel(render({ entries: [entry], yesterdayCopy, onCopyYesterday: () => {} }), COPY_LABEL)).toHaveLength(0);
    expect(chipsByLabel(render({ yesterdayCopy, onCopyYesterday: () => {}, selectionMode: true, selectedIds: new Set() }), COPY_LABEL)).toHaveLength(0);
    expect(chipsByLabel(render({ yesterdayCopy, onCopyYesterday: () => {}, readOnly: true }), COPY_LABEL)).toHaveLength(0);
  });
});
