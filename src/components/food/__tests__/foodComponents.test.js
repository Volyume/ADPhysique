/**
 * Mount + snapshot tests for the src/components/food/ component set
 * per UI_FLOWS_LOCKED.md lines 18-28. Covers the four added in the
 * prior batch (EmptyDiary, SourceChip, HeldDecisionCard, ServingPicker)
 * plus EntryRow/FoodRow (extracted from inline DiaryScreen /
 * FoodSearchScreen) and TimelineEntryRow (Ultimate-Audit item 15, D22
 * 15a/15b: the flat timeline's per-row wrapper, replacing MealSection's
 * retired per-meal card -- MealSection.js and its three dedicated test
 * files were deleted, not left orphaned, once DiaryScreen stopped
 * rendering it).
 *
 * Also locks the EmptyDiary copy to the exact spec string
 * (UI_FLOWS_LOCKED.md line 275) so any future drift breaks here.
 */
import { create, act as actRender } from 'react-test-renderer';

// HeldDecisionCard's support fallback now raises the themed in-app dialog
// (appAlert), not the native Alert.alert (06-06 change, commit 7b9197d).
jest.mock('../../AppAlert', () => ({ appAlert: jest.fn(), AppAlertHost: () => null }));

// EmptyDiary now uses Button, which reaches the haptic vocabulary. Expo's
// native haptics module is not loadable in this bare component test env.
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

