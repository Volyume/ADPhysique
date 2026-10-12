/**
 * adapt.test.js -- D222 phase 6: the structure engine's seam with the app
 * (src/lib/structure/adapt.js and serve.js), against the REAL engine and the
 * real seeded library.
 *
 * Authority: docs/audit/plan-builder-map-2026-10-11/23-PHASE6-INTEGRATION-SPEC.md
 * (R60 to R65, R68). What this suite pins and why:
 *   - R64 inputs: the weak-point labels map to the engine's muscles exactly as
 *     the spec lists them, de-duplicated in pick order, at most three, and a
 *     competitive lifter trains as advanced. A wrong label silently changes
 *     the person's focus;
 *   - R60/R61 facts for a sample plan: version 2 kept (about 20 readers test
 *     it), the structure block present with version 3, every compat field in
 *     today's muscle keys only (lats and upper back are "back", glute max and
 *     med "glutes"), weeklyTargets equal to the sum of each week's sets of the
 *     exercises behind each key, and the slots' muscle, kind and credits in
 *     those keys. A wrong field meaning silently breaks serving;
 *   - R62 serving: weeks 1 to 6 serve the engine's own ladder, the recovery
 *     week included, and the next-day exception's RIR is served above the
 *     block week's where it is higher; a typed count still wins; a row the
 *     engine did not build is left alone;
 *   - R64: an exercise with no library row fails the build (never saved);
 *   - R65: a refusal carries its reason, suggestions and the sign-off page's
 *     own words; the fit is in the shape the fit review renders.
 */
const { buildStructurePlan } = require('../engine');
const { PROGRESSION, PATTERNS } = require('../rulebook');
const {
  focusFromWeakPoints, structureExperience, structureArgs, structureFacts, structureWeeklyTargets,
  structureWorkoutsForWrite, structureCheckIds, structureRefusal, structureFit, structurePreview,
  appMuscleOf, FOCUS_LABEL_MAP,
} = require('../adapt');
const { structureServedWeek, isStructureFacts } = require('../serve');
const { refusalMessage, planMessages } = require('../messages');
const { VOLUME_LANDMARKS } = require('../../algorithms');
const { SELECTION_REASON } = require('../../planEngine');
const { PLAN_FIT } = require('../../planFit');
const { LIBRARY } = require('../../__tests__/campaign16.helpers');

jest.setTimeout(120000);

// Men's physique, 3 days, full gym, 60 minutes: a week that carries the
// next-day exception (a lateral raise held at RIR 2 or more every week).
const SAMPLE_ARGS = { goal: 'mens_physique', days: 3, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: [] };
let sample;
beforeAll(() => {
  sample = buildStructurePlan({ ...SAMPLE_ARGS, library: LIBRARY });
});

describe('R64: inputs', () => {
  test('the focus labels map as the spec lists them', () => {
    expect(FOCUS_LABEL_MAP).toEqual({
      'Chest': 'chest', 'Upper Chest': 'chest', 'Lats / Back Width': 'lats', 'Back Thickness': 'upper_back',
      'Side Delts': 'side_delts', 'Rear Delts': 'rear_delts', 'Front Delts': 'front_delts', 'Biceps': 'biceps',
      'Triceps': 'triceps', 'Quads': 'quads', 'Hamstrings': 'hamstrings', 'Glutes': 'glute_max',
      'Adductors': 'adductors', 'Calves': 'calves', 'Core / Abs': 'abs', 'Traps': 'traps',
    });
  });
  test('picks are de-duplicated in pick order and capped at three; unknown labels are left out', () => {
    expect(focusFromWeakPoints(['Upper Chest', 'Chest', 'Glutes', 'Nope', 'Lats / Back Width', 'Calves']))
      .toEqual(['chest', 'glute_max', 'lats']);
    expect(focusFromWeakPoints(null)).toEqual([]);
  });
  test('competitive trains as advanced; other levels are passed as they are', () => {
    expect(structureExperience('competitive')).toBe('advanced');
    expect(structureExperience('beginner')).toBe('beginner');
    expect(structureExperience('advanced')).toBe('advanced');
  });
  test('engine arguments from buildPlanInputs', () => {
    expect(structureArgs({
      goal: 'bikini', daysPerWeek: 4, sessionLengthMinutes: 75, equipment: 'dumbbells_only',
      experience: 'competitive', weakPoints: ['Glutes', 'Back Thickness'],
    })).toEqual({
      goal: 'bikini', days: 4, lengthMinutes: 75, equipment: 'dumbbells_only', experience: 'advanced', focus: ['glute_max', 'upper_back'],
    });
  });
});

