/**
 * families.js -- D219: the candidate week structures the planner searches
 * for a number of sessions (design 4.5 step 1,
 * docs/audit/plan-builder-science-2026-10-04/00-AUDIT-AND-PLAN.md).
 *
 * No split beats another at equal weekly volume (Schoenfeld; Pelland 2026,
 * [A]), so a family is chosen by what fits: the per-session caps, the
 * spacing between a muscle's sessions (back-to-back days included), the
 * time the person has, and then how recognisable it is (03-SCIENCE.md Q6).
 * Each session lists the muscles it MAY train; which of them it does train,
 * and how hard, is the allocator's job. A focus muscle may also take an
 * extra session in any session of its own half of the body (design 4.5
 * step 5).
 *
 * The six physique divisions keep their hand-authored session lists
 * (planEngine DIVISION_MATRIX; division intent is senior, Campaign 16): for
 * them the only family is the matrix's.
 *
 * Pure data and pure functions: no I/O, no clock, no randomness.
 */

export const UPPER = Object.freeze(['chest', 'back', 'side_delts', 'rear_delts', 'front_delts', 'traps', 'biceps', 'triceps', 'forearms', 'neck']);
export const LOWER = Object.freeze(['quads', 'hamstrings', 'glutes', 'adductors', 'calves', 'abs', 'tibialis']);
const PUSH = Object.freeze(['chest', 'side_delts', 'front_delts', 'triceps', 'abs']);
const PULL = Object.freeze(['back', 'rear_delts', 'traps', 'biceps', 'forearms', 'abs', 'neck']);
const LEGS = LOWER;
const ARMS_SHOULDERS = Object.freeze(['biceps', 'triceps', 'side_delts', 'rear_delts', 'front_delts', 'forearms', 'abs']);
const FULL = Object.freeze([...UPPER, ...LOWER]);

/** The half of the body a muscle belongs to. */
export function bodyHalf(muscle) {
  return LOWER.includes(muscle) ? 'lower' : 'upper';
}

const s = (name, muscles) => Object.freeze({ name, muscles: Object.freeze([...muscles]) });

/**
 * Families by number of sessions, in authored order. `recognisable` ranks
 * how familiar the structure is (0 most): the last tie-breaker before the
 * authored order (design 4.5 step 4).
 */
const FAMILIES = Object.freeze({
  2: [
    { key: 'full_body_ab', label: 'Full body A and B', recognisable: 0,
      sessions: [s('Full Body A', FULL), s('Full Body B', FULL)] },
    { key: 'upper_lower', label: 'Upper and lower', recognisable: 0,
      sessions: [s('Upper', UPPER), s('Lower', LOWER)] },
  ],
  3: [
    { key: 'ppl', label: 'Push, pull, legs', recognisable: 0,
      sessions: [s('Push', PUSH), s('Pull', PULL), s('Legs', LEGS)] },
    { key: 'full_body_abc', label: 'Full body with rotating emphasis', recognisable: 0,
      sessions: [s('Full Body A', FULL), s('Full Body B', FULL), s('Full Body C', FULL)] },
    { key: 'upper_lower_full', label: 'Upper, lower, full body', recognisable: 1,
      sessions: [s('Upper', UPPER), s('Lower', LOWER), s('Full Body', FULL)] },
  ],
  4: [
    { key: 'upper_lower_x2', label: 'Upper and lower, twice', recognisable: 0,
      sessions: [s('Upper A', UPPER), s('Lower A', LOWER), s('Upper B', UPPER), s('Lower B', LOWER)] },
    { key: 'ppl_upper', label: 'Push, pull, legs, upper', recognisable: 1,
      sessions: [s('Push', PUSH), s('Pull', PULL), s('Legs', LEGS), s('Upper', UPPER)] },
    { key: 'ppl_arms', label: 'Push, pull, legs, arms and shoulders', recognisable: 1,
      sessions: [s('Push', PUSH), s('Pull', PULL), s('Legs', LEGS), s('Arms and Shoulders', ARMS_SHOULDERS)] },
  ],
  5: [
    { key: 'ppl_upper_lower', label: 'Push, pull, legs, upper, lower', recognisable: 0,
      sessions: [s('Push', PUSH), s('Pull', PULL), s('Legs', LEGS), s('Upper', UPPER), s('Lower', LOWER)] },
    { key: 'upper_lower_x2_full', label: 'Upper and lower twice, and a full-body session', recognisable: 1,
      sessions: [s('Upper A', UPPER), s('Lower A', LOWER), s('Upper B', UPPER), s('Lower B', LOWER), s('Full Body', FULL)] },
    { key: 'upper_lower_x2_focus', label: 'Upper and lower twice, and a focus session', recognisable: 2, needsFocus: true,
      sessions: [s('Upper A', UPPER), s('Lower A', LOWER), s('Upper B', UPPER), s('Lower B', LOWER), s('Focus', [])] },
    { key: 'body_part', label: 'A body-part week', recognisable: 1,
      sessions: [
        s('Chest and Triceps', ['chest', 'triceps', 'front_delts']),
        s('Back and Biceps', ['back', 'biceps', 'rear_delts', 'traps', 'forearms']),
        s('Quads and Calves', ['quads', 'calves', 'adductors', 'tibialis']),
        s('Shoulders and Abs', ['side_delts', 'front_delts', 'rear_delts', 'traps', 'abs', 'neck']),
        s('Hamstrings and Glutes', ['hamstrings', 'glutes', 'adductors', 'abs']),
      ] },
  ],
  6: [
    { key: 'ppl_x2', label: 'Push, pull, legs, twice', recognisable: 0,
      sessions: [s('Push A', PUSH), s('Pull A', PULL), s('Legs A', LEGS), s('Push B', PUSH), s('Pull B', PULL), s('Legs B', LEGS)] },
    { key: 'upper_lower_x3', label: 'Upper and lower, three times', recognisable: 1,
      sessions: [s('Upper A', UPPER), s('Lower A', LOWER), s('Upper B', UPPER), s('Lower B', LOWER), s('Upper C', UPPER), s('Lower C', LOWER)] },
  ],
});

