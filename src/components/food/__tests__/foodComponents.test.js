/**
 * Mount + snapshot tests for the src/components/food/ component set
 * per UI_FLOWS_LOCKED.md lines 18-28. Covers SourceChip and FeatureRow plus
 * the three extracted from inline DiaryScreen / FoodSearchScreen
 * (MealSection, EntryRow, FoodRow).
 *
 * D138: HeldDecisionCard and ServingPicker were deleted (zero live
 * importers - the coach's held-decision copy and the serving picker both
 * live inside their real surfaces now), so their blocks went with them.
 *
 * RE-POINTED (D230 R1, food level-up 2026-10-16): EmptyDiary is retired;
 * the workspace is the same on every day. Its block here pinned three
 * truths, and each now lives where the thing itself lives: an empty meal
 * still offers "Add food" (the MealSection block below); the day's doors
 * ("Meal builder", "Copy yesterday") are FeatureRow, pinned below with its
 * ink tile (D230 R2); and "Copy yesterday" appears only when yesterday has
 * food, which is a DiaryScreen decision pinned mounted in
 * src/screens/__tests__/DiaryScreen.foodLevelUp.test.js.
 */
import { create } from 'react-test-renderer';

// Several of these components reach the themed in-app dialog (appAlert)
// rather than the native Alert.alert.
jest.mock('../../AppAlert', () => ({ appAlert: jest.fn(), AppAlertHost: () => null }));

// MealSection's "Add food" is the house Button, which reaches the haptic
// vocabulary. Expo's native haptics module is not loadable in this bare
// component test env.
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

import FeatureRow from '../FeatureRow';
import SourceChip from '../SourceChip';
import MealSection from '../MealSection';
import { EntryRow, SwipeableEntryRow, friendlyFoodName } from '../EntryRow';
import FoodRow, { SOURCE_LABEL, kcalForServing, rowPortion } from '../FoodRow';
import { colors } from '../../../styles/theme';

