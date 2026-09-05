/**
 * stylePlans.capability.test.js — EL-8, docs/exercise-library-expansion-
 * 2026-09-05/09-STYLE-PLANS.md section 5.
 *
 * What this suite pins and why: every one of the eight new style
 * templates (five kettlebell, three circuit) is run through the SAME
 * capability compatibility check every other library plan gets
 * (src/lib/capability/planCompat.js's computePlanCompatibility) against
 * four representative constrained users - no overhead access, no floor
 * access, seated only, one-arm. The requirement is HONESTY: a plan whose
 * contents genuinely conflict with a constraint must report the honest
 * needs-edit outcome (fullyCompatible: false, the conflicting rows named
 * with a real reason), never silently claim full compatibility, and
 * never lose or duplicate a row in the process (compatible + conflicts +
 * unknowns must always equal the plan's total row count - proof nothing
 * was quietly substituted away rather than reported).
 */
const { LIBRARY_PLANS } = require('../seedRoutines');
const { CORPUS_BY_NAME, corpusEntryToSeedRow } = require('../exerciseCorpus/index');
const { computePlanCompatibility } = require('../capability/planCompat');
const { buildCapabilityResolveState, CAPABILITY_BLOCK } = require('../capability/resolve');
const { CONSTRAINT_RULE_KIND, CONSTRAINT_STATE } = require('../capability/model');

const NOW = Date.now();

const STYLE_PLAN_NAMES = [
  'Kettlebell Foundations: 2 Days',
  'Kettlebell Foundations: 3 Days',
  'Kettlebell Strength: 3 Days',
  'Kettlebell Strength: 4 Days',
  'Kettlebell Minimal: 3 Days',
  'Full-Body Circuit: Dumbbells',
  'Bodyweight Circuit',
  'Kettlebell Circuit',
];

function demandRow(ruleValue, laterality = null) {
  return {
    id: `r-${ruleValue}-${laterality ?? 'none'}`,
    userId: 'u',
    role: 'baseline',
    source: 'self',
    ruleKind: CONSTRAINT_RULE_KIND.DEMAND,
    ruleValue,
    laterality,
    startsAt: NOW - 1,
    endsAt: null,
    state: CONSTRAINT_STATE.ACTIVE,
    endedAt: null,
    endedReason: null,
    episodeGroupId: null,
    deletedAt: null,
  };
}

// Four representative constrained users (09 section 5).
const SCENARIOS = {
  no_overhead: buildCapabilityResolveState([demandRow('overhead_position')], { atMs: NOW }),
  no_floor: buildCapabilityResolveState([demandRow('floor_access')], { atMs: NOW }),
  seated_only: buildCapabilityResolveState([demandRow('standing')], { atMs: NOW }),
  one_arm: buildCapabilityResolveState([demandRow('bilateral_upper', 'left')], { atMs: NOW }),
};

/** Every exercise row (deduped by name, corpus-derived) a plan actually uses. */
function rowsForPlan(plan) {
  const byName = new Map();
  for (const workout of plan.workouts) {
    for (const ex of workout.exercises) {
      if (byName.has(ex.name)) continue;
      const entry = CORPUS_BY_NAME.get(ex.name);
      if (!entry || entry.retiredInto) throw new Error(`${plan.name}: "${ex.name}" does not resolve in the corpus`);
      byName.set(ex.name, corpusEntryToSeedRow(entry));
    }
  }
  return [...byName.values()];
}

const plansByName = new Map(LIBRARY_PLANS.map((p) => [p.name, p]));

describe('style plan capability compatibility (EL-8, 09 section 5)', () => {
  test.each(STYLE_PLAN_NAMES)('every style plan exists in LIBRARY_PLANS: %s', (name) => {
    expect(plansByName.has(name)).toBe(true);
  });

  describe.each(STYLE_PLAN_NAMES)('%s', (planName) => {
    const plan = plansByName.get(planName);
    const rows = plan ? rowsForPlan(plan) : [];

    test('has at least one exercise row and every name resolves', () => {
      expect(rows.length).toBeGreaterThan(0);
    });

    test.each(Object.keys(SCENARIOS))('reports honest compatibility for %s (no row lost or duplicated)', (scenarioKey) => {
      const state = SCENARIOS[scenarioKey];
      const verdict = computePlanCompatibility(state, rows);
      expect(verdict.total).toBe(rows.length);
      // The core honesty invariant: every row is accounted for exactly
      // once, across compatible/conflicts/unknowns - proof nothing was
      // silently dropped or swapped for an incompatible substitution.
      expect(verdict.compatible + verdict.conflicts.length + verdict.unknowns.length).toBe(verdict.total);
      // fullyCompatible is the exact negation of "any conflict or unknown"
      // - a plan with a real conflict must say so, never claim it fits.
      const hasIssue = verdict.conflicts.length > 0 || verdict.unknowns.length > 0;
      expect(verdict.fullyCompatible).toBe(!hasIssue);
      // Every conflicting/unknown row carries a real, honest reason.
      for (const { reason } of [...verdict.conflicts, ...verdict.unknowns]) {
        expect(Object.values(CAPABILITY_BLOCK)).toContain(reason);
      }
    });

    // Every one of these plans is built almost entirely from standing
    // work (kettlebell grinds/ballistics, standing circuit stations), so
    // a "seated only" user must see the honest needs-edit outcome, never
    // a false "fits your limitations" - this is the concrete case the
    // honesty invariant above exists to catch.
    test('seated-only user sees at least one flagged station, not a false fit', () => {
      const verdict = computePlanCompatibility(SCENARIOS.seated_only, rows);
      expect(verdict.conflicts.length + verdict.unknowns.length).toBeGreaterThan(0);
      expect(verdict.fullyCompatible).toBe(false);
    });
  });
});
