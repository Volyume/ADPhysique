/**
 * Source guard (D17): NotificationSettingsScreen's training-reminder helper
 * text used to claim "Volyume sends it only on the training days from your
 * active plan" -- false on every shipped build, since nothing ever wrote
 * the underlying schedule from the active plan (or from anywhere else).
 * The rebuild (trainingHabitSchedule.js) derives the schedule from
 * completed-workout habit instead, so the copy must describe THAT
 * behaviour honestly. This pins the corrected string so it cannot silently
 * drift back to the plan-derived claim.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'NotificationSettingsScreen.js'),
  'utf8',
);

describe('NotificationSettingsScreen training-reminder copy is honest (D17)', () => {
  test('the helper text describes the habit-derived schedule', () => {
    expect(SRC).toMatch(
      /Volyume learns the days you usually train from your recent workouts, and reminds you then\./,
    );
  });

  test('the old false plan-derived claim is gone', () => {
    expect(SRC).not.toMatch(/training days from your active plan/);
  });

  test('no em dash in the corrected copy', () => {
    const match = SRC.match(
      /Pick the time\. Volyume learns[^<]*?reminds you then\./,
    );
    expect(match).not.toBeNull();
    expect(match[0]).not.toMatch(/—/);
  });
});