/**
 * The candidate families for N sessions (2 to 6). A focus session's muscles
 * are the person's focus muscles; without a focus muscle that family is
 * left out. Every family is returned as a fresh, plain object.
 *
 * @param {number} sessionsPerWeek
 * @param {{ focusMuscles?: string[] }} [opts]
 */
export function familiesFor(sessionsPerWeek, { focusMuscles = [] } = {}) {
  const n = Math.max(2, Math.min(6, Math.round(sessionsPerWeek || 0)));
  const focus = Array.isArray(focusMuscles) ? focusMuscles.filter(Boolean) : [];
  return (FAMILIES[n] || [])
    .filter((f) => !f.needsFocus || focus.length > 0)
    .map((f) => ({
      key: f.key,
      label: f.label,
      recognisable: f.recognisable,
      sessions: f.sessions.map((sess) => ({
        name: sess.name,
        muscles: sess.name === 'Focus' && f.needsFocus
          ? [...focus, ...ARMS_SHOULDERS.filter((m) => !focus.includes(m))]
          : [...sess.muscles],
      })),
    }));
}

/**
 * A division's own family: its hand-authored session list for N sessions
 * (planEngine DIVISION_MATRIX[goal][N]), or null when the division has none.
 */
export function divisionFamily(divisionMatrix, goal, sessionsPerWeek) {
  const byDays = divisionMatrix?.[goal];
  const list = byDays?.[sessionsPerWeek];
  if (!Array.isArray(list) || list.length === 0) return null;
  return {
    key: `division_${goal}_${sessionsPerWeek}`,
    label: byDays.label || goal,
    recognisable: 0,
    division: true,
    sessions: list.map((sess) => ({ name: sess.name, muscles: [...sess.muscles] })),
  };
}

/**
 * Which sessions of a family may train a muscle: those that list it, and,
 * for a focus muscle, also every session of its half of the body (an extra
 * exposure for a muscle being brought up, design 4.5 step 5). Indexes in the
 * family's order.
 */
export function sessionsAllowing(family, muscle, { focus = false, atLeast = 0 } = {}) {
  const listed = [];
  const half = bodyHalf(muscle);
  const sameHalfSessions = [];
  family.sessions.forEach((sess, i) => {
    if (sess.muscles.includes(muscle)) { listed.push(i); return; }
    // Abs train on any day, so they never make a session part of a half:
    // a push day that lists abs is an upper-body session (no glute work on
    // it, no lateral raises on a leg day).
    // A session belongs to the half most of its listed muscles are in (a
    // lower day with a lateral-raise finisher is a lower day), so the
    // fallback never puts the triceps' second session on leg day.
    const counted = sess.muscles.filter((m) => m !== 'abs');
    const upper = counted.filter((m) => bodyHalf(m) === 'upper').length;
    const sessionHalf = upper * 2 >= counted.length ? 'upper' : 'lower';
    if (counted.length > 0 && sessionHalf === half) sameHalfSessions.push(i);
  });
  // Founder order 2026-10-10 (register D219 addendum, the standard floor): a
  // division's session list adds emphasis on top of the standard routine and
  // never takes a muscle's standard away. So a muscle the list names in fewer
  // sessions than its standard needs (`atLeast`, the planner's exposures for
  // its growth floor), or not at all, may also train in any session of its
  // half of the body; the listed sessions stay first in the order so the
  // division's own structure is kept where it already serves the muscle. A
  // focus muscle takes its half's sessions in every family (design 4.5 step
  // 5), a division's included.
  if (focus || listed.length < atLeast) {
    return [...listed, ...sameHalfSessions.filter((i) => !listed.includes(i))].sort((a, b) => a - b);
  }
  return listed;
}

/**
 * Choose k of the allowed sessions, spaced as evenly as the cycle allows
 * (gaps of floor(N/k) or ceil(N/k) slots, counting the wrap), offset by
 * `rotate` so muscles spread across sessions rather than piling onto the
 * first. Deterministic. Returns session indexes in cycle order.
 */
export function placeExposures(allowed, k, n, rotate = 0) {
  const list = [...allowed].sort((a, b) => a - b);
  if (k <= 0 || list.length === 0) return [];
  if (k >= list.length) return list;
  let best = null;
  // Every k-subset of the allowed sessions (n is at most 6): keep the one
  // with the largest smallest cyclic gap, then the smallest spread of gaps,
  // then the rotation offset, then the lowest indexes.
  const subsets = [];
  const pick = (start, chosen) => {
    if (chosen.length === k) { subsets.push([...chosen]); return; }
    for (let i = start; i < list.length; i++) { chosen.push(list[i]); pick(i + 1, chosen); chosen.pop(); }
  };
  pick(0, []);
  for (const sub of subsets) {
    const gaps = sub.map((v, i) => {
      const next = sub[(i + 1) % sub.length];
      return ((next - v + n) % n) || n;
    });
    const minGap = Math.min(...gaps);
    const spread = Math.max(...gaps) - minGap;
    const offset = (sub[0] - (rotate % n) + n) % n;
    const key = [-minGap, spread, offset, ...sub];
    if (!best || compareKeys(key, best.key) < 0) best = { key, sub };
  }
  return best.sub;
}

function compareKeys(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}
