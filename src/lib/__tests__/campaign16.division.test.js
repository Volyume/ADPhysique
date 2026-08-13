/**
 * campaign16.division.test.js — division-specific shape and exercise
 * intelligence, traced end to end.
 *
 * FOUNDER ORDER (2026-08-13): research first, then ONE canonical
 * division-profile model, then all nine divisions traced end to end, with
 * within-muscle roles, an exercise-selection order in which personal
 * evidence may pick the exercise for a role but must not erase the role,
 * weak points composing with division, time trimming protecting division
 * priorities, swaps preserving purpose, and division intent surviving block
 * boundaries.
 *
 * AUTHORITY for every assertion here:
 *   docs/plan-generation-campaign-16/DIVISION-EVIDENCE-REGISTER.md
 * which quotes the current NPC / IFBB Pro League criteria verbatim with
 * sources, plus PMIDs 34743671, 41379528 and 35438660 for the claim that
 * exercise selection changes WHERE a muscle grows. Where a test asserts a
 * division's character, the register section is named in the test.
 */

const fs = require('fs');
const path = require('path');
const { generatePlan } = require('../planEngine');
const {
  DIVISION_PROFILES, DIVISION_KEYS, DIVISION_ROLE, LEG_CHARACTER, SWEEP,
  divisionProfile, divisionRoles, divisionPoolRule, divisionPriorityMuscles,
  divisionLegCharacter, hasRaisedGluteCeiling, divisionVolumeBias, isDivision,
  fillsDivisionRole,
} = require('../division/profile');
const { movementFamily, isSweepBiased } = require('../exercise/movementFamily');
const { slotKey, applyContinuity, SLOT_OUTCOME } = require('../exercise/continuity');
const { LIBRARY, BY_NAME, inputs, planExercises } = require('./campaign16.helpers');

const src = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const plan = over => generatePlan({ ...inputs(over), exerciseLibrary: LIBRARY });

// A finished plan carries exercise NAMES, not the engine's internal muscle
// tags: the library is what says which muscle a name trains, and reading it
// back the same way the app does is the only honest way to assert on a plan.
const muscleOf = name => BY_NAME.get(name)?.primaryMuscle ?? null;
const familyOfName = (name, muscle) =>
  movementFamily(name, muscle, BY_NAME.get(name)?.subregion ?? null);

/** Every division Volyume offers, as the founder listed them. */
const NINE = [
  'general', 'mens_physique', 'classic_physique', 'bodybuilding',
  'bikini', 'figure', 'wellness', 'womens_physique', 'womens_bodybuilding',
];

/** The families present for one muscle in a generated plan. */
function familiesFor(p, muscle) {
  const out = new Set();
  for (const name of namesFor(p, muscle)) {
    const f = familyOfName(name, muscle);
    if (f) out.add(f);
  }
  return out;
}

function namesFor(p, muscle) {
  return planExercises(p)
    .filter(e => muscleOf(e.exerciseName) === muscle)
    .map(e => e.exerciseName);
}

const weeklySets = (p, muscle) => planExercises(p)
  .filter(e => muscleOf(e.exerciseName) === muscle)
  .reduce((s, e) => s + (e.sets ?? 0), 0);

// ---------------------------------------------------------------------------
// 1. One canonical model, nine divisions, every rule traced
// ---------------------------------------------------------------------------

