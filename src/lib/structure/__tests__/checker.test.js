/**
 * checker.test.js -- the structure checker (D222) catches every rule it
 * owns. Each test starts from one plan that passes every check (a men's
 * physique 4-day week built by hand to the approved rulebook) and breaks
 * exactly one rule, so a check that stops firing fails here.
 *
 * Pins, among others, the research's own faults (map 10 section 1): ten
 * direct chest sets in one session fail C3; a "light" next-day dose taken to
 * RIR 1 in weeks 4 and 5 fails C2 (R1); a session over its length without
 * asking fails C18 (founder Q1 = C).
 */
import { checkPlan, checkFocusAgainstBaseline, adjacentPairs } from '../checker';
import { REST_SECONDS, REP_RANGES, PROGRESSION } from '../rulebook';

const LADDER = PROGRESSION.rirLadder;

function ex(id, pattern, kind, peak, opts = {}) {
  const w1 = Math.max(2, Math.round(0.7 * peak));
  const minRir = opts.minRir ?? 0;
  const weeks = [1, 2, 3, 4, 5].map((w) => ({
    sets: w1 + Math.round(((peak - w1) * (w - 1)) / 4),
    rir: Math.max(minRir, LADDER[w - 1]),
  }));
  weeks.push({ sets: Math.max(1, Math.round(peak * 0.5)), rir: 4 });
  return {
    id, name: id, pattern, kind,
    restSec: opts.rest ?? REST_SECONDS[kind].default,
    repRange: REP_RANGES[kind],
    weeks,
    ...(opts.extra || {}),
  };
}

function validPlan() {
  return {
    category: 'mens_physique', days: 4, equipment: 'full_gym', lengthMinutes: 75, experience: 'intermediate', focus: [],
    sessions: [
      { key: 'back_a_delts', name: 'Back A & Delts', exercises: [
        ex('lat_pulldown', 'vpull', 'mod_compound', 4),
        ex('machine_row', 'row_supported', 'machine', 3),
        ex('db_lateral', 'lateral', 'isolation', 4),
        ex('cable_lateral', 'lateral', 'isolation', 3),
        ex('cable_curl', 'curl', 'isolation', 2),
      ] },
      { key: 'legs', name: 'Legs', exercises: [
        ex('db_rdl', 'hinge', 'mod_compound', 3),
        ex('hack_squat', 'squat_machine', 'machine', 4),
        ex('leg_curl', 'leg_curl', 'isolation', 3),
        ex('calf_raise', 'calf', 'isolation', 4),
        ex('cable_crunch', 'crunch', 'isolation', 3),
      ] },
      { key: 'back_b_delts', name: 'Back B & Delts', exercises: [
        ex('cable_row', 'row_supported', 'mod_compound', 4),
        ex('neutral_pulldown', 'vpull', 'mod_compound', 3),
        ex('machine_lateral', 'lateral', 'isolation', 4),
        ex('rear_fly', 'rear_fly', 'isolation', 3),
        ex('hammer_curl', 'hammer', 'isolation', 2),
      ] },
      { key: 'chest_triceps', name: 'Chest & Triceps', exercises: [
        ex('incline_db_press', 'press_incline', 'mod_compound', 4),
        ex('machine_press', 'press_flat', 'machine', 2),
        ex('cable_fly', 'fly', 'isolation', 2),
        ex('overhead_ext', 'tri_overhead', 'isolation', 3),
        ex('leg_raise', 'leg_raise', 'isolation', 3),
      ] },
    ],
  };
}

const codes = (r) => [...new Set(r.failures.map((f) => f.code))].sort();
const session = (plan, key) => plan.sessions.find((s) => s.key === key);
// Peak sets in weeks 1-5 are week1 + steps; in week 5 every exercise is at its peak.

describe('the reference plan', () => {
  test('passes every check', () => {
    const r = checkPlan(validPlan());
    expect(r.failures).toEqual([]);
    expect(r.ok).toBe(true);
  });

  test('adjacent pairs include the last and the first', () => {
    expect(adjacentPairs(4)).toEqual([[0, 1], [1, 2], [2, 3], [3, 0]]);
    expect(adjacentPairs(2)).toEqual([[0, 1], [1, 0]]);
  });
});

describe('C1 template', () => {
  test('a reordered week fails; a cyclic start does not', () => {
    const p = validPlan();
    [p.sessions[0], p.sessions[1]] = [p.sessions[1], p.sessions[0]];
    expect(codes(checkPlan(p))).toContain('C1');
    const q = validPlan();
    q.sessions.push(q.sessions.shift());
    expect(codes(checkPlan(q))).not.toContain('C1');
  });
});

