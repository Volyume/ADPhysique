/**
 * CC33 D112 - W5 lead landing (closes audit findings T2-26 suspension
 * core, T1-10, T1-02, T2-10).
 *
 * T1-10, the review's capability blindness: block review never asked
 * whether the incumbent is capability-eligible AT ALL, and a STORED
 * review verdict outranked the fresh one unconditionally - so a
 * reviewed "keep" taken before a rule changed could retain a movement
 * the user cannot do, reported as "nothing about this has stopped
 * working". Pinned with the REAL applyContinuity: a stored KEEP of a
 * capability-ineligible incumbent falls through to the fresh verdict
 * (REPLACE / NO_LONGER_AUTO_ELIGIBLE); the user's stored REPLACE always
 * stands; stored keeps stand wherever capability has no objection.
 *
 * T2-26, the section 25 suspension: "just hold my plan" existed nowhere.
 * The core is pinned at source here (schema, writer, sync carry, coach
 * exclusions, the HowYouTrain valve, the cloud migration - applied to
 * production 2026-08-28); the serve-layer consumers landed in the W5
 * wrap-up once the W3A lane freed, and their behaviour pins (hold
 * genuinely holds; the conflict stays reported while the actionable
 * list empties) are the final describe block below.
 *
 * T1-02 / T2-10, the resolver door: the two remaining raw-library
 * suggestion/diff paths in this lane now pass the standard capability
 * question, and the division coverage line stops blaming equipment
 * alone for gaps the composed filter may have caused.
 */
const fs = require('fs');
const path = require('path');
const { applyContinuity, slotKey } = require('../exercise/continuity');
const { SLOT_VERDICT, SLOT_REASON } = require('../programmeEpoch');
const { buildCapabilityResolveState } = require('../capability/resolve');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');

