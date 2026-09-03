/**
 * plan_replaced telemetry (D139, lead programme ruling) -- pins
 * activatePlanWithBlock's new emitter.
 *
 * Source-guard rather than a full render/DB integration test: this exact
 * function (activatePlanWithBlock) is already covered ONLY by source-level
 * regex pins elsewhere in the suite (blockLifecycle.stage1.test.js), because
 * it fans out into generateMesocycleWeeks/generateInitialPlannedVolume/
 * capability resolution/notifications scheduling, none of which the shared
 * __mocks__/expo-sqlite.js in-memory double actually executes ("we don't
 * simulate SQL"). Pinning the exact source shape is the same, established,
 * proportionate approach used for the rest of this function.
 *
 * What must hold:
 *   1. a prior-active-block read happens BEFORE setActivePlan deactivates
 *      it (otherwise "was there already an active block" can never be
 *      answered truthfully -- the deactivate-all UPDATE runs first).
 *   2. plan_replaced fires ONLY inside that prior-active-block branch, never
 *      unconditionally alongside plan_activated.
 *   3. plan_activated (fired inside setActivePlan, untouched by this build)
 *      still fires on every real activation.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'database.js'), 'utf8');

function sliceFrom(marker, len) {
  const idx = SRC.indexOf(marker);
  expect(idx).toBeGreaterThan(-1);
  return SRC.slice(idx, idx + len);
}

describe('activatePlanWithBlock emits plan_replaced only on a genuine replacement', () => {
  const fn = sliceFrom('export async function activatePlanWithBlock', 2000);

  test('reads for a prior active block BEFORE setActivePlan deactivates it', () => {
    const priorCheckIdx = fn.indexOf(
      'SELECT id FROM mesocycles WHERE user_id = ? AND is_active = 1',
    );
    const setActiveIdx = fn.indexOf('await setActivePlan(userId, planId);');
    expect(priorCheckIdx).toBeGreaterThan(-1);
    expect(setActiveIdx).toBeGreaterThan(-1);
    expect(priorCheckIdx).toBeLessThan(setActiveIdx);
  });

  test("plan_replaced fires inside an 'if (_priorActiveBlock)' guard, never bare", () => {
    expect(fn).toMatch(
      /if \(_priorActiveBlock\) \{[\s\S]*?_trackEvent\(userId, 'plan_replaced', null\);[\s\S]*?\}/,
    );
    // Negative control: exactly one call site, and it is the guarded one --
    // a second, unconditional call site would defeat the whole point.
    const calls = (fn.match(/_trackEvent\(userId, 'plan_replaced', null\);/g) || []).length;
    expect(calls).toBe(1);
  });

  test('the prior-block check runs before ANY write this function makes (read-only ahead of the transaction)', () => {
    const priorCheckIdx = fn.indexOf('_priorActiveBlock = await');
    const firstTransactionIdx = fn.indexOf('runInTransaction(');
    expect(priorCheckIdx).toBeGreaterThan(-1);
    // setActivePlan (called before the local runInTransaction below) does
    // its own deactivate/activate writes internally; this only asserts our
    // new read precedes the mesocycle-insert transaction THIS function owns.
    if (firstTransactionIdx > -1) {
      expect(priorCheckIdx).toBeLessThan(firstTransactionIdx);
    }
  });
});

describe('plan_activated is untouched: still fires on every real activation', () => {
  test('setActivePlan (unchanged) still tracks plan_activated unconditionally on a real planId', () => {
    const setActivePlanSrc = sliceFrom('export async function setActivePlan', 2200);
    expect(setActivePlanSrc).toMatch(/if \(planId\) \{/);
    expect(setActivePlanSrc).toMatch(/_trackEvent\(userId, 'plan_activated', null\);/);
  });
});

describe('telemetry catalogue: plan_replaced is registered correctly', () => {
  const { TELEMETRY_EVENTS, isDeferred } = require('../telemetry/events');

  test('plan_replaced is catalogued, non-deferred, panel 1', () => {
    const entry = TELEMETRY_EVENTS.find(e => e.name === 'plan_replaced');
    expect(entry).toBeTruthy();
    expect(entry.deferred).toBe(false);
    expect(entry.panel).toBe(1);
    expect(isDeferred('plan_replaced')).toBe(false);
  });

  test('the server allow-list migration (156) lists plan_replaced', () => {
    const sql = fs.readFileSync(
      path.resolve(__dirname, '..', '..', '..', 'supabase', 'migrate_156_activation_funnel_telemetry.sql'),
      'utf8',
    );
    expect(sql).toContain("'plan_replaced'");
  });
});
