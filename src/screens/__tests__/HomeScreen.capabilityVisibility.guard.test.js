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
// RE-POINTED (D231, app layout rework batch 2): the works-around line, the
// reintroduction line and the could-not-check line moved from Today to Train.
// Their logic lives in src/lib/capability/injuryLines.js (read by
// useInjuryLines) and they are drawn by components/InjuryLines.js under the
// Injuries & limitations row on PlansScreen. The pinned rules are unchanged.
const INJURY_LINES = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'capability', 'injuryLines.js'), 'utf8');
const INJURY_LINES_VIEW = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'InjuryLines.js'), 'utf8');
const INJURY_LINES_HOOK = fs.readFileSync(path.join(__dirname, '..', '..', 'hooks', 'useInjuryLines.js'), 'utf8');
const PLANS = fs.readFileSync(path.join(__dirname, '..', 'PlansScreen.js'), 'utf8');

describe('T1-14/T2-31: standalone constraint line', () => {
  test('the episode-role filter requires APPLIED and not HELD (matches the serve gate plus its hold filter)', () => {
    // Lead tighten (W3 review, D112 R8): the builder's applied-only filter
    // landed in parallel with the suspension consumers, so a HELD episode
    // could still drive the "works around" line the serve layer no longer
    // honours. Same pinned intent - the line never claims what serving
    // does not do - with the hold exclusion added.
    expect(INJURY_LINES).toMatch(
      /state\.restrictions\.filter\(r => r\.role === 'episode' && r\.effectiveChoice === 'applied' && r\.adaptationMode !== 'hold'\)/,
    );
    // And Today no longer reads it at all.
    expect(HOME).not.toMatch(/effectiveChoice === 'applied'/);
  });

  test('buildCoachBrief() is no longer fed activeConstraint/constraintSubject', () => {
    const site = HOME.indexOf('const rawCoachBrief = showCoachBrief');
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site, HOME.indexOf('const coachBrief =', site));
    expect(block).not.toMatch(/activeConstraint,/);
    expect(block).not.toMatch(/constraintSubject,/);
  });

  test('the line renders on activeConstraint && an active plan, independent of any coach brief', () => {
    expect(INJURY_LINES_VIEW).toMatch(/lines\?\.activeConstraint && hasPlan/);
    expect(INJURY_LINES_VIEW).toMatch(/constraintLineText\(lines\.constraintSubject\)/);
    expect(INJURY_LINES_VIEW).not.toMatch(/showCoachBrief|coachBrief\./);
    // Train hands it the real fact: an active plan.
    expect(PLANS).toMatch(/<InjuryLines lines=\{injuryLines\} hasPlan=\{!!activePlan\} \/>/);
  });

  test('D231: on Train the line is plain text under the Injuries & limitations row (the row is the one door), not a second tappable door', () => {
    expect(INJURY_LINES_VIEW).not.toMatch(/TouchableOpacity|PressableCard|onPress/);
  });

  test('constraintLineText is imported from homeCoachBrief.js, not re-implemented inline', () => {
    expect(INJURY_LINES_VIEW).toMatch(/import \{ constraintLineText \} from '\.\.\/lib\/homeCoachBrief';/);
    // Today still imports the brief builder only.
    expect(HOME).toMatch(/import \{ buildCoachBrief \} from '\.\.\/lib\/homeCoachBrief';/);
  });
});