describe('T1-10 - the stored review never outranks capability', () => {
  const GENERATED = [{ name: 'Lower A', exercises: [{ exerciseId: 'gen-hacksquat', exerciseName: 'Hack Squat' }] }];
  const INCUMBENT = [{ exerciseId: 'inc-squat', exerciseName: 'Barbell Back Squat', muscle: 'quads', family: 'squat' }];
  const familyOf = () => slotKey('quads', 'squat');

  const run = ({ stored = null, capabilityIneligible }) => applyContinuity({
    generated: GENERATED,
    incumbents: INCUMBENT,
    evidenceFor: () => ({ capabilityIneligible }),
    verdictFor: stored ? () => stored : null,
    familyOf,
    context: { epochBlocks: 0 },
    isRebuild: true,
  });

  test('a stored KEEP of a capability-ineligible incumbent falls to the fresh verdict', () => {
    const { workouts, decisions } = run({
      stored: { verdict: SLOT_VERDICT.KEEP, reason: 'still_productive' },
      capabilityIneligible: true,
    });
    expect(decisions[0].outcome).toBe('replaced');
    expect(decisions[0].reason).toBe(SLOT_REASON.CAPABILITY_EXCLUDED);
    expect(workouts[0].exercises[0].exerciseId).toBe('gen-hacksquat');
  });

  test("the user's stored REPLACE always stands - their word", () => {
    const { decisions } = run({
      stored: { verdict: SLOT_VERDICT.REPLACE, reason: SLOT_REASON.USER_SWAPPED_AWAY },
      capabilityIneligible: true,
    });
    expect(decisions[0].outcome).toBe('replaced');
    expect(decisions[0].reason).toBe(SLOT_REASON.USER_SWAPPED_AWAY);
  });

  test('a stored KEEP with no capability objection stands exactly as before', () => {
    const { workouts, decisions } = run({
      stored: { verdict: SLOT_VERDICT.KEEP, reason: 'still_productive' },
      capabilityIneligible: false,
    });
    expect(decisions[0].outcome).toBe('retained');
    expect(workouts[0].exercises[0].exerciseId).toBe('inc-squat');
  });

  test('with no stored verdict the fresh path replaces the ineligible incumbent too', () => {
    const { decisions } = run({ stored: null, capabilityIneligible: true });
    expect(decisions[0].outcome).toBe('replaced');
    expect(decisions[0].reason).toBe(SLOT_REASON.CAPABILITY_EXCLUDED);
  });

  test('a stored KEEP of a merely obscure-NAMED lift stands - the gate keys on capability, never the shared autoEligible seam', () => {
    // The T1-08 root fix caught a regression in this very gate: keyed on
    // autoEligible === false, it also overrode stored keeps of lifts that
    // had only lost NAME-based auto-eligibility, against R4 (the user's
    // word). The precise field closes that.
    const { decisions } = applyContinuity({
      generated: GENERATED,
      incumbents: INCUMBENT,
      evidenceFor: () => ({ autoEligible: false, capabilityIneligible: false }),
      verdictFor: () => ({ verdict: SLOT_VERDICT.KEEP, reason: 'still_productive' }),
      familyOf,
      context: { epochBlocks: 0 },
      isRebuild: true,
    });
    expect(decisions[0].outcome).toBe('retained');
  });

  test('blockAdvisor supplies the answer through the PRECISE field, fail-safe, at source', () => {
    const src = read('lib/blockAdvisor.js');
    // F2 (adversarial review): the review judges LIBRARY-resolved rows
    // (the routine rows carry no demand columns) and keys REPLACE on a
    // DEFINITE blocking conflict only - suggestion eligibility
    // (isCapabilityEligible) treats unknown as not-suggestable, which is
    // right for generation and wrong for replacing a trained incumbent.
    expect(src).toContain('rowById.set(ex.id, libraryById.get(ex.id) ?? ex);');
    // Round 18 (R18-2): the baseline question asked of the baseline
    // list itself - the old blockingConflicts-minus-affected proxy let
    // a held/declined episode rule veto a live baseline replace.
    expect(src).toContain('baselineConflicts(intentState.capability, row).some((c) => !c.unknown)');
    expect(src).toMatch(/catch \(_e\) { capabilityIneligible = false; }/);
    // The shared name-based seam stays deliberately unconsulted at review.
    expect(src).toContain('autoEligible: undefined,');
  });

  test('the whole chain speaks capability at source: evidence, verdict, rationale', () => {
    // R2-1 keyed the field on DEFINITE conflicts; round 18 (R18-2) on
    // the definite BASELINE fact alone (see
    // planRationale.capabilityLaneStop.guard for the full split).
    expect(read('lib/planAutoGen.js')).toContain('capabilityIneligible: capBaselineBlocked,');
    expect(read('lib/programmeEpoch.js')).toContain("CAPABILITY_EXCLUDED: 'capability_excluded',");
    expect(read('lib/planRationale.js')).toContain("'This sits outside how you train.'");
  });
});

