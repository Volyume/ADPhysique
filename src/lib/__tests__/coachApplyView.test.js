/**
 * coachApplyView — pins the NU-3/NU-4 Apply-row honesty contract (A1).
 *
 * What this suite pins and why:
 *  - An Apply whose computation nulls at the ED floor must be classifiable as
 *    a floor hold, never rendered as a live button (NU-3: the tap previously
 *    ended its spinner in silence).
 *  - A partial clamp (applied less than the row label implied) must be
 *    classifiable so the row can say "Applied to your safe minimum" (NU-3).
 *  - The classifiers must NEVER disagree with the real coachApply policy
 *    functions: 'ok' iff the compute succeeds unclamped, floor kinds iff the
 *    floor is what intervened. Drift here would let the screen promise a
 *    write the engine refuses (or vice versa).
 *  - The row strings honour the kJ display preference (NU-6) and carry the
 *    audit's exact duration wording (NU-4), with no em dash.
 */
import {
  classifyCalorieApply,
  floorHoldLine,
  floorClampLine,
  preTapTargetLine,
  signedEnergyChange,
} from '../coachApplyView';
import { computeCalorieTargets, kcalFloorForSex } from '../coachApply';

const targets = (targetKcal, extra = {}) => ({
  targetKcal, proteinG: 150, carbsG: 220, fatG: 65, tdee: 2800, ...extra,
});

describe('classifyCalorieApply: floor holds are named, not silent (NU-3)', () => {
  test('a female target AT the 1200 floor classifies a cut as floor_hold', () => {
    const r = classifyCalorieApply(targets(1200), -100, 'female');
    expect(r.kind).toBe('floor_hold');
    expect(r.floorKcal).toBe(1200);
    // Cross-check: the real policy function refuses this write.
    expect(computeCalorieTargets(targets(1200), -100, 'female')).toBeNull();
  });

  test('a male target at the 1500 floor classifies a cut as floor_hold with the male floor', () => {
    const r = classifyCalorieApply(targets(1500), -150, 'male');
    expect(r.kind).toBe('floor_hold');
    expect(r.floorKcal).toBe(1500);
  });

  test('unknown sex uses the protective HIGHER floor, matching kcalFloorForSex (Campaign 1 P0-7 D4 re-anchor)', () => {
    // Deliberate re-anchor (D92): unknown sex now takes the HIGHER floor
    // (1500). Sex is onboarding-enforced, so null only occurs in failure
    // states, and a floor that is too high errs protective - the old pin
    // called the 1200 fallback "protective", which was the defect. A
    // 1200-kcal target under a 1500 floor cuts to a clamp at the floor.
    const r = classifyCalorieApply(targets(1200), -100, null);
    expect(r.floorKcal).toBe(kcalFloorForSex(null));
    expect(r.floorKcal).toBe(1500);
  });

  test('a cut the floor catches PART-WAY classifies as floor_clamp with the clamped absolute', () => {
    // 1300 - 300 would land at 1000; the floor holds it at 1200 (a -100
    // write, not the -300 the row label implies).
    const r = classifyCalorieApply(targets(1300), -300, 'female');
    expect(r.kind).toBe('floor_clamp');
    expect(r.newKcal).toBe(1200);
    expect(computeCalorieTargets(targets(1300), -300, 'female').newKcal).toBe(1200);
  });

  test('a clean change classifies ok with the post-tap absolute (NU-4 pre-tap figure)', () => {
    const r = classifyCalorieApply(targets(2500), -150, 'male');
    expect(r.kind).toBe('ok');
    expect(r.newKcal).toBe(2350);
  });

  test('no change and no current target classify as none/unavailable, never a floor claim', () => {
    expect(classifyCalorieApply(targets(2500), 0, 'male').kind).toBe('none');
    expect(classifyCalorieApply(null, -150, 'male').kind).toBe('unavailable');
    expect(classifyCalorieApply({ targetKcal: null }, -150, 'female').kind).toBe('unavailable');
  });

  test("never reports 'ok' where the real policy function refuses the write", () => {
    for (const sex of ['male', 'female', null]) {
      for (const targetKcal of [null, 1100, 1200, 1350, 1500, 2000, 3000]) {
        for (const change of [-500, -300, -150, -100, 0, 100, 250]) {
          const nut = targetKcal ? targets(targetKcal) : null;
          const r = classifyCalorieApply(nut, change, sex);
          const real = computeCalorieTargets(nut, change, sex);
          if (r.kind === 'ok' || r.kind === 'floor_clamp') {
            expect(real).not.toBeNull();
            expect(real.newKcal).toBe(r.newKcal);
          } else {
            expect(real).toBeNull();
          }
        }
      }
    }
  });
});

// ONE DAILY TRUTH (Campaign 17A, founder law). `classifyMacroCycleApply` and
// `macroCycleHoldLine` explained what applying a training/rest carb cycle
// would do. There is no such apply any more - the cycle itself is gone - so
// the view helpers went with it.
describe('ONE DAILY TRUTH: no carb-cycle apply view helpers exist', () => {
  test('coachApplyView exports no macro-cycle classifier or hold line', () => {
    // eslint-disable-next-line global-require
    const mod = require('../coachApplyView');
    expect(mod.classifyMacroCycleApply).toBeUndefined();
    expect(mod.macroCycleHoldLine).toBeUndefined();
  });
});

describe('row strings: exact wording, kJ preference, no em dash (NU-3/NU-4/NU-6)', () => {
  test('floor hold line', () => {
    expect(floorHoldLine(1200)).toBe('Held at your safe minimum of 1,200 kcal.');
    expect(floorHoldLine(1500, 'kcal')).toBe('Held at your safe minimum of 1,500 kcal.');
    // 1200 kcal × 4.184 = 5020.8 → 5,021 kJ.
    expect(floorHoldLine(1200, 'kj')).toBe('Held at your safe minimum of 5,021 kJ.');
  });

  test('partial clamp line', () => {
    expect(floorClampLine(1200)).toBe('Applied to your safe minimum, 1,200 kcal.');
    expect(floorClampLine(1200, 'kj')).toBe('Applied to your safe minimum, 5,021 kJ.');
  });

  test('pre-tap target line states the absolute and the honest duration', () => {
    expect(preTapTargetLine(2350)).toBe('→ 2,350 kcal/day, stays until your next check-in.');
    expect(preTapTargetLine(2350, 'kj')).toBe('→ 9,832 kJ/day, stays until your next check-in.');
    expect(preTapTargetLine(1200, 'kcal', { clampedToFloor: true }))
      .toBe('→ 1,200 kcal/day, stays until your next check-in. That is your safe minimum.');
  });

  test('signed change figure', () => {
    expect(signedEnergyChange(150)).toBe('+150 kcal');
    expect(signedEnergyChange(-150)).toBe('-150 kcal');
    expect(signedEnergyChange(-150, 'kj')).toBe('-628 kJ');
  });

  test('no string ever labels the write "next week", and none carries an em dash', () => {
    const all = [
      floorHoldLine(1200), floorClampLine(1200),
      preTapTargetLine(2350), preTapTargetLine(1200, 'kcal', { clampedToFloor: true }),
      signedEnergyChange(-150),
    ];
    for (const s of all) {
      expect(s).not.toMatch(/next week/i);
      expect(s).not.toContain('—');
    }
  });
});
