import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'AnalyticsScreen.js'), 'utf8');

describe('AnalyticsScreen Progress empty state', () => {
  test('does not send users from Progress to the Train entry point', () => {
    expect(SRC).toMatch(/title="No training trends yet"/);
    expect(SRC).toMatch(/Training charts appear here once sessions are logged\. Body metrics, progress photos and scans are still available below\./);
    expect(SRC).not.toMatch(/title="Your progress starts here"/);
    expect(SRC).not.toMatch(/actionLabel="Start a workout"/);
    expect(SRC).not.toMatch(/navigateCrossTab\(navigation, 'HomeTab', 'BuildWorkout'\)/);
  });
});

// EP-09/P-06 (Codex end-user-polish audit): before this fix, AnalyticsScreen
// destructured useProgressData() without `loadError` (useProgressData.js
// already exposed it, ~:172-178,502-510), so a genuine read failure fell
// straight through to the plain `allSets.length === 0` branch and rendered
// "No training trends yet" -- indistinguishable from a brand-new user with
// no sessions logged. This suite pins that loadError is now consumed and
// drives its OWN distinct, retryable render branch ahead of the real empty
// state.
describe('AnalyticsScreen Progress load-failure state', () => {
  test('destructures loadError from useProgressData', () => {
    expect(SRC).toMatch(/const \{\s*\n\s*loading, refreshing, loadError,/);
  });

  test('a load failure renders its own retryable error, distinct from and ahead of the real empty state', () => {
    const idxError = SRC.indexOf('!loading && loadError && allSets.length === 0 && (');
    const idxEmpty = SRC.indexOf('!loading && !loadError && allSets.length === 0 && (');
    expect(idxError).toBeGreaterThan(-1);
    expect(idxEmpty).toBeGreaterThan(idxError);
    const errorBlock = SRC.slice(idxError, idxEmpty);
    expect(errorBlock).toMatch(/title="Couldn't load your training trends"/);
    expect(errorBlock).toMatch(/actionLabel="Retry"/);
    expect(errorBlock).toMatch(/onAction=\{handleRefresh\}/);
    expect(errorBlock).not.toMatch(/No training trends yet/);
  });
});
