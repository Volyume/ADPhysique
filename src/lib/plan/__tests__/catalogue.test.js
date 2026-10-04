/**
 * catalogue.test.js -- D219 lane B1: the standard exercise catalogue
 * (design 4.7, docs/audit/plan-builder-science-2026-10-04/00-AUDIT-AND-PLAN.md;
 * evidence 03-SCIENCE.md Q12 and F13).
 *
 * What this suite pins and why:
 *
 * The founder's words (register D219): "the most standard exercises that are
 * available in all gyms. No random selection of complex exercises out the box
 * that aren't very well known." A built plan therefore names only exercises
 * from this curated table, never the alphabet's pick.
 *
 *   - The table is the design's, role by role and name by name, in the
 *     preference order the design fixes (evidence-preferred or lengthened
 *     variant first, then barbell, dumbbell, machine, cable).
 *   - Every name exists in the corpus and is a STAPLE row, except the thin-kit
 *     fallbacks (never below COMMON) and the opt-in muscles (adductors,
 *     forearms, neck, tibialis).
 *   - Each name sits in the role its library subregion says it fills.
 *   - Each reason is one plain sentence, true to the grade (a D-graded role
 *     gets a plain description, never a claimed result), never an instruction
 *     (D204), British English, no em dash.
 *   - resolveCatalogue is deterministic and independent of library order,
 *     prefers the person's own logged exercise (S Q5), carries each row's
 *     paramKey and half credit exactly as poolGenerator.deriveParamKey and
 *     algorithms.allocateExerciseVolume compute them, and leaves credited
 *     roles out.
 *   - A thin-kit fallback is used only where no listed name carries the
 *     profile, is always marked, and is pinned here so the lead's ruling is a
 *     test edit. The gaps with no recognisable row at all are pinned too.
 */
import {
  CATALOGUE, CATALOGUE_MUSCLES, CATALOGUE_PROFILES, THIN_KIT, resolveCatalogue,
} from '../catalogue';
import { GROWTH_MUSCLES } from '../roles';
import { autoTier, AUTO_TIER } from '../../exercise/canonicality';
import { deriveParamKey } from '../../poolGenerator';
import { allocateExerciseVolume } from '../../algorithms';

const { LIBRARY, LIBRARY_NAMES, BY_NAME } = require('../../__tests__/campaign16.helpers');

const OPT_IN_MUSCLES = ['adductors', 'forearms', 'neck', 'tibialis'];
const CREDITED_FIRST_CHOICE = ['front_delts', 'glutes', 'adductors'];

const rolesOf = (muscle) => CATALOGUE[muscle];
const allRoles = () => CATALOGUE_MUSCLES.flatMap((m) => rolesOf(m).map((r) => ({ muscle: m, role: r })));
const tierOf = (name) => autoTier(name);

// ── The design's table, name by name (design 4.7 and the lane brief) ─────
const EXPECTED_NAMES = {
  chest: [
    ['Barbell Bench Press', 'Dumbbell Bench Press', 'Machine Chest Press'],
    ['Incline Dumbbell Press', 'Incline Barbell Bench Press', 'Incline Machine Press'],
    ['Pec Deck (Machine Fly)', 'Cable Crossover (High to Low)'],
  ],
  back: [
    ['Lat Pulldown (Wide Grip)', 'Pull-Up', 'Chin-Up', 'Lat Pulldown (Neutral Grip)'],
    ['Seated Cable Row', 'Chest-Supported Row (Dumbbell)', 'Machine Row (Chest Supported)', 'Barbell Row (Bent Over)', 'Dumbbell Row'],
    // The third choice is the other variant of either.
    ['Lat Pulldown (Wide Grip)', 'Pull-Up', 'Chin-Up', 'Lat Pulldown (Neutral Grip)',
      'Seated Cable Row', 'Chest-Supported Row (Dumbbell)', 'Machine Row (Chest Supported)', 'Barbell Row (Bent Over)', 'Dumbbell Row'],
  ],
  side_delts: [['Dumbbell Lateral Raise'], ['Cable Lateral Raise', 'Machine Lateral Raise']],
  rear_delts: [['Reverse Pec Deck'], ['Face Pull', 'Dumbbell Rear Delt Fly']],
  front_delts: [[], ['Barbell Overhead Press', 'Dumbbell Shoulder Press', 'Machine Shoulder Press']],
  traps: [['Dumbbell Shrug', 'Barbell Shrug']],
  biceps: [
    ['EZ Bar Preacher Curl', 'Preacher Curl (Dumbbell)', 'Preacher Curl Machine', 'Preacher Curl (Barbell)'],
    ['Barbell Curl', 'Dumbbell Curl', 'Cable Curl'],
    ['Hammer Curl'],
  ],
  triceps: [
    ['Cable Overhead Tricep Extension', 'Dumbbell Overhead Tricep Extension'],
    ['Tricep Pushdown (Rope)', 'Tricep Pushdown (Bar)'],
    ['Close-Grip Bench Press'],
  ],
  forearms: [['Barbell Wrist Curl', 'Dumbbell Wrist Curl', 'Cable Wrist Curl', 'Band Wrist Curl']],
  quads: [
    ['Barbell Back Squat', 'Hack Squat Machine', 'Leg Press'],
    ['Leg Extension'],
    // The other squat variant: the leg press first, it is in nearly every gym.
    ['Leg Press', 'Hack Squat Machine', 'Barbell Back Squat'],
  ],
  hamstrings: [['Seated Leg Curl', 'Lying Leg Curl'], ['Romanian Deadlift (Barbell)', 'Romanian Deadlift (Dumbbell)']],
  glutes: [[], ['Barbell Hip Thrust', 'Machine Hip Thrust'], ['Walking Lunge', 'Bulgarian Split Squat']],
  adductors: [[], ['Hip Adduction Machine']],
  calves: [['Standing Calf Raise (Machine)'], ['Seated Calf Raise', 'Seated Machine Calf Raise'], ['Leg Press Calf Raise']],
  abs: [['Cable Crunch', 'Machine Crunch'], ['Hanging Knee Raise', 'Hanging Leg Raise']],
  neck: [['Neck Flexion (Machine)', 'Neck Extension (Machine)', 'Plate Neck Curl', 'Neck Curl']],
  tibialis: [['Tibialis Raise (Wall)', 'Seated Tibialis Raise', 'Dumbbell Tibialis Raise (Seated)']],
};

