/**
 * CC33 D112 R5 (injury/disability audit W3, 2026-08-28) - the four Home
 * visibility items HomeScreen.js has no light render harness for (see the
 * same rationale in HomeScreen.planGenErrorCopy.guard.test.js and
 * HomeScreen.todayLinePresentationGuards.test.js: this pins the exact
 * source instead of driving a full component mount).
 *
 * Pins:
 *  - T1-14/T2-31: the constraint line renders standalone, gated on an
 *    active APPLIED episode rule + an active plan, independent of the
 *    coach brief; buildCoachBrief() is no longer fed activeConstraint/
 *    constraintSubject (so the line can never double-render).
 *  - T1-15/T2-24: the AWAITING prompt row exists with the exact copy
 *    (named-subject and generic fallback), matching HowYouTrainScreen's
 *    own wording for the same state.
 *  - T1-17: the Today card's exercise count prefers the effective
 *    (countEffectiveSessionRows) figure over the raw exerciseCounts map.
 *  - T1-12: the quick-generate ("Start with a plan", Pro no-plan) success
 *    path reveals capability-blocked slots via a toast.
 */
const fs = require('fs');
const path = require('path');

const HOME = fs.readFileSync(path.join(__dirname, '..', 'HomeScreen.js'), 'utf8');

describe('T1-14/T2-31: standalone constraint line', () => {
  test('the episode-role filter requires APPLIED and not HELD (matches the serve gate plus its hold filter)', () => {
    // Lead tighten (W3 review, D112 R8): the builder's applied-only filter
    // landed in parallel with the suspension consumers, so a HELD episode
    // could still drive the "works around" line the serve layer no longer
    // honours. Same pinned intent - the line never claims what serving
    // does not do - with the hold exclusion added.
    expect(HOME).toMatch(
      /state\.restrictions\.filter\(r => r\.role === 'episode' && r\.effectiveChoice === 'applied' && r\.adaptationMode !== 'hold'\)/,
    );
  });

  test('buildCoachBrief() is no longer fed activeConstraint/constraintSubject', () => {
    const site = HOME.indexOf('const rawCoachBrief = showCoachBrief');
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site, HOME.indexOf('const coachBrief =', site));
    expect(block).not.toMatch(/activeConstraint,/);
    expect(block).not.toMatch(/constraintSubject,/);
  });

  test('the standalone row renders on activeConstraint && activePlan, independent of coachBrief/showCoachBrief', () => {
    expect(HOME).toMatch(/\{activeConstraint && activePlan \? \(/);
    const site = HOME.indexOf('{activeConstraint && activePlan ? (');
    const block = HOME.slice(site, HOME.indexOf(') : null}', site));
    expect(block).toMatch(/constraintLineText\(constraintSubject\)/);
    expect(block).toMatch(/navigation\.navigate\('HowYouTrain'\)/);
    expect(block).not.toMatch(/showCoachBrief/);
    expect(block).not.toMatch(/coachBrief\./);
  });

  test('constraintLineText is imported from homeCoachBrief.js, not re-implemented inline', () => {
    expect(HOME).toMatch(/import \{ buildCoachBrief, constraintLineText \} from '\.\.\/lib\/homeCoachBrief';/);
  });
});

describe('T1-15/T2-24: the AWAITING prompt reaches Today', () => {
  test('awaitingConstraintLine matches HowYouTrainScreen\'s own two-branch wording, never invented phrasing', () => {
    expect(HOME).toMatch(
      /awaitingConstraint\.subject\s*\n\s*\? `You thought you'd be back to \$\{awaitingConstraint\.subject\} by about now\. Still need it\?`\s*\n\s*: 'You thought this would be done by about now\. Still need it\?'/,
    );
  });

  test('the AWAITING row is tappable through to How you train', () => {
    const site = HOME.indexOf('{awaitingConstraintLine ? (');
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site, HOME.indexOf(') : null}', site));
    expect(block).toMatch(/navigation\.navigate\('HowYouTrain'\)/);
    expect(block).toMatch(/awaitingConstraintLine/);
  });

  test('grouped via capability/model episodeStatus, the same grouping the settings store uses - no reimplemented status logic', () => {
    expect(HOME).toMatch(/require\('\.\.\/lib\/capability\/model'\)/);
    expect(HOME).toMatch(/episodeStatus\(rows, Date\.now\(\)\) === 'awaiting_confirmation'/);
  });
});

