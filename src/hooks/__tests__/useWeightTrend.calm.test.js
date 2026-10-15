/**
 * useWeightTrend.calm.test.js
 *
 * S6-1 (progress-tab audit 2026-09-24, register D200): the Progress landing's
 * Body pillar rendered the smoothed bodyweight and its weekly rate from this
 * hook's view-model with no calm-mode read anywhere in the chain, while the
 * Photos pillar beside it and Body metrics itself withhold under calm. Pins
 * that the REAL hook (mounted, with only its I/O mocked):
 *
 *  1. reads the RAW wellbeing key and passes calm into deriveWeightTrend, so a
 *     calm-mode user gets no figure, no rate and the one calm line;
 *  2. leaves a normal-mode user's figures exactly as before;
 *  3. FAILS CLOSED: a wellbeing read failure counts as calm (the same
 *     'read_failed' sentinel usePhotoSuppression uses), never as "not calm";
 *  4. (source guard) never uses the failure-swallowing getWellbeingMode().
 */
import { useEffect } from 'react';
import { create, act } from 'react-test-renderer';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const R = require('react'); R.useEffect(cb, [cb]); },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}) },
}));
jest.mock('../../lib/database', () => ({
  getMorningWeights: jest.fn(async () => []),
  getNutritionTargets: jest.fn(async () => null),
  getOpenEdPatternFlag: jest.fn(async () => null),
  getLatestCoachOutput: jest.fn(async () => null),
  getUserBodyProfile: jest.fn(async () => null),
  getLatestBodyComposition: jest.fn(async () => null),
}));
jest.mock('../../lib/food/db', () => ({ getRecentIntakeSummary: jest.fn(async () => null) }));
jest.mock('../../lib/effectiveMaintenanceService', () => ({
  resolveEffectiveMaintenanceForUser: jest.fn(async () => ({ resolved: { source: 'formula_prior' } })),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMorningWeights, getOpenEdPatternFlag } from '../../lib/database';
import { WELLBEING_KEY } from '../../lib/wellbeing';
import { CALM_INSIGHT } from '../../lib/weightTrend';
import { BODY_METRICS_FLAG_LINE } from '../../lib/bodyMetricsPolicy';
import { bodyPillarCopy } from '../../lib/progress/pillars';
import useWeightTrend from '../useWeightTrend';

// Twenty daily weigh-ins ending today: state 3, so a normal-mode user sees a
// figure and a rate, which is exactly what calm must withhold.
function twentyWeighIns() {
  const now = Date.now();
  return Array.from({ length: 20 }, (_, i) => ({
    loggedAt: now - (19 - i) * 86400000,
    weightKg: 80 - i * 0.05,
  }));
}

let latest = null;
function Probe() {
  const vm = useWeightTrend('u1');
  useEffect(() => { latest = vm; });
  return null;
}

async function mountAndSettle() {
  latest = null;
  await act(async () => { create(<Probe />); });
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
  return latest;
}

describe('S6-1: useWeightTrend passes calm mode into the shared derivation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMorningWeights.mockResolvedValue(twentyWeighIns());
  });

  test('normal mode: the figure and the rate render as before (the control case)', async () => {
    AsyncStorage.getItem.mockResolvedValue('unspecified');
    const vm = await mountAndSettle();
    expect(vm.loading).toBe(false);
    expect(vm.calm).toBeUndefined();
    expect(vm.ewmaNow).not.toBeNull();
    expect(vm.state).toBeGreaterThanOrEqual(3);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(WELLBEING_KEY);
  });

  test('calm mode: no figure, no rate, the one calm line', async () => {
    AsyncStorage.getItem.mockResolvedValue('calm');
    const vm = await mountAndSettle();
    expect(vm.loading).toBe(false);
    expect(vm.calm).toBe(true);
    expect(vm.ewmaNow).toBeNull();
    expect(vm.showRate).toBe(false);
    expect(vm.maintenance).toBeNull();
    expect(vm.insight).toBe(CALM_INSIGHT);
  });

  test('fails closed: a wellbeing read failure counts as calm', async () => {
    AsyncStorage.getItem.mockRejectedValue(new Error('storage unavailable'));
    const vm = await mountAndSettle();
    expect(vm.loading).toBe(false);
    expect(vm.calm).toBe(true);
    expect(vm.ewmaNow).toBeNull();
    expect(vm.insight).toBe(CALM_INSIGHT);
  });
});

