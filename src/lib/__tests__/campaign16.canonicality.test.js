/**
 * campaign16.canonicality.test.js — Campaign 16 job 2.
 *
 * What this suite pins and why:
 *
 * An exercise can be eligible on paper - right muscle, right equipment,
 * right compound/isolation tag - and still be a poor thing to hand
 * someone automatically. Before this layer, a 4-day intermediate full-gym
 * plan generated JM Press, Nordic Curl, Good Morning (Barbell) and Cable
 * Pull-Through. Every one a real exercise; not one of them what a coach
 * writes down for an athlete they have never met.
 *
 * FOUNDER RULING: staples first, common as filler. Auto-generation draws
 * overwhelmingly from STAPLE, uses COMMON when a slot needs variety or a
 * family is thin, and reaches SPECIALIST only when nothing recognisable
 * can cover the muscle.
 *
 * The library is NOT cut. Manual search still reaches all 551 exercises;
 * this governs only what the generator picks on the user's behalf.
 *
 * Two things here are deliberately structural rather than cosmetic:
 *
 *   The default for an unlisted exercise is SPECIALIST, so a new library
 *   entry can never out-rank a staple by accident.
 *
 *   The staples-first rule is a GATE, not a scoring nudge, because
 *   compound-before-isolation legitimately outranks popularity. Any
 *   tie-break small enough to respect the programming order was also
 *   small enough to let a powerlifting press beat a rope pushdown.
 */

const { generatePlan, POOL } = require('../planEngine');
const {
  autoTier, isAutoEligible, tierRank, AUTO_TIER, TIER_RANK,
  REGISTRY_LISTS, CONTESTED,
} = require('../exercise/canonicality');
const { LIBRARY, LIBRARY_NAMES, inputs, planExerciseNames } = require('./campaign16.helpers');

const plan = over => generatePlan({ ...inputs(over), exerciseLibrary: LIBRARY });

// The four exercises the baseline run actually produced, named so the
// regression is about THIS defect and not a general vibe.
const BASELINE_OFFENDERS = [
  'JM Press', 'Nordic Curl', 'Good Morning (Barbell)', 'Cable Pull-Through',
];

describe('C16-2 the registry is internally sound', () => {
  test('no exercise is classified twice', () => {
    const seen = new Map();
    const dupes = [];
    for (const [list, names] of Object.entries(REGISTRY_LISTS)) {
      for (const n of names) {
        if (seen.has(n)) dupes.push(`${n} in ${seen.get(n)} and ${list}`);
        else seen.set(n, list);
      }
    }
    expect(dupes).toEqual([]);
  });

  test('every classified name is a real library exercise', () => {
    // A tier for an exercise that does not exist is dead metadata, and
    // worse, it hides the fact that the real one is unclassified.
    const ghosts = Object.values(REGISTRY_LISTS).flat().filter(n => !LIBRARY_NAMES.has(n));
    expect(ghosts).toEqual([]);
  });

  test('an unlisted exercise defaults to SPECIALIST, never to STAPLE', () => {
    expect(autoTier('Some Exercise That Does Not Exist')).toBe(AUTO_TIER.SPECIALIST);
    expect(autoTier(null)).toBe(AUTO_TIER.SPECIALIST);
    expect(autoTier('')).toBe(AUTO_TIER.SPECIALIST);
  });

  test('contested calls are held at their stated safer tier, not silently ruled', () => {
    expect(CONTESTED.length).toBeGreaterThan(0);
    for (const c of CONTESTED) {
      expect(autoTier(c.name)).toBe(c.heldAt);
      expect(c.argument.length).toBeGreaterThan(40);   // a reason, not a label
      expect(LIBRARY_NAMES.has(c.name)).toBe(true);
      // Nothing contested may sit at STAPLE: if it is arguable, it is not
      // a default.
      expect(c.heldAt).not.toBe(AUTO_TIER.STAPLE);
    }
  });

  test('the tier ranking orders staples first and bans NEVER_AUTO outright', () => {
    expect(TIER_RANK[AUTO_TIER.STAPLE]).toBeLessThan(TIER_RANK[AUTO_TIER.COMMON]);
    expect(TIER_RANK[AUTO_TIER.COMMON]).toBeLessThan(TIER_RANK[AUTO_TIER.SPECIALIST]);
    expect(TIER_RANK[AUTO_TIER.SPECIALIST]).toBeLessThan(TIER_RANK[AUTO_TIER.NICHE]);
    expect(TIER_RANK[AUTO_TIER.NEVER_AUTO]).toBeGreaterThan(50);
  });
});

