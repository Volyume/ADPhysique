/**
 * CC33 D112 R4 (injury/disability audit W4, 2026-08-28) - closes audit
 * T2-11: "Swap and note a temporary change" used to call handleOpenSwap()
 * AND navigate('HowYouTrain') with no params - the swap sheet opened
 * orphaned underneath while the user was pushed to a cold settings screen.
 *
 * Source-level guard (fs.readFileSync + regex), matching this screen's
 * existing convention (see ActiveWorkoutScreen.reducedSessionSignal.guard.
 * test.js and siblings): no light render harness covers this 5,000+ line
 * screen's overflow sheet.
 *
 * Pins:
 *  - "Note a temporary change" navigates only - handleOpenSwap() is never
 *    called from that branch.
 *  - "Just swap it" opens the swap sheet with workAroundSwapRef set (the
 *    causeOverride 'constraint' provenance), still no navigation.
 *  - The preselect payload is built from THIS exercise's driving conflict
 *    (episode conflicts outrank baseline, matching constraintNotice's own
 *    precedence), using the TrainingConsiderationsScreen.js contract shape
 *    ({ kind: 'demand', axes } or { kind: 'exercise', exerciseNames }).
 *  - The sheet body copy matches the new behaviour.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'ActiveWorkoutScreen.js'), 'utf8');

describe('T2-11: "Work around this" sheet actually captures', () => {
  const site = SRC.indexOf("accessibilityLabel={exercise?.name ? `Work around ${exercise.name} today`");
  const alertSite = SRC.lastIndexOf('appAlert(', site);
  const block = SRC.slice(alertSite, site);

  test('reads the real sheet block (sanity: both buttons are present)', () => {
    expect(site).toBeGreaterThan(-1);
    expect(block).toContain("text: 'Just swap it'");
    expect(block).toContain("text: 'Note a temporary change'");
  });

  test('the body copy matches the new behaviour, no em dash', () => {
    expect(block).toContain(
      "'Swap it for something that works now. If this is more than a one-off, note a temporary change and plans work around it.'",
    );
    expect(block).not.toMatch(/—/);
  });

  test('"Just swap it" opens the swap sheet with the constraint provenance marked, no navigation', () => {
    // Lead review of this wave wired workAroundSwapRef here: a swap made
    // through the Work-around sheet is the ONE ruled place a UI path may
    // key the swap's cause (causeOverride 'constraint'), so the learning
    // shield never reads a worked-around movement as a preference signal.
    // The ref is set before the sheet opens and cleared on confirm/close.
    const justSwapSite = block.indexOf("text: 'Just swap it'");
    const justSwapBlock = block.slice(justSwapSite, block.indexOf('},', justSwapSite));
    expect(justSwapBlock).toContain('onPress: () => { workAroundSwapRef.current = true; handleOpenSwap(); }');
    expect(justSwapBlock).not.toMatch(/navigate/);
  });

  test('"Note a temporary change" navigates with a preselect and never calls handleOpenSwap', () => {
    const noteSite = block.indexOf("text: 'Note a temporary change'");
    expect(noteSite).toBeGreaterThan(-1);
    const noteBlock = block.slice(noteSite);
    expect(noteBlock).toContain(
      "navigation.navigate('HowYouTrain', workAroundPreselect ? { preselect: workAroundPreselect } : undefined);",
    );
    expect(noteBlock).not.toMatch(/handleOpenSwap\(\)/);
  });

  test('the button label reads "Note a temporary change", not the old "Swap and note a temporary change"', () => {
    expect(SRC).not.toMatch(/Swap and note a temporary change/);
  });
});

describe('T2-11: workAroundPreselect builds the TrainingConsiderationsScreen preselect contract', () => {
  const site = SRC.indexOf('const workAroundPreselect = (() => {');

  test('exists, keyed off the exercise on screen', () => {
    expect(site).toBeGreaterThan(-1);
  });

  test('an active demand-axis conflict (episode-first, matching constraintNotice precedence) wins as the preselected axis', () => {
    const block = SRC.slice(site, SRC.indexOf('})();', site));
    expect(block).toContain('const driving = constraintConflicts.length ? constraintConflicts : baselineConflictsList;');
    expect(block).toContain("const demandRule = driving.find((c) => c.ruleKind === 'demand');");
    expect(block).toContain("if (demandRule) return { kind: 'demand', axes: [demandRule.ruleValue] };");
  });

  test('falls back to an exercise-kind preselect naming THIS exercise, by name not id', () => {
    const block = SRC.slice(site, SRC.indexOf('})();', site));
    expect(block).toContain("return exercise.name ? { kind: 'exercise', exerciseNames: [exercise.name] } : null;");
  });
});
