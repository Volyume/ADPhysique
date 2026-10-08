/**
 * VolumeHeatmapScreen.editorRemoved.guard.test.js
 *
 * What this suite pins and why. Register D219, "Founder answers, 2026-10-05"
 * (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md), item 1: the
 * Volume targets editor is REMOVED ("Remove the editor": "One set of numbers
 * everywhere. People's existing custom targets stop being shown", and stop
 * being applied). Since D219 every screen judges weekly sets by the plan's
 * evidence-based role bands, so the person's own targets no longer changed any
 * verdict, and a control that does nothing is misleading.
 *
 * Source-level guards (fs.readFileSync + regex, the CLAUDE.md convention) that:
 *   - the editor (the "Volume targets" modal, its save, release and reset
 *     handlers, its toasts, its styles) is gone from the Volume heatmap screen;
 *   - BOTH doors to it are gone: the last row of the Volume heatmap and the
 *     "Volume targets" row on the Coach tab (YouScreen);
 *   - nothing that remains reads or writes the stored custom targets, so the
 *     control cannot quietly come back as one that does nothing;
 *   - the rest of each screen is still there (the figure, the rows, the trend
 *     card; the Setup group's other rows);
 *   - the stored blob itself stays on disk and in sync: only the editor and the
 *     readers went, never the data (no deletion, no migration, no sync change).
 * A behavioural test of the landmark table lives in
 * src/lib/__tests__/effectiveLandmarks.manualLayerRetired.test.js.
 */
const fs = require('fs');
const path = require('path');

const SRC_ROOT = path.resolve(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');

// Code only: block comments and whole-line or trailing "//" comments removed, so a comment that
// explains the removal is not mistaken for the removed thing. A "//" inside a URL has a colon
// before it and is left alone.
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\s)\/\/.*$/gm, '$1');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) out.push(full);
  }
  return out;
}
const rel = (file) => path.relative(SRC_ROOT, file).split(path.sep).join('/');

describe('the editor is gone from the Volume heatmap screen', () => {
  const HEATMAP = stripComments(read('../VolumeHeatmapScreen.js'));

  test('no "Volume targets" door, label or toast is left', () => {
    expect(HEATMAP).not.toMatch(/volume targets/i);
    expect(HEATMAP).not.toMatch(/NavRow|NavGroup/);
    expect(HEATMAP).not.toContain("Back to Volyume's targets");
    expect(HEATMAP).not.toContain('Keep my own targets');
    expect(HEATMAP).not.toContain("Couldn't save your volume targets");
  });

  test('no modal, no number fields, no buttons: nothing of the editor\'s body is left', () => {
    expect(HEATMAP).not.toMatch(/\bModal\b|ModalHeader|KeyboardAvoidingView/);
    expect(HEATMAP).not.toMatch(/\bTextField\b|\bButton\b/);
    expect(HEATMAP).not.toMatch(/useToast|toast\.show/);
  });

  test('none of the editor\'s state or handlers is left', () => {
    expect(HEATMAP).not.toMatch(
      /saveLandmarks|openEditor|cancelEditing|resetToVolyumeTargets|clearMuscleOverride|isMuscleManaged|editSeedRef|touchedMusclesRef|editFieldRefs|customLandmarks|resolvedLandmarks|resolveLandmarksNow|editValues|editNotice|confirmingReset/,
    );
  });

  test('none of the editor\'s styles is left, frozen or live', () => {
    expect(HEATMAP).not.toMatch(/\bedit[A-Z]\w*\s*:/);
    expect(HEATMAP).not.toMatch(/resetBlock|resetActions|keyboardAvoid/);
  });

  test('the screen reads no stored target of the person\'s own and no landmark table: not the key, not the readers, not the sync', () => {
    expect(HEATMAP).not.toContain('volyume_landmarks');
    expect(HEATMAP).not.toMatch(/getEffectiveLandmarks|getManualLandmarks|getManualVolumeMuscles|isManualEdit|mergeLandmarkPrecedence/);
    expect(HEATMAP).not.toMatch(/syncUserPref|notePrefWrite|from '\.\.\/lib\/sync'/);
  });

  test('the rest of the screen is still there, and the screen now ends with the trend card', () => {
    expect(HEATMAP).toContain('<BodyDiagramHeatmap');
    expect(HEATMAP).toContain('function VolumeRow');
    expect(HEATMAP).toContain('function MuscleTrendRow');
    expect(HEATMAP).toContain('judgeWeek(');
    // The trend window is a per-viewer preference the screen still keeps.
    expect(HEATMAP).toContain('@volyume_chart_window_volume');
    // The last thing inside the scroll view is the trend card: no door after it.
    expect(HEATMAP).toMatch(/<\/Card>\s*\)\}\s*<\/ScrollView>\s*<\/SafeAreaView>/);
  });
});

