/**
 * coachCoherenceTrace.test.js — Campaign 18 jobs 6, 7, 9 and 15.
 *
 * These four are TRACE jobs, not build jobs: "If current implementations
 * already agree: pin the production paths and move on." So this suite proves
 * the seams against the real modules and the real SQL, and pins them so a
 * later change cannot quietly break the agreement.
 *
 *   JOB 6  the same recovery evidence cannot make two consumers contradict
 *          each other, and legitimate SCOPE differences are stated.
 *   JOB 7  each weight consumer uses the statistic its question needs, and
 *          nothing is "simplified" onto one number.
 *   JOB 9  an active override binds, a released one stops binding and does
 *          not silently reactivate, and history survives both.
 *   JOB 15 prescribed is never read as executed, in either domain.
 */
import fs from 'fs';
import path from 'path';
import { SIGNAL, buildCoachContext, systemicRecoveryFact } from '../coachContext';
import { classifyTrainingLimiter, LIMITER } from '../coachPrecedence';
import { buildCoachStory, storyLines } from '../coachStory';
import { classifyMuscleBlock } from '../interBlock';
import { slotVerdict, SLOT_REASON, SLOT_VERDICT } from '../programmeEpoch';
import { resolveFfmFloorWeightKg } from '../nutritionEngine';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// ─── JOB 6 ──────────────────────────────────────────────────────────────────

describe('JOB 6: recovery means one thing per scope, and the scope is stated', () => {
  test('THE CROSS-CONSUMER CASE: chest recovery poor, systemic recovery fine', () => {
    // The founder's own example. Both consumers read the same week and reach
    // DIFFERENT answers, legitimately, because they are answering different
    // questions about different scopes.
    const systemic = systemicRecoveryFact({ hasCheckin: true, energyScore: 4, sorenessScore: 2 });
    expect(systemic.signal).toBe(SIGNAL.GOOD);
    expect(systemic.scope).toBe('systemic');

    const chest = classifyMuscleBlock({
      muscle: 'chest',
      landmarks: { mev: 8, mav: 14, mrv: 20 },
      previousStart: 12, plannedPeak: 18, achievedPeak: 18,
      adherence: { completedSets: 60, plannedSets: 62 },
      performance: { e1rmSlopePct: 1.2, confidence: 1, eligibleExposures: 8 },
      // Muscle-scoped cost, NOT the systemic deload flag.
      recovery: { sorenessLateAvg: 4.5, jointDiscomfortAvg: 3.5, readinessSlope: -0.4, dataPoints: 8 },
    });
    expect(chest.proposal.startSets).toBeLessThanOrEqual(12);
  });

  test('and the muscle-scoped rationale NAMES the muscle, so it cannot read as systemic', () => {
    const chest = classifyMuscleBlock({
      muscle: 'chest',
      landmarks: { mev: 8, mav: 14, mrv: 20 },
      previousStart: 12, plannedPeak: 18, achievedPeak: 18,
      adherence: { completedSets: 60, plannedSets: 62 },
      performance: { e1rmSlopePct: 1.2, confidence: 1, eligibleExposures: 8 },
      recovery: { sorenessLateAvg: 4.5, jointDiscomfortAvg: 3.5, readinessSlope: -0.4, dataPoints: 8 },
    });
    expect(chest.rationale.toLowerCase()).toContain('chest');
  });

  test('THE DEFECT THIS JOB FOUND: the systemic claim now says it is systemic', () => {
    // Unqualified, "Your recovery was in range" beside a chest reduction read
    // as the app contradicting itself.
    const src = read('../weeklyCoach.js');
    expect(src).toContain("'Your recovery overall was in range.'");
    expect(src).toContain("'Your energy and overall recovery were strong.'");
    expect(src).not.toContain("'Your recovery was in range.'");
  });

  test('the story\'s recovery line is systemic AND says it is not about the exercises', () => {
    const context = buildCoachContext({
      training: { sessionsCompleted: 4, sessionsPlanned: 4, blockE1rmSlopePct: -0.5 },
      recovery: { hasCheckin: true, energyScore: 2, sorenessScore: 4 },
      weight: { ratePctPerWeek: 0.3, weighInCount: 12, onTarget: true },
    });
    const limiters = { training: classifyTrainingLimiter(context), nutrition: { limiter: LIMITER.PLAN, onTarget: true } };
    const text = storyLines(buildCoachStory({ context, limiters })).join(' ');
    expect(text).toMatch(/Recovery overall/);
    expect(text).toMatch(/rather than the exercises themselves/);
  });

  test('a MISSING recovery answer is unknown everywhere, never "recovered well"', () => {
    expect(systemicRecoveryFact({ hasCheckin: false }).signal).toBe(SIGNAL.UNKNOWN);
    // interBlock's own confidence collapses with no data points rather than
    // treating absence as a clean bill of health.
    const noData = classifyMuscleBlock({
      muscle: 'chest', landmarks: { mev: 8, mav: 14, mrv: 20 },
      previousStart: 12, plannedPeak: 18, achievedPeak: 18,
      adherence: { completedSets: 60, plannedSets: 62 },
      performance: { e1rmSlopePct: 1.2, confidence: 1 },
      recovery: { dataPoints: 0 },
    });
    expect(noData.confidence).toBe(0);
  });
});

