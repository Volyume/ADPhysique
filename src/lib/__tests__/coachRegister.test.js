/**
 * coachRegister.test.js — C1 persona-adaptive register + C2 science layer
 * (founder decision #2; COACHING_VOICE_SYNTHESIS_LOCKED Addendum 2026-06-12).
 *
 * The invariants this layer must never break:
 *  - one engine: both registers render the SAME facts; the decision (part 3)
 *    is byte-identical in every register;
 *  - register-blind safety: every suppressed path returns the supportive
 *    rendering untouched, whatever the preference or experience;
 *  - structural parity: a precise part renders exactly where the supportive
 *    part renders (same nullness, same cold-start shrink);
 *  - ladder parity: the precise cue answers the same situation as the
 *    supportive cue for every rung of the priority ladder;
 *  - voice rules: every precise string passes the jargon blocklist, no em or
 *    en dashes;
 *  - science layer: plain term always leads, technical term never alone,
 *    science-OFF path unchanged, science-ON copy outside brackets still
 *    passes the full blocklist.
 */

import {
  resolveRegister,
  buildRegisteredCoachResponse,
  withScience,
  checkJargonScienceOn,
} from '../coachRegister';
import { buildCoachResponse } from '../coachResponse';
import { checkJargon } from '../whyThisTemplates';

function fakeOutput(overrides = {}) {
  return {
    hasEnoughData: true,
    weekLabel: 'Week 5 · Moderate cut',
    trend: { ewma7: 82.1, delta: -0.4, onTarget: true, deltaLabel: '-0.4kg this week', rateLabel: 'losing 0.4kg/wk' },
    whatWorking: [],
    adjustments: {
      training: { signal: 'hold', note: 'Plan unchanged.' },
      calories: null,
      steps: null,
      cardio: null,
    },
    whyThisWeek: 'Weight is tracking the target rate. No change needed this week.',
    heldDecisions: [{ type: 'calories', reason: 'Calories held. Trend is on target.' }],
    prsThisWeek: 0,
    sessionsCompleted: 4,
    sessionsPlanned: 4,
    goalPhase: 'mod_cut',
    ...overrides,
  };
}

function fakeCheckin(overrides = {}) {
  return {
    energyScore: 4,
    sorenessScore: 2,
    stressScore: 2,
    sleepHours: 7.5,
    calsAdherence: 'hit',
    jointPain: false,
    notes: null,
    ...overrides,
  };
}

const baseArgs = (overrides = {}) => ({
  output: fakeOutput(),
  checkin: fakeCheckin(),
  history: [],
  weighInsThisWeek: 7,
  units: 'kg',
  checkinDayName: 'Sunday',
  ...overrides,
});

const precise = (overrides = {}) =>
  buildRegisteredCoachResponse({ ...baseArgs(overrides), coachTone: 'precise' });
const supportive = (overrides = {}) =>
  buildRegisteredCoachResponse({ ...baseArgs(overrides), coachTone: 'supportive' });

const PARTS = ['acknowledgement', 'interpretation', 'decision', 'cue', 'forward'];

function allStrings(resp) {
  return PARTS.map((k) => resp[k]).filter((s) => typeof s === 'string');
}

// ─── Register selection ──────────────────────────────────────────────────────

describe('resolveRegister', () => {
  test('explicit preference always wins, both ways', () => {
    expect(resolveRegister({ coachTone: 'precise', experienceLevel: 'beginner' })).toBe('precise');
    expect(resolveRegister({ coachTone: 'supportive', experienceLevel: 'competitive' })).toBe('supportive');
  });
  test('automatic: advanced/competitive go precise; beginner/intermediate stay supportive', () => {
    expect(resolveRegister({ coachTone: 'automatic', experienceLevel: 'advanced' })).toBe('precise');
    expect(resolveRegister({ coachTone: 'automatic', experienceLevel: 'competitive' })).toBe('precise');
    expect(resolveRegister({ coachTone: 'automatic', experienceLevel: 'beginner' })).toBe('supportive');
    expect(resolveRegister({ coachTone: 'automatic', experienceLevel: 'intermediate' })).toBe('supportive');
  });
  test('self-identified level outranks training age (mixed signals stay beginner-safe)', () => {
    expect(resolveRegister({ coachTone: 'automatic', experienceLevel: 'beginner', trainingAgeYears: 12 })).toBe('supportive');
  });
  test('missing level: long training age goes precise, otherwise supportive', () => {
    expect(resolveRegister({ coachTone: 'automatic', trainingAgeYears: 6 })).toBe('precise');
    expect(resolveRegister({ coachTone: 'automatic', trainingAgeYears: 2 })).toBe('supportive');
  });
  test('missing or junk signals default supportive (beginner-safe)', () => {
    expect(resolveRegister({})).toBe('supportive');
    expect(resolveRegister()).toBe('supportive');
    expect(resolveRegister({ coachTone: 'banana', experienceLevel: 'wizard', trainingAgeYears: NaN })).toBe('supportive');
  });
});

