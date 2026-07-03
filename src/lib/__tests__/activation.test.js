/**
 * activation.js — the pure early-activation model (S6).
 *
 * Pins the churn-window definition the telemetry event and the re-engagement
 * lever both key off, so they can never drift: 3 completed sessions inside the
 * 14-day window = activated; the window boundaries are half-open [install,
 * install+14d); unknowable inputs return null (fail safe, never nudge on a
 * guess); the output carries counts/flags only (no body values).
 */
import {
  computeActivationState,
  ACTIVATION_TARGET_SESSIONS,
  ACTIVATION_WINDOW_DAYS,
} from '../activation';

const DAY = 86400000;
const INSTALL = 1_700_000_000_000; // fixed epoch, no clock in the module
const within = (d) => INSTALL + d * DAY; // a timestamp d days after install

describe('computeActivationState (S6)', () => {
  test('constants match the research premise', () => {
    expect(ACTIVATION_TARGET_SESSIONS).toBe(3);
    expect(ACTIVATION_WINDOW_DAYS).toBe(14);
  });

  test('unknowable inputs return null (fail safe)', () => {
    expect(computeActivationState(null, [], within(1))).toBeNull();
    expect(computeActivationState(INSTALL, [], null)).toBeNull();
    expect(computeActivationState(undefined, [], within(1))).toBeNull();
    // now before install is incoherent -> null, not a negative window
    expect(computeActivationState(INSTALL, [], INSTALL - DAY)).toBeNull();
  });

  test('no sessions: not activated, full gap to target', () => {
    const s = computeActivationState(INSTALL, [], within(3));
    expect(s.sessionsInWindow).toBe(0);
    expect(s.activated).toBe(false);
    expect(s.sessionsToTarget).toBe(3);
    expect(s.daysSinceInstall).toBe(3);
    expect(s.windowClosed).toBe(false);
  });

  test('three sessions inside the window: activated, no gap', () => {
    const s = computeActivationState(INSTALL, [within(1), within(4), within(9)], within(10));
    expect(s.sessionsInWindow).toBe(3);
    expect(s.activated).toBe(true);
    expect(s.sessionsToTarget).toBe(0);
  });

  test('activation can be reached mid-window (not only at close)', () => {
    const s = computeActivationState(INSTALL, [within(1), within(2), within(3)], within(3));
    expect(s.activated).toBe(true);
    expect(s.windowClosed).toBe(false);
  });

  test('window is half-open: install counts, exactly +14d does not', () => {
    const atInstall = computeActivationState(INSTALL, [within(0)], within(1));
    expect(atInstall.sessionsInWindow).toBe(1);
    const atClose = computeActivationState(INSTALL, [INSTALL + ACTIVATION_WINDOW_DAYS * DAY], within(15));
    expect(atClose.sessionsInWindow).toBe(0); // >= windowEnd is out
  });

  test('sessions before install or after the window are ignored', () => {
    const s = computeActivationState(
      INSTALL,
      [INSTALL - DAY, within(2), within(20)], // pre-install, in, post-window
      within(21),
    );
    expect(s.sessionsInWindow).toBe(1);
  });

  test('non-finite timestamps in the list are skipped, never counted or thrown on', () => {
    const s = computeActivationState(INSTALL, [within(1), NaN, undefined, within(2), 'x'], within(5));
    expect(s.sessionsInWindow).toBe(2);
  });

  test('the at-risk churn signal: window closed and under target', () => {
    const s = computeActivationState(INSTALL, [within(2), within(6)], within(15));
    expect(s.windowClosed).toBe(true);
    expect(s.activated).toBe(false);
    expect(s.sessionsToTarget).toBe(1);
  });

  test('windowClosed flips exactly at install + 14 days', () => {
    expect(computeActivationState(INSTALL, [], INSTALL + 14 * DAY - 1).windowClosed).toBe(false);
    expect(computeActivationState(INSTALL, [], INSTALL + 14 * DAY).windowClosed).toBe(true);
  });

  test('output carries no body values, only the documented count/flag keys', () => {
    const s = computeActivationState(INSTALL, [within(1)], within(2));
    expect(Object.keys(s).sort()).toEqual(
      ['activated', 'daysSinceInstall', 'sessionsInWindow', 'sessionsToTarget', 'targetSessions', 'windowClosed', 'windowDays'].sort(),
    );
  });
});