describe('C16-DIV the model is canonical and complete', () => {
  test('all nine divisions have a profile, and there are no others', () => {
    expect(DIVISION_KEYS.slice().sort()).toEqual(NINE.slice().sort());
    for (const d of NINE) expect(DIVISION_PROFILES[d]).toBeDefined();
  });

  test('every profile cites the judging criteria it came from', () => {
    for (const d of NINE) {
      const p = DIVISION_PROFILES[d];
      expect(p.source).toMatch(/DIVISION-EVIDENCE-REGISTER\.md §1\.\d+/);
      expect(typeof p.criteria).toBe('string');
      expect(p.criteria.length).toBeGreaterThan(40);
    }
  });

  test('the register those citations point at exists and quotes real sources', () => {
    const reg = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'docs', 'plan-generation-campaign-16',
        'DIVISION-EVIDENCE-REGISTER.md'), 'utf8',
    );
    // The primary sources, by name, not by paraphrase.
    expect(reg).toContain('npcnewsonline.com');
    expect(reg).toContain('ifbbproofficial.com');
    for (const pmid of ['34743671', '41379528', '35438660']) {
      expect(reg).toContain(pmid);
    }
    // Every section a profile cites is really in the register.
    for (const d of NINE) {
      const sec = DIVISION_PROFILES[d].source.match(/§(1\.\d+)/)[1];
      expect(reg).toMatch(new RegExp(`### ${sec.replace('.', '\\.')} `));
    }
  });

  test('division character is read from the profile, not re-declared in the engine', () => {
    const engine = src('planEngine.js');
    // The four tables and inline goal lists this model replaced.
    expect(engine).not.toMatch(/const DIVISION_POOL_RULES\s*=/);
    expect(engine).not.toMatch(/const DIVISION_SUBREGION_BIAS\s*=/);
    expect(engine).not.toMatch(/goal === 'bikini' \|\| goal === 'wellness'/);
    expect(engine).not.toMatch(/goal === 'bodybuilding' \|\| goal === 'classic_physique'/);
    // And it reads the canonical one instead.
    expect(engine).toMatch(/from '\.\/division\/profile'/);
  });

  test('a non-division goal reads General rather than falling through a hole', () => {
    for (const goal of ['hypertrophy', 'strength_hypertrophy', 'weak_point_spec', null]) {
      expect(divisionProfile(goal)).toBe(DIVISION_PROFILES.general);
      expect(isDivision(goal)).toBe(false);
    }
    expect(isDivision('bikini')).toBe(true);
    expect(isDivision('general')).toBe(false);
  });

  test('the volume bias is referenced, not copied into a second table', () => {
    // Two sources of truth for the same numbers is how they drift.
    for (const d of NINE) {
      const bias = divisionVolumeBias(d);
      expect(bias).toBe(require('../coachingGoals').GOAL_OVERLAYS[d]);
    }
  });

  test('General invents no emphasis', () => {
    // Most Volyume users are here, and no judging criteria exist for them.
    expect(divisionPriorityMuscles('general')).toEqual([]);
    expect(DIVISION_PROFILES.general.deEmphasised).toEqual([]);
    expect(DIVISION_PROFILES.general.roles).toEqual({});
    expect(divisionPoolRule('general', 'quads')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Within-muscle roles, from the criteria
// ---------------------------------------------------------------------------

describe('C16-DIV within-muscle roles say what the criteria say', () => {
  test('Figure gets back depth AND width, and the quad sweep (register §1.3)', () => {
    // "rounded delts, sweep to the quads, back depth, and width", verbatim.
    // This is the gap the research found: the one division whose published
    // criteria name quad sweep in writing had no quad role at all.
    expect(divisionRoles('figure', 'back'))
      .toEqual([DIVISION_ROLE.BACK_WIDTH, DIVISION_ROLE.BACK_DEPTH]);
    expect(divisionRoles('figure', 'quads')).toEqual([SWEEP]);
    expect(DIVISION_PROFILES.figure.criteria).toContain('sweep to the quads');
    expect(DIVISION_PROFILES.figure.criteria).toContain('back depth, and width');
  });

  test('Bikini gets the round glute and the tie-in, and lat width only (§1.2)', () => {
    expect(divisionRoles('bikini', 'glutes'))
      .toEqual([DIVISION_ROLE.GLUTE_ROUND, DIVISION_ROLE.GLUTE_TIE_IN]);
    expect(divisionRoles('bikini', 'back'))
      .toEqual([DIVISION_ROLE.BACK_WIDTH, DIVISION_ROLE.BACK_SHOULDER_EXTENSION]);
    // Rows and deadlifts are excluded by an ALLOW-list, so a hinge cannot
    // leak back in through a new family.
    expect(divisionPoolRule('bikini', 'back').allowSubs)
      .toEqual(['vertical_pull', 'shoulder_extension']);
  });

  test('the divisions judged on everything get both roles of a two-role muscle', () => {
    for (const d of ['bodybuilding', 'womens_bodybuilding', 'womens_physique']) {
      expect(divisionRoles(d, 'back')).toHaveLength(2);
      expect(divisionRoles(d, 'quads')).toHaveLength(2);
      expect(DIVISION_PROFILES[d].deEmphasised.length).toBeLessThanOrEqual(1);
    }
  });

  test('Men\'s Physique de-emphasises the legs nobody sees, but never to zero (§1.7)', () => {
    const p = DIVISION_PROFILES.mens_physique;
    expect(p.legs).toBe(LEG_CHARACTER.NOT_PRESENTED);
    expect(p.deEmphasised).toEqual(expect.arrayContaining(['quads', 'hamstrings', 'glutes']));
    expect(p.criteria).toContain('board shorts');
    // Symmetry is still judged, so every de-emphasised muscle keeps volume.
    const built = plan({ goal: 'mens_physique', daysPerWeek: 4, sessionLengthMinutes: 90 });
    for (const m of p.deEmphasised) {
      if (m === 'abs' || m === 'traps') continue; // not structural
      expect(weeklySets(built, m)).toBeGreaterThan(0);
    }
  });

  test('Wellness is defined relative to Bikini, as the rulebook defines it (§1.5)', () => {
    expect(DIVISION_PROFILES.wellness.criteria)
      .toContain('bigger lower body than in Bikini');
    // Quads are judged here and not in Bikini: that is the whole difference.
    expect(divisionPriorityMuscles('wellness')).toContain('quads');
    expect(divisionPriorityMuscles('bikini')).not.toContain('quads');
    expect(divisionRoles('wellness', 'quads')).toEqual([SWEEP]);
  });

  test('the glute roles use the glute vocabulary, not the hamstring one', () => {
    // Glutes are not family-classified, so a FAMILY constant here would
    // match nothing in the pool and the role would silently do nothing.
    expect(DIVISION_ROLE.GLUTE_ROUND).toBe('activator');
    expect(DIVISION_ROLE.GLUTE_TIE_IN).toBe('stretcher');
    for (const d of NINE) {
      for (const role of divisionRoles(d, 'glutes')) {
        expect(['activator', 'stretcher', 'pumper']).toContain(role);
      }
    }
  });

  test('sweep is an emphasis, never counted as a separate family', () => {
    // A hack squat and a back squat are the SAME family. If sweep were
    // treated as coverage, two squats would pass as two quad roles.
    expect(SWEEP).toBe('sweep');
    expect(fillsDivisionRole('figure', 'quads', 'squat_press', false)).toBe(false);
    expect(fillsDivisionRole('figure', 'quads', 'squat_press', true)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. The roles reach the plan
// ---------------------------------------------------------------------------

describe('C16-DIV every division produces the physique it is judged on', () => {
  test('all nine divisions generate a coherent plan at every offered schedule', () => {
    for (const goal of NINE) {
      for (const daysPerWeek of [2, 3, 4, 5, 6]) {
        const p = plan({ goal, daysPerWeek, sessionLengthMinutes: 90 });
        expect(p.workouts).toHaveLength(daysPerWeek);
        for (const w of p.workouts) expect(w.exercises.length).toBeGreaterThan(0);
      }
    }
  });

  test('no division drives a judged muscle to zero (register §1.1)', () => {
    // Symmetry and balance are judged in EVERY division, so de-emphasis is
    // maintenance, never removal.
    const structural = ['chest', 'back', 'side_delts', 'quads', 'hamstrings', 'glutes'];
    for (const goal of NINE) {
      const p = plan({ goal, daysPerWeek: 4, sessionLengthMinutes: 90 });
      for (const m of structural) {
        expect(weeklySets(p, m)).toBeGreaterThan(0);
      }
    }
  });

  test('a division\'s priority muscles carry more volume than a General plan', () => {
    const general = plan({ goal: 'general', daysPerWeek: 5, sessionLengthMinutes: 90 });
    for (const goal of ['bikini', 'wellness', 'figure', 'mens_physique']) {
      const p = plan({ goal, daysPerWeek: 5, sessionLengthMinutes: 90 });
      const lead = divisionPriorityMuscles(goal)[0];
      expect(weeklySets(p, lead)).toBeGreaterThan(weeklySets(general, lead));
    }
  });

  test('Bikini builds lat width and no waist-thickening back work', () => {
    const p = plan({ goal: 'bikini', daysPerWeek: 5, sessionLengthMinutes: 90 });
    const fams = familiesFor(p, 'back');
    expect(fams.size).toBeGreaterThan(0);
    for (const f of fams) {
      expect(['vertical_pull', 'shoulder_extension']).toContain(f);
    }
    expect([...fams]).not.toContain('spinal_erector');
    expect([...fams]).not.toContain('upper_mid_row');
  });

  test('Figure gets its quad sweep where a General plan need not', () => {
    const fig = plan({ goal: 'figure', daysPerWeek: 5, sessionLengthMinutes: 90 });
    expect(namesFor(fig, 'quads').some(isSweepBiased)).toBe(true);
  });

  test('Men\'s Physique takes no heavy squat for legs that are not presented', () => {
    const p = plan({ goal: 'mens_physique', daysPerWeek: 5, sessionLengthMinutes: 90 });
    for (const name of namesFor(p, 'quads')) {
      expect(name).not.toMatch(/^Barbell Back Squat|^Barbell Front Squat/);
    }
    // And still trains them.
    expect(weeklySets(p, 'quads')).toBeGreaterThan(0);
  });

  test('the raised glute ceiling belongs to the divisions the profile names', () => {
    expect(hasRaisedGluteCeiling('bikini')).toBe(true);
    expect(hasRaisedGluteCeiling('wellness')).toBe(true);
    for (const d of NINE.filter(x => x !== 'bikini' && x !== 'wellness')) {
      expect(hasRaisedGluteCeiling(d)).toBe(false);
    }
    // And it is real: the glute-led divisions exceed the general MRV of 16.
    const bikini = plan({ goal: 'bikini', daysPerWeek: 5, sessionLengthMinutes: 90 });
    expect(weeklySets(bikini, 'glutes')).toBeGreaterThan(16);
  });

  test('leg character drives the split, from the rulebook', () => {
    expect(divisionLegCharacter('bikini')).toBe(LEG_CHARACTER.LOWER_LED);
    expect(divisionLegCharacter('mens_physique')).toBe(LEG_CHARACTER.NOT_PRESENTED);
    expect(divisionLegCharacter('bodybuilding')).toBe(LEG_CHARACTER.FULLY_JUDGED);
    expect(divisionLegCharacter('general')).toBe(LEG_CHARACTER.BALANCED);
    // The lower-led divisions really do get more lower-body sessions.
    const legSessions = goal => plan({ goal, daysPerWeek: 5, sessionLengthMinutes: 90 })
      .workouts.filter(w => w.exercises.some(
        e => ['glutes', 'quads', 'hamstrings'].includes(muscleOf(e.exerciseName)),
      ))
      .length;
    expect(legSessions('bikini')).toBeGreaterThanOrEqual(legSessions('mens_physique'));
  });
});

// ---------------------------------------------------------------------------
// 4. Composition: division with weak points, and with the clock
// ---------------------------------------------------------------------------

describe('C16-DIV division intent composes rather than competes', () => {
  test('a weak point adds to the division, it does not replace it', () => {
    // Weak points arrive as the UI's own labels and only carry a volume
    // boost on a weak-point block, which is how the wizard sends them.
    const base = plan({ goal: 'bikini', daysPerWeek: 5, sessionLengthMinutes: 90, phase: 'weak_point' });
    const withWp = plan({
      goal: 'bikini', daysPerWeek: 5, sessionLengthMinutes: 90,
      phase: 'weak_point', weakPoints: ['Side Delts'],
    });
    // The weak point gains.
    expect(weeklySets(withWp, 'side_delts')).toBeGreaterThan(weeklySets(base, 'side_delts'));
    // The division's own criterion is still the lead.
    expect(weeklySets(withWp, 'glutes')).toBeGreaterThan(weeklySets(withWp, 'side_delts'));
    // And the division's pool rules still hold under a weak point: a Bikini
    // athlete specialising her delts does not start deadlifting.
    for (const f of familiesFor(withWp, 'back')) {
      expect(['vertical_pull', 'shoulder_extension']).toContain(f);
    }
  });

  test('a weak point ON a de-emphasised muscle is still honoured', () => {
    // The athlete's own judgement about their body outranks the overlay: a
    // Men's Physique competitor who says their calves lag gets calf work,
    // even though the division holds calves at maintenance.
    const base = plan({
      goal: 'mens_physique', daysPerWeek: 5, sessionLengthMinutes: 90, phase: 'weak_point',
    });
    const wp = plan({
      goal: 'mens_physique', daysPerWeek: 5, sessionLengthMinutes: 90,
      phase: 'weak_point', weakPoints: ['Calves'],
    });
    expect(weeklySets(wp, 'calves')).toBeGreaterThan(weeklySets(base, 'calves'));
    // The division is not abandoned to pay for it.
    expect(weeklySets(wp, 'side_delts')).toBeGreaterThan(weeklySets(wp, 'calves'));
  });

  test('a specialisation block does not suspend the division (live defect)', () => {
    // FOUND BY THIS WORK, in the wild. A weak-point or strength-size block
    // rewrites the goal to a legacy ID before selection, and every division
    // pool rule keyed off that goal vanished for the whole block. A Bikini
    // athlete on a weak-point block was receiving barbell bench press, back
    // squat and bent-over rows - the three things her division's published
    // criteria exclude (register §1.2).
    for (const phase of ['weak_point', 'strength_size']) {
      const p = plan({
        goal: 'bikini', daysPerWeek: 5, sessionLengthMinutes: 90,
        phase, weakPoints: ['Side Delts'],
      });
      for (const f of familiesFor(p, 'back')) {
        expect(['vertical_pull', 'shoulder_extension']).toContain(f);
      }
      for (const name of [...namesFor(p, 'chest'), ...namesFor(p, 'quads')]) {
        expect(name).not.toMatch(/^Barbell Bench Press|^Barbell Back Squat|^Incline Barbell Bench Press/);
      }
    }
  });

  test('the clock trims discretionary work before division priorities', () => {
    for (const [goal, lead] of [['bikini', 'glutes'], ['wellness', 'glutes'], ['figure', 'side_delts'], ['mens_physique', 'side_delts']]) {
      const roomy = plan({ goal, daysPerWeek: 4, sessionLengthMinutes: 90 });
      const tight = plan({ goal, daysPerWeek: 4, sessionLengthMinutes: 60 });
      expect(divisionPriorityMuscles(goal)).toContain(lead);
      const allRoomy = planExercises(roomy).reduce((s, e) => s + (e.sets ?? 0), 0);
      const allTight = planExercises(tight).reduce((s, e) => s + (e.sets ?? 0), 0);
      // The plan really was squeezed...
      expect(allTight).toBeLessThan(allRoomy);
      // ...and the judged muscle gave up proportionally less than the plan
      // as a whole. This is what "protects division priorities" means: the
      // clock takes its cut from the discretionary work first.
      const leadKept = weeklySets(tight, lead) / weeklySets(roomy, lead);
      expect(leadKept).toBeGreaterThanOrEqual(allTight / allRoomy);
    }
  });

  test('an extreme squeeze still leaves the judged muscle nearly intact', () => {
    // At 45 minutes a four-day plan is far over, everything discretionary
    // has already reached its floor, and the only sets left to give belong
    // to the biggest muscle in the plan - which is usually the judged one.
    // Protection is an ORDER, not an exemption, so the honest promise here
    // is that the judged muscle keeps the great majority of its work, not
    // that it is never touched.
    for (const [goal, lead] of [['bikini', 'glutes'], ['wellness', 'glutes'], ['figure', 'side_delts']]) {
      const roomy = plan({ goal, daysPerWeek: 4, sessionLengthMinutes: 90 });
      const desperate = plan({ goal, daysPerWeek: 4, sessionLengthMinutes: 45 });
      expect(weeklySets(desperate, lead) / weeklySets(roomy, lead)).toBeGreaterThanOrEqual(0.75);
    }
  });

  test('the division\'s judged muscles are named to the time resolver', () => {
    // Not left to an arithmetic side effect of the overlay: a judged muscle
    // whose landmarks are already high would otherwise be unprotected.
    const engine = src('planEngine.js');
    expect(engine).toMatch(/const priorityMuscles = \[\.\.\.new Set\(\[/);
    expect(engine).toMatch(/divisionPriorityMuscles\(goal\)/);
    // BOTH trims read it: the weekly resolver and the per-session trim.
    expect(engine).toMatch(/priorityMuscles: priorityMuscles|\n\s+priorityMuscles,/);
    expect(engine).toMatch(/sessionsRemaining = null, priorityMuscles = \[\]/);
  });
});

// ---------------------------------------------------------------------------
// 5. Roles are durable; exercises rotate inside them (PMID 35438660)
// ---------------------------------------------------------------------------

describe('C16-DIV personal evidence picks the exercise, never removes the role', () => {
  test('a retained exercise is matched by muscle AND role, never by muscle alone', () => {
    // slotKey is the mechanism: a pulldown can never be retained into a
    // row's slot, so continuity cannot quietly change what the slot does.
    expect(slotKey('back', 'vertical_pull')).not.toBe(slotKey('back', 'upper_mid_row'));
    const kept = applyContinuity({
      generated: [{
        name: 'Pull',
        exercises: [{ exerciseId: 'gen-row', exerciseName: 'Chest Supported Row' }],
      }],
      incumbents: [
        { exerciseId: 'inc-pulldown', exerciseName: 'Lat Pulldown (Wide Grip)', muscle: 'back', family: 'vertical_pull' },
        { exerciseId: 'inc-row', exerciseName: 'Seal Row', muscle: 'back', family: 'upper_mid_row' },
      ],
      evidenceFor: () => ({ sessionsLogged: 12, progressing: true }),
      familyOf: () => slotKey('back', 'upper_mid_row'),
      context: { epochBlocks: 3 },
    });
    const d = kept.decisions[0];
    expect(d.outcome).toBe(SLOT_OUTCOME.RETAINED);
    // The ROW was kept for the row slot. The pulldown could not take it.
    expect(d.exerciseName).toBe('Seal Row');
  });

  test('a replacement fills the same slot the exercise it replaces filled', () => {
    const out = applyContinuity({
      generated: [{
        name: 'Pull',
        exercises: [{ exerciseId: 'gen-pulldown', exerciseName: 'Lat Pulldown (Close Grip)' }],
      }],
      incumbents: [
        { exerciseId: 'inc-pullup', exerciseName: 'Pull-Up', muscle: 'back', family: 'vertical_pull' },
      ],
      // Evidence says stop using it.
      evidenceFor: () => ({ excluded: true }),
      familyOf: () => slotKey('back', 'vertical_pull'),
      context: { epochBlocks: 3 },
    });
    expect(out.decisions[0].outcome).toBe(SLOT_OUTCOME.REPLACED);
    // The vertical-pull job still exists; only the exercise changed.
    expect(out.workouts[0].exercises[0].exerciseName).toBe('Lat Pulldown (Close Grip)');
  });

  test('the division\'s role survives an athlete who has excluded its usual filler', () => {
    // A Bikini athlete who cannot do hip thrusts still gets glute work: the
    // role is the durable unit, the exercise is not.
    const withoutThrusts = LIBRARY.filter(e => !/Hip Thrust|Glute Bridge/.test(e.name));
    const p = generatePlan({
      ...inputs({ goal: 'bikini', daysPerWeek: 5, sessionLengthMinutes: 90 }),
      exerciseLibrary: withoutThrusts,
    });
    expect(weeklySets(p, 'glutes')).toBeGreaterThan(0);
  });

  test('generation is deterministic for every division (no random rotation)', () => {
    // PMID 35438660: excessive, random variation compromises gains. Volyume
    // varies systematically or not at all, and never by chance.
    for (const goal of NINE) {
      const a = plan({ goal, daysPerWeek: 4, sessionLengthMinutes: 75 });
      const b = plan({ goal, daysPerWeek: 4, sessionLengthMinutes: 75 });
      expect(namesFor(b, 'back')).toEqual(namesFor(a, 'back'));
      expect(namesFor(b, 'quads')).toEqual(namesFor(a, 'quads'));
    }
  });

  test('division intent survives a block boundary', () => {
    // A rebuild at the next block is still that athlete's division: the
    // profile is read at generation time from the goal, so the roles, the
    // pool rules and the priorities all come back.
    const block1 = plan({ goal: 'figure', daysPerWeek: 4, sessionLengthMinutes: 90 });
    const block2 = plan({ goal: 'figure', daysPerWeek: 4, sessionLengthMinutes: 90 });
    expect(namesFor(block2, 'quads').some(isSweepBiased))
      .toBe(namesFor(block1, 'quads').some(isSweepBiased));
    for (const f of familiesFor(block2, 'back')) {
      expect([...familiesFor(block1, 'back')]).toContain(f);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. The closure trace the founder asked for, as one test
// ---------------------------------------------------------------------------

describe('C16-DIV the closure trace', () => {
  test('division -> emphasis -> role -> selection -> persistence -> swap -> explanation', () => {
    const goal = 'figure';

    // 1. DIVISION: the athlete competes in Figure.
    const profile = divisionProfile(goal);
    expect(profile.label).toBe('Figure');
    expect(profile.source).toContain('§1.3');

    // 2. EMPHASIS: the criteria name delts, quad sweep, back depth and width.
    expect(divisionPriorityMuscles(goal)).toEqual(
      expect.arrayContaining(['side_delts', 'back', 'quads']),
    );
    expect(divisionVolumeBias(goal).side_delts).toBeGreaterThan(1);

    // 3. ROLE: that emphasis becomes ordered within-muscle roles.
    expect(divisionRoles(goal, 'back')).toEqual(['vertical_pull', 'upper_mid_row']);
    expect(divisionRoles(goal, 'quads')).toEqual([SWEEP]);

    // 4. SELECTION: the generated plan fills them.
    const p = plan({ goal, daysPerWeek: 5, sessionLengthMinutes: 90 });
    const backFams = familiesFor(p, 'back');
    expect(backFams.has('vertical_pull')).toBe(true);
    expect(namesFor(p, 'quads').some(isSweepBiased)).toBe(true);

    // 5. PERSISTENCE: the same athlete regenerating gets the same structure.
    const again = plan({ goal, daysPerWeek: 5, sessionLengthMinutes: 90 });
    expect([...familiesFor(again, 'back')].sort()).toEqual([...backFams].sort());

    // 6. SWAP: an exercise change keeps the slot's job. A vertical pull can
    //    only be retained into a vertical-pull slot.
    const swapped = applyContinuity({
      generated: [{ name: 'Pull', exercises: [{ exerciseId: 'g1', exerciseName: 'Lat Pulldown (Wide Grip)' }] }],
      incumbents: [{ exerciseId: 'i1', exerciseName: 'Pull-Up', muscle: 'back', family: 'vertical_pull' }],
      evidenceFor: () => ({ sessionsLogged: 10, progressing: true }),
      familyOf: () => slotKey('back', 'vertical_pull'),
      context: { epochBlocks: 2 },
    });
    expect(swapped.decisions[0].outcome).toBe(SLOT_OUTCOME.RETAINED);
    expect(swapped.workouts[0].exercises[0].exerciseName).toBe('Pull-Up');

    // 7. BLOCK LEARNING and the NEXT BLOCK: the division is read from the
    //    goal at generation, so the next block is still a Figure plan.
    const nextBlock = plan({ goal, daysPerWeek: 5, sessionLengthMinutes: 90, experience: 'advanced' });
    expect(namesFor(nextBlock, 'quads').some(isSweepBiased)).toBe(true);

    // 8. EXPLANATION: the plan can say why, in plain English, without the
    //    internal vocabulary.
    const why = JSON.stringify(p.whyThis ?? {});
    expect(why.length).toBeGreaterThan(10);
    for (const banned of ['MEV', 'MRV', 'movement family', 'capacity envelope', 'mesocycle']) {
      expect(why.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });
});