describe('S6-1 wiring (source guard)', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'useWeightTrend.js'), 'utf8');

  test('reads the RAW wellbeing key with the fail-closed sentinel, never getWellbeingMode()', () => {
    expect(src).not.toMatch(/getWellbeingMode\(/);
    expect(src).toMatch(/AsyncStorage\.getItem\(WELLBEING_KEY\)[\s\S]*?\.catch\(\(\)\s*=>\s*'read_failed'\)/);
    expect(src).toMatch(/isCalm\(wellbeingMode\) \|\| wellbeingMode === 'read_failed'/);
  });
});

// D228 addendum Q2-A (founder 2026-10-15): the Analytics body pillar under an
// open flag reads the same figure-free line as Body metrics. The REAL hook and
// the REAL pillar copy, over the four states the lane names: neither calm nor
// flagged (unchanged output), calm alone (unchanged: its own calm line), an
// open flag (the Body metrics line), and a failed read (suppressed, fail
// closed, as a flag).
describe('D228 Q2-A: the Analytics body pillar under the safety state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMorningWeights.mockResolvedValue(twentyWeighIns());
    getOpenEdPatternFlag.mockResolvedValue(null);
    AsyncStorage.getItem.mockResolvedValue('unspecified');
  });

  test('neither calm nor flagged: the pillar prints its trend and figure exactly as before', async () => {
    const vm = await mountAndSettle();
    const pillar = bodyPillarCopy(vm, 'kg');
    expect(vm.edFlagOpen).toBe(false);
    expect(vm.insight).not.toBe(BODY_METRICS_FLAG_LINE);
    expect(vm.insight).not.toBe(CALM_INSIGHT);
    expect(pillar.evidence).toMatch(/^Trend \d/); // the figure prints
  });

  test('calm alone: its own calm line and no figure, unchanged by this lane', async () => {
    AsyncStorage.getItem.mockResolvedValue('calm');
    const vm = await mountAndSettle();
    const pillar = bodyPillarCopy(vm, 'kg');
    expect(pillar.state).toBe(CALM_INSIGHT.replace(/\.$/, ''));
    expect(pillar.state).toBe('Your weigh-ins are kept in Body metrics, ready when you want them');
    expect(pillar.evidence).toBeNull();
  });

  test('an open flag: the Body metrics line, no direction word, no figure', async () => {
    getOpenEdPatternFlag.mockResolvedValue({ id: 'flag-1' });
    const vm = await mountAndSettle();
    const pillar = bodyPillarCopy(vm, 'kg');
    expect(vm.edFlagOpen).toBe(true);
    expect(vm.insight).toBe(BODY_METRICS_FLAG_LINE);
    expect(pillar.state).toBe('Your weigh-ins are kept here');
    expect(pillar.state).not.toMatch(/drifting|rising|stable|falling|\d/i);
    expect(pillar.evidence).toBeNull();
  });

  test('a failed flag read fails closed, as an open flag', async () => {
    getOpenEdPatternFlag.mockRejectedValue(new Error('sqlite'));
    const vm = await mountAndSettle();
    const pillar = bodyPillarCopy(vm, 'kg');
    expect(vm.insight).toBe(BODY_METRICS_FLAG_LINE);
    expect(pillar.state).toBe('Your weigh-ins are kept here');
    expect(pillar.evidence).toBeNull();
  });

  test('the same line on every flag path: too few weigh-ins and a lapsed trend', async () => {
    getOpenEdPatternFlag.mockResolvedValue({ id: 'flag-1' });
    getMorningWeights.mockResolvedValue(twentyWeighIns().slice(0, 3)); // state 1
    expect((await mountAndSettle()).insight).toBe(BODY_METRICS_FLAG_LINE);
    getMorningWeights.mockResolvedValue(twentyWeighIns().map((w) => ({ ...w, loggedAt: w.loggedAt - 40 * 86400000 }))); // lapsed
    const lapsed = await mountAndSettle();
    expect(lapsed.lapsed).toBe(true);
    expect(lapsed.insight).toBe(BODY_METRICS_FLAG_LINE);
  });
});
