/**
 * Sentry VOLYUME-28 (2026-10-17): "Marker was set but no library plans
 * found. Re-seeding." fired on hundreds of launches. In the marker-set branch
 * a FAILED read of the library (the database not ready, e.g. a background
 * launch) was swallowed as an EMPTY library, which cleared the marker and
 * re-seeded. Pins: in that branch a failed read stops the seed and keeps the
 * marker; only a read that succeeds and is genuinely empty re-seeds.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'seedRoutines.js'), 'utf8');
const branch = SRC.slice(SRC.indexOf('if (alreadySeeded) {'), SRC.indexOf("logWarn('seedRoutines.reseed'"));

test('a failed library read in the marker-set branch returns without touching the marker', () => {
  expect(branch).not.toMatch(/getLibraryPlans\(\)\.catch\(\(\) => \[\]\)/);
  expect(branch).toMatch(/try \{\s*existingLibrary = await getLibraryPlans\(\);\s*\} catch \(readErr\) \{\s*logInfo\('seedRoutines\.libraryReadDeferred'[^;]*;\s*return;\s*\}/);
  // The marker is only cleared after the try, i.e. on a read that succeeded.
  expect(branch.indexOf('catch (readErr)')).toBeLessThan(branch.indexOf('AsyncStorage.removeItem(SEED_KEY)'));
});
