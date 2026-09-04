/**
 * campaign16.planFit.test.js — intelligent training availability and the
 * onboarding plan-fit guidance.
 *
 * FOUNDER LAW (2026-08-13), the four clauses this suite exists to pin:
 *
 *   1. "The recommendation must be derived from the actual Volyume
 *      prescription." No lookup table, no "4 days = 45-55 minutes", no
 *      universal minutes-per-session optimum, because there is no
 *      scientific basis for one. Two athletes choosing four sessions can
 *      legitimately get different answers.
 *   2. "Current Pro onboarding defaults daysPerWeek to 4 and does not
 *      require an explicit selection. That is no longer acceptable."
 *   3. Alternatives are CALCULATED - generated and checked - never assumed,
 *      and Volyume never adds a training day on the athlete's behalf.
 *   4. Plain English by default. The engine may be technical; what the
 *      athlete reads may not be.
 *
 * It also pins the anti-dead-helper rule: the resolver has to be the one
 * BOTH surfaces call, and it has to be reachable from production code.
 */

const fs = require('fs');
const path = require('path');
const { generatePlan } = require('../planEngine');
const {
  PLAN_FIT, classifyFit, isWorkable, assessPlanFit, assessDurationOptions,
  durationLabel, fitCopy, alternativeCopy, keepChoiceCopy,
} = require('../planFit');
const { LIBRARY, inputs } = require('./campaign16.helpers');

const src = f => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');
const generate = i => generatePlan({ ...i, exerciseLibrary: LIBRARY });
const fitAt = over => assessPlanFit({ inputs: inputs(over), generate });

const DURATIONS = [45, 60, 75, 90];
const DAYS = [2, 3, 4, 5, 6];

