/**
 * sense.test.js -- the sense layer (D222, the founder's order: "Ensure
 * there's not complete dropouts of muscle ... no instance at all where I or
 * another end user or even a coach loads up a plan and says, okay, this
 * doesn't make sense"). Each test starts from one plan that makes sense and
 * breaks it the way a real plan once did, so a sense check that stops
 * firing fails here.
 *
 * The first case is the founder's own: a men's physique week with no chest
 * exercise at all.
 */
import { senseCheck, doseClass } from '../sense';
import { REST_SECONDS, REP_RANGES, PROGRESSION } from '../rulebook';

const LADDER = PROGRESSION.rirLadder;
function ex(id, pattern, kind, peak, opts = {}) {
  const w1 = Math.max(2, Math.round(0.7 * peak));
  const minRir = opts.minRir ?? 0;
  const weeks = [1, 2, 3, 4, 5].map((w) => ({ sets: w1 + Math.round(((peak - w1) * (w - 1)) / 4), rir: Math.max(minRir, LADDER[w - 1]) }));
  weeks.push({ sets: Math.max(1, Math.round(peak * 0.5)), rir: 4 });
  return { id, name: id, pattern, kind, restSec: REST_SECONDS[kind].default, repRange: REP_RANGES[kind], weeks };
}
function plan() {
  return {
    category: 'mens_physique', days: 4, equipment: 'full_gym', lengthMinutes: 75, experience: 'intermediate', focus: [], untrainable: [], overflow: [],
    sessions: [
      { key: 'back_a_delts', name: 'Back A & Delts', exercises: [
        ex('lat_pulldown', 'vpull', 'mod_compound', 4), ex('machine_row', 'row_supported', 'machine', 3),
        ex('db_lateral', 'lateral', 'isolation', 4), ex('cable_lateral', 'lateral', 'isolation', 3), ex('cable_curl', 'curl', 'isolation', 2),
      ] },
      { key: 'legs', name: 'Legs', exercises: [
        ex('db_rdl', 'hinge', 'mod_compound', 3), ex('hack_squat', 'squat_machine', 'machine', 4), ex('leg_curl', 'leg_curl', 'isolation', 3),
        ex('calf_raise', 'calf', 'isolation', 4), ex('cable_crunch', 'crunch', 'isolation', 3),
      ] },
      { key: 'back_b_delts', name: 'Back B & Delts', exercises: [
        ex('cable_row', 'row_supported', 'mod_compound', 4), ex('neutral_pulldown', 'vpull', 'mod_compound', 3),
        ex('machine_lateral', 'lateral', 'isolation', 4), ex('rear_fly', 'rear_fly', 'isolation', 3), ex('hammer_curl', 'hammer', 'isolation', 2),
      ] },
      { key: 'chest_triceps', name: 'Chest & Triceps', exercises: [
        ex('incline_press', 'press_incline', 'mod_compound', 4), ex('machine_press', 'press_flat', 'machine', 2),
        ex('cable_fly', 'fly', 'isolation', 2), ex('overhead_ext', 'tri_overhead', 'isolation', 3), ex('leg_raise', 'leg_raise', 'isolation', 3),
      ] },
    ],
  };
}
const codes = (r) => [...new Set(r.failures.map((f) => f.code))].sort();
const session = (p, key) => p.sessions.find((s) => s.key === key);

test('the reference week makes sense', () => {
  expect(senseCheck(plan()).failures).toEqual([]);
});

test("S1: a men's physique week with no chest exercise is caught (the founder's case)", () => {
  const p = plan();
  const ct = session(p, 'chest_triceps');
  ct.exercises = ct.exercises.filter((x) => !['press_incline', 'press_flat', 'fly'].includes(x.pattern));
  const r = senseCheck(p);
  expect(r.failures.some((f) => f.code === 'S1' && f.muscle === 'chest')).toBe(true);
  expect(r.failures.some((f) => f.code === 'S7' && f.session === 'chest_triceps')).toBe(true);
});

test('S1: biceps covered only by rows and pulldowns is a dropout', () => {
  const p = plan();
  for (const s of p.sessions) s.exercises = s.exercises.filter((x) => !['curl', 'hammer'].includes(x.pattern));
  expect(senseCheck(p).failures.some((f) => f.code === 'S1' && f.muscle === 'biceps')).toBe(true);
});

