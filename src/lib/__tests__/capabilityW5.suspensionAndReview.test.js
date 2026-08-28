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
 * exclusions, the HowYouTrain valve, the WRITTEN-not-applied cloud
 * migration); the serve-time consumer edits land in the W5 wrap-up
 * (deferred while the W3 builders hold those files) and get their pins
 * there.
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

  const run = ({ stored = null, autoEligible }) => applyContinuity({
    generated: GENERATED,
    incumbents: INCUMBENT,
    evidenceFor: () => ({ autoEligible }),
    verdictFor: stored ? () => stored : null,
    familyOf,
    context: { epochBlocks: 0 },
    isRebuild: true,
  });

  test('a stored KEEP of a capability-ineligible incumbent falls to the fresh verdict', () => {
    const { workouts, decisions } = run({
      stored: { verdict: SLOT_VERDICT.KEEP, reason: 'still_productive' },
      autoEligible: false,
    });
    expect(decisions[0].outcome).toBe('replaced');
    expect(decisions[0].reason).toBe(SLOT_REASON.NO_LONGER_AUTO_ELIGIBLE);
    expect(workouts[0].exercises[0].exerciseId).toBe('gen-hacksquat');
  });

  test("the user's stored REPLACE always stands - their word", () => {
    const { decisions } = run({
      stored: { verdict: SLOT_VERDICT.REPLACE, reason: SLOT_REASON.USER_SWAPPED_AWAY },
      autoEligible: false,
    });
    expect(decisions[0].outcome).toBe('replaced');
    expect(decisions[0].reason).toBe(SLOT_REASON.USER_SWAPPED_AWAY);
  });

  test('a stored KEEP with no capability objection stands exactly as before', () => {
    const { workouts, decisions } = run({
      stored: { verdict: SLOT_VERDICT.KEEP, reason: 'still_productive' },
      autoEligible: true,
    });
    expect(decisions[0].outcome).toBe('retained');
    expect(workouts[0].exercises[0].exerciseId).toBe('inc-squat');
  });

  test('with no stored verdict the fresh path replaces the ineligible incumbent too', () => {
    const { decisions } = run({ stored: null, autoEligible: false });
    expect(decisions[0].outcome).toBe('replaced');
    expect(decisions[0].reason).toBe(SLOT_REASON.NO_LONGER_AUTO_ELIGIBLE);
  });

  test('blockAdvisor supplies the answer, capability-only and fail-safe, at source', () => {
    const src = read('lib/blockAdvisor.js');
    expect(src).toContain('isCapabilityEligible(intentState.capability, row)');
    expect(src).toMatch(/catch \(_e\) { autoEligible = undefined; }/);
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

  test('sync: the field is carried uniformly per batch, and only when some row holds', () => {
    const sync = read('lib/sync/tables/capabilityConstraints.js');
    expect(sync).toContain('const carryAdaptationMode = local.some((c) => c.adaptationMode != null);');
    expect(sync).toContain('...(carryAdaptationMode ? { adaptation_mode: c.adaptationMode ?? null } : {})');
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

  test('the cloud migration is WRITTEN, guarded, and recorded as not applied', () => {
    const sql = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'supabase', 'migrate_152_capability_adaptation_mode.sql'), 'utf8');
    expect(sql).toContain('IF NOT EXISTS');
    expect(sql).toContain("CHECK (adaptation_mode IN ('propose', 'hold'))");
    expect(sql).toContain('NOT RUN');
    const readme = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'supabase', 'README.md'), 'utf8');
    expect(readme).toContain('migrate_152_capability_adaptation_mode.sql');
    expect(readme).toContain('WRITTEN 2026-08-28, awaiting the founder phrase');
  });
});

describe('T1-02 / T2-10 - the remaining raw-library paths in this lane', () => {
  test('ExerciseDetail similar-exercises passes the capability question', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'ExerciseDetailScreen.js'), 'utf8');
    expect(src).toContain('isCapabilityEligible(capState, row)');
    expect(src).toContain('rankSwaps(ex, pool,');
  });

  test('the heatmap fingerprint recomputes through the SAME generation filter', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'VolumeHeatmapScreen.js'), 'utf8');
    expect(src).toContain('filterLibraryForGeneration(allExercises, intentState).library');
    expect(src).toContain('exerciseLibrary: generationLibrary');
  });

  test('the coverage line no longer blames equipment alone', () => {
    const src = read('lib/divisionDiff.js');
    expect(src).not.toContain('your equipment has nothing that trains');
    expect(src).toContain('nothing that fits your equipment and how you train covers');
  });
});

describe('D112 R2 - the resolver door stays shut (regression guard)', () => {
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