// ─── One engine: supportive register IS buildCoachResponse ──────────────────

describe('supportive register passthrough', () => {
  test('supportive rendering is byte-identical to buildCoachResponse', () => {
    const base = buildCoachResponse(baseArgs());
    const reg = supportive();
    for (const k of PARTS) expect(reg[k]).toBe(base[k]);
    expect(reg.suppressed).toBe(base.suppressed);
    expect(reg.register).toBe('supportive');
  });
});

// ─── Register-blind safety (the carve-out) ───────────────────────────────────

describe('register-blind suppression', () => {
  test.each([
    ['edFlagOpen', { edFlagOpen: true }],
    ['calmMode', { calmMode: true }],
  ])('%s: precise preference renders the supportive base untouched', (_label, flag) => {
    const base = buildCoachResponse(baseArgs(flag));
    const reg = buildRegisteredCoachResponse({
      ...baseArgs(flag), coachTone: 'precise', experienceLevel: 'competitive',
    });
    for (const k of PARTS) expect(reg[k]).toBe(base[k]);
    expect(reg.suppressed).toBe(true);
    expect(reg.register).toBe('supportive');
  });

  test('a safety hold reason string is byte-identical in both registers', () => {
    const lockout = {
      heldDecisions: [{ type: 'ed_pattern_lockout', reason: 'All targets held this week. Your plan is paused while we keep things steady.' }],
    };
    // Even unsuppressed (belt-and-braces), part 3 carries locked copy verbatim.
    expect(precise({ output: fakeOutput(lockout) }).decision)
      .toBe(supportive({ output: fakeOutput(lockout) }).decision);
  });
});

// ─── Part 3 is register-blind always ─────────────────────────────────────────

describe('decision parity', () => {
  test('the calorie call is byte-identical in both registers', () => {
    const out = fakeOutput({
      adjustments: { training: null, calories: { change: -150, note: 'Trend has stalled for two weeks.' }, steps: null, cardio: null },
      heldDecisions: [],
    });
    expect(precise({ output: out }).decision).toBe(supportive({ output: out }).decision);
  });
});

// ─── Structural parity ───────────────────────────────────────────────────────

describe('structural parity across registers', () => {
  const matrices = [
    ['full data', baseArgs()],
    ['cold start', baseArgs({ output: fakeOutput({ hasEnoughData: false }) })],
    ['no checkin', baseArgs({ checkin: null })],
    ['no trend delta', baseArgs({ output: fakeOutput({ trend: { delta: null, onTarget: false } }), weighInsThisWeek: 2 })],
    ['nothing logged', baseArgs({ output: fakeOutput({ sessionsCompleted: 0, sessionsPlanned: 0 }), checkin: null, weighInsThisWeek: 0 })],
  ];

  test.each(matrices)('%s: precise parts render exactly where supportive parts render', (_label, args) => {
    const s = buildRegisteredCoachResponse({ ...args, coachTone: 'supportive' });
    const p = buildRegisteredCoachResponse({ ...args, coachTone: 'precise' });
    for (const k of PARTS) {
      expect(p[k] == null).toBe(s[k] == null);
    }
  });

  test('no output: both registers return the empty shape', () => {
    const p = precise({ output: null });
    for (const k of PARTS) expect(p[k]).toBeNull();
    expect(p.register).toBe('supportive');
  });

  test('cold start shrinks precise too: no interpretation, no decision', () => {
    const p = precise({ output: fakeOutput({ hasEnoughData: false }) });
    expect(p.interpretation).toBeNull();
    expect(p.decision).toBeNull();
    expect(p.acknowledgement).toBeTruthy();
    expect(p.cue).toBeTruthy();
    expect(p.forward).toBeTruthy();
  });
});

// ─── Cue ladder parity ───────────────────────────────────────────────────────

describe('cue ladder parity (both registers answer the same situation)', () => {
  // Each row drives the ladder to one rung; the keyword pair proves both
  // registers landed on the SAME rung, not merely both produced a cue.
  const rungs = [
    ['thin weigh-in data', baseArgs({ weighInsThisWeek: 2 }), /weight each day|morning weight daily/i, /morning weight daily/i],
    ['sleep', baseArgs({ checkin: fakeCheckin({ sleepHours: 5.5 }) }), /sleep/i, /sleep/i],
    ['missed sessions', baseArgs({ output: fakeOutput({ sessionsCompleted: 2, sessionsPlanned: 4 }) }), /sessions in/i, /sessions/i],
    ['joint pain', baseArgs({ checkin: fakeCheckin({ jointPain: true }) }), /joint/i, /joint/i],
    ['untracked calories', baseArgs({ checkin: fakeCheckin({ calsAdherence: 'untracked' }) }), /log your food/i, /food logs/i],
    ['under target', baseArgs({ checkin: fakeCheckin({ calsAdherence: 'under' }) }), /not under it/i, /not under it/i],
    ['over target', baseArgs({ checkin: fakeCheckin({ calsAdherence: 'over' }) }), /inside the calorie target|inside it/i, /inside it/i],
    ['default hold', baseArgs(), /keep the week the same/i, /hold the week steady/i],
  ];

  test.each(rungs)('%s', (_label, args, supportiveRe, preciseRe) => {
    const s = buildRegisteredCoachResponse({ ...args, coachTone: 'supportive' });
    const p = buildRegisteredCoachResponse({ ...args, coachTone: 'precise' });
    expect(s.cue).toMatch(supportiveRe);
    expect(p.cue).toMatch(preciseRe);
  });
});

