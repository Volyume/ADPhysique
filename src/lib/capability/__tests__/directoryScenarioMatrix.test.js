/**
 * Phase H: directory-wide scenario matrix (sections 15, 16).
 *
 * Tests every profile in conditions.js + injuries.js over the derived
 * library, checking:
 *  - NO INCOMPATIBLE AUTO-SUGGESTION: eligible exercises have zero
 *    definite conflicts
 *  - NO INVENTED RESTRICTION: ineligible exercises have a definite
 *    conflict or unknown on a constrained axis
 *  - USEFUL PLAN OR HONEST GAP: >= 6 muscles with >= 3 eligible
 *    exercises, or listed in THIN_PROFILES
 *  - BASELINE DIGNITY: condition profiles carry no episode
 *  - STACKS: three canonical multi-constraint scenarios
 *  - LATERALITY: sided constraints on body-side axes
 */

const fs = require('fs');
const path = require('path');
const { buildCapabilityResolveState, demandAxisConflict, demandConflicts, isCapabilityEligible } = require('../resolve');
const { deriveExerciseMetadata } = require('../../exerciseMetadata');
const { deriveDemandMetadata } = require('../demands');
const { movementFamily } = require('../../exercise/movementFamily');
const { CONSTRAINT_RULE_KIND, CONSTRAINT_SOURCE, CONSTRAINT_ROLE } = require('../model');
const { CONDITION_PROFILES } = require('../directory/conditions');
const { INJURY_PROFILES } = require('../directory/injuries');

const NOW = 1_750_000_000_000;

// Profiles with thin/challenging eligible exercise pools documented as honest gaps
const THIN_PROFILES = new Map([
  ['stroke_acquired_brain_injury', 'All four questions answered at once (one arm + one leg + balance support + grip) is the worst case; the 26 machine-design unknowns bite exactly here and allowances are the designed answer. Real users confirm the subset that applies.'],
]);

// ── Library derivation ──────────────────────────────────────────────────────

function realLibraryByName() {
  const seedSrc = fs.readFileSync(path.resolve(__dirname, '../../seedExercises.js'), 'utf8');
  const start = seedSrc.indexOf('const RAW = [');
  const body = seedSrc.slice(start, seedSrc.indexOf('\n];', start));
  const mapStart = seedSrc.indexOf('const SUBREGION_MAP = {');
  const mapBody = seedSrc.slice(mapStart, seedSrc.indexOf('\n};', mapStart));
  const sub = new Map();
  const subRe = /'((?:[^'\\]|\\.)+)':\s*'([a-z_]+)'/g;
  let sm;
  while ((sm = subRe.exec(mapBody)) !== null) sub.set(sm[1].replace(/\\'/g, "'"), sm[2]);
  const out = new Map();
  const re = /\[\s*'([^']+)',\s*'([a-z_]+)',\s*\[([^\]]*)\],\s*'([a-z_]+)',\s*'([a-z_]+)',\s*(true|false),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\s*\]/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const base = {
      name: m[1], primaryMuscle: m[2], equipment: m[4], movementPattern: m[5],
      compoundIsolation: m[6] === 'true' ? 'compound' : 'isolation',
    };
    out.set(m[1], {
      id: m[1], ...base, subregion: sub.get(m[1]) ?? null,
      ...deriveExerciseMetadata(base), ...deriveDemandMetadata(base),
    });
  }
  return out;
}

const LIB = realLibraryByName();
const LIB_ARRAY = Array.from(LIB.values());

// ── Conflict checker ────────────────────────────────────────────────────────
// Independent reimplementation: given profile rules and exercise,
// return { definiteConflict, unknownOnly }

function checkConflictIndependent(profileRules, exercise) {
  let hasDefiniteConflict = false;
  let hasUnknownOnly = false;

  for (const rule of profileRules) {
    if (rule.kind === 'demand') {
      const conflict = demandAxisConflict(rule.value, exercise);
      if (conflict === true) {
        hasDefiniteConflict = true;
      } else if (conflict === null) {
        hasUnknownOnly = true;
      }
    } else if (rule.kind === 'family') {
      const exFamily = movementFamily(exercise.name, exercise.primaryMuscle, exercise.subregion);
      if (exFamily === rule.value) {
        hasDefiniteConflict = true;
      }
    } else if (rule.kind === 'exercise') {
      if (exercise.id === rule.value) {
        hasDefiniteConflict = true;
      }
    }
  }

  return { definiteConflict: hasDefiniteConflict, unknownOnly: hasUnknownOnly && !hasDefiniteConflict };
}

