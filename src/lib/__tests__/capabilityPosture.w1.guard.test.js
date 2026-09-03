/**
 * CC33 D112 R3/R4 - source-level guards on the W1 posture fixes (audit
 * findings T2-19, T1-09, T1-21, T1-22, T2-04, T2-09).
 *
 * Why source guards: each of these is a screen-level failure POSTURE - a
 * catch clause, a pre-flight gate, a state-handling branch - whose
 * regression would be silent (nothing crashes when a catch quietly fails
 * open again). The repo's founder-rule convention pins them at source so
 * the exact fail-open shapes the audit found cannot come back unnoticed.
 *
 * Each block quotes the defect it locks out.
 */
const fs = require('fs');
const path = require('path');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');

describe('T2-19 - the coach Apply hold re-check fails SAFE', () => {
  const src = read('screens/CoachOutputScreen.js');
  const safety = read('lib/coachApplySafety.js');

  test('the catch no longer resets holds to an empty set (the body-wide fail-open)', () => {
    expect(src).not.toMatch(/catch\s*\(_?e?\)\s*{\s*holdMuscles\s*=\s*new Set\(\)/);
  });

  test('a failed re-check withholds the increase and says so', () => {
    expect(safety).toMatch(/return null/);
    expect(src).toMatch(/holdMuscles\s*=\s*await loadVolumeIncreaseHolds/);
    expect(src).toMatch(/holdMuscles === null/);
    expect(src).toMatch(/could not check how you train just now, so this increase waits/);
  });

  test('round 19 (R19-1): the withhold triggers on KNOWLEDGE, not on a throw', () => {
    // The catch was the gate's ONLY trigger, and loadCapabilityResolveState
    // cannot reject - its whole body is one try/catch - so a cold read
    // failure RETURNED the unknown-empty shape, nothing threw, holdMuscles
    // stayed an empty Set and the increase applied body-wide on a read that
    // knew nothing. Exactly the posture D112 R3 forbids, shipped under this
    // suite's own string pins: a source guard cannot see a gate's fail
    // direction (D130 ruling 5's class). capabilityKnown's fail direction is
    // driven at the real loader in ActiveWorkoutScreen.sideCarveNote.guard.
    expect(safety).toContain('if (!capability.capabilityKnown(capState)) return null;');
    const gate = safety.indexOf('if (!capability.capabilityKnown(capState)) return null;');
    const holds = safety.indexOf('holdMuscles.add(exercise.primaryMuscle)');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(holds);
    expect(safety).toContain('loadCapabilityResolveState(userId, {})');
  });
});

describe('T1-09 - blockAdvisor adopts the fail-safe capability read', () => {
  const src = read('lib/blockAdvisor.js');

  test('the catch treats an unreadable state as possibly affected, and logs', () => {
    const catchBlock = src.match(/episodeConflicts\(intentState\?\.capability[\s\S]{0,900}/)?.[0] ?? '';
    expect(catchBlock).toMatch(/capabilityAffected = true/);
    expect(catchBlock).toMatch(/blockAdvisor\.capabilityRead/);
    expect(catchBlock).not.toMatch(/catch\s*\(_e\)\s*{\s*capabilityAffected = false/);
  });
});

describe('T1-21 - pre-flight on the paths that were missing it', () => {
  test('travel mode takes the capability pre-flight before building', () => {
    const src = read('screens/BuildWorkoutScreen.js');
    const fn = src.match(/async function applyTravelMode[\s\S]{0,1200}/)?.[0] ?? '';
    expect(fn).toMatch(/capabilityPreflight/);
    expect(fn).toMatch(/offerCapabilityPreflightChoice/);
  });

  test('the rebuild PREVIEW takes the same pre-flight as the commit', () => {
    const src = read('screens/PlanUpdateScreen.js');
    const fn = src.match(/async function handleRebuildPress[\s\S]{0,1500}/)?.[0] ?? '';
    expect(fn).toMatch(/capabilityPreflight/);
    // Ordering: the gate must come before the dry run inside the handler.
    expect(fn.indexOf('capabilityPreflight')).toBeLessThan(fn.indexOf('generatePlanDryRun'));
  });
});

describe('T1-22 - the start-plan flow never silently falls to the unfiltered pool', () => {
  // RE-POINTED (D137, fully free product): FreeStarterScreen.js (the
  // hand-rolled quiz that implemented this class itself, per the
  // capabilityCensus CLASS1_EXEMPT comment: "Already implements the class
  // by hand (CAP-17)") is deleted outright. Its CAP-17 gate is not lost --
  // it was generalised into the shared lib/capability/preflight.js module
  // this file already documents as the canonical implementation, and every
  // "Start with a plan" surface (HomeScreen.js, PlansScreen.js) now calls
  // it before generating, in place of the quiz's bespoke pool filter.
  const preflight = read('lib/capability/preflight.js');
  const home = read('screens/HomeScreen.js');
  const plans = read('screens/PlansScreen.js');

  test('a last-known (stale) capability state is kept, never discarded', () => {
    // The defect shape this test used to pin directly on FreeStarterScreen:
    // `if (!st.empty && !st.unavailable)` threw away a served last-known
    // state and recommended from the raw pool. The shared preflight module
    // now owns this decision for every surface: an unavailable-but-stale
    // read still proceeds ON that last-known state (never discards it).
    expect(preflight).toMatch(/if \(state\.stale\) return \{ proceed: true, state \};/);
  });

  test('an unknown capability state (no last-known at all) gates activation with an explicit choice', () => {
    expect(preflight).toMatch(/return \{ proceed: false, state \};/);
    // RE-ANCHORED (D139): the "Start with a plan" surfaces preview before they
    // commit, so the gate + the explicit choice moved into the shared prepare
    // step (lib/startWithPlan.js) that both call, in the same position: the
    // pre-flight, then the choice, then a refusal that writes nothing, then
    // the READ-ONLY dry run. A surface that still inlines the gate is pinned
    // exactly as before.
    const helper = read('lib/startWithPlan.js');
    for (const src of [home, plans]) {
      if (/prepareStartWithPlan\(/.test(src)) {
        expect(helper).toMatch(/capabilityPreflight\(userId\)/);
        expect(helper).toMatch(/offerCapabilityPreflightChoice/);
        expect(helper).toMatch(/if \(!goAhead\) return \{ ok: false, reason: 'preflight_hold'/);
        expect(helper.indexOf('capabilityPreflight(')).toBeLessThan(helper.indexOf('generatePlanDryRun('));
        continue;
      }
      // Window widened 700 -> 900 (D137): HomeScreen's action now carries a
      // re-entrancy guard ahead of the preflight; the three pins are unchanged.
      const start = src.match(/onAction=\{async \(\) => \{[\s\S]{0,900}/)?.[0] ?? '';
      expect(start).toMatch(/capabilityPreflight/);
      expect(start).toMatch(/offerCapabilityPreflightChoice/);
      expect(start).toMatch(/if \(!goAhead\) return;/);
    }
  });
});

describe('T2-04 - the serve effect cannot re-fire onto a manual add', () => {
  test('the empty-session branch marks the workout applied', () => {
    const src = read('screens/ActiveWorkoutScreen.js');
    expect(src).toMatch(/if \(!workoutExercises\.length\) { effectiveAppliedRef\.current = activeWorkout\.id; return; }/);
  });

  test('the store stamps every in-session add as the user\'s own', () => {
    const src = read('store/useAppStore.js');
    // Window widened round 12: the R12-3 slot-id mint sits between the
    // action's opening and the _userAdded stamp now.
    const fn = src.match(/addExerciseToWorkout:[\s\S]{0,1600}/)?.[0] ?? '';
    expect(fn).toMatch(/_userAdded: true/);
  });
});

describe('T2-09 - a failed capability read on the swap surfaces says so, in the right lane', () => {
  test.each(['screens/ActiveWorkoutScreen.js', 'screens/RoutineDetailScreen.js'])('%s', (rel) => {
    const src = read(rel);
    expect(src).toMatch(/could not check how you train just now, so nothing is filtered for it here/);
    // The honest line only fires when nothing at all is known: an
    // unavailable read WITH last-known state still filters, so it must
    // key on unavailable AND empty together.
    expect(src).toMatch(/capability\?\.unavailable && state\?\.capability\?\.empty/);
  });
});