describe('T2-26 - the suspension core exists (section 25)', () => {
  test('the local schema, row mapping and writer', () => {
    const db = read('lib/database.js');
    expect(db).toContain("ALTER TABLE capability_constraints ADD COLUMN adaptation_mode TEXT CHECK (adaptation_mode IN ('propose','hold'))");
    expect(db).toContain('adaptationMode: r.adaptation_mode ?? null,');
    const writer = db.match(/export async function setCapabilityAdaptationMode[\s\S]{0,900}/)?.[0] ?? '';
    expect(writer).toContain("state = 'active' AND deleted_at IS NULL");
    // 'propose' stores as NULL, so reset rows equal pre-migration rows.
    expect(writer).toContain("mode === 'hold' ? 'hold' : null");
  });

  test('a held row rides the resolver state untouched', () => {
    const NOW = 1_750_000_000_000;
    const s = buildCapabilityResolveState([{
      id: 'c1', userId: 'u1', role: 'episode', source: 'self', ruleKind: 'demand',
      ruleValue: 'standing', laterality: null, startsAt: NOW - 1000, endsAt: null,
      state: 'active', endedAt: null, endedReason: null, episodeGroupId: 'ep1',
      deletedAt: null, adaptationMode: 'hold',
    }], { atMs: NOW });
    expect(s.restrictions[0].adaptationMode).toBe('hold');
  });

  test('sync: adaptation_mode travels UNCONDITIONALLY - a resumed hold pushes its NULL (F3)', async () => {
    // CC33 adversarial review F3, converted from the source-string pin
    // that let the defect ship: the old some()-gated carry omitted the
    // key when the LAST held episode was resumed (every local value
    // NULL), so the cloud kept 'hold' and the other device silently
    // re-applied it. This drives the real push with a resumed-hold local
    // set and asserts what actually leaves the device: every row carries
    // the adaptation_mode key, value null.
    jest.resetModules();
    jest.doMock('../database', () => ({
      getAllCapabilityConstraintsForUser: jest.fn().mockResolvedValue([{
        id: 'c1', role: 'episode', source: 'self', ruleKind: 'demand',
        ruleValue: 'standing', laterality: null, startsAt: 1, endsAt: null,
        state: 'active', endedAt: null, endedReason: null, episodeGroupId: 'ep1',
        acknowledgedAt: null, effectiveChoice: 'applied',
        adaptationMode: null, // the resume: hold cancelled, stored as NULL
        createdAt: 1, updatedAt: 2, deletedAt: null,
      }]),
    }));
    let captured = null;
    const sb = {
      from: () => ({
        upsert: (rows) => { captured = rows; return Promise.resolve({ error: null }); },
      }),
    };
    // eslint-disable-next-line global-require
    const { pushCapabilityConstraints } = require('../sync/tables/capabilityConstraints');
    const res = await pushCapabilityConstraints(sb, { userId: 'cloud-u', localUserId: 'local-u' });
    jest.dontMock('../database');
    expect(res.errors).toBe(0);
    expect(captured).toHaveLength(1);
    expect(Object.prototype.hasOwnProperty.call(captured[0], 'adaptation_mode')).toBe(true);
    expect(captured[0].adaptation_mode).toBeNull();
    // And the applier still lands the value on pull.
    const db = read('lib/database.js');
    const applier = db.match(/export async function insertCapabilityConstraintFromCloud[\s\S]{0,1600}/)?.[0] ?? '';
    expect(applier).toContain('adaptation_mode');
    expect(applier).toContain('row.adaptation_mode ?? null');
  });

  test('held episodes drive no coach holds, no affected fact, no subject', () => {
    const screen = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'CoachOutputScreen.js'), 'utf8');
    const scans = screen.match(/r\.role === 'episode' && r\.adaptationMode !== 'hold'/g) ?? [];
    expect(scans.length).toBe(3);
  });

  test('the HowYouTrain valve: hold and resume, in plain words', () => {
    const screen = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'HowYouTrainScreen.js'), 'utf8');
    expect(screen).toContain("label=\"Hold my plan as-is\"");
    expect(screen).toContain("label=\"Work around it again\"");
    expect(screen).toContain('Holding your plan as-is; adaptation is paused, not your training');
    expect(screen).toContain("setEpisodeAdaptationMode(userId, ep.groupId, 'hold')");
    expect(screen).toContain("setEpisodeAdaptationMode(userId, ep.groupId, 'propose')");
  });

  test('the cloud migration is guarded and its applied record matches reality', () => {
    // Applied to production 2026-08-28 on the founder's named
    // confirmation, minutes after being written - this pin moved from
    // "recorded as not applied" to "recorded as applied" the same day,
    // so file, README and live schema never disagree (the exact
    // stale-comment defect the audit found on migrate_149's comments).
    const sql = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'supabase', 'migrate_152_capability_adaptation_mode.sql'), 'utf8');
    expect(sql).toContain('IF NOT EXISTS');
    expect(sql).toContain("CHECK (adaptation_mode IN ('propose', 'hold'))");
    expect(sql).toContain('APPLIED 2026-08-28');
    const readme = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'supabase', 'README.md'), 'utf8');
    expect(readme).toContain('migrate_152_capability_adaptation_mode.sql');
    expect(readme).toContain('YES - APPLIED 2026-08-28');
  });
});

