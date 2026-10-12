/**
 * D226 source-level guards. Pins: the training-status storage key never
 * appears in sync, coach report, Sentry or analytics code (it is Article 9
 * data kept on this phone); only trainingStatus.js names it; the coach screen
 * passes the status to the engine as a single number; NutritionTargetsScreen
 * reads calm mode and the ED flag through the fail-closed reader and starts
 * suppressed; sign-out and account deletion clear the status.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== '__tests__') walk(rel, out); } else if (/\.js$/.test(e.name)) out.push(rel);
  }
  return out;
}

describe('training status stays on the phone', () => {
  test('the storage key is named only in trainingStatus.js', () => {
    const hits = walk('.').filter((f) => read(f).includes('volyume_training_status'));
    expect(hits).toEqual([path.join('lib', 'trainingStatus.js')]);
  });
  test('sync, coach report and Sentry code never mention the status or its module', () => {
    const files = [...walk('lib/sync'), 'lib/sync.js', 'lib/sentry.js', ...walk('lib/observability')]
      .filter((f) => fs.existsSync(path.join(root, f)));
    const coachReport = walk('lib').filter((f) => /coachReport/i.test(f));
    for (const f of [...files, ...coachReport]) {
      expect(read(f)).not.toMatch(/trainingStatus|training_status|enhanced/i);
    }
  });
  test('CoachOutputScreen hands the engine only the ceiling number', () => {
    const src = read('screens/CoachOutputScreen.js');
    expect(src).toMatch(/gainCeilingPct\s*=\s*gainCeilingFor\(await getTrainingStatus\(\)\)/);
    expect(src).not.toMatch(/trainingStatus\s*[:,]/);
  });
  test('sign-out and account deletion clear it', () => {
    expect(read('store/useAppStore.js')).toMatch(/clearTrainingStatus/);
    expect(read('hooks/useAccountActions.js')).toMatch(/clearTrainingStatus\(\)/);
  });
});

describe('NutritionTargetsScreen reads the ED flag and calm mode fail-closed', () => {
  const src = read('screens/NutritionTargetsScreen.js');
  test('uses the shared fail-closed reader and starts suppressed', () => {
    expect(src).toMatch(/readEdOrCalmSuppressed\(user\.id\)/);
    expect(src).toMatch(/\[suppressed,\s*setSuppressed\]\s*=\s*useState\(true\)/);
    expect(src).toMatch(/catch \(_\) \{ s = true; \}/);
  });
  test('the slider and the status row are gated on it', () => {
    expect(src).toMatch(/chooseActive = !suppressed/);
    expect(src).toMatch(/\{!suppressed \? \(\s*<View style=\{styles\.formGroup\}>\s*<Text style=\{\[styles\.fieldLabel, live\.fieldLabel\]\}>Training status/);
  });
});
