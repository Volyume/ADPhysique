/**
 * patterns.test.js -- the catalogue read as rulebook patterns (D222, phase 3).
 *
 * Pins, with the real seeded library (campaign16.helpers LIBRARY):
 * - every catalogue role and thin-kit stand-in a plan can reach has a
 *   rulebook pattern, so no exercise reaches a plan uncounted;
 * - every choice keeps the muscle the rest of the app counts it for (the
 *   library's primary muscle; back covers lats and upper back, glutes
 *   covers glute_max and glute_med), so a plan's volume claim and its
 *   delivered sets stay one number;
 * - R5 and R16: barbell and bodyweight kits can train side delts; every kit
 *   can train glute_med; no upright row or pullover the registry holds out
 *   is offered;
 * - what each kit cannot train is reported, never hidden (09 s7).
 */
import { structureChoices, patternForName, SUPPLEMENTS } from '../patterns';
import { PATTERNS } from '../rulebook';
import { CATALOGUE, THIN_KIT, CATALOGUE_PROFILES } from '../../plan/catalogue';

const { LIBRARY } = require('../../__tests__/campaign16.helpers');

const COARSE = { lats: 'back', upper_back: 'back', glute_max: 'glutes', glute_med: 'glutes' };
const byName = new Map(LIBRARY.map((e) => [e.name, e]));

describe('every reachable catalogue name has a pattern', () => {
  test('roles and thin-kit stand-ins', () => {
    const missing = [];
    for (const [muscle, roles] of Object.entries(CATALOGUE)) {
      for (const r of roles) {
        if (r.credited || ['forearms', 'neck', 'tibialis'].includes(muscle)) continue;
        for (const n of r.names) if (!patternForName(muscle, r.id, n)) missing.push(`${muscle}.${r.id}: ${n}`);
        for (const kit of Object.values(THIN_KIT)) {
          for (const n of kit[muscle]?.[r.id] || []) if (!patternForName(muscle, r.id, n)) missing.push(`thin ${muscle}.${r.id}: ${n}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('choices per kit', () => {
  const all = Object.fromEntries(CATALOGUE_PROFILES.map((k) => [k, structureChoices({ library: LIBRARY, profile: k })]));

  test('every choice keeps the muscle the rest of the app counts it for', () => {
    const wrong = [];
    for (const [kit, r] of Object.entries(all)) {
      for (const list of Object.values(r.byPattern)) {
        for (const c of list) {
          const lib = String(byName.get(c.name)?.primaryMuscle || '');
          if ((COARSE[c.muscle] ?? c.muscle) !== lib) wrong.push(`${kit} ${c.name}: ${c.muscle} vs ${lib}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  test('every choice carries the profile it is offered for and a known pattern', () => {
    for (const [kit, r] of Object.entries(all)) {
      for (const [p, list] of Object.entries(r.byPattern)) {
        expect(PATTERNS[p]).toBeDefined();
        for (const c of list) expect([kit, c.name, (byName.get(c.name)?.equipmentProfiles || []).includes(kit)]).toEqual([kit, c.name, true]);
      }
    }
  });

  test('R5 and R16: side delts and glute_med are trainable in every kit', () => {
    for (const [kit, r] of Object.entries(all)) {
      expect([kit, (r.byPattern.lateral || []).length > 0]).toEqual([kit, true]);
      expect([kit, (r.byPattern.abduction || []).length > 0]).toEqual([kit, true]);
    }
    expect(all.barbell_plates.byPattern.lateral.map((c) => c.name)).toEqual(['Plate Lateral Raise']);
    expect(all.bodyweight.byPattern.lateral.map((c) => c.name)).toEqual(['Band Lateral Raise']);
  });

  test('a full gym lists the catalogue first and supplements last', () => {
    expect(all.full_gym.byPattern.lateral[0].name).toBe('Dumbbell Lateral Raise');
    expect(all.full_gym.byPattern.lateral.at(-1).from).toBe('supplement');
  });

  test('no upright row, and no pullover the registry holds out (Dumbbell Pullover, contested)', () => {
    const names = Object.values(all).flatMap((r) => Object.values(r.byPattern).flat().map((c) => c.name));
    expect(names.filter((n) => /upright row/i.test(n))).toEqual([]);
    expect(names).not.toContain('Dumbbell Pullover');
    const supplementNames = Object.values(SUPPLEMENTS).flat().map((s) => s.name);
    expect(supplementNames).not.toContain('Dumbbell Pullover');
  });

  test('barbell hinges and the standing barbell press load the spine', () => {
    const hinge = all.full_gym.byPattern.hinge.find((c) => c.name === 'Romanian Deadlift (Barbell)');
    expect(hinge.extraJoints).toContain('spinal_axial');
    const db = all.full_gym.byPattern.hinge.find((c) => c.name === 'Romanian Deadlift (Dumbbell)');
    expect(db.extraJoints).toEqual([]);
    expect(all.full_gym.byPattern.ohp[0].extraJoints).toContain('spinal_axial');
  });

  test('what a kit cannot train is reported (09 s7)', () => {
    expect(all.full_gym.untrainable).toEqual([]);
    expect(all.machines_cables.untrainable).toEqual([]);
    // Dumbbells train the lats with the straight-arm pullover (register
    // D222); a barbell kit has no vertical pull or pullover, so its lats are
    // trained through rows and the plan says so.
    expect(all.dumbbells_only.untrainable).toEqual(['adductors']);
    expect(all.home_gym.untrainable).toEqual(['adductors']);
    expect(all.dumbbells_only.byPattern.pullover.map((c) => c.name)).toEqual(['Straight-Arm Dumbbell Pullover']);
    expect(all.barbell_plates.untrainable).toEqual(['lats', 'adductors']);
    expect(all.bodyweight.untrainable).toEqual(['traps', 'adductors']);
  });

  test('the person\'s own logged exercise comes first within its pattern', () => {
    const r = structureChoices({ library: LIBRARY, profile: 'full_gym', loggedExerciseNames: ['Machine Lateral Raise'] });
    expect(r.byPattern.lateral[0].name).toBe('Machine Lateral Raise');
    expect(r.byPattern.lateral[0].logged).toBe(true);
  });

  test('a sole pattern is never claimed in a full gym', () => {
    expect(all.full_gym.solePatternMuscles).toEqual([]);
    expect(all.dumbbells_only.solePatternMuscles).toContain('glute_med');
  });
});
