/**
 * beforeAfterParams — pose-aware default pair (S7-6, progress-tab audit
 * second pass, 2026-09-25, register D200 item 7, report §8).
 *
 * `defaultPair` used to sort purely by timestamp, unlike
 * ProgressPhotoCompare.js's own default-pair selection, which preferred the
 * latest photo's own pose when an earlier photo shared it. `preferPoseAwarePair`
 * is now the ONE shared implementation both use. This suite pins:
 *   - pose-blind items (no `pose` field at all) behave exactly as before
 *     (earliest vs latest overall) -- the existing BeforeAfterShareSheet.test.js
 *     `defaultPair` suite already covers this and must keep passing unchanged;
 *   - when the latest item's pose has an earlier match, the pair comes from
 *     that pose subset, not the overall earliest/latest;
 *   - a latest item with a pose nothing earlier shares falls back to overall
 *     earliest/latest;
 *   - `preferPoseAwarePair`'s `getTime` option lets a caller key off a
 *     different timestamp field (ProgressPhotoCompare.js uses `takenAt`).
 */
import { defaultPair, preferPoseAwarePair } from '../beforeAfterParams';

describe('preferPoseAwarePair', () => {
  test('no pose data anywhere: falls back to overall earliest/latest', () => {
    const items = [
      { name: 'old', ts: 100 },
      { name: 'mid', ts: 200 },
      { name: 'new', ts: 300 },
    ];
    expect(preferPoseAwarePair(items).map((p) => p.name)).toEqual(['old', 'new']);
  });

  test('the latest item has an earlier same-pose match: prefers that pose pair', () => {
    const items = [
      { name: 'front-1', ts: 100, pose: 'front' },
      { name: 'side-1', ts: 150, pose: 'side' },
      { name: 'side-2', ts: 200, pose: 'side' },
      { name: 'front-2', ts: 300, pose: 'front' }, // latest overall, pose: front
    ];
    // front-2 is latest; front-1 shares its pose, so the pair is the two
    // front photos, NOT [front-1 (oldest overall), front-2 (newest overall)]
    // by coincidence -- side-1/side-2 must never be chosen here.
    expect(preferPoseAwarePair(items).map((p) => p.name)).toEqual(['front-1', 'front-2']);
  });

  test("the latest item's pose has no earlier match: falls back to overall earliest/latest", () => {
    const items = [
      { name: 'front-1', ts: 100, pose: 'front' },
      { name: 'front-2', ts: 200, pose: 'front' },
      { name: 'side-1', ts: 300, pose: 'side' }, // latest overall, lone side photo
    ];
    expect(preferPoseAwarePair(items).map((p) => p.name)).toEqual(['front-1', 'side-1']);
  });

  test('getTime lets a caller key off a different timestamp field', () => {
    const items = [
      { name: 'a', takenAt: 10, pose: 'front' },
      { name: 'b', takenAt: 20, pose: 'back' },
      { name: 'c', takenAt: 30, pose: 'front' },
    ];
    expect(preferPoseAwarePair(items, { getTime: (p) => p.takenAt }).map((p) => p.name)).toEqual(['a', 'c']);
  });
});

describe('defaultPair (pose-aware, backward compatible)', () => {
  test('items with no pose field behave exactly as before: earliest vs latest overall', () => {
    const photos = [
      { name: 'mid.jpg', ts: 200 },
      { name: 'new.jpg', ts: 300 },
      { name: 'old.jpg', ts: 100 },
    ];
    expect(defaultPair(photos)).toEqual(['old.jpg', 'new.jpg']);
  });

  test('prefers the two most recent same-pose photos when the latest photo has a pose match', () => {
    const photos = [
      { name: 'front-1.jpg', ts: 100, pose: 'front' },
      { name: 'back-1.jpg', ts: 150, pose: 'back' },
      { name: 'back-2.jpg', ts: 250, pose: 'back' },
      { name: 'front-2.jpg', ts: 300, pose: 'front' },
    ];
    expect(defaultPair(photos)).toEqual(['front-1.jpg', 'front-2.jpg']);
  });

  test('single photo and empty/invalid input are unchanged', () => {
    expect(defaultPair([{ name: 'only.jpg', ts: 1, pose: 'front' }])).toEqual(['only.jpg']);
    expect(defaultPair([])).toEqual([]);
    expect(defaultPair(null)).toEqual([]);
  });
});
