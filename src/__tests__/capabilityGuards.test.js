/**
 * CC26 - source-level guards for the capability-lane laws
 * (docs/capability-campaign-25-2026-08-20/ARCHITECTURE.md; CAP-4, CAP-19,
 * CAP-20, the inertness law and the model's no-clock rule). The house
 * guard convention: fs.readFileSync + targeted assertions, so a violating
 * edit fails mechanically and the break is a decision, not an accident.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

const CAPABILITY_FILES = [
  'lib/capability/model.js',
  'lib/capability/store.js',
  // CC27: the resolver and the demand ontology join the lane. resolve.js
  // imports the movement-family TAXONOMY (shared vocabulary, no user
  // data) - the CAP-4 wall below is about the preference lane's STORED
  // INTENT, which stays unreachable.
  'lib/capability/resolve.js',
  'lib/capability/demands.js',
  'lib/capability/preflight.js',
  // Natural coach-language order (2026-08-21): the naming helper joins
  // the lane under the same laws. Like resolve.js it may import the
  // shared movement-family TAXONOMY; never the preference lane's intent.
  'lib/capability/phrase.js',
  'lib/consent/capabilityConsent.js',
  'lib/sync/tables/capabilityConstraints.js',
  'lib/sync/tables/sessionConstraintEffects.js',
  'screens/HowYouTrainScreen.js',
];

describe('CAP-19: core capability accommodation is never Pro-gated', () => {
  test('HowYouTrain registers UNGUARDED in the navigator', () => {
    const nav = read('navigation/RootNavigator.js');
    const reg = nav.match(/const HowYouTrainScreen = [^\n]+/)?.[0] ?? '';
    expect(reg).not.toMatch(/withProGuard/);
    expect(nav).toMatch(/name="HowYouTrain" component=\{HowYouTrainScreen\}/);
  });
  test('no capability module consults the tier gate', () => {
    for (const f of CAPABILITY_FILES) {
      const src = read(f);
      expect(src).not.toMatch(/withProGuard|proGate|PRO_BETA|isPro\b|tier ===/);
    }
  });
});

describe('CAP-4: the capability lane and the preference lane never touch', () => {
  test('capability files never import or query the preference lane', () => {
    for (const f of CAPABILITY_FILES) {
      const src = read(f);
      // Imports/requires of preference-lane modules (comments may NAME the
      // lane to state the law; code may not reach it).
      const importLines = src.split('\n')
        .filter(l => /^\s*(import |const .*require\()/.test(l)).join('\n');
      expect(importLines).not.toMatch(/exercise\/intent|movementConstraints|swapEngine/);
      // No SQL/API reach into the preference tables from the lane.
      const codeOnly = src.replace(/\/\*[^]*?\*\//g, '').split('\n')
        .filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
      expect(codeOnly).not.toMatch(/FROM exercise_intent|setExerciseIntent|getExerciseIntents|recordExerciseSwap/);
    }
  });
  test('the preference lane never reaches capability STORAGE or CONSENT', () => {
    // CC27 REVISION of this pin: section 9.2.3 composes the senior
    // question, so intent.js and generation.js now lawfully import the
    // PURE question modules (capability/resolve, capability/demands). The
    // CAP-4 wall is DATA reach: the preference lane must never touch the
    // Article 9 store, the consent lane, or the capability tables - the
    // resolver's single loader is the only door, and it lives in the
    // capability lane.
    for (const f of ['lib/exercise/intent.js', 'lib/exercise/generation.js']) {
      const src = read(f);
      expect(src).not.toMatch(/capability\/store|consent\/capabilityConsent|FROM capability_constraints|getCapabilityConstraints|createCapabilityConstraint|tombstoneAllCapabilityConstraints|endCapabilityEpisode|promoteCapabilityEpisode/);
      // The only capability imports allowed are the pure question modules.
      const importLines = src.split('\n')
        .filter((l) => /^\s*(import |const .*require\()/.test(l) && /capability/i.test(l)).join('\n');
      expect(importLines).not.toMatch(/capability\/(?!resolve|demands)/);
    }
    // The write side of movement constraints stays fully capability-free.
    expect(read('lib/exercise/movementConstraints.js')).not.toMatch(/capability/i);
  });
});

describe('inertness: no downstream behaviour activates before its campaign', () => {
  // CC27 activated the selection seams; CC29 adherence; CC30 activates
  // LEARNING - but only at the GATHER layer (blockLedgerRunner stamps
  // eligibility; database.js filters the adapted window). Every learning
  // CONSUMER below stays capability-BLIND by design: it reads stamped
  // provenance (entry.eligibility, swap cause) and never the capability
  // lane. Coach/check-in files stay fully inert until CC31.
  test.each([
    'lib/planEngine.js', 'lib/poolGenerator.js',
    'lib/weeklyCoach.js', 'lib/coachApply.js', 'lib/coachPrecedence.js',
    'lib/livePrescription.js', 'lib/sessionAdjustments.js',
    'lib/algorithms.js', 'lib/learnedRange.js',
    'lib/interBlock.js', 'lib/programmeStructureMemory.js',
    'lib/blockProgression.js', 'lib/swapEngine.js',
  ])('%s has no capability wiring', (f) => {
    const src = read(f);
    expect(src).not.toMatch(/capability_constraints|capability\/(model|store)|loadCapabilityState|isCapabilityEligible/);
  });

  test('CC30: the runner is the ONE learning file wired to the lane, and only through eligibility', () => {
    const src = read('lib/blockLedgerRunner.js');
    expect(src).toMatch(/from '\.\/capability\/eligibility'/);
    expect(src).not.toMatch(/capability\/(model|store|resolve)'/);
  });

  test('CC-D17: the restamp pass rewrites eligibility and the watermark, never the judgement', () => {
    const src = read('lib/blockLedgerRunner.js');
    const fn = src.slice(src.indexOf('export async function restampLedgerEligibility'), src.indexOf('\n}\n', src.indexOf('export async function restampLedgerEligibility')));
    expect(fn).toMatch(/e\.eligibility = next/);
    expect(fn).not.toMatch(/classification\s*=|proposal\s*=|observed\s*=|rationale\s*=/);
  });
});

describe('determinism and privacy discipline', () => {
  test('the pure model never reads the clock', () => {
    expect(read('lib/capability/model.js')).not.toMatch(/Date\.now|new Date\(/);
  });
  test('no capability module emits telemetry events', () => {
    for (const f of CAPABILITY_FILES) {
      expect(read(f)).not.toMatch(/engineTelemetry|trackEvent|track\(/);
    }
  });
  test('the Sentry scrub covers the capability lane (CAP-20)', () => {
    const scrub = read('lib/observability/sentryScrub.js');
    expect(scrub).toMatch(/capability_constraints/);
    expect(scrub).toMatch(/session_constraint_effects/);
    expect(scrub).toMatch(/\^capability/);
    expect(scrub).toMatch(/rule\[\._-\]\?value/);
  });
  test('the user-boundary wipe covers both tables', () => {
    const dbSrc = read('lib/database.js');
    expect(dbSrc).toMatch(/'capability_constraints', 'session_constraint_effects',/);
  });
  test('no diagnosis vocabulary anywhere in the lane (CAP-3)', () => {
    for (const f of CAPABILITY_FILES) {
      const src = read(f);
      // The word may appear only in the negative ("never a diagnosis").
      const uses = src.match(/diagnos\w+/gi) ?? [];
      for (const u of uses) {
        const idx = src.indexOf(u);
        const context = src.slice(Math.max(0, idx - 80), idx + 40);
        expect(context).toMatch(/no diagnos|never (a )?diagnos|not.*diagnos|without.*diagnos/i);
      }
    }
  });
});

describe('the C31 pinned contracts are untouched (section 33 preservation)', () => {
  test('the identical-writes pin file still pins the intent lane', () => {
    const pin = read('lib/exercise/__tests__/campaign9.generation.test.js');
    expect(pin).toMatch(/identical library array and writes identical rows/);
  });
  test('reads never write: the capability read path contains no UPDATE', () => {
    const dbSrc = read('lib/database.js');
    const readFn = dbSrc.slice(dbSrc.indexOf('export async function getCapabilityConstraints'),
      dbSrc.indexOf('export async function getAllCapabilityConstraintsForUser'));
    expect(readFn).not.toMatch(/UPDATE|INSERT|DELETE/);
  });
});

describe('CC-D27: the family/exercise/allow add surfaces (CC27)', () => {
  const scr = read('screens/HowYouTrainScreen.js');
  test('the kind stage offers all three rule kinds, and allowances only under baseline', () => {
    expect(scr).toMatch(/A movement pattern/);
    expect(scr).toMatch(/A specific exercise/);
    expect(scr).toMatch(/always fine for me/);
    const kindStage = scr.slice(scr.indexOf("adding === 'kind'"), scr.indexOf("adding === 'family'"));
    expect(kindStage).toMatch(/isBaseline \?/);
  });
  test('the family list is COMPUTED from the library (section 33.3), never hardcoded', () => {
    const fam = scr.slice(scr.indexOf("adding === 'family'"), scr.indexOf("adding === 'exercise'"));
    expect(fam).toMatch(/movementFamily\(e\.name, e\.primaryMuscle, e\.subregion\)/);
    expect(fam).not.toMatch(/\[\s*'vertical_pull'/);
  });
  test('an allowance always writes as the user\'s own call (source self)', () => {
    const write = scr.slice(scr.indexOf('const rows = ['), scr.indexOf('await writeConstraintRows'));
    expect(write).toMatch(/EXERCISE_ALLOW/);
    expect(write).toMatch(/source: draft\.kind === 'allow' \? CONSTRAINT_SOURCE\.SELF : source/);
  });
  test('every kind lands through the same batched, consent-gated write', () => {
    // CC31 strengthened the door rather than the count: writeConstraintRows
    // is the ONE place createConstraints is called, and both the add flow
    // and the section 21 flare re-start go through it (the re-start with
    // its own consent gate).
    expect(scr.match(/createConstraints\(userId/g)).toHaveLength(1);
    expect(scr.match(/await writeConstraintRows\(/g).length).toBeGreaterThanOrEqual(2);
    const restart = scr.slice(scr.indexOf('const confirmRestartEpisode'), scr.indexOf('const renderAddFlow'));
    expect(restart).toMatch(/hasCapabilityConsent\(userId\)/);
    expect(restart).toMatch(/await writeConstraintRows\(/);
  });
});

describe('CAP-7 at the install-conflict sheet (red-team finding 3, bundle)', () => {
  const sheet = read('components/ExerciseConflictSheet.js');
  test('a clinician-reported row is never offered "Keep it in this plan"', () => {
    // The keep affordance is the non-clinician branch of an explicit
    // reason check; the clinician branch routes to the restriction
    // editor instead (the picker's section 9.4 confirm flow).
    expect(sheet).toMatch(/String\(c\?\.reason \?\? ''\) === 'capability_clinician' \?/);
    const clinician = sheet.slice(
      sheet.indexOf("=== 'capability_clinician' ?"),
      sheet.indexOf('title="Keep it in this plan"'),
    );
    expect(clinician).toMatch(/title="Update How you train"/);
    expect(clinician).toMatch(/navigate\('HowYouTrain'\)/);
    expect(clinician).not.toMatch(/onKeep/);
  });
  test('the keep affordance survives for every other conflict row', () => {
    expect(sheet).toMatch(/title="Keep it in this plan"/);
  });
});