// ── Materialize profile questions as rules ──────────────────────────────────

function profileToRules(profile) {
  const rules = [];
  const questions = profile.functionalQuestions || profile.movementQuestions || [];

  for (const q of questions) {
    if (q.kind === 'demand') {
      rules.push({ kind: 'demand', value: q.demandId });
    } else if (q.kind === 'family') {
      const keys = q.familyKeys || [];
      for (const key of keys) {
        rules.push({ kind: 'family', value: key });
      }
    } else if (q.kind === 'exercise_list') {
      for (const exName of q.exerciseNames || []) {
        rules.push({ kind: 'exercise', value: exName });
      }
    }
  }

  return rules;
}

// ── Constraint rows for resolution ──────────────────────────────────────────

function rulesToConstraintRows(rules, role = 'baseline', episodeGroupId = null) {
  return rules.map((r, i) => ({
    id: `r${i}`,
    userId: 'u',
    role,
    source: 'self',
    ruleKind: r.kind === 'demand' ? CONSTRAINT_RULE_KIND.DEMAND
      : r.kind === 'family' ? CONSTRAINT_RULE_KIND.FAMILY
        : CONSTRAINT_RULE_KIND.EXERCISE,
    ruleValue: r.value,
    laterality: null,
    startsAt: NOW - 1,
    endsAt: null,
    state: 'active',
    endedAt: null,
    endedReason: null,
    episodeGroupId,
    deletedAt: null,
  }));
}

// ── Eligibility analysis ────────────────────────────────────────────────────

function analyzeEligibility(state, library) {
  const eligibleByMuscle = new Map();
  const ineligibleByReason = {
    definiteConflict: [],
    unknownOnly: [],
  };

  for (const ex of library) {
    const isEligible = isCapabilityEligible(state, ex);
    if (isEligible) {
      const muscle = ex.primaryMuscle;
      if (!eligibleByMuscle.has(muscle)) {
        eligibleByMuscle.set(muscle, []);
      }
      eligibleByMuscle.get(muscle).push(ex);
    } else {
      const conflicts = demandConflicts(state, ex);
      const hasDefinite = conflicts.some(c => !c.unknown);
      if (hasDefinite) {
        ineligibleByReason.definiteConflict.push({ exercise: ex, conflicts });
      } else {
        ineligibleByReason.unknownOnly.push({ exercise: ex, conflicts });
      }
    }
  }

  return {
    eligibleByMuscle,
    ineligibleByReason,
    totalEligible: Array.from(eligibleByMuscle.values()).reduce((sum, arr) => sum + arr.length, 0),
    musclesWithFloor: Array.from(eligibleByMuscle.entries()).filter(([, exes]) => exes.length >= 3).length,
  };
}

// ── Test suites ─────────────────────────────────────────────────────────────

// Full-fidelity per-profile stats, written for the coverage generator
// when WRITE_SCENARIO_COVERAGE is set (scripts/scenario-coverage.mjs runs
// this suite; the suite is the ONLY place the real eligibility maths
// lives, so the report can never drift from the proof).
const COVERAGE_STATS = [];

afterAll(() => {
  if (!process.env.WRITE_SCENARIO_COVERAGE) return;
  fs.writeFileSync(
    path.resolve(__dirname, '../../../../docs/capability-campaign-25-2026-08-20/scenario-coverage.json'),
    JSON.stringify({ profiles: COVERAGE_STATS, libraryRows: LIB_ARRAY.length }, null, 2),
  );
});

