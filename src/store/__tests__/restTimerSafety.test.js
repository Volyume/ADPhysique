/**
 * Rest timer fault injection (adversarial audit 2026-08-26, finding 2).
 *
 * THE DEFECT. startRestTimer took `duration` on trust and computed
 * `Date.now() + duration * 1000`. Nothing between the caller and the wall-clock
 * anchor checked it, and the anchor is the single value the JS countdown, the
 * scheduled OS notification, the iOS Live Activity and the Android foreground
 * chronometer all derive from. So one bad number poisoned four surfaces at once.
 *
 * WHY A BAD ANCHOR IS STICKY RATHER THAN NOISY. The countdown ends when
 * `remaining <= 0`. That comparison is FALSE for NaN and FALSE for Infinity, so
 * neither value ever expires: the rest timer stays active for the remainder of
 * the session, blocking the set-completion flow behind a countdown that does not
 * count. And because the anchor is persisted with the active-workout snapshot,
 * killing the app and reopening it restores the same stuck timer. This is the
 * same shape as VOLYUME-1K: an ordering check used as a validity check, failing
 * open on the one value that satisfies no ordering at all.
 *
 * These tests exercise the REAL store actions against a real Zustand instance.
 * The four Kotlin/Swift boundaries are guarded separately at source level,
 * because a native saturating conversion cannot be exercised from Jest.
 */

const fs = require('fs');
const path = require('path');

jest.mock('../../lib/notifications/restEnd', () => ({
  scheduleRestEndNotification: jest.fn(),
  cancelRestEndNotification: jest.fn(),
}), { virtual: true });

const useAppStore = require('../useAppStore').default;

const REST_MAX_SECONDS = 3600;

function resetRest() {
  useAppStore.setState({
    restTimerActive: false,
    restTimerDuration: 90,
    restTimerRemaining: 90,
    restTimerEndsAt: null,
  });
}

/** Runs the tick loop to completion, or gives up. A stuck timer never finishes. */
function runToExpiry(maxTicks = 20) {
  for (let i = 0; i < maxTicks; i += 1) {
    useAppStore.getState().tickRestTimer();
    if (!useAppStore.getState().restTimerActive) return i + 1;
  }
  return null; // never expired
}

describe('startRestTimer refuses an unusable duration', () => {
  beforeEach(resetRest);

  const POISON = [
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
    ['negative', -60],
    ['zero', 0],
    ['a huge finite double', 1e300],
    ['past 32-bit int', 2 ** 40],
    ['a string', '90'],
    ['null', null],
    ['undefined', undefined],
    ['an object', {}],
  ];

  test.each(POISON)('%s produces a finite, in-range anchor', (_label, value) => {
    useAppStore.getState().startRestTimer(value);
    const s = useAppStore.getState();
    expect(Number.isFinite(s.restTimerEndsAt)).toBe(true);
    expect(s.restTimerEndsAt).toBeGreaterThan(Date.now());
    expect(s.restTimerEndsAt).toBeLessThanOrEqual(Date.now() + REST_MAX_SECONDS * 1000);
    expect(Number.isFinite(s.restTimerDuration)).toBe(true);
    expect(s.restTimerDuration).toBeGreaterThan(0);
  });

  test.each(POISON)('%s still expires, rather than running forever', (_label, value) => {
    useAppStore.getState().startRestTimer(value);
    // Jump the anchor to the past: a healthy timer expires on the next tick.
    useAppStore.setState({ restTimerEndsAt: Date.now() - 1000 });
    expect(runToExpiry()).not.toBeNull();
  });

  test('an ordinary duration is untouched', () => {
    useAppStore.getState().startRestTimer(120);
    expect(useAppStore.getState().restTimerDuration).toBe(120);
    expect(useAppStore.getState().restTimerRemaining).toBe(120);
  });

  test('the widest legitimate rest is still accepted whole', () => {
    useAppStore.getState().startRestTimer(REST_MAX_SECONDS);
    expect(useAppStore.getState().restTimerDuration).toBe(REST_MAX_SECONDS);
  });

  test('a fractional duration truncates rather than being refused', () => {
    // Not an error case: some callers derive rest from a computed ratio.
    useAppStore.getState().startRestTimer(90.7);
    expect(useAppStore.getState().restTimerDuration).toBe(90);
  });

  test('the refusal is visible in the log, so a real user hitting it is not silent', () => {
    const { logWarn } = require('../../lib/errorLog');
    const spy = jest.spyOn(require('../../lib/errorLog'), 'logWarn');
    expect(typeof logWarn).toBe('function');
    useAppStore.getState().startRestTimer(NaN);
    expect(spy).toHaveBeenCalledWith(
      'startRestTimer.unusableDuration', expect.any(String), expect.any(Object),
    );
    spy.mockRestore();
  });
});

