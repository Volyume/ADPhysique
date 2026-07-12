/**
 * AC-08 (Codex adversarial audit, docs/audit/codex-adversarial-audit-triage-
 * 2026-07-12.md): handleCalculate's save path (~:429-531) checked only
 * truthiness on weight/body fat, then persisted the RAW figure to
 * AsyncStorage AND auto-seeded body_metric_log via logBodyMetric, so a
 * mistyped weight (99999 kg) or body fat (250%) would flow straight through
 * to the deterministic nutrition engine and into storage. handleCalculate
 * now gates weight/body fat on bodyMetricValidate.js's own
 * isValidBodyWeightKg/isValidBodyFatPercent BEFORE the engine runs or
 * anything is persisted, rejecting with a calm toast instead of clamping.
 *
 * Renders the real screen (react-test-renderer) against a minimal store/
 * database mock, driving the "Set it for me" fast-path fields (sex, age,
 * height, weight are always present there) plus the full form's body-fat
 * field via "Fine-tune these numbers", so the assertions land against the
 * REAL handleCalculate, not a re-implementation of its gate.
 */
jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), press: jest.fn() }));

const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));

const database = require('../../lib/database');
jest.mock('../../lib/database', () => ({
  saveNutritionTargets: jest.fn(async () => 'row-1'),
  getNutritionTargets: jest.fn(async () => null),
  logBodyMetric: jest.fn(async () => {}),
  getUserBodyProfile: jest.fn(async () => null),
  getLatestBodyWeight: jest.fn(async () => null),
  getLatestBodyComposition: jest.fn(async () => null),
}));

import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../../store/useAppStore';
import NutritionTargetsScreen from '../NutritionTargetsScreen';

const nav = { navigate: jest.fn(), goBack: jest.fn() };

async function flush() {
  await act(async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); });
}

function findInput(tree, accessibilityLabel) {
  return tree.root.findByProps({ accessibilityLabel });
}

function findPressable(tree, label) {
  return tree.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string'
    && n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');
}

async function renderScreen() {
  // The screen prefills `results` from AsyncStorage on mount (STORAGE_KEY),
  // which would otherwise carry a previous test's successful save into the
  // next test's fresh render (results truthy -> the fast "Set it for me"
  // card is replaced by the "Adjust" summary, hiding the fields this suite
  // drives). Real AsyncStorage persists across tests within this file, so
  // start every render from a clean slate.
  await AsyncStorage.clear();
  useAppStore.mockImplementation((sel) => sel({
    user: { id: 'u-test' },
    userProfile: {},
    accessibility: {},
  }));
  let tree;
  await act(async () => { tree = create(<NutritionTargetsScreen navigation={nav} />); });
  await flush();
  return tree;
}

// Fills the always-present "Set it for me" fast-path fields (age, height,
// weight, consent) so `formComplete` is satisfied. `expandFull`, when true,
// also taps "Fine-tune these numbers" first so the body-fat field (full-form
// only) is reachable, and uses "Calculate targets" instead of "Set my
// targets" to submit.
async function fillRequiredFields(tree, { weight = '82', bodyFat, expandFull = false } = {}) {
  if (expandFull) {
    const fineTune = findPressable(tree, 'Fine-tune these numbers')[0];
    expect(fineTune).toBeTruthy();
    await act(async () => { fineTune.props.onPress(); });
    await flush();
  }

  const age = findInput(tree, 'Age');
  await act(async () => { age.props.onChangeText('30'); });
  const ft = findInput(tree, 'Height, feet');
  await act(async () => { ft.props.onChangeText('5'); });
  const inches = findInput(tree, 'Height, inches');
  await act(async () => { inches.props.onChangeText('10'); });
  const weightField = findInput(tree, 'Current weight in kilograms');
  await act(async () => { weightField.props.onChangeText(weight); });

  if (bodyFat !== undefined) {
    const bfField = findInput(tree, 'Body fat estimate percentage');
    await act(async () => { bfField.props.onChangeText(bodyFat); });
  }

  const consent = findPressable(tree, 'I consent to storing this data on my device')[0];
  await act(async () => { consent.props.onPress(); });
  await flush();
}

