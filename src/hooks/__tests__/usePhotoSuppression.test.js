/**
 * usePhotoSuppression — the shared ED-safety gate for the NEW high-risk
 * progress-photo surfaces (comparison, bodyweight display, before/after share
 * card). These pin two things that must never regress:
 *
 *  1. the OR logic — suppressed when calm mode is on OR an open ED-pattern flag
 *     exists (derivePhotoSuppression, the pure core);
 *  2. FAIL CLOSED — a genuine read failure of EITHER input suppresses, and the
 *     hook feeds both inputs as suppressing sentinels (source-regex guard,
 *     matching useWeeklyStreak.guard.test.js).
 *
 * The heavy module deps are mocked only so the file imports cleanly in node;
 * derivePhotoSuppression itself is pure (isCalm + sentinel matching).
 */
jest.mock('../../lib/database', () => ({ getOpenEdPatternFlag: jest.fn(async () => null) }));
jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: (sel) => sel({ user: { id: 'u1' } }) }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}) },
}));

const fs = require('fs');
const path = require('path');
const { derivePhotoSuppression } = require('../usePhotoSuppression');

describe('derivePhotoSuppression OR logic', () => {
  test('calm mode suppresses', () => {
    expect(derivePhotoSuppression({ mode: 'calm', edFlag: null })).toBe(true);
  });

  test('an open ED-pattern flag suppresses (even in a normal wellbeing mode)', () => {
    expect(derivePhotoSuppression({ mode: 'unspecified', edFlag: { id: 'flag-1' } })).toBe(true);
  });

  test('a normal, unflagged state does NOT suppress', () => {
    expect(derivePhotoSuppression({ mode: 'unspecified', edFlag: null })).toBe(false);
  });
});

describe('derivePhotoSuppression fails closed', () => {
  test('a wellbeing read failure (read_failed sentinel) suppresses', () => {
    expect(derivePhotoSuppression({ mode: 'read_failed', edFlag: null })).toBe(true);
  });

  test('an ED-flag read failure (truthy read_failed sentinel) suppresses', () => {
    expect(derivePhotoSuppression({ mode: 'unspecified', edFlag: 'read_failed' })).toBe(true);
  });
});

describe('usePhotoSuppression wiring fails closed (source-regex guard)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'usePhotoSuppression.js'), 'utf8');

  test('reads the RAW wellbeing key, never the failure-swallowing getWellbeingMode()', () => {
    expect(src).not.toMatch(/getWellbeingMode\(/);
    expect(src).toMatch(/WELLBEING_KEY[\s\S]*?\.catch\(\(\)\s*=>\s*'read_failed'\)/);
  });

  test('an open-ED-flag read error maps to a suppressing sentinel, not null', () => {
    expect(src).not.toMatch(/getOpenEdPatternFlag\([^)]*\)\.catch\(\(\)\s*=>\s*null\)/);
    expect(src).toMatch(/getOpenEdPatternFlag\([^)]*\)\.catch\(\(\)\s*=>\s*'read_failed'\)/);
  });

  test('the hook defaults to suppressed before the async read resolves', () => {
    expect(src).toMatch(/useState\(true\)/);
  });
});
