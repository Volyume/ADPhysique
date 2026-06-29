/**
 * Mount + snapshot tests for the src/components/food/ component set
 * per UI_FLOWS_LOCKED.md lines 18-28. Covers the four added in the
 * prior batch (EmptyDiary, SourceChip, HeldDecisionCard, ServingPicker)
 * plus the three extracted from inline DiaryScreen / FoodSearchScreen
 * (MealSection, EntryRow, FoodRow).
 *
 * Also locks the EmptyDiary copy to the exact spec string
 * (UI_FLOWS_LOCKED.md line 275) so any future drift breaks here.
 */
import { create, act as actRender } from 'react-test-renderer';

// HeldDecisionCard's support fallback now raises the themed in-app dialog
// (appAlert), not the native Alert.alert (06-06 change, commit 7b9197d).
jest.mock('../../AppAlert', () => ({ appAlert: jest.fn(), AppAlertHost: () => null }));

jest.mock('react-native-gesture-handler/Swipeable', () => {
  const React = require('react');
  return function MockSwipeable(props) {
    return React.createElement('Swipeable', props, props.children);
  };
});

import EmptyDiary, { EMPTY_DIARY_COPY } from '../EmptyDiary';
import SourceChip from '../SourceChip';
import HeldDecisionCard from '../HeldDecisionCard';
import ServingPicker from '../ServingPicker';
import MealSection from '../MealSection';
import { EntryRow, friendlyFoodName } from '../EntryRow';
import FoodRow, { SOURCE_LABEL, kcalForServing } from '../FoodRow';

describe('EmptyDiary', () => {
  // Redesigned 2026-06-01 (supersedes the locked single-sentence copy): a calm
  // card with a short line and the primary actions.
  test('renders the prompt and the add / copy-yesterday actions', () => {
    const tree = create(<EmptyDiary onAdd={() => {}} onCopyYesterday={() => {}} />).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain(EMPTY_DIARY_COPY); // 'Nothing logged yet.'
    expect(txt).toContain('Add food');
    expect(txt).toContain('Copy yesterday');
  });

  test('omits actions when no handlers are supplied', () => {
    const tree = create(<EmptyDiary />).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain(EMPTY_DIARY_COPY);
    expect(txt).not.toContain('Copy yesterday');
  });
});

describe('SourceChip', () => {
  test.each([
    ['off',      'OFF'],
    ['usda',     'USDA'],
    ['cofid',    'CoFID'],
    ['user_ocr', 'OCR'],
    ['custom',   'Custom'],
  ])('source %s renders label %s', (source, label) => {
    const tree = create(<SourceChip source={source} />).toJSON();
    expect(JSON.stringify(tree)).toContain(label);
  });
});

describe('HeldDecisionCard', () => {
  test('renders body + amber badge', () => {
    const tree = create(<HeldDecisionCard type="ffm_floor" body="We held your cut." />).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('Held this week');
    expect(txt).toContain('We held your cut.');
  });

  test('shows Get support button only for ed_pattern type', () => {
    const ed = create(<HeldDecisionCard type="ed_pattern" body="x" />).toJSON();
    expect(JSON.stringify(ed)).toContain('Get support');
    const fm = create(<HeldDecisionCard type="ffm_floor" body="x" />).toJSON();
    expect(JSON.stringify(fm)).not.toContain('Get support');
  });

  test('Why? link present only when onWhy provided', () => {
    const without = create(<HeldDecisionCard type="ffm_floor" body="x" />).toJSON();
    expect(JSON.stringify(without)).not.toContain('Why?');
    const with_ = create(<HeldDecisionCard type="ffm_floor" body="x" onWhy={() => {}} />).toJSON();
    expect(JSON.stringify(with_)).toContain('Why?');
  });

  test('Get support opens the Beat link', () => {
    const { Linking } = require('react-native');
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    let tree;
    actRender(() => { tree = create(<HeldDecisionCard type="ed_pattern" body="x" />); });
    const link = tree.root.findByProps({ accessibilityRole: 'link' });
    actRender(() => link.props.onPress());
    expect(openURL).toHaveBeenCalledWith('https://www.beateatingdisorders.org.uk/');
    openURL.mockRestore();
  });

  test('Get support falls back to an in-app dialog when the link cannot open (no dead-end)', async () => {
    const { Linking } = require('react-native');
    const { appAlert } = require('../../AppAlert');
    const openURL = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no handler'));
    appAlert.mockClear();
    let tree;
    actRender(() => { tree = create(<HeldDecisionCard type="ed_pattern" body="x" />); });
    const link = tree.root.findByProps({ accessibilityRole: 'link' });
    await actRender(async () => { await link.props.onPress(); });
    expect(appAlert).toHaveBeenCalled();
    expect(appAlert.mock.calls[0][1]).toContain('beateatingdisorders');
    openURL.mockRestore();
  });
});