describe('R60, R61: the facts of a sample plan', () => {
  const routineIds = ['r-a', 'r-b', 'r-c'];
  let facts;
  beforeAll(() => {
    expect(sample.ok).toBe(true);
    const reIds = sample.plan.sessions.map((s, i) => s.exercises.map((_, j) => `re-${i}-${j}`));
    facts = structureFacts(sample, SAMPLE_ARGS, { routineIds, routineExerciseIds: reIds });
  });

  test('version 2 is kept, and the structure block marks an engine plan', () => {
    expect(facts.version).toBe(2);
    expect(facts.structure.version).toBe(3);
    expect(isStructureFacts(facts)).toBe(true);
    expect(facts.structure.sessions.map((s) => s.routineId)).toEqual(routineIds);
    expect(facts.structure.checks).toEqual({ ok: true, faults: [], sense: [] });
    expect(facts.structure.sessions[0].exercises[0].routineExerciseId).toBe('re-0-0');
  });

  test('every compat field is keyed by today\'s muscle keys only', () => {
    const appKeys = new Set(Object.keys(VOLUME_LANDMARKS));
    for (const field of ['weeklyTargets', 'roles', 'exposureShares', 'recoverySafeMax', 'lightCaps']) {
      for (const k of Object.keys(facts[field])) expect(appKeys.has(k)).toBe(true);
    }
    for (const bySlot of Object.values(facts.slots)) {
      for (const slot of Object.values(bySlot)) {
        expect(appKeys.has(slot.muscle)).toBe(true);
        for (const c of Object.keys(slot.credits)) expect(appKeys.has(c)).toBe(true);
      }
    }
    expect(appMuscleOf('lats')).toBe('back');
    expect(appMuscleOf('upper_back')).toBe('back');
    expect(appMuscleOf('glute_max')).toBe('glutes');
    expect(appMuscleOf('glute_med')).toBe('glutes');
    expect(appMuscleOf('side_delts')).toBe('side_delts');
  });

  test('weeklyTargets are each week\'s sets of the exercises behind each key', () => {
    const expected = {};
    for (const s of sample.plan.sessions) {
      for (const ex of s.exercises) {
        const k = appMuscleOf(PATTERNS[ex.pattern].muscle);
        expected[k] = expected[k] || [0, 0, 0, 0, 0, 0];
        ex.weeks.forEach((w, i) => { expected[k][i] += w.sets; });
      }
    }
    expect(facts.weeklyTargets).toEqual(expected);
    expect(structureWeeklyTargets(sample.plan)).toEqual(expected);
    // Back holds the lats and the upper back together.
    const back = sample.plan.sessions.flatMap((s) => s.exercises)
      .filter((ex) => ['lats', 'upper_back'].includes(PATTERNS[ex.pattern].muscle))
      .reduce((t, ex) => t + ex.weeks[PROGRESSION.peakWeek - 1].sets, 0);
    expect(facts.weeklyTargets.back[PROGRESSION.peakWeek - 1]).toBe(back);
  });

  test('slots carry the muscle, kind and credits in app keys, by the routine and exercise written', () => {
    const first = sample.plan.sessions[0].exercises[0];
    const slot = facts.slots['r-a'][first.id];
    expect(slot.muscle).toBe(appMuscleOf(PATTERNS[first.pattern].muscle));
    expect(slot.kind).toBe(first.kind);
    for (const v of Object.values(slot.credits)) expect(v).toBe(0.5);
    expect(slot.credits[slot.muscle]).toBeUndefined();
  });

  test('the neutral fields hold values their readers accept', () => {
    expect(facts.readiness).toBeNull();
    expect(facts.builtFactor).toBeNull();
    expect(facts.notes).toEqual([]);
    expect(facts.limitedBy).toEqual({});
    expect(facts.sessionCaps).toEqual({});
    expect(facts.rirLadder).toEqual([...PROGRESSION.rirLadder]);
    expect(facts.gapRanks).toEqual({ 'r-a': 0, 'r-b': 1, 'r-c': 2 });
    expect(Object.keys(facts.sessionMinutesAtPeak)).toEqual(routineIds);
  });

  test('the rows to save are week 1\'s sets with an existing selection reason', () => {
    const workouts = structureWorkoutsForWrite(sample.plan);
    expect(workouts.map((w) => w.name)).toEqual(sample.plan.sessions.map((s) => s.name));
    workouts.forEach((w, i) => w.exercises.forEach((ex, j) => {
      const src = sample.plan.sessions[i].exercises[j];
      expect(ex.exerciseId).toBe(src.id);
      expect(ex.sets).toBe(src.weeks[0].sets);
      expect([ex.repMin, ex.repMax]).toEqual(src.repRange);
      expect(Object.values(SELECTION_REASON)).toContain(ex.selectionReason);
    }));
  });
});

