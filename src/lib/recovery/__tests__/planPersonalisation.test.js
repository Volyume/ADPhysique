/**
 * planPersonalisation.test.js -- D219 lane R3 (design 4.13 and 4.6, S F14, the
 * lane brief item 3): what the planner may be told about THIS person at a build,
 * a rebuild and a block boundary, and never mid-block.
 *
 * Two pure functions, written to fail:
 *
 *  - plannerLearnedFactor: the learner's factor reaches the planner only
 *    through S F14's safeguards. The learner's own gate must have passed
 *    (reason 'adjusted'), the person must have 12 weeks or more of history and
 *    3 or more muscles must contribute, and the factor must have moved at least
 *    0.10 from the value the current plan was built on (otherwise the plan's
 *    structure is kept). If the gate fails at the next evaluation, or the
 *    factor is back within 0.05 of the start, the next build uses the start:
 *    nothing is carried silently. The answer is a factor (or null for "the
 *    start stands"), bounded 0.75 to 1.40.
 *  - ownGapsFromHistory: the median hours the person leaves after each slot of
 *    their rotation, once they have logged 8 or more sessions in the last 8
 *    weeks; a slot needs 3 logged gaps, otherwise their median gap between any
 *    two sessions stands for it (design 4.6).
 *
 * Both are pure: no I/O, no clock read (the caller hands over `nowMs`), no
 * randomness, and the answer does not depend on the order of the sessions.
 */
import fs from 'fs';
import path from 'path';
import { plannerLearnedFactor, ownGapsFromHistory } from '../planPersonalisation';
import { LEARNED_FACTOR, ROTATION } from '../../plan/science';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 5, 12);

const learned = (over = {}) => ({
  factor: 0.8,
  prior: 1.0,
  pairs: 24,
  reason: 'adjusted',
  pairsByMuscle: { chest: 8, back: 8, quads: 8 },
  ...over,
});
const ask = (over = {}) => plannerLearnedFactor({
  personal: learned(), historyDays: 100, builtOnFactor: null, ...over,
});

describe('plannerLearnedFactor: S F14\'s safeguards', () => {
  test('a learner that has passed its gate, with 12 weeks of history and 3 muscles, moved 0.10 or more: its factor reaches the plan', () => {
    expect(ask()).toEqual({ factor: 0.8, reason: 'learned' });
  });

  test('the learner\'s own gate has not passed (too few, no spread, not clear, fixed reps): the start stands', () => {
    for (const reason of ['too_few', 'no_spread', 'not_clear', 'fixed_reps']) {
      expect(ask({ personal: learned({ reason, factor: 1.0 }) })).toEqual({ factor: null, reason: 'not_adjusted' });
    }
    expect(ask({ personal: null })).toEqual({ factor: null, reason: 'not_adjusted' });
  });

  test('less than 12 weeks of history: the start stands, at 83 days and at 84', () => {
    expect(ask({ historyDays: 83 })).toEqual({ factor: null, reason: 'history' });
    expect(ask({ historyDays: 84 }).factor).toBe(0.8);
    expect(LEARNED_FACTOR.minHistoryWeeks * 7).toBe(84);
  });

  test('fewer than 3 muscles contribute: the start stands', () => {
    expect(ask({ personal: learned({ pairsByMuscle: { chest: 9, back: 9 } }) })).toEqual({ factor: null, reason: 'muscles' });
    expect(ask({ personal: learned({ pairsByMuscle: {} }) })).toEqual({ factor: null, reason: 'muscles' });
    expect(ask({ personal: learned({ pairsByMuscle: { a: 5, b: 5, c: 5, d: 5 } }) }).factor).toBe(0.8);
  });

  test('hysteresis: a factor that has moved less than 0.10 from what the plan was built on keeps that value (the structure is kept)', () => {
    // Built on the start (null): the reference is the start, 1.0; 0.95 is 0.05 away.
    expect(ask({ personal: learned({ factor: 0.95 }) })).toEqual({ factor: null, reason: 'unchanged' });
    // Built on 0.85: 0.90 is 0.05 away, so 0.85 stands.
    expect(ask({ personal: learned({ factor: 0.9 }), builtOnFactor: 0.85 })).toEqual({ factor: 0.85, reason: 'unchanged' });
    // Exactly 0.10 away acts (grid steps are floating point, so 1.1 - 1.0 must count).
    expect(ask({ personal: learned({ factor: 1.1 }) })).toEqual({ factor: 1.1, reason: 'learned' });
    expect(ask({ personal: learned({ factor: 0.9 }), builtOnFactor: 1.0 }).factor).toBe(0.9);
    expect(LEARNED_FACTOR.minMove).toBe(0.1);
  });

  test('a person whose answer was "poor" (start 1.15): the start is the reference, not 1.0', () => {
    expect(ask({ personal: learned({ prior: 1.15, factor: 1.2 }) })).toEqual({ factor: null, reason: 'unchanged' });
    expect(ask({ personal: learned({ prior: 1.15, factor: 1.3 }) }).factor).toBe(1.3);
  });

  test('revert: a factor back within 0.05 of the start uses the start, even when the plan was built on a learned one', () => {
    expect(ask({ personal: learned({ prior: 1.0, factor: 1.03 }), builtOnFactor: 0.75 })).toEqual({ factor: null, reason: 'reverted' });
    // Exactly 0.05 away is not within 0.05 (the learner's grid steps are 0.05): it is judged on the 0.10 rule instead.
    expect(ask({ personal: learned({ prior: 1.0, factor: 0.95 }), builtOnFactor: 0.75 }).reason).toBe('learned');
    // And when the gate fails at the next evaluation, the plan built on a learned factor goes back to the start.
    expect(ask({ personal: learned({ reason: 'not_clear', factor: 0.9, prior: 0.9 }), builtOnFactor: 0.75 })).toEqual({ factor: null, reason: 'not_adjusted' });
  });

  test('the factor is bounded 0.75 to 1.40', () => {
    expect(ask({ personal: learned({ factor: 0.6 }) }).factor).toBe(LEARNED_FACTOR.min);
    expect(ask({ personal: learned({ prior: 0.9, factor: 1.6 }) }).factor).toBe(LEARNED_FACTOR.max);
  });

  test('a missing or non-numeric history or factor never lets a factor through', () => {
    expect(ask({ historyDays: undefined }).factor).toBeNull();
    expect(ask({ historyDays: NaN }).factor).toBeNull();
    expect(ask({ personal: learned({ factor: NaN }) }).factor).toBeNull();
    expect(ask({ personal: learned({ prior: undefined }) }).factor).toBeNull();
  });
});

