/**
 * ED-safety fail-closed guard for the open-ED-pattern-flag reads on the
 * weight / food / notification / share surfaces (SAFETY sweep 2026-07-04).
 *
 * The constitution rule is absolute: those surfaces MUST suppress under an open
 * ED flag and MUST fail CLOSED. An earlier sweep hardened the wellbeing/calm
 * reads and the swept screens (guarded by
 * src/screens/__tests__/wellbeingFailClosed.guard.test.js); several
 * getOpenEdPatternFlag(...) reads were missed and still failed OPEN — a
 * transient local-SQLite read error was mapped to null / false ("no flag"), so
 * a surface the flag is meant to WITHHOLD would be shown or sent to a flagged,
 * vulnerable user.
 *
 * The fix (already used by the correct siblings — HomeScreen :737/:794,
 * partners/moments.js:90, useWeeklyStreak.js:83, coachReport.js:259,
 * CoachOutputScreen's contest countdown :1075) reads the flag with
 * `.catch(() => 'read_failed')` and treats the truthy sentinel as flag-OPEN
 * (`!!flag`), or — for the two notification helpers — returns `true`
 * (suppress) on a read error.
 *
 * This is a source-regex guard (repo convention, e.g.
 * differentialBanner.guard.test.js): it pins the fail-closed shape on each site
 * and pins that the old fail-open shapes cannot creep back in. It only touches
 * the ED-flag reads on these safety surfaces. It direction-STRENGTHENS safety.
 */
import fs from 'fs';
import path from 'path';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');

const FILES = {
  handler: read('../lib/notifications/handler.js'),
  scheduler: read('../lib/notifications/scheduler.js'),
  diary: read('../screens/DiaryScreen.js'),
  weightTrend: read('../hooks/useWeightTrend.js'),
  coachOutput: read('../screens/CoachOutputScreen.js'),
  home: read('../screens/HomeScreen.js'),
  weekSignalWriter: read('../lib/partners/weekSignalWriter.js'),
  widgetWriter: read('../lib/widgets/writer.js'),
};

// Slice one inner function body: from its declaration to the next function
// declaration, so a regex can't match an unrelated function further down.
function fnBody(src, decl) {
  const start = src.indexOf(decl);
  if (start === -1) throw new Error(`not found: ${decl}`);
  const rest = src.slice(start + decl.length);
  const next = rest.search(/\n(export )?(async )?function /);
  return next === -1 ? src.slice(start) : src.slice(start, start + decl.length + next);
}

// The forbidden fail-open shape: an ED-flag read whose failure maps to null.
const FAIL_OPEN_NULL = /getOpenEdPatternFlag\([^)]*\)\.catch\(\(\)\s*=>\s*null\)/;
// The required fail-closed shape: failure maps to the truthy 'read_failed'.
const FAIL_CLOSED_SENTINEL = /getOpenEdPatternFlag\([^)]*\)\.catch\(\(\)\s*=>\s*'read_failed'\)/;

describe('ED-safety: getOpenEdPatternFlag reads on safety surfaces fail CLOSED', () => {
  // No fail-open `.catch(() => null)` ED-flag read survives anywhere in the
  // eight touched files.
  Object.entries(FILES).forEach(([name, src]) => {
    test(`${name}: no getOpenEdPatternFlag read fails open to null`, () => {
      expect(src).not.toMatch(FAIL_OPEN_NULL);
    });
  });

  // 1. notifications/handler.js — the _edFlagOpen delivery-gate helper returns
  //    true (suppress) on a read error, never false (show).
  test('handler _edFlagOpen returns true (suppress) on a read error', () => {
    const body = fnBody(FILES.handler, 'async function _edFlagOpen()');
    expect(body).toMatch(/getOpenEdPatternFlag\(uid\)/);
    expect(body).toMatch(/catch \(_\) \{[\s\S]*?return true;/);
    expect(body).not.toMatch(/catch \(_\) \{\s*return false;\s*\}/);
  });

  // 2. notifications/scheduler.js — the weighInEdFlagOpen schedule-gate helper
  //    returns true (suppress) on a read error; and every ED-gated push read
  //    uses the read_failed sentinel.
  test('scheduler weighInEdFlagOpen returns true (suppress) on a read error', () => {
    const body = fnBody(FILES.scheduler, 'async function weighInEdFlagOpen()');
    expect(body).toMatch(/getOpenEdPatternFlag\(uid\)/);
    expect(body).toMatch(/catch \(_\) \{[\s\S]*?return true;/);
    expect(body).not.toMatch(/catch \(_\) \{\s*return false;\s*\}/);
  });

  test('scheduler: all six ED-gated push reads use the read_failed sentinel', () => {
    // trial-day-3, win-back, missed-checkin, activation-nudge, planned-meal,
    // partner-beats — each gates a weight/food/notification push.
    const matches = FILES.scheduler.match(
      /getOpenEdPatternFlag\([^)]*\)\.catch\(\(\)\s*=>\s*'read_failed'\)/g,
    ) || [];
    expect(matches.length).toBe(6);
  });

  // 3. DiaryScreen — the banking carve-out feed.
  test('DiaryScreen ED-flag read fails closed', () => {
    expect(FILES.diary).toMatch(FAIL_CLOSED_SENTINEL);
    // The banking carve-out is gated on edFlagOpen derived from !!edFlag.
    expect(FILES.diary).toMatch(/setEdFlagOpen\(!!edFlag\)/);
  });

  // 4. useWeightTrend — the rate/maintenance/step-trend suppression feed.
  test('useWeightTrend ED-flag read fails closed', () => {
    expect(FILES.weightTrend).toMatch(FAIL_CLOSED_SENTINEL);
    expect(FILES.weightTrend).toMatch(/edFlagOpen:\s*!!edFlag/);
  });

  // 5. CoachOutputScreen — the weekly-share suppress feed (plus the pre-existing
  //    contest-countdown read: both fail closed, so expect two sentinel reads).
  test('CoachOutputScreen ED-flag reads fail closed (share + countdown)', () => {
    const matches = FILES.coachOutput.match(
      /getOpenEdPatternFlag\(user\.id\)\.catch\(\(\)\s*=>\s*'read_failed'\)/g,
    ) || [];
    expect(matches.length).toBe(2);
    expect(FILES.coachOutput).toMatch(/const edPatternOpen = !!openFlag;/);
  });

  // 6. HomeScreen — the trial banner + coach ledger feed (plus the four
  //    pre-existing sibling reads that already fail closed).
  test('HomeScreen ED-flag reads fail closed', () => {
    const matches = FILES.home.match(
      /getOpenEdPatternFlag\(user\.id\)\.catch\(\(\)\s*=>\s*'read_failed'\)/g,
    ) || [];
    // loadTrialBanner (:408) + the four already-swept sibling loaders.
    expect(matches.length).toBeGreaterThanOrEqual(5);
  });

  // 7. partners/weekSignalWriter — the outbound partner-signal freeze feed.
  test('weekSignalWriter ED-flag read fails closed', () => {
    expect(FILES.weekSignalWriter).toMatch(FAIL_CLOSED_SENTINEL);
    expect(FILES.weekSignalWriter).toMatch(/edSuppressed = !!edFlag/);
  });

  // 8. widgets/writer — the persisted widget snapshot's suppressed bit.
  test('widgets/writer ED-flag read fails closed', () => {
    expect(FILES.widgetWriter).toMatch(FAIL_CLOSED_SENTINEL);
    expect(FILES.widgetWriter).toMatch(/edFlagOpen:\s*!!edFlag/);
  });
});
