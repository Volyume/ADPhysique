/**
 * CC33 D112 R7 - CONSTRAINED becomes reachable on both section 20
 * drivers (closes audit findings T2-12 and T2-13).
 *
 * The defects this suite keeps closed:
 *  - T2-13: the limiter's only evidence was the omissions-only excusal
 *    count, and no write site ever recorded a substitution - so a week
 *    in which the restriction reshaped every session but a substitute
 *    was always found registered zero and could never read CONSTRAINED.
 *  - T2-12: a regression reached LIMITER.PLAN ('not progressing on a
 *    run programme' -> INTERVENTION.EXERCISE) even when the week was
 *    demonstrably reshaped by the restriction - the coach blamed the
 *    programme for a fall the restriction manufactured.
 *
 * Also pinned: the narrowness law SURVIVES the widening - an active
 * episode alone, with nothing actually reshaped, still never
 * reclassifies an ordinary bad week; and users with no constraint are
 * byte-identical.
 *
 * All against the REAL context builder and classifier.
 */
const fs = require('fs');
const path = require('path');
const { buildCoachContext, SIGNAL } = require('../coachContext');
const { LIMITER, classifyTrainingLimiter } = require('../coachPrecedence');

const ctx = ({ sessions = 'poor', progress = 'good', pc = null } = {}) => buildCoachContext({
  training: {
    sessionsCompleted: sessions === 'good' ? 4 : 1,
    sessionsPlanned: 4,
    blockE1rmSlopePct: progress === 'good' ? 1.2 : -0.6,
    prsThisWeek: 0,
    physicalConstraint: pc,
  },
  recovery: { hasCheckin: true, energyScore: 4, sorenessScore: 2 },
  nutrition: { recentIntakeDaysLogged: 6, targetKcal: 3000, recentIntakeAvgKcal: 2980 },
  // The weight fact shape the precedence suite's athlete() uses: a read
  // trend keeps the nutrition lane clean, so the training story under
  // test is the ONE line whatWeWatchNext returns.
  weight: { ratePctPerWeek: 0.3, weighInCount: 10, onTarget: true, shortfall: 0 },
  intent: { goalPhase: 'bulk' },
});

const constraint = (over = {}) => ({
  active: true, affectedMuscles: ['quads'], excusedThisWeek: 0, reshapedThisWeek: 0,
  weeklyAnswer: null, ...over,
});

describe('the shortfall driver, widened to reshaped weeks (T2-13)', () => {
  test('a fully-substituted week (zero omissions) now reads CONSTRAINED', () => {
    const c = classifyTrainingLimiter(ctx({ sessions: 'poor', pc: constraint({ reshapedThisWeek: 2 }) }));
    expect(c.limiter).toBe(LIMITER.CONSTRAINED);
    expect(c.because).toBe('constraint_explained_shortfall');
    expect(c.scope).toEqual(['quads']);
  });

  test('the excused-omission path is unchanged', () => {
    const c = classifyTrainingLimiter(ctx({ sessions: 'poor', pc: constraint({ excusedThisWeek: 1 }) }));
    expect(c.limiter).toBe(LIMITER.CONSTRAINED);
  });

  test('an active episode with NOTHING reshaped never excuses a no-show week', () => {
    const c = classifyTrainingLimiter(ctx({ sessions: 'poor', pc: constraint() }));
    expect(c.limiter).toBe(LIMITER.EXECUTION);
    expect(c.because).toBe('sessions_missed');
  });
});

describe('the regression driver (T2-12)', () => {
  test('a regression on a reshaped week is the restriction\'s story, not the programme\'s', () => {
    const c = classifyTrainingLimiter(ctx({ sessions: 'good', progress: 'poor', pc: constraint({ reshapedThisWeek: 1 }) }));
    expect(c.limiter).toBe(LIMITER.CONSTRAINED);
    expect(c.because).toBe('constraint_reshaped_regression');
    expect(c.scope).toEqual(['quads']);
  });

  test('a regression with a constraint active but nothing reshaped stays PLAN', () => {
    const c = classifyTrainingLimiter(ctx({ sessions: 'good', progress: 'poor', pc: constraint() }));
    expect(c.limiter).toBe(LIMITER.PLAN);
    expect(c.because).toBe('not_progressing_on_a_run_programme');
  });

  test('no constraint: classification byte-identical to before', () => {
    const c = classifyTrainingLimiter(ctx({ sessions: 'good', progress: 'poor' }));
    expect(c).toEqual({ limiter: LIMITER.PLAN, because: 'not_progressing_on_a_run_programme' });
  });
});

describe('the context fact carries the widened evidence', () => {
  test('reshapedThisWeek survives normalisation; junk reads zero', () => {
    const c = ctx({ pc: constraint({ reshapedThisWeek: 3 }) });
    expect(c.training.physicalConstraint.reshapedThisWeek).toBe(3);
    const junk = ctx({ pc: constraint({ reshapedThisWeek: 'nonsense' }) });
    expect(junk.training.physicalConstraint.reshapedThisWeek).toBe(0);
  });

  test('SIGNAL sanity: the fixtures drive the signals this suite assumes', () => {
    const good = ctx({ sessions: 'good', progress: 'poor' });
    expect(good.training.execution.signal).toBe(SIGNAL.GOOD);
    expect(good.training.progress.signal).toBe(SIGNAL.POOR);
  });
});

