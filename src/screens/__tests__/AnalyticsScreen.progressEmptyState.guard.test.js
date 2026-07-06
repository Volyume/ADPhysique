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