describe('R62: serving the ladder', () => {
  let facts;
  let light;
  let rows;
  beforeAll(() => {
    facts = structureFacts(sample, SAMPLE_ARGS, {
      routineIds: ['r-a', 'r-b', 'r-c'],
      routineExerciseIds: sample.plan.sessions.map((s, i) => s.exercises.map((_, j) => `re-${i}-${j}`)),
    });
    const si = sample.plan.sessions.findIndex((s) => s.exercises.some((ex) => ex.nextDayException));
    light = { si, ex: sample.plan.sessions[si].exercises.find((ex) => ex.nextDayException) };
    rows = sample.plan.sessions[si].exercises.map((ex, j) => ({ exerciseId: ex.id, slotId: `re-${si}-${j}` }));
  });

  test('the sample carries the next-day exception', () => {
    expect(light.ex).toBeTruthy();
  });

  test('weeks 1 to 6 serve the engine ladder, the recovery week included', () => {
    const session = sample.plan.sessions[light.si];
    for (let w = 1; w <= 6; w += 1) {
      const served = structureServedWeek({
        facts, routineId: ['r-a', 'r-b', 'r-c'][light.si], weekIndex: w, weekRir: PROGRESSION.rirLadder[w - 1], exercises: rows,
      });
      for (const ex of session.exercises) expect(served.sets[ex.id]).toBe(ex.weeks[w - 1].sets);
    }
    // The recovery week is half the peak (weeksFor), never the peak.
    const peak = light.ex.weeks[PROGRESSION.peakWeek - 1].sets;
    expect(light.ex.weeks[5].sets).toBeLessThan(peak);
  });

  test('the next-day exception serves its higher RIR, and only where it is higher', () => {
    const rid = ['r-a', 'r-b', 'r-c'][light.si];
    const w4 = structureServedWeek({ facts, routineId: rid, weekIndex: 4, weekRir: 1, exercises: rows });
    expect(w4.rir[light.ex.id]).toBe(2);
    const others = sample.plan.sessions[light.si].exercises.filter((ex) => !ex.nextDayException);
    for (const ex of others) expect(w4.rir[ex.id]).toBeUndefined();
    const w6 = structureServedWeek({ facts, routineId: rid, weekIndex: 6, weekRir: 4, exercises: rows });
    expect(w6.rir[light.ex.id]).toBeUndefined();
  });

  test('a typed count wins; a row the engine did not build is left alone; an exercise matches by id when its row id is unknown', () => {
    const rid = ['r-a', 'r-b', 'r-c'][light.si];
    const typed = { ...facts, typed: { [rows[0].slotId]: 7 } };
    const served = structureServedWeek({
      facts: typed, routineId: rid, weekIndex: 2, weekRir: 2, exercises: [...rows, { exerciseId: 'Hand Added', slotId: 'by-hand' }],
    });
    expect(served.sets[rows[0].exerciseId]).toBe(7);
    expect(served.sets['Hand Added']).toBeUndefined();

    const noIds = structureFacts(sample, SAMPLE_ARGS, { routineIds: ['r-a', 'r-b', 'r-c'] });
    const byId = structureServedWeek({
      facts: noIds, routineId: rid, weekIndex: 3, weekRir: 2, exercises: rows.map((r) => ({ ...r, slotId: 'other-id' })),
    });
    for (const ex of sample.plan.sessions[light.si].exercises) expect(byId.sets[ex.id]).toBe(ex.weeks[2].sets);
  });

  test('facts the engine did not build serve nothing here', () => {
    expect(structureServedWeek({ facts: { version: 2 }, routineId: 'r-a', weekIndex: 1, exercises: rows }))
      .toEqual({ sets: {}, rir: {} });
  });
});