test('S1: a muscle the kit cannot train is not a dropout (R17)', () => {
  const p = plan();
  for (const s of p.sessions) s.exercises = s.exercises.filter((x) => !['curl', 'hammer'].includes(x.pattern));
  p.untrainable = ['biceps'];
  expect(senseCheck(p).failures.some((f) => f.code === 'S1')).toBe(false);
});

test('S2: trained every day, a moderate dose the day after another fails; a light next-day dose passes', () => {
  const p = plan();
  session(p, 'legs').exercises.push(ex('legs_lateral', 'lateral', 'isolation', 2));
  const r = senseCheck(p);
  expect(r.failures.some((f) => f.code === 'S2' && f.muscle === 'side_delts')).toBe(true);
  const q = plan();
  session(q, 'back_a_delts').exercises = session(q, 'back_a_delts').exercises.filter((x) => x.pattern !== 'lateral');
  session(q, 'legs').exercises.push(ex('legs_lateral', 'lateral', 'isolation', 2, { minRir: 2 }));
  expect(senseCheck(q).failures.filter((f) => f.code === 'S2')).toEqual([]);
});

test('dose classes follow 09 s4', () => {
  const p = plan();
  expect(doseClass(session(p, 'back_a_delts'), 'side_delts', 5)).toBe('moderate');
  expect(doseClass(session(p, 'back_a_delts'), 'chest', 5)).toBe(null);
  const light = { exercises: [ex('l', 'lateral', 'isolation', 3, { minRir: 2 })] };
  expect(doseClass(light, 'side_delts', 5)).toBe('light');
  const heavy = { exercises: [ex('a', 'lateral', 'isolation', 4), ex('b', 'lateral', 'isolation', 4), ex('c', 'lateral', 'isolation', 4)] };
  expect(doseClass(heavy, 'side_delts', 5)).toBe('heavy');
});

test('S3: pressing above pulling fails', () => {
  const p = plan();
  session(p, 'back_a_delts').exercises.splice(0, 2);
  session(p, 'back_b_delts').exercises.splice(0, 2);
  expect(codes(senseCheck(p))).toContain('S3');
});

test('S4: hamstrings below half of quads fails', () => {
  const p = plan();
  const legs = session(p, 'legs');
  legs.exercises = legs.exercises.filter((x) => !['hinge', 'leg_curl'].includes(x.pattern));
  legs.exercises.push(ex('leg_ext', 'leg_ext', 'isolation', 4));
  expect(codes(senseCheck(p))).toContain('S4');
});

test('S5: a session too thin to be worth the trip fails', () => {
  const p = plan();
  session(p, 'chest_triceps').exercises = [ex('incline_press', 'press_incline', 'mod_compound', 4), ex('overhead_ext', 'tri_overhead', 'isolation', 3)];
  expect(codes(senseCheck(p))).toContain('S5');
});

test('S6: work a session is not named for fails, unless the engine recorded it (R22)', () => {
  const p = plan();
  session(p, 'legs').exercises.push(ex('legs_curl', 'curl', 'isolation', 2));
  expect(senseCheck(p).failures.some((f) => f.code === 'S6' && f.muscle === 'biceps')).toBe(true);
  p.overflow = [{ muscle: 'biceps', session: 'legs' }];
  expect(senseCheck(p).failures.some((f) => f.code === 'S6')).toBe(false);
});

test('S7: a "Back B & Delts" day with no back exercise fails', () => {
  const p = plan();
  const b = session(p, 'back_b_delts');
  b.exercises = b.exercises.filter((x) => !['vpull', 'row_supported'].includes(x.pattern));
  b.exercises.unshift(ex('face_pull', 'face_pull', 'isolation', 3));
  expect(senseCheck(p).failures.some((f) => f.code === 'S7' && f.session === 'back_b_delts')).toBe(true);
});

