/**
 * Tests for src/lib/food/freshness.js -- the "last verified" wording and
 * opportunistic re-fetch eligibility for promoted network foods
 * (audit §15 item 4).
 *
 * Pure module, no I/O: verifies the staleness decision (which rows are
 * eligible for a re-fetch) and the relative-time display wording,
 * against the REAL functions -- nothing here is mocked.
 */
const { STALE_THRESHOLD_MS, isNetworkSourced, isEligibleForRefetch, formatLastVerified } =
  require('../freshness');

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-07-08T12:00:00Z');

describe('isNetworkSourced', () => {
  test('off and usda are network-sourced', () => {
    expect(isNetworkSourced('off')).toBe(true);
    expect(isNetworkSourced('usda')).toBe(true);
  });

  test('cofid, user_ocr, custom, curated, recipe are not', () => {
    expect(isNetworkSourced('cofid')).toBe(false);
    expect(isNetworkSourced('user_ocr')).toBe(false);
    expect(isNetworkSourced('custom')).toBe(false);
    expect(isNetworkSourced('curated')).toBe(false);
    expect(isNetworkSourced('recipe')).toBe(false);
    expect(isNetworkSourced(undefined)).toBe(false);
  });
});

describe('isEligibleForRefetch (the staleness decision)', () => {
  test('a promoted off row past the threshold is eligible', () => {
    const food = {
      food_ref: 'global:1', source: 'off', source_id: '5001234567890',
      fetched_at: NOW - (STALE_THRESHOLD_MS + DAY_MS),
    };
    expect(isEligibleForRefetch(food, NOW)).toBe(true);
  });

  test('a promoted usda row past the threshold is eligible', () => {
    const food = {
      food_ref: 'global:2', source: 'usda', source_id: '654321',
      fetched_at: NOW - (STALE_THRESHOLD_MS + DAY_MS),
    };
    expect(isEligibleForRefetch(food, NOW)).toBe(true);
  });

  test('a promoted off row just under the threshold is NOT eligible', () => {
    const food = {
      food_ref: 'global:3', source: 'off', source_id: '5001234567890',
      fetched_at: NOW - (STALE_THRESHOLD_MS - DAY_MS),
    };
    expect(isEligibleForRefetch(food, NOW)).toBe(false);
  });

  test('a fresh off row (fetched today) is not eligible', () => {
    const food = {
      food_ref: 'global:4', source: 'off', source_id: '5001234567890',
      fetched_at: NOW - DAY_MS,
    };
    expect(isEligibleForRefetch(food, NOW)).toBe(false);
  });

  test('a custom food is never eligible, however old', () => {
    const food = {
      food_ref: 'custom:1', source: 'custom',
      fetched_at: NOW - (STALE_THRESHOLD_MS * 10),
    };
    expect(isEligibleForRefetch(food, NOW)).toBe(false);
  });

  test('a curated food is never eligible (no fetched_at, no source_id at all)', () => {
    const food = { food_ref: 'curated:chicken-breast', source: 'curated' };
    expect(isEligibleForRefetch(food, NOW)).toBe(false);
  });

  test('a cofid row is never eligible even when stale, since it is not network-sourced', () => {
    const food = {
      food_ref: 'global:5', source: 'cofid', source_id: '9999',
      fetched_at: NOW - (STALE_THRESHOLD_MS * 5),
    };
    expect(isEligibleForRefetch(food, NOW)).toBe(false);
  });

  test('an off row with no source_id or barcode_ean is not eligible (nothing to re-query)', () => {
    const food = { food_ref: 'global:6', source: 'off', fetched_at: NOW - (STALE_THRESHOLD_MS + DAY_MS) };
    expect(isEligibleForRefetch(food, NOW)).toBe(false);
  });

  test('falls back to barcode_ean when source_id is absent', () => {
    const food = {
      food_ref: 'global:7', source: 'off', barcode_ean: '5001234567890',
      fetched_at: NOW - (STALE_THRESHOLD_MS + DAY_MS),
    };
    expect(isEligibleForRefetch(food, NOW)).toBe(true);
  });

  test('a missing/null/zero fetched_at is not eligible', () => {
    expect(isEligibleForRefetch({ source: 'off', source_id: '1' }, NOW)).toBe(false);
    expect(isEligibleForRefetch({ source: 'off', source_id: '1', fetched_at: 0 }, NOW)).toBe(false);
    expect(isEligibleForRefetch(null, NOW)).toBe(false);
  });
});

describe('formatLastVerified (the wording helper)', () => {
  test('today', () => {
    expect(formatLastVerified(NOW, NOW)).toBe('Checked today');
    expect(formatLastVerified(NOW - 60000, NOW)).toBe('Checked today');
  });

  test('yesterday', () => {
    expect(formatLastVerified(NOW - DAY_MS, NOW)).toBe('Checked yesterday');
  });

  test('a few days ago (British plain wording, singular days handled by the yesterday branch)', () => {
    expect(formatLastVerified(NOW - 3 * DAY_MS, NOW)).toBe('Checked 3 days ago');
    expect(formatLastVerified(NOW - 6 * DAY_MS, NOW)).toBe('Checked 6 days ago');
  });

  test('weeks (matches the spec example "Checked 3 weeks ago")', () => {
    expect(formatLastVerified(NOW - 7 * DAY_MS, NOW)).toBe('Checked 1 week ago');
    expect(formatLastVerified(NOW - 21 * DAY_MS, NOW)).toBe('Checked 3 weeks ago');
  });

  test('months', () => {
    expect(formatLastVerified(NOW - 60 * DAY_MS, NOW)).toBe('Checked 2 months ago');
  });

  test('years', () => {
    expect(formatLastVerified(NOW - 400 * DAY_MS, NOW)).toBe('Checked 1 year ago');
    expect(formatLastVerified(NOW - 800 * DAY_MS, NOW)).toBe('Checked 2 years ago');
  });

  test('no em dash and no ominous/wrong-implying wording anywhere in the output', () => {
    const samples = [0, 1, 3, 6, 7, 21, 60, 400, 800].map(
      (d) => formatLastVerified(NOW - d * DAY_MS, NOW)
    );
    for (const s of samples) {
      expect(s).not.toMatch(/—/);
      expect(s).not.toMatch(/wrong|expired|invalid|error/i);
    }
  });

  test('an unusable timestamp returns null so callers can hide the line', () => {
    expect(formatLastVerified(null, NOW)).toBeNull();
    expect(formatLastVerified(0, NOW)).toBeNull();
    expect(formatLastVerified(undefined, NOW)).toBeNull();
    expect(formatLastVerified(NaN, NOW)).toBeNull();
  });
});