describe('FeatureRow (the diary doors, D230 R1 and R2)', () => {
  // The empty day's "Meal builder" and "Copy yesterday" were EmptyDiary's
  // actions; both are FeatureRow doors now, so the door itself is pinned.
  test('renders its title and one-line sub, and speaks its own label', () => {
    const tree = create(
      <FeatureRow
        icon="copy-outline"
        title="Copy yesterday"
        sub="Copy yesterday's foods into this day, under the same meals."
        onPress={() => {}}
        accessibilityLabel="Copy yesterday's entries"
        bordered={false}
      />,
    );
    const txt = JSON.stringify(tree.toJSON());
    expect(txt).toContain('Copy yesterday');
    expect(txt).toContain("Copy yesterday's foods into this day, under the same meals.");
    const row = tree.root.findAll(
      (n) => n.props?.accessibilityRole === 'button' && n.props?.accessibilityLabel === "Copy yesterday's entries",
    );
    expect(row.length).toBeGreaterThan(0);
  });

  test('the icon tile is ink: surface2 behind a textSecondary glyph, never amber', () => {
    const tree = create(
      <FeatureRow icon="restaurant-outline" title="Meal builder" sub="Build a day or week from your targets." onPress={() => {}} bordered={false} />,
    );
    const glyph = tree.root.findAll((n) => n.type === 'Ionicons' && n.props.name === 'restaurant-outline')[0];
    expect(glyph.props.color).toBe(colors.textSecondary);
    const txt = JSON.stringify(tree.toJSON());
    expect(txt).toContain(`"backgroundColor":"${colors.surface2}"`);
    expect(txt).not.toContain(colors.primary);
    expect(txt).not.toContain(colors.primaryBg);
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
    // D230 4.3: "170 g" (a space before the unit) in the meta line, plus a
    // logged time when present.
    expect(txt).toContain('170 g');
    expect(txt).toContain('"10"');
    expect(txt).toContain('"4"');
  });

  test('shows the eaten time in the meta line when eaten_at is present', () => {
    // Item 15 data layer (kept after the 2026-07-10 meal-card restoration):
    // the quiet time shown is eaten_at, not logged_at; history is backfilled
    // eaten_at = logged_at by schema v67 so old rows still show their time.
    const tree = create(<EntryRow entry={{ ...baseEntry, eaten_at: new Date('2026-06-29T13:42:00').getTime() }} onEdit={() => {}} />).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('13:42');
    // D230 4.3: one spaced middle dot between the amount and the time.
    expect(txt).toContain('170 g · 13:42');
  });

  // ED-safety non-goal (Ultimate-Audit item 15, D22 15a/15b timeline food
  // logging). Re-anchored here (Campaign 4, coherence-cleanup-2026-08-10,
  // AUDIT-MODULES-FLAGS.md §1.1) from the deleted src/lib/food/diaryTimeline.js
  // suite onto EntryRow, the LIVE meal-card row that actually renders entries:
  // a bulk-confirmed entry with no eaten_at never gets an invented displayed
  // time, and no derived "time since"/gap/hour judgement text is ever shown
  // for it -- only its meal tag and quantity, same as any other row.
  test('an untimed (bulk-confirmed) entry shows no invented time and no derived time-since/gap judgement', () => {
    const tree = create(
      <EntryRow entry={{ ...baseEntry, eaten_at: null }} onEdit={() => {}} mealLabel="Lunch" />,
    ).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('170 g');
    expect(txt).toContain('Lunch');
    expect(txt).not.toMatch(/\d{1,2}:\d{2}/); // no clock time rendered
    expect(txt).not.toMatch(/ago|since|time since|hours? (ago|since)/i);
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
    // RE-POINTED (D230 R16, 4.3): the spoken label now also says the
    // macros in words, so the caption's letters are never read out.
    expect(txt).toContain('Greek yoghurt, 143 kcal, 10 grams protein, 4 carbs, 10 fat. Tap to edit.');
  });

  test('the macro caption reads "10 P · 4 C · 10 F" (D230 R15, 4.3)', () => {
    const tree = create(<EntryRow entry={baseEntry} onEdit={() => {}} />);
    const caption = tree.root.findAll(
      (n) => typeof n.type === 'string' && /Text/.test(n.type)
        && Array.isArray(n.props.children) && n.props.children.join('') === '10 P · 4 C · 10 F',
    );
    expect(caption.length).toBeGreaterThan(0);
  });

  // Item 9 (campaign 2026-07-10): quiet inline weighing-basis chip. Shown
  // ONLY for an explicit raw/cooked weight_state -- never for the
  // as_weighed default or a missing value, so the vast majority of rows
  // carry no extra noise. ED-safety bound: states the weighing basis only,
  // no calorie/portion emphasis, no colour-coding.
  describe('weight_state chip', () => {
    test('shows "Raw" when weight_state is raw', () => {
      const tree = create(<EntryRow entry={{ ...baseEntry, weight_state: 'raw' }} onEdit={() => {}} />).toJSON();
      expect(JSON.stringify(tree)).toContain('Raw');
    });

    test('shows "Cooked" when weight_state is cooked', () => {
      const tree = create(<EntryRow entry={{ ...baseEntry, weight_state: 'cooked' }} onEdit={() => {}} />).toJSON();
      expect(JSON.stringify(tree)).toContain('Cooked');
    });

    test('renders no chip for the as_weighed default (no noise)', () => {
      const tree = create(<EntryRow entry={{ ...baseEntry, weight_state: 'as_weighed' }} onEdit={() => {}} />).toJSON();
      const txt = JSON.stringify(tree);
      expect(txt).not.toContain('Raw');
      expect(txt).not.toContain('Cooked');
    });

    test('renders no chip when weight_state is missing/null', () => {
      const tree = create(<EntryRow entry={baseEntry} onEdit={() => {}} />).toJSON();
      const txt = JSON.stringify(tree);
      expect(txt).not.toContain('Raw');
      expect(txt).not.toContain('Cooked');
    });

    test('the chip uses only neutral tokens, no colour-coding (ED-safety bound)', () => {
      const tree = create(<EntryRow entry={{ ...baseEntry, weight_state: 'cooked' }} onEdit={() => {}} />).toJSON();
      const txt = JSON.stringify(tree);
      expect(txt).toContain(`"backgroundColor":"${colors.surface2}"`);
      expect(txt).not.toContain(colors.error);
      expect(txt).not.toContain(colors.success);
      expect(txt).not.toContain(colors.warning);
    });
  });
});

