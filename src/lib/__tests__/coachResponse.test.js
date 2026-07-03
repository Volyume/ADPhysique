/**
 * coachResponse.test.js
 * The five-part coach response layer (deep audit Theme A: OPP-C01 +
 * OPP-C06 + OPP-C02) plus the free-tier weekly one-liner (founder
 * decision 4c). Pure presentation over the existing engine output:
 * every part, the cue priority order, ED/calm suppression states,
 * missing-data fallbacks, determinism, and the voice rules (jargon
 * blocklist, no em dashes, no motivational filler).
 */

import { buildCoachResponse, buildFreeCoachLine } from '../coachResponse';
import { checkJargon } from '../whyThisTemplates';

const DAY = 86400000;

function fakeOutput(overrides = {}) {
  return {
    hasEnoughData: true,
    weekLabel: 'Week 5 · Mild cut',
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
    goalPhase: 'mild_cut',
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

// Morning weights anchored to Date.now(), ending at startKg, moving at
// kgPerWeek. Anchoring to now keeps getEwmaSevenDaysAgo's lookback
// aligned with the data, same approach as the weeklyCoach tests.
function weights(kgPerWeek, count = 14, startKg = 80) {
  const out = [];
  const t0 = Date.now();
  for (let i = 0; i < count; i++) {
    const t = t0 - (count - 1 - i) * DAY;
    const w = startKg + kgPerWeek * ((i - (count - 1)) / 7);
    out.push({ loggedAt: t, weightKg: Math.round(w * 100) / 100 });
  }
  return out;
}

function build(overrides = {}) {
  return buildCoachResponse({
    output: fakeOutput(),
    checkin: fakeCheckin(),
    history: [],
    weighInsThisWeek: 7,
    units: 'kg',
    checkinDayName: 'Sunday',
    ...overrides,
  });
}

// ─── Part 1: acknowledgement ─────────────────────────────────────────────────

describe('part 1: specific data-referenced acknowledgement', () => {
  test('full sessions name the count', () => {
    const r = build({ weighInsThisWeek: 4 });
    expect(r.acknowledgement).toBe('All 4 sessions trained this week.');
  });

  test('full sessions plus PRs name both', () => {
    const r = build({ output: fakeOutput({ prsThisWeek: 2 }), weighInsThisWeek: 4 });
    expect(r.acknowledgement).toBe('All 4 sessions trained this week, with 2 new PRs.');
  });

  test('a single PR stays singular', () => {
    const r = build({ output: fakeOutput({ prsThisWeek: 1 }), weighInsThisWeek: 4 });
    expect(r.acknowledgement).toContain('with 1 new PR.');
  });

  test('a single planned session avoids "all 1 sessions"', () => {
    const r = build({
      output: fakeOutput({ sessionsCompleted: 1, sessionsPlanned: 1 }),
      weighInsThisWeek: 4,
    });
    expect(r.acknowledgement).toBe('Your planned session is in the log this week.');
  });

  test('partial sessions are mirrored without judgement', () => {
    const r = build({
      output: fakeOutput({ sessionsCompleted: 2, sessionsPlanned: 4 }),
      weighInsThisWeek: 4,
    });
    expect(r.acknowledgement).toBe('2 of 4 sessions trained this week.');
  });

  test('unplanned training still gets named', () => {
    const r = build({
      output: fakeOutput({ sessionsCompleted: 2, sessionsPlanned: 0 }),
      weighInsThisWeek: 4,
    });
    expect(r.acknowledgement).toBe('2 sessions trained this week.');
  });

  test('a strong logging week rides along (5+ weigh-ins)', () => {
    const r = build({ weighInsThisWeek: 6 });
    expect(r.acknowledgement).toBe('All 4 sessions trained this week. 6 weigh-ins logged too.');
  });

  test('weigh-in counts are never surfaced under an open ED flag', () => {
    const r = build({ weighInsThisWeek: 6, edFlagOpen: true });
    expect(r.acknowledgement).not.toMatch(/weigh-in/i);
  });

  test('weigh-in counts are never surfaced under calm mode', () => {
    const r = build({ weighInsThisWeek: 6, calmMode: true });
    expect(r.acknowledgement).not.toMatch(/weigh-in/i);
  });

  test('no training: weigh-ins carry the acknowledgement', () => {
    const r = build({
      output: fakeOutput({ sessionsCompleted: 0, sessionsPlanned: 3 }),
      weighInsThisWeek: 5,
    });
    expect(r.acknowledgement).toBe('5 weigh-ins logged this week. Enough to read the trend from.');
  });

  test('no training, thin weigh-ins: the answered check-in is named', () => {
    const r = build({
      output: fakeOutput({ sessionsCompleted: 0, sessionsPlanned: 3 }),
      weighInsThisWeek: 1,
      checkin: fakeCheckin({ energyScore: 3 }),
    });
    expect(r.acknowledgement).toBe('Check-in logged. Energy came in at 3 of 5.');
  });

  test('a fully quiet week is acknowledged calmly, never as a failure (T8)', () => {
    const r = build({
      output: fakeOutput({ sessionsCompleted: 0, sessionsPlanned: 3, prsThisWeek: 0 }),
      weighInsThisWeek: null,
      checkin: null,
    });
    expect(r.acknowledgement).toBe('A quieter week. Your plan is ready whenever you are.');
  });

  test('a quiet week under suppression stays silent, never fabricated (T8 suppresses like training encouragement)', () => {
    const r = build({
      output: fakeOutput({ sessionsCompleted: 0, sessionsPlanned: 3, prsThisWeek: 0 }),
      weighInsThisWeek: null,
      checkin: null,
      edFlagOpen: true,
    });
    expect(r.acknowledgement).toBeNull();
  });

  test('never generic praise', () => {
    const r = build();
    expect(r.acknowledgement).not.toMatch(/great|amazing|fantastic|well done|awesome/i);
  });
});

// ─── Part 2: trend interpretation ────────────────────────────────────────────

describe('part 2: plain-language trend interpretation', () => {
  test('down, on target, third week running', () => {
    const r = build({
      history: [{ trend: { onTarget: true } }, { trend: { onTarget: true } }],
    });
    expect(r.interpretation).toBe('Your 7-day average is down 0.4 kg on last week. That is the third week running at the right rate.');
  });

  test('streak counting stops at the first off-target week', () => {
    const r = build({
      history: [
        { trend: { onTarget: true } },
        { trend: { onTarget: false } },
        { trend: { onTarget: true } },
      ],
    });
    expect(r.interpretation).toContain('second week running');
  });

  test('first on-target week states the rate is the set one', () => {
    const r = build({ history: [] });
    expect(r.interpretation).toBe('Your 7-day average is down 0.4 kg on last week. That is the rate this phase is set for.');
  });

  test('long streaks fall back to the numeric form', () => {
    const r = build({
      history: Array.from({ length: 8 }, () => ({ trend: { onTarget: true } })),
    });
    expect(r.interpretation).toContain('That is 9 weeks running at the right rate.');
  });

  test('off target reads plainly, no verdict colour', () => {
    const r = build({
      output: fakeOutput({ trend: { ewma7: 82.1, delta: -0.9, onTarget: false } }),
    });
    expect(r.interpretation).toBe('Your 7-day average is down 0.9 kg on last week. That is off the set rate for this phase.');
  });

  test('rising trend reads up', () => {
    const r = build({
      output: fakeOutput({ trend: { ewma7: 82.1, delta: 0.2, onTarget: true } }),
    });
    expect(r.interpretation).toContain('up 0.2 kg on last week');
  });

  test('level trend reads level', () => {
    const r = build({
      output: fakeOutput({ trend: { ewma7: 82.1, delta: 0, onTarget: true } }),
    });
    expect(r.interpretation).toContain('level with last week');
  });

  test('lbs labelling follows the units flag', () => {
    const r = build({ units: 'lbs' });
    expect(r.interpretation).toContain('0.4 lbs');
  });

  test('no trend data: honest fallback, nothing fabricated', () => {
    const r = build({
      output: fakeOutput({ trend: { ewma7: null, delta: null, onTarget: false } }),
    });
    expect(r.interpretation).toBe('Not enough weigh-ins for a weekly trend read yet. The trend sharpens with daily logs.');
  });

  describe('suppression (open ED flag or calm mode): direction only, no rate', () => {
    test.each([
      ['edFlagOpen', { edFlagOpen: true }],
      ['calmMode', { calmMode: true }],
    ])('%s drops the rate for a falling trend', (_label, flags) => {
      const r = build(flags);
      expect(r.interpretation).toBe('Your weight trend has been drifting down.');
      expect(r.suppressed).toBe(true);
    });

    test('rising trend is direction-only', () => {
      const r = build({
        output: fakeOutput({ trend: { ewma7: 82.1, delta: 0.3, onTarget: false } }),
        edFlagOpen: true,
      });
      expect(r.interpretation).toBe('Your weight trend has been rising slightly.');
    });

    test('stable trend is direction-only', () => {
      const r = build({
        output: fakeOutput({ trend: { ewma7: 82.1, delta: 0, onTarget: true } }),
        edFlagOpen: true,
      });
      expect(r.interpretation).toBe('Your weight has stayed broadly stable over the past few weeks.');
    });

    test('no trend data under a flag: null, no logging push', () => {
      const r = build({
        output: fakeOutput({ trend: { ewma7: null, delta: null, onTarget: false } }),
        edFlagOpen: true,
      });
      expect(r.interpretation).toBeNull();
    });
  });
});

// ─── Part 3: the decision plus the reason ────────────────────────────────────

describe('part 3: decision and reason (reuses existing decision data)', () => {
  test('a calorie change states the call and the engine reason', () => {
    const r = build({
      output: fakeOutput({
        adjustments: {
          training: { signal: 'hold', note: '' },
          calories: { change: 125, note: 'Weight is dropping faster than the target rate. Slowing it down protects muscle.' },
          steps: null,
          cardio: null,
        },
        heldDecisions: [],
      }),
    });
    expect(r.decision).toBe('The call this week: calorie target up 125 kcal. Weight is dropping faster than the target rate. Slowing it down protects muscle.');
  });

  test('a downward change reads down', () => {
    const r = build({
      output: fakeOutput({
        adjustments: {
          training: { signal: 'hold', note: '' },
          calories: { change: -150, note: 'Weight is coming down slower than the target rate.' },
          steps: null,
          cardio: null,
        },
        heldDecisions: [],
      }),
    });
    expect(r.decision).toContain('calorie target down 150 kcal');
  });

  test('a held calorie decision is reused verbatim', () => {
    const r = build();
    expect(r.decision).toBe('Calories held. Trend is on target.');
  });

  test('the FFM floor hold reason is reused verbatim', () => {
    const reason = 'Calorie target held. Your seven-day average intake of 1600 kcal is at or below your safety floor of 1700 kcal. Eating below this level for long stretches breaks down muscle and stalls recovery.';
    const r = build({
      output: fakeOutput({ heldDecisions: [{ type: 'ffm_floor', reason }] }),
    });
    expect(r.decision).toBe(reason);
  });

  test('an ED-pattern lockout outranks everything else', () => {
    const lockoutReason = 'Calorie cut held. Multiple safety signals are active. See the held-decision card for details.';
    const r = build({
      output: fakeOutput({
        adjustments: {
          training: { signal: 'hold', note: '' },
          calories: { change: 150, note: 'x' },
          steps: null,
          cardio: null,
        },
        heldDecisions: [{ type: 'ed_pattern_lockout', reason: lockoutReason }],
      }),
      edFlagOpen: true,
    });
    expect(r.decision).toBe(lockoutReason);
  });

  test('falls back to whyThisWeek when there is no calorie context', () => {
    const r = build({
      output: fakeOutput({ heldDecisions: [] }),
    });
    expect(r.decision).toBe('Weight is tracking the target rate. No change needed this week.');
  });
});

// ─── Part 4: one tactical cue, deterministic priority order ─────────────────

describe('part 4: one cue for the week ahead', () => {
  const everythingWrong = {
    output: fakeOutput({ sessionsCompleted: 1, sessionsPlanned: 4, trend: { ewma7: null, delta: null, onTarget: false } }),
    checkin: fakeCheckin({ sleepHours: 5, jointPain: true, calsAdherence: 'untracked' }),
    weighInsThisWeek: 1,
  };

  test('priority 1: thin weigh-in data beats everything', () => {
    const r = build(everythingWrong);
    expect(r.cue).toBe('Log your morning weight each day this week. Every log sharpens the read.');
  });

  test('priority 2: sleep, once the data is solid', () => {
    const r = build({
      ...everythingWrong,
      output: fakeOutput({ sessionsCompleted: 1, sessionsPlanned: 4 }),
      weighInsThisWeek: 7,
    });
    expect(r.cue).toBe('Sleep is the lever this week. Aim for 7 hours or more a night.');
  });

  test('priority 3: missed sessions, once sleep is fine', () => {
    const r = build({
      output: fakeOutput({ sessionsCompleted: 2, sessionsPlanned: 4 }),
      checkin: fakeCheckin({ jointPain: true, calsAdherence: 'untracked' }),
      weighInsThisWeek: 7,
    });
    expect(r.cue).toBe('Get all 4 sessions in this week. Consistency moves the plan more than any single change.');
  });

  test('priority 4: joint pain, once sessions are in', () => {
    const r = build({
      checkin: fakeCheckin({ jointPain: true, calsAdherence: 'untracked' }),
      weighInsThisWeek: 7,
    });
    expect(r.cue).toBe('Keep load off the sore joint this week. Swap any movement that aggravates it for a pain-free option.');
  });

  test('priority 5: untracked calories', () => {
    const r = build({
      checkin: fakeCheckin({ calsAdherence: 'untracked' }),
      weighInsThisWeek: 7,
    });
    expect(r.cue).toBe('Log your food this week. The calorie target can only be tuned against real intake.');
  });

  test('priority 6: under-target eating gets the eat-to-target cue', () => {
    const r = build({
      checkin: fakeCheckin({ calsAdherence: 'under' }),
      weighInsThisWeek: 7,
    });
    expect(r.cue).toBe('Eat to the target this week, not under it. The plan is built on the target being hit.');
  });

  test('priority 6: over-target eating gets the stay-inside cue', () => {
    const r = build({
      checkin: fakeCheckin({ calsAdherence: 'over' }),
      weighInsThisWeek: 7,
    });
    expect(r.cue).toBe('Stay inside the calorie target this week. One steady week tells the plan more than a mixed one.');
  });

  test('default: the consistency line', () => {
    const r = build({ weighInsThisWeek: 7 });
    expect(r.cue).toBe('Keep the week the same: log, train, eat to the target, weigh in.');
  });

  describe('suppression states', () => {
    test('no weigh-in ask under a flag: falls through to sleep', () => {
      const r = build({ ...everythingWrong, edFlagOpen: true });
      expect(r.cue).toBe('Sleep is the lever this week. Aim for 7 hours or more a night.');
    });

    test('no food-tracking push under a flag: falls to the safety default', () => {
      const r = build({
        checkin: fakeCheckin({ calsAdherence: 'untracked' }),
        weighInsThisWeek: 7,
        edFlagOpen: true,
      });
      expect(r.cue).toBe('Your work this week: keep logging, keep training, eat to the target, weigh in as normal.');
    });

    test('no restraint push under a flag: over-target falls to the safety default', () => {
      const r = build({
        checkin: fakeCheckin({ calsAdherence: 'over' }),
        weighInsThisWeek: 7,
        calmMode: true,
      });
      expect(r.cue).toBe('Your work this week: keep logging, keep training, eat to the target, weigh in as normal.');
    });

    test('the under-eating cue survives a flag (matches the safety copy)', () => {
      const r = build({
        checkin: fakeCheckin({ calsAdherence: 'under' }),
        weighInsThisWeek: 7,
        edFlagOpen: true,
      });
      expect(r.cue).toBe('Eat to the target this week, not under it. The plan is built on the target being hit.');
    });
  });
});

// ─── Part 5: forward pull ────────────────────────────────────────────────────

describe('part 5: forward pull', () => {
  test('anchors the named check-in day', () => {
    const r = build({ weighInsThisWeek: 7 });
    expect(r.forward).toBe('See you Sunday. The next weekly read takes it from there.');
  });

  test('falls back when no day is known', () => {
    const r = build({ weighInsThisWeek: 7, checkinDayName: null });
    expect(r.forward).toMatch(/^See you at the next check-in\./);
  });

  test('a calorie change anchors the next read to the target', () => {
    const r = build({
      output: fakeOutput({
        adjustments: {
          training: { signal: 'hold', note: '' },
          calories: { change: -150, note: 'x' },
          steps: null,
          cardio: null,
        },
        heldDecisions: [],
      }),
      weighInsThisWeek: 7,
    });
    expect(r.forward).toBe('See you Sunday. The next read checks the trend against the target again.');
  });

  test('missed sessions anchor a conditional, honest pull', () => {
    const r = build({
      output: fakeOutput({ sessionsCompleted: 2, sessionsPlanned: 4 }),
      weighInsThisWeek: 7,
    });
    expect(r.forward).toBe('See you Sunday. Get the sessions in and the next read will show it.');
  });

  test('thin data anchors the weigh-in habit', () => {
    const r = build({ weighInsThisWeek: 2 });
    expect(r.forward).toBe('See you Sunday. Daily weigh-ins between now and then sharpen the read.');
  });

  test('suppressed: a neutral, true anchor with no weight ask', () => {
    const r = build({ weighInsThisWeek: 2, edFlagOpen: true });
    expect(r.forward).toBe('See you Sunday. The plan is reviewed again at the next weekly run.');
  });
});

// ─── Missing data and cold start ─────────────────────────────────────────────

describe('missing-data fallbacks', () => {
  test('null output: every part null, nothing fabricated', () => {
    const r = buildCoachResponse({ output: null });
    expect(r).toEqual({
      acknowledgement: null,
      interpretation: null,
      decision: null,
      cue: null,
      forward: null,
      preCommitment: null,
      commitmentAnswer: null,
      suppressed: false,
    });
  });

  test('cold start (hasEnoughData false): fewer parts, no trend, no decision', () => {
    const r = build({
      output: fakeOutput({
        hasEnoughData: false,
        sessionsCompleted: 2,
        sessionsPlanned: 3,
        trend: { ewma7: null, delta: null, onTarget: false, deltaLabel: 'Log morning weight', rateLabel: null },
        heldDecisions: [],
      }),
      weighInsThisWeek: 2,
    });
    expect(r.interpretation).toBeNull();
    expect(r.decision).toBeNull();
    expect(r.acknowledgement).toBe('2 of 3 sessions trained this week.');
    expect(r.cue).toBe('Log your morning weight each day this week. Every log sharpens the read.');
    expect(r.forward).toBeTruthy();
  });

  test('no checkin at all still renders trend, decision and cue', () => {
    const r = build({ checkin: null, weighInsThisWeek: 7 });
    expect(r.interpretation).toBeTruthy();
    expect(r.decision).toBeTruthy();
    expect(r.cue).toBeTruthy();
  });
});

// ─── Free-tier weekly one-liner (decision 4c) ────────────────────────────────

describe('buildFreeCoachLine', () => {
  test('weight direction plus sessions, no rate, no figure, no unit', () => {
    const line = buildFreeCoachLine({ sessionsThisWeek: 3, morningWeights: weights(-0.5) });
    expect(line).toBe('Weight trend is down this week. 3 sessions trained.');
    expect(line).not.toMatch(/\d+(\.\d+)?\s?(kg|lbs|st)/i);
  });

  test('rising trend reads up', () => {
    const line = buildFreeCoachLine({ sessionsThisWeek: 1, morningWeights: weights(0.5) });
    expect(line).toBe('Weight trend is up this week. 1 session trained.');
  });

  test('flat trend reads steady', () => {
    const line = buildFreeCoachLine({ sessionsThisWeek: 2, morningWeights: weights(0) });
    expect(line).toBe('Weight trend is steady this week. 2 sessions trained.');
  });

  test('weight only when no sessions trained', () => {
    const line = buildFreeCoachLine({ sessionsThisWeek: 0, morningWeights: weights(-0.5) });
    expect(line).toBe('Weight trend is down this week.');
  });

  test('training-only line when weight data is too thin', () => {
    const line = buildFreeCoachLine({ sessionsThisWeek: 3, morningWeights: weights(-0.5, 3) });
    expect(line).toBe('3 sessions trained this week.');
  });

  test('nothing logged: null, no card', () => {
    expect(buildFreeCoachLine({ sessionsThisWeek: 0, morningWeights: [] })).toBeNull();
  });

  test('open ED flag: training-only, weight never mentioned', () => {
    const line = buildFreeCoachLine({ sessionsThisWeek: 2, morningWeights: weights(-0.8), edFlagOpen: true });
    expect(line).toBe('2 sessions trained this week.');
  });

  test('calm mode: training-only, weight never mentioned', () => {
    const line = buildFreeCoachLine({ sessionsThisWeek: 2, morningWeights: weights(-0.8), calmMode: true });
    expect(line).toBe('2 sessions trained this week.');
  });

  test('open ED flag with no training: null rather than a weight line', () => {
    expect(buildFreeCoachLine({ sessionsThisWeek: 0, morningWeights: weights(-0.8), edFlagOpen: true })).toBeNull();
  });

  test('malformed inputs never throw', () => {
    expect(buildFreeCoachLine({})).toBeNull();
    expect(buildFreeCoachLine({ sessionsThisWeek: NaN, morningWeights: null })).toBeNull();
  });
});

// ─── Voice rules across the whole surface ────────────────────────────────────

describe('voice rules', () => {
  // A matrix of response variants wide enough to exercise every copy
  // branch: each string must pass the jargon blocklist, contain no em
  // or en dashes, and carry no motivational filler.
  const variants = [
    build(),
    build({ output: fakeOutput({ prsThisWeek: 3, sessionsCompleted: 5, sessionsPlanned: 5 }), weighInsThisWeek: 7 }),
    build({ output: fakeOutput({ sessionsCompleted: 0, sessionsPlanned: 4 }), weighInsThisWeek: 5 }),
    build({ output: fakeOutput({ trend: { ewma7: 80, delta: 0.3, onTarget: false } }), weighInsThisWeek: 7 }),
    build({ output: fakeOutput({ trend: { ewma7: null, delta: null, onTarget: false } }), weighInsThisWeek: 1, checkin: null }),
    build({ edFlagOpen: true }),
    build({ calmMode: true, weighInsThisWeek: 2 }),
    build({
      output: fakeOutput({
        adjustments: { training: { signal: 'hold', note: '' }, calories: { change: 125, note: 'Weight is dropping faster than the target rate.' }, steps: null, cardio: null },
        heldDecisions: [],
      }),
    }),
    build({ output: fakeOutput({ hasEnoughData: false, heldDecisions: [] }), weighInsThisWeek: 1 }),
    build({ checkin: fakeCheckin({ sleepHours: 5 }) }),
    build({ checkin: fakeCheckin({ jointPain: true }) }),
    build({ checkin: fakeCheckin({ calsAdherence: 'untracked' }) }),
    build({ checkin: fakeCheckin({ calsAdherence: 'under' }), edFlagOpen: true }),
    build({ history: [{ trend: { onTarget: true } }, { trend: { onTarget: true } }, { trend: { onTarget: true } }] }),
  ];
  const freeLines = [
    buildFreeCoachLine({ sessionsThisWeek: 3, morningWeights: weights(-0.5) }),
    buildFreeCoachLine({ sessionsThisWeek: 1, morningWeights: weights(0.4) }),
    buildFreeCoachLine({ sessionsThisWeek: 4, morningWeights: [] }),
    buildFreeCoachLine({ sessionsThisWeek: 2, morningWeights: weights(-0.8), edFlagOpen: true }),
  ];

  const allStrings = [
    ...variants.flatMap(r => [r.acknowledgement, r.interpretation, r.decision, r.cue, r.forward]),
    ...freeLines,
  ].filter(Boolean);

  test('there are strings to check', () => {
    expect(allStrings.length).toBeGreaterThan(30);
  });

  test('every line passes the jargon blocklist', () => {
    for (const s of allStrings) {
      const { clean: ok, violations } = checkJargon(s);
      expect({ s, ok, violations }).toEqual({ s, ok: true, violations: [] });
    }
  });

  test('no em dashes or en dashes anywhere', () => {
    for (const s of allStrings) {
      expect(s).not.toMatch(/[–—]/);
    }
  });

  test('no motivational filler without a data referent', () => {
    for (const s of allStrings) {
      expect(s).not.toMatch(/great job|amazing|fantastic|crush|beast|smash|you('|')ve got this|keep it up|well done/i);
    }
  });

  test('no false collaboration or fake autonomy', () => {
    for (const s of allStrings) {
      expect(s).not.toMatch(/we('|')ll work|let('|')s decide|your call|it('|')s up to you|you could consider/i);
    }
  });

  test('American spellings stay out', () => {
    for (const s of allStrings) {
      expect(s).not.toMatch(/\b(optimize|analyze|behavior|color|center|license\b)/i);
    }
  });
});

// ─── Determinism ─────────────────────────────────────────────────────────────

describe('determinism', () => {
  test('identical inputs always produce identical output', () => {
    const args = {
      output: fakeOutput({ prsThisWeek: 1, sessionsCompleted: 3, sessionsPlanned: 4 }),
      checkin: fakeCheckin({ sleepHours: 6 }),
      history: [{ trend: { onTarget: true } }],
      weighInsThisWeek: 5,
      units: 'kg',
      checkinDayName: 'Monday',
    };
    expect(JSON.stringify(buildCoachResponse(args))).toBe(JSON.stringify(buildCoachResponse(args)));
  });

  test('the free line is deterministic too', () => {
    const args = { sessionsThisWeek: 2, morningWeights: weights(-0.5) };
    expect(buildFreeCoachLine(args)).toBe(buildFreeCoachLine(args));
  });
});

// ─── S1c: pre-commitment + its next-week answer ──────────────────────────────

describe('S1c pre-commitment line', () => {
  const calOut = (change) => fakeOutput({ adjustments: { calories: { change }, training: { signal: 'hold' } } });

  test('names this week calorie cut and the check-in day', () => {
    expect(buildCoachResponse({ output: calOut(-150), checkinDayName: 'Sunday' }).preCommitment)
      .toBe('Next Sunday, the read checks whether the trend responds to this 150 kcal cut.');
  });

  test('reads "increase" for a calorie rise, and drops the day when unknown', () => {
    expect(buildCoachResponse({ output: calOut(120), checkinDayName: null }).preCommitment)
      .toBe('The next read checks whether the trend responds to this 120 kcal increase.');
  });

  test('null when there is no calorie change', () => {
    expect(buildCoachResponse({ output: fakeOutput(), checkinDayName: 'Sunday' }).preCommitment).toBeNull();
  });

  test('drops the figure when the cut was floor-clamped (never overstates the real cut)', () => {
    const output = fakeOutput({ adjustments: { calories: { change: -150, clampedToFloor: true }, training: { signal: 'hold' } } });
    expect(buildCoachResponse({ output, checkinDayName: 'Sunday' }).preCommitment)
      .toBe("Next Sunday, the read checks whether the trend responds to this week's calorie change.");
  });

  test('suppressed under an ED flag or calm mode', () => {
    expect(buildCoachResponse({ output: calOut(-150), checkinDayName: 'Sunday', edFlagOpen: true }).preCommitment).toBeNull();
    expect(buildCoachResponse({ output: calOut(-150), checkinDayName: 'Sunday', calmMode: true }).preCommitment).toBeNull();
  });
});

describe('S1c commitment answer', () => {
  const WEEK = 7 * DAY;
  const NOW = 3 * WEEK;
  const priorApplied = (change, gapWeeks = 1) => ([
    { weekStart: NOW - gapWeeks * WEEK, adjustments: { calories: { change, applied: true } }, trend: { onTarget: false } },
  ]);

  test('applied cut that landed on target reads as responded', () => {
    const r = buildCoachResponse({
      output: fakeOutput({ trend: { delta: -0.4, onTarget: true } }),
      weekStartMs: NOW,
      history: priorApplied(-150),
    });
    expect(r.commitmentAnswer)
      .toBe("Last week's 150 kcal cut was the call to watch. The trend has responded, it is back on the set rate.");
  });

  test('applied cut that is still off target reads as no response yet', () => {
    const r = buildCoachResponse({
      output: fakeOutput({ trend: { delta: -0.1, onTarget: false } }),
      weekStartMs: NOW,
      history: priorApplied(-150),
    });
    expect(r.commitmentAnswer)
      .toBe("Last week's 150 kcal cut was the call to watch. The trend has not responded yet, it is still off the set rate.");
  });

  test('null when last week call was never applied', () => {
    const r = buildCoachResponse({
      output: fakeOutput({ trend: { onTarget: true } }),
      weekStartMs: NOW,
      history: [{ weekStart: NOW - WEEK, adjustments: { calories: { change: -150, applied: false } }, trend: {} }],
    });
    expect(r.commitmentAnswer).toBeNull();
  });

  test('null across a gap in history (a missed week is never called "last week")', () => {
    const r = buildCoachResponse({
      output: fakeOutput({ trend: { onTarget: true } }),
      weekStartMs: NOW,
      history: priorApplied(-150, 2), // prior stored week is two weeks back
    });
    expect(r.commitmentAnswer).toBeNull();
  });

  test('null without a weekStartMs (fails safe, never mislabels the gap)', () => {
    const r = buildCoachResponse({
      output: fakeOutput({ trend: { onTarget: true } }),
      history: priorApplied(-150),
    });
    expect(r.commitmentAnswer).toBeNull();
  });

  test('suppressed under an ED flag or calm mode', () => {
    const args = { output: fakeOutput({ trend: { onTarget: true } }), weekStartMs: NOW, history: priorApplied(-150) };
    expect(buildCoachResponse({ ...args, edFlagOpen: true }).commitmentAnswer).toBeNull();
    expect(buildCoachResponse({ ...args, calmMode: true }).commitmentAnswer).toBeNull();
  });

  test('drops the figure when last week cut was floor-clamped', () => {
    const r = buildCoachResponse({
      output: fakeOutput({ trend: { onTarget: true } }),
      weekStartMs: NOW,
      history: [{ weekStart: NOW - WEEK, adjustments: { calories: { change: -150, applied: true, clampedToFloor: true } }, trend: { onTarget: false } }],
    });
    expect(r.commitmentAnswer)
      .toBe("Last week's calorie change was the call to watch. The trend has responded, it is back on the set rate.");
  });

  test('null when last week applied training but not calories (a proposed-not-applied cut is not answered)', () => {
    const r = buildCoachResponse({
      output: fakeOutput({ trend: { onTarget: true } }),
      weekStartMs: NOW,
      history: [{ weekStart: NOW - WEEK, adjustments: { training: { signal: 'push', applied: true }, calories: { change: -150 } }, trend: {} }],
    });
    expect(r.commitmentAnswer).toBeNull();
  });

  test('answers the calorie call when last week applied both calories and training', () => {
    const r = buildCoachResponse({
      output: fakeOutput({ trend: { onTarget: true } }),
      weekStartMs: NOW,
      history: [{ weekStart: NOW - WEEK, adjustments: { calories: { change: -150, applied: true }, training: { signal: 'push', applied: true } }, trend: { onTarget: false } }],
    });
    expect(r.commitmentAnswer)
      .toBe("Last week's 150 kcal cut was the call to watch. The trend has responded, it is back on the set rate.");
  });
});