describe('ServingPicker', () => {
  test('renders quantity + units', () => {
    const tree = create(
      <ServingPicker quantity="150" unit="g" onChangeQuantity={() => {}} onChangeUnit={() => {}} />
    ).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('150');
    expect(txt).toContain('"g"');
    expect(txt).toContain('"oz"');
  });

  test('accepts custom unit list', () => {
    const tree = create(
      <ServingPicker
        quantity="1"
        unit="slice"
        units={['slice', 'cup']}
        onChangeQuantity={() => {}}
        onChangeUnit={() => {}}
      />
    ).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('slice');
    expect(txt).toContain('cup');
  });
});

describe('friendlyFoodName', () => {
  test('uses resolved _name when present', () => {
    expect(friendlyFoodName({ _name: 'Greek yoghurt' })).toBe('Greek yoghurt');
  });
  test('falls back to "Custom food" for custom: refs', () => {
    expect(friendlyFoodName({ food_ref: 'custom:abc' })).toBe('Custom food');
  });
  test('labels quick-add entries "Quick add"', () => {
    expect(friendlyFoodName({ food_ref: 'quick:adhoc' })).toBe('Quick add');
  });
  test('falls back to "Food" for everything else', () => {
    expect(friendlyFoodName({ food_ref: 'off:12345' })).toBe('Food');
    expect(friendlyFoodName({})).toBe('Food');
    expect(friendlyFoodName(null)).toBe('Food');
  });
});

describe('EntryRow', () => {
  const baseEntry = {
    id: 'e1',
    _name: 'Greek yoghurt',
    _brand: 'Fage',
    kcal: 142.7,
    protein_g: 10.4,
    carbs_g: 4.1,
    fat_g: 9.8,
    quantity_g: 170,
    food_ref: 'off:abc',
  };

  test('rounds kcal + macros to integers', () => {
    const tree = create(<EntryRow entry={baseEntry} onEdit={() => {}} />).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('"143"');
    expect(txt).toContain('170g'); // quantity is shown in the meta line ("170g", + a logged time when present)
    expect(txt).toContain('"10"');
    expect(txt).toContain('"4"');
  });

  test('shows the logged time in the meta line when logged_at is present', () => {
    const tree = create(<EntryRow entry={{ ...baseEntry, logged_at: new Date('2026-06-29T13:42:00').getTime() }} onEdit={() => {}} />).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('13:42');
    expect(txt).toContain('170g');
  });

  test('renders resolved name and brand', () => {
    const tree = create(<EntryRow entry={baseEntry} onEdit={() => {}} />).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('Greek yoghurt');
    expect(txt).toContain('Fage');
  });

  test('omits brand when missing', () => {
    const tree = create(
      <EntryRow entry={{ ...baseEntry, _brand: null }} onEdit={() => {}} />
    ).toJSON();
    expect(JSON.stringify(tree)).not.toContain('Fage');
  });

  test('accessibilityLabel includes name and rounded kcal', () => {
    const tree = create(<EntryRow entry={baseEntry} onEdit={() => {}} />).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('Greek yoghurt, 143 kcal. Tap to edit.');
  });
});