describe('source wiring', () => {
  const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

  test('the live block slope is judged over capability-eligible sets', () => {
    const src = read('blockLedgerRunner.js');
    const fn = src.match(/async function computeLiveBlockSlopePct[\s\S]{0,2600}/)?.[0] ?? '';
    expect(fn).toContain('filterCapabilityEligibleSetRows(');
    expect(fn).toMatch(/sets: slopeSets,/);
  });

  test('the weekly stats carry the reshaped counter beside the excusal one', () => {
    const src = read('database.js');
    expect(src).toContain('let constraintReshapedSessions = 0;');
    // Round 10 (R10-3): a LIVE entry is required - the old any-non-empty
    // -record predicate counted a session whose every entry had been
    // revoked (the user re-added and trained the omitted movement). The
    // quoted LIKEs match 'omitted'/'substituted' exactly, never their
    // _revoked forms. Driven in capabilityAdherence.test.js.
    expect(src).toMatch(/LIKE '%"omitted"%' OR sce\.effects_json LIKE '%"substituted"%'/);
    expect(src).not.toMatch(/effects_json IS NOT NULL AND sce\.effects_json != '\[\]'/);
    expect(src).toContain('constraintExcusedSessions, constraintReshapedSessions,');
  });

  test('serve-time substitution writes its effects entry', () => {
    const src = read('sessionEffective.js');
    expect(src).toMatch(/effect: 'substituted', constraintIds: line\.constraintIds,/);
  });

  test('the coach context is fed the reshaped count', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'CoachOutputScreen.js'), 'utf8');
    expect(src).toContain('reshapedThisWeek: sessionStats.constraintReshapedSessions ?? 0,');
  });

  test('R5-5: the weekly denominator predicts nothing - every constraint fact it uses is a RECORD', () => {
    // CC33 round 5 (D117, correcting D116 ruling 2): §18's predictive
    // whole-session reduction of `planned` used a capability-only
    // substitute test, strictly weaker than serve's composed senior
    // question - so every session it excused was one serve's
    // never-served-empty fail-safe was about to serve IN FULL, and the
    // reduction could only flatter completed/planned. Deleted. The
    // weekly stats read what a constraint actually DID (the effects
    // records: excused, reshaped, ended-early), never what one might do.
    const src = read('database.js');
    const fn = src.match(/export async function getWeeklySessionStats[\s\S]*?\n}\n/)?.[0] ?? '';
    expect(fn.length).toBeGreaterThan(0);
    expect(fn).not.toContain('fullyOmitted');
    expect(fn).not.toContain('capabilityBlockReason');
    expect(fn).not.toContain('computeEffectiveSession');
  });
});

// ── Landing 6: the story and copy layer (T2-14, T2-15, T2-17, T2-18) ──

const {
  whatItMeans, whatStaysTheSame, whatWeWatchNext,
} = require('../coachStory');
const { classifyLimiters } = require('../coachPrecedence');

describe('the CONSTRAINED story exists (T2-14)', () => {
  const constrainedCtx = ctx({ sessions: 'poor', pc: constraint({ reshapedThisWeek: 2 }) });
  const constrainedLimiters = classifyLimiters(constrainedCtx);

  test('the fixtures really classify CONSTRAINED', () => {
    expect(constrainedLimiters.training.limiter).toBe(LIMITER.CONSTRAINED);
  });

  test('whatItMeans names the constrained week instead of falling silent', () => {
    const lines = whatItMeans(constrainedCtx, constrainedLimiters).map((l) => l.text);
    expect(lines.join(' ')).toContain('Training worked around your temporary change this week');
  });

  test('the hold renders its copy - an unmapped reason no longer swallows it', () => {
    const lines = whatStaysTheSame(constrainedCtx, constrainedLimiters, {}).map((l) => l.text);
    expect(lines.join(' ')).toContain('while training works around your temporary change');
  });

  test('whatWeWatchNext commits to the return path, not the schedule', () => {
    const l = whatWeWatchNext(constrainedCtx, constrainedLimiters, {});
    expect(l.text).toContain('training builds back up');
    expect(l.text).not.toContain('full week');
  });
});

describe('adherence copy follows the truth (T2-15) - source pins', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'weeklyCoach.js'), 'utf8');

  test('the constrained branch exists and keeps the plan without accusation', () => {
    expect(src).toContain('const constrained = limiters?.training?.limiter === LIMITER.CONSTRAINED;');
    expect(src).toContain('are not held against you. Your plan stays as it is, ready when you are.');
    expect(src).toContain('Nothing here counts against you, and no programming change is made from it.');
  });

  test('genuine no-show weeks keep the stabilise words', () => {
    expect(src).toContain("'Get back to your full plan before changing anything.'");
    expect(src).toContain('Getting back on schedule takes priority over any programming change.');
  });
});

describe('the check-in answers all land (T2-17) and speak the user\'s own subject (T2-18)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'weeklyCoach.js'), 'utf8');

  test("'fine' now has a visible consequence", () => {
    expect(src).toMatch(/weeklyAnswer === 'fine'/);
    expect(src).toContain('went fine around');
  });

  test('the subject leads; muscle lists are OUR reading, never the user\'s words', () => {
    expect(src).toContain('You said working around ${subject} got in the way');
    // The old attribution shape is gone: "You said your {muscles} got in the way".
    expect(src).not.toMatch(/You said your \$\{scope\} got in the way/);
    expect(src).toContain('that mainly touches your ${scope} work');
  });

  test('the volume-hold note prefers the subject too', () => {
    expect(src).toContain('Training worked around ${subject} this week, so volume holds');
  });

  test('the fact carries the subject through screen and context', () => {
    const screen = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'CoachOutputScreen.js'), 'utf8');
    expect(screen).toContain('subject = subjectPhrase(');
    const ctxSrc = fs.readFileSync(path.join(__dirname, '..', 'coachContext.js'), 'utf8');
    expect(ctxSrc).toMatch(/subject: typeof training\.physicalConstraint\.subject === 'string'/);
  });
});
