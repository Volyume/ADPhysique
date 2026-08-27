/**
 * Every native entry point validates before it converts (adversarial audit
 * 2026-08-26, findings 11 and 14; the rest timer is finding 2, pinned in
 * restTimerSafety.test.js).
 *
 * THE CLASS. JavaScript carries NaN, Infinity and Invalid Date a long way
 * without complaint. Swift and Kotlin do not, and the two fail differently:
 *
 *   Swift    Int(Double) TRAPS on NaN, on either infinity, and out of range.
 *            That is EXC_BREAKPOINT with no catchable error, which is what
 *            VOLYUME-1K was, on a background queue with no error screen.
 *   Kotlin   Double.toLong() SATURATES instead. NaN becomes 0 and both
 *            infinities become Long.MAX_VALUE, which then passes any
 *            "is it in the past" check and produces an un-dismissable
 *            notification counting down to the year 292278994.
 *
 * Neither is caught by an ordering test, because every comparison against NaN
 * is false, so the value slips through whichever branch happens to be the
 * permissive one. Finiteness has to be checked explicitly and first.
 *
 * These are source guards because a native trap cannot be exercised from Jest.
 * They pin the shape of the check, not its wording, and each one names the
 * defect it stands in for.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..');
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

const LIVE_ACTIVITY = read('modules', 'live-activity', 'ios', 'LiveActivityModule.swift');
const SCAN_IOS = read('modules', 'progress-scan-image', 'ios', 'ProgressScanImageModule.swift');
const SCAN_ANDROID = read(
  'modules', 'progress-scan-image', 'android', 'src', 'main', 'java',
  'expo', 'modules', 'progressscanimage', 'ProgressScanImageModule.kt',
);
const REST_TIMER = read(
  'modules', 'rest-timer-live', 'android', 'src', 'main', 'java',
  'expo', 'modules', 'resttimerlive', 'RestTimerLiveModule.kt',
);

/** Swift/Kotlin bodies with comment lines removed, so a comment cannot satisfy a guard. */
function code(src) {
  return src.split('\n')
    .filter((l) => {
      const t = l.trim();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    })
    .join('\n');
}

describe('Live Activity: both paths guard the end time, not just start', () => {
  const src = code(LIVE_ACTIVITY);

  test('start still guards, as it has since the 2026-07-01 audit', () => {
    expect(src).toMatch(/guard endMs\.isFinite, endMs > 0 else \{ return nil \}/);
  });

  test('update guards too, which it did not', () => {
    // Finding 11. Every +15s and -15s tap comes through update, so the crash
    // the start guard was written to prevent was one adjustment away.
    expect(src).toMatch(/guard endMs\.isFinite, endMs > 0 else \{ return false \}/);
  });

  test('both check finiteness BEFORE comparing to now', () => {
    // The ordering is the whole point: `endDate > Date()` is false for NaN, so
    // a finiteness check placed after it would never run.
    for (const marker of ['return nil }', 'return false }']) {
      const guardAt = src.indexOf(`guard endMs.isFinite, endMs > 0 else { ${marker}`);
      const dateAt = src.indexOf('guard endDate > Date() else', guardAt);
      expect(guardAt).toBeGreaterThan(-1);
      expect(dateAt).toBeGreaterThan(guardAt);
    }
  });

  test('a refused update starts nothing and returns false', () => {
    // Returning true on a refusal would tell JS the countdown was re-anchored
    // when it was not, which is worse than the refusal.
    expect(src).not.toMatch(/guard endMs\.isFinite[^\n]*else \{ return true \}/);
  });
});

describe('progress scan: dimensions are bounded, not merely positive', () => {
  test.each([
    ['iOS extractRgb', SCAN_IOS, /guard width > 0, height > 0, width <= 8192, height <= 8192/],
    ['Android extractRgb', SCAN_ANDROID, /width <= 0 \|\| height <= 0 \|\| width > 8192 \|\| height > 8192/],
  ])('%s', (_name, src, pattern) => {
    // Finding 14. width * height * 4 sizes a pixel buffer, so "> 0" alone
    // leaves an out-of-memory kill, and a large enough product overflows Int
    // and traps. The only caller passes a constant 256; the module's contract
    // should not depend on that staying true.
    expect(code(src)).toMatch(pattern);
  });

  test('segmentPersonMask is bounded on both platforms too', () => {
    // It takes the same two numbers and allocates the same way. Guarding one
    // entry point and not its twin is how this class survives a sweep.
    expect((code(SCAN_IOS).match(/width <= 8192, height <= 8192/g) ?? []).length).toBe(2);
    expect((code(SCAN_ANDROID).match(/width > 8192 \|\| height > 8192/g) ?? []).length).toBe(2);
  });

  test('the bound is generous enough never to refuse a real request', () => {
    // PROGRESS_SCAN_MODEL_INPUT_SIZE is 256. A bound that could reject real
    // work would be a worse bug than the one it replaced.
    const { PROGRESS_SCAN_MODEL_INPUT_SIZE } = require('../progressScanVision');
    expect(PROGRESS_SCAN_MODEL_INPUT_SIZE).toBeLessThanOrEqual(8192);
  });
});

describe('rest timer: one reader, checked before it converts', () => {
  const src = code(REST_TIMER);

  test('finiteness is tested explicitly and first', () => {
    // Finding 2. Kotlin saturates rather than throwing, so a check placed
    // after toLong() sees Long.MAX_VALUE and calls it a valid future time.
    const reader = src.slice(src.indexOf('private fun readEndTimeMs'));
    const finite = reader.indexOf('raw.isNaN() || raw.isInfinite()');
    const compare = reader.indexOf('raw <= now.toDouble()');
    expect(finite).toBeGreaterThan(-1);
    expect(compare).toBeGreaterThan(finite);
  });

  test('it reads as Double, never straight to Long', () => {
    expect(src).toMatch(/as\? Number\)\?\.toDouble\(\) \?: return null/);
    expect(src).not.toMatch(/options\["endTimeMs"\] as\? Number\)\?\.toLong\(\)/);
  });

  test('all three entry points use it', () => {
    expect((src.match(/readEndTimeMs\(options\)/g) ?? []).length).toBe(3);
  });
});

describe('no native entry point converts a JS number without checking it', () => {
  // A sweep rather than a list, so a NEW unguarded conversion fails here even
  // if nobody remembers to add a test for it.
  test('no Swift Int(...) is applied straight to a value read from options', () => {
    for (const src of [LIVE_ACTIVITY, SCAN_IOS]) {
      expect(code(src)).not.toMatch(/Int\(\s*\(?options\[/);
    }
  });

  test('no Kotlin toLong/toInt is applied straight to a value read from options', () => {
    for (const src of [REST_TIMER, SCAN_ANDROID]) {
      expect(code(src)).not.toMatch(/options\[[^\]]+\][^\n]*\)\?\.(toLong|toInt)\(\)/);
    }
  });
});