// L05-D1/D6 (design-usability audit 2026-07-09): re-confirmed by the
// write-affordance build. The action-hub assertions below (single add-food
// action, no saved/scan/quick-add buttons) still hold unchanged; MealSection
// separately gained a decorative per-row edit chevron (entries.map block),
// which carries no accessibilityLabel and cannot match any assertion here.
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
    // RE-POINTED (D230 R15): "305 kcal · 8 g protein", a word not a letter.
    expect(txt).toContain(' g protein'); // protein readout present (7 + 1 = 8)
    expect(txt).toContain(' · ');
  });

  test('an empty section shows the name and Add food, no zero subtotal', () => {
    const tree = create(
      <MealSection
        slot={slot}
        entries={[]}
        onAdd={() => {}}
        onQuickAdd={() => {}}
        onSavedMeals={() => {}}
        onScan={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    ).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('Breakfast');
    expect(txt).toContain('Add food');
    expect(txt).not.toContain('Add saved meal to Breakfast');
    expect(txt).not.toContain('Scan barcode for Breakfast');
    expect(txt).not.toContain('Quick add to Breakfast');
    expect(txt).not.toContain('Nothing logged yet.');
    expect(txt).not.toContain('kcal'); // no "0 kcal" noise on an empty section
  });

  test('Add food button carries the slot label in its a11y label', () => {
    const tree = create(
      <MealSection slot={slot} entries={[]} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} />
    ).toJSON();
    expect(JSON.stringify(tree)).toContain('Add food to Breakfast');
  });

  // RE-POINTED (D230 R3, explanation on demand): the standing line "Your
  // usual foods are below..." is gone. The chip's own label says what it
  // logs and its accessibility hint says how to change the portion first,
  // so the same fast path is still explained, at the chip.
  test('empty slots with usuals explain their fast path at the chip, not in a standing line', () => {
    const tree = create(
      <MealSection
        slot={slot}
        entries={[]}
        usuals={[{ food_ref: 'off:9', name: 'Eggs' }]}
        onAdd={() => {}}
        onQuickAdd={() => {}}
        onSavedMeals={() => {}}
        onScan={() => {}}
        onLogUsual={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    ).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('Eggs');
    expect(txt).not.toContain('Your usual foods are below');
    expect(txt).toContain('Hold to change the portion first');
  });

  test('meal action hub stays focused on the single add-food action', () => {
    const tree = create(
      <MealSection
        slot={slot}
        entries={entries}
        onAdd={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    const add = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Add food to Breakfast')[0];
    expect(add).toBeDefined();
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel === 'Add saved meal to Breakfast')).toHaveLength(0);
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel === 'Scan barcode for Breakfast')).toHaveLength(0);
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

  test('MealSection readOnly still shows the food, subtotal and meal name', () => {
    const tree = create(
      <MealSection slot={slot} entries={entries} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} readOnly />
    ).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('Breakfast');
    expect(txt).toContain('Oats');
    expect(txt).toContain('200');
  });

  test('MealSection readOnly renders NO add, quick add, saved, scan or usuals affordance', () => {
    const usuals = [{ food_ref: 'off:9', name: 'Eggs' }];
    const tree = create(
      <MealSection
        slot={slot} entries={[]} usuals={usuals}
        onAdd={() => {}} onQuickAdd={() => {}} onSavedMeals={() => {}} onScan={() => {}} onLogUsual={() => {}}
        onEdit={() => {}} onDelete={() => {}} readOnly
      />
    ).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).not.toContain('Add food');
    expect(txt).not.toContain('Quick add');
    expect(txt).not.toContain('Add saved meal');
    expect(txt).not.toContain('Scan barcode');
    expect(txt).not.toContain('Eggs'); // usuals are one-tap writes
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

  test('without readOnly the write affordances stay (the Pro diary is unchanged)', () => {
    const tree = create(
      <MealSection
        slot={slot}
        entries={entries}
        onAdd={() => {}}
        onQuickAdd={() => {}}
        onSavedMeals={() => {}}
        onScan={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    ).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('Add food');
    expect(txt).not.toContain('Add saved meal to Breakfast');
    expect(txt).not.toContain('Scan barcode for Breakfast');
    expect(txt).not.toContain('Quick add to Breakfast');
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
    // O18 (comprehension/trust audit 2026-08-06): 'OFF' read as "food gone
    // off" to a first-time user; renamed to the readable 'Food Facts'.
    expect(txt).toContain('Food Facts');
  });

  test('names the favourite state when isFav', () => {
    const tree = create(<FoodRow food={baseFood} isFav={true} onPress={() => {}} />).toJSON();
    expect(JSON.stringify(tree)).toContain('Starred');
  });

  test('omits favourite marker when not isFav', () => {
    const tree = create(<FoodRow food={baseFood} isFav={false} onPress={() => {}} />).toJSON();
    expect(JSON.stringify(tree)).not.toContain('Starred');
  });

  // RE-POINTED (D230 R6, food level-up 2026-10-16): the row's portion now
  // reads in the diary row's grammar, a space before the unit ("36 g", as
  // EntryRow's "60 g"). Same truth: with no serving name the row shows the
  // serving's grams, never "nullg".
  test('falls back to "<serving_g> g" when no serving_label', () => {
    const tree = create(
      <FoodRow food={{ ...baseFood, serving_label: null }} isFav={false} onPress={() => {}} />
    ).toJSON();
    expect(JSON.stringify(tree)).toContain('36 g');
    expect(JSON.stringify(tree)).not.toContain('nullg');
  });

  test('shows computed kcal-per-serving', () => {
    // 247 kcal/100g * 36g / 100 = 88.92 → rounded 89
    const tree = create(<FoodRow food={baseFood} isFav={false} onPress={() => {}} />).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('89 kcal');
  });

  // D138: the fastest path (a bare row + button, no sheet) must be named
  // plainly -- "Add", not the internal "Plate" concept the multi-add tray
  // used to leak into the label.
  // RE-POINTED (D230 R6): the control is now the bare "+" glyph (ink, on a
  // 48 dp target) with no visible word, so the plain name lives where a
  // glyph's name lives, its accessibility label, and the visible "Add" pill
  // text is gone. Same truth: named "Add <food>", never "Plate".
  test('the plus-button reads as "Add <food>", never the internal "Plate"', () => {
    const tree = create(<FoodRow food={baseFood} isFav={false} onPress={() => {}} onAdd={() => {}} />);
    const btn = tree.root.findByProps({ accessibilityLabel: 'Add Wholemeal bread' });
    expect(btn).toBeTruthy();
    expect(btn.props.accessibilityRole).toBe('button');
    expect(JSON.stringify(tree.toJSON())).not.toMatch(/Plate/);
  });

  // RE-POINTED (D230 R6): `addLabel` (the visible pill word) went with the
  // pill; the override that remains is the accessibility label's.
  test('an explicit addAccessibilityLabel still overrides the default', () => {
    const tree = create(
      <FoodRow food={baseFood} isFav={false} onPress={() => {}} onAdd={() => {}} addAccessibilityLabel="Custom label" />
    );
    const btn = tree.root.findByProps({ accessibilityLabel: 'Custom label' });
    expect(btn).toBeTruthy();
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel === 'Add Wholemeal bread')).toHaveLength(0);
  });

  // D138 item 6: the More tab's edit affordance -- a trailing pencil, never
  // gated behind the row's own long-press (already the favourite/exclude
  // preference cycle).
  test('onEdit renders a trailing pencil with a plain a11y label, independent of onAdd', () => {
    const tree = create(
      <FoodRow food={baseFood} isFav={false} onPress={() => {}} onLongPress={() => {}} onEdit={() => {}} />
    );
    const editBtn = tree.root.findByProps({ accessibilityLabel: 'Edit Wholemeal bread' });
    expect(editBtn).toBeTruthy();
    expect(editBtn.props.accessibilityRole).toBe('button');
  });

  test('no onEdit prop renders no edit affordance', () => {
    const tree = create(<FoodRow food={baseFood} isFav={false} onPress={() => {}} />);
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel === 'Edit Wholemeal bread')).toHaveLength(0);
  });

  test('tapping the edit pencil calls onEdit without touching onPress/onLongPress', () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    const onEdit = jest.fn();
    const tree = create(
      <FoodRow food={baseFood} isFav={false} onPress={onPress} onLongPress={onLongPress} onEdit={onEdit} />
    );
    const editBtn = tree.root.findByProps({ accessibilityLabel: 'Edit Wholemeal bread' });
    editBtn.props.onPress();
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
    expect(onLongPress).not.toHaveBeenCalled();
  });
});

