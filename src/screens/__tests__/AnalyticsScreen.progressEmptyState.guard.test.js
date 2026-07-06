import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'AnalyticsScreen.js'), 'utf8');

describe('AnalyticsScreen Progress empty state', () => {
  test('does not send users from Progress to the Train entry point', () => {
    expect(SRC).toMatch(/title="No progress data yet"/);
    expect(SRC).toMatch(/Your charts will appear here once you have logged training, body metrics, photos or scans\./);
    expect(SRC).not.toMatch(/title="Your progress starts here"/);
    expect(SRC).not.toMatch(/actionLabel="Start a workout"/);
    expect(SRC).not.toMatch(/navigateCrossTab\(navigation, 'HomeTab', 'BuildWorkout'\)/);
  });
});
