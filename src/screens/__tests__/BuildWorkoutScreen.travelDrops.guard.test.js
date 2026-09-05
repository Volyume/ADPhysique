/**
 * D112 R5 (closes audit T1-23) - travel mode names its drops instead of
 * silently shrinking the built session. Source guard (matches
 * BuildWorkoutScreen.travelSheet.guard.test.js's own convention for this
 * screen - no filtering behaviour change, so nothing here touches the
 * `if (!match ... ) return null;` drop condition itself).
 */
const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'BuildWorkoutScreen.js'), 'utf8');

function applyTravelModeBody() {
  const site = SOURCE.indexOf('async function applyTravelMode');
  const end = SOURCE.indexOf('\n  function formatRest', site);
  expect(site).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(site);
  return SOURCE.slice(site, end);
}

describe('T1-23: travel mode drops are counted and classified', () => {
  test('capabilityState is carried out of the try block so the drop pass can read it', () => {
    const body = applyTravelModeBody();
    expect(body).toMatch(/let capabilityState = null;/);
    expect(body).toMatch(/capabilityState = state\?\.capability \?\? null;/);
  });

  test('each drop is classified via a lazy capabilityBlockReason(capabilityState, fullMatch) read - capability checked first', () => {
    const body = applyTravelModeBody();
    expect(body).toMatch(/require\('\.\.\/lib\/capability\/resolve'\)/);
    expect(body).toMatch(
      /if \(capabilityBlockReason\(capabilityState, fullMatch\)\) capabilityDrops \+= 1;\s*\n\s*else preferenceDrops \+= 1;/,
    );
  });

  test('the filtering itself is unchanged: still exactly one drop condition, no new behaviour', () => {
    const body = applyTravelModeBody();
    // Still present in the base library means the slot is genuinely
    // unmatched by name (the unrelated placeholder path), not a drop.
    expect(body).toMatch(/if \(!match\) \{\s*\n\s*const fullMatch = findIn\(all\);\s*\n\s*if \(fullMatch\) \{/);
    // Exactly one "return null" in the whole function (the drop path) -
    // classification never adds a second silent-drop branch.
    expect((body.match(/return null;/g) ?? []).length).toBe(1);
  });

  test('one line per non-zero class, via the screen\'s toast, with the exact copy', () => {
    const body = applyTravelModeBody();
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
    const body = applyTravelModeBody();
    const setExIdx = body.indexOf('setExercises(newItems.filter(Boolean));');
    const toastIdx = body.indexOf("toast.show(dropLines.join(' ')");
    expect(setExIdx).toBeGreaterThan(-1);
    expect(toastIdx).toBeGreaterThan(setExIdx);
  });
});