describe('the Coach tab no longer carries a "Volume targets" row', () => {
  const RAW = read('../YouScreen.js');
  const YOU = stripComments(RAW);

  test('no row, label or route to the Volume heatmap is left in the Coach tab', () => {
    expect(YOU).not.toContain('label="Volume targets"');
    expect(YOU).not.toMatch(/volume targets/i);
    expect(YOU).not.toContain("'VolumeHeatmap'");
    expect(YOU).not.toMatch(/navigateCrossTab\(navigation, 'ProgressTab'/);
  });

  test('the Setup group keeps its other rows, and the cross-tab helper is still used for Community', () => {
    for (const label of ['label="Update goal and phase"', 'label="Nutrition targets"', 'label="Coaching reminders"']) {
      expect(YOU).toContain(label);
    }
    expect(YOU).toContain("navigateCrossTab(navigation, 'CommunityTab')");
    expect(YOU).toMatch(/import \{ navigateCrossTab \} from '\.\.\/navigation\/navigateCrossTab';/);
  });
});

describe('no screen or component anywhere offers the door', () => {
  test('no file under src/screens or src/components labels a row "Volume targets"', () => {
    const offenders = [...walk(path.join(SRC_ROOT, 'screens')), ...walk(path.join(SRC_ROOT, 'components'))]
      .filter((f) => /label="Volume targets"|label: 'Volume targets'|title="Volume targets"/.test(stripComments(fs.readFileSync(f, 'utf8'))))
      .map(rel);
    expect(offenders).toEqual([]);
  });
});

describe('nothing in the app reads or writes the stored custom targets; the data stays on disk and in sync', () => {
  const files = walk(SRC_ROOT);

  test('only the landmark module and the sync registry mention the stored key in code, and the module only in comments', () => {
    const mentioning = files.filter((f) => stripComments(fs.readFileSync(f, 'utf8')).includes('volyume_landmarks')).map(rel);
    expect(mentioning).toEqual(['lib/sync.js']);
    const landmarks = fs.readFileSync(path.join(SRC_ROOT, 'lib', 'effectiveLandmarks.js'), 'utf8');
    expect(landmarks).toContain('@volyume_landmarks_<userId>'); // the header says what was retired
    expect(stripComments(landmarks)).not.toMatch(/AsyncStorage|volyume_landmarks/);
  });

  test('the two manual getters are inert: they answer "none" without reading anything', () => {
    const landmarks = stripComments(fs.readFileSync(path.join(SRC_ROOT, 'lib', 'effectiveLandmarks.js'), 'utf8'));
    expect(landmarks).toMatch(/export async function getManualLandmarks\(_userId\) \{\s*return null;\s*\}/);
    expect(landmarks).toMatch(/export async function getManualVolumeMuscles\(_userId\) \{\s*return \[\];\s*\}/);
  });

  test('the merge takes no manual input and never names a manual source', () => {
    const landmarks = stripComments(fs.readFileSync(path.join(SRC_ROOT, 'lib', 'effectiveLandmarks.js'), 'utf8'));
    expect(landmarks).toMatch(/export function mergeLandmarkPrecedence\(\{ adapted = null, plan = null, research = VOLUME_LANDMARKS \} = \{\}\)/);
    expect(landmarks).not.toMatch(/source\[muscle\] = 'manual'/);
  });

  test('the blob still syncs, guarded: the data is untouched, only never read', () => {
    const sync = fs.readFileSync(path.join(SRC_ROOT, 'lib', 'sync.js'), 'utf8');
    const patterns = sync.match(/\/\^@volyume_landmarks_\//g) ?? [];
    expect(patterns.length).toBeGreaterThanOrEqual(2); // the syncable list and the guarded list
  });
});