// ── The table ────────────────────────────────────────────────────────────

describe('the catalogue table (design 4.7)', () => {
  test('every muscle the planner knows has an entry, in the planner order', () => {
    expect(CATALOGUE_MUSCLES).toEqual([
      'chest', 'back', 'side_delts', 'rear_delts', 'front_delts', 'traps',
      'biceps', 'triceps', 'forearms',
      'quads', 'hamstrings', 'glutes', 'adductors', 'calves', 'abs',
      'neck', 'tibialis',
    ]);
    expect(Object.keys(CATALOGUE).sort()).toEqual([...CATALOGUE_MUSCLES].sort());
  });

  test('roles are numbered in order and their ids are unique within a muscle', () => {
    for (const muscle of CATALOGUE_MUSCLES) {
      const roles = rolesOf(muscle);
      expect(roles.length).toBeGreaterThan(0);
      expect(roles.length).toBeLessThanOrEqual(3);
      // First choice, second choice, third; a credited first choice keeps its rank 1.
      expect(roles.map((r) => r.rank)).toEqual(roles.map((_, i) => i + 1));
      expect(new Set(roles.map((r) => r.id)).size).toBe(roles.length);
    }
  });

  test('the names, role by role, are the design table in the design preference order', () => {
    const got = Object.fromEntries(CATALOGUE_MUSCLES.map((m) => [m, rolesOf(m).map((r) => [...r.names])]));
    expect(got).toEqual(EXPECTED_NAMES);
  });

  test('only front delts, glutes and adductors have a credited first choice, with no exercise of its own', () => {
    for (const { muscle, role } of allRoles()) {
      if (role.credited) {
        expect(CREDITED_FIRST_CHOICE).toContain(muscle);
        expect(role.rank).toBe(1);
        expect(role.names).toEqual([]);
      } else {
        expect(role.names.length).toBeGreaterThan(0);
      }
    }
    for (const muscle of CREDITED_FIRST_CHOICE) expect(rolesOf(muscle)[0].credited).toBe(true);
  });

  test('only adductors, forearms, neck and tibialis are opt-in', () => {
    for (const { muscle, role } of allRoles()) {
      expect(role.optIn).toBe(OPT_IN_MUSCLES.includes(muscle));
    }
  });

  test('a name is listed once within a role', () => {
    for (const { role } of allRoles()) expect(new Set(role.names).size).toBe(role.names.length);
  });

  test('the table is frozen, so a consumer cannot edit it by accident', () => {
    expect(Object.isFrozen(CATALOGUE)).toBe(true);
    expect(Object.isFrozen(CATALOGUE.chest)).toBe(true);
    expect(Object.isFrozen(CATALOGUE.chest[0])).toBe(true);
    expect(Object.isFrozen(CATALOGUE.chest[0].names)).toBe(true);
    expect(Object.isFrozen(THIN_KIT)).toBe(true);
  });
});

// ── Every name is a standard exercise ────────────────────────────────────