describe('a corrupt persisted anchor cannot be restored', () => {
  // The stuck timer survives a process kill because restoreActiveWorkout reads
  // the anchor back out of the active-workout snapshot. The guard there was
  // `Number(snap.restTimerEndsAt) > Date.now()`, which Infinity satisfies.
  const STORE = fs.readFileSync(path.join(__dirname, '..', 'useAppStore.js'), 'utf8');

  test('the restore path bounds the anchor instead of comparing it', () => {
    const code = STORE.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(code).toMatch(/const restoredRestEndsAt = boundedRestEndsAt\(snap\.restTimerEndsAt\);/);
    expect(code).toMatch(/\.\.\.\(restoredRestEndsAt !== null/);
    // The exact old test, which is the whole defect.
    expect(code).not.toMatch(/Number\(snap\.restTimerEndsAt\) > Date\.now\(\)/);
  });

  test('the restored duration is bounded too, not just truthy-checked', () => {
    const code = STORE.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(code).toMatch(/restTimerDuration: safeIntInRange\(snap\.restTimerDuration, 1, REST_MAX_SECONDS, 90\)/);
    expect(code).not.toMatch(/Number\(snap\.restTimerDuration\) > 0 \?/);
  });

  test('Infinity really does pass the check it replaced', () => {
    // Stated as an executed fact rather than an assertion in prose.
    expect(Infinity > Date.now()).toBe(true);
    expect(Number.isFinite(Infinity)).toBe(false);
  });
});

describe('the tick loop fails to expired, never to running', () => {
  beforeEach(resetRest);

  test.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
    ['a huge finite double', 1e300],
  ])('a %s anchor forced into state still ends the rest', (_label, poison) => {
    useAppStore.getState().startRestTimer(90);
    // Simulate the anchor being corrupted after the fact: a hostile snapshot,
    // a future caller writing state directly, a merge from another surface.
    useAppStore.setState({ restTimerEndsAt: poison });
    expect(runToExpiry()).toBe(1);
    expect(useAppStore.getState().restTimerActive).toBe(false);
    expect(useAppStore.getState().restTimerRemaining).toBe(0);
  });

  test('why NaN was the value that got through is recorded as behaviour', () => {
    // Both directions false. An ordering check can never classify this.
    expect(NaN <= 0).toBe(false);
    expect(NaN > 0).toBe(false);
    expect(Infinity <= 0).toBe(false);
  });

  test('a healthy timer is unaffected: it counts down and then expires', () => {
    useAppStore.getState().startRestTimer(3);
    expect(useAppStore.getState().restTimerActive).toBe(true);
    useAppStore.getState().tickRestTimer();
    expect(useAppStore.getState().restTimerActive).toBe(true);
    expect(useAppStore.getState().restTimerRemaining).toBeGreaterThan(0);
    useAppStore.setState({ restTimerEndsAt: Date.now() - 1 });
    useAppStore.getState().tickRestTimer();
    expect(useAppStore.getState().restTimerActive).toBe(false);
  });
});