describe('T1-15/T2-24: the AWAITING prompt reaches Today', () => {
  // RE-POINTED (D231, app layout rework batch 1): the "Still need it?" row and
  // the "waiting for your decision" row left the Injuries & limitations group
  // for the Today line. The pinned rules are unchanged: the sentence matches
  // HowYouTrainScreen's own wording, and a tap lands on Injuries & limitations.
  const ARBITER = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'home', 'todayLineArbiter.js'), 'utf8');

  test('the AWAITING sentence matches HowYouTrainScreen\'s own two-branch wording, never invented phrasing', () => {
    expect(ARBITER).toMatch(
      /f\.awaitingSubject\s*\n\s*\? `You thought you would be back to \$\{f\.awaitingSubject\} by about now\. Still need it\?`\s*\n\s*: 'You thought this would be done by about now\. Still need it\?'/,
    );
    const HYT = fs.readFileSync(path.join(__dirname, '..', 'HowYouTrainScreen.js'), 'utf8');
    expect(HYT).toContain('You thought this would be done by about now. Still need it?');
  });

  test('the limitation decision is tappable through to Injuries & limitations, and the rows are gone from the group', () => {
    const site = HOME.indexOf('limitation: {');
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site, HOME.indexOf('},', site) + 2);
    expect(block).toMatch(/navigation\.navigate\('HowYouTrain'\)/);
    expect(block).toMatch(/awaitingCount: awaitingConstraint\?\.count \?\? 0,/);
    expect(block).toMatch(/undecided: undecidedConstraint,/);
    expect(HOME).not.toContain('{awaitingConstraintLine ? (');
    expect(HOME).not.toContain('{undecidedConstraint && !awaitingConstraintLine ? (');
    expect(HOME).not.toContain('A change to your limitations is waiting for your decision.');
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
  // RE-ANCHORED (D139): the no-plan action previews before it commits, so the
  // generation moved from an inline generateAndSavePlan in the EmptyState's
  // onAction to handleConfirmStartWithPlan, the sheet's confirm handler
  // (commitStartWithPlan -> generateAndSavePlan). The pinned RULE is
  // unchanged: the success path still reveals capability-blocked slots, and
  // the failure copy is still the calm fixed one.
  test('the Pro no-plan "Start with a plan" success path toasts capabilityBlockedCount', () => {
    const site = HOME.indexOf("result = await commitStartWithPlan(user.id, userProfile);");
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site, HOME.indexOf('\n  }', site) + 4);
    expect(block).toMatch(/if \(result\.capabilityBlockedCount > 0\) \{/);
    expect(block).toMatch(/capabilityBlockedNote\(result\.capabilityBlockedCount\)/);
    // The pinned failure copy (HomeScreen.planGenErrorCopy.guard.test.js)
    // is untouched by this addition.
    expect(block).toMatch(/toast\.show\('Could not start your plan\. Please try again\.', \{ variant: 'error', duration: 5000 \}\);/);
  });

  test('capabilityBlockedNote is a local pure helper with the exact singular/plural copy', () => {
    expect(HOME).toMatch(
      /function capabilityBlockedNote\(n\) \{\s*\n\s*return n === 1\s*\n\s*\? "1 movement clashed with an injury or limitation you have set, so your plan works without it\."\s*\n\s*: `\$\{n\} movements clashed with your injuries or limitations, so your plan works without them\.`;\s*\n\s*\}/,
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
  test('the line is derived from the current block week\'s planned rows via the reintroduction helpers', () => {
    expect(INJURY_LINES).toContain("import { rampMusclesFromPlannedRows, reintroductionRampLine } from './reintroduction';");
    expect(INJURY_LINES).toContain('const rampMuscles = rampMusclesFromPlannedRows(planned);');
    expect(INJURY_LINES).toMatch(/reintroductionRampLine\(rampMuscles\.map\(\(m\) => MUSCLE_DISPLAY_NAMES\[m\] \|\| m\)\)/);
    expect(INJURY_LINES).toMatch(/getPlannedMuscleVolume\(week\.id\)/);
  });

  test('the line renders as quiet plain text with no touch handler', () => {
    const site = INJURY_LINES_VIEW.indexOf('if (lines?.rampLine)');
    expect(site).toBeGreaterThan(-1);
    expect(INJURY_LINES_VIEW.slice(site, site + 80)).toContain("key: 'ramp'");
    expect(INJURY_LINES_VIEW).not.toMatch(/TouchableOpacity|onPress/);
  });
});

// Round 4 (F-4, J2): the three quiet capability rows are real touch
// targets and must meet the minimum. The campaign had no touch-target
// guard at all, which is how 28px rows shipped on exactly the surface
// built for users with the highest incidence of tremor and reduced
// dexterity.
describe('F-4: the capability lines are not touch targets on Train; the door above them is 48 dp', () => {
  // RE-POINTED (D231, batch 2): the three quiet rows were 28 dp touch targets on
  // Today, lifted to 48 dp (spacing.xxxl) by round 4. On Train they are plain
  // text under the Injuries & limitations row, so there is no target to size;
  // the row they sit under is the shared NavRow (padding.lg around a 36 dp tile,
  // 68 dp tall), the screen's one door to that screen.
  test('the lines are plain text and the door is a NavRow', () => {
    expect(INJURY_LINES_VIEW).not.toMatch(/TouchableOpacity|PressableCard|onPress/);
    expect(PLANS).toMatch(/label="Injuries & limitations"\s*\n\s*sub=\{hytSummary\.sub\}\s*\n\s*onPress=\{\(\) => navigation\.navigate\('HowYouTrain'\)\}/);
  });
});

// Round 13 (R13-1): Home's OWN repeat card was the fourth keyless slot
// construction - rounds 11-12 minted ids at the other three ad-hoc
// entry points while this branch built routineExercise: null, so the
// per-slot effects machinery silently degraded on exactly these
// sessions. The store's withSetsArrays chokepoint now also nets any
// future keyless construction (driven in useAppStore.test.js); this
// pins Home's honest per-site shape.
describe('R13-1: the repeat-last-session fallback mints its slot ids', () => {
  // RE-POINTED (D231, batch 2): Repeat moved from Today to Train's newest Recent
  // session; the assembly is src/lib/repeatSession.js, unchanged.
  const REPEAT = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'repeatSession.js'), 'utf8');
  test('the no-routine branch builds keyed rows with the previous session\'s working-set count', () => {
    expect(REPEAT).toContain("routineExercise: { id: uid(), recommendedSets: setCounts[exercise.id] || 3 },");
    // The old keyless construction shape is gone (the comment above the
    // new one may still name it as history).
    expect(REPEAT).not.toContain('({ exercise, routineExercise: null, sets: [] })');
  });
});

