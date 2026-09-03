/**
 * BodyMetricsScreen.activationTelemetry.guard.test.js
 *
 * Activation-funnel elevation (lead activation ruling, 2026-09-03).
 * Source-level guard, matching the repo convention for this screen (see
 * BodyMetricsScreen.emptyState.guard.test.js).
 *
 * Pins:
 *   - first_weigh_in fires only on the deliberate NEW-entry save path
 *     (saveMetrics), guarded on a real weight value, never the value itself.
 *   - it does NOT fire on the onboarding auto-seed or the legacy
 *     AsyncStorage migration -- both automated writes, not a user weighing
 *     in -- and not on an EDIT (a correction to an existing entry).
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'BodyMetricsScreen.js'), 'utf8');

describe('first_weigh_in', () => {
  test('fires on the new-entry logBodyMetric call inside saveMetrics', () => {
    // The new-entry branch's own logBodyMetric call, distinct from the
    // migration (line ~731) and the auto-seed (line ~768) call sites.
    const saveMetricsStart = SRC.indexOf('async function saveMetrics()');
    expect(saveMetricsStart).toBeGreaterThan(-1);
    const body = SRC.slice(saveMetricsStart);
    const logIdx = body.lastIndexOf('await logBodyMetric(user.id, data);');
    expect(logIdx).toBeGreaterThan(-1);
    const after = body.slice(logIdx, logIdx + 700);
    expect(after).toMatch(/if \(data\.weightKg != null\) \{/);
    expect(after).toContain("trackFirst(user.id, 'first_weigh_in')");
  });

  test('carries no payload (count only, never the value)', () => {
    expect(SRC).toMatch(/trackFirst\(user\.id, 'first_weigh_in'\)\.catch\(\(\) => \{\}\);/);
  });

  test('the migration and auto-seed writes are not adjacent to the emitter', () => {
    const migrationLog = SRC.indexOf('await logBodyMetric(user.id, data);\n          migrated++;');
    const seedLog = SRC.indexOf("await logBodyMetric(user.id, { weightKg: onboardingKg, notes: 'Starting weight (from onboarding)' });");
    expect(migrationLog).toBeGreaterThan(-1);
    expect(seedLog).toBeGreaterThan(-1);
    const migrationBlock = SRC.slice(migrationLog, migrationLog + 200);
    const seedBlock = SRC.slice(seedLog, seedLog + 200);
    expect(migrationBlock).not.toContain('first_weigh_in');
    expect(seedBlock).not.toContain('first_weigh_in');
  });
});