describe('C2 recovery between neighbouring sessions', () => {
  test('a non-next-day muscle in neighbouring sessions fails', () => {
    const p = validPlan();
    session(p, 'legs').exercises.splice(2, 0, ex('leg_ext_curl', 'curl', 'isolation', 2));
    expect(codes(checkPlan(p))).toContain('C2');
  });

  test('side delts the day after a heavy lateral dose fail', () => {
    const p = validPlan();
    session(p, 'legs').exercises.push(ex('legs_lateral', 'lateral', 'isolation', 2));
    const r = checkPlan(p);
    expect(r.failures.some((f) => f.code === 'C2' && f.muscle === 'side_delts')).toBe(true);
  });

  test('R1: a light next-day dose passes only when held at RIR 2 all block', () => {
    // The light dose sits in the EARLIER session of the pair (Legs, then
    // Back B & Delts); Back A carries no laterals so Legs has no heavy
    // side-delt session before it.
    const build = (minRir) => {
      const p = validPlan();
      const a = session(p, 'back_a_delts');
      a.exercises = a.exercises.filter((x) => x.pattern !== 'lateral');
      session(p, 'legs').exercises.push(ex('legs_lateral', 'lateral', 'isolation', 2, { minRir }));
      return p;
    };
    expect(checkPlan(build(2)).failures.filter((f) => f.code === 'C2')).toEqual([]);
    const weeks = checkPlan(build(0)).failures.filter((f) => f.code === 'C2').map((f) => f.week);
    expect(weeks).toEqual([4, 5]);
  });
});

describe('C3 per-session caps', () => {
  test("ten direct chest sets in one session fail (the research's own example, map 10)", () => {
    const p = validPlan();
    const ct = session(p, 'chest_triceps');
    ct.exercises[1] = ex('machine_press', 'press_flat', 'machine', 3);
    ct.exercises[2] = ex('cable_fly', 'fly', 'isolation', 3);
    expect(checkPlan(p).failures.some((f) => f.code === 'C3' && f.muscle === 'chest')).toBe(true);
  });

  test('a compound set to failure fails', () => {
    const p = validPlan();
    session(p, 'legs').exercises[0].weeks[4].rir = 0;
    expect(codes(checkPlan(p))).toContain('C3');
  });

  test('an exercise with no rulebook pattern fails', () => {
    const p = validPlan();
    session(p, 'legs').exercises[4].pattern = 'not_a_pattern';
    expect(codes(checkPlan(p))).toContain('C3');
  });
});

describe('C4 weekly range', () => {
  test('a muscle below its minimum fails (the standard is never bypassed, F2)', () => {
    const p = validPlan();
    session(p, 'legs').exercises.pop();
    expect(checkPlan(p).failures.some((f) => f.code === 'C4' && f.muscle === 'abs')).toBe(true);
  });

  test('R17: a muscle the kit cannot train is reported, not failed (09 s7)', () => {
    const p = validPlan();
    session(p, 'legs').exercises.pop();
    p.untrainable = ['abs'];
    const r = checkPlan(p);
    expect(r.failures.some((f) => f.code === 'C4' && f.muscle === 'abs')).toBe(false);
    expect(r.warnings.some((x) => x.code === 'C4' && x.muscle === 'abs')).toBe(true);
  });

  test('an indirect-only muscle past 4 direct sets fails', () => {
    const p = validPlan();
    p.category = 'general';
    session(p, 'back_a_delts').exercises.splice(1, 0, ex('db_press', 'ohp', 'mod_compound', 4));
    expect(checkPlan(p).failures.some((f) => f.code === 'C4' && f.muscle === 'front_delts')).toBe(false);
    session(p, 'back_b_delts').exercises.splice(1, 0, ex('machine_press_ohp', 'ohp', 'mod_compound', 2));
    expect(checkPlan(p).failures.some((f) => f.code === 'C4' && f.muscle === 'front_delts')).toBe(true);
  });
});

describe('C5 focus never takes from another muscle', () => {
  test('fewer chest sets with focus fails', () => {
    const base = validPlan();
    const focus = validPlan();
    focus.focus = ['side_delts'];
    session(focus, 'chest_triceps').exercises[2] = ex('cable_fly', 'fly', 'isolation', 2);
    session(focus, 'chest_triceps').exercises[1] = ex('machine_press', 'press_flat', 'machine', 2);
    expect(checkFocusAgainstBaseline(focus, base).ok).toBe(true);
    session(focus, 'chest_triceps').exercises.splice(2, 1);
    const r = checkFocusAgainstBaseline(focus, base);
    expect(r.failures.map((f) => f.muscle)).toEqual(['chest']);
  });
});

describe('C6 session limits', () => {
  test('more than 8 exercises, more than 24 sets, or sets outside 2 to 4 fail', () => {
    const many = validPlan();
    const s = session(many, 'legs');
    s.exercises.push(ex('x1', 'adduction', 'isolation', 2), ex('x2', 'abduction', 'isolation', 2), ex('x3', 'kickback', 'isolation', 2), ex('x4', 'shrug', 'isolation', 2));
    expect(codes(checkPlan(many))).toContain('C6');

    const five = validPlan();
    session(five, 'legs').exercises[3] = ex('calf_raise', 'calf', 'isolation', 5);
    expect(checkPlan(five).failures.some((f) => f.code === 'C6' && /5 sets/.test(f.detail))).toBe(true);
    session(five, 'legs').exercises[3].solePattern = true;
    expect(checkPlan(five).failures.some((f) => f.code === 'C6' && /5 sets/.test(f.detail))).toBe(false);
  });

  test('a third exercise for a small muscle fails', () => {
    const p = validPlan();
    session(p, 'back_a_delts').exercises.push(ex('third_lateral', 'lateral', 'isolation', 2));
    expect(checkPlan(p).failures.some((f) => f.code === 'C6' && f.muscle === 'side_delts')).toBe(true);
  });

  test('a beginner session past 5 exercises fails', () => {
    const p = validPlan();
    p.experience = 'beginner';
    session(p, 'legs').exercises.push(ex('x1', 'adduction', 'isolation', 2));
    expect(codes(checkPlan(p))).toContain('C6');
  });
});

