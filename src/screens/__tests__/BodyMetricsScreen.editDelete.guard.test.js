/**
 * D16 (NAV-2, weigh-in edit/delete/history) source guard.
 *
 * Pins the parts of the build that are easy to silently regress later:
 *   - edit/delete are real, wired to the repository functions (not stubs);
 *   - the confirm is the app's existing calm "workout" delete-confirm idiom
 *     (appAlert, Cancel/Delete with style: 'destructive'), never a native
 *     Alert.alert or a bare TouchableOpacity with no confirmation;
 *   - the delete/edit copy is plain and factual, never celebratory or
 *     judging ("great progress" etc. are banned on this ED-adjacent
 *     surface, same bar as the rest of Body Metrics);
 *   - no haptics anywhere on this screen (weight-adjacent surface: no
 *     celebration, no haptic feedback on log/edit/delete);
 *   - edit/delete controls are gated behind !readOnly, same as every other
 *     write affordance on this screen (E10 read-only lapse views);
 *   - the History section now renders from a single entry, not only once
 *     there are 2+ (full management means the one entry a user has is still
 *     editable/deletable, not hidden behind a 2-entry threshold).
 */
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'BodyMetricsScreen.js'), 'utf8');

describe('BodyMetricsScreen edit/delete (D16 NAV-2) source guard', () => {
  test('imports and calls the real update/delete repository functions', () => {
    expect(source).toMatch(/import \{[^}]*updateBodyMetric[^}]*deleteBodyMetric[^}]*\}\s*from\s*'\.\.\/lib\/database'/);
    expect(source).toMatch(/await updateBodyMetric\(user\.id, targetId, data\)/);
    expect(source).toMatch(/await deleteBodyMetric\(user\.id, entry\.id\)/);
  });

  test('delete uses the appAlert workout-delete idiom: Cancel + destructive Delete, no native Alert', () => {
    expect(source).toMatch(/import \{ appAlert \} from '\.\.\/components\/AppAlert';/);
    expect(source).toMatch(
      /appAlert\(\s*'Delete this entry\?',[\s\S]*?\{ text: 'Cancel', style: 'cancel' \},[\s\S]*?text: 'Delete', style: 'destructive'/,
    );
    expect(source).not.toMatch(/\bAlert\.alert\(/);
  });

  test('no haptics anywhere on this weight-adjacent screen', () => {
    // Checks for an actual haptics call/import, not the word "haptics" (which
    // appears in this file only inside comments explaining its deliberate
    // absence, e.g. "no haptics").
    expect(source).not.toMatch(/from ['"]expo-haptics['"]/);
    expect(source).not.toMatch(/Haptics\.\w+\(/);
    expect(source).not.toMatch(/triggerHaptic\(/);
  });

  test('delete/edit copy is plain and factual, never celebratory or judging the values', () => {
    // Same banned-phrase bar as coachResponse.test.js's "never generic praise"
    // guard, applied to this screen's own source (delete confirm, toasts,
    // form labels), not just engine-generated strings.
    expect(source).not.toMatch(/great progress|well done|great job|amazing|fantastic|awesome|crush(ed)?|smash(ed)?|keep it up/i);
  });

  test('edit/delete controls are gated behind !readOnly like every other write affordance', () => {
    // BUG-WEIGHT-HISTORY: also gated on entry.source !== 'morning_weight' -- a
    // row merged in from morning_weights (Home's quick weigh-in) has no
    // body_metric_log id for updateBodyMetric/deleteBodyMetric to target.
    expect(source).toMatch(/\{!readOnly && entry\.source !== 'morning_weight' && \(\s*<View style=\{styles\.historyActions\}>/);
  });

  test('History section shows from a single entry, not gated to 2+', () => {
    expect(source).toMatch(/\{history\.length > 0 && \(/);
    expect(source).not.toMatch(/\{history\.length > 1 && \(/);
  });
});
