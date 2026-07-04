/**
 * AddCustomFoodScreen.test.js
 *
 * FOOD-001: the custom-food form logs the eaten amount with logFoodEntry. It
 * must not save a negative, zero, blank or extreme quantity, which would leave a
 * diary row whose grams and macros disagree (macro scaling clamps non-positive
 * grams to zero macros, but the quantity itself would stay wrong). This suite
 * pins that the form validates the eaten grams against the shared 1 to 5000 g
 * bound (the same gate FoodDetailSheet uses) BEFORE calling logFoodEntry:
 * -50, 0, blank and 6000 are refused with a calm toast and no write; a valid
 * amount goes through.
 *
 * Heavy screen mount, mocked at the same boundaries the food-screen suites use
 * (FoodSearchScreen.test.js): the DB layer, useAppStore, navigation, the Toast,
 * and the Save button (captured so the test can invoke its onPress as a real tap
 * would). The grams validator (servingEntry) and macro/sanity helpers are the
 * REAL modules so the guard under test is exercised, not a stand-in.
 */
import { create, act } from 'react-test-renderer';

const mockToastShow = jest.fn();

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../lib/observability', () => ({ audit: jest.fn() }));
jest.mock('../../lib/engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

// Save button: captured on every render so the test can invoke onPress directly,
// the same call the real "Save and add to diary" tap makes.
let mockSaveButton = null;
jest.mock('../../components/Button', () => (props) => {
  if (props.accessibilityLabel === 'Save food and add to diary') mockSaveButton = props;
  return null;
});

jest.mock('../../lib/food/db', () => ({
  insertCustomFood: jest.fn(() => Promise.resolve('custom-1')),
  logFoodEntry: jest.fn(() => Promise.resolve('entry-1')),
}));
jest.mock('../../lib/food/writeback', () => ({
  queueContribution: jest.fn(() => Promise.resolve()),
  getConsent: jest.fn(() => Promise.resolve(false)),
  markScanChainCompleted: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../lib/food/sources/localCache', () => ({ findLocalByBarcode: jest.fn(() => Promise.resolve(null)) }));

import useAppStore from '../../store/useAppStore';
import { insertCustomFood, logFoodEntry } from '../../lib/food/db';
import AddCustomFoodScreen from '../AddCustomFoodScreen';

const store = { user: { id: 'u1' } };

function makeNav() {
  return { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), setParams: jest.fn() };
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

const WARNING = 'Enter an amount between 1 and 5000 g.';

beforeEach(() => {
  jest.clearAllMocks();
  mockSaveButton = null;
  useAppStore.mockImplementation((selector) => selector(store));
});

function setInput(tree, label, value) {
  const nodes = tree.root.findAll((n) => n.props && n.props.accessibilityLabel === label);
  expect(nodes.length).toBeGreaterThan(0);
  act(() => { nodes[0].props.onChangeText(value); });
}

// Renders the form, fills a valid name (so canSave is satisfied) and sets the
// eaten amount, then presses Save and returns after the async work settles.
async function renderAndSave(eatenValue) {
  const nav = makeNav();
  const route = { params: { mealSlot: 'snack', entryDate: '2026-07-04' } };
  let tree;
  await act(async () => { tree = create(<AddCustomFoodScreen navigation={nav} route={route} />); });
  await flush();
  setInput(tree, 'Name', 'Test food');
  setInput(tree, 'Eaten (g), grams', eatenValue);
  expect(mockSaveButton).toBeTruthy();
  await act(async () => { await mockSaveButton.onPress(); });
  await flush();
  return nav;
}

describe('AddCustomFoodScreen eaten-quantity guard (FOOD-001)', () => {
  test.each([
    ['a negative amount', '-50'],
    ['zero', '0'],
    ['blank', ''],
    ['an extreme amount over the 5000 g cap', '6000'],
  ])('refuses %s: no log, calm toast, stays on the form', async (_label, value) => {
    const nav = await renderAndSave(value);
    expect(logFoodEntry).not.toHaveBeenCalled();
    expect(insertCustomFood).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(WARNING, { variant: 'warning' });
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  test('accepts a valid amount (150 g): logs it and does not warn', async () => {
    const nav = await renderAndSave('150');
    expect(insertCustomFood).toHaveBeenCalledTimes(1);
    expect(logFoodEntry).toHaveBeenCalledTimes(1);
    expect(logFoodEntry).toHaveBeenCalledWith('u1', expect.objectContaining({
      foodRef: 'custom:custom-1',
      quantityG: 150,
    }));
    expect(mockToastShow).not.toHaveBeenCalledWith(WARNING, expect.anything());
    expect(nav.goBack).toHaveBeenCalled();
  });
});