describe('directoryScenarioMatrix: every profile', () => {
  const allProfiles = [...CONDITION_PROFILES, ...INJURY_PROFILES];

  test.each(allProfiles.map((p, i) => [p.id, p, i]))('%s (profile %#)', (profileId, profile) => {
    const rules = profileToRules(profile);

    // Rule validation: every family/axis reference resolves to at least one exercise
    const referencedFamilies = new Set();
    const referencedDemands = new Set();
    const referencedExercises = new Set();

    for (const rule of rules) {
      if (rule.kind === 'family') referencedFamilies.add(rule.value);
      if (rule.kind === 'demand') referencedDemands.add(rule.value);
      if (rule.kind === 'exercise') referencedExercises.add(rule.value);
    }

    // Verify family keys have matches
    for (const fam of referencedFamilies) {
      const matches = LIB_ARRAY.filter(ex =>
        movementFamily(ex.name, ex.primaryMuscle, ex.subregion) === fam
      );
      expect(matches.length).toBeGreaterThan(0);
    }

    // Verify demand axes have matches
    for (const demand of referencedDemands) {
      const matches = LIB_ARRAY.filter(ex => demandAxisConflict(demand, ex) !== false);
      expect(matches.length).toBeGreaterThan(0);
    }

    // Build resolution state
    const rows = profile.kind === 'condition'
      ? rulesToConstraintRows(rules, CONSTRAINT_ROLE.BASELINE)
      : rulesToConstraintRows(rules, CONSTRAINT_ROLE.EPISODE, 'eg1');
    const state = buildCapabilityResolveState(rows, { atMs: NOW });

    const analysis = analyzeEligibility(state, LIB_ARRAY);

    // Check 1: NO INCOMPATIBLE AUTO-SUGGESTION
    // Every eligible exercise has zero definite conflicts
    for (const ex of LIB_ARRAY) {
      if (isCapabilityEligible(state, ex)) {
        const independent = checkConflictIndependent(rules, ex);
        expect(independent.definiteConflict).toBe(false);
      }
    }

    // Check 2: NO INVENTED RESTRICTION
    // Every ineligible exercise has a definite conflict or unknown on constrained axis
    for (const ex of LIB_ARRAY) {
      if (!isCapabilityEligible(state, ex)) {
        const independent = checkConflictIndependent(rules, ex);
        // Independent justification ONLY: the resolver may never be its
        // own witness for an exclusion (the spec's no-invented-restriction
        // check).
        expect({ name: ex.name, justified: independent.definiteConflict || independent.unknownOnly })
          .toEqual({ name: ex.name, justified: true });
      }
    }

    // Check 3: USEFUL PLAN OR HONEST GAP
    if (!THIN_PROFILES.has(profileId)) {
      expect(analysis.musclesWithFloor).toBeGreaterThanOrEqual(6);
    }

    COVERAGE_STATS.push({
      id: profileId,
      kind: profile.kind,
      rules: rules.length,
      totalEligible: analysis.totalEligible,
      musclesWithFloor: analysis.musclesWithFloor,
      definiteConflictExclusions: analysis.ineligibleByReason.definiteConflict.length,
      unknownOnlyExclusions: analysis.ineligibleByReason.unknownOnly.length,
    });

    // Check 4: BASELINE DIGNITY (condition profiles only)
    if (profile.kind === 'condition') {
      expect(state.restrictions.every(r => r.role === CONSTRAINT_ROLE.BASELINE)).toBe(true);
    }

    // Check 5: HONEST UNKNOWNS - the ineligible split is exhaustive, so
    // no exclusion can hide outside the two named reasons.
    const ineligibleTotal = LIB_ARRAY.filter(ex => !isCapabilityEligible(state, ex)).length;
    expect(analysis.ineligibleByReason.definiteConflict.length + analysis.ineligibleByReason.unknownOnly.length)
      .toBe(ineligibleTotal);
  });
});

