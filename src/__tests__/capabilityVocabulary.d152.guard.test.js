/**
 * capabilityVocabulary.d152.guard.test.js - the D152 rename, pinned at
 * source level.
 *
 * Certification finding F-01 (docs/final-certification-2026-09-05/
 * 07-FINDINGS.md): "How you train" hid the purpose of the injuries /
 * limitations lane - it reads as split, frequency or training style, so a
 * person with a bad shoulder, limited grip or a long-term disability could
 * not predict the door. Lead ruling D152 renamed the lane, in COPY only,
 * to "Injuries & limitations". Route ids, file names and exported symbols
 * (HowYouTrain, HowYouTrainAdd, howYouTrainSummary, HOW_YOU_TRAIN_OFFER)
 * deliberately keep the old identifiers: they are internal.
 *
 * What this pins, and why each part exists:
 *  1. No user-facing string or JSX text under src/ says "how you train"
 *     any more. The rename touched 39 non-test files and 167 lines, so a
 *     single missed surface would leave two names for one place. COMMENTS
 *     are allowed to keep the old phrase (they carry the history), so
 *     comments are stripped before the check.
 *  2. The retired count "N thing(s) you told it" (summary.js) can never
 *     come back. It was a storage-row count dressed up as something the
 *     person had said, and it is banned outright.
 *  3. The six entry surfaces all carry the new name, so the door is
 *     predictable from every direction: Coach tab, Train tab, Settings,
 *     Today, the feature's own title, and the onboarding step label.
 */
const fs = require('fs');
const path = require('path');

const SRC_ROOT = path.join(__dirname, '..');

/** Every .js under src/, excluding test files and __tests__ folders. */
function collectSourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === '__mocks__') continue;
      collectSourceFiles(full, out);
    } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * The file with its comments blanked out, so a comment that quotes the
 * retired vocabulary for context cannot fail the guard. Block comments
 * are replaced line-for-line to keep reported line numbers honest.
 */
function stripComments(source) {
  const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  return withoutBlocks.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
}

const FILES = collectSourceFiles(SRC_ROOT);

function offendingLines(pattern) {
  const hits = [];
  for (const file of FILES) {
    const code = stripComments(fs.readFileSync(file, 'utf8'));
    code.split('\n').forEach((line, i) => {
      if (pattern.test(line)) hits.push(`${path.relative(SRC_ROOT, file)}:${i + 1}: ${line.trim()}`);
    });
  }
  return hits;
}

describe('D152 / F-01: the lane is called "Injuries & limitations" everywhere a person can read', () => {
  test('this guard is reading the real tree', () => {
    expect(FILES.length).toBeGreaterThan(200);
    expect(FILES.some((f) => f.endsWith(path.join('screens', 'HowYouTrainScreen.js')))).toBe(true);
  });

  test('no user-facing string or JSX text says "how you train" (comments may)', () => {
    expect(offendingLines(/how you train/i)).toEqual([]);
  });

  test('the retired "N thing(s) you told it" count is gone and cannot return', () => {
    expect(offendingLines(/thing(s)? you told/i)).toEqual([]);
  });

  test('all six entry surfaces carry the new name', () => {
    const read = (rel) => fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');
    const NAME = 'Injuries & limitations';
    // 1. Coach tab row, 2. Train tab row, 3. Settings row.
    expect(read('screens/YouScreen.js')).toContain(`label="${NAME}"`);
    expect(read('screens/PlansScreen.js')).toContain(`>${NAME}</Text>`);
    expect(read('screens/SettingsScreen.js')).toContain(`label="${NAME}"`);
    // 4. Today's grouped section label.
    expect(read('screens/HomeScreen.js')).toContain(`<SectionLabel tone="muted">${NAME}</SectionLabel>`);
    // 5. The feature's own page title.
    expect(read('screens/HowYouTrainScreen.js')).toContain(`<SettingsPage title="${NAME}"`);
    // 6. The onboarding step label.
    expect(read('screens/ProOnboardingScreen.js')).toMatch(
      /const STEP_LABELS = \[[^\]]*'Injuries & limitations'[^\]]*\];/,
    );
  });
});
