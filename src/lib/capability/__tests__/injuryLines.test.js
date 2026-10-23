/**
 * injuryLines.test.js - the three always-on Injuries & limitations lines, moved
 * from Today to Train (D231, app layout rework, batch 2). The mounted checks
 * (the lines under the row on Train, plain text, with their conditions) are in
 * src/screens/__tests__/PlansScreen.d231Train.test.js; these pin the derivation
 * itself, which moved out of HomeScreen.js unchanged:
 *
 *  - the works-around fact needs an episode rule that is APPLIED and not HELD
 *    (the serve gate plus its hold filter), so the line never claims what the
 *    serve layer does not do;
 *  - the could-not-check fact is the resolver's exact no-known-state signature
 *    (unavailable and not stale), never "restrictions are empty", and stale-but-
 *    known state (CAP-17) never fires it;
 *  - a read that throws is a failed check, not an empty one;
 *  - the reintroduction line reads the ramp's stamp off the current block week's
 *    planned rows, and a failed read is no line, not a crash.
 */
const mockDb = { getCurrentMesocycleWeek: jest.fn(), getPlannedMuscleVolume: jest.fn() };
jest.mock('../../database', () => ({
  getCurrentMesocycleWeek: (...a) => mockDb.getCurrentMesocycleWeek(...a),
  getPlannedMuscleVolume: (...a) => mockDb.getPlannedMuscleVolume(...a),
}));
jest.mock('../../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
const mockResolve = { loadCapabilityResolveState: jest.fn() };
jest.mock('../resolve', () => ({
  // The real predicate: the module under test must speak through it.
  capabilityKnown: jest.requireActual('../resolve').capabilityKnown,
  loadCapabilityResolveState: (...a) => mockResolve.loadCapabilityResolveState(...a),
}));

const {
  deriveInjuryLines, readInjuryLines, readRampLine, NO_INJURY_LINES, COULD_NOT_CHECK_LINE,
} = require('../injuryLines');
const { constraintLineText } = require('../../homeCoachBrief');

const row = (over = {}) => ({ role: 'episode', effectiveChoice: 'applied', adaptationMode: 'apply', ...over });
const subjectPhrase = (rows) => (rows.length ? 'your shoulder' : null);

beforeEach(() => {
  mockDb.getCurrentMesocycleWeek.mockReset();
  mockDb.getPlannedMuscleVolume.mockReset();
  mockResolve.loadCapabilityResolveState.mockReset();
});

describe('deriveInjuryLines', () => {
  test('an applied, un-held episode rule is a works-around fact, named by the subject phrase', () => {
    expect(deriveInjuryLines({ restrictions: [row()] }, { subjectPhrase })).toEqual({
      activeConstraint: true, constraintSubject: 'your shoulder', checkFailed: false,
    });
  });

  test('a HELD rule, an undecided rule, a not-yet-applied rule and a baseline rule are not', () => {
    for (const r of [
      row({ adaptationMode: 'hold' }),
      row({ effectiveChoice: null }),
      row({ effectiveChoice: 'declared' }),
      row({ role: 'baseline' }),
    ]) {
      expect(deriveInjuryLines({ restrictions: [r] }, { subjectPhrase }).activeConstraint).toBe(false);
    }
  });

  test('a subject phrase that throws leaves the generic line, never a crash', () => {
    const out = deriveInjuryLines({ restrictions: [row()] }, { subjectPhrase: () => { throw new Error('boom'); } });
    expect(out.activeConstraint).toBe(true);
    expect(out.constraintSubject).toBeNull();
    expect(constraintLineText(out.constraintSubject)).toBe('Training works around your temporary change.');
    expect(constraintLineText('your shoulder')).toBe('Training leaves your shoulder out at the moment.');
  });

  test('could-not-check is unavailable and NOT stale; stale-but-known and a healthy state are not', () => {
    expect(deriveInjuryLines({ restrictions: [], unavailable: true, stale: false }).checkFailed).toBe(true);
    expect(deriveInjuryLines({ restrictions: [], unavailable: true, stale: true }).checkFailed).toBe(false);
    expect(deriveInjuryLines({ restrictions: [], unavailable: false, stale: false }).checkFailed).toBe(false);
    expect(deriveInjuryLines(null).checkFailed).toBe(false);
    // Never from empty restrictions alone.
    expect(deriveInjuryLines({ restrictions: [] }).checkFailed).toBe(false);
  });

  test('a missing restrictions list is no works-around fact', () => {
    expect(deriveInjuryLines({}).activeConstraint).toBe(false);
  });
});

describe('readInjuryLines', () => {
  test('reads the resolver for the user and derives the facts', async () => {
    mockResolve.loadCapabilityResolveState.mockResolvedValue({ restrictions: [row()], unavailable: false, stale: false });
    const out = await readInjuryLines('u1');
    expect(mockResolve.loadCapabilityResolveState).toHaveBeenCalledWith('u1', {});
    expect(out.activeConstraint).toBe(true);
    expect(out.checkFailed).toBe(false);
  });

  test('a read that throws is a failed check, not an empty one', async () => {
    mockResolve.loadCapabilityResolveState.mockRejectedValue(new Error('read failed'));
    expect(await readInjuryLines('u1')).toEqual({ activeConstraint: false, constraintSubject: null, checkFailed: true });
  });
});

describe('readRampLine', () => {
  test('names the muscles whose planned rows carry the ramp stamp, in plain words', async () => {
    mockDb.getCurrentMesocycleWeek.mockResolvedValue({ id: 'wk1' });
    mockDb.getPlannedMuscleVolume.mockResolvedValue([
      { muscle: 'quads', source: 'reintroduction' },
      { muscle: 'chest', source: 'profile' },
    ]);
    const line = await readRampLine('u1');
    expect(mockDb.getPlannedMuscleVolume).toHaveBeenCalledWith('wk1');
    expect(line).toMatch(/^Training for your .+ builds back up to your plan from here\.$/);
  });

  test('no stamp, no current block week, or a failed read: no line', async () => {
    mockDb.getCurrentMesocycleWeek.mockResolvedValue({ id: 'wk1' });
    mockDb.getPlannedMuscleVolume.mockResolvedValue([{ muscle: 'quads', source: 'profile' }]);
    expect(await readRampLine('u1')).toBeNull();
    mockDb.getCurrentMesocycleWeek.mockResolvedValue(null);
    expect(await readRampLine('u1')).toBeNull();
    expect(mockDb.getPlannedMuscleVolume).toHaveBeenCalledTimes(1);
    mockDb.getCurrentMesocycleWeek.mockRejectedValue(new Error('db down'));
    expect(await readRampLine('u1')).toBeNull();
  });
});

describe('the copy', () => {
  test('the could-not-check sentence is the lane\'s honesty line, British English, no em dash', () => {
    expect(COULD_NOT_CHECK_LINE).toBe('Volyume could not check Injuries & limitations just now.');
    expect(COULD_NOT_CHECK_LINE).not.toMatch(/—/);
  });
  test('the empty shape says nothing', () => {
    expect(NO_INJURY_LINES).toEqual({ activeConstraint: false, constraintSubject: null, rampLine: null, checkFailed: false });
  });
});
