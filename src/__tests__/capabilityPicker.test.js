/**
 * CC27 - picker/browse capability surface (ARCHITECTURE sections 9.2.6,
 * 9.4, 8.4). Source-level pins in the house convention: the rules below
 * are screen-flow laws, so a violating edit fails mechanically.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../components/ExercisePickerModal.js'), 'utf8');

describe('section 9.2.6: default-on capability filter with show-anyway', () => {
  test('the browse filter carries the capability term as its own clause, default hidden', () => {
    expect(src).toMatch(/showIncompatible \|\| !intentState\?\.capability\s*\|\| capabilityBlockReason\(intentState\.capability, e\) === null/);
    expect(src).toMatch(/useState\(false\);?\s*$/m);
    expect(src).toMatch(/setShowIncompatible\(false\)/); // re-armed per open
  });
  test('the toggle is its own control, not the set-aside toggle', () => {
    expect(src).toMatch(/Show movements outside how you train/);
    expect(src).toMatch(/Show what you have set aside/);
  });
  test('the pinned intent clauses stay byte-exact (campaign9 guard strings)', () => {
    expect(src).toContain('(showExcluded || !intentState || isEligible(intentState, e.id))');
    expect(src).toContain('(showExcluded || !intentState || !isFamilyBlocked(intentState, movementFamilyOf(e)))');
  });
});

describe('section 9.4: the manual-conflict flows', () => {
  test('clinician-reported: no inline override, one-tap route to the restriction editor', () => {
    const clin = src.slice(src.indexOf('capReason === CAPABILITY_BLOCK.CLINICIAN'), src.indexOf('capReason === CAPABILITY_BLOCK.UNKNOWN'));
    expect(clin).toMatch(/update it first/i);
    expect(clin).toMatch(/navigationRef\.navigate\('HowYouTrain'\)/);
    expect(clin).not.toMatch(/writeAllowance|Add anyway/);
  });
  test('self-declared: add-anyway changes no state; "works for me" records the allowance', () => {
    const tail = src.slice(src.indexOf('Self-declared conflict'));
    expect(tail).toMatch(/Add anyway, just this plan/);
    expect(tail).toMatch(/This one works for me/);
    expect(tail).toMatch(/writeAllowance\(item\)/);
  });
  test('unknown-demand: add allowed with the unknown copy + optional record', () => {
    const unk = src.slice(src.indexOf('capReason === CAPABILITY_BLOCK.UNKNOWN'), src.indexOf('// Self-declared conflict'));
    expect(unk).toMatch(/You can still add it yourself/);
    expect(unk).toMatch(/Add, this works for me/);
  });
  test('the allowance writes through the capability store as a baseline self exercise_allow', () => {
    const allow = src.slice(src.indexOf('async function writeAllowance'), src.indexOf('function handleSelect'));
    expect(allow).toMatch(/capability\/store/);
    expect(allow).toMatch(/role: 'baseline'/);
    expect(allow).toMatch(/source: 'self'/);
    expect(allow).toMatch(/ruleKind: 'exercise_allow'/);
  });
});

describe('the Recent rail asks the senior question (C section 10.9 upgrade)', () => {
  test('recents filter through isEligibleExercise', () => {
    const rail = src.slice(src.indexOf('const recentExercises'), src.indexOf(': [];'));
    expect(rail).toMatch(/\.filter\(e => !intentState \|\| isEligibleExercise\(intentState, e\)\)/);
  });
});

describe('section 8.4: the single-axis ask on custom creation', () => {
  test('questions render ONLY for the axes the user has active demand constraints on', () => {
    expect(src).toMatch(/constrainedAxes = \[\.\.\.new Set\(\(intentState\?\.capability\?\.restrictions \?\? \[\]\)/);
    expect(src).toMatch(/r\.ruleKind === 'demand'/);
    expect(src).toMatch(/constrainedAxes\.map\(axis =>/);
  });
  test('answers pass into the insert; skipping stays NULL (no derivation of demands for customs)', () => {
    expect(src).toMatch(/\.\.\.createDemands,/);
    // The metadata derivation call must not include demand fields.
    const derive = src.slice(src.indexOf('...deriveExerciseMetadata({'), src.indexOf('...createDemands'));
    expect(derive).not.toMatch(/position|gripDemand|balanceDemand/);
  });
  test('every ask option stays inside the closed demand vocabularies', () => {
    const specs = src.slice(src.indexOf('const DEMAND_ASK_SPECS'), src.indexOf('// CC27 (CAP-18)'));
    for (const v of ['standing', 'seated', 'lying', 'kneeling', 'mixed', 'none', 'supportive', 'bar', 'supported', 'stable', 'high']) {
      expect(specs).toContain(`'${v}'`);
    }
    expect(specs).not.toMatch(/injur|rehab|safe/i);
  });
});

describe('red-team finding 1 (bundle): the capability read failure is never silent', () => {
  test('the no-known-state posture gets its own visible notice', () => {
    // Fires ONLY when the capability read failed with no known state this
    // session (unavailable && !stale) - the one posture where nothing is
    // filtered for how you train (section 9.6 / CAP-17).
    expect(src).toMatch(/state\?\.capability\?\.unavailable && !state\.capability\.stale/);
    expect(src).toMatch(/How you train could not be checked right now, so nothing is filtered for it\./);
  });
  test('the notice is consent-gated so users without the feature never see it', () => {
    expect(src).toMatch(/getLocalCapabilityConsent\(userId\)/);
    expect(src).toMatch(/consented === true.*setCapabilityUnavailable\(true\)/);
  });
});