// ─── JOB 7 ──────────────────────────────────────────────────────────────────

describe('JOB 7: four weight roles, four consumers, no forced simplification', () => {
  test('SAFETY WEIGHT has exactly one resolver, and the floor uses it', () => {
    // One resolution per run: the floor a user is SHOWN is necessarily the
    // floor that GATES them, not by two paths agreeing but by there being one.
    expect(resolveFfmFloorWeightKg({ ewmaTodayKg: 80, lastWeighInKg: 95, profileWeightKg: 70 })).toBe(80);
    expect(resolveFfmFloorWeightKg({ ewmaTodayKg: null, lastWeighInKg: 95, profileWeightKg: 70 })).toBe(95);
    expect(resolveFfmFloorWeightKg({ ewmaTodayKg: 0, lastWeighInKg: null, profileWeightKg: 70 })).toBe(70);
    expect(resolveFfmFloorWeightKg({})).toBeNull();
  });

  test('the weekly coach resolves the safety weight ONCE and reuses it', () => {
    const code = stripComments(read('../weeklyCoach.js'));
    const resolutions = code.match(/resolveFfmFloorWeightKg\(/g) || [];
    expect(resolutions.length).toBe(1);
    // Both the adaptive context and the enforcing gate read that one value.
    expect(code.match(/ffmSafetyWeightKg/g).length).toBeGreaterThanOrEqual(3);
  });

  test('RATE OF CHANGE is the statistic the coaching context carries, rounded to the shown figure', () => {
    const code = stripComments(read('../weeklyCoach.js'));
    // C10F: the number shown as evidence must be the rate the decision used.
    expect(code).toMatch(/ratePctPerWeek: coachingRatePct/);
  });

  test('ROBUST TREND drives the decision, not the plain EWMA display delta', () => {
    const code = stripComments(read('../weeklyCoach.js'));
    expect(code).toMatch(/const onTarget = \(decisionRatePct != null\)/);
    expect(code).toMatch(/robustTrackingLatest|robustTrackingSevenDaysAgoPoint/);
  });

  test('THE ROLES ARE NOT COLLAPSED: the context computes none of them itself', () => {
    const code = stripComments(read('../coachContext.js'));
    expect(code).not.toMatch(/computeEWMA|robustEwma|computeFFMFloor/);
  });

  test('SPARSE: too few weigh-ins is unknown, whatever the rate says', () => {
    const ctx = buildCoachContext({ weight: { ratePctPerWeek: -0.9, weighInCount: 2, onTarget: false } });
    expect(ctx.weight.trend.signal).toBe(SIGNAL.UNKNOWN);
  });

  test('SINGLE MEASUREMENT: one reading can still protect a floor, but cannot claim a trend', () => {
    // The safety resolver deliberately falls back to a single weigh-in - a
    // floor with one reading is better than no floor. The TREND does not.
    expect(resolveFfmFloorWeightKg({ lastWeighInKg: 82 })).toBe(82);
    expect(buildCoachContext({ weight: { ratePctPerWeek: 0.5, weighInCount: 1, onTarget: true } })
      .weight.trend.signal).toBe(SIGNAL.UNKNOWN);
  });

  test('STALE: a rate with no direction to judge it against stays unknown', () => {
    expect(buildCoachContext({ weight: { ratePctPerWeek: 0.4, weighInCount: 20, onTarget: null } })
      .weight.trend.signal).toBe(SIGNAL.UNKNOWN);
  });
});

// ─── JOB 9 ──────────────────────────────────────────────────────────────────

describe('JOB 9: active override, released override, historical memory', () => {
  test('ACTIVE: an exclusion binds and outranks every inference', () => {
    const v = slotVerdict({ excluded: true, progressing: true, plateau: true }, {});
    expect(v.reason).toBe(SLOT_REASON.USER_EXCLUDED);
  });

  test('RELEASED: with the exclusion gone the constraint stops applying at once', () => {
    const v = slotVerdict({ excluded: false, progressing: true }, {});
    expect(v.verdict).toBe(SLOT_VERDICT.KEEP);
    expect(v.reason).toBe(SLOT_REASON.STILL_PRODUCTIVE);
  });

  test('AND IT DOES NOT SILENTLY REACTIVATE: nothing re-derives an exclusion from history', () => {
    // The one exclusion predicate reads the CURRENT intent row only. There is
    // no path from "they excluded this once" back to an active constraint.
    const code = stripComments(read('../exercise/intent.js'));
    expect(code).toMatch(/export function isExcluded[\s\S]{0,200}?intentFor\(state, exerciseId\)\?\.kind === EXERCISE_INTENT\.EXCLUDED/);
  });

  test('HISTORICAL MEMORY SURVIVES: past swaps still count after a release', () => {
    // Repeated deliberate swaps remain evidence - that is memory, not a
    // resurrected constraint, and it is reported as the user's own behaviour.
    const v = slotVerdict({ excluded: false, swappedAwayCount: 3 }, {});
    expect(v.reason).toBe(SLOT_REASON.USER_SWAPPED_AWAY);
  });

  test('BLOCK-SCOPED AVOIDANCE EXPIRES BY ITSELF, with no invented duration', () => {
    const code = stripComments(read('../exercise/intent.js'));
    expect(code).toMatch(/return row\.scopeMesocycleId === \(state\?\.activeMesocycleId \?\? null\)/);
  });

  test('a MANUAL volume override defers rather than being overwritten', () => {
    const out = classifyMuscleBlock({
      muscle: 'chest', landmarks: { mev: 8, mav: 14, mrv: 20 },
      previousStart: 12, plannedPeak: 18, achievedPeak: 18, manualOverride: true,
      adherence: { completedSets: 60, plannedSets: 62 },
      performance: { e1rmSlopePct: 1.2, confidence: 1 },
      recovery: { dataPoints: 8 },
    });
    expect(out.proposal.deferredToManual).toBe(true);
  });

  test('and releasing it hands the lane back rather than freezing the old number', () => {
    const released = classifyMuscleBlock({
      muscle: 'chest', landmarks: { mev: 8, mav: 14, mrv: 20 },
      previousStart: 12, plannedPeak: 18, achievedPeak: 18, manualOverride: false,
      adherence: { completedSets: 60, plannedSets: 62 },
      performance: { e1rmSlopePct: 1.2, confidence: 1 },
      recovery: { dataPoints: 8 },
    });
    expect(released.proposal.deferredToManual).toBe(false);
  });

  test('FOOD: a released do-not-suggest genuinely releases', () => {
    // eslint-disable-next-line global-require
    const { withDoNotSuggest, preferencesFromProfile } = require('../food/mealPlanService');
    const active = withDoNotSuggest(preferencesFromProfile({ dietPreference: 'omnivore' }), ['curated:oats']);
    expect(active.excludeFoodKeys).toContain('oats');
    // Release = the row is gone. Nothing reconstructs it.
    const released = withDoNotSuggest(preferencesFromProfile({ dietPreference: 'omnivore' }), []);
    expect(released.excludeFoodKeys ?? []).not.toContain('oats');
  });

  test('AND THE HISTORY IS NOT ERASED BY EITHER: exclusion never touches the diary', () => {
    const dbSrc = read('../food/db.js');
    const start = dbSrc.indexOf('export async function getFoodEntriesForRange');
    expect(dbSrc.slice(start, start + 1400)).not.toMatch(/exclude|dislike/i);
  });
});

// ─── JOB 15 ─────────────────────────────────────────────────────────────────

describe('JOB 15: prescribed is never executed, in either domain', () => {
  test('NUTRITION: the rollup every intake read depends on excludes planned rows', () => {
    const src = read('../food/db.js');
    const start = src.indexOf('export async function recomputeRollup');
    const body = src.slice(start, src.indexOf('ON CONFLICT', start));
    expect(body).toMatch(/is_planned = 0/);
  });

  test('so a generated meal plan cannot become evidence of intake', () => {
    const src = read('../food/db.js');
    // getRecentIntakeSummary reads the rollup, which is already planned-free,
    // and requires a real entry count.
    const start = src.indexOf('export async function getRecentIntakeSummary');
    expect(src.slice(start, start + 900)).toMatch(/entries_count > 0/);
  });

  test('THE NEGATIVE CONTROL: a meal plan generated with an empty diary reads UNKNOWN', () => {
    const ctx = buildCoachContext({
      nutrition: { recentIntakeDaysLogged: 0, targetKcal: 3000 },
      weight: { ratePctPerWeek: 0.1, weighInCount: 12, onTarget: false, shortfall: 1 },
    });
    expect(ctx.nutrition.coverage.signal).toBe(SIGNAL.UNKNOWN);
    expect(ctx.nutrition.intake.signal).toBe(SIGNAL.UNKNOWN);
  });

  test('TRAINING: a session needs real sets, not just a completed flag', () => {
    const src = read('../database.js');
    const start = src.indexOf('export async function getWeeklySessionStats');
    const body = src.slice(start, start + 1200);
    expect(body).toMatch(/EXISTS \(\s*\n?\s*SELECT 1 FROM workout_sets/);
    expect(body).toMatch(/is_completed = 1/);
  });

  test('and the block reader counts only completed workouts', () => {
    const src = read('../database.js');
    const start = src.indexOf('export async function getBlockTrainingData');
    expect(src.slice(start, start + 800)).toMatch(/is_completed = 1/);
  });

  test('THE STRONGEST NEGATIVE CONTROL: a full programme with zero training done', () => {
    // Four sessions prescribed, none completed. Nothing about the programme
    // may be judged, and no progress claim may be made.
    const ctx = buildCoachContext({
      training: { sessionsCompleted: 0, sessionsPlanned: 4, blockE1rmSlopePct: -1.2 },
    });
    expect(ctx.training.execution.signal).toBe(SIGNAL.POOR);
    expect(ctx.training.progress.signal).toBe(SIGNAL.UNKNOWN);
    expect(classifyTrainingLimiter(ctx).limiter).toBe(LIMITER.EXECUTION);
    // And the slot verdict refuses to condemn any exercise.
    expect(slotVerdict({ plateau: true }, { executionJudgeable: false }).verdict).toBe(SLOT_VERDICT.KEEP);
  });

  test('PARTIAL: one of four completed is still not a verdict on the plan', () => {
    const ctx = buildCoachContext({ training: { sessionsCompleted: 1, sessionsPlanned: 4, blockE1rmSlopePct: -1.2 } });
    expect(ctx.training.progress.signal).toBe(SIGNAL.UNKNOWN);
  });

  test('PARTIAL DIARY: three logged days is unknown, not poor', () => {
    const ctx = buildCoachContext({
      nutrition: { recentIntakeDaysLogged: 3, recentIntakeAvgKcal: 900, targetKcal: 3000 },
    });
    expect(ctx.nutrition.intake.signal).toBe(SIGNAL.UNKNOWN);
  });
});