/** Every user-facing string this module can produce, across every state. */
function allCopyStrings() {
  const out = [];
  for (const state of Object.values(PLAN_FIT)) {
    for (const alternatives of [[], [{ kind: 'longer_sessions', daysPerWeek: 4, sessionLengthMinutes: 75 }]]) {
      const c = fitCopy(state, {
        daysPerWeek: 4, sessionLengthMinutes: 60, typicalSessionMinutes: 64, alternatives,
      });
      out.push(c.title, c.body);
    }
    const k = keepChoiceCopy({
      daysPerWeek: 4, sessionLengthMinutes: 60, state, longestSessionMinutes: 73,
    });
    out.push(k.label, k.detail);
    const l = durationLabel(state);
    if (l) out.push(l);
  }
  for (const kind of ['longer_sessions', 'more_sessions']) {
    const a = alternativeCopy({ kind, daysPerWeek: 5, sessionLengthMinutes: 75 });
    out.push(a.label, a.detail);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 1. Derived from the real prescription, not a table
// ---------------------------------------------------------------------------

describe('C16-FIT the answer comes from the athlete\'s own plan', () => {
  test('two athletes at the same schedule can get different answers', () => {
    // The law's own example. If a table were hiding anywhere in this path,
    // these would all agree, because they all ask for four 60-minute
    // sessions. They differ because their PLANS differ.
    const at4x60 = over => fitAt({ daysPerWeek: 4, sessionLengthMinutes: 60, ...over });
    const base = at4x60({});
    const bikini = at4x60({ goal: 'bikini' });
    const poor = at4x60({ recoveryRating: 'poor' });

    expect(base.state).toBe(PLAN_FIT.INSUFFICIENT_FOR_VALID_PLAN);
    // A division whose prescription is shorter genuinely fits the same hour.
    expect(bikini.state).toBe(PLAN_FIT.FULL_TARGET_FIT);
    // And a harder-to-recover athlete needs more room than the base case.
    expect(poor.longestSessionMinutes).toBeGreaterThan(base.longestSessionMinutes);
  });

  test('the recommended length tracks the prescription, not the day count', () => {
    // Same four days, three different profiles, three different smallest
    // lengths that work. A minutes-per-day rule of thumb cannot do this.
    const smallestWorking = over => assessDurationOptions({
      inputs: inputs({ daysPerWeek: 4, sessionLengthMinutes: 60, ...over }),
      generate,
    }).find(d => d.state === PLAN_FIT.FULL_TARGET_FIT || d.state === PLAN_FIT.EXTRA_HEADROOM)?.minutes;

    expect(smallestWorking({})).toBe(75);
    expect(smallestWorking({ experience: 'competitive' })).toBe(90);
    expect(smallestWorking({ goal: 'bikini' })).toBe(60);
  });

  test('no lookup table, no minutes-per-day rule, no claim of an optimum', () => {
    // Comments stripped: the module header explains at length that no
    // universal optimum EXISTS, and a guard that cannot tell a denial from a
    // claim would forbid saying so.
    const s = src('lib/planFit.js')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    // A days -> minutes (or minutes -> days) map is exactly the shape the
    // law forbids. Nothing in this module may associate a day count with a
    // duration outside the option lists the UI passes in.
    expect(s).not.toMatch(/\b[2-6]\s*:\s*(30|45|60|75|90|105|120)\b/);
    expect(s).not.toMatch(/optimal|optimum|ideal session|perfect length/i);
  });

  test('the classification reads the engine\'s own result, it does not re-derive it', () => {
    // Fed a plan the engine has already judged unfittable, the classifier
    // must agree with it even though the session durations look fine.
    const stubbed = {
      timeConstraint: { status: 'user_decision_required' },
      workouts: [{ estimatedDurationMinutes: 30 }],
    };
    expect(classifyFit(stubbed, 60)).toBe(PLAN_FIT.INSUFFICIENT_FOR_VALID_PLAN);
    expect(classifyFit({ timeConstraint: { status: 'constrained_but_valid' }, workouts: [] }, 60))
      .toBe(PLAN_FIT.VALID_TIME_CONSTRAINED);
  });
});

// ---------------------------------------------------------------------------
// 2. The fit states
// ---------------------------------------------------------------------------

describe('C16-FIT the four states describe what the athlete would receive', () => {
  test('spare time is called spare, not a shortfall', () => {
    const f = fitAt({ daysPerWeek: 4, sessionLengthMinutes: 90 });
    expect(f.state).toBe(PLAN_FIT.EXTRA_HEADROOM);
    expect(f.longestSessionMinutes).toBeLessThan(90);
  });

  test('a schedule that carries the plan is simply confirmed', () => {
    const f = fitAt({ daysPerWeek: 4, sessionLengthMinutes: 75 });
    expect(f.state).toBe(PLAN_FIT.FULL_TARGET_FIT);
  });

  test('a plan trimmed to fit is reported as trimmed, not as a clean fit', () => {
    const f = fitAt({ daysPerWeek: 5, sessionLengthMinutes: 60 });
    expect(f.state).toBe(PLAN_FIT.VALID_TIME_CONSTRAINED);
    expect(isWorkable(f.state)).toBe(true);
  });

  test('a schedule that cannot carry the plan is never dressed up as one that can', () => {
    const f = fitAt({ daysPerWeek: 4, sessionLengthMinutes: 45 });
    expect(f.state).toBe(PLAN_FIT.INSUFFICIENT_FOR_VALID_PLAN);
    expect(isWorkable(f.state)).toBe(false);
    // And the honest number is carried, so the copy can state it.
    expect(f.longestSessionMinutes).toBeGreaterThan(45);
  });

  test('every schedule the UI offers resolves to a real state', () => {
    for (const d of DAYS) {
      for (const m of DURATIONS) {
        const f = fitAt({ daysPerWeek: d, sessionLengthMinutes: m });
        expect(Object.values(PLAN_FIT)).toContain(f.state);
        expect(f.longestSessionMinutes).toBeGreaterThan(0);
      }
    }
  });

  test('two days is assessed as a real schedule, not rejected out of hand', () => {
    const f = fitAt({ daysPerWeek: 2, sessionLengthMinutes: 90 });
    expect(f.state).toBe(PLAN_FIT.FULL_TARGET_FIT);
    expect(f.daysPerWeek).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 3. Alternatives are calculated, and the athlete's choice is theirs
// ---------------------------------------------------------------------------

describe('C16-FIT alternatives are computed, never assumed', () => {
  test('every alternative offered was generated and checked at that schedule', () => {
    for (const d of DAYS) {
      for (const m of DURATIONS) {
        const f = fitAt({ daysPerWeek: d, sessionLengthMinutes: m });
        for (const alt of f.alternatives) {
          const proof = classifyFit(
            generate(inputs({ daysPerWeek: alt.daysPerWeek, sessionLengthMinutes: alt.sessionLengthMinutes })),
            alt.sessionLengthMinutes,
          );
          expect(proof).toBe(alt.state);
          expect([PLAN_FIT.FULL_TARGET_FIT, PLAN_FIT.EXTRA_HEADROOM]).toContain(alt.state);
        }
      }
    }
  });

  test('no alternative ever removes a training day or shortens a session', () => {
    for (const d of DAYS) {
      for (const m of DURATIONS) {
        const f = fitAt({ daysPerWeek: d, sessionLengthMinutes: m });
        for (const alt of f.alternatives) {
          expect(alt.daysPerWeek).toBeGreaterThanOrEqual(d);
          expect(alt.sessionLengthMinutes).toBeGreaterThanOrEqual(m);
        }
      }
    }
  });

  test('the assessment never changes the athlete\'s selection', () => {
    const f = fitAt({ daysPerWeek: 3, sessionLengthMinutes: 45 });
    expect(f.daysPerWeek).toBe(3);
    expect(f.sessionLengthMinutes).toBe(45);
  });

  test('a schedule that already works is offered nothing (no nagging)', () => {
    for (const [d, m] of [[4, 75], [4, 90], [6, 60], [2, 90]]) {
      expect(fitAt({ daysPerWeek: d, sessionLengthMinutes: m }).alternatives).toEqual([]);
    }
  });

  test('the smallest step that works is the one offered', () => {
    // 4 x 45 does not fit; 60 does not either; 75 does. The offer is 75,
    // not the largest option on the list.
    const f = fitAt({ daysPerWeek: 4, sessionLengthMinutes: 45 });
    const longer = f.alternatives.find(a => a.kind === 'longer_sessions');
    expect(longer.sessionLengthMinutes).toBe(75);
  });

  test('an extra day is an option only when it genuinely resolves the problem', () => {
    // At 60 minutes, six sessions works and is offered. At 45 minutes no day
    // count in the list works, so no day is suggested at all rather than a
    // hopeful one.
    expect(fitAt({ daysPerWeek: 4, sessionLengthMinutes: 60 }).alternatives
      .some(a => a.kind === 'more_sessions' && a.daysPerWeek === 6)).toBe(true);
    expect(fitAt({ daysPerWeek: 4, sessionLengthMinutes: 45 }).alternatives
      .some(a => a.kind === 'more_sessions')).toBe(false);
  });

  test('the assessment is pure: same answers in, same answer out', () => {
    const once = fitAt({ daysPerWeek: 5, sessionLengthMinutes: 60 });
    const twice = fitAt({ daysPerWeek: 5, sessionLengthMinutes: 60 });
    expect(twice).toEqual(once);
  });
});

// ---------------------------------------------------------------------------
// 4. Duration decoration
// ---------------------------------------------------------------------------

describe('C16-FIT every length the UI offers is decorated from the real plan', () => {
  test('each option carries a state and a plain label', () => {
    const decorated = assessDurationOptions({
      inputs: inputs({ daysPerWeek: 4, sessionLengthMinutes: 60 }), generate,
    });
    expect(decorated.map(d => d.minutes)).toEqual(DURATIONS);
    for (const d of decorated) {
      expect(Object.values(PLAN_FIT)).toContain(d.state);
      expect(typeof d.label).toBe('string');
      expect(d.label.length).toBeGreaterThan(0);
    }
  });

  test('the decoration changes with the athlete, not just with the minutes', () => {
    const label = over => assessDurationOptions({
      inputs: inputs({ daysPerWeek: 4, sessionLengthMinutes: 60, ...over }), generate,
    }).find(d => d.minutes === 60).label;
    expect(label({})).toBe('Too tight');
    expect(label({ goal: 'bikini' })).toBe('Recommended');
  });

  test('no label claims a length is optimal or best', () => {
    for (const state of Object.values(PLAN_FIT)) {
      expect(durationLabel(state)).not.toMatch(/optimal|best|ideal|perfect/i);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Plain English by default
// ---------------------------------------------------------------------------

describe('C16-FIT the athlete reads plain English', () => {
  // The founder's banned list, verbatim, for anything rendered by default.
  const BANNED = [
    'MEV', 'MRV', 'volume landmark', 'mesocycle', 'programme epoch',
    'movement family', 'structural coverage', 'capacity envelope',
    'autoregulation', 'SFR', 'systemic fatigue', 'hypertrophy volume',
    'full target fit', 'time-constrained prescription', 'prescription',
    'stimulus-to-fatigue',
  ];

  test('no internal vocabulary reaches any string the athlete reads', () => {
    for (const s of allCopyStrings()) {
      for (const term of BANNED) {
        expect(s.toLowerCase()).not.toContain(term.toLowerCase());
      }
    }
  });

  test('no em dash in user-facing copy', () => {
    for (const s of allCopyStrings()) expect(s).not.toMatch(/—/);
  });

  test('no fake precision: no percentages and no minute-level claims', () => {
    for (const s of allCopyStrings()) {
      expect(s).not.toMatch(/\d+\s*%/);
      // Any minute figure the copy states is rounded to five, so it reads as
      // the estimate it is.
      for (const m of s.matchAll(/around (\d+) minutes/g)) {
        expect(Number(m[1]) % 5).toBe(0);
      }
    }
  });

  test('no state is described as optimal, and none is framed as a mistake', () => {
    for (const s of allCopyStrings()) {
      expect(s).not.toMatch(/optimal|ideal|perfect|you should|wrong|too few|not enough time/i);
    }
  });

  test('the keep option is honest about sessions that will run long', () => {
    const overrunning = keepChoiceCopy({
      daysPerWeek: 4, sessionLengthMinutes: 60,
      state: PLAN_FIT.INSUFFICIENT_FOR_VALID_PLAN, longestSessionMinutes: 73,
    });
    expect(overrunning.detail).toMatch(/around 75 minutes/);
    const constrained = keepChoiceCopy({
      daysPerWeek: 5, sessionLengthMinutes: 60,
      state: PLAN_FIT.VALID_TIME_CONSTRAINED, longestSessionMinutes: 58,
    });
    expect(constrained.detail).not.toMatch(/minutes/);
  });

  test('an unresolvable schedule still gets copy that does not promise options', () => {
    const noOptions = fitCopy(PLAN_FIT.INSUFFICIENT_FOR_VALID_PLAN, {
      daysPerWeek: 6, sessionLengthMinutes: 90, alternatives: [],
    });
    expect(noOptions.body).not.toMatch(/Here are your options/);
    expect(noOptions.body).toMatch(/You can still start here/);
  });
});

// ---------------------------------------------------------------------------
// 6. Wiring: one resolver, no defaults, no dead helpers
// ---------------------------------------------------------------------------

describe('C16-FIT the resolver is wired into the surfaces that need it', () => {
  test('Pro onboarding has no silent day-count default', () => {
    const s = src('screens/ProOnboardingScreen.js');
    expect(s).not.toMatch(/DEFAULT_DAYS_PER_WEEK\s*=\s*\d/);
    expect(s).toMatch(/useState\(null\);?[^\n]*\n?/);
    expect(s).toMatch(/const \[daysPerWeek, setDaysPerWeek\] = useState\(null\)/);
  });

  test('Pro onboarding refuses to advance without an explicit selection', () => {
    const s = src('screens/ProOnboardingScreen.js');
    // D146 (2026-09-04): the four requirements live in validateStep4, each
    // writing a gap the box displays; advanceFrom4 returns on any gap.
    for (const k of ['experience', 'sessionLengthMinutes', 'daysPerWeek', 'equipment']) {
      expect(s).toMatch(new RegExp(`function validateStep4\\(\\) \\{[\\s\\S]{0,600}?if \\(!${k}\\) errs\\.`));
    }
    expect(s).toMatch(/function advanceFrom4\(\) \{[\s\S]{0,900}?const errs = validateStep4\(\);\s*if \(Object\.keys\(errs\)\.length\) \{[\s\S]{0,300}?return;/);
  });

  test('both schedule surfaces offer two sessions a week', () => {
    expect(src('screens/ProOnboardingScreen.js'))
      .toMatch(/DAYS_PER_WEEK_OPTIONS = \[2, 3, 4, 5, 6\]/);
    expect(src('screens/PlanUpdateScreen.js'))
      .toMatch(/DAYS_OPTIONS = \[2, 3, 4, 5, 6\]/);
  });

  test('onboarding and Update Your Plan call the SAME resolver', () => {
    for (const screen of ['screens/ProOnboardingScreen.js', 'screens/PlanUpdateScreen.js']) {
      const s = src(screen);
      expect(s).toMatch(/assessScheduleFit/);
      expect(s).toMatch(/from '\.\.\/lib\/planFit'/);
      // Neither screen may grow its own idea of what fits.
      expect(s).not.toMatch(/estimatedDurationMinutes\s*>\s*sessionLengthMinutes/);
    }
  });

  test('planFit is live code, not a helper waiting to be wired up', () => {
    const consumers = ['lib/planAutoGen.js', 'screens/ProOnboardingScreen.js', 'screens/PlanUpdateScreen.js']
      .filter(f => /planFit/.test(src(f)));
    expect(consumers.length).toBe(3);
  });

  test('the fit assessment writes nothing', () => {
    // The resolver is allowed to READ the catalogue and the athlete's
    // exercise intent. It may not create, save, activate or archive
    // anything: an athlete asking "would 45 minutes work?" must not change
    // the plan they already have.
    const s = src('lib/planAutoGen.js');
    const start = s.indexOf('export async function assessScheduleFit');
    const end = s.indexOf('\n * FF-003', start);
    const body = s.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    for (const write of [
      'createProgramme', 'createRoutine', 'addExerciseToRoutine',
      'activatePlanWithBlock', 'archiveOtherUserPlans', 'saveLocalProfile',
      'AsyncStorage.setItem', 'runInTransaction',
    ]) {
      expect(body).not.toContain(write);
    }
  });
});
