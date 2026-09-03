/**
 * CC27 - the CAP-17 pre-flight gate (section 9.6 as revised by RT1-2).
 *
 * Pins the three postures:
 *  - loadable state -> proceed silently;
 *  - unavailable WITH last-known -> proceed on it (surfaces behave
 *    normally; unavailable+stale ride the state);
 *  - unavailable with NO known state -> proceed=false: the surface must
 *    offer the explicit hold/continue choice - never a silent fail-open.
 * Plus: the choice dialog wires both actions, and the gate lives OUTSIDE
 * the engine (source pins: every generation screen gates BEFORE
 * generateAndSavePlan).
 */
const fs = require('fs');
const path = require('path');

const mockAlerts = [];
jest.mock('../../../components/AppAlert', () => ({
  appAlert: (...args) => mockAlerts.push(args),
}));

describe('capabilityPreflight postures', () => {
  afterEach(() => { jest.resetModules(); mockAlerts.length = 0; });

  function withDb(impl) {
    jest.doMock('../../database', () => ({ getCapabilityConstraints: impl }));
    // eslint-disable-next-line global-require
    const preflight = require('../preflight');
    // eslint-disable-next-line global-require
    const { _resetCapabilityResolveCache } = require('../resolve');
    _resetCapabilityResolveCache();
    return preflight;
  }

  test('loadable state proceeds silently', async () => {
    const { capabilityPreflight } = withDb(async () => []);
    const out = await capabilityPreflight('u1');
    expect(out.proceed).toBe(true);
    expect(out.state.unavailable).toBe(false);
    expect(mockAlerts).toHaveLength(0);
  });

  test('no state known and the read fails: proceed=false (the choice is the user\'s)', async () => {
    const { capabilityPreflight } = withDb(async () => { throw new Error('down'); });
    const out = await capabilityPreflight('u1');
    expect(out.proceed).toBe(false);
    expect(out.state.unavailable).toBe(true);
    expect(out.state.stale).toBe(false);
  });

  test('last-known state this session: proceed on it, flagged stale', async () => {
    let fail = false;
    const { capabilityPreflight } = withDb(async () => {
      if (fail) throw new Error('down');
      return [];
    });
    await capabilityPreflight('u2');
    fail = true;
    const out = await capabilityPreflight('u2');
    expect(out.proceed).toBe(true);
    expect(out.state.unavailable).toBe(true);
    expect(out.state.stale).toBe(true);
  });

  test('the choice dialog offers hold first and continue second, wiring both', () => {
    const { offerCapabilityPreflightChoice } = withDb(async () => []);
    const calls = [];
    offerCapabilityPreflightChoice({ onHold: () => calls.push('hold'), onContinue: () => calls.push('continue') });
    expect(mockAlerts).toHaveLength(1);
    const [, , buttons] = mockAlerts[0];
    expect(buttons[0].text).toBe('Hold suggestions');
    expect(buttons[0].style).toBe('cancel');
    buttons[0].onPress();
    buttons[1].onPress();
    expect(calls).toEqual(['hold', 'continue']);
  });
});

describe('the gate lives OUTSIDE the engine, at every generation surface (source pins)', () => {
  const read = (p) => fs.readFileSync(path.resolve(__dirname, '../../..', p), 'utf8');
  test.each([
    'screens/ProGoalSetupScreen.js',
    'screens/PlanUpdateScreen.js',
    'screens/ProOnboardingScreen.js',
    // Red-team finding 1 (bundle): the block-boundary refinement and the
    // two no-plan "Start with a plan" surfaces were silent fail-opens.
    'screens/PlansScreen.js',
    'screens/HomeScreen.js',
  ])('%s runs capabilityPreflight before generateAndSavePlan', (f) => {
    const src = read(f);
    // D139: the surfaces that preview before they commit run the SAME gate in
    // the SAME position through lib/startWithPlan.js's prepare step
    // (pre-flight, then the READ-ONLY dry run, then the sheet, then the
    // generation). Follow the delegation rather than losing the pin: the rule
    // is that no generation surface reaches the engine without the gate.
    if (/prepareStartWithPlan\(/.test(src)) {
      expect(src).toMatch(/commitStartWithPlan\(/);
      const helper = read('lib/startWithPlan.js');
      const gate = helper.indexOf('capabilityPreflight(');
      const dryRun = helper.indexOf('generatePlanDryRun(');
      const commit = helper.indexOf('generateAndSavePlan(');
      expect(gate).toBeGreaterThan(-1);
      expect(gate).toBeLessThan(dryRun);
      expect(gate).toBeLessThan(commit);
      expect(helper).toMatch(/offerCapabilityPreflightChoice/);
      return;
    }
    const gate = src.indexOf('capabilityPreflight(');
    const call = src.indexOf('generateAndSavePlan(user.id');
    expect(gate).toBeGreaterThan(-1);
    expect(call).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(call);
    expect(src).toMatch(/offerCapabilityPreflightChoice/);
  });

  test('the engine call sites never import the gate (the engine stays capability-blind)', () => {
    expect(read('lib/planEngine.js')).not.toMatch(/preflight/i);
    expect(read('lib/planAutoGen.js')).not.toMatch(/capabilityPreflight/);
  });
});