describe('T1-02 / T2-10 - the remaining raw-library paths in this lane', () => {
  test('ExerciseDetail similar-exercises passes the capability question', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'ExerciseDetailScreen.js'), 'utf8');
    expect(src).toContain('isCapabilityEligible(capState, row)');
    expect(src).toContain('rankSwaps(ex, pool,');
  });

  test('the heatmap fingerprint recomputes through the SAME generation filter, block-scoped, honest on failure', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'VolumeHeatmapScreen.js'), 'utf8');
    expect(src).toContain('filterLibraryForGeneration(allExercises, scoped).library');
    expect(src).toContain('exerciseLibrary: generationLibrary');
    // Round 7 (R6-1's class, one consumer along): the SCOPED loader, so
    // a block-scoped avoidance is live here exactly as it was for the
    // generation this line claims to recompute.
    expect(src).toContain('loadScopedIntentState(user.id)');
    expect(src).not.toContain('loadExerciseIntentState(user.id, {})');
    // Round 8 (A1): an unavailable lane read renders NO markers - never
    // a raw-library recompute of a generation never built - and the
    // recompute carries generation's structure and canonical-name
    // inputs through generation's own exported paths.
    expect(src).toContain('if (!scoped || scoped.unavailable || scoped.capability?.unavailable) {');
    expect(src).toContain('canonicalNames: canonicalNameSet(allExercises),');
    expect(src).toContain('demonstratedStructure: await readDemonstratedStructure(user.id, inputs?.daysPerWeek),');
  });

  test('R7-2: T1-02\'s SECOND named path - RoutineDetailScreen\'s divisionDiff/coverage - is rerouted too', () => {
    // The design ruling (CC33-R2) said "both divisionDiff raw paths";
    // rounds 1-6 pinned only the heatmap's, and this screen kept
    // handing the engine the raw library - its fingerprint described a
    // plan generation never built, and its coverage line named "how you
    // train" as a cause it never checked.
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'RoutineDetailScreen.js'), 'utf8');
    expect(src).toContain('generationLibrary = filterLibraryForGeneration(all, scoped).library;');
    expect(src).toContain('computeDivisionDiff({ ...inputs, ...extras, exerciseLibrary: generationLibrary })');
    expect(src).toContain('computeDivisionCoverage({ ...inputs, ...extras, exerciseLibrary: generationLibrary })');
    expect(src).not.toMatch(/computeDivision(Diff|Coverage)\(\{ \.\.\.inputs, exerciseLibrary: all \}\)/);
    // Round 8 (A1): unavailable-lane honesty + generation's other inputs.
    expect(src).toContain('if (!scoped || scoped.unavailable || scoped.capability?.unavailable) {');
    expect(src).toContain('canonicalNames: canonicalNameSet(all),');
  });

  test('the coverage line no longer blames equipment alone', () => {
    const src = read('lib/divisionDiff.js');
    expect(src).not.toContain('your equipment has nothing that trains');
    expect(src).toContain('nothing that fits your equipment and how you train covers');
  });
});

