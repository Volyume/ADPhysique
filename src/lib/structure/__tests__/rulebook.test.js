/**
 * rulebook.test.js -- pins the structure engine's rulebook (D222) so the
 * data cannot drift from the founder's approved research (map 09) without a
 * test failing.
 *
 * What it pins:
 * - every exported value carries a grade and source in EVIDENCE;
 * - every category has a template at every day count, listing only muscles
 *   the rulebook knows and never an indirect-only muscle;
 * - every muscle a category trains appears in at least one session at every
 *   day count (founder F2: the standard is never bypassed);
 * - no muscle outside the next-day exception list is listed in two
 *   neighbouring sessions, the last neighbouring the first (09 s1.3, F5);
 * - men's physique trains legs in exactly one session at every day count
 *   (founder F4);
 * - the volume tiers are ordered and the lead rulings R11 to R15 hold.
 */
import * as RB from '../rulebook';

const {
  MUSCLES, OPT_IN_MUSCLES, FAST_MUSCLES, PATTERNS, CATEGORIES, TIERS, VOLUME,
  DAY_COUNTS, TEMPLATES, EVIDENCE, rulebookCategory, REST_SECONDS, REP_RANGES,
  REST_TRIM_ORDER, PROGRESSION, SESSION_LIMITS, JOINT_RULES,
} = RB;

const tierOf = (category, muscle) => (TIERS[muscle] ? TIERS[muscle][category] : 'I');
const trainedMuscles = (category) => MUSCLES.filter(
  (m) => !OPT_IN_MUSCLES.includes(m) && tierOf(category, m) !== 'I',
);

describe('rulebook evidence', () => {
  test('every export has a grade and source', () => {
    const exported = Object.keys(RB).filter((k) => k !== 'EVIDENCE');
    const missing = exported.filter((k) => typeof EVIDENCE[k] !== 'string' || !/^[A-D]/.test(EVIDENCE[k]));
    expect(missing).toEqual([]);
  });
});

describe('rulebook data', () => {
  test('every pattern names a known muscle, kind and credits', () => {
    for (const [key, p] of Object.entries(PATTERNS)) {
      expect([key, MUSCLES.includes(p.muscle)]).toEqual([key, true]);
      expect([key, ['compound', 'isolation'].includes(p.kind)]).toEqual([key, true]);
      for (const c of p.credits) expect([key, c, MUSCLES.includes(c)]).toEqual([key, c, true]);
    }
  });

  test('every tracked muscle has a tier in every category', () => {
    for (const m of MUSCLES.filter((x) => !OPT_IN_MUSCLES.includes(x))) {
      for (const c of CATEGORIES) expect([m, c, ['P', 'S', 'M', 'I'].includes(tierOf(c, m))]).toEqual([m, c, true]);
    }
  });

  test('volume tiers are ordered', () => {
    for (const t of ['P', 'S', 'M']) {
      for (const d of DAY_COUNTS) {
        expect(VOLUME[t].min[d]).toBeLessThanOrEqual(VOLUME[t].typical);
      }
      expect(VOLUME[t].typical).toBeLessThanOrEqual(VOLUME[t].max);
    }
    expect(VOLUME.P.min[4]).toBeGreaterThan(VOLUME.S.min[4]);
    expect(VOLUME.S.min[4]).toBeGreaterThan(VOLUME.M.min[4]);
  });

  test('rest floors never exceed defaults, and rest is trimmed isolation first', () => {
    for (const [kind, r] of Object.entries(REST_SECONDS)) {
      expect([kind, r.floor <= r.default]).toEqual([kind, true]);
      expect(REP_RANGES[kind][0]).toBeLessThan(REP_RANGES[kind][1]);
    }
    expect(REST_TRIM_ORDER[0]).toBe('isolation');
    expect(REST_TRIM_ORDER[REST_TRIM_ORDER.length - 1]).toBe('heavy_compound');
  });

  test('the block ladder never takes a compound to failure (09 s8)', () => {
    expect(PROGRESSION.rirLadder).toHaveLength(PROGRESSION.weeks);
    expect(Math.min(...PROGRESSION.rirLadder)).toBeGreaterThanOrEqual(PROGRESSION.compoundMinRir);
    expect(PROGRESSION.nextDayExceptionMinRir).toBe(2);
  });

  test('session limits are the approved values (R4: 24 sets)', () => {
    expect(SESSION_LIMITS.workingSetsHard).toBe(24);
    expect(SESSION_LIMITS.exercisesHard).toBe(8);
    expect(SESSION_LIMITS.setsPerExerciseMax).toBe(4);
    expect(JOINT_RULES.ohpSessionsMaxByCategory.mens_physique).toBe(0);
  });
});