describe('C7 rest floors', () => {
  test('rest below its floor fails', () => {
    const p = validPlan();
    session(p, 'legs').exercises[0].restSec = REST_SECONDS.machine.floor - 1;
    expect(codes(checkPlan(p))).toContain('C7');
  });
});

describe('joint rules', () => {
  test("C8: any overhead pressing in men's physique fails; one session is allowed elsewhere", () => {
    const p = validPlan();
    session(p, 'back_a_delts').exercises.splice(1, 0, ex('db_press', 'ohp', 'mod_compound', 2));
    expect(codes(checkPlan(p))).toContain('C8');
    p.category = 'general';
    expect(codes(checkPlan(p))).not.toContain('C8');
  });

  test('C9: front delts loaded in two neighbouring sessions fails', () => {
    const p = validPlan();
    session(p, 'back_a_delts').exercises.splice(0, 0, ex('incline_bench', 'press_incline', 'heavy_compound', 4), ex('chest_press', 'press_flat', 'machine', 4));
    session(p, 'chest_triceps').exercises[1] = ex('machine_press', 'press_flat', 'machine', 4);
    expect(codes(checkPlan(p))).toContain('C9');
  });

  test('C10: a lateral raise above 90 degrees fails', () => {
    const p = validPlan();
    session(p, 'back_a_delts').exercises[2].tags = ['lateral_above_90'];
    expect(codes(checkPlan(p))).toContain('C10');
  });

  test('C11: no rear-delt or external-rotator work warns', () => {
    const p = validPlan();
    session(p, 'back_b_delts').exercises.splice(3, 1);
    expect(checkPlan(p).warnings.map((x) => x.code)).toContain('C11');
  });

  test('C12 and C13: spinal loading in neighbouring sessions, or three in one, fails', () => {
    const p = validPlan();
    session(p, 'legs').exercises[0] = ex('back_squat', 'squat_barbell', 'heavy_compound', 4);
    session(p, 'back_b_delts').exercises[0] = ex('barbell_row', 'row_barbell', 'heavy_compound', 4);
    expect(codes(checkPlan(p))).toContain('C12');

    const q = validPlan();
    const legs = session(q, 'legs');
    legs.exercises[0] = ex('back_squat', 'squat_barbell', 'heavy_compound', 3);
    legs.exercises[1] = ex('bb_rdl', 'hinge', 'heavy_compound', 3, { extra: { extraJoints: ['spinal_axial'] } });
    legs.exercises.splice(2, 0, ex('good_morning', 'hinge', 'heavy_compound', 2, { extra: { extraJoints: ['spinal_axial'] } }));
    expect(codes(checkPlan(q))).toContain('C13');
  });

  test('C14: more than 4 skull or overhead extension sets fails', () => {
    const p = validPlan();
    session(p, 'chest_triceps').exercises[3] = ex('overhead_ext', 'tri_overhead', 'isolation', 4);
    session(p, 'chest_triceps').exercises.splice(4, 0, ex('skull', 'skull', 'isolation', 2));
    expect(codes(checkPlan(p))).toContain('C14');
  });

  test('C15: knee-dominant compounds in two neighbouring sessions fail', () => {
    const p = validPlan();
    session(p, 'back_a_delts').exercises.splice(1, 0, ex('leg_press', 'squat_machine', 'machine', 4));
    expect(codes(checkPlan(p))).toContain('C15');
  });
});

describe('C16 to C18', () => {
  test('C16: the same exercise in neighbouring sessions fails', () => {
    const p = validPlan();
    session(p, 'legs').exercises.push({ ...session(p, 'back_a_delts').exercises[4] });
    expect(codes(checkPlan(p))).toContain('C16');
  });

  test('C17: an isolation before a compound fails', () => {
    const p = validPlan();
    const s = session(p, 'legs');
    s.exercises.unshift(s.exercises.pop());
    expect(codes(checkPlan(p))).toContain('C17');
  });

  test('C18 (Q1 = C): over the length without asking fails; asking passes; a wrong reported length fails', () => {
    const p = validPlan();
    p.lengthMinutes = 30;
    expect(codes(checkPlan(p))).toContain('C18');
    p.needsLengthChoice = true;
    expect(codes(checkPlan(p))).not.toContain('C18');
    const q = validPlan();
    q.reportedMinutes = [10, 10, 10, 10];
    expect(codes(checkPlan(q))).toContain('C18');
  });
});
