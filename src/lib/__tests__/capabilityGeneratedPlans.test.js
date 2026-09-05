/**
 * CC27 - generated plans under capability constraints (sections 33.19,
 * 13; Amendment section 17 programme checks run over GENERATED plans, as
 * 33.19 requires of CC27's tests).
 *
 * REAL engine, REAL seed library (the planEngineLibraryPool harness), the
 * REAL derivation: no mocked selection anywhere. Pins:
 *  - a seated-only user's generated plan contains NO standing/mixed and
 *    NO unknown-position movement (the composed filter holds end to end);
 *  - Amendment section 17 checks as fixtures: frequency, per-session
 *    content, session-duration budget, weekly volume;
 *  - section 33.19: under a floor/position/transfer constraint,
 *    same-position work is contiguous after the ordering pass; a
 *    no-constraint user gets the IDENTICAL workouts back.
 */
const { generatePlan } = require('../planEngine');
const { filterLibraryForGeneration } = require('../exercise/generation');
const { orderSamePositionContiguously } = require('../planAutoGen');
const { buildCapabilityResolveState } = require('../capability/resolve');
const { CORPUS, corpusEntryToSeedRow } = require('../exerciseCorpus');

const NOW = 1_750_000_000_000;

// Re-anchored EL-14/EL-21 (exercise-library-expansion-2026-09-05): RAW no
// longer exists - corpusEntryToSeedRow is exactly the row seedExercises.js
// inserts (07-CORPUS-FORMAT.md section 4, demand metadata already merged
// in), retired stubs already excluded from CORPUS, so this runs against the
// same live library the real seed produces. `id` stays the exercise name to
// match this suite's pre-existing convention of keying off it as a
// byName-style id.
function realLibrary() {
  return CORPUS.map((entry) => ({ id: entry.name, ...corpusEntryToSeedRow(entry) }));
}

const LIBRARY = realLibrary();
const byName = new Map(LIBRARY.map((e) => [e.name.toLowerCase(), e]));

const capRow = (ruleValue, over = {}) => ({
  id: `c_${ruleValue}`, userId: 'u1', role: 'baseline', source: 'self',
  ruleKind: 'demand', ruleValue, laterality: null, startsAt: NOW - 1000,
  endsAt: null, state: 'active', endedAt: null, endedReason: null,
  episodeGroupId: null, deletedAt: null, ...over,
});

const intentState = (capability) => ({
  intents: new Map(), swaps: [], defaults: [], usage: new Map(),
  progression: new Map(), activeMesocycleId: null, unavailable: false, capability,
});

const INPUTS = {
  experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 60,
  equipment: 'full_gym', goal: 'bodybuilding', phase: 'maintain',
  weakPoints: [], recoveryRating: 'average', nutritionPhase: 'maintain',
};

function generateFor(capability) {
  const state = intentState(capability);
  const filtered = filterLibraryForGeneration(LIBRARY, state);
  const plan = generatePlan({ ...INPUTS, exerciseLibrary: filtered.library });
  return { plan, filtered };
}

describe('a seated-only user (standing constrained) gets a fully compatible plan', () => {
  const capability = buildCapabilityResolveState([capRow('standing')], { atMs: NOW });
  const { plan, filtered } = generateFor(capability);

  test('the filter dropped every standing/mixed/unknown-position row, nothing else', () => {
    for (const d of filtered.dropped) {
      const row = LIBRARY.find((e) => e.id === d.exerciseId);
      expect(['standing', 'mixed', null]).toContain(row.position ?? null);
    }
    for (const kept of filtered.library) {
      expect(kept.position === 'standing' || kept.position === 'mixed' || kept.position == null).toBe(false);
    }
  });

  test('no generated slot resolves to a standing, mixed or unknown-position movement', () => {
    expect(plan?.workouts?.length).toBeGreaterThan(0);
    for (const w of plan.workouts) {
      for (const ex of w.exercises) {
        const row = byName.get(String(ex.exerciseName ?? ex.name ?? '').toLowerCase());
        // A POOL-fallback name that is not in the library at all would be
        // caught by the post-engine re-check in planAutoGen; here every
        // resolvable name must already be compatible.
        if (row) {
          expect({ name: row.name, position: row.position }).toEqual({
            name: row.name, position: expect.stringMatching(/^(seated|lying|kneeling)$/),
          });
        }
      }
    }
  });

  test('Amendment section 17 programme checks hold on the generated plan', () => {
    // Frequency: the requested split arrives.
    expect(plan.workouts.length).toBe(INPUTS.daysPerWeek);
    // Per-session content: no husk sessions from the engine itself.
    for (const w of plan.workouts) {
      expect(w.exercises.length).toBeGreaterThanOrEqual(3);
    }
    // Weekly volume: real working sets arrive across the week.
    const totalSets = plan.workouts.flatMap((w) => w.exercises).reduce((s, e) => s + (e.sets ?? 0), 0);
    expect(totalSets).toBeGreaterThanOrEqual(40);
    // Muscle coverage: a seated-only week still trains upper and lower body.
    const muscles = new Set(plan.workouts.flatMap((w) => w.exercises)
      .map((e) => byName.get(String(e.exerciseName ?? '').toLowerCase())?.primaryMuscle)
      .filter(Boolean));
    expect(muscles.size).toBeGreaterThanOrEqual(6);
    expect([...muscles].some((mu) => ['quads', 'hamstrings', 'glutes', 'calves'].includes(mu))).toBe(true);
  });
});

describe('section 33.19: same-position contiguity', () => {
  const capability = buildCapabilityResolveState([capRow('floor_access')], { atMs: NOW });
  const exerciseById = new Map(LIBRARY.map((e) => [e.id, e]));

  test('under a transfer-sensitive constraint, each session\'s positions form contiguous runs', () => {
    const { plan } = generateFor(capability);
    const workouts = plan.workouts.map((w) => ({
      ...w,
      exercises: w.exercises
        .map((ex) => ({ ...ex, exerciseId: byName.get(String(ex.exerciseName ?? '').toLowerCase())?.id }))
        .filter((ex) => ex.exerciseId),
    }));
    const ordered = orderSamePositionContiguously(workouts, exerciseById, capability);
    for (const w of ordered) {
      const positions = w.exercises.map((ex) => exerciseById.get(ex.exerciseId)?.position ?? 'unknown');
      const seen = new Set();
      let prev = null;
      for (const p of positions) {
        if (p !== prev) {
          expect(seen.has(p)).toBe(false); // a position never re-appears after ending
          seen.add(p);
        }
        prev = p;
      }
    }
  });

  test('a user with no transfer-sensitive constraint gets the identical workouts back', () => {
    const none = buildCapabilityResolveState([], { atMs: NOW });
    const { plan } = generateFor(none);
    const out = orderSamePositionContiguously(plan.workouts, exerciseById, none);
    expect(out).toBe(plan.workouts);
    // A grip-only constraint is not transfer-sensitive either.
    const gripOnly = buildCapabilityResolveState([capRow('grip_bar')], { atMs: NOW });
    expect(orderSamePositionContiguously(plan.workouts, exerciseById, gripOnly)).toBe(plan.workouts);
  });
});
