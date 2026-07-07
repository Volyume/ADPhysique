import { buildProfileFreshness, freshnessTone } from '../profileFreshness';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 6, 5);

describe('profileFreshness', () => {
  test('marks missing profile anchors as attention items', () => {
    const out = buildProfileFreshness({}, NOW);
    expect(out.bodyMetrics.state).toBe('missing');
    expect(out.progressScan.state).toBe('missing');
    expect(out.lifts.state).toBe('missing');
    expect(freshnessTone(out.bodyMetrics.state)).toBe('attention');
  });

  test('uses weekly photo cadence and lift cadences without exact body fat promises', () => {
    const out = buildProfileFreshness({
      latestMetricAt: NOW - 8 * DAY,
      latestScanAt: NOW - 29 * DAY,
      latestWorkoutAt: NOW - 4 * DAY,
      keyLiftCount: 4,
    }, NOW);

    expect(out.bodyMetrics.state).toBe('soon');
    expect(out.progressScan.state).toBe('due');
    expect(out.progressScan.sub).toMatch(/light, pose and timing/i);
    expect(out.progressScan.sub).not.toMatch(/body fat percentage|exact/i);
    expect(out.lifts.state).toBe('fresh');
  });

  test('keeps progress photo reminders aligned to weekly sets', () => {
    const sixDays = buildProfileFreshness({ latestScanAt: NOW - 6 * DAY }, NOW);
    const sevenDays = buildProfileFreshness({ latestScanAt: NOW - 7 * DAY }, NOW);

    expect(sixDays.progressScan.state).toBe('soon');
    expect(sixDays.progressScan.sub).toContain('this week');
    expect(sevenDays.progressScan.state).toBe('due');
    expect(sevenDays.progressScan.sub).toMatch(/light, pose and timing/i);
  });

  test('keeps lift standards missing until enough key lifts exist', () => {
    const out = buildProfileFreshness({
      latestWorkoutAt: NOW - DAY,
      keyLiftCount: 2,
    }, NOW);
    expect(out.lifts.state).toBe('missing');
    expect(out.lifts.sub).toMatch(/at least three main lifts/i);
  });
});
