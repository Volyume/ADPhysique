/**
 * WeeklyCheckInScreen.activationTelemetry.guard.test.js
 *
 * Activation-funnel elevation (lead activation ruling, 2026-09-03).
 * Source-level guard, matching the repo convention for this screen (see
 * WeeklyCheckInScreen.alreadyDoneGate.guard.test.js): the screen pulls in
 * the whole app stack at import time, so a shallow-render suite is not the
 * cheap option here.
 *
 * Pins:
 *   - checkin_started fires only in the 'open' gate branch, with a `first`
 *     flag derived from priorOutput (no new query, no numeric payload).
 *   - first_checkin_completed fires via trackFirst, anchored after the
 *     audit('checkin.weekly.submit') call and after the actual save.
 */

import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(
  path.resolve(__dirname, '..', 'WeeklyCheckInScreen.js'),
  'utf8',
);

describe('checkin_started (open gate only)', () => {
  test('fires inside the open-gate branch, not any other gate branch', () => {
    const openIdx = SRC.indexOf("setGateState('open');");
    expect(openIdx).toBeGreaterThan(-1);
    const nextCatch = SRC.indexOf('} catch (e) {', openIdx);
    const block = SRC.slice(openIdx, nextCatch);
    expect(block).toContain("track(user.id, 'checkin_started', { first: !priorOutput })");
  });

  test('the payload carries only the first flag, never a numeric value', () => {
    const match = SRC.match(/track\(user\.id, 'checkin_started', (\{[^}]*\})\)/);
    expect(match).not.toBeNull();
    expect(match[1]).toBe('{ first: !priorOutput }');
  });

  test('is guarded on a real user id', () => {
    const openIdx = SRC.indexOf("setGateState('open');");
    const block = SRC.slice(openIdx, openIdx + 500);
    expect(block).toMatch(/if \(user\?\.id\) \{/);
  });
});

describe('first_checkin_completed', () => {
  test('anchors on the existing submit audit call', () => {
    const auditIdx = SRC.indexOf("audit('checkin.weekly.submit')");
    expect(auditIdx).toBeGreaterThan(-1);
    const trackIdx = SRC.indexOf("trackFirst(userId, 'first_checkin_completed')");
    expect(trackIdx).toBeGreaterThan(auditIdx);
  });

  test('fires after the actual save, not merely on tap', () => {
    const saveIdx = SRC.indexOf('await saveWeeklyCheckin(userId,');
    const trackIdx = SRC.indexOf("trackFirst(userId, 'first_checkin_completed')");
    expect(saveIdx).toBeGreaterThan(-1);
    expect(trackIdx).toBeGreaterThan(saveIdx);
  });

  test('carries no payload (trackFirst default)', () => {
    expect(SRC).toContain("trackFirst(userId, 'first_checkin_completed').catch(() => {})");
  });
});
