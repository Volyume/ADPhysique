/**
 * D228 item 2: the one composition of the safety reads. Written to FAIL if
 *  - a failed read of either input ever reads as not suppressed;
 *  - calm or an open flag ever reads as not suppressed;
 *  - the SCOFF arm widens `suppressed` on its own (it is carried, not OR-ed);
 *  - the unknown state is not suppressed;
 *  - readEdOrCalmSuppressed stops agreeing with deriveSafetyState.
 */
const mockGetItem = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: (...a) => mockGetItem(...a) } }));
const mockGetFlag = jest.fn();
jest.mock('../database', () => ({ getOpenEdPatternFlag: (...a) => mockGetFlag(...a) }));

const { deriveSafetyState, readSafetyState, withholdsWeightFigures, SAFETY_STATE_UNKNOWN } = require('../safetyState');
const { readEdOrCalmSuppressed, derivePhotoSuppression } = require('../../hooks/usePhotoSuppression');

describe('deriveSafetyState', () => {
  test.each([
    ['unspecified, no flag', { mode: 'unspecified', edFlag: null }, { calm: false, edFlagOpen: false, readFailed: false, suppressed: false }],
    ['normal, no flag', { mode: 'normal', edFlag: null }, { calm: false, edFlagOpen: false, readFailed: false, suppressed: false }],
    ['calm', { mode: 'calm', edFlag: null }, { calm: true, edFlagOpen: false, readFailed: false, suppressed: true }],
    ['open flag', { mode: 'normal', edFlag: { id: 'f' } }, { calm: false, edFlagOpen: true, readFailed: false, suppressed: true }],
    ['wellbeing read failed', { mode: 'read_failed', edFlag: null }, { calm: false, edFlagOpen: false, readFailed: true, suppressed: true }],
    ['flag read failed', { mode: 'normal', edFlag: 'read_failed' }, { calm: false, edFlagOpen: false, readFailed: true, suppressed: true }],
  ])('%s', (_n, input, expected) => {
    expect(deriveSafetyState(input)).toMatchObject({ ...expected, known: true });
  });

  test('SCOFF is carried, never widens suppressed', () => {
    const s = deriveSafetyState({ mode: 'normal', edFlag: null, scoffScore: 3 });
    expect(s.scoffPositive).toBe(true);
    expect(s.suppressed).toBe(false);
    expect(deriveSafetyState({ mode: 'normal', edFlag: null, scoffScore: 1 }).scoffPositive).toBe(false);
  });

  test('the unknown state is suppressed and frozen', () => {
    expect(SAFETY_STATE_UNKNOWN.suppressed).toBe(true);
    expect(SAFETY_STATE_UNKNOWN.known).toBe(false);
    expect(Object.isFrozen(SAFETY_STATE_UNKNOWN)).toBe(true);
  });

  test('agrees with the photo hook law on every input', () => {
    const modes = ['unspecified', 'normal', 'calm', 'read_failed'];
    const flags = [null, { id: 'f' }, 'read_failed'];
    for (const mode of modes) for (const edFlag of flags) {
      expect(deriveSafetyState({ mode, edFlag }).suppressed).toBe(derivePhotoSuppression({ mode, edFlag }));
    }
  });
});

describe('readSafetyState and readEdOrCalmSuppressed', () => {
  beforeEach(() => { mockGetItem.mockReset(); mockGetFlag.mockReset(); });

  test('no user: unknown, suppressed, no reads', async () => {
    expect(await readSafetyState(null)).toBe(SAFETY_STATE_UNKNOWN);
    expect(mockGetItem).not.toHaveBeenCalled();
  });

  test('clean reads: not suppressed', async () => {
    mockGetItem.mockResolvedValue(null); mockGetFlag.mockResolvedValue(null);
    expect(await readSafetyState('u')).toMatchObject({ suppressed: false, readFailed: false, known: true });
    expect(await readEdOrCalmSuppressed('u')).toBe(false);
  });

  test('a failed wellbeing read suppresses, in both readers', async () => {
    mockGetItem.mockRejectedValue(new Error('x')); mockGetFlag.mockResolvedValue(null);
    expect((await readSafetyState('u')).suppressed).toBe(true);
    expect(await readEdOrCalmSuppressed('u')).toBe(true);
  });

  test('a failed flag read suppresses, in both readers', async () => {
    mockGetItem.mockResolvedValue('normal'); mockGetFlag.mockRejectedValue(new Error('x'));
    expect((await readSafetyState('u')).suppressed).toBe(true);
    expect(await readEdOrCalmSuppressed('u')).toBe(true);
  });

  test('calm and an open flag each suppress; the scoff score rides along', async () => {
    mockGetItem.mockResolvedValue('calm'); mockGetFlag.mockResolvedValue(null);
    expect(await readSafetyState('u', { scoffScore: 2 })).toMatchObject({ calm: true, suppressed: true, scoffPositive: true });
    mockGetItem.mockResolvedValue('normal'); mockGetFlag.mockResolvedValue({ id: 'f' });
    expect(await readSafetyState('u')).toMatchObject({ edFlagOpen: true, suppressed: true });
  });
});

// D228 item 2, tier c: the figures arm. Written to FAIL if calm alone ever
// withholds the weight figures, or if an open flag, a failed read, the unknown
// state or no state at all ever stops withholding them.
describe('withholdsWeightFigures (tier c, the figures arm)', () => {
  test.each([
    ['neither calm nor flagged', { mode: 'normal', edFlag: null }, false],
    ['unspecified, no flag', { mode: 'unspecified', edFlag: null }, false],
    ['calm alone', { mode: 'calm', edFlag: null }, false],
    ['an open flag', { mode: 'normal', edFlag: { id: 'f' } }, true],
    ['calm and an open flag', { mode: 'calm', edFlag: { id: 'f' } }, true],
    ['a failed flag read', { mode: 'normal', edFlag: 'read_failed' }, true],
    ['a failed wellbeing read', { mode: 'read_failed', edFlag: null }, true],
  ])('%s', (_n, input, expected) => {
    expect(withholdsWeightFigures(deriveSafetyState(input))).toBe(expected);
  });

  test('the unknown state, no state, and a malformed state all withhold (fail closed)', () => {
    expect(withholdsWeightFigures(SAFETY_STATE_UNKNOWN)).toBe(true);
    expect(withholdsWeightFigures(undefined)).toBe(true);
    expect(withholdsWeightFigures(null)).toBe(true);
    expect(withholdsWeightFigures({})).toBe(true);
  });

  test('a SCOFF score on its own does not withhold (it is carried, not OR-ed)', () => {
    expect(withholdsWeightFigures(deriveSafetyState({ mode: 'normal', edFlag: null, scoffScore: 3 }))).toBe(false);
  });

  test('figures withheld always implies the quiet state (the figures arm is a subset of suppressed)', () => {
    for (const mode of ['unspecified', 'normal', 'calm', 'read_failed']) {
      for (const edFlag of [null, { id: 'f' }, 'read_failed']) {
        const s = deriveSafetyState({ mode, edFlag });
        if (withholdsWeightFigures(s)) expect(s.suppressed).toBe(true);
      }
    }
  });
});