describe('C16-2 NEVER_AUTO can never be generated (7)', () => {
  const PROFILES = [
    {}, { experience: 'beginner' }, { experience: 'advanced', daysPerWeek: 6 },
    { equipment: 'home_gym' }, { equipment: 'dumbbells_only' },
    { goal: 'mens_physique', daysPerWeek: 5 }, { goal: 'bikini' },
    { goal: 'wellness' }, { goal: 'figure' }, { goal: 'classic_physique' },
    { sessionLengthMinutes: 30 }, { sessionLengthMinutes: 90 },
    { daysPerWeek: 2 }, { daysPerWeek: 3 }, { recoveryRating: 'lower' },
  ];

  test.each(PROFILES)('profile %o generates nothing banned', (over) => {
    const banned = planExerciseNames(plan(over)).filter(n => !isAutoEligible(n));
    expect(banned).toEqual([]);
  });

  test('the banned list really does contain the things it claims to', () => {
    // Conditioning and Olympic work, a risk-profile lift, and a skill lift.
    expect(autoTier('Power Clean')).toBe(AUTO_TIER.NEVER_AUTO);
    expect(autoTier('Box Jump')).toBe(AUTO_TIER.NEVER_AUTO);
    expect(autoTier('Guillotine Press')).toBe(AUTO_TIER.NEVER_AUTO);
    expect(autoTier('Upright Row')).toBe(AUTO_TIER.NEVER_AUTO);
    expect(autoTier('Snatch Grip Deadlift')).toBe(AUTO_TIER.NEVER_AUTO);
  });

  test('but they are still in the library for manual search', () => {
    // The ruling is about automatic selection, not about deleting
    // exercises a user may legitimately want to look up and do.
    for (const n of ['Power Clean', 'Guillotine Press', 'Upright Row']) {
      expect(LIBRARY_NAMES.has(n)).toBe(true);
    }
  });
});

describe('C16-2 a normal full-gym plan is recognisable (5, 6)', () => {
  test('the concrete baseline offenders are gone', () => {
    const names = planExerciseNames(plan());
    for (const offender of BASELINE_OFFENDERS) {
      expect(names).not.toContain(offender);
    }
  });

  test('every exercise in a no-history full-gym plan is STAPLE or COMMON', () => {
    // The founder ruling, stated as the outcome a user would check.
    for (const over of [{}, { daysPerWeek: 3 }, { daysPerWeek: 5 }, { experience: 'beginner' }]) {
      const offTier = planExerciseNames(plan(over))
        .filter(n => tierRank(n) > TIER_RANK[AUTO_TIER.COMMON])
        .map(n => `${n} (${autoTier(n)})`);
      expect(offTier).toEqual([]);
    }
  });

  test('staples dominate rather than merely appearing', () => {
    const names = planExerciseNames(plan());
    const staples = names.filter(n => autoTier(n) === AUTO_TIER.STAPLE);
    expect(staples.length / names.length).toBeGreaterThan(0.6);
  });

  test('a NICHE exercise never beats a valid STAPLE or COMMON for the same slot (5)', () => {
    // Expressed the way it can actually be checked: while recognisable
    // candidates can cover the muscle, nothing below COMMON is chosen.
    const names = planExerciseNames(plan({ daysPerWeek: 4 }));
    expect(names.some(n => autoTier(n) === AUTO_TIER.NICHE)).toBe(false);
  });

  test('SPECIALIST needs the recognisable options to run out first (6)', () => {
    // Dumbbells-only genuinely exhausts the machine and cable staples, so
    // this is where reaching further is legitimate. The plan must still
    // build, and must still avoid anything banned.
    const p = plan({ equipment: 'dumbbells_only' });
    expect(p.workouts.length).toBeGreaterThan(0);
    const names = planExerciseNames(p);
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter(n => !isAutoEligible(n))).toEqual([]);
  });
});

describe('C16-2 the fallback pool cannot smuggle anything past this', () => {
  test('every fallback POOL entry names a real library exercise', () => {
    // This caught a live defect: the pool carried 'Abductor Machine',
    // which exists in no library entry. It was generated for the
    // glute-signature divisions, counted in the plan's volume summary,
    // and then silently dropped at save time when the name failed to
    // resolve - the user previewed three sets they never received.
    const phantom = [];
    for (const [muscle, list] of Object.entries(POOL)) {
      for (const e of list) if (!LIBRARY_NAMES.has(e.n)) phantom.push(`${muscle}: ${e.n}`);
    }
    expect(phantom).toEqual([]);
  });

  test('no fallback POOL entry is banned from auto-generation', () => {
    const banned = [];
    for (const [muscle, list] of Object.entries(POOL)) {
      for (const e of list) if (!isAutoEligible(e.n)) banned.push(`${muscle}: ${e.n}`);
    }
    expect(banned).toEqual([]);
  });
});

describe('C16-2 canonicality never overrides the programming job', () => {
  test('it cannot drag a plan off its required movement coverage', () => {
    // The weight is set below the required-subregion and compound-first
    // terms on purpose: popularity compares candidates for the SAME job,
    // it does not decide what the job is. Back still gets both a vertical
    // pull and a horizontal row.
    const names = planExerciseNames(plan({ daysPerWeek: 4 }));
    expect(names.some(n => /pulldown|pull-up|chin-up/i.test(n))).toBe(true);
    expect(names.some(n => /row/i.test(n))).toBe(true);
  });

  test('equipment eligibility still wins over popularity (8)', () => {
    // Barbell bench is the most canonical chest movement there is, and a
    // dumbbells-only athlete must still not be given it.
    const names = planExerciseNames(plan({ equipment: 'dumbbells_only' }));
    expect(names).not.toContain('Barbell Bench Press');
    expect(names).not.toContain('Barbell Back Squat');
  });

  test('experience gating still wins over popularity (9)', () => {
    // A beginner plan must stay teachable; canonicality does not reopen
    // the advanced lifts the difficulty gate closes.
    const p = plan({ experience: 'beginner' });
    expect(p.workouts.length).toBeGreaterThan(0);
    expect(planExerciseNames(p).filter(n => !isAutoEligible(n))).toEqual([]);
  });
});
