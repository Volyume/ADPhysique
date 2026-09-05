/**
 * D139 (programme creation and planning masterpass, 2026-09-03, lead-ruled
 * under D33), finding: "the library's 'N to swap' fact vanished on the
 * deciding screen" + "the one good [rationale] sat behind" an active-plan-
 * only gate.
 *
 * Source-level guard (PlanDetailScreen has no real-render harness -- see
 * PlanDetailScreen.reorder.guard.test.js for the same convention).
 *
 * Covers item 6 (the library preview carries the same compatibility badge
 * and conflict names the library grid shows, plus a split rationale for
 * every plan that has one) and the PlanDetailScreen half of item 9 (funnel
 * telemetry: library_plan_previewed).
 */
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'PlanDetailScreen.js'), 'utf8');

describe('D139 item 6: the library preview carries the compatibility fact', () => {
  test('loadData computes compatibility with the same lib call PlanLibraryScreen uses', () => {
    expect(source).toContain("const { loadCapabilityResolveState } = require('../lib/capability/resolve');");
    expect(source).toContain("const { computePlanCompatibility } = require('../lib/capability/planCompat');");
    expect(source).toContain('setCompatibility(computePlanCompatibility(capState, exerciseRows));');
  });

  test('the same two badges the library grid shows render beside the existing badges', () => {
    const idx = source.indexOf('planHeaderBadgeRow');
    const block = source.slice(idx, source.indexOf('<Text style={[styles.planName'));
    expect(block).toContain("compatibility?.fullyCompatible === true");
    expect(block).toContain('Fits your limitations');
    expect(block).toContain('compatibility.fullyCompatible === false');
    expect(block).toContain('{compatibility.conflicts.length + compatibility.unknowns.length} to swap');
  });

  test('a conflict line names up to two exercises directly, counting the rest', () => {
    const idx = source.indexOf('Would be swapped');
    expect(idx).toBeGreaterThan(-1);
    const block = source.slice(source.lastIndexOf('compatibility.fullyCompatible === false', idx) - 50, idx + 60);
    expect(block).toContain('names.length - 2');
    expect(block).toContain('Would be swapped: {list}.');
  });

  test('the whyThis reveal falls back to the split rationale for every plan that has a split type', () => {
    expect(source).toContain("import { getSplitRationale } from '../lib/whyThisTemplates';");
    expect(source).toContain(
      "const splitRationale = workouts[0]?.splitType ? getSplitRationale(workouts[0].splitType) : null;",
    );
    expect(source).toMatch(
      /isActive && !isLibrary && whyThis && WHY_ORDER\.some\(k => whyThis\[k\]\) \? \(/,
    );
    expect(source).toContain(') : splitRationale ? (');
  });
});

describe('D139 item 9: funnel telemetry, library preview', () => {
  test('a library plan preview tracks library_plan_previewed, fire-and-forget', () => {
    expect(source).toContain("import { track } from '../lib/telemetry';");
    expect(source).toContain("if (isLibrary && user?.id) track(user.id, 'library_plan_previewed', {}).catch(() => {});");
  });
});