// A session `daysAgo` before NOW, at 18:00, in `slot` of the rotation.
const at = (daysAgo, slot, hour = 18) => ({ startedAt: NOW - daysAgo * DAY_MS + (hour - 12) * HOUR_MS, slot });

/** `weeks` weeks of a 4-session rotation: gaps 24, 48, 24, 72 hours after slots 0 to 3. */
function rotation(weeks, extra = {}) {
  const out = [];
  for (let w = weeks; w >= 1; w -= 1) {
    const monday = w * 7;
    out.push(at(monday, 0), at(monday - 1, 1), at(monday - 3, 2), at(monday - 4, 3));
  }
  return { sessions: out, sessionsPerWeek: 4, nowMs: NOW, ...extra };
}

describe('ownGapsFromHistory: the person\'s own rhythm (design 4.6)', () => {
  test('8 or more sessions in the last 8 weeks, 3 or more gaps in every slot: the median hours after each slot', () => {
    expect(ownGapsFromHistory(rotation(6))).toEqual([24, 48, 24, 72]);
  });

  test('fewer than 8 sessions in the last 8 weeks: not known (null)', () => {
    expect(ownGapsFromHistory({ ...rotation(1) })).toBeNull();
    const seven = rotation(2);
    seven.sessions = seven.sessions.slice(0, 7);
    expect(ownGapsFromHistory(seven)).toBeNull();
    expect(ownGapsFromHistory({ ...rotation(2) })).not.toBeNull();
    expect(ROTATION.ownGapsMinSessions).toBe(8);
  });

  test('sessions older than 8 weeks are not read', () => {
    const old = rotation(12).sessions.filter((s) => s.startedAt < NOW - 8 * 7 * DAY_MS);
    expect(ownGapsFromHistory({ sessions: old, sessionsPerWeek: 4, nowMs: NOW })).toBeNull();
    const mixed = [...old, ...rotation(4).sessions];
    expect(ownGapsFromHistory({ sessions: mixed, sessionsPerWeek: 4, nowMs: NOW })).toEqual([24, 48, 24, 72]);
  });

  test('a slot with fewer than 3 logged gaps takes the person\'s median gap between any two sessions', () => {
    // Two weeks of the rotation: each slot has 2 gaps. The median of all 7 gaps
    // (24, 48, 24, 72 twice, less the last) is the overall one.
    const out = ownGapsFromHistory(rotation(2));
    const all = [];
    const list = rotation(2).sessions.slice().sort((a, b) => a.startedAt - b.startedAt);
    for (let i = 0; i < list.length - 1; i += 1) all.push((list[i + 1].startedAt - list[i].startedAt) / HOUR_MS);
    const sorted = all.sort((a, b) => a - b);
    const median = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    expect(out).toEqual([median, median, median, median]);
  });

  test('a session with no slot (an ad hoc workout, another plan) counts toward the overall median only', () => {
    const base = rotation(6);
    const slotless = base.sessions.map((s) => ({ startedAt: s.startedAt, slot: null }));
    const out = ownGapsFromHistory({ ...base, sessions: slotless });
    expect(out).toHaveLength(4);
    expect(new Set(out).size).toBe(1);
  });

  test('the answer does not depend on the order of the sessions', () => {
    const base = rotation(6);
    const shuffled = base.sessions.slice().reverse();
    expect(ownGapsFromHistory({ ...base, sessions: shuffled })).toEqual(ownGapsFromHistory(base));
  });

  test('the answer has one entry per session of the rotation, each a positive number of hours', () => {
    for (const n of [2, 3, 5, 6]) {
      const out = ownGapsFromHistory({ ...rotation(6), sessionsPerWeek: n });
      expect(out).toHaveLength(n);
      for (const h of out) expect(h).toBeGreaterThan(0);
    }
  });

  test('a rotation of fewer than 2 sessions, or no clock, has no own gaps', () => {
    expect(ownGapsFromHistory({ ...rotation(6), sessionsPerWeek: 1 })).toBeNull();
    expect(ownGapsFromHistory({ ...rotation(6), nowMs: NaN })).toBeNull();
    expect(ownGapsFromHistory({ sessions: null, sessionsPerWeek: 4, nowMs: NOW })).toBeNull();
  });
});

describe('purity (source guard)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'planPersonalisation.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  test('no I/O, no clock read, no randomness, no store', () => {
    for (const needle of ['Date.now(', 'Math.random(', "from '../database'", "require('../database')", 'store/useAppStore', 'async-storage']) {
      expect(src).not.toContain(needle);
    }
    expect(src).toMatch(/export function/);
  });
});
