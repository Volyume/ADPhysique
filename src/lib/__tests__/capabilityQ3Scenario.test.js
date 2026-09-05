/**
 * CC27 GATE - the Audit A Q3 scenario (ROADMAP CC27 gate; bundle order
 * section 8).
 *
 * User: cannot stand; cannot access the floor; cannot use a conventional
 * bar grip. Generation must produce EITHER
 *   A. a fully capability-compatible useful plan, OR
 *   B. honest unresolved gaps (capability-classed blocked slots, thin-
 *      session flags, near misses) -
 * and must NEVER silently include an incompatible exercise. Both paths
 * are proven here against the REAL engine, the REAL seed library and the
 * REAL derivation, through the same resolution pipeline the app commits.
 */
const { generatePlan } = require('../planEngine');
const { filterLibraryForGeneration } = require('../exercise/generation');
const {
  resolvePlanAgainstLibrary, buildExerciseIndex, thinSessionReport,
} = require('../planAutoGen');
const { buildCapabilityResolveState, capabilityBlockReason, nearMissCandidates } = require('../capability/resolve');
const { CORPUS, corpusEntryToSeedRow } = require('../exerciseCorpus');

const NOW = 1_750_000_000_000;

// Re-anchored EL-14/EL-21 (exercise-library-expansion-2026-09-05): RAW no
// longer exists - corpusEntryToSeedRow is exactly the row seedExercises.js
// inserts (07-CORPUS-FORMAT.md section 4, demand metadata already merged
// in), retired stubs already excluded from CORPUS. `id` stays the exercise
// name to match this suite's pre-existing convention.
function realLibrary() {
  return CORPUS.map((entry) => ({ id: entry.name, ...corpusEntryToSeedRow(entry) }));
}

const LIBRARY = realLibrary();

const capRow = (ruleValue) => ({
  id: `c_${ruleValue}`, userId: 'u1', role: 'baseline', source: 'self',
  ruleKind: 'demand', ruleValue, laterality: null, startsAt: NOW - 1000,
  endsAt: null, state: 'active', endedAt: null, endedReason: null,
  episodeGroupId: null, deletedAt: null,
});

// The Q3 state: no standing, no floor, no conventional bar grip.
const Q3 = buildCapabilityResolveState(
  [capRow('standing'), capRow('floor_access'), capRow('grip_bar')],
  { atMs: NOW },
);

const intentState = (capability) => ({
  intents: new Map(), swaps: [], defaults: [], usage: new Map(),
  progression: new Map(), activeMesocycleId: null, unavailable: false, capability,
});

const INPUTS = {
  experience: 'intermediate', daysPerWeek: 3, sessionLengthMinutes: 60,
  equipment: 'full_gym', goal: 'bodybuilding', phase: 'maintain',
  weakPoints: [], recoveryRating: 'average', nutritionPhase: 'maintain',
};

function runPipeline(library) {
  const state = intentState(Q3);
  const filtered = filterLibraryForGeneration(library, state);
  const plan = generatePlan({ ...INPUTS, exerciseLibrary: filtered.library });
  const resolved = resolvePlanAgainstLibrary(plan, buildExerciseIndex(library), filtered);
  return { filtered, plan, resolved };
}

describe('PATH A - adequate library: a fully compatible, useful plan', () => {
  const { filtered, resolved } = runPipeline(LIBRARY);

  test('a compatible core exists AND every shortfall is visibly reported', () => {
    // The honest product truth at CC27: 49 of the then-551 seed rows were
    // Q3-compatible (now 79 of 918 post EL-14 corpus expansion; the pinned
    // floor below is the load-bearing contract, not the exact count), the
    // engine writes a compatible core (9 slots at CC27; floor pinned just
    // under) and everything else it wanted is REPORTED as blocked or missed
    // - the gate's "compatible plan or honest gaps", both at once. CC28's
    // curated seated/no-floor/grip-limited families exist precisely to
    // widen this core.
    expect(filtered.library.length).toBeGreaterThanOrEqual(40);
    expect(resolved.totalResolved).toBeGreaterThanOrEqual(8);
    expect(resolved.workouts.length).toBe(INPUTS.daysPerWeek);
    // The gaps are visible, never silent.
    expect(resolved.blockedSlots.length + resolved.missedCount).toBeGreaterThan(0);
  });

  test('NO written slot is capability-incompatible - the never-silently rule', () => {
    for (const w of resolved.workouts) {
      for (const ex of w.exercises) {
        const row = LIBRARY.find((e) => e.id === ex.exerciseId);
        expect(row).toBeTruthy();
        expect({ name: row.name, reason: capabilityBlockReason(Q3, row) })
          .toEqual({ name: row.name, reason: null });
      }
    }
  });

  test('anything the engine wanted that conflicts was BLOCKED with a capability class, not written', () => {
    for (const slot of resolved.blockedSlots) {
      expect(String(slot.reason)).toMatch(/^capability_/);
    }
    // And nothing blocked leaked into the written workouts.
    const writtenIds = new Set(resolved.workouts.flatMap((w) => w.exercises.map((e) => e.exerciseId)));
    for (const slot of resolved.blockedSlots) {
      expect(writtenIds.has(slot.exerciseId)).toBe(false);
    }
  });
});

describe('PATH B - no compatible quality option: honest gaps, never junk', () => {
  // Strip the library of every compatible quad option, so the quad slots
  // genuinely cannot be filled for this user.
  const gutted = LIBRARY.filter((e) => !(e.primaryMuscle === 'quads' && capabilityBlockReason(Q3, e) === null));
  const { resolved, plan } = runPipeline(gutted);

  test('quad slots come back as capability-classed gaps or are absent - never an incompatible fill', () => {
    for (const w of resolved.workouts) {
      for (const ex of w.exercises) {
        const row = gutted.find((e) => e.id === ex.exerciseId);
        if (row?.primaryMuscle === 'quads') {
          expect({ name: row.name, reason: capabilityBlockReason(Q3, row) })
            .toEqual({ name: row.name, reason: null });
        }
      }
    }
    // Whatever the engine asked for in quads either resolved compatibly
    // (impossible here), was reported blocked, or fell to the missed list -
    // all three are VISIBLE outcomes; silence is the only failure.
    const quadWritten = resolved.workouts.flatMap((w) => w.exercises)
      .map((ex) => gutted.find((e) => e.id === ex.exerciseId))
      .filter((r) => r?.primaryMuscle === 'quads');
    expect(quadWritten).toEqual([]);
  });

  test('the gaps carry the honest furniture: thin-session flags and near misses are derivable', () => {
    const thin = thinSessionReport(
      { workouts: resolved.workouts },
      resolved.blockedSlots,
    );
    // thinSessionReport only fires past a third; whether or not these
    // sessions cross it, the REPORT primitives must work on this state.
    expect(Array.isArray(thin)).toBe(true);
    const nm = nearMissCandidates(Q3, LIBRARY, { muscle: 'quads' });
    for (const c of nm) {
      expect(c.unknownAxes.length).toBeGreaterThan(0);
    }
  });

  test('the engine never invented a plan from nothing: the week still generates for other muscles', () => {
    expect(plan?.workouts?.length).toBe(INPUTS.daysPerWeek);
    expect(resolved.totalResolved).toBeGreaterThan(0);
  });
});