describe('D112 R2 - the resolver door stays shut (regression guard)', () => {
  test('every divisionDiff/coverage caller passes a generation-filtered library, never the raw one (R7-2 widening)', () => {
    // The rankSwaps guard below missed the divisionDiff class entirely
    // - a screen can hand the engine the raw library through
    // computeDivisionDiff/computeDivisionCoverage too. Any screen
    // calling either must also call filterLibraryForGeneration.
    const screensDir = path.join(__dirname, '..', '..', 'screens');
    const offenders = [];
    for (const f of fs.readdirSync(screensDir)) {
      if (!f.endsWith('.js')) continue;
      const src = fs.readFileSync(path.join(screensDir, f), 'utf8');
      if (!/\bcomputeDivision(Diff|Coverage)\(/.test(src)) continue;
      if (!/filterLibraryForGeneration/.test(src)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  test('no suggestion surface ranks the raw library: every rankSwaps caller filters', () => {
    // The guard that keeps T2-10 closed: any screen calling rankSwaps
    // must pass a capability-filtered pool (isCapabilityEligible) or go
    // through rankPersonalised (which asks the senior question per
    // candidate). A new unfiltered call site fails here by name.
    const screensDir = path.join(__dirname, '..', '..', 'screens');
    const offenders = [];
    for (const f of fs.readdirSync(screensDir)) {
      if (!f.endsWith('.js')) continue;
      const src = fs.readFileSync(path.join(screensDir, f), 'utf8');
      if (!/\brankSwaps\(/.test(src)) continue;
      if (!/isCapabilityEligible|rankPersonalised/.test(src)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});

describe('T2-26 - hold genuinely holds (the effective layer, real engine)', () => {
  const { computeEffectiveSession, computeCompletionEffects, episodeConflicts, actionableEpisodeConflicts } = require('../capability/effective');
  const NOW = 1_750_000_000_000;
  const SQUAT = { id: 'ex-squat', name: 'Barbell Back Squat', primaryMuscle: 'quads', position: 'standing', floorAccess: 0, overheadPosition: 0, gripDemand: 'bar', unilateralLoadable: 0, bilateralUpper: 1, bilateralLower: 1, axialLoad: 1, impact: 0, balanceDemand: 'stable' };
  const LEGPRESS = { id: 'ex-legpress', name: 'Leg Press', primaryMuscle: 'quads', position: 'seated', floorAccess: 0, overheadPosition: 0, gripDemand: 'supportive', unilateralLoadable: null, bilateralUpper: 0, bilateralLower: 1, axialLoad: 0, impact: 0, balanceDemand: 'supported' };
  const heldState = (adaptationMode) => buildCapabilityResolveState([{
    id: 'c1', userId: 'u1', role: 'episode', source: 'self', ruleKind: 'demand',
    ruleValue: 'standing', laterality: null, startsAt: NOW - 1000, endsAt: null,
    state: 'active', endedAt: null, endedReason: null, episodeGroupId: 'ep1',
    deletedAt: null, effectiveChoice: 'applied', adaptationMode,
  }], { atMs: NOW });

  test('a held APPLIED episode serves the base row unchanged - no substitution, no conflicted marker', () => {
    const view = computeEffectiveSession([{ exercise: SQUAT }], [SQUAT, LEGPRESS], heldState('hold'), () => true);
    expect(view.lines[0].effect).toBe('unchanged');
    expect(view.anyEffect).toBe(false);
  });

  test('the same rule un-held substitutes - hold is the only difference', () => {
    const view = computeEffectiveSession([{ exercise: SQUAT }], [SQUAT, LEGPRESS], heldState(null), () => true);
    expect(view.lines[0].effect).toBe('substituted');
  });

  test('a held episode excuses nothing at completion', () => {
    const { entries, excusedIds } = computeCompletionEffects([{ exercise: SQUAT, performed: false }], heldState('hold'));
    expect(entries).toEqual([]);
    expect(excusedIds).toEqual([]);
  });

  test('the conflict is still REPORTED (episodeConflicts) while the actionable list is empty - surfaces can say "you are holding this"', () => {
    const s = heldState('hold');
    expect(episodeConflicts(s, SQUAT).length).toBeGreaterThan(0);
    expect(actionableEpisodeConflicts(s, SQUAT)).toEqual([]);
  });
});