import EmptyDiary, { EMPTY_DIARY_COPY } from '../EmptyDiary';
import SourceChip from '../SourceChip';
import HeldDecisionCard from '../HeldDecisionCard';
import ServingPicker from '../ServingPicker';
import TimelineEntryRow from '../TimelineEntryRow';
import { EntryRow, SwipeableEntryRow, friendlyFoodName } from '../EntryRow';
import FoodRow, { SOURCE_LABEL, kcalForServing } from '../FoodRow';
import { colors } from '../../../styles/theme';

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
    expect(txt).not.toContain('Try a suggested meal');
  });

  test('keeps the premium empty state focused when there is no yesterday to copy', () => {
    const tree = create(<EmptyDiary onAdd={() => {}} onPlanDay={() => {}} />).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('Meal builder');
    expect(txt).toContain('Add food');
    expect(txt).toContain(`"backgroundColor":"${colors.surface}"`);
    expect(txt).not.toContain('Copy yesterday');
    expect(txt).not.toContain('Try a suggested meal');
  });

  test('shows Copy yesterday when a real yesterday handler is passed', () => {
    const tree = create(
      <EmptyDiary onAdd={() => {}} onCopyYesterday={() => {}} onPlanDay={() => {}} />,
    ).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('Copy yesterday');
    expect(txt).not.toContain('Try a suggested meal');
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
    expect(txt).toContain('170g'); // quantity is shown in the meta line ("170g", + an eaten time when present)
    expect(txt).toContain('"10"');
    expect(txt).toContain('"4"');
  });

  // Ultimate-Audit item 15 (D22 15b): the quiet time shown is eaten_at, not
  // logged_at ("the moment the client wrote the row" -- item-15-timeline-
  // scoping.md Stage 0). logged_at alone (no eaten_at) shows NO time.
  test('shows the eaten time in the meta line when eaten_at is present', () => {
    const tree = create(<EntryRow entry={{ ...baseEntry, eaten_at: new Date('2026-06-29T13:42:00').getTime() }} onEdit={() => {}} />).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('13:42');
    expect(txt).toContain('170g');
  });

  test('shows NO time when eaten_at is absent, even if logged_at is present (never a false timestamp)', () => {
    const tree = create(<EntryRow entry={{ ...baseEntry, logged_at: new Date('2026-06-29T13:42:00').getTime() }} onEdit={() => {}} />).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).not.toContain('13:42');
    expect(txt).toContain('170g');
  });

  // Ultimate-Audit item 15 (D22 15a): the meal name as a small quiet tag.
  test('renders the meal tag when mealLabel is supplied', () => {
    const tree = create(<EntryRow entry={baseEntry} mealLabel="Meal 2" onEdit={() => {}} />).toJSON();
    expect(JSON.stringify(tree)).toContain('Meal 2');
  });

  test('renders no meal tag when mealLabel is omitted (null, the default)', () => {
    const tree = create(<EntryRow entry={baseEntry} onEdit={() => {}} />).toJSON();
    // No stray tag text: the only strings this row can render are the food
    // name, brand, quantity/time meta line and macro figures, none of which
    // is a "Meal N"-shaped label.
    expect(JSON.stringify(tree)).not.toMatch(/Meal \d/);
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

// Ultimate-Audit item 15 (D22 15a/15b): TimelineEntryRow is the flat
// timeline's per-row wrapper, replacing MealSection's retired per-meal card
// (MealSection.js and its three dedicated test files were deleted, not left
// orphaned). It reuses SwipeableEntryRow/EntryRow verbatim and adds only the
// one piece of chrome MealSection's per-meal card is no longer around to
// provide: a per-ENTRY "Mark eaten" for a still-planned row.
describe('TimelineEntryRow', () => {
  const plannedEntry = {
    id: 'p1', _name: 'Chicken breast', kcal: 250, protein_g: 40, carbs_g: 0, fat_g: 8,
    quantity_g: 150, food_ref: 'off:1', meal_slot: 'meal_1', is_planned: 1,
  };
  const eatenEntry = {
    id: 'e1', _name: 'Oats', kcal: 200, protein_g: 7, carbs_g: 30, fat_g: 4,
    quantity_g: 50, food_ref: 'off:3', meal_slot: 'meal_1', is_planned: 0,
  };

  test('renders the underlying EntryRow with its meal tag', () => {
    const tree = create(
      <TimelineEntryRow entry={eatenEntry} mealLabel="Meal 1" onEdit={() => {}} onDelete={() => {}} />
    ).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('Oats');
    expect(txt).toContain('Meal 1');
  });

  test('shows "Mark eaten" for a planned entry when a confirm handler is supplied', () => {
    const onConfirmPlanned = jest.fn();
    const tree = create(
      <TimelineEntryRow entry={plannedEntry} mealLabel="Meal 1" onEdit={() => {}} onDelete={() => {}} onConfirmPlanned={onConfirmPlanned} />,
    );
    const btn = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Mark this Meal 1 food as eaten')[0];
    expect(btn).toBeDefined();
    btn.props.onPress();
    expect(onConfirmPlanned).toHaveBeenCalledTimes(1);
  });

  test('never shows "Mark eaten" for an already-eaten entry', () => {
    const tree = create(
      <TimelineEntryRow entry={eatenEntry} mealLabel="Meal 1" onEdit={() => {}} onDelete={() => {}} onConfirmPlanned={jest.fn()} />,
    );
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel?.startsWith?.('Mark this'))).toHaveLength(0);
  });

  test('never shows "Mark eaten" when the parent withheld the handler (read-only / future day)', () => {
    const tree = create(
      <TimelineEntryRow entry={plannedEntry} mealLabel="Meal 1" onEdit={() => {}} onDelete={() => {}} />,
    );
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel?.startsWith?.('Mark this'))).toHaveLength(0);
  });

  test('never shows "Mark eaten" during multi-select or in read-only', () => {
    const selecting = create(
      <TimelineEntryRow entry={plannedEntry} mealLabel="Meal 1" onEdit={() => {}} onDelete={() => {}} onConfirmPlanned={jest.fn()} selectionMode />,
    );
    expect(selecting.root.findAll((n) => n.props?.accessibilityLabel?.startsWith?.('Mark this'))).toHaveLength(0);
    const readOnly = create(
      <TimelineEntryRow entry={plannedEntry} mealLabel="Meal 1" onEdit={() => {}} onDelete={() => {}} onConfirmPlanned={jest.fn()} readOnly />,
    );
    expect(readOnly.root.findAll((n) => n.props?.accessibilityLabel?.startsWith?.('Mark this'))).toHaveLength(0);
  });

  test('carries no score, streak, or pass/fail colour-judgement copy (constitution ban)', () => {
    const tree = create(
      <TimelineEntryRow entry={plannedEntry} mealLabel="Meal 1" onEdit={() => {}} onDelete={() => {}} onConfirmPlanned={jest.fn()} />,
    ).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).not.toMatch(/streak/i);
    expect(txt).not.toMatch(/score/i);
    expect(txt).not.toMatch(/adherence/i);
  });
});

