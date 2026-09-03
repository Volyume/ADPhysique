/**
 * E10 read-only lapse views are GONE (founder decision 2026-09-03: Volyume
 * is fully free, no Free/Pro split, no trial, no paywall, no expiry). This
 * suite used to pin the free/lapsed read-only branch on the diary,
 * body-metrics and progress-photos screens; it is now the inverse pin --
 * no tier-based read-only path survives on any of the three.
 *
 * Two invariants that were never about tier in the first place are kept
 * as-is: unconfirmed planned meal scaffolding still does not count as
 * logged food history (E10 #4), and the progress-photos ownership marker
 * still fails closed on a read error (E10 #2).
 */
import fs from 'fs';
import path from 'path';

function read(rel) {
  return fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');
}

describe('E10 read-only lapse views: removed, no tier-gated path remains', () => {
  const screens = {
    DiaryScreen: read('src/screens/DiaryScreen.js'),
    BodyMetricsScreen: read('src/screens/BodyMetricsScreen.js'),
    ProgressPhotosScreen: read('src/screens/ProgressPhotosScreen.js'),
  };

  test('none of the three screens derive a readOnly flag from tier', () => {
    for (const src of Object.values(screens)) {
      expect(src).not.toMatch(/const readOnly = tier/);
      expect(src).not.toMatch(/tier !== 'pro'/);
      expect(src).not.toMatch(/tier === 'pro'/);
    }
  });

  test('none of the three screens gate writes behind a live-tier re-check or a canWrite() guard', () => {
    for (const src of Object.values(screens)) {
      expect(src).not.toMatch(/useAppStore\.getState\(\)\.tier === 'pro'/);
      expect(src).not.toMatch(/useAppStore\.getState\(\)\.tier !== 'pro'/);
      expect(src).not.toMatch(/canWrite/);
    }
  });

  test('the free-plan upsell copy is gone from all three screens', () => {
    for (const src of Object.values(screens)) {
      expect(src).not.toMatch(/view-only on the free plan/i);
      expect(src).not.toMatch(/Upgrade to Pro to log/i);
      expect(src).not.toMatch(/Part of Pro/i);
    }
  });

  test('unconfirmed planned scaffolding still is not counted as logged history (E10 #4, unrelated to tier)', () => {
    expect(read('src/lib/food/db.js')).toMatch(/AND is_planned = 0 LIMIT 1/);
  });

  test('the progress-photos ownership marker still fails closed on a read error (E10 #2, unrelated to tier)', () => {
    const lib = read('src/lib/progressPhotos.js');
    expect(lib).toMatch(/if \(!userId\) return false;/);
    expect(lib).toMatch(/catch \(_\) \{ return false; \}/);
  });
});