// D230 R6 (food level-up 2026-10-16): every search row speaks the diary row's
// grammar. Line one the name; line two the brand, the portion and its energy;
// line three the macros for that same portion as a quiet caption, spoken in
// words. The "+" adds exactly the portion shown, an ink glyph on a 48 dp
// target, and a "don't suggest" row carries none.
describe('FoodRow three-line grammar (D230 R6)', () => {
  const { touchTarget } = require('../../../styles/layout');
  // 247 kcal, 8.9 g protein, 47 g carbs, 2.4 g fat per 100 g; one slice is 36 g:
  // 89 kcal, 3.2 P, 16.9 C, 0.9 F for the slice.
  const bread = {
    food_ref: 'off:abc',
    name: 'Wholemeal bread',
    brand: 'Hovis',
    serving_g: 36,
    serving_label: 'slice',
    kcal_100g: 247,
    protein_100g: 8.9,
    carbs_100g: 47,
    fat_100g: 2.4,
    source: 'off',
  };
  const texts = (tree) => tree.root.findAll((n) => typeof n.type === 'string'
    && Array.isArray(n.children) && n.children.every((c) => typeof c === 'string'))
    .map((n) => n.children.join(''));

  test('name, then brand · portion · energy (source last), then the macro caption', () => {
    const tree = create(<FoodRow food={bread} onPress={() => {}} onAdd={() => {}} />);
    const lines = texts(tree);
    expect(lines).toContain('Wholemeal bread');
    expect(lines).toContain('Hovis · 1 slice (36 g) · 89 kcal · Food Facts');
    expect(lines).toContain('3 P · 17 C · 1 F');
  });

  test('the macro line is a caption and the row speaks the macros in words', () => {
    const tree = create(<FoodRow food={bread} onPress={() => {}} onAdd={() => {}} />);
    const macroNode = tree.root.findAll((n) => typeof n.type === 'string'
      && Array.isArray(n.children) && n.children.join('') === '3 P · 17 C · 1 F')[0];
    const flat = Object.assign({}, ...[].concat(macroNode.props.style).flat(Infinity).filter(Boolean));
    expect(flat.fontSize).toBe(require('../../../styles/theme').type.caption.fontSize);
    const row = tree.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith('Wholemeal bread'))[0];
    expect(row.props.accessibilityLabel).toBe(
      'Wholemeal bread, Hovis, 1 slice, 36 grams, 89 calories, 3 grams protein, 17 carbs, 1 fat.',
    );
    expect(row.props.accessibilityLabel).not.toMatch(/\b\d+ ?[PCF]\b/);
  });

  test('a remembered portion is the portion shown, and the macros follow it', () => {
    const tree = create(<FoodRow food={{ ...bread, last_quantity_g: 72 }} onPress={() => {}} onAdd={() => {}} />);
    const lines = texts(tree);
    expect(lines).toContain('Hovis · 72 g · 178 kcal · Food Facts');
    expect(lines).toContain('6 P · 34 C · 2 F');
  });

  test('the "+" is an ink glyph on a 48 dp target and calls onAdd', () => {
    const onAdd = jest.fn();
    const onPress = jest.fn();
    const tree = create(<FoodRow food={bread} onPress={onPress} onAdd={onAdd} />);
    const btn = tree.root.findByProps({ accessibilityLabel: 'Add Wholemeal bread' });
    const flat = Object.assign({}, ...[].concat(btn.props.style).flat(Infinity).filter(Boolean));
    expect(flat.width).toBeGreaterThanOrEqual(touchTarget.minimum);
    expect(flat.height).toBeGreaterThanOrEqual(touchTarget.minimum);
    const glyph = btn.findAll((n) => n.props?.name === 'add')[0];
    expect(glyph.props.color).toBe(colors.textSecondary);
    expect(glyph.props.color).not.toBe(colors.primary);
    expect(btn.props.accessibilityHint).toBe('Adds 1 slice, 36 grams to the foods to log.');
    btn.props.onPress();
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  test('a "don\'t suggest" row carries no "+" (its body still opens the sheet)', () => {
    const onPress = jest.fn();
    const tree = create(<FoodRow food={bread} preference="dislike" onPress={onPress} onAdd={() => {}} />);
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel === 'Add Wholemeal bread')).toHaveLength(0);
    const row = tree.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith('Wholemeal bread'))[0];
    expect(row.props.accessibilityLabel).toMatch(/Not suggested\.$/);
    row.props.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('a favourite shows a small ink star beside the name; the word is spoken, not shown', () => {
    const tree = create(<FoodRow food={bread} preference="fav" onPress={() => {}} onAdd={() => {}} />);
    expect(texts(tree).some((t) => t.includes('Starred'))).toBe(false);
    const star = tree.root.findAll((n) => n.props?.name === 'star')[0];
    expect(star).toBeTruthy();
    expect(star.props.color).toBe(colors.textSecondary);
    const row = tree.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith('Wholemeal bread'))[0];
    expect(row.props.accessibilityLabel).toMatch(/ Starred\.$/);
  });
});