// Round 9 (B4/E1): when the capability read fails with NO known state,
// loadCapabilityResolveState synthesises an EMPTY state (unavailable:
// true, stale: false - resolve.js section 9.6), so every row above
// vanished silently and a failed check was indistinguishable from
// "nothing going on". Home now says so with one quiet non-tappable line
// in the lane's established honesty vocabulary. Stale-but-KNOWN state
// (unavailable && stale) keeps serving normally per CAP-17, exactly as
// the tappable rows already do - the line must NOT fire on it.
describe('R9 B4/E1: the honest could-not-check line', () => {
  test('the check-failed fact is set from the resolver\'s no-known-state signature through the ONE predicate (capabilityKnown), never from restrictions alone', () => {
    expect(INJURY_LINES).toMatch(/checkFailed: !!state && !capabilityKnown\(state\),/);
    expect(INJURY_LINES).toMatch(/import \{ capabilityKnown, loadCapabilityResolveState \} from '\.\/resolve';/);
    // No private copy of the signature (capabilityCensus class 1).
    expect(INJURY_LINES).not.toMatch(/unavailable\s*&&\s*![^)]*stale/);
  });

  test('the read\'s catch also reports a failed check (a thrown read is a failed check, not an empty one)', () => {
    const site = INJURY_LINES.indexOf('return { activeConstraint: false, constraintSubject: null, checkFailed: true };');
    expect(site).toBeGreaterThan(-1);
    expect(INJURY_LINES.slice(Math.max(0, site - 400), site)).toContain('} catch (_) {');
  });

  test('the line renders non-tappable with the lane\'s honesty copy', () => {
    expect(INJURY_LINES).toContain("'Volyume could not check Injuries & limitations just now.'");
    expect(INJURY_LINES_VIEW).toMatch(/lines\?\.checkFailed\) rows\.push\(\{ key: 'check-failed', text: COULD_NOT_CHECK_LINE \}\)/);
    expect(INJURY_LINES_VIEW).not.toMatch(/TouchableOpacity|onPress/);
  });

  test('round 10: the hook carries a cancellation guard, so overlapping focus cycles cannot land out of order', () => {
    // A slow failing read resolving after a fast good one left any of the flags
    // describing the older read; blur now cancels the in-flight application
    // before its setters run.
    expect(INJURY_LINES_HOOK).toContain('let cancelled = false;');
    expect(INJURY_LINES_HOOK).toContain('if (cancelled) return;');
    expect(INJURY_LINES_HOOK).toContain('return () => { cancelled = true; };');
    // Today\'s own read (what the Today line still feeds on) keeps both guarded
    // sites: after the await AND at the top of the catch.
    const site = HOME.indexOf("const { loadCapabilityResolveState } = require('../lib/capability/resolve');");
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site - 900, site + 5200);
    expect(block).toContain('let cancelled = false;');
    expect(block.match(/if \(cancelled\) return;/g)).toHaveLength(2);
    expect(block).toContain('return () => { cancelled = true; };');
  });
});