describe('adjusting a running rest cannot poison the anchor', () => {
  beforeEach(() => {
    resetRest();
    useAppStore.getState().startRestTimer(120);
  });

  test.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
    ['a huge finite double', 1e300],
    ['a string', '15'],
    ['undefined', undefined],
  ])('a %s adjustment leaves a finite anchor', (_label, value) => {
    useAppStore.getState().addRestTime(value);
    const { restTimerEndsAt } = useAppStore.getState();
    expect(Number.isFinite(restTimerEndsAt)).toBe(true);
    expect(restTimerEndsAt).toBeLessThanOrEqual(Date.now() + REST_MAX_SECONDS * 1000);
  });

  test('a real +15 still adds fifteen seconds', () => {
    const before = useAppStore.getState().restTimerEndsAt;
    useAppStore.getState().addRestTime(15);
    expect(useAppStore.getState().restTimerEndsAt - before).toBe(15000);
  });

  test('a real -15 still removes fifteen seconds', () => {
    const before = useAppStore.getState().restTimerEndsAt;
    useAppStore.getState().addRestTime(-15);
    expect(useAppStore.getState().restTimerEndsAt - before).toBe(-15000);
  });

  test('holding +15 past the ceiling clamps rather than refusing the tap', () => {
    // The user's intent is unambiguous; a tap that silently did nothing would
    // read as a broken button. The rest simply stops growing at the ceiling.
    for (let i = 0; i < 300; i += 1) useAppStore.getState().addRestTime(60);
    const { restTimerEndsAt } = useAppStore.getState();
    expect(Number.isFinite(restTimerEndsAt)).toBe(true);
    expect(restTimerEndsAt).toBeLessThanOrEqual(Date.now() + REST_MAX_SECONDS * 1000);
    expect(useAppStore.getState().restTimerActive).toBe(true);
  });

  test('an adjustment on a stopped timer stays a no-op', () => {
    useAppStore.getState().stopRestTimer();
    useAppStore.getState().addRestTime(15);
    expect(useAppStore.getState().restTimerActive).toBe(false);
    expect(useAppStore.getState().restTimerEndsAt).toBeNull();
  });

  test('an already-poisoned anchor is re-based rather than propagated', () => {
    useAppStore.setState({ restTimerEndsAt: NaN });
    useAppStore.getState().addRestTime(15);
    expect(Number.isFinite(useAppStore.getState().restTimerEndsAt)).toBe(true);
  });
});

describe('the Android module refuses the same values at the native boundary', () => {
  // Kotlin's Double.toLong() saturates instead of throwing, so Infinity and
  // 1e300 both become Long.MAX_VALUE — which is not in the past, and therefore
  // passed the module's `endTimeMs <= now` guard on all three entry points.
  const KT = fs.readFileSync(path.join(
    __dirname, '..', '..', '..', 'modules', 'rest-timer-live', 'android', 'src', 'main',
    'java', 'expo', 'modules', 'resttimerlive', 'RestTimerLiveModule.kt',
  ), 'utf8');

  test('there is one reader, and it checks finiteness before converting', () => {
    expect(KT).toMatch(/private fun readEndTimeMs\(options: Map<String, Any\?>\): Long\? \{/);
    expect(KT).toMatch(/if \(raw\.isNaN\(\) \|\| raw\.isInfinite\(\)\) return null/);
    // toDouble, not toLong: the saturation is what defeats a later check.
    expect(KT).toMatch(/as\? Number\)\?\.toDouble\(\) \?: return null/);
  });

  test('every entry point uses it, and none converts directly any more', () => {
    const uses = KT.match(/readEndTimeMs\(options\)/g) ?? [];
    expect(uses.length).toBe(3); // start, startRestForeground, scheduleRestCues
    const code = KT.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
    expect(code).not.toMatch(/options\["endTimeMs"\] as\? Number\)\?\.toLong\(\)/);
  });

  test('an upper horizon exists, so a saturated value cannot be "not in the past"', () => {
    expect(KT).toMatch(/private val MAX_REST_HORIZON_MS/);
    expect(KT).toMatch(/if \(raw > \(now \+ MAX_REST_HORIZON_MS\)\.toDouble\(\)\) return null/);
  });

  test('a refusal starts nothing: no caller substitutes a default end time', () => {
    expect(KT).not.toMatch(/readEndTimeMs\(options\) \?: /);
    expect(KT).toMatch(/Null means "do not start" for every caller/);
  });
});
