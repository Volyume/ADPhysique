import fs from 'fs';
import path from 'path';

// D231 (app layout rework, batch 4): the rows and their empty states moved from
// AnalyticsScreen.js (retired) to components/coach/CoachProgress.js, unchanged.
const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'coach', 'CoachProgress.js'), 'utf8');

describe('CoachProgress empty state', () => {
  // RE-ANCHORED under D214 (PR-11, plan 7.1 item 7): the second sentence used to
  // say body metrics, progress photos and scans were "still available below"
  // while those rows are the card ABOVE the empty state.
  test('does not send users from Progress to the Train entry point', () => {
    // D231 lead review: the empty state left Coach (no chart ever appears
    // there; the Training row says there are no sessions yet).
    expect(SRC).not.toMatch(/title="No training trends yet"/);
    expect(SRC).not.toMatch(/Training charts appear here/);
    expect(SRC).not.toMatch(/still available below/);
    expect(SRC).not.toMatch(/title="Your progress starts here"/);
    expect(SRC).not.toMatch(/actionLabel="Start a workout"/);
    expect(SRC).not.toMatch(/navigateCrossTab\(navigation, 'HomeTab', 'BuildWorkout'\)/);
  });
});

// EP-09/P-06 (Codex end-user-polish audit): before this fix, the Progress screen
// destructured useProgressData() without `loadError` (useProgressData.js
// already exposed it, ~:172-178,502-510), so a genuine read failure fell
// straight through to the plain `allSets.length === 0` branch and rendered
// "No training trends yet" -- indistinguishable from a brand-new user with
// no sessions logged. This suite pins that loadError is now consumed and
// drives its OWN distinct, retryable render branch ahead of the real empty
// state.
describe('CoachProgress load-failure state', () => {
  test('destructures loadError from useProgressData', () => {
    // D231: no pull-to-refresh on Coach, so `refreshing` is no longer read.
    expect(SRC).toMatch(/const \{\s*\n\s*loading, loadError,/);
  });

  test('a load failure renders its own retryable error, distinct from and ahead of the real empty state', () => {
    const idxError = SRC.indexOf('!loading && loadError && allSets.length === 0 && (');
    // D231 lead review: the plain empty state that followed it is gone, so
    // the error block runs to the end of its own JSX.
    expect(idxError).toBeGreaterThan(-1);
    const errorBlock = SRC.slice(idxError, SRC.indexOf(')}', idxError));
    expect(errorBlock).toMatch(/title="Couldn't load your training trends"/);
    expect(errorBlock).toMatch(/actionLabel="Retry"/);
    expect(errorBlock).toMatch(/onAction=\{handleRefresh\}/);
    expect(errorBlock).not.toMatch(/No training trends yet/);
  });
});
