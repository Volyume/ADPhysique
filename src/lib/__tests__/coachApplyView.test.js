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
  classifyMacroCycleApply,
  floorHoldLine,
  floorClampLine,
  preTapTargetLine,
  signedEnergyChange,
} from '../coachApplyView';
import { computeCalorieTargets, computeMacroCycle, kcalFloorForSex } from '../coachApply';

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

  test('unknown sex uses the protective 1200 floor, matching kcalFloorForSex', () => {
    const r = classifyCalorieApply(targets(1200), -100, null);
    expect(r.kind).toBe('floor_hold');
    expect(r.floorKcal).toBe(kcalFloorForSex(null));
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

describe('classifyMacroCycleApply: the floored split explains itself (NU-3)', () => {
  test('a floored female target classifies the refused cycle as floor_hold', () => {
    // The edFloorSeams.f3 case: 1200 kcal, 100 g carbs. The split is
    // structurally fine but a rest day would serve below the floor.
    const nut = { targetKcal: 1200, proteinG: 120, carbsG: 100, fatG: 40 };
    const r = classifyMacroCycleApply(nut, 4, 'female');
    expect(r.kind).toBe('floor_hold');
    expect(r.floorKcal).toBe(1200);
    expect(computeMacroCycle(nut, 4, { sex: 'female' })).toBeNull();
  });

  test('with real headroom the cycle classifies ok and carries the real split', () => {
    const nut = { targetKcal: 2400, proteinG: 180, carbsG: 250, fatG: 70 };
    const r = classifyMacroCycleApply(nut, 4, 'female');
    expect(r.kind).toBe('ok');
    expect(r.split).toEqual(computeMacroCycle(nut, 4, { sex: 'female' }));
  });

  test('a structurally impossible cycle is unavailable, never blamed on the floor', () => {
    // 7 training days leaves no rest day to pull carbs from at any target.
    const nut = { targetKcal: 2400, proteinG: 180, carbsG: 250, fatG: 70 };
    expect(classifyMacroCycleApply(nut, 7, 'female').kind).toBe('unavailable');
    // No carbs to split at all.
    expect(classifyMacroCycleApply({ targetKcal: 2400, carbsG: null }, 4, 'female').kind).toBe('unavailable');
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
