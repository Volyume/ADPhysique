/**
 * Campaign 3 discoverability audit, finding #2 (docs/discoverability-audit-
 * 2026-08-10/SETTINGS-INVENTORY.md §4 #2 and §2.2 "Diet preference" row):
 * SettingsProfileScreen used to hardcode a 3-option diet list (omnivore /
 * vegetarian / vegan) while the canonical DIETS list
 * (lib/food/curatedMeals.js, also consumed by DietaryPreferencesEditor.js)
 * has a 4th value, pescatarian. A pescatarian user saw no chip selected here
 * and any tap silently overwrote their stored diet.
 *
 * Both surfaces write the SAME field through the SAME store action
 * (setDietPreference -> userProfile.dietPreference, useAppStore.js:1796-
 * 1808), so this is a same-field UI fix, not a data-model change: this
 * screen now renders its chip row from the shared DIETS constant instead of
 * a second, drifting literal.
 *
 * Two layers, matching this suite's existing guard-test convention:
 *   1. A source-level regression guard so the screen can never silently
 *      revert to its own hardcoded (and shorter) options array.
 *   2. A render-level pin proving the 4 chips, in DIETS order, actually
 *      appear, that a pescatarian user's chip shows selected, and that
 *      tapping a chip writes through setDietPreference with the tapped
 *      value -- the exact contract DietaryPreferencesEditor.test.js pins
 *      for the other surface.
 */
const fs = require('fs');
const path = require('path');

describe('SettingsProfileScreen diet options: source guard', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../SettingsProfileScreen.js'),
    'utf8',
  );

  test('imports the canonical DIETS list rather than a private literal', () => {
    expect(source).toMatch(/import\s*\{\s*DIETS\s*\}\s*from\s*'\.\.\/lib\/food\/curatedMeals'/);
  });

  test('DIET_OPTIONS is derived from DIETS, not a hand-written array', () => {
    expect(source).toMatch(/const DIET_OPTIONS = DIETS\.map\(/);
    // A stale 3-option literal (the pre-fix shape) must not reappear.
    expect(source).not.toMatch(/const DIET_OPTIONS = \[\s*\{\s*value: 'omnivore'/);
  });
});

describe('SettingsProfileScreen diet options: render pin', () => {
  jest.resetModules();
  jest.doMock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
  jest.doMock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
  jest.doMock('../../lib/haptics', () => ({ selection: jest.fn(), press: jest.fn() }));
  jest.doMock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
  jest.doMock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
  jest.doMock('../../lib/database', () => ({
    getUserBodyProfile: jest.fn(async () => null),
    saveUserBodyProfile: jest.fn(async () => 'row-1'),
  }));

  const { DIETS } = require('../../lib/food/curatedMeals');
  const useAppStore = require('../../store/useAppStore').default;
  const { act, create } = require('react-test-renderer');
  const SettingsProfileScreen = require('../SettingsProfileScreen').default;

  const EXPECTED_LABELS = {
    omnivore: 'Omnivore',
    pescatarian: 'Pescatarian',
    vegetarian: 'Vegetarian',
    vegan: 'Vegan',
  };

  async function flush() {
    await act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); });
  }

  function dietChips(tree) {
    // Multiple nested layers (Chip -> PressableCard -> Pressable) all carry
    // the same accessibilityRole/Label/onPress props, so match at the Chip
    // component itself only, not every layer it forwards props through.
    return tree.root.findAll(
      (n) => n.type && n.type.name === 'Chip'
        && typeof n.props.accessibilityLabel === 'string'
        && n.props.accessibilityLabel.startsWith('Diet preference '),
    );
  }

  async function renderScreen(dietPreference) {
    const setDietPreference = jest.fn();
    useAppStore.mockImplementation((sel) => sel({
      user: { id: 'u-test' },
      userProfile: { dietPreference },
      saveLocalProfile: jest.fn(async () => {}),
      setDietPreference,
    }));
    let tree;
    await act(async () => { tree = create(<SettingsProfileScreen />); });
    await flush();
    return { tree, setDietPreference };
  }

  test('renders exactly the DIETS values, in DIETS order, with the same labels DietaryPreferencesEditor uses', async () => {
    const { tree } = await renderScreen('omnivore');
    const chips = dietChips(tree);
    expect(chips).toHaveLength(DIETS.length);
    expect(chips.map((c) => c.props.accessibilityLabel)).toEqual(
      DIETS.map((value) => `Diet preference ${EXPECTED_LABELS[value]}`),
    );
  });

  test('a pescatarian user sees the Pescatarian chip, and only that chip, selected', async () => {
    expect(DIETS).toContain('pescatarian');
    const { tree } = await renderScreen('pescatarian');
    const chips = dietChips(tree);
    const pescatarianChip = chips.find((c) => c.props.accessibilityLabel === 'Diet preference Pescatarian');
    expect(pescatarianChip).toBeTruthy();
    expect(pescatarianChip.props.selected).toBe(true);

    const others = chips.filter((c) => c.props.accessibilityLabel !== 'Diet preference Pescatarian');
    others.forEach((c) => expect(c.props.selected).toBe(false));
  });

  test('tapping a chip writes through setDietPreference with the tapped value, no silent downgrade', async () => {
    const { tree, setDietPreference } = await renderScreen('pescatarian');
    const chips = dietChips(tree);
    const veganChip = chips.find((c) => c.props.accessibilityLabel === 'Diet preference Vegan');
    await act(async () => { veganChip.props.onPress(); });

    expect(setDietPreference).toHaveBeenCalledTimes(1);
    expect(setDietPreference).toHaveBeenCalledWith('vegan');
  });
});