describe('directoryScenarioMatrix: three canonical stacks', () => {
  test('wheelchair_user baseline + shoulder_rotator_cuff_related episode', () => {
    // Load both profiles
    const wheelchairProfile = CONDITION_PROFILES.find(p => p.id === 'wheelchair_user');
    const rcProfile = INJURY_PROFILES.find(p => p.id === 'shoulder_rotator_cuff_related');

    expect(wheelchairProfile).toBeDefined();
    expect(rcProfile).toBeDefined();

    const baselineRules = profileToRules(wheelchairProfile);
    const episodeRules = profileToRules(rcProfile);

    const baselineRows = rulesToConstraintRows(baselineRules, CONSTRAINT_ROLE.BASELINE);
    const episodeRows = rulesToConstraintRows(episodeRules, CONSTRAINT_ROLE.EPISODE, 'eg1');

    // Both active
    const stateStack = buildCapabilityResolveState([...baselineRows, ...episodeRows], { atMs: NOW });
    const stateBaseline = buildCapabilityResolveState(baselineRows, { atMs: NOW });

    // Get eligible sets
    const stackEligible = new Set(LIB_ARRAY.filter(ex => isCapabilityEligible(stateStack, ex)).map(e => e.id));
    const baselineEligible = new Set(LIB_ARRAY.filter(ex => isCapabilityEligible(stateBaseline, ex)).map(e => e.id));

    // Stack semantics: exactly the intersection of the two states.
    const stateEpisodeOnly = buildCapabilityResolveState(episodeRows, { atMs: NOW });
    const episodeEligible = new Set(LIB_ARRAY.filter(ex => isCapabilityEligible(stateEpisodeOnly, ex)).map(e => e.id));
    const intersection = new Set([...baselineEligible].filter(id => episodeEligible.has(id)));
    expect(stackEligible).toEqual(intersection);

    // Ending the episode (confirmed endedAt in the SAME row set) restores
    // exactly the baseline eligible set.
    const endedEpisodeRows = episodeRows.map(r => ({ ...r, state: 'ended', endedAt: NOW - 1, endedReason: 'user_ended' }));
    const stateAfterEnd = buildCapabilityResolveState([...baselineRows, ...endedEpisodeRows], { atMs: NOW });
    const afterEnd = new Set(LIB_ARRAY.filter(ex => isCapabilityEligible(stateAfterEnd, ex)).map(e => e.id));
    expect(afterEnd).toEqual(baselineEligible);
  });

  test('grip_hand_dexterity baseline + low_back episode', () => {
    const gripProfile = CONDITION_PROFILES.find(p => p.id === 'grip_hand_dexterity');
    const lbProfile = INJURY_PROFILES.find(p => p.id === 'low_back');

    expect(gripProfile).toBeDefined();
    expect(lbProfile).toBeDefined();

    const baselineRules = profileToRules(gripProfile);
    const episodeRules = profileToRules(lbProfile);

    const baselineRows = rulesToConstraintRows(baselineRules, CONSTRAINT_ROLE.BASELINE);
    const episodeRows = rulesToConstraintRows(episodeRules, CONSTRAINT_ROLE.EPISODE, 'eg1');

    const stateStack = buildCapabilityResolveState([...baselineRows, ...episodeRows], { atMs: NOW });
    const stateBaseline = buildCapabilityResolveState(baselineRows, { atMs: NOW });

    const stackEligible = new Set(LIB_ARRAY.filter(ex => isCapabilityEligible(stateStack, ex)).map(e => e.id));
    const baselineEligible = new Set(LIB_ARRAY.filter(ex => isCapabilityEligible(stateBaseline, ex)).map(e => e.id));

    // Stack semantics: exactly the intersection of the two states.
    const stateEpisodeOnly = buildCapabilityResolveState(episodeRows, { atMs: NOW });
    const episodeEligible = new Set(LIB_ARRAY.filter(ex => isCapabilityEligible(stateEpisodeOnly, ex)).map(e => e.id));
    const intersection = new Set([...baselineEligible].filter(id => episodeEligible.has(id)));
    expect(stackEligible).toEqual(intersection);

    // Ending the episode (confirmed endedAt in the SAME row set) restores
    // exactly the baseline eligible set.
    const endedEpisodeRows = episodeRows.map(r => ({ ...r, state: 'ended', endedAt: NOW - 1, endedReason: 'user_ended' }));
    const stateAfterEnd = buildCapabilityResolveState([...baselineRows, ...endedEpisodeRows], { atMs: NOW });
    const afterEnd = new Set(LIB_ARRAY.filter(ex => isCapabilityEligible(stateAfterEnd, ex)).map(e => e.id));
    expect(afterEnd).toEqual(baselineEligible);
  });

  test('multiple_sclerosis baseline (balance) + wrist_hand_loading episode', () => {
    const msProfile = CONDITION_PROFILES.find(p => p.id === 'multiple_sclerosis');
    const wristProfile = INJURY_PROFILES.find(p => p.id === 'wrist_hand_loading');

    expect(msProfile).toBeDefined();
    expect(wristProfile).toBeDefined();

    const baselineRules = profileToRules(msProfile);
    const episodeRules = profileToRules(wristProfile);

    const baselineRows = rulesToConstraintRows(baselineRules, CONSTRAINT_ROLE.BASELINE);
    const episodeRows = rulesToConstraintRows(episodeRules, CONSTRAINT_ROLE.EPISODE, 'eg1');

    const stateStack = buildCapabilityResolveState([...baselineRows, ...episodeRows], { atMs: NOW });
    const stateBaseline = buildCapabilityResolveState(baselineRows, { atMs: NOW });

    const stackEligible = new Set(LIB_ARRAY.filter(ex => isCapabilityEligible(stateStack, ex)).map(e => e.id));
    const baselineEligible = new Set(LIB_ARRAY.filter(ex => isCapabilityEligible(stateBaseline, ex)).map(e => e.id));

    // Stack semantics: exactly the intersection of the two states.
    const stateEpisodeOnly = buildCapabilityResolveState(episodeRows, { atMs: NOW });
    const episodeEligible = new Set(LIB_ARRAY.filter(ex => isCapabilityEligible(stateEpisodeOnly, ex)).map(e => e.id));
    const intersection = new Set([...baselineEligible].filter(id => episodeEligible.has(id)));
    expect(stackEligible).toEqual(intersection);

    // Ending the episode (confirmed endedAt in the SAME row set) restores
    // exactly the baseline eligible set.
    const endedEpisodeRows = episodeRows.map(r => ({ ...r, state: 'ended', endedAt: NOW - 1, endedReason: 'user_ended' }));
    const stateAfterEnd = buildCapabilityResolveState([...baselineRows, ...endedEpisodeRows], { atMs: NOW });
    const afterEnd = new Set(LIB_ARRAY.filter(ex => isCapabilityEligible(stateAfterEnd, ex)).map(e => e.id));
    expect(afterEnd).toEqual(baselineEligible);
  });
});