test('S8: the same movement twice in one session fails; two variants that load it differently pass (R24)', () => {
  const p = plan();
  session(p, 'legs').exercises.splice(1, 0, ex('Romanian Deadlift (Barbell)', 'hinge', 'heavy_compound', 2));
  expect(senseCheck(p).failures.some((f) => f.code === 'S8' && f.muscle === 'hamstrings')).toBe(true);
  const q = plan();
  const legs = session(q, 'legs');
  legs.exercises = legs.exercises.filter((x) => x.pattern !== 'calf');
  legs.exercises.splice(3, 0, ex('Seated Calf Raise', 'calf', 'isolation', 2), ex('Seated Machine Calf Raise', 'calf', 'isolation', 2));
  expect(senseCheck(q).failures.some((f) => f.code === 'S8' && f.muscle === 'calves')).toBe(true);
  const r = plan();
  const legsR = session(r, 'legs');
  legsR.exercises = legsR.exercises.filter((x) => x.pattern !== 'calf');
  legsR.exercises.splice(3, 0, ex('Standing Calf Raise (Machine)', 'calf', 'isolation', 2), ex('Seated Calf Raise', 'calf', 'isolation', 2));
  expect(senseCheck(r).failures.filter((f) => f.code === 'S8')).toEqual([]);
});

test('S9: abs halfway through a leg session fails (R24)', () => {
  const p = plan();
  const legs = session(p, 'legs');
  const crunch = legs.exercises.find((x) => x.pattern === 'crunch');
  legs.exercises = [crunch, ...legs.exercises.filter((x) => x !== crunch)];
  expect(senseCheck(p).failures.some((f) => f.code === 'S9' && f.session === 'legs')).toBe(true);
});

test('S10: a standard muscle left on credit, under half its minimum of its own, fails (R27)', () => {
  const p = plan();
  for (const s of p.sessions) s.exercises = s.exercises.filter((x) => x.pattern !== 'hammer');
  session(p, 'back_a_delts').exercises.find((x) => x.pattern === 'curl').weeks = ex('c', 'curl', 'isolation', 2).weeks;
  expect(senseCheck(p).failures.some((f) => f.code === 'S10' && f.muscle === 'biceps')).toBe(true);
});

test('S11: hamstrings trained twice with no hinge all week fail where the kit has one (09 s7)', () => {
  const p = plan();
  p.kitOffer = { names: {}, patterns: { hamstrings: ['hinge', 'leg_curl'] } };
  const legs = session(p, 'legs');
  legs.exercises = legs.exercises.filter((x) => x.pattern !== 'hinge');
  legs.exercises.splice(1, 0, ex('Lying Leg Curl', 'leg_curl', 'isolation', 3));
  expect(senseCheck(p).failures.some((f) => f.code === 'S11' && f.muscle === 'hamstrings')).toBe(true);
  p.kitOffer = { names: {}, patterns: { hamstrings: ['leg_curl'] } };
  expect(senseCheck(p).failures.some((f) => f.code === 'S11')).toBe(false);
});

test('S12: a focus pick short of its target must be reported (R30)', () => {
  const p = plan();
  p.focus = ['chest'];
  p.focusTargets = { chest: 14 };
  expect(senseCheck(p).failures.some((f) => f.code === 'S12' && f.muscle === 'chest')).toBe(true);
  p.focusUnmet = [{ muscle: 'chest', sets: 8, target: 14, reason: 'sessions_full' }];
  expect(senseCheck(p).failures.some((f) => f.code === 'S12')).toBe(false);
});

test('S13: a session built around the quads holds a lower-body compound where the kit has one (round 5 coach audit)', () => {
  const p = plan();
  p.kitOffer = { names: {}, patterns: { quads: ['squat_machine', 'leg_ext'], hamstrings: ['hinge', 'leg_curl'] } };
  const legs = session(p, 'legs');
  legs.exercises = legs.exercises.filter((x) => !['squat_machine', 'hinge'].includes(x.pattern));
  legs.exercises.unshift(ex('leg_ext', 'leg_ext', 'isolation', 4));
  expect(senseCheck(p).failures.some((f) => f.code === 'S13' && f.session === 'legs')).toBe(true);
  p.kitOffer = { names: {}, patterns: { quads: ['leg_ext'], hamstrings: ['leg_curl'] } };
  expect(senseCheck(p).failures.some((f) => f.code === 'S13')).toBe(false);
});