describe('templates', () => {
  test('every category has a template at every day count', () => {
    for (const c of CATEGORIES) {
      for (const d of DAY_COUNTS) {
        expect([c, d, (TEMPLATES[c][d] || []).length]).toEqual([c, d, d]);
      }
    }
  });

  test('sessions list only known, directly trained muscles, without repeats', () => {
    for (const c of CATEGORIES) {
      for (const d of DAY_COUNTS) {
        for (const s of TEMPLATES[c][d]) {
          for (const m of s.muscles) {
            expect([c, d, s.key, m, MUSCLES.includes(m)]).toEqual([c, d, s.key, m, true]);
            expect([c, d, s.key, m, tierOf(c, m)]).not.toEqual([c, d, s.key, m, 'I']);
          }
          expect([c, d, s.key, new Set(s.muscles).size]).toEqual([c, d, s.key, s.muscles.length]);
        }
        const keys = TEMPLATES[c][d].map((s) => s.key);
        expect([c, d, new Set(keys).size]).toEqual([c, d, keys.length]);
      }
    }
  });

  test('every muscle a category trains is in at least one session at every day count (F2)', () => {
    for (const c of CATEGORIES) {
      for (const d of DAY_COUNTS) {
        const listed = new Set(TEMPLATES[c][d].flatMap((s) => s.muscles));
        const missing = trainedMuscles(c).filter((m) => !listed.has(m));
        expect([c, d, missing]).toEqual([c, d, []]);
      }
    }
  });

  test('no muscle outside the next-day list sits in two neighbouring sessions (09 s1.3, F5)', () => {
    const clashes = [];
    for (const c of CATEGORIES) {
      for (const d of DAY_COUNTS) {
        const t = TEMPLATES[c][d];
        for (let i = 0; i < t.length; i += 1) {
          const next = t[(i + 1) % t.length];
          for (const m of t[i].muscles) {
            if (next.muscles.includes(m) && !FAST_MUSCLES.includes(m)) clashes.push(`${c} ${d}d ${t[i].key}->${next.key} ${m}`);
          }
        }
      }
    }
    expect(clashes).toEqual([]);
  });

  test('every session states what its name promises, from muscles it lists (sense order, D222)', () => {
    const bad = [];
    for (const c of CATEGORIES) {
      for (const d of DAY_COUNTS) {
        for (const s of TEMPLATES[c][d]) {
          if (!s.core || s.core.length === 0) bad.push(`${c} ${d}d ${s.key}: no core`);
          for (const g of s.core || []) if (!g.some((m) => s.muscles.includes(m))) bad.push(`${c} ${d}d ${s.key}: core ${g.join('/')} not listed`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  test("men's physique trains legs in exactly one session at every day count (F4)", () => {
    for (const d of DAY_COUNTS) {
      const legSessions = TEMPLATES.mens_physique[d].filter((s) => s.muscles.some((m) => ['quads', 'hamstrings'].includes(m)));
      expect([d, legSessions.length]).toEqual([d, 1]);
    }
  });

  test('R13: wellness 6d lists hamstrings in two sessions that do not neighbour', () => {
    const t = TEMPLATES.wellness[6];
    const idx = t.map((s, i) => (s.muscles.includes('hamstrings') ? i : -1)).filter((i) => i >= 0);
    expect(idx).toHaveLength(2);
    const [a, b] = idx;
    expect(Math.abs(a - b) === 1 || Math.abs(a - b) === t.length - 1).toBe(false);
  });

  test('R11: men\'s physique 3d lists side delts in Legs & Side Delts and Push, Legs before Push', () => {
    const t = TEMPLATES.mens_physique[3];
    const legs = t.findIndex((s) => s.key === 'legs_side');
    expect(t[(legs + 1) % t.length].key).toBe('push');
    expect(t[legs].muscles).toContain('side_delts');
  });

  test('R15: unknown and alias goals resolve to a rulebook category', () => {
    expect(rulebookCategory('mens_physique')).toBe('mens_physique');
    expect(rulebookCategory('womens_bodybuilding')).toBe('bodybuilding');
    expect(rulebookCategory('strength_size')).toBe('general');
    expect(rulebookCategory('weak_point')).toBe('general');
    expect(rulebookCategory('anything_else')).toBe('general');
  });
});