describe('directoryScenarioMatrix: laterality', () => {
  test('left-qualified bilateral_upper baseline permits unilateral-loadable exercises', () => {
    // One profile with laterality: upper_limb_difference
    const profileId = 'upper_limb_difference';
    const profile = CONDITION_PROFILES.find(p => p.id === profileId);

    expect(profile).toBeDefined();

    // Check that profile has bilateral_upper question with laterality possible
    const rules = profileToRules(profile);
    const hasBilateralUpper = rules.some(r => r.kind === 'demand' && r.value === 'bilateral_upper');
    expect(hasBilateralUpper).toBe(true);

    // Create a left-qualified bilateral_upper row
    const baselineRows = [
      {
        id: 'r0',
        userId: 'u',
        role: CONSTRAINT_ROLE.BASELINE,
        source: CONSTRAINT_SOURCE.SELF,
        ruleKind: CONSTRAINT_RULE_KIND.DEMAND,
        ruleValue: 'bilateral_upper',
        laterality: 'left',
        startsAt: NOW - 1,
        endsAt: null,
        state: 'active',
        endedAt: null,
        endedReason: null,
        episodeGroupId: null,
        deletedAt: null,
      },
    ];

    const state = buildCapabilityResolveState(baselineRows, { atMs: NOW });

    // Exercises that are unilateral loadable should be eligible
    const unilateralLoadable = LIB_ARRAY.filter(ex => ex.unilateralLoadable === true);
    for (const ex of unilateralLoadable) {
      expect(isCapabilityEligible(state, ex)).toBe(true);
    }

    // Exercises that require both arms should be ineligible
    const bilateralRequired = LIB_ARRAY.filter(ex => ex.bilateralUpper === true && ex.unilateralLoadable !== true);
    for (const ex of bilateralRequired) {
      expect(isCapabilityEligible(state, ex)).toBe(false);
    }
  });
});