describe('MealSection', () => {
  const slot = { key: 'breakfast', label: 'Breakfast' };
  const entries = [
    { id: 'a', _name: 'Oats', kcal: 200, protein_g: 7, carbs_g: 30, fat_g: 4, quantity_g: 50, food_ref: 'off:1' },
    { id: 'b', _name: 'Banana', kcal: 105, protein_g: 1, carbs_g: 27, fat_g: 0, quantity_g: 120, food_ref: 'off:2' },
  ];

  test('renders the meal name + a kcal and protein subtotal', () => {
    const tree = create(
      <MealSection slot={slot} entries={entries} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} />
    ).toJSON();
    const txt = JSON.stringify(tree);
    // Title case, not the old shouty uppercase (diary-tab redesign).
    expect(txt).toContain('Breakfast');
    expect(txt).not.toContain('BREAKFAST');
    expect(txt).toContain('305'); // summed kcal
    expect(txt).toContain('kcal');
    expect(txt).toContain('g P'); // protein readout present (7 + 1 = 8)
  });

  test('an empty section shows the name and Add food, no zero subtotal', () => {
    const tree = create(
      <MealSection slot={slot} entries={[]} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} />
    ).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('Breakfast');
    expect(txt).toContain('Add food');
    expect(txt).not.toContain('kcal'); // no "0 kcal" noise on an empty section
  });

  test('Add food button carries the slot label in its a11y label', () => {
    const tree = create(
      <MealSection slot={slot} entries={[]} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} />
    ).toJSON();
    expect(JSON.stringify(tree)).toContain('Add food to Breakfast');
  });
});

describe('FoodRow', () => {
  const baseFood = {
    food_ref: 'off:abc',
    name: 'Wholemeal bread',
    brand: 'Hovis',
    serving_g: 36,
    serving_label: '1 slice',
    kcal_100g: 247,
    source: 'off',
  };

  test('renders name, brand, serving and source label', () => {
    const tree = create(<FoodRow food={baseFood} isFav={false} onPress={() => {}} />).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('Wholemeal bread');
    expect(txt).toContain('Hovis');
    expect(txt).toContain('1 slice');
    expect(txt).toContain('OFF');
  });

  test('appends star when isFav', () => {
    const tree = create(<FoodRow food={baseFood} isFav={true} onPress={() => {}} />).toJSON();
    expect(JSON.stringify(tree)).toContain('★');
  });

  test('omits star when not isFav', () => {
    const tree = create(<FoodRow food={baseFood} isFav={false} onPress={() => {}} />).toJSON();
    expect(JSON.stringify(tree)).not.toContain('★');
  });

  test('falls back to "<serving_g>g" when no serving_label', () => {
    const tree = create(
      <FoodRow food={{ ...baseFood, serving_label: null }} isFav={false} onPress={() => {}} />
    ).toJSON();
    expect(JSON.stringify(tree)).toContain('36g');
  });

  test('shows computed kcal-per-serving', () => {
    // 247 kcal/100g * 36g / 100 = 88.92 → rounded 89
    const tree = create(<FoodRow food={baseFood} isFav={false} onPress={() => {}} />).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('89 kcal');
  });
});

describe('kcalForServing', () => {
  test('rounds (kcal_100g * serving_g) / 100', () => {
    expect(kcalForServing({ kcal_100g: 247, serving_g: 36 })).toBe(89);
    expect(kcalForServing({ kcal_100g: 100, serving_g: 50 })).toBe(50);
  });
  test('falls back to a 100g basis when there is no serving size', () => {
    // Per-100g foods (curated staples) carry no serving_g; show per-100g
    // kcal rather than "nullg".
    expect(kcalForServing({ kcal_100g: 100 })).toBe(100);
    expect(kcalForServing({ kcal_100g: 100, serving_g: 0 })).toBe(100);
  });
  test('handles missing food', () => {
    expect(kcalForServing(null)).toBe(null);
  });
});

describe('SOURCE_LABEL', () => {
  test('matches the locked five sources', () => {
    expect(SOURCE_LABEL).toEqual({
      off: 'OFF',
      usda: 'USDA',
      cofid: 'CoFID',
      user_ocr: 'Snapped',
      custom: 'You',
    });
  });
});
