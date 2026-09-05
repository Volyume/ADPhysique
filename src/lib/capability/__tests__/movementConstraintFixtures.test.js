/**
 * Phase H: movement constraint fixtures (order section 16).
 *
 * Nine independent fixture tests driving through demandAxisConflict +
 * family matching over the derived library. Each fixture represents a
 * specific movement constraint scenario.
 */

const { buildCapabilityResolveState, isCapabilityEligible } = require('../resolve');
const { deriveExerciseMetadata } = require('../../exerciseMetadata');
const { deriveDemandMetadata } = require('../demands');
const { CONSTRAINT_RULE_KIND, CONSTRAINT_SOURCE, CONSTRAINT_ROLE } = require('../model');
const { CORPUS } = require('../../exerciseCorpus');

const NOW = 1_750_000_000_000;

// ── Library derivation ──────────────────────────────────────────────────────
// Re-anchored EL-14 (exercise-library-expansion-2026-09-05): this used to
// regex-parse seedExercises.js's RAW tuple and SUBREGION_MAP text
// directly. Both are gone — the corpus is the source of truth.

function realLibraryByName() {
  const out = new Map();
  for (const entry of CORPUS) {
    const base = {
      name: entry.name, primaryMuscle: entry.primaryMuscle, equipment: entry.equipment,
      movementPattern: entry.movementPattern,
      compoundIsolation: entry.compound ? 'compound' : 'isolation',
    };
    out.set(entry.name, {
      id: entry.name, ...base, subregion: entry.subregion ?? null,
      ...deriveExerciseMetadata(base), ...deriveDemandMetadata(base),
    });
  }
  return out;
}

const LIB = realLibraryByName();
const LIB_ARRAY = Array.from(LIB.values());

// ── Helper: find exercise by name ───────────────────────────────────────────

function findByName(name) {
  return LIB_ARRAY.find(ex => ex.name === name);
}

// ── Helper: build state from demand rules ──────────────────────────────────

function stateFromDemands(demands, allowances = []) {
  const rows = demands.map((d, i) => ({
    id: `r${i}`,
    userId: 'u',
    role: CONSTRAINT_ROLE.BASELINE,
    source: CONSTRAINT_SOURCE.SELF,
    ruleKind: CONSTRAINT_RULE_KIND.DEMAND,
    ruleValue: d,
    laterality: null,
    startsAt: NOW - 1,
    endsAt: null,
    state: 'active',
    endedAt: null,
    endedReason: null,
    episodeGroupId: null,
    deletedAt: null,
  }));

  for (const allow of allowances) {
    rows.push({
      id: `allow_${allow}`,
      userId: 'u',
      role: CONSTRAINT_ROLE.BASELINE,
      source: CONSTRAINT_SOURCE.SELF,
      ruleKind: CONSTRAINT_RULE_KIND.EXERCISE_ALLOW,
      ruleValue: allow,
      laterality: null,
      startsAt: NOW - 1,
      endsAt: null,
      state: 'active',
      endedAt: null,
      endedReason: null,
      episodeGroupId: null,
      deletedAt: null,
    });
  }

  return buildCapabilityResolveState(rows, { atMs: NOW });
}

// ── Helper: build state from family rules ──────────────────────────────────

function stateFromFamilies(families) {
  const rows = families.map((f, i) => ({
    id: `r${i}`,
    userId: 'u',
    role: CONSTRAINT_ROLE.BASELINE,
    source: CONSTRAINT_SOURCE.SELF,
    ruleKind: CONSTRAINT_RULE_KIND.FAMILY,
    ruleValue: f,
    laterality: null,
    startsAt: NOW - 1,
    endsAt: null,
    state: 'active',
    endedAt: null,
    endedReason: null,
    episodeGroupId: null,
    deletedAt: null,
  }));

  return buildCapabilityResolveState(rows, { atMs: NOW });
}

// ── Fixtures ────────────────────────────────────────────────────────────────

