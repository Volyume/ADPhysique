/**
 * The volume band is built from the athlete's own plan.
 *
 * Founder ruling 2026-08-23: the volume targets in Settings must be
 * consistent with the user's plan, "not just rudimental". Before this,
 * the display lane's bottom layer was VOLUME_LANDMARKS, a flat
 * population table, while the plan the athlete follows was generated
 * from planEngine.computeLandmarks, personalised by experience,
 * recovery, phase and age. Two starting points, and the app showed the
 * cruder one.
 *
 * This suite pins both halves as behaviour: what a plan programs per
 * muscle, and the band built around it. Every case is checked against
 * the real allocator and the real landmark maths, and the last describe
 * proves the numbers genuinely differ from the research table, so the
 * suite cannot pass on a band that quietly stayed rudimentary.
 */
import { plannedWeeklyVolumeByMuscle, buildPlanLandmarks } from '../planVolumeTargets';
import { VOLUME_LANDMARKS } from '../algorithms';

const ex = (primaryMuscle, secondaryMuscles = []) => ({ primaryMuscle, secondaryMuscles });
const slot = (recommendedSets, exercise) => ({ recommendedSets, exercise });

const INTERMEDIATE = { experience: 'intermediate', recoveryRating: 'average', trainingPhase: 'maintain', age: 35 };
const BEGINNER = { experience: 'beginner', recoveryRating: 'poor', trainingPhase: 'aggressive_cut', age: 62 };

describe('what the plan programs each week', () => {
  test('a primary muscle earns the whole set, a secondary earns its contribution', () => {
    const planned = plannedWeeklyVolumeByMuscle([
      { exercises: [slot(4, ex('chest', [{ muscle: 'triceps', contribution: 0.5 }]))] },
    ]);
    expect(planned.chest).toBe(4);
    expect(planned.triceps).toBe(2);
  });

  test('every training day in the plan adds to the week', () => {
    const push = { exercises: [slot(4, ex('chest')), slot(3, ex('chest'))] };
    const upper = { exercises: [slot(3, ex('chest'))] };
    expect(plannedWeeklyVolumeByMuscle([push, upper]).chest).toBe(10);
  });

  test('a slot with no prescribed sets contributes nothing', () => {
    expect(plannedWeeklyVolumeByMuscle([
      { exercises: [slot(0, ex('chest')), slot(null, ex('chest')), { exercise: ex('chest') }] },
    ])).toEqual({});
  });

  test('an exercise whose muscle never resolved is skipped, not crashed on', () => {
    expect(() => plannedWeeklyVolumeByMuscle([
      { exercises: [slot(3, { primaryMuscle: null, secondaryMuscles: [] })] },
    ])).not.toThrow();
  });

  test('no plan at all is no planned volume', () => {
    expect(plannedWeeklyVolumeByMuscle([])).toEqual({});
    expect(plannedWeeklyVolumeByMuscle(null)).toEqual({});
    expect(plannedWeeklyVolumeByMuscle([{ exercises: null }])).toEqual({});
  });
});

describe('the band around what the plan aims at', () => {
  test("the plan's weekly total becomes the sweet spot for that muscle", () => {
    const { table, source } = buildPlanLandmarks({
      plannedByMuscle: { chest: 16 },
      userProfile: INTERMEDIATE,
    });
    expect(table.chest.mav).toBe(16);
    expect(source.chest).toBe('plan');
  });

  test('the floor and ceiling stay the ones the plan itself was built to respect', () => {
    const profileOnly = buildPlanLandmarks({ userProfile: INTERMEDIATE }).table.chest;
    const withPlan = buildPlanLandmarks({
      plannedByMuscle: { chest: 16 }, userProfile: INTERMEDIATE,
    }).table.chest;
    // A plan aiming inside the profile's range leaves both ends alone, so
    // a plan that programs past what the athlete can recover from still
    // reads near the top of the bar rather than being re-centred.
    expect(withPlan.mev).toBe(profileOnly.mev);
    expect(withPlan.mrv).toBe(profileOnly.mrv);
  });

  test('a muscle the plan never trains falls to the profile band, not research', () => {
    const { table, source } = buildPlanLandmarks({
      plannedByMuscle: { chest: 16 }, userProfile: BEGINNER,
    });
    expect(source.quads).toBe('profile');
    expect(table.quads.mev).not.toBe(VOLUME_LANDMARKS.quads.mev);
  });

  test('no profile and no plan is the research table, named honestly', () => {
    const { table, source } = buildPlanLandmarks({});
    expect(source.chest).toBe('research');
    expect(table.chest).toMatchObject({
      mev: VOLUME_LANDMARKS.chest.mev,
      mav: VOLUME_LANDMARKS.chest.mav,
      mrv: VOLUME_LANDMARKS.chest.mrv,
    });
  });

  test('the band stays orderable however little or much the plan programs', () => {
    for (const planned of [1, 2, 5, 16, 40, 80]) {
      const { mev, mav, mrv } = buildPlanLandmarks({
        plannedByMuscle: { chest: planned }, userProfile: INTERMEDIATE,
      }).table.chest;
      expect(mev).toBeGreaterThanOrEqual(1);
      expect(mev).toBeLessThanOrEqual(mav);
      expect(mav).toBeLessThan(mrv);
    }
  });

  test('a fractional planned total is a whole number of sets on screen', () => {
    // A secondary muscle earns half a set, so a week can plan 7.5.
    expect(buildPlanLandmarks({
      plannedByMuscle: { chest: 7.5 }, userProfile: INTERMEDIATE,
    }).table.chest.mav).toBe(8);
  });
});

describe('the numbers really are not the research table', () => {
  test("a beginner's band differs from an advanced athlete's on the same muscle", () => {
    const beginner = buildPlanLandmarks({ userProfile: BEGINNER }).table.chest;
    const advanced = buildPlanLandmarks({
      userProfile: { experience: 'advanced', recoveryRating: 'good', trainingPhase: 'build', age: 25 },
    }).table.chest;
    expect(beginner.mev).not.toBe(advanced.mev);
    expect(beginner.mrv).not.toBe(advanced.mrv);
  });

  test('and a plan moves the sweet spot off the research value', () => {
    const research = VOLUME_LANDMARKS.chest.mav;
    const withPlan = buildPlanLandmarks({
      plannedByMuscle: { chest: research + 5 }, userProfile: INTERMEDIATE,
    }).table.chest;
    expect(withPlan.mav).toBe(research + 5);
  });
});
