/**
 * D112 R5 (closes audit T1-23) - the quick full-body session names its
 * drops instead of silently shrinking the built session.
 *
 * RE-POINTED (D156, 2026-09-11): applyTravelMode -> applyQuickSession, and
 * the classification mechanism itself moved. Before this landing the
 * screen resolved the engine's exercise NAMES against the library by
 * hand (findIn/fullMatch) and classified each miss inline. The generator
 * is corpus-driven now (src/lib/quickSession.js's buildQuickSession reads
 * real rows directly, never a name to be matched), so
 * explainQuickSessionDrops does the classification. The screen calls it
 * once and keeps the exact toast contract. Nothing here changes what
 * counts as a drop or how it is reported to the person; only where the
 * classification code lives.
 *
 * REVISED AGAIN (lead ruling, same day): explainQuickSessionDrops itself
 * no longer runs the generator twice and compares per-slot winners (that
 * approach over-counted under a chosen-name cascade - see the function's
 * own header comment in quickSession.js). It now runs the generator ONCE
 * over `all` and checks each item's exercise NAME against a Set built
 * from the `filtered` library directly - simpler, and immune to the
 * cascade. The pins below are updated to that shape; what they pin
 * (lazy require, capability checked first, exactly one drop branch) is
 * unchanged.
 */
const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'BuildWorkoutScreen.js'), 'utf8');
const QUICK_SESSION_SOURCE = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'quickSession.js'), 'utf8');

function applyQuickSessionBody() {
  const site = SOURCE.indexOf('async function applyQuickSession');
  const end = SOURCE.indexOf('\n  function formatRest', site);
  expect(site).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(site);
  return SOURCE.slice(site, end);
}

function explainQuickSessionDropsBody() {
  const site = QUICK_SESSION_SOURCE.indexOf('export function explainQuickSessionDrops');
  expect(site).toBeGreaterThan(-1);
  return QUICK_SESSION_SOURCE.slice(site);
}

describe('T1-23: the quick session\'s drops are counted and classified', () => {
  test('capabilityState is carried out of the try block so the drop pass can read it', () => {
    const body = applyQuickSessionBody();
    expect(body).toMatch(/let capabilityState = null;/);
    expect(body).toMatch(/capabilityState = state\?\.capability \?\? null;/);
  });

  test('the screen calls explainQuickSessionDrops with the filtered library and the same capabilityState the build used', () => {
    const body = applyQuickSessionBody();
    expect(body).toMatch(
      /explainQuickSessionDrops\(\{\s*\n?\s*all, filtered: library, kit: quickKit, capabilityState,?\s*\n?\s*\}\)/,
    );
  });

  test('classification lives in quickSession.js: a lazy capabilityBlockReason read, capability checked first, exactly one drop branch', () => {
    const body = explainQuickSessionDropsBody();
    expect(body).toMatch(/require\('\.\/capability\/resolve'\)/);
    expect(body).toMatch(
      /if \(capabilityBlockReason\(capabilityState, item\.exercise\)\) capabilityDrops \+= 1;\s*\n\s*else preferenceDrops \+= 1;/,
    );
    // Exactly one of each - classification never adds a second silent path.
    expect((body.match(/capabilityDrops \+= 1/g) ?? []).length).toBe(1);
    expect((body.match(/preferenceDrops \+= 1/g) ?? []).length).toBe(1);
  });

  test('the classification checks library membership by NAME, not a per-slot winner comparison (immune to the chosen-name cascade)', () => {
    const body = explainQuickSessionDropsBody();
    expect(body).toMatch(/filteredNames\.has\(item\.exercise\.name\)/);
    expect(body).toMatch(/const filteredNames = new Set\(/);
    // The generator runs exactly once here (over `all`) - no second
    // buildQuickSession call over `filtered` to compare winners against.
    expect((body.match(/buildQuickSession\(/g) ?? []).length).toBe(1);
  });

  test('the old per-name matching (findIn/fullMatch/return null placeholder) is gone from the screen', () => {
    const body = applyQuickSessionBody();
    expect(body).not.toMatch(/findIn/);
    expect(body).not.toMatch(/fullMatch/);
    expect(body).not.toMatch(/return null;/);
  });

  test('one line per non-zero class, via the screen\'s toast, with the exact copy', () => {
    const body = applyQuickSessionBody();
    expect(body).toMatch(
      /\$\{capabilityDrops === 1 \? '1 movement' : `\$\{capabilityDrops\} movements`\} left out for your limitations\./,
    );
    expect(body).toMatch(
      /\$\{preferenceDrops === 1 \? '1 movement' : `\$\{preferenceDrops\} movements`\} left out for your avoided movements\./,
    );
    expect(body).toMatch(/toast\.show\(dropLines\.join\(' '\), \{ variant: 'info', duration: 5000 \}\);/);
    // Only shown when at least one class is non-zero.
    expect(body).toMatch(/if \(dropLines\.length\) \{/);
  });

  test('setExercises still runs unconditionally before the toast (the build itself never blocks on the count)', () => {
    const body = applyQuickSessionBody();
    const setExIdx = body.indexOf('setExercises(newItems);');
    const toastIdx = body.indexOf("toast.show(dropLines.join(' ')");
    expect(setExIdx).toBeGreaterThan(-1);
    expect(toastIdx).toBeGreaterThan(setExIdx);
  });
});
