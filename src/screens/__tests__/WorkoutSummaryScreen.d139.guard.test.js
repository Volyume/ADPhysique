/**
 * D139 (programme creation and planning masterpass, 2026-09-03), finding:
 * "five words (day, workout, routine, template, session) named one object".
 * Ruling 6: one word, "workout". Saved workouts, not templates.
 *
 * Source-level guard, matching the sibling WorkoutSummaryScreen suite's own
 * convention (e.g. WorkoutSummaryScreen.feedback.guard.test.js).
 */
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'WorkoutSummaryScreen.js'), 'utf8');

describe('D139 item 5: one word for a workout, on WorkoutSummaryScreen', () => {
  test('the save affordance says "workout", never "template"', () => {
    expect(source).toContain('title="Save this workout to reuse"');
    expect(source).toContain('accessibilityLabel="Save this workout to reuse"');
    expect(source).not.toContain('Save as workout template');
  });

  test('the field label reads "Workout name"', () => {
    expect(source).toContain('accessibilityLabel="Workout name"');
    expect(source).toContain('placeholder="Workout name"');
    expect(source).not.toContain('Workout template name');
    expect(source).not.toContain('placeholder="Template name"');
  });

  test('the empty-session guard and the failure toast are workout-worded', () => {
    expect(source).toContain("toast.show('Nothing to save from this session.', { variant: 'info' });");
    expect(source).toContain("toast.show('Could not save this workout. Try again.', { variant: 'error' });");
    expect(source).not.toContain('No exercise data to save as a template.');
    expect(source).not.toContain('Could not save template.');
  });

  test('the success toast names "Saved workouts", not "Workout templates"', () => {
    expect(source).toContain('saved to Saved workouts');
    expect(source).not.toContain('saved to Workout templates');
  });
});