// E10 read-only lapse views (founder decision 2026-07-02, "view yes, log no"):
// a lapsed/free user's diary renders these components with readOnly, and NO
// write affordance may survive it. These pins are against the REAL components:
// if any add/edit/delete/swipe path reappears under readOnly, a free user has
// regained a Pro write and this suite must fail.
describe('read-only diary components (E10 lapse views)', () => {
  const slot = { key: 'breakfast', label: 'Breakfast' };
  const entries = [
    { id: 'a', _name: 'Oats', kcal: 200, protein_g: 7, carbs_g: 30, fat_g: 4, quantity_g: 50, food_ref: 'off:1' },
  ];

  // Ultimate-Audit item 15 (D22 15a/15b): MealSection's per-meal card is
  // gone; TimelineEntryRow is the flat timeline's per-row read-only surface.
  test('TimelineEntryRow readOnly still shows the food and meal tag', () => {
    const tree = create(
      <TimelineEntryRow entry={entries[0]} mealLabel={slot.label} onEdit={() => {}} onDelete={() => {}} readOnly />
    ).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('Breakfast');
    expect(txt).toContain('Oats');
    expect(txt).toContain('200');
  });

  test('TimelineEntryRow readOnly renders NO mark-eaten affordance even for a planned entry', () => {
    const planned = { ...entries[0], is_planned: 1 };
    const tree = create(
      <TimelineEntryRow entry={planned} mealLabel={slot.label} onEdit={() => {}} onDelete={() => {}} onConfirmPlanned={jest.fn()} readOnly />
    ).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).not.toContain('Mark eaten');
  });

  test('SwipeableEntryRow readOnly disables the swipe-to-delete gesture', () => {
    const tree = create(
      <SwipeableEntryRow entry={entries[0]} onEdit={() => {}} onDelete={() => {}} readOnly />
    );
    const swipeable = tree.root.findAll((n) => n.type === 'Swipeable')[0];
    expect(swipeable.props.enabled).toBe(false);
  });

  test('EntryRow readOnly carries no tap-to-edit: disabled, no onPress, plain label', () => {
    const tree = create(<EntryRow entry={entries[0]} onEdit={() => {}} readOnly />);
    const row = tree.root.findAll(
      (n) => typeof n.type === 'string' && /Touchable/.test(n.type) && n.props.accessibilityLabel?.startsWith('Oats')
    )[0];
    expect(row.props.disabled).toBe(true);
    expect(row.props.onPress).toBeUndefined();
    expect(row.props.onLongPress).toBeUndefined();
    expect(row.props.accessibilityLabel).not.toContain('Tap to edit');
  });

  test('without readOnly a planned entry\'s mark-eaten affordance stays (the Pro diary is unchanged)', () => {
    const planned = { ...entries[0], is_planned: 1 };
    const tree = create(
      <TimelineEntryRow
        entry={planned}
        mealLabel={slot.label}
        onEdit={() => {}}
        onDelete={() => {}}
        onConfirmPlanned={() => {}}
      />
    ).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('Mark eaten');
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

  test('names the favourite state when isFav', () => {
    const tree = create(<FoodRow food={baseFood} isFav={true} onPress={() => {}} />).toJSON();
    expect(JSON.stringify(tree)).toContain('Starred');
  });

  test('omits favourite marker when not isFav', () => {
    const tree = create(<FoodRow food={baseFood} isFav={false} onPress={() => {}} />).toJSON();
    expect(JSON.stringify(tree)).not.toContain('Starred');
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