async function submit(tree, { expandFull = false } = {}) {
  const label = expandFull ? 'Calculate targets' : 'Set my targets';
  const btn = findPressable(tree, label)[0];
  expect(btn).toBeTruthy();
  await act(async () => { await btn.props.onPress(); });
  await flush();
}

afterEach(() => jest.clearAllMocks());

describe('AC-08: body weight range validation (handleCalculate)', () => {
  test('a mistyped weight (99999 kg) is rejected: nothing calculated or persisted, a calm toast fires', async () => {
    const tree = await renderScreen();
    await fillRequiredFields(tree, { weight: '99999' });
    await submit(tree);

    expect(database.saveNutritionTargets).not.toHaveBeenCalled();
    expect(database.logBodyMetric).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.stringMatching(/body weight/i),
      expect.objectContaining({ variant: 'error' }),
    );
  });

  test('a non-positive weight (0) is rejected', async () => {
    const tree = await renderScreen();
    // formComplete requires weight.trim() to be truthy, so use a value that
    // is non-empty but fails isValidBodyWeightKg's lower bound instead of a
    // literal empty string, which the existing truthiness guard already covers.
    await fillRequiredFields(tree, { weight: '0.5' });
    await submit(tree);

    expect(database.saveNutritionTargets).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.stringMatching(/body weight/i),
      expect.objectContaining({ variant: 'error' }),
    );
  });

  test('a realistic weight (82 kg) still calculates and persists as before', async () => {
    const tree = await renderScreen();
    await fillRequiredFields(tree, { weight: '82' });
    await submit(tree);

    expect(mockToastShow).not.toHaveBeenCalled();
    await act(async () => { await AsyncStorage.getItem('@volyume_nutrition_targets'); });
    expect(database.saveNutritionTargets).toHaveBeenCalledWith(
      'u-test',
      expect.objectContaining({ gdprConsented: true }),
    );
  });
});

describe('AC-08: body fat range validation (handleCalculate)', () => {
  test('an impossible body fat (250%) is rejected: nothing calculated or persisted', async () => {
    const tree = await renderScreen();
    await fillRequiredFields(tree, { weight: '82', bodyFat: '250', expandFull: true });
    await submit(tree, { expandFull: true });

    expect(database.saveNutritionTargets).not.toHaveBeenCalled();
    expect(database.logBodyMetric).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.stringMatching(/body fat/i),
      expect.objectContaining({ variant: 'error' }),
    );
  });

  test('a valid body fat (18%) still calculates and persists', async () => {
    const tree = await renderScreen();
    await fillRequiredFields(tree, { weight: '82', bodyFat: '18', expandFull: true });
    await submit(tree, { expandFull: true });

    expect(mockToastShow).not.toHaveBeenCalled();
    expect(database.saveNutritionTargets).toHaveBeenCalledWith(
      'u-test',
      expect.objectContaining({ gdprConsented: true }),
    );
  });

  test('blank body fat (never entered) is not gated, matching the existing optional-field behaviour', async () => {
    const tree = await renderScreen();
    await fillRequiredFields(tree, { weight: '82', expandFull: true });
    await submit(tree, { expandFull: true });

    expect(mockToastShow).not.toHaveBeenCalled();
    expect(database.saveNutritionTargets).toHaveBeenCalled();
  });
});

describe('AC-08: rejection copy carries no em dash (lint rule + calm-voice guard)', () => {
  test('body weight and body fat rejection messages avoid the em dash', async () => {
    const tree = await renderScreen();
    await fillRequiredFields(tree, { weight: '99999' });
    await submit(tree);
    mockToastShow.mock.calls.forEach(([message]) => expect(message).not.toMatch(/—/));
  });
});