describe('T1-17: Today\'s card counts the effective session', () => {
  test('countEffectiveSessionRows is wired from sessionEffective.js', () => {
    expect(HOME).toMatch(/require\('\.\.\/lib\/sessionEffective'\)/);
    expect(HOME).toMatch(/countEffectiveSessionRows\(user\.id, routineId\)/);
  });

  test('the displayed count prefers effectiveSessionCount, falling back to the raw exerciseCounts map', () => {
    expect(HOME).toMatch(
      /\(effectiveSessionCount \?\? exerciseCounts\[displayWorkout\?\.routine\?\.id\]\) \? \(/,
    );
    expect(HOME).toMatch(
      /\{effectiveSessionCount \?\? exerciseCounts\[displayWorkout\.routine\.id\]\} exercises/,
    );
  });

  test('re-fires on the displayed routine changing (one call per focus, via displayWorkout?.routine?.id)', () => {
    const site = HOME.indexOf("const { countEffectiveSessionRows }");
    const depsSite = HOME.indexOf('}, [user?.id, displayWorkout?.routine?.id]);', site);
    expect(depsSite).toBeGreaterThan(site);
  });
});

describe('T1-12: quick-generate reveals capability-blocked slots', () => {
  test('the Pro no-plan "Start with a plan" success path toasts capabilityBlockedCount', () => {
    const site = HOME.indexOf("const result = await generateAndSavePlan(user.id, userProfile);");
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site, HOME.indexOf('}}', site) + 2);
    expect(block).toMatch(/if \(result\.capabilityBlockedCount > 0\) \{/);
    expect(block).toMatch(/capabilityBlockedNote\(result\.capabilityBlockedCount\)/);
    // The pinned failure copy (HomeScreen.planGenErrorCopy.guard.test.js)
    // is untouched by this addition.
    expect(block).toMatch(/toast\.show\("Couldn't start your plan, try again", \{ variant: 'error', duration: 5000 \}\);/);
  });

  test('capabilityBlockedNote is a local pure helper with the exact singular/plural copy', () => {
    expect(HOME).toMatch(
      /function capabilityBlockedNote\(n\) \{\s*\n\s*return n === 1\s*\n\s*\? '1 movement sat outside how you train, so your plan works without it\.'\s*\n\s*: `\$\{n\} movements sat outside how you train, so your plan works without them\.`;\s*\n\s*\}/,
    );
  });
});

// CC33 D112 R5 (closes audit T2-25's copy half; lead, post-W4): the
// durable reintroduction line on the plan view. The §23 ramp stamps
// planned rows source 'reintroduction'; Home reads the stamp off the
// week's rows it already loads and renders one quiet, NON-tappable line
// (it asks nothing), so the build-back is visible every week it is
// happening rather than only in the one toast at episode end.
describe('T2-25: durable reintroduction line', () => {
  test('the line is derived from the already-loaded planned rows via the reintroduction helpers', () => {
    expect(HOME).toContain("const { rampMusclesFromPlannedRows, reintroductionRampLine } = require('../lib/capability/reintroduction');");
    expect(HOME).toContain('const rampMuscles = rampMusclesFromPlannedRows(planned);');
    expect(HOME).toMatch(/reintroductionRampLine\(rampMuscles\.map\(\(m\) => MUSCLE_DISPLAY_NAMES\[m\] \|\| m\)\)/);
  });

  test('the row renders with the quiet constraint-line styling and no touch handler', () => {
    const site = HOME.indexOf('{rampLine ? (');
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site, HOME.indexOf(') : null}', site));
    expect(block).toContain('styles.constraintLineRow');
    expect(block).toContain('{rampLine}');
    expect(block).not.toMatch(/TouchableOpacity|onPress/);
  });
});