describe('movementConstraintFixtures', () => {
  test('1. overhead restricted: Barbell Overhead Press conflicts, Barbell Bench Press eligible', () => {
    const state = stateFromDemands(['overhead_position']);

    const overheadPress = findByName('Barbell Overhead Press');
    const benchPress = findByName('Barbell Bench Press');

    expect(overheadPress).toBeDefined();
    expect(benchPress).toBeDefined();

    expect(isCapabilityEligible(state, overheadPress)).toBe(false);
    expect(isCapabilityEligible(state, benchPress)).toBe(true);
  });

  test('2. horizontal press problematic (flat+incline+decline families): Barbell Bench Press blocked, Neutral Grip Pull-Up eligible', () => {
    const state = stateFromFamilies(['flat', 'incline', 'decline']);

    const benchPress = findByName('Barbell Bench Press');
    const pullUp = findByName('Neutral Grip Pull-Up');

    expect(benchPress).toBeDefined();
    expect(pullUp).toBeDefined();

    expect(isCapabilityEligible(state, benchPress)).toBe(false);
    expect(isCapabilityEligible(state, pullUp)).toBe(true);
  });

  test('3. loaded elbow flexion (curl families): Dumbbell Curl blocked, Machine Chest Press eligible', () => {
    const state = stateFromFamilies(['short_head', 'long_head', 'brachialis']);

    const dbCurl = findByName('Dumbbell Curl');
    const machinePress = findByName('Machine Chest Press');

    expect(dbCurl).toBeDefined();
    expect(machinePress).toBeDefined();

    expect(isCapabilityEligible(state, dbCurl)).toBe(false);
    expect(isCapabilityEligible(state, machinePress)).toBe(true);
  });

  test('4. bar grip restricted: Deadlift conflicts, Leg Press eligible (supportive), plus allowance restores one', () => {
    const state = stateFromDemands(['grip_bar']);

    const deadlift = findByName('Conventional Deadlift');
    const legPress = findByName('Leg Press');

    expect(deadlift).toBeDefined();
    expect(legPress).toBeDefined();

    expect(isCapabilityEligible(state, deadlift)).toBe(false);
    expect(isCapabilityEligible(state, legPress)).toBe(true);

    // Allowance re-admits Deadlift
    const stateWithAllow = stateFromDemands(['grip_bar'], ['Conventional Deadlift']);
    expect(isCapabilityEligible(stateWithAllow, deadlift)).toBe(true);
  });

  test('5. axial restricted: Barbell Back Squat conflicts, Leg Press eligible', () => {
    const state = stateFromDemands(['axial_load']);

    const squat = findByName('Barbell Back Squat');
    const legPress = findByName('Leg Press');

    expect(squat).toBeDefined();
    expect(legPress).toBeDefined();

    expect(isCapabilityEligible(state, squat)).toBe(false);
    expect(isCapabilityEligible(state, legPress)).toBe(true);
  });

  test('6. deep hip flexion (squat_press + flexion families): squats and Hanging Knee Raise blocked, Romanian Deadlift eligible', () => {
    const state = stateFromFamilies(['squat_press', 'flexion']);

    const squat = findByName('Barbell Back Squat');
    const legPress = findByName('Leg Press');
    const hangingKneeRaise = findByName('Hanging Knee Raise');
    const rdl = findByName('Romanian Deadlift');

    // Both squat_press family exercises should be blocked
    expect(squat).toBeDefined();
    expect(isCapabilityEligible(state, squat)).toBe(false);
    expect(legPress).toBeDefined();
    expect(isCapabilityEligible(state, legPress)).toBe(false);
    expect(hangingKneeRaise).toBeDefined();
    expect(isCapabilityEligible(state, hangingKneeRaise)).toBe(false);

    // RDL should be eligible (spinal erector family)
    expect(rdl).toBeDefined();
    expect(isCapabilityEligible(state, rdl)).toBe(true);
  });

  test('7. deep knee flexion (squat_press + knee_flexion + knee_extension families): Leg Press and Lying Leg Curl and Leg Extension blocked, Barbell Hip Thrust eligible', () => {
    const state = stateFromFamilies(['squat_press', 'knee_flexion', 'knee_extension']);

    const legPress = findByName('Leg Press');
    const legCurl = findByName('Lying Leg Curl');
    const legExt = findByName('Leg Extension');
    const hipThrust = findByName('Barbell Hip Thrust');

    expect(legPress).toBeDefined();
    expect(isCapabilityEligible(state, legPress)).toBe(false);
    expect(legCurl).toBeDefined();
    expect(isCapabilityEligible(state, legCurl)).toBe(false);
    expect(legExt).toBeDefined();
    expect(isCapabilityEligible(state, legExt)).toBe(false);

    // Hip thrust is hip extension, not blocked by these families
    expect(hipThrust).toBeDefined();
    expect(isCapabilityEligible(state, hipThrust)).toBe(true);
  });

  test('8. dorsiflexion-limited squat pattern (squat_press family + allowances): family blocked, allowance re-admits Leg Press for that user', () => {
    const state = stateFromFamilies(['squat_press']);

    const legPress = findByName('Leg Press');
    const squat = findByName('Barbell Back Squat');

    // Both should be blocked initially
    expect(legPress).toBeDefined();
    expect(isCapabilityEligible(state, legPress)).toBe(false);
    expect(squat).toBeDefined();
    expect(isCapabilityEligible(state, squat)).toBe(false);

    // Allowance for Leg Press restores it
    // Manually add allowance
    const rowsWithAllow = [
      {
        id: 'r0',
        userId: 'u',
        role: CONSTRAINT_ROLE.BASELINE,
        source: CONSTRAINT_SOURCE.SELF,
        ruleKind: CONSTRAINT_RULE_KIND.FAMILY,
        ruleValue: 'squat_press',
        laterality: null,
        startsAt: NOW - 1,
        endsAt: null,
        state: 'active',
        endedAt: null,
        endedReason: null,
        episodeGroupId: null,
        deletedAt: null,
      },
      {
        id: 'allow_legpress',
        userId: 'u',
        role: CONSTRAINT_ROLE.BASELINE,
        source: CONSTRAINT_SOURCE.SELF,
        ruleKind: CONSTRAINT_RULE_KIND.EXERCISE_ALLOW,
        ruleValue: 'Leg Press',
        laterality: null,
        startsAt: NOW - 1,
        endsAt: null,
        state: 'active',
        endedAt: null,
        endedReason: null,
        episodeGroupId: null,
        deletedAt: null,
      },
    ];
    const stateAllow = buildCapabilityResolveState(rowsWithAllow, { atMs: NOW });

    expect(legPress).toBeDefined();
    expect(isCapabilityEligible(stateAllow, legPress)).toBe(true);
  });

  test('9. unilateral stack: baseline left bilateral_upper + episode right grip_bar', () => {
    // Left bilateral_upper constraint
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

    // Right grip_bar constraint as episode
    const episodeRows = [
      {
        id: 'r1',
        userId: 'u',
        role: CONSTRAINT_ROLE.EPISODE,
        source: CONSTRAINT_SOURCE.SELF,
        ruleKind: CONSTRAINT_RULE_KIND.DEMAND,
        ruleValue: 'grip_bar',
        laterality: 'right',
        startsAt: NOW - 1,
        endsAt: null,
        state: 'active',
        endedAt: null,
        endedReason: null,
        episodeGroupId: 'eg1',
        deletedAt: null,
      },
    ];

    const state = buildCapabilityResolveState([...baselineRows, ...episodeRows], { atMs: NOW });

    // Single-Arm Cable Row is unilateral and should stay eligible (side-carved)
    const singleArmRow = findByName('Single-Arm Cable Row');
    expect(singleArmRow).toBeDefined();
    expect(isCapabilityEligible(state, singleArmRow)).toBe(true);

    // Barbell Bench Press requires both arms with bar grip, conflicts
    const benchPress = findByName('Barbell Bench Press');
    expect(benchPress).toBeDefined();
    expect(isCapabilityEligible(state, benchPress)).toBe(false);
  });
});