describe('every catalogue name exists and is a standard exercise (design 4.7 rule)', () => {
  test('every catalogue name and every thin-kit name exists in the corpus', () => {
    const names = [
      ...allRoles().flatMap(({ role }) => role.names),
      ...Object.values(THIN_KIT).flatMap((byMuscle) => Object.values(byMuscle).flatMap((byRole) => Object.values(byRole).flat())),
    ];
    expect(names.filter((n) => !LIBRARY_NAMES.has(n))).toEqual([]);
  });

  test('every listed name outside the opt-in muscles resolves to a STAPLE row', () => {
    const notStaple = allRoles()
      .filter(({ role }) => !role.optIn)
      .flatMap(({ muscle, role }) => role.names.map((n) => ({ muscle, role: role.id, name: n, tier: tierOf(n) })))
      .filter((x) => x.tier !== AUTO_TIER.STAPLE)
      .map((x) => `${x.muscle}.${x.role}: ${x.name} (${x.tier})`);
    expect(notStaple).toEqual([]);
  });

  test('opt-in rows are at least SPECIALIST: never NICHE or NEVER_AUTO, and the hip adduction machine is COMMON', () => {
    const allowed = [AUTO_TIER.STAPLE, AUTO_TIER.COMMON, AUTO_TIER.SPECIALIST];
    const bad = allRoles()
      .filter(({ role }) => role.optIn)
      .flatMap(({ muscle, role }) => role.names.map((n) => ({ muscle, name: n, tier: tierOf(n) })))
      .filter((x) => !allowed.includes(x.tier))
      .map((x) => `${x.muscle}: ${x.name} (${x.tier})`);
    expect(bad).toEqual([]);
    expect(tierOf('Hip Adduction Machine')).toBe(AUTO_TIER.COMMON);
  });

  test('every thin-kit fallback is STAPLE or COMMON, never SPECIALIST, NICHE or NEVER_AUTO', () => {
    const bad = [];
    for (const [profile, byMuscle] of Object.entries(THIN_KIT)) {
      for (const [muscle, byRole] of Object.entries(byMuscle)) {
        for (const [roleId, names] of Object.entries(byRole)) {
          for (const n of names) {
            if (![AUTO_TIER.STAPLE, AUTO_TIER.COMMON].includes(tierOf(n))) bad.push(`${profile}.${muscle}.${roleId}: ${n} (${tierOf(n)})`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  test('every row can take a rep prescription and carries at least one equipment profile', () => {
    const names = [
      ...allRoles().flatMap(({ role }) => role.names),
      ...Object.values(THIN_KIT).flatMap((byMuscle) => Object.values(byMuscle).flatMap((byRole) => Object.values(byRole).flat())),
    ];
    for (const n of new Set(names)) {
      const row = BY_NAME.get(n);
      expect(['weight_reps', 'weighted_bodyweight']).toContain(row.exerciseType);
      expect(row.equipmentProfiles.length).toBeGreaterThan(0);
    }
  });

  test('a listed name is the muscle\'s own exercise, except the two lunge rows under glutes', () => {
    // Walking Lunge and Bulgarian Split Squat are quads rows in the library
    // (the tracker credits quads 1 and glutes 0.5), listed by the design as the
    // glutes' third choice. The resolver reports the truth in `direct` and
    // `credits`; this pin keeps the exception named.
    const foreign = allRoles()
      .flatMap(({ muscle, role }) => role.names.map((n) => ({ muscle, role: role.id, name: n })))
      .filter(({ muscle, name }) => BY_NAME.get(name).primaryMuscle !== muscle)
      .map(({ muscle, role, name }) => `${muscle}.${role}: ${name} (primary ${BY_NAME.get(name).primaryMuscle})`)
      .sort();
    expect(foreign).toEqual([
      'glutes.lunge: Bulgarian Split Squat (primary quads)',
      'glutes.lunge: Walking Lunge (primary quads)',
    ]);
  });

  test('each name sits in the role its library subregion says it fills', () => {
    const SUBREGION = {
      'chest.flat_press': 'flat',
      'chest.incline_press': 'incline',
      'back.vertical_pull': 'vertical_pull',
      'biceps.preacher_curl': 'short_head',
      'triceps.overhead_extension': 'overhead',
      'triceps.pushdown': 'pushdown',
      'quads.squat_or_press': 'squat_press',
      'quads.leg_extension': 'knee_extension',
      'hamstrings.leg_curl': 'knee_flexion',
      'hamstrings.hip_hinge': 'hip_extension',
      'glutes.hip_thrust': 'activator',
      'calves.standing_calf': 'gastro',
      'calves.seated_calf': 'soleus',
      'abs.loaded_crunch': 'flexion',
      'abs.hanging_raise': 'flexion',
    };
    const wrong = [];
    for (const { muscle, role } of allRoles()) {
      const want = SUBREGION[`${muscle}.${role.id}`];
      if (!want) continue;
      for (const n of role.names) if (BY_NAME.get(n).subregion !== want) wrong.push(`${muscle}.${role.id}: ${n} is ${BY_NAME.get(n).subregion}, not ${want}`);
    }
    expect(wrong).toEqual([]);
  });

  test('no catalogue row is difficulty 3, the level beginner plans drop', () => {
    // A row at 3 would vanish from a beginner's plan and leave the role empty.
    const hard = allRoles()
      .flatMap(({ role }) => role.names)
      .filter((n) => BY_NAME.get(n).difficulty >= 3);
    expect(hard).toEqual([]);
  });
});

// ── The reasons a person reads ───────────────────────────────────────────

const NEVER = /\b(too much|near the limit|overtrain(ed|ing)?|junk|cut back|you should|reduce your|train more|train less|risk|danger(ous)?|must|should|avoid|never|always)\b/i;
const IMPERATIVE_START = /^(use|do|try|train|add|take|keep|choose|pick|avoid|make|go|start|stop|perform|lift|press|pull|curl|squat|raise|bend|hold|stand|lie|sit)\b/i;
const AMERICAN = /\b(color|behavior|center|favor|recognize|organize|optimize|utilize|program(?!me)|gray)\b/i;
const RESULT_CLAIM = /\b(grew|grown|gained|gains?|bigger|larger|increased?)\b|\d\s?%/i;
const MACHINE_TELL = /\b(delve|leverage|utili[sz]e|facilitate|seamless(?:ly)?|streamlin(?:e|es|ed|ing)|robust|comprehensive)\b/i;

function styleProblems(text) {
  const problems = [];
  if (typeof text !== 'string' || text.length === 0) return ['empty'];
  if (text.includes('—')) problems.push('em dash');
  if (/\n/.test(text)) problems.push('newline');
  if (!/[.]$/.test(text) || (text.match(/[.!?]/g) || []).length !== 1) problems.push('not exactly one sentence');
  if (text.length > 260) problems.push('longer than 260 characters');
  if (NEVER.test(text)) problems.push(`forbidden wording: ${text.match(NEVER)[0]}`);
  if (IMPERATIVE_START.test(text)) problems.push('starts with an instruction');
  if (AMERICAN.test(text)) problems.push('American spelling');
  if (MACHINE_TELL.test(text)) problems.push('machine-tell word');
  if (/^[a-z]/.test(text)) problems.push('does not start with a capital');
  return problems;
}

describe('every reason is one plain sentence, true to its grade (design 6, D204)', () => {
  test('every role has a reason, a grade and a source', () => {
    for (const { muscle, role } of allRoles()) {
      expect(typeof role.reason).toBe('string');
      expect(['A', 'B', 'C', 'D']).toContain(role.grade);
      expect(typeof role.source).toBe('string');
      expect(role.source.length).toBeGreaterThan(10);
      expect(`${muscle}.${role.id}`).toBeTruthy();
    }
  });

  test('every reason, and every per-name reason, passes the style rules', () => {
    const problems = [];
    for (const { muscle, role } of allRoles()) {
      for (const p of styleProblems(role.reason)) problems.push(`${muscle}.${role.id}: ${p}`);
      for (const [name, text] of Object.entries(role.reasonByName ?? {})) {
        if (!role.names.includes(name)) problems.push(`${muscle}.${role.id}: reasonByName names ${name}, which the role does not list`);
        for (const p of styleProblems(text)) problems.push(`${muscle}.${role.id}.${name}: ${p}`);
      }
    }
    expect(problems).toEqual([]);
  });

  test('a C or D role gets a plain description: no result is claimed for it', () => {
    const claimed = [];
    for (const { muscle, role } of allRoles()) {
      if (role.grade === 'B' || role.grade === 'A') continue;
      for (const text of [role.reason, ...Object.values(role.reasonByName ?? {})]) {
        if (RESULT_CLAIM.test(text)) claimed.push(`${muscle}.${role.id}: ${text.match(RESULT_CLAIM)[0]}`);
      }
    }
    expect(claimed).toEqual([]);
  });

  test('a B role states the trial it rests on: a size or length, and a named source with a year', () => {
    for (const { role } of allRoles()) {
      if (role.grade !== 'B') continue;
      expect(role.reason).toMatch(/\d/);
      expect(role.source).toMatch(/(19|20)\d\d/);
    }
  });

  test('a D role says plainly that no trial was found, or that the point is theory', () => {
    for (const { role } of allRoles()) {
      if (role.grade !== 'D') continue;
      expect(`${role.reason} ${role.source}`).toMatch(/no (growth )?trial|not a measured|has not been|have not been|theory/i);
    }
  });

  test('the source lines carry no em dash and no instruction', () => {
    for (const { role } of allRoles()) {
      expect(role.source).not.toMatch(/—/);
      expect(role.source).not.toMatch(NEVER);
    }
  });

  test('the design\'s own two examples hold: the seated curl and the incline press', () => {
    const curl = rolesOf('hamstrings')[0];
    expect(curl.reason).toMatch(/long length/);
    expect(curl.reason).toMatch(/12-week/);
    expect(curl.reason).toMatch(/lying leg curl/);
    const incline = rolesOf('chest')[1];
    expect(incline.reason).toMatch(/upper chest/);
    expect(incline.reason).toMatch(/flat pressing reaches less/);
  });
});

// ── The resolver ─────────────────────────────────────────────────────────

const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const SHIPPED = [...LIBRARY].sort(byName);

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled(list, seed) {
  const out = [...list];
  const rand = seeded(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const resolve = (profile, extra = {}) => resolveCatalogue({ library: LIBRARY, profile, ...extra });
const picks = (res) => Object.fromEntries(Object.entries(res).map(([m, list]) => [m, list.map((x) => x.name)]));

const FULL_GYM_PICKS = {
  chest: ['Barbell Bench Press', 'Incline Dumbbell Press', 'Pec Deck (Machine Fly)'],
  back: ['Lat Pulldown (Wide Grip)', 'Seated Cable Row', 'Lat Pulldown (Neutral Grip)'],
  side_delts: ['Dumbbell Lateral Raise', 'Cable Lateral Raise'],
  rear_delts: ['Reverse Pec Deck', 'Face Pull'],
  front_delts: ['Barbell Overhead Press'],
  traps: ['Dumbbell Shrug'],
  biceps: ['EZ Bar Preacher Curl', 'Barbell Curl', 'Hammer Curl'],
  triceps: ['Cable Overhead Tricep Extension', 'Tricep Pushdown (Rope)', 'Close-Grip Bench Press'],
  forearms: ['Barbell Wrist Curl'],
  quads: ['Barbell Back Squat', 'Leg Extension', 'Leg Press'],
  hamstrings: ['Seated Leg Curl', 'Romanian Deadlift (Barbell)'],
  glutes: ['Barbell Hip Thrust', 'Walking Lunge'],
  adductors: ['Hip Adduction Machine'],
  calves: ['Standing Calf Raise (Machine)', 'Seated Calf Raise', 'Leg Press Calf Raise'],
  abs: ['Cable Crunch', 'Hanging Knee Raise'],
  neck: ['Neck Flexion (Machine)'],
  tibialis: ['Tibialis Raise (Wall)'],
};

describe('resolveCatalogue: the full gym', () => {
  test('picks the first listed name for every role, in catalogue order, with credited roles left out', () => {
    expect(picks(resolve('full_gym'))).toEqual(FULL_GYM_PICKS);
  });

  test('every muscle has a key, and an omitted profile is the full gym', () => {
    const res = resolveCatalogue({ library: LIBRARY });
    expect(Object.keys(res)).toEqual([...CATALOGUE_MUSCLES]);
    expect(picks(res)).toEqual(FULL_GYM_PICKS);
  });

  test('an item carries exactly the documented fields, of the documented types', () => {
    const KEYS = [
      'credits', 'direct', 'exerciseId', 'grade', 'kind', 'logged', 'name', 'optIn', 'primaryMuscle',
      'rank', 'reason', 'role', 'source', 'thinKit',
    ];
    for (const list of Object.values(resolve('full_gym'))) {
      for (const x of list) {
        expect(Object.keys(x).sort()).toEqual(KEYS);
        expect(typeof x.name).toBe('string');
        expect(typeof x.exerciseId).toBe('string');
        expect(['heavy_compound', 'mod_compound', 'machine', 'isolation']).toContain(x.kind);
        expect(typeof x.credits).toBe('object');
        expect(Number.isFinite(x.direct)).toBe(true);
        expect([1, 2, 3]).toContain(x.rank);
        expect(typeof x.thinKit).toBe('boolean');
        expect(typeof x.optIn).toBe('boolean');
        expect(typeof x.logged).toBe('boolean');
      }
    }
  });

  test('a first item is rank 1 unless the muscle\'s first choice is credited', () => {
    for (const [muscle, list] of Object.entries(resolve('full_gym'))) {
      expect(list[0].rank).toBe(CREDITED_FIRST_CHOICE.includes(muscle) ? 2 : 1);
      const ranks = list.map((x) => x.rank);
      expect([...ranks].sort()).toEqual(ranks);
    }
  });

  test('the bench press credits the triceps and the front delts at half a set, as the tracker does', () => {
    const bench = resolve('full_gym').chest[0];
    expect(bench.credits).toEqual({ triceps: 0.5, front_delts: 0.5 });
    expect(bench.kind).toBe('heavy_compound');
    expect(bench.direct).toBe(1);
  });

  test('the item is the role\'s reason, grade and source', () => {
    const res = resolve('full_gym');
    const curl = res.hamstrings[0];
    expect(curl.reason).toBe(CATALOGUE.hamstrings[0].reason);
    expect(curl.grade).toBe('B');
    expect(curl.source).toBe(CATALOGUE.hamstrings[0].source);
    expect(curl.thinKit).toBe(false);
    expect(curl.role).toBe('leg_curl');
  });

  test('a per-name reason is used for the variant it describes', () => {
    const noSeated = LIBRARY.filter((e) => e.name !== 'Seated Leg Curl');
    const res = resolveCatalogue({ library: noSeated, profile: 'full_gym' });
    expect(res.hamstrings[0].name).toBe('Lying Leg Curl');
    expect(res.hamstrings[0].reason).toBe(CATALOGUE.hamstrings[0].reasonByName['Lying Leg Curl']);
  });

  test('opt-in items are flagged, and only for adductors, forearms, neck and tibialis', () => {
    for (const [muscle, list] of Object.entries(resolve('full_gym'))) {
      for (const x of list) expect(x.optIn).toBe(OPT_IN_MUSCLES.includes(muscle));
    }
  });

  test('a lunge listed under glutes reports the truth: half a set to glutes, a full set to quads', () => {
    const lunge = resolve('full_gym').glutes.find((x) => x.name === 'Walking Lunge');
    expect(lunge.primaryMuscle).toBe('quads');
    expect(lunge.direct).toBe(0.5);
    expect(lunge.credits).toEqual({ quads: 1, hamstrings: 0.5 });
  });
});

describe('resolveCatalogue: the same numbers as the engine and the tracker', () => {
  test.each(CATALOGUE_PROFILES)('%s: kind is the pool\'s paramKey, credits and direct are allocateExerciseVolume\'s', (profile) => {
    for (const [muscle, list] of Object.entries(resolve(profile))) {
      for (const x of list) {
        const row = BY_NAME.get(x.name);
        expect(x.kind).toBe(deriveParamKey(row.equipmentCategory, row.compoundIsolation));
        const expected = { direct: 0, credits: {} };
        for (const { muscle: m, sets } of allocateExerciseVolume(row)) {
          if (m === muscle) expected.direct += sets;
          else expected.credits[m] = (expected.credits[m] ?? 0) + sets;
        }
        expect({ direct: x.direct, credits: x.credits }).toEqual(expected);
        expect(x.primaryMuscle).toBe(row.primaryMuscle);
        expect(x.exerciseId).toBe(row.id);
      }
    }
  });

  test('kind, direct and credits agree with the originals for every combination the library has', () => {
    // The resolver's two small derivations are private, so swap each library
    // row's category, compound flag and muscles onto the bench press row and
    // compare what the chest slot reports with the real functions.
    const bench = BY_NAME.get('Barbell Bench Press');
    const seen = new Set();
    for (const row of LIBRARY) {
      const key = [row.equipmentCategory, row.compoundIsolation, row.primaryMuscle, JSON.stringify(row.secondaryMuscles)].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const probe = {
        ...bench,
        equipmentCategory: row.equipmentCategory,
        compoundIsolation: row.compoundIsolation,
        primaryMuscle: row.primaryMuscle,
        secondaryMuscles: row.secondaryMuscles,
      };
      const library = LIBRARY.map((e) => (e.name === bench.name ? probe : e));
      const item = resolveCatalogue({ library, profile: 'full_gym' }).chest[0];
      expect(item.name).toBe(bench.name);
      expect(item.kind).toBe(deriveParamKey(row.equipmentCategory, row.compoundIsolation));
      const expected = { direct: 0, credits: {} };
      for (const { muscle: m, sets } of allocateExerciseVolume(probe)) {
        if (m === 'chest') expected.direct += sets;
        else expected.credits[m] = (expected.credits[m] ?? 0) + sets;
      }
      expect({ direct: item.direct, credits: item.credits }).toEqual(expected);
    }
    // Four paramKeys, and a good spread of muscle shapes, were swept.
    expect(seen.size).toBeGreaterThan(40);
  });

  test.each(CATALOGUE_PROFILES)('%s: every chosen row carries the profile', (profile) => {
    for (const list of Object.values(resolve(profile))) {
      for (const x of list) expect(BY_NAME.get(x.name).equipmentProfiles).toContain(profile);
    }
  });

  test.each(CATALOGUE_PROFILES)('%s: a name is chosen once within a muscle', (profile) => {
    for (const list of Object.values(resolve(profile))) {
      const names = list.map((x) => x.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

describe('resolveCatalogue: deterministic, and independent of the library order', () => {
  test.each(CATALOGUE_PROFILES)('%s: the same inputs give the same answer, in the shipped order, reversed and shuffled', (profile) => {
    const wanted = resolveCatalogue({ library: SHIPPED, profile });
    expect(resolveCatalogue({ library: SHIPPED, profile })).toEqual(wanted);
    expect(resolveCatalogue({ library: [...SHIPPED].reverse(), profile })).toEqual(wanted);
    expect(resolveCatalogue({ library: shuffled(LIBRARY, 20261004), profile })).toEqual(wanted);
    expect(resolveCatalogue({ library: shuffled(LIBRARY, 3), profile })).toEqual(wanted);
    expect(resolveCatalogue({ library: LIBRARY, profile })).toEqual(wanted);
  });

  test('the order of the logged names does not matter either', () => {
    const a = resolve('full_gym', { loggedExerciseNames: ['Dumbbell Bench Press', 'Machine Chest Press', 'Cable Curl'] });
    const b = resolve('full_gym', { loggedExerciseNames: ['Cable Curl', 'Machine Chest Press', 'Dumbbell Bench Press'] });
    expect(a).toEqual(b);
    expect(a.chest[0].name).toBe('Dumbbell Bench Press');
  });

  test('inputs are not mutated', () => {
    const library = shuffled(LIBRARY, 11);
    const names = library.map((e) => e.name).join('|');
    const logged = ['Dumbbell Row'];
    resolveCatalogue({ library, profile: 'full_gym', loggedExerciseNames: logged });
    expect(library.map((e) => e.name).join('|')).toBe(names);
    expect(logged).toEqual(['Dumbbell Row']);
  });

  test('a built-in row beats a custom row of the same name, whatever the order', () => {
    const builtIn = BY_NAME.get('Barbell Bench Press');
    // An id that sorts before the built-in's, so only the custom flag decides.
    const custom = { ...builtIn, id: 'Aaa custom', isCustom: true };
    for (const library of [[custom, ...LIBRARY], [...LIBRARY, custom]]) {
      const res = resolveCatalogue({ library, profile: 'full_gym' });
      expect(res.chest[0].exerciseId).toBe(builtIn.id);
    }
  });
});

describe('resolveCatalogue: the person\'s own logged exercise comes first (S Q5, the repeated-bout effect)', () => {
  test('a logged variant in a role wins over the first in order', () => {
    const res = resolve('full_gym', { loggedExerciseNames: ['Dumbbell Bench Press'] });
    expect(res.chest[0]).toMatchObject({ name: 'Dumbbell Bench Press', logged: true, role: 'flat_press' });
    // nothing else moved
    expect(picks(res)).toEqual({ ...FULL_GYM_PICKS, chest: ['Dumbbell Bench Press', 'Incline Dumbbell Press', 'Pec Deck (Machine Fly)'] });
  });

  test('a Set of names works as well as an array', () => {
    const res = resolve('full_gym', { loggedExerciseNames: new Set(['Cable Curl']) });
    expect(res.biceps.find((x) => x.role === 'standing_curl').name).toBe('Cable Curl');
  });

  test('two logged variants of one role: the first in catalogue order wins', () => {
    const res = resolve('full_gym', { loggedExerciseNames: ['Machine Chest Press', 'Dumbbell Bench Press'] });
    expect(res.chest[0].name).toBe('Dumbbell Bench Press');
  });

  test('a logged exercise that does not carry the profile is ignored', () => {
    const res = resolve('machines_cables', { loggedExerciseNames: ['Barbell Bench Press', 'Dumbbell Curl'] });
    expect(res.chest[0].name).toBe('Machine Chest Press');
    expect(res.biceps[1].name).toBe('Cable Curl');
    expect(res.chest[0].logged).toBe(false);
  });

  test('a logged exercise outside the role\'s names changes nothing', () => {
    const res = resolve('full_gym', { loggedExerciseNames: ['Smith Machine Bench Press', 'Decline Barbell Bench Press'] });
    expect(picks(res)).toEqual(FULL_GYM_PICKS);
  });

  test('a variant logged for the first role is not chosen again by the third', () => {
    const res = resolve('full_gym', { loggedExerciseNames: ['Lat Pulldown (Neutral Grip)'] });
    expect(res.back.map((x) => x.name)).toEqual(['Lat Pulldown (Neutral Grip)', 'Seated Cable Row', 'Lat Pulldown (Wide Grip)']);
  });

  test('the logged exercise is also preferred among thin-kit fallbacks', () => {
    const res = resolve('bodyweight', { loggedExerciseNames: ['Band Row (Single-Arm)'] });
    expect(res.back.find((x) => x.role === 'horizontal_row')).toMatchObject({ name: 'Band Row (Single-Arm)', thinKit: true, logged: true });
  });
});

describe('resolveCatalogue: the library as the app and the database hand it over', () => {
  const asDatabaseRow = (row) => ({
    id: row.id,
    name: row.name,
    primary_muscle: row.primaryMuscle,
    secondary_muscles: JSON.stringify(row.secondaryMuscles),
    equipment_category: row.equipmentCategory,
    compound_isolation: row.compoundIsolation,
    equipment_profiles: JSON.stringify(row.equipmentProfiles),
    exercise_type: row.exerciseType,
    is_custom: 0,
  });
  // What getAllExercises returns: camelCase keys, secondary muscles parsed,
  // equipment profiles still the JSON string.
  const asAppRow = (row) => ({ ...row, equipmentProfiles: JSON.stringify(row.equipmentProfiles) });

  test.each(CATALOGUE_PROFILES)('%s: SQLite rows and app rows resolve to the same answer', (profile) => {
    const wanted = resolve(profile);
    expect(resolveCatalogue({ library: LIBRARY.map(asDatabaseRow), profile })).toEqual(wanted);
    expect(resolveCatalogue({ library: LIBRARY.map(asAppRow), profile })).toEqual(wanted);
  });

  test('a secondary muscle written as { muscle, contribution } is credited at its contribution', () => {
    const row = { ...BY_NAME.get('Barbell Bench Press'), secondaryMuscles: [{ muscle: 'triceps', contribution: 0.3 }, 'shoulders'] };
    const library = LIBRARY.map((e) => (e.name === row.name ? row : e));
    const bench = resolveCatalogue({ library, profile: 'full_gym' }).chest[0];
    expect(bench.credits).toEqual({ triceps: 0.3, front_delts: 0.5 });
  });

  test('no library, an empty library or an unknown profile give every muscle an empty list and never throw', () => {
    for (const args of [undefined, {}, { library: [] }, { library: null, profile: 'full_gym' }, { library: LIBRARY, profile: 'moon_base' }]) {
      const res = resolveCatalogue(args);
      expect(Object.keys(res)).toEqual([...CATALOGUE_MUSCLES]);
      for (const list of Object.values(res)) expect(list).toEqual([]);
    }
  });

  test('an exercise missing from the library (the person excluded it) is skipped, never invented', () => {
    const library = LIBRARY.filter((e) => e.name !== 'Barbell Bench Press');
    const res = resolveCatalogue({ library, profile: 'full_gym' });
    expect(res.chest.map((x) => x.name)).toEqual(['Dumbbell Bench Press', 'Incline Dumbbell Press', 'Pec Deck (Machine Fly)']);
  });

  test('a role with no listed name left in the full gym resolves to nothing, with no fallback', () => {
    const flat = new Set(CATALOGUE.chest[0].names);
    const library = LIBRARY.filter((e) => !flat.has(e.name));
    const res = resolveCatalogue({ library, profile: 'full_gym' });
    expect(res.chest.map((x) => x.name)).toEqual(['Incline Dumbbell Press', 'Pec Deck (Machine Fly)']);
    expect(res.chest.every((x) => !x.thinKit)).toBe(true);
  });
});

// ── Standard exercises only, in every kit ────────────────────────────────

describe('every exercise a plan picks without being asked is a STAPLE row (design 4.7)', () => {
  test.each(CATALOGUE_PROFILES)('%s: STAPLE for a listed name, STAPLE or COMMON for a fallback, SPECIALIST only for an opt-in muscle', (profile) => {
    const offences = [];
    for (const [muscle, list] of Object.entries(resolve(profile))) {
      for (const x of list) {
        const tier = tierOf(x.name);
        if (x.optIn) {
          if (![AUTO_TIER.STAPLE, AUTO_TIER.COMMON, AUTO_TIER.SPECIALIST].includes(tier)) offences.push(`${muscle}: ${x.name} (${tier})`);
        } else if (x.thinKit) {
          if (![AUTO_TIER.STAPLE, AUTO_TIER.COMMON].includes(tier)) offences.push(`${muscle}: ${x.name} (${tier})`);
        } else if (tier !== AUTO_TIER.STAPLE) {
          offences.push(`${muscle}: ${x.name} (${tier})`);
        }
      }
    }
    expect(offences).toEqual([]);
  });

  test.each(CATALOGUE_PROFILES)('%s: never a NICHE or NEVER_AUTO row, even for an opt-in muscle', (profile) => {
    for (const list of Object.values(resolve(profile))) {
      for (const x of list) expect([AUTO_TIER.NICHE, AUTO_TIER.NEVER_AUTO]).not.toContain(tierOf(x.name));
    }
  });
});

// ── Thin kits (proposed for the lead's ruling) ───────────────────────────

describe('thin-kit fallbacks: used only where no listed name carries the profile, always marked', () => {
  test('a fallback is listed only for a first or second choice whose listed names carry none of the profile', () => {
    const problems = [];
    for (const [profile, byMuscle] of Object.entries(THIN_KIT)) {
      expect(CATALOGUE_PROFILES).toContain(profile);
      for (const [muscle, byRole] of Object.entries(byMuscle)) {
        for (const [roleId, names] of Object.entries(byRole)) {
          const role = rolesOf(muscle).find((r) => r.id === roleId);
          if (!role) { problems.push(`${profile}.${muscle}.${roleId}: no such role`); continue; }
          if (role.rank > 2) problems.push(`${profile}.${muscle}.${roleId}: a third choice takes no fallback`);
          if (role.credited) problems.push(`${profile}.${muscle}.${roleId}: a credited role has nothing to replace`);
          for (const n of role.names) {
            if (BY_NAME.get(n).equipmentProfiles.includes(profile)) problems.push(`${profile}.${muscle}.${roleId}: listed name ${n} carries the profile, so the fallback is dead`);
          }
          for (const n of names) {
            if (!BY_NAME.get(n).equipmentProfiles.includes(profile)) problems.push(`${profile}.${muscle}.${roleId}: ${n} does not carry the profile`);
            if (role.names.includes(n)) problems.push(`${profile}.${muscle}.${roleId}: ${n} is already a listed name`);
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });

  test('the full gym needs no fallback at all', () => {
    expect(THIN_KIT.full_gym).toEqual({});
    for (const list of Object.values(resolve('full_gym'))) for (const x of list) expect(x.thinKit).toBe(false);
  });

  test('dumbbells only and a home gym share one table', () => {
    expect(THIN_KIT.home_gym).toBe(THIN_KIT.dumbbells_only);
  });

  // Every fallback the lane proposes, by profile and muscle. The lead rules on
  // each: striking a name is an edit here and in THIN_KIT.
  const PROPOSED_FALLBACKS = {
    full_gym: {},
    machines_cables: {
      traps: ['Cable Shrug'],
      hamstrings: ['Smith Machine Romanian Deadlift'],
    },
    dumbbells_only: {
      triceps: ['Dumbbell Skull Crusher'],
      quads: ['Goblet Squat', 'Bulgarian Split Squat'],
      glutes: ['Dumbbell Hip Thrust'],
      calves: ['Dumbbell Calf Raise (Standing)', 'Seated Dumbbell Calf Raise'],
      abs: ['Decline Crunch'],
    },
    barbell_plates: {
      rear_delts: ['Prone Reverse Fly'],
      triceps: ['EZ Bar Skull Crusher'],
      quads: ['Barbell Lunge'],
      calves: ['Standing Calf Raise (Barbell)', 'Seated Calf Raise (Barbell)'],
      abs: ['Decline Crunch'],
    },
    bodyweight: {
      chest: ['Push-Up', 'Decline Push-Up'],
      back: ['Inverted Row'],
      rear_delts: ['Band Pull-Apart', 'Band Rear Delt Fly'],
      front_delts: ['Pike Push-Up'],
      biceps: ['Band Standing Curl (Single-Arm)', 'Band Hammer Curl'],
      triceps: ['Bench Dip', 'Diamond Push-Up'],
      quads: ['Bodyweight Split Squat', 'Bodyweight Reverse Lunge'],
      hamstrings: ['Band Romanian Deadlift (Bilateral)'],
      glutes: ['Single-Leg Glute Bridge'],
      calves: ['Donkey Calf Raise'],
      abs: ['Decline Crunch'],
    },
  };
  PROPOSED_FALLBACKS.home_gym = PROPOSED_FALLBACKS.dumbbells_only;

  test.each(CATALOGUE_PROFILES)('%s: the fallbacks the resolver uses are exactly the proposed ones, each marked thinKit', (profile) => {
    const used = {};
    for (const [muscle, list] of Object.entries(resolve(profile))) {
      const fallbacks = list.filter((x) => x.thinKit).map((x) => x.name);
      if (fallbacks.length) used[muscle] = fallbacks;
    }
    expect(used).toEqual(PROPOSED_FALLBACKS[profile]);
  });

  test('a fallback reads as a plain fact, no stronger than "chosen because it fits your equipment"', () => {
    const problems = [];
    for (const profile of CATALOGUE_PROFILES) {
      for (const list of Object.values(resolve(profile))) {
        for (const x of list.filter((y) => y.thinKit)) {
          expect(x.grade).toBe('D');
          expect(x.source).toMatch(/suits your equipment/);
          for (const p of styleProblems(x.reason)) problems.push(`${profile}.${x.name}: ${p}`);
          if (RESULT_CLAIM.test(x.reason)) problems.push(`${profile}.${x.name}: claims a result`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  // The roles with no recognisable row at all for a kit are reported, not
  // filled: the planner shows the gap, and no NICHE, NEVER_AUTO or SPECIALIST
  // row is borrowed (opt-in muscles aside). Pinned so a change is visible.
  const emptyRoles = (profile) => {
    const res = resolve(profile);
    const out = [];
    for (const m of CATALOGUE_MUSCLES) {
      if (OPT_IN_MUSCLES.includes(m)) continue;
      const filled = new Set(res[m].map((x) => x.role));
      for (const r of rolesOf(m)) if (!r.credited && r.rank <= 2 && !filled.has(r.id)) out.push(`${m}.${r.id}`);
    }
    return out;
  };

  test('the full gym leaves no first or second choice empty', () => {
    expect(emptyRoles('full_gym')).toEqual([]);
  });

  test('the first or second choices with no recognisable row for the kit (reported to the lead)', () => {
    expect(emptyRoles('machines_cables')).toEqual(['side_delts.lateral_raise']);
    const dumbbells = ['back.vertical_pull', 'side_delts.lateral_raise_alt', 'rear_delts.reverse_fly', 'hamstrings.leg_curl'];
    expect(emptyRoles('dumbbells_only')).toEqual(dumbbells);
    expect(emptyRoles('home_gym')).toEqual(dumbbells);
    expect(emptyRoles('barbell_plates')).toEqual([
      'back.vertical_pull', 'side_delts.lateral_raise', 'side_delts.lateral_raise_alt', 'rear_delts.rear_delt_alt',
      'triceps.pushdown', 'hamstrings.leg_curl',
    ]);
    expect(emptyRoles('bodyweight')).toEqual([
      'side_delts.lateral_raise', 'side_delts.lateral_raise_alt', 'traps.shrug', 'hamstrings.leg_curl', 'calves.seated_calf',
    ]);
  });

  test('a muscle has no exercise at all only where the kit has no recognisable row for it', () => {
    const noExercise = (profile) => Object.entries(resolve(profile))
      .filter(([m, list]) => list.length === 0 && !OPT_IN_MUSCLES.includes(m))
      .map(([m]) => m);
    expect(noExercise('full_gym')).toEqual([]);
    expect(noExercise('machines_cables')).toEqual([]);
    expect(noExercise('dumbbells_only')).toEqual([]);
    expect(noExercise('home_gym')).toEqual([]);
    expect(noExercise('barbell_plates')).toEqual(['side_delts']);
    expect(noExercise('bodyweight')).toEqual(['side_delts', 'traps']);
  });

  // D219 lane B6: the planner gives every growth muscle (roles.GROWTH_MUSCLES,
  // the eleven every goal trains) at least one exercise of its own. This pins
  // the kits where the standard catalogue and the thin-kit fallbacks leave a
  // growth muscle with none (reported to the lead for a ruling): the side
  // delts, which need a dumbbell, cable or machine raise, on a barbell-and-
  // plates kit and on bodyweight alone. Every other kit covers all eleven.
  test('every growth muscle has at least one choice on every kit, except the reported gaps', () => {
    const gaps = {};
    for (const profile of CATALOGUE_PROFILES) {
      const res = resolve(profile);
      const empty = GROWTH_MUSCLES.filter((m) => res[m].length === 0);
      if (empty.length) gaps[profile] = empty;
    }
    expect(gaps).toEqual({ barbell_plates: ['side_delts'], bodyweight: ['side_delts'] });
  });

  test('every muscle the goals train for growth has two exercises in the full gym', () => {
    const res = resolve('full_gym');
    for (const m of ['chest', 'back', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs']) {
      expect(res[m].length).toBeGreaterThanOrEqual(2);
    }
  });
});
