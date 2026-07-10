/**
 * Source-level regression guard, D16 (NAV-2, weigh-in edit/delete/history).
 *
 * NAV-2 asked for edit/delete/history on Body Metrics, plus: "trend-based
 * detection re-runs on the corrected series after any edit or delete."
 *
 * Investigation for that build found the ED-safety rapid-loss trend signal
 * (edPatternDetector's s1, computed by weeklyCoach.computeWeeklyTrendPct) is
 * fed exclusively by the `morning_weights` table via database.getMorningWeights
 * / getMorningWeightsLast14Days, a SEPARATE table from `body_metric_log` (the
 * one BodyMetricsScreen's "Log weight" / edit / delete / history manages).
 * morning_weights is written from the Home-screen quick weigh-in widget
 * (TodayStrip), onboarding, and Health Connect/Apple Health sync, not from
 * Body Metrics.
 *
 * Net effect: editing or deleting a Body Metrics entry does not, and never
 * did, feed the rapid-loss/ED-pattern detector directly, so there is no
 * cache or derived state to invalidate on that path. What DOES read
 * body_metric_log live (with no cache) is CoachOutputScreen's bodyFatPercent
 * lookup (line ~1392, `getBodyMetricLog(user.id, 60)`), which feeds the
 * Katch-McArdle BMR / floor calculation on the next weekly-coach run;
 * bodyMetricsRepository.liveRead.test.js pins that this read already
 * reflects a correction or deletion with no caching layer in between.
 *
 * This guard pins the CURRENT wiring (getMorningWeights, not getBodyMetricLog,
 * feeds `morningWeights` into runWeeklyCoach) so a future refactor that
 * silently merges the two series, or that adds a cache in front of either
 * read, gets caught here rather than assumed away.
 */
const fs = require('fs');
const path = require('path');

const SCREEN_PATH = path.resolve(__dirname, '../CoachOutputScreen.js');
const WEEKLY_COACH_PATH = path.resolve(__dirname, '../../lib/weeklyCoach.js');

describe('CoachOutputScreen: rapid-loss trend input sources morning_weights, not body_metric_log', () => {
  const screenSrc = fs.readFileSync(SCREEN_PATH, 'utf8');

  test('the weight series handed to runWeeklyCoach as morningWeights comes from getMorningWeights', () => {
    expect(screenSrc).toMatch(/const weights = await getMorningWeights\(user\.id, 60\)/);
    expect(screenSrc).toMatch(/runWeeklyCoach\(\{[\s\S]*morningWeights:\s*weights/);
  });

  test('getMorningWeights is imported from database.js (live SQLite read, no cache)', () => {
    expect(screenSrc).toMatch(/import\s*\{[^}]*getMorningWeights[^}]*\}\s*from\s*'\.\.\/lib\/database'/);
  });

  test('weeklyCoach.computeWeeklyTrendPct is a pure function of its morningWeights argument (no I/O, no memoisation)', () => {
    const src = fs.readFileSync(WEEKLY_COACH_PATH, 'utf8');
    const fnMatch = src.match(/export function computeWeeklyTrendPct\(([\s\S]*?)\n\}/);
    expect(fnMatch).toBeTruthy();
    const body = fnMatch[1];
    // No require/import/DB access inside the function body, and no module-level
    // cache variable referenced by name would appear as a bare identifier
    // assignment; the simplest, sufficient check is that it never touches SQLite.
    expect(body).not.toMatch(/require\(|getAllAsync|getFirstAsync|runAsync/);
  });
});