describe('R64: every exercise is a real library row', () => {
  test('a name with no library row fails the build', () => {
    const plan = { sessions: [{ exercises: [{ id: 'Not A Row', name: 'Not A Row' }] }] };
    expect(() => structureCheckIds(plan, LIBRARY)).toThrow(/no library row/);
    expect(() => structureCheckIds(sample.plan, LIBRARY)).not.toThrow();
  });
});

describe('R65: what the person is told', () => {
  const REFUSED = { goal: 'bodybuilding', days: 2, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: [] };
  let refused;
  beforeAll(() => {
    refused = buildStructurePlan({ ...REFUSED, library: LIBRARY });
  });

  test('a refusal carries its reason, the suggestion and the sign-off page\'s words', () => {
    expect(refused.ok).toBe(false);
    const r = structureRefusal(refused.refusal, REFUSED);
    expect(r).toEqual({
      reason: refused.refusal.reason,
      suggestedDays: refused.refusal.suggestedDays,
      suggestedLength: refused.refusal.suggestedLength ?? null,
      minimumDays: refused.refusal.minimumDays ?? null,
      text: refusalMessage(refused.refusal, REFUSED),
    });
    expect(r.text.startsWith('Not built: ')).toBe(true);
    expect(r.text).not.toMatch(/—/);
  });

  test('the fit of a refusal needs a choice, names the days that build, and has no keep', () => {
    const fit = structureFit(refused, REFUSED, []);
    expect(fit.state).toBe(PLAN_FIT.INSUFFICIENT_FOR_VALID_PLAN);
    expect(fit.refusal.text).toBe(refusalMessage(refused.refusal, REFUSED));
    expect(fit.alternatives[0]).toEqual(expect.objectContaining({
      kind: refused.refusal.suggestedDays > 2 ? 'more_sessions' : 'fewer_sessions', daysPerWeek: refused.refusal.suggestedDays,
    }));
  });

  test('a built week previews its real length and its own message lines', () => {
    const p = structurePreview(sample, SAMPLE_ARGS);
    expect(p.longestMinutes).toBe(Math.round(Math.max(...sample.report.minutes)));
    expect(p.messages).toEqual(planMessages(sample, SAMPLE_ARGS));
    for (const line of p.messages) expect(line).not.toMatch(/—/);
    const fit = structureFit(sample, SAMPLE_ARGS, [{ minutes: 60, result: sample }]);
    expect(fit.durations).toEqual([expect.objectContaining({ minutes: 60, state: fit.state })]);
    expect(fit.refusal).toBeNull();
  });
});