// ─── Precise rendering shape ─────────────────────────────────────────────────

describe('precise rendering', () => {
  test('acknowledgement is figure-led', () => {
    expect(precise().acknowledgement).toBe('Sessions: 4 of 4. Weigh-ins: 7.');
    expect(precise({ output: fakeOutput({ prsThisWeek: 2 }) }).acknowledgement)
      .toBe('Sessions: 4 of 4. PRs: 2. Weigh-ins: 7.');
  });
  test('interpretation leads with the 7-day average', () => {
    expect(precise().interpretation).toMatch(/^7-day average: down 0\.4 kg on last week\./);
  });
  test('on-target streak counts in precise form', () => {
    const history = [{ trend: { onTarget: true } }, { trend: { onTarget: true } }];
    expect(precise({ history }).interpretation).toMatch(/Week 3 running on the set rate\./);
  });
  test('forward names the check-in day', () => {
    expect(precise().forward).toMatch(/^Next check-in: Sunday\./);
  });
  test('deterministic: same inputs, same strings', () => {
    expect(precise()).toEqual(precise());
  });
});

// ─── Voice rules on every precise string ─────────────────────────────────────

describe('voice rules in the precise register', () => {
  const situations = [
    baseArgs(),
    baseArgs({ output: fakeOutput({ prsThisWeek: 3, sessionsCompleted: 2, sessionsPlanned: 5 }) }),
    baseArgs({ output: fakeOutput({ hasEnoughData: false }) }),
    baseArgs({ checkin: fakeCheckin({ sleepHours: 5, calsAdherence: 'over', jointPain: true }) }),
    baseArgs({ output: fakeOutput({ trend: { delta: 0.3, onTarget: false } }) }),
    baseArgs({ output: fakeOutput({ sessionsCompleted: 0, sessionsPlanned: 0 }), checkin: null, weighInsThisWeek: 5 }),
    baseArgs({ output: fakeOutput({ adjustments: { training: null, calories: { change: 100, note: null }, steps: null, cardio: null }, heldDecisions: [] }) }),
  ];

  test('every string passes the jargon blocklist and carries no em or en dash', () => {
    for (const args of situations) {
      const p = buildRegisteredCoachResponse({ ...args, coachTone: 'precise' });
      for (const str of allStrings(p)) {
        expect(checkJargon(str).clean).toBe(true);
        expect(/[–—]/.test(str)).toBe(false);
      }
    }
  });
});

// ─── C2: the opt-in science layer ────────────────────────────────────────────

describe('withScience', () => {
  test('OFF (the default) returns the plain term untouched', () => {
    expect(withScience('weekly target range', 'MEV to MRV')).toBe('weekly target range');
    expect(withScience('weekly target range', 'MEV to MRV', false)).toBe('weekly target range');
  });
  test('ON brackets the technical term after the plain term', () => {
    expect(withScience('weekly target range', 'MEV to MRV', true)).toBe('weekly target range (MEV to MRV)');
  });
  test('the technical term never appears alone', () => {
    expect(withScience('', 'MEV', true)).toBe('');
    expect(withScience('weekly target range', '', true)).toBe('weekly target range');
    expect(withScience('weekly target range', null, true)).toBe('weekly target range');
  });
});

describe('checkJargonScienceOn (the parallel allowance path)', () => {
  test('science-ON copy with the technical term in brackets is allowed', () => {
    expect(checkJargonScienceOn('weekly target range (MEV to MRV)').clean).toBe(true);
    expect(checkJargonScienceOn('training block (we call this a mesocycle)').clean).toBe(true);
  });
  test('bare technical terms outside brackets still fail', () => {
    expect(checkJargonScienceOn('your MEV is 6 sets').clean).toBe(false);
    expect(checkJargonScienceOn('this mesocycle ends Friday').clean).toBe(false);
  });
  test('em and en dashes are banned everywhere, brackets included', () => {
    expect(checkJargonScienceOn('weekly target range (MEV – MRV)').clean).toBe(false);
    expect(checkJargonScienceOn('weekly range — the band').clean).toBe(false);
  });
  test('the science-OFF path is untouched: checkJargon still rejects bracketed jargon', () => {
    // The relaxation lives ONLY in the parallel path; the base blocklist
    // must keep failing the same string.
    expect(checkJargon('weekly target range (MEV to MRV)').clean).toBe(false);
  });
});
