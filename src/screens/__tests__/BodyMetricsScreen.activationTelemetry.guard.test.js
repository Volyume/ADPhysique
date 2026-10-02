/**
 * BodyMetricsScreen.activationTelemetry.guard.test.js
 *
 * Activation-funnel elevation (lead activation ruling, 2026-09-03).
 * Source-level guard, matching the repo convention for this screen.
 *
 * RE-ANCHORED D214 addendum 4 (Body metrics, lane 7; section 6 table:
 * `BodyMetricsScreen.*` guards (activationTelemetry)). The screen was rebuilt:
 * the new-entry write is `saveNew`, the emitter is `fireFirstWeighIn`, and the
 * onboarding auto-seed this file used to guard against is GONE (BM-18: it
 * fabricated a weigh-in dated today), so that half now pins its absence.
 *
 * Pins:
 *   - first_weigh_in fires only on the deliberate NEW-entry save path
 *     (saveNew), guarded on a real weight value, never the value itself;
 *   - it does NOT fire on the legacy AsyncStorage migration (an automated
 *     write, not a user weighing in) and not on an EDIT (a correction).
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'BodyMetricsScreen.js'), 'utf8');

function fnBody(src, decl) {
  const start = src.indexOf(decl);
  if (start === -1) throw new Error(`not found: ${decl}`);
  const rest = src.slice(start + decl.length);
  const next = rest.search(/\n(  )?(async )?function /);
  return next === -1 ? src.slice(start) : src.slice(start, start + decl.length + next);
}

describe('first_weigh_in', () => {
  test('fires from the new-entry save, on a real weight, after the write', () => {
    const body = fnBody(SRC, 'async function saveNew(');
    expect(body).toMatch(/await logBodyMetric\(user\.id, data\);/);
    const after = body.slice(body.lastIndexOf('await logBodyMetric(user.id, data);'));
    expect(after).toMatch(/if \(data\.weightKg != null\) fireFirstWeighIn\(\);/);
  });

  test('the emitter carries no payload (count only, never the value)', () => {
    const emitter = fnBody(SRC, 'function fireFirstWeighIn(');
    expect(emitter).toMatch(/trackFirst\(user\.id, 'first_weigh_in'\)\.catch\(\(\) => \{\}\);/);
    expect(SRC).toMatch(/trackFirst\(user\.id, 'first_weigh_in'\)\.catch\(\(\) => \{\}\);/);
  });

  test('an edit never emits it', () => {
    expect(fnBody(SRC, 'async function saveEdit(')).not.toMatch(/first_weigh_in|fireFirstWeighIn/);
  });

  test('the legacy migration write is not adjacent to the emitter', () => {
    const migrationLog = SRC.indexOf('await logBodyMetric(userId, data);\n        migrated++;');
    expect(migrationLog).toBeGreaterThan(-1);
    expect(SRC.slice(migrationLog, migrationLog + 200)).not.toContain('first_weigh_in');
  });

  test('BM-18: no onboarding seed is written on a first visit (the fabricated weigh-in is gone)', () => {
    expect(SRC).not.toMatch(/Starting weight \(from onboarding\)/);
    expect(SRC).not.toMatch(/volyume_body_metric_seeded/);
    expect(SRC).not.toMatch(/autoSeed/);
    // the only writes of a new body-metric row are the form's own save and the migration
    const writes = SRC.match(/logBodyMetric\(/g) || [];
    expect(writes.length).toBeLessThanOrEqual(4); // import, migration, saveNew, saveEdit (a Home row given measurements)
  });
});