describe('rowPortion (D230 R6: the portion shown is the portion the "+" adds)', () => {
  test('one named serving reads "1 slice (36 g)"; a counted label keeps its count', () => {
    expect(rowPortion({ serving_g: 36, serving_label: 'slice' }).text).toBe('1 slice (36 g)');
    expect(rowPortion({ serving_g: 36, serving_label: '1 slice' }).text).toBe('1 slice (36 g)');
    expect(rowPortion({ serving_g: 30, serving_label: '2 tbsp' }).text).toBe('2 tbsp (30 g)');
  });
  test('a label that already states its amount is shown as it is', () => {
    expect(rowPortion({ serving_g: 30, serving_label: '30 g' }).text).toBe('30 g');
    expect(rowPortion({ serving_g: 36, serving_label: '1 slice (36g)' }).text).toBe('1 slice (36g)');
  });
  test('a unit-only label names the serving figure ("330 ml")', () => {
    expect(rowPortion({ serving_g: 330, serving_label: 'ml' })).toEqual(
      expect.objectContaining({ grams: 330, text: '330 ml', spoken: '330 millilitres' }),
    );
  });
  test('no named serving reads in grams; no serving at all is 100 g', () => {
    expect(rowPortion({ serving_g: 36, serving_label: null }).text).toBe('36 g');
    expect(rowPortion({}).text).toBe('100 g');
    expect(rowPortion({}).grams).toBe(100);
  });
  test('a remembered portion wins and reads in grams unless it is exactly one serving', () => {
    expect(rowPortion({ serving_g: 36, serving_label: 'slice', last_quantity_g: 72 })).toEqual(
      expect.objectContaining({ grams: 72, text: '72 g', spoken: '72 grams' }),
    );
    expect(rowPortion({ serving_g: 36, serving_label: 'slice', last_quantity_g: 36 }).text).toBe('1 slice (36 g)');
  });
  test('a saved meal shows its own label, never a gram figure', () => {
    expect(rowPortion({ food_ref: 'meal:sm-1', savedMealId: 'sm-1', serving_g: null, serving_label: '3 foods' }).text)
      .toBe('3 foods');
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
  // O18 (comprehension/trust audit 2026-08-06): 'off' renamed 'OFF' ->
  // 'Food Facts' (readable short form; 'OFF' read as "food gone off" to a
  // first-time user). The other four sources were already plain language.
  // RE-POINTED (D230 R15, food level-up 2026-10-16): the one source
  // vocabulary. "Snapped" becomes "From a label", "You" becomes "Yours", and
  // the two sources that had no name at all (a curated staple, a recipe) gain
  // one. Same truth: every source the row shows is named in plain words.
  test('matches the locked source vocabulary', () => {
    expect(SOURCE_LABEL).toEqual({
      off: 'Food Facts',
      cofid: 'CoFID',
      usda: 'USDA',
      user_ocr: 'From a label',
      custom: 'Yours',
      curated: 'Volyume',
      recipe: 'Recipe',
    });
  });
});
